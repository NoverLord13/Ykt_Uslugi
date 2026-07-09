"""add PostgreSQL constraints

Revision ID: 202607090001
Revises: 202607030001
Create Date: 2026-07-09
"""

from collections.abc import Sequence

from alembic import op

revision: str = "202607090001"
down_revision: str | Sequence[str] | None = "202607030001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _supports_alter_constraints() -> bool:
    return op.get_bind().dialect.name != "sqlite"


def upgrade() -> None:
    if not _supports_alter_constraints():
        return

    op.create_check_constraint(
        op.f("ck_services_listing_type_valid"),
        "services",
        "listing_type IN ('offer', 'request')",
    )
    op.create_check_constraint(
        op.f("ck_services_price_type_valid"),
        "services",
        "price_type IN ('fixed', 'from', 'negotiable')",
    )
    op.create_check_constraint(
        op.f("ck_services_status_valid"),
        "services",
        "status IN ('active', 'hidden', 'moderation', 'closed')",
    )
    op.create_check_constraint(
        op.f("ck_services_price_non_negative"),
        "services",
        "price IS NULL OR price >= 0",
    )
    op.create_check_constraint(
        op.f("ck_service_images_position_non_negative"),
        "service_images",
        "position >= 0",
    )
    op.create_check_constraint(
        op.f("ck_service_responses_status_valid"),
        "service_responses",
        "status IN ('new', 'accepted', 'work_submitted', 'revision_requested', 'disputed', 'completed', 'cancelled', 'declined')",
    )
    op.create_check_constraint(
        op.f("ck_reports_target_type_valid"),
        "reports",
        "target_type IN ('service', 'user', 'review')",
    )
    op.create_check_constraint(
        op.f("ck_reports_status_valid"),
        "reports",
        "status IN ('new', 'reviewed', 'resolved', 'rejected')",
    )
    op.create_check_constraint(
        op.f("ck_reports_reason_valid"),
        "reports",
        "reason IN ('spam', 'fraud', 'abuse', 'illegal', 'wrong_info', 'other')",
    )
    op.create_check_constraint(
        op.f("ck_reviews_rating_range"),
        "reviews",
        "rating BETWEEN 1 AND 5",
    )
    op.create_check_constraint(
        op.f("ck_reviews_review_type_valid"),
        "reviews",
        "review_type IN ('performer', 'customer')",
    )


def downgrade() -> None:
    if not _supports_alter_constraints():
        return

    op.drop_constraint(op.f("ck_reviews_review_type_valid"), "reviews", type_="check")
    op.drop_constraint(op.f("ck_reviews_rating_range"), "reviews", type_="check")
    op.drop_constraint(op.f("ck_reports_reason_valid"), "reports", type_="check")
    op.drop_constraint(op.f("ck_reports_status_valid"), "reports", type_="check")
    op.drop_constraint(op.f("ck_reports_target_type_valid"), "reports", type_="check")
    op.drop_constraint(op.f("ck_service_responses_status_valid"), "service_responses", type_="check")
    op.drop_constraint(op.f("ck_service_images_position_non_negative"), "service_images", type_="check")
    op.drop_constraint(op.f("ck_services_price_non_negative"), "services", type_="check")
    op.drop_constraint(op.f("ck_services_status_valid"), "services", type_="check")
    op.drop_constraint(op.f("ck_services_price_type_valid"), "services", type_="check")
    op.drop_constraint(op.f("ck_services_listing_type_valid"), "services", type_="check")
