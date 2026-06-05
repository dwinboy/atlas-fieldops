from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.identity import Membership, Organization, Role, User, UserAccessGrant


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def find_for_login(
        self,
        email: str,
        organization_slug: str,
    ) -> tuple[User, Organization, Membership, Role, list[UserAccessGrant]] | None:
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
        grants_result = await self.session.execute(
            select(UserAccessGrant).where(
                UserAccessGrant.organization_id == organization.id,
                UserAccessGrant.user_id == user.id,
                UserAccessGrant.deleted_at.is_(None),
            )
        )
        grants = list(grants_result.scalars())
        return user, organization, membership, role, grants

    async def find_platform_admin_for_user(
        self,
        user_id: UUID,
    ) -> tuple[User, Organization, Membership, Role, list[UserAccessGrant]] | None:
        statement = (
            select(User, Organization, Membership, Role)
            .join(Membership, Membership.user_id == User.id)
            .join(Organization, Organization.id == Membership.organization_id)
            .join(Role, Role.id == Membership.role_id)
            .where(
                User.id == user_id,
                Role.name == "super_admin",
                User.deleted_at.is_(None),
                Organization.deleted_at.is_(None),
                Membership.deleted_at.is_(None),
                Role.deleted_at.is_(None),
            )
        )
        result = await self.session.execute(statement)
        row = result.first()
        if row is None:
            return None
        user, organization, membership, role = row.tuple()
        grants_result = await self.session.execute(
            select(UserAccessGrant).where(
                UserAccessGrant.organization_id == organization.id,
                UserAccessGrant.user_id == user.id,
                UserAccessGrant.deleted_at.is_(None),
            )
        )
        grants = list(grants_result.scalars())
        return user, organization, membership, role, grants
