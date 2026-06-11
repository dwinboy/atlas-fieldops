from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import canonical_role
from app.models.administration import PlatformReferenceList, PlatformReferenceValue
from app.models.collection import DataForm, DataFormVersion, FieldOfficerProfile, OfficerAssignment, Project
from app.models.collection import Submission
from app.models.operations import Beneficiary, WorkforceProfile
from app.schemas.auth import CurrentPrincipal
from app.schemas.collection import DeviceMetadata, LocationCapture, SubmissionCreate
from app.schemas.mobile import (
    MobileAssignmentRead,
    MobileAssignedCountsRead,
    MobileBlockedStateRead,
    MobileBootstrapRead,
    MobileDeviceRegistrationCreate,
    MobileDeviceRegistrationRead,
    MobileDeviceRecordRead,
    MobileEntityRead,
    MobileFormRead,
    MobileFormVersionRead,
    MobileLocationRead,
    MobileOfflineRulesRead,
    MobileOfficerProfileRead,
    MobilePermissionSetRead,
    MobileProjectRead,
    MobileReferenceListRead,
    MobileSubmissionUpload,
    MobileSubmissionUploadRead,
    MobileSyncPackageRead,
)
from app.services.collection import CollectionNotFoundError, SubmissionService


def _form_status(value: str) -> str:
    return {
        "draft": "Draft",
        "testing": "Testing",
        "published": "Published",
        "suspended": "Suspended",
        "archived": "Archived",
    }.get(value.lower(), value.title())


def _flatten_mobile_responses(responses: list[dict[str, Any]]) -> dict[str, Any]:
    flattened: dict[str, Any] = {}
    for response in responses:
        variable_name = str(response.get("variableName") or response.get("variable_name") or "").strip()
        question_id = str(response.get("questionId") or response.get("question_id") or "").strip()
        key = variable_name or question_id
        if key:
            flattened[key] = response.get("value")
    return flattened


def _assignment_status(is_active: bool) -> str:
    return "Assigned" if is_active else "Paused"


def _mobile_question_type(value: str) -> str:
    return {
        "text": "Text",
        "textarea": "LongText",
        "number": "Number",
        "decimal": "Decimal",
        "currency": "Currency",
        "date": "Date",
        "time": "Time",
        "datetime": "DateTime",
        "select": "SingleSelect",
        "radio": "SingleSelect",
        "dropdown": "Dropdown",
        "multiselect": "MultiSelect",
        "checkbox": "MultiSelect",
        "gps": "GPS",
        "geolocation": "GPS",
        "map": "GPS",
        "geofence": "GPS",
        "photo": "Photo",
        "image": "Photo",
        "audio": "Audio",
        "video": "Video",
        "file": "FileUpload",
        "signature": "Signature",
        "barcode": "Barcode",
        "qr": "QRCode",
        "consent": "Consent",
        "calculated": "CalculatedField",
        "repeat_group": "RepeatGroup",
        "repeatable_group": "RepeatGroup",
        "matrix_single": "Matrix",
        "matrix_multi": "Matrix",
        "ranking": "Ranking",
    }.get(value.lower(), "Text")


def _field_options(options: list[Any]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for index, option in enumerate(options):
        if isinstance(option, dict):
            label = str(option.get("label") or option.get("name") or option.get("value") or f"Option {index + 1}")
            value = str(option.get("value") or option.get("name") or label)
        else:
            label = str(option or f"Option {index + 1}")
            value = label
        normalized.append({"id": value, "label": label, "value": value, "order": index + 1})
    return normalized


def _field_appearance_text(field: dict[str, Any]) -> str:
    appearance = field.get("appearance")
    if isinstance(appearance, dict):
        return str(appearance.get("helpText") or "")
    return ""


def _field_metadata_value(field: dict[str, Any], key: str) -> str | None:
    text = _field_appearance_text(field)
    match = re.search(rf"\[{re.escape(key)}:([^\]]*)\]", text)
    if not match:
        return None
    value = match.group(1).strip()
    return value or None


def _field_has_tag(field: dict[str, Any], tag: str) -> bool:
    return f"[{tag}]" in _field_appearance_text(field)


def _field_metadata_tags(field: dict[str, Any]) -> list[str]:
    text = _field_appearance_text(field)
    tags = re.findall(r"\[([a-zA-Z0-9_-]+)\]", text)
    return sorted({tag for tag in tags if ":" not in tag})


def _field_mobile_controls(field: dict[str, Any]) -> dict[str, Any]:
    return {
        "displayMode": _field_metadata_value(field, "mobile"),
        "blockedHelp": _field_metadata_value(field, "blocked-help"),
        "offlineCompatible": _field_has_tag(field, "offline-compatible"),
        "lowBandwidth": _field_has_tag(field, "low-bandwidth"),
        "prefillAllowed": _field_has_tag(field, "prefill-allowed"),
        "saveDraftAfterAnswer": _field_has_tag(field, "save-draft-after-answer"),
        "reviewBeforeSubmit": _field_has_tag(field, "review-answer-before-submit"),
        "syncPriority": _field_has_tag(field, "sync-priority"),
    }


def _field_privacy_controls(field: dict[str, Any]) -> dict[str, Any]:
    return {
        "sensitivity": _field_metadata_value(field, "sensitivity") or ("sensitive" if field.get("sensitive") else "standard"),
        "consentField": _field_metadata_value(field, "consent-field"),
        "maskOnScreen": _field_has_tag(field, "mask-on-screen"),
        "maskOnExport": _field_has_tag(field, "mask-on-export"),
        "encryptAtRest": _field_has_tag(field, "encrypt-at-rest"),
        "hideAfterSubmit": _field_has_tag(field, "hide-after-submit"),
        "screenshotRestricted": _field_has_tag(field, "screenshot-restricted"),
        "consentRequired": _field_has_tag(field, "consent-required"),
    }


def _field_quality_controls(field: dict[str, Any]) -> dict[str, Any]:
    return {
        "captureTimestamp": _field_has_tag(field, "capture-timestamp"),
        "captureGps": _field_has_tag(field, "capture-gps"),
        "photoEvidence": _field_has_tag(field, "photo-evidence"),
        "backCheckCandidate": _field_has_tag(field, "back-check-candidate"),
        "staticGpsWarning": _field_has_tag(field, "static-gps-warning"),
        "fastInterviewWarning": _field_has_tag(field, "fast-interview-warning"),
        "minimumSeconds": _field_metadata_value(field, "min-seconds"),
        "integrityAction": _field_metadata_value(field, "integrity-action"),
    }


def _field_governance_controls(field: dict[str, Any]) -> dict[str, Any]:
    return {
        "editRule": _field_metadata_value(field, "edit-rule"),
        "reviewerRole": _field_metadata_value(field, "reviewer-role"),
        "auditLabel": _field_metadata_value(field, "audit-label"),
        "changeReasonRequired": _field_has_tag(field, "change-reason-required"),
        "approvedDataLock": _field_has_tag(field, "approved-data-lock"),
        "reviewerCommentRequired": _field_has_tag(field, "reviewer-comment-required"),
        "includeInDataFreeze": _field_has_tag(field, "include-in-data-freeze"),
        "qualityFlagVisible": _field_has_tag(field, "quality-flag-visible"),
        "sourceLineageVisible": _field_has_tag(field, "source-lineage-visible"),
    }


def _field_indicator_mapping(field: dict[str, Any]) -> dict[str, Any]:
    return {
        "indicatorId": _field_metadata_value(field, "indicator"),
        "component": _field_metadata_value(field, "indicator-component"),
        "unit": _field_metadata_value(field, "unit"),
        "reportingPeriod": _field_metadata_value(field, "report-period"),
        "disaggregation": _field_metadata_value(field, "disaggregation"),
        "donorTag": _field_metadata_value(field, "donor-tag"),
    }


def _field_beneficiary_mapping(field: dict[str, Any]) -> dict[str, Any]:
    return {
        "profileImpact": _field_metadata_value(field, "profile-impact"),
        "beneficiaryField": _field_metadata_value(field, "beneficiary-field"),
        "profileUpdateRule": _field_metadata_value(field, "profile-update-rule"),
        "duplicateKey": _field_has_tag(field, "duplicate-key"),
        "sourceOfTruth": _field_has_tag(field, "source-of-truth"),
        "lineageRequired": _field_has_tag(field, "lineage-required"),
    }


def _validation_rules(field: dict[str, Any]) -> list[dict[str, Any]]:
    rules: list[dict[str, Any]] = []
    blocked_help = _field_metadata_value(field, "blocked-help")
    if bool(field.get("required", False)):
        rules.append(
            {
                "ruleType": "Required",
                "value": True,
                "message": blocked_help or "This question is required.",
                "severity": "Block",
            }
        )
    field_type = str(field.get("type") or "").lower()
    validation = field.get("validation") if isinstance(field.get("validation"), dict) else {}
    if validation:
        for source, rule_type in (
            ("min", "Min"),
            ("max", "Max"),
            ("minLength", "MinLength"),
            ("maxLength", "MaxLength"),
            ("pattern", "Regex"),
            ("regex", "Regex"),
        ):
            if source in validation:
                rules.append(
                    {
                        "ruleType": rule_type,
                        "value": validation[source],
                        "message": str(validation.get("message") or blocked_help or "Check the allowed value for this question."),
                        "severity": "Block",
                    }
                )
        if field_type in {"gps", "geolocation", "map", "geofence"} and "accuracyMax" in validation:
            rules.append(
                {
                    "ruleType": "Custom",
                    "value": f"accuracyMax:{validation['accuracyMax']}",
                    "message": blocked_help or f"GPS accuracy must be {validation['accuracyMax']} meters or better.",
                    "severity": "Block",
                }
            )
        if field_type in {"date", "datetime"} and bool(validation.get("allowFuture")):
            rules.append(
                {
                    "ruleType": "Custom",
                    "value": "allowFuture:true",
                    "message": "Future dates are allowed for this question.",
                    "severity": "Warning",
                }
            )
    if _field_has_tag(field, "capture-gps"):
        rules.append(
            {
                "ruleType": "Custom",
                "value": "captureGps:true",
                "message": blocked_help or "Capture GPS evidence before submitting this answer.",
                "severity": "Block" if _field_metadata_value(field, "integrity-action") == "block_submission" else "Warning",
            }
        )
    if _field_has_tag(field, "photo-evidence"):
        rules.append(
            {
                "ruleType": "Custom",
                "value": "photoEvidence:true",
                "message": blocked_help or "Add photo evidence for this question when required by the form.",
                "severity": "Block" if _field_metadata_value(field, "integrity-action") == "block_submission" else "Warning",
            }
        )
    if _field_has_tag(field, "consent-required"):
        rules.append(
            {
                "ruleType": "Custom",
                "value": "consentRequired:true",
                "message": blocked_help or "Consent must be captured before this answer can be used.",
                "severity": "Block",
            }
        )
    if field_type == "matrix_multi":
        rules.append(
            {
                "ruleType": "Custom",
                "value": "matrixMode:multi",
                "message": "Multiple matrix choices are allowed per row.",
                "severity": "Warning",
            }
        )
    if field_type == "email":
        rules.append(
            {
                "ruleType": "Regex",
                "value": r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
                "message": "Enter a valid email address.",
                "severity": "Block",
            }
        )
    if field_type == "phone":
        rules.append(
            {
                "ruleType": "Regex",
                "value": r"^[0-9+\-\s()]{7,}$",
                "message": "Enter a valid phone number.",
                "severity": "Block",
            }
        )
    if field_type == "url":
        rules.append(
            {
                "ruleType": "Regex",
                "value": r"^https?://.+",
                "message": "Enter a valid URL.",
                "severity": "Block",
            }
        )
    return rules


def _slugify_reference(value: str | None) -> str | None:
    if not value:
        return None
    return value.strip().lower().replace(" ", "-").replace("_", "-")


def _logic_rules(field: dict[str, Any], variable_to_id: dict[str, str]) -> list[dict[str, Any]]:
    rules: list[dict[str, Any]] = []
    for index, rule in enumerate(field.get("logic") or []):
        if not isinstance(rule, dict):
            continue
        expression = str(rule.get("expression") or "")
        source_question_id: str | None = None
        value: str | int | float | bool | None = None
        operator = "Equals"
        if expression.startswith("${") and "}" in expression:
            variable, _, remaining = expression[2:].partition("}")
            source_question_id = variable_to_id.get(variable)
            text = remaining.strip()
            if text.startswith("="):
                value = text[1:].strip().strip("'\"")
            elif text.startswith("!="):
                operator = "NotEquals"
                value = text[2:].strip().strip("'\"")
            elif text.startswith(">"):
                operator = "GreaterThan"
                value = text[1:].strip().strip("'\"")
            elif text.startswith("<"):
                operator = "LessThan"
                value = text[1:].strip().strip("'\"")
        if not source_question_id:
            continue
        kind = str(rule.get("kind") or "show")
        action = {
            "visibility": "ShowIf",
            "show": "ShowIf",
            "hide": "HideIf",
            "required": "RequiredIf",
            "skip": "SkipTo",
            "calculation": "Calculate",
        }.get(kind)
        if not action:
            continue
        rules.append(
            {
                "id": str(rule.get("id") or f"{field.get('id')}-logic-{index + 1}"),
                "action": action,
                "sourceQuestionId": source_question_id,
                "operator": operator,
                "value": value,
                "targetQuestionId": rule.get("targetId") or field.get("id"),
            }
        )
    calculation = field.get("calculation")
    expression = calculation.get("expression") if isinstance(calculation, dict) else field.get("calculation")
    if expression:
        rules.append(
            {
                "id": f"{field.get('id')}-calculation",
                "action": "Calculate",
                "sourceQuestionId": str(field.get("id")),
                "operator": "IsNotEmpty",
                "value": None,
                "targetQuestionId": field.get("id"),
            }
        )
    return rules


def _mobile_default_value(field: dict[str, Any]) -> Any:
    field_type = str(field.get("type") or "").lower()
    default_value = field.get("defaultValue")
    if field_type not in {"matrix_single", "matrix_multi", "repeat_group", "repeatable_group", "ranking"}:
        return default_value

    metadata: dict[str, Any] = default_value if isinstance(default_value, dict) else {}
    if default_value is not None and not isinstance(default_value, dict):
        metadata["value"] = default_value
    if field_type in {"matrix_single", "matrix_multi"}:
        metadata.setdefault("mode", "multi" if field_type == "matrix_multi" else "single")
        metadata.setdefault("rows", field.get("rows") or field.get("matrixRows") or field.get("statements") or [])
        metadata.setdefault("columns", field.get("columns") or field.get("matrixColumns") or field.get("options") or [])
    if field_type in {"repeat_group", "repeatable_group"}:
        metadata.setdefault("fields", field.get("fields") or field.get("questions") or field.get("children") or [])
    if field_type == "ranking":
        metadata.setdefault("options", field.get("options") or [])
    return metadata


def _schema_sections(schema_json: dict[str, Any], controls_json: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    controls = controls_json or {}
    reference_bindings = controls.get("reference_bindings") if isinstance(controls.get("reference_bindings"), list) else []
    reference_by_question = {
        str(binding.get("question_id")): _slugify_reference(str(binding.get("reference_type") or binding.get("reference_list_name") or ""))
        for binding in reference_bindings
        if isinstance(binding, dict) and binding.get("question_id")
    }
    variable_to_id: dict[str, str] = {}
    for section in schema_json.get("sections", []):
        for field in section.get("fields", []):
            field_id = str(field.get("id") or "")
            variable = str(field.get("variable_name") or field.get("variableName") or field_id.replace("-", "_").lower())
            if field_id:
                variable_to_id[field_id] = field_id
            if variable and field_id:
                variable_to_id[variable] = field_id
    sections: list[dict[str, Any]] = []
    for section_index, section in enumerate(schema_json.get("sections", [])):
        section_id = str(section.get("id") or f"section-{section_index + 1}")
        questions: list[dict[str, Any]] = []
        for field_index, field in enumerate(section.get("fields", [])):
            field_id = str(field.get("id") or f"{section_id}-question-{field_index + 1}")
            variable_name = str(field.get("variable_name") or field.get("variableName") or field_id.replace("-", "_").lower())
            reference_list_id = (
                field.get("referenceListId")
                or _field_metadata_value(field, "reference-list")
                or reference_by_question.get(field_id)
            )
            cascading_parent = field.get("cascadingParentQuestionId") or variable_to_id.get(
                str(_field_metadata_value(field, "reference-parent") or "")
            )
            privacy_controls = _field_privacy_controls(field)
            questions.append(
                {
                    "id": field_id,
                    "sectionId": section_id,
                    "variableName": variable_name,
                    "label": str(field.get("label") or field_id),
                    "helpText": field.get("hint"),
                    "type": _mobile_question_type(str(field.get("type") or "text")),
                    "required": bool(field.get("required", False)),
                    "readOnly": bool(field.get("readOnly", False)),
                    "defaultValue": _mobile_default_value(field),
                    "options": _field_options(list(field.get("options") or [])),
                    "validationRules": _validation_rules(field),
                    "logicRules": _logic_rules(field, variable_to_id),
                    "referenceListId": reference_list_id,
                    "cascadingParentQuestionId": cascading_parent,
                    "sensitive": bool(
                        field.get("sensitive", False)
                        or privacy_controls["sensitivity"] in {"sensitive", "restricted", "pii"}
                    ),
                    "repeatSettings": field.get("repeatSettings"),
                    "metadataTags": _field_metadata_tags(field),
                    "indicatorMapping": _field_indicator_mapping(field),
                    "beneficiaryMapping": _field_beneficiary_mapping(field),
                    "referenceControls": {
                        "referenceListId": reference_list_id,
                        "parentQuestionId": cascading_parent,
                        "newReferencePolicy": _field_metadata_value(field, "new-reference-policy"),
                        "offlineRequired": _field_has_tag(field, "reference-offline"),
                        "searchable": _field_has_tag(field, "searchable-reference"),
                        "versionLocked": _field_has_tag(field, "reference-version-lock"),
                    },
                    "qualityControls": _field_quality_controls(field),
                    "privacyControls": privacy_controls,
                    "mobileControls": _field_mobile_controls(field),
                    "governanceControls": _field_governance_controls(field),
                    "order": field_index + 1,
                }
            )
        sections.append(
            {
                "id": section_id,
                "title": str(section.get("title") or f"Section {section_index + 1}"),
                "description": section.get("description"),
                "order": section_index + 1,
                "questions": questions,
            }
        )
    return sections


def _entity_settings(controls_json: dict[str, Any]) -> dict[str, Any]:
    controls = controls_json or {}
    entity_controls = controls.get("entity_controls") if isinstance(controls.get("entity_controls"), dict) else {}
    frequency = str(entity_controls.get("submission_frequency") or "Unlimited")
    frequency_map = {
        "once_ever": "OnceEverPerEntity",
        "once_per_project": "OncePerProjectPerEntity",
        "once_per_year": "OncePerYearPerEntity",
        "once_per_season": "OncePerSeasonPerEntity",
        "once_per_quarter": "OncePerQuarterPerEntity",
        "once_per_month": "OncePerMonthPerEntity",
        "once_per_event": "OncePerEventPerEntity",
        "unlimited": "Unlimited",
    }
    duplicate_mode = str(entity_controls.get("duplicate_mode") or "weighted")
    if duplicate_mode not in {"exact", "fuzzy", "weighted"}:
        duplicate_mode = "weighted"
    duplicate_action = str(entity_controls.get("duplicate_action") or "block")
    if duplicate_action not in {"block", "warn", "review"}:
        duplicate_action = "block"
    raw_threshold = entity_controls.get("duplicate_threshold")
    duplicate_threshold = (
        int(raw_threshold) if isinstance(raw_threshold, (int, float)) and 0 <= raw_threshold <= 100 else 60
    )
    return {
        "linkedToEntity": bool(entity_controls.get("is_entity_linked", False)),
        "entityType": entity_controls.get("entity_type"),
        "createsNewEntity": bool(entity_controls.get("creates_new_entity", False)),
        "updatesExistingEntity": bool(entity_controls.get("updates_existing_entity", False)),
        "requiresExistingEntity": bool(entity_controls.get("requires_existing_entity", False)),
        "allowsAnonymousSubmission": bool(entity_controls.get("allows_anonymous_submission", True)),
        "frequencyRule": frequency_map.get(frequency, frequency if frequency in frequency_map.values() else "Unlimited"),
        "prefillMappings": entity_controls.get("prefill_mappings") or [],
        "duplicateMode": duplicate_mode,
        "duplicateThreshold": duplicate_threshold,
        "duplicateAction": duplicate_action,
    }


class MobileService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.submissions = SubmissionService(session)

    async def _officer_profile(self, organization_id: UUID, user_id: UUID) -> FieldOfficerProfile | None:
        result = await self.session.execute(
            select(FieldOfficerProfile).where(
                FieldOfficerProfile.organization_id == organization_id,
                FieldOfficerProfile.user_id == user_id,
                FieldOfficerProfile.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def _ensure_officer_profile(
        self,
        organization_id: UUID,
        user_id: UUID,
        principal: CurrentPrincipal,
    ) -> FieldOfficerProfile | None:
        officer = await self._officer_profile(organization_id, user_id)
        if officer is not None:
            return officer
        if "field_officer" not in {canonical_role(role) for role in principal.roles}:
            return None
        officer = FieldOfficerProfile(
            organization_id=organization_id,
            user_id=user_id,
            employee_code=f"FO-{str(user_id)[:8].upper()}",
            phone_number=None,
            home_region=None,
            is_active=True,
        )
        self.session.add(officer)
        await self.session.flush()
        return officer

    async def register_device(
        self,
        principal: CurrentPrincipal,
        payload: MobileDeviceRegistrationCreate,
    ) -> MobileDeviceRegistrationRead:
        organization_id = UUID(principal.organization_id)
        user_id = UUID(principal.user_id)
        now = datetime.now(UTC)
        officer = await self._ensure_officer_profile(organization_id, user_id, principal)
        if officer is not None:
            officer.device_id = payload.device_id
            officer.last_seen_at = now
            await self.session.flush()
        return MobileDeviceRegistrationRead(
            device_id=payload.device_id,
            status="Active" if officer is None or officer.is_active else "Inactive",
            registered_at=officer.created_at if officer is not None else now,
            last_seen_at=now,
            remote_logout_required=False,
            remote_wipe_required=False,
        )

    async def _assignments(self, organization_id: UUID, officer_id: UUID) -> list[OfficerAssignment]:
        result = await self.session.execute(
            select(OfficerAssignment).where(
                OfficerAssignment.organization_id == organization_id,
                OfficerAssignment.officer_id == officer_id,
                OfficerAssignment.deleted_at.is_(None),
            )
        )
        return list(result.scalars())

    async def _projects(self, organization_id: UUID, project_ids: set[UUID]) -> list[Project]:
        if not project_ids:
            return []
        result = await self.session.execute(
            select(Project)
            .where(Project.organization_id == organization_id, Project.id.in_(project_ids), Project.deleted_at.is_(None))
            .order_by(Project.name)
        )
        return list(result.scalars())

    async def _forms(self, organization_id: UUID, project_ids: set[UUID], form_ids: set[UUID]) -> list[DataForm]:
        if not project_ids and not form_ids:
            return []
        from sqlalchemy import or_

        scope_conditions = []
        if project_ids:
            scope_conditions.append(DataForm.project_id.in_(project_ids))
        if form_ids:
            scope_conditions.append(DataForm.id.in_(form_ids))
        result = await self.session.execute(
            select(DataForm)
            .where(
                DataForm.organization_id == organization_id,
                or_(*scope_conditions),
                DataForm.deleted_at.is_(None),
                DataForm.is_active.is_(True),
                DataForm.status == "published",
            )
            .order_by(DataForm.name)
        )
        return list(result.scalars())

    async def _forms_for_officer_access(self, organization_id: UUID, officer_id: UUID, user_id: UUID) -> list[DataForm]:
        result = await self.session.execute(
            select(DataForm)
            .where(
                DataForm.organization_id == organization_id,
                DataForm.deleted_at.is_(None),
                DataForm.is_active.is_(True),
                DataForm.status == "published",
            )
            .order_by(DataForm.name)
        )
        all_forms = list(result.scalars())
        forms_with_team_filter = [
            form
            for form in all_forms
            if isinstance(form.controls_json, dict)
            and isinstance(form.controls_json.get("collection_access"), dict)
            and form.controls_json["collection_access"].get("selection_mode") == "assigned_only"
            and form.controls_json["collection_access"].get("team_ids")
        ]
        team_id: UUID | None = None
        if forms_with_team_filter:
            workforce_result = await self.session.execute(
                select(WorkforceProfile.team_id).where(
                    WorkforceProfile.organization_id == organization_id,
                    WorkforceProfile.user_id == user_id,
                    WorkforceProfile.deleted_at.is_(None),
                )
            )
            team_id = workforce_result.scalar_one_or_none()

        officer_key = str(officer_id)
        team_key = str(team_id) if team_id is not None else None
        forms: list[DataForm] = []
        for form in all_forms:
            controls = form.controls_json or {}
            collection_access = controls.get("collection_access")
            if not isinstance(collection_access, dict):
                continue
            if collection_access.get("selection_mode") != "assigned_only":
                continue
            selected_officers = collection_access.get("field_officer_ids")
            if isinstance(selected_officers, list) and officer_key in {str(item) for item in selected_officers}:
                forms.append(form)
                continue
            selected_teams = collection_access.get("team_ids")
            if (
                team_key is not None
                and isinstance(selected_teams, list)
                and team_key in {str(item) for item in selected_teams}
            ):
                forms.append(form)
        return forms

    async def _versions(self, organization_id: UUID, forms: list[DataForm]) -> list[DataFormVersion]:
        if not forms:
            return []
        conditions = [
            (DataFormVersion.form_id == form.id) & (DataFormVersion.version == form.current_version)
            for form in forms
        ]
        query = select(DataFormVersion).where(DataFormVersion.organization_id == organization_id)
        if conditions:
            from sqlalchemy import or_

            query = query.where(or_(*conditions))
        result = await self.session.execute(query)
        return list(result.scalars())

    async def _entities(self, organization_id: UUID, project_ids: set[UUID]) -> list[Beneficiary]:
        if not project_ids:
            return []
        result = await self.session.execute(
            select(Beneficiary)
            .where(
                Beneficiary.organization_id == organization_id,
                Beneficiary.project_id.in_(project_ids),
                Beneficiary.deleted_at.is_(None),
            )
            .order_by(Beneficiary.display_name)
            .limit(1000)
        )
        return list(result.scalars())

    async def _reference_lists(self, organization_id: UUID) -> list[MobileReferenceListRead]:
        result = await self.session.execute(
            select(PlatformReferenceList)
            .where(
                PlatformReferenceList.deleted_at.is_(None),
                PlatformReferenceList.status == "active",
                (PlatformReferenceList.organization_id == organization_id) | PlatformReferenceList.organization_id.is_(None),
            )
            .order_by(PlatformReferenceList.category, PlatformReferenceList.name)
            .limit(200)
        )
        reference_lists = list(result.scalars())
        if not reference_lists:
            return []
        values_result = await self.session.execute(
            select(PlatformReferenceValue)
            .where(
                PlatformReferenceValue.reference_list_id.in_([item.id for item in reference_lists]),
                PlatformReferenceValue.deleted_at.is_(None),
                PlatformReferenceValue.is_active.is_(True),
            )
            .order_by(PlatformReferenceValue.sort_order, PlatformReferenceValue.label)
        )
        values_by_list: dict[UUID, list[dict[str, Any]]] = {}
        for value in values_result.scalars():
            values_by_list.setdefault(value.reference_list_id, []).append(
                {
                    "id": str(value.id),
                    "code": value.code,
                    "label": value.label,
                    "description": value.description,
                    "active": value.is_active,
                    "sortOrder": value.sort_order,
                    "metadata": value.metadata_json or {},
                }
            )
        return [
            MobileReferenceListRead(
                id=reference_list.slug,
                name=reference_list.name,
                slug=reference_list.slug,
                version=reference_list.version,
                values=values_by_list.get(reference_list.id, []),
            )
            for reference_list in reference_lists
        ]

    async def _assignment_completion_counts(self, organization_id: UUID, assignments: list[OfficerAssignment]) -> dict[UUID, int]:
        assignment_ids = [assignment.id for assignment in assignments]
        if not assignment_ids:
            return {}
        result = await self.session.execute(
            select(Submission.assignment_id, func.count(Submission.id))
            .where(
                Submission.organization_id == organization_id,
                Submission.assignment_id.in_(assignment_ids),
                Submission.deleted_at.is_(None),
                Submission.status.in_(["submitted", "pending_review", "under_review", "resubmitted", "approved"]),
            )
            .group_by(Submission.assignment_id)
        )
        return {assignment_id: int(count) for assignment_id, count in result.all() if assignment_id is not None}

    def _permission_set(self, principal: CurrentPrincipal) -> MobilePermissionSetRead:
        permissions = set(principal.permissions)
        can_sync = "sync.mobile" in permissions
        can_submit = "submissions.create" in permissions
        return MobilePermissionSetRead(
            id=principal.user_id,
            user_id=principal.user_id,
            permissions=principal.permissions,
            can_collect_data=can_submit,
            can_work_offline=can_sync,
            can_upload_media=can_sync,
            can_use_gps=can_sync,
            can_correct_returned_submissions=can_submit,
        )

    def _mobile_rules(self, principal: CurrentPrincipal) -> MobileOfflineRulesRead:
        permissions = set(principal.permissions)
        return MobileOfflineRulesRead(
            id=f"mobile-rules:{principal.user_id}",
            offline_collection_allowed="sync.mobile" in permissions,
            sync_required=False,
            max_offline_days=7,
            gps_required=False,
            photo_required=False,
            minimum_app_version="1.0.0-test",
            allowed_collection_hours={"start": None, "end": None},
            maximum_submissions_per_day=None,
            minimum_interview_duration_seconds=None,
        )

    def _officer_read(self, officer: FieldOfficerProfile | None, principal: CurrentPrincipal) -> MobileOfficerProfileRead | None:
        if officer is None:
            return None
        return MobileOfficerProfileRead(
            id=str(officer.id),
            user_id=str(officer.user_id),
            username=(principal.email or "").split("@")[0] or principal.email or str(officer.user_id),
            email=principal.email,
            full_name=principal.full_name,
            employee_code=officer.employee_code,
            phone=officer.phone_number,
            team=officer.home_region,
            supervisor_id=None,
            supervisor_name=None,
            status="Active" if officer.is_active else "Inactive",
            last_sync_at=officer.last_sync_at,
        )

    def _device_read(self, officer: FieldOfficerProfile | None, principal: CurrentPrincipal) -> MobileDeviceRecordRead | None:
        if officer is None or not officer.device_id:
            return None
        now = datetime.now(UTC)
        return MobileDeviceRecordRead(
            id=officer.device_id,
            device_id=officer.device_id,
            device_name="Atlas FieldOps Android",
            platform="Android",
            app_version="1.0.0-test",
            os_version=None,
            user_id=principal.user_id,
            organization_id=principal.organization_id,
            status="Active" if officer.is_active else "Inactive",
            registered_at=officer.created_at,
            last_seen_at=officer.last_seen_at or now,
            last_sync_at=officer.last_sync_at,
            last_login_at=officer.last_seen_at or now,
            remote_logout_required=False,
            remote_wipe_required=False,
        )

    def _blocked_state(self, officer: FieldOfficerProfile | None) -> MobileBlockedStateRead:
        if officer is None:
            return MobileBlockedStateRead(
                blocked=True,
                reason="This account is not configured as an assigned field officer. Contact your administrator.",
                account_status="Unknown",
                device_status="Unknown",
            )
        if not officer.is_active:
            return MobileBlockedStateRead(
                blocked=True,
                reason="This field officer account is inactive or suspended. Contact your supervisor.",
                account_status="Inactive",
                device_status="Active",
            )
        return MobileBlockedStateRead(blocked=False, account_status="Active", device_status="Active")

    def _bootstrap(
        self,
        principal: CurrentPrincipal,
        projects: list[MobileProjectRead],
        *,
        officer: FieldOfficerProfile | None,
        assigned_counts: MobileAssignedCountsRead | None = None,
    ) -> MobileBootstrapRead:
        now = datetime.now(UTC)
        return MobileBootstrapRead(
            user={
                "id": principal.user_id,
                "email": principal.email,
                "full_name": principal.full_name,
                "roles": principal.roles,
                "permissions": principal.permissions,
            },
            organization={
                "id": principal.organization_id,
                "name": principal.organization_name,
                "slug": principal.organization_slug,
                "default_language": "English",
                "timezone": "UTC",
                "branding": {"logoUrl": None, "brandColor": None},
            },
            field_officer_profile=self._officer_read(officer, principal),
            supervisor=None,
            permission_set=self._permission_set(principal),
            mobile_rules=self._mobile_rules(principal),
            device=self._device_read(officer, principal),
            assigned_counts=assigned_counts or MobileAssignedCountsRead(projects=len(projects)),
            blocked_state=self._blocked_state(officer),
            permissions=principal.permissions,
            assigned_projects=projects,
            last_sync={
                "deviceId": officer.device_id if officer is not None else None,
                "lastSyncedAt": officer.last_sync_at.isoformat() if officer is not None and officer.last_sync_at else None,
                "serverTime": now.isoformat(),
            },
        )

    async def sync_package(self, principal: CurrentPrincipal) -> MobileSyncPackageRead:
        organization_id = UUID(principal.organization_id)
        user_id = UUID(principal.user_id)
        officer = await self._ensure_officer_profile(organization_id, user_id, principal)
        if officer is None:
            return MobileSyncPackageRead(bootstrap=self._bootstrap(principal, [], officer=None))
        officer.last_sync_at = datetime.now(UTC)
        await self.session.flush()

        assignments = await self._assignments(organization_id, officer.id)
        controlled_forms = await self._forms_for_officer_access(organization_id, officer.id, officer.user_id)
        assignment_keys = {
            (assignment.project_id, assignment.form_id)
            for assignment in assignments
            if assignment.deleted_at is None
        }
        for form in controlled_forms:
            if form.project_id is None or (form.project_id, form.id) in assignment_keys:
                continue
            assignment = OfficerAssignment(
                organization_id=organization_id,
                officer_id=officer.id,
                project_id=form.project_id,
                form_id=form.id,
                region=None,
                is_active=True,
            )
            self.session.add(assignment)
            await self.session.flush()
            assignments.append(assignment)
            assignment_keys.add((form.project_id, form.id))
        project_ids = {assignment.project_id for assignment in assignments if assignment.is_active}
        project_ids.update(form.project_id for form in controlled_forms if form.project_id is not None)
        assigned_form_ids = {assignment.form_id for assignment in assignments if assignment.is_active and assignment.form_id is not None}
        assigned_form_ids.update(form.id for form in controlled_forms)
        legacy_project_form_ids = {
            assignment.project_id
            for assignment in assignments
            if assignment.is_active and assignment.form_id is None
        }
        projects = await self._projects(organization_id, project_ids)
        forms = await self._forms(organization_id, legacy_project_form_ids, assigned_form_ids)
        versions = await self._versions(organization_id, forms)
        entities = await self._entities(organization_id, project_ids)
        reference_lists = await self._reference_lists(organization_id)
        completion_counts = await self._assignment_completion_counts(organization_id, assignments)
        versions_by_form = {version.form_id: version for version in versions}
        forms_by_project: dict[UUID, list[DataForm]] = {}
        for form in forms:
            if form.project_id is not None:
                forms_by_project.setdefault(form.project_id, []).append(form)
        forms_by_id = {form.id: form for form in forms}

        project_reads = [
            MobileProjectRead(
                id=str(project.id),
                organization_id=str(project.organization_id),
                name=project.name,
                code=project.slug,
                status="Active" if project.is_active else "Archived",
                region=project.region,
                country=project.country,
                sector=project.settings_json.get("sector", {}) if isinstance(project.settings_json, dict) else {},
            )
            for project in projects
        ]
        assignment_reads = []
        for assignment in assignments:
            project_forms = forms_by_project.get(assignment.project_id, [])
            selected_form = forms_by_id.get(assignment.form_id) if assignment.form_id else None
            if selected_form is None:
                selected_form = project_forms[0] if project_forms else None
            selected_version = versions_by_form.get(selected_form.id) if selected_form else None
            project_entities = [entity for entity in entities if entity.project_id == assignment.project_id]
            assignment_reads.append(
                MobileAssignmentRead(
                    id=str(assignment.id),
                    project_id=str(assignment.project_id),
                    form_id=str(selected_form.id) if selected_form else None,
                    form_version_id=str(selected_version.id) if selected_version else None,
                    entity_ids=[str(entity.id) for entity in project_entities],
                    location_ids=[assignment.region] if assignment.region else [],
                    target_count=max(len(project_entities), 0),
                    completed_count=completion_counts.get(assignment.id, 0),
                    status=_assignment_status(assignment.is_active),
                    priority="Normal",
                )
            )

        form_reads = [
            MobileFormRead(
                id=str(form.id),
                project_id=str(form.project_id) if form.project_id else None,
                name=form.name,
                description=form.description,
                status=_form_status(form.status),
                current_version_id=str(versions_by_form[form.id].id) if form.id in versions_by_form else None,
            )
            for form in forms
        ]
        version_reads = [
            MobileFormVersionRead(
                id=str(version.id),
                form_id=str(version.form_id),
                version=version.version,
                published_at=version.published_at,
                offline_compatible=version.offline_compatible,
                sections=_schema_sections(version.schema_json, next((form.controls_json for form in forms if form.id == version.form_id), {})),
                entity_settings=_entity_settings(next((form.controls_json for form in forms if form.id == version.form_id), {})),
            )
            for version in versions
        ]
        entity_reads = [
            MobileEntityRead(
                id=str(entity.id),
                entity_uid=entity.beneficiary_uid,
                entity_type=entity.beneficiary_type,
                name=entity.display_name,
                phone=entity.phone_number,
                national_id=entity.profile_json.get("national_id"),
                household_id=entity.profile_json.get("household_id"),
                gender=entity.sex,
                date_of_birth=str(entity.profile_json.get("date_of_birth")) if entity.profile_json.get("date_of_birth") else None,
                location={
                    "country": entity.profile_json.get("country"),
                    "region": entity.region,
                    "district": entity.district,
                    "community": entity.community,
                    "village": entity.profile_json.get("village"),
                },
                gps={"latitude": entity.latitude, "longitude": entity.longitude, "accuracy": None},
                status=entity.enrollment_status.title(),
                project_ids=[str(entity.project_id)] if entity.project_id else [],
                assigned_form_ids=[str(form.id) for form in forms if form.project_id == entity.project_id],
                profile=entity.profile_json or {},
            )
            for entity in entities
        ]
        location_reads = self._locations_from_entities(organization_id, projects, entities)
        assigned_counts = MobileAssignedCountsRead(
            projects=len(project_reads),
            assignments=len(assignment_reads),
            forms=len(form_reads),
            beneficiaries=len(entity_reads),
            locations=len(location_reads),
            returned_submissions=0,
            pending_uploads=0,
        )

        return MobileSyncPackageRead(
            bootstrap=self._bootstrap(principal, project_reads, officer=officer, assigned_counts=assigned_counts),
            assignments=assignment_reads,
            forms=form_reads,
            form_versions=version_reads,
            entities=entity_reads,
            locations=location_reads,
            reference_lists=reference_lists,
            returned_submissions=[],
            notifications=[],
        )

    def _locations_from_entities(
        self,
        organization_id: UUID,
        projects: list[Project],
        entities: list[Beneficiary],
    ) -> list[MobileLocationRead]:
        seen: set[tuple[str, str]] = set()
        locations: list[MobileLocationRead] = []
        for project in projects:
            if project.region:
                key = ("Region", project.region)
                if key not in seen:
                    seen.add(key)
                    locations.append(
                        MobileLocationRead(
                            id=f"region:{project.region}",
                            organization_id=str(organization_id),
                            name=project.region,
                            code=project.region.lower().replace(" ", "-"),
                            level="Region",
                            active=True,
                        )
                    )
        for entity in entities:
            for level, value in (("Region", entity.region), ("District", entity.district), ("Community", entity.community)):
                if not value:
                    continue
                key = (level, value)
                if key in seen:
                    continue
                seen.add(key)
                locations.append(
                    MobileLocationRead(
                        id=f"{level.lower()}:{value}",
                        organization_id=str(organization_id),
                        name=value,
                        code=value.lower().replace(" ", "-"),
                        level=level,
                        latitude=entity.latitude,
                        longitude=entity.longitude,
                        active=True,
                    )
                )
        return locations

    async def projects(self, principal: CurrentPrincipal) -> list[MobileProjectRead]:
        return (await self.sync_package(principal)).bootstrap.assigned_projects

    async def assignments(self, principal: CurrentPrincipal) -> list[MobileAssignmentRead]:
        return (await self.sync_package(principal)).assignments

    async def forms(self, principal: CurrentPrincipal) -> list[MobileFormRead]:
        return (await self.sync_package(principal)).forms

    async def form_versions(self, principal: CurrentPrincipal) -> list[MobileFormVersionRead]:
        return (await self.sync_package(principal)).form_versions

    async def entities(self, principal: CurrentPrincipal) -> list[MobileEntityRead]:
        return (await self.sync_package(principal)).entities

    async def locations(self, principal: CurrentPrincipal) -> list[MobileLocationRead]:
        return (await self.sync_package(principal)).locations

    async def reference_data(self, principal: CurrentPrincipal) -> list[MobileReferenceListRead]:
        return (await self.sync_package(principal)).reference_lists

    async def upload_submission(
        self,
        *,
        principal: CurrentPrincipal,
        payload: MobileSubmissionUpload,
    ) -> MobileSubmissionUploadRead:
        organization_id = UUID(principal.organization_id)
        result = await self.session.execute(
            select(DataFormVersion).where(
                DataFormVersion.organization_id == organization_id,
                DataFormVersion.id == UUID(payload.form_version_id),
                DataFormVersion.form_id == UUID(payload.form_id),
            )
        )
        form_version = result.scalar_one_or_none()
        if form_version is None:
            raise CollectionNotFoundError("Form version not found or no longer available for mobile sync")
        form_result = await self.session.execute(
            select(DataForm).where(
                DataForm.organization_id == organization_id,
                DataForm.id == UUID(payload.form_id),
                DataForm.deleted_at.is_(None),
            )
        )
        form = form_result.scalar_one_or_none()
        if form is None or form.project_id is None or form.survey_id is None:
            raise CollectionNotFoundError("Form is not linked to a project and survey")
        entity_id = UUID(payload.entity_id) if payload.entity_id else None
        entity_type = payload.entity_type
        entity_settings = _entity_settings(form.controls_json or {})
        if entity_id is None and bool(entity_settings.get("createsNewEntity")):
            entity_type = str(entity_settings.get("entityType") or payload.entity_type or "Farmer")
        now = datetime.now(UTC)
        response_payload = [response.model_dump(mode="json", by_alias=True) for response in payload.responses]
        derived_location = self._location_from_responses(response_payload)
        location_payload = payload.location or derived_location or {}
        latitude = location_payload.get("latitude")
        longitude = location_payload.get("longitude")
        if latitude is None or longitude is None:
            if self._form_requires_gps(form_version.schema_json, form.controls_json or {}):
                raise ValueError("Capture GPS before syncing this submission. The record was kept on the device for retry.")
            latitude = 0
            longitude = 0
        location = LocationCapture(
            latitude=float(latitude),
            longitude=float(longitude),
            altitude=location_payload.get("altitude"),
            accuracy=location_payload.get("accuracy"),
            timestamp=location_payload.get("timestamp") or now,
        )
        flattened_responses = _flatten_mobile_responses(response_payload)
        submission_payload = SubmissionCreate(
            client_submission_id=payload.local_id,
            project_id=form.project_id,
            survey_id=form.survey_id,
            form_id=form.id,
            form_version=form_version.version,
            entity_id=entity_id,
            entity_type=entity_type,
            assignment_id=UUID(payload.assignment_id) if payload.assignment_id else None,
            frequency_period=payload.frequency_period,
            event_id=payload.event_id,
            payload={
                **flattened_responses,
                "_mobile_responses": response_payload,
                "_mobile_location_status": "captured" if payload.location or derived_location else "not_required_or_missing",
                "_mobile_integrity": payload.integrity_signals or {},
                "_mobile_integrity_status": self._integrity_status(payload.integrity_signals),
            },
            captured_at=payload.created_at,
            submitted_at=payload.submitted_at or now,
            offline_created=True,
            device=DeviceMetadata(
                device_id=payload.device_id or "unknown-mobile-device",
                platform="mobile",
                app_version=payload.app_version,
            ),
            location=location,
        )
        submission = await self.submissions.create_submission(
            organization_id=organization_id,
            actor_user_id=UUID(principal.user_id),
            payload=submission_payload,
        )
        return MobileSubmissionUploadRead(
            status="synced",
            server_submission_id=str(submission.id),
            local_id=payload.local_id,
            synced_at=submission.sync_received_at,
            message="Submission synced to the web platform.",
        )

    def _integrity_status(self, integrity_signals: dict[str, Any] | None) -> str:
        if not integrity_signals:
            return "not_evaluated"
        risk_level = str(integrity_signals.get("riskLevel") or integrity_signals.get("risk_level") or "").lower()
        signals = integrity_signals.get("signals")
        critical = [
            signal for signal in signals
            if isinstance(signal, dict) and str(signal.get("severity") or "").lower() == "critical"
        ] if isinstance(signals, list) else []
        if risk_level == "high" or critical:
            return "requires_supervisor_attention"
        if risk_level == "medium":
            return "review_recommended"
        return "no_unusual_signal"

    def _location_from_responses(self, responses: list[dict[str, Any]]) -> dict[str, Any] | None:
        for response in responses:
            value = response.get("value")
            if not isinstance(value, dict):
                continue
            latitude = value.get("latitude")
            longitude = value.get("longitude")
            if latitude is None or longitude is None:
                continue
            try:
                parsed_latitude = float(latitude)
                parsed_longitude = float(longitude)
            except (TypeError, ValueError):
                continue
            if not (-90 <= parsed_latitude <= 90 and -180 <= parsed_longitude <= 180):
                continue
            return {
                "latitude": parsed_latitude,
                "longitude": parsed_longitude,
                "altitude": value.get("altitude"),
                "accuracy": value.get("accuracy"),
                "timestamp": value.get("timestamp"),
            }
        return None

    def _form_requires_gps(self, schema_json: dict[str, Any], controls_json: dict[str, Any]) -> bool:
        quality = controls_json.get("quality") if isinstance(controls_json.get("quality"), dict) else {}
        governance = controls_json.get("governance") if isinstance(controls_json.get("governance"), dict) else {}
        if quality.get("gps_required") is True or governance.get("gps_required") is True:
            return True
        for section in schema_json.get("sections", []):
            if not isinstance(section, dict):
                continue
            for field in section.get("fields", []):
                if not isinstance(field, dict):
                    continue
                field_type = str(field.get("type") or "").lower()
                if field_type in {"gps", "geolocation", "map", "geofence"} and bool(field.get("required")):
                    return True
        return False

    async def _create_entity_from_registration(
        self,
        *,
        organization_id: UUID,
        project_id: UUID,
        entity_type: str,
        payload: MobileSubmissionUpload,
    ) -> Beneficiary:
        values = {response.variable_name.lower(): response.value for response in payload.responses}
        phone = self._string_value(values, "phone", "phone_number", "mobile", "farmer_phone")
        national_id = self._string_value(values, "national_id", "id_number")
        household_id = self._string_value(values, "household_id", "household")
        display_name = self._display_name(values)
        duplicate = await self._find_duplicate_entity(
            organization_id=organization_id,
            phone=phone,
            national_id=national_id,
            household_id=household_id,
            display_name=display_name,
            village=self._string_value(values, "village", "community"),
        )
        if duplicate is not None:
            raise ValueError(
                f"Possible duplicate beneficiary found: {duplicate.display_name}. Select the existing record or send the duplicate for review."
            )
        now = datetime.now(UTC)
        prefix = {
            "farmer": "FRM",
            "household": "HH",
            "beneficiary": "BEN",
            "facility": "FAC",
        }.get(entity_type.lower(), "BEN")
        entity = Beneficiary(
            organization_id=organization_id,
            project_id=project_id,
            beneficiary_uid=f"{prefix}-{now.year}-{int(now.timestamp())}",
            beneficiary_type=entity_type,
            display_name=display_name,
            sex=self._string_value(values, "gender", "sex"),
            phone_number=phone,
            region=self._string_value(values, "region"),
            district=self._string_value(values, "district"),
            community=self._string_value(values, "community", "village"),
            enrollment_status="active",
            latitude=(payload.location or {}).get("latitude"),
            longitude=(payload.location or {}).get("longitude"),
            profile_json={
                "source": "Mobile",
                "mobileLocalId": payload.local_id,
                "household_id": household_id,
                "national_id": national_id,
                "raw_responses": values,
            },
        )
        self.session.add(entity)
        await self.session.flush()
        return entity

    def _display_name(self, values: dict[str, Any]) -> str:
        full_name = self._string_value(values, "full_name", "farmer_name", "name", "beneficiary_name")
        if full_name:
            return full_name
        first_name = self._string_value(values, "first_name", "firstname")
        last_name = self._string_value(values, "last_name", "lastname", "surname")
        combined = " ".join(part for part in [first_name, last_name] if part)
        return combined or "Unnamed beneficiary"

    async def _find_duplicate_entity(
        self,
        *,
        organization_id: UUID,
        phone: str | None,
        national_id: str | None,
        household_id: str | None,
        display_name: str,
        village: str | None,
    ) -> Beneficiary | None:
        phone_normalized = self._normalize_phone(phone)
        result = await self.session.execute(
            select(Beneficiary).where(
                Beneficiary.organization_id == organization_id,
                Beneficiary.deleted_at.is_(None),
            )
        )
        for entity in result.scalars():
            if phone_normalized and self._normalize_phone(entity.phone_number) == phone_normalized:
                return entity
            profile = entity.profile_json or {}
            if national_id and str(profile.get("national_id") or "").strip().lower() == national_id.strip().lower():
                return entity
            if household_id and str(profile.get("household_id") or "").strip().lower() == household_id.strip().lower():
                return entity
            same_name = entity.display_name.strip().lower() == display_name.strip().lower()
            same_village = village and str(profile.get("village") or entity.community or "").strip().lower() == village.strip().lower()
            if same_name and same_village:
                return entity
        return None

    def _normalize_phone(self, phone: str | None) -> str | None:
        if not phone:
            return None
        digits = "".join(character for character in phone if character.isdigit())
        return digits[-9:] if len(digits) >= 9 else digits or None

    def _string_value(self, values: dict[str, Any], *keys: str) -> str | None:
        for key in keys:
            value = values.get(key)
            if value is None:
                continue
            text = str(value).strip()
            if text:
                return text
        return None
