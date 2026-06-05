import json
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.identity import Membership, Role, User
from app.models.operations import AccessRequest, OperationalTeam, SessionLog
from app.schemas.users_teams import UsersTeamsActivityLogRead, UsersTeamsSummaryRead


class UsersTeamsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def summary(self, organization_id: UUID) -> UsersTeamsSummaryRead:
        total_users = await self._count_user_memberships(organization_id)
        active_users = await self._count_user_memberships(organization_id, is_active=True)
        inactive_users = max(total_users - active_users, 0)
        roles = await self._count(Role, organization_id)
        teams = await self._count(OperationalTeam, organization_id)
        pending_access_requests = await self._count(AccessRequest, organization_id, status="pending")
        active_sessions = await self._count(SessionLog, organization_id, status="active")
        high_risk_sessions = await self._count(SessionLog, organization_id, status="high_risk")
        recent_activity = await self._count(AuditLog, organization_id)
        permission_alerts = pending_access_requests + high_risk_sessions
        readiness_penalties = sum(
            [
                20 if total_users == 0 else 0,
                15 if roles == 0 else 0,
                15 if teams == 0 else 0,
                min(permission_alerts * 5, 30),
            ]
        )
        return UsersTeamsSummaryRead(
            total_users=total_users,
            active_users=active_users,
            inactive_users=inactive_users,
            teams=teams,
            roles=roles,
            pending_access_requests=pending_access_requests,
            active_sessions=active_sessions,
            high_risk_sessions=high_risk_sessions,
            permission_alerts=permission_alerts,
            recent_activity=recent_activity,
            access_health_score=max(100 - readiness_penalties, 0),
        )

    async def activity_logs(self, organization_id: UUID, limit: int = 100) -> list[UsersTeamsActivityLogRead]:
        result = await self.session.execute(
            select(AuditLog, User.full_name, User.email)
            .outerjoin(User, User.id == AuditLog.actor_user_id)
            .where(AuditLog.organization_id == organization_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
        rows: list[UsersTeamsActivityLogRead] = []
        for audit_log, full_name, email in result.all():
            metadata = self._parse_metadata(audit_log.metadata_json)
            rows.append(
                UsersTeamsActivityLogRead(
                    id=audit_log.id,
                    user_id=audit_log.actor_user_id,
                    user_label=full_name or email,
                    action=audit_log.action,
                    resource_type=audit_log.resource_type,
                    resource_id=audit_log.resource_id,
                    status=str(metadata.get("status") or "recorded"),
                    ip_address=self._optional_str(metadata.get("ip_address")),
                    device=self._optional_str(metadata.get("device")),
                    location=self._optional_str(metadata.get("location")),
                    metadata=metadata,
                    created_at=audit_log.created_at,
                )
            )
        return rows

    async def _count(self, model: type[object], organization_id: UUID, **filters: object) -> int:
        conditions = [getattr(model, "organization_id") == organization_id]
        if hasattr(model, "deleted_at"):
            conditions.append(getattr(model, "deleted_at").is_(None))
        for key, value in filters.items():
            conditions.append(getattr(model, key) == value)
        result = await self.session.execute(select(func.count()).select_from(model).where(*conditions))
        return int(result.scalar_one())

    async def _count_user_memberships(self, organization_id: UUID, is_active: bool | None = None) -> int:
        conditions = [
            Membership.organization_id == organization_id,
            Membership.deleted_at.is_(None),
            User.deleted_at.is_(None),
        ]
        if is_active is not None:
            conditions.extend([Membership.is_active == is_active, User.is_active == is_active])
        result = await self.session.execute(
            select(func.count(User.id)).select_from(User).join(Membership, Membership.user_id == User.id).where(*conditions)
        )
        return int(result.scalar_one())

    @staticmethod
    def _parse_metadata(value: str) -> dict[str, object]:
        try:
            parsed = json.loads(value or "{}")
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}

    @staticmethod
    def _optional_str(value: object) -> str | None:
        if value is None:
            return None
        return str(value)

