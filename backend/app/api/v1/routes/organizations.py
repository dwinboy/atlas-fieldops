from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_principal, require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.identity import OrganizationCreate, OrganizationRead
from app.services.identity import IdentityConflictError, OrganizationService

router = APIRouter()


@router.post(
    "",
    response_model=OrganizationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create organization tenant",
)
async def create_organization(
    payload: OrganizationCreate,
    _principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> object:
    try:
        organization = await OrganizationService(session).create_organization(payload)
        await session.commit()
        return organization
    except IdentityConflictError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization exists") from exc
    except Exception:
        await session.rollback()
        raise


@router.get("/me", response_model=dict[str, UUID | list[str]], summary="Current tenant context")
async def organization_context(
    principal: Annotated[CurrentPrincipal, Depends(get_current_principal)],
) -> dict[str, UUID | list[str]]:
    return {"organization_id": UUID(principal.organization_id), "roles": principal.roles}


@router.get(
    "/secure-check",
    response_model=dict[str, str],
    summary="Permission-protected organization check",
)
async def secure_check(
    _principal: Annotated[
        CurrentPrincipal,
        Depends(require_permission(Permission.ORGANIZATION_READ)),
    ],
) -> dict[str, str]:
    return {"status": "authorized"}
