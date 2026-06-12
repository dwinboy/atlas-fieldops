"""make officer assignments form specific

Revision ID: 20260608_0022
Revises: 20260607_0021
Create Date: 2026-06-08
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260608_0022"
down_revision: str | None = "20260607_0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _drop_unique_by_columns(table_name: str, column_names: list[str]) -> None:
    quoted_columns = ", ".join(f"'{column_name}'" for column_name in column_names)
    op.execute(
        f"""
        DO $$
        DECLARE
            target_constraint text;
        BEGIN
            SELECT constraint_name
            INTO target_constraint
            FROM (
                SELECT
                    c.conname AS constraint_name,
                    array_agg(a.attname ORDER BY u.ordinality) AS constrained_columns
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                JOIN unnest(c.conkey) WITH ORDINALITY AS u(attnum, ordinality) ON true
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = u.attnum
                WHERE t.relname = '{table_name}'
                  AND n.nspname = current_schema()
                  AND c.contype = 'u'
                GROUP BY c.conname
            ) constraints
            WHERE constrained_columns::text[] = ARRAY[{quoted_columns}]::text[]
            LIMIT 1;

            IF target_constraint IS NOT NULL THEN
                EXECUTE format('ALTER TABLE {table_name} DROP CONSTRAINT %I', target_constraint);
            END IF;
        END
        $$;
        """
    )


def upgrade() -> None:
    _drop_unique_by_columns("officer_assignments", ["organization_id", "officer_id", "project_id"])
    op.create_unique_constraint(
        "uq_officer_assignments_org_officer_project_form",
        "officer_assignments",
        ["organization_id", "officer_id", "project_id", "form_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_officer_assignments_org_officer_project_form",
        "officer_assignments",
        type_="unique",
    )
    op.create_unique_constraint(
        "officer_assignments_organization_id_officer_id_project_id_key",
        "officer_assignments",
        ["organization_id", "officer_id", "project_id"],
    )
