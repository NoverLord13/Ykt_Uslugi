import os

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
SMS_CODE_TTL_SECONDS = int(os.getenv("SMS_CODE_TTL_SECONDS", "300"))
SMS_RESEND_COOLDOWN_SECONDS = int(os.getenv("SMS_RESEND_COOLDOWN_SECONDS", "60"))
VERIFICATION_TOKEN_EXPIRE_MINUTES = int(os.getenv("VERIFICATION_TOKEN_EXPIRE_MINUTES", "15"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
ALGORITHM = "HS256"
