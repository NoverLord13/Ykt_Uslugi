"""add performance indexes

Revision ID: 202607030001
Revises: 202606300001
"""

from collections.abc import Sequence

from alembic import op

revision: str = "202607030001"
down_revision: str | Sequence[str] | None = "202606300001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("ix_services_active_created", "services", ["status", "is_active", "created_at"])
    op.create_index("ix_services_discovery", "services", ["listing_type", "category_id", "status", "created_at"])
    op.create_index("ix_responses_respondent_created", "service_responses", ["respondent_id", "created_at"])
    op.create_index("ix_responses_service_status", "service_responses", ["service_id", "status"])
    op.create_index("ix_responses_status_submitted", "service_responses", ["status", "work_submitted_at"])
    op.create_index("ix_reports_duplicate_lookup", "reports", ["reporter_id", "target_type", "target_id", "status"])
    op.create_index("ix_reviews_target_created", "reviews", ["target_user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_reviews_target_created", table_name="reviews")
    op.drop_index("ix_reports_duplicate_lookup", table_name="reports")
    op.drop_index("ix_responses_status_submitted", table_name="service_responses")
    op.drop_index("ix_responses_service_status", table_name="service_responses")
    op.drop_index("ix_responses_respondent_created", table_name="service_responses")
    op.drop_index("ix_services_discovery", table_name="services")
    op.drop_index("ix_services_active_created", table_name="services")
