from datetime import datetime
from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

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
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    location: str | None = None
    telegram_username: str | None = None
    is_admin: bool
    is_active: bool
    created_at: datetime


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    telegram_username: str | None = None


class TokenData(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class VerificationTokenData(BaseModel):
    verification_token: str


class SubcategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    name: str
    slug: str


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    subcategories: list[SubcategoryRead] = Field(default_factory=list)


class ServiceImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    position: int


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author: UserBrief
    target_user: UserBrief
    service_id: int | None = None
    response_id: int | None = None
    rating: int
    text: str | None = None
    created_at: datetime


class UserProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    location: str | None = None
    telegram_username: str | None = None
    created_at: datetime
    rating_avg: float | None = None
    reviews_count: int = 0


class CurrentUserProfileRead(UserProfileRead):
    phone_number: str
    is_admin: bool
    is_active: bool


class ServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    price: Decimal | None
    listing_type: str
    category: CategoryRead | None = None
    subcategory: SubcategoryRead | None = None
    location: str | None = None
    price_type: str
    status: str
    contact_phone: str | None = None
    image_url: str | None
    is_active: bool
    owner: UserBrief
    images: list[ServiceImageRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
