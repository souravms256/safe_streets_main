from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from core.security import (
    hash_password, 
    verify_password, 
    create_access_token, 
    create_refresh_token, 
)
from utils.supabase_client import supabase
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["Auth"])

# ---------------------- Request Models ----------------------
class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    dob: str | None = None
    role: str = "user"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# ---------------------- Signup ----------------------
@router.post("/signup")
def signup(payload: SignupRequest):
    check = supabase.table("profiles").select("id").eq("email", payload.email).execute()
    if check.data:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed = hash_password(payload.password)

    supabase.table("profiles").insert({
        "full_name": payload.full_name,
        "email": payload.email,
        "password_hash": hashed,
        "dob": payload.dob,
        "role": payload.role,
        "created_at": datetime.utcnow().isoformat()
    }).execute()

    return {"message": "Signup successful"}

# ---------------------- Login ----------------------
@router.post("/login")
def login(payload: LoginRequest, request: Request):
    user = supabase.table("profiles").select("*").eq("email", payload.email).single().execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(payload.password, user.data["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access = create_access_token({"user_id": user.data["id"], "role": user.data["role"]})
    refresh, exp = create_refresh_token()

    supabase.table("refresh_tokens").insert({
        "user_id": user.data["id"],
        "refresh_token": refresh,
        "expires_at": exp.isoformat()
    }).execute()

    supabase.table("auth_logs").insert({
        "user_id": user.data["id"],
        "action": "login",
        "ip": request.client.host,
        "created_at": datetime.utcnow().isoformat()
    }).execute()

    return {
        "access_token": access,
        "refresh_token": refresh,
        "expires_in": 15 * 60
    }

# ---------------------- Refresh Token ----------------------
@router.post("/refresh")
def refresh_token(refresh_token: str):
    token = supabase.table("refresh_tokens").select("*").eq("refresh_token", refresh_token).execute()

    # token.data will be [] when not found
    if not token.data or len(token.data) == 0:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token = token.data[0]

    # validate expiry
    exp_str = token["expires_at"]
    if isinstance(exp_str, str):
        exp_dt = datetime.fromisoformat(exp_str.replace("Z", ""))
    else:
        exp_dt = exp_str

    if exp_dt and isinstance(exp_dt, datetime):
        if exp_dt < datetime.now(timezone.utc):   # FIXED
            raise HTTPException(status_code=401, detail="Refresh token expired")

    # fetch user
    user = supabase.table("profiles").select("*").eq("id", token["user_id"]).single().execute().data
    
    access = create_access_token({"user_id": user["id"], "role": user["role"]})
    return {"access_token": access}
