"""Dynamic entity category management

Revision ID: 20260612_0032
Revises: 20260612_0031
Create Date: 2026-06-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260612_0032"
down_revision: str | None = "20260612_0031"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "entity_categories",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("sector", sa.String(length=80), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(length=80), nullable=False),
        sa.Column("color", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("is_predefined", sa.Boolean(), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.Column("statuses_json", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
        sa.Column("workflow_json", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "project_id", "slug"),
    )
    op.create_index("ix_entity_categories_organization_id", "entity_categories", ["organization_id"])
    op.create_index("ix_entity_categories_project_id", "entity_categories", ["project_id"])
    op.create_index("ix_entity_categories_sector", "entity_categories", ["sector"])
    op.create_index("ix_entity_categories_status", "entity_categories", ["status"])
    op.create_index("ix_entity_categories_is_predefined", "entity_categories", ["is_predefined"])

    op.create_table(
        "entity_attributes",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("label", sa.String(length=160), nullable=False),
        sa.Column("field_key", sa.String(length=120), nullable=False),
        sa.Column("field_type", sa.String(length=40), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("required", sa.Boolean(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("options_json", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
        sa.Column("validation_json", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.Column("default_value", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["category_id"], ["entity_categories.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("category_id", "field_key"),
    )
    op.create_index("ix_entity_attributes_organization_id", "entity_attributes", ["organization_id"])
    op.create_index("ix_entity_attributes_category_id", "entity_attributes", ["category_id"])
    op.create_index("ix_entity_attributes_status", "entity_attributes", ["status"])

    op.create_table(
        "entity_attribute_values",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column("attribute_id", sa.Uuid(), nullable=False),
        sa.Column("value_json", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.Column("source_submission_id", sa.Uuid(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["attribute_id"], ["entity_attributes.id"]),
        sa.ForeignKeyConstraint(["entity_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["source_submission_id"], ["submissions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("entity_id", "attribute_id"),
    )
    op.create_index("ix_entity_attribute_values_organization_id", "entity_attribute_values", ["organization_id"])
    op.create_index("ix_entity_attribute_values_entity_id", "entity_attribute_values", ["entity_id"])
    op.create_index("ix_entity_attribute_values_attribute_id", "entity_attribute_values", ["attribute_id"])
    op.create_index("ix_entity_attribute_values_source_submission_id", "entity_attribute_values", ["source_submission_id"])


def downgrade() -> None:
    op.drop_index("ix_entity_attribute_values_source_submission_id", table_name="entity_attribute_values")
    op.drop_index("ix_entity_attribute_values_attribute_id", table_name="entity_attribute_values")
    op.drop_index("ix_entity_attribute_values_entity_id", table_name="entity_attribute_values")
    op.drop_index("ix_entity_attribute_values_organization_id", table_name="entity_attribute_values")
    op.drop_table("entity_attribute_values")
    op.drop_index("ix_entity_attributes_status", table_name="entity_attributes")
    op.drop_index("ix_entity_attributes_category_id", table_name="entity_attributes")
    op.drop_index("ix_entity_attributes_organization_id", table_name="entity_attributes")
    op.drop_table("entity_attributes")
    op.drop_index("ix_entity_categories_is_predefined", table_name="entity_categories")
    op.drop_index("ix_entity_categories_status", table_name="entity_categories")
    op.drop_index("ix_entity_categories_sector", table_name="entity_categories")
    op.drop_index("ix_entity_categories_project_id", table_name="entity_categories")
    op.drop_index("ix_entity_categories_organization_id", table_name="entity_categories")
    op.drop_table("entity_categories")
