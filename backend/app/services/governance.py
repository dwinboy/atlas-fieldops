from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.governance import ConsentRecord, ExportLog, GovernancePolicy, LineageEvent, RetentionPolicy, ValidationRule
from app.repositories.audit import AuditRepository
from app.repositories.governance import GovernanceRepository
from app.schemas.governance import (
    ConsentRecordCreate,
    ConsentRecordRead,
    DataVersionCreate,
    DataVersionRead,
    ExportGovernanceRequest,
    ExportLogRead,
    GovernancePolicyCreate,
    GovernancePolicyRead,
    GovernanceSummary,
    LineageEventCreate,
    LineageEventRead,
    MasterDataEntryCreate,
    MasterDataEntryRead,
    RetentionPolicyCreate,
    RetentionPolicyRead,
    ValidationRuleCreate,
    ValidationRuleRead,
)


class GovernanceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = GovernanceRepository(session)
        self.audit = AuditRepository(session)

    async def summary(self, organization_id: UUID) -> GovernanceSummary:
        policies = await self.repository.count(GovernancePolicy, organization_id)
        validation_rules = await self.repository.count(ValidationRule, organization_id)
        retention_policies = await self.repository.count(RetentionPolicy, organization_id)
        lineage_events = await self.repository.count(LineageEvent, organization_id)
        export_events = await self.repository.count(ExportLog, organization_id)
        consent_records = await self.repository.count(ConsentRecord, organization_id)
        audit_events = await self.repository.count_audit_events(organization_id)
        open_quality_signals = await self.repository.count_open_quality_signals(organization_id)
        attention_items: list[str] = []
        if not retention_policies:
            attention_items.append("No retention policy is configured yet.")
        if not validation_rules:
            attention_items.append("No active validation rules are configured yet.")
        if open_quality_signals:
            attention_items.append(f"{open_quality_signals} data quality signals need review.")
        readiness = sum(bool(value) for value in (policies, validation_rules, retention_policies, audit_events, consent_records))
        compliance_score = round((readiness / 5) * 100, 1)
        return GovernanceSummary(
            policies=policies,
            validation_rules=validation_rules,
            retention_policies=retention_policies,
            open_quality_signals=open_quality_signals,
            audit_events=audit_events,
            lineage_events=lineage_events,
            export_events=export_events,
            consent_records=consent_records,
            compliance_score=compliance_score,
            attention_items=attention_items,
        )

    async def create_policy(self, organization_id: UUID, actor_user_id: UUID, payload: GovernancePolicyCreate) -> GovernancePolicyRead:
        policy = await self.repository.create_policy(organization_id, payload.model_dump())
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="governance.policy_created",
            resource_type="governance_policy",
            resource_id=str(policy.id),
            metadata={"policy_type": policy.policy_type, "enforcement_level": policy.enforcement_level},
        )
        await self.session.commit()
        return GovernancePolicyRead.model_validate(policy)

    async def list_policies(self, organization_id: UUID) -> list[GovernancePolicyRead]:
        return [GovernancePolicyRead.model_validate(policy) for policy in await self.repository.list_policies(organization_id)]

    async def create_retention_policy(self, organization_id: UUID, actor_user_id: UUID, payload: RetentionPolicyCreate) -> RetentionPolicyRead:
        policy = await self.repository.create_retention_policy(organization_id, payload.model_dump())
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="governance.retention_policy_created",
            resource_type="retention_policy",
            resource_id=str(policy.id),
            metadata={"record_type": policy.record_type, "retention_years": policy.retention_years},
        )
        await self.session.commit()
        return RetentionPolicyRead.model_validate(policy)

    async def list_retention_policies(self, organization_id: UUID) -> list[RetentionPolicyRead]:
        return [RetentionPolicyRead.model_validate(policy) for policy in await self.repository.list_retention_policies(organization_id)]

    async def create_validation_rule(self, organization_id: UUID, actor_user_id: UUID, payload: ValidationRuleCreate) -> ValidationRuleRead:
        rule = await self.repository.create_validation_rule(organization_id, payload.model_dump())
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="governance.validation_rule_created",
            resource_type="validation_rule",
            resource_id=str(rule.id),
            metadata={"target_entity": rule.target_entity, "severity": rule.severity},
        )
        await self.session.commit()
        return ValidationRuleRead.model_validate(rule)

    async def list_validation_rules(self, organization_id: UUID) -> list[ValidationRuleRead]:
        return [ValidationRuleRead.model_validate(rule) for rule in await self.repository.list_validation_rules(organization_id)]

    async def create_data_version(self, organization_id: UUID, actor_user_id: UUID, payload: DataVersionCreate) -> DataVersionRead:
        version_number = await self.repository.next_version_number(organization_id, payload.entity_type, payload.entity_id)
        values = payload.model_dump()
        values["version_number"] = version_number
        values["changed_by_user_id"] = actor_user_id
        version = await self.repository.create_data_version(organization_id, values)
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="governance.data_version_recorded",
            resource_type=payload.entity_type,
            resource_id=payload.entity_id,
            metadata={"version_number": version_number, "change_type": payload.change_type},
        )
        await self.session.commit()
        return DataVersionRead.model_validate(version)

    async def list_data_versions(self, organization_id: UUID, entity_type: str | None, entity_id: str | None) -> list[DataVersionRead]:
        return [DataVersionRead.model_validate(version) for version in await self.repository.list_data_versions(organization_id, entity_type, entity_id)]

    async def create_lineage_event(self, organization_id: UUID, actor_user_id: UUID, payload: LineageEventCreate) -> LineageEventRead:
        values = payload.model_dump()
        values["actor_user_id"] = actor_user_id
        event = await self.repository.create_lineage_event(organization_id, values)
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="governance.lineage_recorded",
            resource_type=payload.target_type,
            resource_id=payload.target_id,
            metadata={"source_type": payload.source_type, "transformation": payload.transformation},
        )
        await self.session.commit()
        return LineageEventRead.model_validate(event)

    async def list_lineage_events(self, organization_id: UUID) -> list[LineageEventRead]:
        return [LineageEventRead.model_validate(event) for event in await self.repository.list_lineage_events(organization_id)]

    async def create_consent_record(self, organization_id: UUID, actor_user_id: UUID, payload: ConsentRecordCreate) -> ConsentRecordRead:
        values = payload.model_dump()
        values["captured_by_user_id"] = actor_user_id
        values["captured_at"] = datetime.now(UTC)
        record = await self.repository.create_consent_record(organization_id, values)
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="governance.consent_recorded",
            resource_type="consent_record",
            resource_id=str(record.id),
            metadata={"consent_type": record.consent_type, "status": record.status},
        )
        await self.session.commit()
        return ConsentRecordRead.model_validate(record)

    async def list_consent_records(self, organization_id: UUID) -> list[ConsentRecordRead]:
        return [ConsentRecordRead.model_validate(record) for record in await self.repository.list_consent_records(organization_id)]

    async def govern_export(self, organization_id: UUID, actor_user_id: UUID, payload: ExportGovernanceRequest) -> ExportLogRead:
        risk_score = 0.15
        if not payload.anonymized:
            risk_score += 0.45
        if payload.record_count > 10000:
            risk_score += 0.25
        values = payload.model_dump()
        values["requested_by_user_id"] = actor_user_id
        values["risk_score"] = round(min(risk_score, 1), 2)
        values["status"] = "approved" if values["risk_score"] < 0.5 else "review_required"
        log = await self.repository.create_export_log(organization_id, values)
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="governance.export_logged",
            resource_type="export",
            resource_id=str(log.id),
            metadata={"dataset_type": log.dataset_type, "risk_score": log.risk_score, "status": log.status},
        )
        await self.session.commit()
        return ExportLogRead.model_validate(log)

    async def list_export_logs(self, organization_id: UUID) -> list[ExportLogRead]:
        return [ExportLogRead.model_validate(log) for log in await self.repository.list_export_logs(organization_id)]

    async def create_master_data_entry(self, organization_id: UUID, actor_user_id: UUID, payload: MasterDataEntryCreate) -> MasterDataEntryRead:
        values = payload.model_dump()
        values["approved_by_user_id"] = actor_user_id if payload.status == "active" else None
        entry = await self.repository.create_master_data_entry(organization_id, values)
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="governance.master_data_created",
            resource_type="master_data",
            resource_id=str(entry.id),
            metadata={"category": entry.category, "code": entry.code, "status": entry.status},
        )
        await self.session.commit()
        return MasterDataEntryRead.model_validate(entry)

    async def list_master_data_entries(self, organization_id: UUID) -> list[MasterDataEntryRead]:
        return [MasterDataEntryRead.model_validate(entry) for entry in await self.repository.list_master_data_entries(organization_id)]
