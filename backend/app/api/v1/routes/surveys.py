from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.collection import (
    SurveyCreate,
    SurveyGovernanceSettings,
    SurveyRead,
    SurveyTeamMemberCreate,
    SurveyTeamMemberRead,
)
from app.services.collection import CollectionNotFoundError, SurveyService

router = APIRouter()


def organization_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.organization_id)


def user_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.user_id)


@router.get("", response_model=list[SurveyRead], summary="List surveys by organization or project")
async def list_surveys(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SURVEY_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    project_id: Annotated[UUID | None, Query(description="Filter surveys for a single project")] = None,
) -> list[SurveyRead]:
    return await SurveyService(session).list_surveys(
        organization_id=organization_uuid(principal),
        project_id=project_id,
    )


@router.post("", response_model=SurveyRead, status_code=status.HTTP_201_CREATED, summary="Create a survey inside a project")
async def create_survey(
    payload: SurveyCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SURVEY_CREATE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SurveyRead:
    try:
        survey = await SurveyService(session).create_survey(
            organization_id=organization_uuid(principal),
            actor_user_id=user_uuid(principal),
            payload=payload,
        )
        await session.commit()
        return survey
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.patch("/{survey_id}/governance", response_model=SurveyRead, summary="Update survey-level data governance")
async def update_survey_governance(
    survey_id: UUID,
    payload: SurveyGovernanceSettings,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SURVEY_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SurveyRead:
    try:
        survey = await SurveyService(session).update_governance(
            organization_id=organization_uuid(principal),
            actor_user_id=user_uuid(principal),
            survey_id=survey_id,
            payload=payload,
        )
        await session.commit()
        return survey
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.get("/{survey_id}/team", response_model=list[SurveyTeamMemberRead], summary="List survey team members")
async def list_survey_team(
    survey_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SURVEY_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[SurveyTeamMemberRead]:
    return await SurveyService(session).list_team(
        organization_id=organization_uuid(principal),
        survey_id=survey_id,
    )


@router.post(
    "/{survey_id}/team",
    response_model=SurveyTeamMemberRead,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a user to a survey role",
)
async def add_survey_team_member(
    survey_id: UUID,
    payload: SurveyTeamMemberCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SURVEY_ASSIGN_ENUMERATORS))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SurveyTeamMemberRead:
    try:
        member = await SurveyService(session).add_team_member(
            organization_id=organization_uuid(principal),
            actor_user_id=user_uuid(principal),
            survey_id=survey_id,
            payload=payload,
        )
        await session.commit()
        return member
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise
