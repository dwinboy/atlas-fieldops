"""survey centric architecture

Revision ID: 20260604_0013
Revises: 20260601_0012
Create Date: 2026-06-04 18:20:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260604_0013"
down_revision: str | None = "20260601_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_column() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False)


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def soft_delete() -> sa.Column:
    return sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)


def upgrade() -> None:
    op.create_table(
        "surveys",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("manager_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("code", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("survey_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="draft", nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("geographic_scope", sa.String(length=240), nullable=True),
        sa.Column("target_population", sa.String(length=240), nullable=True),
        sa.Column("indicator_ids_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("governance_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("custom_type_label", sa.String(length=120), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["manager_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "code"),
    )
    op.create_index("ix_surveys_organization_id", "surveys", ["organization_id"])
    op.create_index("ix_surveys_project_id", "surveys", ["project_id"])
    op.create_index("ix_surveys_created_by_user_id", "surveys", ["created_by_user_id"])
    op.create_index("ix_surveys_owner_user_id", "surveys", ["owner_user_id"])
    op.create_index("ix_surveys_manager_user_id", "surveys", ["manager_user_id"])
    op.create_index("ix_surveys_survey_type", "surveys", ["survey_type"])
    op.create_index("ix_surveys_status", "surveys", ["status"])

    op.create_table(
        "survey_team_members",
        uuid_column(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("survey_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("survey_role", sa.String(length=80), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        soft_delete(),
        *timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["survey_id"], ["surveys.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "survey_id", "user_id", "survey_role"),
    )
    op.create_index("ix_survey_team_members_organization_id", "survey_team_members", ["organization_id"])
    op.create_index("ix_survey_team_members_survey_id", "survey_team_members", ["survey_id"])
    op.create_index("ix_survey_team_members_user_id", "survey_team_members", ["user_id"])
    op.create_index("ix_survey_team_members_survey_role", "survey_team_members", ["survey_role"])

    op.add_column("data_forms", sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("data_forms", sa.Column("survey_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_data_forms_project_id_projects", "data_forms", "projects", ["project_id"], ["id"])
    op.create_foreign_key("fk_data_forms_survey_id_surveys", "data_forms", "surveys", ["survey_id"], ["id"])
    op.create_index("ix_data_forms_project_id", "data_forms", ["project_id"])
    op.create_index("ix_data_forms_survey_id", "data_forms", ["survey_id"])
    op.execute(
        "ALTER TABLE data_forms ADD CONSTRAINT ck_data_forms_survey_context_required "
        "CHECK (project_id IS NOT NULL AND survey_id IS NOT NULL) NOT VALID"
    )

    op.add_column("submissions", sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("submissions", sa.Column("survey_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_submissions_project_id_projects", "submissions", "projects", ["project_id"], ["id"])
    op.create_foreign_key("fk_submissions_survey_id_surveys", "submissions", "surveys", ["survey_id"], ["id"])
    op.create_index("ix_submissions_project_id", "submissions", ["project_id"])
    op.create_index("ix_submissions_survey_id", "submissions", ["survey_id"])
    op.execute(
        "ALTER TABLE submissions ADD CONSTRAINT ck_submissions_survey_context_required "
        "CHECK (project_id IS NOT NULL AND survey_id IS NOT NULL) NOT VALID"
    )

    op.add_column("monitoring_indicators", sa.Column("survey_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_monitoring_indicators_survey_id_surveys", "monitoring_indicators", "surveys", ["survey_id"], ["id"])
    op.create_index("ix_monitoring_indicators_survey_id", "monitoring_indicators", ["survey_id"])

    op.add_column("donor_reports", sa.Column("survey_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_donor_reports_survey_id_surveys", "donor_reports", "surveys", ["survey_id"], ["id"])
    op.create_index("ix_donor_reports_survey_id", "donor_reports", ["survey_id"])


def downgrade() -> None:
    op.drop_index("ix_donor_reports_survey_id", table_name="donor_reports")
    op.drop_constraint("fk_donor_reports_survey_id_surveys", "donor_reports", type_="foreignkey")
    op.drop_column("donor_reports", "survey_id")

    op.drop_index("ix_monitoring_indicators_survey_id", table_name="monitoring_indicators")
    op.drop_constraint("fk_monitoring_indicators_survey_id_surveys", "monitoring_indicators", type_="foreignkey")
    op.drop_column("monitoring_indicators", "survey_id")

    op.drop_index("ix_submissions_survey_id", table_name="submissions")
    op.drop_index("ix_submissions_project_id", table_name="submissions")
    op.drop_constraint("ck_submissions_survey_context_required", "submissions", type_="check")
    op.drop_constraint("fk_submissions_survey_id_surveys", "submissions", type_="foreignkey")
    op.drop_constraint("fk_submissions_project_id_projects", "submissions", type_="foreignkey")
    op.drop_column("submissions", "survey_id")
    op.drop_column("submissions", "project_id")

    op.drop_index("ix_data_forms_survey_id", table_name="data_forms")
    op.drop_index("ix_data_forms_project_id", table_name="data_forms")
    op.drop_constraint("ck_data_forms_survey_context_required", "data_forms", type_="check")
    op.drop_constraint("fk_data_forms_survey_id_surveys", "data_forms", type_="foreignkey")
    op.drop_constraint("fk_data_forms_project_id_projects", "data_forms", type_="foreignkey")
    op.drop_column("data_forms", "survey_id")
    op.drop_column("data_forms", "project_id")

    op.drop_table("survey_team_members")
    op.drop_table("surveys")
