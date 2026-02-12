from fastapi import APIRouter, Depends, HTTPException
from core.dependencies import get_current_user
from utils.supabase_client import supabase
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
def get_my_notifications(current_user: dict = Depends(get_current_user)):
    """
    Fetch all notifications for the current user.
    """
    try:
        response = supabase.table("notifications") \
            .select("*") \
            .eq("user_id", current_user["user_id"]) \
            .order("created_at", desc=True) \
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{notification_id}/read")
def mark_as_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """
    Mark a notification as read.
    """
    try:
        # Verify ownership
        existing = supabase.table("notifications").select("user_id").eq("id", notification_id).single().execute()
        if not existing.data or existing.data["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=404, detail="Notification not found")
            
        supabase.table("notifications").update({"is_read": True}).eq("id", notification_id).execute()
        return {"message": "Notification marked as read"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
