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
    CaseCreate,
    CaseRead,
    DonorReportCreate,
    DonorReportRead,
    IndicatorCreate,
    IndicatorRead,
    OperationsSummary,
    ProgramCreate,
    ProgramRead,
)
from app.services.operations import OperationsService

router = APIRouter()


def organization_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.organization_id)


@router.get("/summary", response_model=OperationsSummary, summary="Get M&E operations summary")
async def operations_summary(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.REPORT_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OperationsSummary:
    return await OperationsService(session).summary(organization_uuid(principal))


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
    program = await OperationsService(session).create_program(organization_uuid(principal), payload)
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
    beneficiary = await OperationsService(session).create_beneficiary(organization_uuid(principal), payload)
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
    return await OperationsService(session).create_indicator(organization_uuid(principal), payload)


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
    case = await OperationsService(session).create_case(organization_uuid(principal), payload)
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
