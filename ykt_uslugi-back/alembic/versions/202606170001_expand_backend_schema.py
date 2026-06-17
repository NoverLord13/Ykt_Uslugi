"""expand backend schema

Revision ID: 202606170001
Revises:
Create Date: 2026-06-17
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202606170001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _index_exists(table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _table_exists("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("username", sa.String(length=50), nullable=False),
            sa.Column("phone_number", sa.String(length=20), nullable=False),
            sa.Column("hashed_password", sa.String(length=255), nullable=False),
            sa.Column("display_name", sa.String(length=100), nullable=True),
            sa.Column("bio", sa.Text(), nullable=True),
            sa.Column("avatar_url", sa.String(length=500), nullable=True),
            sa.Column("location", sa.String(length=200), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("is_admin", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("users", "ix_users_username"):
        op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)
    if not _index_exists("users", "ix_users_phone_number"):
        op.create_index(op.f("ix_users_phone_number"), "users", ["phone_number"], unique=True)

    if not _table_exists("categories"):
        op.create_table(
            "categories",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("slug", sa.String(length=120), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("categories", "ix_categories_name"):
        op.create_index(op.f("ix_categories_name"), "categories", ["name"], unique=True)
    if not _index_exists("categories", "ix_categories_slug"):
        op.create_index(op.f("ix_categories_slug"), "categories", ["slug"], unique=True)

    if not _table_exists("subcategories"):
        op.create_table(
            "subcategories",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("category_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("slug", sa.String(length=120), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("category_id", "slug", name="uq_subcategories_category_slug"),
        )
    if not _index_exists("subcategories", "ix_subcategories_category_id"):
        op.create_index(op.f("ix_subcategories_category_id"), "subcategories", ["category_id"], unique=False)
    if not _index_exists("subcategories", "ix_subcategories_name"):
        op.create_index(op.f("ix_subcategories_name"), "subcategories", ["name"], unique=False)
    if not _index_exists("subcategories", "ix_subcategories_slug"):
        op.create_index(op.f("ix_subcategories_slug"), "subcategories", ["slug"], unique=False)

    if _table_exists("users"):
        with op.batch_alter_table("users") as batch_op:
            if not _column_exists("users", "display_name"):
                batch_op.add_column(sa.Column("display_name", sa.String(length=100), nullable=True))
            if not _column_exists("users", "bio"):
                batch_op.add_column(sa.Column("bio", sa.Text(), nullable=True))
            if not _column_exists("users", "avatar_url"):
                batch_op.add_column(sa.Column("avatar_url", sa.String(length=500), nullable=True))
            if not _column_exists("users", "location"):
                batch_op.add_column(sa.Column("location", sa.String(length=200), nullable=True))

    if not _table_exists("services"):
        op.create_table(
            "services",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("owner_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("price", sa.Numeric(10, 2), nullable=False),
            sa.Column("listing_type", sa.String(length=20), nullable=False, server_default="offer"),
            sa.Column("category_id", sa.Integer(), nullable=True),
            sa.Column("subcategory_id", sa.Integer(), nullable=True),
            sa.Column("location", sa.String(length=200), nullable=True),
            sa.Column("price_type", sa.String(length=20), nullable=False, server_default="fixed"),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
            sa.Column("contact_phone", sa.String(length=20), nullable=True),
            sa.Column("image_url", sa.String(length=500), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
            sa.ForeignKeyConstraint(["subcategory_id"], ["subcategories.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    else:
        with op.batch_alter_table("services") as batch_op:
            if not _column_exists("services", "listing_type"):
                batch_op.add_column(sa.Column("listing_type", sa.String(length=20), nullable=False, server_default="offer"))
            if not _column_exists("services", "category_id"):
                batch_op.add_column(sa.Column("category_id", sa.Integer(), nullable=True))
            if not _column_exists("services", "subcategory_id"):
                batch_op.add_column(sa.Column("subcategory_id", sa.Integer(), nullable=True))
            if not _column_exists("services", "location"):
                batch_op.add_column(sa.Column("location", sa.String(length=200), nullable=True))
            if not _column_exists("services", "price_type"):
                batch_op.add_column(sa.Column("price_type", sa.String(length=20), nullable=False, server_default="fixed"))
            if not _column_exists("services", "status"):
                batch_op.add_column(sa.Column("status", sa.String(length=20), nullable=False, server_default="active"))
            if not _column_exists("services", "contact_phone"):
                batch_op.add_column(sa.Column("contact_phone", sa.String(length=20), nullable=True))

    if not _index_exists("services", "ix_services_owner_id"):
        op.create_index(op.f("ix_services_owner_id"), "services", ["owner_id"], unique=False)
    if not _index_exists("services", "ix_services_listing_type"):
        op.create_index(op.f("ix_services_listing_type"), "services", ["listing_type"], unique=False)
    if not _index_exists("services", "ix_services_category_id"):
        op.create_index(op.f("ix_services_category_id"), "services", ["category_id"], unique=False)
    if not _index_exists("services", "ix_services_subcategory_id"):
        op.create_index(op.f("ix_services_subcategory_id"), "services", ["subcategory_id"], unique=False)
    if not _index_exists("services", "ix_services_status"):
        op.create_index(op.f("ix_services_status"), "services", ["status"], unique=False)

    if not _table_exists("service_images"):
        op.create_table(
            "service_images",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("service_id", sa.Integer(), nullable=False),
            sa.Column("url", sa.String(length=500), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("service_images", "ix_service_images_service_id"):
        op.create_index(op.f("ix_service_images_service_id"), "service_images", ["service_id"], unique=False)

    op.execute(
        "INSERT INTO service_images (service_id, url, position) "
        "SELECT id, image_url, 0 FROM services "
        "WHERE image_url IS NOT NULL "
        "AND NOT EXISTS (SELECT 1 FROM service_images WHERE service_images.service_id = services.id)"
    )

    if not _table_exists("reviews"):
        op.create_table(
            "reviews",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("author_id", sa.Integer(), nullable=False),
            sa.Column("target_user_id", sa.Integer(), nullable=False),
            sa.Column("service_id", sa.Integer(), nullable=True),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("text", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["target_user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("author_id", "target_user_id", name="uq_reviews_author_target"),
        )
    if not _index_exists("reviews", "ix_reviews_author_id"):
        op.create_index(op.f("ix_reviews_author_id"), "reviews", ["author_id"], unique=False)
    if not _index_exists("reviews", "ix_reviews_target_user_id"):
        op.create_index(op.f("ix_reviews_target_user_id"), "reviews", ["target_user_id"], unique=False)
    if not _index_exists("reviews", "ix_reviews_service_id"):
        op.create_index(op.f("ix_reviews_service_id"), "reviews", ["service_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_reviews_service_id"), table_name="reviews")
    op.drop_index(op.f("ix_reviews_target_user_id"), table_name="reviews")
    op.drop_index(op.f("ix_reviews_author_id"), table_name="reviews")
    op.drop_table("reviews")

    op.drop_index(op.f("ix_service_images_service_id"), table_name="service_images")
    op.drop_table("service_images")

    op.drop_index(op.f("ix_services_status"), table_name="services")
    op.drop_index(op.f("ix_services_subcategory_id"), table_name="services")
    op.drop_index(op.f("ix_services_category_id"), table_name="services")
    op.drop_index(op.f("ix_services_listing_type"), table_name="services")
    with op.batch_alter_table("services") as batch_op:
        batch_op.drop_constraint("fk_services_subcategory_id_subcategories", type_="foreignkey")
        batch_op.drop_constraint("fk_services_category_id_categories", type_="foreignkey")
        batch_op.drop_column("contact_phone")
        batch_op.drop_column("status")
        batch_op.drop_column("price_type")
        batch_op.drop_column("location")
        batch_op.drop_column("subcategory_id")
        batch_op.drop_column("category_id")
        batch_op.drop_column("listing_type")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("location")
        batch_op.drop_column("avatar_url")
        batch_op.drop_column("bio")
        batch_op.drop_column("display_name")

    op.drop_index(op.f("ix_subcategories_slug"), table_name="subcategories")
    op.drop_index(op.f("ix_subcategories_name"), table_name="subcategories")
    op.drop_index(op.f("ix_subcategories_category_id"), table_name="subcategories")
    op.drop_table("subcategories")
    op.drop_index(op.f("ix_categories_slug"), table_name="categories")
    op.drop_index(op.f("ix_categories_name"), table_name="categories")
    op.drop_table("categories")
