"""monitoring and evaluation operations

Revision ID: 20260528_0003
Revises: 20260527_0002
Create Date: 2026-05-28 00:45:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260528_0003"
down_revision: str | None = "20260527_0002"
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
        "beneficiaries",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("beneficiary_uid", sa.String(length=120), nullable=False),
        sa.Column("beneficiary_type", sa.String(length=60), nullable=False),
        sa.Column("display_name", sa.String(length=220), nullable=False),
        sa.Column("sex", sa.String(length=30), nullable=True),
        sa.Column("birth_year", sa.Integer(), nullable=True),
        sa.Column("phone_number", sa.String(length=40), nullable=True),
        sa.Column("region", sa.String(length=160), nullable=True),
        sa.Column("district", sa.String(length=160), nullable=True),
        sa.Column("community", sa.String(length=180), nullable=True),
        sa.Column("enrollment_status", sa.String(length=40), server_default="active", nullable=False),
        sa.Column("vulnerability_score", sa.Integer(), server_default="0", nullable=False),
        sa.Column("duplicate_risk_score", sa.Float(), server_default="0", nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("last_visit_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("profile_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "beneficiary_uid"),
    )
    op.create_index("ix_beneficiaries_organization_id", "beneficiaries", ["organization_id"])
    op.create_index("ix_beneficiaries_project_id", "beneficiaries", ["project_id"])
    op.create_index("ix_beneficiaries_beneficiary_type", "beneficiaries", ["beneficiary_type"])
    op.create_index("ix_beneficiaries_region", "beneficiaries", ["region"])
    op.create_index("ix_beneficiaries_enrollment_status", "beneficiaries", ["enrollment_status"])
    op.create_index("idx_beneficiaries_org_location", "beneficiaries", ["organization_id", "latitude", "longitude"])

    op.create_table(
        "monitoring_indicators",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=240), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("unit", sa.String(length=60), server_default="count", nullable=False),
        sa.Column("reporting_frequency", sa.String(length=40), server_default="monthly", nullable=False),
        sa.Column("baseline_value", sa.Float(), server_default="0", nullable=False),
        sa.Column("target_value", sa.Float(), server_default="0", nullable=False),
        sa.Column("current_value", sa.Float(), server_default="0", nullable=False),
        sa.Column("sdg_code", sa.String(length=40), nullable=True),
        sa.Column("formula", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "code"),
    )
    op.create_index("ix_monitoring_indicators_organization_id", "monitoring_indicators", ["organization_id"])
    op.create_index("ix_monitoring_indicators_project_id", "monitoring_indicators", ["project_id"])

    op.create_table(
        "case_records",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("beneficiary_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("case_number", sa.String(length=120), nullable=False),
        sa.Column("case_type", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("priority", sa.String(length=40), server_default="normal", nullable=False),
        sa.Column("status", sa.String(length=40), server_default="open", nullable=False),
        sa.Column("assigned_to_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["assigned_to_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["beneficiary_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_case_records_organization_id", "case_records", ["organization_id"])
    op.create_index("ix_case_records_beneficiary_id", "case_records", ["beneficiary_id"])
    op.create_index("ix_case_records_case_number", "case_records", ["case_number"])
    op.create_index("ix_case_records_case_type", "case_records", ["case_type"])
    op.create_index("ix_case_records_priority", "case_records", ["priority"])
    op.create_index("ix_case_records_status", "case_records", ["status"])

    op.create_table(
        "visit_records",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("beneficiary_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_officer_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("visit_type", sa.String(length=80), server_default="follow_up", nullable=False),
        sa.Column("visited_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("media_count", sa.Integer(), server_default="0", nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["beneficiary_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["field_officer_id"], ["field_officer_profiles.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_visit_records_organization_id", "visit_records", ["organization_id"])
    op.create_index("ix_visit_records_beneficiary_id", "visit_records", ["beneficiary_id"])
    op.create_index("idx_visit_records_org_time", "visit_records", ["organization_id", "visited_at"])

    op.create_table(
        "data_quality_signals",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("beneficiary_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("signal_type", sa.String(length=80), nullable=False),
        sa.Column("severity", sa.String(length=40), server_default="medium", nullable=False),
        sa.Column("confidence", sa.Float(), server_default="0", nullable=False),
        sa.Column("summary", sa.String(length=300), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="open", nullable=False),
        sa.Column("evidence_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["beneficiary_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_data_quality_signals_organization_id", "data_quality_signals", ["organization_id"])
    op.create_index("ix_data_quality_signals_signal_type", "data_quality_signals", ["signal_type"])
    op.create_index("ix_data_quality_signals_severity", "data_quality_signals", ["severity"])
    op.create_index("ix_data_quality_signals_status", "data_quality_signals", ["status"])

    op.create_table(
        "donor_reports",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=220), nullable=False),
        sa.Column("donor", sa.String(length=160), nullable=True),
        sa.Column("report_type", sa.String(length=80), server_default="indicator", nullable=False),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=40), server_default="draft", nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("export_formats", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_donor_reports_organization_id", "donor_reports", ["organization_id"])
    op.create_index("ix_donor_reports_status", "donor_reports", ["status"])

    op.create_table(
        "organization_branding",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_name", sa.String(length=160), server_default="Atlas FieldOps", nullable=False),
        sa.Column("primary_color", sa.String(length=20), server_default="#0f766e", nullable=False),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("custom_domain", sa.String(length=240), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id"),
    )
    op.create_index("ix_organization_branding_organization_id", "organization_branding", ["organization_id"])

    op.create_table(
        "offline_sync_policies",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("delta_sync_enabled", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        sa.Column("compression_enabled", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        sa.Column("max_photo_size_kb", sa.Integer(), server_default="480", nullable=False),
        sa.Column("retry_window_hours", sa.Integer(), server_default="72", nullable=False),
        sa.Column("conflict_strategy", sa.String(length=80), server_default="server_review", nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id"),
    )
    op.create_index("ix_offline_sync_policies_organization_id", "offline_sync_policies", ["organization_id"])


def downgrade() -> None:
    op.drop_table("offline_sync_policies")
    op.drop_table("organization_branding")
    op.drop_table("donor_reports")
    op.drop_table("data_quality_signals")
    op.drop_table("visit_records")
    op.drop_table("case_records")
    op.drop_table("monitoring_indicators")
    op.drop_table("beneficiaries")
