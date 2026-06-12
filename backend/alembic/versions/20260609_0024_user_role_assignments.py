"""Add stacked user role assignments.

Revision ID: 20260609_0024
Revises: 20260608_0023
Create Date: 2026-06-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260609_0024"
down_revision: str | None = "20260608_0023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def audit_cols() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    ]


def upgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.create_table(
        "user_role_assignments",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("scope_type", sa.String(40), nullable=False),
        sa.Column("geography_id", sa.String(120), nullable=True),
        sa.Column("project_id", sa.String(36), nullable=True),
        sa.Column("organization_unit_id", sa.Uuid(), nullable=True),
        sa.Column("team_id", sa.Uuid(), nullable=True),
        sa.Column("assigned_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("reason", sa.String(500), nullable=True),
        *audit_cols(),
        sa.ForeignKeyConstraint(["assigned_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["organization_unit_id"], ["organizational_units.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["organizational_units.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_role_assignments_organization_id"), "user_role_assignments", ["organization_id"], unique=False)
    op.create_index(op.f("ix_user_role_assignments_user_id"), "user_role_assignments", ["user_id"], unique=False)
    op.create_index(op.f("ix_user_role_assignments_role_id"), "user_role_assignments", ["role_id"], unique=False)
    op.create_index(op.f("ix_user_role_assignments_geography_id"), "user_role_assignments", ["geography_id"], unique=False)
    op.create_index(op.f("ix_user_role_assignments_project_id"), "user_role_assignments", ["project_id"], unique=False)
    op.create_index(op.f("ix_user_role_assignments_organization_unit_id"), "user_role_assignments", ["organization_unit_id"], unique=False)
    op.create_index(op.f("ix_user_role_assignments_team_id"), "user_role_assignments", ["team_id"], unique=False)
    op.create_index(op.f("ix_user_role_assignments_assigned_by_user_id"), "user_role_assignments", ["assigned_by_user_id"], unique=False)

    op.execute(
        """
        INSERT INTO user_role_assignments (
            id,
            organization_id,
            user_id,
            role_id,
            scope_type,
            geography_id,
            project_id,
            organization_unit_id,
            assigned_by_user_id,
            starts_at,
            expires_at,
            is_active,
            reason,
            deleted_at,
            created_at,
            updated_at
        )
        SELECT
            gen_random_uuid(),
            memberships.organization_id,
            memberships.user_id,
            memberships.role_id,
            COALESCE(user_access_grants.scope_type, roles.scope_type, 'own'),
            user_access_grants.geography_id,
            user_access_grants.project_id,
            user_access_grants.organization_unit_id,
            NULL,
            NULL,
            NULL,
            memberships.is_active,
            'Backfilled from primary membership role',
            memberships.deleted_at,
            memberships.created_at,
            memberships.updated_at
        FROM memberships
        JOIN roles ON roles.id = memberships.role_id
        LEFT JOIN user_access_grants
            ON user_access_grants.organization_id = memberships.organization_id
            AND user_access_grants.user_id = memberships.user_id
            AND user_access_grants.deleted_at IS NULL
        WHERE memberships.deleted_at IS NULL
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_user_role_assignments_assigned_by_user_id"), table_name="user_role_assignments")
    op.drop_index(op.f("ix_user_role_assignments_team_id"), table_name="user_role_assignments")
    op.drop_index(op.f("ix_user_role_assignments_organization_unit_id"), table_name="user_role_assignments")
    op.drop_index(op.f("ix_user_role_assignments_project_id"), table_name="user_role_assignments")
    op.drop_index(op.f("ix_user_role_assignments_geography_id"), table_name="user_role_assignments")
    op.drop_index(op.f("ix_user_role_assignments_role_id"), table_name="user_role_assignments")
    op.drop_index(op.f("ix_user_role_assignments_user_id"), table_name="user_role_assignments")
    op.drop_index(op.f("ix_user_role_assignments_organization_id"), table_name="user_role_assignments")
    op.drop_table("user_role_assignments")
