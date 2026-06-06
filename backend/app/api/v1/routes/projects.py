from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.operations import BeneficiaryRead, ImportJobRead
from app.schemas.projects import ProjectCreate, ProjectDetailRead, ProjectListItemRead, ProjectSummaryRead, ProjectTemplateRead
from app.services.operations import OperationsService
from app.services.projects import ProjectConflictError, ProjectNotFoundError, ProjectsService

router = APIRouter()


def organization_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.organization_id)


def user_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.user_id)


@router.get("/summary", response_model=ProjectSummaryRead, summary="Get Projects overview metrics")
async def summary(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.PROGRAM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectSummaryRead:
    return await ProjectsService(session).summary(organization_uuid(principal))


@router.get("", response_model=list[ProjectListItemRead], summary="List organization projects")
async def list_projects(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.PROGRAM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ProjectListItemRead]:
    return await ProjectsService(session).list_projects(organization_uuid(principal))


@router.post("", response_model=ProjectListItemRead, status_code=status.HTTP_201_CREATED, summary="Create project")
async def create_project(
    payload: ProjectCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.PROGRAM_CREATE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectListItemRead:
    try:
        return await ProjectsService(session).create_project(organization_uuid(principal), user_uuid(principal), payload)
    except ProjectConflictError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/templates", response_model=list[ProjectTemplateRead], summary="List project templates")
async def templates(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.PROGRAM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ProjectTemplateRead]:
    _ = principal
    return await ProjectsService(session).templates()


@router.get("/{project_id}/beneficiaries", response_model=list[BeneficiaryRead], summary="List project beneficiaries and entities")
async def project_beneficiaries(
    project_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.BENEFICIARY_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[BeneficiaryRead]:
    beneficiaries = await OperationsService(session).list_beneficiaries(organization_uuid(principal))
    return [
        BeneficiaryRead.model_validate(beneficiary)
        for beneficiary in beneficiaries
        if beneficiary.project_id == project_id
    ]


@router.get("/{project_id}/data-imports", response_model=list[ImportJobRead], summary="List project import batches")
async def project_data_imports(
    project_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.DATA_IMPORT))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ImportJobRead]:
    jobs = await OperationsService(session).list_import_jobs(organization_uuid(principal))
    return [job for job in jobs if job.target_project_id == project_id]


@router.get("/{project_id}", response_model=ProjectDetailRead, summary="Get project detail workspace")
async def project_detail(
    project_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.PROGRAM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectDetailRead:
    try:
        return await ProjectsService(session).get_project_detail(organization_uuid(principal), project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
