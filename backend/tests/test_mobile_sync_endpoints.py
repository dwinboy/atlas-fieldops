import json
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.audit import AuditLog
from app.models.base import Base
from app.models.collection import DataForm, DataFormVersion, FieldOfficerProfile, FieldWorkAssignment, OfficerAssignment, Project, Submission, Survey
from app.models.identity import Organization, User
from app.models.operations import Beneficiary, EntityAttribute, EntityCategory, EntityRelationship, MediaEvidence
from app.repositories.collection import FormRepository
from app.schemas.auth import CurrentPrincipal
from app.schemas.mobile import (
    MobileAttachmentRead,
    MobileAuditEventRead,
    MobileAuditEventUpload,
    MobileSubmissionUpload,
    MobileSyncQueueUpload,
)
from app.services.mobile import MobileService


async def _build_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    return session_factory()


async def _seed_org_and_form(session):
    organization_id = uuid4()
    manager_user_id = uuid4()
    officer_user_id = uuid4()
    project_id = uuid4()
    survey_id = uuid4()
    form_id = uuid4()
    version_id = uuid4()
    officer_id = uuid4()
    category_id = uuid4()
    now = datetime.now(UTC)
    session.add_all(
        [
            Organization(id=organization_id, name="Sync Org", slug="sync-org"),
            User(id=manager_user_id, email="manager@example.org", full_name="Manager", password_hash="x"),
            User(id=officer_user_id, email="officer@example.org", full_name="Officer", password_hash="x"),
            FieldOfficerProfile(id=officer_id, organization_id=organization_id, user_id=officer_user_id, is_active=True),
            Project(id=project_id, organization_id=organization_id, name="Sync Project", slug="sync-project", status="active"),
            Survey(
                id=survey_id,
                organization_id=organization_id,
                project_id=project_id,
                created_by_user_id=manager_user_id,
                owner_user_id=manager_user_id,
                title="Sync Survey",
                code="SYNC-1",
                survey_type="registration",
                status="active",
            ),
            DataForm(
                id=form_id,
                organization_id=organization_id,
                project_id=project_id,
                survey_id=survey_id,
                created_by_user_id=manager_user_id,
                name="Sync Form",
                slug="sync-form",
                status="published",
                current_version=1,
                controls_json={
                    "entity_controls": {
                        "linked_to_entity": True,
                        "entity_category_id": str(category_id),
                        "entity_type": "Water Point",
                        "creates_new_entity": True,
                        "updates_existing_entity": True,
                        "requires_existing_entity": False,
                        "prefill_profile": True,
                        "submission_frequency": "once_per_project",
                    },
                    "instrument": {
                        "respondent_identity": {
                            "mode": "existing_or_new",
                            "beneficiary_search_required": False,
                            "allow_new_registration": True,
                            "allow_anonymous": False,
                        }
                    },
                },
            ),
            DataFormVersion(
                id=version_id,
                organization_id=organization_id,
                form_id=form_id,
                version=1,
                schema_json={
                    "sections": [
                        {
                            "id": "main",
                            "title": "Main",
                            "fields": [
                                {"id": "q_name", "variable_name": "name", "type": "text", "label": "Name", "required": True},
                            ],
                        }
                    ]
                },
                offline_compatible=True,
                published_at=now,
            ),
            EntityCategory(
                id=category_id,
                organization_id=organization_id,
                project_id=project_id,
                name="Water Point",
                slug="water-point",
                sector="wash",
                status="active",
                is_predefined=False,
                statuses_json=["active", "inactive"],
                workflow_json={"review": "standard"},
            ),
            EntityAttribute(
                organization_id=organization_id,
                category_id=category_id,
                label="Water Point Name",
                field_key="water_point_name",
                field_type="text",
                required=True,
                order_index=1,
            ),
        ]
    )
    await session.commit()
    return {
        "organization_id": organization_id,
        "officer_user_id": officer_user_id,
        "project_id": project_id,
        "form_id": form_id,
        "version_id": version_id,
        "officer_id": officer_id,
        "category_id": category_id,
        "now": now,
    }


def _principal_for(organization_id, user_id) -> CurrentPrincipal:
    return CurrentPrincipal(
        user_id=str(user_id),
        organization_id=str(organization_id),
        email="officer@example.org",
        full_name="Officer",
        organization_slug="sync-org",
        organization_name="Sync Org",
        roles=["field_officer"],
        permissions=["submission.create", "sync.mobile"],
        scope_type="own",
    )


async def test_mobile_sync_keeps_published_version_until_new_version_is_published() -> None:
    session = await _build_session()
    async with session as db:
        seed = await _seed_org_and_form(db)
        db.add(
            OfficerAssignment(
                organization_id=seed["organization_id"],
                officer_id=seed["officer_id"],
                project_id=seed["project_id"],
                form_id=seed["form_id"],
                is_active=True,
            )
        )
        await db.commit()

        form = await db.get(DataForm, seed["form_id"])
        assert form is not None
        repository = FormRepository(db)
        draft_schema = {
            "sections": [
                {
                    "id": "main",
                    "title": "Main",
                    "fields": [
                        {"id": "q_new", "variable_name": "new_question", "type": "text", "label": "New question"},
                    ],
                }
            ]
        }
        await repository.save_schema_revision(
            form=form,
            actor_user_id=seed["officer_user_id"],
            name="Sync Form",
            description=None,
            schema_json=draft_schema,
            publish=False,
        )
        await db.commit()

        principal = _principal_for(seed["organization_id"], seed["officer_user_id"])
        package = await MobileService(db).sync_package(principal)

        assert [version.version for version in package.form_versions] == [1]
        assert package.assignments[0].form_version_id == str(seed["version_id"])
        assert package.form_versions[0].sections[0]["questions"][0]["id"] == "q_name"
        assert package.form_versions[0].entity_settings.respondent_identity_mode == "existing_or_new"
        assert package.form_versions[0].entity_settings.entity_search_mode == "optional"
        assert package.form_versions[0].entity_settings.entity_category_id == str(seed["category_id"])
        assert package.entity_categories[0].id == str(seed["category_id"])
        assert package.entity_categories[0].name == "Water Point"
        serialized_category = package.entity_categories[0].model_dump(mode="json", by_alias=True)
        assert serialized_category["attributes"][0]["fieldKey"] == "water_point_name"

        await repository.save_schema_revision(
            form=form,
            actor_user_id=seed["officer_user_id"],
            name="Sync Form",
            description=None,
            schema_json=draft_schema,
            publish=True,
        )
        await db.commit()

        promoted_package = await MobileService(db).sync_package(principal)

        assert [version.version for version in promoted_package.form_versions] == [2]
        assert promoted_package.assignments[0].form_version_id == promoted_package.form_versions[0].id
        assert promoted_package.form_versions[0].sections[0]["questions"][0]["id"] == "q_new"


async def test_mobile_sync_limits_entities_to_explicit_field_work_assignment_scope() -> None:
    session = await _build_session()
    async with session as db:
        seed = await _seed_org_and_form(db)
        entity_one_id = uuid4()
        entity_two_id = uuid4()
        db.add_all(
            [
                OfficerAssignment(
                    organization_id=seed["organization_id"],
                    officer_id=seed["officer_id"],
                    project_id=seed["project_id"],
                    form_id=seed["form_id"],
                    is_active=True,
                ),
                Beneficiary(
                    id=entity_one_id,
                    organization_id=seed["organization_id"],
                    project_id=seed["project_id"],
                    beneficiary_uid="WP-2026-000001",
                    beneficiary_type="Water Point",
                    display_name="Well A",
                    enrollment_status="active",
                ),
                Beneficiary(
                    id=entity_two_id,
                    organization_id=seed["organization_id"],
                    project_id=seed["project_id"],
                    beneficiary_uid="WP-2026-000002",
                    beneficiary_type="Water Point",
                    display_name="Well B",
                    enrollment_status="active",
                ),
                FieldWorkAssignment(
                    organization_id=seed["organization_id"],
                    project_id=seed["project_id"],
                    form_id=seed["form_id"],
                    created_by_user_id=seed["officer_user_id"],
                    name="Scoped follow-up",
                    description="Only one water point assigned",
                    assignment_type="Form only",
                    officer_ids_json=[str(seed["officer_id"])],
                    assigned_entity_ids_json=[str(entity_one_id)],
                    target_count=1,
                    completed_count=0,
                    priority="Normal",
                    status="Assigned",
                ),
            ]
        )
        await db.commit()

        principal = _principal_for(seed["organization_id"], seed["officer_user_id"])
        package = await MobileService(db).sync_package(principal)

        assert len(package.assignments) == 1
        assert package.assignments[0].entity_ids == [str(entity_one_id)]
        assert [entity.id for entity in package.entities] == [str(entity_one_id)]
        assert package.entities[0].entity_category_id == str(seed["category_id"])


async def test_mobile_sync_includes_entity_hierarchy_and_category_parents() -> None:
    session = await _build_session()
    async with session as db:
        seed = await _seed_org_and_form(db)
        parent_category_id = uuid4()
        parent_entity_id = uuid4()
        child_entity_id = uuid4()
        db.add_all(
            [
                OfficerAssignment(
                    organization_id=seed["organization_id"],
                    officer_id=seed["officer_id"],
                    project_id=seed["project_id"],
                    form_id=seed["form_id"],
                    is_active=True,
                ),
                EntityCategory(
                    id=parent_category_id,
                    organization_id=seed["organization_id"],
                    project_id=seed["project_id"],
                    name="Facility",
                    slug="facility",
                    sector="wash",
                    status="active",
                    statuses_json=["active", "inactive"],
                    workflow_json={},
                ),
            ]
        )
        category = await db.get(EntityCategory, seed["category_id"])
        assert category is not None
        category.parent_category_id = parent_category_id
        db.add_all(
            [
                Beneficiary(
                    id=parent_entity_id,
                    organization_id=seed["organization_id"],
                    project_id=seed["project_id"],
                    beneficiary_uid="FAC-2026-000001",
                    beneficiary_type="Facility",
                    display_name="North Hub",
                    enrollment_status="active",
                ),
                Beneficiary(
                    id=child_entity_id,
                    organization_id=seed["organization_id"],
                    project_id=seed["project_id"],
                    beneficiary_uid="WP-2026-000010",
                    beneficiary_type="Water Point",
                    display_name="Pump A",
                    enrollment_status="active",
                ),
                EntityRelationship(
                    organization_id=seed["organization_id"],
                    project_id=seed["project_id"],
                    parent_beneficiary_id=parent_entity_id,
                    child_beneficiary_id=child_entity_id,
                    relationship_type="located_in",
                    metadata_json={},
                ),
            ]
        )
        await db.commit()

        principal = _principal_for(seed["organization_id"], seed["officer_user_id"])
        package = await MobileService(db).sync_package(principal)

        categories_by_id = {category.id: category for category in package.entity_categories}
        entities_by_id = {entity.id: entity for entity in package.entities}

        assert categories_by_id[str(seed["category_id"])].parent_category_id == str(parent_category_id)
        assert entities_by_id[str(child_entity_id)].parent_entity_ids == [str(parent_entity_id)]
        assert entities_by_id[str(parent_entity_id)].child_entity_ids == [str(child_entity_id)]


async def test_mobile_sync_allows_existing_or_new_submission_without_selected_entity() -> None:
    session = await _build_session()
    async with session as db:
        seed = await _seed_org_and_form(db)
        principal = _principal_for(seed["organization_id"], seed["officer_user_id"])

        submission = await MobileService(db).upload_submission(
            principal=principal,
            payload=MobileSubmissionUpload(
                local_id="mobile-existing-or-new-001",
                project_id=str(seed["project_id"]),
                form_id=str(seed["form_id"]),
                form_version_id=str(seed["version_id"]),
                entity_type="Water Point",
                responses=[
                    {
                        "questionId": "q_name",
                        "variableName": "name",
                        "value": "Pump C",
                        "updatedAt": seed["now"],
                    }
                ],
                location={"latitude": 5.9, "longitude": 10.1, "accuracy": 8, "timestamp": seed["now"]},
                device_id="android-test",
                app_version="1.0.0-test",
                created_at=seed["now"],
                submitted_at=seed["now"],
            ),
        )

        assert submission.status == "synced"
        synced = (
            await db.execute(
                select(Submission).where(
                    Submission.organization_id == seed["organization_id"],
                    Submission.source_submission_id == "mobile-existing-or-new-001",
                )
            )
        ).scalar_one()
        assert synced.form_id == seed["form_id"]
        assert synced.entity_id is None


async def test_upload_audit_events_persists_audit_log() -> None:
    session = await _build_session()
    async with session as db:
        seed = await _seed_org_and_form(db)
        principal = _principal_for(seed["organization_id"], seed["officer_user_id"])

        result = await MobileService(db).upload_audit_events(
            principal=principal,
            payload=MobileAuditEventUpload(
                events=[
                    MobileAuditEventRead(
                        id="audit-local-1",
                        event_type="mobile.attachment_queued",
                        module="Attachments",
                        entity_type=None,
                        entity_id=None,
                        metadata={"attachmentLocalId": "attachment-local-1", "type": "Photo"},
                        occurred_at=seed["now"],
                    )
                ]
            ),
        )
        await db.commit()

        assert result.accepted == 1

        logs = (await db.execute(select(AuditLog).where(AuditLog.organization_id == seed["organization_id"]))).scalars().all()
        assert len(logs) == 1
        assert logs[0].action == "mobile.attachment_queued"
        assert logs[0].resource_type == "mobile_device"
        assert logs[0].resource_id == "audit-local-1"
        metadata = json.loads(logs[0].metadata_json)
        assert metadata["attachmentLocalId"] == "attachment-local-1"
        assert metadata["module"] == "Attachments"


async def test_upload_sync_queue_persists_audit_log_per_item() -> None:
    session = await _build_session()
    async with session as db:
        seed = await _seed_org_and_form(db)
        principal = _principal_for(seed["organization_id"], seed["officer_user_id"])

        result = await MobileService(db).upload_sync_queue(
            principal=principal,
            payload=MobileSyncQueueUpload(
                items=[
                    {"id": "queue-item-1", "operation": "MARK_NOTIFICATION_READ", "payload": {"notificationLocalId": "n-1"}},
                    {"operation": "MISSING_ID"},
                ]
            ),
        )
        await db.commit()

        assert result.accepted == 1
        assert result.failed == 1

        logs = (
            (await db.execute(select(AuditLog).where(AuditLog.organization_id == seed["organization_id"])))
            .scalars()
            .all()
        )
        assert len(logs) == 1
        assert logs[0].action == "mobile.sync_queue_item_received"
        assert logs[0].resource_id == "queue-item-1"
        metadata = json.loads(logs[0].metadata_json)
        assert metadata["operation"] == "MARK_NOTIFICATION_READ"
        assert metadata["payload"]["notificationLocalId"] == "n-1"


async def test_upload_attachment_links_to_existing_submission() -> None:
    session = await _build_session()
    async with session as db:
        seed = await _seed_org_and_form(db)
        principal = _principal_for(seed["organization_id"], seed["officer_user_id"])

        upload_result = await MobileService(db).upload_submission(
            principal=principal,
            payload=MobileSubmissionUpload(
                local_id="mobile-draft-001",
                project_id=str(seed["project_id"]),
                form_id=str(seed["form_id"]),
                form_version_id=str(seed["version_id"]),
                responses=[
                    {"questionId": "q_name", "variableName": "name", "value": "Jane", "updatedAt": seed["now"]},
                ],
                location={"latitude": 1.0, "longitude": 2.0, "accuracy": 8, "timestamp": seed["now"]},
                device_id="android-test-1",
                app_version="1.0.0-test",
                created_at=seed["now"],
                submitted_at=seed["now"],
            ),
        )
        await db.commit()
        assert upload_result.status == "synced"

        attachment_result = await MobileService(db).upload_attachment(
            principal=principal,
            payload=MobileAttachmentRead(
                id="attachment-local-1",
                submission_local_id="mobile-draft-001",
                type="Photo",
                local_uri="file:///storage/emulated/0/photo.jpg",
                remote_url=None,
                mime_type="image/jpeg",
                size=2048,
                sync_status="Syncing",
            ),
        )
        await db.commit()

        assert attachment_result.status == "accepted"
        assert attachment_result.server_id is not None

        evidence = (
            (await db.execute(select(MediaEvidence).where(MediaEvidence.organization_id == seed["organization_id"])))
            .scalars()
            .all()
        )
        assert len(evidence) == 1
        assert str(evidence[0].submission_id) == upload_result.server_submission_id
        assert evidence[0].media_type == "photo"
        assert evidence[0].file_name == "photo.jpg"
        assert evidence[0].mime_type == "image/jpeg"
        assert evidence[0].size_bytes == 2048
        assert evidence[0].metadata_json["submissionLocalId"] == "mobile-draft-001"


async def test_upload_submission_persists_inline_attachments() -> None:
    session = await _build_session()
    async with session as db:
        seed = await _seed_org_and_form(db)
        principal = _principal_for(seed["organization_id"], seed["officer_user_id"])

        upload_result = await MobileService(db).upload_submission(
            principal=principal,
            payload=MobileSubmissionUpload(
                local_id="mobile-draft-002",
                project_id=str(seed["project_id"]),
                form_id=str(seed["form_id"]),
                form_version_id=str(seed["version_id"]),
                responses=[
                    {"questionId": "q_name", "variableName": "name", "value": "John", "updatedAt": seed["now"]},
                ],
                attachments=[
                    {
                        "id": "attachment-local-2",
                        "submissionLocalId": "mobile-draft-002",
                        "type": "Signature",
                        "localUri": "file:///storage/emulated/0/signature.png",
                        "remoteUrl": None,
                        "mimeType": "image/png",
                        "size": 512,
                        "syncStatus": "Synced",
                    }
                ],
                location={"latitude": 1.0, "longitude": 2.0, "accuracy": 8, "timestamp": seed["now"]},
                device_id="android-test-2",
                app_version="1.0.0-test",
                created_at=seed["now"],
                submitted_at=seed["now"],
            ),
        )
        await db.commit()

        evidence = (
            (await db.execute(select(MediaEvidence).where(MediaEvidence.organization_id == seed["organization_id"])))
            .scalars()
            .all()
        )
        assert len(evidence) == 1
        assert str(evidence[0].submission_id) == upload_result.server_submission_id
        assert evidence[0].media_type == "signature"
        assert evidence[0].file_name == "signature.png"
