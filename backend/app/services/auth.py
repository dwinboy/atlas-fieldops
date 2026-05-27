from sqlalchemy.ext.asyncio import AsyncSession

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
        user, organization, membership, role = identity
        if not user.is_active or not organization.is_active or not membership.is_active:
            raise AuthenticationError("Inactive account")
        if not verify_password(password, user.password_hash):
            raise AuthenticationError("Invalid credentials")
        token = create_access_token(
            subject=str(user.id),
            organization_id=str(organization.id),
            roles=[role.name],
        )
        return TokenResponse(access_token=token)
