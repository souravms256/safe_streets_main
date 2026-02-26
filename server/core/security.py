from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
import os
from argon2 import PasswordHasher
from core.config import settings
from fastapi import HTTPException, Header

ph = PasswordHasher()


# ===========================
# PASSWORD
# ===========================
def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return ph.verify(hashed, plain)
    except Exception:
        return False


# ===========================
# TOKENS
# ===========================
def create_access_token(payload: dict):
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload.update({"exp": expire})

    # Ensure algorithm is supported
    algo = settings.JWT_ALGO if settings.JWT_ALGO else "HS256"
    if algo not in ["HS256", "HS384", "HS512"]:
        algo = "HS256"

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=algo)


# from datetime import datetime, timedelta, timezone


def create_refresh_token():
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    token = os.urandom(32).hex()
    return token, expire


# ===========================
# DECODE + TOKEN VALIDATION
# ===========================
def decode_access_token(token: str):
    try:
        algo = settings.JWT_ALGO if settings.JWT_ALGO else "HS256"
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[algo])
    except JWTError:
        return None


# ===========================
# ROLE CHECK
# ===========================
def require_admin(role: str):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")


# ===========================
# TOKEN HEADER DEPENDENCY
# Used by auth/me/dashboard
# ===========================
def extract_user_from_header(Authorization: str = Header(None)):
    if not Authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    try:
        token = Authorization.split(" ")[1]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token format")

    decoded = decode_access_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    return decoded  # contains user_id + role + exp
