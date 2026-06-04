from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import default_scope_for_roles
from app.core.security import create_access_token, verify_password
from app.repositories.users import UserRepository
from app.schemas.auth import TokenResponse


class AuthenticationError(Exception):
    pass


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.users = UserRepository(session)

    async def login(self, *, email: str, password: str, organization_slug: str) -> TokenResponse:
        identity = await self.users.find_for_login(email=email, organization_slug=organization_slug)
        if identity is None:
            raise AuthenticationError("Invalid credentials")
        user, organization, membership, role, grants = identity
        if not user.is_active or not organization.is_active or not membership.is_active:
            raise AuthenticationError("Inactive account")
        if not verify_password(password, user.password_hash):
            raise AuthenticationError("Invalid credentials")
        primary_grant = grants[0] if grants else None
        scope_type = primary_grant.scope_type if primary_grant is not None else default_scope_for_roles([role.name]).value
        token = create_access_token(
            subject=str(user.id),
            organization_id=str(organization.id),
            roles=[role.name],
            email=user.email,
            full_name=user.full_name,
            organization_slug=organization.slug,
            organization_name=organization.name,
            scope_type=scope_type,
            geography_ids=[grant.geography_id for grant in grants if grant.geography_id],
            project_ids=[grant.project_id for grant in grants if grant.project_id],
            organization_unit_ids=[str(grant.organization_unit_id) for grant in grants if grant.organization_unit_id],
        )
        return TokenResponse(access_token=token)
