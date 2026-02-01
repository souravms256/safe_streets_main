from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from core.dependencies import get_current_user
from utils.supabase_client import supabase
from utils.geocoding import get_address
from services.detector import detector
from datetime import datetime
import uuid

router = APIRouter(prefix="/violations", tags=["Violations"])

BUCKET_NAME = "violation-evidence"

@router.post("/")
async def report_violation(
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    timestamp: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a new violation report.
    - Uploads image to Supabase Storage
    - Runs AI detection
    - Resolves human-readable address
    - Saves record to Database
    """
    
    # 1. Read file content
    contents = await file.read()
    
    # 2. Run AI Detection
    detected_type, details = detector.detect(contents)
    
    # 3. Resolve Address (Reverse Geocoding)
    address = get_address(latitude, longitude)
    
    # 4. Upload to Supabase Storage
    file_ext = file.filename.split(".")[-1]
    file_name = f"{current_user['user_id']}/{uuid.uuid4()}.{file_ext}"
    
    try:
        # Upload using standard supabase storage api
        res = supabase.storage.from_(BUCKET_NAME).upload(
            path=file_name,
            file=contents,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Storage upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

    # 5. Insert into Database
    violation_data = {
        "user_id": current_user["user_id"],
        "image_url": public_url,
        "violation_type": detected_type,
        "status": "Under Review",
        "location": f"{latitude}, {longitude}",
        # "address": address, # Removed because column missing in DB
        "timestamp": timestamp,
        "details": {**details, "address": address},
        "created_at": datetime.utcnow().isoformat()
    }
    
    try:
        result = supabase.table("violations").insert(violation_data).execute()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Database insert failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")

    return {
        "message": "Violation reported successfully",
        "violation": result.data[0],
        "detected_type": detected_type,
        "address": address
    }

@router.get("/public")
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

@router.get("/")
def get_my_violations(current_user: dict = Depends(get_current_user)):
    """
    Fetch all violations reported by the current user.
    """
    try:
        response = supabase.table("violations").select("*").eq("user_id", current_user["user_id"]).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{violation_id}")
def delete_violation(violation_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a violation report by ID.
    Only allows users to delete their own reports.
    """
    try:
        # Check if violation exists and belongs to user
        existing = supabase.table("violations").select("user_id").eq("id", violation_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Violation not found")
            
        if existing.data[0]["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized to delete this report")
            
        # Delete from database
        supabase.table("violations").delete().eq("id", violation_id).execute()
        
        return {"message": "Violation deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
