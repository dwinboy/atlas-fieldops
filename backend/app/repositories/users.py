from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.identity import Membership, Organization, Role, User, UserAccessGrant, UserRoleAssignment

UserIdentity = tuple[User, Organization, Membership, Role, list[UserAccessGrant], list[tuple[UserRoleAssignment, Role]]]


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def find_for_login(
        self,
        email: str,
        organization_slug: str,
    ) -> UserIdentity | None:
        statement = (
            select(User, Organization, Membership, Role)
            .join(Membership, Membership.user_id == User.id)
            .join(Organization, Organization.id == Membership.organization_id)
            .join(Role, Role.id == Membership.role_id)
            .where(
                User.email == email,
                Organization.slug == organization_slug,
                User.deleted_at.is_(None),
                User.is_active.is_(True),
                Organization.deleted_at.is_(None),
                Organization.is_active.is_(True),
                Membership.deleted_at.is_(None),
                Membership.is_active.is_(True),
                Role.deleted_at.is_(None),
            )
        )
        result = await self.session.execute(statement)
        row = result.first()
        if row is None:
            return None
        user, organization, membership, role = row.tuple()
        grants = await self._access_grants(organization_id=organization.id, user_id=user.id)
        assignments = await self._role_assignments(organization_id=organization.id, user_id=user.id)
        return user, organization, membership, role, grants, assignments

    async def _access_grants(self, *, organization_id: UUID, user_id: UUID) -> list[UserAccessGrant]:
        grants_result = await self.session.execute(
            select(UserAccessGrant).where(
                UserAccessGrant.organization_id == organization_id,
                UserAccessGrant.user_id == user_id,
                UserAccessGrant.deleted_at.is_(None),
            )
        )
        return list(grants_result.scalars())

    async def _role_assignments(self, *, organization_id: UUID, user_id: UUID) -> list[tuple[UserRoleAssignment, Role]]:
        assignment_result = await self.session.execute(
            select(UserRoleAssignment, Role)
            .join(Role, Role.id == UserRoleAssignment.role_id)
            .where(
                UserRoleAssignment.organization_id == organization_id,
                UserRoleAssignment.user_id == user_id,
                UserRoleAssignment.deleted_at.is_(None),
                UserRoleAssignment.is_active.is_(True),
                Role.deleted_at.is_(None),
            )
            .order_by(UserRoleAssignment.created_at)
        )
        return list(assignment_result.tuples().all())

    async def find_for_token(
        self,
        user_id: UUID,
        organization_id: UUID,
    ) -> UserIdentity | None:
        statement = (
            select(User, Organization, Membership, Role)
            .join(Membership, Membership.user_id == User.id)
            .join(Organization, Organization.id == Membership.organization_id)
            .join(Role, Role.id == Membership.role_id)
            .where(
                User.id == user_id,
                Organization.id == organization_id,
                User.deleted_at.is_(None),
                User.is_active.is_(True),
                Organization.deleted_at.is_(None),
                Organization.is_active.is_(True),
                Membership.deleted_at.is_(None),
                Membership.is_active.is_(True),
                Role.deleted_at.is_(None),
            )
        )
        result = await self.session.execute(statement)
        row = result.first()
        if row is None:
            return None
        user, organization, membership, role = row.tuple()
        grants = await self._access_grants(organization_id=organization.id, user_id=user.id)
        assignments = await self._role_assignments(organization_id=organization.id, user_id=user.id)
        return user, organization, membership, role, grants, assignments

    async def find_platform_admin_for_user(
        self,
        user_id: UUID,
    ) -> UserIdentity | None:
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
        grants = await self._access_grants(organization_id=organization.id, user_id=user.id)
        assignments = await self._role_assignments(organization_id=organization.id, user_id=user.id)
        return user, organization, membership, role, grants, assignments
