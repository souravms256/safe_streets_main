from fastapi import APIRouter, Depends
from core.dependencies import get_current_admin
from utils.supabase_client import supabase

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/users")
def show_all_users(admin=Depends(get_current_admin)):
    """
    Show all users.
    Only accessible by users with role='admin'.
    """
    users = supabase.table("profiles").select(
        "id, full_name, email, dob, role, created_at"
    ).execute().data
    return users

@router.get("/dashboard")
def admin_dashboard(admin=Depends(get_current_admin)):
    """
    Simple admin dashboard stats.
    """
    # Simply count rows for now, can be expanded
    users_count = supabase.table("profiles").select("id", count="exact").execute().count
    
    return {
        "message": f"Welcome Admin {admin.get('user_id')}",
        "total_users": users_count
    }
