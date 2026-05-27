"""enterprise collection workflow

Revision ID: 20260527_0002
Revises: 20260527_0001
Create Date: 2026-05-27 22:55:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260527_0002"
down_revision: str | None = "20260527_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_column() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False)


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def soft_delete() -> sa.Column:
    return sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)


def upgrade() -> None:
    op.create_table(
        "projects",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("region", sa.String(length=160), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "slug"),
    )
    op.create_index("ix_projects_organization_id", "projects", ["organization_id"])

    op.create_table(
        "field_officer_profiles",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_code", sa.String(length=80), nullable=True),
        sa.Column("phone_number", sa.String(length=40), nullable=True),
        sa.Column("home_region", sa.String(length=160), nullable=True),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_latitude", sa.Float(), nullable=True),
        sa.Column("last_longitude", sa.Float(), nullable=True),
        sa.Column("device_id", sa.String(length=160), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "user_id"),
    )
    op.create_index("ix_field_officer_profiles_organization_id", "field_officer_profiles", ["organization_id"])
    op.create_index("ix_field_officer_profiles_user_id", "field_officer_profiles", ["user_id"])

    op.create_table(
        "officer_assignments",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("officer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("region", sa.String(length=160), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["officer_id"], ["field_officer_profiles.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "officer_id", "project_id"),
    )
    op.create_index("ix_officer_assignments_organization_id", "officer_assignments", ["organization_id"])
    op.create_index("ix_officer_assignments_officer_id", "officer_assignments", ["officer_id"])
    op.create_index("ix_officer_assignments_project_id", "officer_assignments", ["project_id"])

    op.create_table(
        "data_forms",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), server_default="draft", nullable=False),
        sa.Column("current_version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "slug"),
    )
    op.create_index("ix_data_forms_organization_id", "data_forms", ["organization_id"])
    op.create_index("ix_data_forms_status", "data_forms", ["status"])

    op.create_table(
        "data_form_versions",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("schema_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("offline_compatible", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["form_id"], ["data_forms.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("form_id", "version"),
    )
    op.create_index("ix_data_form_versions_organization_id", "data_form_versions", ["organization_id"])
    op.create_index("ix_data_form_versions_form_id", "data_form_versions", ["form_id"])

    op.create_table(
        "submissions",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("form_version_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_officer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_submission_id", sa.String(length=160), nullable=False),
        sa.Column("server_sequence", sa.Integer(), server_default="1", nullable=False),
        sa.Column("status", sa.String(length=40), server_default="submitted", nullable=False),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("device_id", sa.String(length=160), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sync_received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("offline_created", sa.Boolean(), server_default=sa.text("FALSE"), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("altitude", sa.Float(), nullable=True),
        sa.Column("accuracy", sa.Float(), nullable=True),
        sa.Column("location_captured_at", sa.DateTime(timezone=True), nullable=False),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["field_officer_id"], ["field_officer_profiles.id"]),
        sa.ForeignKeyConstraint(["form_id"], ["data_forms.id"]),
        sa.ForeignKeyConstraint(["form_version_id"], ["data_form_versions.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "client_submission_id"),
    )
    op.create_index("ix_submissions_organization_id", "submissions", ["organization_id"])
    op.create_index("ix_submissions_status", "submissions", ["status"])
    op.create_index("idx_submissions_org_status_sync", "submissions", ["organization_id", "status", "sync_received_at"])
    op.create_index("idx_submissions_location", "submissions", ["organization_id", "latitude", "longitude"])

    op.create_table(
        "submission_versions",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("changed_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("change_reason", sa.Text(), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["changed_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("submission_id", "version"),
    )
    op.create_index("ix_submission_versions_organization_id", "submission_versions", ["organization_id"])
    op.create_index("ix_submission_versions_submission_id", "submission_versions", ["submission_id"])

    op.create_table(
        "submission_status_history",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_status", sa.String(length=40), nullable=True),
        sa.Column("to_status", sa.String(length=40), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_submission_status_history_organization_id", "submission_status_history", ["organization_id"])
    op.create_index("ix_submission_status_history_submission_id", "submission_status_history", ["submission_id"])
    op.create_index("ix_submission_status_history_to_status", "submission_status_history", ["to_status"])

    op.create_table(
        "mobile_sync_batches",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_officer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_id", sa.String(length=160), nullable=False),
        sa.Column("client_batch_id", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="processed", nullable=False),
        sa.Column("processed_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("conflict_count", sa.Integer(), server_default="0", nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["field_officer_id"], ["field_officer_profiles.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "device_id", "client_batch_id"),
    )
    op.create_index("ix_mobile_sync_batches_organization_id", "mobile_sync_batches", ["organization_id"])
    op.create_index("ix_mobile_sync_batches_device_id", "mobile_sync_batches", ["device_id"])


def downgrade() -> None:
    op.drop_table("mobile_sync_batches")
    op.drop_table("submission_status_history")
    op.drop_table("submission_versions")
    op.drop_table("submissions")
    op.drop_table("data_form_versions")
    op.drop_table("data_forms")
    op.drop_table("officer_assignments")
    op.drop_table("field_officer_profiles")
    op.drop_table("projects")
