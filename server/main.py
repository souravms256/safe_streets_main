from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.config import settings
from utils.logging import setup_logging, get_correlation_id, set_correlation_id, api_logger
from core.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import uuid
import time

from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.admin import router as admin_router
from routers.admin_auth import router as admin_auth_router
from routers.health import router as health_router
from routers.violations import router as violations_router
from routers.notifications import router as notifications_router
from routers.geocode import router as geocode_router

# Setup structured logging
setup_logging()

app = FastAPI(
    title="AI Powered Traffic Violation Detection System",
    description="Secure FastAPI backend using Supabase Auth",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Correlation ID and logging middleware
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    # Generate or extract correlation ID
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4())[:8])
    set_correlation_id(correlation_id)
    
    # Log request
    start_time = time.time()
    api_logger.info(f"Request started: {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        
        # Log response
        duration = (time.time() - start_time) * 1000
        api_logger.info(f"Request completed: {request.method} {request.url.path} | Status: {response.status_code} | Duration: {duration:.2f}ms")
        
        # Add correlation ID to response headers
        response.headers["X-Correlation-ID"] = correlation_id
        return response
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        api_logger.error(f"Request failed: {request.method} {request.url.path} | Error: {str(e)} | Duration: {duration:.2f}ms")
        raise

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    correlation_id = get_correlation_id()
    error_traceback = traceback.format_exc()
    api_logger.error(f"Unhandled exception: {str(exc)}\n{error_traceback}")
    
    content = {
        "detail": "Internal Server Error",
        "correlation_id": correlation_id
    }
    
    if getattr(settings, "DEBUG", False):
        content["detail"] = str(exc)
        content["traceback"] = error_traceback
        
    return JSONResponse(
        status_code=500,
        content=content,
        headers={
            "X-Correlation-ID": correlation_id,
            "Access-Control-Allow-Origin": "*"
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Correlation-ID"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(admin_auth_router)
app.include_router(admin_router)
app.include_router(violations_router)
app.include_router(notifications_router)
app.include_router(geocode_router)

@app.get("/")
def root():
    return {"message": "SafeStreets API v1.0.0", "status": "running"}

