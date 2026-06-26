"""Add form linkage to monitoring indicators

Revision ID: 20260626_0041
Revises: 20260625_0040
Create Date: 2026-06-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260626_0041"
down_revision: str | None = "20260625_0040"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("monitoring_indicators", sa.Column("form_id", sa.Uuid(), nullable=True))
    op.add_column("monitoring_indicators", sa.Column("linked_question", sa.String(length=160), nullable=True))
    op.create_index(
        op.f("ix_monitoring_indicators_form_id"),
        "monitoring_indicators",
        ["form_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_monitoring_indicators_form_id_data_forms",
        "monitoring_indicators",
        "data_forms",
        ["form_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_monitoring_indicators_form_id_data_forms",
        "monitoring_indicators",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_monitoring_indicators_form_id"), table_name="monitoring_indicators")
    op.drop_column("monitoring_indicators", "linked_question")
    op.drop_column("monitoring_indicators", "form_id")
