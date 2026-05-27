from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.api.v1.dependencies import get_current_principal, require_role
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.core.config import settings
from app.schemas.auth import CurrentPrincipal
from app.services.auth import AuthService, AuthenticationError


def test_password_hash_round_trip() -> None:
    password_hash = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", password_hash)
    assert not verify_password("wrong", password_hash)


def test_access_token_round_trip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "jwt_secret", "test-secret-with-enough-length")
    token = create_access_token("user-1", "org-1", ["admin"])
    payload = decode_access_token(token)
    assert payload["sub"] == "user-1"
    assert payload["organization_id"] == "org-1"
    assert payload["roles"] == ["admin"]


def test_access_token_requires_configured_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "jwt_secret", "")

    with pytest.raises(RuntimeError, match="JWT_SECRET must be configured"):
        create_access_token("user-1", "org-1", ["admin"])


def test_decode_rejects_tampered_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "jwt_secret", "test-secret-with-enough-length")
    token = create_access_token("user-1", "org-1", ["admin"])
    tampered_token = f"{token[:-1]}x"

    with pytest.raises(ValueError, match="Invalid access token"):
        decode_access_token(tampered_token)


def test_decode_rejects_expired_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "jwt_secret", "test-secret-with-enough-length")
    expired_token = jwt.encode(
        {
            "sub": "user-1",
            "organization_id": "org-1",
            "roles": ["admin"],
            "exp": datetime.now(UTC) - timedelta(minutes=1),
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

    with pytest.raises(ValueError, match="Invalid access token"):
        decode_access_token(expired_token)


async def test_current_principal_extracts_token_claims(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "jwt_secret", "test-secret-with-enough-length")
    token = create_access_token("user-1", "org-1", ["admin", "reviewer"])
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    principal = await get_current_principal(credentials)

    assert principal == CurrentPrincipal(
        user_id="user-1",
        organization_id="org-1",
        roles=["admin", "reviewer"],
    )


async def test_current_principal_rejects_invalid_token() -> None:
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="not-a-jwt")

    with pytest.raises(HTTPException) as exc_info:
        await get_current_principal(credentials)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid token"


async def test_require_role_allows_principal_with_required_role() -> None:
    principal = CurrentPrincipal(user_id="user-1", organization_id="org-1", roles=["admin"])

    authorized_principal = await require_role("admin")(principal)

    assert authorized_principal == principal


async def test_require_role_rejects_principal_without_required_role() -> None:
    principal = CurrentPrincipal(user_id="user-1", organization_id="org-1", roles=["reviewer"])

    with pytest.raises(HTTPException) as exc_info:
        await require_role("admin")(principal)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Insufficient role"


class FakeUserRepository:
    def __init__(self, identity: tuple[object, object, object, object] | None) -> None:
        self.identity = identity

    async def find_for_login(
        self,
        email: str,
        organization_slug: str,
    ) -> tuple[object, object, object, object] | None:
        return self.identity


def build_identity(
    *,
    password_hash: str,
    user_active: bool = True,
    organization_active: bool = True,
    membership_active: bool = True,
    role_name: str = "collector",
) -> tuple[object, object, object, object]:
    user = SimpleNamespace(id=uuid4(), password_hash=password_hash, is_active=user_active)
    organization = SimpleNamespace(id=uuid4(), is_active=organization_active)
    membership = SimpleNamespace(is_active=membership_active)
    role = SimpleNamespace(name=role_name)
    return user, organization, membership, role


async def test_auth_service_issues_role_scoped_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "jwt_secret", "test-secret-with-enough-length")
    password_hash = hash_password("correct horse battery staple")
    service = object.__new__(AuthService)
    service.users = FakeUserRepository(build_identity(password_hash=password_hash, role_name="admin"))

    token_response = await service.login(
        email="user@example.com",
        password="correct horse battery staple",
        organization_slug="acme",
    )

    payload = decode_access_token(token_response.access_token)
    assert token_response.token_type == "bearer"
    assert payload["roles"] == ["admin"]
    assert payload["sub"]
    assert payload["organization_id"]


@pytest.mark.parametrize(
    ("identity", "password"),
    [
        (None, "correct horse battery staple"),
        (build_identity(password_hash=hash_password("correct horse battery staple")), "wrong"),
        (
            build_identity(
                password_hash=hash_password("correct horse battery staple"),
                user_active=False,
            ),
            "correct horse battery staple",
        ),
        (
            build_identity(
                password_hash=hash_password("correct horse battery staple"),
                organization_active=False,
            ),
            "correct horse battery staple",
        ),
        (
            build_identity(
                password_hash=hash_password("correct horse battery staple"),
                membership_active=False,
            ),
            "correct horse battery staple",
        ),
    ],
)
async def test_auth_service_rejects_invalid_or_inactive_accounts(
    identity: tuple[object, object, object, object] | None,
    password: str,
) -> None:
    service = object.__new__(AuthService)
    service.users = FakeUserRepository(identity)

    with pytest.raises(AuthenticationError):
        await service.login(email="user@example.com", password=password, organization_slug="acme")
