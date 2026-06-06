"""entity centric collection

Revision ID: 20260606_0017
Revises: 20260605_0016
Create Date: 2026-06-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260606_0017"
down_revision: str | None = "20260605_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("submissions", sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("submissions", sa.Column("entity_type", sa.String(length=80), nullable=True))
    op.add_column("submissions", sa.Column("assignment_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("submissions", sa.Column("supervisor_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("submissions", sa.Column("frequency_period", sa.String(length=80), nullable=True))
    op.add_column("submissions", sa.Column("event_id", sa.String(length=160), nullable=True))
    op.create_foreign_key("fk_submissions_entity_id_beneficiaries", "submissions", "beneficiaries", ["entity_id"], ["id"])
    op.create_foreign_key("fk_submissions_assignment_id_officer_assignments", "submissions", "officer_assignments", ["assignment_id"], ["id"])
    op.create_foreign_key("fk_submissions_supervisor_id_users", "submissions", "users", ["supervisor_id"], ["id"])
    op.create_index("ix_submissions_entity_id", "submissions", ["entity_id"])
    op.create_index("ix_submissions_entity_type", "submissions", ["entity_type"])
    op.create_index("ix_submissions_assignment_id", "submissions", ["assignment_id"])
    op.create_index("ix_submissions_supervisor_id", "submissions", ["supervisor_id"])
    op.create_index("ix_submissions_frequency_period", "submissions", ["frequency_period"])
    op.create_index("ix_submissions_event_id", "submissions", ["event_id"])


def downgrade() -> None:
    op.drop_index("ix_submissions_event_id", table_name="submissions")
    op.drop_index("ix_submissions_frequency_period", table_name="submissions")
    op.drop_index("ix_submissions_supervisor_id", table_name="submissions")
    op.drop_index("ix_submissions_assignment_id", table_name="submissions")
    op.drop_index("ix_submissions_entity_type", table_name="submissions")
    op.drop_index("ix_submissions_entity_id", table_name="submissions")
    op.drop_constraint("fk_submissions_supervisor_id_users", "submissions", type_="foreignkey")
    op.drop_constraint("fk_submissions_assignment_id_officer_assignments", "submissions", type_="foreignkey")
    op.drop_constraint("fk_submissions_entity_id_beneficiaries", "submissions", type_="foreignkey")
    op.drop_column("submissions", "event_id")
    op.drop_column("submissions", "frequency_period")
    op.drop_column("submissions", "supervisor_id")
    op.drop_column("submissions", "assignment_id")
    op.drop_column("submissions", "entity_type")
    op.drop_column("submissions", "entity_id")
