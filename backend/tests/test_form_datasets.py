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
async def test_form_dataset_replace_rename_delete() -> None:
    factory = await _session()
    async with factory() as session:
        org_id = uuid4()
        user_id = uuid4()
        form_id = uuid4()
        session.add(Organization(id=org_id, name="DS Org", slug="ds-org-mgmt"))
        session.add(User(id=user_id, email="o@dsmgmt.org", full_name="O", password_hash="x"))
        session.add(DataForm(id=form_id, organization_id=org_id, created_by_user_id=user_id, name="Mgmt", slug="mgmt", controls_json={}))
        await session.flush()
        service = FormService(session)

        created = await service.upload_form_dataset(
            organization_id=org_id, form_id=form_id, actor_user_id=user_id,
            filename="villages.csv", content=b"name,code\nA,A1\nB,B1\n", value_column="code", display_column="name",
        )
        slug = created["slug"]
        assert created["version"] == 1 and created["row_count"] == 2

        # Replace in place: same slug (bindings survive), bumped version, refreshed rows.
        replaced = await service.replace_form_dataset(
            organization_id=org_id, actor_user_id=user_id, slug=slug,
            filename="villages.csv", content=b"name,code\nA,A1\nB,B1\nC,C1\n", value_column="code", display_column="name",
        )
        await session.flush()
        assert replaced["slug"] == slug and replaced["version"] == 2 and replaced["row_count"] == 3
        # The refreshed rows replaced the old ones (no leftover duplicates).
        datasets = await service.list_form_datasets(organization_id=org_id, form_id=form_id)
        assert next(d for d in datasets if d["slug"] == slug)["row_count"] == 3

        # Rename.
        await service.rename_form_dataset(organization_id=org_id, actor_user_id=user_id, slug=slug, name="Villages master")
        await session.flush()
        datasets = await service.list_form_datasets(organization_id=org_id, form_id=form_id)
        assert next(d for d in datasets if d["slug"] == slug)["name"] == "Villages master"

        # Delete: it disappears from the picker.
        await service.delete_form_dataset(organization_id=org_id, actor_user_id=user_id, slug=slug)
        await session.flush()
        datasets = await service.list_form_datasets(organization_id=org_id, form_id=form_id)
        assert all(d["slug"] != slug for d in datasets)


@pytest.mark.asyncio
async def test_upload_form_dataset_rejects_duplicate_value_column() -> None:
    factory = await _session()
    async with factory() as session:
        org_id = uuid4()
        user_id = uuid4()
        form_id = uuid4()
        session.add(Organization(id=org_id, name="DS Org", slug="ds-org-dup"))
        session.add(User(id=user_id, email="o@dsdup.org", full_name="O", password_hash="x"))
        session.add(DataForm(id=form_id, organization_id=org_id, created_by_user_id=user_id, name="Dup", slug="dup", controls_json={}))
        await session.flush()

        with pytest.raises(ValueError, match="duplicate values"):
            await FormService(session).upload_form_dataset(
                organization_id=org_id, form_id=form_id, actor_user_id=user_id,
                filename="dupes.csv", content=b"name,code\nKumasi,KMA\nTema,KMA\n",
                value_column="code", display_column="name",
            )


@pytest.mark.asyncio
async def test_list_form_datasets_reuses_other_forms_and_reports_row_counts() -> None:
    factory = await _session()
    async with factory() as session:
        org_id = uuid4()
        user_id = uuid4()
        form_a = uuid4()
        form_b = uuid4()
        session.add(Organization(id=org_id, name="DS Org", slug="ds-org2"))
        session.add(User(id=user_id, email="o@ds2.org", full_name="O", password_hash="x"))
        session.add(DataForm(id=form_a, organization_id=org_id, created_by_user_id=user_id, name="Villages Source", slug="villages-source", controls_json={}))
        session.add(DataForm(id=form_b, organization_id=org_id, created_by_user_id=user_id, name="Visit", slug="visit", controls_json={}))
        await session.flush()

        service = FormService(session)
        await service.upload_form_dataset(
            organization_id=org_id, form_id=form_a, actor_user_id=user_id,
            filename="villages.csv", content=b"name,code\nKumasi,KMA\nTema,TMA\nAccra,ACC\n",
            value_column="code", display_column="name",
        )
        await service.upload_form_dataset(
            organization_id=org_id, form_id=form_b, actor_user_id=user_id,
            filename="crops.csv", content=b"crop,code\nMaize,MZ\n", value_column="code", display_column="crop",
        )
        await session.flush()

        datasets = await service.list_form_datasets(organization_id=org_id, form_id=form_b)
        by_name = {d["name"]: d for d in datasets}

        # Form B's own dataset comes first and is labelled as this form's.
        assert datasets[0]["name"] == "crops.csv"
        assert by_name["crops.csv"]["kind"] == "Form dataset"
        assert by_name["crops.csv"]["row_count"] == 1

        # Form A's dataset is now reusable from Form B, labelled with its source form.
        assert by_name["villages.csv"]["kind"] == "From: Villages Source"
        assert by_name["villages.csv"]["row_count"] == 3


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


def test_matrix_rows_from_source_compile() -> None:
    from app.services.mobile import _build_question_field

    q = _build_question_field(
        {
            "id": "m1",
            "type": "matrix_single",
            "label": "Rate crops",
            "matrix": {"rows": [], "columns": ["Poor", "Good"]},
            "selection": {"source": "question", "fromQuestionVariable": "crops"},
        },
        field_id="m1",
        section_id="s",
        order=1,
        variable_to_id={"crops": "q-crops"},
    )
    assert q["type"] == "Matrix"
    # The row source compiles like any selection so mobile can resolve rows from the crops question.
    assert q["selection"]["source"] == "question"
    assert q["selection"]["fromQuestionId"] == "q-crops"


def test_carry_forward_compiles_to_mobile() -> None:
    from app.services.mobile import _build_question_field

    # Same-form carry-forward (repeat visits): fromFormId is null.
    same = _build_question_field(
        {"id": "q1", "type": "number", "label": "Children", "carryForward": {"fromVariable": "children"}},
        field_id="q1",
        section_id="s",
        order=1,
    )
    assert same["carryForward"] == {"fromFormId": None, "fromVariable": "children"}

    # Cross-form carry-forward keeps the source form id.
    other = _build_question_field(
        {
            "id": "q2",
            "type": "number",
            "label": "Baseline weight",
            "carryForward": {"fromFormId": "form-abc", "fromVariable": "weight"},
        },
        field_id="q2",
        section_id="s",
        order=1,
    )
    assert other["carryForward"] == {"fromFormId": "form-abc", "fromVariable": "weight"}

    # No carry-forward config → null (unchanged behaviour).
    plain = _build_question_field(
        {"id": "q3", "type": "text", "label": "Name"}, field_id="q3", section_id="s", order=1
    )
    assert plain["carryForward"] is None


def test_logic_operators_compile_to_mobile() -> None:
    from app.services.mobile import _parse_logic_condition

    vmap = {"age": "q-age", "region": "q-region", "name": "q-name", "notes": "q-notes"}

    def parse(clause: str) -> dict:
        result = _parse_logic_condition(clause, vmap)
        assert result is not None
        return result

    # >= / <= must keep the "or equal" meaning (previously collapsed to strict GreaterThan/LessThan).
    assert parse("${age} >= 18")["operator"] == "GreaterOrEqual"
    assert parse("${age} <= 49")["operator"] == "LessOrEqual"
    assert parse("${age} > 18")["operator"] == "GreaterThan"
    assert parse("${age} < 5")["operator"] == "LessThan"
    assert parse("${name} != 'Done'")["operator"] == "NotEquals"

    between = parse("${age} between 12,49")
    assert between["operator"] == "Between"
    assert between["value"] == "12,49"

    in_list = parse("${region} in Kano,Lagos")
    assert in_list["operator"] == "In"
    assert in_list["value"] == "Kano,Lagos"

    assert parse("${name} contains 'ali'")["operator"] == "Contains"
    assert parse("${name} starts_with 'KN'")["operator"] == "StartsWith"
    assert parse("${notes} is empty")["operator"] == "IsEmpty"
    assert parse("${notes} is not empty")["operator"] == "IsNotEmpty"


def test_repeat_rows_from_question_compile() -> None:
    from app.services.mobile import _build_question_field

    q = _build_question_field(
        {
            "id": "rg",
            "type": "repeat_group",
            "label": "Crop details",
            "children": [{"id": "c1", "variable_name": "crop_name", "type": "text", "label": "Crop"}],
            "selection": {
                "source": "question",
                "fromQuestionVariable": "crops",
                "seedChildVariable": "crop_name",
            },
        },
        field_id="rg",
        section_id="s",
        order=1,
        variable_to_id={"crops": "q-crops"},
    )
    assert q["type"] == "RepeatGroup"
    assert q["selection"]["source"] == "question"
    assert q["selection"]["fromQuestionId"] == "q-crops"
    assert q["selection"]["seedChildVariable"] == "crop_name"


def test_cross_field_constraint_and_constant_sum_compile() -> None:
    from app.services.mobile import _validation_rules

    # A cross-field constraint authored as validation.expression must reach the app as a Custom rule.
    constraint_rules = _validation_rules(
        {"id": "end", "type": "date", "validation": {"expression": "${end} >= ${start}"}}
    )
    assert any(
        r["ruleType"] == "Custom" and r["value"] == "constraint:${end} >= ${start}" for r in constraint_rules
    )

    # An advanced logic rule of kind "validation" is also compiled (previously it was dropped).
    logic_rules = _validation_rules(
        {"id": "q", "type": "number", "logic": [{"kind": "validation", "expression": "${q} > 0"}]}
    )
    assert any(r["value"] == "constraint:${q} > 0" for r in logic_rules)

    # Constant-sum questions carry a sum-target rule (defaults to 100).
    sum_rules = _validation_rules({"id": "alloc", "type": "constant_sum"})
    assert any(r["value"] == "sumTarget:100" for r in sum_rules)

    # A repeat child flagged unique-per-row carries a uniqueInGroup rule.
    unique_rules = _validation_rules({"id": "name", "type": "text", "validation": {"uniqueInGroup": True}})
    assert any(r["value"] == "uniqueInGroup:true" for r in unique_rules)


def test_constant_sum_total_enforced_server_side() -> None:
    from app.schemas.collection import FormSchema
    from app.services.collection import validate_submission_payload

    schema = FormSchema.model_validate(
        {
            "sections": [
                {
                    "id": "s",
                    "title": "Spend",
                    "fields": [
                        {
                            "id": "alloc",
                            "variable_name": "alloc",
                            "type": "constant_sum",
                            "label": "Budget split",
                            "options": [{"label": "Food", "value": "food"}, {"label": "Rent", "value": "rent"}],
                        }
                    ],
                }
            ]
        }
    )
    bad = validate_submission_payload(schema=schema, payload={"alloc": {"food": 40, "rent": 40}}, location_accuracy=None)
    assert any("add up to 100" in issue for issue in bad)
    good = validate_submission_payload(schema=schema, payload={"alloc": {"food": 60, "rent": 40}}, location_accuracy=None)
    assert not any("add up to 100" in issue for issue in good)


def test_section_relevance_compiles_to_mobile() -> None:
    from app.services.mobile import _schema_sections

    schema = {
        "sections": [
            {
                "id": "intro",
                "title": "Intro",
                "fields": [{"id": "q_has", "variable_name": "has_children", "type": "yes_no", "label": "Children?"}],
            },
            {
                "id": "kids",
                "title": "Children details",
                "visibleWhen": "${has_children} = 'Yes'",
                "fields": [{"id": "q_count", "variable_name": "child_count", "type": "number", "label": "How many?"}],
            },
        ]
    }
    sections = _schema_sections(schema)
    intro, kids = sections[0], sections[1]
    # A section with no condition is always shown (visibleWhen is None).
    assert intro["visibleWhen"] is None
    # The conditional section compiles its relevance against the source question id.
    assert kids["visibleWhen"] == {
        "sourceQuestionId": "q_has",
        "operator": "Equals",
        "value": "Yes",
    }


def test_warn_only_validation_emits_tag() -> None:
    from app.services.mobile import _build_question_field

    q = _build_question_field(
        {"id": "n", "type": "number", "label": "N", "validation": {"warnOnly": True, "min": 0}},
        field_id="n",
        section_id="s",
        order=1,
    )
    assert "validation-warn-only" in q["metadataTags"]
