from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collection import (
    DataForm,
    DataFormVersion,
    FieldOfficerProfile,
    FormTemplateUsage,
    MobileSyncBatch,
    Submission,
    SubmissionStatusHistory,
    SubmissionVersion,
)
from app.models.identity import User


class FieldOfficerRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_profile(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
        employee_code: str | None,
        phone_number: str | None,
        home_region: str | None,
    ) -> FieldOfficerProfile:
        profile = FieldOfficerProfile(
            organization_id=organization_id,
            user_id=user_id,
            employee_code=employee_code,
            phone_number=phone_number,
            home_region=home_region,
        )
        self.session.add(profile)
        await self.session.flush()
        return profile

    async def get_for_user(self, *, organization_id: UUID, user_id: UUID) -> FieldOfficerProfile | None:
        result = await self.session.execute(
            select(FieldOfficerProfile).where(
                FieldOfficerProfile.organization_id == organization_id,
                FieldOfficerProfile.user_id == user_id,
                FieldOfficerProfile.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get(self, *, organization_id: UUID, profile_id: UUID) -> FieldOfficerProfile | None:
        result = await self.session.execute(
            select(FieldOfficerProfile).where(
                FieldOfficerProfile.organization_id == organization_id,
                FieldOfficerProfile.id == profile_id,
                FieldOfficerProfile.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list(self, organization_id: UUID) -> list[tuple[FieldOfficerProfile, User]]:
        result = await self.session.execute(
            select(FieldOfficerProfile, User)
            .join(User, User.id == FieldOfficerProfile.user_id)
            .where(
                FieldOfficerProfile.organization_id == organization_id,
                FieldOfficerProfile.deleted_at.is_(None),
                User.deleted_at.is_(None),
            )
            .order_by(User.full_name)
        )
        return [(profile, user) for profile, user in result.all()]

    async def update_sync_status(
        self,
        *,
        profile: FieldOfficerProfile,
        device_id: str,
        latitude: float | None,
        longitude: float | None,
    ) -> None:
        now = datetime.now(UTC)
        profile.last_seen_at = now
        profile.last_sync_at = now
        profile.device_id = device_id
        profile.last_latitude = latitude
        profile.last_longitude = longitude
        await self.session.flush()


class FormRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        organization_id: UUID,
        created_by_user_id: UUID,
        name: str,
        slug: str,
        description: str | None,
        schema_json: dict[str, Any],
        publish: bool,
    ) -> tuple[DataForm, DataFormVersion]:
        status = "published" if publish else "draft"
        form = DataForm(
            organization_id=organization_id,
            created_by_user_id=created_by_user_id,
            name=name,
            slug=slug,
            description=description,
            status=status,
            current_version=1,
        )
        self.session.add(form)
        await self.session.flush()
        version = DataFormVersion(
            organization_id=organization_id,
            form_id=form.id,
            version=1,
            schema_json=schema_json,
            offline_compatible=True,
            published_at=datetime.now(UTC) if publish else None,
        )
        self.session.add(version)
        await self.session.flush()
        return form, version

    async def list(self, organization_id: UUID) -> list[DataForm]:
        result = await self.session.execute(
            select(DataForm)
            .where(DataForm.organization_id == organization_id, DataForm.deleted_at.is_(None))
            .order_by(DataForm.updated_at.desc())
        )
        return list(result.scalars())

    async def get_version(self, *, organization_id: UUID, form_id: UUID, version: int) -> DataFormVersion | None:
        result = await self.session.execute(
            select(DataFormVersion).where(
                DataFormVersion.organization_id == organization_id,
                DataFormVersion.form_id == form_id,
                DataFormVersion.version == version,
            )
        )
        return result.scalar_one_or_none()

    async def record_template_usage(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        template_slug: str,
        created_form_id: UUID,
        metadata: dict[str, Any],
    ) -> FormTemplateUsage:
        usage = FormTemplateUsage(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            template_id=None,
            template_slug=template_slug,
            created_form_id=created_form_id,
            action="duplicated",
            metadata_json=metadata,
        )
        self.session.add(usage)
        await self.session.flush()
        return usage


class SubmissionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_client_id(self, *, organization_id: UUID, client_submission_id: str) -> Submission | None:
        result = await self.session.execute(
            select(Submission).where(
                Submission.organization_id == organization_id,
                Submission.client_submission_id == client_submission_id,
                Submission.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        organization_id: UUID,
        form_id: UUID,
        form_version_id: UUID,
        field_officer_id: UUID,
        actor_user_id: UUID,
        client_submission_id: str,
        payload_json: dict[str, Any],
        device_id: str,
        captured_at: datetime,
        submitted_at: datetime,
        offline_created: bool,
        latitude: float,
        longitude: float,
        altitude: float | None,
        accuracy: float | None,
        location_captured_at: datetime,
        status: str = "submitted",
    ) -> Submission:
        now = datetime.now(UTC)
        submission = Submission(
            organization_id=organization_id,
            form_id=form_id,
            form_version_id=form_version_id,
            field_officer_id=field_officer_id,
            client_submission_id=client_submission_id,
            payload_json=payload_json,
            device_id=device_id,
            captured_at=captured_at,
            submitted_at=submitted_at,
            sync_received_at=now,
            offline_created=offline_created,
            latitude=latitude,
            longitude=longitude,
            altitude=altitude,
            accuracy=accuracy,
            location_captured_at=location_captured_at,
            status=status,
        )
        self.session.add(submission)
        await self.session.flush()
        await self.add_version(submission=submission, actor_user_id=actor_user_id, reason="initial sync")
        await self.add_status_history(
            organization_id=organization_id,
            submission_id=submission.id,
            actor_user_id=actor_user_id,
            from_status=None,
            to_status=status,
            comment="Submission received from mobile sync",
        )
        return submission

    async def list_for_review(self, organization_id: UUID, status: str | None = None) -> list[Submission]:
        query = select(Submission).where(Submission.organization_id == organization_id, Submission.deleted_at.is_(None))
        if status:
            query = query.where(Submission.status == status)
        result = await self.session.execute(query.order_by(Submission.sync_received_at.desc()).limit(200))
        return list(result.scalars())

    async def get(self, *, organization_id: UUID, submission_id: UUID) -> Submission | None:
        result = await self.session.execute(
            select(Submission).where(
                Submission.organization_id == organization_id,
                Submission.id == submission_id,
                Submission.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def transition(
        self,
        *,
        submission: Submission,
        actor_user_id: UUID,
        to_status: str,
        comment: str,
    ) -> Submission:
        previous_status = submission.status
        submission.status = to_status
        if to_status == "resubmitted":
            submission.server_sequence += 1
        await self.add_status_history(
            organization_id=submission.organization_id,
            submission_id=submission.id,
            actor_user_id=actor_user_id,
            from_status=previous_status,
            to_status=to_status,
            comment=comment,
        )
        await self.session.flush()
        return submission

    async def add_version(self, *, submission: Submission, actor_user_id: UUID, reason: str | None) -> SubmissionVersion:
        version = SubmissionVersion(
            organization_id=submission.organization_id,
            submission_id=submission.id,
            version=submission.server_sequence,
            status=submission.status,
            payload_json=submission.payload_json,
            changed_by_user_id=actor_user_id,
            change_reason=reason,
        )
        self.session.add(version)
        await self.session.flush()
        return version

    async def add_status_history(
        self,
        *,
        organization_id: UUID,
        submission_id: UUID,
        actor_user_id: UUID,
        from_status: str | None,
        to_status: str,
        comment: str | None,
    ) -> SubmissionStatusHistory:
        history = SubmissionStatusHistory(
            organization_id=organization_id,
            submission_id=submission_id,
            actor_user_id=actor_user_id,
            from_status=from_status,
            to_status=to_status,
            comment=comment,
        )
        self.session.add(history)
        await self.session.flush()
        return history

    async def history(self, *, organization_id: UUID, submission_id: UUID) -> list[SubmissionStatusHistory]:
        result = await self.session.execute(
            select(SubmissionStatusHistory)
            .where(
                SubmissionStatusHistory.organization_id == organization_id,
                SubmissionStatusHistory.submission_id == submission_id,
            )
            .order_by(SubmissionStatusHistory.created_at)
        )
        return list(result.scalars())


class SyncRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_batch(
        self,
        *,
        organization_id: UUID,
        field_officer_id: UUID,
        device_id: str,
        client_batch_id: str,
        processed_count: int,
        conflict_count: int,
    ) -> MobileSyncBatch:
        batch = MobileSyncBatch(
            organization_id=organization_id,
            field_officer_id=field_officer_id,
            device_id=device_id,
            client_batch_id=client_batch_id,
            processed_count=processed_count,
            conflict_count=conflict_count,
        )
        self.session.add(batch)
        await self.session.flush()
        return batch
