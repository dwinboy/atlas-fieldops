from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import AccessScope, ScopeType, has_permission, is_scope_authorized
from app.models.operations import (
    AccessDelegation,
    AccessRequest,
    ApprovalMatrix,
    ClearanceLevel,
    Department,
    DeviceRegistry,
    OperationalTeam,
    SessionLog,
    WorkforceProfile,
)
from app.repositories.audit import AuditRepository
from app.repositories.organization_governance import OrganizationGovernanceRepository
from app.schemas.organization_governance import (
    AccessRequestCreate,
    AccessRequestRead,
    AccessRequestReview,
    AccessSimulationRead,
    AccessSimulationRequest,
    ApprovalMatrixCreate,
    ApprovalMatrixRead,
    ClearanceLevelCreate,
    ClearanceLevelRead,
    DelegationCreate,
    DelegationRead,
    DepartmentCreate,
    DepartmentRead,
    DeviceCreate,
    DeviceRead,
    OperationalZoneCreate,
    OperationalZoneRead,
    OrganizationGovernanceSummary,
    SessionLogCreate,
    SessionLogRead,
    TeamCreate,
    TeamRead,
    TeamUpdate,
    WorkforceProfileCreate,
    WorkforceProfileRead,
    WorkforceProfileUpdate,
)


class OrganizationGovernanceNotFoundError(Exception):
    pass


class OrganizationGovernancePermissionError(Exception):
    pass


class OrganizationGovernanceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = OrganizationGovernanceRepository(session)
        self.audit = AuditRepository(session)

    async def summary(self, organization_id: UUID) -> OrganizationGovernanceSummary:
        departments = await self.repository.count(Department, organization_id)
        teams = await self.repository.count(OperationalTeam, organization_id)
        workforce_profiles = await self.repository.count(WorkforceProfile, organization_id)
        active_delegations = await self.repository.count(AccessDelegation, organization_id, status="active")
        pending_access_requests = await self.repository.count(AccessRequest, organization_id, status="pending")
        approval_matrices = await self.repository.count(ApprovalMatrix, organization_id, is_active=True)
        clearance_levels = await self.repository.count(ClearanceLevel, organization_id)
        devices = await self.repository.count(DeviceRegistry, organization_id)
        active_sessions = await self.repository.count(SessionLog, organization_id, status="active")
        high_risk_sessions = await self.repository.count(SessionLog, organization_id, status="high_risk")
        attention_items: list[str] = []
        if not departments:
            attention_items.append("Create departments so access and dashboards match the organization structure.")
        if not teams:
            attention_items.append("Create operational teams before assigning field work.")
        if pending_access_requests:
            attention_items.append(f"{pending_access_requests} access request(s) are waiting for manager review.")
        if high_risk_sessions:
            attention_items.append(f"{high_risk_sessions} high-risk session(s) need security review.")
        readiness = sum(bool(value) for value in (departments, teams, workforce_profiles, approval_matrices, clearance_levels, devices))
        return OrganizationGovernanceSummary(
            departments=departments,
            teams=teams,
            workforce_profiles=workforce_profiles,
            active_delegations=active_delegations,
            pending_access_requests=pending_access_requests,
            approval_matrices=approval_matrices,
            clearance_levels=clearance_levels,
            devices=devices,
            active_sessions=active_sessions,
            high_risk_sessions=high_risk_sessions,
            governance_score=round((readiness / 6) * 100, 1),
            attention_items=attention_items,
        )

    async def create_department(self, organization_id: UUID, actor_user_id: UUID, payload: DepartmentCreate) -> DepartmentRead:
        row = await self.repository.create_department(organization_id, payload.model_dump())
        await self._audit(organization_id, actor_user_id, "org_governance.department_created", "department", str(row.id), {"code": row.code})
        await self.session.commit()
        return DepartmentRead.model_validate(row)

    async def list_departments(self, organization_id: UUID) -> list[DepartmentRead]:
        return [DepartmentRead.model_validate(row) for row in await self.repository.list_departments(organization_id)]

    async def create_team(self, organization_id: UUID, actor_user_id: UUID, payload: TeamCreate) -> TeamRead:
        row = await self.repository.create_team(organization_id, payload.model_dump())
        await self._audit(organization_id, actor_user_id, "org_governance.team_created", "operational_team", str(row.id), {"code": row.code, "region": row.region})
        await self.session.commit()
        return TeamRead.model_validate(row)

    async def list_teams(self, organization_id: UUID) -> list[TeamRead]:
        return [TeamRead.model_validate(row) for row in await self.repository.list_teams(organization_id)]

    async def update_team(self, organization_id: UUID, actor_user_id: UUID, team_id: UUID, payload: TeamUpdate) -> TeamRead:
        row = await self.repository.get_team(organization_id, team_id)
        if row is None:
            raise OrganizationGovernanceNotFoundError("Team not found")
        values = payload.model_dump(exclude_unset=True)
        row = await self.repository.update_team(row, values)
        await self._audit(organization_id, actor_user_id, "org_governance.team_updated", "operational_team", str(row.id), {"fields": list(values)})
        await self.session.commit()
        return TeamRead.model_validate(row)

    async def create_workforce_profile(self, organization_id: UUID, actor_user_id: UUID, payload: WorkforceProfileCreate) -> WorkforceProfileRead:
        row = await self.repository.create_workforce_profile(organization_id, payload.model_dump())
        await self._audit(
            organization_id,
            actor_user_id,
            "org_governance.workforce_profile_created",
            "workforce_profile",
            str(row.id),
            {"user_id": str(row.user_id), "lifecycle_status": row.lifecycle_status},
        )
        await self.session.commit()
        return WorkforceProfileRead.model_validate(row)

    async def update_workforce_profile(self, organization_id: UUID, actor_user_id: UUID, profile_id: UUID, payload: WorkforceProfileUpdate) -> WorkforceProfileRead:
        row = await self.repository.get_workforce_profile(organization_id, profile_id)
        if row is None:
            raise OrganizationGovernanceNotFoundError("Workforce profile not found")
        values = payload.model_dump(exclude_unset=True)
        row = await self.repository.update_workforce_profile(row, values)
        await self._audit(
            organization_id,
            actor_user_id,
            "org_governance.workforce_profile_updated",
            "workforce_profile",
            str(row.id),
            {"fields": list(values)},
        )
        await self.session.commit()
        return WorkforceProfileRead.model_validate(row)

    async def list_workforce_profiles(self, organization_id: UUID) -> list[WorkforceProfileRead]:
        return [WorkforceProfileRead.model_validate(row) for row in await self.repository.list_workforce_profiles(organization_id)]

    async def create_delegation(self, organization_id: UUID, actor_user_id: UUID, payload: DelegationCreate) -> DelegationRead:
        if payload.expires_at <= payload.starts_at:
            raise OrganizationGovernancePermissionError("Delegation must expire after it starts")
        values = payload.model_dump()
        values["delegator_user_id"] = actor_user_id
        row = await self.repository.create_delegation(organization_id, values)
        await self._audit(
            organization_id,
            actor_user_id,
            "org_governance.delegation_created",
            "access_delegation",
            str(row.id),
            {"delegate_user_id": str(row.delegate_user_id), "permission": row.permission, "expires_at": row.expires_at.isoformat()},
        )
        await self.session.commit()
        return DelegationRead.model_validate(row)

    async def list_delegations(self, organization_id: UUID) -> list[DelegationRead]:
        return [DelegationRead.model_validate(row) for row in await self.repository.list_delegations(organization_id)]

    async def create_approval_matrix(self, organization_id: UUID, actor_user_id: UUID, payload: ApprovalMatrixCreate) -> ApprovalMatrixRead:
        row = await self.repository.create_approval_matrix(organization_id, payload.model_dump())
        await self._audit(organization_id, actor_user_id, "org_governance.approval_matrix_created", "approval_matrix", str(row.id), {"workflow_type": row.workflow_type})
        await self.session.commit()
        return ApprovalMatrixRead.model_validate(row)

    async def list_approval_matrices(self, organization_id: UUID) -> list[ApprovalMatrixRead]:
        return [ApprovalMatrixRead.model_validate(row) for row in await self.repository.list_approval_matrices(organization_id)]

    async def create_access_request(self, organization_id: UUID, actor_user_id: UUID, payload: AccessRequestCreate) -> AccessRequestRead:
        row = await self.repository.create_access_request(organization_id, actor_user_id, payload.model_dump())
        await self._audit(organization_id, actor_user_id, "org_governance.access_requested", "access_request", str(row.id), {"permission": row.requested_permission})
        await self.session.commit()
        return AccessRequestRead.model_validate(row)

    async def list_access_requests(self, organization_id: UUID) -> list[AccessRequestRead]:
        return [AccessRequestRead.model_validate(row) for row in await self.repository.list_access_requests(organization_id)]

    async def review_access_request(self, organization_id: UUID, actor_user_id: UUID, request_id: UUID, payload: AccessRequestReview) -> AccessRequestRead:
        row = await self.repository.get_access_request(organization_id, request_id)
        if row is None:
            raise OrganizationGovernanceNotFoundError("Access request not found")
        row.status = payload.decision
        row.reviewed_by_user_id = actor_user_id
        row.reviewed_at = datetime.now(UTC)
        await self._audit(
            organization_id,
            actor_user_id,
            "org_governance.access_request_reviewed",
            "access_request",
            str(row.id),
            {"decision": payload.decision, "permission": row.requested_permission},
        )
        await self.session.commit()
        return AccessRequestRead.model_validate(row)

    async def create_clearance_level(self, organization_id: UUID, actor_user_id: UUID, payload: ClearanceLevelCreate) -> ClearanceLevelRead:
        row = await self.repository.create_clearance_level(organization_id, payload.model_dump())
        await self._audit(organization_id, actor_user_id, "org_governance.clearance_created", "clearance_level", str(row.id), {"code": row.code})
        await self.session.commit()
        return ClearanceLevelRead.model_validate(row)

    async def list_clearance_levels(self, organization_id: UUID) -> list[ClearanceLevelRead]:
        return [ClearanceLevelRead.model_validate(row) for row in await self.repository.list_clearance_levels(organization_id)]

    async def create_zone(self, organization_id: UUID, actor_user_id: UUID, payload: OperationalZoneCreate) -> OperationalZoneRead:
        row = await self.repository.create_zone(organization_id, payload.model_dump())
        await self._audit(organization_id, actor_user_id, "org_governance.zone_created", "operational_zone", str(row.id), {"code": row.code})
        await self.session.commit()
        return OperationalZoneRead.model_validate(row)

    async def list_zones(self, organization_id: UUID) -> list[OperationalZoneRead]:
        return [OperationalZoneRead.model_validate(row) for row in await self.repository.list_zones(organization_id)]

    async def create_device(self, organization_id: UUID, actor_user_id: UUID, payload: DeviceCreate) -> DeviceRead:
        row = await self.repository.create_device(organization_id, payload.model_dump())
        await self._audit(organization_id, actor_user_id, "org_governance.device_registered", "device", str(row.id), {"device_id": row.device_id, "status": row.status})
        await self.session.commit()
        return DeviceRead.model_validate(row)

    async def list_devices(self, organization_id: UUID) -> list[DeviceRead]:
        return [DeviceRead.model_validate(row) for row in await self.repository.list_devices(organization_id)]

    async def create_session_log(self, organization_id: UUID, actor_user_id: UUID, payload: SessionLogCreate) -> SessionLogRead:
        values = payload.model_dump()
        if payload.risk_score >= 0.75:
            values["status"] = "high_risk"
        row = await self.repository.create_session_log(organization_id, values)
        await self._audit(organization_id, actor_user_id, "org_governance.session_logged", "session", str(row.id), {"risk_score": row.risk_score, "status": row.status})
        await self.session.commit()
        return SessionLogRead.model_validate(row)

    async def list_session_logs(self, organization_id: UUID) -> list[SessionLogRead]:
        return [SessionLogRead.model_validate(row) for row in await self.repository.list_session_logs(organization_id)]

    async def simulate_access(self, organization_id: UUID, payload: AccessSimulationRequest) -> AccessSimulationRead:
        contexts = await self.repository.get_user_access_context(organization_id, payload.user_id)
        if not contexts:
            return AccessSimulationRead(allowed=False, decision="deny", matched_roles=[], matched_scope=None, reasons=["User is not a member of this organization."])
        roles = sorted({context.role_name for context in contexts})
        permission_allowed = any(has_permission([context.role_name], payload.permission) for context in contexts)
        matched_context = None
        scope_allowed = False
        scope_label: str | None = None
        for context in contexts:
            if not has_permission([context.role_name], payload.permission):
                continue
            if is_scope_authorized(
                scope=AccessScope(
                    scope_type=ScopeType(context.scope_type),
                    geography_ids=frozenset([context.geography_id] if context.geography_id else []),
                    project_ids=frozenset([context.project_id] if context.project_id else []),
                    organization_unit_ids=frozenset([str(context.organization_unit_id)] if context.organization_unit_id else []),
                ),
                target_geography_id=payload.geography_id,
                target_project_id=payload.project_id,
                target_organization_unit_id=str(payload.organization_unit_id) if payload.organization_unit_id else None,
            ):
                matched_context = context
                scope_allowed = True
                scope_label = context.scope_type
                break
        reasons: list[str] = []
        if permission_allowed:
            reasons.append("Role grants the requested permission.")
        else:
            reasons.append("Role does not grant the requested permission.")
        if scope_allowed:
            reasons.append("Current assignment scope covers the requested context.")
        else:
            reasons.append("Current assignment scope does not cover the requested context.")
        allowed = matched_context is not None
        return AccessSimulationRead(
            allowed=allowed,
            decision="allow" if allowed else "deny",
            matched_roles=roles,
            matched_scope=scope_label,
            reasons=reasons,
        )

    async def _audit(self, organization_id: UUID, actor_user_id: UUID, action: str, resource_type: str, resource_id: str, metadata: dict[str, object]) -> None:
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata=metadata,
        )
