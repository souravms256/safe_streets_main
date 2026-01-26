import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY")

    # JWT Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "CHANGE_THIS_NOW")
    JWT_ALGO: str = os.getenv("JWT_ALGO", "HS256")

    # Expiry settings
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 30))

    # CORS – return list instead of raw string
    ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "*").split(",")

    # AI Model
    MODEL_API_URL: str = os.getenv("MODEL_API_URL", "http://localhost:8000/detect")

settings = Settings()
