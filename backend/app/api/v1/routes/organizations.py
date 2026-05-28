from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_principal, require_permission, require_role
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.repositories.identity import OrganizationRepository
from app.schemas.identity import OrganizationContextRead, OrganizationCreate, OrganizationRead
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
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
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


@router.get("/me", response_model=OrganizationContextRead, summary="Current tenant context")
async def organization_context(
    principal: Annotated[CurrentPrincipal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OrganizationContextRead:
    organization = await OrganizationRepository(session).get(UUID(principal.organization_id))
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return OrganizationContextRead(
        organization_id=organization.id,
        name=organization.name,
        slug=organization.slug,
        roles=principal.roles,
        logo_url=None,
    )


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
