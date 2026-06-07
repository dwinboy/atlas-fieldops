"""project me architecture metadata

Revision ID: 20260607_0021
Revises: 20260606_0020
Create Date: 2026-06-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260607_0021"
down_revision: str | None = "20260606_0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("program_type", sa.String(length=120), nullable=True))
    op.add_column("projects", sa.Column("category", sa.String(length=120), nullable=True))
    op.add_column("projects", sa.Column("donor", sa.String(length=160), nullable=True))
    op.add_column("projects", sa.Column("implementing_organization", sa.String(length=200), nullable=True))
    op.add_column("projects", sa.Column("country", sa.String(length=120), nullable=True))
    op.add_column("projects", sa.Column("district", sa.String(length=160), nullable=True))
    op.add_column("projects", sa.Column("community", sa.String(length=180), nullable=True))
    op.add_column("projects", sa.Column("owner", sa.String(length=200), nullable=True))
    op.add_column("projects", sa.Column("status", sa.String(length=40), nullable=False, server_default="draft"))
    op.add_column("projects", sa.Column("start_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("projects", sa.Column("end_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("projects", sa.Column("settings_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))
    op.execute("UPDATE projects SET status = CASE WHEN is_active THEN 'active' ELSE 'closed' END")
    op.create_index("ix_projects_status", "projects", ["status"])


def downgrade() -> None:
    op.drop_index("ix_projects_status", table_name="projects")
    op.drop_column("projects", "settings_json")
    op.drop_column("projects", "end_date")
    op.drop_column("projects", "start_date")
    op.drop_column("projects", "status")
    op.drop_column("projects", "owner")
    op.drop_column("projects", "community")
    op.drop_column("projects", "district")
    op.drop_column("projects", "country")
    op.drop_column("projects", "implementing_organization")
    op.drop_column("projects", "donor")
    op.drop_column("projects", "category")
    op.drop_column("projects", "program_type")
    op.drop_column("projects", "description")
