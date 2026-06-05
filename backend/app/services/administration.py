from datetime import UTC, datetime
from hashlib import sha256
from secrets import token_urlsafe
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.administration import AdministrationApiKey, BackupJob, FeatureFlag, Integration, PlatformLocation, PlatformReferenceList, SystemSetting
from app.models.collection import Project
from app.models.identity import Organization, User
from app.repositories.administration import AdministrationRepository
from app.repositories.audit import AuditRepository
from app.schemas.administration import (
    AdministrationSummaryRead,
    ApiKeyCreate,
    ApiKeyRead,
    BackupJobCreate,
    BackupJobRead,
    FeatureFlagRead,
    FeatureFlagUpsert,
    IntegrationCreate,
    IntegrationRead,
    LocationCreate,
    LocationRead,
    LocationUpdate,
    NotificationRuleCreate,
    NotificationRuleRead,
    NotificationRuleUpdate,
    RecoveryJobCreate,
    RecoveryJobRead,
    ReferenceListCreate,
    ReferenceListRead,
    ReferenceListUpdate,
    ReferenceValueCreate,
    ReferenceValueRead,
    ReferenceValueUpdate,
    SystemAuditLogRead,
    SystemSettingRead,
    SystemSettingUpsert,
)


class AdministrationNotFoundError(Exception):
    pass


def slugify(value: str) -> str:
    slug = "".join(character.lower() if character.isalnum() else "-" for character in value.strip())
    return "-".join(part for part in slug.split("-") if part)


def api_key_material() -> tuple[str, str, str]:
    secret = f"afops_{token_urlsafe(32)}"
    prefix = secret[:16]
    digest = sha256(secret.encode("utf-8")).hexdigest()
    return secret, prefix, digest


def apply_updates(row: object, values: dict[str, object | None], allowed_fields: set[str]) -> None:
    for key, value in values.items():
        if key in allowed_fields and value is not None:
            setattr(row, key, value)


class AdministrationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = AdministrationRepository(session)
        self.audit = AuditRepository(session)

    async def summary(self) -> AdministrationSummaryRead:
        organization_count = await self._count(Organization, deleted=False)
        country_count = await self.repository.count(PlatformLocation, location_type="Country", status="active")
        active_users = await self._count(User, deleted=False, is_active=True)
        active_projects = await self._count(Project, deleted=False, is_active=True)
        api_keys = await self.repository.count(AdministrationApiKey, status="active")
        integrations = await self.repository.count(Integration, status="connected")
        scheduled_backups = await self.repository.count(BackupJob, status="scheduled")
        failed_backups = await self.repository.count(BackupJob, status="failed")
        active_flags = await self.repository.count(FeatureFlag, enabled=True)
        system_health = "warning" if failed_backups else "healthy"
        return AdministrationSummaryRead(
            organizations=organization_count,
            countries=country_count,
            active_users=active_users,
            active_projects=active_projects,
            api_integrations=api_keys + integrations,
            scheduled_backups=scheduled_backups,
            failed_jobs=failed_backups,
            active_feature_flags=active_flags,
            system_health=system_health,
        )

    async def list_locations(self) -> list[LocationRead]:
        return [LocationRead.model_validate(row) for row in await self.repository.list_locations()]

    async def create_location(self, actor_user_id: UUID, audit_organization_id: UUID, payload: LocationCreate) -> LocationRead:
        row = await self.repository.create_location(
            {
                **payload.model_dump(),
                "created_by_user_id": actor_user_id,
                "updated_by_user_id": actor_user_id,
            }
        )
        await self._audit(audit_organization_id, actor_user_id, "administration.location_created", "platform_location", str(row.id), {"code": row.code, "type": row.location_type})
        await self.session.commit()
        return LocationRead.model_validate(row)

    async def update_location(self, actor_user_id: UUID, audit_organization_id: UUID, location_id: UUID, payload: LocationUpdate) -> LocationRead:
        row = await self.repository.get_location(location_id)
        if row is None:
            raise AdministrationNotFoundError("Location not found")
        old_value = {"name": row.name, "status": row.status, "location_type": row.location_type}
        apply_updates(
            row,
            payload.model_dump(exclude_unset=True),
            {"name", "location_type", "parent_location_id", "status", "latitude", "longitude", "boundary_reference", "metadata_json"},
        )
        row.updated_by_user_id = actor_user_id
        await self._audit(
            audit_organization_id,
            actor_user_id,
            "administration.location_updated",
            "platform_location",
            str(row.id),
            {"old": old_value, "new": {"name": row.name, "status": row.status, "location_type": row.location_type}},
        )
        await self.session.commit()
        return LocationRead.model_validate(row)

    async def list_reference_lists(self) -> list[ReferenceListRead]:
        lists = await self.repository.list_reference_lists()
        values = await self.repository.list_reference_values([row.id for row in lists])
        values_by_list: dict[UUID, list[ReferenceValueRead]] = {}
        for value in values:
            values_by_list.setdefault(value.reference_list_id, []).append(ReferenceValueRead.model_validate(value))
        return [
            ReferenceListRead(
                id=row.id,
                organization_id=row.organization_id,
                name=row.name,
                slug=row.slug,
                description=row.description,
                category=row.category,
                status=row.status,
                version=row.version,
                values=values_by_list.get(row.id, []),
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in lists
        ]

    async def create_reference_list(self, actor_user_id: UUID, audit_organization_id: UUID, payload: ReferenceListCreate) -> ReferenceListRead:
        slug = payload.slug or slugify(payload.name)
        row = await self.repository.create_reference_list(
            {
                **payload.model_dump(exclude={"slug"}),
                "slug": slug,
                "created_by_user_id": actor_user_id,
                "updated_by_user_id": actor_user_id,
            }
        )
        await self._audit(audit_organization_id, actor_user_id, "administration.reference_list_created", "platform_reference_list", str(row.id), {"slug": row.slug})
        await self.session.commit()
        return (await self.list_reference_lists_by_ids([row.id]))[0]

    async def update_reference_list(self, actor_user_id: UUID, audit_organization_id: UUID, list_id: UUID, payload: ReferenceListUpdate) -> ReferenceListRead:
        row = await self.repository.get_reference_list(list_id)
        if row is None:
            raise AdministrationNotFoundError("Reference list not found")
        old_version = row.version
        apply_updates(row, payload.model_dump(exclude_unset=True), {"name", "description", "category", "status"})
        row.version += 1
        row.updated_by_user_id = actor_user_id
        await self._audit(audit_organization_id, actor_user_id, "administration.reference_list_updated", "platform_reference_list", str(row.id), {"old_version": old_version, "new_version": row.version})
        await self.session.commit()
        return (await self.list_reference_lists_by_ids([row.id]))[0]

    async def create_reference_value(self, actor_user_id: UUID, audit_organization_id: UUID, list_id: UUID, payload: ReferenceValueCreate) -> ReferenceValueRead:
        reference_list = await self.repository.get_reference_list(list_id)
        if reference_list is None:
            raise AdministrationNotFoundError("Reference list not found")
        row = await self.repository.create_reference_value(
            {
                **payload.model_dump(),
                "reference_list_id": list_id,
                "created_by_user_id": actor_user_id,
                "updated_by_user_id": actor_user_id,
            }
        )
        reference_list.version += 1
        reference_list.updated_by_user_id = actor_user_id
        await self._audit(audit_organization_id, actor_user_id, "administration.reference_value_created", "platform_reference_value", str(row.id), {"list_id": str(list_id), "code": row.code})
        await self.session.commit()
        return ReferenceValueRead.model_validate(row)

    async def update_reference_value(self, actor_user_id: UUID, audit_organization_id: UUID, value_id: UUID, payload: ReferenceValueUpdate) -> ReferenceValueRead:
        row = await self.repository.get_reference_value(value_id)
        if row is None:
            raise AdministrationNotFoundError("Reference value not found")
        reference_list = await self.repository.get_reference_list(row.reference_list_id)
        apply_updates(row, payload.model_dump(exclude_unset=True), {"label", "description", "is_active", "sort_order", "metadata_json"})
        row.updated_by_user_id = actor_user_id
        if reference_list is not None:
            reference_list.version += 1
            reference_list.updated_by_user_id = actor_user_id
        await self._audit(audit_organization_id, actor_user_id, "administration.reference_value_updated", "platform_reference_value", str(row.id), {"active": row.is_active})
        await self.session.commit()
        return ReferenceValueRead.model_validate(row)

    async def list_notification_rules(self) -> list[NotificationRuleRead]:
        return [NotificationRuleRead.model_validate(row) for row in await self.repository.list_notification_rules()]

    async def create_notification_rule(self, actor_user_id: UUID, audit_organization_id: UUID, payload: NotificationRuleCreate) -> NotificationRuleRead:
        values = payload.model_dump(exclude={"recipients"})
        values["recipients_json"] = payload.recipients
        values["created_by_user_id"] = actor_user_id
        values["updated_by_user_id"] = actor_user_id
        row = await self.repository.create_notification_rule(values)
        await self._audit(audit_organization_id, actor_user_id, "administration.notification_rule_created", "notification_rule", str(row.id), {"event_type": row.event_type, "channel": row.channel})
        await self.session.commit()
        return NotificationRuleRead.model_validate(row)

    async def update_notification_rule(self, actor_user_id: UUID, audit_organization_id: UUID, rule_id: UUID, payload: NotificationRuleUpdate) -> NotificationRuleRead:
        row = await self.repository.get_notification_rule(rule_id)
        if row is None:
            raise AdministrationNotFoundError("Notification rule not found")
        old_value = {"event_type": row.event_type, "channel": row.channel, "status": row.status}
        values = payload.model_dump(exclude_unset=True, exclude={"recipients"})
        apply_updates(
            row,
            values,
            {"event_type", "channel", "template", "frequency", "status", "delivery_rules_json"},
        )
        if payload.recipients is not None:
            row.recipients_json = payload.recipients
        row.updated_by_user_id = actor_user_id
        await self._audit(
            audit_organization_id,
            actor_user_id,
            "administration.notification_rule_updated",
            "notification_rule",
            str(row.id),
            {"old": old_value, "new": {"event_type": row.event_type, "channel": row.channel, "status": row.status}},
        )
        await self.session.commit()
        return NotificationRuleRead.model_validate(row)

    async def list_api_keys(self) -> list[ApiKeyRead]:
        return [ApiKeyRead.model_validate(row) for row in await self.repository.list_api_keys()]

    async def create_api_key(self, actor_user_id: UUID, audit_organization_id: UUID, payload: ApiKeyCreate) -> ApiKeyRead:
        _secret, prefix, digest = api_key_material()
        row = await self.repository.create_api_key(
            {
                **payload.model_dump(),
                "key_prefix": prefix,
                "key_hash": digest,
                "created_by_user_id": actor_user_id,
                "updated_by_user_id": actor_user_id,
            }
        )
        await self._audit(audit_organization_id, actor_user_id, "administration.api_key_created", "administration_api_key", str(row.id), {"scope": row.scope, "key_prefix": row.key_prefix})
        await self.session.commit()
        return ApiKeyRead.model_validate(row)

    async def rotate_api_key(self, actor_user_id: UUID, audit_organization_id: UUID, api_key_id: UUID) -> ApiKeyRead:
        row = await self.repository.get_api_key(api_key_id)
        if row is None:
            raise AdministrationNotFoundError("API key not found")
        _secret, prefix, digest = api_key_material()
        row.key_prefix = prefix
        row.key_hash = digest
        row.rotated_at = datetime.now(UTC)
        row.status = "active"
        row.updated_by_user_id = actor_user_id
        await self._audit(audit_organization_id, actor_user_id, "administration.api_key_rotated", "administration_api_key", str(row.id), {"key_prefix": row.key_prefix})
        await self.session.commit()
        return ApiKeyRead.model_validate(row)

    async def revoke_api_key(self, actor_user_id: UUID, audit_organization_id: UUID, api_key_id: UUID) -> ApiKeyRead:
        row = await self.repository.get_api_key(api_key_id)
        if row is None:
            raise AdministrationNotFoundError("API key not found")
        row.status = "revoked"
        row.revoked_at = datetime.now(UTC)
        row.updated_by_user_id = actor_user_id
        await self._audit(audit_organization_id, actor_user_id, "administration.api_key_revoked", "administration_api_key", str(row.id), {"key_prefix": row.key_prefix})
        await self.session.commit()
        return ApiKeyRead.model_validate(row)

    async def list_integrations(self) -> list[IntegrationRead]:
        return [IntegrationRead.model_validate(row) for row in await self.repository.list_integrations()]

    async def create_integration(self, actor_user_id: UUID, audit_organization_id: UUID, payload: IntegrationCreate) -> IntegrationRead:
        row = await self.repository.create_integration(
            {
                **payload.model_dump(),
                "created_by_user_id": actor_user_id,
                "updated_by_user_id": actor_user_id,
            }
        )
        await self._audit(audit_organization_id, actor_user_id, "administration.integration_created", "integration", str(row.id), {"type": row.integration_type})
        await self.session.commit()
        return IntegrationRead.model_validate(row)

    async def test_integration(self, actor_user_id: UUID, audit_organization_id: UUID, integration_id: UUID) -> IntegrationRead:
        row = await self.repository.get_integration(integration_id)
        if row is None:
            raise AdministrationNotFoundError("Integration not found")
        row.status = "connected"
        row.last_sync_at = datetime.now(UTC)
        row.updated_by_user_id = actor_user_id
        await self._audit(audit_organization_id, actor_user_id, "administration.integration_tested", "integration", str(row.id), {"status": row.status})
        await self.session.commit()
        return IntegrationRead.model_validate(row)

    async def disconnect_integration(self, actor_user_id: UUID, audit_organization_id: UUID, integration_id: UUID) -> IntegrationRead:
        row = await self.repository.get_integration(integration_id)
        if row is None:
            raise AdministrationNotFoundError("Integration not found")
        row.status = "disconnected"
        row.updated_by_user_id = actor_user_id
        await self._audit(audit_organization_id, actor_user_id, "administration.integration_disconnected", "integration", str(row.id), {"status": row.status})
        await self.session.commit()
        return IntegrationRead.model_validate(row)

    async def list_settings(self) -> list[SystemSettingRead]:
        return [SystemSettingRead.model_validate(row) for row in await self.repository.list_settings()]

    async def upsert_setting(self, actor_user_id: UUID, audit_organization_id: UUID, payload: SystemSettingUpsert) -> SystemSettingRead:
        row = await self.repository.get_setting(organization_id=None, environment=payload.environment, setting_key=payload.setting_key)
        if row is None:
            row = await self.repository.create_setting(
                {
                    **payload.model_dump(),
                    "created_by_user_id": actor_user_id,
                    "updated_by_user_id": actor_user_id,
                }
            )
            action = "administration.system_setting_created"
        else:
            row.category = payload.category
            row.setting_value_json = payload.setting_value_json
            row.is_sensitive = payload.is_sensitive
            row.updated_by_user_id = actor_user_id
            action = "administration.system_setting_updated"
        await self._audit(audit_organization_id, actor_user_id, action, "system_setting", str(row.id), {"key": row.setting_key, "environment": row.environment})
        await self.session.commit()
        return SystemSettingRead.model_validate(row)

    async def list_feature_flags(self) -> list[FeatureFlagRead]:
        return [FeatureFlagRead.model_validate(row) for row in await self.repository.list_feature_flags()]

    async def upsert_feature_flag(self, actor_user_id: UUID, audit_organization_id: UUID, payload: FeatureFlagUpsert) -> FeatureFlagRead:
        row = await self.repository.get_feature_flag(organization_id=None, environment=payload.environment, flag_key=payload.flag_key)
        if row is None:
            row = await self.repository.create_feature_flag(
                {
                    **payload.model_dump(),
                    "created_by_user_id": actor_user_id,
                    "updated_by_user_id": actor_user_id,
                }
            )
            action = "administration.feature_flag_created"
        else:
            row.label = payload.label
            row.description = payload.description
            row.enabled = payload.enabled
            row.rollout_percentage = payload.rollout_percentage
            row.updated_by_user_id = actor_user_id
            action = "administration.feature_flag_updated"
        await self._audit(audit_organization_id, actor_user_id, action, "feature_flag", str(row.id), {"flag_key": row.flag_key, "enabled": row.enabled, "rollout": row.rollout_percentage})
        await self.session.commit()
        return FeatureFlagRead.model_validate(row)

    async def list_backup_jobs(self) -> list[BackupJobRead]:
        return [BackupJobRead.model_validate(row) for row in await self.repository.list_backup_jobs()]

    async def create_backup_job(self, actor_user_id: UUID, audit_organization_id: UUID, payload: BackupJobCreate) -> BackupJobRead:
        row = await self.repository.create_backup_job(
            {
                **payload.model_dump(),
                "created_by_user_id": actor_user_id,
                "metadata_json": {**payload.metadata_json, "execution": "queued_for_backend_worker"},
            }
        )
        await self._audit(audit_organization_id, actor_user_id, "administration.backup_created", "backup_job", str(row.id), {"backup_type": row.backup_type})
        await self.session.commit()
        return BackupJobRead.model_validate(row)

    async def request_recovery(self, actor_user_id: UUID, audit_organization_id: UUID, payload: RecoveryJobCreate) -> RecoveryJobRead:
        row = await self.repository.create_recovery_job(
            {
                **payload.model_dump(),
                "requested_by_user_id": actor_user_id,
                "metadata_json": {"requires_elevated_permission": True},
            }
        )
        await self._audit(audit_organization_id, actor_user_id, "administration.recovery_requested", "recovery_job", str(row.id), {"backup_job_id": str(row.backup_job_id) if row.backup_job_id else None})
        await self.session.commit()
        return RecoveryJobRead.model_validate(row)

    async def list_system_audit_logs(self) -> list[SystemAuditLogRead]:
        return [SystemAuditLogRead.model_validate(row) for row in await self.repository.list_system_audit_logs()]

    async def list_reference_lists_by_ids(self, list_ids: list[UUID]) -> list[ReferenceListRead]:
        all_lists = await self.list_reference_lists()
        wanted = set(list_ids)
        return [row for row in all_lists if row.id in wanted]

    async def _count(self, model: type[object], *, deleted: bool | None = None, **filters: object) -> int:
        statement = select(func.count()).select_from(model)
        if deleted is False and hasattr(model, "deleted_at"):
            statement = statement.where(model.deleted_at.is_(None))
        for key, value in filters.items():
            statement = statement.where(getattr(model, key) == value)
        result = await self.session.execute(statement)
        return int(result.scalar_one())

    async def _audit(
        self,
        organization_id: UUID,
        actor_user_id: UUID,
        action: str,
        resource_type: str,
        resource_id: str,
        metadata: dict[str, object],
    ) -> None:
        await self.repository.append_system_audit(
            {
                "organization_id": organization_id,
                "actor_user_id": actor_user_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "new_value_json": metadata,
                "metadata_json": {"module": "administration"},
            }
        )
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata=metadata,
        )
