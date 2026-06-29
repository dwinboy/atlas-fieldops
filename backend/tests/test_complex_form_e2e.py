"""End-to-end test of a maximally complex, sector-oriented data-collection scenario, driven through
the real services exactly as the builder/app would: a household registration form (with roster rows
that become child entities) plus a monitoring-visit form that links a dataset, linked records, a
matrix sourced from a question, calculations, carry-forward, a cross-field/constant-sum constraint,
section relevance, and the newer response types. Proves every feature works together end to end —
compile → submit → validate → approve → entities → carry-forward — and that submissions capture all
data for an arbitrarily complex form."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.base import Base
from app.models.collection import DataForm, DataFormVersion, FieldOfficerProfile, OfficerAssignment, Project, Survey
from app.models.identity import Organization, User
from app.models.operations import Beneficiary, EntityRelationship
from app.schemas.auth import CurrentPrincipal
from app.schemas.collection import FormSchema
from app.schemas.mobile import MobileSubmissionUpload
from app.schemas.collection import SubmissionReviewAction
from app.services.collection import FormService, SubmissionService, validate_submission_payload
from app.services.mobile import MobileService


def _principal(field_user_id, org_id) -> CurrentPrincipal:
    return CurrentPrincipal(
        user_id=str(field_user_id),
        organization_id=str(org_id),
        email="officer@hh.org",
        full_name="Officer",
        organization_slug="hh-org",
        organization_name="HH Org",
        roles=["field_officer"],
        permissions=["submission.create", "sync.mobile"],
        scope_type="own",
    )


@pytest.mark.asyncio
async def test_complex_form_end_to_end() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        org_id = uuid4()
        field_user_id = uuid4()
        manager_id = uuid4()
        project_id = uuid4()
        survey_id = uuid4()
        reg_form_id = uuid4()
        reg_version_id = uuid4()
        visit_form_id = uuid4()
        officer_id = uuid4()
        now = datetime.now(UTC)
        principal = _principal(field_user_id, org_id)

        session.add_all(
            [
                Organization(id=org_id, name="HH Org", slug="hh-org"),
                User(id=field_user_id, email="officer@hh.org", full_name="Officer", password_hash="x"),
                User(id=manager_id, email="manager@hh.org", full_name="Manager", password_hash="x"),
                FieldOfficerProfile(id=officer_id, organization_id=org_id, user_id=field_user_id, is_active=True),
                Project(id=project_id, organization_id=org_id, name="Resilience", slug="resilience", status="active"),
                Survey(
                    id=survey_id, organization_id=org_id, project_id=project_id, created_by_user_id=manager_id,
                    owner_user_id=manager_id, title="Resilience", code="RES", survey_type="registration", status="active",
                ),
                # ---- Form A: Household Registration with a roster that registers each member ----
                DataForm(
                    id=reg_form_id, organization_id=org_id, project_id=project_id, survey_id=survey_id,
                    created_by_user_id=manager_id, name="Household Registration", slug="household-registration",
                    status="published", current_version=1,
                    controls_json={"entity_controls": {"linked_to_entity": True, "entity_type": "Household", "creates_new_entity": True, "requires_existing_entity": False}},
                ),
                DataFormVersion(
                    id=reg_version_id, organization_id=org_id, form_id=reg_form_id, version=1, offline_compatible=True,
                    published_at=now,
                    schema_json={
                        "sections": [
                            {
                                "id": "id", "title": "Household",
                                "fields": [
                                    {"id": "q_head", "variable_name": "head_name", "type": "text", "label": "Head of household", "required": True},
                                    {
                                        "id": "q_members", "variable_name": "members", "type": "repeat_group", "label": "Members",
                                        "repeatEntity": {"entityType": "Household Member", "nameVariable": "member_name", "relationship": "member_of"},
                                        "children": [
                                            {"id": "q_mname", "variable_name": "member_name", "type": "text", "label": "Member name"},
                                            {"id": "q_mage", "variable_name": "member_age", "type": "number", "label": "Age"},
                                        ],
                                    },
                                ],
                            }
                        ]
                    },
                ),
                # Visit form created now so a dataset can be uploaded against it; version added below.
                DataForm(
                    id=visit_form_id, organization_id=org_id, project_id=project_id, survey_id=survey_id,
                    created_by_user_id=manager_id, name="Monitoring Visit", slug="monitoring-visit",
                    status="published", current_version=1,
                    controls_json={"entity_controls": {"linked_to_entity": True, "entity_type": "Household", "requires_existing_entity": True}},
                ),
            ]
        )
        await session.commit()

        # ===== Phase A: register a household; approval creates the household + member entities =====
        await MobileService(session).upload_submission(
            principal=principal,
            payload=MobileSubmissionUpload(
                local_id="reg-1", project_id=str(project_id), form_id=str(reg_form_id), form_version_id=str(reg_version_id),
                entity_type="Household",
                responses=[
                    {"questionId": "q_head", "variableName": "head_name", "value": "Amina Yusuf", "updatedAt": now},
                    {"questionId": "q_members", "variableName": "members", "value": [{"member_name": "Bilal"}, {"member_name": "Sara"}], "updatedAt": now},
                ],
                location={"latitude": 9.0, "longitude": 7.0, "accuracy": 6, "timestamp": now},
                device_id="dev", app_version="1.0", created_at=now, submitted_at=now,
            ),
        )
        reg_submission = (await SubmissionService(session).list_submissions(organization_id=org_id, status=None, actor_user_id=field_user_id, scope_type="own"))[0]
        await SubmissionService(session).review_submission(
            organization_id=org_id, actor_user_id=manager_id, submission_id=reg_submission.id,
            payload=SubmissionReviewAction(action="approve", comment="ok"),
        )
        await session.commit()
        beneficiaries = (await session.execute(select(Beneficiary))).scalars().all()
        household = next(b for b in beneficiaries if b.beneficiary_type == "Household")
        members = [b for b in beneficiaries if b.beneficiary_type == "Household Member"]
        assert {m.display_name for m in members} == {"Bilal", "Sara"}
        relationships = (await session.execute(select(EntityRelationship))).scalars().all()
        assert len(relationships) == 2 and all(r.parent_beneficiary_id == household.id for r in relationships)

        # ===== Phase B: upload a dataset + publish the complex visit form =====
        dataset = await FormService(session).upload_form_dataset(
            organization_id=org_id, form_id=visit_form_id, actor_user_id=manager_id,
            filename="crops.csv", content=b"name,code\nMaize,maize\nRice,rice\nBeans,beans\n",
            value_column="code", display_column="name",
        )
        crops_slug = dataset["slug"]
        visit_schema = {
            "sections": [
                {
                    "id": "main", "title": "Visit",
                    "fields": [
                        {"id": "q_village", "variable_name": "village", "type": "select", "label": "Village",
                         "options": [{"label": "Kano", "value": "KN"}, {"label": "Lagos", "value": "LG"}]},
                        {"id": "q_hh", "variable_name": "household", "type": "lookup", "label": "Household",
                         "selection": {"source": "record", "recordSource": "form", "recordFormId": str(reg_form_id), "displayColumn": "head_name", "valueColumn": "head_name"}},
                        {"id": "q_crops", "variable_name": "crops", "type": "multiselect", "label": "Crops grown",
                         "selection": {"source": "dataset", "datasetId": crops_slug, "displayColumn": "name", "valueColumn": "code", "allowMultiple": True}},
                        {"id": "q_rating", "variable_name": "rating", "type": "matrix_single", "label": "Rate each crop",
                         "matrix": {"rows": [], "columns": ["Poor", "Good"]}, "selection": {"source": "question", "fromQuestionVariable": "crops"}},
                        {"id": "q_vs", "variable_name": "visit_start", "type": "date", "label": "Start"},
                        {"id": "q_ve", "variable_name": "visit_end", "type": "date", "label": "End",
                         "validation": {"expression": "${visit_end} >= ${visit_start}"}},
                        {"id": "q_budget", "variable_name": "budget", "type": "constant_sum", "label": "Budget split",
                         "options": [{"label": "Seed", "value": "seed"}, {"label": "Labour", "value": "labour"}]},
                        {"id": "q_score", "variable_name": "score", "type": "calculated", "label": "Score",
                         "calculation": "if(${village} = 'KN', 10, 0)"},
                        {"id": "q_yield", "variable_name": "last_yield", "type": "number", "label": "Yield (kg)",
                         "carryForward": {"fromVariable": "last_yield"}},
                        {"id": "q_dur", "variable_name": "visit_duration", "type": "duration", "label": "Visit length"},
                        {"id": "q_tags", "variable_name": "observations", "type": "tags", "label": "Observations"},
                        {"id": "q_range", "variable_name": "income_band", "type": "range", "label": "Income band"},
                        {"id": "q_ts", "variable_name": "captured_at", "type": "timestamp", "label": "Recorded at"},
                    ],
                },
                {
                    "id": "kano_only", "title": "Kano programme", "visibleWhen": "${village} = 'KN'",
                    "fields": [{"id": "q_kano", "variable_name": "kano_note", "type": "text", "label": "Kano note"}],
                },
            ]
        }
        visit_version_id = uuid4()
        session.add(
            DataFormVersion(
                id=visit_version_id, organization_id=org_id, form_id=visit_form_id, version=1, offline_compatible=True,
                published_at=now, schema_json=visit_schema,
            )
        )
        session.add(OfficerAssignment(organization_id=org_id, officer_id=officer_id, project_id=project_id, form_id=visit_form_id, is_active=True))
        await session.commit()

        # ===== Phase C: the device pulls the form — every linkage compiled correctly =====
        package = await MobileService(session).sync_package(principal)
        visit_version = next(v for v in package.form_versions if v.form_id == str(visit_form_id))
        questions = {q["id"]: q for section in visit_version.sections for q in section["questions"]}

        assert questions["q_village"]["options"][0]["value"] == "KN"  # author answer codes
        assert questions["q_crops"]["selection"]["datasetId"] == crops_slug  # dataset link
        assert any(rl.id == crops_slug for rl in package.reference_lists)
        assert questions["q_hh"]["selection"]["recordFormId"] == str(reg_form_id)  # linked records
        assert questions["q_rating"]["selection"]["fromQuestionId"] == "q_crops"  # matrix rows from question
        assert questions["q_yield"]["carryForward"] == {"fromFormId": None, "fromVariable": "last_yield"}  # carry-forward
        budget_rules = [r["value"] for r in questions["q_budget"]["validationRules"] if r["ruleType"] == "Custom"]
        assert any(str(v).startswith("sumTarget:") for v in budget_rules)  # constant-sum
        end_rules = [r["value"] for r in questions["q_ve"]["validationRules"] if r["ruleType"] == "Custom"]
        assert any(str(v).startswith("constraint:") for v in end_rules)  # cross-field constraint enforced
        assert "duration" in questions["q_dur"]["metadataTags"]
        assert "tag-list" in questions["q_tags"]["metadataTags"]
        assert "numeric-range" in questions["q_range"]["metadataTags"]
        assert "auto-timestamp" in questions["q_ts"]["metadataTags"]
        kano_section = next(s for s in visit_version.sections if s["id"] == "kano_only")
        assert kano_section["visibleWhen"]["operator"] == "Equals" and kano_section["visibleWhen"]["value"] == "KN"  # section relevance
        # The registered household is available offline as a linked record, keyed to its entity.
        hh_record = next(r for r in package.linked_records if r.form_id == str(reg_form_id) and r.data.get("head_name") == "Amina Yusuf")
        assert hh_record.entity_id == str(household.id)

        # ===== Phase D: collect a complex visit — the submission captures every answer =====
        await MobileService(session).upload_submission(
            principal=principal,
            payload=MobileSubmissionUpload(
                local_id="visit-1", project_id=str(project_id), form_id=str(visit_form_id), form_version_id=str(visit_version_id),
                entity_type="Household", entity_id=str(household.id),
                responses=[
                    {"questionId": "q_village", "variableName": "village", "value": "KN", "updatedAt": now},
                    {"questionId": "q_hh", "variableName": "household", "value": "Amina Yusuf", "updatedAt": now},
                    {"questionId": "q_crops", "variableName": "crops", "value": ["maize", "rice"], "updatedAt": now},
                    {"questionId": "q_rating", "variableName": "rating", "value": {"maize": "Good", "rice": "Poor"}, "updatedAt": now},
                    {"questionId": "q_vs", "variableName": "visit_start", "value": "2024-05-01", "updatedAt": now},
                    {"questionId": "q_ve", "variableName": "visit_end", "value": "2024-05-03", "updatedAt": now},
                    {"questionId": "q_budget", "variableName": "budget", "value": {"seed": 60, "labour": 40}, "updatedAt": now},
                    {"questionId": "q_yield", "variableName": "last_yield", "value": 100, "updatedAt": now},
                    {"questionId": "q_dur", "variableName": "visit_duration", "value": 1800, "updatedAt": now},
                    {"questionId": "q_tags", "variableName": "observations", "value": ["pest", "drought"], "updatedAt": now},
                    {"questionId": "q_range", "variableName": "income_band", "value": {"low": 200, "high": 500}, "updatedAt": now},
                ],
                location={"latitude": 9.0, "longitude": 7.0, "accuracy": 6, "timestamp": now},
                device_id="dev", app_version="1.0", created_at=now, submitted_at=now,
            ),
        )
        visit = next(
            s for s in await SubmissionService(session).list_submissions(organization_id=org_id, status=None, actor_user_id=field_user_id, scope_type="own")
            if s.source_submission_id == "visit-1"
        )
        payload = visit.payload_json
        assert payload["village"] == "KN"
        assert payload["crops"] == ["maize", "rice"]
        assert payload["rating"] == {"maize": "Good", "rice": "Poor"}
        assert payload["budget"] == {"seed": 60, "labour": 40}
        assert payload["observations"] == ["pest", "drought"]
        assert payload["income_band"] == {"low": 200, "high": 500}
        assert payload["last_yield"] == 100

        # ===== Phase E: validation blocks bad data, allows good data (server-side) =====
        schema = FormSchema.model_validate(visit_schema)
        good = {"village": "KN", "budget": {"seed": 60, "labour": 40}}
        bad = {"village": "KN", "budget": {"seed": 60, "labour": 30}}
        assert not [i for i in validate_submission_payload(schema=schema, payload=good, location_accuracy=None) if "add up to" in i]
        assert [i for i in validate_submission_payload(schema=schema, payload=bad, location_accuracy=None) if "add up to" in i]

        # ===== Phase F: carry-forward — the visit's value is keyed to the household for next time =====
        package2 = await MobileService(session).sync_package(principal)
        visit_record = next(
            r for r in package2.linked_records if r.form_id == str(visit_form_id) and r.entity_id == str(household.id)
        )
        assert visit_record.data.get("last_yield") == 100
