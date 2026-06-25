from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.app_db import get_session
from app.core.security import decode_access_token
from app.core.permissions import (
    AccessScope,
    Permission,
    ScopeType,
    default_scope_for_roles,
    has_permission,
    menu_views_for_roles,
    permissions_for_roles,
    normalize_permission,
    workflow_actions_for_roles,
)
from app.models.identity import Membership, Organization, Role, User, UserRoleAssignment
from app.schemas.auth import CurrentPrincipal

bearer = HTTPBearer(auto_error=True)


async def _active_access_from_database(
    principal: CurrentPrincipal,
    session: AsyncSession | None,
) -> tuple[list[str], set[str]] | None:
    if session is None or (principal.support_mode and "super_admin" in principal.roles):
        return None
    try:
        organization_id = UUID(principal.organization_id)
        user_id = UUID(principal.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    organization = await session.scalar(
        select(Organization).where(
            Organization.id == organization_id,
            Organization.is_active.is_(True),
            Organization.deleted_at.is_(None),
        )
    )
    user = await session.scalar(
        select(User).where(
            User.id == user_id,
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        )
    )
    if organization is None or user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive account")
    membership_rows = (
        await session.execute(
            select(Role.name, Role.permissions)
            .join(Membership, Membership.role_id == Role.id)
            .where(
                Membership.organization_id == organization_id,
                Membership.user_id == user_id,
                Membership.is_active.is_(True),
                Membership.deleted_at.is_(None),
                Role.deleted_at.is_(None),
            )
        )
    ).all()
    now = datetime.now(UTC)
    assignment_rows = (
        await session.execute(
            select(Role.name, Role.permissions)
            .join(UserRoleAssignment, UserRoleAssignment.role_id == Role.id)
            .where(
                UserRoleAssignment.organization_id == organization_id,
                UserRoleAssignment.user_id == user_id,
                UserRoleAssignment.is_active.is_(True),
                UserRoleAssignment.deleted_at.is_(None),
                Role.deleted_at.is_(None),
                (UserRoleAssignment.starts_at.is_(None)) | (UserRoleAssignment.starts_at <= now),
                (UserRoleAssignment.expires_at.is_(None)) | (UserRoleAssignment.expires_at > now),
            )
        )
    ).all()
    roles = sorted({str(role_name) for role_name, _permissions in [*membership_rows, *assignment_rows]})
    if not roles:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive account")
    stored_permissions = {
        normalized.value
        for _role_name, permissions in [*membership_rows, *assignment_rows]
        for permission in str(permissions or "").split(",")
        if (normalized := normalize_permission(permission.strip())) is not None
    }
    return roles, stored_permissions


async def get_current_principal(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)],
) -> CurrentPrincipal:
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    roles = list(payload.get("roles", []))
    token_permissions = {
        normalized
        for permission in payload.get("permissions", [])
        if (normalized := normalize_permission(str(permission))) is not None
    }
    permissions = sorted(permission.value for permission in permissions_for_roles(roles) | token_permissions)
    scope_type = str(payload.get("scope_type") or default_scope_for_roles(roles).value)
    return CurrentPrincipal(
        user_id=str(payload["sub"]),
        organization_id=str(payload["organization_id"]),
        email=payload.get("email"),
        full_name=payload.get("full_name"),
        organization_slug=payload.get("organization_slug"),
        organization_name=payload.get("organization_name"),
        platform_admin=bool(payload.get("platform_admin", False)),
        support_mode=bool(payload.get("support_mode", False)),
        platform_organization_id=payload.get("platform_organization_id"),
        platform_organization_slug=payload.get("platform_organization_slug"),
        roles=roles,
        role_assignments=list(payload.get("role_assignments", [])),
        permissions=permissions,
        scope_type=scope_type,
        geography_ids=[str(value) for value in payload.get("geography_ids", []) if value],
        project_ids=[str(value) for value in payload.get("project_ids", []) if value],
        organization_unit_ids=[str(value) for value in payload.get("organization_unit_ids", []) if value],
        menu_views=sorted(menu_views_for_roles(roles)),
        workflow_actions=sorted(action.value for action in workflow_actions_for_roles(roles)),
    )


def require_role(required_role: str) -> Callable[[CurrentPrincipal], Awaitable[CurrentPrincipal]]:
    async def dependency(
        principal: Annotated[CurrentPrincipal, Depends(get_current_principal)],
        session: Annotated[AsyncSession | None, Depends(get_session)] = None,
    ) -> CurrentPrincipal:
        active_access = await _active_access_from_database(principal, session)
        roles = active_access[0] if active_access is not None else principal.roles
        if required_role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return principal

    return dependency


def require_permission(
    required_permission: Permission,
) -> Callable[[CurrentPrincipal], Awaitable[CurrentPrincipal]]:
    async def dependency(
        principal: Annotated[CurrentPrincipal, Depends(get_current_principal)],
        session: Annotated[AsyncSession | None, Depends(get_session)] = None,
    ) -> CurrentPrincipal:
        active_access = await _active_access_from_database(principal, session)
        if active_access is not None:
            roles, stored_permissions = active_access
            permissions = {permission.value for permission in permissions_for_roles(roles)} | stored_permissions
        else:
            roles = principal.roles
            permissions = set(principal.permissions)
        if not has_permission(roles, required_permission) and required_permission.value not in permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission")
        return principal

    return dependency


def require_any_permission(
    *required_permissions: Permission,
) -> Callable[[CurrentPrincipal], Awaitable[CurrentPrincipal]]:
    async def dependency(
        principal: Annotated[CurrentPrincipal, Depends(get_current_principal)],
        session: Annotated[AsyncSession | None, Depends(get_session)] = None,
    ) -> CurrentPrincipal:
        active_access = await _active_access_from_database(principal, session)
        if active_access is not None:
            roles, stored_permissions = active_access
            permissions = {permission.value for permission in permissions_for_roles(roles)} | stored_permissions
        else:
            roles = principal.roles
            permissions = set(principal.permissions)
        if not any(has_permission(roles, required_permission) or required_permission.value in permissions for required_permission in required_permissions):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission")
        return principal

    return dependency


def principal_scope(principal: CurrentPrincipal) -> AccessScope:
    try:
        scope_type = ScopeType(principal.scope_type)
    except ValueError:
        scope_type = ScopeType.OWN
    return AccessScope(scope_type=scope_type)


def require_tenant_match(
    organization_id: str,
    principal: CurrentPrincipal,
) -> None:
    if organization_id != principal.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access denied")
