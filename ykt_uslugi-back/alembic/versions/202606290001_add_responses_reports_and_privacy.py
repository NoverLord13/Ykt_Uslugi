"""add responses, reports and privacy fields

Revision ID: 202606290001
Revises: 202606170001
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202606290001"
down_revision: str | Sequence[str] | None = "202606170001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("telegram_username", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("legal_accepted_at", sa.DateTime(), nullable=True))

    op.create_table(
        "service_responses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("respondent_id", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="new", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["respondent_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("service_id", "respondent_id", name="uq_response_service_respondent"),
    )
    op.create_index(op.f("ix_service_responses_service_id"), "service_responses", ["service_id"])
    op.create_index(op.f("ix_service_responses_respondent_id"), "service_responses", ["respondent_id"])
    op.create_index(op.f("ix_service_responses_status"), "service_responses", ["status"])

    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("reporter_id", sa.Integer(), nullable=False),
        sa.Column("target_type", sa.String(length=20), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="new", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["reporter_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reports_reporter_id"), "reports", ["reporter_id"])
    op.create_index(op.f("ix_reports_target_type"), "reports", ["target_type"])
    op.create_index(op.f("ix_reports_target_id"), "reports", ["target_id"])
    op.create_index(op.f("ix_reports_status"), "reports", ["status"])

    with op.batch_alter_table("reviews") as batch_op:
        batch_op.drop_constraint("uq_reviews_author_target", type_="unique")
        batch_op.add_column(sa.Column("response_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_reviews_response_id_service_responses", "service_responses", ["response_id"], ["id"], ondelete="SET NULL"
        )
        batch_op.create_unique_constraint("uq_reviews_author_response", ["author_id", "response_id"])
        batch_op.create_index(op.f("ix_reviews_response_id"), ["response_id"])


def downgrade() -> None:
    with op.batch_alter_table("reviews") as batch_op:
        batch_op.drop_index(op.f("ix_reviews_response_id"))
        batch_op.drop_constraint("uq_reviews_author_response", type_="unique")
        batch_op.drop_constraint("fk_reviews_response_id_service_responses", type_="foreignkey")
        batch_op.drop_column("response_id")
        batch_op.create_unique_constraint("uq_reviews_author_target", ["author_id", "target_user_id"])

    op.drop_index(op.f("ix_reports_status"), table_name="reports")
    op.drop_index(op.f("ix_reports_target_id"), table_name="reports")
    op.drop_index(op.f("ix_reports_target_type"), table_name="reports")
    op.drop_index(op.f("ix_reports_reporter_id"), table_name="reports")
    op.drop_table("reports")
    op.drop_index(op.f("ix_service_responses_status"), table_name="service_responses")
    op.drop_index(op.f("ix_service_responses_respondent_id"), table_name="service_responses")
    op.drop_index(op.f("ix_service_responses_service_id"), table_name="service_responses")
    op.drop_table("service_responses")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("legal_accepted_at")
        batch_op.drop_column("telegram_username")
