"""import migration continuity

Revision ID: 20260606_0018
Revises: 20260606_0017
Create Date: 2026-06-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260606_0018"
down_revision: str | None = "20260606_0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def add_source_tracking(table_name: str, *, include_project: bool = False, include_form: bool = False, include_submission: bool = False) -> None:
    op.add_column(table_name, sa.Column("is_imported", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column(table_name, sa.Column("source_system", sa.String(length=120), nullable=True))
    op.add_column(table_name, sa.Column("source_record_id", sa.String(length=180), nullable=True))
    if include_project:
        op.add_column(table_name, sa.Column("source_project_id", sa.String(length=180), nullable=True))
    if include_form:
        op.add_column(table_name, sa.Column("source_form_id", sa.String(length=180), nullable=True))
    if include_submission:
        op.add_column(table_name, sa.Column("source_submission_id", sa.String(length=180), nullable=True))
    op.add_column(table_name, sa.Column("import_batch_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column(table_name, sa.Column("imported_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(table_name, sa.Column("imported_by_user_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(f"fk_{table_name}_import_batch_id_data_import_jobs", table_name, "data_import_jobs", ["import_batch_id"], ["id"])
    op.create_foreign_key(f"fk_{table_name}_imported_by_user_id_users", table_name, "users", ["imported_by_user_id"], ["id"])
    op.create_index(f"ix_{table_name}_is_imported", table_name, ["is_imported"])
    op.create_index(f"ix_{table_name}_source_system", table_name, ["source_system"])
    op.create_index(f"ix_{table_name}_source_record_id", table_name, ["source_record_id"])
    op.create_index(f"ix_{table_name}_import_batch_id", table_name, ["import_batch_id"])
    op.create_index(f"ix_{table_name}_imported_by_user_id", table_name, ["imported_by_user_id"])


def drop_source_tracking(table_name: str, *, include_project: bool = False, include_form: bool = False, include_submission: bool = False) -> None:
    op.drop_index(f"ix_{table_name}_imported_by_user_id", table_name=table_name)
    op.drop_index(f"ix_{table_name}_import_batch_id", table_name=table_name)
    op.drop_index(f"ix_{table_name}_source_record_id", table_name=table_name)
    op.drop_index(f"ix_{table_name}_source_system", table_name=table_name)
    op.drop_index(f"ix_{table_name}_is_imported", table_name=table_name)
    op.drop_constraint(f"fk_{table_name}_imported_by_user_id_users", table_name, type_="foreignkey")
    op.drop_constraint(f"fk_{table_name}_import_batch_id_data_import_jobs", table_name, type_="foreignkey")
    op.drop_column(table_name, "imported_by_user_id")
    op.drop_column(table_name, "imported_at")
    op.drop_column(table_name, "import_batch_id")
    if include_submission:
        op.drop_column(table_name, "source_submission_id")
    if include_form:
        op.drop_column(table_name, "source_form_id")
    if include_project:
        op.drop_column(table_name, "source_project_id")
    op.drop_column(table_name, "source_record_id")
    op.drop_column(table_name, "source_system")
    op.drop_column(table_name, "is_imported")


def upgrade() -> None:
    op.add_column("data_import_jobs", sa.Column("target_project_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("data_import_jobs", sa.Column("target_mode", sa.String(length=80), nullable=True))
    op.add_column("data_import_jobs", sa.Column("source_system", sa.String(length=120), nullable=True))
    op.add_column("data_import_jobs", sa.Column("import_reason", sa.Text(), nullable=True))
    op.add_column("data_import_jobs", sa.Column("successful_records", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("data_import_jobs", sa.Column("failed_records", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("data_import_jobs", sa.Column("skipped_records", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("data_import_jobs", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("data_import_jobs", sa.Column("error_report_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))
    op.add_column("data_import_jobs", sa.Column("confirmation_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))
    op.create_foreign_key("fk_data_import_jobs_target_project_id_projects", "data_import_jobs", "projects", ["target_project_id"], ["id"])
    op.create_index("ix_data_import_jobs_target_project_id", "data_import_jobs", ["target_project_id"])
    op.create_index("ix_data_import_jobs_source_system", "data_import_jobs", ["source_system"])

    add_source_tracking("projects", include_project=True)
    add_source_tracking("beneficiaries", include_project=True)
    add_source_tracking("data_forms", include_project=True, include_form=True)
    add_source_tracking("data_form_versions", include_form=True)
    add_source_tracking("submissions", include_project=True, include_form=True, include_submission=True)
    add_source_tracking("monitoring_indicators", include_project=True)
    add_source_tracking("organizational_units")
    add_source_tracking("operational_teams")
    add_source_tracking("users")

    op.create_table(
        "legacy_record_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("import_job_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("source_system", sa.String(length=120), nullable=False),
        sa.Column("source_record_id", sa.String(length=180), nullable=False),
        sa.Column("source_project_id", sa.String(length=180), nullable=True),
        sa.Column("source_form_id", sa.String(length=180), nullable=True),
        sa.Column("source_submission_id", sa.String(length=180), nullable=True),
        sa.Column("target_type", sa.String(length=80), nullable=False),
        sa.Column("target_id", sa.String(length=180), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["import_job_id"], ["data_import_jobs.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "source_system", "source_record_id", "target_type"),
    )
    op.create_table(
        "import_rollback_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("import_job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("rolled_back_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skipped_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="completed"),
        sa.Column("details_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["import_job_id"], ["data_import_jobs.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "source_connectors",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connector_key", sa.String(length=80), nullable=False),
        sa.Column("label", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="placeholder"),
        sa.Column("supported_formats_json", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("config_schema_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "connector_key"),
    )
    op.create_table(
        "source_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connector_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("connector_key", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="not_connected"),
        sa.Column("last_tested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["connector_id"], ["source_connectors.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("source_connections")
    op.drop_table("source_connectors")
    op.drop_table("import_rollback_logs")
    op.drop_table("legacy_record_links")
    drop_source_tracking("users")
    drop_source_tracking("operational_teams")
    drop_source_tracking("organizational_units")
    drop_source_tracking("monitoring_indicators", include_project=True)
    drop_source_tracking("submissions", include_project=True, include_form=True, include_submission=True)
    drop_source_tracking("data_form_versions", include_form=True)
    drop_source_tracking("data_forms", include_project=True, include_form=True)
    drop_source_tracking("beneficiaries", include_project=True)
    drop_source_tracking("projects", include_project=True)
    op.drop_index("ix_data_import_jobs_source_system", table_name="data_import_jobs")
    op.drop_index("ix_data_import_jobs_target_project_id", table_name="data_import_jobs")
    op.drop_constraint("fk_data_import_jobs_target_project_id_projects", "data_import_jobs", type_="foreignkey")
    op.drop_column("data_import_jobs", "confirmation_json")
    op.drop_column("data_import_jobs", "error_report_json")
    op.drop_column("data_import_jobs", "completed_at")
    op.drop_column("data_import_jobs", "skipped_records")
    op.drop_column("data_import_jobs", "failed_records")
    op.drop_column("data_import_jobs", "successful_records")
    op.drop_column("data_import_jobs", "import_reason")
    op.drop_column("data_import_jobs", "source_system")
    op.drop_column("data_import_jobs", "target_mode")
    op.drop_column("data_import_jobs", "target_project_id")
