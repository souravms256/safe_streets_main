from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.admin import router as admin_router
from routers.health import router as health_router
from routers.violations import router as violations_router

app = FastAPI(
    title="AI Powered Traffic Violation Detection System",
    description="Secure FastAPI backend using Supabase Auth",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(admin_router)
app.include_router(violations_router)

# @app.get("/")
# def root():
#     return {"message": "API Running"}
