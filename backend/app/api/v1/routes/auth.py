from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.app_db import get_session
from app.api.v1.dependencies import get_current_principal
from app.schemas.auth import CurrentPrincipal, LoginRequest, MobileQrLoginRequest, RefreshTokenRequest, TokenResponse
from app.services.auth import AuthService, AuthenticationError, MultipleOrganizationsError

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
    except MultipleOrganizationsError as exc:
        # Password verified, but the account belongs to several workspaces.
        # Return the choices so the client can re-submit with a slug.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "reason": "multiple_organizations",
                "organizations": [
                    {"slug": slug, "name": name} for slug, name in exc.organizations
                ],
            },
        ) from exc
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials") from exc


@router.post("/mobile-qr-login", response_model=TokenResponse, summary="Create mobile access token from field officer QR code")
async def mobile_qr_login(
    payload: MobileQrLoginRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    try:
        return await AuthService(session).login_with_mobile_qr(payload.qr_token)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc) or "Invalid mobile QR code") from exc


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
