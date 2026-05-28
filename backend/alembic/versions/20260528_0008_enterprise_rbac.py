"""Add enterprise RBAC scope metadata.

Revision ID: 20260528_0008
Revises: 20260528_0007
Create Date: 2026-05-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260528_0008"
down_revision: str | None = "20260528_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def audit_cols() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    op.add_column("roles", sa.Column("label", sa.String(160), nullable=False, server_default=""))
    op.add_column("roles", sa.Column("description", sa.String(500), nullable=False, server_default=""))
    op.add_column("roles", sa.Column("scope_type", sa.String(40), nullable=False, server_default="organization"))
    op.add_column("roles", sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_table(
        "user_access_grants",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("scope_type", sa.String(40), nullable=False),
        sa.Column("geography_id", sa.String(120), nullable=True),
        sa.Column("project_id", sa.String(36), nullable=True),
        sa.Column("organization_unit_id", sa.Uuid(), nullable=True),
        *audit_cols(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["organization_unit_id"], ["organizational_units.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "workflow_permissions",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("workflow_type", sa.String(80), nullable=False),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("required_scope_type", sa.String(40), nullable=False),
        sa.Column("conditions_json", sa.Text(), nullable=False),
        *audit_cols(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for table in ("user_access_grants", "workflow_permissions"):
        op.create_index(op.f(f"ix_{table}_organization_id"), table, ["organization_id"], unique=False)
    op.create_index(op.f("ix_user_access_grants_user_id"), "user_access_grants", ["user_id"], unique=False)
    op.create_index(op.f("ix_user_access_grants_geography_id"), "user_access_grants", ["geography_id"], unique=False)
    op.create_index(op.f("ix_user_access_grants_project_id"), "user_access_grants", ["project_id"], unique=False)
    op.create_index(op.f("ix_user_access_grants_organization_unit_id"), "user_access_grants", ["organization_unit_id"], unique=False)
    op.create_index(op.f("ix_workflow_permissions_role_id"), "workflow_permissions", ["role_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_workflow_permissions_role_id"), table_name="workflow_permissions")
    op.drop_index(op.f("ix_user_access_grants_organization_unit_id"), table_name="user_access_grants")
    op.drop_index(op.f("ix_user_access_grants_project_id"), table_name="user_access_grants")
    op.drop_index(op.f("ix_user_access_grants_geography_id"), table_name="user_access_grants")
    op.drop_index(op.f("ix_user_access_grants_user_id"), table_name="user_access_grants")
    op.drop_index(op.f("ix_workflow_permissions_organization_id"), table_name="workflow_permissions")
    op.drop_index(op.f("ix_user_access_grants_organization_id"), table_name="user_access_grants")
    op.drop_table("workflow_permissions")
    op.drop_table("user_access_grants")
    op.drop_column("roles", "is_system")
    op.drop_column("roles", "scope_type")
    op.drop_column("roles", "description")
    op.drop_column("roles", "label")
