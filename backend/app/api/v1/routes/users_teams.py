from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.users_teams import UsersTeamsActivityLogRead, UsersTeamsSummaryRead
from app.services.users_teams import UsersTeamsService

router = APIRouter()


@router.get("/summary", response_model=UsersTeamsSummaryRead, summary="Get Users & Teams overview metrics")
async def summary(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UsersTeamsSummaryRead:
    return await UsersTeamsService(session).summary(UUID(principal.organization_id))


@router.get("/activity-logs", response_model=list[UsersTeamsActivityLogRead], summary="List recent identity and access activity")
async def activity_logs(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[UsersTeamsActivityLogRead]:
    return await UsersTeamsService(session).activity_logs(UUID(principal.organization_id), limit=limit)

