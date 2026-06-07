from collections.abc import Sequence
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.collection import (
    DataFormCreate,
    DataFormRead,
    DataFormSchemaRead,
    DataFormUpdate,
    FormCollectionCompatibility,
    FormControlsSettings,
    FormTemplateDetail,
    FormTemplateRead,
    TemplateDuplicateRequest,
    XlsFormWorkbook,
)
from app.services.collection import CollectionNotFoundError, FormService
from app.services.template_library import TemplateLibraryService

router = APIRouter()


@router.get("/templates", response_model=list[FormTemplateRead], summary="Browse the built-in form template library")
async def list_form_templates(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_READ))],
    category: Annotated[str | None, Query(max_length=80)] = None,
    search: Annotated[str | None, Query(max_length=120)] = None,
    organization_type: Annotated[str | None, Query(max_length=80)] = None,
) -> list[FormTemplateRead]:
    _ = principal
    return TemplateLibraryService().list_templates(category=category, search=search, organization_type=organization_type)


@router.get("/templates/recommended", response_model=list[FormTemplateRead], summary="Recommend templates for an organization type")
async def recommend_form_templates(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_READ))],
    organization_type: Annotated[str | None, Query(max_length=80)] = None,
) -> list[FormTemplateRead]:
    _ = principal
    return TemplateLibraryService().recommended_templates(organization_type)


@router.get("/templates/{template_id}", response_model=FormTemplateDetail, summary="Preview a form template")
async def get_form_template(
    template_id: str,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_READ))],
) -> FormTemplateDetail:
    _ = principal
    try:
        return TemplateLibraryService().get_template(template_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found") from exc


@router.post(
    "/templates/{template_id}/duplicate",
    response_model=DataFormRead,
    status_code=status.HTTP_201_CREATED,
    summary="Duplicate a template into a tenant form",
)
async def duplicate_form_template(
    template_id: str,
    payload: TemplateDuplicateRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> object:
    try:
        form = await FormService(session).duplicate_template(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            template_id_or_slug=template_id,
            payload=payload,
        )
        await session.commit()
        return form
    except KeyError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found") from exc
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.get("", response_model=list[DataFormRead], summary="List tenant forms")
async def list_forms(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Sequence[object]:
    return await FormService(session).list_forms(UUID(principal.organization_id))


@router.post("", response_model=DataFormRead, status_code=status.HTTP_201_CREATED, summary="Create a dynamic form")
async def create_form(
    payload: DataFormCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> object:
    try:
        form = await FormService(session).create_form(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            payload=payload,
        )
        await session.commit()
        return form
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.patch("/{form_id}", response_model=DataFormRead, summary="Update a dynamic form and publish a new version when needed")
async def update_form(
    form_id: UUID,
    payload: DataFormUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> object:
    try:
        form = await FormService(session).update_form(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            form_id=form_id,
            payload=payload,
        )
        await session.commit()
        return form
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.get("/{form_id}/controls", response_model=FormControlsSettings, summary="Read form governance controls")
async def get_form_controls(
    form_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FormControlsSettings:
    try:
        return await FormService(session).get_controls(organization_id=UUID(principal.organization_id), form_id=form_id)
    except CollectionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found") from exc


@router.get("/{form_id}/schema", response_model=DataFormSchemaRead, summary="Read the current form version schema")
async def get_form_schema(
    form_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DataFormSchemaRead:
    try:
        return await FormService(session).get_current_schema(organization_id=UUID(principal.organization_id), form_id=form_id)
    except CollectionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form version not found") from exc


@router.patch("/{form_id}/controls", response_model=DataFormRead, summary="Update form governance controls")
async def update_form_controls(
    form_id: UUID,
    payload: FormControlsSettings,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> object:
    try:
        form = await FormService(session).update_controls(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            form_id=form_id,
            payload=payload,
        )
        await session.commit()
        return form
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found") from exc
    except Exception:
        await session.rollback()
        raise


@router.get("/{form_id}/xlsform", response_model=XlsFormWorkbook, summary="Export a form as an XLSForm workbook structure")
async def export_form_xlsform(
    form_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> XlsFormWorkbook:
    try:
        return await FormService(session).export_xlsform(organization_id=UUID(principal.organization_id), form_id=form_id)
    except CollectionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found") from exc


@router.get("/{form_id}/compatibility", response_model=FormCollectionCompatibility, summary="Check form collection compatibility")
async def get_form_collection_compatibility(
    form_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FormCollectionCompatibility:
    try:
        return await FormService(session).collection_compatibility(organization_id=UUID(principal.organization_id), form_id=form_id)
    except CollectionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found") from exc
