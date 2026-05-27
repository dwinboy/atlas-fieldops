from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.events import event_publisher
from app.core.permissions import ROLE_PERMISSIONS
from app.core.security import hash_password
from app.models.identity import User
from app.repositories.audit import AuditRepository
from app.repositories.identity import IdentityRepository, OrganizationRepository, RoleRepository
from app.schemas.identity import OrganizationCreate, UserCreate


class IdentityConflictError(Exception):
    pass


class IdentityNotFoundError(Exception):
    pass


class OrganizationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.organizations = OrganizationRepository(session)
        self.roles = RoleRepository(session)
        self.audit = AuditRepository(session)

    async def create_organization(self, payload: OrganizationCreate) -> object:
        existing = await self.organizations.get_by_slug(payload.slug)
        if existing is not None:
            raise IdentityConflictError("Organization slug already exists")
        organization = await self.organizations.create(name=payload.name, slug=payload.slug)
        for role_name, permissions in ROLE_PERMISSIONS.items():
            await self.roles.create(
                organization_id=organization.id,
                name=role_name,
                permissions=[permission.value for permission in permissions],
            )
        await self.audit.append(
            organization_id=organization.id,
            actor_user_id=None,
            action="organization.created",
            resource_type="organization",
            resource_id=str(organization.id),
            metadata={"slug": organization.slug},
        )
        await event_publisher.publish(
            settings.kafka_auth_events_topic,
            {"type": "organization.created", "organization_id": str(organization.id), "slug": organization.slug},
        )
        return organization


class UserManagementService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.identity = IdentityRepository(session)
        self.organizations = OrganizationRepository(session)
        self.roles = RoleRepository(session)
        self.audit = AuditRepository(session)

    async def create_user(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        payload: UserCreate,
    ) -> object:
        role = await self.roles.get_by_name(organization_id=organization_id, name=payload.role_name)
        if role is None:
            raise IdentityNotFoundError("Role not found")
        user = await self.identity.create_user(
            email=payload.email,
            password_hash=hash_password(payload.password),
            full_name=payload.full_name,
        )
        await self.identity.add_membership(organization_id=organization_id, user_id=user.id, role_id=role.id)
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="user.created",
            resource_type="user",
            resource_id=str(user.id),
            metadata={"email": user.email, "role": role.name},
        )
        await event_publisher.publish(
            settings.kafka_auth_events_topic,
            {"type": "user.created", "organization_id": str(organization_id), "user_id": str(user.id)},
        )
        return user

    async def list_users(self, organization_id: UUID) -> list[User]:
        return await self.identity.list_users(organization_id)
