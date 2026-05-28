"""Add enterprise operations management tables.

Revision ID: 20260528_0007
Revises: 20260528_0006
Create Date: 2026-05-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260528_0007"
down_revision: str | None = "20260528_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def json_type() -> sa.JSON:
    return sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def audit_cols() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "organizational_units",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("parent_unit_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("code", sa.String(80), nullable=False),
        sa.Column("unit_type", sa.String(80), nullable=False),
        sa.Column("region", sa.String(160), nullable=True),
        sa.Column("manager_user_id", sa.Uuid(), nullable=True),
        sa.Column("metadata_json", json_type(), nullable=False),
        *audit_cols(),
        sa.ForeignKeyConstraint(["manager_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["parent_unit_id"], ["organizational_units.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "code"),
    )
    op.create_table(
        "workflow_definitions",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(180), nullable=False),
        sa.Column("workflow_type", sa.String(80), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("steps_json", json_type(), nullable=False),
        sa.Column("sla_hours", sa.Integer(), nullable=False),
        *audit_cols(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "name", "version"),
    )
    op.create_table(
        "operational_tasks",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("beneficiary_id", sa.Uuid(), nullable=True),
        sa.Column("assigned_to_user_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("task_type", sa.String(80), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("priority", sa.String(40), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("context_json", json_type(), nullable=False),
        *audit_cols(),
        sa.ForeignKeyConstraint(["assigned_to_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["beneficiary_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "intervention_records",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("beneficiary_id", sa.Uuid(), nullable=True),
        sa.Column("task_id", sa.Uuid(), nullable=True),
        sa.Column("intervention_type", sa.String(100), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("planned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("value_amount", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        *audit_cols(),
        sa.ForeignKeyConstraint(["beneficiary_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["operational_tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "operational_assets",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("assigned_to_user_id", sa.Uuid(), nullable=True),
        sa.Column("asset_code", sa.String(100), nullable=False),
        sa.Column("asset_type", sa.String(80), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("region", sa.String(160), nullable=True),
        sa.Column("metadata_json", json_type(), nullable=False),
        *audit_cols(),
        sa.ForeignKeyConstraint(["assigned_to_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "asset_code"),
    )
    op.create_table(
        "project_budget_lines",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("category", sa.String(120), nullable=False),
        sa.Column("allocated_amount", sa.Float(), nullable=False),
        sa.Column("spent_amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(12), nullable=False),
        sa.Column("reporting_code", sa.String(80), nullable=True),
        *audit_cols(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "knowledge_documents",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("beneficiary_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("document_type", sa.String(80), nullable=False),
        sa.Column("storage_url", sa.String(500), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("metadata_json", json_type(), nullable=False),
        *audit_cols(),
        sa.ForeignKeyConstraint(["beneficiary_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for table in (
        "organizational_units",
        "workflow_definitions",
        "operational_tasks",
        "intervention_records",
        "operational_assets",
        "project_budget_lines",
        "knowledge_documents",
    ):
        op.create_index(op.f(f"ix_{table}_organization_id"), table, ["organization_id"], unique=False)
        if table != "organizational_units":
            op.create_index(op.f(f"ix_{table}_project_id"), table, ["project_id"], unique=False)


def downgrade() -> None:
    for table in (
        "knowledge_documents",
        "project_budget_lines",
        "operational_assets",
        "intervention_records",
        "operational_tasks",
        "workflow_definitions",
    ):
        op.drop_index(op.f(f"ix_{table}_project_id"), table_name=table)
        op.drop_index(op.f(f"ix_{table}_organization_id"), table_name=table)
        op.drop_table(table)
    op.drop_index(op.f("ix_organizational_units_organization_id"), table_name="organizational_units")
    op.drop_table("organizational_units")
