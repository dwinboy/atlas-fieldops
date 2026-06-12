from app.services.mobile import _build_question_field, _mobile_question_type, _validation_rules


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
