from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collection import Project
from app.models.operations import Beneficiary, CaseRecord, DataQualitySignal, DonorReport, MonitoringIndicator


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
