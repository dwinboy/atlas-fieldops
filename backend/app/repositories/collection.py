from __future__ import annotations

import builtins
from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collection import (
    DataForm,
    DataFormVersion,
    FieldOfficerProfile,
    FormTemplateUsage,
    MobileSyncBatch,
    OfficerAssignment,
    Project,
    Submission,
    SubmissionRepeatRow,
    SubmissionStatusHistory,
    SubmissionVersion,
    Survey,
    SurveyTeamMember,
)
from app.models.identity import User
from app.models.operations import Beneficiary


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

    async def upsert_assignment(
        self,
        *,
        organization_id: UUID,
        officer_id: UUID,
        project_id: UUID,
        form_id: UUID | None,
        region: str | None,
        is_active: bool,
    ) -> OfficerAssignment:
        form_filter = (
            OfficerAssignment.form_id.is_(None)
            if form_id is None
            else OfficerAssignment.form_id == form_id
        )
        result = await self.session.execute(
            select(OfficerAssignment).where(
                OfficerAssignment.organization_id == organization_id,
                OfficerAssignment.officer_id == officer_id,
                OfficerAssignment.project_id == project_id,
                form_filter,
                OfficerAssignment.deleted_at.is_(None),
            )
        )
        assignment = result.scalar_one_or_none()
        if assignment is None:
            assignment = OfficerAssignment(
                organization_id=organization_id,
                officer_id=officer_id,
                project_id=project_id,
                form_id=form_id,
                region=region,
                is_active=is_active,
            )
            self.session.add(assignment)
        else:
            assignment.form_id = form_id
            assignment.region = region
            assignment.is_active = is_active
        await self.session.flush()
        return assignment


class FormRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        organization_id: UUID,
        project_id: UUID,
        survey_id: UUID,
        created_by_user_id: UUID,
        name: str,
        slug: str,
        description: str | None,
        schema_json: dict[str, Any],
        publish: bool,
        form_type: str | None = None,
    ) -> tuple[DataForm, DataFormVersion]:
        status = "published" if publish else "draft"
        form = DataForm(
            organization_id=organization_id,
            project_id=project_id,
            survey_id=survey_id,
            created_by_user_id=created_by_user_id,
            name=name,
            slug=slug,
            description=description,
            form_type=form_type,
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
            published_by_user_id=created_by_user_id if publish else None,
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

    async def get(self, *, organization_id: UUID, form_id: UUID) -> DataForm | None:
        result = await self.session.execute(
            select(DataForm).where(
                DataForm.organization_id == organization_id,
                DataForm.id == form_id,
                DataForm.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_current_version(self, *, organization_id: UUID, form_id: UUID) -> DataFormVersion | None:
        form = await self.get(organization_id=organization_id, form_id=form_id)
        if form is None:
            return None
        return await self.get_version(organization_id=organization_id, form_id=form_id, version=form.current_version)

    async def get_version(self, *, organization_id: UUID, form_id: UUID, version: int) -> DataFormVersion | None:
        result = await self.session.execute(
            select(DataFormVersion).where(
                DataFormVersion.organization_id == organization_id,
                DataFormVersion.form_id == form_id,
                DataFormVersion.version == version,
            )
        )
        return result.scalar_one_or_none()

    async def update_controls(self, *, form: DataForm, controls_json: dict[str, Any]) -> DataForm:
        form.controls_json = controls_json
        form.updated_at = datetime.now(UTC)
        await self.session.flush()
        return form

    async def update_status(self, *, form: DataForm, status: str) -> DataForm:
        form.status = status
        form.updated_at = datetime.now(UTC)
        await self.session.flush()
        return form

    async def save_schema_revision(
        self,
        *,
        form: DataForm,
        actor_user_id: UUID,
        name: str,
        description: str | None,
        schema_json: dict[str, Any],
        publish: bool,
        form_type: str | None = None,
    ) -> tuple[DataForm, DataFormVersion]:
        now = datetime.now(UTC)
        form.name = name
        form.description = description
        form.updated_at = now
        if form_type is not None:
            form.form_type = form_type

        if form.status == "published":
            next_version = form.current_version + 1
            version = DataFormVersion(
                organization_id=form.organization_id,
                form_id=form.id,
                version=next_version,
                schema_json=schema_json,
                offline_compatible=True,
                published_at=now if publish else None,
                published_by_user_id=actor_user_id if publish else None,
            )
            self.session.add(version)
            form.current_version = next_version
            form.status = "published" if publish else "draft"
            await self.session.flush()
            return form, version

        version = await self.get_current_version(
            organization_id=form.organization_id,
            form_id=form.id,
        )
        if version is None:
            version = DataFormVersion(
                organization_id=form.organization_id,
                form_id=form.id,
                version=form.current_version,
                schema_json=schema_json,
                offline_compatible=True,
                published_at=now if publish else None,
                published_by_user_id=actor_user_id if publish else None,
            )
            self.session.add(version)
        else:
            version.schema_json = schema_json
            version.offline_compatible = True
            if publish:
                version.published_at = now
                version.published_by_user_id = actor_user_id
        form.status = "published" if publish else "draft"
        await self.session.flush()
        return form, version

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


class SurveyRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def project_exists(self, *, organization_id: UUID, project_id: UUID) -> bool:
        result = await self.session.execute(
            select(Project.id).where(
                Project.organization_id == organization_id,
                Project.id == project_id,
                Project.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none() is not None

    async def create(
        self,
        *,
        organization_id: UUID,
        project_id: UUID,
        created_by_user_id: UUID,
        owner_user_id: UUID,
        manager_user_id: UUID | None,
        title: str,
        code: str,
        description: str | None,
        survey_type: str,
        custom_type_label: str | None,
        status: str,
        start_date: date | None,
        end_date: date | None,
        geographic_scope: str | None,
        target_population: str | None,
        indicator_ids: list[str],
        governance_json: dict[str, Any],
    ) -> Survey:
        survey = Survey(
            organization_id=organization_id,
            project_id=project_id,
            created_by_user_id=created_by_user_id,
            owner_user_id=owner_user_id,
            manager_user_id=manager_user_id,
            title=title,
            code=code,
            description=description,
            survey_type=survey_type,
            custom_type_label=custom_type_label,
            status=status,
            start_date=start_date,
            end_date=end_date,
            geographic_scope=geographic_scope,
            target_population=target_population,
            indicator_ids_json=indicator_ids,
            governance_json=governance_json,
        )
        self.session.add(survey)
        await self.session.flush()
        return survey

    async def get(self, *, organization_id: UUID, survey_id: UUID) -> Survey | None:
        result = await self.session.execute(
            select(Survey).where(
                Survey.organization_id == organization_id,
                Survey.id == survey_id,
                Survey.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_for_project(self, *, organization_id: UUID, project_id: UUID, survey_id: UUID) -> Survey | None:
        result = await self.session.execute(
            select(Survey).where(
                Survey.organization_id == organization_id,
                Survey.project_id == project_id,
                Survey.id == survey_id,
                Survey.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list(self, *, organization_id: UUID, project_id: UUID | None = None) -> list[Survey]:
        query = select(Survey).where(
            Survey.organization_id == organization_id,
            Survey.deleted_at.is_(None),
        )
        if project_id is not None:
            query = query.where(Survey.project_id == project_id)
        result = await self.session.execute(query.order_by(Survey.updated_at.desc()))
        return list(result.scalars())

    async def update_governance(self, *, survey: Survey, governance_json: dict[str, Any]) -> Survey:
        survey.governance_json = governance_json
        survey.updated_at = datetime.now(UTC)
        await self.session.flush()
        return survey

    async def add_team_member(
        self,
        *,
        organization_id: UUID,
        survey_id: UUID,
        user_id: UUID,
        survey_role: str,
    ) -> SurveyTeamMember:
        member = SurveyTeamMember(
            organization_id=organization_id,
            survey_id=survey_id,
            user_id=user_id,
            survey_role=survey_role,
        )
        self.session.add(member)
        await self.session.flush()
        return member

    async def list_team(
        self, *, organization_id: UUID, survey_id: UUID
    ) -> builtins.list[SurveyTeamMember]:
        result = await self.session.execute(
            select(SurveyTeamMember)
            .where(
                SurveyTeamMember.organization_id == organization_id,
                SurveyTeamMember.survey_id == survey_id,
                SurveyTeamMember.deleted_at.is_(None),
            )
            .order_by(SurveyTeamMember.created_at.desc())
        )
        return list(result.scalars())


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

    async def find_conflicting_submission_for_frequency(
        self,
        *,
        organization_id: UUID,
        entity_id: UUID,
        form_id: UUID,
        frequency_rule: str,
        frequency_period: str | None = None,
        event_id: str | None = None,
        project_id: UUID | None = None,
        exclude_submission_id: UUID | None = None,
    ) -> Submission | None:
        if frequency_rule == "unlimited":
            return None
        if frequency_rule == "once_per_event" and not event_id:
            return None
        if frequency_rule in {"once_per_year", "once_per_season", "once_per_quarter", "once_per_month"} and not frequency_period:
            return None
        query = select(Submission).where(
            Submission.organization_id == organization_id,
            Submission.form_id == form_id,
            Submission.entity_id == entity_id,
            Submission.deleted_at.is_(None),
            Submission.status != "rejected",
        )
        if exclude_submission_id is not None:
            query = query.where(Submission.id != exclude_submission_id)
        if frequency_rule == "once_per_project":
            query = query.where(Submission.project_id == project_id)
        elif frequency_rule == "once_per_event":
            query = query.where(Submission.event_id == event_id)
        elif frequency_rule in {"once_per_year", "once_per_season", "once_per_quarter", "once_per_month"}:
            query = query.where(Submission.frequency_period == frequency_period)
        result = await self.session.execute(query.order_by(Submission.sync_received_at.desc()).limit(1))
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        organization_id: UUID,
        project_id: UUID | None,
        survey_id: UUID | None,
        form_id: UUID,
        form_version_id: UUID,
        field_officer_id: UUID | None,
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
        entity_id: UUID | None = None,
        entity_type: str | None = None,
        assignment_id: UUID | None = None,
        supervisor_id: UUID | None = None,
        frequency_period: str | None = None,
        event_id: str | None = None,
        status: str = "submitted",
        history_comment: str = "Submission received from mobile sync",
    ) -> Submission:
        now = datetime.now(UTC)
        submission = Submission(
            organization_id=organization_id,
            project_id=project_id,
            survey_id=survey_id,
            form_id=form_id,
            form_version_id=form_version_id,
            entity_id=entity_id,
            entity_type=entity_type,
            assignment_id=assignment_id,
            supervisor_id=supervisor_id,
            frequency_period=frequency_period,
            event_id=event_id,
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
            comment=history_comment,
        )
        return submission

    async def list_for_review(
        self,
        organization_id: UUID,
        status: str | None = None,
        field_officer_id: UUID | None = None,
    ) -> list[Submission]:
        query = select(Submission).where(Submission.organization_id == organization_id, Submission.deleted_at.is_(None))
        if status:
            query = query.where(Submission.status == status)
        if field_officer_id:
            query = query.where(Submission.field_officer_id == field_officer_id)
        result = await self.session.execute(query.order_by(Submission.sync_received_at.desc()).limit(200))
        return list(result.scalars())

    async def list_import_cleaning_rows(
        self,
        *,
        organization_id: UUID,
        limit: int = 500,
    ) -> list[tuple[Submission, DataForm, Project | None, User | None]]:
        result = await self.session.execute(
            select(Submission, DataForm, Project, User)
            .join(DataForm, DataForm.id == Submission.form_id)
            .outerjoin(Project, Project.id == Submission.project_id)
            .outerjoin(User, User.id == Submission.imported_by_user_id)
            .where(
                Submission.organization_id == organization_id,
                DataForm.organization_id == organization_id,
                (Project.organization_id == organization_id) | (Project.id.is_(None)),
                Submission.deleted_at.is_(None),
                Submission.is_imported.is_(True),
                Submission.status.in_(["import_staged", "under_review"]),
            )
            .order_by(Submission.updated_at.desc(), Submission.sync_received_at.desc())
            .limit(limit)
        )
        return [(submission, form, project, user) for submission, form, project, user in result.all()]

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
        now = datetime.now(UTC)
        submission.reviewed_by_user_id = actor_user_id
        submission.reviewed_at = now
        submission.review_comments = comment
        if to_status == "approved":
            submission.approved_by_user_id = actor_user_id
            submission.approved_at = now
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

    async def update_payload(
        self,
        *,
        submission: Submission,
        actor_user_id: UUID,
        payload_json: dict[str, Any],
        reason: str,
    ) -> Submission:
        submission.payload_json = payload_json
        submission.server_sequence += 1
        await self.add_version(submission=submission, actor_user_id=actor_user_id, reason=reason)
        await self.add_status_history(
            organization_id=submission.organization_id,
            submission_id=submission.id,
            actor_user_id=actor_user_id,
            from_status=submission.status,
            to_status=submission.status,
            comment=f"Responses edited: {reason}",
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

    async def beneficiary_codes(self, *, organization_id: UUID, entity_ids: set[UUID]) -> dict[UUID, str]:
        if not entity_ids:
            return {}
        result = await self.session.execute(
            select(Beneficiary.id, Beneficiary.beneficiary_uid).where(
                Beneficiary.organization_id == organization_id,
                Beneficiary.id.in_(entity_ids),
            )
        )
        return {row.id: row.beneficiary_uid for row in result.all()}

    async def field_officer_names(self, *, organization_id: UUID, field_officer_ids: set[UUID]) -> dict[UUID, str]:
        if not field_officer_ids:
            return {}
        result = await self.session.execute(
            select(FieldOfficerProfile.id, User.full_name)
            .join(User, User.id == FieldOfficerProfile.user_id)
            .where(
                FieldOfficerProfile.organization_id == organization_id,
                FieldOfficerProfile.id.in_(field_officer_ids),
            )
        )
        return {row.id: row.full_name for row in result.all()}

    async def replace_repeat_rows(
        self,
        *,
        organization_id: UUID,
        submission: Submission,
        field_id: str,
        rows: list[dict[str, Any]],
    ) -> None:
        await self.session.execute(
            delete(SubmissionRepeatRow).where(
                SubmissionRepeatRow.organization_id == organization_id,
                SubmissionRepeatRow.submission_id == submission.id,
                SubmissionRepeatRow.field_id == field_id,
            )
        )
        for index, row in enumerate(rows):
            self.session.add(
                SubmissionRepeatRow(
                    organization_id=organization_id,
                    submission_id=submission.id,
                    parent_submission_key=submission.client_submission_id,
                    field_id=field_id,
                    row_index=index,
                    row_json=row,
                )
            )

    async def list_repeat_rows(self, *, organization_id: UUID, submission_id: UUID) -> list[SubmissionRepeatRow]:
        result = await self.session.execute(
            select(SubmissionRepeatRow)
            .where(
                SubmissionRepeatRow.organization_id == organization_id,
                SubmissionRepeatRow.submission_id == submission_id,
            )
            .order_by(SubmissionRepeatRow.field_id, SubmissionRepeatRow.row_index)
        )
        return list(result.scalars())

    async def list_repeat_rows_for_form(self, *, organization_id: UUID, form_id: UUID) -> list[SubmissionRepeatRow]:
        result = await self.session.execute(
            select(SubmissionRepeatRow)
            .join(Submission, Submission.id == SubmissionRepeatRow.submission_id)
            .where(
                SubmissionRepeatRow.organization_id == organization_id,
                Submission.form_id == form_id,
            )
            .order_by(SubmissionRepeatRow.field_id, SubmissionRepeatRow.parent_submission_key, SubmissionRepeatRow.row_index)
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
