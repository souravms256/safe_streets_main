from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from core.dependencies import get_current_user
from utils.supabase_client import supabase

class UserProfile(BaseModel):
    id: str
    full_name: str
    email: str
    dob: Optional[str] = None
    role: str
    created_at: str
    points: int

class LeaderboardUser(BaseModel):
    id: str
    full_name: str
    points: int

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserProfile)
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

@router.get("/leaderboard", response_model=List[LeaderboardUser])
def get_leaderboard(current_user=Depends(get_current_user)):
    """
    Get top 10 users by points.
    """
    users = supabase.table("profiles").select(
        "id, full_name, points"
    ).order("points", desc=True).limit(10).execute().data
    return users
