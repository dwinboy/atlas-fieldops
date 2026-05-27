from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.audit import AuditRepository


class AuditService:
    def __init__(self, session: AsyncSession) -> None:
        self.audit = AuditRepository(session)

    async def record(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID | None,
        action: str,
        resource_type: str,
        resource_id: str,
        metadata: dict[str, object] | None = None,
    ) -> None:
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata=metadata or {},
        )

