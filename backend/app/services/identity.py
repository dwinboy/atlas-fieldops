import csv
from io import StringIO
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.events import event_publisher
from app.core.permissions import ROLE_DEFINITIONS, ScopeType, canonical_role, default_scope_for_roles, is_assignable_role, is_scope_allowed_for_role
from app.core.security import hash_password
from app.models.identity import User
from app.repositories.audit import AuditRepository
from app.repositories.collection import FieldOfficerRepository
from app.repositories.identity import IdentityRepository, OrganizationRepository, OrganizationUnitRepository, RoleRepository
from app.schemas.identity import PasswordResetRead, OrganizationCreate, UserCreate, UserImportIssue, UserImportResponse, UserRead, UserUpdate


class IdentityConflictError(Exception):
    pass


class IdentityNotFoundError(Exception):
    pass


class IdentityPermissionError(Exception):
    pass


class OrganizationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.organizations = OrganizationRepository(session)
        self.identity = IdentityRepository(session)
        self.roles = RoleRepository(session)
        self.units = OrganizationUnitRepository(session)
        self.audit = AuditRepository(session)

    async def create_organization(self, payload: OrganizationCreate) -> object:
        existing = await self.organizations.get_by_slug(payload.slug)
        if existing is not None:
            raise IdentityConflictError("Organization slug already exists")
        organization = await self.organizations.create(name=payload.name, slug=payload.slug)
        owner_role = None
        for definition in ROLE_DEFINITIONS.values():
            role = await self.roles.create_from_definition(organization_id=organization.id, definition=definition)
            if definition.name == "owner":
                owner_role = role
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
        temporary_password: str | None = None
        if payload.owner_email is not None:
            if owner_role is None:
                raise IdentityNotFoundError("Owner role not provisioned")
            temporary_password = payload.owner_password or "ChangeMe12345!"
            owner = await self.identity.create_user(
                email=str(payload.owner_email),
                password_hash=hash_password(temporary_password),
                full_name=payload.owner_full_name or payload.owner_email.split("@")[0],
            )
            await self.identity.add_membership(organization_id=organization.id, user_id=owner.id, role_id=owner_role.id)
            await self.identity.add_access_grant(
                organization_id=organization.id,
                user_id=owner.id,
                scope_type=ScopeType.ORGANIZATION,
            )
            await self.audit.append(
                organization_id=organization.id,
                actor_user_id=owner.id,
                action="organization.owner_created",
                resource_type="user",
                resource_id=str(owner.id),
                metadata={"email": owner.email, "organization_slug": organization.slug},
            )
            await event_publisher.publish(
                settings.kafka_auth_events_topic,
                {"type": "organization.owner_created", "organization_id": str(organization.id), "user_id": str(owner.id)},
            )
        return {
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug,
            "is_active": organization.is_active,
            "owner_email": str(payload.owner_email) if payload.owner_email is not None else None,
            "temporary_password": temporary_password,
        }


class UserManagementService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.identity = IdentityRepository(session)
        self.organizations = OrganizationRepository(session)
        self.field_officers = FieldOfficerRepository(session)
        self.roles = RoleRepository(session)
        self.audit = AuditRepository(session)

    async def _ensure_field_officer_profile(self, *, organization_id: UUID, user_id: UUID, role_name: str) -> None:
        if canonical_role(role_name) != "field_officer":
            return
        existing_profile = await self.field_officers.get_for_user(organization_id=organization_id, user_id=user_id)
        if existing_profile is not None:
            return
        await self.field_officers.create_profile(
            organization_id=organization_id,
            user_id=user_id,
            employee_code=f"FO-{str(user_id)[:8].upper()}",
            phone_number=None,
            home_region=None,
        )

    async def create_user(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        actor_roles: list[str],
        payload: UserCreate,
    ) -> UserRead:
        if not is_assignable_role(payload.role_name, actor_roles):
            raise IdentityPermissionError("Role cannot be assigned by this user")
        if await self.identity.get_by_email(payload.email) is not None:
            raise IdentityConflictError("A user with this email already exists")
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
        if not is_scope_allowed_for_role(role.name, scope_type):
            raise IdentityPermissionError("Scope is too broad for selected role")
        await self.identity.add_access_grant(
            organization_id=organization_id,
            user_id=user.id,
            scope_type=scope_type,
            geography_id=payload.geography_ids[0] if payload.geography_ids else None,
            project_id=payload.project_ids[0] if payload.project_ids else None,
        )
        await self._ensure_field_officer_profile(organization_id=organization_id, user_id=user.id, role_name=role.name)
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
        account = await self.identity.get_user_account(organization_id=organization_id, user_id=user.id)
        if account is None:
            raise IdentityNotFoundError("User not found")
        organization = await self.organizations.get(organization_id)
        return self.to_user_read(
            *account,
            login_slug=organization.slug if organization is not None else None,
            temporary_password=payload.password,
        )

    async def import_users_csv(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        actor_roles: list[str],
        content: bytes,
    ) -> UserImportResponse:
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(StringIO(text))
        if reader.fieldnames is None:
            raise ValueError("CSV file must include a header row")
        normalized_headers = {header.strip().lower(): header for header in reader.fieldnames}
        required_headers = {"email", "full_name", "role_name"}
        missing_headers = sorted(required_headers - set(normalized_headers))
        if missing_headers:
            raise ValueError(f"Missing required columns: {', '.join(missing_headers)}")

        created_users: list[UserRead] = []
        issues: list[UserImportIssue] = []
        seen_emails: set[str] = set()

        for row_number, raw_row in enumerate(reader, start=2):
            row = {key: (raw_row[value] or "").strip() for key, value in normalized_headers.items()}
            email = row.get("email", "").lower()
            full_name = row.get("full_name", "")
            role_name = row.get("role_name", "")
            if not email or not full_name or not role_name:
                issues.append(UserImportIssue(row_number=row_number, email=email or None, message="email, full_name, and role_name are required"))
                continue
            if email in seen_emails:
                issues.append(UserImportIssue(row_number=row_number, email=email, message="duplicate email in uploaded file"))
                continue
            seen_emails.add(email)
            password = row.get("temporary_password") or "ChangeMe12345!"
            if len(password) < 12:
                issues.append(UserImportIssue(row_number=row_number, email=email, message="temporary_password must be at least 12 characters"))
                continue
            try:
                user = await self.create_user(
                    organization_id=organization_id,
                    actor_user_id=actor_user_id,
                    actor_roles=actor_roles,
                    payload=UserCreate(
                        email=email,
                        full_name=full_name,
                        password=password,
                        role_name=role_name,
                        scope_type=row.get("scope_type") or None,
                        geography_ids=[row["geography_id"]] if row.get("geography_id") else [],
                        project_ids=[row["project_id"]] if row.get("project_id") else [],
                    ),
                )
                created_users.append(user)
            except (IdentityConflictError, IdentityNotFoundError, IdentityPermissionError, ValueError) as exc:
                issues.append(UserImportIssue(row_number=row_number, email=email, message=str(exc)))

        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="users.imported",
            resource_type="user",
            resource_id=str(organization_id),
            metadata={"created": len(created_users), "issues": len(issues)},
        )
        return UserImportResponse(
            created_count=len(created_users),
            skipped_count=len(issues),
            error_count=len(issues),
            users=created_users,
            issues=issues,
        )

    @staticmethod
    def to_user_read(
        user: User,
        _membership: object,
        role: object,
        grant: object | None,
        *,
        login_slug: str | None = None,
        temporary_password: str | None = None,
    ) -> UserRead:
        return UserRead(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            role_name=getattr(role, "name", None),
            scope_type=getattr(grant, "scope_type", None) if grant is not None else None,
            geography_id=getattr(grant, "geography_id", None) if grant is not None else None,
            project_id=getattr(grant, "project_id", None) if grant is not None else None,
            organization_unit_id=getattr(grant, "organization_unit_id", None) if grant is not None else None,
            login_slug=login_slug,
            temporary_password=temporary_password,
        )

    async def list_users(self, organization_id: UUID) -> list[UserRead]:
        return [self.to_user_read(*account) for account in await self.identity.list_user_accounts(organization_id)]

    async def update_user(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        actor_roles: list[str],
        user_id: UUID,
        payload: UserUpdate,
    ) -> UserRead:
        current_account = await self.identity.get_user_account(organization_id=organization_id, user_id=user_id)
        if current_account is None:
            raise IdentityNotFoundError("User not found")
        _current_user, _current_membership, current_role, _current_grant = current_account
        role_id: UUID | None = None
        effective_role_name = getattr(current_role, "name")
        if payload.role_name is not None:
            if not is_assignable_role(payload.role_name, actor_roles):
                raise IdentityPermissionError("Role cannot be assigned by this user")
            role = await self.roles.get_by_name(organization_id=organization_id, name=payload.role_name)
            if role is None:
                raise IdentityNotFoundError("Role not found")
            role_id = role.id
            effective_role_name = role.name
        scope_type = ScopeType(payload.scope_type) if payload.scope_type is not None else None
        if scope_type is not None:
            if not is_scope_allowed_for_role(effective_role_name, scope_type):
                raise IdentityPermissionError("Scope is too broad for selected role")
        account = await self.identity.update_user_account(
            organization_id=organization_id,
            user_id=user_id,
            role_id=role_id,
            full_name=payload.full_name,
            is_active=payload.is_active,
            scope_type=scope_type,
            geography_id=payload.geography_id,
            project_id=payload.project_id,
            organization_unit_id=payload.organization_unit_id,
        )
        if account is None:
            raise IdentityNotFoundError("User not found")
        await self._ensure_field_officer_profile(organization_id=organization_id, user_id=user_id, role_name=effective_role_name)
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="user.updated",
            resource_type="user",
            resource_id=str(user_id),
            metadata=payload.model_dump(exclude_none=True, mode="json"),
        )
        await event_publisher.publish(
            settings.kafka_auth_events_topic,
            {"type": "user.updated", "organization_id": str(organization_id), "user_id": str(user_id)},
        )
        return self.to_user_read(*account)

    async def reset_password(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        user_id: UUID,
    ) -> PasswordResetRead:
        temporary_password = "ChangeMe12345!"
        user = await self.identity.reset_password(
            organization_id=organization_id,
            user_id=user_id,
            password_hash=hash_password(temporary_password),
        )
        if user is None:
            raise IdentityNotFoundError("User not found")
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="user.password_reset",
            resource_type="user",
            resource_id=str(user_id),
            metadata={"temporary": True},
        )
        return PasswordResetRead(user_id=user_id, temporary_password=temporary_password)
