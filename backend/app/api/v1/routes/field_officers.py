from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.collection import FieldOfficerInvite, FieldOfficerRead
from app.services.collection import CollectionNotFoundError, FieldOfficerService

router = APIRouter()


@router.get("", response_model=list[FieldOfficerRead], summary="List field officers in current tenant")
async def list_field_officers(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[FieldOfficerRead]:
    return await FieldOfficerService(session).list_officers(UUID(principal.organization_id))


@router.post(
    "",
    response_model=FieldOfficerRead,
    status_code=status.HTTP_201_CREATED,
    summary="Invite a field officer and create an officer profile",
)
async def invite_field_officer(
    payload: FieldOfficerInvite,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldOfficerRead:
    service = FieldOfficerService(session)
    try:
        profile = await service.invite_officer(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            payload=payload,
        )
        await session.commit()
        officers = await service.list_officers(UUID(principal.organization_id))
        return next(officer for officer in officers if officer.id == profile.id)
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise
