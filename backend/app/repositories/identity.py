from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import RoleDefinition, ScopeType
from app.models.identity import Membership, Organization, Role, User, UserAccessGrant
from app.models.operations import OrganizationalUnit


class OrganizationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, *, name: str, slug: str) -> Organization:
        organization = Organization(name=name, slug=slug)
        self.session.add(organization)
        await self.session.flush()
        return organization

    async def get(self, organization_id: UUID) -> Organization | None:
        result = await self.session.execute(
            select(Organization).where(Organization.id == organization_id, Organization.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Organization | None:
        result = await self.session.execute(
            select(Organization).where(Organization.slug == slug, Organization.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list_all(self) -> list[Organization]:
        result = await self.session.execute(
            select(Organization).where(Organization.deleted_at.is_(None)).order_by(Organization.name)
        )
        return list(result.scalars())

    async def count_users(self, organization_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count(Membership.user_id)).where(
                Membership.organization_id == organization_id,
                Membership.deleted_at.is_(None),
            )
        )
        return int(result.scalar_one())

    async def owner_email(self, organization_id: UUID) -> str | None:
        result = await self.session.execute(
            select(User.email)
            .join(Membership, Membership.user_id == User.id)
            .join(Role, Role.id == Membership.role_id)
            .where(
                Membership.organization_id == organization_id,
                Membership.deleted_at.is_(None),
                User.deleted_at.is_(None),
                Role.deleted_at.is_(None),
                Role.name.in_(["owner", "organization_owner"]),
            )
            .order_by(User.created_at)
            .limit(1)
        )
        return result.scalar_one_or_none()


class RoleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        organization_id: UUID,
        name: str,
        permissions: list[str],
        label: str = "",
        description: str = "",
        scope_type: str = "organization",
        is_system: bool = False,
    ) -> Role:
        role = Role(
            organization_id=organization_id,
            name=name,
            label=label or name.replace("_", " ").title(),
            description=description,
            scope_type=scope_type,
            is_system=is_system,
            permissions=",".join(sorted(permissions)),
        )
        self.session.add(role)
        await self.session.flush()
        return role

    async def create_from_definition(self, *, organization_id: UUID, definition: RoleDefinition) -> Role:
        return await self.create(
            organization_id=organization_id,
            name=definition.name,
            label=definition.label,
            description=definition.description,
            scope_type=definition.scope_type.value,
            permissions=[permission.value for permission in definition.permissions],
            is_system=True,
        )

    async def get_by_name(self, *, organization_id: UUID, name: str) -> Role | None:
        result = await self.session.execute(
            select(Role).where(
                Role.organization_id == organization_id,
                Role.name == name,
                Role.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_for_organization(self, organization_id: UUID) -> list[Role]:
        result = await self.session.execute(
            select(Role).where(Role.organization_id == organization_id, Role.deleted_at.is_(None)).order_by(Role.name)
        )
        return list(result.scalars())


class IdentityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_user(self, *, email: str, password_hash: str, full_name: str) -> User:
        user = User(email=email, password_hash=password_hash, full_name=full_name)
        self.session.add(user)
        await self.session.flush()
        return user

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.email == email, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def add_membership(self, *, organization_id: UUID, user_id: UUID, role_id: UUID) -> Membership:
        membership = Membership(organization_id=organization_id, user_id=user_id, role_id=role_id)
        self.session.add(membership)
        await self.session.flush()
        return membership

    async def add_access_grant(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
        scope_type: ScopeType,
        geography_id: str | None = None,
        project_id: str | None = None,
        organization_unit_id: UUID | None = None,
    ) -> UserAccessGrant:
        grant = UserAccessGrant(
            organization_id=organization_id,
            user_id=user_id,
            scope_type=scope_type.value,
            geography_id=geography_id,
            project_id=project_id,
            organization_unit_id=organization_unit_id,
        )
        self.session.add(grant)
        await self.session.flush()
        return grant

    async def get_user_account(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
    ) -> tuple[User, Membership, Role, UserAccessGrant | None] | None:
        result = await self.session.execute(
            select(User, Membership, Role)
            .join(Membership, Membership.user_id == User.id)
            .join(Role, Role.id == Membership.role_id)
            .where(
                User.id == user_id,
                Membership.organization_id == organization_id,
                Membership.deleted_at.is_(None),
                Role.deleted_at.is_(None),
                User.deleted_at.is_(None),
            )
        )
        row = result.one_or_none()
        if row is None:
            return None
        user, membership, role = row
        grant_result = await self.session.execute(
            select(UserAccessGrant)
            .where(
                UserAccessGrant.organization_id == organization_id,
                UserAccessGrant.user_id == user_id,
                UserAccessGrant.deleted_at.is_(None),
            )
            .order_by(UserAccessGrant.updated_at.desc())
            .limit(1)
        )
        return user, membership, role, grant_result.scalar_one_or_none()

    async def list_user_accounts(self, organization_id: UUID) -> list[tuple[User, Membership, Role, UserAccessGrant | None]]:
        result = await self.session.execute(
            select(User, Membership, Role)
            .join(Membership, Membership.user_id == User.id)
            .join(Role, Role.id == Membership.role_id)
            .where(
                Membership.organization_id == organization_id,
                Membership.deleted_at.is_(None),
                Role.deleted_at.is_(None),
                User.deleted_at.is_(None),
            )
            .order_by(User.email)
        )
        accounts: list[tuple[User, Membership, Role, UserAccessGrant | None]] = []
        for user, membership, role in result.all():
            grant_result = await self.session.execute(
                select(UserAccessGrant)
                .where(
                    UserAccessGrant.organization_id == organization_id,
                    UserAccessGrant.user_id == user.id,
                    UserAccessGrant.deleted_at.is_(None),
                )
                .order_by(UserAccessGrant.updated_at.desc())
                .limit(1)
            )
            accounts.append((user, membership, role, grant_result.scalar_one_or_none()))
        return accounts

    async def list_users(self, organization_id: UUID) -> list[User]:
        return [user for user, _, _, _ in await self.list_user_accounts(organization_id)]

    async def update_user_account(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
        role_id: UUID | None = None,
        full_name: str | None = None,
        is_active: bool | None = None,
        scope_type: ScopeType | None = None,
        geography_id: str | None = None,
        project_id: str | None = None,
        organization_unit_id: UUID | None = None,
    ) -> tuple[User, Membership, Role, UserAccessGrant | None] | None:
        account = await self.get_user_account(organization_id=organization_id, user_id=user_id)
        if account is None:
            return None
        user, membership, role, grant = account
        if full_name is not None:
            user.full_name = full_name
        if is_active is not None:
            user.is_active = is_active
            membership.is_active = is_active
        if role_id is not None:
            membership.role_id = role_id
            role_result = await self.session.execute(select(Role).where(Role.id == role_id))
            next_role = role_result.scalar_one()
            role = next_role
        if scope_type is not None:
            if grant is None:
                grant = UserAccessGrant(
                    organization_id=organization_id,
                    user_id=user_id,
                    scope_type=scope_type.value,
                )
                self.session.add(grant)
            else:
                grant.scope_type = scope_type.value
            grant.geography_id = geography_id
            grant.project_id = project_id
            grant.organization_unit_id = organization_unit_id
        await self.session.flush()
        return user, membership, role, grant

    async def reset_password(self, *, organization_id: UUID, user_id: UUID, password_hash: str) -> User | None:
        account = await self.get_user_account(organization_id=organization_id, user_id=user_id)
        if account is None:
            return None
        user = account[0]
        user.password_hash = password_hash
        await self.session.flush()
        return user


class OrganizationUnitRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        organization_id: UUID,
        name: str,
        code: str,
        unit_type: str,
        parent_id: UUID | None = None,
        geography_code: str | None = None,
    ) -> OrganizationalUnit:
        unit = OrganizationalUnit(
            organization_id=organization_id,
            name=name,
            code=code,
            unit_type=unit_type,
            parent_unit_id=parent_id,
            region=geography_code,
            metadata_json={},
        )
        self.session.add(unit)
        await self.session.flush()
        return unit

    async def list_for_organization(self, organization_id: UUID) -> list[OrganizationalUnit]:
        result = await self.session.execute(
            select(OrganizationalUnit)
            .where(OrganizationalUnit.organization_id == organization_id, OrganizationalUnit.deleted_at.is_(None))
            .order_by(OrganizationalUnit.unit_type, OrganizationalUnit.name)
        )
        return list(result.scalars())

    async def soft_delete_user(self, *, organization_id: UUID, user_id: UUID) -> bool:
        result = await self.session.execute(
            select(User)
            .join(Membership, Membership.user_id == User.id)
            .where(User.id == user_id, Membership.organization_id == organization_id)
        )
        user = result.scalar_one_or_none()
        if user is None:
            return False
        user.deleted_at = datetime.now(UTC)
        user.is_active = False
        await self.session.flush()
        return True
