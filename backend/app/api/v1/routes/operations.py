from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.operations import (
    BeneficiaryCreate,
    BeneficiaryRead,
    BulkEditRead,
    BulkEditRequest,
    CaseCreate,
    CaseRead,
    DonorReportCreate,
    DonorReportRead,
    ExportJobCreate,
    ExportJobRead,
    ImportJobCreate,
    ImportJobRead,
    ImportPreviewRequest,
    ImportPreviewResponse,
    IndicatorCreate,
    IndicatorRead,
    InterventionCreate,
    InterventionRead,
    KnowledgeDocumentCreate,
    KnowledgeDocumentRead,
    MappingTemplateCreate,
    OperationalAssetCreate,
    OperationalAssetRead,
    OperationalEcosystemRead,
    OperationalEventCreate,
    OperationalEventRead,
    OperationalTaskCreate,
    OperationalTaskRead,
    OrganizationalUnitCreate,
    OrganizationalUnitRead,
    OperationsSummary,
    ProgramCreate,
    ProgramRead,
    ProjectBudgetLineCreate,
    ProjectBudgetLineRead,
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


@router.post("/workflow-definitions", response_model=WorkflowDefinitionRead, status_code=status.HTTP_201_CREATED, summary="Configure approval workflow")
async def create_workflow_definition(
    payload: WorkflowDefinitionCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.REPORT_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> WorkflowDefinitionRead:
    return await OperationsService(session).create_workflow_definition(organization_uuid(principal), user_uuid(principal), payload)


@router.post("/tasks", response_model=OperationalTaskRead, status_code=status.HTTP_201_CREATED, summary="Create operational task")
async def create_task(
    payload: OperationalTaskCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.CASE_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OperationalTaskRead:
    return await OperationsService(session).create_task(organization_uuid(principal), user_uuid(principal), payload)


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
    beneficiaries = await OperationsService(session).list_beneficiaries(organization_uuid(principal))
    return [BeneficiaryRead.model_validate(beneficiary) for beneficiary in beneficiaries]


@router.post(
    "/beneficiaries",
    response_model=BeneficiaryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register beneficiary",
)
async def create_beneficiary(
    payload: BeneficiaryCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.BENEFICIARY_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BeneficiaryRead:
    beneficiary = await OperationsService(session).create_beneficiary(organization_uuid(principal), payload, user_uuid(principal))
    return BeneficiaryRead.model_validate(beneficiary)


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


@router.get("/data/imports", response_model=list[ImportJobRead], summary="List import jobs")
async def list_import_jobs(
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
    return await OperationsService(session).create_import_job(organization_uuid(principal), user_uuid(principal), payload)


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


@router.post("/data/bulk-edits", response_model=BulkEditRead, status_code=status.HTTP_201_CREATED, summary="Create bulk edit batch")
async def create_bulk_edit_batch(
    payload: BulkEditRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_BULK_EDIT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BulkEditRead:
    return await OperationsService(session).create_bulk_edit_batch(organization_uuid(principal), user_uuid(principal), payload)
