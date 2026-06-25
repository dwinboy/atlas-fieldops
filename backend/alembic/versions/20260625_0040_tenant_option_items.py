"""Add tenant_option_items for owner-managed reference data

Revision ID: 20260625_0040
Revises: 20260624_0039
Create Date: 2026-06-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260625_0040"
down_revision: str | None = "20260624_0039"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tenant_option_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("set_key", sa.String(length=80), nullable=False),
        sa.Column("value", sa.String(length=120), nullable=False),
        sa.Column("label", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=500), server_default="", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("is_system", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "set_key", "value", name="uq_tenant_option_items_value"),
    )
    op.create_index("ix_tenant_option_items_organization_id", "tenant_option_items", ["organization_id"])
    op.create_index("ix_tenant_option_items_set_key", "tenant_option_items", ["set_key"])


def downgrade() -> None:
    op.drop_index("ix_tenant_option_items_set_key", table_name="tenant_option_items")
    op.drop_index("ix_tenant_option_items_organization_id", table_name="tenant_option_items")
    op.drop_table("tenant_option_items")
