from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import (
    LOCKED_ROLE_PERMISSIONS,
    PROTECTED_ROLE_NAMES,
    Permission,
    ScopeType,
    WorkflowAction,
    assignable_role_definitions,
    canonical_role,
    default_permissions_for_role,
    expand_implied_permissions,
    is_assignable_role,
    role_architecture_group,
    role_common_usage,
    self_lockout_permissions,
)
from app.repositories.identity import OrganizationUnitRepository, RoleRepository
from app.services.audit import AuditService
from app.schemas.auth import CurrentPrincipal
from app.schemas.identity import AccessCatalogRead, OrganizationUnitRead, PermissionCatalogItem, RoleCatalogItem, RoleCreate, RoleRead, RoleUpdate
from app.models.identity import Role

router = APIRouter()


def serialize_role(role: Role) -> RoleRead:
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
        permissions=sorted(expand_implied_permissions(set(payload.permissions))),
        is_system=False,
    )
    await session.commit()
    return serialize_role(role)


def _current_permission_set(role: Role) -> set[str]:
    return {permission for permission in role.permissions.split(",") if permission}


async def _record_role_audit(
    session: AsyncSession,
    principal: CurrentPrincipal,
    role: Role,
    action: str,
    before: set[str],
    after: set[str],
) -> None:
    """Write an audit entry for an owner-managed role change."""
    actor_user_id = UUID(principal.user_id) if principal.user_id else None
    await AuditService(session).record(
        organization_id=UUID(principal.organization_id),
        actor_user_id=actor_user_id,
        action=action,
        resource_type="role",
        resource_id=str(role.id),
        metadata={
            "role_name": role.name,
            "added": sorted(after - before),
            "removed": sorted(before - after),
            "permissions": sorted(after),
        },
    )


def _finalize_role_permissions(role: Role, requested: list[str]) -> set[str]:
    """Validate, apply manage→view implications, and re-add any locked floor permissions."""
    allowed_permissions = {permission.value for permission in Permission}
    invalid = sorted(set(requested) - allowed_permissions)
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown permissions: {', '.join(invalid)}",
        )
    resolved = expand_implied_permissions(set(requested))
    floor = LOCKED_ROLE_PERMISSIONS.get(canonical_role(role.name))
    if floor:
        resolved |= set(floor)
    return resolved


@router.patch("/{role_id}", response_model=RoleRead, summary="Edit a role's permissions and details")
async def update_role(
    role_id: UUID,
    payload: RoleUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ROLE_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> RoleRead:
    organization_id = UUID(principal.organization_id)
    repository = RoleRepository(session)
    role = await repository.get(organization_id=organization_id, role_id=role_id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    if canonical_role(role.name) in PROTECTED_ROLE_NAMES and "super_admin" not in principal.roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This platform role is protected and cannot be edited.")
    before = _current_permission_set(role)
    finalized = _finalize_role_permissions(role, payload.permissions) if payload.permissions is not None else None
    if finalized is not None and "super_admin" not in principal.roles:
        self_lockout = self_lockout_permissions(role.name, principal.roles, before, finalized)
        if self_lockout:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "You cannot remove "
                    + ", ".join(sorted(self_lockout))
                    + " from a role you currently hold — doing so would lock your "
                    "organization out of managing roles and users. Assign yourself "
                    "another role with these permissions first, or keep them."
                ),
            )
    permissions = sorted(finalized) if finalized is not None else None
    role = await repository.update(
        role=role,
        permissions=permissions,
        label=payload.label,
        description=payload.description,
        scope_type=payload.scope_type,
    )
    if permissions is not None:
        await _record_role_audit(session, principal, role, "role.permissions.updated", before, set(permissions))
    await session.commit()
    return serialize_role(role)


@router.post("/{role_id}/reset-permissions", response_model=RoleRead, summary="Reset a role to its built-in default permissions")
async def reset_role_permissions(
    role_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ROLE_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> RoleRead:
    organization_id = UUID(principal.organization_id)
    repository = RoleRepository(session)
    role = await repository.get(organization_id=organization_id, role_id=role_id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    defaults = default_permissions_for_role(role.name)
    if not defaults:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This custom role has no built-in default to reset to.")
    before = _current_permission_set(role)
    role = await repository.update(role=role, permissions=sorted(defaults))
    await _record_role_audit(session, principal, role, "role.permissions.reset", before, set(defaults))
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
