import csv
from io import StringIO
from uuid import UUID
from typing import cast

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import event_publisher
from app.models.collection import Project
from app.models.operations import (
    Beneficiary,
    CaseRecord,
    DataQualitySignal,
    DonorReport,
    InterventionRecord,
    KnowledgeDocument,
    MonitoringIndicator,
    OperationalAsset,
    OperationalTask,
    OrganizationalUnit,
    ProjectBudgetLine,
    WorkflowDefinition,
)
from app.repositories.operations import OperationsRepository
from app.repositories.identity import IdentityRepository, OrganizationUnitRepository, RoleRepository
from app.schemas.operations import (
    BeneficiaryCreate,
    BulkEditRead,
    BulkEditRequest,
    CaseCreate,
    DataRouteCreate,
    DataRouteRead,
    DonorReportCreate,
    ExportJobCreate,
    ExportJobRead,
    ImportApplyResponse,
    ImportJobCreate,
    ImportJobRead,
    ImportRowRead,
    ImportRowUpdate,
    ImportUploadResponse,
    ImportPreviewRequest,
    ImportPreviewResponse,
    ImportValidationIssue,
    IndicatorCreate,
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


def indicator_progress(indicator: MonitoringIndicator) -> float:
    if indicator.target_value <= indicator.baseline_value:
        return 0
    progress = ((indicator.current_value - indicator.baseline_value) / (indicator.target_value - indicator.baseline_value)) * 100
    return round(max(0, min(progress, 100)), 1)


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


class OperationsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = OperationsRepository(session)
        self.identity = IdentityRepository(session)
        self.roles = RoleRepository(session)
        self.units = OrganizationUnitRepository(session)

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

    async def create_beneficiary(self, organization_id: UUID, payload: BeneficiaryCreate, actor_user_id: UUID | None = None) -> Beneficiary:
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

    async def list_beneficiaries(self, organization_id: UUID) -> list[Beneficiary]:
        return await self.repository.list_beneficiaries(organization_id)

    async def create_indicator(self, organization_id: UUID, payload: IndicatorCreate, actor_user_id: UUID | None = None) -> IndicatorRead:
        indicator = await self.repository.create_indicator(organization_id=organization_id, values=payload.model_dump())
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

    async def list_indicators(self, organization_id: UUID) -> list[IndicatorRead]:
        indicators = await self.repository.list_indicators(organization_id)
        return [self.to_indicator_read(indicator) for indicator in indicators]

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

    async def create_import_job(self, organization_id: UUID, user_id: UUID, payload: ImportJobCreate) -> ImportJobRead:
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
    ) -> ImportUploadResponse:
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
            },
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

    async def apply_import_job(self, organization_id: UUID, user_id: UUID, import_job_id: UUID) -> ImportApplyResponse:
        job = await self.repository.get_import_job(organization_id=organization_id, import_job_id=import_job_id)
        if job is None:
            raise KeyError("Import job not found")
        supported_apply_types = {"beneficiaries", "programs", "indicators", "cases", "assets", "organization_units"}
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

            if job.dataset_type == "beneficiaries":
                values = beneficiary_values_from_import_row(mapped)
                if values is None:
                    skipped_rows += 1
                    continue
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
                target_type = "beneficiary"
                target_id = str(beneficiary.id)
                project_id = beneficiary.project_id
            elif job.dataset_type == "programs":
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
            status=status,
            summary_updates={
                "created_records": created_records,
                "updated_records": updated_records,
                "skipped_rows": skipped_rows,
                "applied_by_user_id": str(user_id),
            },
        )
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
    def to_indicator_read(indicator: MonitoringIndicator) -> IndicatorRead:
        return IndicatorRead(
            id=indicator.id,
            project_id=indicator.project_id,
            code=indicator.code,
            name=indicator.name,
            description=indicator.description,
            unit=indicator.unit,
            reporting_frequency=indicator.reporting_frequency,
            baseline_value=indicator.baseline_value,
            target_value=indicator.target_value,
            current_value=indicator.current_value,
            sdg_code=indicator.sdg_code,
            formula=indicator.formula,
            is_active=indicator.is_active,
            progress_percent=indicator_progress(indicator),
        )
