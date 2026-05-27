from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import event_publisher
from app.models.collection import Project
from app.models.operations import Beneficiary, CaseRecord, DataQualitySignal, DonorReport, MonitoringIndicator
from app.repositories.operations import OperationsRepository
from app.schemas.operations import (
    BeneficiaryCreate,
    CaseCreate,
    DonorReportCreate,
    IndicatorCreate,
    IndicatorRead,
    OperationsSummary,
    ProgramCreate,
)


def indicator_progress(indicator: MonitoringIndicator) -> float:
    if indicator.target_value <= indicator.baseline_value:
        return 0
    progress = ((indicator.current_value - indicator.baseline_value) / (indicator.target_value - indicator.baseline_value)) * 100
    return round(max(0, min(progress, 100)), 1)


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
