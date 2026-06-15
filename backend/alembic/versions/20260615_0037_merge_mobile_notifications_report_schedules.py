"""Merge mobile notifications and report schedules heads.

Revision ID: 20260615_0037
Revises: 20260613_0036, 20260614_0036
Create Date: 2026-06-15 06:48:00.000000
"""

from collections.abc import Sequence

revision: str = "20260615_0037"
down_revision: tuple[str, str] = ("20260613_0036", "20260614_0036")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
