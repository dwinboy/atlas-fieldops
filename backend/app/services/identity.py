from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.events import event_publisher
from app.core.permissions import ROLE_DEFINITIONS, ScopeType, default_scope_for_roles
from app.core.security import hash_password
from app.models.identity import User
from app.repositories.audit import AuditRepository
from app.repositories.identity import IdentityRepository, OrganizationRepository, OrganizationUnitRepository, RoleRepository
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
        self.units = OrganizationUnitRepository(session)
        self.audit = AuditRepository(session)

    async def create_organization(self, payload: OrganizationCreate) -> object:
        existing = await self.organizations.get_by_slug(payload.slug)
        if existing is not None:
            raise IdentityConflictError("Organization slug already exists")
        organization = await self.organizations.create(name=payload.name, slug=payload.slug)
        for definition in ROLE_DEFINITIONS.values():
            await self.roles.create_from_definition(organization_id=organization.id, definition=definition)
        country = await self.units.create(
            organization_id=organization.id,
            name="National office",
            code="national-office",
            unit_type="country",
            geography_code="country",
        )
        region = await self.units.create(
            organization_id=organization.id,
            name="Default region",
            code="default-region",
            unit_type="region",
            parent_id=country.id,
            geography_code="region-default",
        )
        district = await self.units.create(
            organization_id=organization.id,
            name="Default district",
            code="default-district",
            unit_type="district",
            parent_id=region.id,
            geography_code="district-default",
        )
        await self.units.create(
            organization_id=organization.id,
            name="Default field team",
            code="default-field-team",
            unit_type="field_team",
            parent_id=district.id,
            geography_code="team-default",
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
        scope_type = default_scope_for_roles([role.name])
        if payload.scope_type is not None:
            scope_type = ScopeType(payload.scope_type)
        await self.identity.add_access_grant(
            organization_id=organization_id,
            user_id=user.id,
            scope_type=scope_type,
            geography_id=payload.geography_ids[0] if payload.geography_ids else None,
            project_id=payload.project_ids[0] if payload.project_ids else None,
        )
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
