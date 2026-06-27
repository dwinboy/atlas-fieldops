from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models import Base, Organization, User
from app.models.collection import DataForm, DataFormVersion, Submission
from app.schemas.mobile import MobileFormVersionRead
from app.services.collection import FormService
from app.services.mobile import MobileService


async def _session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest.mark.asyncio
async def test_form_dataset_upload_creates_cascading_reference_list() -> None:
    factory = await _session()
    async with factory() as session:
        org_id = uuid4()
        user_id = uuid4()
        form_id = uuid4()
        session.add(Organization(id=org_id, name="DS Org", slug="ds-org"))
        session.add(User(id=user_id, email="o@ds.org", full_name="O", password_hash="x"))
        session.add(
            DataForm(
                id=form_id,
                organization_id=org_id,
                created_by_user_id=user_id,
                name="Farm Visit",
                slug="farm-visit",
                controls_json={},
            )
        )
        await session.flush()

        csv = b"district,region,code\nKumasi,Ashanti,KMA\nTema,Greater Accra,TMA\n"
        result = await FormService(session).upload_form_dataset(
            organization_id=org_id,
            form_id=form_id,
            actor_user_id=user_id,
            filename="districts.csv",
            content=csv,
            value_column="code",
            display_column="district",
            parent_column="region",
        )
        await session.flush()

        assert result["columns"] == ["district", "region", "code"]
        assert result["row_count"] == 2
        assert result["value_column"] == "code"

        # The dataset syncs to mobile as a reference list carrying parentCode + the full row in `data`.
        lists = await MobileService(session)._reference_lists(org_id)
        dataset = next(item for item in lists if item.slug == result["slug"])
        values = dataset.values
        assert len(values) == 2
        kumasi = next(value for value in values if value["code"] == "KMA")
        assert kumasi["label"] == "Kumasi"
        assert kumasi["parentCode"] == "Ashanti"
        assert kumasi["data"]["region"] == "Ashanti"

        # Listing returns the dataset for the builder's dataset picker.
        datasets = await FormService(session).list_form_datasets(organization_id=org_id, form_id=form_id)
        assert datasets and datasets[0]["columns"] == ["district", "region", "code"]


@pytest.mark.asyncio
async def test_linked_records_index_exposes_other_form_submissions() -> None:
    factory = await _session()
    async with factory() as session:
        org_id = uuid4()
        user_id = uuid4()
        farm_form_id = uuid4()
        farm_version_id = uuid4()
        session.add(Organization(id=org_id, name="LR Org", slug="lr-org"))
        session.add(User(id=user_id, email="o@lr.org", full_name="O", password_hash="x"))
        session.add(
            DataForm(id=farm_form_id, organization_id=org_id, created_by_user_id=user_id, name="Farm", slug="farm", controls_json={})
        )
        session.add(
            DataFormVersion(id=farm_version_id, organization_id=org_id, form_id=farm_form_id, version=1, schema_json={})
        )
        now = datetime.now(UTC)
        session.add(
            Submission(
                id=uuid4(),
                organization_id=org_id,
                form_id=farm_form_id,
                form_version_id=farm_version_id,
                client_submission_id="farm-001",
                status="submitted",
                payload_json={"_mobile_responses": [{"variableName": "farm_name", "value": "Green Acres"}, {"variableName": "region", "value": "Ashanti"}]},
                device_id="dev-1",
                captured_at=now,
                submitted_at=now,
                sync_received_at=now,
                latitude=0.0,
                longitude=0.0,
                location_captured_at=now,
            )
        )
        await session.flush()

        # A visit form references the Farm form's records.
        version_reads = [
            MobileFormVersionRead(
                id=str(uuid4()),
                form_id=str(uuid4()),
                version=1,
                sections=[
                    {
                        "id": "s1",
                        "questions": [
                            {"id": "q1", "selection": {"source": "record", "recordSource": "form", "recordFormId": str(farm_form_id)}}
                        ],
                    }
                ],
            )
        ]
        records = await MobileService(session)._linked_records(org_id, version_reads)
        assert len(records) == 1
        assert records[0].id == "farm-001"
        assert records[0].form_id == str(farm_form_id)
        assert records[0].label == "Green Acres"
        assert records[0].data["region"] == "Ashanti"


def test_mobile_selection_compiles_conditions_and_autofill() -> None:
    from app.services.mobile import _mobile_selection

    variable_to_id = {"household": "q-household", "district": "q-district"}
    field = {
        "selection": {
            "source": "record",
            "recordSource": "form",
            "recordFormId": "form-123",
            "filterMatch": "any",
            "filters": [
                {"column": "region", "op": "eq", "fromVariable": "household"},
                {"column": "area", "op": "between", "value": "1", "value2": "5"},
                {"column": "name", "op": "not_empty"},
            ],
            "autofill": [{"fromColumn": "district", "toVariable": "district", "overwrite": True}],
        }
    }
    compiled = _mobile_selection(field, variable_to_id)
    assert compiled is not None
    assert compiled["source"] == "record"
    assert compiled["recordFormId"] == "form-123"
    assert compiled["filterMatch"] == "any"
    # Dynamic filter resolves its source question id; between keeps value2; op-only filter kept.
    assert compiled["filters"][0]["fromQuestionId"] == "q-household"
    assert compiled["filters"][1]["op"] == "between" and compiled["filters"][1]["value2"] == "5"
    assert compiled["filters"][2]["op"] == "not_empty"
    # Auto-fill resolves the target question id from the variable name.
    assert compiled["autofill"][0]["toQuestionId"] == "q-district"
    assert compiled["autofill"][0]["overwrite"] is True


def test_mobile_selection_is_none_for_static() -> None:
    from app.services.mobile import _mobile_selection

    assert _mobile_selection({"selection": {"source": "static"}}, {}) is None
    assert _mobile_selection({}, {}) is None


def test_article_and_auto_id_compile_as_readonly_behaviors() -> None:
    from app.services.mobile import _build_question_field

    article = _build_question_field({"id": "a1", "type": "article", "label": "Read me", "required": True}, field_id="a1", section_id="s", order=1)
    assert article["readOnly"] is True
    assert "display-note" in article["metadataTags"]
    assert article["required"] is False  # a note never blocks submission

    auto = _build_question_field({"id": "a2", "type": "auto_id", "label": "Ref"}, field_id="a2", section_id="s", order=2)
    assert auto["readOnly"] is True
    assert "auto-id" in auto["metadataTags"]


def test_load_reference_settings_compile() -> None:
    from app.services.mobile import _mobile_selection

    variable_to_id = {"farmer_name": "q-name", "village": "q-village", "src": "q-src"}
    field = {
        "selection": {
            "source": "record",
            "recordSource": "form",
            "recordFormId": "form-9",
            "loadColumns": ["farmer_name", "village"],
            "allowMultiple": True,
            "allowReuse": True,
            "allowAddNew": True,
            "confirmResponses": True,
            "showOnlyVerified": True,
            "minimumAgeDays": "7",
            "autofill": [{"fromColumn": "farmer_name", "toVariable": "farmer_name"}],
        }
    }
    compiled = _mobile_selection(field, variable_to_id)
    assert compiled["allowMultiple"] is True
    assert compiled["showOnlyVerified"] is True
    assert compiled["minimumAgeDays"] == 7
    assert compiled["loadColumns"] == ["farmer_name", "village"]
    # loadColumns become auto-fill into matching questions (village added; farmer_name already mapped).
    targets = {entry["toVariable"]: entry["toQuestionId"] for entry in compiled["autofill"]}
    assert targets["village"] == "q-village"
    assert targets["farmer_name"] == "q-name"


def test_question_source_resolves_from_question() -> None:
    from app.services.mobile import _mobile_selection

    compiled = _mobile_selection(
        {"selection": {"source": "question", "fromQuestionVariable": "farms", "allowMultiple": True}},
        {"farms": "q-farms"},
    )
    assert compiled["source"] == "question"
    assert compiled["fromQuestionId"] == "q-farms"
    assert compiled["allowMultiple"] is True


def test_subform_compiles_to_repeat_group_with_children() -> None:
    from app.services.mobile import _build_question_field

    field = {
        "id": "members",
        "type": "subform",
        "label": "Household members",
        "subform": {"mode": "embed", "min": 1, "max": 8},
        "children": [
            {"id": "m_name", "type": "text", "label": "Name"},
            {"id": "m_age", "type": "number", "label": "Age"},
        ],
    }
    compiled = _build_question_field(field, field_id="members", section_id="s", order=1)
    assert compiled["type"] == "RepeatGroup"
    assert compiled["repeatSettings"]["minRepeats"] == 1
    assert compiled["repeatSettings"]["maxRepeats"] == 8
    # Embedded questions become the repeat group's fields.
    assert [f["variableName"] for f in compiled["defaultValue"]["fields"]]  # built
    assert len(compiled["defaultValue"]["fields"]) == 2


def test_logic_rules_compile_and_or_conditions() -> None:
    from app.services.mobile import _logic_rules

    variable_to_id = {"gender": "q-gender", "age": "q-age"}
    field = {
        "id": "q3",
        "type": "text",
        "logic": [
            {"id": "r1", "kind": "show", "expression": "${gender} = 'Female' and ${age} > 18"},
            {"id": "r2", "kind": "hide", "expression": "${gender} = 'Male' or ${age} < 5"},
            {"id": "r3", "kind": "required", "expression": "${age} > 60"},
        ],
    }
    rules = _logic_rules(field, variable_to_id)
    by_id = {r["id"]: r for r in rules}
    assert by_id["r1"]["match"] == "all"
    assert [c["sourceQuestionId"] for c in by_id["r1"]["conditions"]] == ["q-gender", "q-age"]
    assert by_id["r1"]["conditions"][1]["operator"] == "GreaterThan"
    assert by_id["r2"]["match"] == "any"
    # Single-condition rule stays simple (no conditions array).
    assert "conditions" not in by_id["r3"]
    assert by_id["r3"]["sourceQuestionId"] == "q-age"
