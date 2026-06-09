"""Add field visit requests.

Revision ID: 20260609_0025
Revises: 20260609_0024
Create Date: 2026-06-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260609_0025"
down_revision: str | None = "20260609_0024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "field_visit_requests",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("beneficiary_id", sa.Uuid(), nullable=True),
        sa.Column("field_officer_id", sa.Uuid(), nullable=False),
        sa.Column("supervisor_user_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("activity_type", sa.String(length=80), nullable=False, server_default="field_visit"),
        sa.Column("activity_scope", sa.String(length=40), nullable=False, server_default="organization"),
        sa.Column("requires_approval", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("purpose", sa.Text(), nullable=True),
        sa.Column("location_name", sa.String(length=220), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("requested_start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("requested_end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("priority", sa.String(length=40), nullable=False, server_default="normal"),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="pending"),
        sa.Column("required_form_ids_json", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("planned_activities_json", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("supervisor_instructions", sa.Text(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_in_latitude", sa.Float(), nullable=True),
        sa.Column("check_in_longitude", sa.Float(), nullable=True),
        sa.Column("check_in_accuracy", sa.Float(), nullable=True),
        sa.Column("check_in_note", sa.Text(), nullable=True),
        sa.Column("check_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_out_latitude", sa.Float(), nullable=True),
        sa.Column("check_out_longitude", sa.Float(), nullable=True),
        sa.Column("check_out_accuracy", sa.Float(), nullable=True),
        sa.Column("check_out_summary", sa.Text(), nullable=True),
        sa.Column("verification_status", sa.String(length=40), nullable=False, server_default="not_checked_in"),
        sa.Column("distance_from_planned_meters", sa.Float(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["beneficiary_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["field_officer_id"], ["field_officer_profiles.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["supervisor_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_field_visit_requests_organization_id"), "field_visit_requests", ["organization_id"], unique=False)
    op.create_index(op.f("ix_field_visit_requests_project_id"), "field_visit_requests", ["project_id"], unique=False)
    op.create_index(op.f("ix_field_visit_requests_beneficiary_id"), "field_visit_requests", ["beneficiary_id"], unique=False)
    op.create_index(op.f("ix_field_visit_requests_field_officer_id"), "field_visit_requests", ["field_officer_id"], unique=False)
    op.create_index(op.f("ix_field_visit_requests_supervisor_user_id"), "field_visit_requests", ["supervisor_user_id"], unique=False)
    op.create_index(op.f("ix_field_visit_requests_activity_type"), "field_visit_requests", ["activity_type"], unique=False)
    op.create_index(op.f("ix_field_visit_requests_activity_scope"), "field_visit_requests", ["activity_scope"], unique=False)
    op.create_index(op.f("ix_field_visit_requests_requested_start_at"), "field_visit_requests", ["requested_start_at"], unique=False)
    op.create_index(op.f("ix_field_visit_requests_requested_end_at"), "field_visit_requests", ["requested_end_at"], unique=False)
    op.create_index(op.f("ix_field_visit_requests_priority"), "field_visit_requests", ["priority"], unique=False)
    op.create_index(op.f("ix_field_visit_requests_status"), "field_visit_requests", ["status"], unique=False)
    op.create_index(op.f("ix_field_visit_requests_reviewed_by_user_id"), "field_visit_requests", ["reviewed_by_user_id"], unique=False)
    op.create_index(op.f("ix_field_visit_requests_verification_status"), "field_visit_requests", ["verification_status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_field_visit_requests_verification_status"), table_name="field_visit_requests")
    op.drop_index(op.f("ix_field_visit_requests_reviewed_by_user_id"), table_name="field_visit_requests")
    op.drop_index(op.f("ix_field_visit_requests_status"), table_name="field_visit_requests")
    op.drop_index(op.f("ix_field_visit_requests_priority"), table_name="field_visit_requests")
    op.drop_index(op.f("ix_field_visit_requests_requested_end_at"), table_name="field_visit_requests")
    op.drop_index(op.f("ix_field_visit_requests_requested_start_at"), table_name="field_visit_requests")
    op.drop_index(op.f("ix_field_visit_requests_activity_scope"), table_name="field_visit_requests")
    op.drop_index(op.f("ix_field_visit_requests_activity_type"), table_name="field_visit_requests")
    op.drop_index(op.f("ix_field_visit_requests_supervisor_user_id"), table_name="field_visit_requests")
    op.drop_index(op.f("ix_field_visit_requests_field_officer_id"), table_name="field_visit_requests")
    op.drop_index(op.f("ix_field_visit_requests_beneficiary_id"), table_name="field_visit_requests")
    op.drop_index(op.f("ix_field_visit_requests_project_id"), table_name="field_visit_requests")
    op.drop_index(op.f("ix_field_visit_requests_organization_id"), table_name="field_visit_requests")
    op.drop_table("field_visit_requests")
