"""Add persisted imported data rows.

Revision ID: 20260528_0009
Revises: 20260528_0008
Create Date: 2026-05-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260528_0009"
down_revision: str | None = "20260528_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamp_cols() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def json_type() -> sa.TypeEngine[object]:
    return sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "data_import_rows",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("import_job_id", sa.Uuid(), nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("row_data_json", json_type(), nullable=False),
        sa.Column("edited_data_json", json_type(), nullable=False),
        sa.Column("validation_status", sa.String(40), nullable=False),
        sa.Column("issue_count", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        *timestamp_cols(),
        sa.ForeignKeyConstraint(["import_job_id"], ["data_import_jobs.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("import_job_id", "row_number"),
    )
    op.create_index(op.f("ix_data_import_rows_organization_id"), "data_import_rows", ["organization_id"], unique=False)
    op.create_index(op.f("ix_data_import_rows_import_job_id"), "data_import_rows", ["import_job_id"], unique=False)
    op.create_index(op.f("ix_data_import_rows_validation_status"), "data_import_rows", ["validation_status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_data_import_rows_validation_status"), table_name="data_import_rows")
    op.drop_index(op.f("ix_data_import_rows_import_job_id"), table_name="data_import_rows")
    op.drop_index(op.f("ix_data_import_rows_organization_id"), table_name="data_import_rows")
    op.drop_table("data_import_rows")
