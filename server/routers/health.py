from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("/")
def ping():
    return {"status": "ok", "message": "backend running"}
