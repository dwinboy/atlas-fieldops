"""Add entity hierarchy relationships and category parents

Revision ID: 20260624_0039
Revises: 20260615_0038
Create Date: 2026-06-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260624_0039"
down_revision: str | None = "20260615_0038"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("entity_categories", sa.Column("parent_category_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_entity_categories_parent_category_id",
        "entity_categories",
        "entity_categories",
        ["parent_category_id"],
        ["id"],
    )
    op.create_index("ix_entity_categories_parent_category_id", "entity_categories", ["parent_category_id"])

    op.create_table(
        "entity_relationships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("parent_beneficiary_id", sa.Uuid(), nullable=False),
        sa.Column("child_beneficiary_id", sa.Uuid(), nullable=False),
        sa.Column("relationship_type", sa.String(length=80), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["parent_beneficiary_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["child_beneficiary_id"], ["beneficiaries.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "parent_beneficiary_id",
            "child_beneficiary_id",
            "relationship_type",
            name="uq_entity_relationships_unique_link",
        ),
    )
    op.create_index("ix_entity_relationships_organization_id", "entity_relationships", ["organization_id"])
    op.create_index("ix_entity_relationships_project_id", "entity_relationships", ["project_id"])
    op.create_index("ix_entity_relationships_parent_beneficiary_id", "entity_relationships", ["parent_beneficiary_id"])
    op.create_index("ix_entity_relationships_child_beneficiary_id", "entity_relationships", ["child_beneficiary_id"])
    op.create_index("ix_entity_relationships_relationship_type", "entity_relationships", ["relationship_type"])


def downgrade() -> None:
    op.drop_index("ix_entity_relationships_relationship_type", table_name="entity_relationships")
    op.drop_index("ix_entity_relationships_child_beneficiary_id", table_name="entity_relationships")
    op.drop_index("ix_entity_relationships_parent_beneficiary_id", table_name="entity_relationships")
    op.drop_index("ix_entity_relationships_project_id", table_name="entity_relationships")
    op.drop_index("ix_entity_relationships_organization_id", table_name="entity_relationships")
    op.drop_table("entity_relationships")

    op.drop_index("ix_entity_categories_parent_category_id", table_name="entity_categories")
    op.drop_constraint("fk_entity_categories_parent_category_id", "entity_categories", type_="foreignkey")
    op.drop_column("entity_categories", "parent_category_id")
