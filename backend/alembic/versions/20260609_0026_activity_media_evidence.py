"""Link media evidence to operational activities.

Revision ID: 20260609_0026
Revises: 20260609_0025
Create Date: 2026-06-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260609_0026"
down_revision: str | None = "20260609_0025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("media_evidence", sa.Column("activity_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_media_evidence_activity_id_field_visit_requests",
        "media_evidence",
        "field_visit_requests",
        ["activity_id"],
        ["id"],
    )
    op.create_index(op.f("ix_media_evidence_activity_id"), "media_evidence", ["activity_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_media_evidence_activity_id"), table_name="media_evidence")
    op.drop_constraint("fk_media_evidence_activity_id_field_visit_requests", "media_evidence", type_="foreignkey")
    op.drop_column("media_evidence", "activity_id")
