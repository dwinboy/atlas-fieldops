"""Field work plans and operational targets

Revision ID: 20260612_0034
Revises: 20260612_0033
Create Date: 2026-06-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260612_0034"
down_revision: str | None = "20260612_0033"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "field_work_plans",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=220), nullable=False),
        sa.Column("project", sa.String(length=200), nullable=True),
        sa.Column("objectives", sa.Text(), nullable=True),
        sa.Column("locations_json", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
        sa.Column("assigned_teams_json", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
        sa.Column("deliverables_json", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column("view", sa.String(length=20), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_field_work_plans_organization_id", "field_work_plans", ["organization_id"])
    op.create_index("ix_field_work_plans_created_by_user_id", "field_work_plans", ["created_by_user_id"])

    op.create_table(
        "operational_targets",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=220), nullable=False),
        sa.Column("target_type", sa.String(length=20), nullable=False),
        sa.Column("project", sa.String(length=200), nullable=True),
        sa.Column("indicator", sa.String(length=220), nullable=True),
        sa.Column("team", sa.String(length=160), nullable=True),
        sa.Column("assigned_staff_json", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
        sa.Column("target_value", sa.Integer(), nullable=False),
        sa.Column("achieved_value", sa.Integer(), nullable=False),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_operational_targets_organization_id", "operational_targets", ["organization_id"])
    op.create_index("ix_operational_targets_created_by_user_id", "operational_targets", ["created_by_user_id"])
    op.create_index("ix_operational_targets_target_type", "operational_targets", ["target_type"])


def downgrade() -> None:
    op.drop_index("ix_operational_targets_target_type", table_name="operational_targets")
    op.drop_index("ix_operational_targets_created_by_user_id", table_name="operational_targets")
    op.drop_index("ix_operational_targets_organization_id", table_name="operational_targets")
    op.drop_table("operational_targets")
    op.drop_index("ix_field_work_plans_created_by_user_id", table_name="field_work_plans")
    op.drop_index("ix_field_work_plans_organization_id", table_name="field_work_plans")
    op.drop_table("field_work_plans")
