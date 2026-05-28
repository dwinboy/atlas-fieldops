from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
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
    WorkforceProfileCreate,
    WorkforceProfileRead,
)
from app.services.organization_governance import (
    OrganizationGovernanceNotFoundError,
    OrganizationGovernancePermissionError,
    OrganizationGovernanceService,
)

router = APIRouter()


def organization_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.organization_id)


def user_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.user_id)


@router.get("/summary", response_model=OrganizationGovernanceSummary, summary="Get organizational governance summary")
async def summary(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OrganizationGovernanceSummary:
    return await OrganizationGovernanceService(session).summary(organization_uuid(principal))


@router.get("/departments", response_model=list[DepartmentRead])
async def list_departments(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[DepartmentRead]:
    return await OrganizationGovernanceService(session).list_departments(organization_uuid(principal))


@router.post("/departments", response_model=DepartmentRead)
async def create_department(
    payload: DepartmentCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_HIERARCHY_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DepartmentRead:
    return await OrganizationGovernanceService(session).create_department(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/teams", response_model=list[TeamRead])
async def list_teams(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[TeamRead]:
    return await OrganizationGovernanceService(session).list_teams(organization_uuid(principal))


@router.post("/teams", response_model=TeamRead)
async def create_team(
    payload: TeamCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TeamRead:
    return await OrganizationGovernanceService(session).create_team(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/workforce-profiles", response_model=list[WorkforceProfileRead])
async def list_workforce_profiles(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[WorkforceProfileRead]:
    return await OrganizationGovernanceService(session).list_workforce_profiles(organization_uuid(principal))


@router.post("/workforce-profiles", response_model=WorkforceProfileRead)
async def create_workforce_profile(
    payload: WorkforceProfileCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> WorkforceProfileRead:
    return await OrganizationGovernanceService(session).create_workforce_profile(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/delegations", response_model=list[DelegationRead])
async def list_delegations(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ROLE_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[DelegationRead]:
    return await OrganizationGovernanceService(session).list_delegations(organization_uuid(principal))


@router.post("/delegations", response_model=DelegationRead)
async def create_delegation(
    payload: DelegationCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ROLE_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DelegationRead:
    try:
        return await OrganizationGovernanceService(session).create_delegation(organization_uuid(principal), user_uuid(principal), payload)
    except OrganizationGovernancePermissionError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/approval-matrices", response_model=list[ApprovalMatrixRead])
async def list_approval_matrices(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.WORKFLOW_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ApprovalMatrixRead]:
    return await OrganizationGovernanceService(session).list_approval_matrices(organization_uuid(principal))


@router.post("/approval-matrices", response_model=ApprovalMatrixRead)
async def create_approval_matrix(
    payload: ApprovalMatrixCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.WORKFLOW_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ApprovalMatrixRead:
    return await OrganizationGovernanceService(session).create_approval_matrix(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/access-requests", response_model=list[AccessRequestRead])
async def list_access_requests(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[AccessRequestRead]:
    return await OrganizationGovernanceService(session).list_access_requests(organization_uuid(principal))


@router.post("/access-requests", response_model=AccessRequestRead)
async def create_access_request(
    payload: AccessRequestCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AccessRequestRead:
    return await OrganizationGovernanceService(session).create_access_request(organization_uuid(principal), user_uuid(principal), payload)


@router.post("/access-requests/{request_id}/review", response_model=AccessRequestRead)
async def review_access_request(
    request_id: UUID,
    payload: AccessRequestReview,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AccessRequestRead:
    try:
        return await OrganizationGovernanceService(session).review_access_request(organization_uuid(principal), user_uuid(principal), request_id, payload)
    except OrganizationGovernanceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/clearance-levels", response_model=list[ClearanceLevelRead])
async def list_clearance_levels(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ROLE_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ClearanceLevelRead]:
    return await OrganizationGovernanceService(session).list_clearance_levels(organization_uuid(principal))


@router.post("/clearance-levels", response_model=ClearanceLevelRead)
async def create_clearance_level(
    payload: ClearanceLevelCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ROLE_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ClearanceLevelRead:
    return await OrganizationGovernanceService(session).create_clearance_level(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/zones", response_model=list[OperationalZoneRead])
async def list_zones(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.GPS_VIEW))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[OperationalZoneRead]:
    return await OrganizationGovernanceService(session).list_zones(organization_uuid(principal))


@router.post("/zones", response_model=OperationalZoneRead)
async def create_zone(
    payload: OperationalZoneCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_HIERARCHY_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OperationalZoneRead:
    return await OrganizationGovernanceService(session).create_zone(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/devices", response_model=list[DeviceRead])
async def list_devices(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.AUDIT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[DeviceRead]:
    return await OrganizationGovernanceService(session).list_devices(organization_uuid(principal))


@router.post("/devices", response_model=DeviceRead)
async def create_device(
    payload: DeviceCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.AUDIT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DeviceRead:
    return await OrganizationGovernanceService(session).create_device(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/sessions", response_model=list[SessionLogRead])
async def list_session_logs(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.AUDIT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[SessionLogRead]:
    return await OrganizationGovernanceService(session).list_session_logs(organization_uuid(principal))


@router.post("/sessions", response_model=SessionLogRead)
async def create_session_log(
    payload: SessionLogCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.AUDIT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SessionLogRead:
    return await OrganizationGovernanceService(session).create_session_log(organization_uuid(principal), user_uuid(principal), payload)


@router.post("/simulate-access", response_model=AccessSimulationRead)
async def simulate_access(
    payload: AccessSimulationRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ROLE_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AccessSimulationRead:
    return await OrganizationGovernanceService(session).simulate_access(organization_uuid(principal), payload)
