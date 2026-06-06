"""link officer assignments to forms

Revision ID: 20260606_0019
Revises: 20260606_0018
Create Date: 2026-06-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260606_0019"
down_revision: str | None = "20260606_0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("officer_assignments", sa.Column("form_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_officer_assignments_form_id_data_forms", "officer_assignments", "data_forms", ["form_id"], ["id"])
    op.create_index("ix_officer_assignments_form_id", "officer_assignments", ["form_id"])


def downgrade() -> None:
    op.drop_index("ix_officer_assignments_form_id", table_name="officer_assignments")
    op.drop_constraint("fk_officer_assignments_form_id_data_forms", "officer_assignments", type_="foreignkey")
    op.drop_column("officer_assignments", "form_id")
