from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from schemas.common import UserBrief


class ResponseCreate(BaseModel):
    message: str | None = Field(None, max_length=2000)


class ResponseUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(accepted|completed|cancelled|declined)$")


class ResponseServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    listing_type: str
    owner: UserBrief


class ResponseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service: ResponseServiceRead
    respondent: UserBrief
    message: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    can_accept: bool = False
    can_complete: bool = False
    can_cancel: bool = False
    can_review: bool = False
    review_left: bool = False


class ReportCreate(BaseModel):
    target_type: str = Field(..., pattern=r"^(service|user|review)$")
    target_id: int = Field(..., ge=1)
    reason: str = Field(..., pattern=r"^(spam|fraud|abuse|illegal|wrong_info|other)$")
    comment: str | None = Field(None, max_length=1500)


class ReportUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(reviewed|resolved|rejected)$")


class ReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reporter: UserBrief
    target_type: str
    target_id: int
    reason: str
    comment: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
