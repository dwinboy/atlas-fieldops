"""Field work assignments with lifecycle status and targets

Revision ID: 20260612_0033
Revises: 20260612_0032
Create Date: 2026-06-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260612_0033"
down_revision: str | None = "20260612_0032"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "field_work_assignments",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("form_id", sa.Uuid(), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("supervisor_user_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=220), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("assignment_type", sa.String(length=80), nullable=False),
        sa.Column("officer_ids_json", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
        sa.Column("assigned_entity_ids_json", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
        sa.Column("location", sa.String(length=240), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("target_count", sa.Integer(), nullable=False),
        sa.Column("completed_count", sa.Integer(), nullable=False),
        sa.Column("priority", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["form_id"], ["data_forms.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["supervisor_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_field_work_assignments_organization_id", "field_work_assignments", ["organization_id"])
    op.create_index("ix_field_work_assignments_project_id", "field_work_assignments", ["project_id"])
    op.create_index("ix_field_work_assignments_form_id", "field_work_assignments", ["form_id"])
    op.create_index("ix_field_work_assignments_created_by_user_id", "field_work_assignments", ["created_by_user_id"])
    op.create_index("ix_field_work_assignments_supervisor_user_id", "field_work_assignments", ["supervisor_user_id"])
    op.create_index("ix_field_work_assignments_priority", "field_work_assignments", ["priority"])
    op.create_index("ix_field_work_assignments_status", "field_work_assignments", ["status"])


def downgrade() -> None:
    op.drop_index("ix_field_work_assignments_status", table_name="field_work_assignments")
    op.drop_index("ix_field_work_assignments_priority", table_name="field_work_assignments")
    op.drop_index("ix_field_work_assignments_supervisor_user_id", table_name="field_work_assignments")
    op.drop_index("ix_field_work_assignments_created_by_user_id", table_name="field_work_assignments")
    op.drop_index("ix_field_work_assignments_form_id", table_name="field_work_assignments")
    op.drop_index("ix_field_work_assignments_project_id", table_name="field_work_assignments")
    op.drop_index("ix_field_work_assignments_organization_id", table_name="field_work_assignments")
    op.drop_table("field_work_assignments")
