from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.phone import phone_to_str, try_parse_phone
from core.security import (
    create_access_token,
    create_verification_token,
    decode_verification_token,
    hash_password,
    verify_password,
)
from database import get_db
from models.user import User
from schemas.auth import LoginRequest, PhoneRequest, RegisterCompleteRequest, VerifyCodeRequest
from schemas.common import ApiResponse, TokenData, UserRead, VerificationTokenData
from services.sms import SmsRateLimitError, consume_verified_phone, is_phone_verified, send_code, verify_code

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register/send-code", response_model=ApiResponse[None])
async def register_send_code(body: PhoneRequest):
    phone = phone_to_str(body.phone)
    try:
        await send_code(phone)
    except SmsRateLimitError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc
    return ApiResponse(message="Код отправлен")


@router.post("/register/verify-code", response_model=ApiResponse[VerificationTokenData])
async def register_verify_code(body: VerifyCodeRequest):
    phone = phone_to_str(body.phone)
    if not verify_code(phone, body.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный или просроченный код")

    return ApiResponse(
        message="Номер телефона подтверждён",
        data=VerificationTokenData(verification_token=create_verification_token(phone)),
    )


@router.post("/register/complete", response_model=ApiResponse[TokenData])
async def register_complete(body: RegisterCompleteRequest, db: AsyncSession = Depends(get_db)):
    if not body.accept_terms:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Необходимо принять условия использования")
    phone = decode_verification_token(body.verification_token)
    if not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недействительный или просроченный токен")

    if not is_phone_verified(phone):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Номер телефона не подтверждён")

    if await db.scalar(select(User.id).where(User.phone_number == phone)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Пользователь с таким номером уже существует")

    if await db.scalar(select(User.id).where(User.username == body.username)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Имя пользователя уже занято")

    user = User(
        username=body.username,
        phone_number=phone,
        hashed_password=hash_password(body.password),
        legal_accepted_at=datetime.now(timezone.utc),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    consume_verified_phone(phone)

    return ApiResponse(
        message="Регистрация завершена",
        data=TokenData(
            access_token=create_access_token(user.id),
            user=UserRead.model_validate(user),
        ),
    )


@router.post("/login", response_model=ApiResponse[TokenData])
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = None
    phone = try_parse_phone(body.login)
    if phone:
        user = await db.scalar(select(User).where(User.phone_number == phone))
    if not user:
        user = await db.scalar(select(User).where(User.username == body.login))

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт деактивирован")

    return ApiResponse(
        message="Вход выполнен",
        data=TokenData(
            access_token=create_access_token(user.id),
            user=UserRead.model_validate(user),
        ),
    )


@router.post("/login/phone/send-code", response_model=ApiResponse[None])
async def login_phone(body: PhoneRequest, db: AsyncSession = Depends(get_db)):
    phone = phone_to_str(body.phone)
    user = await db.scalar(select(User).where(User.phone_number == phone))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь с таким номером не найден")

    try:
        await send_code(phone)
    except SmsRateLimitError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc

    return ApiResponse(message="Код отправлен")


@router.post("/login/phone/verify-code", response_model=ApiResponse[TokenData])
async def login_phone_verify(body: VerifyCodeRequest, db: AsyncSession = Depends(get_db)):
    phone = phone_to_str(body.phone)
    if not verify_code(phone, body.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный или просроченный код")

    user = await db.scalar(select(User).where(User.phone_number == phone))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь с таким номером не найден")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт деактивирован")

    return ApiResponse(
        message="Вход выполнен",
        data=TokenData(
            access_token=create_access_token(user.id),
            user=UserRead.model_validate(user),
        ),
    )
