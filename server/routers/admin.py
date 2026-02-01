from fastapi import APIRouter, Depends, HTTPException, Body
from core.dependencies import get_current_admin
from utils.supabase_client import supabase
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["Admin"])

class StatusUpdate(BaseModel):
    status: str
    admin_note: Optional[str] = None

class BanRequest(BaseModel):
    is_banned: bool

@router.get("/users")
def show_all_users(admin=Depends(get_current_admin)):
    """
    Show all users.
    Only accessible by users with role='admin'.
    """
    users = supabase.table("profiles").select(
        "id, full_name, email, dob, role, created_at"
    ).eq("role", "user").execute().data
    return users

@router.get("/users/{user_id}")
def get_user_details(user_id: str, admin=Depends(get_current_admin)):
    """
    Get specific user profile and stats.
    """
    user = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate stats
    total_violations = supabase.table("violations").select("id", count="exact").eq("user_id", user_id).execute().count
    verified = supabase.table("violations").select("id", count="exact").eq("user_id", user_id).eq("status", "Verified").execute().count
    rejected = supabase.table("violations").select("id", count="exact").eq("user_id", user_id).eq("status", "Rejected").execute().count
    
    return {
        "profile": user.data,
        "stats": {
            "total_reports": total_violations,
            "verified": verified,
            "rejected": rejected
        }
    }

@router.get("/users/{user_id}/violations")
def get_user_violations(user_id: str, admin=Depends(get_current_admin)):
    """
    Get violations for a specific user.
    """
    violations = supabase.table("violations").select("*").eq("user_id", user_id).order("created_at", desc=True).execute().data
    return violations

@router.get("/dashboard")
def admin_dashboard(admin=Depends(get_current_admin)):
    """
    Admin dashboard stats.
    """
    # Count Users
    users_count = supabase.table("profiles").select("id", count="exact").execute().count
    
    # Count Violations
    violations_count = supabase.table("violations").select("id", count="exact").execute().count
    
    # Violations by Status
    pending = supabase.table("violations").select("id", count="exact").eq("status", "Under Review").execute().count
    verified = supabase.table("violations").select("id", count="exact").eq("status", "Verified").execute().count
    rejected = supabase.table("violations").select("id", count="exact").eq("status", "Rejected").execute().count
    
    # Recent violations (last 5)
    recent_violations = supabase.table("violations").select("*").order("created_at", desc=True).limit(5).execute().data
    
    # Reports Over Time (Last 7 Days) - Simplified client-side aggregation helper
    # In production, use a SQL function or specialized table.
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]
    dates.reverse()
    
    # Fetch all violations created in last 7 days
    start_date = (today - timedelta(days=7)).strftime('%Y-%m-%d')
    recent_stats_data = supabase.table("violations").select("created_at").gte("created_at", start_date).execute().data
    
    reports_over_time = []
    for d in dates:
        count = sum(1 for v in recent_stats_data if v['created_at'].startswith(d))
        reports_over_time.append({"date": d, "count": count})

    return {
        "message": f"Welcome Admin {admin.get('user_id')}",
        "stats": {
            "total_users": users_count,
            "total_violations": violations_count,
            "pending_violations": pending,
            "verified_violations": verified,
            "rejected_violations": rejected
        },
        "reports_over_time": reports_over_time,
        "reports_by_type": _get_reports_by_type(),
        "recent_activity": recent_violations
    }

def _get_reports_by_type():
    # Helper to count by type
    data = supabase.table("violations").select("violation_type").execute().data
    counts = {}
    for item in data:
        v_type = item.get("violation_type", "Unknown")
        counts[v_type] = counts.get(v_type, 0) + 1
    
    return [{"name": k, "value": v} for k, v in counts.items()]

@router.get("/violations")
def get_all_violations(admin=Depends(get_current_admin)):
    """
    Get all violations for table view.
    """
    # Fetch all fields, order by newest.
    # In production, implement pagination here (page & limit query params).
    violations = supabase.table("violations").select("*, profiles(full_name, email)").order("created_at", desc=True).execute().data
    return violations

@router.put("/violations/{violation_id}/status")
def update_violation_status(violation_id: str, update: StatusUpdate, admin=Depends(get_current_admin)):
    """
    Update status of a violation (e.g., 'Verified', 'Rejected', 'Resolved').
    Awards 10 points to the user if status becomes 'Verified'.
    """
    try:
        # Get existing violation
        existing = supabase.table("violations").select("user_id, status").eq("id", violation_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Violation not found")
            
        violation_user_id = existing.data["user_id"]
        old_status = existing.data["status"]
        
        # Update Violation
        data = {"status": update.status}
        if update.admin_note:
            data["details"] = f"Admin Note: {update.admin_note}"
            
        result = supabase.table("violations").update(data).eq("id", violation_id).execute()
        
        # Award Points logic
        if update.status == "Verified" and old_status != "Verified":
            # Add 10 points
            # Note: Supabase doesn't support atomic increment easily via simple client without RPC, 
            # so we fetch-add-update. RPC is better for race conditions but this suffices for MVP.
            profile = supabase.table("profiles").select("points").eq("id", violation_user_id).single().execute()
            current_points = profile.data.get("points") or 0
            supabase.table("profiles").update({"points": current_points + 10}).eq("id", violation_user_id).execute()
            
        return {"message": "Status updated successfully", "data": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/violations/{violation_id}")
def delete_violation(violation_id: str, admin=Depends(get_current_admin)):
    """
    Hard delete a violation report (e.g. spam).
    """
    try:
        supabase.table("violations").delete().eq("id", violation_id).execute()
        return {"message": "Violation deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/users/{user_id}/ban")
def toggle_user_ban(user_id: str, body: BanRequest, admin=Depends(get_current_admin)):
    """
    Ban or Unban a user.
    """
    try:
        supabase.table("profiles").update({"is_banned": body.is_banned}).eq("id", user_id).execute()
        return {"message": f"User {'banned' if body.is_banned else 'unbanned'} successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/users/{user_id}")
def delete_user(user_id: str, admin=Depends(get_current_admin)):
    """
    Delete a user account.
    """
    try:
        # First check if user exists
        user = supabase.table("profiles").select("id").eq("id", user_id).single().execute()
        if not user.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Delete related violations first (or rely on cascade if configured, but explicit is safer here)
        supabase.table("violations").delete().eq("user_id", user_id).execute()
        
        # Delete profile
        supabase.table("profiles").delete().eq("id", user_id).execute()
        
        # Note: In a real Supabase Auth setup, you should also delete from auth.users via server admin API.
        # Since we are using a 'profiles' table wrapper, we delete that.
        
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
