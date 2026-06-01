"""Add public collection links and media evidence.

Revision ID: 20260601_0012
Revises: 20260529_0011
Create Date: 2026-06-01 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260601_0012"
down_revision: str | None = "20260529_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "public_collection_links",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("form_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("access_mode", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("require_authentication", sa.Boolean(), nullable=False),
        sa.Column("allow_offline_web", sa.Boolean(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("allowed_domains", sa.JSON(), nullable=False),
        sa.Column("permission_json", sa.JSON(), nullable=False),
        sa.Column("submission_count", sa.Integer(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["form_id"], ["data_forms.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "slug"),
    )
    op.create_index(op.f("ix_public_collection_links_organization_id"), "public_collection_links", ["organization_id"], unique=False)
    op.create_index(op.f("ix_public_collection_links_form_id"), "public_collection_links", ["form_id"], unique=False)
    op.create_index(op.f("ix_public_collection_links_created_by_user_id"), "public_collection_links", ["created_by_user_id"], unique=False)
    op.create_index(op.f("ix_public_collection_links_access_mode"), "public_collection_links", ["access_mode"], unique=False)
    op.create_index(op.f("ix_public_collection_links_status"), "public_collection_links", ["status"], unique=False)

    op.create_table(
        "media_evidence",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("submission_id", sa.Uuid(), nullable=True),
        sa.Column("beneficiary_id", sa.Uuid(), nullable=True),
        sa.Column("form_id", sa.Uuid(), nullable=True),
        sa.Column("uploaded_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("media_type", sa.String(length=40), nullable=False),
        sa.Column("file_name", sa.String(length=240), nullable=False),
        sa.Column("storage_url", sa.String(length=500), nullable=False),
        sa.Column("mime_type", sa.String(length=120), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("review_status", sa.String(length=40), nullable=False),
        sa.Column("checksum", sa.String(length=160), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["beneficiary_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["form_id"], ["data_forms.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_media_evidence_organization_id"), "media_evidence", ["organization_id"], unique=False)
    op.create_index(op.f("ix_media_evidence_submission_id"), "media_evidence", ["submission_id"], unique=False)
    op.create_index(op.f("ix_media_evidence_beneficiary_id"), "media_evidence", ["beneficiary_id"], unique=False)
    op.create_index(op.f("ix_media_evidence_form_id"), "media_evidence", ["form_id"], unique=False)
    op.create_index(op.f("ix_media_evidence_uploaded_by_user_id"), "media_evidence", ["uploaded_by_user_id"], unique=False)
    op.create_index(op.f("ix_media_evidence_media_type"), "media_evidence", ["media_type"], unique=False)
    op.create_index(op.f("ix_media_evidence_review_status"), "media_evidence", ["review_status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_media_evidence_review_status"), table_name="media_evidence")
    op.drop_index(op.f("ix_media_evidence_media_type"), table_name="media_evidence")
    op.drop_index(op.f("ix_media_evidence_uploaded_by_user_id"), table_name="media_evidence")
    op.drop_index(op.f("ix_media_evidence_form_id"), table_name="media_evidence")
    op.drop_index(op.f("ix_media_evidence_beneficiary_id"), table_name="media_evidence")
    op.drop_index(op.f("ix_media_evidence_submission_id"), table_name="media_evidence")
    op.drop_index(op.f("ix_media_evidence_organization_id"), table_name="media_evidence")
    op.drop_table("media_evidence")
    op.drop_index(op.f("ix_public_collection_links_status"), table_name="public_collection_links")
    op.drop_index(op.f("ix_public_collection_links_access_mode"), table_name="public_collection_links")
    op.drop_index(op.f("ix_public_collection_links_created_by_user_id"), table_name="public_collection_links")
    op.drop_index(op.f("ix_public_collection_links_form_id"), table_name="public_collection_links")
    op.drop_index(op.f("ix_public_collection_links_organization_id"), table_name="public_collection_links")
    op.drop_table("public_collection_links")
