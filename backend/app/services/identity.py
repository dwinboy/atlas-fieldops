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
from app.schemas.identity import (
    OrganizationCreate,
    PasswordResetRead,
    UserCreate,
    UserImportIssue,
    UserImportResponse,
    UserOperationalProfileRead,
    UserRead,
    UserRoleAssignmentCreate,
    UserRoleAssignmentRead,
    UserRoleAssignmentUpdate,
    UserUpdate,
)


class IdentityConflictError(Exception):
    pass


class IdentityNotFoundError(Exception):
    pass


class IdentityPermissionError(Exception):
    pass


ROLE_OPERATIONAL_PROFILE_BLUEPRINTS: dict[str, dict[str, object]] = {
    "owner": {
        "display_name": "Organization Owner Profile",
        "responsibilities": ["Own organization setup and tenant governance", "Approve senior access and role changes", "Monitor organization readiness and risk"],
        "metrics": ["Active users", "Governance score", "Pending approvals", "High-risk changes"],
        "group": "Organization Leadership",
    },
    "organization_owner": {
        "display_name": "Organization Owner Profile",
        "responsibilities": ["Own organization setup and tenant governance", "Approve senior access and role changes", "Monitor organization readiness and risk"],
        "metrics": ["Active users", "Governance score", "Pending approvals", "High-risk changes"],
        "group": "Organization Leadership",
    },
    "system_admin": {
        "display_name": "System Administration Profile",
        "responsibilities": ["Manage users, roles, and access controls", "Support account recovery and device controls", "Maintain platform configuration"],
        "metrics": ["Users managed", "Role changes", "Locked accounts", "Support actions"],
        "group": "Administration",
    },
    "national_admin": {
        "display_name": "National Administration Profile",
        "responsibilities": ["Coordinate national program structures", "Review regional performance", "Oversee cross-project access"],
        "metrics": ["Regions active", "Project coverage", "Escalations", "National submissions"],
        "group": "Administration",
    },
    "regional_manager": {
        "display_name": "Regional Manager Profile",
        "responsibilities": ["Manage regional teams and locations", "Track regional project progress", "Resolve escalated field issues"],
        "metrics": ["Regional coverage", "Supervisor activity", "Data quality issues", "Late assignments"],
        "group": "Field Management",
    },
    "district_supervisor": {
        "display_name": "Supervisor Profile",
        "responsibilities": ["Supervise field officers", "Approve field visit requests", "Review submissions and sync issues"],
        "metrics": ["Team submissions", "Visit compliance", "Returned records", "Last sync by team"],
        "group": "Field Management",
    },
    "field_officer": {
        "display_name": "Field Officer Profile",
        "responsibilities": ["Collect assigned forms", "Sync submissions from the mobile app", "Report field activity and exceptions"],
        "metrics": ["Assignments completed", "Submissions synced", "Drafts pending", "Data quality flags"],
        "group": "Field Collection",
    },
    "me_manager": {
        "display_name": "M&E Manager Profile",
        "responsibilities": ["Own M&E design and data quality", "Manage indicators and review workflows", "Approve reporting-ready data"],
        "metrics": ["Indicator progress", "Approval queue", "Completeness score", "Quality flags"],
        "group": "Monitoring & Evaluation",
    },
    "project_manager": {
        "display_name": "Project Manager Profile",
        "responsibilities": ["Manage project setup and delivery", "Monitor assignments, beneficiaries, and progress", "Coordinate field operations"],
        "metrics": ["Project health", "Assignments due", "Beneficiary coverage", "Submission throughput"],
        "group": "Project Delivery",
    },
    "data_manager": {
        "display_name": "Data Manager Profile",
        "responsibilities": ["Manage imports, cleaning, approvals, and exports", "Resolve duplicates and reconciliation items", "Protect official datasets"],
        "metrics": ["Pending reviews", "Import issues", "Duplicates", "Export requests"],
        "group": "Data Management",
    },
    "data_analyst": {
        "display_name": "Data Analyst Profile",
        "responsibilities": ["Analyze approved data", "Build saved views and dashboards", "Prepare indicator and donor summaries"],
        "metrics": ["Approved records", "Saved views", "Dashboards", "Report extracts"],
        "group": "Analytics",
    },
    "finance_officer": {
        "display_name": "Finance Officer Profile",
        "responsibilities": ["Review budget-linked operations", "Track financial evidence", "Support donor compliance reporting"],
        "metrics": ["Budget lines", "Cost evidence", "Financial exceptions", "Exported reports"],
        "group": "Finance",
    },
    "compliance_auditor": {
        "display_name": "Compliance Auditor Profile",
        "responsibilities": ["Review audit trails and governance events", "Inspect access and export activity", "Flag compliance risks"],
        "metrics": ["Audit events", "Policy exceptions", "Export logs", "Sensitive changes"],
        "group": "Governance",
    },
    "donor_viewer": {
        "display_name": "Donor Viewer Profile",
        "responsibilities": ["View approved reports and aggregate progress", "Review donor-ready outputs", "Monitor read-only project performance"],
        "metrics": ["Approved indicators", "Published reports", "Project progress", "Last report date"],
        "group": "External Viewer",
    },
}


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
            await self.identity.add_role_assignment(
                organization_id=organization.id,
                user_id=owner.id,
                role_id=owner_role.id,
                scope_type=ScopeType.ORGANIZATION,
                assigned_by_user_id=owner.id,
                reason="Initial organization owner access",
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

    @staticmethod
    def _operational_profile_blueprint(role_name: str) -> dict[str, object]:
        canonical_name = canonical_role(role_name)
        fallback_label = canonical_name.replace("_", " ").title()
        return ROLE_OPERATIONAL_PROFILE_BLUEPRINTS.get(
            canonical_name,
            {
                "display_name": f"{fallback_label} Profile",
                "responsibilities": ["Use assigned permissions within approved organization scope", "Complete assigned work and maintain audit-ready activity"],
                "metrics": ["Assigned work", "Completed actions", "Pending items", "Recent activity"],
                "group": "Custom",
            },
        )

    async def _sync_operational_profiles(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
        primary_role_name: str | None,
        assignments: list[tuple[object, object]],
        user_is_active: bool = True,
    ) -> list[UserOperationalProfileRead]:
        grouped: dict[str, list[tuple[object, object]]] = {}
        for assignment, role in assignments:
            role_name = canonical_role(str(getattr(role, "name", "")))
            if not role_name:
                continue
            grouped.setdefault(role_name, []).append((assignment, role))
            await self._ensure_field_officer_profile(organization_id=organization_id, user_id=user_id, role_name=role_name)
        if primary_role_name:
            grouped.setdefault(canonical_role(primary_role_name), [])

        for role_name, role_assignments in grouped.items():
            blueprint = self._operational_profile_blueprint(role_name)
            active_assignments = [
                assignment
                for assignment, _role in role_assignments
                if bool(getattr(assignment, "is_active", True))
            ]
            representative = active_assignments[0] if active_assignments else (role_assignments[0][0] if role_assignments else None)
            project_ids = [
                str(project_id)
                for project_id in (getattr(assignment, "project_id", None) for assignment, _role in role_assignments)
                if project_id
            ]
            metrics = await self.identity.role_operational_metrics(
                organization_id=organization_id,
                user_id=user_id,
                role_name=role_name,
                project_ids=project_ids,
            )
            await self.identity.upsert_operational_profile(
                organization_id=organization_id,
                user_id=user_id,
                profile_type=role_name,
                display_name=str(blueprint.get("display_name") or role_name.replace("_", " ").title()),
                status="active" if user_is_active and (active_assignments or not role_assignments) else "inactive",
                supervisor_user_id=None,
                primary_project_id=getattr(representative, "project_id", None) if representative is not None else None,
                primary_geography_id=getattr(representative, "geography_id", None) if representative is not None else None,
                primary_team_id=getattr(representative, "team_id", None) if representative is not None else None,
                responsibilities=[str(item) for item in blueprint.get("responsibilities", [])],
                metrics=metrics,
                metadata={
                    "role_name": role_name,
                    "architecture_group": str(blueprint.get("group") or "Custom"),
                    "assignment_count": len(role_assignments),
                    "active_assignment_count": len(active_assignments) if role_assignments else int(user_is_active),
                    "metric_source": "computed_from_operational_records",
                    "scope_type": getattr(representative, "scope_type", None) if representative is not None else None,
                },
            )
        return [
            UserOperationalProfileRead.model_validate(profile)
            for profile in await self.identity.list_operational_profiles(organization_id=organization_id, user_id=user_id)
        ]

    async def _resolve_assignable_role(self, *, organization_id: UUID, role_name: str, actor_roles: list[str]) -> object:
        canonical_name = canonical_role(role_name)
        if not is_assignable_role(canonical_name, actor_roles):
            raise IdentityPermissionError("Role cannot be assigned by this user")
        definition = ROLE_DEFINITIONS.get(canonical_name)
        if definition is not None:
            return await self.roles.get_or_create_from_definition(
                organization_id=organization_id,
                definition=definition,
            )
        role = await self.roles.get_by_name(organization_id=organization_id, name=canonical_name)
        if role is None:
            raise IdentityNotFoundError("Role not found")
        return role

    async def create_user(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        actor_roles: list[str],
        payload: UserCreate,
    ) -> UserRead:
        if await self.identity.get_by_email(payload.email) is not None:
            raise IdentityConflictError("A user with this email already exists")
        role = await self._resolve_assignable_role(
            organization_id=organization_id,
            role_name=payload.role_name,
            actor_roles=actor_roles,
        )
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
        await self.identity.add_role_assignment(
            organization_id=organization_id,
            user_id=user.id,
            role_id=role.id,
            scope_type=scope_type,
            assigned_by_user_id=actor_user_id,
            geography_id=payload.geography_ids[0] if payload.geography_ids else None,
            project_id=payload.project_ids[0] if payload.project_ids else None,
            reason="Primary access assigned at user creation",
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
        assignments = await self.identity.list_role_assignments(organization_id=organization_id, user_id=user.id, active_only=False)
        operational_profiles = await self._sync_operational_profiles(
            organization_id=organization_id,
            user_id=user.id,
            primary_role_name=role.name,
            assignments=assignments,
            user_is_active=user.is_active,
        )
        return self.to_user_read(
            *account,
            login_slug=organization.slug if organization is not None else None,
            temporary_password=payload.password,
            assignments=assignments,
            operational_profiles=operational_profiles,
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
    def to_assignment_read(assignment: object, role: object) -> UserRoleAssignmentRead:
        return UserRoleAssignmentRead(
            id=getattr(assignment, "id"),
            role_id=getattr(role, "id"),
            role_name=getattr(role, "name"),
            role_label=getattr(role, "label", "") or str(getattr(role, "name", "")).replace("_", " ").title(),
            scope_type=getattr(assignment, "scope_type"),
            geography_id=getattr(assignment, "geography_id", None),
            project_id=getattr(assignment, "project_id", None),
            organization_unit_id=getattr(assignment, "organization_unit_id", None),
            team_id=getattr(assignment, "team_id", None),
            assigned_by_user_id=getattr(assignment, "assigned_by_user_id", None),
            starts_at=getattr(assignment, "starts_at", None),
            expires_at=getattr(assignment, "expires_at", None),
            is_active=bool(getattr(assignment, "is_active", True)),
            reason=getattr(assignment, "reason", None),
        )

    @classmethod
    def to_user_read(
        cls,
        user: User,
        _membership: object,
        role: object,
        grant: object | None,
        *,
        login_slug: str | None = None,
        temporary_password: str | None = None,
        assignments: list[tuple[object, object]] | None = None,
        operational_profiles: list[UserOperationalProfileRead] | None = None,
    ) -> UserRead:
        assignment_reads = [cls.to_assignment_read(assignment, assignment_role) for assignment, assignment_role in (assignments or [])]
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
            role_assignments=assignment_reads,
            operational_profiles=operational_profiles or [],
        )

    async def list_users(self, organization_id: UUID) -> list[UserRead]:
        users: list[UserRead] = []
        for account in await self.identity.list_user_accounts(organization_id):
            user = account[0]
            role = account[2]
            assignments = await self.identity.list_role_assignments(organization_id=organization_id, user_id=user.id, active_only=False)
            operational_profiles = await self._sync_operational_profiles(
                organization_id=organization_id,
                user_id=user.id,
                primary_role_name=getattr(role, "name", None),
                assignments=assignments,
                user_is_active=user.is_active,
            )
            users.append(self.to_user_read(*account, assignments=assignments, operational_profiles=operational_profiles))
        return users

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
            role = await self._resolve_assignable_role(
                organization_id=organization_id,
                role_name=payload.role_name,
                actor_roles=actor_roles,
            )
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
        assignments = await self.identity.list_role_assignments(organization_id=organization_id, user_id=user_id, active_only=False)
        primary_assignment = assignments[0][0] if assignments else None
        if primary_assignment is None:
            active_role = account[2]
            await self.identity.add_role_assignment(
                organization_id=organization_id,
                user_id=user_id,
                role_id=active_role.id,
                scope_type=scope_type or default_scope_for_roles([active_role.name]),
                assigned_by_user_id=actor_user_id,
                geography_id=payload.geography_id,
                project_id=payload.project_id,
                organization_unit_id=payload.organization_unit_id,
                reason="Primary access assignment repaired during user update",
            )
        elif payload.role_name is not None or payload.scope_type is not None:
            await self.identity.update_role_assignment(
                organization_id=organization_id,
                user_id=user_id,
                assignment_id=primary_assignment.id,
                role_id=role_id,
                scope_type=scope_type,
                geography_id=payload.geography_id,
                project_id=payload.project_id,
                organization_unit_id=payload.organization_unit_id,
                reason="Primary access updated from user profile",
            )
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
        assignments = await self.identity.list_role_assignments(organization_id=organization_id, user_id=user_id, active_only=False)
        operational_profiles = await self._sync_operational_profiles(
            organization_id=organization_id,
            user_id=user_id,
            primary_role_name=getattr(account[2], "name", None),
            assignments=assignments,
            user_is_active=account[0].is_active,
        )
        return self.to_user_read(*account, assignments=assignments, operational_profiles=operational_profiles)

    async def add_role_assignment(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        actor_roles: list[str],
        user_id: UUID,
        payload: UserRoleAssignmentCreate,
    ) -> UserRead:
        account = await self.identity.get_user_account(organization_id=organization_id, user_id=user_id)
        if account is None:
            raise IdentityNotFoundError("User not found")
        role = await self._resolve_assignable_role(
            organization_id=organization_id,
            role_name=payload.role_name,
            actor_roles=actor_roles,
        )
        scope_type = ScopeType(payload.scope_type) if payload.scope_type is not None else default_scope_for_roles([role.name])
        if not is_scope_allowed_for_role(role.name, scope_type):
            raise IdentityPermissionError("Scope is too broad for selected role")
        await self.identity.add_role_assignment(
            organization_id=organization_id,
            user_id=user_id,
            role_id=role.id,
            scope_type=scope_type,
            assigned_by_user_id=actor_user_id,
            geography_id=payload.geography_id,
            project_id=payload.project_id,
            organization_unit_id=payload.organization_unit_id,
            team_id=payload.team_id,
            reason=payload.reason or "Additional role assignment",
        )
        await self._ensure_field_officer_profile(organization_id=organization_id, user_id=user_id, role_name=role.name)
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="user.role_assignment.created",
            resource_type="user",
            resource_id=str(user_id),
            metadata=payload.model_dump(exclude_none=True, mode="json"),
        )
        assignments = await self.identity.list_role_assignments(organization_id=organization_id, user_id=user_id, active_only=False)
        operational_profiles = await self._sync_operational_profiles(
            organization_id=organization_id,
            user_id=user_id,
            primary_role_name=getattr(account[2], "name", None),
            assignments=assignments,
            user_is_active=account[0].is_active,
        )
        return self.to_user_read(*account, assignments=assignments, operational_profiles=operational_profiles)

    async def update_role_assignment(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        actor_roles: list[str],
        user_id: UUID,
        assignment_id: UUID,
        payload: UserRoleAssignmentUpdate,
    ) -> UserRead:
        account = await self.identity.get_user_account(organization_id=organization_id, user_id=user_id)
        if account is None:
            raise IdentityNotFoundError("User not found")
        current_assignment = await self.identity.get_role_assignment(
            organization_id=organization_id,
            user_id=user_id,
            assignment_id=assignment_id,
        )
        if current_assignment is None:
            raise IdentityNotFoundError("Role assignment not found")
        _assignment, current_role = current_assignment
        role_id: UUID | None = None
        effective_role_name = current_role.name
        if payload.role_name is not None:
            role = await self._resolve_assignable_role(
                organization_id=organization_id,
                role_name=payload.role_name,
                actor_roles=actor_roles,
            )
            role_id = role.id
            effective_role_name = role.name
        scope_type = ScopeType(payload.scope_type) if payload.scope_type is not None else None
        if scope_type is not None and not is_scope_allowed_for_role(effective_role_name, scope_type):
            raise IdentityPermissionError("Scope is too broad for selected role")
        updated = await self.identity.update_role_assignment(
            organization_id=organization_id,
            user_id=user_id,
            assignment_id=assignment_id,
            role_id=role_id,
            scope_type=scope_type,
            geography_id=payload.geography_id,
            project_id=payload.project_id,
            organization_unit_id=payload.organization_unit_id,
            team_id=payload.team_id,
            is_active=payload.is_active,
            reason=payload.reason,
        )
        if updated is None:
            raise IdentityNotFoundError("Role assignment not found")
        await self._ensure_field_officer_profile(organization_id=organization_id, user_id=user_id, role_name=effective_role_name)
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="user.role_assignment.updated",
            resource_type="user",
            resource_id=str(user_id),
            metadata={"assignment_id": str(assignment_id), **payload.model_dump(exclude_none=True, mode="json")},
        )
        assignments = await self.identity.list_role_assignments(organization_id=organization_id, user_id=user_id, active_only=False)
        operational_profiles = await self._sync_operational_profiles(
            organization_id=organization_id,
            user_id=user_id,
            primary_role_name=getattr(account[2], "name", None),
            assignments=assignments,
            user_is_active=account[0].is_active,
        )
        return self.to_user_read(*account, assignments=assignments, operational_profiles=operational_profiles)

    async def deactivate_role_assignment(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        user_id: UUID,
        assignment_id: UUID,
    ) -> UserRead:
        account = await self.identity.get_user_account(organization_id=organization_id, user_id=user_id)
        if account is None:
            raise IdentityNotFoundError("User not found")
        deactivated = await self.identity.deactivate_role_assignment(
            organization_id=organization_id,
            user_id=user_id,
            assignment_id=assignment_id,
        )
        if deactivated is None:
            raise IdentityNotFoundError("Role assignment not found")
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="user.role_assignment.deactivated",
            resource_type="user",
            resource_id=str(user_id),
            metadata={"assignment_id": str(assignment_id)},
        )
        assignments = await self.identity.list_role_assignments(organization_id=organization_id, user_id=user_id, active_only=False)
        operational_profiles = await self._sync_operational_profiles(
            organization_id=organization_id,
            user_id=user_id,
            primary_role_name=getattr(account[2], "name", None),
            assignments=assignments,
            user_is_active=account[0].is_active,
        )
        return self.to_user_read(*account, assignments=assignments, operational_profiles=operational_profiles)

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
