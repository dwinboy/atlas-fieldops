import csv
import re
from datetime import UTC, datetime
from io import StringIO
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.events import event_publisher
from app.core.security import hash_password
from app.models.audit import AuditLog
from app.models.collection import DataForm, FieldOfficerProfile, OfficerAssignment, Project, Submission
from app.models.governance import DataVersion, LineageEvent
from app.models.identity import Membership, Organization, Role, UserAccessGrant
from app.models.operations import Beneficiary, DataQualitySignal, DeviceRegistry, SessionLog, VisitRecord
from app.repositories.audit import AuditRepository
from app.repositories.collection import FieldOfficerRepository, FormRepository, SubmissionRepository, SurveyRepository, SyncRepository
from app.repositories.identity import IdentityRepository, RoleRepository
from app.schemas.collection import (
    DataFormCreate,
    DataFormSchemaRead,
    DataFormUpdate,
    FieldOfficerActivityEventRead,
    FieldOfficerAssignmentDetailRead,
    FieldOfficerDeviceDetailRead,
    FieldOfficerPermissionRead,
    FieldOfficerProfileDetailRead,
    FormControlsSettings,
    FormCollectionCompatibility,
    FieldOfficerInvite,
    FieldOfficerImportIssue,
    FieldOfficerImportResponse,
    FieldOfficerRead,
    FieldOfficerSecurityRead,
    FieldOfficerSubmissionDetailRead,
    FieldOfficerSummaryMetric,
    OfficerAssignmentCreate,
    FormSchema,
    SubmissionRead,
    SubmissionCreate,
    SubmissionReviewAction,
    SubmissionResponsesUpdate,
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


def _is_blank(value: object) -> bool:
    return value is None or value == "" or value == [] or value == {}


def _response_map(payload: dict[str, object]) -> dict[str, object]:
    responses = payload.get("responses")
    if isinstance(responses, list):
        mapped: dict[str, object] = {}
        for item in responses:
            if not isinstance(item, dict):
                continue
            value = item.get("value")
            for key_name in ("question_id", "questionId", "variable_name", "variableName"):
                key = item.get(key_name)
                if isinstance(key, str) and key:
                    mapped[key] = value
        return mapped
    return dict(payload)


def _field_response(responses: dict[str, object], field: object) -> object:
    field_id = getattr(field, "id", "")
    variable_name = str(getattr(field, "variable_name", "") or "")
    keys = [
        field_id,
        field_id.replace("-", "_").lower(),
        variable_name,
    ]
    for key in keys:
        if key and key in responses:
            return responses[key]
    return None


def _parse_number(value: object) -> float | None:
    if _is_blank(value):
        return None
    try:
        return float(str(value).replace(",", "").strip())
    except ValueError:
        return None


def _parse_datetime(value: object) -> datetime | None:
    if _is_blank(value):
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed


def validate_submission_payload(*, schema: FormSchema, payload: dict[str, object], location_accuracy: float | None) -> list[str]:
    responses = _response_map(payload)
    issues: list[str] = []
    now = datetime.now(UTC)
    for section in schema.sections:
        for field in section.fields:
            value = _field_response(responses, field)
            label = field.label
            rules = field.validation or {}
            if field.required and _is_blank(value):
                issues.append(f"{label} is required.")
                continue
            if _is_blank(value):
                continue

            if field.type in {"number", "decimal", "currency", "nps", "rating"}:
                number = _parse_number(value)
                if number is None:
                    issues.append(f"{label} must be a valid number.")
                    continue
                if isinstance(rules.get("min"), int | float) and number < float(rules["min"]):
                    issues.append(f"{label} must be at least {rules['min']}.")
                if isinstance(rules.get("max"), int | float) and number > float(rules["max"]):
                    issues.append(f"{label} must be at most {rules['max']}.")

            if field.type in {"date", "datetime"}:
                parsed = _parse_datetime(value)
                if parsed is None:
                    issues.append(f"{label} must be a valid date.")
                    continue
                allow_future = bool(rules.get("allowFuture"))
                if not allow_future and parsed > now:
                    issues.append(f"{label} cannot be in the future.")

            if field.type in {"text", "textarea", "phone", "email", "url", "password", "barcode", "qr"}:
                text = str(value)
                if isinstance(rules.get("minLength"), int) and len(text) < int(rules["minLength"]):
                    issues.append(f"{label} must have at least {rules['minLength']} characters.")
                if isinstance(rules.get("maxLength"), int) and len(text) > int(rules["maxLength"]):
                    issues.append(f"{label} must have at most {rules['maxLength']} characters.")
                pattern = rules.get("pattern")
                if isinstance(pattern, str) and pattern and re.fullmatch(pattern, text) is None:
                    issues.append(f"{label} has an invalid format.")
                if field.type == "email" and re.fullmatch(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", text) is None:
                    issues.append(f"{label} must be a valid email address.")
                if field.type == "phone" and re.fullmatch(r"^[0-9+\-\s()]{7,}$", text) is None:
                    issues.append(f"{label} must be a valid phone number.")
                if field.type == "url" and re.fullmatch(r"https?://.+", text) is None:
                    issues.append(f"{label} must be a valid URL.")

            if field.type in {"select", "dropdown", "radio", "likert"} and field.options:
                allowed = {str(option.get("value") or option.get("label") or option) for option in field.options}
                if str(value) not in allowed:
                    issues.append(f"{label} must use one of the approved option values.")

            if field.type in {"multiselect", "checkbox", "ranking"} and field.options:
                values = value if isinstance(value, list) else [value]
                allowed = {str(option.get("value") or option.get("label") or option) for option in field.options}
                invalid = [str(item) for item in values if str(item) not in allowed]
                if invalid:
                    issues.append(f"{label} includes values outside the approved option list.")

            if field.type in {"gps", "geolocation", "map", "geofence"}:
                accuracy_limit = rules.get("accuracyMax")
                if isinstance(accuracy_limit, int | float) and location_accuracy is not None and location_accuracy > float(accuracy_limit):
                    issues.append(f"{label} GPS accuracy must be {accuracy_limit} meters or better.")
    return issues


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

    @staticmethod
    def _source_label(submission: Submission) -> str:
        if submission.is_imported:
            return "Imported"
        if submission.source_system:
            return submission.source_system
        if submission.offline_created:
            return "Mobile"
        return "Web Entry"

    @staticmethod
    def _quality_score(*, issue_count: int, submission_count: int) -> int:
        if submission_count <= 0:
            return 100
        return max(0, min(100, 100 - round((issue_count / submission_count) * 30)))

    async def get_officer_profile(
        self,
        *,
        organization_id: UUID,
        profile_id: UUID,
    ) -> FieldOfficerProfileDetailRead:
        profile = await self.officers.get(organization_id=organization_id, profile_id=profile_id)
        if profile is None:
            raise CollectionNotFoundError("Field officer not found")

        account = await self.identity.get_user_account(
            organization_id=organization_id,
            user_id=profile.user_id,
        )
        if account is None:
            raise CollectionNotFoundError("Field officer user account not found")
        user, membership, role, grant = account

        organization_result = await self.session.execute(
            select(Organization.name).where(Organization.id == organization_id)
        )
        organization_name = organization_result.scalar_one_or_none()

        assignments_result = await self.session.execute(
            select(OfficerAssignment, Project, DataForm)
            .join(Project, Project.id == OfficerAssignment.project_id)
            .outerjoin(DataForm, DataForm.id == OfficerAssignment.form_id)
            .where(
                OfficerAssignment.organization_id == organization_id,
                OfficerAssignment.officer_id == profile.id,
                OfficerAssignment.deleted_at.is_(None),
                Project.deleted_at.is_(None),
            )
            .order_by(OfficerAssignment.updated_at.desc())
        )
        assignment_rows = assignments_result.all()
        assignments = [
            FieldOfficerAssignmentDetailRead(
                id=assignment.id,
                project_id=project.id,
                project_name=project.name,
                form_id=form.id if form else None,
                form_name=form.name if form else None,
                region=assignment.region or project.region or project.country,
                target=0,
                completed=0,
                status="Assigned" if assignment.is_active else "Inactive",
                is_active=assignment.is_active,
                updated_at=assignment.updated_at,
            )
            for assignment, project, form in assignment_rows
        ]

        submission_result = await self.session.execute(
            select(Submission, Project, DataForm)
            .outerjoin(Project, Project.id == Submission.project_id)
            .join(DataForm, DataForm.id == Submission.form_id)
            .where(
                Submission.organization_id == organization_id,
                Submission.field_officer_id == profile.id,
                Submission.deleted_at.is_(None),
            )
            .order_by(Submission.submitted_at.desc())
            .limit(100)
        )
        submission_rows = submission_result.all()
        submissions = [
            FieldOfficerSubmissionDetailRead(
                id=submission.id,
                client_submission_id=submission.client_submission_id,
                project_id=submission.project_id,
                project_name=project.name if project else None,
                form_id=submission.form_id,
                form_name=form.name if form else None,
                entity_id=submission.entity_id,
                status=submission.status,
                source=self._source_label(submission),
                submitted_at=submission.submitted_at,
                sync_received_at=submission.sync_received_at,
                quality_score=100,
            )
            for submission, project, form in submission_rows
        ]

        submission_ids = [submission.id for submission, _project, _form in submission_rows]
        quality_counts: dict[str, int] = {}
        quality_issue_count = 0
        if submission_ids:
            quality_result = await self.session.execute(
                select(DataQualitySignal.signal_type, func.count(DataQualitySignal.id))
                .where(
                    DataQualitySignal.organization_id == organization_id,
                    DataQualitySignal.submission_id.in_(submission_ids),
                )
                .group_by(DataQualitySignal.signal_type)
            )
            quality_counts = {str(signal_type): int(count) for signal_type, count in quality_result.all()}
            quality_issue_count = sum(quality_counts.values())

        beneficiary_result = await self.session.execute(
            select(Beneficiary)
            .join(Submission, Submission.entity_id == Beneficiary.id)
            .where(
                Submission.organization_id == organization_id,
                Submission.field_officer_id == profile.id,
                Submission.deleted_at.is_(None),
                Beneficiary.organization_id == organization_id,
                Beneficiary.deleted_at.is_(None),
            )
            .order_by(Beneficiary.updated_at.desc())
            .limit(50)
        )
        beneficiaries = [
            {
                "id": str(beneficiary.id),
                "beneficiary_code": beneficiary.beneficiary_uid,
                "name": beneficiary.display_name,
                "type": beneficiary.beneficiary_type,
                "project_id": str(beneficiary.project_id) if beneficiary.project_id else None,
                "location": " / ".join(
                    part for part in [beneficiary.region, beneficiary.district, beneficiary.community] if part
                ),
                "status": beneficiary.enrollment_status,
                "last_activity": beneficiary.last_visit_at.isoformat() if beneficiary.last_visit_at else None,
            }
            for beneficiary in beneficiary_result.scalars()
        ]

        device_result = await self.session.execute(
            select(DeviceRegistry)
            .where(
                DeviceRegistry.organization_id == organization_id,
                DeviceRegistry.deleted_at.is_(None),
                (
                    (DeviceRegistry.user_id == profile.user_id)
                    | (DeviceRegistry.device_id == profile.device_id)
                ),
            )
            .order_by(DeviceRegistry.last_seen_at.desc().nullslast(), DeviceRegistry.updated_at.desc())
            .limit(20)
        )
        devices = [
            FieldOfficerDeviceDetailRead(
                device_id=device.device_id,
                device_name=device.label or device.device_id,
                platform=str(device.metadata_json.get("platform") or device.device_type or "mobile"),
                app_version=str(device.metadata_json.get("app_version") or "") or None,
                os_version=str(device.metadata_json.get("os_version") or "") or None,
                status=device.status,
                last_seen_at=device.last_seen_at,
                last_sync_at=profile.last_sync_at if device.device_id == profile.device_id else None,
            )
            for device in device_result.scalars()
        ]
        if profile.device_id and all(device.device_id != profile.device_id for device in devices):
            devices.insert(
                0,
                FieldOfficerDeviceDetailRead(
                    device_id=profile.device_id,
                    device_name=profile.device_id,
                    platform="mobile",
                    status="active" if profile.is_active else "inactive",
                    last_seen_at=profile.last_seen_at,
                    last_sync_at=profile.last_sync_at,
                ),
            )

        session_result = await self.session.execute(
            select(SessionLog)
            .where(
                SessionLog.organization_id == organization_id,
                SessionLog.user_id == profile.user_id,
            )
            .order_by(SessionLog.created_at.desc())
            .limit(20)
        )
        sessions = list(session_result.scalars())

        audit_result = await self.session.execute(
            select(AuditLog)
            .where(
                AuditLog.organization_id == organization_id,
                AuditLog.resource_id.in_([str(profile.id), str(profile.user_id)]),
            )
            .order_by(AuditLog.created_at.desc())
            .limit(30)
        )
        audit_logs = list(audit_result.scalars())
        audit_events = [
            FieldOfficerActivityEventRead(
                id=str(log.id),
                action=log.action,
                detail=log.metadata_json,
                created_at=log.created_at,
                status="Audited",
            )
            for log in audit_logs
        ]

        activity_events: list[FieldOfficerActivityEventRead] = [
            FieldOfficerActivityEventRead(
                id=f"session-{session.id}",
                action="Login session",
                detail=f"{session.status} session from {session.location_hint or 'unknown location'}",
                device_id=session.device_id,
                created_at=session.created_at,
                status=session.status,
            )
            for session in sessions
        ]
        activity_events.extend(
            FieldOfficerActivityEventRead(
                id=f"submission-{submission.id}",
                action="Submission synced",
                detail=f"{submission.client_submission_id} · {form.name if form else 'Form'}",
                device_id=submission.device_id,
                project_id=submission.project_id,
                created_at=submission.sync_received_at,
                status=submission.status,
            )
            for submission, _project, form in submission_rows[:20]
        )
        activity_events.extend(audit_events[:10])
        activity_events.sort(key=lambda event: event.created_at, reverse=True)

        total_submissions = len(submissions)
        approved_submissions = sum(1 for submission in submissions if submission.status == "approved")
        rejected_submissions = sum(1 for submission in submissions if submission.status == "rejected")
        returned_submissions = sum(
            1 for submission in submissions if submission.status in {"correction_requested", "returned"}
        )
        quality_score = self._quality_score(issue_count=quality_issue_count, submission_count=total_submissions)
        approval_rate = round((approved_submissions / total_submissions) * 100) if total_submissions else 0

        assigned_projects = {assignment.project_id for assignment in assignments if assignment.is_active}
        assigned_forms = {assignment.form_id for assignment in assignments if assignment.form_id and assignment.is_active}
        assigned_locations = sorted(
            {
                location
                for location in [assignment.region for assignment in assignments]
                if location
            }
        )

        officer_read = FieldOfficerRead(
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
            is_active=profile.is_active and user.is_active and membership.is_active,
        )

        security = FieldOfficerSecurityRead(
            username=user.email.split("@")[0],
            email=user.email,
            account_status="Active" if user.is_active and membership.is_active else "Inactive",
            role=getattr(role, "name", None),
            scope_type=getattr(grant, "scope_type", None) if grant else None,
            project_id=getattr(grant, "project_id", None) if grant else None,
            geography_id=getattr(grant, "geography_id", None) if grant else None,
            temporary_password_issued=any(log.action in {"user.password_reset", "field_officer.invited"} for log in audit_logs),
            password_last_changed_at=next((log.created_at for log in audit_logs if log.action == "user.password_reset"), None),
            last_login_at=sessions[0].created_at if sessions else profile.last_seen_at,
            failed_login_attempts=sum(1 for session in sessions if session.status == "failed"),
            credential_actions=[
                "Generate temporary password",
                "Reset password",
                "Force password change",
                "Revoke sessions",
                "Suspend account",
            ],
        )

        permissions = [
            FieldOfficerPermissionRead(key="collect_data", label="Can collect assigned data", enabled=True, source="Field Officer role"),
            FieldOfficerPermissionRead(key="edit_drafts", label="Can edit own drafts", enabled=True, source="Form permissions"),
            FieldOfficerPermissionRead(key="correct_returned", label="Can correct returned submissions", enabled=True, source="Workflow policy"),
            FieldOfficerPermissionRead(key="view_beneficiaries", label="Can view assigned beneficiaries", enabled=True, source="Project access"),
            FieldOfficerPermissionRead(key="upload_media", label="Can upload media", enabled=True, source="Mobile settings"),
            FieldOfficerPermissionRead(key="export_data", label="Can export own data", enabled=False, source="Restricted by governance"),
        ]

        return FieldOfficerProfileDetailRead(
            officer=officer_read,
            organization_name=organization_name,
            team=profile.home_region or "Unassigned field team",
            supervisor=None,
            status=security.account_status,
            metrics=[
                FieldOfficerSummaryMetric(label="Projects", value=str(len(assigned_projects)), tone="success", route="/projects"),
                FieldOfficerSummaryMetric(label="Assignments", value=str(len(assignments)), tone="success", route="/field-operations/assignments"),
                FieldOfficerSummaryMetric(label="Beneficiaries", value=str(len(beneficiaries)), tone="neutral", route="/beneficiaries"),
                FieldOfficerSummaryMetric(label="Submissions", value=str(total_submissions), tone="success", route="/submissions"),
                FieldOfficerSummaryMetric(label="Approval Rate", value=f"{approval_rate}%", tone="success" if approval_rate >= 80 else "warning", route="/submissions/approved"),
                FieldOfficerSummaryMetric(label="Data Quality", value=f"{quality_score}%", tone="success" if quality_score >= 80 else "warning", route="/data-quality"),
                FieldOfficerSummaryMetric(label="Last Sync", value=profile.last_sync_at.isoformat() if profile.last_sync_at else "Never", tone="neutral"),
            ],
            assignments=assignments,
            projects=[assignment for assignment in assignments if assignment.is_active],
            locations=assigned_locations,
            forms=[assignment for assignment in assignments if assignment.form_id],
            beneficiaries=beneficiaries,
            submissions=submissions,
            performance={
                "total_submissions": total_submissions,
                "approved_submissions": approved_submissions,
                "rejected_submissions": rejected_submissions,
                "returned_submissions": returned_submissions,
                "approval_rate": approval_rate,
                "rejection_rate": round((rejected_submissions / total_submissions) * 100) if total_submissions else 0,
                "beneficiaries_covered": len(beneficiaries),
                "assignments_completed": sum(1 for assignment in assignments if assignment.status == "Completed"),
                "data_quality_score": quality_score,
            },
            data_quality={
                "score": quality_score,
                "issue_count": quality_issue_count,
                "signals": quality_counts,
                "duplicate_flags": quality_counts.get("duplicate", 0),
                "gps_issues": quality_counts.get("gps", 0) + quality_counts.get("gps_boundary", 0),
                "missing_data": quality_counts.get("missing", 0) + quality_counts.get("required", 0),
                "returned_records": returned_submissions,
            },
            devices=devices,
            activity=activity_events[:50],
            permissions=permissions,
            security=security,
            audit_trail=audit_events,
        )

    async def assign_officer(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        payload: OfficerAssignmentCreate,
    ) -> OfficerAssignment:
        officer = await self.officers.get(organization_id=organization_id, profile_id=payload.officer_id)
        if officer is None or not officer.is_active:
            raise CollectionNotFoundError("Field officer not found or inactive")
        project_result = await self.session.execute(
            select(Project).where(
                Project.organization_id == organization_id,
                Project.id == payload.project_id,
                Project.deleted_at.is_(None),
                Project.is_active.is_(True),
            )
        )
        project = project_result.scalar_one_or_none()
        if project is None:
            raise CollectionNotFoundError("Project not found or inactive")
        if payload.form_id is not None:
            form_result = await self.session.execute(
                select(DataForm).where(
                    DataForm.organization_id == organization_id,
                    DataForm.id == payload.form_id,
                    DataForm.project_id == project.id,
                    DataForm.deleted_at.is_(None),
                    DataForm.is_active.is_(True),
                )
            )
            form = form_result.scalar_one_or_none()
            if form is None:
                raise CollectionNotFoundError("Form not found for the selected project")
            if form.status != "published":
                raise ValueError("Publish this form before assigning it to a field officer for mobile sync")
        assignment = await self.officers.upsert_assignment(
            organization_id=organization_id,
            officer_id=officer.id,
            project_id=project.id,
            form_id=payload.form_id,
            region=payload.region,
            is_active=payload.is_active,
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="field_assignment.saved",
            resource_type="officer_assignment",
            resource_id=str(assignment.id),
            metadata={
                "officer_id": str(officer.id),
                "project_id": str(project.id),
                "form_id": str(payload.form_id) if payload.form_id else None,
                "region": payload.region,
                "is_active": payload.is_active,
            },
        )
        return assignment


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

    async def update_form(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        form_id: UUID,
        payload: DataFormUpdate,
    ) -> object:
        form = await self.forms.get(organization_id=organization_id, form_id=form_id)
        if form is None:
            raise CollectionNotFoundError("Form not found")
        previous_version = form.current_version
        previous_status = form.status
        form, version = await self.forms.save_schema_revision(
            form=form,
            name=payload.name,
            description=payload.description,
            schema_json=payload.form_schema.model_dump(mode="json"),
            publish=payload.publish,
        )
        if not form.controls_json:
            await self.forms.update_controls(
                form=form,
                controls_json=FormControlsSettings().model_dump(mode="json"),
            )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="form.version_updated" if previous_status == "published" else "form.updated",
            resource_type="form",
            resource_id=str(form.id),
            metadata={
                "previous_version": previous_version,
                "version": version.version,
                "previous_status": previous_status,
                "status": form.status,
                "published": payload.publish,
            },
        )
        await event_publisher.publish(
            settings.kafka_submission_events_topic,
            {
                "type": "form.version_updated",
                "organization_id": str(organization_id),
                "project_id": str(form.project_id),
                "survey_id": str(form.survey_id),
                "form_id": str(form.id),
                "version": version.version,
            },
        )
        return form

    async def list_forms(self, organization_id: UUID) -> list[DataForm]:
        forms = list(await self.forms.list(organization_id))
        for form in forms:
            if not form.controls_json:
                form.controls_json = FormControlsSettings().model_dump(mode="json")
        return forms

    async def get_current_schema(self, *, organization_id: UUID, form_id: UUID) -> DataFormSchemaRead:
        form = await self.forms.get(organization_id=organization_id, form_id=form_id)
        if form is None:
            raise CollectionNotFoundError("Form not found")
        version = await self.forms.get_current_version(organization_id=organization_id, form_id=form_id)
        if version is None:
            raise CollectionNotFoundError("Form version not found")
        return DataFormSchemaRead(form_id=form.id, version=version.version, schema=version.schema_json)

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
                "instrument_sections": len(payload.instrument),
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
        self.session = session
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
        schema = FormSchema.model_validate(form_version.schema_json)
        validation_issues = validate_submission_payload(
            schema=schema,
            payload=payload.payload,
            location_accuracy=payload.location.accuracy,
        )
        submission_payload = dict(payload.payload)
        if validation_issues:
            submission_payload["_validation_issues"] = validation_issues
            submission_payload["_quality_status"] = "needs_review"
            submission_payload["_review_required"] = True
        submission = await self.submissions.create(
            organization_id=organization_id,
            project_id=payload.project_id,
            survey_id=payload.survey_id,
            form_id=payload.form_id,
            form_version_id=form_version.id,
            entity_id=payload.entity_id,
            entity_type=payload.entity_type,
            assignment_id=payload.assignment_id,
            supervisor_id=payload.supervisor_id,
            frequency_period=payload.frequency_period,
            event_id=payload.event_id,
            field_officer_id=officer.id,
            actor_user_id=actor_user_id,
            client_submission_id=payload.client_submission_id,
            payload_json=submission_payload,
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
                "entity_id": str(payload.entity_id) if payload.entity_id else None,
                "entity_type": payload.entity_type,
                "review_required": True,
                "validation_issue_count": len(validation_issues),
            },
        )
        if validation_issues:
            await self.audit.append(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                action="submission.validation_flagged",
                resource_type="submission",
                resource_id=str(submission.id),
                metadata={
                    "client_submission_id": payload.client_submission_id,
                    "project_id": str(payload.project_id),
                    "survey_id": str(payload.survey_id),
                    "form_id": str(payload.form_id),
                    "issues": validation_issues,
                    "review_decision": "pending_human_review",
                },
            )
        return submission

    async def list_submissions(
        self,
        *,
        organization_id: UUID,
        status: str | None = None,
        actor_user_id: UUID | None = None,
        scope_type: str = "organization",
    ) -> list[Submission]:
        field_officer_id: UUID | None = None
        if scope_type == "own" and actor_user_id is not None:
            officer = await self.officers.get_for_user(organization_id=organization_id, user_id=actor_user_id)
            if officer is None:
                return []
            field_officer_id = officer.id
        return await self.submissions.list_for_review(organization_id, status, field_officer_id)

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
        if to_status == "approved":
            await self._apply_approved_submission_to_beneficiary(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                submission=submission,
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

    async def _apply_approved_submission_to_beneficiary(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        submission: Submission,
    ) -> None:
        form = await self.forms.get(organization_id=organization_id, form_id=submission.form_id)
        if form is None or submission.project_id is None:
            return
        controls = self._entity_controls(form.controls_json or {})
        is_entity_linked = bool(
            controls.get("linked_to_entity")
            or controls.get("is_entity_linked")
            or controls.get("linkedToEntity")
            or submission.entity_id
            or submission.entity_type
        )
        creates_or_updates = bool(
            controls.get("creates_new_entity")
            or controls.get("createsNewEntity")
            or controls.get("updates_existing_entity")
            or controls.get("updatesExistingEntity")
        )
        if not is_entity_linked and not creates_or_updates:
            return
        existing_processing = (submission.payload_json or {}).get("_beneficiary_processing")
        if isinstance(existing_processing, dict) and existing_processing.get("status") in {
            "processed",
            "reconciliation_required",
        }:
            return

        values = self._flat_payload_values(submission.payload_json or {})
        entity_type = str(controls.get("entity_type") or controls.get("entityType") or submission.entity_type or "Beneficiary")
        display_name = self._entity_display_name(values)
        if not display_name:
            return
        phone = self._string_value(values, "phone_number", "phone", "mobile", "farmer_phone")
        national_id = self._string_value(values, "national_id", "nationalid", "id_number")
        household_id = self._string_value(values, "household_id", "householdid", "household")
        village = self._string_value(values, "village", "community")
        existing = await self._find_beneficiary_for_submission(
            organization_id=organization_id,
            submission=submission,
            display_name=display_name,
            phone=phone,
            national_id=national_id,
            household_id=household_id,
            village=village,
        )
        if existing is None:
            possible_duplicate = await self._possible_duplicate_for_submission(
                organization_id=organization_id,
                submission=submission,
                display_name=display_name,
                phone=phone,
                national_id=national_id,
                household_id=household_id,
                village=village,
            )
            if possible_duplicate is not None:
                beneficiary, score, matched_fields = possible_duplicate
                processing_time = datetime.now(UTC).isoformat()
                submission.payload_json = {
                    **(submission.payload_json or {}),
                    "_beneficiary_processing": {
                        "status": "reconciliation_required",
                        "reason": "Possible duplicate beneficiary detected before creation.",
                        "candidate_beneficiary_id": str(beneficiary.id),
                        "candidate_beneficiary_uid": beneficiary.beneficiary_uid,
                        "duplicate_score": score,
                        "matched_fields": matched_fields,
                        "processed_at": processing_time,
                    },
                }
                self.session.add(
                    DataQualitySignal(
                        organization_id=organization_id,
                        submission_id=submission.id,
                        beneficiary_id=beneficiary.id,
                        signal_type="possible_duplicate_entity",
                        severity="high" if score >= 90 else "medium",
                        confidence=score / 100,
                        summary="Approved submission may belong to an existing beneficiary.",
                        status="open",
                        evidence_json={
                            "beneficiary_uid": beneficiary.beneficiary_uid,
                            "client_submission_id": submission.client_submission_id,
                            "matched_fields": matched_fields,
                            "score": score,
                            "recommended_queue": "reconciliation",
                        },
                    )
                )
                await self.audit.append(
                    organization_id=organization_id,
                    actor_user_id=actor_user_id,
                    action="beneficiary.duplicate_detected_before_creation",
                    resource_type="submission",
                    resource_id=str(submission.id),
                    metadata={
                        "candidate_beneficiary_id": str(beneficiary.id),
                        "candidate_beneficiary_uid": beneficiary.beneficiary_uid,
                        "score": score,
                        "matched_fields": matched_fields,
                    },
                )
                await self.session.flush()
                return
            if bool(controls.get("requires_existing_entity") or controls.get("requiresExistingEntity")):
                processing_time = datetime.now(UTC).isoformat()
                submission.payload_json = {
                    **(submission.payload_json or {}),
                    "_beneficiary_processing": {
                        "status": "reconciliation_required",
                        "reason": "Approved entity-linked submission requires an existing beneficiary but no match was found.",
                        "processed_at": processing_time,
                    },
                }
                self.session.add(
                    DataQualitySignal(
                        organization_id=organization_id,
                        submission_id=submission.id,
                        beneficiary_id=None,
                        signal_type="missing_entity_link",
                        severity="high",
                        confidence=1.0,
                        summary="Approved entity-linked submission is not linked to a beneficiary.",
                        status="open",
                        evidence_json={
                            "client_submission_id": submission.client_submission_id,
                            "form_id": str(submission.form_id),
                            "project_id": str(submission.project_id),
                            "entity_type": entity_type,
                            "recommended_queue": "reconciliation",
                        },
                    )
                )
                await self.audit.append(
                    organization_id=organization_id,
                    actor_user_id=actor_user_id,
                    action="beneficiary.link_missing",
                    resource_type="submission",
                    resource_id=str(submission.id),
                    metadata={"client_submission_id": submission.client_submission_id, "entity_type": entity_type},
                )
                await self.session.flush()
                return
            created_at = datetime.now(UTC).isoformat()
            beneficiary = Beneficiary(
                organization_id=organization_id,
                project_id=submission.project_id,
                beneficiary_uid=await self._next_beneficiary_uid(organization_id=organization_id, entity_type=entity_type),
                beneficiary_type=entity_type,
                display_name=display_name,
                sex=self._string_value(values, "gender", "sex"),
                phone_number=phone,
                region=self._string_value(values, "region"),
                district=self._string_value(values, "district"),
                community=village,
                enrollment_status="active",
                latitude=submission.latitude,
                longitude=submission.longitude,
                last_visit_at=submission.submitted_at,
                profile_json={
                    "source": "Approved Submission",
                    "sourceSubmissionId": str(submission.id),
                    "sourceClientSubmissionId": submission.client_submission_id,
                    "createdFromFormId": str(submission.form_id),
                    "approvalLinkedAt": created_at,
                    "national_id": national_id,
                    "household_id": household_id,
                    "fieldLineage": self._profile_field_lineage(
                        submission=submission,
                        actor_user_id=actor_user_id,
                        field_values={
                            "display_name": display_name,
                            "phone_number": phone,
                            "sex": self._string_value(values, "gender", "sex"),
                            "region": self._string_value(values, "region"),
                            "district": self._string_value(values, "district"),
                            "community": village,
                            "latitude": submission.latitude,
                            "longitude": submission.longitude,
                        },
                        recorded_at=created_at,
                    ),
                    "projectEnrollments": [
                        self._project_enrollment_profile(
                            submission=submission,
                            status="active",
                            recorded_at=created_at,
                        )
                    ],
                    "raw_approved_values": values,
                },
                is_imported=submission.is_imported,
                source_system=submission.source_system,
                source_record_id=submission.source_record_id,
                source_project_id=submission.source_project_id,
                import_batch_id=submission.import_batch_id,
                imported_at=submission.imported_at,
                imported_by_user_id=submission.imported_by_user_id,
            )
            self.session.add(beneficiary)
            await self.session.flush()
            submission.entity_id = beneficiary.id
            submission.entity_type = beneficiary.beneficiary_type
            submission.payload_json = {
                **(submission.payload_json or {}),
                "_beneficiary_processing": {
                    "status": "processed",
                    "action": "created",
                    "beneficiary_id": str(beneficiary.id),
                    "beneficiary_uid": beneficiary.beneficiary_uid,
                    "processed_at": created_at,
                },
            }
            self._record_beneficiary_lineage(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                submission=submission,
                beneficiary=beneficiary,
                transformation="approved_submission_created_beneficiary",
                field_values=values,
            )
            self._record_beneficiary_visit(
                organization_id=organization_id,
                submission=submission,
                beneficiary=beneficiary,
                summary="Approved submission created this beneficiary profile.",
            )
            await self.audit.append(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                action="beneficiary.created_from_approved_submission",
                resource_type="beneficiary",
                resource_id=str(beneficiary.id),
                metadata={
                    "beneficiary_uid": beneficiary.beneficiary_uid,
                    "submission_id": str(submission.id),
                    "client_submission_id": submission.client_submission_id,
                    "form_id": str(submission.form_id),
                    "project_id": str(submission.project_id),
                },
            )
            return

        original_profile = dict(existing.profile_json or {})
        linked_at = datetime.now(UTC).isoformat()
        proposed_changes: dict[str, object] = {}
        lineage_values: dict[str, object] = {}
        for field_name, next_value in {
            "display_name": display_name,
            "phone_number": phone,
            "region": self._string_value(values, "region"),
            "district": self._string_value(values, "district"),
            "community": village,
            "latitude": submission.latitude,
            "longitude": submission.longitude,
        }.items():
            current_value = getattr(existing, field_name)
            if current_value in {None, ""} and next_value not in {None, ""}:
                setattr(existing, field_name, next_value)
                lineage_values[field_name] = next_value
            elif next_value not in {None, ""} and current_value != next_value:
                proposed_changes[field_name] = {"current": current_value, "proposed": next_value}
        existing.last_visit_at = submission.submitted_at
        existing.project_id = existing.project_id or submission.project_id
        profile_update_proposals = original_profile.get("profileUpdateProposals")
        project_enrollments = self._project_enrollments_with_submission(
            existing=original_profile.get("projectEnrollments"),
            submission=submission,
            recorded_at=linked_at,
        )
        existing.profile_json = {
            **original_profile,
            "lastApprovedSubmissionId": str(submission.id),
            "lastApprovedFormId": str(submission.form_id),
            "lastApprovalLinkedAt": linked_at,
            "national_id": original_profile.get("national_id") or national_id,
            "household_id": original_profile.get("household_id") or household_id,
            "fieldLineage": {
                **(original_profile.get("fieldLineage") if isinstance(original_profile.get("fieldLineage"), dict) else {}),
                **self._profile_field_lineage(
                    submission=submission,
                    actor_user_id=actor_user_id,
                    field_values=lineage_values,
                    recorded_at=linked_at,
                ),
            },
            "projectEnrollments": project_enrollments,
            "profileUpdateProposals": [
                *(profile_update_proposals if isinstance(profile_update_proposals, list) else []),
                *(
                    [
                        {
                            "submissionId": str(submission.id),
                            "clientSubmissionId": submission.client_submission_id,
                            "changes": proposed_changes,
                            "createdAt": linked_at,
                            "status": "pending_review",
                            "source": "Approved Submission",
                        }
                    ]
                    if proposed_changes
                    else []
                ),
            ],
        }
        submission.entity_id = existing.id
        submission.entity_type = existing.beneficiary_type
        submission.payload_json = {
            **(submission.payload_json or {}),
            "_beneficiary_processing": {
                "status": "processed",
                "action": "linked",
                "beneficiary_id": str(existing.id),
                "beneficiary_uid": existing.beneficiary_uid,
                "profile_update_proposals": len(proposed_changes),
                "processed_at": linked_at,
            },
        }
        self._record_beneficiary_lineage(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            submission=submission,
            beneficiary=existing,
            transformation="approved_submission_linked_beneficiary",
            field_values=values,
        )
        self._record_beneficiary_visit(
            organization_id=organization_id,
            submission=submission,
            beneficiary=existing,
            summary="Approved submission was added to this beneficiary timeline.",
        )
        if proposed_changes:
            self.session.add(
                DataQualitySignal(
                    organization_id=organization_id,
                    submission_id=submission.id,
                    beneficiary_id=existing.id,
                    signal_type="profile_conflict",
                    severity="high",
                    confidence=0.9,
                    summary="Approved submission proposes changes to beneficiary profile fields.",
                    status="open",
                    evidence_json={
                        "beneficiary_uid": existing.beneficiary_uid,
                        "client_submission_id": submission.client_submission_id,
                        "changes": proposed_changes,
                        "recommended_queue": "reconciliation",
                    },
                )
            )
        await self.session.flush()
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="beneficiary.linked_to_approved_submission",
            resource_type="beneficiary",
            resource_id=str(existing.id),
            metadata={
                "beneficiary_uid": existing.beneficiary_uid,
                "submission_id": str(submission.id),
                "client_submission_id": submission.client_submission_id,
                "profile_update_proposals": len(proposed_changes),
            },
        )

    def _profile_field_lineage(
        self,
        *,
        submission: Submission,
        actor_user_id: UUID,
        field_values: dict[str, object],
        recorded_at: str,
    ) -> dict[str, dict[str, object]]:
        return {
            key: {
                "value": value,
                "sourceFormId": str(submission.form_id),
                "sourceSubmissionId": str(submission.id),
                "sourceClientSubmissionId": submission.client_submission_id,
                "sourceUserId": str(submission.field_officer_id),
                "approvedByUserId": str(actor_user_id),
                "approvalDate": recorded_at,
            }
            for key, value in field_values.items()
            if value is not None and value != ""
        }

    def _project_enrollment_profile(
        self,
        *,
        submission: Submission,
        status: str,
        recorded_at: str,
    ) -> dict[str, object]:
        return {
            "projectId": str(submission.project_id) if submission.project_id else None,
            "status": status,
            "enrollmentDate": recorded_at,
            "sourceSubmissionId": str(submission.id),
            "sourceClientSubmissionId": submission.client_submission_id,
            "assignedFieldOfficerId": str(submission.field_officer_id),
        }

    def _project_enrollments_with_submission(
        self,
        *,
        existing: object,
        submission: Submission,
        recorded_at: str,
    ) -> list[object]:
        enrollments = list(existing) if isinstance(existing, list) else []
        project_id = str(submission.project_id) if submission.project_id else None
        if project_id and not any(
            isinstance(item, dict) and item.get("projectId") == project_id
            for item in enrollments
        ):
            enrollments.append(
                self._project_enrollment_profile(
                    submission=submission,
                    status="active",
                    recorded_at=recorded_at,
                )
            )
        return enrollments

    def _record_beneficiary_visit(
        self,
        *,
        organization_id: UUID,
        submission: Submission,
        beneficiary: Beneficiary,
        summary: str,
    ) -> None:
        self.session.add(
            VisitRecord(
                organization_id=organization_id,
                beneficiary_id=beneficiary.id,
                field_officer_id=submission.field_officer_id,
                submission_id=submission.id,
                visit_type=str(submission.entity_type or "approved_record").lower().replace(" ", "_"),
                visited_at=submission.submitted_at,
                latitude=submission.latitude,
                longitude=submission.longitude,
                summary=summary,
                media_count=0,
            )
        )

    def _record_beneficiary_lineage(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        submission: Submission,
        beneficiary: Beneficiary,
        transformation: str,
        field_values: dict[str, object],
    ) -> None:
        self.session.add(
            LineageEvent(
                organization_id=organization_id,
                source_type="submission",
                source_id=str(submission.id),
                target_type="beneficiary",
                target_id=str(beneficiary.id),
                transformation=transformation,
                actor_user_id=actor_user_id,
                lineage_json={
                    "beneficiary_uid": beneficiary.beneficiary_uid,
                    "client_submission_id": submission.client_submission_id,
                    "form_id": str(submission.form_id),
                    "project_id": str(submission.project_id) if submission.project_id else None,
                    "field_officer_id": str(submission.field_officer_id),
                    "approval_status": submission.status,
                    "approved_at": datetime.now(UTC).isoformat(),
                    "field_sources": {
                        key: {
                            "value": value,
                            "form_id": str(submission.form_id),
                            "submission_id": str(submission.id),
                            "client_submission_id": submission.client_submission_id,
                        }
                        for key, value in field_values.items()
                    },
                },
            )
        )

    def _entity_controls(self, controls_json: dict[str, object]) -> dict[str, object]:
        controls = controls_json.get("entity_controls") if isinstance(controls_json.get("entity_controls"), dict) else {}
        return controls

    def _flat_payload_values(self, payload_json: dict[str, object]) -> dict[str, object]:
        raw_responses = payload_json.get("responses")
        if isinstance(raw_responses, list):
            flattened: dict[str, object] = {}
            for item in raw_responses:
                if not isinstance(item, dict):
                    continue
                key = str(item.get("variableName") or item.get("variable_name") or item.get("questionId") or item.get("question_id") or "").strip()
                if key:
                    flattened[key.lower()] = item.get("value")
            if flattened:
                return flattened
        return {str(key).lower(): value for key, value in payload_json.items() if not str(key).startswith("_")}

    def _string_value(self, values: dict[str, object], *keys: str) -> str | None:
        for key in keys:
            value = values.get(key.lower())
            if value is None:
                continue
            text = str(value).strip()
            if text:
                return text
        return None

    def _entity_display_name(self, values: dict[str, object]) -> str | None:
        full_name = self._string_value(values, "full_name", "farmer_name", "beneficiary_name", "respondent", "name")
        if full_name:
            return full_name
        parts = [
            self._string_value(values, "first_name", "firstname"),
            self._string_value(values, "last_name", "lastname", "surname"),
        ]
        combined = " ".join(part for part in parts if part)
        return combined or None

    def _normalize_phone(self, value: str | None) -> str:
        return re.sub(r"\D+", "", value or "")

    async def _find_beneficiary_for_submission(
        self,
        *,
        organization_id: UUID,
        submission: Submission,
        display_name: str,
        phone: str | None,
        national_id: str | None,
        household_id: str | None,
        village: str | None,
    ) -> Beneficiary | None:
        if submission.entity_id is not None:
            result = await self.session.execute(
                select(Beneficiary).where(
                    Beneficiary.organization_id == organization_id,
                    Beneficiary.id == submission.entity_id,
                    Beneficiary.deleted_at.is_(None),
                )
            )
            existing = result.scalar_one_or_none()
            if existing is not None:
                return existing
        result = await self.session.execute(
            select(Beneficiary).where(
                Beneficiary.organization_id == organization_id,
                Beneficiary.deleted_at.is_(None),
            )
        )
        normalized_phone = self._normalize_phone(phone)
        normalized_name = display_name.strip().lower()
        normalized_village = (village or "").strip().lower()
        for beneficiary in result.scalars():
            profile = beneficiary.profile_json or {}
            if normalized_phone and self._normalize_phone(beneficiary.phone_number) == normalized_phone:
                return beneficiary
            if national_id and str(profile.get("national_id") or profile.get("nationalId") or "").strip().lower() == national_id.strip().lower():
                return beneficiary
            if household_id and str(profile.get("household_id") or profile.get("householdId") or "").strip().lower() == household_id.strip().lower():
                return beneficiary
            same_name = beneficiary.display_name.strip().lower() == normalized_name
            same_village = normalized_village and (beneficiary.community or "").strip().lower() == normalized_village
            if same_name and same_village:
                return beneficiary
            if (
                same_name
                and submission.latitude is not None
                and submission.longitude is not None
                and beneficiary.latitude is not None
                and beneficiary.longitude is not None
                and self._gps_distance_meters(
                    submission.latitude,
                    submission.longitude,
                    beneficiary.latitude,
                    beneficiary.longitude,
                )
                <= 50
            ):
                return beneficiary
        return None

    async def _possible_duplicate_for_submission(
        self,
        *,
        organization_id: UUID,
        submission: Submission,
        display_name: str,
        phone: str | None,
        national_id: str | None,
        household_id: str | None,
        village: str | None,
    ) -> tuple[Beneficiary, int, list[str]] | None:
        result = await self.session.execute(
            select(Beneficiary).where(
                Beneficiary.organization_id == organization_id,
                Beneficiary.deleted_at.is_(None),
            )
        )
        normalized_phone = self._normalize_phone(phone)
        normalized_name = display_name.strip().lower()
        normalized_village = (village or "").strip().lower()
        best: tuple[Beneficiary, int, list[str]] | None = None
        for beneficiary in result.scalars():
            profile = beneficiary.profile_json or {}
            score = 0
            matched_fields: list[str] = []
            if normalized_phone and self._normalize_phone(beneficiary.phone_number) == normalized_phone:
                score += 80
                matched_fields.append("Phone number")
            if national_id and str(profile.get("national_id") or profile.get("nationalId") or "").strip().lower() == national_id.strip().lower():
                score += 100
                matched_fields.append("National ID")
            if household_id and str(profile.get("household_id") or profile.get("householdId") or "").strip().lower() == household_id.strip().lower():
                score += 90
                matched_fields.append("Household ID")
            same_name = bool(normalized_name and beneficiary.display_name.strip().lower() == normalized_name)
            same_village = bool(normalized_village and (beneficiary.community or "").strip().lower() == normalized_village)
            if same_name:
                score += 45
                matched_fields.append("Full name")
            if same_name and same_village:
                score += 60
                matched_fields.append("Name + village")
            if (
                submission.latitude is not None
                and submission.longitude is not None
                and beneficiary.latitude is not None
                and beneficiary.longitude is not None
            ):
                distance = self._gps_distance_meters(
                    submission.latitude,
                    submission.longitude,
                    beneficiary.latitude,
                    beneficiary.longitude,
                )
                if distance <= 50:
                    score += 40
                    matched_fields.append(f"GPS within {max(1, round(distance))}m")
            score = min(score, 100)
            if score < 60:
                continue
            if best is None or score > best[1]:
                best = (beneficiary, score, matched_fields)
        return best

    def _gps_distance_meters(
        self,
        latitude_a: float,
        longitude_a: float,
        latitude_b: float,
        longitude_b: float,
    ) -> float:
        lat_meters = (latitude_a - latitude_b) * 111_320
        lon_meters = (longitude_a - longitude_b) * 111_320
        return (lat_meters**2 + lon_meters**2) ** 0.5

    async def _next_beneficiary_uid(self, *, organization_id: UUID, entity_type: str) -> str:
        prefix = {
            "farmer": "FRM",
            "household": "HH",
            "beneficiary": "BEN",
            "facility": "FAC",
            "school": "SCH",
            "village": "VIL",
            "group": "GRP",
        }.get(entity_type.strip().lower(), "BEN")
        year = datetime.now(UTC).year
        result = await self.session.execute(
            select(Beneficiary.beneficiary_uid).where(
                Beneficiary.organization_id == organization_id,
                Beneficiary.beneficiary_uid.like(f"{prefix}-{year}-%"),
            )
        )
        existing = set(result.scalars())
        next_number = len(existing) + 1
        while True:
            candidate = f"{prefix}-{year}-{next_number:06d}"
            if candidate not in existing:
                return candidate
            next_number += 1

    async def update_responses(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        submission_id: UUID,
        payload: SubmissionResponsesUpdate,
    ) -> Submission:
        submission = await self.submissions.get(organization_id=organization_id, submission_id=submission_id)
        if submission is None:
            raise CollectionNotFoundError("Submission not found")
        protected_payload = {
            key: value
            for key, value in submission.payload_json.items()
            if isinstance(key, str) and key.startswith("_")
        }
        clean_responses = {
            key: value
            for key, value in payload.responses.items()
            if isinstance(key, str) and key and not key.startswith("_")
        }
        previous_payload = {
            key: value
            for key, value in submission.payload_json.items()
            if isinstance(key, str) and not key.startswith("_")
        }
        field_changes = {
            key: {"old": previous_payload.get(key), "new": value}
            for key, value in clean_responses.items()
            if previous_payload.get(key) != value
        }
        removed_fields = sorted(set(previous_payload) - set(clean_responses))
        for key in removed_fields:
            field_changes[key] = {"old": previous_payload.get(key), "new": None}
        if submission.status == "approved":
            self.session.add(
                DataVersion(
                    organization_id=organization_id,
                    entity_type="submission",
                    entity_id=str(submission.id),
                    version_number=submission.server_sequence + 1,
                    changed_by_user_id=actor_user_id,
                    change_type="change_request",
                    previous_json=submission.payload_json,
                    current_json={**clean_responses, **protected_payload},
                    field_changes_json={
                        "status": "pending_review",
                        "reason": payload.reason,
                        "field_changes": field_changes,
                        "client_submission_id": submission.client_submission_id,
                    },
                    rollback_available=False,
                )
            )
            await self.audit.append(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                action="submission.change_request_created",
                resource_type="submission",
                resource_id=str(submission.id),
                metadata={
                    "reason": payload.reason,
                    "field_count": len(field_changes),
                    "client_submission_id": submission.client_submission_id,
                    "approved_record_locked": True,
                },
            )
            await event_publisher.publish(
                settings.kafka_submission_events_topic,
                {
                    "type": "submission.change_request_created",
                    "organization_id": str(organization_id),
                    "submission_id": str(submission.id),
                },
            )
            await self.session.flush()
            return submission
        updated_payload = {**clean_responses, **protected_payload}
        updated = await self.submissions.update_payload(
            submission=submission,
            actor_user_id=actor_user_id,
            payload_json=updated_payload,
            reason=payload.reason,
        )
        self.session.add(
            DataVersion(
                organization_id=organization_id,
                entity_type="submission",
                entity_id=str(submission.id),
                version_number=submission.server_sequence,
                changed_by_user_id=actor_user_id,
                change_type="response_edit",
                previous_json={**previous_payload, **protected_payload},
                current_json=updated_payload,
                field_changes_json={
                    "reason": payload.reason,
                    "field_changes": field_changes,
                    "client_submission_id": submission.client_submission_id,
                },
                rollback_available=True,
            )
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="submission.responses_edited",
            resource_type="submission",
            resource_id=str(submission.id),
            metadata={
                "reason": payload.reason,
                "field_count": len(field_changes),
                "field_changes": field_changes,
                "client_submission_id": submission.client_submission_id,
            },
        )
        await event_publisher.publish(
            settings.kafka_submission_events_topic,
            {
                "type": "submission.responses_edited",
                "organization_id": str(organization_id),
                "submission_id": str(submission.id),
            },
        )
        return updated

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
