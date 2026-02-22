"""Configuration settings loaded from environment."""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend/ (parent of app/) so env is set before os.getenv()
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_PATH)

# Base paths: backend/app -> backend/data. Relative paths are resolved from backend root.
# So DATA_DIR=data -> backend/data (train.py writes here); ../data would resolve to project/data.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_default_data = _BACKEND_ROOT / "data"


def _resolve_path(env_key: str, default: Path) -> Path:
    raw = os.getenv(env_key)
    if not raw:
        return default.resolve()
    p = Path(raw)
    if p.is_absolute():
        return p.resolve()
    resolved = (_BACKEND_ROOT / raw).resolve()
    # If env had "../data", resolved is project/data; train.py writes to backend/data. Prefer backend/data.
    if not resolved.is_relative_to(_BACKEND_ROOT) and (_BACKEND_ROOT / "data").exists():
        backend_data = (_BACKEND_ROOT / "data").resolve()
        return backend_data if resolved.name == "data" else (backend_data / resolved.name).resolve()
    return resolved


DATA_DIR = _resolve_path("DATA_DIR", _default_data)
MODEL_PATH = _resolve_path("MODEL_PATH", DATA_DIR / "model.pkl")
VECTORIZER_PATH = _resolve_path("VECTORIZER_PATH", DATA_DIR / "vectorizer.pkl")

# MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "diagnosis_decoder")

# Auth (JWT)
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week
