import json
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


class AuditRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def append(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID | None,
        action: str,
        resource_type: str,
        resource_id: str,
        metadata: dict[str, object],
    ) -> AuditLog:
        log = AuditLog(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_json=json.dumps(metadata, sort_keys=True),
        )
        self.session.add(log)
        await self.session.flush()
        return log

