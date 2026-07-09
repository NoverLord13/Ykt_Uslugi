import os

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
if ENVIRONMENT == "production" and SECRET_KEY == "dev-secret-key-change-in-production":
    raise RuntimeError("SECRET_KEY must be configured in production")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://ykt_uslugi:ykt_uslugi@localhost:5432/ykt_uslugi")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
SMS_CODE_TTL_SECONDS = int(os.getenv("SMS_CODE_TTL_SECONDS", "300"))
SMS_RESEND_COOLDOWN_SECONDS = int(os.getenv("SMS_RESEND_COOLDOWN_SECONDS", "60"))
VERIFICATION_TOKEN_EXPIRE_MINUTES = int(os.getenv("VERIFICATION_TOKEN_EXPIRE_MINUTES", "15"))
DEAL_MAINTENANCE_INTERVAL_SECONDS = max(1, int(os.getenv("DEAL_MAINTENANCE_INTERVAL_SECONDS", "60")))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]
ALGORITHM = "HS256"
