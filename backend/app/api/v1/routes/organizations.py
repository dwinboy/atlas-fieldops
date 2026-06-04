from typing import Annotated, cast
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_principal, require_permission, require_role
from app.app_db import get_session
from app.core.permissions import Permission
from app.core.security import create_access_token
from app.repositories.audit import AuditRepository
from app.repositories.identity import OrganizationRepository
from app.schemas.auth import CurrentPrincipal, TokenResponse
from app.schemas.identity import (
    OrganizationContextRead,
    OrganizationCreate,
    OrganizationRead,
    OrganizationStatusUpdate,
    PlatformOrganizationRead,
)
from app.services.identity import IdentityConflictError, OrganizationService

router = APIRouter()


def principal_user_uuid(principal: CurrentPrincipal) -> UUID | None:
    try:
        return UUID(principal.user_id)
    except ValueError:
        return None


@router.post(
    "",
    response_model=OrganizationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create organization tenant",
)
async def create_organization(
    payload: OrganizationCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> object:
    try:
        organization = cast(dict[str, object], await OrganizationService(session).create_organization(payload))
        organization_id = UUID(str(organization["id"]))
        await AuditRepository(session).append(
            organization_id=organization_id,
            actor_user_id=principal_user_uuid(principal),
            action="platform.organization_created",
            resource_type="organization",
            resource_id=str(organization_id),
            metadata={
                "slug": organization["slug"],
                "name": organization["name"],
                "owner_email": organization["owner_email"] or "",
            },
        )
        await session.commit()
        return organization
    except IdentityConflictError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization exists") from exc
    except Exception:
        await session.rollback()
        raise


@router.get(
    "/platform",
    response_model=list[PlatformOrganizationRead],
    summary="List all organization tenants for platform support",
)
async def list_organizations(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[PlatformOrganizationRead]:
    repository = OrganizationRepository(session)
    organizations = await repository.list_all()
    rows: list[PlatformOrganizationRead] = []
    for organization in organizations:
        rows.append(
            PlatformOrganizationRead(
                id=organization.id,
                name=organization.name,
                slug=organization.slug,
                is_active=organization.is_active,
                user_count=await repository.count_users(organization.id),
                owner_email=await repository.owner_email(organization.id),
            )
        )
    return rows


@router.post(
    "/platform/session/return",
    response_model=TokenResponse,
    summary="Return a platform super admin from tenant support mode to the platform console",
)
async def return_to_platform_session(
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    platform_organization_id = principal.platform_organization_id or principal.organization_id
    repository = OrganizationRepository(session)
    organization = await repository.get(UUID(platform_organization_id))
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Platform organization not found")
    await AuditRepository(session).append(
        organization_id=organization.id,
        actor_user_id=principal_user_uuid(principal),
        action="platform.support_session_returned",
        resource_type="organization",
        resource_id=str(principal.organization_id),
        metadata={"platform_organization_slug": organization.slug, "support_organization_slug": principal.organization_slug or ""},
    )
    await session.commit()
    token = create_access_token(
        subject=principal.user_id,
        organization_id=str(organization.id),
        roles=["super_admin"],
        email=principal.email,
        full_name=principal.full_name,
        organization_slug=organization.slug,
        organization_name=organization.name,
        platform_admin=True,
        support_mode=False,
        platform_organization_id=str(organization.id),
        platform_organization_slug=organization.slug,
        scope_type="global",
    )
    return TokenResponse(access_token=token)


@router.patch(
    "/platform/{organization_id}",
    response_model=PlatformOrganizationRead,
    summary="Activate or deactivate an organization tenant",
)
async def update_organization_status(
    organization_id: UUID,
    payload: OrganizationStatusUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformOrganizationRead:
    repository = OrganizationRepository(session)
    organization = await repository.get(organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    organization.is_active = payload.is_active
    await AuditRepository(session).append(
        organization_id=organization.id,
        actor_user_id=principal_user_uuid(principal),
        action="platform.organization_status_updated",
        resource_type="organization",
        resource_id=str(organization.id),
        metadata={"slug": organization.slug, "is_active": organization.is_active},
    )
    await session.commit()
    return PlatformOrganizationRead(
        id=organization.id,
        name=organization.name,
        slug=organization.slug,
        is_active=organization.is_active,
        user_count=await repository.count_users(organization.id),
        owner_email=await repository.owner_email(organization.id),
    )


@router.post(
    "/platform/{organization_id}/support-session",
    response_model=TokenResponse,
    summary="Open a platform super admin support session inside an organization",
)
async def create_support_session(
    organization_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    repository = OrganizationRepository(session)
    organization = await repository.get(organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    await AuditRepository(session).append(
        organization_id=organization.id,
        actor_user_id=principal_user_uuid(principal),
        action="platform.support_session_opened",
        resource_type="organization",
        resource_id=str(organization.id),
        metadata={"slug": organization.slug, "name": organization.name},
    )
    await session.commit()
    token = create_access_token(
        subject=principal.user_id,
        organization_id=str(organization.id),
        roles=["super_admin"],
        email=principal.email,
        full_name=principal.full_name,
        organization_slug=organization.slug,
        organization_name=organization.name,
        platform_admin=True,
        support_mode=True,
        platform_organization_id=principal.platform_organization_id or principal.organization_id,
        platform_organization_slug=principal.platform_organization_slug or principal.organization_slug,
        scope_type="global",
    )
    return TokenResponse(access_token=token)


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
