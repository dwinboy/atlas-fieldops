from app.services.sector_packs import get_sector_pack, list_sector_packs


def test_operational_sector_packs_are_available() -> None:
    pack_ids = {str(pack["id"]) for pack in list_sector_packs()}

    assert {
        "retail",
        "inventory",
        "logistics",
        "sales",
        "manufacturing",
        "hr",
        "audits",
        "inspections",
        "assets",
    }.issubset(pack_ids)


def test_custom_pack_is_generic_not_me_only() -> None:
    pack = get_sector_pack("custom")

    assert pack is not None
    assert pack["name"] == "Custom Operations"
    assert pack["recommended_settings"]["beneficiary"]["primaryEntityType"] == "Record"
    assert pack["recommended_settings"]["beneficiary"]["codeFormat"] == "REC-YYYY-000001"
    assert "Baseline" not in pack["recommended_settings"]["forms"]["journey"]
    assert "Endline" not in pack["recommended_settings"]["forms"]["journey"]


def test_inventory_forms_generate_operational_questions_without_forced_consent() -> None:
    pack = get_sector_pack("inventory")

    assert pack is not None
    stock_count = next(form for form in pack["form_definitions"] if form["name"] == "Stock Count")
    question_ids = {question["id"] for question in stock_count["questions"]}

    assert stock_count["entity_type"] == "Stock Item"
    assert stock_count["form_type"] == "inventory"
    assert "quantity_counted" in question_ids
    assert "variance_reason" in question_ids
    assert stock_count["questions"][0]["id"] == "consent"
    assert stock_count["questions"][0]["required"] is False


def test_asset_forms_generate_asset_specific_questions() -> None:
    pack = get_sector_pack("assets")

    assert pack is not None
    condition_check = next(form for form in pack["form_definitions"] if form["name"] == "Condition Check")
    question_ids = {question["id"] for question in condition_check["questions"]}

    assert condition_check["entity_type"] == "Asset"
    assert condition_check["form_type"] == "asset"
    assert "asset_condition" in question_ids
    assert "custodian" in question_ids
