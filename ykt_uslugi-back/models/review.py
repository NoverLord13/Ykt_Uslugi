from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.schema import conv

from database import Base


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("author_id", "response_id", name="uq_reviews_author_response"),
        CheckConstraint("rating BETWEEN 1 AND 5", name=conv("ck_reviews_rating_range")),
        CheckConstraint("review_type IN ('performer', 'customer')", name=conv("ck_reviews_review_type_valid")),
        Index("ix_reviews_target_created", "target_user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    target_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    service_id: Mapped[int | None] = mapped_column(ForeignKey("services.id", ondelete="SET NULL"), nullable=True, index=True)
    response_id: Mapped[int | None] = mapped_column(
        ForeignKey("service_responses.id", ondelete="SET NULL"), nullable=True, index=True
    )
    rating: Mapped[int] = mapped_column()
    review_type: Mapped[str] = mapped_column(String(20), default="performer", index=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    author = relationship("User", foreign_keys=[author_id], back_populates="reviews_written")
    target_user = relationship("User", foreign_keys=[target_user_id], back_populates="reviews_received")
    service = relationship("Service", back_populates="reviews")
    response = relationship("ServiceResponse", back_populates="reviews")
