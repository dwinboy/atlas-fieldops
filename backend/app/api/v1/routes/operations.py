from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.operations import (
    BeneficiaryCreate,
    BeneficiaryMergeRead,
    BeneficiaryMergeRequest,
    BeneficiaryRead,
    BulkEditRead,
    BulkEditRequest,
    CaseCreate,
    CaseRead,
    DataRouteCreate,
    DataRouteRead,
    DataQualitySignalRead,
    DataQualitySignalUpdate,
    DonorReportCreate,
    DonorReportRead,
    EntityDuplicateCandidateRead,
    EntityDuplicateCheckRequest,
    EntityPrefillRead,
    ExportJobCreate,
    ExportJobRead,
    FieldVisitRequestRead,
    FieldVisitRequestReview,
    FieldVisitOutcomeReview,
    ImportAnalysisRequest,
    ImportAnalysisResponse,
    ImportApplyResponse,
    ImportConfirmRequest,
    ImportErrorReportRead,
    ImportJobCreate,
    ImportJobRead,
    ImportMigrationOverviewRead,
    ImportRowRead,
    ImportRowUpdate,
    ImportRollbackRead,
    ImportRollbackRequest,
    ImportPreviewRequest,
    ImportPreviewResponse,
    ImportSupportedSourceRead,
    ImportUploadResponse,
    IndicatorCreate,
    IndicatorRead,
    InterventionCreate,
    InterventionRead,
    KnowledgeDocumentCreate,
    KnowledgeDocumentRead,
    MappingTemplateCreate,
    MediaEvidenceCreate,
    MediaEvidenceRead,
    OperationalActivityReportRead,
    MobileSyncPackageRead,
    OperationalAssetCreate,
    OperationalAssetRead,
    OperationalEcosystemRead,
    OperationalEventCreate,
    OperationalEventRead,
    OperationalTaskCreate,
    OperationalTaskRead,
    OrganizationalUnitCreate,
    OrganizationalUnitImportResponse,
    OrganizationalUnitRead,
    OperationsSummary,
    ProgramCreate,
    ProgramRead,
    ProjectBudgetLineCreate,
    ProjectBudgetLineRead,
    PublicCollectionLinkCreate,
    PublicCollectionLinkRead,
    WorkflowDefinitionCreate,
    WorkflowDefinitionRead,
)
from app.services.operations import OperationsService

router = APIRouter()


def organization_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.organization_id)


def user_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.user_id)


@router.get("/summary", response_model=OperationsSummary, summary="Get M&E operations summary")
async def operations_summary(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.REPORT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OperationsSummary:
    return await OperationsService(session).summary(organization_uuid(principal))


@router.get("/ecosystem", response_model=OperationalEcosystemRead, summary="Get connected operational ecosystem graph")
async def operational_ecosystem(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.REPORT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OperationalEcosystemRead:
    return await OperationsService(session).ecosystem(organization_uuid(principal))


@router.post("/events", response_model=OperationalEventRead, status_code=status.HTTP_201_CREATED, summary="Record an operational event")
async def record_operational_event(
    payload: OperationalEventCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.REPORT_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OperationalEventRead:
    try:
        event = await OperationsService(session).record_operational_event(
            organization_id=organization_uuid(principal),
            actor_user_id=user_uuid(principal),
            payload=payload,
        )
        await session.commit()
        return event
    except Exception:
        await session.rollback()
        raise


@router.post("/units", response_model=OrganizationalUnitRead, status_code=status.HTTP_201_CREATED, summary="Create organizational unit")
async def create_unit(
    payload: OrganizationalUnitCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OrganizationalUnitRead:
    return await OperationsService(session).create_unit(organization_uuid(principal), user_uuid(principal), payload)


@router.post(
    "/units/import",
    response_model=OrganizationalUnitImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk import organization units from CSV",
)
async def import_units(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    file: UploadFile = File(...),
) -> OrganizationalUnitImportResponse:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a CSV file")
    try:
        return await OperationsService(session).import_units_csv(
            organization_uuid(principal),
            user_uuid(principal),
            await file.read(),
        )
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post("/workflow-definitions", response_model=WorkflowDefinitionRead, status_code=status.HTTP_201_CREATED, summary="Configure approval workflow")
async def create_workflow_definition(
    payload: WorkflowDefinitionCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.REPORT_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> WorkflowDefinitionRead:
    return await OperationsService(session).create_workflow_definition(organization_uuid(principal), user_uuid(principal), payload)


@router.post("/data-routes", response_model=DataRouteRead, status_code=status.HTTP_201_CREATED, summary="Route data to a role, team, or user")
async def route_data(
    payload: DataRouteCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.REPORT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DataRouteRead:
    try:
        return await OperationsService(session).route_data(organization_uuid(principal), user_uuid(principal), payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/tasks", response_model=OperationalTaskRead, status_code=status.HTTP_201_CREATED, summary="Create operational task")
async def create_task(
    payload: OperationalTaskCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.CASE_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OperationalTaskRead:
    return await OperationsService(session).create_task(organization_uuid(principal), user_uuid(principal), payload)


@router.get(
    "/operational-activities/reports/{report_type}",
    response_model=OperationalActivityReportRead,
    summary="Generate an operational activity report",
)
async def operational_activity_report(
    report_type: str,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OPERATIONS_REPORTS_VIEW))],
    session: Annotated[AsyncSession, Depends(get_session)],
    period_start: date | None = Query(default=None),
    period_end: date | None = Query(default=None),
) -> OperationalActivityReportRead:
    allowed = {
        "monthly_operations",
        "field_officer_movement",
        "incident_report",
        "supervisor_approval",
        "gps_exception",
    }
    if report_type not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported operational activity report type.")
    return await OperationsService(session).operational_activity_report(
        organization_id=organization_uuid(principal),
        report_type=report_type,
        period_start=period_start,
        period_end=period_end,
        actor_user_id=user_uuid(principal),
        actor_roles=principal.roles,
        actor_project_ids=principal.project_ids,
    )


@router.get(
    "/operational-activities/{activity_id}/media-evidence",
    response_model=list[MediaEvidenceRead],
    summary="List media evidence attached to an operational activity",
)
async def list_operational_activity_media_evidence(
    activity_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OPERATIONS_EVIDENCE_VIEW))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[MediaEvidenceRead]:
    try:
        return await OperationsService(session).list_activity_media_evidence(
            organization_uuid(principal),
            activity_id,
            actor_user_id=user_uuid(principal),
            actor_roles=principal.roles,
            actor_project_ids=principal.project_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/operational-activities/{activity_id}/media-evidence",
    response_model=MediaEvidenceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Attach media evidence to an operational activity",
)
async def create_operational_activity_media_evidence(
    activity_id: UUID,
    payload: MediaEvidenceCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OPERATIONS_EVIDENCE_ATTACH))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MediaEvidenceRead:
    try:
        result = await OperationsService(session).create_activity_media_evidence(
            organization_id=organization_uuid(principal),
            actor_user_id=user_uuid(principal),
            activity_id=activity_id,
            payload=payload,
            actor_roles=principal.roles,
            actor_project_ids=principal.project_ids,
        )
        await session.commit()
        return result
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.get(
    "/field-visit-requests",
    response_model=list[FieldVisitRequestRead],
    summary="List field visit requests for supervisor review",
)
async def list_field_visit_requests(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OPERATIONS_ACTIVITIES_VIEW))],
    session: Annotated[AsyncSession, Depends(get_session)],
    request_status: str | None = Query(default=None, alias="status", max_length=40),
) -> list[FieldVisitRequestRead]:
    return await OperationsService(session).list_field_visit_requests(
        organization_id=organization_uuid(principal),
        actor_user_id=user_uuid(principal),
        actor_roles=principal.roles,
        actor_project_ids=principal.project_ids,
        status=request_status,
    )


@router.get(
    "/operational-activities",
    response_model=list[FieldVisitRequestRead],
    summary="List organization operational activities and movement requests",
)
async def list_operational_activities(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OPERATIONS_ACTIVITIES_VIEW))],
    session: Annotated[AsyncSession, Depends(get_session)],
    request_status: str | None = Query(default=None, alias="status", max_length=40),
) -> list[FieldVisitRequestRead]:
    return await OperationsService(session).list_field_visit_requests(
        organization_id=organization_uuid(principal),
        actor_user_id=user_uuid(principal),
        actor_roles=principal.roles,
        actor_project_ids=principal.project_ids,
        status=request_status,
    )


@router.post(
    "/operational-activities/{visit_request_id}/outcome-review",
    response_model=FieldVisitRequestRead,
    summary="Review completed activity evidence and make a supervisor outcome decision",
)
async def review_operational_activity_outcome(
    visit_request_id: UUID,
    payload: FieldVisitOutcomeReview,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OPERATIONS_ACTIVITIES_REVIEW_OUTCOME))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldVisitRequestRead:
    try:
        result = await OperationsService(session).review_operational_activity_outcome(
            organization_id=organization_uuid(principal),
            actor_user_id=user_uuid(principal),
            visit_request_id=visit_request_id,
            payload=payload,
            actor_roles=principal.roles,
            actor_project_ids=principal.project_ids,
        )
        await session.commit()
        return result
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post(
    "/field-visit-requests/{visit_request_id}/review",
    response_model=FieldVisitRequestRead,
    summary="Approve, reject, or request changes for a field visit request",
)
async def review_field_visit_request(
    visit_request_id: UUID,
    payload: FieldVisitRequestReview,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OPERATIONS_ACTIVITIES_APPROVE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldVisitRequestRead:
    try:
        result = await OperationsService(session).review_field_visit_request(
            organization_id=organization_uuid(principal),
            actor_user_id=user_uuid(principal),
            visit_request_id=visit_request_id,
            payload=payload,
            actor_roles=principal.roles,
            actor_project_ids=principal.project_ids,
        )
        await session.commit()
        return result
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post(
    "/operational-activities/{visit_request_id}/review",
    response_model=FieldVisitRequestRead,
    summary="Review an organization operational activity request",
)
async def review_operational_activity(
    visit_request_id: UUID,
    payload: FieldVisitRequestReview,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OPERATIONS_ACTIVITIES_APPROVE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldVisitRequestRead:
    return await review_field_visit_request(visit_request_id, payload, principal, session)


@router.post("/interventions", response_model=InterventionRead, status_code=status.HTTP_201_CREATED, summary="Plan intervention")
async def create_intervention(
    payload: InterventionCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.PROGRAM_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> InterventionRead:
    return await OperationsService(session).create_intervention(organization_uuid(principal), user_uuid(principal), payload)


@router.post("/assets", response_model=OperationalAssetRead, status_code=status.HTTP_201_CREATED, summary="Register operational asset")
async def create_asset(
    payload: OperationalAssetCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.PROGRAM_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OperationalAssetRead:
    return await OperationsService(session).create_asset(organization_uuid(principal), user_uuid(principal), payload)


@router.post("/budget-lines", response_model=ProjectBudgetLineRead, status_code=status.HTTP_201_CREATED, summary="Create project budget line")
async def create_budget_line(
    payload: ProjectBudgetLineCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.PROGRAM_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectBudgetLineRead:
    return await OperationsService(session).create_budget_line(organization_uuid(principal), user_uuid(principal), payload)


@router.post("/documents", response_model=KnowledgeDocumentRead, status_code=status.HTTP_201_CREATED, summary="Attach knowledge document")
async def create_document(
    payload: KnowledgeDocumentCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.REPORT_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> KnowledgeDocumentRead:
    return await OperationsService(session).create_document(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/programs", response_model=list[ProgramRead], summary="List programs")
async def list_programs(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.PROGRAM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ProgramRead]:
    programs = await OperationsService(session).list_programs(organization_uuid(principal))
    return [ProgramRead.model_validate(program) for program in programs]


@router.post("/programs", response_model=ProgramRead, status_code=status.HTTP_201_CREATED, summary="Create program")
async def create_program(
    payload: ProgramCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.PROGRAM_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProgramRead:
    program = await OperationsService(session).create_program(organization_uuid(principal), payload, user_uuid(principal))
    return ProgramRead.model_validate(program)


@router.get("/beneficiaries", response_model=list[BeneficiaryRead], summary="List beneficiaries")
async def list_beneficiaries(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.BENEFICIARY_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[BeneficiaryRead]:
    beneficiaries = await OperationsService(session).list_beneficiaries(
        organization_uuid(principal),
        actor_user_id=user_uuid(principal),
        scope_type=principal.scope_type,
    )
    return [BeneficiaryRead.model_validate(beneficiary) for beneficiary in beneficiaries]


@router.get("/data-quality/signals", response_model=list[DataQualitySignalRead], summary="List data cleaning and reconciliation signals")
async def list_quality_signals(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.BENEFICIARY_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    status_filter: Annotated[str | None, Query(alias="status")] = "open",
    signal_type: Annotated[str | None, Query()] = None,
) -> list[DataQualitySignalRead]:
    return await OperationsService(session).list_quality_signals(
        organization_uuid(principal),
        status=status_filter,
        signal_type=signal_type,
    )


@router.patch("/data-quality/signals/{signal_id}", response_model=DataQualitySignalRead, summary="Update data quality signal status")
async def update_quality_signal(
    signal_id: UUID,
    payload: DataQualitySignalUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.BENEFICIARY_EDIT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DataQualitySignalRead:
    try:
        signal = await OperationsService(session).update_quality_signal(
            organization_uuid(principal),
            signal_id,
            payload,
            actor_user_id=user_uuid(principal),
        )
        await session.commit()
        return signal
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/beneficiaries/search", response_model=list[BeneficiaryRead], summary="Search beneficiary and entity registry")
async def search_beneficiaries(
    q: str,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.BENEFICIARY_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[BeneficiaryRead]:
    beneficiaries = await OperationsService(session).search_beneficiaries(
        organization_uuid(principal),
        q,
        actor_user_id=user_uuid(principal),
        scope_type=principal.scope_type,
    )
    return [BeneficiaryRead.model_validate(beneficiary) for beneficiary in beneficiaries]


@router.post(
    "/beneficiaries/duplicate-check",
    response_model=list[EntityDuplicateCandidateRead],
    summary="Check possible duplicate entities before registration or submission",
)
async def check_entity_duplicates(
    payload: EntityDuplicateCheckRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.BENEFICIARY_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[EntityDuplicateCandidateRead]:
    return await OperationsService(session).check_entity_duplicates(organization_uuid(principal), payload)


@router.post(
    "/beneficiaries/merge",
    response_model=BeneficiaryMergeRead,
    summary="Merge duplicate beneficiaries and preserve linked submissions",
)
async def merge_beneficiaries(
    payload: BeneficiaryMergeRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.BENEFICIARY_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BeneficiaryMergeRead:
    try:
        result = await OperationsService(session).merge_beneficiaries(
            organization_uuid(principal),
            user_uuid(principal),
            payload,
        )
        await session.commit()
        return result
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post(
    "/beneficiaries",
    response_model=BeneficiaryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Deprecated direct beneficiary creation",
)
async def create_beneficiary(
    payload: BeneficiaryCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.BENEFICIARY_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BeneficiaryRead:
    _ = payload, principal, session
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Beneficiaries can only be added through a project import or a project-linked mobile registration form.",
    )


@router.get(
    "/beneficiaries/{entity_id}/prefill",
    response_model=EntityPrefillRead,
    summary="Get entity profile values for form prefill",
)
async def entity_prefill(
    entity_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.BENEFICIARY_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    form_id: UUID | None = None,
) -> EntityPrefillRead:
    try:
        return await OperationsService(session).entity_prefill(organization_uuid(principal), entity_id, form_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get(
    "/mobile/assigned-entities",
    response_model=list[BeneficiaryRead],
    summary="Mobile-ready assigned entities API placeholder",
)
async def mobile_assigned_entities(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.BENEFICIARY_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[BeneficiaryRead]:
    beneficiaries = await OperationsService(session).list_beneficiaries(
        organization_uuid(principal),
        actor_user_id=user_uuid(principal),
        scope_type=principal.scope_type,
    )
    return [BeneficiaryRead.model_validate(beneficiary) for beneficiary in beneficiaries]


@router.get(
    "/mobile/sync-package",
    response_model=MobileSyncPackageRead,
    summary="Mobile-ready sync package placeholder",
)
async def mobile_sync_package(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MobileSyncPackageRead:
    return await OperationsService(session).mobile_sync_package(organization_uuid(principal))


@router.get("/indicators", response_model=list[IndicatorRead], summary="List indicators")
async def list_indicators(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.INDICATOR_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[IndicatorRead]:
    return await OperationsService(session).list_indicators(organization_uuid(principal))


@router.post("/indicators", response_model=IndicatorRead, status_code=status.HTTP_201_CREATED, summary="Create indicator")
async def create_indicator(
    payload: IndicatorCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.INDICATOR_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> IndicatorRead:
    return await OperationsService(session).create_indicator(organization_uuid(principal), payload, user_uuid(principal))


@router.get("/cases", response_model=list[CaseRead], summary="List cases")
async def list_cases(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.CASE_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[CaseRead]:
    cases = await OperationsService(session).list_cases(organization_uuid(principal))
    return [CaseRead.model_validate(case) for case in cases]


@router.post("/cases", response_model=CaseRead, status_code=status.HTTP_201_CREATED, summary="Create case")
async def create_case(
    payload: CaseCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.CASE_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CaseRead:
    case = await OperationsService(session).create_case(organization_uuid(principal), payload, user_uuid(principal))
    return CaseRead.model_validate(case)


@router.get("/reports", response_model=list[DonorReportRead], summary="List donor reports")
async def list_reports(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.REPORT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[DonorReportRead]:
    reports = await OperationsService(session).list_reports(organization_uuid(principal))
    return [DonorReportRead.model_validate(report) for report in reports]


@router.post("/reports", response_model=DonorReportRead, status_code=status.HTTP_201_CREATED, summary="Create donor report")
async def create_report(
    payload: DonorReportCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.REPORT_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DonorReportRead:
    report = await OperationsService(session).create_report(organization_uuid(principal), payload)
    return DonorReportRead.model_validate(report)


@router.post("/data/imports/preview", response_model=ImportPreviewResponse, summary="Preview and validate imported data")
async def preview_import(
    payload: ImportPreviewRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ImportPreviewResponse:
    _ = principal
    return await OperationsService(session).preview_import(payload)


@router.post("/data/imports/analyze", response_model=ImportAnalysisResponse, summary="Analyze migration data and detect import risks")
async def analyze_import(
    payload: ImportAnalysisRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ImportAnalysisResponse:
    _ = principal
    return await OperationsService(session).analyze_import(payload)


@router.get("/data/migration/overview", response_model=ImportMigrationOverviewRead, summary="Get import and migration overview")
async def migration_overview(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ImportMigrationOverviewRead:
    return await OperationsService(session).migration_overview(organization_uuid(principal))


@router.get("/data/migration/sources", response_model=list[ImportSupportedSourceRead], summary="List supported import sources")
async def list_supported_import_sources(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ImportSupportedSourceRead]:
    _ = principal
    return await OperationsService(session).list_supported_import_sources()


@router.post("/data/imports/upload", response_model=ImportUploadResponse, status_code=status.HTTP_201_CREATED, summary="Upload and parse an editable import file")
async def upload_import_file(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
    dataset_type: Annotated[str, Form()],
    file: Annotated[UploadFile, File()],
    target_project_id: Annotated[UUID | None, Form()] = None,
    target_mode: Annotated[str, Form()] = "existing_project",
    source_system: Annotated[str, Form()] = "Uploaded File",
    import_reason: Annotated[str | None, Form()] = None,
) -> ImportUploadResponse:
    try:
        content = await file.read()
        return await OperationsService(session).upload_import_file(
            organization_id=organization_uuid(principal),
            user_id=user_uuid(principal),
            dataset_type=dataset_type,
            filename=file.filename or "upload.csv",
            content=content,
            target_project_id=target_project_id,
            target_mode=target_mode,
            source_system=source_system,
            import_reason=import_reason,
        )
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.get("/data/imports", response_model=list[ImportJobRead], summary="List import jobs")
async def list_import_jobs(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ImportJobRead]:
    return await OperationsService(session).list_import_jobs(organization_uuid(principal))


@router.get("/data/migration/history", response_model=list[ImportJobRead], summary="List migration import history")
async def list_migration_history(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ImportJobRead]:
    return await OperationsService(session).list_import_jobs(organization_uuid(principal))


@router.post("/data/imports", response_model=ImportJobRead, status_code=status.HTTP_201_CREATED, summary="Create import job")
async def create_import_job(
    payload: ImportJobCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ImportJobRead:
    try:
        return await OperationsService(session).create_import_job(organization_uuid(principal), user_uuid(principal), payload)
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/data/imports/{import_job_id}/rows", response_model=list[ImportRowRead], summary="List editable rows from an import")
async def list_import_rows(
    import_job_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ImportRowRead]:
    return await OperationsService(session).list_import_rows(organization_uuid(principal), import_job_id)


@router.patch("/data/imports/{import_job_id}/rows/{row_id}", response_model=ImportRowRead, summary="Edit one imported row")
async def update_import_row(
    import_job_id: UUID,
    row_id: UUID,
    payload: ImportRowUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_BULK_EDIT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ImportRowRead:
    try:
        return await OperationsService(session).update_import_row(
            organization_uuid(principal),
            import_job_id,
            row_id,
            payload,
        )
    except KeyError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import row not found") from exc


@router.get("/data/imports/{import_job_id}/error-report", response_model=ImportErrorReportRead, summary="Download import error report data")
async def import_error_report(
    import_job_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ImportErrorReportRead:
    try:
        return await OperationsService(session).import_error_report(organization_uuid(principal), import_job_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found") from exc


@router.post("/data/imports/{import_job_id}/confirm", response_model=ImportApplyResponse, summary="Confirm and process a migration import")
async def confirm_import_job(
    import_job_id: UUID,
    payload: ImportConfirmRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ImportApplyResponse:
    try:
        return await OperationsService(session).confirm_import_job(
            organization_uuid(principal),
            user_uuid(principal),
            import_job_id,
            payload,
        )
    except KeyError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found") from exc
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/data/imports/{import_job_id}/rollback", response_model=ImportRollbackRead, summary="Rollback an import batch where safe")
async def rollback_import_job(
    import_job_id: UUID,
    payload: ImportRollbackRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ImportRollbackRead:
    try:
        return await OperationsService(session).rollback_import_job(
            organization_uuid(principal),
            user_uuid(principal),
            import_job_id,
            payload,
        )
    except KeyError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found") from exc
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/data/imports/{import_job_id}/apply", response_model=ImportApplyResponse, summary="Apply a validated import to live operational records")
async def apply_import_job(
    import_job_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ImportApplyResponse:
    try:
        return await OperationsService(session).apply_import_job(
            organization_uuid(principal),
            user_uuid(principal),
            import_job_id,
        )
    except KeyError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found") from exc
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/data/mapping-templates", status_code=status.HTTP_204_NO_CONTENT, summary="Save import mapping template")
async def create_mapping_template(
    payload: MappingTemplateCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    await OperationsService(session).create_mapping_template(organization_uuid(principal), payload)


@router.get("/data/exports", response_model=list[ExportJobRead], summary="List export jobs")
async def list_export_jobs(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_EXPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ExportJobRead]:
    return await OperationsService(session).list_export_jobs(organization_uuid(principal))


@router.post("/data/exports", response_model=ExportJobRead, status_code=status.HTTP_201_CREATED, summary="Create export job")
async def create_export_job(
    payload: ExportJobCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_EXPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ExportJobRead:
    return await OperationsService(session).create_export_job(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/data/public-links", response_model=list[PublicCollectionLinkRead], summary="List public collection links")
async def list_public_collection_links(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[PublicCollectionLinkRead]:
    return await OperationsService(session).list_public_collection_links(organization_uuid(principal))


@router.post("/data/public-links", response_model=PublicCollectionLinkRead, status_code=status.HTTP_201_CREATED, summary="Create public collection link")
async def create_public_collection_link(
    payload: PublicCollectionLinkCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PublicCollectionLinkRead:
    return await OperationsService(session).create_public_collection_link(organization_uuid(principal), user_uuid(principal), payload)


@router.get("/data/media-evidence", response_model=list[MediaEvidenceRead], summary="List media evidence")
async def list_media_evidence(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[MediaEvidenceRead]:
    return await OperationsService(session).list_media_evidence(organization_uuid(principal))


@router.post("/data/media-evidence", response_model=MediaEvidenceRead, status_code=status.HTTP_201_CREATED, summary="Create media evidence record")
async def create_media_evidence(
    payload: MediaEvidenceCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MediaEvidenceRead:
    return await OperationsService(session).create_media_evidence(organization_uuid(principal), user_uuid(principal), payload)


@router.post("/data/bulk-edits", response_model=BulkEditRead, status_code=status.HTTP_201_CREATED, summary="Create bulk edit batch")
async def create_bulk_edit_batch(
    payload: BulkEditRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_BULK_EDIT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BulkEditRead:
    return await OperationsService(session).create_bulk_edit_batch(organization_uuid(principal), user_uuid(principal), payload)
