"""Add form-scoped dataset columns to platform reference lists

Revision ID: 20260627_0043
Revises: 20260626_0042
Create Date: 2026-06-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "20260627_0043"
down_revision: str | None = "20260626_0042"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

JsonType = sa.JSON().with_variant(JSONB, "postgresql")


def upgrade() -> None:
    op.add_column(
        "platform_reference_lists",
        sa.Column("scope", sa.String(length=20), server_default="global", nullable=False),
    )
    op.add_column(
        "platform_reference_lists",
        sa.Column("form_id", sa.Uuid(), nullable=True),
    )
    op.add_column(
        "platform_reference_lists",
        sa.Column("columns_json", JsonType, nullable=True),
    )
    op.create_index(
        op.f("ix_platform_reference_lists_scope"), "platform_reference_lists", ["scope"], unique=False
    )
    op.create_index(
        op.f("ix_platform_reference_lists_form_id"), "platform_reference_lists", ["form_id"], unique=False
    )
    op.create_foreign_key(
        "fk_platform_reference_lists_form_id_data_forms",
        "platform_reference_lists",
        "data_forms",
        ["form_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_platform_reference_lists_form_id_data_forms", "platform_reference_lists", type_="foreignkey"
    )
    op.drop_index(op.f("ix_platform_reference_lists_form_id"), table_name="platform_reference_lists")
    op.drop_index(op.f("ix_platform_reference_lists_scope"), table_name="platform_reference_lists")
    op.drop_column("platform_reference_lists", "columns_json")
    op.drop_column("platform_reference_lists", "form_id")
    op.drop_column("platform_reference_lists", "scope")
