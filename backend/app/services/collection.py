import csv
from datetime import UTC, datetime
from io import StringIO
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.events import event_publisher
from app.core.security import hash_password
from app.models.collection import DataForm, FieldOfficerProfile, Submission
from app.repositories.audit import AuditRepository
from app.repositories.collection import FieldOfficerRepository, FormRepository, SubmissionRepository, SurveyRepository, SyncRepository
from app.repositories.identity import IdentityRepository, RoleRepository
from app.schemas.collection import (
    DataFormCreate,
    FormControlsSettings,
    FormCollectionCompatibility,
    FieldOfficerInvite,
    FieldOfficerImportIssue,
    FieldOfficerImportResponse,
    FieldOfficerRead,
    FormSchema,
    SubmissionRead,
    SubmissionCreate,
    SubmissionReviewAction,
    SurveyCreate,
    SurveyGovernanceSettings,
    SurveyRead,
    SurveyTeamMemberCreate,
    SurveyTeamMemberRead,
    SyncBatchCreate,
    SyncBatchRead,
    TemplateDuplicateRequest,
    XlsFormChoiceRow,
    XlsFormSettings,
    XlsFormSurveyRow,
    XlsFormWorkbook,
)
from app.services.template_library import TemplateLibraryService


class CollectionNotFoundError(Exception):
    pass


class CollectionConflictError(Exception):
    pass


class InvalidWorkflowTransitionError(Exception):
    pass


def xls_name(value: str) -> str:
    normalized = "".join(character.lower() if character.isalnum() else "_" for character in value.strip())
    normalized = "_".join(part for part in normalized.split("_") if part)
    return normalized or "field"


def xls_type(field_type: str, options: list[dict[str, object]], name: str) -> str:
    if options and field_type in {"select", "dropdown", "radio", "likert"}:
        return f"select_one {name}"
    if options and field_type in {"multiselect", "checkbox", "ranking"}:
        return f"select_multiple {name}"
    type_map = {
        "text": "text",
        "textarea": "text",
        "number": "integer",
        "decimal": "decimal",
        "currency": "decimal",
        "phone": "text",
        "email": "text",
        "url": "text",
        "password": "text",
        "select": "select_one",
        "dropdown": "select_one",
        "multiselect": "select_multiple",
        "radio": "select_one",
        "checkbox": "select_multiple",
        "ranking": "rank",
        "likert": "select_one likert",
        "matrix_single": "table-list",
        "matrix_multi": "table-list",
        "nps": "integer",
        "rating": "integer",
        "gps": "geopoint",
        "geolocation": "geopoint",
        "map": "geopoint",
        "geofence": "geopoint",
        "photo": "image",
        "image": "image",
        "signature": "image",
        "barcode": "barcode",
        "qr": "barcode",
        "audio": "audio",
        "video": "video",
        "file": "file",
        "date": "date",
        "time": "time",
        "datetime": "dateTime",
        "hidden": "hidden",
        "calculated": "calculate",
        "repeat_group": "begin_repeat",
        "repeatable_group": "begin_repeat",
        "grid": "table-list",
    }
    return type_map.get(field_type, "text")


def xls_constraint(field_type: str, validation: dict[str, object]) -> str | None:
    constraints: list[str] = []
    minimum = validation.get("min")
    maximum = validation.get("max")
    accuracy = validation.get("accuracyMax")
    if isinstance(minimum, int | float):
        constraints.append(f". >= {minimum}")
    if isinstance(maximum, int | float):
        constraints.append(f". <= {maximum}")
    if field_type in {"gps", "geolocation", "map", "geofence"} and isinstance(accuracy, int | float):
        constraints.append(f'pulldata("@geopoint", ., "accuracy") <= {accuracy}')
    return " and ".join(constraints) if constraints else None


def form_schema_to_xlsform(*, form_id: UUID, form_name: str, version: int, schema: FormSchema) -> XlsFormWorkbook:
    survey: list[XlsFormSurveyRow] = []
    choices: list[XlsFormChoiceRow] = []
    for section in schema.sections:
        section_name = xls_name(section.id)
        survey.append(
            XlsFormSurveyRow(
                type="begin_group",
                name=section_name,
                label=section.title,
                hint=section.description,
                required="no",
            )
        )
        for field in section.fields:
            field_name = xls_name(field.id)
            survey.append(
                XlsFormSurveyRow(
                    type=xls_type(field.type, field.options, field_name),
                    name=field_name,
                    label=field.label,
                    hint=field.hint,
                    required="yes" if field.required else "no",
                    constraint=xls_constraint(field.type, field.validation),
                    calculation=field.calculation,
                )
            )
            for option in field.options:
                option_label = str(option.get("label") or option.get("name") or option.get("value") or "Option")
                option_value = str(option.get("value") or option.get("name") or option_label)
                choices.append(XlsFormChoiceRow(list_name=field_name, name=xls_name(option_value), label=option_label))
            if field.type in {"repeat_group", "repeatable_group"}:
                survey.append(XlsFormSurveyRow(type="end_repeat", name=f"{field_name}_end", label=f"End {field.label}"))
        survey.append(XlsFormSurveyRow(type="end_group", name=f"{section_name}_end", label=f"End {section.title}"))
    return XlsFormWorkbook(
        survey=survey,
        choices=choices,
        settings=XlsFormSettings(form_title=form_name, form_id=xls_name(str(form_id)), version=str(version)),
    )


def form_schema_compatibility(*, form_id: UUID, version: int, schema: FormSchema) -> FormCollectionCompatibility:
    fields = [field for section in schema.sections for field in section.fields]
    field_types = {field.type for field in fields}
    media_count = sum(1 for field in fields if field.type in {"photo", "image", "signature", "audio", "video", "file"})
    warnings: list[str] = []
    if not fields:
        warnings.append("Add at least one question before publishing or sharing this form.")
    if media_count > 3:
        warnings.append("Media-heavy forms should include clear sync instructions for field officers.")
    if "repeat_group" in field_types or "repeatable_group" in field_types:
        warnings.append("Test repeat groups before deploying this form for offline collection.")
    return FormCollectionCompatibility(
        form_id=form_id,
        version=version,
        offline_ready=True,
        xlsform_ready=bool(fields),
        web_form_ready="barcode" not in field_types and "qr" not in field_types,
        mobile_app_ready=True,
        has_gps=bool({"gps", "geolocation", "map", "geofence"} & field_types),
        has_repeat_groups=bool({"repeat_group", "repeatable_group"} & field_types),
        media_field_count=media_count,
        warnings=warnings,
    )


class FieldOfficerService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.identity = IdentityRepository(session)
        self.roles = RoleRepository(session)
        self.officers = FieldOfficerRepository(session)
        self.audit = AuditRepository(session)

    async def invite_officer(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        payload: FieldOfficerInvite,
    ) -> FieldOfficerProfile:
        role = await self.roles.get_by_name(organization_id=organization_id, name="field_officer")
        if role is None:
            role = await self.roles.get_by_name(organization_id=organization_id, name="collector")
        if role is None:
            raise CollectionNotFoundError("Field officer role not found")
        if await self.identity.get_by_email(payload.email) is not None:
            raise ValueError("A user with this email already exists")

        user = await self.identity.create_user(
            email=payload.email,
            password_hash=hash_password(payload.temporary_password),
            full_name=payload.full_name,
        )
        await self.identity.add_membership(organization_id=organization_id, user_id=user.id, role_id=role.id)
        profile = await self.officers.create_profile(
            organization_id=organization_id,
            user_id=user.id,
            employee_code=payload.employee_code,
            phone_number=payload.phone_number,
            home_region=payload.home_region,
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="field_officer.invited",
            resource_type="field_officer",
            resource_id=str(profile.id),
            metadata={"email": payload.email, "region": payload.home_region},
        )
        return profile

    async def import_officers_csv(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        content: bytes,
    ) -> FieldOfficerImportResponse:
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(StringIO(text))
        if reader.fieldnames is None:
            raise ValueError("CSV file must include a header row")
        normalized_headers = {header.strip().lower(): header for header in reader.fieldnames}
        required_headers = {"email", "full_name"}
        missing_headers = sorted(required_headers - set(normalized_headers))
        if missing_headers:
            raise ValueError(f"Missing required columns: {', '.join(missing_headers)}")

        created_profiles = []
        issues: list[FieldOfficerImportIssue] = []
        seen_emails: set[str] = set()

        for row_number, raw_row in enumerate(reader, start=2):
            row = {key.strip().lower(): (raw_row[value] or "").strip() for key, value in normalized_headers.items()}
            email = row.get("email", "").lower()
            full_name = row.get("full_name", "")
            if not email or not full_name:
                issues.append(FieldOfficerImportIssue(row_number=row_number, email=email or None, message="email and full_name are required"))
                continue
            if email in seen_emails:
                issues.append(FieldOfficerImportIssue(row_number=row_number, email=email, message="duplicate email in uploaded file"))
                continue
            seen_emails.add(email)
            if await self.identity.get_by_email(email) is not None:
                issues.append(FieldOfficerImportIssue(row_number=row_number, email=email, message="email already exists in the system"))
                continue
            temporary_password = row.get("temporary_password") or "ChangeMe12345!"
            if len(temporary_password) < 12:
                issues.append(FieldOfficerImportIssue(row_number=row_number, email=email, message="temporary_password must be at least 12 characters"))
                continue
            try:
                profile = await self.invite_officer(
                    organization_id=organization_id,
                    actor_user_id=actor_user_id,
                    payload=FieldOfficerInvite(
                        email=email,
                        full_name=full_name,
                        phone_number=row.get("phone_number") or None,
                        employee_code=row.get("employee_code") or None,
                        home_region=row.get("home_region") or row.get("region") or None,
                        temporary_password=temporary_password,
                    ),
                )
                created_profiles.append(profile)
            except ValueError as exc:
                issues.append(FieldOfficerImportIssue(row_number=row_number, email=email, message=str(exc)))

        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="field_officer.imported",
            resource_type="field_officer",
            resource_id=str(organization_id),
            metadata={"created": len(created_profiles), "issues": len(issues)},
        )
        officers = await self.list_officers(organization_id)
        created_ids = {profile.id for profile in created_profiles}
        created_officers = [officer for officer in officers if officer.id in created_ids]
        return FieldOfficerImportResponse(
            created_count=len(created_profiles),
            skipped_count=len(issues),
            error_count=len(issues),
            officers=created_officers,
            issues=issues,
        )

    async def list_officers(self, organization_id: UUID) -> list[FieldOfficerRead]:
        rows = await self.officers.list(organization_id)
        return [
            FieldOfficerRead(
                id=profile.id,
                user_id=user.id,
                email=user.email,
                full_name=user.full_name,
                phone_number=profile.phone_number,
                employee_code=profile.employee_code,
                home_region=profile.home_region,
                last_sync_at=profile.last_sync_at,
                last_seen_at=profile.last_seen_at,
                last_latitude=profile.last_latitude,
                last_longitude=profile.last_longitude,
                device_id=profile.device_id,
                is_active=profile.is_active and user.is_active,
            )
            for profile, user in rows
        ]


class FormService:
    def __init__(self, session: AsyncSession) -> None:
        self.forms = FormRepository(session)
        self.surveys = SurveyRepository(session)
        self.audit = AuditRepository(session)

    async def create_form(self, *, organization_id: UUID, actor_user_id: UUID, payload: DataFormCreate) -> object:
        survey = await self.surveys.get_for_project(
            organization_id=organization_id,
            project_id=payload.project_id,
            survey_id=payload.survey_id,
        )
        if survey is None:
            raise CollectionNotFoundError("Survey not found for the selected project")
        form, _version = await self.forms.create(
            organization_id=organization_id,
            project_id=payload.project_id,
            survey_id=payload.survey_id,
            created_by_user_id=actor_user_id,
            name=payload.name,
            slug=payload.slug,
            description=payload.description,
            schema_json=payload.form_schema.model_dump(mode="json"),
            publish=payload.publish,
        )
        if not form.controls_json:
            await self.forms.update_controls(form=form, controls_json=FormControlsSettings().model_dump(mode="json"))
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="form.created",
            resource_type="form",
            resource_id=str(form.id),
            metadata={
                "project_id": str(payload.project_id),
                "survey_id": str(payload.survey_id),
                "slug": form.slug,
                "status": form.status,
                "version": form.current_version,
            },
        )
        await event_publisher.publish(
            settings.kafka_submission_events_topic,
            {
                "type": "form.created",
                "organization_id": str(organization_id),
                "project_id": str(payload.project_id),
                "survey_id": str(payload.survey_id),
                "form_id": str(form.id),
            },
        )
        return form

    async def list_forms(self, organization_id: UUID) -> list[DataForm]:
        forms = list(await self.forms.list(organization_id))
        for form in forms:
            if not form.controls_json:
                form.controls_json = FormControlsSettings().model_dump(mode="json")
        return forms

    async def get_controls(self, *, organization_id: UUID, form_id: UUID) -> FormControlsSettings:
        form = await self.forms.get(organization_id=organization_id, form_id=form_id)
        if form is None:
            raise CollectionNotFoundError("Form not found")
        if not form.controls_json:
            return FormControlsSettings()
        return FormControlsSettings.model_validate(form.controls_json)

    async def update_controls(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        form_id: UUID,
        payload: FormControlsSettings,
    ) -> object:
        form = await self.forms.get(organization_id=organization_id, form_id=form_id)
        if form is None:
            raise CollectionNotFoundError("Form not found")
        old_controls = form.controls_json or {}
        controls_json = payload.model_dump(mode="json")
        await self.forms.update_controls(form=form, controls_json=controls_json)
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="form.controls.updated",
            resource_type="form",
            resource_id=str(form.id),
            metadata={
                "old_reference_bindings": len(old_controls.get("reference_bindings", [])),
                "new_reference_bindings": len(payload.reference_bindings),
                "permission_rules": len(payload.permission_rules),
                "workflow_stages": len(payload.workflow_stages),
                "data_quality_rules": len(payload.data_quality_rules),
                "governance_status": payload.governance.form_status,
            },
        )
        return form

    async def export_xlsform(self, *, organization_id: UUID, form_id: UUID) -> XlsFormWorkbook:
        form = await self.forms.get(organization_id=organization_id, form_id=form_id)
        version = await self.forms.get_current_version(organization_id=organization_id, form_id=form_id)
        if form is None or version is None:
            raise CollectionNotFoundError("Form not found")
        schema = FormSchema.model_validate(version.schema_json)
        return form_schema_to_xlsform(form_id=form.id, form_name=form.name, version=version.version, schema=schema)

    async def collection_compatibility(self, *, organization_id: UUID, form_id: UUID) -> FormCollectionCompatibility:
        form = await self.forms.get(organization_id=organization_id, form_id=form_id)
        version = await self.forms.get_current_version(organization_id=organization_id, form_id=form_id)
        if form is None or version is None:
            raise CollectionNotFoundError("Form not found")
        schema = FormSchema.model_validate(version.schema_json)
        return form_schema_compatibility(form_id=form.id, version=version.version, schema=schema)

    async def duplicate_template(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        template_id_or_slug: str,
        payload: TemplateDuplicateRequest,
    ) -> object:
        survey = await self.surveys.get_for_project(
            organization_id=organization_id,
            project_id=payload.project_id,
            survey_id=payload.survey_id,
        )
        if survey is None:
            raise CollectionNotFoundError("Survey not found for the selected project")
        template = TemplateLibraryService().get_template(template_id_or_slug)
        name = payload.name or template.name
        slug = payload.slug or f"{template.slug}-{str(organization_id)[:8]}"
        form, _version = await self.forms.create(
            organization_id=organization_id,
            project_id=payload.project_id,
            survey_id=payload.survey_id,
            created_by_user_id=actor_user_id,
            name=name,
            slug=slug,
            description=template.description,
            schema_json=template.template_schema.model_dump(mode="json"),
            publish=payload.publish,
        )
        await self.forms.record_template_usage(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            template_slug=template.slug,
            created_form_id=form.id,
            metadata={"template_name": template.name, "category": template.category, "published": payload.publish},
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="form_template.duplicated",
            resource_type="form",
            resource_id=str(form.id),
            metadata={"template_slug": template.slug, "category": template.category},
        )
        await event_publisher.publish(
            settings.kafka_submission_events_topic,
            {
                "type": "form_template.duplicated",
                "organization_id": str(organization_id),
                "form_id": str(form.id),
                "template_slug": template.slug,
            },
        )
        return form


class SurveyService:
    def __init__(self, session: AsyncSession) -> None:
        self.surveys = SurveyRepository(session)
        self.audit = AuditRepository(session)

    async def create_survey(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        payload: SurveyCreate,
    ) -> SurveyRead:
        if not await self.surveys.project_exists(organization_id=organization_id, project_id=payload.project_id):
            raise CollectionNotFoundError("Project not found")
        survey = await self.surveys.create(
            organization_id=organization_id,
            project_id=payload.project_id,
            created_by_user_id=actor_user_id,
            owner_user_id=actor_user_id,
            manager_user_id=payload.manager_user_id,
            title=payload.title,
            code=payload.code,
            description=payload.description,
            survey_type=payload.survey_type,
            custom_type_label=payload.custom_type_label,
            status=payload.status.value,
            start_date=payload.start_date,
            end_date=payload.end_date,
            geographic_scope=payload.geographic_scope,
            target_population=payload.target_population,
            indicator_ids=[str(indicator_id) for indicator_id in payload.indicator_ids],
            governance_json=SurveyGovernanceSettings().model_dump(mode="json"),
        )
        await self.surveys.add_team_member(
            organization_id=organization_id,
            survey_id=survey.id,
            user_id=actor_user_id,
            survey_role="survey_owner",
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="survey.created",
            resource_type="survey",
            resource_id=str(survey.id),
            metadata={"project_id": str(payload.project_id), "code": survey.code, "type": survey.survey_type},
        )
        return SurveyRead.model_validate(survey)

    async def list_surveys(self, *, organization_id: UUID, project_id: UUID | None = None) -> list[SurveyRead]:
        surveys = await self.surveys.list(organization_id=organization_id, project_id=project_id)
        return [SurveyRead.model_validate(survey) for survey in surveys]

    async def update_governance(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        survey_id: UUID,
        payload: SurveyGovernanceSettings,
    ) -> SurveyRead:
        survey = await self.surveys.get(organization_id=organization_id, survey_id=survey_id)
        if survey is None:
            raise CollectionNotFoundError("Survey not found")
        updated = await self.surveys.update_governance(
            survey=survey,
            governance_json=payload.model_dump(mode="json"),
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="survey.governance_updated",
            resource_type="survey",
            resource_id=str(survey_id),
            metadata={
                "review_required": payload.review_required,
                "uploaded_submission_default_status": payload.uploaded_submission_default_status,
                "synced_submission_default_status": payload.synced_submission_default_status,
            },
        )
        return SurveyRead.model_validate(updated)

    async def add_team_member(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        survey_id: UUID,
        payload: SurveyTeamMemberCreate,
    ) -> SurveyTeamMemberRead:
        if await self.surveys.get(organization_id=organization_id, survey_id=survey_id) is None:
            raise CollectionNotFoundError("Survey not found")
        member = await self.surveys.add_team_member(
            organization_id=organization_id,
            survey_id=survey_id,
            user_id=payload.user_id,
            survey_role=payload.survey_role.value,
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="survey.team_member_added",
            resource_type="survey",
            resource_id=str(survey_id),
            metadata={"user_id": str(payload.user_id), "survey_role": payload.survey_role.value},
        )
        return SurveyTeamMemberRead.model_validate(member)

    async def list_team(self, *, organization_id: UUID, survey_id: UUID) -> list[SurveyTeamMemberRead]:
        members = await self.surveys.list_team(organization_id=organization_id, survey_id=survey_id)
        return [SurveyTeamMemberRead.model_validate(member) for member in members]


class SubmissionService:
    REVIEW_TRANSITIONS = {
        "start_review": "under_review",
        "approve": "approved",
        "reject": "rejected",
        "request_correction": "correction_requested",
    }

    def __init__(self, session: AsyncSession) -> None:
        self.forms = FormRepository(session)
        self.officers = FieldOfficerRepository(session)
        self.surveys = SurveyRepository(session)
        self.submissions = SubmissionRepository(session)
        self.sync = SyncRepository(session)
        self.audit = AuditRepository(session)

    async def create_submission(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        payload: SubmissionCreate,
    ) -> Submission:
        officer = await self.officers.get_for_user(organization_id=organization_id, user_id=actor_user_id)
        if officer is None:
            raise CollectionNotFoundError("Field officer profile not found")
        existing = await self.submissions.get_by_client_id(
            organization_id=organization_id,
            client_submission_id=payload.client_submission_id,
        )
        if existing is not None:
            return existing
        form_version = await self.forms.get_version(
            organization_id=organization_id,
            form_id=payload.form_id,
            version=payload.form_version,
        )
        if form_version is None:
            raise CollectionNotFoundError("Form version not found")
        form = await self.forms.get(organization_id=organization_id, form_id=payload.form_id)
        if form is None or form.project_id != payload.project_id or form.survey_id != payload.survey_id:
            raise CollectionNotFoundError("Form is not assigned to the selected project and survey")
        if await self.surveys.get_for_project(
            organization_id=organization_id,
            project_id=payload.project_id,
            survey_id=payload.survey_id,
        ) is None:
            raise CollectionNotFoundError("Survey not found for the selected project")
        submission = await self.submissions.create(
            organization_id=organization_id,
            project_id=payload.project_id,
            survey_id=payload.survey_id,
            form_id=payload.form_id,
            form_version_id=form_version.id,
            field_officer_id=officer.id,
            actor_user_id=actor_user_id,
            client_submission_id=payload.client_submission_id,
            payload_json=payload.payload,
            device_id=payload.device.device_id,
            captured_at=payload.captured_at,
            submitted_at=payload.submitted_at,
            offline_created=payload.offline_created,
            latitude=payload.location.latitude,
            longitude=payload.location.longitude,
            altitude=payload.location.altitude,
            accuracy=payload.location.accuracy,
            location_captured_at=payload.location.timestamp,
        )
        await self.officers.update_sync_status(
            profile=officer,
            device_id=payload.device.device_id,
            latitude=payload.location.latitude,
            longitude=payload.location.longitude,
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="submission.submitted",
            resource_type="submission",
            resource_id=str(submission.id),
            metadata={
                "client_submission_id": payload.client_submission_id,
                "project_id": str(payload.project_id),
                "survey_id": str(payload.survey_id),
                "offline": payload.offline_created,
            },
        )
        return submission

    async def list_submissions(self, *, organization_id: UUID, status: str | None = None) -> list[Submission]:
        return await self.submissions.list_for_review(organization_id, status)

    async def review_submission(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        submission_id: UUID,
        payload: SubmissionReviewAction,
    ) -> Submission:
        submission = await self.submissions.get(organization_id=organization_id, submission_id=submission_id)
        if submission is None:
            raise CollectionNotFoundError("Submission not found")
        to_status = self.REVIEW_TRANSITIONS[payload.action]
        if submission.status in {"approved", "rejected"} and payload.action == "start_review":
            raise InvalidWorkflowTransitionError("Terminal submission cannot return to review")
        await self.submissions.transition(
            submission=submission,
            actor_user_id=actor_user_id,
            to_status=to_status,
            comment=payload.comment,
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=f"submission.{to_status}",
            resource_type="submission",
            resource_id=str(submission.id),
            metadata={"comment": payload.comment},
        )
        await event_publisher.publish(
            settings.kafka_submission_events_topic,
            {
                "type": f"submission.{to_status}",
                "organization_id": str(organization_id),
                "submission_id": str(submission.id),
            },
        )
        return submission

    async def history(self, *, organization_id: UUID, submission_id: UUID) -> list[object]:
        return list(await self.submissions.history(organization_id=organization_id, submission_id=submission_id))

    async def sync_batch(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        payload: SyncBatchCreate,
    ) -> SyncBatchRead:
        officer = await self.officers.get_for_user(organization_id=organization_id, user_id=actor_user_id)
        if officer is None:
            raise CollectionNotFoundError("Field officer profile not found")
        processed: list[Submission] = []
        conflicts = 0
        for submission_payload in payload.submissions:
            existing = await self.submissions.get_by_client_id(
                organization_id=organization_id,
                client_submission_id=submission_payload.client_submission_id,
            )
            if existing is not None:
                conflicts += 1
                processed.append(existing)
                continue
            processed.append(
                await self.create_submission(
                    organization_id=organization_id,
                    actor_user_id=actor_user_id,
                    payload=submission_payload,
                )
            )
        batch = await self.sync.create_batch(
            organization_id=organization_id,
            field_officer_id=officer.id,
            device_id=payload.device.device_id,
            client_batch_id=payload.client_batch_id,
            processed_count=len(processed),
            conflict_count=conflicts,
        )
        await self.officers.update_sync_status(
            profile=officer,
            device_id=payload.device.device_id,
            latitude=processed[-1].latitude if processed else None,
            longitude=processed[-1].longitude if processed else None,
        )
        now = datetime.now(UTC)
        return SyncBatchRead(
            batch_id=batch.id,
            processed_count=batch.processed_count,
            conflict_count=batch.conflict_count,
            server_time=now,
            submissions=[SubmissionRead.model_validate(submission) for submission in processed],
            next_cursor=now,
        )
