"""Add stored_files for server-held export artifacts and media bytes

Revision ID: 20260626_0042
Revises: 20260626_0041
Create Date: 2026-06-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260626_0042"
down_revision: str | None = "20260626_0041"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "stored_files",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("reference_type", sa.String(length=60), nullable=True),
        sa.Column("reference_id", sa.String(length=180), nullable=True),
        sa.Column("file_name", sa.String(length=240), nullable=False),
        sa.Column("media_type", sa.String(length=160), server_default="application/octet-stream", nullable=False),
        sa.Column("size_bytes", sa.Integer(), server_default="0", nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stored_files_organization_id"), "stored_files", ["organization_id"], unique=False)
    op.create_index(op.f("ix_stored_files_kind"), "stored_files", ["kind"], unique=False)
    op.create_index(op.f("ix_stored_files_reference_type"), "stored_files", ["reference_type"], unique=False)
    op.create_index(op.f("ix_stored_files_reference_id"), "stored_files", ["reference_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_stored_files_reference_id"), table_name="stored_files")
    op.drop_index(op.f("ix_stored_files_reference_type"), table_name="stored_files")
    op.drop_index(op.f("ix_stored_files_kind"), table_name="stored_files")
    op.drop_index(op.f("ix_stored_files_organization_id"), table_name="stored_files")
    op.drop_table("stored_files")
