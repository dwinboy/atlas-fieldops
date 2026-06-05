from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.administration import (
    AdministrationApiKey,
    BackupJob,
    FeatureFlag,
    Integration,
    NotificationRule,
    PlatformLocation,
    PlatformReferenceList,
    PlatformReferenceValue,
    RecoveryJob,
    SystemAuditLog,
    SystemSetting,
)


class AdministrationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def count(self, model: type[Any], **filters: object) -> int:
        statement = select(func.count()).select_from(model)
        if hasattr(model, "deleted_at"):
            statement = statement.where(model.deleted_at.is_(None))
        for key, value in filters.items():
            statement = statement.where(getattr(model, key) == value)
        result = await self.session.execute(statement)
        return int(result.scalar_one())

    async def create_location(self, values: dict[str, object]) -> PlatformLocation:
        row = PlatformLocation(**values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get_location(self, location_id: UUID) -> PlatformLocation | None:
        result = await self.session.execute(
            select(PlatformLocation).where(PlatformLocation.id == location_id, PlatformLocation.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list_locations(self, *, limit: int = 500) -> list[PlatformLocation]:
        result = await self.session.execute(
            select(PlatformLocation)
            .where(PlatformLocation.deleted_at.is_(None))
            .order_by(PlatformLocation.location_type, PlatformLocation.name)
            .limit(limit)
        )
        return list(result.scalars())

    async def create_reference_list(self, values: dict[str, object]) -> PlatformReferenceList:
        row = PlatformReferenceList(**values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get_reference_list(self, reference_list_id: UUID) -> PlatformReferenceList | None:
        result = await self.session.execute(
            select(PlatformReferenceList).where(
                PlatformReferenceList.id == reference_list_id,
                PlatformReferenceList.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_reference_lists(self, *, limit: int = 500) -> list[PlatformReferenceList]:
        result = await self.session.execute(
            select(PlatformReferenceList)
            .where(PlatformReferenceList.deleted_at.is_(None))
            .order_by(PlatformReferenceList.category, PlatformReferenceList.name)
            .limit(limit)
        )
        return list(result.scalars())

    async def list_reference_values(self, reference_list_ids: list[UUID]) -> list[PlatformReferenceValue]:
        if not reference_list_ids:
            return []
        result = await self.session.execute(
            select(PlatformReferenceValue)
            .where(
                PlatformReferenceValue.reference_list_id.in_(reference_list_ids),
                PlatformReferenceValue.deleted_at.is_(None),
            )
            .order_by(PlatformReferenceValue.sort_order, PlatformReferenceValue.label)
        )
        return list(result.scalars())

    async def create_reference_value(self, values: dict[str, object]) -> PlatformReferenceValue:
        row = PlatformReferenceValue(**values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get_reference_value(self, value_id: UUID) -> PlatformReferenceValue | None:
        result = await self.session.execute(
            select(PlatformReferenceValue).where(
                PlatformReferenceValue.id == value_id,
                PlatformReferenceValue.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_notification_rules(self, *, limit: int = 500) -> list[NotificationRule]:
        result = await self.session.execute(
            select(NotificationRule)
            .where(NotificationRule.deleted_at.is_(None))
            .order_by(NotificationRule.event_type, NotificationRule.channel)
            .limit(limit)
        )
        return list(result.scalars())

    async def create_notification_rule(self, values: dict[str, object]) -> NotificationRule:
        row = NotificationRule(**values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get_notification_rule(self, rule_id: UUID) -> NotificationRule | None:
        result = await self.session.execute(
            select(NotificationRule).where(
                NotificationRule.id == rule_id,
                NotificationRule.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_api_keys(self, *, limit: int = 500) -> list[AdministrationApiKey]:
        result = await self.session.execute(
            select(AdministrationApiKey)
            .where(AdministrationApiKey.deleted_at.is_(None))
            .order_by(AdministrationApiKey.updated_at.desc())
            .limit(limit)
        )
        return list(result.scalars())

    async def create_api_key(self, values: dict[str, object]) -> AdministrationApiKey:
        row = AdministrationApiKey(**values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get_api_key(self, api_key_id: UUID) -> AdministrationApiKey | None:
        result = await self.session.execute(
            select(AdministrationApiKey).where(
                AdministrationApiKey.id == api_key_id,
                AdministrationApiKey.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_integrations(self, *, limit: int = 500) -> list[Integration]:
        result = await self.session.execute(
            select(Integration)
            .where(Integration.deleted_at.is_(None))
            .order_by(Integration.integration_type, Integration.name)
            .limit(limit)
        )
        return list(result.scalars())

    async def create_integration(self, values: dict[str, object]) -> Integration:
        row = Integration(**values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get_integration(self, integration_id: UUID) -> Integration | None:
        result = await self.session.execute(
            select(Integration).where(Integration.id == integration_id, Integration.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list_settings(self, *, limit: int = 500) -> list[SystemSetting]:
        result = await self.session.execute(
            select(SystemSetting)
            .where(SystemSetting.deleted_at.is_(None))
            .order_by(SystemSetting.category, SystemSetting.setting_key)
            .limit(limit)
        )
        return list(result.scalars())

    async def get_setting(self, *, organization_id: UUID | None, environment: str, setting_key: str) -> SystemSetting | None:
        result = await self.session.execute(
            select(SystemSetting).where(
                SystemSetting.organization_id == organization_id,
                SystemSetting.environment == environment,
                SystemSetting.setting_key == setting_key,
                SystemSetting.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def create_setting(self, values: dict[str, object]) -> SystemSetting:
        row = SystemSetting(**values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_feature_flags(self, *, limit: int = 500) -> list[FeatureFlag]:
        result = await self.session.execute(
            select(FeatureFlag)
            .where(FeatureFlag.deleted_at.is_(None))
            .order_by(FeatureFlag.environment, FeatureFlag.flag_key)
            .limit(limit)
        )
        return list(result.scalars())

    async def get_feature_flag(self, *, organization_id: UUID | None, environment: str, flag_key: str) -> FeatureFlag | None:
        result = await self.session.execute(
            select(FeatureFlag).where(
                FeatureFlag.organization_id == organization_id,
                FeatureFlag.environment == environment,
                FeatureFlag.flag_key == flag_key,
                FeatureFlag.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def create_feature_flag(self, values: dict[str, object]) -> FeatureFlag:
        row = FeatureFlag(**values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_backup_jobs(self, *, limit: int = 500) -> list[BackupJob]:
        result = await self.session.execute(
            select(BackupJob)
            .where(BackupJob.deleted_at.is_(None))
            .order_by(BackupJob.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars())

    async def create_backup_job(self, values: dict[str, object]) -> BackupJob:
        row = BackupJob(**values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def create_recovery_job(self, values: dict[str, object]) -> RecoveryJob:
        row = RecoveryJob(**values)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_system_audit_logs(self, *, limit: int = 200) -> list[SystemAuditLog]:
        result = await self.session.execute(
            select(SystemAuditLog)
            .order_by(SystemAuditLog.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars())

    async def append_system_audit(self, values: dict[str, object]) -> SystemAuditLog:
        row = SystemAuditLog(**values)
        self.session.add(row)
        await self.session.flush()
        return row
