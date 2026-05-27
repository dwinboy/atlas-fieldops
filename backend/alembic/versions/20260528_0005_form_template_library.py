"""Add form template library tables.

Revision ID: 20260528_0005
Revises: 20260528_0004
Create Date: 2026-05-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260528_0005"
down_revision: str | None = "20260528_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def json_type() -> sa.JSON:
    return sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "form_templates",
        sa.Column("organization_id", sa.Uuid(), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("schema_json", json_type(), nullable=False),
        sa.Column("tags_json", json_type(), nullable=False),
        sa.Column("recommended_for_json", json_type(), nullable=False),
        sa.Column("estimated_minutes", sa.Integer(), nullable=False),
        sa.Column("field_count", sa.Integer(), nullable=False),
        sa.Column("repeat_group_count", sa.Integer(), nullable=False),
        sa.Column("has_gps", sa.Boolean(), nullable=False),
        sa.Column("has_media", sa.Boolean(), nullable=False),
        sa.Column("offline_compatible", sa.Boolean(), nullable=False),
        sa.Column("popularity_score", sa.Integer(), nullable=False),
        sa.Column("is_featured", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", "version"),
    )
    op.create_index(op.f("ix_form_templates_category"), "form_templates", ["category"], unique=False)
    op.create_index(op.f("ix_form_templates_organization_id"), "form_templates", ["organization_id"], unique=False)
    op.create_index(op.f("ix_form_templates_popularity_score"), "form_templates", ["popularity_score"], unique=False)

    op.create_table(
        "form_template_usage",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("template_id", sa.Uuid(), nullable=True),
        sa.Column("template_slug", sa.String(length=140), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=False),
        sa.Column("created_form_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=40), nullable=False),
        sa.Column("metadata_json", json_type(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_form_id"], ["data_forms.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["form_templates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_form_template_usage_actor_user_id"), "form_template_usage", ["actor_user_id"], unique=False)
    op.create_index(op.f("ix_form_template_usage_created_form_id"), "form_template_usage", ["created_form_id"], unique=False)
    op.create_index(op.f("ix_form_template_usage_organization_id"), "form_template_usage", ["organization_id"], unique=False)
    op.create_index(op.f("ix_form_template_usage_template_id"), "form_template_usage", ["template_id"], unique=False)
    op.create_index(op.f("ix_form_template_usage_template_slug"), "form_template_usage", ["template_slug"], unique=False)
    op.create_index(op.f("ix_form_template_usage_action"), "form_template_usage", ["action"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_form_template_usage_action"), table_name="form_template_usage")
    op.drop_index(op.f("ix_form_template_usage_template_slug"), table_name="form_template_usage")
    op.drop_index(op.f("ix_form_template_usage_template_id"), table_name="form_template_usage")
    op.drop_index(op.f("ix_form_template_usage_organization_id"), table_name="form_template_usage")
    op.drop_index(op.f("ix_form_template_usage_created_form_id"), table_name="form_template_usage")
    op.drop_index(op.f("ix_form_template_usage_actor_user_id"), table_name="form_template_usage")
    op.drop_table("form_template_usage")
    op.drop_index(op.f("ix_form_templates_popularity_score"), table_name="form_templates")
    op.drop_index(op.f("ix_form_templates_organization_id"), table_name="form_templates")
    op.drop_index(op.f("ix_form_templates_category"), table_name="form_templates")
    op.drop_table("form_templates")
