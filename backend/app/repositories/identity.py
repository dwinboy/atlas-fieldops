from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import RoleDefinition, ScopeType
from app.models.collection import FieldOfficerProfile, OfficerAssignment, Project, Submission
from app.models.identity import Membership, Organization, Role, User, UserAccessGrant, UserOperationalProfile, UserRoleAssignment
from app.models.operations import (
    Beneficiary,
    DataExportJob,
    DataImportIssue,
    DataImportJob,
    DataQualitySignal,
    FieldVisitRequest,
    MonitoringIndicator,
    OperationalTeam,
    OrganizationalUnit,
    SessionLog,
    WorkflowQueueItem,
)


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

    async def get_or_create_from_definition(self, *, organization_id: UUID, definition: RoleDefinition) -> Role:
        existing = await self.get_by_name(organization_id=organization_id, name=definition.name)
        if existing is not None:
            return existing
        return await self.create_from_definition(organization_id=organization_id, definition=definition)

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

    async def add_role_assignment(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
        role_id: UUID,
        scope_type: ScopeType,
        assigned_by_user_id: UUID | None = None,
        geography_id: str | None = None,
        project_id: str | None = None,
        organization_unit_id: UUID | None = None,
        team_id: UUID | None = None,
        reason: str | None = None,
    ) -> UserRoleAssignment:
        assignment = UserRoleAssignment(
            organization_id=organization_id,
            user_id=user_id,
            role_id=role_id,
            scope_type=scope_type.value,
            assigned_by_user_id=assigned_by_user_id,
            geography_id=geography_id,
            project_id=project_id,
            organization_unit_id=organization_unit_id,
            team_id=team_id,
            is_active=True,
            reason=reason,
        )
        self.session.add(assignment)
        await self.session.flush()
        return assignment

    async def list_role_assignments(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
        active_only: bool = True,
    ) -> list[tuple[UserRoleAssignment, Role]]:
        now = datetime.now(UTC)
        filters = [
            UserRoleAssignment.organization_id == organization_id,
            UserRoleAssignment.user_id == user_id,
            UserRoleAssignment.deleted_at.is_(None),
            Role.deleted_at.is_(None),
        ]
        if active_only:
            filters.extend(
                [
                    UserRoleAssignment.is_active.is_(True),
                    or_(UserRoleAssignment.starts_at.is_(None), UserRoleAssignment.starts_at <= now),
                    or_(UserRoleAssignment.expires_at.is_(None), UserRoleAssignment.expires_at > now),
                ]
            )
        result = await self.session.execute(
            select(UserRoleAssignment, Role)
            .join(Role, Role.id == UserRoleAssignment.role_id)
            .where(*filters)
            .order_by(UserRoleAssignment.created_at)
        )
        return list(result.all())

    async def get_role_assignment(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
        assignment_id: UUID,
    ) -> tuple[UserRoleAssignment, Role] | None:
        result = await self.session.execute(
            select(UserRoleAssignment, Role)
            .join(Role, Role.id == UserRoleAssignment.role_id)
            .where(
                UserRoleAssignment.id == assignment_id,
                UserRoleAssignment.organization_id == organization_id,
                UserRoleAssignment.user_id == user_id,
                UserRoleAssignment.deleted_at.is_(None),
                Role.deleted_at.is_(None),
            )
        )
        return result.one_or_none()

    async def update_role_assignment(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
        assignment_id: UUID,
        role_id: UUID | None = None,
        scope_type: ScopeType | None = None,
        geography_id: str | None = None,
        project_id: str | None = None,
        organization_unit_id: UUID | None = None,
        team_id: UUID | None = None,
        is_active: bool | None = None,
        reason: str | None = None,
    ) -> tuple[UserRoleAssignment, Role] | None:
        row = await self.get_role_assignment(organization_id=organization_id, user_id=user_id, assignment_id=assignment_id)
        if row is None:
            return None
        assignment, role = row
        if role_id is not None:
            assignment.role_id = role_id
            role_result = await self.session.execute(select(Role).where(Role.id == role_id, Role.deleted_at.is_(None)))
            role = role_result.scalar_one()
        if scope_type is not None:
            assignment.scope_type = scope_type.value
        assignment.geography_id = geography_id
        assignment.project_id = project_id
        assignment.organization_unit_id = organization_unit_id
        assignment.team_id = team_id
        if is_active is not None:
            assignment.is_active = is_active
        if reason is not None:
            assignment.reason = reason
        await self.session.flush()
        return assignment, role

    async def deactivate_role_assignment(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
        assignment_id: UUID,
    ) -> tuple[UserRoleAssignment, Role] | None:
        row = await self.get_role_assignment(organization_id=organization_id, user_id=user_id, assignment_id=assignment_id)
        if row is None:
            return None
        assignment, role = row
        assignment.is_active = False
        await self.session.flush()
        return assignment, role

    async def list_operational_profiles(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
    ) -> list[UserOperationalProfile]:
        result = await self.session.execute(
            select(UserOperationalProfile)
            .where(
                UserOperationalProfile.organization_id == organization_id,
                UserOperationalProfile.user_id == user_id,
                UserOperationalProfile.deleted_at.is_(None),
            )
            .order_by(UserOperationalProfile.profile_type)
        )
        return list(result.scalars())

    async def upsert_operational_profile(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
        profile_type: str,
        display_name: str,
        status: str,
        responsibilities: list[str],
        metrics: dict[str, object],
        metadata: dict[str, object],
        supervisor_user_id: UUID | None = None,
        primary_project_id: str | None = None,
        primary_geography_id: str | None = None,
        primary_team_id: UUID | None = None,
    ) -> UserOperationalProfile:
        result = await self.session.execute(
            select(UserOperationalProfile).where(
                UserOperationalProfile.organization_id == organization_id,
                UserOperationalProfile.user_id == user_id,
                UserOperationalProfile.profile_type == profile_type,
                UserOperationalProfile.deleted_at.is_(None),
            )
        )
        profile = result.scalar_one_or_none()
        if profile is None:
            profile = UserOperationalProfile(
                organization_id=organization_id,
                user_id=user_id,
                profile_type=profile_type,
                display_name=display_name,
                status=status,
                supervisor_user_id=supervisor_user_id,
                primary_project_id=primary_project_id,
                primary_geography_id=primary_geography_id,
                primary_team_id=primary_team_id,
                responsibilities_json=responsibilities,
                metrics_json=metrics,
                metadata_json=metadata,
            )
            self.session.add(profile)
        else:
            profile.display_name = display_name
            profile.status = status
            profile.supervisor_user_id = supervisor_user_id
            profile.primary_project_id = primary_project_id
            profile.primary_geography_id = primary_geography_id
            profile.primary_team_id = primary_team_id
            profile.responsibilities_json = responsibilities
            profile.metrics_json = metrics
            profile.metadata_json = metadata
        await self.session.flush()
        return profile

    async def _count(self, model: type[object], *filters: object) -> int:
        result = await self.session.execute(select(func.count()).select_from(model).where(*filters))
        return int(result.scalar_one())

    async def _field_officer_profile_id(self, *, organization_id: UUID, user_id: UUID) -> UUID | None:
        result = await self.session.execute(
            select(FieldOfficerProfile.id).where(
                FieldOfficerProfile.organization_id == organization_id,
                FieldOfficerProfile.user_id == user_id,
                FieldOfficerProfile.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def role_operational_metrics(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
        role_name: str,
        project_ids: list[str],
    ) -> dict[str, object]:
        project_uuid_filters: list[UUID] = []
        for project_id in project_ids:
            try:
                project_uuid_filters.append(UUID(str(project_id)))
            except (TypeError, ValueError):
                continue

        active_sessions = await self._count(
            SessionLog,
            SessionLog.organization_id == organization_id,
            SessionLog.user_id == user_id,
            SessionLog.status == "active",
        )
        recent_activity = await self._count(
            SessionLog,
            SessionLog.organization_id == organization_id,
            SessionLog.user_id == user_id,
        )

        if role_name == "field_officer":
            officer_id = await self._field_officer_profile_id(organization_id=organization_id, user_id=user_id)
            if officer_id is None:
                return {
                    "Assignments": 0,
                    "Submissions": 0,
                    "Pending visits": 0,
                    "Last sync ready": "No mobile profile",
                }
            return {
                "Assignments": await self._count(
                    OfficerAssignment,
                    OfficerAssignment.organization_id == organization_id,
                    OfficerAssignment.officer_id == officer_id,
                    OfficerAssignment.deleted_at.is_(None),
                    OfficerAssignment.is_active.is_(True),
                ),
                "Submissions": await self._count(
                    Submission,
                    Submission.organization_id == organization_id,
                    Submission.field_officer_id == officer_id,
                    Submission.deleted_at.is_(None),
                ),
                "Pending visits": await self._count(
                    FieldVisitRequest,
                    FieldVisitRequest.organization_id == organization_id,
                    FieldVisitRequest.field_officer_id == officer_id,
                    FieldVisitRequest.status.in_(["pending", "approved", "in_progress"]),
                    FieldVisitRequest.deleted_at.is_(None),
                ),
                "Data quality flags": await self._count(
                    DataQualitySignal,
                    DataQualitySignal.organization_id == organization_id,
                    DataQualitySignal.status == "open",
                ),
            }

        if role_name in {"district_supervisor", "regional_manager"}:
            supervised_officer_ids = (
                await self.session.execute(
                    select(FieldOfficerProfile.id).where(
                        FieldOfficerProfile.organization_id == organization_id,
                        FieldOfficerProfile.supervisor_user_id == user_id,
                        FieldOfficerProfile.deleted_at.is_(None),
                    )
                )
            ).scalars().all()
            return {
                "Team officers": len(supervised_officer_ids),
                "Pending visit approvals": await self._count(
                    FieldVisitRequest,
                    FieldVisitRequest.organization_id == organization_id,
                    FieldVisitRequest.supervisor_user_id == user_id,
                    FieldVisitRequest.status == "pending",
                    FieldVisitRequest.deleted_at.is_(None),
                ),
                "Reviewed visits": await self._count(
                    FieldVisitRequest,
                    FieldVisitRequest.organization_id == organization_id,
                    FieldVisitRequest.reviewed_by_user_id == user_id,
                    FieldVisitRequest.deleted_at.is_(None),
                ),
                "Team submissions": 0
                if not supervised_officer_ids
                else await self._count(
                    Submission,
                    Submission.organization_id == organization_id,
                    Submission.field_officer_id.in_(list(supervised_officer_ids)),
                    Submission.deleted_at.is_(None),
                ),
            }

        if role_name == "me_manager":
            pending_statuses = ["submitted", "under_review", "pending_review", "returned"]
            return {
                "Pending reviews": await self._count(
                    Submission,
                    Submission.organization_id == organization_id,
                    Submission.status.in_(pending_statuses),
                    Submission.deleted_at.is_(None),
                ),
                "Open data quality flags": await self._count(
                    DataQualitySignal,
                    DataQualitySignal.organization_id == organization_id,
                    DataQualitySignal.status == "open",
                ),
                "Active indicators": await self._count(
                    MonitoringIndicator,
                    MonitoringIndicator.organization_id == organization_id,
                    MonitoringIndicator.deleted_at.is_(None),
                    MonitoringIndicator.is_active.is_(True),
                ),
                "Open workflow items": await self._count(
                    WorkflowQueueItem,
                    WorkflowQueueItem.organization_id == organization_id,
                    WorkflowQueueItem.status == "open",
                ),
            }

        if role_name == "project_manager":
            project_filters = [
                Project.organization_id == organization_id,
                Project.deleted_at.is_(None),
                Project.is_active.is_(True),
            ]
            if project_uuid_filters:
                project_filters.append(Project.id.in_(project_uuid_filters))
            scoped_project_filter = Submission.project_id.in_(project_uuid_filters) if project_uuid_filters else Submission.project_id.is_not(None)
            return {
                "Active projects": await self._count(Project, *project_filters),
                "Project beneficiaries": await self._count(
                    Beneficiary,
                    Beneficiary.organization_id == organization_id,
                    Beneficiary.deleted_at.is_(None),
                    Beneficiary.project_id.in_(project_uuid_filters) if project_uuid_filters else Beneficiary.project_id.is_not(None),
                ),
                "Project submissions": await self._count(
                    Submission,
                    Submission.organization_id == organization_id,
                    Submission.deleted_at.is_(None),
                    scoped_project_filter,
                ),
                "Project quality flags": await self._count(
                    DataQualitySignal,
                    DataQualitySignal.organization_id == organization_id,
                    DataQualitySignal.status == "open",
                ),
            }

        if role_name == "data_manager":
            return {
                "Pending reviews": await self._count(
                    Submission,
                    Submission.organization_id == organization_id,
                    Submission.status.in_(["submitted", "under_review", "pending_review"]),
                    Submission.deleted_at.is_(None),
                ),
                "Import issues": await self._count(
                    DataImportIssue,
                    DataImportIssue.organization_id == organization_id,
                ),
                "Failed imports": await self._count(
                    DataImportJob,
                    DataImportJob.organization_id == organization_id,
                    DataImportJob.status.in_(["failed", "completed_with_errors"]),
                ),
                "Export jobs": await self._count(
                    DataExportJob,
                    DataExportJob.organization_id == organization_id,
                    DataExportJob.requested_by_user_id == user_id,
                ),
            }

        if role_name == "donor_viewer":
            return {
                "Approved submissions": await self._count(
                    Submission,
                    Submission.organization_id == organization_id,
                    Submission.status == "approved",
                    Submission.deleted_at.is_(None),
                ),
                "Active projects": await self._count(
                    Project,
                    Project.organization_id == organization_id,
                    Project.deleted_at.is_(None),
                    Project.is_active.is_(True),
                ),
                "Active indicators": await self._count(
                    MonitoringIndicator,
                    MonitoringIndicator.organization_id == organization_id,
                    MonitoringIndicator.deleted_at.is_(None),
                    MonitoringIndicator.is_active.is_(True),
                ),
                "Recent sessions": recent_activity,
            }

        return {
            "Active sessions": active_sessions,
            "Recent sessions": recent_activity,
            "Active assignments": len(project_ids),
            "Managed teams": await self._count(
                OperationalTeam,
                OperationalTeam.organization_id == organization_id,
                OperationalTeam.manager_user_id == user_id,
                OperationalTeam.deleted_at.is_(None),
            ),
        }

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
