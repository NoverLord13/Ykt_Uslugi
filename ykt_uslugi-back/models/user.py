from datetime import datetime

from sqlalchemy import String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    phone_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    telegram_username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    legal_accepted_at: Mapped[datetime | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    is_admin: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    services = relationship("Service", back_populates="owner")
    reviews_written = relationship("Review", foreign_keys="Review.author_id", back_populates="author")
    reviews_received = relationship("Review", foreign_keys="Review.target_user_id", back_populates="target_user")
    responses = relationship("ServiceResponse", back_populates="respondent")
    reports = relationship("Report", back_populates="reporter")
