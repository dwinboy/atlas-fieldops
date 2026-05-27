from app.schemas.collection import FormSchema
from app.services.template_library import TemplateLibraryService, built_in_templates


def test_template_library_contains_operational_categories() -> None:
    templates = TemplateLibraryService().list_templates()
    categories = {template.category for template in templates}

    assert len(templates) >= 40
    assert "Agriculture" in categories
    assert "Health" in categories
    assert "Monitoring & Evaluation" in categories
    assert all(template.summary.offline_compatible for template in templates)


def test_agriculture_recommendations_prioritize_agriculture_templates() -> None:
    recommendations = TemplateLibraryService().recommended_templates("agriculture")

    assert recommendations
    assert recommendations[0].category == "Agriculture"
    assert recommendations[0].summary.has_gps


def test_template_detail_is_mobile_compatible_and_has_logic_overview() -> None:
    detail = TemplateLibraryService().get_template("crop-monitoring-form")

    assert isinstance(detail.template_schema, FormSchema)
    assert detail.summary.field_count >= 8
    assert detail.mobile_preview_fields
    assert any("Photo evidence" in item or "Calculate" in item for item in detail.logic_overview)


def test_all_builtin_templates_validate_against_form_schema() -> None:
    for template in built_in_templates():
        schema = FormSchema.model_validate(template.schema)
        assert schema.sections
        assert any(field.required for section in schema.sections for field in section.fields)
