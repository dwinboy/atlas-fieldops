from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.schemas.collection import FormSchema, FormTemplateDetail, FormTemplateRead, TemplateFieldSummary


MEDIA_TYPES = {"photo", "image", "signature", "audio", "video", "file"}


@dataclass(frozen=True)
class BuiltInTemplate:
    id: str
    name: str
    slug: str
    category: str
    description: str
    tags: list[str]
    recommended_for: list[str]
    estimated_minutes: int
    popularity_score: int
    is_featured: bool
    schema: dict[str, Any]


def field(
    field_id: str,
    label: str,
    field_type: str,
    *,
    required: bool = False,
    hint: str | None = None,
    options: list[str] | None = None,
    validation: dict[str, Any] | None = None,
    visibility: dict[str, Any] | None = None,
    calculation: str | None = None,
) -> dict[str, Any]:
    return {
        "id": field_id,
        "type": field_type,
        "label": label,
        "hint": hint,
        "required": required,
        "validation": validation or {},
        "visibility": visibility or {},
        "options": [{"label": option, "value": option.lower().replace(" ", "_")} for option in (options or [])],
        "calculation": calculation,
    }


def section(section_id: str, title: str, description: str, fields: list[dict[str, Any]]) -> dict[str, Any]:
    return {"id": section_id, "title": title, "description": description, "fields": fields}


def schema(*sections: dict[str, Any]) -> dict[str, Any]:
    return {"version_label": "Built-in template v1", "sections": list(sections)}


def contact_fields(prefix: str = "person") -> list[dict[str, Any]]:
    return [
        field(f"{prefix}_name", "Full name", "text", required=True),
        field(f"{prefix}_phone", "Phone number", "phone", hint="Include country code when available"),
        field(f"{prefix}_gender", "Gender", "select", options=["Female", "Male", "Prefer not to say"]),
    ]


def location_fields(prefix: str = "visit") -> list[dict[str, Any]]:
    return [
        field(f"{prefix}_community", "Community or village", "text", required=True),
        field(f"{prefix}_gps", "Automatic GPS location", "gps", required=True, validation={"accuracy_max": 30}),
    ]


def approval_fields() -> list[dict[str, Any]]:
    return [
        field("field_notes", "Field officer notes", "textarea", hint="Record anything the supervisor should know"),
        field("respondent_signature", "Respondent signature", "signature"),
    ]


def agriculture_schema(kind: str) -> dict[str, Any]:
    fields = [
        *contact_fields("farmer"),
        field("farmer_id", "Farmer or household ID", "text", required=True),
        field("farm_size", "Farm size", "decimal", validation={"min": 0}),
        field("primary_crop", "Primary crop", "select", required=True, options=["Maize", "Rice", "Cassava", "Cocoa", "Coffee", "Vegetables"]),
        field("crop_entries", "Crops grown this season", "repeat_group", hint="Add one row for each crop"),
    ]
    if kind in {"monitoring", "yield", "pest"}:
        fields.extend(
            [
                field("crop_condition", "Crop condition", "radio", required=True, options=["Good", "Fair", "Poor"]),
                field("pest_seen", "Any pest or disease observed?", "radio", required=True, options=["Yes", "No"]),
                field("issue_photo", "Photo evidence", "photo", visibility={"expression": "${pest_seen} = 'yes'"}),
            ]
        )
    return schema(
        section("profile", "Farmer and farm profile", "Identify the farmer, farm, and production context.", fields),
        section("location", "Location and evidence", "Capture auditable location and visit evidence.", [*location_fields("farm"), *approval_fields()]),
    )


def health_schema(kind: str) -> dict[str, Any]:
    fields = [
        *contact_fields("patient"),
        field("patient_id", "Patient or household ID", "text", required=True),
        field("age", "Age", "number", required=True, validation={"min": 0, "max": 120}),
        field("visit_type", "Visit type", "select", required=True, options=["Registration", "Follow-up", "Referral", "Outreach"]),
    ]
    if kind in {"vaccination", "nutrition", "maternal"}:
        fields.extend(
            [
                field("service_received", "Service received today", "multiselect", options=["Vaccination", "Nutrition screening", "Counselling", "Referral"]),
                field("follow_up_needed", "Follow-up needed?", "radio", required=True, options=["Yes", "No"]),
                field("follow_up_date", "Follow-up date", "date", visibility={"expression": "${follow_up_needed} = 'yes'"}),
            ]
        )
    return schema(
        section("patient", "Client profile", "Capture the person or household receiving health services.", fields),
        section("facility", "Service location", "Record facility, outreach site, and verification details.", [*location_fields("service"), *approval_fields()]),
    )


def education_schema() -> dict[str, Any]:
    return schema(
        section(
            "school",
            "School profile",
            "Identify the school and inspection context.",
            [
                field("school_name", "School name", "text", required=True),
                field("school_code", "School code", "text"),
                field("school_type", "School type", "select", options=["Public", "Private", "Community", "Faith-based"]),
                field("enrolled_students", "Enrolled students", "number", validation={"min": 0}),
                field("teachers_present", "Teachers present today", "number", validation={"min": 0}),
            ],
        ),
        section(
            "inspection",
            "Inspection findings",
            "Capture attendance, facilities, and action points.",
            [
                field("attendance_rate", "Attendance rate", "decimal", validation={"min": 0, "max": 100}),
                field("classrooms_usable", "Classrooms usable", "number", validation={"min": 0}),
                field("needs_repair", "Any urgent repair needed?", "radio", options=["Yes", "No"]),
                field("repair_photo", "Repair photo", "photo", visibility={"expression": "${needs_repair} = 'yes'"}),
                *location_fields("school"),
                *approval_fields(),
            ],
        ),
    )


def humanitarian_schema(kind: str) -> dict[str, Any]:
    return schema(
        section(
            "household",
            "Household and assistance profile",
            "Register vulnerable households and assistance needs.",
            [
                *contact_fields("head"),
                field("household_id", "Household ID", "text", required=True),
                field("household_size", "Household size", "number", required=True, validation={"min": 1, "max": 80}),
                field("priority_needs", "Priority needs", "multiselect", options=["Food", "Shelter", "Health", "Protection", "Cash", "Water"]),
                field("vulnerability_score", "Vulnerability score", "calculated", calculation="score(priority_needs, household_size)"),
            ],
        ),
        section(
            "verification",
            "Verification and consent",
            "Verify eligibility and collect evidence safely.",
            [
                field("id_document_photo", "ID document photo", "photo"),
                field("assistance_received", "Assistance received today", "multiselect", options=["Food", "Cash", "Voucher", "Non-food items", "Referral"]),
                *location_fields("distribution"),
                *approval_fields(),
            ],
        ),
    )


def monitoring_schema(kind: str) -> dict[str, Any]:
    return schema(
        section(
            "indicator",
            "Indicator result",
            "Collect evidence for program monitoring and evaluation.",
            [
                field("project_code", "Project code", "text", required=True),
                field("indicator_code", "Indicator code", "text", required=True),
                field("reporting_period", "Reporting period", "select", options=["Monthly", "Quarterly", "Annual", "Baseline", "Endline"]),
                field("baseline_value", "Baseline value", "decimal"),
                field("current_value", "Current value", "decimal", required=True),
                field("target_value", "Target value", "decimal"),
                field("progress_percent", "Progress percent", "calculated", calculation="percent(current_value, target_value)"),
            ],
        ),
        section("evidence", "Evidence and verification", "Capture source, location, and reviewer notes.", [field("data_source", "Data source", "textarea"), *location_fields("indicator"), *approval_fields()]),
    )


def simple_operations_schema(title: str) -> dict[str, Any]:
    return schema(
        section(
            "record",
            title,
            "Capture the operational record and the action required.",
            [
                field("record_id", "Record ID", "text", required=True),
                field("record_name", "Name or title", "text", required=True),
                field("status", "Status", "select", options=["Good", "Needs attention", "Critical", "Resolved"]),
                field("priority", "Priority", "select", options=["Low", "Normal", "High", "Urgent"]),
                field("notes", "Notes", "textarea"),
            ],
        ),
        section("proof", "Location and proof", "Capture audit-ready proof for follow-up.", [field("evidence_photo", "Evidence photo", "photo"), *location_fields("record"), *approval_fields()]),
    )


TEMPLATE_DEFINITIONS: list[tuple[str, str, str, str, list[str], list[str], dict[str, Any]]] = [
    ("Agriculture", "Farmer Registration Form", "Register farmers, farm details, crops, GPS, and consent.", "agriculture", ["farmer", "registration", "gps"], ["agriculture", "ngo"], agriculture_schema("registration")),
    ("Agriculture", "Crop Monitoring Form", "Monitor crop condition, pest risk, photos, and field visit notes.", "agriculture", ["crop", "monitoring", "pest"], ["agriculture"], agriculture_schema("monitoring")),
    ("Agriculture", "Farm Visit Form", "Record extension officer visits, advice given, GPS, and follow-up needs.", "agriculture", ["visit", "extension"], ["agriculture"], agriculture_schema("visit")),
    ("Agriculture", "Input Distribution Form", "Track seed, fertilizer, voucher, and tool distributions with signature proof.", "agriculture", ["inputs", "distribution"], ["agriculture", "humanitarian"], agriculture_schema("distribution")),
    ("Agriculture", "Yield Assessment Form", "Estimate harvest yield, production constraints, and evidence.", "agriculture", ["yield", "assessment"], ["agriculture"], agriculture_schema("yield")),
    ("Agriculture", "Livestock Monitoring Form", "Capture livestock counts, health status, vaccination, and mortality events.", "agriculture", ["livestock", "health"], ["agriculture"], agriculture_schema("monitoring")),
    ("Agriculture", "Pest & Disease Reporting Form", "Report pest outbreaks with severity, GPS, and photo evidence.", "agriculture", ["pest", "disease"], ["agriculture"], agriculture_schema("pest")),
    ("Agriculture", "Extension Officer Visit Form", "Document advisory visits, farmer questions, and next actions.", "agriculture", ["extension", "visit"], ["agriculture"], agriculture_schema("visit")),
    ("Agriculture", "Farm Mapping Form", "Capture farm boundaries, crop plots, and map-ready coordinates.", "agriculture", ["mapping", "gps"], ["agriculture"], agriculture_schema("registration")),
    ("Agriculture", "Irrigation Assessment Form", "Assess water access, irrigation method, pump status, and constraints.", "agriculture", ["irrigation", "water"], ["agriculture"], agriculture_schema("monitoring")),
    ("Health", "Patient Registration Form", "Register patients and household health profile for outreach services.", "health", ["patient", "registration"], ["health", "government"], health_schema("registration")),
    ("Health", "Vaccination Tracking Form", "Track vaccination status, doses delivered, defaulters, and follow-ups.", "health", ["vaccination", "outreach"], ["health"], health_schema("vaccination")),
    ("Health", "Nutrition Assessment Form", "Capture MUAC, nutrition risk, referrals, and follow-up needs.", "health", ["nutrition", "screening"], ["health", "humanitarian"], health_schema("nutrition")),
    ("Health", "Maternal Health Visit Form", "Record antenatal visits, danger signs, referrals, and next appointment.", "health", ["maternal", "visit"], ["health"], health_schema("maternal")),
    ("Health", "Community Health Outreach Form", "Capture outreach attendance, services, referrals, and community notes.", "health", ["outreach", "community"], ["health"], health_schema("outreach")),
    ("Health", "Disease Surveillance Form", "Report suspected cases, symptoms, contacts, GPS, and escalation needs.", "health", ["surveillance", "case"], ["health", "government"], health_schema("surveillance")),
    ("Health", "Health Facility Inspection Form", "Assess facility readiness, stockouts, staffing, and service quality.", "health", ["facility", "inspection"], ["health", "government"], health_schema("inspection")),
    ("Health", "Household Health Survey Form", "Survey household health access, sanitation, nutrition, and referrals.", "health", ["household", "survey"], ["health"], health_schema("survey")),
    ("Education", "School Inspection Form", "Inspect school facilities, attendance, staffing, and safety issues.", "education", ["school", "inspection"], ["education", "government"], education_schema()),
    ("Education", "Student Attendance Survey", "Monitor attendance, absence reasons, and at-risk learner follow-up.", "education", ["attendance", "students"], ["education"], education_schema()),
    ("Education", "School Feeding Monitoring Form", "Track meal delivery, stock, beneficiary counts, and kitchen conditions.", "education", ["feeding", "monitoring"], ["education", "ngo"], education_schema()),
    ("Education", "Teacher Evaluation Form", "Capture classroom observation, attendance, support needs, and feedback.", "education", ["teacher", "evaluation"], ["education"], education_schema()),
    ("Education", "Infrastructure Assessment Form", "Assess classrooms, water, sanitation, electricity, and urgent repairs.", "education", ["infrastructure"], ["education", "government"], education_schema()),
    ("Education", "Education Program Monitoring Form", "Track education project activities, indicators, and action points.", "education", ["program", "monitoring"], ["education"], education_schema()),
    ("Humanitarian & NGO", "Household Vulnerability Assessment", "Assess vulnerability, needs, eligibility, and household composition.", "humanitarian", ["vulnerability", "household"], ["ngo", "humanitarian"], humanitarian_schema("vulnerability")),
    ("Humanitarian & NGO", "Food Distribution Tracking", "Track ration distribution, household receipt, signatures, and exceptions.", "humanitarian", ["food", "distribution"], ["humanitarian", "ngo"], humanitarian_schema("distribution")),
    ("Humanitarian & NGO", "Cash Transfer Registration", "Register recipients, eligibility, payment details, and consent.", "humanitarian", ["cash", "registration"], ["humanitarian", "ngo"], humanitarian_schema("cash")),
    ("Humanitarian & NGO", "Refugee Registration Form", "Register displaced households, documentation, needs, and protection notes.", "humanitarian", ["refugee", "registration"], ["humanitarian"], humanitarian_schema("registration")),
    ("Humanitarian & NGO", "Emergency Needs Assessment", "Rapidly assess urgent community needs after a shock or crisis.", "humanitarian", ["emergency", "needs"], ["humanitarian", "government"], humanitarian_schema("emergency")),
    ("Humanitarian & NGO", "Protection Incident Reporting", "Capture sensitive incidents, referral needs, and escalation details.", "humanitarian", ["protection", "incident"], ["humanitarian", "ngo"], humanitarian_schema("protection")),
    ("Humanitarian & NGO", "Beneficiary Feedback Form", "Collect complaints, feedback, satisfaction, and follow-up requests.", "humanitarian", ["feedback", "complaints"], ["ngo", "humanitarian"], humanitarian_schema("feedback")),
    ("Monitoring & Evaluation", "Baseline Survey", "Capture initial indicator values and respondent profile before intervention.", "monitoring", ["baseline", "survey"], ["ngo", "government"], monitoring_schema("baseline")),
    ("Monitoring & Evaluation", "Endline Survey", "Collect final program results, outcomes, evidence, and lessons.", "monitoring", ["endline", "impact"], ["ngo", "government"], monitoring_schema("endline")),
    ("Monitoring & Evaluation", "Midline Assessment", "Measure mid-program progress and operational corrections.", "monitoring", ["midline", "assessment"], ["ngo"], monitoring_schema("midline")),
    ("Monitoring & Evaluation", "KPI Tracking Form", "Collect KPI values with source notes and verification evidence.", "monitoring", ["kpi", "indicator"], ["ngo", "government"], monitoring_schema("kpi")),
    ("Monitoring & Evaluation", "Indicator Collection Form", "Capture indicator data, source, target, and progress calculation.", "monitoring", ["indicator", "reporting"], ["ngo", "government"], monitoring_schema("indicator")),
    ("Monitoring & Evaluation", "Program Monitoring Form", "Monitor project activity delivery, risks, and corrective actions.", "monitoring", ["program", "monitoring"], ["ngo"], monitoring_schema("program")),
    ("Monitoring & Evaluation", "Field Observation Form", "Record structured field observations, quality notes, and evidence.", "monitoring", ["observation", "quality"], ["ngo", "government"], monitoring_schema("observation")),
    ("Monitoring & Evaluation", "Impact Assessment Form", "Assess impact indicators, respondent outcomes, and evidence.", "monitoring", ["impact", "assessment"], ["ngo"], monitoring_schema("impact")),
    ("Government & Community", "Community Needs Assessment", "Collect priority community needs, facilities, risks, and requests.", "government", ["community", "needs"], ["government", "ngo"], simple_operations_schema("Community needs")),
    ("Government & Community", "Infrastructure Inspection Form", "Inspect roads, bridges, public facilities, and repair priorities.", "government", ["infrastructure", "inspection"], ["government"], simple_operations_schema("Infrastructure inspection")),
    ("Government & Community", "Community Engagement Form", "Record public meetings, attendance, concerns, and commitments.", "government", ["engagement", "community"], ["government", "ngo"], simple_operations_schema("Community engagement")),
    ("Government & Community", "Citizen Feedback Form", "Collect citizen feedback on services, complaints, and follow-up needs.", "government", ["feedback", "service"], ["government"], simple_operations_schema("Citizen feedback")),
    ("Government & Community", "Public Service Monitoring Form", "Monitor service delivery quality, wait times, and unresolved issues.", "government", ["service", "monitoring"], ["government"], simple_operations_schema("Public service monitoring")),
    ("Business & Operations", "Inventory Inspection Form", "Inspect inventory counts, stock condition, variances, and evidence.", "operations", ["inventory", "audit"], ["business", "ngo"], simple_operations_schema("Inventory inspection")),
    ("Business & Operations", "Asset Tracking Form", "Track assets, condition, location, custodian, and maintenance needs.", "operations", ["asset", "tracking"], ["business", "ngo"], simple_operations_schema("Asset tracking")),
    ("Business & Operations", "Staff Attendance Form", "Capture field staff attendance, location, and daily activity notes.", "operations", ["attendance", "staff"], ["business", "ngo"], simple_operations_schema("Staff attendance")),
    ("Business & Operations", "Operational Audit Form", "Audit operations, compliance issues, risks, and corrective actions.", "operations", ["audit", "operations"], ["business", "government"], simple_operations_schema("Operational audit")),
    ("Business & Operations", "Field Activity Report", "Report field work completed, blockers, photos, and next steps.", "operations", ["activity", "field"], ["ngo", "business"], simple_operations_schema("Field activity")),
    ("Business & Operations", "Vehicle Inspection Form", "Inspect vehicles, mileage, safety status, photos, and service needs.", "operations", ["vehicle", "inspection"], ["business", "ngo"], simple_operations_schema("Vehicle inspection")),
]


def _slug(name: str) -> str:
    return name.lower().replace("&", "and").replace("/", " ").replace("  ", " ").replace(" ", "-")


def _field_stats(form_schema: FormSchema) -> TemplateFieldSummary:
    fields = [field_item for section_item in form_schema.sections for field_item in section_item.fields]
    return TemplateFieldSummary(
        field_count=len(fields),
        repeat_group_count=sum(1 for item in fields if item.type in {"repeat_group", "repeatable_group"}),
        has_gps=any(item.type == "gps" for item in fields),
        has_media=any(item.type in MEDIA_TYPES for item in fields),
        offline_compatible=True,
    )


def _logic_overview(form_schema: FormSchema) -> list[str]:
    overview: list[str] = []
    for section_item in form_schema.sections:
        for item in section_item.fields:
            expression = item.visibility.get("expression") if isinstance(item.visibility, dict) else None
            if expression:
                overview.append(f"Show {item.label} when {expression}.")
            if item.calculation:
                overview.append(f"Calculate {item.label} from {item.calculation}.")
    return overview[:6]


def built_in_templates() -> list[BuiltInTemplate]:
    templates: list[BuiltInTemplate] = []
    for index, (category, name, description, category_slug, tags, recommended_for, template_schema) in enumerate(TEMPLATE_DEFINITIONS, start=1):
        templates.append(
            BuiltInTemplate(
                id=f"tpl-{index:03d}",
                name=name,
                slug=_slug(name),
                category=category,
                description=description,
                tags=tags,
                recommended_for=recommended_for,
                estimated_minutes=10 + (index % 6) * 3,
                popularity_score=100 - min(index, 70),
                is_featured=index in {1, 2, 11, 25, 32, 45},
                schema=template_schema | {"category_slug": category_slug},
            )
        )
    return templates


def to_template_read(template: BuiltInTemplate) -> FormTemplateRead:
    form_schema = FormSchema.model_validate(template.schema)
    return FormTemplateRead(
        id=template.id,
        name=template.name,
        slug=template.slug,
        category=template.category,
        description=template.description,
        version=1,
        tags=template.tags,
        recommended_for=template.recommended_for,
        estimated_minutes=template.estimated_minutes,
        popularity_score=template.popularity_score,
        is_featured=template.is_featured,
        summary=_field_stats(form_schema),
    )


def to_template_detail(template: BuiltInTemplate) -> FormTemplateDetail:
    form_schema = FormSchema.model_validate(template.schema)
    return FormTemplateDetail(
        **to_template_read(template).model_dump(),
        template_schema=form_schema,
        logic_overview=_logic_overview(form_schema),
        mobile_preview_fields=[field_item.label for section_item in form_schema.sections for field_item in section_item.fields][:8],
    )


class TemplateLibraryService:
    def list_templates(
        self,
        *,
        category: str | None = None,
        search: str | None = None,
        organization_type: str | None = None,
        favorites: set[str] | None = None,
    ) -> list[FormTemplateRead]:
        templates = built_in_templates()
        if category:
            templates = [template for template in templates if template.category.lower() == category.lower()]
        if search:
            needle = search.lower()
            templates = [
                template
                for template in templates
                if needle in template.name.lower()
                or needle in template.description.lower()
                or any(needle in tag.lower() for tag in template.tags)
            ]
        favorite_slugs = favorites or set()

        def score(template: BuiltInTemplate) -> tuple[int, int, int]:
            org_match = 1 if organization_type and organization_type.lower() in template.recommended_for else 0
            favorite = 1 if template.slug in favorite_slugs else 0
            return (org_match, favorite, template.popularity_score)

        return [to_template_read(template) for template in sorted(templates, key=score, reverse=True)]

    def recommended_templates(self, organization_type: str | None) -> list[FormTemplateRead]:
        return self.list_templates(organization_type=organization_type)[:8]

    def get_template(self, template_id_or_slug: str) -> FormTemplateDetail:
        for template in built_in_templates():
            if template.id == template_id_or_slug or template.slug == template_id_or_slug:
                return to_template_detail(template)
        raise KeyError(template_id_or_slug)
