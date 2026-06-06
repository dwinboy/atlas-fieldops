from datetime import UTC, datetime, timedelta
import os
from types import SimpleNamespace
from typing import Any, cast
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.api.v1.dependencies import get_current_principal, require_permission, require_role
from app.core.permissions import (
    AccessScope,
    Permission,
    ScopeType,
    assignable_role_definitions,
    has_permission,
    is_assignable_role,
    is_scope_allowed_for_role,
    is_scope_authorized,
    menu_views_for_roles,
)
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.core.config import settings
from app.schemas.auth import CurrentPrincipal
from app.schemas.identity import UserCreate
from app.schemas.organization_governance import AccessSimulationRequest
from app.services.auth import AuthService, AuthenticationError
from app.services.identity import UserManagementService
from app.services.organization_governance import OrganizationGovernanceService


def test_password_hash_round_trip() -> None:
    password_hash = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", password_hash)
    assert not verify_password("wrong", password_hash)


def test_access_token_round_trip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret-with-at-least-32-characters")
    token = create_access_token(
        "user-1",
        "org-1",
        ["admin"],
        email="user@example.com",
        full_name="Amina Manager",
        organization_slug="acme",
        organization_name="Acme Relief",
    )
    payload = decode_access_token(token)
    assert payload["sub"] == "user-1"
    assert payload["organization_id"] == "org-1"
    assert payload["email"] == "user@example.com"
    assert payload["full_name"] == "Amina Manager"
    assert payload["organization_slug"] == "acme"
    assert payload["organization_name"] == "Acme Relief"
    assert payload["roles"] == ["admin"]


async def test_current_principal_extracts_platform_support_claims(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret-with-at-least-32-characters")
    token = create_access_token(
        "platform-user-1",
        "tenant-org-1",
        ["super_admin"],
        email="admin@atlasfieldops.com",
        full_name="Atlas Platform Admin",
        organization_slug="tenant-a",
        organization_name="Tenant A",
        platform_admin=True,
        support_mode=True,
        platform_organization_id="platform-org-1",
        platform_organization_slug="atlas",
        scope_type="global",
    )

    principal = await get_current_principal(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))

    assert principal.roles == ["super_admin"]
    assert principal.organization_id == "tenant-org-1"
    assert principal.organization_slug == "tenant-a"
    assert principal.platform_admin is True
    assert principal.support_mode is True
    assert principal.platform_organization_id == "platform-org-1"
    assert principal.platform_organization_slug == "atlas"
    assert principal.scope_type == "global"


def test_access_token_requires_configured_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("JWT_SECRET", raising=False)

    with pytest.raises(RuntimeError, match="JWT_SECRET must be configured"):
        create_access_token("user-1", "org-1", ["admin"])


def test_decode_rejects_tampered_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret-with-at-least-32-characters")
    token = create_access_token("user-1", "org-1", ["admin"])
    header, payload, signature = token.split(".")
    tampered_token = f"{header}.{payload[:-2]}xx.{signature}"

    with pytest.raises(ValueError, match="Invalid access token"):
        decode_access_token(tampered_token)


def test_decode_rejects_expired_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret-with-at-least-32-characters")
    expired_token = jwt.encode(
        {
            "sub": "user-1",
            "organization_id": "org-1",
            "roles": ["admin"],
            "exp": datetime.now(UTC) - timedelta(minutes=1),
        },
        os.environ["JWT_SECRET"],
        algorithm=settings.jwt_algorithm,
    )

    with pytest.raises(ValueError, match="Invalid access token"):
        decode_access_token(expired_token)


async def test_current_principal_extracts_token_claims(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret-with-at-least-32-characters")
    token = create_access_token(
        "user-1",
        "org-1",
        ["admin", "reviewer"],
        email="user@example.com",
        full_name="Amina Manager",
        organization_slug="acme",
        organization_name="Acme Relief",
    )
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    principal = await get_current_principal(credentials)

    assert principal.user_id == "user-1"
    assert principal.organization_id == "org-1"
    assert principal.email == "user@example.com"
    assert principal.full_name == "Amina Manager"
    assert principal.organization_slug == "acme"
    assert principal.organization_name == "Acme Relief"
    assert principal.roles == ["admin", "reviewer"]
    assert "users.view" in principal.permissions
    assert "dashboard" in principal.menu_views
    assert principal.scope_type == "country"


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


async def test_tenant_creation_requires_platform_super_admin_even_when_owner_has_manage_permission() -> None:
    principal = CurrentPrincipal(user_id="owner-1", organization_id="org-1", roles=["owner"])

    assert has_permission(principal.roles, Permission.ORGANIZATION_MANAGE)
    assert has_permission(principal.roles, Permission.USER_CREATE)

    with pytest.raises(HTTPException) as exc_info:
        await require_role("super_admin")(principal)

    assert exc_info.value.status_code == 403


def test_platform_only_roles_are_hidden_from_tenant_administrators() -> None:
    tenant_roles = assignable_role_definitions(["owner"])
    platform_roles = assignable_role_definitions(["super_admin"])

    assert "super_admin" not in tenant_roles
    assert "owner" not in tenant_roles
    assert "super_admin" in platform_roles
    assert not is_assignable_role("super_admin", ["owner"])
    assert is_assignable_role("super_admin", ["super_admin"])
    assert is_assignable_role("me_manager", ["owner"])
    assert is_assignable_role("data_analyst", ["me_manager"])
    assert not is_assignable_role("regional_manager", ["me_manager"])


def test_organization_owner_can_manage_hierarchy_and_open_workforce_center() -> None:
    assert has_permission(["owner"], Permission.ORGANIZATION_HIERARCHY_MANAGE)
    assert has_permission(["organization_owner"], Permission.ORGANIZATION_HIERARCHY_MANAGE)
    assert "workforce" in menu_views_for_roles(["owner"])


def test_role_scope_assignment_cannot_exceed_role_level() -> None:
    assert is_scope_allowed_for_role("me_manager", ScopeType.PROJECT)
    assert is_scope_allowed_for_role("me_manager", ScopeType.OWN)
    assert not is_scope_allowed_for_role("me_manager", ScopeType.ORGANIZATION)
    assert is_scope_allowed_for_role("national_admin", ScopeType.REGION)
    assert not is_scope_allowed_for_role("field_officer", ScopeType.DISTRICT)


async def test_require_permission_accepts_alias_and_canonical_roles() -> None:
    principal = CurrentPrincipal(user_id="user-1", organization_id="org-1", roles=["regional_manager"])

    authorized = await require_permission(Permission.SUBMISSION_APPROVE)(principal)

    assert authorized == principal
    assert has_permission(["organization_admin"], "forms.publish")


async def test_require_permission_rejects_missing_permission() -> None:
    principal = CurrentPrincipal(user_id="user-1", organization_id="org-1", roles=["donor_viewer"])

    with pytest.raises(HTTPException) as exc_info:
        await require_permission(Permission.USER_MANAGE)(principal)

    assert exc_info.value.status_code == 403


def test_scope_authorization_limits_project_and_geography() -> None:
    regional_scope = AccessScope(scope_type=ScopeType.REGION, geography_ids=frozenset({"northwest"}))
    project_scope = AccessScope(scope_type=ScopeType.PROJECT, project_ids=frozenset({"project-1"}))

    assert is_scope_authorized(scope=regional_scope, target_geography_id="northwest")
    assert not is_scope_authorized(scope=regional_scope, target_geography_id="littoral")
    assert is_scope_authorized(scope=project_scope, target_project_id="project-1")
    assert not is_scope_authorized(scope=project_scope, target_project_id="project-2")


class FakeOrganizationGovernanceRepository:
    async def get_user_access_context(self, organization_id: object, user_id: object) -> tuple[list[str], object]:
        grant = SimpleNamespace(
            scope_type="district",
            geography_id="district-default",
            project_id=None,
            organization_unit_id=None,
        )
        return ["district_supervisor"], grant


async def test_organization_governance_simulates_permission_and_scope() -> None:
    service = object.__new__(OrganizationGovernanceService)
    service.repository = cast(Any, FakeOrganizationGovernanceRepository())

    allowed = await service.simulate_access(
        uuid4(),
        AccessSimulationRequest(
            user_id=uuid4(),
            permission="submissions.approve",
            geography_id="district-default",
        ),
    )
    denied = await service.simulate_access(
        uuid4(),
        AccessSimulationRequest(
            user_id=uuid4(),
            permission="data.export",
            geography_id="other-district",
        ),
    )

    assert allowed.allowed
    assert allowed.decision == "allow"
    assert denied.decision == "deny"
    assert "does not cover" in denied.reasons[-1]


class FakeUserRepository:
    def __init__(
        self,
        identity: tuple[object, object, object, object, list[object]] | None,
        platform_identity: tuple[object, object, object, object, list[object]] | None = None,
    ) -> None:
        self.identity = identity
        self.platform_identity = platform_identity

    async def find_for_login(
        self,
        email: str,
        organization_slug: str,
    ) -> tuple[object, object, object, object, list[object]] | None:
        return self.identity

    async def find_platform_admin_for_user(
        self,
        user_id: object,
    ) -> tuple[object, object, object, object, list[object]] | None:
        return self.platform_identity


def build_identity(
    *,
    password_hash: str,
    user_id: object | None = None,
    organization_name: str = "Acme Relief",
    organization_slug: str = "acme",
    user_active: bool = True,
    organization_active: bool = True,
    membership_active: bool = True,
    role_name: str = "collector",
    grants: list[object] | None = None,
) -> tuple[object, object, object, object, list[object]]:
    user = SimpleNamespace(
        id=user_id or uuid4(),
        email="user@example.com",
        full_name="Amina Manager",
        password_hash=password_hash,
        is_active=user_active,
    )
    organization = SimpleNamespace(id=uuid4(), name=organization_name, slug=organization_slug, is_active=organization_active)
    membership = SimpleNamespace(is_active=membership_active)
    role = SimpleNamespace(name=role_name, permissions="")
    return user, organization, membership, role, grants or []


async def test_auth_service_issues_role_scoped_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret-with-at-least-32-characters")
    password_hash = hash_password("correct horse battery staple")
    service = object.__new__(AuthService)
    service.users = cast(Any, FakeUserRepository(build_identity(password_hash=password_hash, role_name="admin")))

    token_response = await service.login(
        email="user@example.com",
        password="correct horse battery staple",
        organization_slug="acme",
    )

    payload = decode_access_token(token_response.access_token)
    assert token_response.token_type == "bearer"
    assert payload["roles"] == ["admin"]
    assert payload["email"] == "user@example.com"
    assert payload["full_name"] == "Amina Manager"
    assert payload["organization_slug"] == "acme"
    assert payload["organization_name"] == "Acme Relief"
    assert payload["scope_type"] == "country"
    assert payload["sub"]
    assert payload["organization_id"]


async def test_auth_service_prefers_platform_identity_for_super_admin(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret-with-at-least-32-characters")
    password_hash = hash_password("correct horse battery staple")
    user_id = uuid4()
    tenant_identity = build_identity(
        password_hash=password_hash,
        user_id=user_id,
        organization_name="Tenant Program",
        organization_slug="tenant-program",
        role_name="owner",
    )
    platform_identity = build_identity(
        password_hash=password_hash,
        user_id=user_id,
        organization_name="Atlas FieldOps Platform",
        organization_slug="atlas-platform",
        role_name="super_admin",
    )
    service = object.__new__(AuthService)
    service.users = cast(
        Any,
        FakeUserRepository(tenant_identity, platform_identity=platform_identity),
    )

    token_response = await service.login(
        email="user@example.com",
        password="correct horse battery staple",
        organization_slug="tenant-program",
    )

    payload = decode_access_token(token_response.access_token)
    assert payload["roles"] == ["super_admin"]
    assert payload["platform_admin"] is True
    assert payload["support_mode"] is False
    assert payload["organization_slug"] == "atlas-platform"
    assert payload["organization_name"] == "Atlas FieldOps Platform"
    assert payload["platform_organization_slug"] == "atlas-platform"
    assert payload["scope_type"] == "global"


async def test_auth_service_includes_persisted_access_grants(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret-with-at-least-32-characters")
    password_hash = hash_password("correct horse battery staple")
    grant = SimpleNamespace(
        scope_type="region",
        geography_id="northwest",
        project_id="project-1",
        organization_unit_id=uuid4(),
    )
    service = object.__new__(AuthService)
    service.users = cast(
        Any,
        FakeUserRepository(build_identity(password_hash=password_hash, role_name="regional_manager", grants=[grant])),
    )

    token_response = await service.login(
        email="user@example.com",
        password="correct horse battery staple",
        organization_slug="acme",
    )

    payload = decode_access_token(token_response.access_token)
    assert payload["scope_type"] == "region"
    assert payload["geography_ids"] == ["northwest"]
    assert payload["project_ids"] == ["project-1"]
    assert payload["organization_unit_ids"] == [str(grant.organization_unit_id)]


async def test_auth_service_field_officer_token_can_use_mobile(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret-with-at-least-32-characters")
    password_hash = hash_password("correct horse battery staple")
    service = object.__new__(AuthService)
    service.users = cast(
        Any,
        FakeUserRepository(build_identity(password_hash=password_hash, role_name="field_officer")),
    )

    token_response = await service.login(
        email="user@example.com",
        password="correct horse battery staple",
        organization_slug="acme",
    )

    payload = decode_access_token(token_response.access_token)
    assert payload["roles"] == ["field_officer"]
    assert payload["scope_type"] == "own"
    assert "sync.mobile" in payload["permissions"]
    assert "officers.view" in payload["permissions"]
    assert "forms.view" in payload["permissions"]
    assert "submissions.create" in payload["permissions"]


class FakeIdentityForUserCreation:
    def __init__(self) -> None:
        self.user = SimpleNamespace(
            id=uuid4(),
            email="field.officer@example.com",
            full_name="Field Officer Test",
            is_active=True,
        )
        self.membership = SimpleNamespace(is_active=True)
        self.grant = SimpleNamespace(
            scope_type="own",
            geography_id=None,
            project_id=None,
            organization_unit_id=None,
        )

    async def get_by_email(self, email: object) -> object | None:
        return None

    async def create_user(self, *, email: str, password_hash: str, full_name: str) -> object:
        self.user.email = email
        self.user.password_hash = password_hash
        self.user.full_name = full_name
        return self.user

    async def add_membership(self, *, organization_id: object, user_id: object, role_id: object) -> object:
        return self.membership

    async def add_access_grant(self, **_kwargs: object) -> object:
        return self.grant

    async def get_user_account(self, *, organization_id: object, user_id: object) -> tuple[object, object, object, object] | None:
        return self.user, self.membership, SimpleNamespace(name="field_officer"), self.grant


class FakeRolesForFieldOfficerCreation:
    async def get_by_name(self, *, organization_id: object, name: str) -> object | None:
        if name == "field_officer":
            return SimpleNamespace(id=uuid4(), name="field_officer")
        return None


class FakeOrganizationsForFieldOfficerCreation:
    async def get(self, organization_id: object) -> object:
        return SimpleNamespace(id=organization_id, name="Acme Relief", slug="acme")


class FakeFieldOfficerProfilesForUserCreation:
    def __init__(self) -> None:
        self.created: list[dict[str, object]] = []

    async def get_for_user(self, *, organization_id: object, user_id: object) -> object | None:
        return None

    async def create_profile(self, **kwargs: object) -> object:
        self.created.append(kwargs)
        return SimpleNamespace(id=uuid4(), **kwargs)


class FakeAuditForFieldOfficerCreation:
    async def append(self, **_kwargs: object) -> None:
        return None


class FakeEventPublisher:
    async def publish(self, *_args: object, **_kwargs: object) -> None:
        return None


async def test_web_created_field_officer_gets_mobile_profile(monkeypatch: pytest.MonkeyPatch) -> None:
    import app.services.identity as identity_service_module

    monkeypatch.setattr(identity_service_module, "event_publisher", FakeEventPublisher())
    service = object.__new__(UserManagementService)
    service.identity = FakeIdentityForUserCreation()
    service.organizations = FakeOrganizationsForFieldOfficerCreation()
    service.field_officers = FakeFieldOfficerProfilesForUserCreation()
    service.roles = FakeRolesForFieldOfficerCreation()
    service.audit = FakeAuditForFieldOfficerCreation()
    organization_id = uuid4()

    created = await service.create_user(
        organization_id=organization_id,
        actor_user_id=uuid4(),
        actor_roles=["owner"],
        payload=UserCreate(
            email="field.officer@example.com",
            password="CorrectHorse123!",
            full_name="Field Officer Test",
            role_name="field_officer",
        ),
    )

    assert created.role_name == "field_officer"
    assert created.login_slug == "acme"
    assert len(service.field_officers.created) == 1
    assert service.field_officers.created[0]["organization_id"] == organization_id
    assert service.field_officers.created[0]["user_id"] == service.identity.user.id


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
    identity: tuple[object, object, object, object, list[object]] | None,
    password: str,
) -> None:
    service = object.__new__(AuthService)
    service.users = cast(Any, FakeUserRepository(identity))

    with pytest.raises(AuthenticationError):
        await service.login(email="user@example.com", password=password, organization_slug="acme")
