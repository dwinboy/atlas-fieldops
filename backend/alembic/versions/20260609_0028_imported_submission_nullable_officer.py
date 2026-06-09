"""Allow imported submissions without field officer attribution."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision: str = "20260609_0028"
down_revision: str | None = "20260609_0027"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    with op.batch_alter_table("submissions") as batch_op:
        batch_op.alter_column("field_officer_id", existing_type=sa.Uuid(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("submissions") as batch_op:
        batch_op.alter_column("field_officer_id", existing_type=sa.Uuid(), nullable=False)
