"""SurveyCTO-style structure alignment

Revision ID: 20260610_0029
Revises: 20260609_0028
Create Date: 2026-06-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260610_0029"
down_revision: str | None = "20260609_0028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("submissions", sa.Column("reviewed_by_user_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("submissions", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("submissions", sa.Column("review_comments", sa.Text(), nullable=True))
    op.add_column("submissions", sa.Column("approved_by_user_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("submissions", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key("fk_submissions_reviewed_by_user_id_users", "submissions", "users", ["reviewed_by_user_id"], ["id"])
    op.create_foreign_key("fk_submissions_approved_by_user_id_users", "submissions", "users", ["approved_by_user_id"], ["id"])
    op.create_index("ix_submissions_reviewed_by_user_id", "submissions", ["reviewed_by_user_id"])
    op.create_index("ix_submissions_approved_by_user_id", "submissions", ["approved_by_user_id"])

    op.add_column("master_data_tables", sa.Column("order_index", sa.Integer(), server_default="0", nullable=False))
    op.add_column("master_data_tables", sa.Column("language", sa.String(length=10), server_default="en", nullable=False))

    op.add_column("data_forms", sa.Column("form_type", sa.String(length=40), nullable=True))

    op.add_column("data_form_versions", sa.Column("published_by_user_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_data_form_versions_published_by_user_id_users", "data_form_versions", "users", ["published_by_user_id"], ["id"]
    )
    op.create_index("ix_data_form_versions_published_by_user_id", "data_form_versions", ["published_by_user_id"])

    op.create_table(
        "submission_repeat_rows",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parent_submission_key", sa.String(length=160), nullable=False),
        sa.Column("field_id", sa.String(length=160), nullable=False),
        sa.Column("row_index", sa.Integer(), nullable=False),
        sa.Column("row_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_submission_repeat_rows_organization_id", "submission_repeat_rows", ["organization_id"])
    op.create_index("ix_submission_repeat_rows_submission_id", "submission_repeat_rows", ["submission_id"])
    op.create_index(
        "idx_submission_repeat_rows_org_submission_field",
        "submission_repeat_rows",
        ["organization_id", "submission_id", "field_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_submission_repeat_rows_org_submission_field", table_name="submission_repeat_rows")
    op.drop_index("ix_submission_repeat_rows_submission_id", table_name="submission_repeat_rows")
    op.drop_index("ix_submission_repeat_rows_organization_id", table_name="submission_repeat_rows")
    op.drop_table("submission_repeat_rows")

    op.drop_index("ix_data_form_versions_published_by_user_id", table_name="data_form_versions")
    op.drop_constraint("fk_data_form_versions_published_by_user_id_users", "data_form_versions", type_="foreignkey")
    op.drop_column("data_form_versions", "published_by_user_id")

    op.drop_column("data_forms", "form_type")

    op.drop_column("master_data_tables", "language")
    op.drop_column("master_data_tables", "order_index")

    op.drop_index("ix_submissions_approved_by_user_id", table_name="submissions")
    op.drop_index("ix_submissions_reviewed_by_user_id", table_name="submissions")
    op.drop_constraint("fk_submissions_approved_by_user_id_users", "submissions", type_="foreignkey")
    op.drop_constraint("fk_submissions_reviewed_by_user_id_users", "submissions", type_="foreignkey")
    op.drop_column("submissions", "approved_at")
    op.drop_column("submissions", "approved_by_user_id")
    op.drop_column("submissions", "review_comments")
    op.drop_column("submissions", "reviewed_at")
    op.drop_column("submissions", "reviewed_by_user_id")
