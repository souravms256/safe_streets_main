from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from pydantic import BaseModel
from core.limiter import limiter
from core.dependencies import get_current_user
from utils.supabase_client import supabase
from utils.geocoding import get_address_detailed
from services.detector import detector
from services.email_service import send_violation_alert_email
from datetime import datetime, timezone
from typing import List, Any, Dict
import uuid
import asyncio


class ViolationResponse(BaseModel):
    id: str
    user_id: str
    image_url: str
    violation_type: str
    status: str
    location: str
    timestamp: str
    details: Dict[str, Any]
    created_at: str


class ReportResponse(BaseModel):
    message: str
    violation: ViolationResponse
    detected_type: str
    address: str
    short_address: str
    address_data: Dict[str, Any]


class DeleteResponse(BaseModel):
    message: str


router = APIRouter(prefix="/violations", tags=["Violations"])

BUCKET_NAME = "violation-evidence"


@router.post("/", response_model=ReportResponse)
@limiter.limit("5/minute")
async def report_violation(
    request: Request,
    files: List[UploadFile] = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    timestamp: str = Form(...),
    user_violation_type: str = Form(None),
    description: str = Form(None),
    severity: str = Form(None),
    vehicle_number: str = Form(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a new violation report with 1–3 images.
    - First image goes through AI detection
    - All images uploaded to Supabase Storage
    - Resolves human-readable address
    - Saves record to Database
    """
    if len(files) > 3:
        raise HTTPException(
            status_code=400, detail="Maximum 3 images allowed per report"
        )

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    for file in files:
        if not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.filename}. Only images are allowed.",
            )
        if getattr(file, "size", 0) and file.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} is too large. Max size is 10MB.",
            )

    # 1. Read primary file and run AI detection on it
    primary_file = files[0]
    contents = await primary_file.read()
    detected_type, details, annotated_bytes = detector.detect(contents)

    # 2. Resolve Address
    address_data = get_address_detailed(latitude, longitude)
    address = address_data["display_name"]
    short_address = address_data["short_address"]

    # 3. Upload primary images (both annotated and original)
    file_ext = primary_file.filename.split(".")[-1] if primary_file.filename else "jpg"
    base_uuid = str(uuid.uuid4())

    # Upload annotated image (for UI display)
    annotated_file_name = f"{current_user['user_id']}/{base_uuid}.{file_ext}"
    try:
        supabase.storage.from_(BUCKET_NAME).upload(
            path=annotated_file_name,
            file=annotated_bytes,
            file_options={"content-type": primary_file.content_type},
        )
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(
            annotated_file_name
        )
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Annotated image upload failed: {str(e)}"
        )

    # Upload original raw image (for Active Learning retraining)
    original_file_name = f"{current_user['user_id']}/{base_uuid}_original.{file_ext}"
    try:
        supabase.storage.from_(BUCKET_NAME).upload(
            path=original_file_name,
            file=contents,
            file_options={"content-type": primary_file.content_type},
        )
        original_url = supabase.storage.from_(BUCKET_NAME).get_public_url(
            original_file_name
        )
    except Exception as e:
        print(f"Original raw image upload failed (non-fatal): {e}")
        original_url = None

    # 4. Upload additional images (if any)
    additional_urls = []
    for extra_file in files[1:]:
        try:
            extra_contents = await extra_file.read()
            ext = extra_file.filename.split(".")[-1] if extra_file.filename else "jpg"
            extra_name = f"{current_user['user_id']}/{uuid.uuid4()}.{ext}"
            supabase.storage.from_(BUCKET_NAME).upload(
                path=extra_name,
                file=extra_contents,
                file_options={"content-type": extra_file.content_type},
            )
            additional_urls.append(
                supabase.storage.from_(BUCKET_NAME).get_public_url(extra_name)
            )
        except Exception as e:
            print(f"Additional image upload failed: {e}")

    # 5. Build user-provided context
    user_input = {}
    if user_violation_type:
        user_input["user_violation_type"] = user_violation_type
    if description:
        user_input["description"] = description
    if severity:
        user_input["severity"] = severity
    if vehicle_number:
        user_input["vehicle_number"] = vehicle_number

    # 6. Insert into Database
    violation_details = {
        **details,
        **user_input,
        "original_image": original_url,
        "address": address,
        "short_address": short_address,
        "address_components": {
            "road": address_data.get("road", ""),
            "neighbourhood": address_data.get("neighbourhood", ""),
            "suburb": address_data.get("suburb", ""),
            "city": address_data.get("city", ""),
            "state": address_data.get("state", ""),
            "postcode": address_data.get("postcode", ""),
            "country": address_data.get("country", ""),
        },
    }
    if additional_urls:
        violation_details["additional_images"] = additional_urls

    violation_data = {
        "user_id": current_user["user_id"],
        "image_url": public_url,
        "violation_type": detected_type,
        "status": "Under Review",
        "location": f"{latitude}, {longitude}",
        "timestamp": timestamp,
        "details": violation_details,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        result = supabase.table("violations").insert(violation_data).execute()
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")

    # Ensure the insert returned at least one row before accessing it
    if not getattr(result, "data", None):
        raise HTTPException(
            status_code=500,
            detail="Database insert did not return any data for the created violation.",
        )

    # 7. Send email alert in the background (non-blocking)
    saved = result.data[0]
    asyncio.create_task(
        send_violation_alert_email(
            violation_type=detected_type,
            address=address,
            short_address=short_address,
            location=f"{latitude}, {longitude}",
            timestamp=timestamp,
            image_url=public_url,
            violation_id=saved.get("id", "unknown"),
        )
    )

    return {
        "message": "Violation reported successfully",
        "violation": saved,
        "detected_type": detected_type,
        "address": address,
        "short_address": short_address,
        "address_data": address_data,
    }


@router.get("/public", response_model=List[ViolationResponse])
def get_public_violations():
    """
    Fetch all violations for public hotspots (limited fields for privacy).
    """
    try:
        # We select all but can exclude sensitive user_id if needed.
        # For now, icons need the data to show intensity.
        response = supabase.table("violations").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[ViolationResponse])
def get_my_violations(current_user: dict = Depends(get_current_user)):
    """
    Fetch all violations reported by the current user.
    """
    try:
        response = (
            supabase.table("violations")
            .select("*")
            .eq("user_id", current_user["user_id"])
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{violation_id}", response_model=DeleteResponse)
def delete_violation(violation_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a violation report by ID.
    Only allows users to delete their own reports.
    """
    try:
        # Check if violation exists and belongs to user
        existing = (
            supabase.table("violations")
            .select("user_id")
            .eq("id", violation_id)
            .execute()
        )

        if not existing.data:
            raise HTTPException(status_code=404, detail="Violation not found")

        if existing.data[0]["user_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=403, detail="Not authorized to delete this report"
            )

        # Delete from database
        supabase.table("violations").delete().eq("id", violation_id).execute()

        return {"message": "Violation deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
