from datetime import datetime
from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str
    data: T | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    phone_number: str
    is_admin: bool
    is_active: bool
    created_at: datetime


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str


class TokenData(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class VerificationTokenData(BaseModel):
    verification_token: str


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class ServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    price: Decimal
    image_url: str | None
    is_active: bool
    owner: UserBrief
    tags: list[TagRead] = []  # Список тегов, привязанных к услуге
    created_at: datetime
    updated_at: datetime
