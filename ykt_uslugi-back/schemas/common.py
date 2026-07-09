from datetime import datetime
from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, computed_field

from core.domain_types import ListingType, PriceType, ServiceStatus, TokenType
from services.files import thumbnail_url

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

    @computed_field
    @property
    def avatar_thumbnail_url(self) -> str | None:
        return thumbnail_url(self.avatar_url)


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    telegram_username: str | None = None

    @computed_field
    @property
    def avatar_thumbnail_url(self) -> str | None:
        return thumbnail_url(self.avatar_url)


class TokenData(BaseModel):
    access_token: str
    token_type: TokenType = "bearer"
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


class CategoryBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str


class ServiceImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    position: int

    @computed_field
    @property
    def thumbnail_url(self) -> str | None:
        return thumbnail_url(self.url)


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author: UserBrief
    target_user: UserBrief
    service_id: int | None = None
    response_id: int | None = None
    rating: int
    review_type: str
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
    performer_rating_avg: float | None = None
    performer_reviews_count: int = 0
    customer_rating_avg: float | None = None
    customer_reviews_count: int = 0

    @computed_field
    @property
    def avatar_thumbnail_url(self) -> str | None:
        return thumbnail_url(self.avatar_url)


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
    listing_type: ListingType
    category: CategoryRead | None = None
    subcategory: SubcategoryRead | None = None
    location: str | None = None
    price_type: PriceType
    status: ServiceStatus
    contact_phone: str | None = None
    image_url: str | None
    is_active: bool
    owner: UserBrief
    images: list[ServiceImageRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def image_thumbnail_url(self) -> str | None:
        return thumbnail_url(self.image_url)


class ServiceSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    price: Decimal | None
    listing_type: ListingType
    category: CategoryBrief | None = None
    subcategory: SubcategoryRead | None = None
    location: str | None = None
    price_type: PriceType
    status: ServiceStatus
    image_url: str | None
    is_active: bool
    owner: UserBrief
    images: list[ServiceImageRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def image_thumbnail_url(self) -> str | None:
        return thumbnail_url(self.image_url)
