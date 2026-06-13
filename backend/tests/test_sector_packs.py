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


def test_custom_sector_pack_is_after_at_least_ten_main_sectors() -> None:
    pack_ids = [str(pack["id"]) for pack in list_sector_packs()]

    assert len([pack_id for pack_id in pack_ids if pack_id != "custom"]) >= 10
    assert pack_ids[-1] == "custom"
    assert pack_ids.index("custom") >= 10


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
    assert "serial_number" in question_ids


def test_retail_pack_generates_retail_specific_questions() -> None:
    pack = get_sector_pack("retail")

    assert pack is not None
    stock_count = next(form for form in pack["form_definitions"] if form["name"] == "Store Stock Count")
    question_ids = {question["id"] for question in stock_count["questions"]}

    assert stock_count["entity_type"] == "Product"
    assert "sku_or_barcode" in question_ids
    assert "unit_price" in question_ids
    assert "store_channel" in question_ids


def test_logistics_pack_generates_delivery_specific_questions() -> None:
    pack = get_sector_pack("logistics")

    assert pack is not None
    delivery = next(form for form in pack["form_definitions"] if form["name"] == "Delivery Confirmation")
    question_ids = {question["id"] for question in delivery["questions"]}

    assert delivery["entity_type"] == "Shipment"
    assert delivery["form_type"] == "delivery"
    assert "route_code" in question_ids
    assert "vehicle_id" in question_ids
    assert "proof_of_delivery" in question_ids


def test_hr_pack_generates_workforce_specific_questions() -> None:
    pack = get_sector_pack("hr")

    assert pack is not None
    attendance = next(form for form in pack["form_definitions"] if form["name"] == "Attendance Check")
    question_ids = {question["id"] for question in attendance["questions"]}

    assert attendance["entity_type"] == "Employee"
    assert "employee_id" in question_ids
    assert "department" in question_ids
    assert "supervisor_review" in question_ids
