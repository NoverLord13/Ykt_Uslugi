from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from core.domain_types import AdminDealStatus, DealStatus, DealUpdateStatus, ListingType, ReportReason, ReportStatus, ReportTargetType, ReviewType
from schemas.common import UserBrief


class ResponseCreate(BaseModel):
    message: str | None = Field(None, max_length=2000)


class ResponseUpdate(BaseModel):
    status: DealUpdateStatus
    note: str | None = Field(None, max_length=1000)


class AdminResponseResolution(BaseModel):
    status: AdminDealStatus
    note: str = Field(..., min_length=3, max_length=1000)


class ResponseServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    listing_type: ListingType
    owner: UserBrief


class ResponseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service: ResponseServiceRead
    respondent: UserBrief
    message: str | None
    status: DealStatus
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
    review_type: ReviewType | None = None


class ReportCreate(BaseModel):
    target_type: ReportTargetType
    target_id: int = Field(..., ge=1)
    reason: ReportReason
    comment: str | None = Field(None, max_length=1500)


class ReportUpdate(BaseModel):
    status: ReportStatus


class ReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reporter: UserBrief
    target_type: ReportTargetType
    target_id: int
    reason: ReportReason
    comment: str | None = None
    status: ReportStatus
    created_at: datetime
    updated_at: datetime
