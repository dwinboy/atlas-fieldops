"""backfill field officer profiles for mobile login

Revision ID: 20260606_0020
Revises: 20260606_0019
Create Date: 2026-06-06
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260606_0020"
down_revision: str | None = "20260606_0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO field_officer_profiles (
            id,
            organization_id,
            user_id,
            employee_code,
            phone_number,
            home_region,
            is_active,
            created_at,
            updated_at
        )
        SELECT
            uuid_generate_v4(),
            memberships.organization_id,
            memberships.user_id,
            'FO-' || upper(substr(memberships.user_id::text, 1, 8)),
            NULL,
            NULL,
            TRUE,
            now(),
            now()
        FROM memberships
        JOIN roles ON roles.id = memberships.role_id
        LEFT JOIN field_officer_profiles
            ON field_officer_profiles.organization_id = memberships.organization_id
            AND field_officer_profiles.user_id = memberships.user_id
            AND field_officer_profiles.deleted_at IS NULL
        WHERE memberships.deleted_at IS NULL
            AND memberships.is_active IS TRUE
            AND field_officer_profiles.id IS NULL
            AND lower(roles.name) IN ('field_officer', 'collector', 'enumerator', 'field officer', 'field-officer', 'field officer / enumerator')
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM field_officer_profiles
        WHERE employee_code LIKE 'FO-%'
            AND last_sync_at IS NULL
            AND last_seen_at IS NULL
            AND device_id IS NULL
        """
    )
