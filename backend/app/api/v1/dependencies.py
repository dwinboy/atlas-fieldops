from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.core.permissions import Permission, permissions_for_roles
from app.schemas.auth import CurrentPrincipal

bearer = HTTPBearer(auto_error=True)


async def get_current_principal(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)],
) -> CurrentPrincipal:
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    return CurrentPrincipal(
        user_id=str(payload["sub"]),
        organization_id=str(payload["organization_id"]),
        roles=list(payload.get("roles", [])),
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
        if required_permission not in permissions_for_roles(principal.roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission")
        return principal

    return dependency
