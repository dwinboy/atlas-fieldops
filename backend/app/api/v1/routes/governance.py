from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.governance import (
    ConsentRecordCreate,
    ConsentRecordRead,
    DataVersionCreate,
    DataVersionRead,
    ExportGovernanceRequest,
    ExportLogRead,
    GovernancePolicyCreate,
    GovernancePolicyRead,
    GovernanceSummary,
    LineageEventCreate,
    LineageEventRead,
    MasterDataEntryCreate,
    MasterDataEntryRead,
    RetentionPolicyCreate,
    RetentionPolicyRead,
    ValidationRuleCreate,
    ValidationRuleRead,
)
from app.services.governance import GovernanceService

router = APIRouter()


def organization_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.organization_id)


def user_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.user_id)


@router.get("/summary", response_model=GovernanceSummary, summary="Get governance command center summary")
async def governance_summary(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.AUDIT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GovernanceSummary:
    return await GovernanceService(session).summary(organization_uuid(principal))


@router.get("/policies", response_model=list[GovernancePolicyRead], summary="List governance policies")
async def list_policies(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.AUDIT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[GovernancePolicyRead]:
    return await GovernanceService(session).list_policies(organization_uuid(principal))


@router.post("/policies", response_model=GovernancePolicyRead, summary="Create governance policy")
async def create_policy(
    payload: GovernancePolicyCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.WORKFLOW_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GovernancePolicyRead:
    return await GovernanceService(session).create_policy(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/retention-policies", response_model=list[RetentionPolicyRead], summary="List retention policies")
async def list_retention_policies(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.AUDIT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[RetentionPolicyRead]:
    return await GovernanceService(session).list_retention_policies(organization_uuid(principal))


@router.post("/retention-policies", response_model=RetentionPolicyRead, summary="Create retention policy")
async def create_retention_policy(
    payload: RetentionPolicyCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.WORKFLOW_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> RetentionPolicyRead:
    return await GovernanceService(session).create_retention_policy(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/validation-rules", response_model=list[ValidationRuleRead], summary="List validation rules")
async def list_validation_rules(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.AUDIT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ValidationRuleRead]:
    return await GovernanceService(session).list_validation_rules(organization_uuid(principal))


@router.post("/validation-rules", response_model=ValidationRuleRead, summary="Create validation rule")
async def create_validation_rule(
    payload: ValidationRuleCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.WORKFLOW_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ValidationRuleRead:
    return await GovernanceService(session).create_validation_rule(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/data-versions", response_model=list[DataVersionRead], summary="List data versions")
async def list_data_versions(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.AUDIT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    entity_type: Annotated[str | None, Query()] = None,
    entity_id: Annotated[str | None, Query()] = None,
) -> list[DataVersionRead]:
    return await GovernanceService(session).list_data_versions(organization_uuid(principal), entity_type, entity_id)


@router.post("/data-versions", response_model=DataVersionRead, summary="Record data version")
async def create_data_version(
    payload: DataVersionCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_BULK_EDIT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DataVersionRead:
    return await GovernanceService(session).create_data_version(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/lineage", response_model=list[LineageEventRead], summary="List lineage events")
async def list_lineage_events(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.AUDIT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[LineageEventRead]:
    return await GovernanceService(session).list_lineage_events(organization_uuid(principal))


@router.post("/lineage", response_model=LineageEventRead, summary="Record lineage event")
async def create_lineage_event(
    payload: LineageEventCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_BULK_EDIT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LineageEventRead:
    return await GovernanceService(session).create_lineage_event(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/consent-records", response_model=list[ConsentRecordRead], summary="List consent records")
async def list_consent_records(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.AUDIT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ConsentRecordRead]:
    return await GovernanceService(session).list_consent_records(organization_uuid(principal))


@router.post("/consent-records", response_model=ConsentRecordRead, summary="Record consent")
async def create_consent_record(
    payload: ConsentRecordCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.BENEFICIARY_EDIT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ConsentRecordRead:
    return await GovernanceService(session).create_consent_record(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/export-logs", response_model=list[ExportLogRead], summary="List governed exports")
async def list_export_logs(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.AUDIT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ExportLogRead]:
    return await GovernanceService(session).list_export_logs(organization_uuid(principal))


@router.post("/export-logs", response_model=ExportLogRead, summary="Govern export request")
async def govern_export(
    payload: ExportGovernanceRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_EXPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ExportLogRead:
    return await GovernanceService(session).govern_export(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/master-data", response_model=list[MasterDataEntryRead], summary="List governed master data")
async def list_master_data_entries(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.AUDIT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[MasterDataEntryRead]:
    return await GovernanceService(session).list_master_data_entries(organization_uuid(principal))


@router.post("/master-data", response_model=MasterDataEntryRead, summary="Create governed master data entry")
async def create_master_data_entry(
    payload: MasterDataEntryCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.WORKFLOW_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MasterDataEntryRead:
    return await GovernanceService(session).create_master_data_entry(organization_uuid(principal), user_uuid(principal), payload)
