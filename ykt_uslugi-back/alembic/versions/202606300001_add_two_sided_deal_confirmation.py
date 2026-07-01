"""add two-sided deal confirmation and role-specific reviews

Revision ID: 202606300001
Revises: 202606290002
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202606300001"
down_revision: str | Sequence[str] | None = "202606290002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("service_responses") as batch_op:
        batch_op.add_column(sa.Column("status_note", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("work_submitted_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("completed_at", sa.DateTime(), nullable=True))

    with op.batch_alter_table("reviews") as batch_op:
        batch_op.add_column(sa.Column("review_type", sa.String(length=20), server_default="customer", nullable=False))
        batch_op.create_index(op.f("ix_reviews_review_type"), ["review_type"])


def downgrade() -> None:
    with op.batch_alter_table("reviews") as batch_op:
        batch_op.drop_index(op.f("ix_reviews_review_type"))
        batch_op.drop_column("review_type")

    with op.batch_alter_table("service_responses") as batch_op:
        batch_op.drop_column("completed_at")
        batch_op.drop_column("work_submitted_at")
        batch_op.drop_column("status_note")
