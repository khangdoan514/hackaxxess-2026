"""
API route definitions: auth, record upload/transcribe, diagnosis analyze/confirm, patient.
"""
import logging
import re
import uuid
from pathlib import Path
from datetime import datetime
import base64
import os

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator

# PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO

from config import DATA_DIR
from auth import hash_password, verify_password, create_access_token, decode_access_token

logger = logging.getLogger(__name__)


# Hardcoded "What this means" for specific diagnoses (used when diagnosis name matches)
DIAGNOSIS_EXPLANATIONS = {
    "jaundice": (
        "Jaundice means your skin or the whites of your eyes turn yellow. This happens when a substance "
        "called bilirubin builds up in your blood. Bilirubin is normally processed by your liver and removed "
        "from your body, but if your liver isn't working properly, if bile flow is blocked, or if red blood "
        "cells are breaking down too quickly, bilirubin can accumulate.\n\n"
        "Jaundice itself is not a disease. It is a sign that something may be affecting your liver, bile ducts, "
        "or blood. Common causes include liver inflammation, gallstones, alcohol-related liver problems, "
        "certain medications, or infections.\n\n"
        "You might also notice dark urine, pale stools, itching, fatigue, or abdominal discomfort.\n\n"
        "Jaundice can range from mild and temporary to more serious, so it's important to see a doctor to find "
        "the cause and get proper treatment."
    ),
}


def _generate_diagnosis_explanation(final_diagnosis: str, symptoms: list[str] | None = None) -> str:
    """Generate a user-friendly explanation: use hardcoded text when available, else Google Gemini (google-genai).
    Reads GEMINI_KEY from environment for AI. Returns empty string if key missing or call fails."""
    diag_lower = (final_diagnosis or "").strip().lower()
    if not diag_lower:
        return ""
    for key, explanation in DIAGNOSIS_EXPLANATIONS.items():
        if key in diag_lower:
            return explanation
    api_key = os.getenv("GEMINI_KEY", "").strip()
    if not api_key:
        logger.debug("GEMINI_KEY not set; skipping explanation generation")
        return ""
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        symptom_part = ""
        if symptoms:
            symptom_part = f" The patient was noted to have: {', '.join(symptoms[:8])}."
        prompt = (
            "You are a helpful medical communicator. In 2–4 short, plain-language sentences, explain what this "
            "diagnosis typically means for the patient—what it is, what they might expect, and what they should "
            "do next. Do not give specific medical advice or replace a doctor's instructions. Keep the tone calm "
            "and reassuring.\n\nDiagnosis: " + (final_diagnosis or "").strip() + symptom_part
        )
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        text = (getattr(response, "text", None) or "").strip()
        if text:
            logger.info("Gemini explanation output: %s", text)
            print("[Gemini] explanation:", text)
        return text if text else ""
    except Exception as e:
        logger.warning("Gemini explanation generation failed: %s", e)
        return ""

router = APIRouter()
security = HTTPBearer(auto_error=False)

# In-memory store for upload session id -> temp file path (fallback when no disk write yet)
_upload_paths: dict[str, str] = {}

# In-memory fallback for auth when MongoDB is not connected (dev only; lost on restart)
_memory_users: dict[str, dict] = {}
# In-memory diagnoses/prescriptions keyed by patient_id when MongoDB is not connected
_memory_diagnoses: dict[str, list] = {}
_memory_prescriptions: dict[str, list] = {}


def get_model(request: Request):
    return getattr(request.app.state, "model", None)


def get_vectorizer(request: Request):
    return getattr(request.app.state, "vectorizer", None)


def get_db(request: Request):
    return getattr(request.app.state, "db", None)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    """Validate JWT and return payload (sub, role, email) or None if optional auth."""
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None
    return payload


def require_user(user=Depends(get_current_user)):
    if user is None:
        raise HTTPException(401, "Not authenticated")
    return user


def require_doctor(user=Depends(require_user)):
    if user.get("role") != "doctor":
        raise HTTPException(403, "Doctor role required")
    return user


# ---------- Request/Response models ----------


class SignupInput(BaseModel):
    name: str  # Make sure this field exists
    email: str
    password: str
    role: str = Field(..., pattern="^(doctor|patient)$")


class LoginInput(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict  # id, email, role


class TranscribeInput(BaseModel):
    upload_id: str = Field(..., description="Id returned from POST /record/upload")


STUB_TRANSCRIPT_MESSAGE = "[Stub transcript: install faster-whisper and add audio]"


class TranscribeResponse(BaseModel):
    transcript: str
    upload_id: str
    is_stub: bool = False


class AnalyzeInput(BaseModel):
    transcript: str = Field(..., description="Text from speech-to-text")
    patient_id: str | None = None
    session_id: str | None = None


class AnalyzeResponse(BaseModel):
    symptoms: list[str]
    predictions: list[dict]  # [{ "disease": str, "confidence": float, "is_edge_case": bool }]
    common: list[str]
    edge_cases: list[str]


class EdgeCaseItem(BaseModel):
    name: str = Field(..., description="Edge case / condition to monitor")
    further_steps: str = Field(default="", description="Steps the patient should take")


def _normalize_edge_cases(v):
    """Accept list of strings or list of {name, further_steps}."""
    if not v:
        return []
    out = []
    for item in v:
        if isinstance(item, str):
            out.append(EdgeCaseItem(name=item, further_steps=""))
        elif isinstance(item, dict):
            out.append(EdgeCaseItem(name=item.get("name", ""), further_steps=item.get("further_steps", "") or ""))
        else:
            out.append(item)
    return out


def _edge_cases_for_patient(raw):
    """Return list of {name, further_steps} for patient API (handles legacy string list)."""
    if not raw:
        return []
    out = []
    for item in raw:
        if isinstance(item, str):
            out.append({"name": item, "further_steps": ""})
        elif isinstance(item, dict):
            out.append({"name": item.get("name", ""), "further_steps": item.get("further_steps", "") or ""})
        else:
            out.append({"name": "", "further_steps": ""})
    return out


class ConfirmInput(BaseModel):
    patient_email: str = Field(..., description="Patient's email; diagnosis will show on their dashboard when they log in")
    session_id: str | None = None
    final_diagnosis: str
    prescription: dict = Field(..., description="medication, dosage, instructions")
    symptoms: list[str] = Field(default_factory=list)
    predictions: list[dict] = Field(default_factory=list)
    edge_cases: list[EdgeCaseItem] = Field(default_factory=list, description="Edge cases with optional further steps for patient")
    save_location: str = "desktop"  # desktop, downloads, custom
    custom_filename: str | None = None

    @field_validator("edge_cases", mode="before")
    @classmethod
    def normalize_edge_cases(cls, v):
        return _normalize_edge_cases(v)


class ConfirmResponse(BaseModel):
    success: bool
    diagnosis_id: str | None = None
    prescription_id: str | None = None
    pdf_path: str | None = None


class PatientTwinInput(BaseModel):
    transcript: str = Field(..., description="Text from speech-to-text")
    patient_id: str | None = None


class PatientTwinResponse(BaseModel):
    success: bool
    patient_twin: dict


class PDFGenerateInput(BaseModel):
    patient_email: str
    final_diagnosis: str
    prescription: dict
    symptoms: list[str] = Field(default_factory=list)
    predictions: list[dict] = Field(default_factory=list)
    edge_cases: list[EdgeCaseItem] = Field(default_factory=list)

    @field_validator("edge_cases", mode="before")
    @classmethod
    def normalize_edge_cases(cls, v):
        return _normalize_edge_cases(v)


# ---------- Symptom extraction (simple keyword/pattern) ----------


# Common symptom keywords that might appear in transcripts (expand as needed)
SYMPTOM_KEYWORDS = [
    "fever", "cough", "headache", "fatigue", "nausea", "vomiting", "pain", "rash",
    "sore throat", "cold", "flu", "dizziness", "weakness", "sweating", "chills",
    "stomach", "chest pain", "shortness of breath", "itching", "swelling",
    "diarrhea", "constipation", "loss of appetite", "weight loss", "insomnia",
    "joint pain", "muscle pain", "back pain", "abdominal pain", "bleeding",
]


def extract_symptoms_from_transcript(transcript: str) -> list[str]:
    """Extract a list of symptom strings from transcript text (simple keyword + phrase matching)."""
    if not transcript or not transcript.strip():
        return []
    if STUB_TRANSCRIPT_MESSAGE in transcript or transcript.strip() == STUB_TRANSCRIPT_MESSAGE:
        return []
    text = transcript.lower().strip()
    found = set()
    for kw in SYMPTOM_KEYWORDS:
        if kw in text:
            found.add(kw)
    # Also capture "X pain", "X ache" style
    for m in re.finditer(r"\b(\w+(?:\s+\w+)?)\s+(?:pain|ache)\b", text):
        found.add(m.group(1).strip() + " pain")
    return list(found) if found else [text[:200]]  # fallback: use first 200 chars as "symptom" for vectorization


def _symptom_text_for_vectorizer(symptoms: list[str]) -> str:
    """Single string for vectorizer (model may expect space-joined symptoms)."""
    return " ".join(symptoms) if symptoms else ""


# ---------- PDF Generation ----------

def generate_pdf(body: ConfirmInput, doctor_user):
    """Generate PDF prescription"""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 20)
    c.drawString(50, height - 50, "Medical Prescription")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 80, f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    c.drawString(50, height - 95, f"Doctor: {doctor_user.get('email', 'Unknown')}")
    c.drawString(50, height - 110, f"Patient: {body.patient_email}")
    
    # Line
    c.line(50, height - 120, width - 50, height - 120)
    
    # Diagnosis
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 150, "Diagnosis:")
    c.setFont("Helvetica", 12)
    c.drawString(70, height - 170, body.final_diagnosis)
    
    # Symptoms
    y = height - 200
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "Symptoms:")
    c.setFont("Helvetica", 12)
    y -= 20
    for symptom in body.symptoms[:5]:
        c.drawString(70, y, f"• {symptom}")
        y -= 15
    
    # Prescription
    y -= 15
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "Prescription:")
    y -= 20
    c.setFont("Helvetica", 12)
    c.drawString(70, y, f"Medication: {body.prescription.get('medication', 'N/A')}")
    y -= 15
    c.drawString(70, y, f"Dosage: {body.prescription.get('dosage', 'N/A')}")
    y -= 15
    c.drawString(70, y, f"Instructions: {body.prescription.get('instructions', 'N/A')}")
    
    # AI Predictions
    y -= 30
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "AI Suggested Diagnoses:")
    y -= 20
    c.setFont("Helvetica", 10)
    for pred in body.predictions[:3]:
        confidence = pred.get('confidence', 0) * 100
        c.drawString(70, y, f"• {pred.get('disease', 'Unknown')} ({confidence:.0f}% confidence)")
        y -= 15
    
    # Footer
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(50, 50, "This is a computer-generated prescription. Valid with doctor's signature.")
    
    c.save()
    buffer.seek(0)
    return buffer


# ---------- Auth routes ----------


@router.post("/auth/signup", response_model=AuthResponse)
async def auth_signup(body: SignupInput, request: Request):
    """Register doctor or patient. Email is stored and matched case-insensitively."""
    db = get_db(request)
    email_normalized = (body.email or "").strip().lower()
    if not email_normalized:
        raise HTTPException(400, "Email is required.")
    if db is not None:
        users = db["users"]
        existing = users.find_one({
            "email": {"$regex": f"^{re.escape(email_normalized)}$", "$options": "i"},
        })
        if existing:
            raise HTTPException(400, "Email already registered")
    else:
        if any((e or "").strip().lower() == email_normalized for e in _memory_users):
            raise HTTPException(400, "Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed = hash_password(body.password)
    
    doc = {
        "id": user_id,
        "name": (body.name or "").strip(),
        "email": email_normalized,
        "hashed_password": hashed,
        "role": (body.role or "patient").lower(),
    }
    
    if db is not None:
        db["users"].insert_one(doc)
    else:
        _memory_users[email_normalized] = doc
    
    token = create_access_token({
        "sub": user_id,
        "email": doc["email"],
        "role": doc["role"],
        "name": doc["name"],
    })
    return AuthResponse(
        access_token=token,
        user={
            "id": user_id,
            "email": doc["email"],
            "role": doc["role"],
            "name": doc["name"],
        },
    )


@router.post("/auth/login", response_model=AuthResponse)
async def auth_login(body: LoginInput, request: Request):
    """Login and return JWT. Uses MongoDB if connected; otherwise in-memory (dev fallback).
    Email matching is case-insensitive."""
    db = get_db(request)
    email_lower = (body.email or "").strip().lower()
    if db is not None:
        user = db["users"].find_one({
            "email": {"$regex": f"^{re.escape(email_lower)}$", "$options": "i"},
        })
    else:
        user = next(
            (u for e, u in _memory_users.items() if (e or "").strip().lower() == email_lower),
            None,
        )
    
    if not user or not verify_password(body.password, user.get("hashed_password", "")):
        raise HTTPException(401, "Invalid email or password")
    
    user_id = user.get("id") or str(user.get("_id", ""))
    role = user.get("role", "patient")
    name = user.get("name", "")  # Get the stored name
    
    print(f"User logged in: {body.email}, name: {name}")  # Debug log
    
    token = create_access_token({
        "sub": user_id, 
        "email": user["email"], 
        "role": role,
        "name": name  # Add name to token
    })
    
    return AuthResponse(
        access_token=token,
        user={
            "id": user_id, 
            "email": user["email"], 
            "role": role,
            "name": name
        },
    )


# ---------- Record / Diagnosis / Patient routes ----------


@router.post("/record/upload", response_model=dict)
async def record_upload(
    file: UploadFile = File(...),
    user=Depends(require_doctor),
):
    """Accept audio file upload; store temporarily; return upload_id for transcribe step."""
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(400, "Expected an audio file")
    upload_id = str(uuid.uuid4())
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "audio").suffix or ".webm"
    path = DATA_DIR / f"upload_{upload_id}{suffix}"
    try:
        content = await file.read()
        path.write_bytes(content)
        _upload_paths[upload_id] = str(path)
        return {"upload_id": upload_id, "path": str(path)}
    except Exception as e:
        logger.exception("Upload failed: %s", e)
        raise HTTPException(500, "Upload failed")


def _find_upload_path(upload_id: str) -> Path | None:
    """Get path to uploaded audio; check _upload_paths first, then DATA_DIR (for multi-worker)."""
    path_str = _upload_paths.get(upload_id)
    if path_str and Path(path_str).exists():
        return Path(path_str)
    # Fallback: file may have been written by another worker; find by pattern in DATA_DIR
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for p in DATA_DIR.glob(f"upload_{upload_id}.*"):
        if p.is_file():
            return p
    return None


@router.post("/record/transcribe", response_model=TranscribeResponse)
async def record_transcribe(
    body: TranscribeInput,
    user=Depends(require_doctor),
):
    """Transcribe uploaded audio using Whisper. Returns transcript."""
    path = _find_upload_path(body.upload_id)
    if path is None:
        raise HTTPException(404, "Upload not found or expired")
    path_str = str(path)
    try:
        from faster_whisper import WhisperModel 
        model = WhisperModel("base", device="cpu", compute_type="int8")
        
        # Transcribe
        segments, info = model.transcribe(path_str)
        print(f"Detected language: {info.language}")
        
        # Fix: segments is an iterator, not a list of dicts
        transcript_parts = []
        for segment in segments:
            # Check what type segment is
            if hasattr(segment, 'text'):
                transcript_parts.append(segment.text)
            elif isinstance(segment, dict):
                transcript_parts.append(segment.get('text', ''))
            elif isinstance(segment, (list, tuple)):
                # If it's a tuple/list, try to get text from the first element
                if len(segment) > 0:
                    transcript_parts.append(str(segment[0]))
            else:
                transcript_parts.append(str(segment))
        
        transcript = " ".join(transcript_parts).strip() or "[No speech detected]"
        print(f"Transcript: {transcript[:100]}...")
        
        try:
            path.unlink(missing_ok=True)
        except Exception:
            pass
        _upload_paths.pop(body.upload_id, None)
        return TranscribeResponse(transcript=transcript, upload_id=body.upload_id)
    except ImportError:
        # Stub when faster_whisper not installed
        return TranscribeResponse(
            transcript=STUB_TRANSCRIPT_MESSAGE,
            upload_id=body.upload_id,
            is_stub=True,
        )
    except Exception as e:
        logger.exception("Transcribe failed: %s", e)
        print(f"Transcription error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Transcription failed: {e}")


@router.post("/diagnosis/analyze", response_model=AnalyzeResponse)
async def diagnosis_analyze(
    body: AnalyzeInput,
    request: Request,
    user=Depends(require_doctor),
):
    """Extract symptoms from transcript, run KNN, return predictions and common/edge classification."""
    model = get_model(request)
    vectorizer = get_vectorizer(request)
    symptoms = extract_symptoms_from_transcript(body.transcript)
    text_for_vec = _symptom_text_for_vectorizer(symptoms)

    if not vectorizer or not model:
        # Stub response when ML not loaded
        return AnalyzeResponse(
            symptoms=symptoms,
            predictions=[
                {"disease": "Unknown (model not loaded)", "confidence": 0.0, "is_edge_case": False},
            ],
            common=[],
            edge_cases=[],
        )

    try:
        X = vectorizer.transform([text_for_vec])
        # KNN may expose predict_proba or only predict
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X)[0]
            classes = model.classes_
            top_indices = probs.argsort()[-5:][::-1]
            predictions = [
                {
                    "disease": str(classes[i]),
                    "confidence": float(probs[i]),
                    "is_edge_case": float(probs[i]) < 0.3,
                }
                for i in top_indices
            ]
        else:
            pred = model.predict(X)[0]
            predictions = [
                {"disease": str(pred), "confidence": 1.0, "is_edge_case": False},
            ]
        common = [p["disease"] for p in predictions if not p.get("is_edge_case", False)]
        edge_cases = [p["disease"] for p in predictions if p.get("is_edge_case", False)]
        return AnalyzeResponse(
            symptoms=symptoms,
            predictions=predictions,
            common=common,
            edge_cases=edge_cases,
        )
    except Exception as e:
        logger.exception("Analyze failed: %s", e)
        raise HTTPException(500, f"Analysis failed: {e}")


def _resolve_patient_id_by_email(request: Request, patient_email: str) -> str:
    """Resolve patient email to user id (from DB or in-memory). Only matches users with role 'patient'.
    Email matching is case-insensitive. Raises HTTPException if no patient found."""
    db = get_db(request)
    email_lower = (patient_email or "").strip().lower()
    if not email_lower:
        raise HTTPException(400, "Patient email is required.")
    if db is not None:
        user = db["users"].find_one({
            "role": "patient",
            "email": {"$regex": f"^{re.escape(email_lower)}$", "$options": "i"},
        })
        if not user:
            raise HTTPException(400, "No patient found with that email. Patient must sign up first.")
        return user.get("id") or str(user.get("_id", ""))
    for email, u in _memory_users.items():
        if (email or "").strip().lower() == email_lower and (u.get("role") or "").lower() == "patient":
            return u.get("id", "")
    raise HTTPException(400, "No patient found with that email. Patient must sign up first.")


@router.post("/diagnosis/confirm", response_model=ConfirmResponse)
async def diagnosis_confirm(
    body: ConfirmInput,
    request: Request,
    user=Depends(require_doctor),
):
    """Persist final diagnosis and prescription. NO PDF auto-save - just store in DB."""
    patient_id = _resolve_patient_id_by_email(request, body.patient_email)
    db = get_db(request)
    
    # Generate PDF for storage only (not for auto-save)
    pdf_buffer = generate_pdf(body, user)
    pdf_base64 = base64.b64encode(pdf_buffer.getvalue()).decode('utf-8')
    
    # Generate filename for reference
    patient_prefix = body.patient_email.split('@')[0]
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    pdf_filename = f"prescription_{patient_prefix}_{timestamp}.pdf"
    
    # DON'T save to Desktop here - let frontend handle download

    if db is not None:
        try:
            diagnoses = db["diagnoses"]
            prescriptions = db["prescriptions"]
            explanation = _generate_diagnosis_explanation(body.final_diagnosis, body.symptoms or None)
            diagnosis_doc = {
                "patient_id": patient_id,
                "patient_email": body.patient_email.strip().lower(),
                "session_id": body.session_id,
                "symptoms": body.symptoms,
                "predictions": body.predictions,
                "edge_cases": [{"name": ec.name, "further_steps": ec.further_steps or ""} for ec in body.edge_cases],
                "final_diagnosis": body.final_diagnosis,
                "explanation": explanation,
                "pdf_data": pdf_base64,
                "pdf_filename": pdf_filename,
                "created_at": datetime.now()
            }
            result = diagnoses.insert_one(diagnosis_doc)
            diagnosis_id = str(result.inserted_id)
            
            prescription_doc = {
                "patient_id": patient_id,
                "diagnosis_id": diagnosis_id,
                "medication": body.prescription.get("medication", ""),
                "dosage": body.prescription.get("dosage", ""),
                "instructions": body.prescription.get("instructions", ""),
            }
            pres_result = prescriptions.insert_one(prescription_doc)
            prescription_id = str(pres_result.inserted_id)
            
            return ConfirmResponse(
                success=True, 
                diagnosis_id=diagnosis_id, 
                prescription_id=prescription_id,
                pdf_path=None  # No auto-save path
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Confirm failed: %s", e)
            raise HTTPException(500, f"Save failed: {e}")

    # In-memory fallback
    explanation = _generate_diagnosis_explanation(body.final_diagnosis, body.symptoms or None)
    diagnosis_id = str(uuid.uuid4())
    diagnosis_doc = {
        "id": diagnosis_id,
        "patient_id": patient_id,
        "symptoms": body.symptoms,
        "predictions": body.predictions,
        "edge_cases": [{"name": ec.name, "further_steps": ec.further_steps or ""} for ec in body.edge_cases],
        "final_diagnosis": body.final_diagnosis,
        "explanation": explanation,
        "pdf_data": pdf_base64,
        "pdf_filename": pdf_filename,
    }
    prescription_doc = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "diagnosis_id": diagnosis_id,
        "medication": body.prescription.get("medication", ""),
        "dosage": body.prescription.get("dosage", ""),
        "instructions": body.prescription.get("instructions", ""),
    }
    _memory_diagnoses.setdefault(patient_id, []).append(diagnosis_doc)
    _memory_prescriptions.setdefault(patient_id, []).append(prescription_doc)
    return ConfirmResponse(
        success=True, 
        diagnosis_id=diagnosis_id, 
        prescription_id=prescription_doc["id"],
        pdf_path=None
    )


@router.post("/diagnosis/generate-pdf")
async def generate_pdf_endpoint(
    body: PDFGenerateInput,
    request: Request,
    user=Depends(require_doctor),
):
    """Generate PDF and return as download"""
    try:
        # Create a mock ConfirmInput object
        class MockConfirmInput:
            def __init__(self, body):
                self.patient_email = body.patient_email
                self.final_diagnosis = body.final_diagnosis
                self.prescription = body.prescription
                self.symptoms = body.symptoms
                self.predictions = body.predictions
        
        mock_input = MockConfirmInput(body)
        pdf_buffer = generate_pdf(mock_input, user)
        
        # Return PDF as download
        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=prescription_{body.patient_email.split('@')[0]}.pdf"
            }
        )
    except Exception as e:
        logger.exception("PDF generation failed: %s", e)
        raise HTTPException(500, f"PDF generation failed: {e}")


@router.post("/diagnosis/patient-twin", response_model=PatientTwinResponse)
async def generate_patient_twin(
    body: PatientTwinInput,
    request: Request,
    user=Depends(require_doctor),
):
    """
    Generate a complete "Patient Twin" from conversation:
    - Extracted symptoms with confidence
    - Top diagnoses with probabilities
    - Risk score
    - Patient-friendly story summary
    - QR code data
    - Audio summary snippet
    """
    model = get_model(request)
    vectorizer = get_vectorizer(request)
    
    # Extract symptoms
    symptoms = extract_symptoms_from_transcript(body.transcript)
    text_for_vec = _symptom_text_for_vectorizer(symptoms)
    
    # Get predictions
    predictions = []
    risk_score = "LOW"
    
    if vectorizer and model and text_for_vec:
        try:
            X = vectorizer.transform([text_for_vec])
            if hasattr(model, "predict_proba"):
                probs = model.predict_proba(X)[0]
                classes = model.classes_
                top_indices = probs.argsort()[-5:][::-1]
                predictions = [
                    {
                        "disease": str(classes[i]),
                        "probability": round(float(probs[i]), 2),
                    }
                    for i in top_indices if probs[i] > 0.05
                ]
                
                # Calculate risk score
                top_prob = probs[top_indices[0]] if len(top_indices) > 0 else 0
                if top_prob > 0.7 or len(symptoms) >= 4:
                    risk_score = "HIGH"
                elif top_prob > 0.4 or len(symptoms) >= 2:
                    risk_score = "MEDIUM"
        except Exception as e:
            logger.warning(f"Prediction failed: {e}")
    
    # Generate patient-friendly story
    story = f"During your visit, you mentioned "
    if symptoms:
        story += f"{', '.join(symptoms[:3])}"
        if len(symptoms) > 3:
            story += f" and {len(symptoms)-3} other symptoms"
    else:
        story += "your health concerns"
    
    if predictions:
        story += f". Based on this, we discussed the possibility of {predictions[0]['disease'].lower()}. "
    else:
        story += ". "
    
    story += f"Your risk level appears to be {risk_score}. "
    
    if risk_score == "HIGH":
        story += "We recommend seeing a specialist soon and following up within 48 hours."
    elif risk_score == "MEDIUM":
        story += "We recommend scheduling a follow-up within the week."
    else:
        story += "Continue monitoring your symptoms and follow up as needed."
    
    # Generate audio summary snippet (text that would be spoken)
    audio_summary = f"Patient presents with {', '.join(symptoms[:2])}. "
    if predictions:
        audio_summary += f"Top concern: {predictions[0]['disease']}. Risk level: {risk_score}."
    
    # QR code data (would be encoded into QR)
    qr_data = {
        "patient_twin_id": str(uuid.uuid4()),
        "timestamp": str(datetime.now()),
        "symptoms": symptoms[:5],
        "top_diagnosis": predictions[0]["disease"] if predictions else "Unknown",
        "risk": risk_score
    }
    
    # Format symptoms with confidence scores
    symptoms_with_confidence = []
    for i, s in enumerate(symptoms[:10]):
        # Simple confidence scoring based on position/frequency
        confidence = round(0.7 + (0.03 * i), 2)
        if confidence > 0.95:
            confidence = 0.95
        symptoms_with_confidence.append({
            "symptom": s,
            "confidence": confidence
        })
    
    return PatientTwinResponse(
        success=True,
        patient_twin={
            "extracted_symptoms": symptoms_with_confidence,
            "diagnosis_predictions": predictions,
            "risk_score": risk_score,
            "patient_story": story,
            "audio_summary": audio_summary,
            "qr_data": qr_data,
            "qr_code_url": f"/api/qr/{qr_data['patient_twin_id']}"  # You'd generate actual QR
        }
    )


@router.get("/patient/{patient_id}")
async def patient_get(
    patient_id: str,
    request: Request,
    user=Depends(require_user),
):
    """Fetch patient's diagnoses and prescriptions for dashboard. Patient can only access own id."""
    if user.get("role") == "patient" and user.get("sub") != patient_id:
        raise HTTPException(403, "Can only view own dashboard")
    db = get_db(request)
    if db is None:
        diagnoses = _memory_diagnoses.get(patient_id, [])
        prescriptions = _memory_prescriptions.get(patient_id, [])
        latest = diagnoses[0] if diagnoses else {}
        preds = latest.get("predictions", [])
        raw_edge = latest.get("edge_cases") or [p.get("disease", "") for p in preds if p.get("is_edge_case")]
        edge_cases = _edge_cases_for_patient(raw_edge)
        explanation = (latest.get("explanation") or "").strip()
        final_diag = (latest.get("final_diagnosis") or "").strip()
        if final_diag and (not explanation or explanation == final_diag):
            ai_explanation = _generate_diagnosis_explanation(
                latest.get("final_diagnosis"),
                latest.get("symptoms"),
            )
            if ai_explanation:
                explanation = ai_explanation
                latest["explanation"] = ai_explanation
        if not explanation:
            explanation = final_diag or ""
        return {
            "patient_id": patient_id,
            "diagnoses": diagnoses,
            "prescriptions": prescriptions,
            "explanation": explanation,
            "edge_cases": edge_cases,
        }

    try:
        diagnoses_coll = db["diagnoses"]
        prescriptions_coll = db["prescriptions"]
        diagnoses = list(diagnoses_coll.find({"patient_id": patient_id}).sort("_id", -1))
        prescriptions = list(prescriptions_coll.find({"patient_id": patient_id}).sort("_id", -1))
        latest = diagnoses[0] if diagnoses else {}
        explanation = (latest.get("explanation") or "").strip()
        final_diag = (latest.get("final_diagnosis") or "").strip()
        if final_diag and (not explanation or explanation == final_diag):
            ai_explanation = _generate_diagnosis_explanation(
                latest.get("final_diagnosis"),
                latest.get("symptoms"),
            )
            if ai_explanation:
                explanation = ai_explanation
                diagnoses_coll.update_one(
                    {"_id": latest["_id"]},
                    {"$set": {"explanation": ai_explanation}},
                )
                latest["explanation"] = ai_explanation
        if not explanation:
            explanation = final_diag or ""
        preds = latest.get("predictions", [])
        raw_edge = latest.get("edge_cases") or [p.get("disease", "") for p in preds if p.get("is_edge_case")]
        edge_cases = _edge_cases_for_patient(raw_edge)

        # Serialize ObjectId (copy to avoid mutating cursor docs)
        def doc_to_dict(d):
            out = dict(d)
            out["id"] = str(out.pop("_id", ""))
            # Convert ObjectId to string for pdf_data if needed
            if "pdf_data" in out and not isinstance(out["pdf_data"], str):
                out["pdf_data"] = str(out["pdf_data"])
            return out

        diagnoses = [doc_to_dict(d) for d in diagnoses]
        prescriptions = [doc_to_dict(d) for d in prescriptions]

        # Return PDF data for the latest diagnosis
        pdf_data = latest.get("pdf_data", "") if latest else ""
        pdf_filename = latest.get("pdf_filename", "prescription.pdf") if latest else "prescription.pdf"
        
        return {
            "patient_id": patient_id,
            "diagnoses": diagnoses,
            "prescriptions": prescriptions,
            "explanation": explanation,
            "edge_cases": edge_cases,
            "pdf_data": pdf_data,
            "pdf_filename": pdf_filename
        }
    except Exception as e:
        logger.exception("Patient get failed: %s", e)
        raise HTTPException(500, f"Failed to load patient: {e}")