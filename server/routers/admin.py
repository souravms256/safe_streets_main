from fastapi import APIRouter, Depends, HTTPException, Query
from core.dependencies import get_current_admin
from utils.supabase_client import supabase
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from math import ceil

router = APIRouter(prefix="/admin", tags=["Admin"])


class StatusUpdate(BaseModel):
    status: str
    admin_note: Optional[str] = None
    admin_comments: Optional[str] = None


class BulkStatusUpdate(BaseModel):
    ids: List[str]
    status: str
    admin_comments: Optional[str] = None


class BulkDeleteRequest(BaseModel):
    ids: List[str]


class BanRequest(BaseModel):
    is_banned: bool


class MessageResponse(BaseModel):
    message: str


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class PaginatedViolations(BaseModel):
    data: List[Dict[str, Any]]
    pagination: PaginationMeta


class BulkUpdateResult(BaseModel):
    success: int
    errors: List[Dict[str, Any]]
    total: int


class BulkDeleteResult(BaseModel):
    success: int
    total: int


class AdminDashboardStats(BaseModel):
    total_users: int
    total_violations: int
    pending_violations: int
    verified_violations: int
    rejected_violations: int


class DashboardResponse(BaseModel):
    message: str
    stats: AdminDashboardStats
    reports_over_time: List[Dict[str, Any]]
    reports_by_type: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]


class UserDetailsResponse(BaseModel):
    profile: Dict[str, Any]
    stats: Dict[str, int]


class UpdateViolationResponse(BaseModel):
    message: str
    data: Dict[str, Any]


@router.get("/users", response_model=List[Dict[str, Any]])
def show_all_users(admin=Depends(get_current_admin)):
    """
    Show all users.
    Only accessible by users with role='admin'.
    """
    users = (
        supabase.table("profiles")
        .select("id, full_name, email, dob, role, created_at, points")
        .eq("role", "user")
        .execute()
        .data
    )
    return users


@router.get("/users/{user_id}", response_model=UserDetailsResponse)
def get_user_details(user_id: str, admin=Depends(get_current_admin)):
    """
    Get specific user profile and stats.
    """
    user = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")

    # Calculate stats
    total_violations = (
        supabase.table("violations")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
        .count
    )
    verified = (
        supabase.table("violations")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("status", "Verified")
        .execute()
        .count
    )
    rejected = (
        supabase.table("violations")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("status", "Rejected")
        .execute()
        .count
    )

    return {
        "profile": user.data,
        "stats": {
            "total_reports": total_violations,
            "verified": verified,
            "rejected": rejected,
        },
    }


@router.get("/users/{user_id}/violations", response_model=List[Dict[str, Any]])
def get_user_violations(user_id: str, admin=Depends(get_current_admin)):
    """
    Get violations for a specific user.
    """
    violations = (
        supabase.table("violations")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )
    return violations


@router.get("/dashboard", response_model=DashboardResponse)
def admin_dashboard(admin=Depends(get_current_admin)):
    """
    Admin dashboard stats.
    """
    # Count Users
    users_count = supabase.table("profiles").select("id", count="exact").execute().count

    # Count Violations
    violations_count = (
        supabase.table("violations").select("id", count="exact").execute().count
    )

    # Violations by Status
    pending = (
        supabase.table("violations")
        .select("id", count="exact")
        .eq("status", "Under Review")
        .execute()
        .count
    )
    verified = (
        supabase.table("violations")
        .select("id", count="exact")
        .eq("status", "Verified")
        .execute()
        .count
    )
    rejected = (
        supabase.table("violations")
        .select("id", count="exact")
        .eq("status", "Rejected")
        .execute()
        .count
    )

    # Recent violations (last 5)
    recent_violations = (
        supabase.table("violations")
        .select("*")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
        .data
    )

    # Reports Over Time (Last 7 Days) - Simplified client-side aggregation helper
    # In production, use a SQL function or specialized table.
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    dates.reverse()

    # Fetch all violations created in last 7 days
    start_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
    recent_stats_data = (
        supabase.table("violations")
        .select("created_at")
        .gte("created_at", start_date)
        .execute()
        .data
    )

    reports_over_time = []
    for d in dates:
        count = sum(1 for v in recent_stats_data if v["created_at"].startswith(d))
        reports_over_time.append({"date": d, "count": count})

    return {
        "message": f"Welcome Admin {admin.get('user_id')}",
        "stats": {
            "total_users": users_count,
            "total_violations": violations_count,
            "pending_violations": pending,
            "verified_violations": verified,
            "rejected_violations": rejected,
        },
        "reports_over_time": reports_over_time,
        "reports_by_type": _get_reports_by_type(),
        "recent_activity": recent_violations,
    }


def _get_reports_by_type():
    # Helper to count by type
    data = supabase.table("violations").select("violation_type").execute().data
    counts = {}
    for item in data:
        v_type = item.get("violation_type", "Unknown")
        counts[v_type] = counts.get(v_type, 0) + 1

    return [{"name": k, "value": v} for k, v in counts.items()]


@router.get("/violations", response_model=PaginatedViolations)
def get_all_violations(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    admin=Depends(get_current_admin),
):
    """
    Get all violations with server-side pagination.
    """
    try:
        # Single query to get both count and paginated data
        query = supabase.table("violations").select(
            "*, profiles(full_name, email)", count="exact"
        )

        # Apply filters
        if status:
            query = query.eq("status", status)

        # Calculate pagination offset
        offset = (page - 1) * limit

        # Fetch paginated data + count
        response = (
            query.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        total = response.count or 0
        total_pages = ceil(total / limit) if total > 0 else 1
        violations = response.data

        return {
            "data": violations,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/violations/{violation_id}/status", response_model=UpdateViolationResponse)
def update_violation_status(
    violation_id: str, update: StatusUpdate, admin=Depends(get_current_admin)
):
    """
    Update status of a violation (e.g., 'Verified', 'Rejected', 'Resolved').
    Awards 10 points to the user if status becomes 'Verified'.
    """
    try:
        # Get existing violation including current details
        existing = (
            supabase.table("violations")
            .select("user_id, status, details, violation_type")
            .eq("id", violation_id)
            .single()
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Violation not found")

        violation_user_id = existing.data["user_id"]
        old_status = existing.data["status"]
        violation_type = existing.data.get("violation_type", "Traffic Violation")

        # Build update data
        data = {"status": update.status}

        # Merge admin comments into existing details (don't overwrite!)
        admin_comment = update.admin_comments or update.admin_note
        if admin_comment:
            existing_details = existing.data.get("details") or {}
            if isinstance(existing_details, str):
                existing_details = {}
            existing_details["admin_comments"] = admin_comment
            existing_details["admin_reviewed_at"] = datetime.now(
                timezone.utc
            ).isoformat()
            data["details"] = existing_details

        result = (
            supabase.table("violations").update(data).eq("id", violation_id).execute()
        )

        # Award Points logic
        if update.status == "Verified" and old_status != "Verified":
            # Atomic increment using Supabase RPC to prevent race conditions
            try:
                supabase.rpc(
                    "increment_points", {"u_id": violation_user_id, "amount": 10}
                ).execute()
            except Exception:
                # Fallback to fetch-then-update if RPC doesn't exist yet
                profile = (
                    supabase.table("profiles")
                    .select("points")
                    .eq("id", violation_user_id)
                    .single()
                    .execute()
                )
                current_points = profile.data.get("points") or 0
                supabase.table("profiles").update({"points": current_points + 10}).eq(
                    "id", violation_user_id
                ).execute()

            # Create Notification
            comment_text = f' Admin says: "{admin_comment}"' if admin_comment else ""
            notification_data = {
                "user_id": violation_user_id,
                "title": "Report Verified! 🏆",
                "message": f"Your report for '{violation_type}' has been verified. You've earned 10 points!{comment_text}",
                "type": "verification",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            supabase.table("notifications").insert(notification_data).execute()

        elif update.status == "Rejected" and old_status != "Rejected":
            # Notify user about rejection with admin comment
            comment_text = f' Reason: "{admin_comment}"' if admin_comment else ""
            notification_data = {
                "user_id": violation_user_id,
                "title": "Report Rejected ❌",
                "message": f"Your report for '{violation_type}' has been rejected.{comment_text}",
                "type": "rejection",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            supabase.table("notifications").insert(notification_data).execute()

        return {"message": "Status updated successfully", "data": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/violations/bulk-status", response_model=BulkUpdateResult)
def bulk_update_status(update: BulkStatusUpdate, admin=Depends(get_current_admin)):
    """
    Bulk update status for multiple violations.
    Awards points and sends notifications for each.
    """
    if len(update.ids) == 0:
        raise HTTPException(status_code=400, detail="No violation IDs provided")
    if len(update.ids) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 violations per batch")

    success_count = 0
    errors = []

    for vid in update.ids:
        try:
            existing = (
                supabase.table("violations")
                .select("user_id, status, details, violation_type")
                .eq("id", vid)
                .single()
                .execute()
            )
            if not existing.data:
                errors.append({"id": vid, "error": "Not found"})
                continue

            old_status = existing.data["status"]
            violation_user_id = existing.data["user_id"]
            violation_type = existing.data.get("violation_type", "Traffic Violation")

            data = {"status": update.status}

            if update.admin_comments:
                existing_details = existing.data.get("details") or {}
                if isinstance(existing_details, str):
                    existing_details = {}
                existing_details["admin_comments"] = update.admin_comments
                existing_details["admin_reviewed_at"] = datetime.now(
                    timezone.utc
                ).isoformat()
                data["details"] = existing_details

            supabase.table("violations").update(data).eq("id", vid).execute()

            # Points + notifications
            if update.status == "Verified" and old_status != "Verified":
                try:
                    supabase.rpc(
                        "increment_points", {"u_id": violation_user_id, "amount": 10}
                    ).execute()
                except Exception:
                    profile = (
                        supabase.table("profiles")
                        .select("points")
                        .eq("id", violation_user_id)
                        .single()
                        .execute()
                    )
                    current_points = profile.data.get("points") or 0
                    supabase.table("profiles").update(
                        {"points": current_points + 10}
                    ).eq("id", violation_user_id).execute()
                supabase.table("notifications").insert(
                    {
                        "user_id": violation_user_id,
                        "title": "Report Verified! 🏆",
                        "message": f"Your report for '{violation_type}' has been verified. You've earned 10 points!",
                        "type": "verification",
                        "is_read": False,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                ).execute()
            elif update.status == "Rejected" and old_status != "Rejected":
                supabase.table("notifications").insert(
                    {
                        "user_id": violation_user_id,
                        "title": "Report Rejected ❌",
                        "message": f"Your report for '{violation_type}' has been rejected.",
                        "type": "rejection",
                        "is_read": False,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                ).execute()

            success_count += 1
        except Exception as e:
            errors.append({"id": vid, "error": str(e)})

    return {"success": success_count, "errors": errors, "total": len(update.ids)}


@router.delete("/violations/bulk", response_model=BulkDeleteResult)
def bulk_delete_violations(body: BulkDeleteRequest, admin=Depends(get_current_admin)):
    """
    Bulk delete violations.
    """
    if len(body.ids) == 0:
        raise HTTPException(status_code=400, detail="No violation IDs provided")

    success_count = 0
    for vid in body.ids:
        try:
            supabase.table("violations").delete().eq("id", vid).execute()
            success_count += 1
        except Exception:
            pass

    return {"success": success_count, "total": len(body.ids)}


@router.delete("/violations/{violation_id}", response_model=MessageResponse)
def delete_violation(violation_id: str, admin=Depends(get_current_admin)):
    """
    Hard delete a violation report (e.g. spam).
    """
    try:
        supabase.table("violations").delete().eq("id", violation_id).execute()
        return {"message": "Violation deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/{user_id}/ban", response_model=MessageResponse)
def toggle_user_ban(user_id: str, body: BanRequest, admin=Depends(get_current_admin)):
    """
    Ban or Unban a user.
    """
    try:
        supabase.table("profiles").update({"is_banned": body.is_banned}).eq(
            "id", user_id
        ).execute()
        return {
            "message": f"User {'banned' if body.is_banned else 'unbanned'} successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/users/{user_id}", response_model=MessageResponse)
def delete_user(user_id: str, admin=Depends(get_current_admin)):
    """
    Delete a user account.
    """
    try:
        # First check if user exists
        user = (
            supabase.table("profiles").select("id").eq("id", user_id).single().execute()
        )
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
