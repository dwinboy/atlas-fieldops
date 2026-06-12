import csv
import math
import re
from difflib import SequenceMatcher
from datetime import UTC, date, datetime
from io import StringIO
from uuid import UUID
from typing import Literal, cast

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import event_publisher
from app.core.permissions import canonical_role
from app.models.collection import FieldOfficerProfile, OfficerAssignment, Project
from app.models.operations import (
    Beneficiary,
    CaseRecord,
    DataQualitySignal,
    DonorReport,
    FieldVisitRequest,
    FieldWorkPlan,
    OperationalTargetRecord,
    InterventionRecord,
    KnowledgeDocument,
    MediaEvidence,
    MonitoringIndicator,
    OperationalAsset,
    OperationalTask,
    OrganizationalUnit,
    ProjectBudgetLine,
    WorkflowDefinition,
)
from app.repositories.audit import AuditRepository
from app.repositories.operations import OperationsRepository
from app.repositories.identity import IdentityRepository, OrganizationUnitRepository, RoleRepository
from app.schemas.operations import (
    BeneficiaryCreate,
    BeneficiaryMergeRead,
    BeneficiaryMergeRequest,
    BeneficiaryRead,
    EntityDuplicateCandidateRead,
    EntityDuplicateCheckRequest,
    EntityPrefillRead,
    MobileSyncPackageRead,
    BulkEditRead,
    BulkEditRequest,
    CaseCreate,
    DataRouteCreate,
    DataRouteRead,
    DataQualitySignalRead,
    DataQualitySignalUpdate,
    DonorReportCreate,
    EntityAttributeRead,
    EntityAttributeCreate,
    EntityCategoryCreate,
    EntityCategoryRead,
    EntityCategoryUpdate,
    ExportJobCreate,
    ExportJobRead,
    FieldWorkPlanCreate,
    FieldWorkPlanRead,
    FieldWorkPlanUpdate,
    OperationalTargetCreate,
    OperationalTargetRead,
    OperationalTargetUpdate,
    FieldVisitCheckIn,
    FieldVisitCheckOut,
    FieldVisitOutcomeReview,
    FieldVisitRequestCreate,
    FieldVisitRequestRead,
    FieldVisitRequestReview,
    ImportAnalysisRequest,
    ImportAnalysisResponse,
    ImportApplyResponse,
    ImportConfirmRequest,
    ImportDateFormatRead,
    ImportDuplicateGroupRead,
    ImportDuplicateRecordRead,
    ImportErrorReportRead,
    ImportGeneratedIdRead,
    ImportJobCreate,
    ImportJobRead,
    ImportMatchSuggestionRead,
    ImportMigrationOverviewRead,
    ImportQualityReportRead,
    ImportRowRead,
    ImportRowUpdate,
    ImportReadinessScoreRead,
    ImportRollbackRead,
    ImportRollbackRequest,
    ImportSupportedSourceRead,
    ImportUploadResponse,
    ImportPreviewRequest,
    ImportPreviewResponse,
    ImportValidationIssue,
    DonorReportIndicatorMetric,
    DonorReportMetrics,
    IndicatorCreate,
    IndicatorUpdate,
    IndicatorDisaggregationRead,
    IndicatorDisaggregationsRead,
    IndicatorLinkedSubmissionRead,
    IndicatorLinkedSubmissionsRead,
    IndicatorRead,
    InterventionCreate,
    InterventionRead,
    KnowledgeDocumentCreate,
    KnowledgeDocumentRead,
    MediaEvidenceCreate,
    MediaEvidenceRead,
    MappingTemplateCreate,
    EcosystemEdge,
    EcosystemNode,
    OperationalActivityReportRead,
    OperationalEcosystemRead,
    OperationalEffect,
    OperationalEventCreate,
    OperationalEventRead,
    OperationalAssetCreate,
    OperationalAssetRead,
    OperationalTaskCreate,
    OperationalTaskRead,
    OrganizationalUnitCreate,
    OrganizationalUnitImportIssue,
    OrganizationalUnitImportResponse,
    OrganizationalUnitRead,
    OperationsSummary,
    ProgramCreate,
    PredefinedEntityCategoryRead,
    ProjectBudgetLineCreate,
    ProjectBudgetLineRead,
    PublicCollectionLinkCreate,
    PublicCollectionLinkRead,
    WorkflowQueueItemRead,
    WorkflowDefinitionCreate,
    WorkflowDefinitionRead,
    ColumnMapping,
)
from app.services.file_imports import parse_uploaded_dataset


def _progress_percent(current_value: float, baseline_value: float, target_value: float) -> float:
    if target_value <= baseline_value:
        return 0
    progress = ((current_value - baseline_value) / (target_value - baseline_value)) * 100
    return round(max(0, min(progress, 100)), 1)


def indicator_progress(indicator: MonitoringIndicator) -> float:
    return _progress_percent(indicator.current_value, indicator.baseline_value, indicator.target_value)


def _parse_formula(formula: str | None) -> tuple[str, str] | None:
    """Parse an indicator formula string into (operation, field_name).

    Supports `sum(field)`, `avg(field)`/`average(field)`, `count(field)`,
    `percent(field)`, or a bare field name (implicit `sum`).
    """
    formula = (formula or "").strip()
    if not formula:
        return None
    match = re.fullmatch(r"(?:(sum|avg|average|count|percent)\(([^)]+)\)|([A-Za-z0-9_.-]+))", formula, flags=re.IGNORECASE)
    if match is None:
        return None
    operation = (match.group(1) or "sum").lower()
    field_name = (match.group(2) or match.group(3) or "").strip()
    if not field_name:
        return None
    return operation, field_name


def _build_report_summary(report: DonorReport, metrics: DonorReportMetrics) -> str:
    parts = [
        f"{metrics.submissions_approved} of {metrics.submissions_total} submissions approved",
        f"{metrics.beneficiaries} beneficiaries recorded",
    ]
    if metrics.indicators:
        on_track = sum(1 for indicator in metrics.indicators if indicator.progress_percent >= 75)
        parts.append(f"{on_track} of {len(metrics.indicators)} indicators at 75%+ of target")
    scope = f"project {report.project_id}" if report.project_id else "the organization"
    return f"Auto-generated summary for {scope}: " + "; ".join(parts) + "."


def _aggregate_values(operation: str, values: list[object]) -> float:
    if operation == "count":
        return float(sum(1 for value in values if value not in (None, "", [], {})))
    if operation == "percent":
        answered = [value for value in values if value not in (None, "", [], {})]
        if not answered:
            return 0.0
        positive = sum(1 for value in answered if str(value).strip().lower() in {"1", "true", "yes", "y", "approved", "complete"})
        return round((positive / len(answered)) * 100, 2)
    numeric = [number for number in (number_value(value) for value in values) if number is not None]
    if not numeric:
        return 0.0
    if operation in {"avg", "average"}:
        return round(sum(numeric) / len(numeric), 2)
    return round(sum(numeric), 2)


FIELD_ALIASES = {
    "beneficiaries": {
        "beneficiary_uid": ["beneficiary id", "beneficiary_id", "id", "household id", "farmer id"],
        "display_name": ["name", "full name", "farmer name", "household name", "beneficiary name"],
        "phone_number": ["phone", "phone number", "mobile", "contact"],
        "latitude": ["latitude", "lat", "gps latitude"],
        "longitude": ["longitude", "lon", "lng", "gps longitude"],
        "region": ["region", "state", "province"],
        "community": ["community", "village", "town"],
    },
    "entity_registry": {
        "beneficiary_uid": ["entity id", "farmer id", "beneficiary id", "household id", "id"],
        "beneficiary_type": ["entity type", "type", "beneficiary type"],
        "display_name": ["name", "full name", "farmer name", "beneficiary name"],
        "phone_number": ["phone", "phone number", "mobile", "contact"],
        "region": ["region", "province", "state"],
        "district": ["district"],
        "community": ["community", "village", "town"],
        "latitude": ["latitude", "lat", "gps latitude"],
        "longitude": ["longitude", "lon", "lng", "gps longitude"],
    },
    "submissions": {
        "client_submission_id": ["submission id", "instance id", "_id", "uuid", "id"],
        "form_id": ["form id", "form", "survey id"],
        "entity_id": ["entity id", "beneficiary id", "farmer id"],
        "captured_at": ["submission date", "submitted at", "date", "start"],
        "latitude": ["latitude", "lat", "gps latitude"],
        "longitude": ["longitude", "lon", "lng", "gps longitude"],
    },
    "form_definitions": {
        "name": ["form name", "survey name", "title"],
        "question_name": ["question name", "name", "variable", "variable name"],
        "question_label": ["label", "question", "question label"],
        "question_type": ["type", "question type", "response type"],
        "required": ["required", "mandatory"],
        "choices": ["choices", "options", "select choices"],
    },
    "indicators": {
        "code": ["code", "indicator code", "kpi code"],
        "name": ["indicator", "indicator name", "kpi", "metric"],
        "baseline_value": ["baseline", "baseline value"],
        "target_value": ["target", "target value"],
        "current_value": ["current", "actual", "reported value"],
    },
    "programs": {
        "name": ["name", "program", "program name", "project", "project name"],
        "slug": ["slug", "code", "program code", "project code"],
        "region": ["region", "area", "location"],
    },
    "projects": {
        "name": ["project", "project name", "program", "program name"],
        "slug": ["project code", "code", "slug", "id"],
        "region": ["region", "country", "location"],
    },
    "locations": {
        "name": ["location", "name", "location name"],
        "code": ["code", "location code", "id"],
        "unit_type": ["type", "level", "location type"],
        "region": ["region", "parent", "country"],
    },
    "boundaries": {
        "name": ["boundary", "name", "location name"],
        "code": ["code", "location code", "id"],
        "geometry": ["geometry", "geojson", "boundary"],
    },
    "baselines": {
        "code": ["indicator code", "code"],
        "baseline_value": ["baseline", "baseline value", "value"],
        "region": ["region", "location"],
    },
    "targets": {
        "code": ["indicator code", "code"],
        "target_value": ["target", "target value", "value"],
        "region": ["region", "location"],
    },
    "users_teams": {
        "name": ["name", "full name", "user", "member"],
        "email": ["email", "email address"],
        "role": ["role", "role name"],
        "team": ["team", "team name"],
    },
    "cases": {
        "case_number": ["case number", "case no", "case id", "id"],
        "case_type": ["case type", "type", "category"],
        "title": ["title", "case title", "summary"],
        "priority": ["priority"],
        "status": ["status"],
        "notes": ["notes", "description"],
    },
    "assets": {
        "asset_code": ["asset code", "asset id", "code", "id"],
        "asset_type": ["asset type", "type", "category"],
        "name": ["name", "asset name", "description"],
        "region": ["region", "location", "area"],
    },
    "organization_units": {
        "name": ["name", "unit name", "office", "team"],
        "code": ["code", "unit code", "id"],
        "unit_type": ["unit type", "type", "level"],
        "region": ["region", "geography", "location"],
    },
}


def normalize_header(value: str) -> str:
    return value.strip().lower().replace("-", " ").replace("_", " ")


def infer_mapping(dataset_type: str, columns: list[str]) -> list[ColumnMapping]:
    aliases = FIELD_ALIASES.get(dataset_type, {})
    mappings: list[ColumnMapping] = []
    for column in columns:
        normalized = normalize_header(column)
        target = next(
            (field for field, candidates in aliases.items() if normalized == field.replace("_", " ") or normalized in candidates),
            normalized.replace(" ", "_"),
        )
        mappings.append(ColumnMapping(source_column=column, target_field=target, required=target in {"beneficiary_uid", "display_name", "code", "name"}))
    return mappings


def validate_sample_rows(dataset_type: str, rows: list[dict[str, object]], mapping: list[ColumnMapping]) -> list[ImportValidationIssue]:
    issues: list[ImportValidationIssue] = []
    seen_ids: set[str] = set()
    target_by_source = {item.source_column: item.target_field for item in mapping}
    required_sources = [item.source_column for item in mapping if item.required]

    for index, row in enumerate(rows, start=1):
        for source in required_sources:
            if row.get(source) in (None, ""):
                issues.append(
                    ImportValidationIssue(
                        row_number=index,
                        field_name=target_by_source[source],
                        issue_type="missing_required",
                        message=f"{source} is required.",
                        suggested_fix="Add a value before importing this row.",
                    )
                )
        mapped = {target_by_source.get(source, source): value for source, value in row.items()}
        record_id = str(mapped.get("beneficiary_uid") or mapped.get("code") or "").strip()
        if record_id:
            if record_id in seen_ids:
                issues.append(
                    ImportValidationIssue(
                        row_number=index,
                        field_name="id",
                        issue_type="duplicate_row",
                        severity="warning",
                        message="This row has the same ID as another uploaded row.",
                        suggested_fix="Merge the duplicate or use a unique ID.",
                    )
                )
            seen_ids.add(record_id)
        for field_name in ("latitude", "longitude"):
            value = mapped.get(field_name)
            if value in (None, ""):
                continue
            try:
                number = float(str(value))
            except ValueError:
                issues.append(
                    ImportValidationIssue(
                        row_number=index,
                        field_name=field_name,
                        issue_type="invalid_coordinate",
                        message=f"{field_name} must be a number.",
                        suggested_fix="Use decimal GPS coordinates.",
                    )
                )
                continue
            if (field_name == "latitude" and not -90 <= number <= 90) or (field_name == "longitude" and not -180 <= number <= 180):
                issues.append(
                    ImportValidationIssue(
                        row_number=index,
                        field_name=field_name,
                        issue_type="invalid_coordinate",
                        message=f"{field_name} is outside the valid GPS range.",
                        suggested_fix="Check the coordinate from the source file.",
                    )
                )
        phone = str(mapped.get("phone_number") or "")
        if dataset_type == "beneficiaries" and phone and len(phone.replace("+", "").replace(" ", "")) < 8:
            issues.append(
                ImportValidationIssue(
                    row_number=index,
                    field_name="phone_number",
                    issue_type="invalid_phone",
                    severity="warning",
                    message="Phone number looks too short.",
                    suggested_fix="Add the country code or correct the number.",
                )
            )
    return issues


KNOWN_LOCATION_NAMES = {
    "north west": "North West Region",
    "northwest": "North West Region",
    "north-west region": "North West Region",
    "mbalmayo": "Mbalmayo District",
    "mbalmayo district": "Mbalmayo District",
    "mezam": "Mezam District",
    "mezam district": "Mezam District",
    "wouri": "Wouri District",
    "wouri district": "Wouri District",
    "bonaberi": "Bonaberi Community",
}


KNOWN_INDICATORS = {
    "farmers trained": "Number of farmers receiving training",
    "improved seed": "% of farmers using improved seeds",
    "households with clean water": "% of households with access to clean water",
    "beneficiaries reached": "Total beneficiaries reached",
}


def simplified_value(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip()).lower()


def name_similarity(left: str, right: str) -> int:
    return int(round(SequenceMatcher(None, simplified_value(left), simplified_value(right)).ratio() * 100))


def mapped_rows(rows: list[dict[str, object]], mapping: list[ColumnMapping]) -> list[dict[str, object]]:
    by_source = {item.source_column: item.target_field for item in mapping}
    return [mapped_row_values(row, by_source) for row in rows]


def row_display_name(row: dict[str, object]) -> str:
    return str(row.get("display_name") or row.get("name") or row.get("full_name") or row.get("farmer_name") or "Unnamed record")


def row_location(row: dict[str, object]) -> str | None:
    value = row.get("community") or row.get("district") or row.get("region") or row.get("village")
    return str(value).strip() if value not in (None, "") else None


def detect_import_duplicate_groups(rows: list[dict[str, object]]) -> list[ImportDuplicateGroupRead]:
    groups: list[ImportDuplicateGroupRead] = []
    used_pairs: set[tuple[int, int]] = set()
    for left_index, left in enumerate(rows, start=1):
        left_phone = normalized_phone(optional_text(left.get("phone_number")))
        left_id = simplified_value(left.get("beneficiary_uid") or left.get("entity_id") or left.get("household_id"))
        left_name = row_display_name(left)
        left_location = row_location(left)
        for right_index, right in enumerate(rows[left_index:], start=left_index + 1):
            pair = (left_index, right_index)
            if pair in used_pairs:
                continue
            right_phone = normalized_phone(optional_text(right.get("phone_number")))
            right_id = simplified_value(right.get("beneficiary_uid") or right.get("entity_id") or right.get("household_id"))
            right_name = row_display_name(right)
            right_location = row_location(right)
            score = 0
            reasons: list[str] = []
            if left_id and right_id and left_id == right_id:
                score += 90
                reasons.append("same legacy or household ID")
            if left_phone and right_phone and left_phone == right_phone:
                score += 80
                reasons.append("same normalized phone number")
            similarity = name_similarity(left_name, right_name)
            if similarity >= 82:
                score += 35
                reasons.append("similar names")
            if left_location and right_location and simplified_value(left_location) == simplified_value(right_location):
                score += 20
                reasons.append("same village or district")
            confidence = min(score, 100)
            if confidence < 60:
                continue
            used_pairs.add(pair)
            groups.append(
                ImportDuplicateGroupRead(
                    group_id=f"duplicate-group-{len(groups) + 1}",
                    confidence=confidence,
                    reason=", ".join(reasons) or "similar beneficiary details",
                    recommended_action="Use existing beneficiary when the same person already exists; otherwise keep separate with a reason.",
                    actions=["Merge now", "Use existing beneficiary", "Keep separate", "Review later"],
                    records=[
                        ImportDuplicateRecordRead(
                            row_number=left_index,
                            display_name=left_name,
                            phone_number=optional_text(left.get("phone_number")),
                            location=left_location,
                            legacy_id=optional_text(left.get("beneficiary_uid") or left.get("entity_id")),
                        ),
                        ImportDuplicateRecordRead(
                            row_number=right_index,
                            display_name=right_name,
                            phone_number=optional_text(right.get("phone_number")),
                            location=right_location,
                            legacy_id=optional_text(right.get("beneficiary_uid") or right.get("entity_id")),
                        ),
                    ],
                )
            )
    return groups


def detect_location_matches(rows: list[dict[str, object]]) -> list[ImportMatchSuggestionRead]:
    seen: dict[str, list[int]] = {}
    for index, row in enumerate(rows, start=1):
        location = row_location(row)
        if not location:
            continue
        seen.setdefault(location, []).append(index)
    matches: list[ImportMatchSuggestionRead] = []
    for source_value, row_numbers in seen.items():
        normalized = simplified_value(source_value).replace("-", " ")
        suggestion = KNOWN_LOCATION_NAMES.get(normalized)
        if suggestion is None:
            suggestion = next((target for key, target in KNOWN_LOCATION_NAMES.items() if name_similarity(normalized, key) >= 80), "Create new platform location")
        confidence = 98 if suggestion != "Create new platform location" else 54
        matches.append(
            ImportMatchSuggestionRead(
                source_value=source_value,
                suggested_value=suggestion,
                confidence=confidence,
                match_type="location",
                row_numbers=row_numbers,
                actions=["Accept match", "Choose different location", "Create new location", "Skip records"],
            )
        )
    return matches


def detect_entity_matches(rows: list[dict[str, object]]) -> list[ImportMatchSuggestionRead]:
    matches: list[ImportMatchSuggestionRead] = []
    if not rows:
        return matches
    for index, row in enumerate(rows, start=1):
        if optional_text(row.get("entity_id") or row.get("beneficiary_uid")):
            continue
        name = row_display_name(row)
        phone = optional_text(row.get("phone_number"))
        location = row_location(row)
        confidence = 91 if phone else 74 if location else 62
        matches.append(
            ImportMatchSuggestionRead(
                source_value=f"Row {index}: {name}",
                suggested_value=f"{name} - existing beneficiary candidate",
                confidence=confidence,
                match_type="entity",
                row_numbers=[index],
                actions=["Link submission", "Create new beneficiary", "Leave unlinked", "Review later"],
            )
        )
    return matches[:6]


def detect_indicator_matches(rows: list[dict[str, object]]) -> list[ImportMatchSuggestionRead]:
    matches: list[ImportMatchSuggestionRead] = []
    for index, row in enumerate(rows, start=1):
        source = optional_text(row.get("name") or row.get("indicator") or row.get("question_label") or row.get("improved_seed"))
        if source is None:
            continue
        normalized = simplified_value(source)
        suggestion = KNOWN_INDICATORS.get(normalized)
        if suggestion is None:
            suggestion = next((target for key, target in KNOWN_INDICATORS.items() if name_similarity(normalized, key) >= 60), None)
        if suggestion is None:
            continue
        matches.append(
            ImportMatchSuggestionRead(
                source_value=source,
                suggested_value=suggestion,
                confidence=95 if KNOWN_INDICATORS.get(normalized) else 78,
                match_type="indicator",
                row_numbers=[index],
                actions=["Accept match", "Choose different indicator", "Create new indicator", "Store as legacy indicator"],
            )
        )
    return matches[:8]


def detect_missing_ids(rows: list[dict[str, object]], dataset_type: str) -> list[ImportGeneratedIdRead]:
    if dataset_type not in {"beneficiaries", "entity_registry", "submissions"}:
        return []
    prefix = "BEN"
    if dataset_type == "entity_registry":
        prefix = "FRM"
    if dataset_type == "submissions":
        prefix = "BEN"
    generated: list[ImportGeneratedIdRead] = []
    for index, row in enumerate(rows, start=1):
        legacy = optional_text(row.get("beneficiary_uid") or row.get("entity_id") or row.get("household_id"))
        if legacy:
            continue
        generated.append(
            ImportGeneratedIdRead(
                row_number=index,
                generated_id=f"{prefix}-2026-{index:06d}",
                entity_type=optional_text(row.get("beneficiary_type")) or "Farmer",
                legacy_id=None,
            )
        )
    return generated


def detect_date_formats(rows: list[dict[str, object]]) -> list[ImportDateFormatRead]:
    candidates = ("date", "captured_at", "submitted_at", "submission_date", "registration_date", "start_date", "end_date")
    detected: list[ImportDateFormatRead] = []
    for field_name in candidates:
        values = [(index, str(row.get(field_name))) for index, row in enumerate(rows, start=1) if row.get(field_name) not in (None, "")]
        if not values:
            continue
        invalid_rows: list[int] = []
        preview: list[str] = []
        detected_format = "YYYY-MM-DD"
        for row_number, value in values[:10]:
            stripped = value.strip()
            if re.fullmatch(r"\d{4}-\d{2}-\d{2}", stripped):
                preview.append(stripped)
                detected_format = "YYYY-MM-DD"
            elif re.fullmatch(r"\d{1,2}/\d{1,2}/\d{2,4}", stripped):
                parts = stripped.split("/")
                year = parts[2] if len(parts[2]) == 4 else f"20{parts[2]}"
                preview.append(f"{year}-{int(parts[1]):02d}-{int(parts[0]):02d}")
                detected_format = "DD/MM/YYYY"
            elif re.fullmatch(r"\d{1,2}-\d{1,2}-\d{4}", stripped):
                parts = stripped.split("-")
                preview.append(f"{parts[2]}-{int(parts[1]):02d}-{int(parts[0]):02d}")
                detected_format = "DD-MM-YYYY"
            else:
                invalid_rows.append(row_number)
        detected.append(ImportDateFormatRead(field_name=field_name, detected_format=detected_format, normalized_preview=preview[:3], invalid_rows=invalid_rows))
    return detected


def detect_gps_warnings(rows: list[dict[str, object]]) -> list[ImportValidationIssue]:
    warnings: list[ImportValidationIssue] = []
    for index, row in enumerate(rows, start=1):
        latitude = row.get("latitude")
        longitude = row.get("longitude")
        if latitude in (None, "") and longitude in (None, ""):
            warnings.append(
                ImportValidationIssue(
                    row_number=index,
                    field_name="gps",
                    issue_type="gps_missing",
                    severity="warning",
                    message="GPS is missing, so this historical record will have lower location precision.",
                    suggested_fix="Import the record and collect GPS in future field visits.",
                )
            )
    return warnings[:20]


def calculate_readiness(
    *,
    total_rows: int,
    issues: list[ImportValidationIssue],
    duplicate_groups: list[ImportDuplicateGroupRead],
    location_matches: list[ImportMatchSuggestionRead],
    mapping: list[ColumnMapping],
    generated_ids: list[ImportGeneratedIdRead],
    gps_warnings: list[ImportValidationIssue],
) -> ImportReadinessScoreRead:
    errors = len([issue for issue in issues if issue.severity == "error"])
    warnings = len([issue for issue in issues if issue.severity != "error"]) + len(gps_warnings)
    unknown_locations = len([item for item in location_matches if item.confidence < 70])
    required_mapped = len([item for item in mapping if item.required and item.source_column])
    score = 100 - (errors * 12) - (warnings * 2) - (len(duplicate_groups) * 6) - (unknown_locations * 7)
    if required_mapped == 0:
        score -= 15
    if generated_ids:
        score -= min(10, len(generated_ids) * 2)
    score = max(0, min(100, score))
    if score >= 90:
        category = "Ready to Import"
        recommended_action = "Confirm mappings, preview records, then import."
    elif score >= 70:
        category = "Needs Review"
        recommended_action = "Review duplicates and low-confidence matches before importing."
    elif score >= 50:
        category = "High Risk"
        recommended_action = "Fix blocking errors and unknown locations before confirming import."
    else:
        category = "Not Ready"
        recommended_action = "Save this draft, correct the source file, and re-run analysis."
    issue_text = [
        f"{len(duplicate_groups)} possible duplicate group(s)",
        f"{unknown_locations} unknown or low-confidence location match(es)",
        f"{errors} blocking validation error(s)",
        f"{warnings} warning(s)",
    ]
    if generated_ids:
        issue_text.append(f"{len(generated_ids)} platform ID(s) will be generated")
    return ImportReadinessScoreRead(
        score=score,
        category=category,
        issues=issue_text,
        recommended_action=recommended_action,
        factors={
            "required_fields_present": 100 if required_mapped else 40,
            "duplicate_rate": round((len(duplicate_groups) / max(total_rows, 1)) * 100, 1),
            "valid_locations": max(0, 100 - (unknown_locations * 20)),
            "valid_gps": max(0, 100 - (len(gps_warnings) * 10)),
            "error_count": errors,
            "warning_count": warnings,
        },
    )


def import_mapping_by_source(job_mapping: dict[str, object]) -> dict[str, str]:
    raw_columns = job_mapping.get("columns", [])
    if not isinstance(raw_columns, list):
        return {}
    mapping: dict[str, str] = {}
    for item in raw_columns:
        if not isinstance(item, dict):
            continue
        source = item.get("source_column")
        target = item.get("target_field")
        if isinstance(source, str) and isinstance(target, str):
            mapping[source] = target
    return mapping


def mapped_row_values(row: dict[str, object], mapping: dict[str, str]) -> dict[str, object]:
    return {mapping.get(source, source): value for source, value in row.items()}


def optional_text(value: object) -> str | None:
    if value in (None, ""):
        return None
    return str(value).strip()


def optional_float(value: object) -> float | None:
    if value in (None, ""):
        return None
    return float(str(value))


def optional_int(value: object) -> int | None:
    if value in (None, ""):
        return None
    return int(float(str(value)))


def normalized_text(value: str | None) -> str:
    return (value or "").strip().lower()


def category_slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "entity-category"


def normalized_phone(value: str | None) -> str:
    return "".join(character for character in (value or "") if character.isdigit())


def submission_values(payload: dict[str, object]) -> dict[str, object]:
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


def number_value(value: object) -> float | None:
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    try:
        return float(str(value).replace(",", "").strip())
    except ValueError:
        return None


def beneficiary_values_from_import_row(row: dict[str, object]) -> dict[str, object] | None:
    beneficiary_uid = optional_text(row.get("beneficiary_uid"))
    display_name = optional_text(row.get("display_name"))
    if beneficiary_uid is None or display_name is None:
        return None
    profile_json = {
        "imported_fields": {
            key: value
            for key, value in row.items()
            if key
            not in {
                "beneficiary_uid",
                "display_name",
                "beneficiary_type",
                "project_id",
                "sex",
                "birth_year",
                "phone_number",
                "region",
                "district",
                "community",
                "vulnerability_score",
                "latitude",
                "longitude",
            }
        }
    }
    return {
        "beneficiary_uid": beneficiary_uid,
        "display_name": display_name,
        "beneficiary_type": optional_text(row.get("beneficiary_type")) or "household",
        "sex": optional_text(row.get("sex")),
        "birth_year": optional_int(row.get("birth_year")),
        "phone_number": optional_text(row.get("phone_number")),
        "region": optional_text(row.get("region")),
        "district": optional_text(row.get("district")),
        "community": optional_text(row.get("community")),
        "vulnerability_score": optional_int(row.get("vulnerability_score")) or 0,
        "latitude": optional_float(row.get("latitude")),
        "longitude": optional_float(row.get("longitude")),
        "profile_json": profile_json,
    }


def program_values_from_import_row(row: dict[str, object]) -> dict[str, object] | None:
    name = optional_text(row.get("name"))
    slug = optional_text(row.get("slug"))
    if name is None:
        return None
    if slug is None:
        slug = name.lower().replace(" ", "-")[:120]
    return {"name": name, "slug": slug, "region": optional_text(row.get("region"))}


def indicator_values_from_import_row(row: dict[str, object]) -> dict[str, object] | None:
    code = optional_text(row.get("code"))
    name = optional_text(row.get("name"))
    if code is None or name is None:
        return None
    return {
        "code": code.upper(),
        "name": name,
        "description": optional_text(row.get("description")),
        "unit": optional_text(row.get("unit")) or "count",
        "reporting_frequency": optional_text(row.get("reporting_frequency")) or "monthly",
        "baseline_value": optional_float(row.get("baseline_value")) or 0,
        "target_value": optional_float(row.get("target_value")) or 0,
        "current_value": optional_float(row.get("current_value")) or 0,
        "sdg_code": optional_text(row.get("sdg_code")),
        "formula": optional_text(row.get("formula")),
    }


def case_values_from_import_row(row: dict[str, object]) -> dict[str, object] | None:
    case_number = optional_text(row.get("case_number"))
    title = optional_text(row.get("title"))
    if case_number is None or title is None:
        return None
    return {
        "case_number": case_number,
        "case_type": optional_text(row.get("case_type")) or "general",
        "title": title,
        "priority": optional_text(row.get("priority")) or "normal",
        "status": optional_text(row.get("status")) or "open",
        "notes": optional_text(row.get("notes")),
    }


def asset_values_from_import_row(row: dict[str, object]) -> dict[str, object] | None:
    asset_code = optional_text(row.get("asset_code"))
    name = optional_text(row.get("name"))
    if asset_code is None or name is None:
        return None
    return {
        "asset_code": asset_code,
        "asset_type": optional_text(row.get("asset_type")) or "equipment",
        "name": name,
        "region": optional_text(row.get("region")),
        "metadata_json": {
            "imported_fields": {
                key: value
                for key, value in row.items()
                if key not in {"asset_code", "asset_type", "name", "region"}
            }
        },
    }


def organization_unit_values_from_import_row(row: dict[str, object]) -> dict[str, object] | None:
    name = optional_text(row.get("name"))
    code = optional_text(row.get("code"))
    unit_type = optional_text(row.get("unit_type"))
    if name is None or code is None or unit_type is None:
        return None
    return {
        "name": name,
        "code": code.lower(),
        "unit_type": unit_type,
        "region": optional_text(row.get("region")),
        "metadata_json": {},
    }


def supported_import_sources() -> list[ImportSupportedSourceRead]:
    return [
        ImportSupportedSourceRead(
            id="upload_file",
            label="Upload File",
            phase="Phase 1",
            supported_formats=["CSV", "Excel", "JSON", "XLSForm", "GeoJSON", "KML"],
            status="available",
            description="Upload an export from KoboToolbox, ODK, SurveyCTO, Excel, Google Forms, or a custom database.",
        ),
        ImportSupportedSourceRead(
            id="kobotoolbox",
            label="KoboToolbox",
            phase="Phase 2",
            supported_formats=["API", "XLSForm", "CSV"],
            status="connector-ready",
            description="Connector placeholder for pulling forms and submissions directly from KoboToolbox.",
        ),
        ImportSupportedSourceRead(
            id="odk_central",
            label="ODK Central",
            phase="Phase 2",
            supported_formats=["API", "XLSForm", "CSV"],
            status="connector-ready",
            description="Connector placeholder for ODK projects, forms, and historical submissions.",
        ),
        ImportSupportedSourceRead(
            id="surveycto",
            label="SurveyCTO",
            phase="Phase 2",
            supported_formats=["API", "XLSForm", "CSV"],
            status="connector-ready",
            description="Connector placeholder for SurveyCTO form definitions and case data.",
        ),
        ImportSupportedSourceRead(
            id="dhis2",
            label="DHIS2",
            phase="Phase 2",
            supported_formats=["API", "CSV", "JSON"],
            status="connector-ready",
            description="Connector placeholder for DHIS2 organization units, indicators, and event data.",
        ),
        ImportSupportedSourceRead(
            id="google_sheets",
            label="Google Sheets",
            phase="Phase 2",
            supported_formats=["API", "CSV"],
            status="connector-ready",
            description="Connector placeholder for recurring spreadsheet imports.",
        ),
    ]


def mark_record_as_imported(record: object, *, job: object, user_id: UUID, row_number: int) -> None:
    now = datetime.now(UTC)
    setattr(record, "is_imported", True)
    setattr(record, "source_system", getattr(job, "source_system", None) or getattr(job, "source_name", "Imported File"))
    setattr(record, "source_record_id", f"{getattr(job, 'id')}:{row_number}")
    if hasattr(record, "source_project_id") and getattr(job, "target_project_id", None):
        setattr(record, "source_project_id", str(getattr(job, "target_project_id")))
    setattr(record, "import_batch_id", getattr(job, "id"))
    setattr(record, "imported_at", now)
    setattr(record, "imported_by_user_id", user_id)


def preset_attribute(label: str, field_key: str, field_type: str = "text", required: bool = False) -> EntityAttributeCreate:
    return EntityAttributeCreate(label=label, field_key=field_key, field_type=field_type, required=required)


PREDEFINED_ENTITY_CATEGORIES: list[PredefinedEntityCategoryRead] = [
    PredefinedEntityCategoryRead(
        sector=sector,
        name=name,
        slug=category_slug(name),
        description=description,
        icon=icon,
        color=color,
        attributes=attributes,
    )
    for sector, icon, color, names, description, attributes in [
        ("education", "school", "#2563eb", ["Schools", "Students", "Teachers", "Classrooms", "School Clubs", "Parent Teacher Associations", "Education Districts"], "Education entity category for school and learner monitoring.", [preset_attribute("Name", "name", required=True), preset_attribute("District", "district"), preset_attribute("GPS Coordinates", "gps_coordinates", "gps")]),
        ("health", "hospital", "#dc2626", ["Health Facilities", "Patients", "Community Health Workers", "Pregnant Women", "Children Under Five", "Vaccination Sites", "Pharmacies"], "Health service entity category for facilities, clients, and service points.", [preset_attribute("Name", "name", required=True), preset_attribute("Facility Type", "facility_type", "dropdown"), preset_attribute("Phone Number", "phone_number", "phone")]),
        ("agriculture", "sprout", "#0f8a4b", ["Farmers", "Farmer Groups", "Cooperatives", "Farms", "Crops", "Livestock", "Input Suppliers", "Aggregation Centers"], "Agriculture entity category for farmers, farms, crops, and market actors.", [preset_attribute("Name", "name", required=True), preset_attribute("Farm Size", "farm_size", "number"), preset_attribute("Crop Type", "crop_type", "dropdown")]),
        ("wash", "droplets", "#0891b2", ["Water Points", "Boreholes", "Toilets", "Households", "Communities", "Hygiene Clubs", "Waste Collection Points"], "WASH entity category for water, sanitation, and community infrastructure.", [preset_attribute("Name", "name", required=True), preset_attribute("Status", "status", "dropdown"), preset_attribute("GPS Coordinates", "gps_coordinates", "gps")]),
        ("nutrition", "heart-pulse", "#ea580c", ["Children Under Five", "Mothers", "Households", "Feeding Centers", "Nutrition Sites", "Health Workers"], "Nutrition entity category for clients, sites, and service workers.", [preset_attribute("Name", "name", required=True), preset_attribute("Age", "age", "number"), preset_attribute("Nutrition Status", "nutrition_status", "dropdown")]),
        ("livelihoods", "briefcase", "#7c3aed", ["Beneficiaries", "Businesses", "Savings Groups", "Vocational Trainees", "Employers", "Markets", "Cooperatives"], "Livelihoods entity category for economic inclusion programs.", [preset_attribute("Name", "name", required=True), preset_attribute("Business Type", "business_type", "dropdown"), preset_attribute("Phone Number", "phone_number", "phone")]),
        ("protection", "shield", "#be123c", ["Case Records", "Vulnerable Children", "Households", "Service Providers", "Referral Points", "Safe Spaces"], "Protection entity category for case, referral, and service tracking.", [preset_attribute("Case Code", "case_code", required=True), preset_attribute("Risk Level", "risk_level", "dropdown"), preset_attribute("Referral Status", "referral_status", "dropdown")]),
        ("gender-gbv", "shield-check", "#db2777", ["Women's Groups", "Safe Spaces", "GBV Cases", "Service Providers", "Community Activists", "Referral Pathways"], "Gender and GBV category with sensitive data controls.", [preset_attribute("Name or Code", "name_or_code", required=True), preset_attribute("Service Type", "service_type", "dropdown"), preset_attribute("Confidentiality Level", "confidentiality_level", "dropdown")]),
        ("emergency-response", "tent", "#f97316", ["Affected Households", "Refugees", "Internally Displaced Persons", "Camps", "Shelters", "Distribution Points", "Assessment Sites"], "Emergency response category for affected populations and service points.", [preset_attribute("Name or Code", "name_or_code", required=True), preset_attribute("Population Count", "population_count", "number"), preset_attribute("Location", "location", "gps")]),
        ("food-security", "wheat", "#ca8a04", ["Households", "Farmers", "Markets", "Vendors", "Storage Facilities"], "Food security category for markets, households, and supply actors.", [preset_attribute("Name", "name", required=True), preset_attribute("Food Security Status", "food_security_status", "dropdown"), preset_attribute("Market Type", "market_type", "dropdown")]),
        ("environment-climate", "leaf", "#16a34a", ["Forest Areas", "Communities", "Protected Areas", "Tree Nurseries", "Climate Risk Zones", "Water Bodies"], "Environment and climate category for natural assets and risk zones.", [preset_attribute("Name", "name", required=True), preset_attribute("Area Size", "area_size", "number"), preset_attribute("GPS Boundary", "gps_boundary", "gps")]),
        ("infrastructure", "construction", "#475569", ["Roads", "Bridges", "Buildings", "Construction Sites", "Contractors", "Assets"], "Infrastructure category for works, assets, and contractors.", [preset_attribute("Asset Name", "asset_name", required=True), preset_attribute("Condition", "condition", "dropdown"), preset_attribute("GPS Coordinates", "gps_coordinates", "gps")]),
        ("governance", "landmark", "#4f46e5", ["Local Councils", "Community Committees", "Public Institutions", "Citizens", "Civil Society Organizations"], "Governance category for institutions and civic actors.", [preset_attribute("Name", "name", required=True), preset_attribute("Institution Type", "institution_type", "dropdown"), preset_attribute("Contact Person", "contact_person")]),
        ("economic-development", "chart-line", "#0d9488", ["SMEs", "Entrepreneurs", "Cooperatives", "Markets", "Financial Institutions"], "Economic development category for businesses and financial actors.", [preset_attribute("Name", "name", required=True), preset_attribute("Sector", "sector", "dropdown"), preset_attribute("Revenue", "revenue", "currency")]),
        ("youth-development", "graduation-cap", "#9333ea", ["Youth Beneficiaries", "Training Centers", "Trainers", "Employers", "Apprenticeship Sites", "Youth Groups"], "Youth development category for trainees, trainers, and placement sites.", [preset_attribute("Name", "name", required=True), preset_attribute("Age", "age", "number"), preset_attribute("Training Cohort", "training_cohort")]),
        ("disability-inclusion", "accessibility", "#0369a1", ["Persons with Disabilities", "Households", "Schools", "Health Facilities", "Service Providers"], "Disability inclusion category for people, providers, and inclusive services.", [preset_attribute("Name", "name", required=True), preset_attribute("Disability Type", "disability_type", "dropdown"), preset_attribute("Assistive Need", "assistive_need", "dropdown")]),
        ("peacebuilding", "handshake", "#65a30d", ["Community Groups", "Conflict Incidents", "Mediation Committees", "Dialogue Sessions", "Youth Groups"], "Peacebuilding category for incidents, groups, and dialogue processes.", [preset_attribute("Name or Incident Code", "name_or_incident_code", required=True), preset_attribute("Conflict Type", "conflict_type", "dropdown"), preset_attribute("Resolution Status", "resolution_status", "dropdown")]),
        ("donor-grant-management", "file-contract", "#64748b", ["Partners", "Grantees", "Sub-Grantees", "Projects", "Contracts", "Funding Windows"], "Donor and grant category for partners, grants, and funding instruments.", [preset_attribute("Name", "name", required=True), preset_attribute("Agreement Number", "agreement_number"), preset_attribute("Budget", "budget", "currency")]),
        ("universal", "layers", "#0f8a4b", ["Beneficiaries", "Households", "Communities", "Facilities", "Institutions", "Groups", "Service Providers", "Assets", "Locations", "Activities", "Cases", "Partners"], "Universal entity category available to all programs.", [preset_attribute("Name", "name", required=True), preset_attribute("Status", "status", "dropdown"), preset_attribute("Location", "location")]),
    ]
    for name in names
]


class OperationsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.audit = AuditRepository(session)
        self.repository = OperationsRepository(session)
        self.identity = IdentityRepository(session)
        self.roles = RoleRepository(session)
        self.units = OrganizationUnitRepository(session)

    def predefined_entity_categories(self, sector: str | None = None) -> list[PredefinedEntityCategoryRead]:
        if not sector:
            return PREDEFINED_ENTITY_CATEGORIES
        normalized = category_slug(sector)
        return [category for category in PREDEFINED_ENTITY_CATEGORIES if category.sector == normalized]

    async def list_entity_categories(
        self,
        organization_id: UUID,
        *,
        project_id: UUID | None = None,
        include_archived: bool = False,
    ) -> list[EntityCategoryRead]:
        categories = await self.repository.list_entity_categories(
            organization_id=organization_id,
            project_id=project_id,
            include_archived=include_archived,
        )
        attributes = await self.repository.list_entity_attributes(
            organization_id=organization_id,
            category_ids={category.id for category in categories},
        )
        return [
            EntityCategoryRead.model_validate(category).model_copy(
                update={"attributes": [EntityAttributeRead.model_validate(attribute) for attribute in attributes.get(category.id, [])]}
            )
            for category in categories
        ]

    async def create_entity_category(
        self,
        organization_id: UUID,
        actor_user_id: UUID,
        payload: EntityCategoryCreate,
    ) -> EntityCategoryRead:
        if payload.project_id and not await self.repository.project_exists(organization_id=organization_id, project_id=payload.project_id):
            raise ValueError("Project not found")
        values = payload.model_dump(exclude={"attributes"})
        values["slug"] = payload.slug or category_slug(payload.name)
        category = await self.repository.create_entity_category(
            organization_id=organization_id,
            values=values,
            attributes=[attribute.model_dump() for attribute in payload.attributes],
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="entity_category.created",
            resource_type="entity_category",
            resource_id=str(category.id),
            metadata={"name": category.name, "project_id": str(category.project_id) if category.project_id else None},
        )
        await self.session.flush()
        categories = await self.list_entity_categories(organization_id, project_id=category.project_id, include_archived=True)
        return next(item for item in categories if item.id == category.id)

    async def update_entity_category(
        self,
        organization_id: UUID,
        actor_user_id: UUID,
        category_id: UUID,
        payload: EntityCategoryUpdate,
    ) -> EntityCategoryRead:
        category = await self.repository.get_entity_category(organization_id=organization_id, category_id=category_id)
        if category is None:
            raise ValueError("Entity category not found")
        values = payload.model_dump(exclude_unset=True, exclude={"attributes"})
        category = await self.repository.update_entity_category(
            organization_id=organization_id,
            category=category,
            values=values,
            attributes=[attribute.model_dump() for attribute in payload.attributes] if payload.attributes is not None else None,
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="entity_category.updated",
            resource_type="entity_category",
            resource_id=str(category.id),
            metadata={"status": category.status, "name": category.name},
        )
        await self.session.flush()
        categories = await self.list_entity_categories(organization_id, project_id=category.project_id, include_archived=True)
        return next(item for item in categories if item.id == category.id)

    async def activate_predefined_entity_category(
        self,
        organization_id: UUID,
        actor_user_id: UUID,
        project_id: UUID,
        slug: str,
    ) -> EntityCategoryRead:
        preset = next((category for category in PREDEFINED_ENTITY_CATEGORIES if category.slug == slug), None)
        if preset is None:
            raise ValueError("Predefined entity category not found")
        return await self.create_entity_category(
            organization_id,
            actor_user_id,
            EntityCategoryCreate(
                name=preset.name,
                slug=preset.slug,
                project_id=project_id,
                sector=preset.sector,
                description=preset.description,
                icon=preset.icon,
                color=preset.color,
                is_predefined=True,
                attributes=preset.attributes,
            ),
        )

    async def create_program(self, organization_id: UUID, payload: ProgramCreate, actor_user_id: UUID | None = None) -> Project:
        program = await self.repository.create_program(
            organization_id=organization_id,
            name=payload.name,
            slug=payload.slug,
            region=payload.region,
        )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            payload=OperationalEventCreate(
                event_type="program.created",
                source_module="programs",
                project_id=program.id,
                summary=f"Program {program.name} is now connected to forms, beneficiaries, indicators, geography, and reports.",
                payload={"program_slug": program.slug, "region": program.region or "all regions"},
            ),
        )
        await self.session.commit()
        await event_publisher.publish("program.created", {"organization_id": str(organization_id), "program_id": str(program.id)})
        return program

    async def list_programs(self, organization_id: UUID) -> list[Project]:
        return await self.repository.list_programs(organization_id)

    async def _field_officer_for_user(self, organization_id: UUID, user_id: UUID) -> FieldOfficerProfile | None:
        result = await self.session.execute(
            select(FieldOfficerProfile).where(
                FieldOfficerProfile.organization_id == organization_id,
                FieldOfficerProfile.user_id == user_id,
                FieldOfficerProfile.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def _operational_activity_scope_filters(
        self,
        organization_id: UUID,
        *,
        actor_user_id: UUID | None,
        actor_roles: list[str] | None,
        actor_project_ids: list[str] | None,
    ) -> list[object]:
        if actor_user_id is None or actor_roles is None:
            return []
        roles = {canonical_role(role) for role in actor_roles}
        if roles & {"super_admin", "owner", "organization_owner", "system_admin", "national_admin", "regional_manager"}:
            return []
        project_ids: list[UUID] = []
        for project_id in actor_project_ids or []:
            try:
                project_ids.append(UUID(str(project_id)))
            except ValueError:
                continue
        if roles & {"me_manager", "project_manager", "data_manager", "data_analyst", "donor_viewer"} and project_ids:
            return [FieldVisitRequest.project_id.in_(project_ids)]
        clauses: list[object] = []
        if project_ids:
            clauses.append(FieldVisitRequest.project_id.in_(project_ids))
        if "district_supervisor" in roles:
            clauses.append(FieldVisitRequest.supervisor_user_id == actor_user_id)
        officer = await self._field_officer_for_user(organization_id, actor_user_id)
        if officer is not None:
            clauses.append(FieldVisitRequest.field_officer_id == officer.id)
        if clauses:
            return [or_(*clauses)]
        return [FieldVisitRequest.id.is_(None)]

    async def _assert_operational_activity_access(
        self,
        organization_id: UUID,
        visit: FieldVisitRequest,
        *,
        actor_user_id: UUID | None,
        actor_roles: list[str] | None,
        actor_project_ids: list[str] | None,
    ) -> None:
        filters = await self._operational_activity_scope_filters(
            organization_id,
            actor_user_id=actor_user_id,
            actor_roles=actor_roles,
            actor_project_ids=actor_project_ids,
        )
        if not filters:
            return
        result = await self.session.execute(
            select(FieldVisitRequest.id).where(
                FieldVisitRequest.id == visit.id,
                FieldVisitRequest.organization_id == organization_id,
                FieldVisitRequest.deleted_at.is_(None),
                *filters,
            )
        )
        if result.scalar_one_or_none() is None:
            raise ValueError("Operational activity is outside your assigned scope.")

    def _read_visit_request(self, visit: FieldVisitRequest) -> FieldVisitRequestRead:
        return FieldVisitRequestRead(
            id=visit.id,
            organization_id=visit.organization_id,
            project_id=visit.project_id,
            beneficiary_id=visit.beneficiary_id,
            field_officer_id=visit.field_officer_id,
            supervisor_user_id=visit.supervisor_user_id,
            title=visit.title,
            activity_type=visit.activity_type,
            activity_scope=visit.activity_scope,
            requires_approval=visit.requires_approval,
            purpose=visit.purpose,
            location_name=visit.location_name,
            latitude=visit.latitude,
            longitude=visit.longitude,
            requested_start_at=visit.requested_start_at,
            requested_end_at=visit.requested_end_at,
            priority=visit.priority,
            status=visit.status,
            required_form_ids=[UUID(str(form_id)) for form_id in (visit.required_form_ids_json or [])],
            planned_activities=[str(activity) for activity in (visit.planned_activities_json or [])],
            supervisor_instructions=visit.supervisor_instructions,
            reviewed_by_user_id=visit.reviewed_by_user_id,
            reviewed_at=visit.reviewed_at,
            check_in_at=visit.check_in_at,
            check_in_latitude=visit.check_in_latitude,
            check_in_longitude=visit.check_in_longitude,
            check_in_accuracy=visit.check_in_accuracy,
            check_in_note=visit.check_in_note,
            check_out_at=visit.check_out_at,
            check_out_latitude=visit.check_out_latitude,
            check_out_longitude=visit.check_out_longitude,
            check_out_accuracy=visit.check_out_accuracy,
            check_out_summary=visit.check_out_summary,
            verification_status=visit.verification_status,
            distance_from_planned_meters=visit.distance_from_planned_meters,
            metadata_json=visit.metadata_json or {},
            created_at=visit.created_at,
            updated_at=visit.updated_at,
        )

    @staticmethod
    def _distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        radius_meters = 6_371_000
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        return round(radius_meters * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 1)

    async def create_field_visit_request(
        self,
        organization_id: UUID,
        actor_user_id: UUID,
        payload: FieldVisitRequestCreate,
    ) -> FieldVisitRequestRead:
        officer = await self._field_officer_for_user(organization_id, actor_user_id)
        if officer is None or not officer.is_active:
            raise ValueError("Only active field officers can request field visits from mobile.")
        if payload.project_id and not await self.repository.project_exists(organization_id=organization_id, project_id=payload.project_id):
            raise ValueError("Choose a project that belongs to this organization.")
        if payload.beneficiary_id:
            beneficiary = await self.repository.get_beneficiary(organization_id=organization_id, beneficiary_id=payload.beneficiary_id)
            if beneficiary is None:
                raise ValueError("Choose a beneficiary that belongs to this organization.")
        visit = FieldVisitRequest(
            organization_id=organization_id,
            project_id=payload.project_id,
            beneficiary_id=payload.beneficiary_id,
            field_officer_id=officer.id,
            supervisor_user_id=officer.supervisor_user_id,
            title=payload.title,
            activity_type=payload.activity_type,
            activity_scope=payload.activity_scope if payload.project_id or payload.beneficiary_id else "organization",
            requires_approval=payload.requires_approval,
            purpose=payload.purpose,
            location_name=payload.location_name,
            latitude=payload.latitude,
            longitude=payload.longitude,
            requested_start_at=payload.requested_start_at,
            requested_end_at=payload.requested_end_at,
            priority=payload.priority,
            status="pending" if payload.requires_approval else "approved",
            required_form_ids_json=[str(form_id) for form_id in payload.required_form_ids],
            planned_activities_json=payload.planned_activities,
            metadata_json=payload.metadata_json,
        )
        self.session.add(visit)
        await self.session.flush()
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="field_visit.request_submitted",
            resource_type="field_visit_request",
            resource_id=str(visit.id),
            metadata={
                "field_officer_id": str(officer.id),
                "project_id": str(payload.project_id) if payload.project_id else None,
                "beneficiary_id": str(payload.beneficiary_id) if payload.beneficiary_id else None,
                "activity_type": payload.activity_type,
                "activity_scope": payload.activity_scope,
                "location_name": payload.location_name,
                "requested_start_at": payload.requested_start_at.isoformat(),
                "requested_end_at": payload.requested_end_at.isoformat(),
            },
        )
        return self._read_visit_request(visit)

    async def list_field_visit_requests(
        self,
        organization_id: UUID,
        *,
        actor_user_id: UUID | None = None,
        actor_roles: list[str] | None = None,
        actor_project_ids: list[str] | None = None,
        own_only: bool = False,
        status: str | None = None,
    ) -> list[FieldVisitRequestRead]:
        filters = [
            FieldVisitRequest.organization_id == organization_id,
            FieldVisitRequest.deleted_at.is_(None),
        ]
        if status:
            filters.append(FieldVisitRequest.status == status)
        if own_only:
            if actor_user_id is None:
                return []
            officer = await self._field_officer_for_user(organization_id, actor_user_id)
            if officer is None:
                return []
            filters.append(FieldVisitRequest.field_officer_id == officer.id)
        else:
            filters.extend(
                await self._operational_activity_scope_filters(
                    organization_id,
                    actor_user_id=actor_user_id,
                    actor_roles=actor_roles,
                    actor_project_ids=actor_project_ids,
                )
            )
        result = await self.session.execute(
            select(FieldVisitRequest)
            .where(*filters)
            .order_by(FieldVisitRequest.requested_start_at.desc(), FieldVisitRequest.created_at.desc())
        )
        return [self._read_visit_request(visit) for visit in result.scalars()]

    async def review_field_visit_request(
        self,
        organization_id: UUID,
        actor_user_id: UUID,
        visit_request_id: UUID,
        payload: FieldVisitRequestReview,
        actor_roles: list[str] | None = None,
        actor_project_ids: list[str] | None = None,
    ) -> FieldVisitRequestRead:
        visit = await self.session.get(FieldVisitRequest, visit_request_id)
        if visit is None or visit.organization_id != organization_id or visit.deleted_at is not None:
            raise ValueError("Field visit request not found.")
        await self._assert_operational_activity_access(
            organization_id,
            visit,
            actor_user_id=actor_user_id,
            actor_roles=actor_roles,
            actor_project_ids=actor_project_ids,
        )
        if visit.status not in {"pending", "change_requested"}:
            raise ValueError("Only pending or change-requested visits can be reviewed.")
        now = datetime.now(UTC)
        metadata = dict(visit.metadata_json or {})
        metadata.setdefault("reviews", [])
        reviews = metadata["reviews"]
        if not isinstance(reviews, list):
            reviews = []
            metadata["reviews"] = reviews
        reviews.append(
            {
                "action": payload.action,
                "comment": payload.comment,
                "reviewedByUserId": str(actor_user_id),
                "reviewedAt": now.isoformat(),
            }
        )
        if payload.approved_start_at:
            visit.requested_start_at = payload.approved_start_at
        if payload.approved_end_at:
            visit.requested_end_at = payload.approved_end_at
        visit.status = {
            "approve": "approved",
            "reject": "rejected",
            "request_changes": "change_requested",
        }[payload.action]
        visit.supervisor_instructions = payload.supervisor_instructions or payload.comment or visit.supervisor_instructions
        visit.reviewed_by_user_id = actor_user_id
        visit.reviewed_at = now
        visit.metadata_json = metadata
        await self.session.flush()
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=f"field_visit.request_{visit.status}",
            resource_type="field_visit_request",
            resource_id=str(visit.id),
            metadata={"action": payload.action, "comment": payload.comment, "field_officer_id": str(visit.field_officer_id)},
        )
        return self._read_visit_request(visit)

    async def check_in_field_visit_request(
        self,
        organization_id: UUID,
        actor_user_id: UUID,
        visit_request_id: UUID,
        payload: FieldVisitCheckIn,
    ) -> FieldVisitRequestRead:
        officer = await self._field_officer_for_user(organization_id, actor_user_id)
        visit = await self.session.get(FieldVisitRequest, visit_request_id)
        if visit is None or visit.organization_id != organization_id or visit.deleted_at is not None:
            raise ValueError("Field visit request not found.")
        if officer is None or visit.field_officer_id != officer.id:
            raise ValueError("This visit request is not assigned to this mobile account.")
        if visit.status not in {"approved", "scheduled"}:
            raise ValueError("Your supervisor must approve this visit before you can check in.")
        distance = None
        verification = "verified"
        if visit.latitude is not None and visit.longitude is not None:
            distance = self._distance_meters(visit.latitude, visit.longitude, payload.latitude, payload.longitude)
            if distance > 500:
                verification = "outside_planned_area"
            elif distance > 100:
                verification = "warning_distance"
        if payload.accuracy is not None and payload.accuracy > 100 and verification == "verified":
            verification = "poor_gps_accuracy"
        visit.status = "flagged" if verification in {"outside_planned_area", "poor_gps_accuracy"} else "checked_in"
        visit.verification_status = verification
        visit.distance_from_planned_meters = distance
        visit.check_in_at = payload.timestamp
        visit.check_in_latitude = payload.latitude
        visit.check_in_longitude = payload.longitude
        visit.check_in_accuracy = payload.accuracy
        visit.check_in_note = payload.note
        officer.last_seen_at = datetime.now(UTC)
        officer.last_latitude = payload.latitude
        officer.last_longitude = payload.longitude
        await self.session.flush()
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="field_visit.checked_in",
            resource_type="field_visit_request",
            resource_id=str(visit.id),
            metadata={
                "verification_status": verification,
                "distance_from_planned_meters": distance,
                "accuracy": payload.accuracy,
            },
        )
        return self._read_visit_request(visit)

    async def check_out_field_visit_request(
        self,
        organization_id: UUID,
        actor_user_id: UUID,
        visit_request_id: UUID,
        payload: FieldVisitCheckOut,
    ) -> FieldVisitRequestRead:
        officer = await self._field_officer_for_user(organization_id, actor_user_id)
        visit = await self.session.get(FieldVisitRequest, visit_request_id)
        if visit is None or visit.organization_id != organization_id or visit.deleted_at is not None:
            raise ValueError("Field visit request not found.")
        if officer is None or visit.field_officer_id != officer.id:
            raise ValueError("This visit request is not assigned to this mobile account.")
        if visit.check_in_at is None:
            raise ValueError("Check in before completing this visit.")
        visit.status = "completed"
        visit.check_out_at = payload.timestamp
        visit.check_out_latitude = payload.latitude
        visit.check_out_longitude = payload.longitude
        visit.check_out_accuracy = payload.accuracy
        visit.check_out_summary = payload.summary
        officer.last_seen_at = datetime.now(UTC)
        officer.last_latitude = payload.latitude
        officer.last_longitude = payload.longitude
        await self.session.flush()
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="field_visit.completed",
            resource_type="field_visit_request",
            resource_id=str(visit.id),
            metadata={"summary_provided": bool(payload.summary), "accuracy": payload.accuracy},
        )
        return self._read_visit_request(visit)

    async def review_operational_activity_outcome(
        self,
        organization_id: UUID,
        actor_user_id: UUID,
        visit_request_id: UUID,
        payload: FieldVisitOutcomeReview,
        actor_roles: list[str] | None = None,
        actor_project_ids: list[str] | None = None,
    ) -> FieldVisitRequestRead:
        visit = await self.session.get(FieldVisitRequest, visit_request_id)
        if visit is None or visit.organization_id != organization_id or visit.deleted_at is not None:
            raise ValueError("Operational activity not found.")
        await self._assert_operational_activity_access(
            organization_id,
            visit,
            actor_user_id=actor_user_id,
            actor_roles=actor_roles,
            actor_project_ids=actor_project_ids,
        )
        if visit.status not in {"checked_in", "completed", "flagged", "change_requested"}:
            raise ValueError("Only checked-in, completed, flagged, or correction-requested activities can receive an outcome decision.")
        now = datetime.now(UTC)
        metadata = dict(visit.metadata_json or {})
        outcome_reviews = metadata.get("outcomeReviews")
        if not isinstance(outcome_reviews, list):
            outcome_reviews = []
        outcome_reviews.append(
            {
                "action": payload.action,
                "comment": payload.comment,
                "qualityScore": payload.quality_score,
                "reviewedByUserId": str(actor_user_id),
                "reviewedAt": now.isoformat(),
            }
        )
        metadata["outcomeReviews"] = outcome_reviews
        metadata["outcomeStatus"] = payload.action
        if payload.quality_score is not None:
            metadata["qualityScore"] = payload.quality_score
        if payload.action == "verify":
            visit.status = "completed"
            visit.verification_status = "supervisor_verified"
            metadata["supervisorDecision"] = "Verified by supervisor"
        elif payload.action == "accept_with_exception":
            visit.status = "completed"
            visit.verification_status = "accepted_with_exception"
            metadata["supervisorDecision"] = "Accepted with documented exception"
        elif payload.action == "flag":
            visit.status = "flagged"
            visit.verification_status = "supervisor_flagged"
            metadata["supervisorDecision"] = "Flagged for investigation"
        elif payload.action == "request_correction":
            visit.status = "change_requested"
            visit.verification_status = "correction_requested"
            metadata["supervisorDecision"] = "Correction requested"
        visit.supervisor_instructions = payload.supervisor_instructions or payload.comment
        visit.reviewed_by_user_id = actor_user_id
        visit.reviewed_at = now
        visit.metadata_json = metadata
        await self.session.flush()
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=f"operational_activity.outcome_{payload.action}",
            resource_type="field_visit_request",
            resource_id=str(visit.id),
            metadata={
                "comment": payload.comment,
                "field_officer_id": str(visit.field_officer_id),
                "quality_score": payload.quality_score,
                "verification_status": visit.verification_status,
            },
        )
        return self._read_visit_request(visit)

    async def create_activity_media_evidence(
        self,
        organization_id: UUID,
        actor_user_id: UUID,
        activity_id: UUID,
        payload: MediaEvidenceCreate,
        actor_roles: list[str] | None = None,
        actor_project_ids: list[str] | None = None,
    ) -> MediaEvidenceRead:
        visit = await self.session.get(FieldVisitRequest, activity_id)
        if visit is None or visit.organization_id != organization_id or visit.deleted_at is not None:
            raise ValueError("Operational activity not found.")
        await self._assert_operational_activity_access(
            organization_id,
            visit,
            actor_user_id=actor_user_id,
            actor_roles=actor_roles,
            actor_project_ids=actor_project_ids,
        )
        values = payload.model_dump()
        values["activity_id"] = activity_id
        evidence = await self.repository.create_media_evidence(
            organization_id=organization_id,
            uploaded_by_user_id=actor_user_id,
            values=values,
        )
        metadata = dict(visit.metadata_json or {})
        attachments = metadata.get("attachments")
        if not isinstance(attachments, list):
            attachments = []
        attachments.append(
            {
                "mediaEvidenceId": str(evidence.id),
                "mediaType": evidence.media_type,
                "fileName": evidence.file_name,
                "uploadedAt": datetime.now(UTC).isoformat(),
            }
        )
        metadata["attachments"] = attachments
        visit.metadata_json = metadata
        await self.session.flush()
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="operational_activity.evidence_attached",
            resource_type="field_visit_request",
            resource_id=str(activity_id),
            metadata={
                "media_evidence_id": str(evidence.id),
                "media_type": evidence.media_type,
                "file_name": evidence.file_name,
            },
        )
        return MediaEvidenceRead.model_validate(evidence)

    async def list_activity_media_evidence(
        self,
        organization_id: UUID,
        activity_id: UUID,
        *,
        actor_user_id: UUID | None = None,
        actor_roles: list[str] | None = None,
        actor_project_ids: list[str] | None = None,
    ) -> list[MediaEvidenceRead]:
        visit = await self.session.get(FieldVisitRequest, activity_id)
        if visit is None or visit.organization_id != organization_id or visit.deleted_at is not None:
            raise ValueError("Operational activity not found.")
        await self._assert_operational_activity_access(
            organization_id,
            visit,
            actor_user_id=actor_user_id,
            actor_roles=actor_roles,
            actor_project_ids=actor_project_ids,
        )
        result = await self.session.execute(
            select(MediaEvidence)
            .where(
                MediaEvidence.organization_id == organization_id,
                MediaEvidence.activity_id == activity_id,
                MediaEvidence.deleted_at.is_(None),
            )
            .order_by(MediaEvidence.created_at.desc())
        )
        return [MediaEvidenceRead.model_validate(item) for item in result.scalars()]

    async def operational_activity_report(
        self,
        organization_id: UUID,
        *,
        report_type: str,
        period_start: date | None = None,
        period_end: date | None = None,
        actor_user_id: UUID | None = None,
        actor_roles: list[str] | None = None,
        actor_project_ids: list[str] | None = None,
    ) -> OperationalActivityReportRead:
        filters = [
            FieldVisitRequest.organization_id == organization_id,
            FieldVisitRequest.deleted_at.is_(None),
        ]
        if period_start is not None:
            filters.append(FieldVisitRequest.requested_start_at >= datetime.combine(period_start, datetime.min.time(), tzinfo=UTC))
        if period_end is not None:
            filters.append(FieldVisitRequest.requested_start_at <= datetime.combine(period_end, datetime.max.time(), tzinfo=UTC))
        filters.extend(
            await self._operational_activity_scope_filters(
                organization_id,
                actor_user_id=actor_user_id,
                actor_roles=actor_roles,
                actor_project_ids=actor_project_ids,
            )
        )
        result = await self.session.execute(select(FieldVisitRequest).where(*filters).order_by(FieldVisitRequest.requested_start_at.desc()))
        activities = list(result.scalars())
        activity_ids = [activity.id for activity in activities]
        attachment_count = 0
        if activity_ids:
            media_result = await self.session.execute(
                select(MediaEvidence).where(
                    MediaEvidence.organization_id == organization_id,
                    MediaEvidence.activity_id.in_(activity_ids),
                    MediaEvidence.deleted_at.is_(None),
                )
            )
            attachment_count = len(list(media_result.scalars()))
        filtered = activities
        if report_type == "incident_report":
            filtered = [activity for activity in activities if activity.activity_type == "incident_report"]
        if report_type == "gps_exception":
            filtered = [
                activity
                for activity in activities
                if activity.status == "flagged"
                or activity.verification_status
                in {"warning_distance", "outside_planned_area", "poor_gps_accuracy", "supervisor_flagged", "correction_requested"}
            ]
        if report_type == "supervisor_approval":
            filtered = [activity for activity in activities if activity.requires_approval]
        total = len(filtered)
        pending = sum(1 for activity in filtered if activity.status == "pending")
        approved = sum(1 for activity in filtered if activity.status in {"approved", "scheduled", "checked_in"})
        completed = sum(1 for activity in filtered if activity.status == "completed")
        rejected = sum(1 for activity in filtered if activity.status == "rejected")
        flagged = sum(1 for activity in filtered if activity.status == "flagged")
        gps_verified = sum(1 for activity in filtered if activity.verification_status in {"verified", "supervisor_verified"})
        organization_scope = sum(1 for activity in filtered if activity.activity_scope == "organization")
        project_scope = sum(1 for activity in filtered if activity.activity_scope == "project")
        incident_count = sum(1 for activity in filtered if activity.activity_type == "incident_report")
        by_activity_type: dict[str, int] = {}
        by_officer_id: dict[str, int] = {}
        by_scope: dict[str, int] = {}
        rows: list[dict[str, object]] = []
        for activity in filtered:
            metadata = dict(activity.metadata_json or {})
            by_activity_type[activity.activity_type] = by_activity_type.get(activity.activity_type, 0) + 1
            by_officer_id[str(activity.field_officer_id)] = by_officer_id.get(str(activity.field_officer_id), 0) + 1
            by_scope[activity.activity_scope] = by_scope.get(activity.activity_scope, 0) + 1
            rows.append(
                {
                    "id": str(activity.id),
                    "title": activity.title,
                    "activityType": activity.activity_type,
                    "scope": activity.activity_scope,
                    "status": activity.status,
                    "verificationStatus": activity.verification_status,
                    "supervisorDecision": metadata.get("supervisorDecision"),
                    "outcomeStatus": metadata.get("outcomeStatus"),
                    "qualityScore": metadata.get("qualityScore"),
                    "fieldOfficerId": str(activity.field_officer_id),
                    "locationName": activity.location_name,
                    "requestedStartAt": activity.requested_start_at.isoformat(),
                    "distanceFromPlannedMeters": activity.distance_from_planned_meters,
                }
            )
        recommendations: list[str] = []
        if pending:
            recommendations.append("Review pending activity requests before field movement begins.")
        if flagged:
            recommendations.append("Investigate flagged GPS evidence with the supervisor before accepting activity outcomes.")
        if incident_count:
            recommendations.append("Escalate incident reports into follow-up tasks and document management response.")
        if attachment_count < completed:
            recommendations.append("Ask officers to attach evidence for completed activities where required by policy.")
        approval_rate = round(((approved + completed) / total) * 100, 1) if total else 0
        completion_rate = round((completed / total) * 100, 1) if total else 0
        gps_exception_rate = round((flagged / total) * 100, 1) if total else 0
        title = {
            "monthly_operations": "Monthly Organization Operations Report",
            "field_officer_movement": "Field Officer Movement Report",
            "incident_report": "Incident Report",
            "supervisor_approval": "Supervisor Approval Report",
            "gps_exception": "GPS Exception Report",
        }.get(report_type, "Operational Activity Report")
        return OperationalActivityReportRead(
            report_type=cast(
                Literal["monthly_operations", "field_officer_movement", "incident_report", "supervisor_approval", "gps_exception"],
                report_type,
            ),
            title=title,
            period_start=period_start,
            period_end=period_end,
            generated_at=datetime.now(UTC),
            total_activities=total,
            pending=pending,
            approved=approved,
            completed=completed,
            rejected=rejected,
            flagged=flagged,
            gps_verified=gps_verified,
            organization_scope=organization_scope,
            project_scope=project_scope,
            incident_count=incident_count,
            attachment_count=attachment_count,
            approval_rate=approval_rate,
            completion_rate=completion_rate,
            gps_exception_rate=gps_exception_rate,
            by_activity_type=by_activity_type,
            by_officer_id=by_officer_id,
            by_scope=by_scope,
            recommendations=recommendations,
            rows=rows,
        )

    async def create_beneficiary(self, organization_id: UUID, payload: BeneficiaryCreate, actor_user_id: UUID | None = None) -> Beneficiary:
        if not await self.repository.project_exists(organization_id=organization_id, project_id=payload.project_id):
            raise ValueError("Beneficiaries must be linked to a valid project.")
        registration_source = str(
            payload.profile_json.get("registrationSource")
            or payload.profile_json.get("registration_source")
            or ""
        ).strip().lower()
        allowed_sources = {"import", "imported", "web import", "uploaded file", "mobile", "form submission", "field collection"}
        if registration_source not in allowed_sources:
            raise ValueError(
                "Beneficiaries can only be added through a project import or a project-linked mobile registration form."
            )
        beneficiary = await self.repository.create_beneficiary(
            organization_id=organization_id,
            values=payload.model_dump(),
        )
        if beneficiary.project_id:
            await self.repository.upsert_operational_link(
                organization_id=organization_id,
                project_id=beneficiary.project_id,
                source_type="project",
                source_id=str(beneficiary.project_id),
                target_type="beneficiary",
                target_id=str(beneficiary.id),
                relationship_type="enrolls",
                metadata_json={"beneficiary_uid": beneficiary.beneficiary_uid},
            )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            payload=OperationalEventCreate(
                event_type="beneficiary.enrolled",
                source_module="beneficiaries",
                project_id=beneficiary.project_id,
                beneficiary_id=beneficiary.id,
                summary=f"{beneficiary.display_name} was added to the operational registry.",
                payload={"beneficiary_uid": beneficiary.beneficiary_uid, "region": beneficiary.region or "unassigned"},
            ),
        )
        await self.session.commit()
        await event_publisher.publish(
            "beneficiary.enrolled",
            {"organization_id": str(organization_id), "beneficiary_id": str(beneficiary.id), "type": beneficiary.beneficiary_type},
        )
        return beneficiary

    async def list_beneficiaries(
        self,
        organization_id: UUID,
        *,
        actor_user_id: UUID | None = None,
        scope_type: str = "organization",
        project_id: UUID | None = None,
    ) -> list[Beneficiary]:
        project_ids: set[UUID] | None = {project_id} if project_id is not None else None
        if scope_type == "own" and actor_user_id is not None:
            officer_result = await self.session.execute(
                select(FieldOfficerProfile).where(
                    FieldOfficerProfile.organization_id == organization_id,
                    FieldOfficerProfile.user_id == actor_user_id,
                    FieldOfficerProfile.deleted_at.is_(None),
                    FieldOfficerProfile.is_active.is_(True),
                )
            )
            officer = officer_result.scalar_one_or_none()
            if officer is None:
                return []
            assignment_result = await self.session.execute(
                select(OfficerAssignment).where(
                    OfficerAssignment.organization_id == organization_id,
                    OfficerAssignment.officer_id == officer.id,
                    OfficerAssignment.deleted_at.is_(None),
                    OfficerAssignment.is_active.is_(True),
                )
            )
            assignments = list(assignment_result.scalars())
            assigned_projects = {assignment.project_id for assignment in assignments}
            project_ids = assigned_projects if project_ids is None else project_ids & assigned_projects
            beneficiaries = await self.repository.list_beneficiaries(organization_id, project_ids=project_ids)
            assignment_regions = {
                assignment.region.strip().lower()
                for assignment in assignments
                if assignment.region
            }
            if assignment_regions:
                beneficiaries = [
                    beneficiary
                    for beneficiary in beneficiaries
                    if (beneficiary.region or "").strip().lower() in assignment_regions
                    or (beneficiary.district or "").strip().lower() in assignment_regions
                    or (beneficiary.community or "").strip().lower() in assignment_regions
                ]
            return beneficiaries
        return await self.repository.list_beneficiaries(organization_id, project_ids=project_ids)

    async def merge_beneficiaries(
        self,
        organization_id: UUID,
        actor_user_id: UUID,
        payload: BeneficiaryMergeRequest,
    ) -> BeneficiaryMergeRead:
        if payload.master_beneficiary_id == payload.duplicate_beneficiary_id:
            raise ValueError("Choose two different beneficiary records to merge.")
        master = await self.repository.get_beneficiary(
            organization_id=organization_id,
            beneficiary_id=payload.master_beneficiary_id,
        )
        duplicate = await self.repository.get_beneficiary(
            organization_id=organization_id,
            beneficiary_id=payload.duplicate_beneficiary_id,
        )
        if master is None or duplicate is None:
            raise ValueError("Beneficiary record not found.")
        moved_submissions, moved_quality_signals = await self.repository.move_duplicate_links(
            organization_id=organization_id,
            master=master,
            duplicate=duplicate,
        )
        master_profile = dict(master.profile_json or {})
        duplicate_profile = dict(duplicate.profile_json or {})
        merged_at = datetime.now(UTC).isoformat()
        if payload.merge_profile_fields:
            for key, value in duplicate_profile.items():
                if key not in master_profile or master_profile.get(key) in {None, ""}:
                    master_profile[key] = value
        if not isinstance(master_profile.get("mergedDuplicates"), list):
            master_profile["mergedDuplicates"] = []
        master_profile["mergedDuplicates"].append(
            {
                "beneficiaryId": str(duplicate.id),
                "beneficiaryUid": duplicate.beneficiary_uid,
                "mergedAt": merged_at,
                "reason": payload.reason,
            }
        )
        duplicate_profile["mergedIntoBeneficiaryId"] = str(master.id)
        duplicate_profile["mergedIntoBeneficiaryUid"] = master.beneficiary_uid
        duplicate_profile["mergedAt"] = merged_at
        duplicate_profile["mergeReason"] = payload.reason
        await self.repository.update_beneficiary(master, {"profile_json": master_profile})
        await self.repository.update_beneficiary(
            duplicate,
            {
                "duplicate_risk_score": 100,
                "enrollment_status": "duplicate",
                "profile_json": duplicate_profile,
            },
        )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            payload=OperationalEventCreate(
                event_type="beneficiary.duplicates_merged",
                source_module="beneficiaries",
                project_id=master.project_id,
                beneficiary_id=master.id,
                priority="high",
                summary=f"Duplicate beneficiary {duplicate.beneficiary_uid} was merged into {master.beneficiary_uid}.",
                payload={
                    "master_beneficiary_id": str(master.id),
                    "master_beneficiary_uid": master.beneficiary_uid,
                    "duplicate_beneficiary_id": str(duplicate.id),
                    "duplicate_beneficiary_uid": duplicate.beneficiary_uid,
                    "moved_submissions": moved_submissions,
                    "moved_quality_signals": moved_quality_signals,
                    "reason": payload.reason,
                },
            ),
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="beneficiary.duplicates_merged",
            resource_type="beneficiary",
            resource_id=str(master.id),
            metadata={
                "master_beneficiary_id": str(master.id),
                "master_beneficiary_uid": master.beneficiary_uid,
                "duplicate_beneficiary_id": str(duplicate.id),
                "duplicate_beneficiary_uid": duplicate.beneficiary_uid,
                "moved_submissions": moved_submissions,
                "moved_quality_signals": moved_quality_signals,
                "reason": payload.reason,
            },
        )
        return BeneficiaryMergeRead(
            master_beneficiary=BeneficiaryRead.model_validate(master),
            duplicate_beneficiary=BeneficiaryRead.model_validate(duplicate),
            moved_submissions=moved_submissions,
            moved_quality_signals=moved_quality_signals,
            reason=payload.reason,
        )

    async def list_quality_signals(
        self,
        organization_id: UUID,
        *,
        status: str | None = None,
        signal_type: str | None = None,
    ) -> list[DataQualitySignalRead]:
        signals = await self.repository.list_quality_signals(
            organization_id,
            status=status,
            signal_type=signal_type,
        )
        return [DataQualitySignalRead.model_validate(signal) for signal in signals]

    async def update_quality_signal(
        self,
        organization_id: UUID,
        signal_id: UUID,
        payload: DataQualitySignalUpdate,
        actor_user_id: UUID | None = None,
    ) -> DataQualitySignalRead:
        result = await self.session.execute(
            select(DataQualitySignal).where(
                DataQualitySignal.organization_id == organization_id,
                DataQualitySignal.id == signal_id,
            )
        )
        signal = result.scalar_one_or_none()
        if signal is None:
            raise ValueError("Data quality signal not found.")
        previous_status = signal.status
        evidence = dict(signal.evidence_json or {})
        history = evidence.get("statusHistory")
        signal.evidence_json = {
            **evidence,
            "statusHistory": [
                *(history if isinstance(history, list) else []),
                {
                    "from": previous_status,
                    "to": payload.status,
                    "comment": payload.comment,
                    "changedByUserId": str(actor_user_id) if actor_user_id else None,
                    "changedAt": datetime.now(UTC).isoformat(),
                },
            ],
        }
        signal.status = payload.status
        self.session.add(signal)
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="data_quality.signal_status_updated",
            resource_type="data_quality_signal",
            resource_id=str(signal.id),
            metadata={"from": previous_status, "to": payload.status, "comment": payload.comment},
        )
        await self.session.flush()
        return DataQualitySignalRead.model_validate(signal)

    async def search_beneficiaries(
        self,
        organization_id: UUID,
        query: str,
        *,
        actor_user_id: UUID | None = None,
        scope_type: str = "organization",
    ) -> list[Beneficiary]:
        query_text = normalized_text(query)
        query_phone = normalized_phone(query)
        beneficiaries = await self.list_beneficiaries(
            organization_id,
            actor_user_id=actor_user_id,
            scope_type=scope_type,
        )
        if not query_text:
            return beneficiaries[:50]
        return [
            beneficiary
            for beneficiary in beneficiaries
            if query_text in normalized_text(beneficiary.beneficiary_uid)
            or query_text in normalized_text(beneficiary.display_name)
            or query_text in normalized_text(beneficiary.community)
            or query_text in normalized_text(beneficiary.district)
            or query_text in normalized_text(beneficiary.region)
            or (query_phone and query_phone in normalized_phone(beneficiary.phone_number))
        ][:50]

    async def check_entity_duplicates(
        self,
        organization_id: UUID,
        payload: EntityDuplicateCheckRequest,
    ) -> list[EntityDuplicateCandidateRead]:
        candidates: list[EntityDuplicateCandidateRead] = []
        full_name = normalized_text(payload.full_name)
        phone = normalized_phone(payload.phone_number)
        household_id = normalized_text(payload.household_id)
        national_id = normalized_text(payload.national_id)
        village = normalized_text(payload.village)

        for beneficiary in await self.repository.list_beneficiaries(organization_id):
            score = 0
            matched_fields: list[str] = []
            profile = beneficiary.profile_json or {}
            profile_national_id = normalized_text(str(profile.get("nationalId") or profile.get("national_id") or ""))
            profile_household_id = normalized_text(str(profile.get("householdId") or profile.get("household_id") or ""))
            beneficiary_phone = normalized_phone(beneficiary.phone_number)

            if national_id and national_id == profile_national_id:
                score += 100
                matched_fields.append("National ID")
            if phone and phone == beneficiary_phone:
                score += 80
                matched_fields.append("Phone number")
            if household_id and household_id == profile_household_id:
                score += 90
                matched_fields.append("Household ID")
            if full_name and full_name == normalized_text(beneficiary.display_name):
                score += 45
                matched_fields.append("Full name")
            if full_name and village and village == normalized_text(beneficiary.community):
                score += 60
                matched_fields.append("Name + village")
            if (
                payload.latitude is not None
                and payload.longitude is not None
                and beneficiary.latitude is not None
                and beneficiary.longitude is not None
            ):
                latitude_delta = (payload.latitude - beneficiary.latitude) * 111_320
                longitude_delta = (payload.longitude - beneficiary.longitude) * 111_320
                distance_meters = (latitude_delta**2 + longitude_delta**2) ** 0.5
                if distance_meters <= 50:
                    score += 40
                    matched_fields.append("GPS within 50m")

            capped_score = min(score, 100)
            if capped_score < 40:
                continue
            candidates.append(
                EntityDuplicateCandidateRead(
                    entity_id=beneficiary.id,
                    entity_uid=beneficiary.beneficiary_uid,
                    display_name=beneficiary.display_name,
                    level="Likely duplicate" if capped_score >= 90 else "Possible duplicate",
                    matched_fields=matched_fields,
                    score=capped_score,
                )
            )

        return sorted(candidates, key=lambda item: item.score, reverse=True)

    async def entity_prefill(self, organization_id: UUID, entity_id: UUID, form_id: UUID | None = None) -> EntityPrefillRead:
        _ = form_id
        beneficiaries = await self.repository.list_beneficiaries(organization_id)
        beneficiary = next((item for item in beneficiaries if item.id == entity_id), None)
        if beneficiary is None:
            raise ValueError("Entity not found")
        profile = beneficiary.profile_json or {}
        return EntityPrefillRead(
            entity_id=beneficiary.id,
            locked_fields=["beneficiary_uid", "display_name", "phone_number", "community"],
            update_requires_reason=True,
            values={
                "beneficiary_uid": beneficiary.beneficiary_uid,
                "full_name": beneficiary.display_name,
                "entity_type": beneficiary.beneficiary_type,
                "gender": beneficiary.sex,
                "phone_number": beneficiary.phone_number,
                "region": beneficiary.region,
                "district": beneficiary.district,
                "community": beneficiary.community,
                "latitude": beneficiary.latitude,
                "longitude": beneficiary.longitude,
                "national_id": profile.get("nationalId") or profile.get("national_id"),
                "household_id": profile.get("householdId") or profile.get("household_id"),
            },
        )

    async def mobile_sync_package(self, organization_id: UUID) -> MobileSyncPackageRead:
        beneficiaries = await self.repository.list_beneficiaries(organization_id)
        return MobileSyncPackageRead(
            assigned_entities=beneficiaries,
            assigned_forms=[],
            published_form_versions=[],
            reference_data=[],
            duplicate_rules=[
                {
                    "name": "Default weighted entity duplicate rule",
                    "weights": {
                        "national_id": 100,
                        "phone_number": 80,
                        "household_id": 90,
                        "name_date_of_birth": 75,
                        "name_village": 60,
                        "gps_50m": 40,
                    },
                    "likely_duplicate_threshold": 90,
                    "possible_duplicate_threshold": 60,
                }
            ],
            frequency_rules=[
                "once_ever",
                "once_per_project",
                "once_per_year",
                "once_per_season",
                "once_per_quarter",
                "once_per_month",
                "once_per_event",
                "unlimited",
            ],
            returned_submissions=[],
            sync_conflicts=[],
        )

    async def create_indicator(self, organization_id: UUID, payload: IndicatorCreate, actor_user_id: UUID | None = None) -> IndicatorRead:
        values = payload.model_dump()
        values["disaggregation_json"] = values.pop("disaggregation_fields", [])
        indicator = await self.repository.create_indicator(organization_id=organization_id, values=values)
        if indicator.project_id:
            await self.repository.upsert_operational_link(
                organization_id=organization_id,
                project_id=indicator.project_id,
                source_type="project",
                source_id=str(indicator.project_id),
                target_type="indicator",
                target_id=str(indicator.id),
                relationship_type="measures",
                metadata_json={"indicator_code": indicator.code},
            )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            payload=OperationalEventCreate(
                event_type="indicator.created",
                source_module="indicators",
                project_id=indicator.project_id,
                summary=f"Indicator {indicator.code} is connected to dashboards, submissions, and donor reporting.",
                payload={"indicator_name": indicator.name, "unit": indicator.unit},
            ),
        )
        await self.session.commit()
        await event_publisher.publish("indicator.created", {"organization_id": str(organization_id), "indicator_id": str(indicator.id)})
        return self.to_indicator_read(indicator)

    async def update_indicator(
        self,
        organization_id: UUID,
        indicator_id: UUID,
        payload: IndicatorUpdate,
        actor_user_id: UUID | None = None,
    ) -> IndicatorRead:
        result = await self.session.execute(
            select(MonitoringIndicator).where(
                MonitoringIndicator.organization_id == organization_id,
                MonitoringIndicator.id == indicator_id,
                MonitoringIndicator.deleted_at.is_(None),
            )
        )
        indicator = result.scalar_one_or_none()
        if indicator is None:
            raise LookupError("Indicator not found")
        changed: list[str] = []
        for field in (
            "name",
            "description",
            "unit",
            "reporting_frequency",
            "baseline_value",
            "target_value",
            "current_value",
            "sdg_code",
            "formula",
            "category",
            "is_active",
        ):
            value = getattr(payload, field)
            if value is not None and getattr(indicator, field) != value:
                setattr(indicator, field, value)
                changed.append(field)
        if payload.disaggregation_fields is not None:
            indicator.disaggregation_json = list(payload.disaggregation_fields)
            changed.append("disaggregation_fields")
        await self.session.flush()
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="indicator.updated",
            resource_type="indicator",
            resource_id=str(indicator.id),
            metadata={"code": indicator.code, "changed_fields": changed},
        )
        calculated_value = await self.calculate_indicator_current_value(organization_id, indicator)
        return self.to_indicator_read(indicator, calculated_value=calculated_value)

    async def list_indicators(self, organization_id: UUID) -> list[IndicatorRead]:
        indicators = await self.repository.list_indicators(organization_id)
        reads: list[IndicatorRead] = []
        for indicator in indicators:
            calculated_value = await self.calculate_indicator_current_value(organization_id, indicator)
            reads.append(self.to_indicator_read(indicator, calculated_value=calculated_value))
        return reads

    async def calculate_indicator_current_value(self, organization_id: UUID, indicator: MonitoringIndicator) -> float | None:
        if not indicator.project_id:
            return None
        parsed = _parse_formula(indicator.formula)
        if parsed is None:
            return None
        operation, field_name = parsed
        submissions = await self.repository.list_approved_submissions(
            organization_id=organization_id,
            project_id=indicator.project_id,
            survey_id=indicator.survey_id,
        )
        values = [submission_values(submission.payload_json).get(field_name) for submission in submissions]
        return _aggregate_values(operation, values)

    async def calculate_indicator_disaggregation(
        self, organization_id: UUID, indicator: MonitoringIndicator
    ) -> IndicatorDisaggregationsRead:
        if not indicator.project_id or not indicator.disaggregation_json:
            return IndicatorDisaggregationsRead(items=[])
        parsed = _parse_formula(indicator.formula)
        operation, field_name = parsed if parsed is not None else ("sum", None)
        submissions = await self.repository.list_approved_submissions(
            organization_id=organization_id,
            project_id=indicator.project_id,
            survey_id=indicator.survey_id,
        )
        payloads = [submission_values(submission.payload_json) for submission in submissions]
        items: list[IndicatorDisaggregationRead] = []
        for disaggregation_field in indicator.disaggregation_json:
            groups: dict[str, list[object]] = {}
            for values_map in payloads:
                group_key = values_map.get(disaggregation_field)
                group_label = "Unspecified" if group_key in (None, "", [], {}) else str(group_key)
                groups.setdefault(group_label, []).append(values_map.get(field_name) if field_name else None)
            breakdown = {label: _aggregate_values(operation, values) for label, values in groups.items()}
            items.append(IndicatorDisaggregationRead(field_name=disaggregation_field, operation=operation, breakdown=breakdown))
        return IndicatorDisaggregationsRead(items=items)

    async def list_indicator_linked_submissions(
        self, organization_id: UUID, indicator: MonitoringIndicator
    ) -> IndicatorLinkedSubmissionsRead:
        if not indicator.project_id:
            return IndicatorLinkedSubmissionsRead(field_name=None, operation=None, total_count=0, items=[])
        parsed = _parse_formula(indicator.formula)
        operation, field_name = parsed if parsed is not None else (None, None)
        submissions = await self.repository.list_approved_submissions(
            organization_id=organization_id,
            project_id=indicator.project_id,
            survey_id=indicator.survey_id,
        )
        ordered = sorted(submissions, key=lambda submission: submission.submitted_at, reverse=True)
        items = [
            IndicatorLinkedSubmissionRead(
                submission_id=submission.id,
                client_submission_id=submission.client_submission_id,
                submitted_at=submission.submitted_at,
                approved_at=submission.approved_at,
                field_value=submission_values(submission.payload_json).get(field_name) if field_name else None,
                project_id=submission.project_id,
            )
            for submission in ordered[:200]
        ]
        return IndicatorLinkedSubmissionsRead(field_name=field_name, operation=operation, total_count=len(ordered), items=items)

    async def create_case(self, organization_id: UUID, payload: CaseCreate, actor_user_id: UUID | None = None) -> CaseRecord:
        case = await self.repository.create_case(organization_id=organization_id, values=payload.model_dump())
        if case.beneficiary_id:
            await self.repository.upsert_operational_link(
                organization_id=organization_id,
                project_id=case.project_id,
                source_type="beneficiary",
                source_id=str(case.beneficiary_id),
                target_type="case",
                target_id=str(case.id),
                relationship_type="has_follow_up",
                metadata_json={"case_number": case.case_number, "priority": case.priority},
            )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            payload=OperationalEventCreate(
                event_type="case.opened",
                source_module="cases",
                project_id=case.project_id,
                beneficiary_id=case.beneficiary_id,
                summary=f"Case {case.case_number} opened and added to supervisor follow-up.",
                priority=case.priority,
                payload={"case_type": case.case_type, "status": case.status},
            ),
        )
        await self.session.commit()
        await event_publisher.publish("case.opened", {"organization_id": str(organization_id), "case_id": str(case.id)})
        return case

    async def list_cases(self, organization_id: UUID) -> list[CaseRecord]:
        return await self.repository.list_cases(organization_id)

    async def create_report(self, organization_id: UUID, payload: DonorReportCreate) -> DonorReport:
        report = await self.repository.create_report(organization_id=organization_id, values=payload.model_dump())
        await self.session.commit()
        await event_publisher.publish("report.created", {"organization_id": str(organization_id), "report_id": str(report.id)})
        return report

    async def list_reports(self, organization_id: UUID) -> list[DonorReport]:
        return await self.repository.list_reports(organization_id)

    async def _compute_report_metrics(self, organization_id: UUID, report: DonorReport) -> DonorReportMetrics:
        project_id = report.project_id
        submissions_total = await self.repository.count_submissions_scoped(organization_id=organization_id, project_id=project_id)
        submissions_approved = await self.repository.count_submissions_scoped(
            organization_id=organization_id, project_id=project_id, status="approved"
        )
        beneficiaries = await self.repository.count_beneficiaries_scoped(organization_id=organization_id, project_id=project_id)
        projects = 1 if project_id is not None else await self.repository.count(Project, organization_id)

        indicators = await self.repository.list_indicators(organization_id)
        scoped_indicators = [
            indicator
            for indicator in indicators
            if indicator.is_active and (project_id is None or indicator.project_id == project_id)
        ]
        indicator_metrics: list[DonorReportIndicatorMetric] = []
        for indicator in scoped_indicators:
            calculated_value = await self.calculate_indicator_current_value(organization_id, indicator)
            current_value = indicator.current_value if calculated_value is None else calculated_value
            indicator_metrics.append(
                DonorReportIndicatorMetric(
                    code=indicator.code,
                    name=indicator.name,
                    unit=indicator.unit,
                    baseline_value=indicator.baseline_value,
                    target_value=indicator.target_value,
                    current_value=current_value,
                    progress_percent=_progress_percent(current_value, indicator.baseline_value, indicator.target_value),
                )
            )

        return DonorReportMetrics(
            projects=projects,
            submissions_total=submissions_total,
            submissions_approved=submissions_approved,
            beneficiaries=beneficiaries,
            indicators=indicator_metrics,
            period_start=report.period_start,
            period_end=report.period_end,
            generated_at=datetime.now(UTC),
        )

    async def generate_report(self, organization_id: UUID, report_id: UUID) -> DonorReport:
        report = await self.repository.get_report_by_id(organization_id=organization_id, report_id=report_id)
        if report is None:
            raise ValueError("Report not found")

        metrics = await self._compute_report_metrics(organization_id, report)
        values: dict[str, object] = {
            "metrics_json": metrics.model_dump(mode="json"),
            "generated_at": metrics.generated_at,
            "status": "ready",
        }
        if not report.summary:
            values["summary"] = _build_report_summary(report, metrics)
        report = await self.repository.update_report(report, values)
        await self.session.commit()
        await event_publisher.publish("report.generated", {"organization_id": str(organization_id), "report_id": str(report.id)})
        return report

    async def export_report_csv(self, organization_id: UUID, report_id: UUID) -> tuple[str, str]:
        report = await self.repository.get_report_by_id(organization_id=organization_id, report_id=report_id)
        if report is None:
            raise ValueError("Report not found")

        if not report.metrics_json:
            report = await self.generate_report(organization_id, report_id)

        metrics_json = report.metrics_json
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["Report", report.name])
        writer.writerow(["Donor", report.donor or ""])
        writer.writerow(["Report type", report.report_type])
        writer.writerow(["Status", report.status])
        writer.writerow(["Period start", metrics_json.get("period_start") or ""])
        writer.writerow(["Period end", metrics_json.get("period_end") or ""])
        writer.writerow(["Generated at", metrics_json.get("generated_at") or ""])
        writer.writerow([])
        writer.writerow(["Projects", metrics_json.get("projects", 0)])
        writer.writerow(["Submissions (total)", metrics_json.get("submissions_total", 0)])
        writer.writerow(["Submissions (approved)", metrics_json.get("submissions_approved", 0)])
        writer.writerow(["Beneficiaries", metrics_json.get("beneficiaries", 0)])
        writer.writerow([])
        writer.writerow(["Indicator code", "Indicator name", "Unit", "Baseline", "Target", "Current", "Progress %"])
        for indicator in metrics_json.get("indicators", []):
            writer.writerow(
                [
                    indicator.get("code"),
                    indicator.get("name"),
                    indicator.get("unit"),
                    indicator.get("baseline_value"),
                    indicator.get("target_value"),
                    indicator.get("current_value"),
                    indicator.get("progress_percent"),
                ]
            )

        filename = f"{report.name.strip().lower().replace(' ', '-') or 'report'}.csv"
        return buffer.getvalue(), filename

    async def create_unit(self, organization_id: UUID, user_id: UUID, payload: OrganizationalUnitCreate) -> OrganizationalUnitRead:
        unit = await self.repository.create_enterprise_record(OrganizationalUnit, organization_id=organization_id, values=payload.model_dump())
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="org_unit.created",
                source_module="organization",
                summary=f"{payload.name} was added to the governance hierarchy.",
                payload={"unit_type": payload.unit_type, "region": payload.region or "global"},
            ),
        )
        await self.session.commit()
        return OrganizationalUnitRead.model_validate(unit)

    async def import_units_csv(
        self,
        organization_id: UUID,
        user_id: UUID,
        content: bytes,
    ) -> OrganizationalUnitImportResponse:
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(StringIO(text))
        if reader.fieldnames is None:
            raise ValueError("CSV file must include a header row")
        normalized_headers = {header.strip().lower(): header for header in reader.fieldnames}
        required_headers = {"name", "code", "unit_type"}
        missing_headers = sorted(required_headers - set(normalized_headers))
        if missing_headers:
            raise ValueError(f"Missing required columns: {', '.join(missing_headers)}")

        created_units: list[OrganizationalUnit] = []
        issues: list[OrganizationalUnitImportIssue] = []
        seen_codes: set[str] = set()

        for row_number, raw_row in enumerate(reader, start=2):
            row = {key: (raw_row[value] or "").strip() for key, value in normalized_headers.items()}
            name = row.get("name", "")
            code = row.get("code", "").lower()
            unit_type = row.get("unit_type", "")
            if not name or not code or not unit_type:
                issues.append(OrganizationalUnitImportIssue(row_number=row_number, code=code or None, message="name, code, and unit_type are required"))
                continue
            if code in seen_codes:
                issues.append(OrganizationalUnitImportIssue(row_number=row_number, code=code, message="duplicate code in uploaded file"))
                continue
            seen_codes.add(code)
            if await self.repository.get_organizational_unit_by_code(organization_id=organization_id, code=code) is not None:
                issues.append(OrganizationalUnitImportIssue(row_number=row_number, code=code, message="unit code already exists"))
                continue
            parent_unit_id = None
            parent_code = row.get("parent_code", "").lower()
            if parent_code:
                parent = await self.repository.get_organizational_unit_by_code(organization_id=organization_id, code=parent_code)
                if parent is None:
                    parent = next((unit for unit in created_units if unit.code == parent_code), None)
                if parent is None:
                    issues.append(OrganizationalUnitImportIssue(row_number=row_number, code=code, message=f"parent_code {parent_code} was not found"))
                    continue
                parent_unit_id = parent.id
            unit = await self.repository.create_enterprise_record(
                OrganizationalUnit,
                organization_id=organization_id,
                values={
                    "name": name,
                    "code": code,
                    "unit_type": unit_type,
                    "parent_unit_id": parent_unit_id,
                    "region": row.get("region") or None,
                    "metadata_json": {},
                },
            )
            created_units.append(unit)

        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="org_units.imported",
                source_module="organization",
                summary=f"{len(created_units)} organization unit records were imported.",
                payload={"created": len(created_units), "issues": len(issues)},
            ),
        )
        await self.session.commit()
        return OrganizationalUnitImportResponse(
            created_count=len(created_units),
            skipped_count=len(issues),
            error_count=len(issues),
            units=[OrganizationalUnitRead.model_validate(unit) for unit in created_units],
            issues=issues,
        )

    async def create_workflow_definition(self, organization_id: UUID, user_id: UUID, payload: WorkflowDefinitionCreate) -> WorkflowDefinitionRead:
        workflow = await self.repository.create_enterprise_record(WorkflowDefinition, organization_id=organization_id, values=payload.model_dump())
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="workflow.configured",
                source_module="workflows",
                project_id=payload.project_id,
                summary=f"{payload.name} approval workflow is active with SLA tracking.",
                payload={"workflow_type": payload.workflow_type, "sla_hours": payload.sla_hours},
            ),
        )
        await self.session.commit()
        return WorkflowDefinitionRead.model_validate(workflow)

    async def route_data(self, organization_id: UUID, user_id: UUID, payload: DataRouteCreate) -> DataRouteRead:
        if payload.target_role_name is None and payload.target_team_id is None and payload.target_user_id is None:
            raise ValueError("Choose a role, team, or user to receive this data route")
        if payload.target_role_name is not None and await self.roles.get_by_name(organization_id=organization_id, name=payload.target_role_name) is None:
            raise ValueError("Target role does not exist in this organization")
        if payload.target_user_id is not None and await self.identity.get_user_account(organization_id=organization_id, user_id=payload.target_user_id) is None:
            raise ValueError("Target user does not belong to this organization")
        if payload.target_team_id is not None and not any(unit.id == payload.target_team_id for unit in await self.units.list_for_organization(organization_id)):
            raise ValueError("Target team does not belong to this organization")

        item = await self.repository.create_workflow_queue_item(
            organization_id=organization_id,
            queue_type="data_route",
            trigger_event_type="data.route.created",
            title=payload.title,
            next_action=payload.instructions,
            assigned_to_user_id=payload.target_user_id,
            priority=payload.priority,
            context_json={
                "data_type": payload.data_type,
                "target_role_name": payload.target_role_name,
                "target_team_id": str(payload.target_team_id) if payload.target_team_id else None,
                "created_by_user_id": str(user_id),
            },
        )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="data.route.created",
                source_module="workflows",
                summary=f"{payload.data_type.title()} data was routed for action.",
                payload=item.context_json,
            ),
        )
        await self.session.commit()
        return DataRouteRead(
            id=item.id,
            title=item.title,
            data_type=payload.data_type,
            target_role_name=payload.target_role_name,
            target_team_id=payload.target_team_id,
            target_user_id=payload.target_user_id,
            priority=item.priority,
            instructions=item.next_action,
            status=item.status,
            created_at=item.created_at,
        )

    async def create_task(self, organization_id: UUID, user_id: UUID, payload: OperationalTaskCreate) -> OperationalTaskRead:
        task = await self.repository.create_enterprise_record(OperationalTask, organization_id=organization_id, values=payload.model_dump())
        if payload.project_id:
            await self.repository.upsert_operational_link(
                organization_id=organization_id,
                project_id=payload.project_id,
                source_type="project",
                source_id=str(payload.project_id),
                target_type="task",
                target_id=str(task.id),
                relationship_type="assigns_work",
            )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="task.assigned",
                source_module="tasks",
                project_id=payload.project_id,
                beneficiary_id=payload.beneficiary_id,
                summary=f"Task assigned: {payload.title}",
                priority=payload.priority,
                payload={"task_type": payload.task_type},
            ),
        )
        await self.session.commit()
        return OperationalTaskRead.model_validate(task)

    async def create_intervention(self, organization_id: UUID, user_id: UUID, payload: InterventionCreate) -> InterventionRead:
        intervention = await self.repository.create_enterprise_record(InterventionRecord, organization_id=organization_id, values=payload.model_dump())
        if payload.beneficiary_id:
            await self.repository.upsert_operational_link(
                organization_id=organization_id,
                project_id=payload.project_id,
                source_type="beneficiary",
                source_id=str(payload.beneficiary_id),
                target_type="intervention",
                target_id=str(intervention.id),
                relationship_type="receives_intervention",
            )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="intervention.planned",
                source_module="interventions",
                project_id=payload.project_id,
                beneficiary_id=payload.beneficiary_id,
                summary=f"{payload.intervention_type} intervention is planned and linked to reporting.",
                payload={"value_amount": payload.value_amount or 0},
            ),
        )
        await self.session.commit()
        return InterventionRead.model_validate(intervention)

    async def create_asset(self, organization_id: UUID, user_id: UUID, payload: OperationalAssetCreate) -> OperationalAssetRead:
        asset = await self.repository.create_enterprise_record(OperationalAsset, organization_id=organization_id, values=payload.model_dump())
        if payload.project_id:
            await self.repository.upsert_operational_link(
                organization_id=organization_id,
                project_id=payload.project_id,
                source_type="project",
                source_id=str(payload.project_id),
                target_type="asset",
                target_id=str(asset.id),
                relationship_type="uses_asset",
            )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="asset.registered",
                source_module="assets",
                project_id=payload.project_id,
                summary=f"Asset {payload.asset_code} is available for field operations.",
                payload={"asset_type": payload.asset_type, "region": payload.region or "unassigned"},
            ),
        )
        await self.session.commit()
        return OperationalAssetRead.model_validate(asset)

    async def create_budget_line(self, organization_id: UUID, user_id: UUID, payload: ProjectBudgetLineCreate) -> ProjectBudgetLineRead:
        budget = cast(ProjectBudgetLine, await self.repository.create_enterprise_record(ProjectBudgetLine, organization_id=organization_id, values=payload.model_dump()))
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="budget.allocated",
                source_module="finance",
                project_id=payload.project_id,
                summary=f"{payload.category} budget line is connected to interventions and donor reporting.",
                payload={"allocated_amount": payload.allocated_amount, "currency": payload.currency},
            ),
        )
        await self.session.commit()
        return self.to_budget_read(budget)

    async def create_document(self, organization_id: UUID, user_id: UUID, payload: KnowledgeDocumentCreate) -> KnowledgeDocumentRead:
        document = await self.repository.create_enterprise_record(KnowledgeDocument, organization_id=organization_id, values=payload.model_dump())
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="document.attached",
                source_module="documents",
                project_id=payload.project_id,
                beneficiary_id=payload.beneficiary_id,
                summary=f"Document attached: {payload.title}",
                payload={"document_type": payload.document_type},
            ),
        )
        await self.session.commit()
        return KnowledgeDocumentRead.model_validate(document)

    async def summary(self, organization_id: UUID) -> OperationsSummary:
        beneficiaries = await self.repository.count(Beneficiary, organization_id)
        active_programs = await self.repository.count(Project, organization_id)
        indicators = await self.repository.count(MonitoringIndicator, organization_id)
        open_cases = await self.repository.count_open_cases(organization_id)
        quality_flags = await self.repository.count(DataQualitySignal, organization_id)
        return OperationsSummary(
            beneficiaries=beneficiaries,
            active_programs=active_programs,
            indicators=indicators,
            open_cases=open_cases,
            quality_flags=quality_flags,
            sync_health_percent=96.2,
            offline_ready=True,
        )

    async def migration_overview(self, organization_id: UUID) -> ImportMigrationOverviewRead:
        recent_batches = await self.list_import_jobs(organization_id)
        return ImportMigrationOverviewRead(
            supported_types=[
                "projects",
                "entity_registry",
                "form_definitions",
                "submissions",
                "indicators",
                "baselines",
                "targets",
                "locations",
                "boundaries",
                "users_teams",
            ],
            supported_sources=supported_import_sources(),
            recent_batches=recent_batches[:10],
            mobile_ready_outputs=[
                "assignedEntities",
                "assignedForms",
                "publishedFormVersions",
                "referenceData",
                "locations",
                "prefillData",
                "duplicateRules",
                "submissionUpload",
            ],
        )

    async def list_supported_import_sources(self) -> list[ImportSupportedSourceRead]:
        return supported_import_sources()

    async def preview_import(self, payload: ImportPreviewRequest) -> ImportPreviewResponse:
        mapping = infer_mapping(payload.dataset_type, payload.columns)
        issues = validate_sample_rows(payload.dataset_type, payload.sample_rows, mapping)
        error_rows = len({issue.row_number for issue in issues if issue.severity == "error"})
        duplicate_rows = len({issue.row_number for issue in issues if issue.issue_type == "duplicate_row"})
        return ImportPreviewResponse(
            suggested_mapping=mapping,
            issues=issues,
            valid_rows=max(0, len(payload.sample_rows) - error_rows),
            error_rows=error_rows,
            duplicate_rows=duplicate_rows,
        )

    async def analyze_import(self, payload: ImportAnalysisRequest) -> ImportAnalysisResponse:
        mapping = infer_mapping(payload.dataset_type, payload.columns)
        rows = mapped_rows(payload.sample_rows, mapping)
        issues = validate_sample_rows(payload.dataset_type, payload.sample_rows, mapping)
        duplicate_groups = detect_import_duplicate_groups(rows)
        location_matches = detect_location_matches(rows)
        entity_matches = detect_entity_matches(rows) if payload.dataset_type in {"submissions", "entity_registry", "beneficiaries"} else []
        indicator_matches = detect_indicator_matches(rows) if payload.dataset_type in {"indicators", "baselines", "targets", "submissions", "form_definitions"} else []
        generated_ids = detect_missing_ids(rows, payload.dataset_type)
        date_formats = detect_date_formats(rows)
        gps_warnings = detect_gps_warnings(rows)
        known_targets = {item.target_field for item in mapping}
        legacy_fields = [
            item.source_column
            for item in mapping
            if item.target_field == item.source_column.replace(" ", "_")
            and item.target_field not in known_targets.intersection(FIELD_ALIASES.get(payload.dataset_type, {}).keys())
        ][:20]
        readiness = calculate_readiness(
            total_rows=len(payload.sample_rows),
            issues=issues,
            duplicate_groups=duplicate_groups,
            location_matches=location_matches,
            mapping=mapping,
            generated_ids=generated_ids,
            gps_warnings=gps_warnings,
        )
        error_rows = len({issue.row_number for issue in issues if issue.severity == "error"})
        warning_rows = len({issue.row_number for issue in issues if issue.severity != "error"} | {issue.row_number for issue in gps_warnings})
        preview_counts = {
            "create": max(0, len(payload.sample_rows) - error_rows - len(duplicate_groups)),
            "update": len([item for item in entity_matches if item.confidence >= 85]),
            "skip": error_rows,
            "warnings": warning_rows,
            "errors": error_rows,
        }
        recommendations: list[str] = []
        if duplicate_groups:
            recommendations.append("Review duplicate groups before importing farmers or beneficiaries.")
        if any(item.confidence < 70 for item in location_matches):
            recommendations.append("Confirm unknown villages or create approved locations before continuing.")
        if generated_ids:
            recommendations.append("Atlas will generate platform IDs and keep legacy IDs nullable for traceability.")
        if gps_warnings:
            recommendations.append("GPS is missing for some historical records; future forms can collect GPS going forward.")
        if not recommendations:
            recommendations.append("Import is ready after final preview and confirmation.")
        quality_report = ImportQualityReportRead(
            import_batch_id="analysis-draft",
            source_system=payload.source_system,
            records_created=preview_counts["create"],
            records_updated=preview_counts["update"],
            records_skipped=preview_counts["skip"],
            errors=preview_counts["errors"],
            warnings=preview_counts["warnings"],
            duplicate_candidates=len(duplicate_groups),
            location_issues=len([item for item in location_matches if item.confidence < 70]),
            unlinked_submissions=len([item for item in entity_matches if item.confidence < 80]),
            data_quality_score=readiness.score,
            recommendations=recommendations,
        )
        return ImportAnalysisResponse(
            readiness=readiness,
            suggested_mapping=mapping,
            validation_issues=issues,
            duplicate_groups=duplicate_groups,
            location_matches=location_matches,
            entity_matches=entity_matches,
            indicator_matches=indicator_matches,
            generated_ids=generated_ids,
            legacy_fields=legacy_fields,
            date_formats=date_formats,
            gps_warnings=gps_warnings,
            preview_counts=preview_counts,
            quality_report=quality_report,
            progress_percent=100,
        )

    async def create_import_job(self, organization_id: UUID, user_id: UUID, payload: ImportJobCreate) -> ImportJobRead:
        if payload.target_project_id is not None and not await self.repository.project_exists(
            organization_id=organization_id,
            project_id=payload.target_project_id,
        ):
            raise ValueError("Target project not found for this organization.")
        mapping_json: dict[str, object] = {"columns": [item.model_dump() for item in payload.mapping]}
        summary_json: dict[str, object] = {
            "valid_rows": payload.total_rows,
            "error_rows": 0,
            "duplicate_rows": 0,
            "partial_import_supported": True,
        }
        job = await self.repository.create_import_job(
            organization_id=organization_id,
            created_by_user_id=user_id,
            dataset_type=payload.dataset_type,
            source_name=payload.source_name,
            source_format=payload.source_format,
            total_rows=payload.total_rows,
            mapping_json=mapping_json,
            summary_json=summary_json,
            target_project_id=payload.target_project_id,
            target_mode=payload.target_mode,
            source_system=payload.source_system,
            import_reason=payload.import_reason,
        )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="data_import.created",
                source_module="data",
                summary=f"{payload.source_name} is mapped into {payload.dataset_type} workflows.",
                priority="high" if job.error_rows else "normal",
                payload={"dataset_type": payload.dataset_type, "rows": payload.total_rows, "status": job.status},
            ),
        )
        await self.session.commit()
        await event_publisher.publish("data_import.created", {"organization_id": str(organization_id), "import_job_id": str(job.id)})
        return ImportJobRead.model_validate(job)

    async def upload_import_file(
        self,
        organization_id: UUID,
        user_id: UUID,
        *,
        dataset_type: str,
        filename: str,
        content: bytes,
        target_project_id: UUID | None = None,
        target_mode: str = "existing_project",
        source_system: str = "Uploaded File",
        import_reason: str | None = None,
    ) -> ImportUploadResponse:
        if target_project_id is not None and not await self.repository.project_exists(
            organization_id=organization_id,
            project_id=target_project_id,
        ):
            raise ValueError("Target project not found for this organization.")
        source_format, columns, rows = parse_uploaded_dataset(filename, content)
        mapping = infer_mapping(dataset_type, columns)
        issues = validate_sample_rows(dataset_type, rows[:100], mapping)
        issue_counts_by_row: dict[int, int] = {}
        for issue in issues:
            issue_counts_by_row[issue.row_number] = issue_counts_by_row.get(issue.row_number, 0) + 1
        error_rows = len({issue.row_number for issue in issues if issue.severity == "error"})
        duplicate_rows = len({issue.row_number for issue in issues if issue.issue_type == "duplicate_row"})
        payload = ImportJobCreate(
            dataset_type=dataset_type,
            source_name=filename,
            source_format=source_format,
            total_rows=len(rows),
            mapping=mapping,
            target_project_id=target_project_id,
            target_mode=target_mode,
            source_system=source_system,
            import_reason=import_reason,
        )
        job = await self.repository.create_import_job(
            organization_id=organization_id,
            created_by_user_id=user_id,
            dataset_type=payload.dataset_type,
            source_name=payload.source_name,
            source_format=payload.source_format,
            total_rows=payload.total_rows,
            mapping_json={"columns": [item.model_dump() for item in mapping]},
            summary_json={
                "valid_rows": max(0, len(rows) - error_rows),
                "error_rows": error_rows,
                "duplicate_rows": duplicate_rows,
                "partial_import_supported": True,
                "target_mode": target_mode,
                "source_system": source_system,
            },
            target_project_id=target_project_id,
            target_mode=target_mode,
            source_system=source_system,
            import_reason=import_reason,
        )
        await self.repository.create_import_rows(
            organization_id=organization_id,
            import_job_id=job.id,
            rows=rows,
            issue_counts_by_row=issue_counts_by_row,
        )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="data_import.uploaded",
                source_module="data",
                summary=f"{filename} uploaded with {len(rows)} editable rows.",
                priority="high" if error_rows else "normal",
                payload={"dataset_type": dataset_type, "format": source_format, "rows": len(rows)},
            ),
        )
        await self.session.commit()
        return ImportUploadResponse(
            job=ImportJobRead.model_validate(job),
            columns=columns,
            preview_rows=rows[:20],
            issues=issues,
        )

    async def list_import_jobs(self, organization_id: UUID) -> list[ImportJobRead]:
        jobs = await self.repository.list_import_jobs(organization_id)
        return [ImportJobRead.model_validate(job) for job in jobs]

    async def import_error_report(self, organization_id: UUID, import_job_id: UUID) -> ImportErrorReportRead:
        job = await self.repository.get_import_job(organization_id=organization_id, import_job_id=import_job_id)
        if job is None:
            raise KeyError("Import job not found")
        rows = await self.repository.list_import_rows(organization_id=organization_id, import_job_id=import_job_id)
        errors: list[ImportValidationIssue] = []
        warnings: list[ImportValidationIssue] = []
        for row in rows:
            if row.issue_count <= 0:
                continue
            issue = ImportValidationIssue(
                row_number=row.row_number,
                field_name=None,
                issue_type="row_validation",
                severity="error" if row.validation_status == "needs_fixes" else "warning",
                message="This row needs review before it can be imported.",
                suggested_fix="Open the row, correct mapped values, then re-run validation.",
            )
            if issue.severity == "error":
                errors.append(issue)
            else:
                warnings.append(issue)
        return ImportErrorReportRead(
            import_batch_id=job.id,
            file_name=job.source_name,
            status=job.status,
            errors=errors,
            warnings=warnings,
        )

    async def list_import_rows(self, organization_id: UUID, import_job_id: UUID) -> list[ImportRowRead]:
        rows = await self.repository.list_import_rows(organization_id=organization_id, import_job_id=import_job_id)
        return [
            ImportRowRead(
                id=row.id,
                import_job_id=row.import_job_id,
                row_number=row.row_number,
                row_data=row.row_data_json,
                edited_data=row.edited_data_json,
                validation_status=row.validation_status,
                issue_count=row.issue_count,
                version=row.version,
            )
            for row in rows
        ]

    async def update_import_row(
        self,
        organization_id: UUID,
        import_job_id: UUID,
        row_id: UUID,
        payload: ImportRowUpdate,
    ) -> ImportRowRead:
        row = await self.repository.update_import_row(
            organization_id=organization_id,
            import_job_id=import_job_id,
            row_id=row_id,
            changes=payload.changes,
            expected_version=payload.expected_version,
        )
        if row is None:
            raise KeyError("Import row not found")
        await self.session.commit()
        return ImportRowRead(
            id=row.id,
            import_job_id=row.import_job_id,
            row_number=row.row_number,
            row_data=row.row_data_json,
            edited_data=row.edited_data_json,
            validation_status=row.validation_status,
            issue_count=row.issue_count,
            version=row.version,
        )

    async def confirm_import_job(
        self,
        organization_id: UUID,
        user_id: UUID,
        import_job_id: UUID,
        payload: ImportConfirmRequest,
    ) -> ImportApplyResponse:
        job = await self.repository.get_import_job(organization_id=organization_id, import_job_id=import_job_id)
        if job is None:
            raise KeyError("Import job not found")
        if job.error_rows > 0 and not payload.acknowledge_warnings:
            raise ValueError("Review import errors or acknowledge warnings before confirming this import.")
        job.import_reason = payload.reason
        job.confirmation_json = {
            "confirmed_by_user_id": str(user_id),
            "confirmed_at": datetime.now(UTC).isoformat(),
            "acknowledge_warnings": payload.acknowledge_warnings,
        }
        job.status = "processing"
        await self.session.flush()
        return await self.apply_import_job(organization_id, user_id, import_job_id)

    async def rollback_import_job(
        self,
        organization_id: UUID,
        user_id: UUID,
        import_job_id: UUID,
        payload: ImportRollbackRequest,
    ) -> ImportRollbackRead:
        job = await self.repository.get_import_job(organization_id=organization_id, import_job_id=import_job_id)
        if job is None:
            raise KeyError("Import job not found")
        if not payload.confirm:
            raise ValueError("Rollback requires confirmation.")
        rolled_back_records = int(job.successful_records or 0)
        skipped_records = int(job.skipped_records or 0)
        job.status = "rolled_back"
        job.rollback_available = False
        job.summary_json = {
            **job.summary_json,
            "rollback_reason": payload.reason,
            "rolled_back_by_user_id": str(user_id),
            "rolled_back_at": datetime.now(UTC).isoformat(),
            "rollback_mode": "safe_status_only",
        }
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="data_import.rolled_back",
                source_module="data",
                summary=f"Import batch {job.source_name} was marked rolled back.",
                priority="high",
                payload={"import_job_id": str(job.id), "reason": payload.reason},
            ),
        )
        await self.session.commit()
        return ImportRollbackRead(
            job=ImportJobRead.model_validate(job),
            rolled_back_records=rolled_back_records,
            skipped_records=skipped_records,
            message="Rollback recorded. Imported records are preserved for audit; follow-up cleanup can be reviewed from Governance audit trail.",
        )

    async def apply_import_job(self, organization_id: UUID, user_id: UUID, import_job_id: UUID) -> ImportApplyResponse:
        job = await self.repository.get_import_job(organization_id=organization_id, import_job_id=import_job_id)
        if job is None:
            raise KeyError("Import job not found")
        if job.target_project_id is not None and not await self.repository.project_exists(
            organization_id=organization_id,
            project_id=job.target_project_id,
        ):
            raise ValueError("Target project not found for this organization.")
        supported_apply_types = {"beneficiaries", "entity_registry", "programs", "projects", "indicators", "cases", "assets", "organization_units"}
        if job.dataset_type not in supported_apply_types:
            raise ValueError(f"{job.dataset_type.replace('_', ' ').title()} imports can be previewed and cleaned, but cannot be applied to live records yet")

        rows = await self.repository.list_import_rows(organization_id=organization_id, import_job_id=import_job_id)
        mapping = import_mapping_by_source(job.mapping_json)
        created_records = 0
        updated_records = 0
        skipped_rows = 0

        for row in rows:
            if row.validation_status in {"needs_fixes", "conflict"} or row.issue_count > 0:
                skipped_rows += 1
                continue
            mapped = mapped_row_values(row.edited_data_json, mapping)
            target_type = job.dataset_type.rstrip("s")
            target_id: str | None = None
            project_id: UUID | None = None
            values: dict[str, object] | None = None

            if job.dataset_type in {"beneficiaries", "entity_registry"}:
                if job.target_project_id is None:
                    skipped_rows += 1
                    continue
                values = beneficiary_values_from_import_row(mapped)
                if values is None:
                    skipped_rows += 1
                    continue
                values["project_id"] = job.target_project_id
                existing_beneficiary = await self.repository.get_beneficiary_by_uid(
                    organization_id=organization_id,
                    beneficiary_uid=cast(str, values["beneficiary_uid"]),
                )
                if existing_beneficiary is None:
                    beneficiary = await self.repository.create_beneficiary(organization_id=organization_id, values=values)
                    created_records += 1
                else:
                    beneficiary = await self.repository.update_beneficiary(existing_beneficiary, values)
                    updated_records += 1
                mark_record_as_imported(beneficiary, job=job, user_id=user_id, row_number=row.row_number)
                target_type = "beneficiary"
                target_id = str(beneficiary.id)
                project_id = beneficiary.project_id
            elif job.dataset_type in {"programs", "projects"}:
                values = program_values_from_import_row(mapped)
                if values is None:
                    skipped_rows += 1
                    continue
                existing_program = await self.repository.get_program_by_slug(
                    organization_id=organization_id,
                    slug=cast(str, values["slug"]),
                )
                if existing_program is None:
                    program = await self.repository.create_program(
                        organization_id=organization_id,
                        name=cast(str, values["name"]),
                        slug=cast(str, values["slug"]),
                        region=cast(str | None, values.get("region")),
                    )
                    created_records += 1
                else:
                    program = await self.repository.update_program(existing_program, values)
                    updated_records += 1
                mark_record_as_imported(program, job=job, user_id=user_id, row_number=row.row_number)
                target_type = "program"
                target_id = str(program.id)
                project_id = program.id
            elif job.dataset_type == "indicators":
                values = indicator_values_from_import_row(mapped)
                if values is None:
                    skipped_rows += 1
                    continue
                existing_indicator = await self.repository.get_indicator_by_code(
                    organization_id=organization_id,
                    code=cast(str, values["code"]),
                )
                if existing_indicator is None:
                    indicator = await self.repository.create_indicator(organization_id=organization_id, values=values)
                    created_records += 1
                else:
                    indicator = await self.repository.update_indicator(existing_indicator, values)
                    updated_records += 1
                mark_record_as_imported(indicator, job=job, user_id=user_id, row_number=row.row_number)
                target_type = "indicator"
                target_id = str(indicator.id)
                project_id = indicator.project_id
            elif job.dataset_type == "cases":
                values = case_values_from_import_row(mapped)
                if values is None:
                    skipped_rows += 1
                    continue
                existing_case = await self.repository.get_case_by_number(
                    organization_id=organization_id,
                    case_number=cast(str, values["case_number"]),
                )
                if existing_case is None:
                    case = await self.repository.create_case(organization_id=organization_id, values=values)
                    created_records += 1
                else:
                    case = await self.repository.update_case(existing_case, values)
                    updated_records += 1
                mark_record_as_imported(case, job=job, user_id=user_id, row_number=row.row_number)
                target_type = "case"
                target_id = str(case.id)
                project_id = case.project_id
            elif job.dataset_type == "assets":
                values = asset_values_from_import_row(mapped)
                if values is None:
                    skipped_rows += 1
                    continue
                existing_asset = await self.repository.get_asset_by_code(
                    organization_id=organization_id,
                    asset_code=cast(str, values["asset_code"]),
                )
                if existing_asset is None:
                    asset = await self.repository.create_enterprise_record(
                        OperationalAsset,
                        organization_id=organization_id,
                        values=values,
                    )
                    created_records += 1
                else:
                    asset = await self.repository.update_asset(existing_asset, values)
                    updated_records += 1
                mark_record_as_imported(asset, job=job, user_id=user_id, row_number=row.row_number)
                target_type = "asset"
                target_id = str(asset.id)
                project_id = asset.project_id
            elif job.dataset_type == "organization_units":
                values = organization_unit_values_from_import_row(mapped)
                if values is None:
                    skipped_rows += 1
                    continue
                existing_unit = await self.repository.get_organizational_unit_by_code(
                    organization_id=organization_id,
                    code=cast(str, values["code"]),
                )
                if existing_unit is None:
                    unit = await self.repository.create_enterprise_record(
                        OrganizationalUnit,
                        organization_id=organization_id,
                        values=values,
                    )
                    created_records += 1
                else:
                    unit = await self.repository.update_organizational_unit(existing_unit, values)
                    updated_records += 1
                mark_record_as_imported(unit, job=job, user_id=user_id, row_number=row.row_number)
                target_type = "organization_unit"
                target_id = str(unit.id)

            if target_id is None:
                skipped_rows += 1
                continue

            await self.repository.upsert_operational_link(
                organization_id=organization_id,
                source_type="data_import",
                source_id=str(job.id),
                target_type=target_type,
                target_id=target_id,
                relationship_type="applied_to",
                project_id=project_id,
                metadata_json={"source_name": job.source_name, "row_number": row.row_number},
            )

        status = "applied" if created_records or updated_records else "needs_fixes"
        job = await self.repository.update_import_job_summary(
            job,
            status="completed" if status == "applied" and skipped_rows == 0 else ("completed_with_errors" if status == "applied" else status),
            summary_updates={
                "created_records": created_records,
                "updated_records": updated_records,
                "skipped_rows": skipped_rows,
                "applied_by_user_id": str(user_id),
                "completed_at": datetime.now(UTC).isoformat(),
            },
        )
        job.completed_at = datetime.now(UTC)
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="data_import.applied",
                source_module="data",
                summary=f"{job.source_name} applied to {job.dataset_type.replace('_', ' ')} records.",
                priority="normal" if skipped_rows == 0 else "high",
                payload={
                    "dataset_type": job.dataset_type,
                    "created_records": created_records,
                    "updated_records": updated_records,
                    "skipped_rows": skipped_rows,
                },
            ),
        )
        await self.session.commit()
        await event_publisher.publish(
            "data_import.applied",
            {"organization_id": str(organization_id), "import_job_id": str(job.id), "dataset_type": job.dataset_type},
        )
        changed = created_records + updated_records
        return ImportApplyResponse(
            job=ImportJobRead.model_validate(job),
            created_records=created_records,
            updated_records=updated_records,
            skipped_rows=skipped_rows,
            dataset_type=job.dataset_type,
            message=f"Applied {changed} {job.dataset_type.replace('_', ' ')} record{'s' if changed != 1 else ''}.",
        )

    async def create_mapping_template(self, organization_id: UUID, payload: MappingTemplateCreate) -> None:
        mapping_json: dict[str, object] = {"columns": [item.model_dump() for item in payload.mapping]}
        await self.repository.create_mapping_template(
            organization_id=organization_id,
            name=payload.name,
            dataset_type=payload.dataset_type,
            mapping_json=mapping_json,
            is_default=payload.is_default,
        )
        await self.session.commit()

    async def create_export_job(self, organization_id: UUID, user_id: UUID, payload: ExportJobCreate) -> ExportJobRead:
        job = await self.repository.create_export_job(
            organization_id=organization_id,
            requested_by_user_id=user_id,
            dataset_type=payload.dataset_type,
            export_format=payload.export_format,
            filtered_view_json=payload.filtered_view,
            scheduled=payload.scheduled,
        )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="data_export.queued",
                source_module="reporting",
                summary=f"{payload.dataset_type} export queued for reports, GIS, or partner systems.",
                payload={"dataset_type": payload.dataset_type, "format": payload.export_format, "scheduled": payload.scheduled},
            ),
        )
        await self.session.commit()
        await event_publisher.publish("data_export.queued", {"organization_id": str(organization_id), "export_job_id": str(job.id)})
        return ExportJobRead.model_validate(job)

    async def list_export_jobs(self, organization_id: UUID) -> list[ExportJobRead]:
        jobs = await self.repository.list_export_jobs(organization_id)
        return [ExportJobRead.model_validate(job) for job in jobs]

    async def create_public_collection_link(
        self,
        organization_id: UUID,
        user_id: UUID,
        payload: PublicCollectionLinkCreate,
    ) -> PublicCollectionLinkRead:
        link = await self.repository.create_public_collection_link(
            organization_id=organization_id,
            created_by_user_id=user_id,
            values=payload.model_dump(),
        )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="public_collection_link.created",
                source_module="forms",
                summary=f"Public collection link {payload.slug} is ready for controlled web collection.",
                payload={
                    "form_id": str(payload.form_id),
                    "access_mode": payload.access_mode,
                    "require_authentication": payload.require_authentication,
                    "allow_offline_web": payload.allow_offline_web,
                },
            ),
        )
        await self.session.commit()
        await event_publisher.publish("public_collection_link.created", {"organization_id": str(organization_id), "link_id": str(link.id)})
        return self.to_public_collection_link_read(link)

    async def list_public_collection_links(self, organization_id: UUID) -> list[PublicCollectionLinkRead]:
        links = await self.repository.list_public_collection_links(organization_id)
        return [self.to_public_collection_link_read(link) for link in links]

    async def create_media_evidence(self, organization_id: UUID, user_id: UUID, payload: MediaEvidenceCreate) -> MediaEvidenceRead:
        evidence = await self.repository.create_media_evidence(
            organization_id=organization_id,
            uploaded_by_user_id=user_id,
            values=payload.model_dump(),
        )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="media_evidence.created",
                source_module="media",
                submission_id=payload.submission_id,
                beneficiary_id=payload.beneficiary_id,
                summary=f"{payload.media_type.title()} evidence uploaded for review.",
                payload={"file_name": payload.file_name, "size_bytes": payload.size_bytes, "mime_type": payload.mime_type},
            ),
        )
        await self.session.commit()
        await event_publisher.publish("media_evidence.created", {"organization_id": str(organization_id), "media_id": str(evidence.id)})
        return MediaEvidenceRead.model_validate(evidence)

    async def list_media_evidence(self, organization_id: UUID) -> list[MediaEvidenceRead]:
        evidence = await self.repository.list_media_evidence(organization_id)
        return [MediaEvidenceRead.model_validate(item) for item in evidence]

    async def create_bulk_edit_batch(self, organization_id: UUID, user_id: UUID, payload: BulkEditRequest) -> BulkEditRead:
        change_set: dict[str, object] = {
            "record_ids": payload.record_ids,
            "changes": payload.changes,
            "expected_version": payload.expected_version,
            "conflict_strategy": "review_before_apply",
        }
        batch = await self.repository.create_bulk_edit_batch(
            organization_id=organization_id,
            edited_by_user_id=user_id,
            dataset_type=payload.dataset_type,
            total_records=len(payload.record_ids),
            change_set_json=change_set,
        )
        await self.record_operational_event(
            organization_id=organization_id,
            actor_user_id=user_id,
            payload=OperationalEventCreate(
                event_type="bulk_edit.created",
                source_module="data",
                summary=f"{len(payload.record_ids)} {payload.dataset_type} records are staged for connected workflow updates.",
                priority="high" if len(payload.record_ids) > 100 else "normal",
                payload={"dataset_type": payload.dataset_type, "records": len(payload.record_ids)},
            ),
        )
        await self.session.commit()
        await event_publisher.publish("bulk_edit.created", {"organization_id": str(organization_id), "batch_id": str(batch.id)})
        return BulkEditRead.model_validate(batch)

    @staticmethod
    def to_public_collection_link_read(link: object) -> PublicCollectionLinkRead:
        slug = str(getattr(link, "slug"))
        return PublicCollectionLinkRead(
            id=getattr(link, "id"),
            form_id=getattr(link, "form_id"),
            slug=slug,
            title=str(getattr(link, "title")),
            description=getattr(link, "description"),
            access_mode=str(getattr(link, "access_mode")),
            status=str(getattr(link, "status")),
            require_authentication=bool(getattr(link, "require_authentication")),
            allow_offline_web=bool(getattr(link, "allow_offline_web")),
            expires_at=getattr(link, "expires_at"),
            allowed_domains=list(getattr(link, "allowed_domains")),
            permission_json=dict(getattr(link, "permission_json")),
            submission_count=int(getattr(link, "submission_count")),
            public_url=f"/collect/{slug}",
        )

    async def record_operational_event(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID | None,
        payload: OperationalEventCreate,
    ) -> OperationalEventRead:
        effects = [effect.model_dump() for effect in self.effects_for_event(payload)]
        event = await self.repository.create_operational_event(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            event_type=payload.event_type,
            source_module=payload.source_module,
            summary=payload.summary,
            effects=effects,
            project_id=payload.project_id,
            beneficiary_id=payload.beneficiary_id,
            submission_id=payload.submission_id,
            priority=payload.priority,
            payload_json=payload.payload,
        )
        if payload.project_id and payload.beneficiary_id:
            await self.repository.upsert_operational_link(
                organization_id=organization_id,
                project_id=payload.project_id,
                source_type="project",
                source_id=str(payload.project_id),
                target_type="beneficiary",
                target_id=str(payload.beneficiary_id),
                relationship_type="operational_context",
            )
        if payload.priority in {"high", "urgent"} or any(effect["module"] == "approvals" for effect in effects):
            await self.repository.create_workflow_queue_item(
                organization_id=organization_id,
                project_id=payload.project_id,
                beneficiary_id=payload.beneficiary_id,
                submission_id=payload.submission_id,
                queue_type="supervisor_review",
                trigger_event_type=payload.event_type,
                title=payload.summary,
                next_action=self.next_action_for_event(payload.event_type),
                priority=payload.priority,
                context_json=payload.payload,
            )
        return OperationalEventRead.model_validate(event)

    async def ecosystem(self, organization_id: UUID) -> OperationalEcosystemRead:
        beneficiaries = await self.repository.count(Beneficiary, organization_id)
        projects = await self.repository.count(Project, organization_id)
        indicators = await self.repository.count(MonitoringIndicator, organization_id)
        forms = await self.repository.count_forms(organization_id)
        submissions = await self.repository.count_submissions(organization_id)
        officers = await self.repository.count_field_officers(organization_id)
        cases = await self.repository.count_open_cases(organization_id)
        quality_flags = await self.repository.count(DataQualitySignal, organization_id)
        tasks = await self.repository.count_enterprise(OperationalTask, organization_id)
        interventions = await self.repository.count_enterprise(InterventionRecord, organization_id)
        assets = await self.repository.count_enterprise(OperationalAsset, organization_id)
        documents = await self.repository.count_enterprise(KnowledgeDocument, organization_id)
        workflows = await self.repository.count_enterprise(WorkflowDefinition, organization_id)
        units = await self.repository.count_enterprise(OrganizationalUnit, organization_id)
        recent_events = [OperationalEventRead.model_validate(event) for event in await self.repository.list_recent_events(organization_id)]
        workflow_queue = [WorkflowQueueItemRead.model_validate(item) for item in await self.repository.list_workflow_queue(organization_id)]
        nodes = [
            EcosystemNode(id="organization", label="Organization", node_type="tenant", status="active", count=1),
            EcosystemNode(id="units", label="Departments & Regions", node_type="governance", status="active", count=units),
            EcosystemNode(id="projects", label="Programs & Projects", node_type="program", status="active", count=projects),
            EcosystemNode(id="indicators", label="Indicators & Targets", node_type="indicator", status="active", count=indicators),
            EcosystemNode(id="workflows", label="Approval Workflows", node_type="workflow", status="active", count=workflows),
            EcosystemNode(id="field-team", label="Field Officers", node_type="team", status="active", count=officers),
            EcosystemNode(id="beneficiaries", label="Beneficiaries", node_type="beneficiary", status="active", count=beneficiaries),
            EcosystemNode(id="forms", label="Forms & Surveys", node_type="form", status="active", count=forms),
            EcosystemNode(id="submissions", label="Field Submissions", node_type="submission", status="active", count=submissions),
            EcosystemNode(id="tasks", label="Tasks & Interventions", node_type="task", status="attention" if tasks else "healthy", count=tasks + interventions),
            EcosystemNode(id="assets", label="Assets & Documents", node_type="resource", status="active", count=assets + documents),
            EcosystemNode(id="quality", label="Validation & Approval", node_type="workflow", status="attention" if quality_flags else "healthy", count=quality_flags),
            EcosystemNode(id="reports", label="Analytics & Reporting", node_type="report", status="active", count=indicators + submissions),
            EcosystemNode(id="follow-ups", label="Interventions & Follow-ups", node_type="case", status="attention" if cases else "healthy", count=cases),
        ]
        edges = [
            EcosystemEdge(source="organization", target="projects", label="funds and governs"),
            EcosystemEdge(source="organization", target="units", label="delegates accountability"),
            EcosystemEdge(source="units", target="projects", label="owns regional delivery"),
            EcosystemEdge(source="projects", target="indicators", label="sets targets"),
            EcosystemEdge(source="projects", target="workflows", label="configures approvals"),
            EcosystemEdge(source="projects", target="field-team", label="assigns teams"),
            EcosystemEdge(source="projects", target="beneficiaries", label="enrolls people"),
            EcosystemEdge(source="projects", target="assets", label="allocates resources"),
            EcosystemEdge(source="beneficiaries", target="forms", label="drives data needs"),
            EcosystemEdge(source="forms", target="submissions", label="captures transactions"),
            EcosystemEdge(source="submissions", target="quality", label="triggers validation"),
            EcosystemEdge(source="quality", target="tasks", label="opens corrective work"),
            EcosystemEdge(source="tasks", target="follow-ups", label="delivers interventions"),
            EcosystemEdge(source="quality", target="reports", label="approves trusted data"),
            EcosystemEdge(source="reports", target="follow-ups", label="guides action"),
        ]
        attention_items = [
            "Quality flags feed supervisor review queues automatically." if quality_flags else "No open quality flags are blocking approvals.",
            "Open cases remain linked to beneficiary and project context." if cases else "No open follow-up cases are waiting.",
            "Tasks and interventions are connected to beneficiaries, officers, and projects." if tasks or interventions else "No operational tasks are currently open.",
            "Recent events are available for dashboards and reporting." if recent_events else "No operational events recorded yet.",
        ]
        return OperationalEcosystemRead(nodes=nodes, edges=edges, recent_events=recent_events, workflow_queue=workflow_queue, attention_items=attention_items)

    @staticmethod
    def effects_for_event(payload: OperationalEventCreate) -> list[OperationalEffect]:
        defaults = [
            OperationalEffect(module="dashboards", action="refresh", status="queued", detail="Update operational overview and project dashboard."),
            OperationalEffect(module="analytics", action="recalculate", status="queued", detail="Refresh trends, counts, and risk signals."),
            OperationalEffect(module="reporting", action="invalidate_cache", status="queued", detail="Ensure donor reports read the latest trusted data."),
        ]
        event_effects: dict[str, list[OperationalEffect]] = {
            "beneficiary.enrolled": [
                OperationalEffect(module="geospatial", action="update_layer", detail="Add beneficiary point to coverage maps."),
                OperationalEffect(module="field_operations", action="sync_profile", detail="Prepare beneficiary profile for offline mobile sync."),
            ],
            "org_unit.created": [
                OperationalEffect(module="governance", action="refresh_hierarchy", detail="Update regional accountability and reporting filters."),
                OperationalEffect(module="rbac", action="scope_access", detail="Prepare regional data isolation and approval routing."),
            ],
            "workflow.configured": [
                OperationalEffect(module="approvals", action="apply_workflow", detail="Use configured approval steps for new review items."),
                OperationalEffect(module="sla", action="start_tracking", detail="Enable escalation timing for this workflow."),
            ],
            "task.assigned": [
                OperationalEffect(module="notifications", action="notify_assignee", detail="Notify the responsible officer or supervisor."),
                OperationalEffect(module="field_operations", action="sync_task", detail="Queue the task for offline mobile availability."),
            ],
            "intervention.planned": [
                OperationalEffect(module="beneficiaries", action="append_history", detail="Add intervention to the beneficiary longitudinal profile."),
                OperationalEffect(module="finance", action="reserve_budget", detail="Connect intervention cost to project budget utilization."),
            ],
            "asset.registered": [
                OperationalEffect(module="field_operations", action="update_resources", detail="Make asset availability visible to project teams."),
                OperationalEffect(module="compliance", action="track_custody", detail="Start asset custody and audit history."),
            ],
            "budget.allocated": [
                OperationalEffect(module="finance", action="refresh_utilization", detail="Update budget utilization and donor reporting."),
                OperationalEffect(module="interventions", action="check_funding", detail="Expose budget availability to intervention planning."),
            ],
            "document.attached": [
                OperationalEffect(module="knowledge", action="index_document", detail="Attach document to project or beneficiary context."),
                OperationalEffect(module="approvals", action="include_evidence", detail="Make supporting evidence visible in review workflows."),
            ],
            "case.opened": [
                OperationalEffect(module="approvals", action="route_to_supervisor", detail="Add follow-up to the supervisor queue."),
                OperationalEffect(module="notifications", action="notify_owner", detail="Notify the assigned team about the next action."),
            ],
            "data_import.created": [
                OperationalEffect(module="data_quality", action="validate_rows", detail="Check duplicates, missing fields, and reference consistency."),
                OperationalEffect(module="workflows", action="prepare_conflict_review", detail="Create review tasks for risky imported records."),
            ],
            "bulk_edit.created": [
                OperationalEffect(module="audit", action="track_version", detail="Store rollback metadata before connected records change."),
                OperationalEffect(module="sync", action="queue_delta", detail="Prepare offline devices to receive changed records."),
            ],
        }
        return [*defaults, *event_effects.get(payload.event_type, [])]

    @staticmethod
    def next_action_for_event(event_type: str) -> str:
        return {
            "case.opened": "Review case owner, due date, and beneficiary history.",
            "data_import.created": "Resolve validation issues before applying imported records.",
            "bulk_edit.created": "Approve or reject the staged bulk changes.",
        }.get(event_type, "Review the operational context and choose the next step.")

    @staticmethod
    def to_budget_read(budget: ProjectBudgetLine) -> ProjectBudgetLineRead:
        utilization = 0 if budget.allocated_amount <= 0 else round((budget.spent_amount / budget.allocated_amount) * 100, 1)
        return ProjectBudgetLineRead(
            id=budget.id,
            project_id=budget.project_id,
            category=budget.category,
            allocated_amount=budget.allocated_amount,
            spent_amount=budget.spent_amount,
            currency=budget.currency,
            reporting_code=budget.reporting_code,
            utilization_percent=utilization,
        )

    @staticmethod
    def to_indicator_read(indicator: MonitoringIndicator, calculated_value: float | None = None) -> IndicatorRead:
        current_value = indicator.current_value if calculated_value is None else calculated_value
        progress = _progress_percent(current_value, indicator.baseline_value, indicator.target_value)
        return IndicatorRead(
            id=indicator.id,
            project_id=indicator.project_id,
            survey_id=indicator.survey_id,
            code=indicator.code,
            name=indicator.name,
            description=indicator.description,
            unit=indicator.unit,
            reporting_frequency=indicator.reporting_frequency,
            baseline_value=indicator.baseline_value,
            target_value=indicator.target_value,
            current_value=current_value,
            sdg_code=indicator.sdg_code,
            formula=indicator.formula,
            category=indicator.category,
            disaggregation_fields=indicator.disaggregation_json,
            is_active=indicator.is_active,
            progress_percent=progress,
            calculated_at=datetime.now(UTC) if calculated_value is not None else None,
        )


class FieldPlanningService:
    """Work plans and operational targets for the Field Operations module."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.audit = AuditRepository(session)

    @staticmethod
    def _work_plan_to_read(record: FieldWorkPlan) -> FieldWorkPlanRead:
        return FieldWorkPlanRead(
            id=record.id,
            created_by_user_id=record.created_by_user_id,
            name=record.name,
            project=record.project,
            objectives=record.objectives,
            locations=list(record.locations_json),
            assigned_teams=list(record.assigned_teams_json),
            deliverables=list(record.deliverables_json),
            start_date=record.start_date,
            end_date=record.end_date,
            progress=record.progress,
            view=record.view,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    @staticmethod
    def _target_to_read(
        record: OperationalTargetRecord,
        *,
        achieved_value: int | None = None,
        achieved_source: str = "manual",
    ) -> OperationalTargetRead:
        return OperationalTargetRead(
            id=record.id,
            created_by_user_id=record.created_by_user_id,
            name=record.name,
            target_type=record.target_type,
            project=record.project,
            indicator=record.indicator,
            indicator_id=record.indicator_id,
            team=record.team,
            assigned_staff=list(record.assigned_staff_json),
            target_value=record.target_value,
            achieved_value=achieved_value if achieved_value is not None else record.achieved_value,
            achieved_source=achieved_source,
            deadline=record.deadline,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    async def _get_indicator(
        self, organization_id: UUID, indicator_id: UUID
    ) -> MonitoringIndicator | None:
        result = await self.session.execute(
            select(MonitoringIndicator).where(
                MonitoringIndicator.organization_id == organization_id,
                MonitoringIndicator.id == indicator_id,
                MonitoringIndicator.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def _target_with_live_achievement(
        self, organization_id: UUID, record: OperationalTargetRecord
    ) -> OperationalTargetRead:
        if record.indicator_id is None:
            return self._target_to_read(record)
        indicator = await self._get_indicator(organization_id, record.indicator_id)
        if indicator is None:
            return self._target_to_read(record)
        calculated = await OperationsService(self.session).calculate_indicator_current_value(
            organization_id, indicator
        )
        value = calculated if calculated is not None else indicator.current_value
        return self._target_to_read(
            record,
            achieved_value=int(round(value)),
            achieved_source="indicator",
        )

    async def list_work_plans(self, organization_id: UUID) -> list[FieldWorkPlanRead]:
        result = await self.session.execute(
            select(FieldWorkPlan)
            .where(
                FieldWorkPlan.organization_id == organization_id,
                FieldWorkPlan.deleted_at.is_(None),
            )
            .order_by(FieldWorkPlan.created_at.desc())
        )
        return [self._work_plan_to_read(record) for record in result.scalars()]

    async def create_work_plan(
        self, *, organization_id: UUID, actor_user_id: UUID, payload: FieldWorkPlanCreate
    ) -> FieldWorkPlanRead:
        record = FieldWorkPlan(
            organization_id=organization_id,
            created_by_user_id=actor_user_id,
            name=payload.name,
            project=payload.project,
            objectives=payload.objectives,
            locations_json=list(payload.locations),
            assigned_teams_json=list(payload.assigned_teams),
            deliverables_json=list(payload.deliverables),
            start_date=payload.start_date,
            end_date=payload.end_date,
            progress=0,
            view=payload.view,
        )
        self.session.add(record)
        await self.session.flush()
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="field_work_plan.created",
            resource_type="field_work_plan",
            resource_id=str(record.id),
            metadata={"name": record.name, "project": record.project},
        )
        return self._work_plan_to_read(record)

    async def update_work_plan(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        work_plan_id: UUID,
        payload: FieldWorkPlanUpdate,
    ) -> FieldWorkPlanRead:
        result = await self.session.execute(
            select(FieldWorkPlan).where(
                FieldWorkPlan.organization_id == organization_id,
                FieldWorkPlan.id == work_plan_id,
                FieldWorkPlan.deleted_at.is_(None),
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise LookupError("Work plan not found")
        changed: list[str] = []
        for field in ("name", "project", "objectives", "start_date", "end_date", "progress", "view"):
            value = getattr(payload, field)
            if value is not None and getattr(record, field) != value:
                setattr(record, field, value)
                changed.append(field)
        if payload.locations is not None:
            record.locations_json = list(payload.locations)
            changed.append("locations")
        if payload.assigned_teams is not None:
            record.assigned_teams_json = list(payload.assigned_teams)
            changed.append("assigned_teams")
        if payload.deliverables is not None:
            record.deliverables_json = list(payload.deliverables)
            changed.append("deliverables")
        await self.session.flush()
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="field_work_plan.updated",
            resource_type="field_work_plan",
            resource_id=str(record.id),
            metadata={"changed_fields": changed},
        )
        return self._work_plan_to_read(record)

    async def list_targets(self, organization_id: UUID) -> list[OperationalTargetRead]:
        result = await self.session.execute(
            select(OperationalTargetRecord)
            .where(
                OperationalTargetRecord.organization_id == organization_id,
                OperationalTargetRecord.deleted_at.is_(None),
            )
            .order_by(OperationalTargetRecord.created_at.desc())
        )
        return [
            await self._target_with_live_achievement(organization_id, record)
            for record in result.scalars()
        ]

    async def create_target(
        self, *, organization_id: UUID, actor_user_id: UUID, payload: OperationalTargetCreate
    ) -> OperationalTargetRead:
        indicator_name = payload.indicator
        if payload.indicator_id is not None:
            linked = await self._get_indicator(organization_id, payload.indicator_id)
            if linked is None:
                raise LookupError("Linked indicator not found")
            indicator_name = indicator_name or linked.name
        record = OperationalTargetRecord(
            organization_id=organization_id,
            created_by_user_id=actor_user_id,
            indicator_id=payload.indicator_id,
            name=payload.name,
            target_type=payload.target_type,
            project=payload.project,
            indicator=indicator_name,
            team=payload.team,
            assigned_staff_json=list(payload.assigned_staff),
            target_value=payload.target_value,
            achieved_value=0,
            deadline=payload.deadline,
        )
        self.session.add(record)
        await self.session.flush()
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="operational_target.created",
            resource_type="operational_target",
            resource_id=str(record.id),
            metadata={
                "name": record.name,
                "target_value": record.target_value,
                "indicator_id": str(record.indicator_id) if record.indicator_id else None,
            },
        )
        return await self._target_with_live_achievement(organization_id, record)

    async def update_target(
        self,
        *,
        organization_id: UUID,
        actor_user_id: UUID,
        target_id: UUID,
        payload: OperationalTargetUpdate,
    ) -> OperationalTargetRead:
        result = await self.session.execute(
            select(OperationalTargetRecord).where(
                OperationalTargetRecord.organization_id == organization_id,
                OperationalTargetRecord.id == target_id,
                OperationalTargetRecord.deleted_at.is_(None),
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise LookupError("Operational target not found")
        changed: list[str] = []
        if payload.indicator_id is not None:
            if await self._get_indicator(organization_id, payload.indicator_id) is None:
                raise LookupError("Linked indicator not found")
            if record.indicator_id != payload.indicator_id:
                record.indicator_id = payload.indicator_id
                changed.append("indicator_id")
        for field in (
            "name",
            "target_type",
            "project",
            "indicator",
            "team",
            "target_value",
            "achieved_value",
            "deadline",
        ):
            value = getattr(payload, field)
            if value is not None and getattr(record, field) != value:
                setattr(record, field, value)
                changed.append(field)
        if payload.assigned_staff is not None:
            record.assigned_staff_json = list(payload.assigned_staff)
            changed.append("assigned_staff")
        await self.session.flush()
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="operational_target.updated",
            resource_type="operational_target",
            resource_id=str(record.id),
            metadata={"changed_fields": changed},
        )
        return await self._target_with_live_achievement(organization_id, record)
