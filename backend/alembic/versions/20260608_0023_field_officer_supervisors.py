"""add field officer supervisor relationship

Revision ID: 20260608_0023
Revises: 20260608_0022
Create Date: 2026-06-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260608_0023"
down_revision: str | None = "20260608_0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "field_officer_profiles",
        sa.Column("supervisor_user_id", sa.Uuid(), nullable=True),
    )
    op.create_index(
        "ix_field_officer_profiles_supervisor_user_id",
        "field_officer_profiles",
        ["supervisor_user_id"],
    )
    op.create_foreign_key(
        "fk_field_officer_profiles_supervisor_user_id_users",
        "field_officer_profiles",
        "users",
        ["supervisor_user_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_field_officer_profiles_supervisor_user_id_users",
        "field_officer_profiles",
        type_="foreignkey",
    )
    op.drop_index("ix_field_officer_profiles_supervisor_user_id", table_name="field_officer_profiles")
    op.drop_column("field_officer_profiles", "supervisor_user_id")
