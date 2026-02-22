# **Diagnosis Decoder**

Diagnosis Decoder is an AI-powered clinical assistant that transforms clinician conversations into structured medical documentation, diagnostic insights, and personalized patient care experiences. The system combines speech-to-text processing, machine learning–based diagnostic prediction, and large language model reasoning to support clinicians during visits while improving patient understanding after discharge.

---

## **Overview**

Clinical visits generate large amounts of unstructured information, much of which is lost or misunderstood after the appointment. Clinicians spend significant time documenting encounters, while patients often leave without fully understanding their diagnosis or treatment plan.

Diagnosis Decoder addresses both problems through a unified workflow:

1. Capture clinician dictation using speech-to-text.

2. Extract structured clinical signals from conversation.

3. Generate differential diagnoses using a trained prediction model.

4. Produce explainable summaries for clinicians.

5. Create a personalized post-visit companion accessible via QR code.

6. Deliver multilingual and accessible recovery explanations through an AI avatar.

The system acts as clinical decision support rather than autonomous diagnosis.

---

## **Key Features**

### **Speech-to-Text Clinical Documentation**

Clinician dictation is converted into structured text in real time. Audio is processed transiently and is not permanently stored.

### **Diagnostic Intelligence Engine**

A custom-trained machine learning model predicts likely diagnoses based on extracted symptoms and patient context. The system outputs ranked diagnostic probabilities rather than a single conclusion.

### **Explainable AI Reasoning**

Each suggested diagnosis includes supporting clinical evidence derived from the conversation, improving transparency and trust.

### **EMR-Ready Structured Output**

The assistant generates structured summaries suitable for electronic medical record workflows, including symptoms, assessments, and treatment plans.

### **Personalized Care Companion**

At the end of a visit, a QR code is generated for the patient. Scanning it opens a secure temporary webpage containing:

- Plain-language diagnosis explanation  

- Medication and prescription list  

- Recovery expectations  

- Follow-up guidance  

### **Context-Aware Patient Chatbot**

The companion page includes a chatbot preloaded with visit context. Patients can ask questions about their care and receive answers grounded only in their recorded visit data.

Example:

Patient: "What medication was prescribed?"  
Response: "You were prescribed Amoxicillin 500mg twice daily based on your visit today."

### **EMR-to-Avatar Translator**
Structured visit summaries are converted into short multilingual avatar videos that verbally explain recovery instructions. This improves accessibility for patients with language barriers, low literacy, or visual impairments.

---

## **System Architecture**
```bash
Consultation Audio
↓
Speech-to-Text Engine
↓
Clinical Information Extraction (LLM)
↓
Custom Diagnostic ML Model
↓
Diagnosis Probabilities
↓
Explanation Generator (LLM)
↓
Structured Outputs
├── EMR Summary
├── QR Care Companion
└── Avatar Video Explanation
```

---

## **Machine Learning Component**

Rather than relying solely on prompting, Diagnosis Decoder integrates a trained diagnostic prediction model.

### **Model Purpose**

Predict differential diagnosis probabilities from structured symptom features.

### **Model Inputs**

- Extracted symptoms

- Duration indicators

- Patient attributes (when available)

- Risk factors identified in conversation

### **Model Outputs**

Probability distribution across candidate diagnoses.

The prediction model is combined with language models that generate human-readable reasoning and patient explanations. This hybrid design separates prediction from explanation, improving interpretability and system reliability.

---

## **Privacy Design**

The system follows a privacy-first approach:

- Audio is processed only during active sessions.

- Raw recordings are not stored permanently.

- Only structured clinical outputs are retained.

- Patient companion pages are temporary and session-scoped.

Diagnosis Decoder is designed as clinical decision support and does not replace physician judgment.

---

## **Technology Stack**

### **Frontend**

- React / Next.js  

- Web audio capture  

- Dynamic patient companion pages  

### **Backend**

- Python (FastAPI) or Node.js  

- API orchestration layer  

### **AI Components**

- Speech-to-text API  

- Large language model for extraction and explanation  

- Custom trained diagnostic classifier  

### **Additional Services**

- QR code generation  

- Avatar video generation API  

- Translation services  

---

## **Workflow**

1. Clinician begins dictation during consultation.  

2. Speech is transcribed into text.  

3. Clinical entities and symptoms are extracted.  

4. The diagnostic model predicts likely conditions.  

5. AI generates structured documentation and explanations.  

6. A QR code is created at visit completion.  

7. Patient accesses personalized care companion.  

8. Chatbot and avatar provide ongoing clarification.

---

## **Use Cases**

- Faster clinical documentation during consultations  

- Telehealth visit summarization  

- Emergency triage support  

- Multilingual patient communication  

- Accessibility-focused discharge instructions  

- Audit-ready structured records  

---

## **Project Goals**

- Reduce clinician documentation burden  

- Improve diagnostic transparency  

- Increase patient comprehension and adherence  

- Provide accessible healthcare communication tools  

- Demonstrate responsible AI use in clinical workflows  

---

## **Limitations**

- Intended for demonstration and research purposes.  

- Not validated for real clinical deployment.  

- Outputs are decision support, not medical diagnoses.  

- Requires clinician oversight.

---

## **Setup & Run**

### Project structure

```
project-root/
├── backend/
│   ├── app/
│   │   ├── main.py       # FastAPI entrypoint, ML load, MongoDB
│   │   ├── api.py        # API routes (auth, record, diagnosis, patient)
│   │   ├── config.py     # Configuration
│   │   └── auth.py       # JWT and password hashing
│   ├── data/             # model.pkl, vectorizer.pkl, uploads (add after training)
│   ├── train.py          # KNN training script (symptoms-to-disease CSV)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/        # Login, Record, Diagnosis, PatientDashboard
│   │   ├── components/   # ProtectedRoute, etc.
│   │   ├── context/      # AuthContext
│   │   └── lib/          # api.js (axios)
│   └── package.json
└── README.md
```

### Backend

1. From project root: `cd backend`
2. Create venv: `python -m venv venv`
3. Activate: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Linux/Mac)
4. Install: `pip install -r requirements.txt`
5. Optional: set `.env` in `backend/` (see below)
6. Run: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` (from `backend/` so `app` package is found)

**Optional – Speech-to-text (Whisper):** If `pip install -r requirements.txt` fails on Windows with an error building the `av` package (FFmpeg bindings), the core app will still run; the transcribe endpoint returns a stub transcript. To enable real transcription, install Whisper separately (e.g. in WSL or a conda env with FFmpeg): `pip install -r requirements-whisper.txt`.

Backend runs at **http://localhost:8000**.

### Frontend

1. From project root: `cd frontend`
2. Install: `npm install`
3. Copy `.env.example` to `.env` and set `VITE_API_URL=http://localhost:8000`
4. Run: `npm run dev`

Frontend runs at **http://localhost:5173**.

### ML training

Uses **kagglehub** to download [abhishekgodara/symptoms-to-diseases](https://www.kaggle.com/datasets/abhishekgodara/symptoms-to-diseases) if the CSV is not already in `backend/data/`.

1. **Authenticate with Kaggle** (needed for download): [Kaggle API token](https://www.kaggle.com/settings) → copy token, then either:
   - `export KAGGLE_API_TOKEN=your_token` (Linux/Mac) or `set KAGGLE_API_TOKEN=your_token` (Windows CMD), or
   - run `python -c "import kagglehub; kagglehub.login()"` and paste the token when prompted.
2. From `backend/` (with venv activated): `python train.py`  
   If `final_symptoms_to_disease.csv` is not in `data/`, it will be downloaded via kagglehub; then the script writes `data/model.pkl` and `data/vectorizer.pkl`.

Optional env: `DATA_DIR` (default `backend/data`), `TRAIN_CSV` (default `final_symptoms_to_disease.csv`).

### Environment variables

**Backend** (e.g. `backend/.env`):

- `MONGO_URI` — MongoDB connection string (default: `mongodb://localhost:27017`)
- `DB_NAME` — Database name (default: `diagnosis_decoder`)
- `MODEL_PATH` — Path to `model.pkl` (default: `backend/data/model.pkl`)
- `VECTORIZER_PATH` — Path to `vectorizer.pkl`
- `DATA_DIR` — Directory for data and training CSV (default: `backend/data`)
- `JWT_SECRET` — Secret for JWT signing (set in production)

**Frontend** (e.g. `frontend/.env`):

- `VITE_API_URL` — Backend base URL (e.g. `http://localhost:8000`)

### Success criteria

- Doctor can sign up / log in and record audio; backend transcribes with Whisper.
- Backend extracts symptoms and runs KNN; returns disease list with common/edge classification.
- Doctor can confirm diagnosis and enter prescription; data saved to MongoDB.
- Patient can log in and open dashboard to see diagnosis, explanation, edge cases, and prescription.
- Auth: login/signup and role-based access (doctor: Record, Diagnosis; patient: Dashboard).