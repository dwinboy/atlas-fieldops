from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TypeVar
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.identity import Membership, Role, UserAccessGrant, UserRoleAssignment
from app.models.operations import (
    AccessDelegation,
    AccessRequest,
    ApprovalMatrix,
    ClearanceLevel,
    Department,
    DeviceRegistry,
    OperationalTeam,
    OperationalZone,
    SessionLog,
    WorkforceProfile,
)

ModelT = TypeVar("ModelT")


@dataclass(frozen=True)
class UserAccessContext:
    role_name: str
    scope_type: str
    geography_id: str | None
    project_id: str | None
    organization_unit_id: UUID | None


class OrganizationGovernanceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def count(self, model: type[ModelT], organization_id: UUID, **filters: object) -> int:
        conditions = [getattr(model, "organization_id") == organization_id]
        if hasattr(model, "deleted_at"):
            conditions.append(getattr(model, "deleted_at").is_(None))
        for key, value in filters.items():
            conditions.append(getattr(model, key) == value)
        result = await self.session.execute(select(func.count()).select_from(model).where(*conditions))
        return int(result.scalar_one())

    async def create_department(self, organization_id: UUID, values: dict[str, object]) -> Department:
        row = Department(organization_id=organization_id, **values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_departments(self, organization_id: UUID) -> list[Department]:
        result = await self.session.execute(
            select(Department)
            .where(Department.organization_id == organization_id, Department.deleted_at.is_(None))
            .order_by(Department.department_type, Department.name)
        )
        return list(result.scalars())

    async def create_team(self, organization_id: UUID, values: dict[str, object]) -> OperationalTeam:
        row = OperationalTeam(organization_id=organization_id, **values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_teams(self, organization_id: UUID) -> list[OperationalTeam]:
        result = await self.session.execute(
            select(OperationalTeam)
            .where(OperationalTeam.organization_id == organization_id, OperationalTeam.deleted_at.is_(None))
            .order_by(OperationalTeam.team_type, OperationalTeam.name)
        )
        return list(result.scalars())

    async def get_team(self, organization_id: UUID, team_id: UUID) -> OperationalTeam | None:
        result = await self.session.execute(
            select(OperationalTeam).where(
                OperationalTeam.organization_id == organization_id,
                OperationalTeam.id == team_id,
                OperationalTeam.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def update_team(self, team: OperationalTeam, values: dict[str, object]) -> OperationalTeam:
        for key, value in values.items():
            setattr(team, key, value)
        await self.session.flush()
        return team

    async def create_workforce_profile(self, organization_id: UUID, values: dict[str, object]) -> WorkforceProfile:
        row = WorkforceProfile(organization_id=organization_id, **values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_workforce_profiles(self, organization_id: UUID) -> list[WorkforceProfile]:
        result = await self.session.execute(
            select(WorkforceProfile)
            .where(WorkforceProfile.organization_id == organization_id, WorkforceProfile.deleted_at.is_(None))
            .order_by(WorkforceProfile.lifecycle_status, WorkforceProfile.job_title)
        )
        return list(result.scalars())

    async def create_delegation(self, organization_id: UUID, values: dict[str, object]) -> AccessDelegation:
        row = AccessDelegation(organization_id=organization_id, **values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_delegations(self, organization_id: UUID) -> list[AccessDelegation]:
        now = datetime.now(UTC)
        result = await self.session.execute(
            select(AccessDelegation)
            .where(AccessDelegation.organization_id == organization_id, AccessDelegation.deleted_at.is_(None))
            .order_by(AccessDelegation.expires_at)
        )
        rows = list(result.scalars())
        for row in rows:
            if row.status == "active" and row.expires_at <= now:
                row.status = "expired"
        await self.session.flush()
        return rows

    async def create_approval_matrix(self, organization_id: UUID, values: dict[str, object]) -> ApprovalMatrix:
        row = ApprovalMatrix(organization_id=organization_id, **values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_approval_matrices(self, organization_id: UUID) -> list[ApprovalMatrix]:
        result = await self.session.execute(
            select(ApprovalMatrix)
            .where(ApprovalMatrix.organization_id == organization_id, ApprovalMatrix.deleted_at.is_(None))
            .order_by(ApprovalMatrix.workflow_type, ApprovalMatrix.threshold_value)
        )
        return list(result.scalars())

    async def create_access_request(self, organization_id: UUID, requester_user_id: UUID, values: dict[str, object]) -> AccessRequest:
        row = AccessRequest(organization_id=organization_id, requester_user_id=requester_user_id, **values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_access_requests(self, organization_id: UUID) -> list[AccessRequest]:
        result = await self.session.execute(
            select(AccessRequest)
            .where(AccessRequest.organization_id == organization_id, AccessRequest.deleted_at.is_(None))
            .order_by(AccessRequest.status, AccessRequest.created_at.desc())
        )
        return list(result.scalars())

    async def get_access_request(self, organization_id: UUID, request_id: UUID) -> AccessRequest | None:
        result = await self.session.execute(
            select(AccessRequest).where(
                AccessRequest.organization_id == organization_id,
                AccessRequest.id == request_id,
                AccessRequest.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def create_clearance_level(self, organization_id: UUID, values: dict[str, object]) -> ClearanceLevel:
        row = ClearanceLevel(organization_id=organization_id, **values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_clearance_levels(self, organization_id: UUID) -> list[ClearanceLevel]:
        result = await self.session.execute(
            select(ClearanceLevel)
            .where(ClearanceLevel.organization_id == organization_id, ClearanceLevel.deleted_at.is_(None))
            .order_by(ClearanceLevel.rank)
        )
        return list(result.scalars())

    async def create_zone(self, organization_id: UUID, values: dict[str, object]) -> OperationalZone:
        row = OperationalZone(organization_id=organization_id, **values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_zones(self, organization_id: UUID) -> list[OperationalZone]:
        result = await self.session.execute(
            select(OperationalZone)
            .where(OperationalZone.organization_id == organization_id, OperationalZone.deleted_at.is_(None))
            .order_by(OperationalZone.zone_type, OperationalZone.name)
        )
        return list(result.scalars())

    async def create_device(self, organization_id: UUID, values: dict[str, object]) -> DeviceRegistry:
        row = DeviceRegistry(organization_id=organization_id, **values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_devices(self, organization_id: UUID) -> list[DeviceRegistry]:
        result = await self.session.execute(
            select(DeviceRegistry)
            .where(DeviceRegistry.organization_id == organization_id, DeviceRegistry.deleted_at.is_(None))
            .order_by(DeviceRegistry.status, DeviceRegistry.device_id)
        )
        return list(result.scalars())

    async def create_session_log(self, organization_id: UUID, values: dict[str, object]) -> SessionLog:
        row = SessionLog(organization_id=organization_id, **values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_session_logs(self, organization_id: UUID) -> list[SessionLog]:
        result = await self.session.execute(
            select(SessionLog)
            .where(SessionLog.organization_id == organization_id)
            .order_by(SessionLog.created_at.desc())
            .limit(100)
        )
        return list(result.scalars())

    async def get_user_access_context(self, organization_id: UUID, user_id: UUID) -> list[UserAccessContext]:
        membership_result = await self.session.execute(
            select(Role.name, Role.scope_type, UserAccessGrant)
            .join(Membership, Membership.role_id == Role.id)
            .outerjoin(
                UserAccessGrant,
                (UserAccessGrant.user_id == Membership.user_id)
                & (UserAccessGrant.organization_id == Membership.organization_id)
                & (UserAccessGrant.deleted_at.is_(None)),
            )
            .where(
                Membership.organization_id == organization_id,
                Membership.user_id == user_id,
                Membership.deleted_at.is_(None),
                Role.deleted_at.is_(None),
            )
            .order_by(UserAccessGrant.updated_at.desc().nullslast())
        )
        contexts = [
            UserAccessContext(
                role_name=role_name,
                scope_type=grant.scope_type if grant is not None else role_scope_type,
                geography_id=grant.geography_id if grant is not None else None,
                project_id=grant.project_id if grant is not None else None,
                organization_unit_id=grant.organization_unit_id if grant is not None else None,
            )
            for role_name, role_scope_type, grant in membership_result.all()
        ]
        now = datetime.now(UTC)
        assignment_result = await self.session.execute(
            select(Role.name, UserRoleAssignment)
            .join(UserRoleAssignment, UserRoleAssignment.role_id == Role.id)
            .where(
                UserRoleAssignment.organization_id == organization_id,
                UserRoleAssignment.user_id == user_id,
                UserRoleAssignment.is_active.is_(True),
                UserRoleAssignment.deleted_at.is_(None),
                Role.deleted_at.is_(None),
                (UserRoleAssignment.starts_at.is_(None)) | (UserRoleAssignment.starts_at <= now),
                (UserRoleAssignment.expires_at.is_(None)) | (UserRoleAssignment.expires_at > now),
            )
            .order_by(UserRoleAssignment.updated_at.desc())
        )
        contexts.extend(
            UserAccessContext(
                role_name=role_name,
                scope_type=assignment.scope_type,
                geography_id=assignment.geography_id,
                project_id=assignment.project_id,
                organization_unit_id=assignment.organization_unit_id,
            )
            for role_name, assignment in assignment_result.all()
        )
        return contexts
