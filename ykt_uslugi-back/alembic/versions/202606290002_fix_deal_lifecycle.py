"""fix deal lifecycle, negotiated prices and structured reports

Revision ID: 202606290002
Revises: 202606290001
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202606290002"
down_revision: str | Sequence[str] | None = "202606290001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("services") as batch_op:
        batch_op.alter_column("price", existing_type=sa.Numeric(10, 2), nullable=True)

    with op.batch_alter_table("service_responses") as batch_op:
        batch_op.drop_constraint("uq_response_service_respondent", type_="unique")

    with op.batch_alter_table("reports") as batch_op:
        batch_op.alter_column("reason", existing_type=sa.Text(), type_=sa.String(length=50), nullable=False)
        batch_op.add_column(sa.Column("comment", sa.Text(), nullable=True))


def downgrade() -> None:
    op.execute("UPDATE services SET price = 0 WHERE price IS NULL")
    with op.batch_alter_table("reports") as batch_op:
        batch_op.drop_column("comment")
        batch_op.alter_column("reason", existing_type=sa.String(length=50), type_=sa.Text(), nullable=False)

    with op.batch_alter_table("service_responses") as batch_op:
        batch_op.create_unique_constraint("uq_response_service_respondent", ["service_id", "respondent_id"])

    with op.batch_alter_table("services") as batch_op:
        batch_op.alter_column("price", existing_type=sa.Numeric(10, 2), nullable=False)
