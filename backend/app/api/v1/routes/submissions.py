from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.collection import (
    SubmissionCreate,
    SubmissionHistoryRead,
    SubmissionRead,
    SubmissionReviewAction,
    SyncBatchCreate,
    SyncBatchRead,
)
from app.services.collection import CollectionNotFoundError, InvalidWorkflowTransitionError, SubmissionService

router = APIRouter()


@router.get("", response_model=list[SubmissionRead], summary="List submissions for review")
async def list_submissions(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SUBMISSION_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[object]:
    return list(
        await SubmissionService(session).list_submissions(
            organization_id=UUID(principal.organization_id),
            status=status_filter,
        )
    )


@router.post(
    "",
    response_model=SubmissionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a mobile submission with enforced system metadata",
)
async def create_submission(
    payload: SubmissionCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SUBMISSION_CREATE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> object:
    try:
        submission = await SubmissionService(session).create_submission(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            payload=payload,
        )
        await session.commit()
        return submission
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post("/{submission_id}/review", response_model=SubmissionRead, summary="Review a submission")
async def review_submission(
    submission_id: UUID,
    payload: SubmissionReviewAction,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SUBMISSION_REVIEW))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> object:
    try:
        submission = await SubmissionService(session).review_submission(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            submission_id=submission_id,
            payload=payload,
        )
        await session.commit()
        return submission
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InvalidWorkflowTransitionError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.get("/{submission_id}/history", response_model=list[SubmissionHistoryRead], summary="Read submission status history")
async def submission_history(
    submission_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SUBMISSION_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[object]:
    return await SubmissionService(session).history(
        organization_id=UUID(principal.organization_id),
        submission_id=submission_id,
    )


@router.post("/sync", response_model=SyncBatchRead, summary="Process an offline mobile sync batch")
async def sync_mobile_batch(
    payload: SyncBatchCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SyncBatchRead:
    try:
        response = await SubmissionService(session).sync_batch(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            payload=payload,
        )
        await session.commit()
        return response
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise
