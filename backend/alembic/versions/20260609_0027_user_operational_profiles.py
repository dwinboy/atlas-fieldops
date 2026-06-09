"""Add generic operational user profiles.

Revision ID: 20260609_0027
Revises: 20260609_0026
Create Date: 2026-06-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260609_0027"
down_revision: str | None = "20260609_0026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_operational_profiles",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("profile_type", sa.String(length=80), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("supervisor_user_id", sa.Uuid(), nullable=True),
        sa.Column("primary_project_id", sa.String(length=36), nullable=True),
        sa.Column("primary_geography_id", sa.String(length=120), nullable=True),
        sa.Column("primary_team_id", sa.Uuid(), nullable=True),
        sa.Column("responsibilities_json", sa.JSON(), nullable=False),
        sa.Column("metrics_json", sa.JSON(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["primary_team_id"], ["organizational_units.id"]),
        sa.ForeignKeyConstraint(["supervisor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "user_id", "profile_type"),
    )
    op.create_index(op.f("ix_user_operational_profiles_organization_id"), "user_operational_profiles", ["organization_id"], unique=False)
    op.create_index(op.f("ix_user_operational_profiles_user_id"), "user_operational_profiles", ["user_id"], unique=False)
    op.create_index(op.f("ix_user_operational_profiles_profile_type"), "user_operational_profiles", ["profile_type"], unique=False)
    op.create_index(op.f("ix_user_operational_profiles_status"), "user_operational_profiles", ["status"], unique=False)
    op.create_index(op.f("ix_user_operational_profiles_supervisor_user_id"), "user_operational_profiles", ["supervisor_user_id"], unique=False)
    op.create_index(op.f("ix_user_operational_profiles_primary_project_id"), "user_operational_profiles", ["primary_project_id"], unique=False)
    op.create_index(op.f("ix_user_operational_profiles_primary_geography_id"), "user_operational_profiles", ["primary_geography_id"], unique=False)
    op.create_index(op.f("ix_user_operational_profiles_primary_team_id"), "user_operational_profiles", ["primary_team_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_operational_profiles_primary_team_id"), table_name="user_operational_profiles")
    op.drop_index(op.f("ix_user_operational_profiles_primary_geography_id"), table_name="user_operational_profiles")
    op.drop_index(op.f("ix_user_operational_profiles_primary_project_id"), table_name="user_operational_profiles")
    op.drop_index(op.f("ix_user_operational_profiles_supervisor_user_id"), table_name="user_operational_profiles")
    op.drop_index(op.f("ix_user_operational_profiles_status"), table_name="user_operational_profiles")
    op.drop_index(op.f("ix_user_operational_profiles_profile_type"), table_name="user_operational_profiles")
    op.drop_index(op.f("ix_user_operational_profiles_user_id"), table_name="user_operational_profiles")
    op.drop_index(op.f("ix_user_operational_profiles_organization_id"), table_name="user_operational_profiles")
    op.drop_table("user_operational_profiles")
