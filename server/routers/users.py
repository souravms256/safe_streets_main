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
    try:
        response = supabase.table("profiles").select(
            "id, full_name, email, dob, role, created_at, points"
        ).eq("id", current_user["user_id"]).single().execute()
        
        if not response.data:
             raise HTTPException(status_code=404, detail="User profile not found")
             
        return response.data
    except Exception as e:
        # Prevent 500 crash if database fails
        print(f"Error fetching user profile: {e}") 
        raise HTTPException(status_code=500, detail="Could not fetch user profile")

@router.get("/leaderboard")
def get_leaderboard(current_user=Depends(get_current_user)):
    """
    Get top 10 users by points.
    """
    # Note: 'points' column must exist
    users = supabase.table("profiles").select(
        "full_name, points"
    ).order("points", desc=True).limit(10).execute().data
    return users
