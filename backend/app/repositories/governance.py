from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.governance import (
    ConsentRecord,
    DataVersion,
    ExportLog,
    GovernancePolicy,
    LineageEvent,
    MasterDataEntry,
    RetentionPolicy,
    ValidationRule,
)
from app.models.operations import DataQualitySignal


class GovernanceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_policy(self, organization_id: UUID, values: dict[str, object]) -> GovernancePolicy:
        policy = GovernancePolicy(organization_id=organization_id, **values)
        self.session.add(policy)
        await self.session.flush()
        return policy

    async def list_policies(self, organization_id: UUID) -> list[GovernancePolicy]:
        result = await self.session.execute(
            select(GovernancePolicy)
            .where(GovernancePolicy.organization_id == organization_id, GovernancePolicy.deleted_at.is_(None))
            .order_by(GovernancePolicy.created_at.desc())
        )
        return list(result.scalars())

    async def create_retention_policy(self, organization_id: UUID, values: dict[str, object]) -> RetentionPolicy:
        policy = RetentionPolicy(organization_id=organization_id, **values)
        self.session.add(policy)
        await self.session.flush()
        return policy

    async def list_retention_policies(self, organization_id: UUID) -> list[RetentionPolicy]:
        result = await self.session.execute(
            select(RetentionPolicy)
            .where(RetentionPolicy.organization_id == organization_id, RetentionPolicy.deleted_at.is_(None))
            .order_by(RetentionPolicy.record_type)
        )
        return list(result.scalars())

    async def create_validation_rule(self, organization_id: UUID, values: dict[str, object]) -> ValidationRule:
        rule = ValidationRule(organization_id=organization_id, **values)
        self.session.add(rule)
        await self.session.flush()
        return rule

    async def list_validation_rules(self, organization_id: UUID) -> list[ValidationRule]:
        result = await self.session.execute(
            select(ValidationRule)
            .where(ValidationRule.organization_id == organization_id, ValidationRule.deleted_at.is_(None))
            .order_by(ValidationRule.target_entity, ValidationRule.rule_code)
        )
        return list(result.scalars())

    async def next_version_number(self, organization_id: UUID, entity_type: str, entity_id: str) -> int:
        result = await self.session.execute(
            select(func.max(DataVersion.version_number)).where(
                DataVersion.organization_id == organization_id,
                DataVersion.entity_type == entity_type,
                DataVersion.entity_id == entity_id,
            )
        )
        return int(result.scalar_one_or_none() or 0) + 1

    async def create_data_version(self, organization_id: UUID, values: dict[str, object]) -> DataVersion:
        version = DataVersion(organization_id=organization_id, **values)
        self.session.add(version)
        await self.session.flush()
        return version

    async def list_data_versions(self, organization_id: UUID, entity_type: str | None = None, entity_id: str | None = None) -> list[DataVersion]:
        query = select(DataVersion).where(DataVersion.organization_id == organization_id)
        if entity_type is not None:
            query = query.where(DataVersion.entity_type == entity_type)
        if entity_id is not None:
            query = query.where(DataVersion.entity_id == entity_id)
        result = await self.session.execute(query.order_by(DataVersion.created_at.desc()).limit(100))
        return list(result.scalars())

    async def create_lineage_event(self, organization_id: UUID, values: dict[str, object]) -> LineageEvent:
        event = LineageEvent(organization_id=organization_id, **values)
        self.session.add(event)
        await self.session.flush()
        return event

    async def list_lineage_events(self, organization_id: UUID) -> list[LineageEvent]:
        result = await self.session.execute(
            select(LineageEvent).where(LineageEvent.organization_id == organization_id).order_by(LineageEvent.created_at.desc()).limit(100)
        )
        return list(result.scalars())

    async def create_consent_record(self, organization_id: UUID, values: dict[str, object]) -> ConsentRecord:
        record = ConsentRecord(organization_id=organization_id, **values)
        self.session.add(record)
        await self.session.flush()
        return record

    async def list_consent_records(self, organization_id: UUID) -> list[ConsentRecord]:
        result = await self.session.execute(
            select(ConsentRecord).where(ConsentRecord.organization_id == organization_id).order_by(ConsentRecord.created_at.desc()).limit(100)
        )
        return list(result.scalars())

    async def create_export_log(self, organization_id: UUID, values: dict[str, object]) -> ExportLog:
        log = ExportLog(organization_id=organization_id, **values)
        self.session.add(log)
        await self.session.flush()
        return log

    async def list_export_logs(self, organization_id: UUID) -> list[ExportLog]:
        result = await self.session.execute(
            select(ExportLog).where(ExportLog.organization_id == organization_id).order_by(ExportLog.created_at.desc()).limit(100)
        )
        return list(result.scalars())

    async def create_master_data_entry(self, organization_id: UUID, values: dict[str, object]) -> MasterDataEntry:
        entry = MasterDataEntry(organization_id=organization_id, **values)
        self.session.add(entry)
        await self.session.flush()
        return entry

    async def list_master_data_entries(self, organization_id: UUID) -> list[MasterDataEntry]:
        result = await self.session.execute(
            select(MasterDataEntry)
            .where(MasterDataEntry.organization_id == organization_id, MasterDataEntry.deleted_at.is_(None))
            .order_by(MasterDataEntry.category, MasterDataEntry.label)
        )
        return list(result.scalars())

    async def list_master_data_by_category(self, organization_id: UUID, category: str) -> list[MasterDataEntry]:
        result = await self.session.execute(
            select(MasterDataEntry)
            .where(
                MasterDataEntry.organization_id == organization_id,
                MasterDataEntry.category == category,
                MasterDataEntry.status == "active",
                MasterDataEntry.deleted_at.is_(None),
            )
            .order_by(MasterDataEntry.order_index, MasterDataEntry.label)
        )
        return list(result.scalars())

    async def count(self, model: type[GovernancePolicy | RetentionPolicy | ValidationRule | LineageEvent | ExportLog | ConsentRecord], organization_id: UUID) -> int:
        result = await self.session.execute(select(func.count()).select_from(model).where(model.organization_id == organization_id))
        return int(result.scalar_one())

    async def count_open_quality_signals(self, organization_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(DataQualitySignal).where(DataQualitySignal.organization_id == organization_id, DataQualitySignal.status == "open")
        )
        return int(result.scalar_one())

    async def count_audit_events(self, organization_id: UUID) -> int:
        result = await self.session.execute(select(func.count()).select_from(AuditLog).where(AuditLog.organization_id == organization_id))
        return int(result.scalar_one())
