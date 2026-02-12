from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/")
def ping():
    return {"status": "ok", "message": "backend running"}
