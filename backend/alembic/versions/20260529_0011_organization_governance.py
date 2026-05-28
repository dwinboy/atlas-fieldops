"""Add organization governance and workforce management.

Revision ID: 20260529_0011
Revises: 20260529_0010
Create Date: 2026-05-29 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260529_0011"
down_revision: str | None = "20260529_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("parent_department_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("department_type", sa.String(length=80), nullable=False),
        sa.Column("manager_user_id", sa.Uuid(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["manager_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["parent_department_id"], ["departments.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "code"),
    )
    op.create_index(op.f("ix_departments_organization_id"), "departments", ["organization_id"], unique=False)
    op.create_index(op.f("ix_departments_parent_department_id"), "departments", ["parent_department_id"], unique=False)
    op.create_index(op.f("ix_departments_manager_user_id"), "departments", ["manager_user_id"], unique=False)

    op.create_table(
        "operational_teams",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("department_id", sa.Uuid(), nullable=True),
        sa.Column("organization_unit_id", sa.Uuid(), nullable=True),
        sa.Column("manager_user_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("team_type", sa.String(length=80), nullable=False),
        sa.Column("region", sa.String(length=160), nullable=True),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
        sa.ForeignKeyConstraint(["manager_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["organization_unit_id"], ["organizational_units.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "code"),
    )
    op.create_index(op.f("ix_operational_teams_organization_id"), "operational_teams", ["organization_id"], unique=False)
    op.create_index(op.f("ix_operational_teams_department_id"), "operational_teams", ["department_id"], unique=False)
    op.create_index(op.f("ix_operational_teams_manager_user_id"), "operational_teams", ["manager_user_id"], unique=False)
    op.create_index(op.f("ix_operational_teams_region"), "operational_teams", ["region"], unique=False)
    op.create_index(op.f("ix_operational_teams_project_id"), "operational_teams", ["project_id"], unique=False)

    op.create_table(
        "workforce_profiles",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("employee_code", sa.String(length=80), nullable=True),
        sa.Column("job_title", sa.String(length=160), nullable=False),
        sa.Column("department_id", sa.Uuid(), nullable=True),
        sa.Column("team_id", sa.Uuid(), nullable=True),
        sa.Column("supervisor_user_id", sa.Uuid(), nullable=True),
        sa.Column("lifecycle_status", sa.String(length=40), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("clearance_level", sa.String(length=80), nullable=False),
        sa.Column("performance_score", sa.Float(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["supervisor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["operational_teams.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "user_id"),
    )
    op.create_index(op.f("ix_workforce_profiles_organization_id"), "workforce_profiles", ["organization_id"], unique=False)
    op.create_index(op.f("ix_workforce_profiles_user_id"), "workforce_profiles", ["user_id"], unique=False)
    op.create_index(op.f("ix_workforce_profiles_lifecycle_status"), "workforce_profiles", ["lifecycle_status"], unique=False)

    op.create_table(
        "access_delegations",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("delegator_user_id", sa.Uuid(), nullable=False),
        sa.Column("delegate_user_id", sa.Uuid(), nullable=False),
        sa.Column("permission", sa.String(length=120), nullable=False),
        sa.Column("scope_type", sa.String(length=40), nullable=False),
        sa.Column("geography_id", sa.String(length=120), nullable=True),
        sa.Column("project_id", sa.String(length=36), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["delegate_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["delegator_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_access_delegations_organization_id"), "access_delegations", ["organization_id"], unique=False)
    op.create_index(op.f("ix_access_delegations_delegate_user_id"), "access_delegations", ["delegate_user_id"], unique=False)
    op.create_index(op.f("ix_access_delegations_status"), "access_delegations", ["status"], unique=False)

    op.create_table(
        "approval_matrices",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("matrix_code", sa.String(length=100), nullable=False),
        sa.Column("workflow_type", sa.String(length=80), nullable=False),
        sa.Column("threshold_type", sa.String(length=80), nullable=False),
        sa.Column("threshold_value", sa.Float(), nullable=False),
        sa.Column("required_role", sa.String(length=100), nullable=False),
        sa.Column("approval_stage", sa.String(length=100), nullable=False),
        sa.Column("escalation_role", sa.String(length=100), nullable=True),
        sa.Column("sla_hours", sa.Integer(), nullable=False),
        sa.Column("conditions_json", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "matrix_code"),
    )
    op.create_index(op.f("ix_approval_matrices_organization_id"), "approval_matrices", ["organization_id"], unique=False)
    op.create_index(op.f("ix_approval_matrices_workflow_type"), "approval_matrices", ["workflow_type"], unique=False)

    op.create_table(
        "access_requests",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("requester_user_id", sa.Uuid(), nullable=False),
        sa.Column("requested_permission", sa.String(length=120), nullable=False),
        sa.Column("requested_scope_type", sa.String(length=40), nullable=False),
        sa.Column("geography_id", sa.String(length=120), nullable=True),
        sa.Column("project_id", sa.String(length=36), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("reviewed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["requester_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_access_requests_organization_id"), "access_requests", ["organization_id"], unique=False)
    op.create_index(op.f("ix_access_requests_status"), "access_requests", ["status"], unique=False)

    op.create_table(
        "clearance_levels",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("label", sa.String(length=160), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("allowed_data_classes", sa.JSON(), nullable=False),
        sa.Column("requires_mfa", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "code"),
    )
    op.create_index(op.f("ix_clearance_levels_organization_id"), "clearance_levels", ["organization_id"], unique=False)
    op.create_index(op.f("ix_clearance_levels_rank"), "clearance_levels", ["rank"], unique=False)

    op.create_table(
        "operational_zones",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("zone_type", sa.String(length=80), nullable=False),
        sa.Column("parent_zone_id", sa.Uuid(), nullable=True),
        sa.Column("geography_id", sa.String(length=120), nullable=True),
        sa.Column("boundary_json", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["parent_zone_id"], ["operational_zones.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "code"),
    )
    op.create_index(op.f("ix_operational_zones_organization_id"), "operational_zones", ["organization_id"], unique=False)
    op.create_index(op.f("ix_operational_zones_geography_id"), "operational_zones", ["geography_id"], unique=False)

    op.create_table(
        "session_logs",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("device_id", sa.String(length=160), nullable=True),
        sa.Column("ip_address", sa.String(length=80), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("location_hint", sa.String(length=160), nullable=True),
        sa.Column("risk_score", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_session_logs_organization_id"), "session_logs", ["organization_id"], unique=False)
    op.create_index(op.f("ix_session_logs_user_id"), "session_logs", ["user_id"], unique=False)
    op.create_index(op.f("ix_session_logs_status"), "session_logs", ["status"], unique=False)

    op.create_table(
        "device_registry",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("device_id", sa.String(length=160), nullable=False),
        sa.Column("device_type", sa.String(length=80), nullable=False),
        sa.Column("label", sa.String(length=180), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "device_id"),
    )
    op.create_index(op.f("ix_device_registry_organization_id"), "device_registry", ["organization_id"], unique=False)
    op.create_index(op.f("ix_device_registry_user_id"), "device_registry", ["user_id"], unique=False)
    op.create_index(op.f("ix_device_registry_status"), "device_registry", ["status"], unique=False)


def downgrade() -> None:
    op.drop_table("device_registry")
    op.drop_table("session_logs")
    op.drop_table("operational_zones")
    op.drop_table("clearance_levels")
    op.drop_table("access_requests")
    op.drop_table("approval_matrices")
    op.drop_table("access_delegations")
    op.drop_table("workforce_profiles")
    op.drop_table("operational_teams")
    op.drop_table("departments")
