from fastapi import APIRouter, Depends
from core.dependencies import get_current_user
from utils.supabase_client import supabase

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me")
def me(current_user=Depends(get_current_user)):
    """
    Get current user profile.
    Accessible to any authenticated user.
    """
    user = supabase.table("profiles").select(
        "id, full_name, email, dob, role, created_at"
    ).eq("id", current_user["user_id"]).single().execute().data
    return user
