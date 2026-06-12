"""Link operational targets to monitoring indicators

Revision ID: 20260613_0035
Revises: 20260612_0034
Create Date: 2026-06-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260613_0035"
down_revision: str | None = "20260612_0034"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "operational_targets",
        sa.Column("indicator_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_operational_targets_indicator_id",
        "operational_targets",
        "monitoring_indicators",
        ["indicator_id"],
        ["id"],
    )
    op.create_index(
        "ix_operational_targets_indicator_id",
        "operational_targets",
        ["indicator_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_operational_targets_indicator_id", table_name="operational_targets")
    op.drop_constraint(
        "fk_operational_targets_indicator_id",
        "operational_targets",
        type_="foreignkey",
    )
    op.drop_column("operational_targets", "indicator_id")
