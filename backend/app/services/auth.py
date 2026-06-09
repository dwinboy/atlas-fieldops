import base64
import hashlib
import hmac
import json
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import canonical_role
from app.core.permissions import default_scope_for_roles
from app.core.permissions import normalize_permission
from app.core.permissions import permissions_for_roles
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_refresh_token, get_jwt_secret, verify_password
from app.models.collection import FieldOfficerProfile
from app.models.identity import Organization, Role, User, UserAccessGrant, UserRoleAssignment
from app.repositories.users import UserRepository
from app.schemas.auth import TokenResponse


class AuthenticationError(Exception):
    pass


MOBILE_QR_LOGIN_TYPE = "atlas_fieldops_mobile_field_officer_login"
MOBILE_QR_LOGIN_PREFIX = "afqr"


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)

    async def login(self, *, email: str, password: str, organization_slug: str) -> TokenResponse:
        identity = await self.users.find_for_login(email=email, organization_slug=organization_slug)
        if identity is None:
            raise AuthenticationError("Invalid credentials")
        user, organization, membership, role, grants, assignments = identity
        if not user.is_active or not membership.is_active:
            raise AuthenticationError("Inactive account")
        if not verify_password(password, user.password_hash):
            raise AuthenticationError("Invalid credentials")
        platform_identity = await self.users.find_platform_admin_for_user(user.id)
        if platform_identity is not None:
            platform_user, platform_organization, platform_membership, platform_role, platform_grants, platform_assignments = platform_identity
            if not platform_organization.is_active or not platform_membership.is_active:
                raise AuthenticationError("Inactive platform account")
            user = platform_user
            organization = platform_organization
            membership = platform_membership
            role = platform_role
            grants = platform_grants
            assignments = platform_assignments
        if not organization.is_active:
            raise AuthenticationError("Inactive account")
        return self._issue_token_response(user, organization, role, grants, assignments)

    async def login_with_mobile_qr(self, qr_token: str) -> TokenResponse:
        payload = self._decode_mobile_qr_token(qr_token)
        try:
            user_id = UUID(str(payload.get("user_id")))
            organization_id = UUID(str(payload.get("organization_id")))
            field_officer_id = UUID(str(payload.get("field_officer_id")))
        except Exception as exc:
            raise AuthenticationError("Invalid mobile QR code") from exc

        identity = await self.users.find_for_token(user_id=user_id, organization_id=organization_id)
        if identity is None:
            raise AuthenticationError("Invalid mobile QR code")
        user, organization, membership, role, grants, assignments = identity
        if not user.is_active or not membership.is_active or not organization.is_active:
            raise AuthenticationError("Inactive account")
        if payload.get("credential_version") != self._credential_version(user):
            raise AuthenticationError("Mobile QR code expired")
        profile_result = await self.session.execute(
            select(FieldOfficerProfile).where(
                FieldOfficerProfile.id == field_officer_id,
                FieldOfficerProfile.organization_id == organization_id,
                FieldOfficerProfile.user_id == user_id,
                FieldOfficerProfile.deleted_at.is_(None),
                FieldOfficerProfile.is_active.is_(True),
            )
        )
        profile = profile_result.scalar_one_or_none()
        if profile is None:
            raise AuthenticationError("Mobile QR code is not assigned to an active field officer")
        active_roles = {canonical_role(assignment_role.name) for _assignment, assignment_role in assignments} | {canonical_role(role.name)}
        if "field_officer" not in active_roles:
            raise AuthenticationError("Mobile QR code is only available for field officers")
        return self._issue_token_response(user, organization, role, grants, assignments)

    async def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_refresh_token(refresh_token)
            user_id = UUID(str(payload.get("sub")))
            organization_id = UUID(str(payload.get("organization_id")))
        except Exception as exc:
            raise AuthenticationError("Invalid refresh token") from exc
        identity = await self.users.find_for_token(user_id=user_id, organization_id=organization_id)
        if identity is None:
            raise AuthenticationError("Invalid refresh token")
        user, organization, membership, role, grants, assignments = identity
        if not user.is_active or not membership.is_active or not organization.is_active:
            raise AuthenticationError("Inactive account")
        return self._issue_token_response(user, organization, role, grants, assignments)

    def create_mobile_qr_login_payload(self, *, profile: FieldOfficerProfile, user: User) -> str:
        token_payload = {
            "type": MOBILE_QR_LOGIN_TYPE,
            "organization_id": str(profile.organization_id),
            "user_id": str(user.id),
            "field_officer_id": str(profile.id),
            "credential_version": self._credential_version(user),
        }
        token = self._encode_mobile_qr_token(token_payload)
        return f"atlasfieldops://mobile-login?token={token}"

    @staticmethod
    def _credential_version(user: User) -> str:
        return hashlib.sha256(user.password_hash.encode("utf-8")).hexdigest()[:24]

    @staticmethod
    def _base64_url_encode(value: bytes) -> str:
        return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")

    @staticmethod
    def _base64_url_decode(value: str) -> bytes:
        padding = "=" * (-len(value) % 4)
        return base64.urlsafe_b64decode(f"{value}{padding}".encode("utf-8"))

    def _encode_mobile_qr_token(self, payload: dict[str, str]) -> str:
        payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        encoded_payload = self._base64_url_encode(payload_bytes)
        signature = hmac.new(
            get_jwt_secret().encode("utf-8"),
            encoded_payload.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        encoded_signature = self._base64_url_encode(signature)
        return f"{MOBILE_QR_LOGIN_PREFIX}.{encoded_payload}.{encoded_signature}"

    def _decode_mobile_qr_token(self, qr_token: str) -> dict[str, str]:
        token = self._extract_mobile_qr_token(qr_token)
        parts = token.split(".")
        if len(parts) != 3 or parts[0] != MOBILE_QR_LOGIN_PREFIX:
            raise AuthenticationError("Invalid mobile QR code")
        _prefix, encoded_payload, encoded_signature = parts
        expected_signature = hmac.new(
            get_jwt_secret().encode("utf-8"),
            encoded_payload.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        provided_signature = self._base64_url_decode(encoded_signature)
        if not hmac.compare_digest(expected_signature, provided_signature):
            raise AuthenticationError("Invalid mobile QR code")
        try:
            payload = json.loads(self._base64_url_decode(encoded_payload).decode("utf-8"))
        except Exception as exc:
            raise AuthenticationError("Invalid mobile QR code") from exc
        if not isinstance(payload, dict) or payload.get("type") != MOBILE_QR_LOGIN_TYPE:
            raise AuthenticationError("Invalid mobile QR code")
        return {str(key): str(value) for key, value in payload.items()}

    @staticmethod
    def _extract_mobile_qr_token(qr_token: str) -> str:
        value = qr_token.strip()
        if not value:
            raise AuthenticationError("Invalid mobile QR code")
        if value.startswith("{"):
            try:
                data = json.loads(value)
            except Exception as exc:
                raise AuthenticationError("Invalid mobile QR code") from exc
            token = data.get("token") or data.get("qr_token") or data.get("qrToken")
            if isinstance(token, str):
                return token.strip()
        if "token=" in value:
            return value.split("token=", 1)[1].split("&", 1)[0].strip()
        return value

    def _issue_token_response(
        self,
        user: User,
        organization: Organization,
        role: Role,
        grants: list[UserAccessGrant],
        assignments: list[tuple[UserRoleAssignment, Role]],
    ) -> TokenResponse:
        assignment_roles = [assignment_role for _assignment, assignment_role in assignments]
        role_names = sorted({role.name, *(assignment_role.name for assignment_role in assignment_roles)})
        primary_assignment = assignments[0][0] if assignments else None
        primary_grant = grants[0] if grants else None
        scope_type = (
            primary_assignment.scope_type
            if primary_assignment is not None
            else primary_grant.scope_type
            if primary_grant is not None
            else default_scope_for_roles(role_names).value
        )
        is_platform_admin = any(canonical_role(role_name) == "super_admin" for role_name in role_names)
        stored_permissions = {
            normalized.value
            for permission in ",".join([role.permissions or "", *(assignment_role.permissions or "" for assignment_role in assignment_roles)]).split(",")
            if (normalized := normalize_permission(permission.strip())) is not None
        }
        effective_permissions = sorted({permission.value for permission in permissions_for_roles(role_names)} | stored_permissions)
        geography_ids = sorted(
            {
                *(grant.geography_id for grant in grants if grant.geography_id),
                *(assignment.geography_id for assignment, _assignment_role in assignments if assignment.geography_id),
            }
        )
        project_ids = sorted(
            {
                *(grant.project_id for grant in grants if grant.project_id),
                *(assignment.project_id for assignment, _assignment_role in assignments if assignment.project_id),
            }
        )
        organization_unit_ids = sorted(
            {
                *(str(grant.organization_unit_id) for grant in grants if grant.organization_unit_id),
                *(str(assignment.organization_unit_id) for assignment, _assignment_role in assignments if assignment.organization_unit_id),
                *(str(assignment.team_id) for assignment, _assignment_role in assignments if assignment.team_id),
            }
        )
        role_assignments = [
            {
                "id": str(assignment.id),
                "role_name": assignment_role.name,
                "scope_type": assignment.scope_type,
                "geography_id": assignment.geography_id,
                "project_id": assignment.project_id,
                "organization_unit_id": str(assignment.organization_unit_id) if assignment.organization_unit_id else None,
                "team_id": str(assignment.team_id) if assignment.team_id else None,
                "is_active": assignment.is_active,
            }
            for assignment, assignment_role in assignments
        ]
        token = create_access_token(
            subject=str(user.id),
            organization_id=str(organization.id),
            roles=role_names,
            email=user.email,
            full_name=user.full_name,
            organization_slug=organization.slug,
            organization_name=organization.name,
            platform_admin=is_platform_admin,
            platform_organization_id=str(organization.id) if is_platform_admin else None,
            platform_organization_slug=organization.slug if is_platform_admin else None,
            scope_type=scope_type,
            permissions=effective_permissions,
            geography_ids=geography_ids,
            project_ids=project_ids,
            organization_unit_ids=organization_unit_ids,
            role_assignments=role_assignments,
        )
        refresh = create_refresh_token(
            subject=str(user.id),
            organization_id=str(organization.id),
            email=user.email,
            organization_slug=organization.slug,
        )
        return TokenResponse(
            access_token=token,
            refresh_token=refresh,
            expires_in=settings.access_token_expire_minutes * 60,
        )
