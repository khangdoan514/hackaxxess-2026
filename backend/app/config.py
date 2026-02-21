"""Configuration settings loaded from environment."""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend/ (parent of app/) so env is set before os.getenv()
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_PATH)

# Base paths: backend/app -> backend/data
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", str(_BACKEND_ROOT / "data"))).resolve()
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(DATA_DIR / "model.pkl"))).resolve()
VECTORIZER_PATH = Path(os.getenv("VECTORIZER_PATH", str(DATA_DIR / "vectorizer.pkl"))).resolve()

# MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "diagnosis_decoder")

# Kaggle (for training)
KAGGLE_DATASET = os.getenv("KAGGLE_DATASET", "kaushil268/disease-prediction-using-machine-learning")

# Auth (JWT)
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week
