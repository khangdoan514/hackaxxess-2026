"""
API route definitions: auth, record upload/transcribe, diagnosis analyze/confirm, patient.
"""
import logging
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.config import DATA_DIR
from app.auth import hash_password, verify_password, create_access_token, decode_access_token

logger = logging.getLogger(__name__)

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


class ConfirmInput(BaseModel):
    patient_email: str = Field(..., description="Patient's email; diagnosis will show on their dashboard when they log in")
    session_id: str | None = None
    final_diagnosis: str
    prescription: dict = Field(..., description="medication, dosage, instructions")
    symptoms: list[str] = Field(default_factory=list)
    predictions: list[dict] = Field(default_factory=list)


class ConfirmResponse(BaseModel):
    success: bool
    diagnosis_id: str | None = None
    prescription_id: str | None = None


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


# ---------- Auth routes ----------


@router.post("/auth/signup", response_model=AuthResponse)
async def auth_signup(body: SignupInput, request: Request):
    """Register doctor or patient. Uses MongoDB if connected; otherwise in-memory (dev fallback)."""
    db = get_db(request)
    if db is not None:
        users = db["users"]
        existing = users.find_one({"email": body.email})
        if existing:
            raise HTTPException(400, "Email already registered")
    else:
        if body.email in _memory_users:
            raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    hashed = hash_password(body.password)
    doc = {"id": user_id, "email": body.email, "hashed_password": hashed, "role": body.role}
    if db is not None:
        db["users"].insert_one(doc)
    else:
        _memory_users[body.email] = doc
    token = create_access_token({"sub": user_id, "email": body.email, "role": body.role})
    return AuthResponse(
        access_token=token,
        user={"id": user_id, "email": body.email, "role": body.role},
    )


@router.post("/auth/login", response_model=AuthResponse)
async def auth_login(body: LoginInput, request: Request):
    """Login and return JWT. Uses MongoDB if connected; otherwise in-memory (dev fallback)."""
    db = get_db(request)
    if db is not None:
        user = db["users"].find_one({"email": body.email})
    else:
        user = _memory_users.get(body.email)
    if not user or not verify_password(body.password, user.get("hashed_password", "")):
        raise HTTPException(401, "Invalid email or password")
    user_id = user.get("id") or str(user.get("_id", ""))
    role = user.get("role", "patient")
    token = create_access_token({"sub": user_id, "email": user["email"], "role": role})
    return AuthResponse(
        access_token=token,
        user={"id": user_id, "email": user["email"], "role": role},
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
        model = WhisperModel("large-v3", device="cpu", compute_type="int8")
        segments, _ = model.transcribe(path_str)
        transcript = " ".join(s["text"] for s in segments).strip() or "[No speech detected]"
        try:
            path.unlink(missing_ok=True)
        except Exception:
            pass
        _upload_paths.pop(body.upload_id, None)
        return TranscribeResponse(transcript=transcript, upload_id=body.upload_id)
    except ImportError:
        # Stub when faster_whisper not installed or failing
        return TranscribeResponse(
            transcript=STUB_TRANSCRIPT_MESSAGE,
            upload_id=body.upload_id,
            is_stub=True,
        )
    except Exception as e:
        logger.exception("Transcribe failed: %s", e)
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
    """Resolve patient email to user id (from DB or in-memory). Raises HTTPException if not found."""
    db = get_db(request)
    email_lower = patient_email.strip().lower()
    if db is not None:
        user = db["users"].find_one({"email": {"$regex": f"^{re.escape(email_lower)}$", "$options": "i"}})
        if not user:
            raise HTTPException(400, "No patient found with that email. Patient must sign up first.")
        return user.get("id") or str(user.get("_id", ""))
    for email, u in _memory_users.items():
        if email.lower() == email_lower:
            return u.get("id", "")
    raise HTTPException(400, "No patient found with that email. Patient must sign up first.")


@router.post("/diagnosis/confirm", response_model=ConfirmResponse)
async def diagnosis_confirm(
    body: ConfirmInput,
    request: Request,
    user=Depends(require_doctor),
):
    """Persist final diagnosis and prescription. Doctor enters patient email; stored under that patient's account."""
    patient_id = _resolve_patient_id_by_email(request, body.patient_email)
    db = get_db(request)

    if db is not None:
        try:
            diagnoses = db["diagnoses"]
            prescriptions = db["prescriptions"]
            diagnosis_doc = {
                "patient_id": patient_id,
                "patient_email": body.patient_email.strip().lower(),
                "session_id": body.session_id,
                "symptoms": body.symptoms,
                "predictions": body.predictions,
                "final_diagnosis": body.final_diagnosis,
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
            return ConfirmResponse(success=True, diagnosis_id=diagnosis_id, prescription_id=prescription_id)
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Confirm failed: %s", e)
            raise HTTPException(500, f"Save failed: {e}")

    # In-memory fallback (no MongoDB)
    diagnosis_id = str(uuid.uuid4())
    diagnosis_doc = {
        "id": diagnosis_id,
        "patient_id": patient_id,
        "symptoms": body.symptoms,
        "predictions": body.predictions,
        "final_diagnosis": body.final_diagnosis,
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
    return ConfirmResponse(success=True, diagnosis_id=diagnosis_id, prescription_id=prescription_doc["id"])


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
        edge_cases = [p.get("disease", "") for p in preds if p.get("is_edge_case")]
        return {
            "patient_id": patient_id,
            "diagnoses": diagnoses,
            "prescriptions": prescriptions,
            "explanation": latest.get("final_diagnosis", "") or "",
            "edge_cases": edge_cases,
        }

    try:
        diagnoses_coll = db["diagnoses"]
        prescriptions_coll = db["prescriptions"]
        diagnoses = list(diagnoses_coll.find({"patient_id": patient_id}).sort("_id", -1))
        prescriptions = list(prescriptions_coll.find({"patient_id": patient_id}).sort("_id", -1))
        # Serialize ObjectId (copy to avoid mutating cursor docs)
        def doc_to_dict(d):
            out = dict(d)
            out["id"] = str(out.pop("_id", ""))
            return out
        diagnoses = [doc_to_dict(d) for d in diagnoses]
        prescriptions = [doc_to_dict(d) for d in prescriptions]
        latest = diagnoses[0] if diagnoses else {}
        explanation = latest.get("final_diagnosis", "") or ""
        preds = latest.get("predictions", [])
        edge_cases = [p.get("disease", "") for p in preds if p.get("is_edge_case")]
        return {
            "patient_id": patient_id,
            "diagnoses": diagnoses,
            "prescriptions": prescriptions,
            "explanation": explanation,
            "edge_cases": edge_cases,
        }
    except Exception as e:
        logger.exception("Patient get failed: %s", e)
        raise HTTPException(500, f"Failed to load patient: {e}")
