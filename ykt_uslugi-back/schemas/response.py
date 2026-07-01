from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from schemas.common import UserBrief


class ResponseCreate(BaseModel):
    message: str | None = Field(None, max_length=2000)


class ResponseUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(accepted|work_submitted|completed|revision_requested|disputed|cancelled|declined)$")
    note: str | None = Field(None, max_length=1000)


class AdminResponseResolution(BaseModel):
    status: str = Field(..., pattern=r"^(completed|cancelled|revision_requested)$")
    note: str = Field(..., min_length=3, max_length=1000)


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
    status_note: str | None = None
    work_submitted_at: datetime | None = None
    completion_deadline: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    can_accept: bool = False
    can_submit_work: bool = False
    can_confirm: bool = False
    can_request_revision: bool = False
    can_dispute: bool = False
    can_cancel: bool = False
    can_review: bool = False
    review_left: bool = False
    review_target: UserBrief | None = None
    review_type: str | None = None


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
