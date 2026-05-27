from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import event_publisher
from app.models.collection import Project
from app.models.operations import Beneficiary, CaseRecord, DataQualitySignal, DonorReport, MonitoringIndicator
from app.repositories.operations import OperationsRepository
from app.schemas.operations import (
    BeneficiaryCreate,
    BulkEditRead,
    BulkEditRequest,
    CaseCreate,
    DonorReportCreate,
    ExportJobCreate,
    ExportJobRead,
    ImportJobCreate,
    ImportJobRead,
    ImportPreviewRequest,
    ImportPreviewResponse,
    ImportValidationIssue,
    IndicatorCreate,
    IndicatorRead,
    MappingTemplateCreate,
    OperationsSummary,
    ProgramCreate,
    ColumnMapping,
)


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


class OperationsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = OperationsRepository(session)

    async def create_program(self, organization_id: UUID, payload: ProgramCreate) -> Project:
        program = await self.repository.create_program(
            organization_id=organization_id,
            name=payload.name,
            slug=payload.slug,
            region=payload.region,
        )
        await self.session.commit()
        await event_publisher.publish("program.created", {"organization_id": str(organization_id), "program_id": str(program.id)})
        return program

    async def list_programs(self, organization_id: UUID) -> list[Project]:
        return await self.repository.list_programs(organization_id)

    async def create_beneficiary(self, organization_id: UUID, payload: BeneficiaryCreate) -> Beneficiary:
        beneficiary = await self.repository.create_beneficiary(
            organization_id=organization_id,
            values=payload.model_dump(),
        )
        await self.session.commit()
        await event_publisher.publish(
            "beneficiary.enrolled",
            {"organization_id": str(organization_id), "beneficiary_id": str(beneficiary.id), "type": beneficiary.beneficiary_type},
        )
        return beneficiary

    async def list_beneficiaries(self, organization_id: UUID) -> list[Beneficiary]:
        return await self.repository.list_beneficiaries(organization_id)

    async def create_indicator(self, organization_id: UUID, payload: IndicatorCreate) -> IndicatorRead:
        indicator = await self.repository.create_indicator(organization_id=organization_id, values=payload.model_dump())
        await self.session.commit()
        await event_publisher.publish("indicator.created", {"organization_id": str(organization_id), "indicator_id": str(indicator.id)})
        return self.to_indicator_read(indicator)

    async def list_indicators(self, organization_id: UUID) -> list[IndicatorRead]:
        indicators = await self.repository.list_indicators(organization_id)
        return [self.to_indicator_read(indicator) for indicator in indicators]

    async def create_case(self, organization_id: UUID, payload: CaseCreate) -> CaseRecord:
        case = await self.repository.create_case(organization_id=organization_id, values=payload.model_dump())
        await self.session.commit()
        await event_publisher.publish("case.opened", {"organization_id": str(organization_id), "case_id": str(case.id)})
        return case

    async def list_cases(self, organization_id: UUID) -> list[CaseRecord]:
        return await self.repository.list_cases(organization_id)

    async def create_report(self, organization_id: UUID, payload: DonorReportCreate) -> DonorReport:
        report = await self.repository.create_report(organization_id=organization_id, values=payload.model_dump(mode="json"))
        await self.session.commit()
        await event_publisher.publish("report.created", {"organization_id": str(organization_id), "report_id": str(report.id)})
        return report

    async def list_reports(self, organization_id: UUID) -> list[DonorReport]:
        return await self.repository.list_reports(organization_id)

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
        await self.session.commit()
        await event_publisher.publish("data_import.created", {"organization_id": str(organization_id), "import_job_id": str(job.id)})
        return ImportJobRead.model_validate(job)

    async def list_import_jobs(self, organization_id: UUID) -> list[ImportJobRead]:
        jobs = await self.repository.list_import_jobs(organization_id)
        return [ImportJobRead.model_validate(job) for job in jobs]

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
        await self.session.commit()
        await event_publisher.publish("data_export.queued", {"organization_id": str(organization_id), "export_job_id": str(job.id)})
        return ExportJobRead.model_validate(job)

    async def list_export_jobs(self, organization_id: UUID) -> list[ExportJobRead]:
        jobs = await self.repository.list_export_jobs(organization_id)
        return [ExportJobRead.model_validate(job) for job in jobs]

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
        await self.session.commit()
        await event_publisher.publish("bulk_edit.created", {"organization_id": str(organization_id), "batch_id": str(batch.id)})
        return BulkEditRead.model_validate(batch)

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
