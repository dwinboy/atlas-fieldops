from datetime import date
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.permissions import Permission, permissions_for_roles
from app.models.audit import AuditLog
from app.models.base import Base
from app.models.collection import Project
from app.models.identity import Organization, User
from app.models.operations import Beneficiary, MonitoringIndicator
from app.schemas.collection import FormEntityControlSettings
from app.schemas.operations import BeneficiaryCreate, CaseCreate, DataRouteCreate, DonorReportCreate, ExportJobCreate, ImportJobCreate, ImportPreviewRequest, IndicatorCreate, MediaEvidenceCreate, PublicCollectionLinkCreate
from app.schemas.operations import EcosystemEdge, EcosystemNode, EntityCategoryCreate, EntityRelationshipCreate, OperationalEventCreate, ProjectBudgetLineRead
from app.services.operations import (
    OperationsService,
    asset_values_from_import_row,
    case_values_from_import_row,
    detect_entity_matches,
    detect_import_duplicate_groups,
    detect_missing_ids,
    entity_code_prefix,
    indicator_progress,
    indicator_values_from_import_row,
    infer_mapping,
    number_value,
    program_values_from_import_row,
    validate_sample_rows,
)


def test_number_value_reads_measurement_answers() -> None:
    # Measurement answers wrap the magnitude in {value, unit}; indicators must still aggregate them.
    assert number_value({"value": "42.5", "unit": "kg"}) == 42.5
    assert number_value({"value": 7, "unit": "ha"}) == 7.0
    # A structured answer with no numeric magnitude stays unaggregatable.
    assert number_value({"from": "2026-01-01", "to": "2026-01-31"}) is None
    assert number_value("3,200") == 3200.0


def test_me_permissions_are_role_scoped() -> None:
    admin_permissions = permissions_for_roles(["organization_admin"])
    me_manager_permissions = permissions_for_roles(["me_manager"])
    officer_permissions = permissions_for_roles(["field_officer"])

    assert Permission.BENEFICIARY_MANAGE in admin_permissions
    assert Permission.PROGRAM_MANAGE in admin_permissions
    assert Permission.REPORT_MANAGE in admin_permissions
    assert Permission.DATA_IMPORT in admin_permissions
    assert Permission.DATA_BULK_EDIT in admin_permissions
    assert Permission.BENEFICIARY_EDIT in me_manager_permissions
    assert Permission.SUBMISSION_APPROVE in me_manager_permissions
    assert Permission.BENEFICIARY_READ in officer_permissions
    assert Permission.SUBMISSION_READ not in officer_permissions
    assert Permission.SUBMISSION_CREATE in officer_permissions
    assert Permission.REPORT_MANAGE not in officer_permissions


def test_form_entity_controls_normalize_legacy_submission_frequency_labels() -> None:
    monthly = FormEntityControlSettings.model_validate({"submission_frequency": "monthly"})
    yearly = FormEntityControlSettings.model_validate({"submission_frequency": "yearly"})
    seasonal = FormEntityControlSettings.model_validate({"submission_frequency": "seasonal"})

    assert monthly.submission_frequency == "once_per_month"
    assert yearly.submission_frequency == "once_per_year"
    assert seasonal.submission_frequency == "once_per_season"


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


def test_import_generated_ids_follow_entity_type_prefixes() -> None:
    generated = detect_missing_ids(
        [
            {"entity_type": "Product", "name": "Maize seed"},
            {"entity_type": "Asset", "name": "Tablet"},
            {"entity_category": "Water Point", "name": "Borehole 1"},
            {"name": "Generic record"},
            {"entity_id": "LEGACY-1", "entity_type": "Store"},
        ],
        "entity_registry",
    )

    assert [row.entity_type for row in generated] == ["Product", "Asset", "Water Point", "Entity"]
    assert generated[0].generated_id.startswith("PRD-")
    assert generated[1].generated_id.startswith("AST-")
    assert generated[2].generated_id.startswith("WPT-")
    assert generated[3].generated_id.startswith("ENT-")
    assert entity_code_prefix("Cold Chain Site") == "CCS"


def test_import_match_actions_are_sector_neutral() -> None:
    rows = [
        {"display_name": "Store A", "phone_number": "+237600000001", "district": "Mifi"},
        {"display_name": "Store A", "phone_number": "+237600000001", "district": "Mifi"},
    ]
    duplicate_groups = detect_import_duplicate_groups(rows)
    entity_matches = detect_entity_matches(rows)

    assert duplicate_groups
    assert "entity" in duplicate_groups[0].recommended_action.lower()
    assert "beneficiary" not in " ".join(duplicate_groups[0].actions).lower()
    assert entity_matches
    assert entity_matches[0].suggested_value.endswith("existing entity candidate")


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


@pytest.mark.asyncio
async def test_entity_hierarchy_supports_category_parents_and_beneficiary_links() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        project_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Hierarchy Org", slug="hierarchy-org"),
                User(id=actor_user_id, email="hierarchy@example.org", full_name="Hierarchy Manager", password_hash="x"),
                Project(id=project_id, organization_id=organization_id, name="Hierarchy Project", slug="hierarchy-project"),
            ]
        )
        await session.flush()

        service = OperationsService(session)
        household_category = await service.create_entity_category(
            organization_id,
            actor_user_id,
            EntityCategoryCreate(name="Household", project_id=project_id),
        )
        farmer_category = await service.create_entity_category(
            organization_id,
            actor_user_id,
            EntityCategoryCreate(
                name="Farmer",
                project_id=project_id,
                parent_category_id=household_category.id,
            ),
        )
        assert farmer_category.parent_category_id == household_category.id

        household = Beneficiary(
            organization_id=organization_id,
            project_id=project_id,
            beneficiary_uid="HH-2026-000001",
            beneficiary_type="Household",
            display_name="Amina Household",
        )
        farmer = Beneficiary(
            organization_id=organization_id,
            project_id=project_id,
            beneficiary_uid="FRM-2026-000001",
            beneficiary_type="Farmer",
            display_name="Amina Bello",
        )
        session.add_all([household, farmer])
        await session.flush()

        relationship = await service.create_entity_relationship(
            organization_id,
            farmer.id,
            EntityRelationshipCreate(
                related_beneficiary_id=household.id,
                related_role="parent",
                relationship_type="member_of",
            ),
            actor_user_id,
        )
        assert relationship.direction == "parent"
        assert relationship.related_beneficiary.id == household.id

        hierarchy = await service.get_entity_hierarchy(organization_id, farmer.id)
        assert len(hierarchy.parents) == 1
        assert hierarchy.parents[0].related_beneficiary.id == household.id
        assert hierarchy.parents[0].relationship_type == "member_of"

        audit_actions = [
            item.action
            for item in (
                await session.execute(select(AuditLog).where(AuditLog.organization_id == organization_id))
            ).scalars()
        ]
        assert "entity_category.created" in audit_actions
        assert "entity_relationship.created" in audit_actions


@pytest.mark.asyncio
async def test_entity_relationships_reject_cross_project_links() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        project_a = Project(id=uuid4(), organization_id=organization_id, name="Project A", slug="project-a")
        project_b = Project(id=uuid4(), organization_id=organization_id, name="Project B", slug="project-b")
        session.add_all(
            [
                Organization(id=organization_id, name="Cross Project Org", slug="cross-project-org"),
                User(id=actor_user_id, email="cross-project@example.org", full_name="Cross Project Manager", password_hash="x"),
                project_a,
                project_b,
            ]
        )
        await session.flush()

        left = Beneficiary(
            organization_id=organization_id,
            project_id=project_a.id,
            beneficiary_uid="ENT-LEFT",
            beneficiary_type="Store",
            display_name="Store Left",
        )
        right = Beneficiary(
            organization_id=organization_id,
            project_id=project_b.id,
            beneficiary_uid="ENT-RIGHT",
            beneficiary_type="Store",
            display_name="Store Right",
        )
        session.add_all([left, right])
        await session.flush()

        service = OperationsService(session)
        with pytest.raises(ValueError, match="same project"):
            await service.create_entity_relationship(
                organization_id,
                left.id,
                EntityRelationshipCreate(
                    related_beneficiary_id=right.id,
                    related_role="parent",
                    relationship_type="managed_by",
                ),
                actor_user_id,
            )
