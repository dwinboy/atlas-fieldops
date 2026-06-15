"""Add custom dashboards for the reports dashboard builder

Revision ID: 20260615_0038
Revises: 20260615_0037
Create Date: 2026-06-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260615_0038"
down_revision: str | None = "20260615_0037"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "custom_dashboards",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=220), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("dashboard_type", sa.String(length=60), nullable=False),
        sa.Column("visibility", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("widgets_json", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_custom_dashboards_organization_id", "custom_dashboards", ["organization_id"])
    op.create_index("ix_custom_dashboards_project_id", "custom_dashboards", ["project_id"])
    op.create_index("ix_custom_dashboards_status", "custom_dashboards", ["status"])


def downgrade() -> None:
    op.drop_index("ix_custom_dashboards_status", table_name="custom_dashboards")
    op.drop_index("ix_custom_dashboards_project_id", table_name="custom_dashboards")
    op.drop_index("ix_custom_dashboards_organization_id", table_name="custom_dashboards")
    op.drop_table("custom_dashboards")
