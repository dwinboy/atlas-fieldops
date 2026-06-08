from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.app_db import get_session
from app.api.v1.dependencies import get_current_principal
from app.schemas.auth import CurrentPrincipal, LoginRequest, RefreshTokenRequest, TokenResponse
from app.services.auth import AuthService, AuthenticationError

router = APIRouter()


@router.post("/login", response_model=TokenResponse, summary="Create access token")
async def login(
    payload: LoginRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    try:
        return await AuthService(session).login(
            email=payload.email,
            password=payload.password,
            organization_slug=payload.organization_slug,
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials") from exc


@router.get("/me", response_model=CurrentPrincipal, summary="Current authenticated principal")
async def me(
    principal: Annotated[CurrentPrincipal, Depends(get_current_principal)],
) -> CurrentPrincipal:
    return principal


@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
async def refresh(
    payload: RefreshTokenRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    try:
        return await AuthService(session).refresh(payload.refresh_token)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc
