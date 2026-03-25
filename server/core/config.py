import os
from dotenv import load_dotenv


load_dotenv()


class Settings:
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")

    # JWT Security
    JWT_SECRET: str = os.getenv("JWT_SECRET")
    JWT_ALGO: str = os.getenv("JWT_ALGO", "HS256")

    # Expiry settings
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 30))

    # CORS – return list instead of raw string
    ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "*").split(",")

    # AI Model
    MODEL_API_URL: str = os.getenv("MODEL_API_URL", "http://localhost:8000/detect")

    # SMTP / Email Alerts
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_TLS_MODE: str = os.getenv("SMTP_TLS_MODE", "starttls")
    SMTP_TIMEOUT_SECONDS: int = int(os.getenv("SMTP_TIMEOUT_SECONDS", 20))
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "")
    RESEND_REPLY_TO: str = os.getenv("RESEND_REPLY_TO", "")
    RESEND_TIMEOUT_SECONDS: int = int(os.getenv("RESEND_TIMEOUT_SECONDS", 20))
    ALERT_RECIPIENT_EMAIL: str = os.getenv("ALERT_RECIPIENT_EMAIL", "")


settings = Settings()

if not settings.JWT_SECRET or settings.JWT_SECRET == "CHANGE_THIS_NOW":
    raise ValueError(
        "CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing or set to the default weak value. You MUST define a secure JWT_SECRET in your environment variables to start the server."
    )
