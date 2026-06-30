from pydantic import BaseModel, Field


class UserProfileUpdate(BaseModel):
    display_name: str | None = Field(None, max_length=100)
    bio: str | None = Field(None, max_length=2000)
    location: str | None = Field(None, max_length=200)
    telegram_username: str | None = Field(None, max_length=64, pattern=r"^(?:[a-zA-Z0-9_]{5,64})?$")


class ReviewCreate(BaseModel):
    response_id: int
    rating: int = Field(..., ge=1, le=5)
    text: str | None = Field(None, max_length=2000)
