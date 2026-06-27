from app.schemas.collection import FormSchema
from app.services.mobile import _build_question_field, _mobile_question_type, _validation_rules


def test_form_schema_preserves_repeat_group_children_for_mobile_sync() -> None:
    schema = FormSchema.model_validate(
        {
            "sections": [
                {
                    "id": "main",
                    "title": "Main",
                    "fields": [
                        {
                            "id": "household_members",
                            "label": "Household members",
                            "type": "repeat_group",
                            "repeat": {"min": 1, "max": 4},
                            "children": [
                                {
                                    "id": "member_status",
                                    "label": "Member status",
                                    "type": "select",
                                    "variable_name": "member_status",
                                    "options": [{"label": "Present", "value": "present"}],
                                }
                            ],
                        }
                    ],
                }
            ]
        }
    )

    field = schema.sections[0].fields[0]

    assert field.repeat == {"min": 1, "max": 4}
    assert field.children[0].variable_name == "member_status"
    assert field.model_dump(mode="json")["repeat"] == {"min": 1, "max": 4}
    assert field.model_dump(mode="json")["children"][0]["options"][0]["value"] == "present"


def test_build_question_field_converts_repeat_group_children_to_mobile_fields() -> None:
    field = {
        "id": "household_members",
        "label": "Household members",
        "type": "repeat_group",
        "repeat": {"min": 1, "max": 4, "addButtonLabel": "Add member"},
        "children": [
            {
                "id": "member_status",
                "label": "Member status",
                "type": "select",
                "variable_name": "member_status",
                "required": True,
                "options": [{"label": "Present", "value": "present"}],
            }
        ],
    }

    question = _build_question_field(field, field_id="household_members", section_id="main", order=1)
    child = question["defaultValue"]["fields"][0]

    assert question["type"] == "RepeatGroup"
    assert question["repeatSettings"] == {
        "minRepeats": 1,
        "maxRepeats": 4,
        "addButtonLabel": "Add member",
        "countFromVariable": None,
    }
    assert child["type"] == "SingleSelect"
    assert child["variableName"] == "member_status"
    assert child["options"][0]["value"] == "present"
    assert child["required"] is True


def test_form_schema_preserves_matrix_rows_and_columns_for_mobile_sync() -> None:
    schema = FormSchema.model_validate(
        {
            "sections": [
                {
                    "id": "main",
                    "title": "Main",
                    "fields": [
                        {
                            "id": "service_matrix",
                            "label": "Service matrix",
                            "type": "matrix_single",
                            "matrix": {"rows": ["Cleanliness", "Availability"], "columns": ["Good", "Poor"]},
                        }
                    ],
                }
            ]
        }
    )

    field = schema.sections[0].fields[0]
    question = _build_question_field(field.model_dump(mode="json"), field_id=field.id, section_id="main", order=1)

    assert field.matrix == {"rows": ["Cleanliness", "Availability"], "columns": ["Good", "Poor"]}
    assert question["defaultValue"]["rows"] == ["Cleanliness", "Availability"]
    assert question["defaultValue"]["columns"] == ["Good", "Poor"]


def test_build_question_field_sends_date_rules_to_mobile() -> None:
    question = _build_question_field(
        {
            "id": "interview_date",
            "label": "Interview date",
            "type": "date",
            "validation": {"blockFutureDates": True, "minDate": "2026-01-01", "maxDate": "2026-12-31"},
        },
        field_id="interview_date",
        section_id="main",
        order=1,
    )

    assert {rule["value"] for rule in question["validationRules"] if rule["ruleType"] == "Custom"} == {
        "blockFutureDates:true",
        "minDate:2026-01-01",
        "maxDate:2026-12-31",
    }


def test_build_question_field_sends_integer_only_rule_to_mobile() -> None:
    question = _build_question_field(
        {
            "id": "stock_count",
            "label": "Stock count",
            "type": "number",
            "validation": {"integerOnly": True},
        },
        field_id="stock_count",
        section_id="main",
        order=1,
    )

    assert "integerOnly:true" in {rule["value"] for rule in question["validationRules"] if rule["ruleType"] == "Custom"}


def test_build_question_field_sends_block_false_consent_rule_to_mobile() -> None:
    question = _build_question_field(
        {
            "id": "consent",
            "label": "Consent captured",
            "type": "consent",
            "validation": {"blockIfFalse": True, "message": "Consent is required before continuing."},
        },
        field_id="consent",
        section_id="main",
        order=1,
    )

    rules = {rule["value"]: rule for rule in question["validationRules"] if rule["ruleType"] == "Custom"}

    assert "blockIfFalse:true" in rules
    assert rules["blockIfFalse:true"]["message"] == "Consent is required before continuing."


def test_build_question_field_sends_media_rules_to_mobile() -> None:
    question = _build_question_field(
        {
            "id": "proof",
            "label": "Proof photo",
            "type": "photo",
            "validation": {"allowedFileTypes": "jpg,png", "maxFileSizeMb": 2, "maxAttachmentCount": 1},
        },
        field_id="proof",
        section_id="main",
        order=1,
    )

    assert {rule["value"] for rule in question["validationRules"] if rule["ruleType"] == "Custom"} == {
        "allowedFileTypes:jpg,png",
        "maxFileSizeMb:2",
        "maxAttachmentCount:1",
    }


def test_mobile_question_type_maps_polygon_to_polygon() -> None:
    assert _mobile_question_type("polygon") == "Polygon"
    assert _mobile_question_type("Polygon") == "Polygon"


def test_validation_rules_for_polygon_defaults() -> None:
    field = {"type": "polygon", "label": "Farm boundary"}

    rules = _validation_rules(field)
    rules_by_value = {rule["value"]: rule for rule in rules}

    assert rules_by_value["minVertices:3"]["severity"] == "Block"
    assert rules_by_value["requireClosed:true"]["severity"] == "Block"
    assert rules_by_value["overlapCheck:true:form"]["severity"] == "Warning"


def test_validation_rules_for_polygon_respects_config() -> None:
    field = {
        "type": "polygon",
        "label": "Project area",
        "polygon": {
            "minVertices": 5,
            "requireClosed": False,
            "overlapCheck": True,
            "overlapScope": "project",
        },
    }

    rules = _validation_rules(field)
    rules_by_value = {rule["value"]: rule for rule in rules}

    assert "minVertices:5" in rules_by_value
    assert "requireClosed:true" not in rules_by_value
    assert "overlapCheck:true:project" in rules_by_value


def test_validation_rules_for_polygon_overlap_check_disabled() -> None:
    field = {
        "type": "polygon",
        "label": "Project area",
        "polygon": {"overlapCheck": False},
    }

    rules = _validation_rules(field)
    rule_values = {rule["value"] for rule in rules}

    assert not any(value.startswith("overlapCheck:") for value in rule_values)


def test_build_question_field_for_polygon() -> None:
    field = {
        "type": "polygon",
        "label": "Farm boundary",
        "required": True,
    }

    question = _build_question_field(field, field_id="q_boundary", section_id="s_main", order=1)

    assert question["type"] == "Polygon"
    assert question["inputMode"] is None
    rule_values = {rule["value"] for rule in question["validationRules"]}
    assert "minVertices:3" in rule_values
    assert "requireClosed:true" in rule_values
    assert "overlapCheck:true:form" in rule_values


def test_mobile_question_type_maps_new_response_types() -> None:
    assert _mobile_question_type("percentage") == "Number"
    assert _mobile_question_type("counter") == "Number"
    assert _mobile_question_type("yes_no") == "SingleSelect"
    assert _mobile_question_type("date_range") == "Text"
    assert _mobile_question_type("measurement") == "Text"
    assert _mobile_question_type("constant_sum") == "Text"
    assert _mobile_question_type("slider") == "Number"


def test_build_question_field_slider_carries_step_and_bounds() -> None:
    question = _build_question_field(
        {"id": "score", "label": "Confidence", "type": "slider", "validation": {"min": 0, "max": 10, "step": 0.5}},
        field_id="score",
        section_id="main",
        order=1,
    )

    assert "slider" in question["metadataTags"]
    bounds = {rule["ruleType"]: rule["value"] for rule in question["validationRules"] if rule["ruleType"] in {"Min", "Max"}}
    assert bounds.get("Min") == 0
    assert bounds.get("Max") == 10
    assert "step:0.5" in {rule["value"] for rule in question["validationRules"] if rule["ruleType"] == "Custom"}


def test_build_question_field_tags_specialised_response_types() -> None:
    cases = {
        "counter": "counter",
        "date_range": "date-range",
        "measurement": "measurement",
        "constant_sum": "constant-sum",
    }
    for raw_type, tag in cases.items():
        question = _build_question_field(
            {"id": raw_type, "label": raw_type, "type": raw_type},
            field_id=raw_type,
            section_id="main",
            order=1,
        )
        assert tag in question["metadataTags"], raw_type


def test_build_question_field_measurement_carries_unit_options() -> None:
    question = _build_question_field(
        {"id": "weight", "label": "Weight", "type": "measurement", "options": ["kg", "g", "lb"]},
        field_id="weight",
        section_id="main",
        order=1,
    )

    assert "measurement" in question["metadataTags"]
    assert [option["value"] for option in question["options"]] == ["kg", "g", "lb"]


def test_build_question_field_percentage_keeps_bounds() -> None:
    question = _build_question_field(
        {"id": "pct", "label": "Coverage", "type": "percentage", "validation": {"min": 0, "max": 100}},
        field_id="pct",
        section_id="main",
        order=1,
    )

    bounds = {rule["ruleType"]: rule["value"] for rule in question["validationRules"] if rule["ruleType"] in {"Min", "Max"}}
    assert bounds.get("Min") == 0
    assert bounds.get("Max") == 100
