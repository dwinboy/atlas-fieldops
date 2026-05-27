"""data interoperability jobs

Revision ID: 20260528_0004
Revises: 20260528_0003
Create Date: 2026-05-28 01:10:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260528_0004"
down_revision: str | None = "20260528_0003"
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
        "data_import_jobs",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dataset_type", sa.String(length=80), nullable=False),
        sa.Column("source_name", sa.String(length=240), nullable=False),
        sa.Column("source_format", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="draft", nullable=False),
        sa.Column("total_rows", sa.Integer(), server_default="0", nullable=False),
        sa.Column("valid_rows", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error_rows", sa.Integer(), server_default="0", nullable=False),
        sa.Column("duplicate_rows", sa.Integer(), server_default="0", nullable=False),
        sa.Column("mapping_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("summary_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("rollback_available", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_data_import_jobs_organization_id", "data_import_jobs", ["organization_id"])
    op.create_index("ix_data_import_jobs_dataset_type", "data_import_jobs", ["dataset_type"])
    op.create_index("ix_data_import_jobs_source_format", "data_import_jobs", ["source_format"])
    op.create_index("ix_data_import_jobs_status", "data_import_jobs", ["status"])

    op.create_table(
        "data_import_issues",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("import_job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("field_name", sa.String(length=120), nullable=True),
        sa.Column("issue_type", sa.String(length=80), nullable=False),
        sa.Column("severity", sa.String(length=40), server_default="error", nullable=False),
        sa.Column("message", sa.String(length=400), nullable=False),
        sa.Column("suggested_fix", sa.String(length=400), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["import_job_id"], ["data_import_jobs.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_data_import_issues_organization_id", "data_import_issues", ["organization_id"])
    op.create_index("ix_data_import_issues_import_job_id", "data_import_issues", ["import_job_id"])
    op.create_index("ix_data_import_issues_issue_type", "data_import_issues", ["issue_type"])
    op.create_index("ix_data_import_issues_severity", "data_import_issues", ["severity"])

    op.create_table(
        "data_mapping_templates",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("dataset_type", sa.String(length=80), nullable=False),
        sa.Column("mapping_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("FALSE"), nullable=False),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "name"),
    )
    op.create_index("ix_data_mapping_templates_organization_id", "data_mapping_templates", ["organization_id"])
    op.create_index("ix_data_mapping_templates_dataset_type", "data_mapping_templates", ["dataset_type"])

    op.create_table(
        "data_export_jobs",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dataset_type", sa.String(length=80), nullable=False),
        sa.Column("export_format", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="queued", nullable=False),
        sa.Column("filtered_view_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("download_url", sa.String(length=500), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scheduled", sa.Boolean(), server_default=sa.text("FALSE"), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_data_export_jobs_organization_id", "data_export_jobs", ["organization_id"])
    op.create_index("ix_data_export_jobs_dataset_type", "data_export_jobs", ["dataset_type"])
    op.create_index("ix_data_export_jobs_export_format", "data_export_jobs", ["export_format"])
    op.create_index("ix_data_export_jobs_status", "data_export_jobs", ["status"])

    op.create_table(
        "bulk_edit_batches",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("edited_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dataset_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="draft", nullable=False),
        sa.Column("total_records", sa.Integer(), server_default="0", nullable=False),
        sa.Column("changed_records", sa.Integer(), server_default="0", nullable=False),
        sa.Column("conflict_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("change_set_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("undo_available", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["edited_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_bulk_edit_batches_organization_id", "bulk_edit_batches", ["organization_id"])
    op.create_index("ix_bulk_edit_batches_dataset_type", "bulk_edit_batches", ["dataset_type"])
    op.create_index("ix_bulk_edit_batches_status", "bulk_edit_batches", ["status"])


def downgrade() -> None:
    op.drop_table("bulk_edit_batches")
    op.drop_table("data_export_jobs")
    op.drop_table("data_mapping_templates")
    op.drop_table("data_import_issues")
    op.drop_table("data_import_jobs")
