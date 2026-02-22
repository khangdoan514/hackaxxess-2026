from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import uvicorn

from config import MODEL_PATH, VECTORIZER_PATH, MONGO_URI, DB_NAME
from api import router as api_router

logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"}


class EnsureCORSHeadersMiddleware(BaseHTTPMiddleware):
    """Ensure CORS headers are on every response so browser never blocks on missing header."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        origin = request.headers.get("origin")
        if origin and (origin in ALLOWED_ORIGINS or "localhost" in origin or "127.0.0.1" in origin):
            response.headers.setdefault("Access-Control-Allow-Origin", origin)
            response.headers.setdefault("Access-Control-Allow-Credentials", "true")
        return response

def load_ml_artifacts():
    """Load KNN model and vectorizer from disk. Graceful if missing (e.g. before training)."""
    model, vectorizer = None, None
    try:
        import pickle
        if MODEL_PATH.exists():
            with open(MODEL_PATH, "rb") as f:
                model = pickle.load(f)
            logger.info("Loaded KNN model from %s", MODEL_PATH)
        else:
            logger.warning("Model file not found at %s; run training script first.", MODEL_PATH)
        if VECTORIZER_PATH.exists():
            with open(VECTORIZER_PATH, "rb") as f:
                vectorizer = pickle.load(f)
            logger.info("Loaded vectorizer from %s", VECTORIZER_PATH)
        else:
            logger.warning("Vectorizer file not found at %s; run training script first.", VECTORIZER_PATH)
    except Exception as e:
        logger.exception("Failed to load ML artifacts: %s", e)
    return model, vectorizer


def connect_mongo():
    """Connect to MongoDB and return (db, client)."""
    try:
        from pymongo import MongoClient # type: ignore
        client = MongoClient(MONGO_URI)
        database = client[DB_NAME]
        client.admin.command("ping")
        logger.info("Connected to MongoDB (db=%s)", DB_NAME)
        return database, client
    except Exception as e:
        logger.warning("MongoDB connection failed: %s; API may still work with stub.", e)
        return None, None


@asynccontextmanager
async def lifespan(app: FastAPI):
    model, vectorizer = load_ml_artifacts()
    db, mongo_client = connect_mongo()
    app.state.model = model
    app.state.vectorizer = vectorizer
    app.state.db = db
    app.state.mongo_client = mongo_client
    yield
    if mongo_client:
        mongo_client.close()


app = FastAPI(
    title="HackAxxess :D",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Add first so it runs last on response (ensures CORS headers even on errors)
app.add_middleware(EnsureCORSHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(ALLOWED_ORIGINS),
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(api_router, prefix="/api", tags=["api"])


@app.get("/")
async def root():
    return {"message": "HackAxxess API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/health/env")
async def health_env():
    """Check that env is loaded; report which vars are set (no secret values)."""
    from app import config
    return {
        "status": "ok",
        "env_loaded": True,
        "vars": {
            "MONGO_URI": "set" if os.getenv("MONGO_URI") else "default",
            "DB_NAME": "set" if os.getenv("DB_NAME") else "default",
            "MODEL_PATH": "set" if os.getenv("MODEL_PATH") else "default",
            "VECTORIZER_PATH": "set" if os.getenv("VECTORIZER_PATH") else "default",
            "DATA_DIR": "set" if os.getenv("DATA_DIR") else "default",
            "JWT_SECRET": "set" if os.getenv("JWT_SECRET") else "default",
            "KAGGLE_DATASET": "set" if os.getenv("KAGGLE_DATASET") else "default",
        },
        "resolved": {
            "MONGO_URI": config.MONGO_URI[:30] + "..." if len(config.MONGO_URI) > 30 else config.MONGO_URI,
            "DATA_DIR": str(config.DATA_DIR),
        },
    }


async def main():
    config = uvicorn.Config(
        "main:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=True,
    )
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
