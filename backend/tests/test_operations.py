from datetime import date
from uuid import uuid4

from pydantic import ValidationError

from app.core.permissions import Permission, permissions_for_roles
from app.models.operations import MonitoringIndicator
from app.schemas.operations import BeneficiaryCreate, CaseCreate, DataRouteCreate, DonorReportCreate, ExportJobCreate, ImportJobCreate, ImportPreviewRequest, IndicatorCreate, MediaEvidenceCreate, PublicCollectionLinkCreate
from app.schemas.operations import EcosystemEdge, EcosystemNode, OperationalEventCreate, ProjectBudgetLineRead
from app.services.operations import (
    OperationsService,
    asset_values_from_import_row,
    case_values_from_import_row,
    indicator_progress,
    indicator_values_from_import_row,
    infer_mapping,
    program_values_from_import_row,
    validate_sample_rows,
)


def test_me_permissions_are_role_scoped() -> None:
    admin_permissions = permissions_for_roles(["organization_admin"])
    officer_permissions = permissions_for_roles(["field_officer"])

    assert Permission.BENEFICIARY_MANAGE in admin_permissions
    assert Permission.PROGRAM_MANAGE in admin_permissions
    assert Permission.REPORT_MANAGE in admin_permissions
    assert Permission.DATA_IMPORT in admin_permissions
    assert Permission.DATA_BULK_EDIT in admin_permissions
    assert Permission.BENEFICIARY_READ in officer_permissions
    assert Permission.REPORT_MANAGE not in officer_permissions


def test_beneficiary_requires_complete_location_pair() -> None:
    project_id = uuid4()
    with_location = BeneficiaryCreate(
        beneficiary_uid="HH-001",
        beneficiary_type="household",
        display_name="Amina household",
        project_id=project_id,
        latitude=5.4,
        longitude=10.1,
    )

    assert with_location.latitude == 5.4

    with_bad_location = {
        "beneficiary_uid": "HH-002",
        "beneficiary_type": "household",
        "display_name": "Incomplete location",
        "project_id": project_id,
        "latitude": 5.4,
    }
    try:
        BeneficiaryCreate.model_validate(with_bad_location)
    except ValidationError as exc:
        assert "latitude and longitude" in str(exc)
    else:  # pragma: no cover - defensive assertion
        raise AssertionError("expected location validation failure")


def test_indicator_progress_is_capped_and_readable() -> None:
    indicator = MonitoringIndicator(
        organization_id=uuid4(),
        code="AG.YIELD",
        name="Average crop yield",
        baseline_value=10,
        target_value=30,
        current_value=18,
    )

    assert indicator_progress(indicator) == 40
    indicator.current_value = 40
    assert indicator_progress(indicator) == 100


def test_indicator_and_case_payloads_use_plain_english_fields() -> None:
    indicator = IndicatorCreate(
        code="HEALTH.VACCINATION",
        name="Children vaccinated",
        reporting_frequency="quarterly",
        baseline_value=30,
        target_value=90,
        current_value=58,
    )
    case = CaseCreate(case_number="CASE-001", case_type="complaint", title="Follow up on missing support")

    assert indicator.name == "Children vaccinated"
    assert case.status == "open"


def test_data_route_requires_clear_internal_target() -> None:
    route = DataRouteCreate(
        title="Review imported beneficiary records",
        data_type="beneficiaries",
        target_role_name="me_manager",
        priority="high",
        instructions="Review duplicates and approve clean records.",
    )

    assert route.target_role_name == "me_manager"
    assert route.instructions.startswith("Review")


def test_import_mapping_and_validation_catch_operational_data_errors() -> None:
    mapping = infer_mapping("beneficiaries", ["Farmer Name", "Household ID", "Latitude", "Longitude", "Phone"])
    issues = validate_sample_rows(
        "beneficiaries",
        [
            {"Farmer Name": "Amina", "Household ID": "HH-1", "Latitude": "5.1", "Longitude": "10.2", "Phone": "+237600000000"},
            {"Farmer Name": "", "Household ID": "HH-1", "Latitude": "500", "Longitude": "10.2", "Phone": "12"},
        ],
        mapping,
    )

    assert mapping[0].target_field == "display_name"
    assert {issue.issue_type for issue in issues} == {"missing_required", "duplicate_row", "invalid_coordinate", "invalid_phone"}


def test_import_mapping_supports_operational_dataset_aliases() -> None:
    program_mapping = infer_mapping("programs", ["Program Name", "Program Code", "Area"])
    case_mapping = infer_mapping("cases", ["Case No", "Case Title", "Category"])
    asset_mapping = infer_mapping("assets", ["Asset ID", "Asset Name", "Location"])

    assert [item.target_field for item in program_mapping] == ["name", "slug", "region"]
    assert [item.target_field for item in case_mapping] == ["case_number", "title", "case_type"]
    assert [item.target_field for item in asset_mapping] == ["asset_code", "name", "region"]


def test_import_row_converters_create_applyable_payloads() -> None:
    program = program_values_from_import_row({"name": "Nutrition Program", "slug": "nutrition", "region": "North"})
    indicator = indicator_values_from_import_row({"code": "hh_1", "name": "Households reached", "target_value": "100"})
    case = case_values_from_import_row({"case_number": "CASE-1", "title": "Follow up missing evidence"})
    asset = asset_values_from_import_row({"asset_code": "TAB-1", "asset_type": "tablet", "name": "Field tablet", "condition": "new"})

    assert program == {"name": "Nutrition Program", "slug": "nutrition", "region": "North"}
    assert indicator is not None
    assert indicator["code"] == "HH_1"
    assert indicator["target_value"] == 100
    assert case is not None
    assert case["case_type"] == "general"
    assert case["status"] == "open"
    assert asset is not None
    assert asset["metadata_json"] == {"imported_fields": {"condition": "new"}}


def test_import_and_export_payloads_enforce_supported_formats() -> None:
    payload = ImportJobCreate(
        dataset_type="beneficiaries",
        source_name="farmer-list.xlsx",
        source_format="xlsx",
        total_rows=120,
        target_project_id=uuid4(),
    )
    preview = ImportPreviewRequest(dataset_type="beneficiaries", columns=["Farmer Name"], sample_rows=[])
    export = ExportJobCreate(dataset_type="geospatial", export_format="geojson")
    zip_export = ExportJobCreate(dataset_type="media", export_format="zip")
    kml_export = ExportJobCreate(dataset_type="geospatial", export_format="kml")

    assert payload.source_format == "xlsx"
    assert preview.dataset_type == "beneficiaries"
    assert export.export_format == "geojson"
    assert zip_export.export_format == "zip"
    assert kml_export.export_format == "kml"


def test_donor_report_payload_keeps_dates_for_database_insert() -> None:
    payload = DonorReportCreate(
        name="Q2 donor pack",
        donor="FAO",
        period_start=date(2026, 6, 1),
        period_end=date(2026, 6, 7),
        export_formats=["pdf", "xlsx"],
    )

    values = payload.model_dump()

    assert values["period_start"] == date(2026, 6, 1)
    assert values["period_end"] == date(2026, 6, 7)


def test_public_collection_link_payload_describes_controlled_web_collection() -> None:
    form_id = uuid4()
    payload = PublicCollectionLinkCreate(
        form_id=form_id,
        slug="farmer-registration-public",
        title="Farmer registration",
        access_mode="partner",
        require_authentication=True,
        allowed_domains=["partner.example.org"],
        permission_json={"submit": True, "view": False, "edit": False},
    )

    assert payload.form_id == form_id
    assert payload.access_mode == "partner"
    assert payload.permission_json["submit"] is True


def test_media_evidence_payload_requires_supported_type_and_coordinate_pair() -> None:
    evidence = MediaEvidenceCreate(
        media_type="photo",
        file_name="farm-proof.jpg",
        storage_url="s3://atlas-media/farm-proof.jpg",
        mime_type="image/jpeg",
        size_bytes=2048,
        latitude=5.4,
        longitude=10.1,
    )

    assert evidence.media_type == "photo"

    try:
        MediaEvidenceCreate(
            media_type="photo",
            file_name="bad-location.jpg",
            storage_url="s3://atlas-media/bad-location.jpg",
            mime_type="image/jpeg",
            latitude=5.4,
        )
    except ValidationError as exc:
        assert "latitude and longitude" in str(exc)
    else:  # pragma: no cover - defensive assertion
        raise AssertionError("expected incomplete coordinate validation failure")

    try:
        MediaEvidenceCreate(
            media_type="spreadsheet",
            file_name="wrong.xlsx",
            storage_url="s3://atlas-media/wrong.xlsx",
            mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except ValidationError as exc:
        assert "Unsupported media type" in str(exc)
    else:  # pragma: no cover - defensive assertion
        raise AssertionError("expected media type validation failure")


def test_operational_events_fan_out_to_connected_systems() -> None:
    event = OperationalEventCreate(
        event_type="beneficiary.enrolled",
        source_module="beneficiaries",
        summary="A farmer profile was updated from a registration form.",
        payload={"beneficiary_uid": "FARM-001"},
    )

    effects = OperationsService.effects_for_event(event)

    assert {effect.module for effect in effects} >= {"dashboards", "analytics", "reporting", "geospatial", "field_operations"}
    assert OperationsService.next_action_for_event("data_import.created").startswith("Resolve validation")


def test_enterprise_operations_events_are_connected() -> None:
    event_types = {
        "org_unit.created": {"governance", "rbac"},
        "workflow.configured": {"approvals", "sla"},
        "task.assigned": {"notifications", "field_operations"},
        "intervention.planned": {"beneficiaries", "finance"},
        "asset.registered": {"field_operations", "compliance"},
        "budget.allocated": {"finance", "interventions"},
        "document.attached": {"knowledge", "approvals"},
    }

    for event_type, modules in event_types.items():
        effects = OperationsService.effects_for_event(
            OperationalEventCreate(event_type=event_type, source_module="test", summary="Connected operation")
        )
        assert modules.issubset({effect.module for effect in effects})


def test_budget_read_calculates_utilization() -> None:
    read = ProjectBudgetLineRead(
        id=uuid4(),
        project_id=uuid4(),
        category="Field logistics",
        allocated_amount=1000,
        spent_amount=250,
        currency="USD",
        reporting_code="LOG",
        utilization_percent=25,
    )

    assert read.utilization_percent == 25


def test_ecosystem_graph_describes_the_operational_chain() -> None:
    nodes = [
        EcosystemNode(id="projects", label="Programs & Projects", node_type="program", status="active", count=2),
        EcosystemNode(id="beneficiaries", label="Beneficiaries", node_type="beneficiary", status="active", count=200),
    ]
    edge = EcosystemEdge(source="projects", target="beneficiaries", label="enrolls people")

    assert nodes[0].label == "Programs & Projects"
    assert edge.source == "projects"
    assert edge.target == "beneficiaries"
