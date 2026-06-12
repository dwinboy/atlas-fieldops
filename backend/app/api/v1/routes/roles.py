from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import (
    Permission,
    ScopeType,
    WorkflowAction,
    assignable_role_definitions,
    is_assignable_role,
    role_architecture_group,
    role_common_usage,
)
from app.repositories.identity import OrganizationUnitRepository, RoleRepository
from app.schemas.auth import CurrentPrincipal
from app.schemas.identity import AccessCatalogRead, OrganizationUnitRead, PermissionCatalogItem, RoleCatalogItem, RoleCreate, RoleRead

router = APIRouter()


def serialize_role(role) -> RoleRead:
    return RoleRead(
        id=role.id,
        organization_id=role.organization_id,
        name=role.name,
        label=role.label,
        description=role.description,
        scope_type=role.scope_type,
        is_system=role.is_system,
        permissions=[permission for permission in role.permissions.split(",") if permission],
    )


@router.get("", response_model=list[RoleRead], summary="List roles in current tenant")
async def list_roles(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ROLE_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[RoleRead]:
    roles = await RoleRepository(session).list_for_organization(UUID(principal.organization_id))
    return [serialize_role(role) for role in roles if is_assignable_role(role.name, principal.roles)]


@router.post("", response_model=RoleRead, status_code=status.HTTP_201_CREATED, summary="Create custom role in current tenant")
async def create_role(
    payload: RoleCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ROLE_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> RoleRead:
    organization_id = UUID(principal.organization_id)
    repository = RoleRepository(session)
    normalized_name = payload.name.strip().lower().replace(" ", "_").replace("-", "_")
    if await repository.get_by_name(organization_id=organization_id, name=normalized_name):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Role already exists")
    allowed_permissions = {permission.value for permission in Permission}
    invalid_permissions = sorted(set(payload.permissions) - allowed_permissions)
    if invalid_permissions:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unknown permissions: {', '.join(invalid_permissions)}")
    role = await repository.create(
        organization_id=organization_id,
        name=normalized_name,
        label=payload.label or normalized_name.replace("_", " ").title(),
        description=payload.description,
        scope_type=payload.scope_type,
        permissions=payload.permissions,
        is_system=False,
    )
    await session.commit()
    return serialize_role(role)


@router.get("/catalog", response_model=AccessCatalogRead, summary="Describe enterprise RBAC catalog")
async def get_access_catalog(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ROLE_READ))],
) -> AccessCatalogRead:
    role_definitions = assignable_role_definitions(principal.roles)
    return AccessCatalogRead(
        roles=[
            RoleCatalogItem(
                name=definition.name,
                label=definition.label,
                description=definition.description,
                scope_type=definition.scope_type.value,
                architecture_group=role_architecture_group(definition.name),
                common_usage=role_common_usage(definition.name),
                permissions=sorted(permission.value for permission in definition.permissions),
                workflow_actions=sorted(action.value for action in definition.workflow_actions),
                menu_views=sorted(definition.menu_views),
            )
            for definition in role_definitions.values()
        ],
        permissions=[
            PermissionCatalogItem(
                key=permission.value,
                label=permission.value.replace(".", " ").replace("_", " ").title(),
                group=permission.value.split(".")[0],
            )
            for permission in Permission
        ],
        scope_types=[scope.value for scope in ScopeType],
        workflow_actions=[action.value for action in WorkflowAction],
    )


@router.get("/organization-units", response_model=list[OrganizationUnitRead], summary="List tenant organization hierarchy")
async def list_organization_units(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[OrganizationUnitRead]:
    units = await OrganizationUnitRepository(session).list_for_organization(UUID(principal.organization_id))
    return [OrganizationUnitRead.model_validate(unit) for unit in units]
