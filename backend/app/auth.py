import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any
import bcrypt # type: ignore
from jose import JWTError, jwt # type: ignore
from config import JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET

# Bcrypt caps at 72 bytes, so we pre-hash with SHA256 to always pass 64 bytes (hex) to bcrypt
def _prepare_for_bcrypt(password: str) -> bytes:
    h = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return h.encode("ascii")

def hash_password(password: str) -> str:
    data = _prepare_for_bcrypt(password)
    return bcrypt.hashpw(data, bcrypt.gensalt()).decode("ascii")

def verify_password(plain: str, hashed: str) -> bool:
    data = _prepare_for_bcrypt(plain)
    return bcrypt.checkpw(data, hashed.encode("ascii"))

def create_access_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

    except JWTError:
        return None