from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collection import Project
from app.models.operations import (
    Beneficiary,
    BulkEditBatch,
    CaseRecord,
    DataExportJob,
    DataImportJob,
    DataMappingTemplate,
    DataQualitySignal,
    DonorReport,
    MonitoringIndicator,
)


def summary_int(summary: dict[str, object], key: str) -> int:
    value = summary.get(key, 0)
    return int(value) if isinstance(value, int | float | str) else 0


class OperationsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_program(self, *, organization_id: UUID, name: str, slug: str, region: str | None) -> Project:
        program = Project(organization_id=organization_id, name=name, slug=slug, region=region)
        self.session.add(program)
        await self.session.flush()
        return program

    async def list_programs(self, organization_id: UUID) -> list[Project]:
        result = await self.session.execute(
            select(Project)
            .where(Project.organization_id == organization_id, Project.deleted_at.is_(None))
            .order_by(Project.updated_at.desc())
        )
        return list(result.scalars())

    async def create_beneficiary(self, *, organization_id: UUID, values: dict[str, object]) -> Beneficiary:
        beneficiary = Beneficiary(organization_id=organization_id, **values)
        self.session.add(beneficiary)
        await self.session.flush()
        return beneficiary

    async def list_beneficiaries(self, organization_id: UUID) -> list[Beneficiary]:
        result = await self.session.execute(
            select(Beneficiary)
            .where(Beneficiary.organization_id == organization_id, Beneficiary.deleted_at.is_(None))
            .order_by(Beneficiary.updated_at.desc())
            .limit(500)
        )
        return list(result.scalars())

    async def create_indicator(self, *, organization_id: UUID, values: dict[str, object]) -> MonitoringIndicator:
        indicator = MonitoringIndicator(organization_id=organization_id, **values)
        self.session.add(indicator)
        await self.session.flush()
        return indicator

    async def list_indicators(self, organization_id: UUID) -> list[MonitoringIndicator]:
        result = await self.session.execute(
            select(MonitoringIndicator)
            .where(MonitoringIndicator.organization_id == organization_id, MonitoringIndicator.deleted_at.is_(None))
            .order_by(MonitoringIndicator.code)
        )
        return list(result.scalars())

    async def create_case(self, *, organization_id: UUID, values: dict[str, object]) -> CaseRecord:
        case = CaseRecord(organization_id=organization_id, **values)
        self.session.add(case)
        await self.session.flush()
        return case

    async def list_cases(self, organization_id: UUID) -> list[CaseRecord]:
        result = await self.session.execute(
            select(CaseRecord)
            .where(CaseRecord.organization_id == organization_id, CaseRecord.deleted_at.is_(None))
            .order_by(CaseRecord.updated_at.desc())
            .limit(300)
        )
        return list(result.scalars())

    async def create_report(self, *, organization_id: UUID, values: dict[str, object]) -> DonorReport:
        report = DonorReport(organization_id=organization_id, **values)
        self.session.add(report)
        await self.session.flush()
        return report

    async def list_reports(self, organization_id: UUID) -> list[DonorReport]:
        result = await self.session.execute(
            select(DonorReport)
            .where(DonorReport.organization_id == organization_id, DonorReport.deleted_at.is_(None))
            .order_by(DonorReport.updated_at.desc())
        )
        return list(result.scalars())

    async def count(self, model: type[Project | Beneficiary | MonitoringIndicator | CaseRecord | DataQualitySignal], organization_id: UUID) -> int:
        query = select(func.count()).select_from(model).where(model.organization_id == organization_id)
        if hasattr(model, "deleted_at"):
            query = query.where(model.deleted_at.is_(None))
        result = await self.session.execute(query)
        return int(result.scalar_one())

    async def count_open_cases(self, organization_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(CaseRecord)
            .where(
                CaseRecord.organization_id == organization_id,
                CaseRecord.deleted_at.is_(None),
                CaseRecord.status.in_(["open", "in_progress", "waiting"]),
            )
        )
        return int(result.scalar_one())

    async def create_import_job(
        self,
        *,
        organization_id: UUID,
        created_by_user_id: UUID,
        dataset_type: str,
        source_name: str,
        source_format: str,
        total_rows: int,
        mapping_json: dict[str, object],
        summary_json: dict[str, object],
    ) -> DataImportJob:
        job = DataImportJob(
            organization_id=organization_id,
            created_by_user_id=created_by_user_id,
            dataset_type=dataset_type,
            source_name=source_name,
            source_format=source_format,
            total_rows=total_rows,
            valid_rows=summary_int(summary_json, "valid_rows"),
            error_rows=summary_int(summary_json, "error_rows"),
            duplicate_rows=summary_int(summary_json, "duplicate_rows"),
            status="validated" if summary_int(summary_json, "error_rows") == 0 else "needs_fixes",
            mapping_json=mapping_json,
            summary_json=summary_json,
        )
        self.session.add(job)
        await self.session.flush()
        return job

    async def list_import_jobs(self, organization_id: UUID) -> list[DataImportJob]:
        result = await self.session.execute(
            select(DataImportJob)
            .where(DataImportJob.organization_id == organization_id)
            .order_by(DataImportJob.created_at.desc())
            .limit(100)
        )
        return list(result.scalars())

    async def create_mapping_template(
        self,
        *,
        organization_id: UUID,
        name: str,
        dataset_type: str,
        mapping_json: dict[str, object],
        is_default: bool,
    ) -> DataMappingTemplate:
        template = DataMappingTemplate(
            organization_id=organization_id,
            name=name,
            dataset_type=dataset_type,
            mapping_json=mapping_json,
            is_default=is_default,
        )
        self.session.add(template)
        await self.session.flush()
        return template

    async def create_export_job(
        self,
        *,
        organization_id: UUID,
        requested_by_user_id: UUID,
        dataset_type: str,
        export_format: str,
        filtered_view_json: dict[str, object],
        scheduled: bool,
    ) -> DataExportJob:
        job = DataExportJob(
            organization_id=organization_id,
            requested_by_user_id=requested_by_user_id,
            dataset_type=dataset_type,
            export_format=export_format,
            filtered_view_json=filtered_view_json,
            scheduled=scheduled,
            status="queued",
        )
        self.session.add(job)
        await self.session.flush()
        return job

    async def list_export_jobs(self, organization_id: UUID) -> list[DataExportJob]:
        result = await self.session.execute(
            select(DataExportJob)
            .where(DataExportJob.organization_id == organization_id)
            .order_by(DataExportJob.created_at.desc())
            .limit(100)
        )
        return list(result.scalars())

    async def create_bulk_edit_batch(
        self,
        *,
        organization_id: UUID,
        edited_by_user_id: UUID,
        dataset_type: str,
        total_records: int,
        change_set_json: dict[str, object],
    ) -> BulkEditBatch:
        batch = BulkEditBatch(
            organization_id=organization_id,
            edited_by_user_id=edited_by_user_id,
            dataset_type=dataset_type,
            total_records=total_records,
            changed_records=total_records,
            conflict_count=0,
            status="ready_to_apply",
            change_set_json=change_set_json,
        )
        self.session.add(batch)
        await self.session.flush()
        return batch
