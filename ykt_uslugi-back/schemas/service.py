from decimal import Decimal

from pydantic import BaseModel, Field


class ServiceUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, min_length=1, max_length=5000)
    price: Decimal | None = Field(None, ge=0)


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class AdminServiceUpdate(BaseModel):
    is_active: bool | None = None
