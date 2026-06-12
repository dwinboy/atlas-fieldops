"""Indicator categories/disaggregation and donor report metrics

Revision ID: 20260612_0030
Revises: 20260610_0029
Create Date: 2026-06-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260612_0030"
down_revision: str | None = "20260610_0029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("monitoring_indicators", sa.Column("category", sa.String(length=60), nullable=True))
    op.add_column(
        "monitoring_indicators",
        sa.Column(
            "disaggregation_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
    )

    op.add_column(
        "donor_reports",
        sa.Column(
            "metrics_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
    )
    op.add_column("donor_reports", sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("donor_reports", "generated_at")
    op.drop_column("donor_reports", "metrics_json")

    op.drop_column("monitoring_indicators", "disaggregation_json")
    op.drop_column("monitoring_indicators", "category")
