from fastapi import APIRouter, HTTPException, Request
from core.limiter import limiter
from pydantic import BaseModel, EmailStr
from core.security import (
    hash_password, 
    verify_password, 
    create_access_token, 
    create_refresh_token, 
)
from utils.supabase_client import supabase
from datetime import datetime, timezone, timedelta
import random

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

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class MessageResponse(BaseModel):
    message: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int

class RefreshResponse(BaseModel):
    access_token: str

class ForgotPasswordResponse(BaseModel):
    message: str
    otp: str = None  # Note: OTP is exposed here only for MVP purposes

# ---------------------- Signup ----------------------
@router.post("/signup", response_model=MessageResponse)
@limiter.limit("5/minute")
def signup(payload: SignupRequest, request: Request):
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()

    return {"message": "Signup successful"}

# ---------------------- Login ----------------------
@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(payload: LoginRequest, request: Request):
    result = supabase.table("profiles").select("*").eq("email", payload.email).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_data = result.data[0]

    if user_data.get("is_banned"):
        raise HTTPException(status_code=403, detail="Your account has been actively suspended. Please contact support.")

    if not verify_password(payload.password, user_data["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access = create_access_token({"user_id": user_data["id"], "role": user_data["role"]})
    refresh, exp = create_refresh_token()

    supabase.table("refresh_tokens").insert({
        "user_id": user_data["id"],
        "refresh_token": refresh,
        "expires_at": exp.isoformat()
    }).execute()

    supabase.table("auth_logs").insert({
        "user_id": user_data["id"],
        "action": "login",
        "ip": request.client.host,
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()

    return {
        "access_token": access,
        "refresh_token": refresh,
        "expires_in": 15 * 60
    }

# ---------------------- Refresh Token ----------------------
@router.post("/refresh", response_model=RefreshResponse)
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

# ---------------------- Forgot Password ----------------------
@router.post("/forgot-password", response_model=ForgotPasswordResponse)
@limiter.limit("3/minute")
def forgot_password(payload: ForgotPasswordRequest, request: Request):
    """
    Generate a 6-digit OTP for password reset.
    MVP: returns OTP in response. Production: send via email.
    """
    result = supabase.table("profiles").select("id, email").eq("email", payload.email).execute()
    if not result.data:
        # Don't reveal whether email exists (security best practice)
        return {"message": "If an account with that email exists, a reset code has been generated."}

    otp = str(random.randint(100000, 999999))
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()

    supabase.table("profiles").update({
        "reset_otp": otp,
        "reset_otp_expires": expires_at
    }).eq("email", payload.email).execute()

    return {
        "message": "If an account with that email exists, a reset code has been generated.",
        "otp": otp  # MVP only — remove in production
    }

# ---------------------- Reset Password ----------------------
@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("5/minute")
def reset_password(payload: ResetPasswordRequest, request: Request):
    """
    Verify OTP and reset the user's password.
    """
    result = supabase.table("profiles").select("id, reset_otp, reset_otp_expires").eq("email", payload.email).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = result.data[0]
    stored_otp = user.get("reset_otp")
    expires_str = user.get("reset_otp_expires")

    if not stored_otp or not expires_str:
        raise HTTPException(status_code=400, detail="No reset code found. Please request a new one.")

    # Check expiry
    expires_dt = datetime.fromisoformat(expires_str.replace("Z", ""))
    if datetime.now(timezone.utc) > expires_dt:
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")

    # Verify OTP
    if payload.otp != stored_otp:
        raise HTTPException(status_code=400, detail="Invalid reset code.")

    # Update password and clear OTP
    new_hash = hash_password(payload.new_password)
    supabase.table("profiles").update({
        "password_hash": new_hash,
        "reset_otp": None,
        "reset_otp_expires": None
    }).eq("email", payload.email).execute()

    return {"message": "Password reset successfully. You can now log in with your new password."}

