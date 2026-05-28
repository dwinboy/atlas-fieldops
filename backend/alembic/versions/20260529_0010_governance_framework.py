"""Add enterprise governance framework.

Revision ID: 20260529_0010
Revises: 20260528_0009
Create Date: 2026-05-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from sqlalchemy.types import TypeEngine

revision: str = "20260529_0010"
down_revision: str | None = "20260528_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def base_cols() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def soft_base_cols() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def json_type() -> TypeEngine[object]:
    return sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def organization_index(table: str) -> None:
    op.create_index(op.f(f"ix_{table}_organization_id"), table, ["organization_id"], unique=False)


def upgrade() -> None:
    op.create_table(
        "governance_policies",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(180), nullable=False),
        sa.Column("policy_type", sa.String(80), nullable=False),
        sa.Column("lifecycle_state", sa.String(40), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("enforcement_level", sa.String(40), nullable=False),
        sa.Column("rules_json", json_type(), nullable=False),
        sa.Column("approved_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        *soft_base_cols(),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "policy_type", "version"),
    )
    op.create_table(
        "retention_policies",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("record_type", sa.String(80), nullable=False),
        sa.Column("retention_years", sa.Integer(), nullable=False),
        sa.Column("archive_after_days", sa.Integer(), nullable=False),
        sa.Column("legal_hold", sa.Boolean(), nullable=False),
        sa.Column("purge_allowed", sa.Boolean(), nullable=False),
        sa.Column("anonymize_on_export", sa.Boolean(), nullable=False),
        *soft_base_cols(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "record_type"),
    )
    op.create_table(
        "validation_rules",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("rule_code", sa.String(100), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("target_entity", sa.String(80), nullable=False),
        sa.Column("severity", sa.String(40), nullable=False),
        sa.Column("expression", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        *soft_base_cols(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "rule_code", "version"),
    )
    op.create_table(
        "data_versions",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("entity_type", sa.String(80), nullable=False),
        sa.Column("entity_id", sa.String(120), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("changed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("change_type", sa.String(60), nullable=False),
        sa.Column("previous_json", json_type(), nullable=False),
        sa.Column("current_json", json_type(), nullable=False),
        sa.Column("field_changes_json", json_type(), nullable=False),
        sa.Column("rollback_available", sa.Boolean(), nullable=False),
        *base_cols(),
        sa.ForeignKeyConstraint(["changed_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "lineage_tracking",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("source_type", sa.String(80), nullable=False),
        sa.Column("source_id", sa.String(120), nullable=False),
        sa.Column("target_type", sa.String(80), nullable=False),
        sa.Column("target_id", sa.String(120), nullable=False),
        sa.Column("transformation", sa.String(120), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("lineage_json", json_type(), nullable=False),
        *base_cols(),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "consent_records",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("beneficiary_id", sa.Uuid(), nullable=True),
        sa.Column("subject_identifier", sa.String(160), nullable=False),
        sa.Column("consent_type", sa.String(80), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("captured_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("evidence_url", sa.String(500), nullable=True),
        *base_cols(),
        sa.ForeignKeyConstraint(["beneficiary_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["captured_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "data_access_logs",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("access_type", sa.String(80), nullable=False),
        sa.Column("resource_type", sa.String(80), nullable=False),
        sa.Column("resource_id", sa.String(120), nullable=False),
        sa.Column("purpose", sa.String(180), nullable=False),
        sa.Column("allowed", sa.Boolean(), nullable=False),
        sa.Column("metadata_json", json_type(), nullable=False),
        *base_cols(),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "export_logs",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("requested_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("dataset_type", sa.String(80), nullable=False),
        sa.Column("export_format", sa.String(40), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("anonymized", sa.Boolean(), nullable=False),
        sa.Column("record_count", sa.Integer(), nullable=False),
        sa.Column("risk_score", sa.Float(), nullable=False),
        sa.Column("filters_json", json_type(), nullable=False),
        *base_cols(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "master_data_tables",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("code", sa.String(120), nullable=False),
        sa.Column("label", sa.String(220), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("approved_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("metadata_json", json_type(), nullable=False),
        *soft_base_cols(),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "category", "code", "version"),
    )

    for table in (
        "governance_policies",
        "retention_policies",
        "validation_rules",
        "data_versions",
        "lineage_tracking",
        "consent_records",
        "data_access_logs",
        "export_logs",
        "master_data_tables",
    ):
        organization_index(table)


def downgrade() -> None:
    for table in (
        "master_data_tables",
        "export_logs",
        "data_access_logs",
        "consent_records",
        "lineage_tracking",
        "data_versions",
        "validation_rules",
        "retention_policies",
        "governance_policies",
    ):
        op.drop_index(op.f(f"ix_{table}_organization_id"), table_name=table)
        op.drop_table(table)
