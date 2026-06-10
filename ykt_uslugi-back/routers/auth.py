from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.security import create_access_token, hash_password, normalize_phone, verify_password
from database import get_db
from models.user import User
from schemas.auth import (
    LoginRequest,
    MessageResponse,
    PhoneRequest,
    RegisterCompleteRequest,
    TokenResponse,
)
from services.sms import SmsRateLimitError, send_code, verify_code

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register/send-code", response_model=MessageResponse)
async def register_send_code(body: PhoneRequest):
    try:
        await send_code(body.phone)
    except SmsRateLimitError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc))
    return MessageResponse(message="Код отправлен")


@router.post("/register/complete", response_model=TokenResponse)
def register_complete(body: RegisterCompleteRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(body.phone)

    if not verify_code(body.phone, body.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный или просроченный код")

    existing = db.query(User).filter(User.phone_number == phone).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Пользователь с таким номером уже существует")

    user = User(phone_number=phone, hashed_password=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(body.phone)
    user = db.query(User).filter(User.phone_number == phone).first()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный номер телефона или пароль",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт деактивирован")

    return TokenResponse(access_token=create_access_token(user.id))
