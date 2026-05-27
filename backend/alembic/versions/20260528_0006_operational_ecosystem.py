"""Add operational ecosystem event graph.

Revision ID: 20260528_0006
Revises: 20260528_0005
Create Date: 2026-05-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260528_0006"
down_revision: str | None = "20260528_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def json_type() -> sa.JSON:
    return sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "operational_events",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("beneficiary_id", sa.Uuid(), nullable=True),
        sa.Column("submission_id", sa.Uuid(), nullable=True),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("source_module", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("priority", sa.String(length=40), nullable=False),
        sa.Column("summary", sa.String(length=320), nullable=False),
        sa.Column("payload_json", json_type(), nullable=False),
        sa.Column("effects_json", json_type(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["beneficiary_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("organization_id", "project_id", "beneficiary_id", "submission_id", "actor_user_id", "event_type", "source_module", "status", "priority"):
        op.create_index(op.f(f"ix_operational_events_{column}"), "operational_events", [column], unique=False)

    op.create_table(
        "operational_links",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("source_type", sa.String(length=80), nullable=False),
        sa.Column("source_id", sa.String(length=160), nullable=False),
        sa.Column("target_type", sa.String(length=80), nullable=False),
        sa.Column("target_id", sa.String(length=160), nullable=False),
        sa.Column("relationship_type", sa.String(length=100), nullable=False),
        sa.Column("strength", sa.Float(), nullable=False),
        sa.Column("metadata_json", json_type(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "source_type", "source_id", "target_type", "target_id", "relationship_type"),
    )
    for column in ("organization_id", "project_id", "source_type", "source_id", "target_type", "target_id", "relationship_type"):
        op.create_index(op.f(f"ix_operational_links_{column}"), "operational_links", [column], unique=False)

    op.create_table(
        "workflow_queue_items",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("beneficiary_id", sa.Uuid(), nullable=True),
        sa.Column("submission_id", sa.Uuid(), nullable=True),
        sa.Column("assigned_to_user_id", sa.Uuid(), nullable=True),
        sa.Column("queue_type", sa.String(length=80), nullable=False),
        sa.Column("trigger_event_type", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("priority", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("next_action", sa.String(length=240), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("context_json", json_type(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assigned_to_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["beneficiary_id"], ["beneficiaries.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("organization_id", "project_id", "beneficiary_id", "submission_id", "assigned_to_user_id", "queue_type", "trigger_event_type", "status", "priority"):
        op.create_index(op.f(f"ix_workflow_queue_items_{column}"), "workflow_queue_items", [column], unique=False)


def downgrade() -> None:
    for column in ("priority", "status", "trigger_event_type", "queue_type", "assigned_to_user_id", "submission_id", "beneficiary_id", "project_id", "organization_id"):
        op.drop_index(op.f(f"ix_workflow_queue_items_{column}"), table_name="workflow_queue_items")
    op.drop_table("workflow_queue_items")

    for column in ("relationship_type", "target_id", "target_type", "source_id", "source_type", "project_id", "organization_id"):
        op.drop_index(op.f(f"ix_operational_links_{column}"), table_name="operational_links")
    op.drop_table("operational_links")

    for column in ("priority", "status", "source_module", "event_type", "actor_user_id", "submission_id", "beneficiary_id", "project_id", "organization_id"):
        op.drop_index(op.f(f"ix_operational_events_{column}"), table_name="operational_events")
    op.drop_table("operational_events")
