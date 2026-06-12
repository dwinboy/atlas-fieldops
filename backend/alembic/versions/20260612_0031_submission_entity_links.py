"""Submission to beneficiary/entity links

Revision ID: 20260612_0031
Revises: 20260612_0030
Create Date: 2026-06-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260612_0031"
down_revision: str | None = "20260612_0030"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "submission_entity_links",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("submission_id", sa.Uuid(), nullable=False),
        sa.Column("beneficiary_id", sa.Uuid(), nullable=False),
        sa.Column("link_type", sa.String(length=60), nullable=False),
        sa.Column("source", sa.String(length=80), nullable=False),
        sa.Column("source_field", sa.String(length=160), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["beneficiary_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("submission_id", "beneficiary_id", "link_type"),
    )
    op.create_index("ix_submission_entity_links_beneficiary_id", "submission_entity_links", ["beneficiary_id"])
    op.create_index("ix_submission_entity_links_organization_id", "submission_entity_links", ["organization_id"])
    op.create_index("ix_submission_entity_links_project_id", "submission_entity_links", ["project_id"])
    op.create_index("ix_submission_entity_links_submission_id", "submission_entity_links", ["submission_id"])
    op.create_index("ix_submission_entity_links_link_type", "submission_entity_links", ["link_type"])


def downgrade() -> None:
    op.drop_index("ix_submission_entity_links_link_type", table_name="submission_entity_links")
    op.drop_index("ix_submission_entity_links_submission_id", table_name="submission_entity_links")
    op.drop_index("ix_submission_entity_links_project_id", table_name="submission_entity_links")
    op.drop_index("ix_submission_entity_links_organization_id", table_name="submission_entity_links")
    op.drop_index("ix_submission_entity_links_beneficiary_id", table_name="submission_entity_links")
    op.drop_table("submission_entity_links")
