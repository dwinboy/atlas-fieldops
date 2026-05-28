from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.identity import PasswordResetRead, UserCreate, UserRead, UserUpdate
from app.services.identity import IdentityNotFoundError, IdentityPermissionError, UserManagementService

router = APIRouter()


@router.get("", response_model=list[UserRead], summary="List users in current tenant")
async def list_users(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[UserRead]:
    return await UserManagementService(session).list_users(UUID(principal.organization_id))


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create user in current tenant",
)
async def create_user(
    payload: UserCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_CREATE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserRead:
    try:
        user = await UserManagementService(session).create_user(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            actor_roles=principal.roles,
            payload=payload,
        )
        await session.commit()
        return user
    except IdentityNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found") from exc
    except IdentityPermissionError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.patch("/{user_id}", response_model=UserRead, summary="Update user role, scope, status, or profile")
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserRead:
    try:
        user = await UserManagementService(session).update_user(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            actor_roles=principal.roles,
            user_id=user_id,
            payload=payload,
        )
        await session.commit()
        return user
    except IdentityNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User or role not found") from exc
    except IdentityPermissionError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post("/{user_id}/reset-password", response_model=PasswordResetRead, summary="Reset a user's temporary local password")
async def reset_user_password(
    user_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PasswordResetRead:
    try:
        reset = await UserManagementService(session).reset_password(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            user_id=user_id,
        )
        await session.commit()
        return reset
    except IdentityNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found") from exc
    except Exception:
        await session.rollback()
        raise
