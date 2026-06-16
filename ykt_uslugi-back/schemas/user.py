from pydantic import BaseModel, Field


class UserProfileUpdate(BaseModel):
    display_name: str | None = Field(None, max_length=100)
    bio: str | None = Field(None, max_length=2000)
    location: str | None = Field(None, max_length=200)


class ReviewCreate(BaseModel):
    service_id: int | None = None
    rating: int = Field(..., ge=1, le=5)
    text: str | None = Field(None, max_length=2000)
