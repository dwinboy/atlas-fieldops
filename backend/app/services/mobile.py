from __future__ import annotations

import base64
import binascii
import re
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from shapely.geometry.base import BaseGeometry
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import canonical_role
from app.field_types import field_behavior_tags, mobile_input_mode, mobile_runtime_type
from app.models.administration import PlatformReferenceList, PlatformReferenceValue
from app.models.collection import DataForm, DataFormVersion, FieldOfficerProfile, FieldWorkAssignment, MobileNotification, OfficerAssignment, Project
from app.models.collection import Submission
from app.models.operations import Beneficiary, EntityCategory, EntityRelationship, MediaEvidence, WorkforceProfile
from app.repositories.audit import AuditRepository
from app.repositories.collection import SubmissionRepository
from app.repositories.operations import OperationsRepository
from app.schemas.auth import CurrentPrincipal
from app.schemas.collection import DeviceMetadata, LocationCapture, SubmissionCreate
from app.schemas.mobile import (
    MobileActionAcceptedRead,
    MobileAssignmentRead,
    MobileAssignedCountsRead,
    MobileAttachmentRead,
    MobileAuditEventUpload,
    MobileAuditEventUploadRead,
    MobileBlockedStateRead,
    MobileBootstrapRead,
    MobileDeviceRegistrationCreate,
    MobileDeviceRegistrationRead,
    MobileDeviceRecordRead,
    MobileEntityCategoryRead,
    MobileEntityCategoryAttributeRead,
    MobileEntityRead,
    MobileFormRead,
    MobileFormEntitySettingsRead,
    MobileFormVersionRead,
    MobileLocationRead,
    MobileNotificationRead,
    MobileLinkedRecordRead,
    MobileOfflineRulesRead,
    MobileOfficerProfileRead,
    MobileOrganizationRead,
    MobilePermissionSetRead,
    MobileProjectRead,
    MobileReferenceListRead,
    MobileSubmissionRead,
    MobileSubmissionStatusRead,
    MobileSubmissionUpload,
    MobileUserRead,
    MobileSubmissionUploadRead,
    MobileSyncPackageRead,
    MobileSyncQueueUpload,
    MobileSyncUploadRead,
)
from app.services.collection import CollectionNotFoundError, SubmissionService
from app.services.geometry import find_overlaps, overlap_ratio, polygon_from_geojson, union_geometries

# Newest linked records synced offline per referenced source form (capped per-form so one busy form
# can't crowd another out of the offline index).
LINKED_RECORDS_PER_FORM = 2000

_ATTACHMENT_MEDIA_TYPES = {
    "Photo": "photo",
    "Audio": "audio",
    "Video": "video",
    "Signature": "signature",
    "FileUpload": "file",
}



def _as_dict(value: object) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: object) -> list[Any]:
    return value if isinstance(value, list) else []


def _normalize_submission_frequency(value: object) -> str:
    if not isinstance(value, str):
        return "unlimited"
    normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
    return {
        "once": "once_ever",
        "single": "once_ever",
        "once_ever": "once_ever",
        "per_project": "once_per_project",
        "once_per_project": "once_per_project",
        "yearly": "once_per_year",
        "annual": "once_per_year",
        "once_per_year": "once_per_year",
        "seasonal": "once_per_season",
        "once_per_season": "once_per_season",
        "quarterly": "once_per_quarter",
        "once_per_quarter": "once_per_quarter",
        "monthly": "once_per_month",
        "once_per_month": "once_per_month",
        "per_event": "once_per_event",
        "once_per_event": "once_per_event",
        "unlimited": "unlimited",
    }.get(normalized, "unlimited")
 

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
        value = response.get("value")
        for key in {variable_name, question_id}:
            if key:
                flattened[key] = value
    return flattened


def _assignment_status(is_active: bool) -> str:
    return "Assigned" if is_active else "Paused"


def _review_status(submission_status: str) -> str:
    return {
        "approved": "approved",
        "under_review": "under_review",
        "rejected": "returned",
        "correction_requested": "returned",
    }.get(submission_status, "pending_review")


def _mobile_question_type(value: str) -> str:
    return mobile_runtime_type(value)


def _mobile_selection(field: dict[str, Any], variable_to_id: dict[str, str]) -> dict[str, Any] | None:
    """Compiles the builder's `selection` config into a mobile-ready block, resolving
    cascade/filter `fromVariable` references to the concrete question ids the app uses
    on-device. Returns None for plain static option fields."""
    selection = field.get("selection")
    if not isinstance(selection, dict):
        return None
    source = str(selection.get("source") or "static")
    if source == "static":
        return None

    def resolve(variable: Any) -> str | None:
        if not variable:
            return None
        return variable_to_id.get(str(variable)) or str(variable)

    filters: list[dict[str, Any]] = []
    for raw in selection.get("filters") or []:
        if not isinstance(raw, dict) or not raw.get("column"):
            continue
        filters.append(
            {
                "column": str(raw.get("column")),
                "op": str(raw.get("op") or "eq"),
                "value": raw.get("value"),
                "value2": raw.get("value2"),
                "fromQuestionId": resolve(raw.get("fromVariable")),
            }
        )

    autofill: list[dict[str, Any]] = []
    for raw in selection.get("autofill") or []:
        if not isinstance(raw, dict) or not raw.get("fromColumn") or not raw.get("toVariable"):
            continue
        autofill.append(
            {
                "fromColumn": str(raw.get("fromColumn")),
                "toQuestionId": resolve(raw.get("toVariable")),
                "toVariable": str(raw.get("toVariable")),
                "overwrite": bool(raw.get("overwrite", False)),
            }
        )

    search_columns = [str(column) for column in (selection.get("searchColumns") or []) if column]
    load_columns = [str(column) for column in (selection.get("loadColumns") or []) if column]
    # "Questions to ask" auto-loads each chosen field into the matching question in this form
    # (when one exists with the same variable name) — exactly the merdata behavior.
    mapped = {entry["toVariable"] for entry in autofill}
    for column in load_columns:
        if column in mapped:
            continue
        target_id = variable_to_id.get(column)
        if target_id:
            autofill.append({"fromColumn": column, "toQuestionId": target_id, "toVariable": column, "overwrite": False})
    minimum_age = selection.get("minimumAgeDays")
    return {
        "source": source,
        "datasetId": selection.get("datasetId"),
        "displayColumn": selection.get("displayColumn"),
        "valueColumn": selection.get("valueColumn"),
        "searchColumns": search_columns,
        "recordSource": selection.get("recordSource"),
        "recordFormId": selection.get("recordFormId"),
        "entityType": selection.get("entityType"),
        "allowAddNew": bool(selection.get("allowAddNew", False)),
        "cascadingParentQuestionId": resolve(selection.get("cascadeFromVariable")),
        "filterMatch": "any" if str(selection.get("filterMatch") or "all") == "any" else "all",
        "filters": filters,
        "autofill": autofill,
        "loadColumns": load_columns,
        "allowMultiple": bool(selection.get("allowMultiple", False)),
        # Reuse is allowed unless the builder explicitly turns it off.
        "allowReuse": bool(selection.get("allowReuse", True)),
        "confirmResponses": bool(selection.get("confirmResponses", False)),
        "showOnlyVerified": bool(selection.get("showOnlyVerified", False)),
        "minimumAgeDays": int(minimum_age) if isinstance(minimum_age, (int, float, str)) and str(minimum_age).strip().isdigit() else None,
        "fromQuestionId": resolve(selection.get("fromQuestionVariable")),
    }


def _mobile_input_mode(value: str) -> str | None:
    return mobile_input_mode(value)


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


def _repeat_settings(field: dict[str, Any]) -> dict[str, Any] | None:
    existing = _as_dict(field.get("repeatSettings"))
    repeat = _as_dict(field.get("repeat"))
    # A subform behaves as a repeat group; honor its min/max/count config when no `repeat` is set.
    if not repeat:
        subform = _as_dict(field.get("subform"))
        if subform:
            repeat = {
                "min": subform.get("min"),
                "max": subform.get("max"),
                "countFromVariable": subform.get("countFromVariable"),
            }
    if existing:
        return existing
    if not repeat:
        return None
    return {
        "minRepeats": repeat.get("min"),
        "maxRepeats": repeat.get("max"),
        "addButtonLabel": repeat.get("addButtonLabel"),
        "countFromVariable": repeat.get("countFromVariable"),
    }


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
    typed_mapping = _as_dict(field.get("beneficiary"))
    return {
        "profileImpact": _field_metadata_value(field, "profile-impact") or typed_mapping.get("profileImpact"),
        "beneficiaryField": _field_metadata_value(field, "beneficiary-field") or typed_mapping.get("profileField"),
        "profileUpdateRule": _field_metadata_value(field, "profile-update-rule") or typed_mapping.get("profileUpdateRule"),
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
    validation = _as_dict(field.get("validation"))
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
        if field_type in {"number", "decimal", "currency"} and bool(validation.get("integerOnly")):
            rules.append(
                {
                    "ruleType": "Custom",
                    "value": "integerOnly:true",
                    "message": blocked_help or "Enter a whole number without decimals.",
                    "severity": "Block",
                }
            )
        if field_type in {"number", "decimal", "currency"} and validation.get("decimalPlaces") is not None:
            rules.append(
                {
                    "ruleType": "Custom",
                    "value": f"decimalPlaces:{validation['decimalPlaces']}",
                    "message": blocked_help or f"Use at most {validation['decimalPlaces']} decimal place(s).",
                    "severity": "Block",
                }
            )
        if field_type in {"number", "decimal", "currency"} and validation.get("unit"):
            # Display-only hint (the unit shown next to the input); never blocks submission.
            rules.append({"ruleType": "Custom", "value": f"unit:{validation['unit']}", "message": "", "severity": "Info"})
        if field_type == "slider" and validation.get("step") is not None:
            # Drives the slider's notch size on the app; not a blocking constraint.
            rules.append({"ruleType": "Custom", "value": f"step:{validation['step']}", "message": "", "severity": "Info"})
        if field_type in {"multiselect", "checkbox"}:
            for source, label in (("minSelections", "at least"), ("maxSelections", "at most")):
                if validation.get(source) is not None:
                    rules.append(
                        {
                            "ruleType": "Custom",
                            "value": f"{source}:{validation[source]}",
                            "message": blocked_help or f"Select {label} {validation[source]} option(s).",
                            "severity": "Block",
                        }
                    )
        if field_type in {"select", "dropdown", "radio", "multiselect", "checkbox"} and bool(validation.get("allowOther")):
            rules.append({"ruleType": "Custom", "value": "allowOther:true", "message": "", "severity": "Info"})
        if field_type == "consent" and bool(validation.get("blockIfFalse")):
            rules.append(
                {
                    "ruleType": "Custom",
                    "value": "blockIfFalse:true",
                    "message": str(validation.get("message") or blocked_help or "Consent is required before continuing."),
                    "severity": "Block",
                }
            )
        if field_type in {"photo", "image", "signature", "audio", "video", "file"}:
            for source in ("allowedFileTypes", "maxFileSizeMb", "maxAttachmentCount"):
                if source in validation:
                    rules.append(
                        {
                            "ruleType": "Custom",
                            "value": f"{source}:{validation[source]}",
                            "message": str(validation.get("message") or blocked_help or "Check the allowed attachment rules for this question."),
                            "severity": "Block",
                        }
                    )
        if field_type in {"date", "datetime"}:
            for source in ("blockFutureDates", "blockPastDates", "minDate", "maxDate"):
                if source in validation:
                    rule_value = validation[source]
                    serialized_value = str(rule_value).lower() if isinstance(rule_value, bool) else str(rule_value)
                    rules.append(
                        {
                            "ruleType": "Custom",
                            "value": f"{source}:{serialized_value}",
                            "message": str(validation.get("message") or blocked_help or "Check the allowed date for this question."),
                            "severity": "Block",
                        }
                    )
            if bool(validation.get("defaultToday")):
                rules.append({"ruleType": "Custom", "value": "defaultToday:true", "message": "", "severity": "Info"})
    if field_type == "polygon":
        polygon_config = _as_dict(field.get("polygon"))
        min_vertices = polygon_config.get("minVertices", 3)
        rules.append(
            {
                "ruleType": "Custom",
                "value": f"minVertices:{min_vertices}",
                "message": blocked_help or f"Draw a boundary with at least {min_vertices} points.",
                "severity": "Block",
            }
        )
        if polygon_config.get("requireClosed", True):
            rules.append(
                {
                    "ruleType": "Custom",
                    "value": "requireClosed:true",
                    "message": blocked_help or "The boundary must form a closed shape.",
                    "severity": "Block",
                }
            )
        if polygon_config.get("overlapCheck", True):
            scope = polygon_config.get("overlapScope", "form")
            rules.append(
                {
                    "ruleType": "Custom",
                    "value": f"overlapCheck:true:{scope}",
                    "message": "This boundary will be checked for overlaps with other submissions.",
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


def _parse_logic_condition(clause: str, variable_to_id: dict[str, str]) -> dict[str, Any] | None:
    """Parses one `${variable} OP value` clause into a structured condition, resolving the variable
    to its question id. Returns None when the clause can't be parsed (so it's skipped)."""
    clause = clause.strip()
    if not (clause.startswith("${") and "}" in clause):
        return None
    variable, _, remaining = clause[2:].partition("}")
    source_question_id = variable_to_id.get(variable)
    if not source_question_id:
        return None
    text = remaining.strip()
    lowered = text.lower()
    # Keyword operators are checked first; none contain the " and "/" or " tokens that the
    # multi-condition splitter uses, so they survive intact (e.g. "between 12,49", "is not empty").
    if lowered in {"is empty", "empty"}:
        return {"sourceQuestionId": source_question_id, "operator": "IsEmpty", "value": None}
    if lowered in {"is not empty", "not empty"}:
        return {"sourceQuestionId": source_question_id, "operator": "IsNotEmpty", "value": None}
    operator = "Equals"
    value: str | int | float | bool | None = None
    keyword_ops: list[tuple[str, str]] = [
        ("between ", "Between"),
        ("not contains ", "NotContains"),
        ("contains ", "Contains"),
        ("starts_with ", "StartsWith"),
        ("starts with ", "StartsWith"),
        ("in ", "In"),
    ]
    matched_keyword = next((pair for pair in keyword_ops if lowered.startswith(pair[0])), None)
    if matched_keyword is not None:
        prefix, operator = matched_keyword
        value = text[len(prefix):]
    elif text.startswith("!="):
        operator, value = "NotEquals", text[2:]
    elif text.startswith(">="):
        operator, value = "GreaterOrEqual", text[2:]
    elif text.startswith("<="):
        operator, value = "LessOrEqual", text[2:]
    elif text.startswith("=="):
        value = text[2:]
    elif text.startswith(">"):
        operator, value = "GreaterThan", text[1:]
    elif text.startswith("<"):
        operator, value = "LessThan", text[1:]
    elif text.startswith("="):
        value = text[1:]
    else:
        return None
    return {
        "sourceQuestionId": source_question_id,
        "operator": operator,
        "value": str(value).strip().strip("'\""),
    }


def _compile_logic_conditions(
    expression: str | None, variable_to_id: dict[str, str]
) -> dict[str, Any] | None:
    """Compiles a logic expression into a structured condition the mobile engine evaluates.

    Supports multi-condition expressions joined by "and"/"or" (case-insensitive), e.g.
    "${gender} = 'Female' and ${age} >= 18". A single clause stays a simple condition; multiple
    clauses add `conditions`/`match`. The top-level source/operator/value mirror the first clause for
    backward compatibility. Returns None when nothing parseable is found. Shared by question logic
    rules and section-level relevance so both use identical semantics."""
    text = str(expression or "")
    if not text.strip():
        return None
    match = "all"
    lowered = text.lower()
    if " or " in lowered:
        match = "any"
        clauses = re.split(r"\s+or\s+", text, flags=re.IGNORECASE)
    elif " and " in lowered:
        clauses = re.split(r"\s+and\s+", text, flags=re.IGNORECASE)
    else:
        clauses = [text]
    conditions = [
        condition
        for clause in clauses
        if (condition := _parse_logic_condition(clause, variable_to_id)) is not None
    ]
    if not conditions:
        return None
    first = conditions[0]
    compiled: dict[str, Any] = {
        "sourceQuestionId": first["sourceQuestionId"],
        "operator": first["operator"],
        "value": first["value"],
    }
    if len(conditions) > 1:
        compiled["conditions"] = conditions
        compiled["match"] = match
    return compiled


def _logic_rules(field: dict[str, Any], variable_to_id: dict[str, str]) -> list[dict[str, Any]]:
    rules: list[dict[str, Any]] = []
    for index, rule in enumerate(field.get("logic") or []):
        if not isinstance(rule, dict):
            continue
        compiled = _compile_logic_conditions(rule.get("expression"), variable_to_id)
        if compiled is None:
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
        compiled_rule = {
            "id": str(rule.get("id") or f"{field.get('id')}-logic-{index + 1}"),
            "action": action,
            "sourceQuestionId": compiled["sourceQuestionId"],
            "operator": compiled["operator"],
            "value": compiled["value"],
            "targetQuestionId": rule.get("targetId") or field.get("id"),
        }
        if "conditions" in compiled:
            compiled_rule["conditions"] = compiled["conditions"]
            compiled_rule["match"] = compiled["match"]
        rules.append(compiled_rule)
    calculation = field.get("calculation")
    calculation_expression = (
        calculation.get("expression") if isinstance(calculation, dict) else field.get("calculation")
    )
    if calculation_expression:
        rules.append(
            {
                "id": f"{field.get('id')}-calculation",
                "action": "Calculate",
                "sourceQuestionId": str(field.get("id")),
                "operator": "IsNotEmpty",
                "value": calculation_expression,
                "targetQuestionId": field.get("id"),
            }
        )
    return rules


def _mobile_default_value(
    field: dict[str, Any],
    variable_to_id: dict[str, str] | None = None,
    reference_by_question: dict[str, str] | None = None,
) -> Any:
    field_type = str(field.get("type") or "").lower()
    default_value = field.get("defaultValue")
    if field_type not in {"matrix_single", "matrix_multi", "grid", "repeat_group", "repeatable_group", "subform", "ranking", "lookup"}:
        return default_value

    metadata: dict[str, Any] = default_value if isinstance(default_value, dict) else {}
    if default_value is not None and not isinstance(default_value, dict):
        metadata["value"] = default_value
    if field_type == "lookup":
        lookup_config = _as_dict(field.get("lookup"))
        metadata["lookupSource"] = str(lookup_config.get("source") or "entities")
    if field_type in {"matrix_single", "matrix_multi", "grid"}:
        matrix_config = _as_dict(field.get("matrix"))
        metadata.setdefault("mode", "multi" if field_type == "matrix_multi" else "single")
        metadata.setdefault(
            "rows",
            field.get("rows") or field.get("matrixRows") or field.get("statements") or matrix_config.get("rows") or [],
        )
        metadata.setdefault(
            "columns",
            field.get("columns") or field.get("matrixColumns") or field.get("options") or matrix_config.get("columns") or [],
        )
    if field_type in {"repeat_group", "repeatable_group", "subform"}:
        raw_fields = field.get("fields") or field.get("questions") or field.get("children") or []
        metadata["fields"] = [
            _build_question_field(
                sub_field,
                field_id=str(sub_field.get("id") or f"{field.get('id')}-field-{sub_index + 1}"),
                section_id=str(field.get("id") or ""),
                order=sub_index + 1,
                variable_to_id=variable_to_id,
                reference_by_question=reference_by_question,
            )
            for sub_index, sub_field in enumerate(raw_fields)
            if isinstance(sub_field, dict)
        ]
    if field_type == "ranking":
        metadata.setdefault("options", field.get("options") or [])
    return metadata


def _build_question_field(
    field: dict[str, Any],
    *,
    field_id: str,
    section_id: str,
    order: int,
    variable_to_id: dict[str, str] | None = None,
    reference_by_question: dict[str, str] | None = None,
) -> dict[str, Any]:
    variable_to_id = variable_to_id or {}
    reference_by_question = reference_by_question or {}
    variable_name = str(field.get("variable_name") or field.get("variableName") or field_id.replace("-", "_").lower())
    reference_list_id = (
        field.get("referenceListId")
        or _field_metadata_value(field, "reference-list")
        or reference_by_question.get(field_id)
    )
    cascading_parent = field.get("cascadingParentQuestionId") or variable_to_id.get(
        str(_field_metadata_value(field, "reference-parent") or "")
    )
    # The unified `selection` config (static/dataset/record) is the authoritative source when present.
    # A dataset selection supplies the reference list; either kind may declare a cascade parent.
    selection = _mobile_selection(field, variable_to_id)
    if selection:
        if selection.get("source") == "dataset" and selection.get("datasetId"):
            reference_list_id = selection["datasetId"]
        if selection.get("cascadingParentQuestionId"):
            cascading_parent = selection["cascadingParentQuestionId"]
    privacy_controls = _field_privacy_controls(field)
    raw_type = str(field.get("type") or "text").lower()
    # The type-driven behaviour tags (display-note for `article`, auto-id, counter/slider/measurement/
    # date-range/constant-sum, …) come from the field-type registry so the app can branch without the
    # backend inventing a new runtime type per authoring variant. Validation-driven tags stay inline.
    behavior_tags: list[str] = field_behavior_tags(raw_type)
    if _as_dict(field.get("validation")).get("warnOnly"):
        behavior_tags.append("validation-warn-only")
    read_only = bool(field.get("readOnly", False)) or raw_type in {"article", "auto_id"}
    return {
        "id": field_id,
        "sectionId": section_id,
        "variableName": variable_name,
        "label": str(field.get("label") or field_id),
        "helpText": field.get("hint"),
        "type": _mobile_question_type(raw_type),
        "inputMode": _mobile_input_mode(raw_type),
        "required": bool(field.get("required", False)) and raw_type != "article",
        "readOnly": read_only,
        "defaultValue": _mobile_default_value(field, variable_to_id, reference_by_question),
        "options": _field_options(list(field.get("options") or [])),
        "validationRules": _validation_rules(field),
        "logicRules": _logic_rules(field, variable_to_id),
        "referenceListId": reference_list_id,
        "cascadingParentQuestionId": cascading_parent,
        "selection": selection,
        "sensitive": bool(
            field.get("sensitive", False)
            or privacy_controls["sensitivity"] in {"sensitive", "restricted", "pii"}
        ),
        "repeatSettings": _repeat_settings(field),
        "metadataTags": _field_metadata_tags(field) + behavior_tags,
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
        "translations": field.get("translations") if isinstance(field.get("translations"), dict) else None,
        "order": order,
    }


def _schema_sections(schema_json: dict[str, Any], controls_json: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    controls = controls_json or {}
    reference_bindings = _as_list(controls.get("reference_bindings"))
    reference_by_question: dict[str, str] = {}
    for binding in reference_bindings:
        if not (isinstance(binding, dict) and binding.get("question_id")):
            continue
        reference_slug = _slugify_reference(
            str(binding.get("reference_type") or binding.get("reference_list_name") or "")
        )
        if reference_slug:
            reference_by_question[str(binding.get("question_id"))] = reference_slug
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
            questions.append(
                _build_question_field(
                    field,
                    field_id=field_id,
                    section_id=section_id,
                    order=field_index + 1,
                    variable_to_id=variable_to_id,
                    reference_by_question=reference_by_question,
                )
            )
        sections.append(
            {
                "id": section_id,
                "title": str(section.get("title") or f"Section {section_index + 1}"),
                "description": section.get("description"),
                "order": section_index + 1,
                "questions": questions,
                # Section-level relevance: the whole section shows only when this condition passes.
                "visibleWhen": _compile_logic_conditions(section.get("visibleWhen"), variable_to_id),
            }
        )
    return sections


_OVERLAP_SCOPES = {"form", "project", "organization"}


def _polygon_overlap_configs(schema_json: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Map each Polygon question id to its overlap-detection config.

    Honors the form-builder settings: ``overlapCheck`` (default on) decides whether the
    boundary is compared at all, and ``overlapScope`` (``form``/``project``/``organization``,
    default ``form``) decides how widely we look for conflicting boundaries.
    """
    configs: dict[str, dict[str, Any]] = {}
    for section_index, section in enumerate(schema_json.get("sections", [])):
        section_id = str(section.get("id") or f"section-{section_index + 1}")
        for field_index, field in enumerate(section.get("fields", [])):
            if _mobile_question_type(str(field.get("type") or "")) != "Polygon":
                continue
            field_id = str(field.get("id") or f"{section_id}-question-{field_index + 1}")
            polygon_config = _as_dict(field.get("polygon"))
            if not polygon_config.get("overlapCheck", True):
                continue
            scope = str(polygon_config.get("overlapScope") or "form").lower()
            if scope not in _OVERLAP_SCOPES:
                scope = "form"
            configs[field_id] = {"scope": scope}
    return configs


def _entity_settings(controls_json: dict[str, Any]) -> dict[str, Any]:
    controls = controls_json or {}
    entity_controls = _as_dict(controls.get("entity_controls"))
    instrument = _as_dict(controls.get("instrument"))
    respondent_identity = _as_dict(
        instrument.get("respondent_identity") or controls.get("respondent_identity")
    )
    frequency = _normalize_submission_frequency(entity_controls.get("submission_frequency") or "unlimited")
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
    raw_respondent_identity_mode = str(
        respondent_identity.get("mode")
        or entity_controls.get("respondent_identification")
        or ""
    ).strip()
    respondent_identity_mode = raw_respondent_identity_mode or None
    if respondent_identity_mode not in {
        "existing_beneficiary",
        "new_registration",
        "existing_or_new",
        "anonymous_allowed",
        None,
    }:
        respondent_identity_mode = None
    creates_new_entity = bool(entity_controls.get("creates_new_entity", False))
    updates_existing_entity = bool(entity_controls.get("updates_existing_entity", False))
    requires_existing_entity = bool(entity_controls.get("requires_existing_entity", False))
    linked_to_entity = bool(
        entity_controls.get("linked_to_entity")
        or entity_controls.get("is_entity_linked")
        or entity_controls.get("linkedToEntity")
    )
    if "allows_anonymous" in entity_controls:
        allows_anonymous_submission = bool(entity_controls.get("allows_anonymous"))
    elif "allows_anonymous_submission" in entity_controls:
        allows_anonymous_submission = bool(entity_controls.get("allows_anonymous_submission"))
    else:
        allows_anonymous_submission = not (
            linked_to_entity
            or creates_new_entity
            or updates_existing_entity
            or requires_existing_entity
        )
    if respondent_identity_mode is None:
        if creates_new_entity and updates_existing_entity:
            respondent_identity_mode = "existing_or_new"
        elif creates_new_entity:
            respondent_identity_mode = "new_registration"
        elif requires_existing_entity or updates_existing_entity:
            respondent_identity_mode = "existing_beneficiary"
        elif allows_anonymous_submission or not linked_to_entity:
            respondent_identity_mode = "anonymous_allowed"
    search_required = bool(respondent_identity.get("beneficiary_search_required"))
    if respondent_identity_mode in {"new_registration", "anonymous_allowed"}:
        entity_search_mode = "disabled"
    elif respondent_identity_mode == "existing_or_new":
        entity_search_mode = "required" if search_required else "optional"
    elif respondent_identity_mode == "existing_beneficiary":
        entity_search_mode = "required"
    else:
        entity_search_mode = (
            "required"
            if bool(entity_controls.get("requires_existing_entity", False))
            else "optional"
            if bool(entity_controls.get("prefill_profile", False))
            else "disabled"
        )
    return {
        "linkedToEntity": linked_to_entity,
        "entityType": entity_controls.get("entity_type"),
        "entityCategoryId": str(entity_controls.get("entity_category_id")) if entity_controls.get("entity_category_id") else None,
        "createsNewEntity": creates_new_entity,
        "updatesExistingEntity": updates_existing_entity,
        "requiresExistingEntity": requires_existing_entity,
        "allowsAnonymousSubmission": allows_anonymous_submission,
        "respondentIdentityMode": respondent_identity_mode,
        "entitySearchMode": entity_search_mode,
        "frequencyRule": frequency_map.get(frequency, frequency if frequency in frequency_map.values() else "Unlimited"),
        "prefillMappings": entity_controls.get("prefill_mappings") or [],
        "duplicateMode": duplicate_mode,
        "duplicateThreshold": duplicate_threshold,
        "duplicateAction": duplicate_action,
    }


def _entity_type_prefix(entity_type: str) -> str:
    compact = re.sub(r"[^A-Z0-9]", "", entity_type.upper())
    if len(compact) >= 3:
        return compact[:3]
    return (compact or "ENT").ljust(3, "X")


def _entity_selection_required(entity_settings: dict[str, Any]) -> bool:
    mode = entity_settings.get("respondentIdentityMode")
    if mode == "existing_beneficiary":
        return True
    if mode in {"existing_or_new", "new_registration", "anonymous_allowed"}:
        return False
    if not bool(entity_settings.get("linkedToEntity")):
        return False
    if bool(entity_settings.get("updatesExistingEntity")) and not bool(entity_settings.get("createsNewEntity")):
        return True
    if bool(entity_settings.get("createsNewEntity")):
        return False
    return bool(entity_settings.get("requiresExistingEntity"))


def _normalize_scope_label(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return re.sub(r"\s+", " ", value.strip().lower())


class MobileService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.submissions = SubmissionService(session)
        self.submission_repo = SubmissionRepository(session)
        self.operations_repo = OperationsRepository(session)
        self.audit = AuditRepository(session)

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

    async def _entity_relationship_map(
        self,
        organization_id: UUID,
        entity_ids: set[UUID],
    ) -> dict[UUID, dict[str, list[UUID]]]:
        if not entity_ids:
            return {}
        result = await self.session.execute(
            select(EntityRelationship).where(
                EntityRelationship.organization_id == organization_id,
                EntityRelationship.deleted_at.is_(None),
                (EntityRelationship.parent_beneficiary_id.in_(entity_ids))
                | (EntityRelationship.child_beneficiary_id.in_(entity_ids)),
            )
        )
        relationship_map: dict[UUID, dict[str, list[UUID]]] = {
            entity_id: {"parents": [], "children": []} for entity_id in entity_ids
        }
        for relationship in result.scalars():
            if relationship.child_beneficiary_id in relationship_map:
                relationship_map[relationship.child_beneficiary_id]["parents"].append(
                    relationship.parent_beneficiary_id
                )
            if relationship.parent_beneficiary_id in relationship_map:
                relationship_map[relationship.parent_beneficiary_id]["children"].append(
                    relationship.child_beneficiary_id
                )
        return relationship_map

    async def _field_work_assignment_entity_scope(
        self,
        organization_id: UUID,
        officer_id: UUID,
    ) -> dict[tuple[UUID, UUID | None], set[UUID]]:
        result = await self.session.execute(
            select(FieldWorkAssignment).where(
                FieldWorkAssignment.organization_id == organization_id,
                FieldWorkAssignment.deleted_at.is_(None),
            )
        )
        scopes: dict[tuple[UUID, UUID | None], set[UUID]] = {}
        for record in result.scalars():
            if record.status in {"Cancelled", "Completed"}:
                continue
            if str(officer_id) not in {str(item) for item in record.officer_ids_json}:
                continue
            entity_ids = {
                UUID(str(entity_id))
                for entity_id in record.assigned_entity_ids_json
                if str(entity_id).strip()
            }
            scopes[(record.project_id, record.form_id)] = entity_ids
        return scopes

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
            metadata = value.metadata_json or {}
            # parentCode powers cascading selects on mobile. It lives in metadata_json
            # (keyed `parentCode` or `parent_code`); emit it explicitly so the offline
            # resolver can filter child options by the parent answer. `data` carries the
            # full multi-column row for datasets with display/value/search columns.
            parent_code = metadata.get("parentCode") or metadata.get("parent_code")
            data = metadata.get("data") if isinstance(metadata.get("data"), dict) else None
            values_by_list.setdefault(value.reference_list_id, []).append(
                {
                    "id": str(value.id),
                    "code": value.code,
                    "label": value.label,
                    "description": value.description,
                    "active": value.is_active,
                    "parentCode": str(parent_code) if parent_code not in (None, "") else None,
                    "order": value.sort_order,
                    "sortOrder": value.sort_order,
                    "data": data,
                    "metadata": metadata,
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
            user=MobileUserRead(
                id=principal.user_id,
                email=principal.email,
                full_name=principal.full_name,
                roles=principal.roles,
                permissions=principal.permissions,
            ),
            organization=MobileOrganizationRead(
                id=principal.organization_id,
                name=principal.organization_name,
                slug=principal.organization_slug,
                default_language="English",
                timezone="UTC",
                branding={"logo_url": None, "brand_color": None},
            ),
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
        explicit_entity_scopes = await self._field_work_assignment_entity_scope(organization_id, officer.id)
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
        allowed_entity_ids: set[UUID] = set()
        for assignment in assignments:
            project_forms = forms_by_project.get(assignment.project_id, [])
            selected_form = forms_by_id.get(assignment.form_id) if assignment.form_id else None
            if selected_form is None:
                selected_form = project_forms[0] if project_forms else None
            selected_version = versions_by_form.get(selected_form.id) if selected_form else None
            project_entities = [entity for entity in entities if entity.project_id == assignment.project_id]
            explicit_entity_ids = explicit_entity_scopes.get((assignment.project_id, assignment.form_id))
            scoped_entities = (
                [entity for entity in project_entities if entity.id in explicit_entity_ids]
                if explicit_entity_ids
                else project_entities
            )
            allowed_entity_ids.update(entity.id for entity in scoped_entities)
            assignment_reads.append(
                MobileAssignmentRead(
                    id=str(assignment.id),
                    project_id=str(assignment.project_id),
                    form_id=str(selected_form.id) if selected_form else None,
                    form_version_id=str(selected_version.id) if selected_version else None,
                    entity_ids=[str(entity.id) for entity in scoped_entities],
                    location_ids=[assignment.region] if assignment.region else [],
                    target_count=max(len(scoped_entities), 0),
                    completed_count=completion_counts.get(assignment.id, 0),
                    status=_assignment_status(assignment.is_active),
                    priority="Normal",
                )
            )
        if not assignment_reads:
            allowed_entity_ids.update(entity.id for entity in entities)

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
                entity_settings=MobileFormEntitySettingsRead.model_validate(
                    _entity_settings(next((form.controls_json for form in forms if form.id == version.form_id), {}))
                ),
            )
            for version in versions
        ]
        project_ids = {project.id for project in projects}
        active_categories = await self.operations_repo.list_entity_categories(
            organization_id=organization_id,
            include_archived=False,
        )
        categories_for_projects = [
            category for category in active_categories if category.project_id is None or category.project_id in project_ids
        ]
        category_attributes = await self.operations_repo.list_entity_attributes(
            organization_id=organization_id,
            category_ids={category.id for category in categories_for_projects},
        )
        versions_by_form_id = {version.form_id: version for version in versions}
        relationship_map = await self._entity_relationship_map(
            organization_id,
            {entity.id for entity in entities},
        )
        entity_reads: list[MobileEntityRead] = []
        for entity in entities:
            if allowed_entity_ids and entity.id not in allowed_entity_ids:
                continue
            entity_category_id = self._resolve_entity_category_id(
                entity=entity,
                categories=categories_for_projects,
            )
            hierarchy = relationship_map.get(entity.id, {"parents": [], "children": []})
            entity_reads.append(
                MobileEntityRead(
                    id=str(entity.id),
                    entity_uid=entity.beneficiary_uid,
                    entity_type=entity.beneficiary_type,
                    entity_category_id=entity_category_id,
                    parent_entity_ids=[str(parent_id) for parent_id in hierarchy["parents"]],
                    child_entity_ids=[str(child_id) for child_id in hierarchy["children"]],
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
                    assigned_form_ids=[
                        str(form.id)
                        for form in forms
                        if self._form_targets_entity(
                            form=form,
                            version=versions_by_form_id.get(form.id),
                            entity=entity,
                            entity_category_id=entity_category_id,
                            categories=categories_for_projects,
                        )
                    ],
                    profile=entity.profile_json or {},
                )
            )
        category_reads: list[MobileEntityCategoryRead] = []
        for category in categories_for_projects:
            attributes = category_attributes.get(category.id, [])
            category_reads.append(
                MobileEntityCategoryRead(
                    id=str(category.id),
                    project_id=str(category.project_id) if category.project_id else None,
                    parent_category_id=str(category.parent_category_id) if category.parent_category_id else None,
                    name=category.name,
                    slug=category.slug,
                    sector=category.sector,
                    icon=category.icon,
                    color=category.color,
                    statuses=list(category.statuses_json or []),
                    workflow=dict(category.workflow_json or {}),
                    attributes=[
                        MobileEntityCategoryAttributeRead(
                            id=str(attribute.id),
                            label=attribute.label,
                            field_key=attribute.field_key,
                            field_type=attribute.field_type,
                            description=attribute.description,
                            required=attribute.required,
                            order_index=attribute.order_index,
                            options=list(attribute.options_json or []),
                            validation=dict(attribute.validation_json or {}),
                            default_value=attribute.default_value,
                        )
                        for attribute in attributes
                    ],
                )
            )
        location_reads = self._locations_from_entities(organization_id, projects, entities)
        officer_submissions = await self._officer_submissions(organization_id, officer.id)
        returned_submissions = [
            self._submission_read(submission)
            for submission in officer_submissions
            if submission.status in {"rejected", "correction_requested"}
        ]
        submission_statuses = [self._submission_status_read(submission) for submission in officer_submissions]
        assigned_counts = MobileAssignedCountsRead(
            projects=len(project_reads),
            assignments=len(assignment_reads),
            forms=len(form_reads),
            beneficiaries=len(entity_reads),
            locations=len(location_reads),
            returned_submissions=len(returned_submissions),
            pending_uploads=0,
        )

        notifications = await self._notifications(organization_id, user_id)
        linked_records = await self._linked_records(organization_id, version_reads)
        return MobileSyncPackageRead(
            bootstrap=self._bootstrap(principal, project_reads, officer=officer, assigned_counts=assigned_counts),
            assignments=assignment_reads,
            forms=form_reads,
            form_versions=version_reads,
            entity_categories=category_reads,
            entities=entity_reads,
            locations=location_reads,
            reference_lists=reference_lists,
            returned_submissions=returned_submissions,
            submission_statuses=submission_statuses,
            linked_records=linked_records,
            notifications=notifications,
        )

    async def _linked_records(
        self, organization_id: UUID, version_reads: list[MobileFormVersionRead]
    ) -> list[MobileLinkedRecordRead]:
        """Builds the offline index of records collected by other forms, for any question whose
        selection references another form (record source = form). Each referenced form's submissions
        are exposed as searchable records so field officers can pick them offline."""
        target_form_ids: set[str] = set()
        for version in version_reads:
            for section in version.sections:
                for question in section.get("questions", []):
                    selection = question.get("selection")
                    if (
                        isinstance(selection, dict)
                        and selection.get("source") == "record"
                        and selection.get("recordSource") == "form"
                        and selection.get("recordFormId")
                    ):
                        target_form_ids.add(str(selection["recordFormId"]))
        if not target_form_ids:
            return []

        form_uuids: list[UUID] = []
        for raw in target_form_ids:
            try:
                form_uuids.append(UUID(raw))
            except ValueError:
                continue
        if not form_uuids:
            return []

        # Cap per referenced form (not globally) so a busy form can't starve another form's records
        # out of the offline index — each referenced form contributes its own newest records.
        records: list[MobileLinkedRecordRead] = []
        for form_uuid in form_uuids:
            result = await self.session.execute(
                select(Submission)
                .where(
                    Submission.organization_id == organization_id,
                    Submission.form_id == form_uuid,
                    Submission.deleted_at.is_(None),
                )
                .order_by(Submission.sync_received_at.desc())
                .limit(LINKED_RECORDS_PER_FORM)
            )
            for submission in result.scalars():
                responses = (submission.payload_json or {}).get("_mobile_responses")
                data: dict[str, Any] = {}
                label = ""
                if isinstance(responses, list):
                    for response in responses:
                        if not isinstance(response, dict):
                            continue
                        variable = str(response.get("variableName") or response.get("questionId") or "")
                        value = response.get("value")
                        if variable:
                            data[variable] = value
                        if not label and isinstance(value, str) and value.strip():
                            label = value.strip()
                records.append(
                    MobileLinkedRecordRead(
                        id=submission.client_submission_id,
                        form_id=str(submission.form_id),
                        label=label or submission.client_submission_id,
                        data=data,
                        verified=submission.status in {"approved", "verified", "accepted"},
                        created_at=submission.sync_received_at,
                    )
                )
        return records

    async def returned_submissions(self, principal: CurrentPrincipal) -> list[MobileSubmissionRead]:
        organization_id = UUID(principal.organization_id)
        user_id = UUID(principal.user_id)
        officer = await self._officer_profile(organization_id, user_id)
        if officer is None:
            return []
        submissions = await self._officer_submissions(organization_id, officer.id)
        return [
            self._submission_read(submission)
            for submission in submissions
            if submission.status in {"rejected", "correction_requested"}
        ]

    async def notifications(self, principal: CurrentPrincipal) -> list[MobileNotificationRead]:
        return await self._notifications(UUID(principal.organization_id), UUID(principal.user_id))

    async def mark_notification_read(self, principal: CurrentPrincipal, notification_id: UUID) -> MobileNotificationRead:
        organization_id = UUID(principal.organization_id)
        user_id = UUID(principal.user_id)
        result = await self.session.execute(
            select(MobileNotification).where(
                MobileNotification.organization_id == organization_id,
                MobileNotification.user_id == user_id,
                MobileNotification.id == notification_id,
                MobileNotification.deleted_at.is_(None),
            )
        )
        notification = result.scalar_one_or_none()
        if notification is None:
            raise CollectionNotFoundError("Notification not found")
        if notification.read_at is None:
            notification.read_at = datetime.now(UTC)
            await self.session.flush()
        return self._notification_read(notification)

    async def _notifications(self, organization_id: UUID, user_id: UUID) -> list[MobileNotificationRead]:
        result = await self.session.execute(
            select(MobileNotification)
            .where(
                MobileNotification.organization_id == organization_id,
                MobileNotification.user_id == user_id,
                MobileNotification.deleted_at.is_(None),
            )
            .order_by(MobileNotification.created_by_server_at.desc())
            .limit(100)
        )
        return [self._notification_read(notification) for notification in result.scalars().all()]

    def _notification_read(self, notification: MobileNotification) -> MobileNotificationRead:
        return MobileNotificationRead(
            id=str(notification.id),
            title=notification.title,
            body=notification.body,
            event_type=notification.event_type,
            resource_type=notification.resource_type,
            resource_id=str(notification.resource_id) if notification.resource_id is not None else None,
            read_at=notification.read_at,
            created_by_server_at=notification.created_by_server_at,
        )

    async def _officer_submissions(self, organization_id: UUID, officer_id: UUID, *, limit: int = 200) -> list[Submission]:
        result = await self.session.execute(
            select(Submission)
            .where(
                Submission.organization_id == organization_id,
                Submission.field_officer_id == officer_id,
                Submission.deleted_at.is_(None),
            )
            .order_by(Submission.sync_received_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    def _submission_status_read(self, submission: Submission) -> MobileSubmissionStatusRead:
        return MobileSubmissionStatusRead(
            client_submission_id=submission.client_submission_id,
            status=submission.status,
            review_status=_review_status(submission.status),
            review_comments=submission.review_comments,
            reviewed_at=submission.reviewed_at,
            approved_at=submission.approved_at,
        )

    def _submission_read(self, submission: Submission) -> MobileSubmissionRead:
        responses = (submission.payload_json or {}).get("_mobile_responses")
        return MobileSubmissionRead(
            id=submission.client_submission_id,
            project_id=str(submission.project_id) if submission.project_id else "",
            assignment_id=str(submission.assignment_id) if submission.assignment_id else None,
            form_id=str(submission.form_id),
            form_version_id=str(submission.form_version_id),
            entity_id=str(submission.entity_id) if submission.entity_id else None,
            status="ReturnedForCorrection",
            frequency_period=submission.frequency_period,
            event_id=submission.event_id,
            responses=responses if isinstance(responses, list) else [],
            sync_status="ReturnedForCorrection",
            review_status=_review_status(submission.status),
            review_comments=submission.review_comments,
            reviewed_at=submission.reviewed_at,
            approved_at=submission.approved_at,
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
        if entity_id is None and _entity_selection_required(entity_settings) and not bool(entity_settings.get("allowsAnonymousSubmission")):
            entity_label = await self._entity_type_from_settings(organization_id, entity_settings, payload.entity_type)
            raise ValueError(f"Select an existing {entity_label.lower()} before syncing this submission.")
        if entity_id is None and bool(entity_settings.get("createsNewEntity")):
            entity_type = await self._entity_type_from_settings(organization_id, entity_settings, payload.entity_type)
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
                "_linked_entity_ids": payload.linked_entity_ids,
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
        submission.source_system = "Mobile"
        submission.source_submission_id = payload.local_id
        await self._check_polygon_overlaps(
            organization_id=organization_id,
            submission=submission,
            form_version=form_version,
            response_payload=response_payload,
        )
        for attachment in payload.attachments:
            if not isinstance(attachment, dict):
                continue
            await self._persist_attachment(
                organization_id=organization_id,
                actor_user_id=UUID(principal.user_id),
                submission=submission,
                attachment_id=str(attachment.get("id") or attachment.get("localId") or ""),
                submission_local_id=payload.local_id,
                attachment_type=str(attachment.get("type") or "FileUpload"),
                local_uri=str(attachment.get("localUri") or attachment.get("local_uri") or ""),
                remote_url=attachment.get("remoteUrl") or attachment.get("remote_url"),
                mime_type=str(attachment.get("mimeType") or attachment.get("mime_type") or "application/octet-stream"),
                size=int(attachment.get("size") or 0),
                sync_status=str(attachment.get("syncStatus") or attachment.get("sync_status") or "Synced"),
            )
        return MobileSubmissionUploadRead(
            status="synced",
            server_submission_id=str(submission.id),
            local_id=payload.local_id,
            synced_at=submission.sync_received_at,
            message="Submission synced to the web platform.",
        )

    async def _entity_type_from_settings(
        self,
        organization_id: UUID,
        entity_settings: dict[str, Any],
        fallback: str | None,
    ) -> str:
        category_id = entity_settings.get("entityCategoryId")
        if category_id:
            try:
                result = await self.session.execute(
                    select(EntityCategory.name).where(
                        EntityCategory.organization_id == organization_id,
                        EntityCategory.id == UUID(str(category_id)),
                        EntityCategory.deleted_at.is_(None),
                    )
                )
                category_name = result.scalar_one_or_none()
                if category_name:
                    return str(category_name)
            except (TypeError, ValueError):
                pass
        return str(entity_settings.get("entityType") or fallback or "Entity")

    def _resolve_entity_category_id(
        self,
        *,
        entity: Beneficiary,
        categories: list[EntityCategory],
    ) -> str | None:
        profile = entity.profile_json or {}
        raw_category_id = profile.get("entityCategoryId") or profile.get("entity_category_id")
        if isinstance(raw_category_id, str) and raw_category_id.strip():
            normalized = raw_category_id.strip()
            if any(str(category.id) == normalized for category in categories):
                return normalized

        normalized_type = _normalize_scope_label(entity.beneficiary_type)
        for category in categories:
            if category.project_id not in {None, entity.project_id}:
                continue
            if _normalize_scope_label(category.name) == normalized_type:
                return str(category.id)
        return None

    def _form_targets_entity(
        self,
        *,
        form: DataForm,
        version: DataFormVersion | None,
        entity: Beneficiary,
        entity_category_id: str | None,
        categories: list[EntityCategory],
    ) -> bool:
        if version is None or form.project_id != entity.project_id:
            return False
        settings = _entity_settings(form.controls_json or {})
        if not bool(settings.get("linkedToEntity")):
            return False
        if bool(settings.get("createsNewEntity")) and not bool(settings.get("requiresExistingEntity")) and not bool(
            settings.get("updatesExistingEntity")
        ):
            return False

        form_category_id = settings.get("entityCategoryId")
        if isinstance(form_category_id, str) and form_category_id and entity_category_id:
            return form_category_id == entity_category_id

        entity_type = _normalize_scope_label(entity.beneficiary_type)
        if isinstance(form_category_id, str) and form_category_id:
            category = next((item for item in categories if str(item.id) == form_category_id), None)
            if category is not None:
                return _normalize_scope_label(category.name) == entity_type

        configured_type = _normalize_scope_label(settings.get("entityType"))
        return not configured_type or configured_type == entity_type

    async def upload_attachment(
        self,
        *,
        principal: CurrentPrincipal,
        payload: MobileAttachmentRead,
    ) -> MobileActionAcceptedRead:
        organization_id = UUID(principal.organization_id)
        submission = await self.submission_repo.get_by_client_id(
            organization_id=organization_id,
            client_submission_id=payload.submission_local_id,
        )
        evidence = await self._persist_attachment(
            organization_id=organization_id,
            actor_user_id=UUID(principal.user_id),
            submission=submission,
            attachment_id=payload.id,
            submission_local_id=payload.submission_local_id,
            attachment_type=payload.type,
            local_uri=payload.local_uri,
            remote_url=payload.remote_url,
            mime_type=payload.mime_type,
            size=payload.size,
            sync_status=payload.sync_status,
        )
        message = "Attachment metadata stored."
        # If the device sent the actual file bytes, persist them so the media can be bundled into
        # exports. Without bytes we keep only the reference recorded on the evidence row.
        if payload.content_base64 and submission is not None:
            try:
                raw = base64.b64decode(payload.content_base64, validate=True)
            except (ValueError, binascii.Error):
                raw = b""
            if raw:
                from app.services.storage import StorageService

                await StorageService(self.session).save(
                    organization_id=organization_id,
                    kind="media",
                    file_name=evidence.file_name,
                    media_type=payload.mime_type or "application/octet-stream",
                    content=raw,
                    reference_type="submission",
                    reference_id=str(submission.id),
                )
                message = "Attachment file stored."
        return MobileActionAcceptedRead(message=message, server_id=str(evidence.id))

    async def _persist_attachment(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        submission: Submission | None,
        attachment_id: str,
        submission_local_id: str,
        attachment_type: str,
        local_uri: str,
        remote_url: str | None,
        mime_type: str,
        size: int,
        sync_status: str,
    ) -> MediaEvidence:
        media_type = _ATTACHMENT_MEDIA_TYPES.get(attachment_type, "file")
        file_name = local_uri.rsplit("/", 1)[-1] or f"{media_type}-{attachment_id}"
        evidence = await self.operations_repo.create_media_evidence(
            organization_id=organization_id,
            uploaded_by_user_id=actor_user_id,
            values={
                "submission_id": submission.id if submission else None,
                "beneficiary_id": submission.entity_id if submission else None,
                "form_id": submission.form_id if submission else None,
                "activity_id": None,
                "media_type": media_type,
                "file_name": file_name,
                "storage_url": remote_url or local_uri,
                "mime_type": mime_type,
                "size_bytes": size,
                "review_status": "pending_review",
                "checksum": None,
                "latitude": None,
                "longitude": None,
                "captured_at": None,
                "metadata_json": {
                    "contextType": "Submission",
                    "localAttachmentId": attachment_id,
                    "submissionLocalId": submission_local_id,
                    "syncStatus": sync_status,
                },
            },
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="mobile.attachment_received",
            resource_type="media_evidence",
            resource_id=str(evidence.id),
            metadata={
                "mediaType": media_type,
                "submissionLocalId": submission_local_id,
                "submissionId": str(submission.id) if submission else None,
            },
        )
        return evidence

    async def upload_audit_events(
        self,
        *,
        principal: CurrentPrincipal,
        payload: MobileAuditEventUpload,
    ) -> MobileAuditEventUploadRead:
        organization_id = UUID(principal.organization_id)
        actor_user_id = UUID(principal.user_id)
        for event in payload.events:
            await self.audit.append(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                action=event.event_type[:120],
                resource_type=event.entity_type or "mobile_device",
                resource_id=event.entity_id or event.id,
                metadata={
                    **event.metadata,
                    "module": event.module,
                    "occurredAt": event.occurred_at.isoformat(),
                    "deviceLocalId": event.id,
                },
            )
        return MobileAuditEventUploadRead(accepted=len(payload.events))

    async def upload_sync_queue(
        self,
        *,
        principal: CurrentPrincipal,
        payload: MobileSyncQueueUpload,
    ) -> MobileSyncUploadRead:
        organization_id = UUID(principal.organization_id)
        actor_user_id = UUID(principal.user_id)
        accepted = 0
        failed = 0
        for item in payload.items:
            local_id = str(item.get("id") or item.get("localId") or "")
            if not local_id:
                failed += 1
                continue
            operation = str(item.get("operation") or "UNKNOWN")
            item_payload = item.get("payload")
            await self.audit.append(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                action="mobile.sync_queue_item_received",
                resource_type="sync_queue_item",
                resource_id=local_id,
                metadata={
                    "operation": operation,
                    "payload": item_payload if isinstance(item_payload, dict) else {},
                },
            )
            accepted += 1
        return MobileSyncUploadRead(accepted=accepted, failed=failed)

    def _candidate_boundary_geometry(
        self, candidate: Submission, question_id: str, scope: str
    ) -> BaseGeometry | None:
        """Geometry to compare a target boundary against for one candidate submission.

        For ``form`` scope we match the same question. For ``project``/``organization`` scope the
        candidate may come from a different form (different question ids), so we union all of its
        captured boundaries and compare against the whole footprint.
        """
        responses = (candidate.payload_json or {}).get("_mobile_responses")
        if not isinstance(responses, list):
            return None
        geometries: list[BaseGeometry] = []
        for response in responses:
            if not isinstance(response, dict):
                continue
            if scope == "form" and str(response.get("questionId") or "") != question_id:
                continue
            geometry = polygon_from_geojson(response.get("value"))
            if geometry is None:
                continue
            geometries.append(geometry)
            if scope == "form":
                break
        return union_geometries(geometries)

    async def _check_polygon_overlaps(
        self,
        *,
        organization_id: UUID,
        submission: Submission,
        form_version: DataFormVersion,
        response_payload: list[dict[str, Any]],
    ) -> None:
        overlap_configs = _polygon_overlap_configs(form_version.schema_json or {})
        if not overlap_configs:
            return
        # Only parse boundaries for questions where overlap checking is enabled in the form.
        target_geometries: dict[str, BaseGeometry] = {}
        for response in response_payload:
            question_id = str(response.get("questionId") or "")
            if question_id not in overlap_configs:
                continue
            geometry = polygon_from_geojson(response.get("value"))
            if geometry is not None:
                target_geometries[question_id] = geometry
        if not target_geometries:
            return

        # Boundaries that have been withdrawn or replaced should not be compared against.
        excluded_statuses = ("rejected", "returned", "correction_requested", "draft", "archived")

        candidates_by_scope: dict[str, list[Submission]] = {}

        async def _candidates_for(scope: str) -> list[Submission]:
            if scope in candidates_by_scope:
                return candidates_by_scope[scope]
            stmt = select(Submission).where(
                Submission.organization_id == organization_id,
                Submission.deleted_at.is_(None),
                Submission.id != submission.id,
                Submission.status.notin_(excluded_statuses),
            )
            if scope == "form":
                stmt = stmt.where(Submission.form_id == submission.form_id)
            elif scope == "project":
                # Compare across every form in the same project; fall back to the form when
                # the submission has no project so we never widen beyond what we can scope.
                if submission.project_id is not None:
                    stmt = stmt.where(Submission.project_id == submission.project_id)
                else:
                    stmt = stmt.where(Submission.form_id == submission.form_id)
            # "organization" scope adds no spatial filter — the org bound above is enough.
            # Follow-up surveys re-map the same entity's boundary; never flag a boundary against
            # another submission for the same entity (that would be a false positive).
            if submission.entity_id is not None:
                stmt = stmt.where(
                    or_(Submission.entity_id != submission.entity_id, Submission.entity_id.is_(None))
                )
            rows = list((await self.session.execute(stmt.limit(500))).scalars().all())
            candidates_by_scope[scope] = rows
            return rows

        candidates_by_id: dict[UUID, Submission] = {}
        # Remember the exact geometry each candidate overlapped with, so the reciprocal flag
        # written onto that candidate uses the same shape instead of re-deriving it.
        candidate_geometry_used: dict[tuple[str, UUID], BaseGeometry] = {}
        overlaps_by_question: dict[str, list[dict[str, Any]]] = {}
        for question_id, target_geometry in target_geometries.items():
            scope = overlap_configs[question_id]["scope"]
            candidates = await _candidates_for(scope)
            candidate_geometries: list[tuple[UUID, BaseGeometry]] = []
            for candidate in candidates:
                candidate_geometry = self._candidate_boundary_geometry(candidate, question_id, scope)
                if candidate_geometry is None:
                    continue
                candidates_by_id[candidate.id] = candidate
                candidate_geometry_used[(question_id, candidate.id)] = candidate_geometry
                candidate_geometries.append((candidate.id, candidate_geometry))
            overlaps = find_overlaps(target_geometry, candidate_geometries)
            if overlaps:
                overlaps_by_question[question_id] = overlaps

        if not overlaps_by_question:
            return

        flagged_at = datetime.now(UTC).isoformat()
        submission.payload_json = {
            **(submission.payload_json or {}),
            "_spatial_flags": {
                "polygonOverlaps": [
                    {"questionId": question_id, "overlaps": overlaps}
                    for question_id, overlaps in overlaps_by_question.items()
                ],
                "flaggedAt": flagged_at,
                "status": "pending_review",
            },
        }

        for question_id, overlaps in overlaps_by_question.items():
            target_geometry = target_geometries[question_id]
            for overlap in overlaps:
                target_candidate = candidates_by_id.get(UUID(overlap["submissionId"]))
                if target_candidate is None:
                    continue
                reciprocal_geometry = candidate_geometry_used.get((question_id, target_candidate.id))
                if reciprocal_geometry is None:
                    continue
                reciprocal_ratio = overlap_ratio(reciprocal_geometry, target_geometry)
                existing_flags = (target_candidate.payload_json or {}).get("_spatial_flags")
                existing_overlaps = (
                    existing_flags.get("polygonOverlaps", [])
                    if isinstance(existing_flags, dict) and isinstance(existing_flags.get("polygonOverlaps"), list)
                    else []
                )
                overlaps_by_question_for_candidate = {
                    str(entry.get("questionId")): dict(entry)
                    for entry in existing_overlaps
                    if isinstance(entry, dict)
                }
                question_entry = overlaps_by_question_for_candidate.get(question_id, {"questionId": question_id, "overlaps": []})
                question_overlaps = [
                    item
                    for item in question_entry.get("overlaps", [])
                    if isinstance(item, dict) and item.get("submissionId") != str(submission.id)
                ]
                question_overlaps.append({"submissionId": str(submission.id), "overlapRatio": reciprocal_ratio})
                question_entry["overlaps"] = question_overlaps
                overlaps_by_question_for_candidate[question_id] = question_entry
                target_candidate.payload_json = {
                    **(target_candidate.payload_json or {}),
                    "_spatial_flags": {
                        "polygonOverlaps": list(overlaps_by_question_for_candidate.values()),
                        "flaggedAt": flagged_at,
                        "status": "pending_review",
                    },
                }

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
        quality = _as_dict(controls_json.get("quality"))
        governance = _as_dict(controls_json.get("governance"))
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
        prefix, include_year, separator, width = await self._entity_uid_format_parts(
            organization_id=organization_id,
            entity_type=entity_type,
            project_id=project_id,
        )
        entity = Beneficiary(
            organization_id=organization_id,
            project_id=project_id,
            beneficiary_uid=await self._next_entity_uid(
                organization_id=organization_id,
                include_year=include_year,
                prefix=prefix,
                separator=separator,
                width=width,
            ),
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

    async def _next_entity_uid(
        self,
        *,
        organization_id: UUID,
        include_year: bool,
        prefix: str,
        separator: str,
        width: int,
    ) -> str:
        year = datetime.now(UTC).year
        static_prefix = f"{prefix}{separator}{year}{separator}" if include_year else f"{prefix}{separator}"
        result = await self.session.execute(
            select(Beneficiary.beneficiary_uid).where(
                Beneficiary.organization_id == organization_id,
                Beneficiary.beneficiary_uid.like(f"{static_prefix}%"),
            )
        )
        existing = set(result.scalars())
        existing_numbers = [
            int(match.group(1))
            for uid in existing
            if (match := re.match(rf"^{re.escape(static_prefix)}(\d+)$", uid))
        ]
        next_number = (max(existing_numbers) + 1) if existing_numbers else 1
        while True:
            candidate = f"{static_prefix}{next_number:0{width}d}"
            if candidate not in existing:
                return candidate
            next_number += 1

    async def _entity_uid_format_parts(
        self,
        *,
        organization_id: UUID,
        entity_type: str,
        project_id: UUID,
    ) -> tuple[str, bool, str, int]:
        result = await self.session.execute(
            select(Project.settings_json).where(
                Project.organization_id == organization_id,
                Project.id == project_id,
                Project.deleted_at.is_(None),
            )
        )
        settings_json = result.scalar_one_or_none()
        beneficiary_settings = (
            settings_json.get("beneficiary") if isinstance(settings_json, dict) else None
        )
        code_format = (
            beneficiary_settings.get("codeFormat")
            if isinstance(beneficiary_settings, dict)
            else None
        )
        cleaned = code_format.strip().upper() if isinstance(code_format, str) else ""
        default_prefix = {
            "farmer": "FRM",
            "household": "HH",
            "beneficiary": "BEN",
            "facility": "FAC",
            "school": "SCH",
            "village": "VIL",
            "group": "GRP",
        }.get(entity_type.strip().lower(), _entity_type_prefix(entity_type))
        prefix_match = re.match(r"^([A-Z0-9]{2,12})", cleaned)
        prefix = prefix_match.group(1) if prefix_match else default_prefix
        separator = "/" if "/" in cleaned else "_" if "_" in cleaned else "-"
        width_match = re.search(r"0{3,10}", cleaned)
        width = len(width_match.group(0)) if width_match else 6
        include_year = bool(re.search(r"YYYY|YEAR|20\d{2}", cleaned)) or not cleaned
        return prefix, include_year, separator, width

    def _display_name(self, values: dict[str, Any]) -> str:
        full_name = self._string_value(
            values,
            "full_name",
            "entity_name",
            "farmer_name",
            "name",
            "beneficiary_name",
            "facility_name",
            "school_name",
            "site_name",
            "group_name",
            "organization_name",
            "organisation_name",
            "business_name",
            "asset_name",
            "asset_tag",
            "title",
            "entity_label",
            "label",
        )
        if full_name:
            return full_name
        first_name = self._string_value(values, "first_name", "firstname")
        last_name = self._string_value(values, "last_name", "lastname", "surname")
        combined = " ".join(part for part in [first_name, last_name] if part)
        if combined:
            return combined
        for key, value in values.items():
            normalized = str(key).strip().lower()
            if normalized.endswith(("_name", "_label", "_title")) and value not in (None, ""):
                text = str(value).strip()
                if text:
                    return text
        return "Unnamed beneficiary"

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
