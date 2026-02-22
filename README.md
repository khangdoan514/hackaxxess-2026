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
│   ├── train.py          # KNN training script (Kaggle dataset)
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

**Windows (PowerShell or CMD):**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If you get an execution policy error when activating, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` (PowerShell), or use CMD and run: `venv\Scripts\activate.bat` instead.

**macOS / Linux (Terminal):**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Then (all platforms):** Copy `backend/.env.example` to `backend/.env` and edit if needed (see Configuration reference). From the `backend/` directory (with venv active):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at **http://localhost:8000**.

**Optional – Speech-to-text (Whisper):** On Windows, `pip install -r requirements-whisper.txt` often fails (FFmpeg/`av` build). The app works without it; doctors can paste the transcript on the Diagnosis page. On macOS you can try: `pip install -r requirements-whisper.txt`. For real transcription on Windows, use WSL or a conda env.

---

### Frontend

**Windows (PowerShell or CMD):**

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

**macOS / Linux (Terminal):**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

For local dev, leave `VITE_API_URL` empty in `frontend/.env` so the Vite proxy is used. Frontend runs at **http://localhost:5173**.

---

### Kaggle & ML training (optional)

**Windows:** Place `kaggle.json` in `C:\Users\<YourUsername>\.kaggle\kaggle.json`.

**macOS / Linux:** Place `kaggle.json` in `~/.kaggle/kaggle.json` and run `chmod 600 ~/.kaggle/kaggle.json`.

**Then (all platforms, from project root):**

```bash
cd backend
# with venv activated
pip install kaggle
python train.py
```

Or download the dataset manually:

- **Windows:** `kaggle datasets download -d kaushil268/disease-prediction-using-machine-learning -p backend\data --unzip`
- **macOS / Linux:** `kaggle datasets download -d kaushil268/disease-prediction-using-machine-learning -p backend/data --unzip`

Then run `python train.py` from `backend/`.

### Configuration reference

All config is via environment variables. Use a `.env` file in each app folder (see `.env.example`). Do not commit real secrets.

#### Backend (`backend/.env`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGO_URI` | MongoDB connection string (local or Atlas). | `mongodb://localhost:27017` | No (app works with in-memory fallback if unset/failed) |
| `DB_NAME` | MongoDB database name. | `diagnosis_decoder` | No |
| `DATA_DIR` | Directory for ML files and uploads. Relative to `backend/`. | `data` → `backend/data` | No |
| `MODEL_PATH` | Path to trained KNN model file. Relative to `backend/` or absolute. | `data/model.pkl` | No (analysis returns stub if missing) |
| `VECTORIZER_PATH` | Path to symptom vectorizer pickle. Relative to `backend/` or absolute. | `data/vectorizer.pkl` | No |
| `KAGGLE_DATASET` | Kaggle dataset for training script (e.g. `owner/dataset-name`). | `kaushil268/disease-prediction-using-machine-learning` | No (only for `train.py`) |
| `JWT_SECRET` | Secret key for signing JWTs. Use a long random string in production. | `change-me-in-production` | Yes in production |

**Backend path rules:** Relative values (e.g. `data`, `data/model.pkl`) are resolved from the `backend/` directory. Absolute paths are used as-is.

**Example `backend/.env`:**

```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=diagnosis_decoder
DATA_DIR=data
MODEL_PATH=data/model.pkl
VECTORIZER_PATH=data/vectorizer.pkl
KAGGLE_DATASET=kaushil268/disease-prediction-using-machine-learning
JWT_SECRET=your-long-random-secret-here
```

**Optional – Kaggle API (for `train.py`):** If not using `kaggle.json` in `~/.kaggle` or `%USERPROFILE%\.kaggle`, you can set:

| Variable | Description |
|----------|-------------|
| `KAGGLE_USERNAME` | Your Kaggle username |
| `KAGGLE_KEY` | Your Kaggle API key |

#### Frontend (`frontend/.env`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API base URL (no trailing slash). Leave **empty** in dev to use Vite proxy (`/api` → backend). | (empty) | No |

**Example `frontend/.env` (development with proxy):**

```env
# Leave empty so the app calls /api and Vite proxies to the backend (no CORS).
# VITE_API_URL=
```

**Example `frontend/.env` (production or direct backend URL):**

```env
VITE_API_URL=https://your-api.example.com
```

#### Summary

- **Backend:** Copy `backend/.env.example` to `backend/.env`, set `MONGO_URI` and `JWT_SECRET` at minimum.
- **Frontend:** Copy `frontend/.env.example` to `frontend/.env`; leave `VITE_API_URL` empty for local dev.
- **Secrets:** Never commit `.env`; it is in `.gitignore`.

### Success criteria

- Doctor can sign up / log in and record audio; backend transcribes with Whisper.
- Backend extracts symptoms and runs KNN; returns disease list with common/edge classification.
- Doctor can confirm diagnosis and enter prescription; data saved to MongoDB.
- Patient can log in and open dashboard to see diagnosis, explanation, edge cases, and prescription.
- Auth: login/signup and role-based access (doctor: Record, Diagnosis; patient: Dashboard).