from decimal import Decimal

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=120, pattern=r"^[a-z0-9_-]+$")


class CategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    slug: str | None = Field(None, min_length=1, max_length=120, pattern=r"^[a-z0-9_-]+$")


class SubcategoryCreate(BaseModel):
    category_id: int
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=120, pattern=r"^[a-z0-9_-]+$")


class SubcategoryUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = Field(None, min_length=1, max_length=100)
    slug: str | None = Field(None, min_length=1, max_length=120, pattern=r"^[a-z0-9_-]+$")


class ServiceUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, min_length=1, max_length=5000)
    price: Decimal | None = Field(None, ge=0)
    listing_type: str | None = Field(None, pattern=r"^(offer|request)$")
    category_id: int | None = None
    subcategory_id: int | None = None
    location: str | None = Field(None, max_length=200)
    price_type: str | None = Field(None, pattern=r"^(fixed|from|negotiable)$")
    status: str | None = Field(None, pattern=r"^(active|hidden|moderation|closed)$")
    contact_phone: str | None = Field(None, max_length=20)


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class AdminServiceUpdate(BaseModel):
    is_active: bool | None = None
    status: str | None = Field(None, pattern=r"^(active|hidden|moderation|closed)$")
