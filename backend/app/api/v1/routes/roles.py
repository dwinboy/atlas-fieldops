from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.repositories.identity import RoleRepository
from app.schemas.auth import CurrentPrincipal
from app.schemas.identity import RoleRead

router = APIRouter()


@router.get("", response_model=list[RoleRead], summary="List roles in current tenant")
async def list_roles(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ROLE_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[RoleRead]:
    roles = await RoleRepository(session).list_for_organization(UUID(principal.organization_id))
    return [
        RoleRead(
            id=role.id,
            organization_id=role.organization_id,
            name=role.name,
            permissions=[permission for permission in role.permissions.split(",") if permission],
        )
        for role in roles
    ]

