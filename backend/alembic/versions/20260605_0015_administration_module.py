"""administration module

Revision ID: 20260605_0015
Revises: 20260605_0014
Create Date: 2026-06-05 11:30:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260605_0015"
down_revision: str | None = "20260605_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False)


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def soft_delete() -> sa.Column:
    return sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)


def jsonb(default: str = "'{}'::jsonb") -> sa.Column:
    return sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text(default), nullable=False)


def upgrade() -> None:
    op.create_table(
        "platform_locations",
        uuid_pk(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("parent_location_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=220), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("location_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="active", nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("boundary_reference", sa.String(length=500), nullable=True),
        jsonb(),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["parent_location_id"], ["platform_locations.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "code"),
    )
    op.create_index("ix_platform_locations_code", "platform_locations", ["code"])
    op.create_index("ix_platform_locations_location_type", "platform_locations", ["location_type"])
    op.create_index("ix_platform_locations_organization_id", "platform_locations", ["organization_id"])
    op.create_index("ix_platform_locations_parent_location_id", "platform_locations", ["parent_location_id"])
    op.create_index("ix_platform_locations_status", "platform_locations", ["status"])

    op.create_table(
        "platform_reference_lists",
        uuid_pk(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=220), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=120), server_default="General", nullable=False),
        sa.Column("status", sa.String(length=40), server_default="active", nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "slug"),
    )
    op.create_index("ix_platform_reference_lists_category", "platform_reference_lists", ["category"])
    op.create_index("ix_platform_reference_lists_organization_id", "platform_reference_lists", ["organization_id"])
    op.create_index("ix_platform_reference_lists_slug", "platform_reference_lists", ["slug"])
    op.create_index("ix_platform_reference_lists_status", "platform_reference_lists", ["status"])

    op.create_table(
        "platform_reference_values",
        uuid_pk(),
        sa.Column("reference_list_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=120), nullable=False),
        sa.Column("label", sa.String(length=240), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=True),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        jsonb(),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reference_list_id"], ["platform_reference_lists.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reference_list_id", "code"),
    )
    op.create_index("ix_platform_reference_values_code", "platform_reference_values", ["code"])
    op.create_index("ix_platform_reference_values_is_active", "platform_reference_values", ["is_active"])
    op.create_index("ix_platform_reference_values_reference_list_id", "platform_reference_values", ["reference_list_id"])

    op.create_table(
        "notification_templates",
        uuid_pk(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("channel", sa.String(length=40), nullable=False),
        sa.Column("subject", sa.String(length=240), nullable=True),
        sa.Column("body", sa.Text(), server_default="", nullable=False),
        sa.Column("status", sa.String(length=40), server_default="active", nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "name", "channel"),
    )
    op.create_index("ix_notification_templates_channel", "notification_templates", ["channel"])
    op.create_index("ix_notification_templates_event_type", "notification_templates", ["event_type"])
    op.create_index("ix_notification_templates_organization_id", "notification_templates", ["organization_id"])
    op.create_index("ix_notification_templates_status", "notification_templates", ["status"])

    op.create_table(
        "notification_rules",
        uuid_pk(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("channel", sa.String(length=40), nullable=False),
        sa.Column("template", sa.Text(), server_default="", nullable=False),
        sa.Column("frequency", sa.String(length=80), server_default="Immediate", nullable=False),
        sa.Column("status", sa.String(length=40), server_default="active", nullable=False),
        sa.Column("recipients_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("delivery_rules_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_rules_channel", "notification_rules", ["channel"])
    op.create_index("ix_notification_rules_event_type", "notification_rules", ["event_type"])
    op.create_index("ix_notification_rules_organization_id", "notification_rules", ["organization_id"])
    op.create_index("ix_notification_rules_status", "notification_rules", ["status"])

    op.create_table(
        "administration_api_keys",
        uuid_pk(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("api_name", sa.String(length=200), nullable=False),
        sa.Column("owner", sa.String(length=200), nullable=False),
        sa.Column("key_prefix", sa.String(length=24), nullable=False),
        sa.Column("key_hash", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="active", nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rotated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rate_limit", sa.String(length=80), server_default="1000/hour", nullable=False),
        sa.Column("scope", sa.String(length=40), server_default="Read", nullable=False),
        jsonb(),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_administration_api_keys_key_prefix", "administration_api_keys", ["key_prefix"])
    op.create_index("ix_administration_api_keys_organization_id", "administration_api_keys", ["organization_id"])
    op.create_index("ix_administration_api_keys_scope", "administration_api_keys", ["scope"])
    op.create_index("ix_administration_api_keys_status", "administration_api_keys", ["status"])

    op.create_table(
        "integrations",
        uuid_pk(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("integration_type", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="disconnected", nullable=False),
        sa.Column("environment", sa.String(length=40), server_default="production", nullable=False),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("owner", sa.String(length=200), server_default="Platform team", nullable=False),
        jsonb(),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_integrations_environment", "integrations", ["environment"])
    op.create_index("ix_integrations_integration_type", "integrations", ["integration_type"])
    op.create_index("ix_integrations_organization_id", "integrations", ["organization_id"])
    op.create_index("ix_integrations_status", "integrations", ["status"])

    op.create_table(
        "integration_configs",
        uuid_pk(),
        sa.Column("integration_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("config_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("secret_reference", sa.String(length=300), nullable=True),
        sa.Column("status", sa.String(length=40), server_default="active", nullable=False),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["integration_id"], ["integrations.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_integration_configs_integration_id", "integration_configs", ["integration_id"])
    op.create_index("ix_integration_configs_status", "integration_configs", ["status"])

    op.create_table(
        "system_settings",
        uuid_pk(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("category", sa.String(length=100), server_default="General", nullable=False),
        sa.Column("setting_key", sa.String(length=140), nullable=False),
        sa.Column("setting_value_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("environment", sa.String(length=40), server_default="production", nullable=False),
        sa.Column("is_sensitive", sa.Boolean(), server_default=sa.text("FALSE"), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "environment", "setting_key"),
    )
    op.create_index("ix_system_settings_category", "system_settings", ["category"])
    op.create_index("ix_system_settings_environment", "system_settings", ["environment"])
    op.create_index("ix_system_settings_organization_id", "system_settings", ["organization_id"])
    op.create_index("ix_system_settings_setting_key", "system_settings", ["setting_key"])

    op.create_table(
        "feature_flags",
        uuid_pk(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("flag_key", sa.String(length=140), nullable=False),
        sa.Column("label", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("FALSE"), nullable=False),
        sa.Column("rollout_percentage", sa.Integer(), server_default="0", nullable=False),
        sa.Column("environment", sa.String(length=40), server_default="production", nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "environment", "flag_key"),
    )
    op.create_index("ix_feature_flags_enabled", "feature_flags", ["enabled"])
    op.create_index("ix_feature_flags_environment", "feature_flags", ["environment"])
    op.create_index("ix_feature_flags_flag_key", "feature_flags", ["flag_key"])
    op.create_index("ix_feature_flags_organization_id", "feature_flags", ["organization_id"])

    op.create_table(
        "backup_jobs",
        uuid_pk(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("backup_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="scheduled", nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("retention_days", sa.Integer(), server_default="30", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        jsonb(),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_backup_jobs_backup_type", "backup_jobs", ["backup_type"])
    op.create_index("ix_backup_jobs_organization_id", "backup_jobs", ["organization_id"])
    op.create_index("ix_backup_jobs_status", "backup_jobs", ["status"])

    op.create_table(
        "recovery_jobs",
        uuid_pk(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("backup_job_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(length=40), server_default="requested", nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("requested_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("approved_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        jsonb(),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["backup_job_id"], ["backup_jobs.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recovery_jobs_backup_job_id", "recovery_jobs", ["backup_job_id"])
    op.create_index("ix_recovery_jobs_organization_id", "recovery_jobs", ["organization_id"])
    op.create_index("ix_recovery_jobs_status", "recovery_jobs", ["status"])

    op.create_table(
        "system_audit_logs",
        uuid_pk(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=140), nullable=False),
        sa.Column("resource_type", sa.String(length=120), nullable=False),
        sa.Column("resource_id", sa.String(length=140), nullable=False),
        sa.Column("old_value_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("new_value_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=80), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        jsonb(),
        *timestamps(),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_system_audit_logs_action", "system_audit_logs", ["action"])
    op.create_index("ix_system_audit_logs_actor_user_id", "system_audit_logs", ["actor_user_id"])
    op.create_index("ix_system_audit_logs_organization_id", "system_audit_logs", ["organization_id"])
    op.create_index("ix_system_audit_logs_resource_type", "system_audit_logs", ["resource_type"])


def downgrade() -> None:
    for index_name, table_name in (
        ("ix_system_audit_logs_resource_type", "system_audit_logs"),
        ("ix_system_audit_logs_organization_id", "system_audit_logs"),
        ("ix_system_audit_logs_actor_user_id", "system_audit_logs"),
        ("ix_system_audit_logs_action", "system_audit_logs"),
        ("ix_recovery_jobs_status", "recovery_jobs"),
        ("ix_recovery_jobs_organization_id", "recovery_jobs"),
        ("ix_recovery_jobs_backup_job_id", "recovery_jobs"),
        ("ix_backup_jobs_status", "backup_jobs"),
        ("ix_backup_jobs_organization_id", "backup_jobs"),
        ("ix_backup_jobs_backup_type", "backup_jobs"),
        ("ix_feature_flags_organization_id", "feature_flags"),
        ("ix_feature_flags_flag_key", "feature_flags"),
        ("ix_feature_flags_environment", "feature_flags"),
        ("ix_feature_flags_enabled", "feature_flags"),
        ("ix_system_settings_setting_key", "system_settings"),
        ("ix_system_settings_organization_id", "system_settings"),
        ("ix_system_settings_environment", "system_settings"),
        ("ix_system_settings_category", "system_settings"),
        ("ix_integration_configs_status", "integration_configs"),
        ("ix_integration_configs_integration_id", "integration_configs"),
        ("ix_integrations_status", "integrations"),
        ("ix_integrations_organization_id", "integrations"),
        ("ix_integrations_integration_type", "integrations"),
        ("ix_integrations_environment", "integrations"),
        ("ix_administration_api_keys_status", "administration_api_keys"),
        ("ix_administration_api_keys_scope", "administration_api_keys"),
        ("ix_administration_api_keys_organization_id", "administration_api_keys"),
        ("ix_administration_api_keys_key_prefix", "administration_api_keys"),
        ("ix_notification_rules_status", "notification_rules"),
        ("ix_notification_rules_organization_id", "notification_rules"),
        ("ix_notification_rules_event_type", "notification_rules"),
        ("ix_notification_rules_channel", "notification_rules"),
        ("ix_notification_templates_status", "notification_templates"),
        ("ix_notification_templates_organization_id", "notification_templates"),
        ("ix_notification_templates_event_type", "notification_templates"),
        ("ix_notification_templates_channel", "notification_templates"),
        ("ix_platform_reference_values_reference_list_id", "platform_reference_values"),
        ("ix_platform_reference_values_is_active", "platform_reference_values"),
        ("ix_platform_reference_values_code", "platform_reference_values"),
        ("ix_platform_reference_lists_status", "platform_reference_lists"),
        ("ix_platform_reference_lists_slug", "platform_reference_lists"),
        ("ix_platform_reference_lists_organization_id", "platform_reference_lists"),
        ("ix_platform_reference_lists_category", "platform_reference_lists"),
        ("ix_platform_locations_status", "platform_locations"),
        ("ix_platform_locations_parent_location_id", "platform_locations"),
        ("ix_platform_locations_organization_id", "platform_locations"),
        ("ix_platform_locations_location_type", "platform_locations"),
        ("ix_platform_locations_code", "platform_locations"),
    ):
        op.drop_index(index_name, table_name=table_name)

    for table_name in (
        "system_audit_logs",
        "recovery_jobs",
        "backup_jobs",
        "feature_flags",
        "system_settings",
        "integration_configs",
        "integrations",
        "administration_api_keys",
        "notification_rules",
        "notification_templates",
        "platform_reference_values",
        "platform_reference_lists",
        "platform_locations",
    ):
        op.drop_table(table_name)
