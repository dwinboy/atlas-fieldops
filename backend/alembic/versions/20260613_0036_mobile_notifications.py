"""Add mobile notifications

Revision ID: 20260613_0036
Revises: 20260613_0035
Create Date: 2026-06-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260613_0036"
down_revision: str | None = "20260613_0035"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "mobile_notifications",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("resource_type", sa.String(length=80), nullable=True),
        sa.Column("resource_id", sa.Uuid(), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_server_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mobile_notifications_event_type", "mobile_notifications", ["event_type"])
    op.create_index("ix_mobile_notifications_organization_id", "mobile_notifications", ["organization_id"])
    op.create_index("ix_mobile_notifications_resource_id", "mobile_notifications", ["resource_id"])
    op.create_index("ix_mobile_notifications_resource_type", "mobile_notifications", ["resource_type"])
    op.create_index("ix_mobile_notifications_user_id", "mobile_notifications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_mobile_notifications_user_id", table_name="mobile_notifications")
    op.drop_index("ix_mobile_notifications_resource_type", table_name="mobile_notifications")
    op.drop_index("ix_mobile_notifications_resource_id", table_name="mobile_notifications")
    op.drop_index("ix_mobile_notifications_organization_id", table_name="mobile_notifications")
    op.drop_index("ix_mobile_notifications_event_type", table_name="mobile_notifications")
    op.drop_table("mobile_notifications")
