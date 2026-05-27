from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.identity import Membership, Organization, Role, User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def find_for_login(
        self,
        email: str,
        organization_slug: str,
    ) -> tuple[User, Organization, Membership, Role] | None:
        statement = (
            select(User, Organization, Membership, Role)
            .join(Membership, Membership.user_id == User.id)
            .join(Organization, Organization.id == Membership.organization_id)
            .join(Role, Role.id == Membership.role_id)
            .where(User.email == email, Organization.slug == organization_slug)
        )
        result = await self.session.execute(statement)
        row = result.first()
        if row is None:
            return None
        user, organization, membership, role = row.tuple()
        return user, organization, membership, role
