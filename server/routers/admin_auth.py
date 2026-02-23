from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from core.security import hash_password, verify_password, create_access_token
from utils.supabase_client import supabase
from datetime import datetime, timezone

router = APIRouter(prefix="/admin/auth", tags=["Admin Auth"])

class AdminSignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/signup")
def admin_signup(payload: AdminSignupRequest):
    # Check existing
    check = supabase.table("admins").select("id").eq("email", payload.email).execute()
    if check.data:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed = hash_password(payload.password)

    # Insert
    supabase.table("admins").insert({
        "full_name": payload.full_name,
        "email": payload.email,
        "password_hash": hashed,
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()

    return {"message": "Admin created successfully"}

@router.post("/login")
def admin_login(payload: AdminLoginRequest):
    # Fetch admin (returns a list)
    result = supabase.table("admins").select("*").eq("email", payload.email).execute()
    
    # Check if admin exists
    if not result.data:
        raise HTTPException(status_code=404, detail="Admin not found")
        
    admin_data = result.data[0]

    # Verify password
    if not verify_password(payload.password, admin_data["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Important: role="admin"
    access = create_access_token({"user_id": admin_data["id"], "role": "admin"})

    return {
        "access_token": access,
        "token_type": "bearer"
    }
