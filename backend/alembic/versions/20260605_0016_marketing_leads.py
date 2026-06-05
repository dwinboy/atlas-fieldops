"""marketing lead capture

Revision ID: 20260605_0016
Revises: 20260605_0015
Create Date: 2026-06-05 17:20:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260605_0016"
down_revision: str | None = "20260605_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "marketing_leads",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("name", sa.String(length=220), nullable=False),
        sa.Column("organization", sa.String(length=220), server_default="", nullable=False),
        sa.Column("country", sa.String(length=120), server_default="", nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("phone", sa.String(length=80), server_default="", nullable=False),
        sa.Column("organization_size", sa.String(length=80), server_default="", nullable=False),
        sa.Column("interest_area", sa.String(length=160), server_default="", nullable=False),
        sa.Column("source", sa.String(length=120), server_default="website", nullable=False),
        sa.Column("message", sa.Text(), server_default="", nullable=False),
        sa.Column("status", sa.String(length=40), server_default="new", nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_marketing_leads_email", "marketing_leads", ["email"])
    op.create_index("ix_marketing_leads_source", "marketing_leads", ["source"])
    op.create_index("ix_marketing_leads_status", "marketing_leads", ["status"])


def downgrade() -> None:
    op.drop_index("ix_marketing_leads_status", table_name="marketing_leads")
    op.drop_index("ix_marketing_leads_source", table_name="marketing_leads")
    op.drop_index("ix_marketing_leads_email", table_name="marketing_leads")
    op.drop_table("marketing_leads")
