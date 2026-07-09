from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.schema import conv

from database import Base


class ServiceResponse(Base):
    __tablename__ = "service_responses"
    __table_args__ = (
        CheckConstraint(
            "status IN ('new', 'accepted', 'work_submitted', 'revision_requested', 'disputed', 'completed', 'cancelled', 'declined')",
            name=conv("ck_service_responses_status_valid"),
        ),
        Index("ix_responses_respondent_created", "respondent_id", "created_at"),
        Index("ix_responses_service_status", "service_id", "status"),
        Index("ix_responses_status_submitted", "status", "work_submitted_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"), index=True)
    respondent_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="new", index=True)
    status_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    work_submitted_at: Mapped[datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    service = relationship("Service", back_populates="responses")
    respondent = relationship("User", back_populates="responses")
    reviews = relationship("Review", back_populates="response")


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        CheckConstraint("target_type IN ('service', 'user', 'review')", name=conv("ck_reports_target_type_valid")),
        CheckConstraint("status IN ('new', 'reviewed', 'resolved', 'rejected')", name=conv("ck_reports_status_valid")),
        CheckConstraint("reason IN ('spam', 'fraud', 'abuse', 'illegal', 'wrong_info', 'other')", name=conv("ck_reports_reason_valid")),
        Index("ix_reports_duplicate_lookup", "reporter_id", "target_type", "target_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    target_type: Mapped[str] = mapped_column(String(20), index=True)
    target_id: Mapped[int] = mapped_column(index=True)
    reason: Mapped[str] = mapped_column(String(50))
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="new", index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    reporter = relationship("User", back_populates="reports")
