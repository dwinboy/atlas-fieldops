from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission, ROLE_DEFINITIONS, ScopeType, WorkflowAction
from app.repositories.identity import OrganizationUnitRepository, RoleRepository
from app.schemas.auth import CurrentPrincipal
from app.schemas.identity import AccessCatalogRead, OrganizationUnitRead, PermissionCatalogItem, RoleCatalogItem, RoleRead

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
            label=role.label,
            description=role.description,
            scope_type=role.scope_type,
            is_system=role.is_system,
            permissions=[permission for permission in role.permissions.split(",") if permission],
        )
        for role in roles
    ]


@router.get("/catalog", response_model=AccessCatalogRead, summary="Describe enterprise RBAC catalog")
async def get_access_catalog(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ROLE_READ))],
) -> AccessCatalogRead:
    del principal
    return AccessCatalogRead(
        roles=[
            RoleCatalogItem(
                name=definition.name,
                label=definition.label,
                description=definition.description,
                scope_type=definition.scope_type.value,
                permissions=sorted(permission.value for permission in definition.permissions),
                workflow_actions=sorted(action.value for action in definition.workflow_actions),
                menu_views=sorted(definition.menu_views),
            )
            for definition in ROLE_DEFINITIONS.values()
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
