from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.core.permissions import (
    AccessScope,
    Permission,
    ScopeType,
    default_scope_for_roles,
    has_permission,
    menu_views_for_roles,
    permissions_for_roles,
    workflow_actions_for_roles,
)
from app.schemas.auth import CurrentPrincipal

bearer = HTTPBearer(auto_error=True)


async def get_current_principal(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)],
) -> CurrentPrincipal:
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    roles = list(payload.get("roles", []))
    permissions = sorted(permission.value for permission in permissions_for_roles(roles))
    scope_type = str(payload.get("scope_type") or default_scope_for_roles(roles).value)
    return CurrentPrincipal(
        user_id=str(payload["sub"]),
        organization_id=str(payload["organization_id"]),
        roles=roles,
        permissions=permissions,
        scope_type=scope_type,
        menu_views=sorted(menu_views_for_roles(roles)),
        workflow_actions=sorted(action.value for action in workflow_actions_for_roles(roles)),
    )


def require_role(required_role: str) -> Callable[[CurrentPrincipal], Awaitable[CurrentPrincipal]]:
    async def dependency(
        principal: Annotated[CurrentPrincipal, Depends(get_current_principal)],
    ) -> CurrentPrincipal:
        if required_role not in principal.roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return principal

    return dependency


def require_permission(
    required_permission: Permission,
) -> Callable[[CurrentPrincipal], Awaitable[CurrentPrincipal]]:
    async def dependency(
        principal: Annotated[CurrentPrincipal, Depends(get_current_principal)],
    ) -> CurrentPrincipal:
        if not has_permission(principal.roles, required_permission):
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
