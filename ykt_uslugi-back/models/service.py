from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.schema import conv

from database import Base

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    subcategories: Mapped[list["Subcategory"]] = relationship(
        "Subcategory",
        back_populates="category",
        cascade="all, delete-orphan",
    )
    services: Mapped[list["Service"]] = relationship("Service", back_populates="category")


class Subcategory(Base):
    __tablename__ = "subcategories"
    __table_args__ = (UniqueConstraint("category_id", "slug", name="uq_subcategories_category_slug"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    slug: Mapped[str] = mapped_column(String(120), index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    category: Mapped[Category] = relationship("Category", back_populates="subcategories")
    services: Mapped[list["Service"]] = relationship("Service", back_populates="subcategory")


class ServiceImage(Base):
    __tablename__ = "service_images"
    __table_args__ = (
        CheckConstraint("position >= 0", name=conv("ck_service_images_position_non_negative")),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(500))
    position: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    service: Mapped["Service"] = relationship("Service", back_populates="images")


class Service(Base):
    __tablename__ = "services"
    __table_args__ = (
        CheckConstraint("listing_type IN ('offer', 'request')", name=conv("ck_services_listing_type_valid")),
        CheckConstraint("price_type IN ('fixed', 'from', 'negotiable')", name=conv("ck_services_price_type_valid")),
        CheckConstraint("status IN ('active', 'hidden', 'moderation', 'closed')", name=conv("ck_services_status_valid")),
        CheckConstraint("price IS NULL OR price >= 0", name=conv("ck_services_price_non_negative")),
        Index("ix_services_active_created", "status", "is_active", "created_at"),
        Index("ix_services_discovery", "listing_type", "category_id", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    listing_type: Mapped[str] = mapped_column(String(20), default="offer", index=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id: Mapped[int | None] = mapped_column(ForeignKey("subcategories.id"), nullable=True, index=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    price_type: Mapped[str] = mapped_column(String(20), default="fixed")
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    category: Mapped[Category | None] = relationship("Category", back_populates="services")
    subcategory: Mapped[Subcategory | None] = relationship("Subcategory", back_populates="services")
    images: Mapped[list[ServiceImage]] = relationship(
        "ServiceImage",
        back_populates="service",
        cascade="all, delete-orphan",
        order_by="ServiceImage.position",
    )
    owner = relationship("User", back_populates="services")
    responses = relationship("ServiceResponse", back_populates="service", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="service")
