"""Add report schedules for scheduled report delivery

Revision ID: 20260614_0036
Revises: 20260613_0035
Create Date: 2026-06-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260614_0036"
down_revision: str | None = "20260613_0035"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "report_schedules",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("report_id", sa.Uuid(), nullable=False),
        sa.Column("frequency", sa.String(length=20), nullable=False),
        sa.Column("hour", sa.Integer(), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("recipients", sa.JSON(), nullable=False),
        sa.Column("export_format", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_status", sa.String(length=20), nullable=True),
        sa.Column("failure_log", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["report_id"], ["donor_reports.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_report_schedules_organization_id", "report_schedules", ["organization_id"])
    op.create_index("ix_report_schedules_report_id", "report_schedules", ["report_id"])
    op.create_index("ix_report_schedules_status", "report_schedules", ["status"])


def downgrade() -> None:
    op.drop_index("ix_report_schedules_status", table_name="report_schedules")
    op.drop_index("ix_report_schedules_report_id", table_name="report_schedules")
    op.drop_index("ix_report_schedules_organization_id", table_name="report_schedules")
    op.drop_table("report_schedules")
