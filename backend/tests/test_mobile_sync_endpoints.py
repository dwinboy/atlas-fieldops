import json
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.audit import AuditLog
from app.models.base import Base
from app.models.collection import DataForm, DataFormVersion, FieldOfficerProfile, Project, Survey
from app.models.identity import Organization, User
from app.models.operations import MediaEvidence
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
        ]
    )
    await session.commit()
    return {
        "organization_id": organization_id,
        "officer_user_id": officer_user_id,
        "project_id": project_id,
        "form_id": form_id,
        "version_id": version_id,
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
