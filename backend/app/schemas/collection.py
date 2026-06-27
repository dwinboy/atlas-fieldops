from datetime import date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.field_types import SUPPORTED_FIELD_TYPES


class FormStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class SubmissionStatus(StrEnum):
    DRAFT = "draft"
    PENDING_SYNC = "pending_sync"
    SYNCED = "synced"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    CORRECTION_REQUESTED = "correction_requested"
    RESUBMITTED = "resubmitted"
    ARCHIVED = "archived"


class SurveyStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class SurveyRole(StrEnum):
    OWNER = "survey_owner"
    MANAGER = "survey_manager"
    SUPERVISOR = "survey_supervisor"
    DATA_QUALITY_OFFICER = "data_quality_officer"
    ENUMERATOR = "enumerator"
    ANALYST = "analyst"


FORM_TYPES = {
    "assessment",
    "attendance",
    "baseline",
    "case_update",
    "complaint",
    "custom",
    "distribution",
    "endline",
    "follow_up",
    "monitoring",
    "registration",
    "verification",
}


SURVEY_TYPES = {
    "baseline",
    "midline",
    "endline",
    "registration",
    "monitoring",
    "verification",
    "assessment",
    "evaluation",
    "follow_up",
    "research",
    "census",
    "beneficiary_survey",
    "farmer_survey",
    "household_survey",
    "market_survey",
    "health_survey",
    "custom",
}


FORM_FIELD_TYPE_ALIASES: dict[str, str] = {
    "short_text": "text",
    "long_text": "textarea",
    "boolean": "checkbox",
    "single_select": "select",
    "multi_select": "multiselect",
    "file_upload": "file",
    "image_upload": "photo",
    "gps_location": "gps",
    "qr_code": "qr",
    "radio_button": "radio",
    "calculated_field": "calculated",
}


class SurveyCreate(BaseModel):
    title: str = Field(min_length=2, max_length=220)
    code: str = Field(min_length=2, max_length=120, pattern=r"^[A-Za-z0-9-]+$")
    project_id: UUID
    description: str | None = Field(default=None, max_length=4000)
    survey_type: str = Field(default="baseline", max_length=80)
    custom_type_label: str | None = Field(default=None, max_length=120)
    manager_user_id: UUID | None = None
    status: SurveyStatus = SurveyStatus.DRAFT
    start_date: date | None = None
    end_date: date | None = None
    geographic_scope: str | None = Field(default=None, max_length=240)
    target_population: str | None = Field(default=None, max_length=240)
    indicator_ids: list[UUID] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_survey_type_and_dates(self) -> "SurveyCreate":
        if self.survey_type not in SURVEY_TYPES:
            raise ValueError("survey_type must be a supported type or custom")
        if self.survey_type == "custom" and not self.custom_type_label:
            raise ValueError("custom_type_label is required for custom survey types")
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class SurveyRead(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    created_by_user_id: UUID
    owner_user_id: UUID
    manager_user_id: UUID | None
    title: str
    code: str
    description: str | None
    survey_type: str
    custom_type_label: str | None
    status: str
    start_date: date | None
    end_date: date | None
    geographic_scope: str | None
    target_population: str | None
    indicator_ids_json: list[str]
    governance_json: dict[str, Any] = Field(default_factory=dict)
    is_active: bool

    model_config = {"from_attributes": True}


class SurveyTeamMemberCreate(BaseModel):
    user_id: UUID
    survey_role: SurveyRole


class SurveyTeamMemberRead(BaseModel):
    id: UUID
    survey_id: UUID
    user_id: UUID
    survey_role: str
    is_active: bool

    model_config = {"from_attributes": True}


class SurveyGovernanceSettings(BaseModel):
    data_visibility_roles: list[str] = Field(
        default_factory=lambda: [
            "survey_owner",
            "survey_manager",
            "survey_supervisor",
            "data_quality_officer",
            "analyst",
        ],
        max_length=20,
    )
    review_roles: list[str] = Field(
        default_factory=lambda: [
            "survey_owner",
            "survey_manager",
            "survey_supervisor",
            "data_quality_officer",
        ],
        max_length=20,
    )
    approval_roles: list[str] = Field(
        default_factory=lambda: ["survey_owner", "survey_manager", "data_quality_officer"],
        max_length=20,
    )
    edit_roles: list[str] = Field(
        default_factory=lambda: ["survey_owner", "survey_manager", "data_quality_officer"],
        max_length=20,
    )
    correction_roles: list[str] = Field(
        default_factory=lambda: [
            "survey_owner",
            "survey_manager",
            "survey_supervisor",
            "data_quality_officer",
        ],
        max_length=20,
    )
    upload_roles: list[str] = Field(
        default_factory=lambda: ["survey_owner", "survey_manager", "data_quality_officer"],
        max_length=20,
    )
    export_roles: list[str] = Field(
        default_factory=lambda: ["survey_owner", "survey_manager", "analyst"],
        max_length=20,
    )
    synced_submission_default_status: str = Field(default="submitted", pattern=r"^(submitted|under_review)$")
    uploaded_submission_default_status: str = Field(default="under_review", pattern=r"^(submitted|under_review)$")
    review_required: bool = True
    allow_reviewer_edit: bool = True
    require_correction_note: bool = True
    lock_after_approval: bool = True


class LocationCapture(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    altitude: float | None = None
    accuracy: float | None = Field(default=None, ge=0)
    timestamp: datetime


class DeviceMetadata(BaseModel):
    device_id: str = Field(min_length=2, max_length=160)
    platform: str | None = Field(default=None, max_length=80)
    app_version: str | None = Field(default=None, max_length=80)
    os_version: str | None = Field(default=None, max_length=80)


class FormField(BaseModel):
    # Keep builder-authored configuration that isn't explicitly modelled here — logic rules,
    # selection (reference/dataset/record), subform, lookup, gps, media, translations, etc. Without
    # this, pydantic silently drops those keys on save and the features never reach the device.
    model_config = {"extra": "allow"}

    id: str = Field(min_length=1, max_length=120)
    type: str = Field(min_length=2, max_length=80)
    label: str = Field(min_length=1, max_length=240)
    definition: str | None = Field(default=None, max_length=1000)
    hint: str | None = Field(default=None, max_length=500)
    variable_name: str | None = Field(default=None, max_length=120)
    indicator_mapping: str | None = Field(default=None, max_length=160)
    sensitivity_level: str = Field(default="standard", pattern=r"^(public|standard|sensitive|restricted|pii)$")
    allowed_values_definition: str | None = Field(default=None, max_length=1000)
    source_of_truth: str = Field(default="form_response", max_length=120)
    required: bool = False
    validation: dict[str, Any] = Field(default_factory=dict)
    visibility: dict[str, Any] = Field(default_factory=dict)
    appearance: dict[str, Any] = Field(default_factory=dict)
    options: list[dict[str, Any]] = Field(default_factory=list)
    calculation: str | None = None
    matrix: dict[str, Any] = Field(default_factory=dict)
    repeat: dict[str, Any] = Field(default_factory=dict)
    children: list["FormField"] = Field(default_factory=list)

    @model_validator(mode="after")
    def normalize_type_aliases(self) -> "FormField":
        normalized = self.type.strip().lower().replace("-", "_").replace(" ", "_")
        self.type = FORM_FIELD_TYPE_ALIASES.get(normalized, normalized)
        return self


class FormSection(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=1000)
    fields: list[FormField] = Field(default_factory=list)


class FormSchema(BaseModel):
    version_label: str | None = None
    sections: list[FormSection] = Field(min_length=1)

    @model_validator(mode="after")
    def ensure_offline_safe_fields(self) -> "FormSchema":
        # The offline-safe allowlist is the field-type registry's key set (single source of truth).
        supported = SUPPORTED_FIELD_TYPES
        def validate_fields(fields: list[FormField]) -> None:
            for field in fields:
                if field.type not in supported:
                    raise ValueError(f"Unsupported field type: {field.type}")
                validate_fields(field.children)

        for section in self.sections:
            validate_fields(section.fields)
        return self


FORM_PERMISSION_ACTIONS = {
    "view_form",
    "edit_form",
    "publish_form",
    "archive_form",
    "assign_form",
    "submit_data",
    "view_submissions",
    "edit_own_draft_submissions",
    "edit_returned_submissions",
    "review_submissions",
    "approve_submissions",
    "reject_submissions",
    "export_data",
    "delete_submissions",
    "manage_form_controls",
}


class FormReferenceBinding(BaseModel):
    id: str = Field(min_length=2, max_length=120)
    question_id: str = Field(min_length=1, max_length=120)
    question_label: str = Field(min_length=1, max_length=240)
    reference_list_name: str = Field(min_length=2, max_length=160)
    reference_type: str = Field(default="districts", max_length=80)
    source: str = Field(default="existing", pattern=r"^(new|existing|imported)$")
    enforce_controlled_values: bool = True
    allow_inactive_values: bool = False
    parent_reference: str | None = Field(default=None, max_length=120)
    effective_from: date | None = None
    effective_to: date | None = None
    version: int = Field(default=1, ge=1)
    updated_by: str | None = Field(default=None, max_length=200)
    changed_since_publish: bool = False


class FormPermissionRule(BaseModel):
    subject_type: str = Field(default="role", pattern=r"^(role|user|team)$")
    subject_name: str = Field(min_length=2, max_length=160)
    permissions: list[str] = Field(default_factory=list, max_length=30)
    location_scope: str = Field(default="project", max_length=120)
    can_approve_own_submission: bool = False
    read_only: bool = False

    @model_validator(mode="after")
    def validate_permissions(self) -> "FormPermissionRule":
        invalid = sorted(set(self.permissions) - FORM_PERMISSION_ACTIONS)
        if invalid:
            raise ValueError(f"Unsupported permissions: {', '.join(invalid)}")
        if self.read_only:
            self.permissions = [permission for permission in self.permissions if permission in {"view_form", "view_submissions"}]
        return self


class FormWorkflowStage(BaseModel):
    id: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=2, max_length=160)
    reviewer_roles: list[str] = Field(default_factory=list, max_length=12)
    reviewer_location_scope: str = Field(default="assigned_location", max_length=120)
    require_comment_on_reject: bool = True
    require_comment_on_return: bool = True
    sla_hours: int = Field(default=48, ge=1, le=2160)


class FormDataQualityRule(BaseModel):
    id: str = Field(min_length=2, max_length=120)
    label: str = Field(min_length=2, max_length=200)
    rule_type: str = Field(min_length=2, max_length=80)
    enabled: bool = True
    severity: str = Field(default="medium", pattern=r"^(low|medium|high|critical)$")
    blocking: bool = False
    fields: list[str] = Field(default_factory=list, max_length=20)
    expression: str | None = Field(default=None, max_length=1000)


class FormGovernancePolicy(BaseModel):
    form_status: str = Field(default="draft", pattern=r"^(draft|testing|review|approved|published|suspended|archived)$")
    approval_workflow: str = Field(default="standard", pattern=r"^(simple|standard|correction|custom)$")
    required_review_levels: int = Field(default=2, ge=0, le=5)
    submitted_records_editable: bool = False
    approved_records_editable: bool = False
    rejected_records_resubmittable: bool = True
    duplicate_submissions_allowed: bool = False
    duplicate_detection_fields: list[str] = Field(default_factory=lambda: ["respondent_id", "phone_number"], max_length=20)
    require_gps_capture: bool = True
    require_timestamp_capture: bool = True
    require_enumerator_assignment: bool = True
    require_supervisor_review: bool = True
    data_retention_days: int = Field(default=2555, ge=1)
    export_restricted: bool = True
    sensitive_field_masking: bool = True
    pii_tagging_required: bool = True
    consent_required: bool = True
    minimum_quality_score: int = Field(default=80, ge=0, le=100)
    review_sla_hours: int = Field(default=48, ge=1, le=2160)
    auto_lock_after_approval: bool = True
    auto_archive_after_project_closure: bool = True


class FormAuditSettings(BaseModel):
    immutable: bool = True
    reason_required_events: list[str] = Field(
        default_factory=lambda: [
            "validation_rule_changed",
            "permission_changed",
            "form_published",
            "submission_rejected",
            "data_deleted",
            "export_performed",
        ],
        max_length=40,
    )
    tracked_events: list[str] = Field(
        default_factory=lambda: [
            "form_created",
            "form_edited",
            "question_added",
            "question_removed",
            "validation_rule_changed",
            "skip_logic_changed",
            "reference_list_attached",
            "permission_changed",
            "form_published",
            "form_archived",
            "submission_created",
            "submission_reviewed",
            "submission_approved",
            "submission_rejected",
            "export_performed",
        ],
        max_length=80,
    )
    export_allowed_roles: list[str] = Field(default_factory=lambda: ["system_admin", "me_manager", "data_manager"], max_length=12)


class FormVersioningSettings(BaseModel):
    editing_published_creates_draft: bool = True
    preserve_submission_version_link: bool = True
    compare_versions_enabled: bool = True
    reference_lists_version_aware: bool = True
    archived_versions_viewable: bool = True


class FormCollectionAccessSettings(BaseModel):
    selection_mode: str = Field(default="assigned_only", pattern=r"^(assigned_only|project_team|open_link)$")
    field_officer_ids: list[UUID] = Field(default_factory=list, max_length=200)
    team_ids: list[UUID] = Field(default_factory=list, max_length=100)
    assigned_at: datetime | None = None
    assigned_by_user_id: UUID | None = None
    notes: str | None = Field(default=None, max_length=500)


class FormEntityControlSettings(BaseModel):
    linked_to_entity: bool = False
    entity_category_id: UUID | None = None
    entity_type: str = Field(default="Farmer", max_length=80)
    creates_new_entity: bool = False
    updates_existing_entity: bool = False
    requires_existing_entity: bool = False
    allows_anonymous: bool = True
    submission_frequency: str = Field(
        default="unlimited",
        pattern=r"^(once_ever|once_per_project|once_per_year|once_per_season|once_per_quarter|once_per_month|once_per_event|unlimited)$",
    )
    unique_fields: list[str] = Field(default_factory=list, max_length=20)
    matching_fields: list[str] = Field(default_factory=lambda: ["phone_number", "household_id", "full_name", "village"], max_length=30)
    duplicate_mode: str = Field(default="weighted", pattern=r"^(exact|fuzzy|weighted)$")
    duplicate_threshold: int = Field(default=90, ge=0, le=100)
    duplicate_action: str = Field(default="block", pattern=r"^(block|warn|review)$")
    prefill_profile: bool = True
    prefill_mappings: list[dict[str, Any]] = Field(default_factory=list, max_length=100)
    lock_prefilled_fields: bool = True
    editable_with_reason: bool = True
    profile_update_mode: str = Field(default="with_supervisor_approval", pattern=r"^(never|after_submission|with_supervisor_approval)$")

    @field_validator("profile_update_mode", mode="before")
    @classmethod
    def normalize_profile_update_mode(cls, value: Any) -> Any:
        if not isinstance(value, str):
            return value
        normalized = value.strip().lower()
        if normalized in {"never", "after_submission", "with_supervisor_approval"}:
            return normalized
        if "never" in normalized or "history only" in normalized:
            return "never"
        if "after submission" in normalized or "auto update" in normalized or "automatic" in normalized:
            return "after_submission"
        if "review" in normalized or "supervisor approval" in normalized or "approval" in normalized:
            return "with_supervisor_approval"
        return value

    @field_validator("submission_frequency", mode="before")
    @classmethod
    def normalize_submission_frequency(cls, value: Any) -> Any:
        if not isinstance(value, str):
            return value
        normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
        aliases = {
            "once": "once_ever",
            "single": "once_ever",
            "once_ever": "once_ever",
            "per_project": "once_per_project",
            "once_per_project": "once_per_project",
            "yearly": "once_per_year",
            "annual": "once_per_year",
            "once_per_year": "once_per_year",
            "seasonal": "once_per_season",
            "once_per_season": "once_per_season",
            "quarterly": "once_per_quarter",
            "once_per_quarter": "once_per_quarter",
            "monthly": "once_per_month",
            "once_per_month": "once_per_month",
            "per_event": "once_per_event",
            "once_per_event": "once_per_event",
            "unlimited": "unlimited",
        }
        return aliases.get(normalized, value)


class FormControlsSettings(BaseModel):
    reference_bindings: list[FormReferenceBinding] = Field(default_factory=list, max_length=100)
    permission_rules: list[FormPermissionRule] = Field(
        default_factory=lambda: [
            FormPermissionRule(
                subject_name="M&E Manager",
                permissions=[
                    "view_form",
                    "edit_form",
                    "publish_form",
                    "archive_form",
                    "assign_form",
                    "view_submissions",
                    "review_submissions",
                    "approve_submissions",
                    "export_data",
                    "manage_form_controls",
                ],
            ),
            FormPermissionRule(
                subject_name="Field Officer",
                permissions=["view_form", "submit_data", "edit_own_draft_submissions", "edit_returned_submissions"],
                location_scope="assigned_locations",
            ),
            FormPermissionRule(
                subject_name="Viewer / Donor",
                permissions=["view_form", "view_submissions"],
                read_only=True,
            ),
        ],
        max_length=100,
    )
    workflow_stages: list[FormWorkflowStage] = Field(
        default_factory=lambda: [
            FormWorkflowStage(id="submitted", name="Submitted", reviewer_roles=["survey_supervisor"], sla_hours=24),
            FormWorkflowStage(id="supervisor_review", name="Supervisor Review", reviewer_roles=["survey_supervisor"], sla_hours=48),
            FormWorkflowStage(id="data_manager_review", name="Data Manager Review", reviewer_roles=["data_manager", "data_quality_officer"], sla_hours=48),
            FormWorkflowStage(id="approved", name="Approved", reviewer_roles=["me_manager"], sla_hours=72),
        ],
        max_length=20,
    )
    data_quality_rules: list[FormDataQualityRule] = Field(
        default_factory=lambda: [
            FormDataQualityRule(id="required_fields", label="Required fields", rule_type="required", severity="critical", blocking=True),
            FormDataQualityRule(id="gps_boundary", label="GPS boundary check", rule_type="gps_boundary", severity="high"),
            FormDataQualityRule(id="duplicate_detection", label="Duplicate detection", rule_type="duplicate", severity="high"),
            FormDataQualityRule(id="missing_consent", label="Missing consent flag", rule_type="consent", severity="critical", blocking=True),
        ],
        max_length=100,
    )
    collection_access: FormCollectionAccessSettings = Field(default_factory=FormCollectionAccessSettings)
    entity_controls: FormEntityControlSettings = Field(default_factory=FormEntityControlSettings)
    governance: FormGovernancePolicy = Field(default_factory=FormGovernancePolicy)
    audit: FormAuditSettings = Field(default_factory=FormAuditSettings)
    versioning: FormVersioningSettings = Field(default_factory=FormVersioningSettings)
    instrument: dict[str, Any] = Field(
        default_factory=dict,
        description="Advanced M&E instrument metadata: purpose, indicator links, data dictionary, tracking, sampling, localization, analytics, and trigger rules.",
    )


class DataFormCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=2, max_length=140, pattern=r"^[a-z0-9-]+$")
    project_id: UUID
    survey_id: UUID
    description: str | None = Field(default=None, max_length=2000)
    form_type: str | None = Field(default=None, max_length=40)
    form_schema: FormSchema = Field(alias="schema")
    publish: bool = False

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def validate_form_type(self) -> "DataFormCreate":
        if self.form_type is not None and self.form_type not in FORM_TYPES:
            raise ValueError("form_type must be a supported type or custom")
        return self


class DataFormUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    form_type: str | None = Field(default=None, max_length=40)
    form_schema: FormSchema = Field(alias="schema")
    publish: bool = False

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def validate_form_type(self) -> "DataFormUpdate":
        if self.form_type is not None and self.form_type not in FORM_TYPES:
            raise ValueError("form_type must be a supported type or custom")
        return self


class DataFormRead(BaseModel):
    id: UUID
    project_id: UUID | None = None
    survey_id: UUID | None = None
    name: str
    slug: str
    description: str | None
    form_type: str | None = None
    status: str
    current_version: int
    controls_json: dict[str, Any] = Field(default_factory=dict)
    is_active: bool

    model_config = {"from_attributes": True}


class DataFormSchemaRead(BaseModel):
    form_id: UUID
    version: int
    form_schema: dict[str, Any] = Field(alias="schema")
    published_at: datetime | None = None
    published_by_user_id: UUID | None = None

    model_config = {"populate_by_name": True}


class FormDataImportIssue(BaseModel):
    row_number: int = Field(ge=1)
    field_name: str | None = None
    question_label: str | None = None
    issue_type: str
    severity: str = Field(default="warning", pattern=r"^(info|warning|error)$")
    message: str
    suggested_fix: str | None = None


class FormDataImportRequest(BaseModel):
    rows: list[dict[str, Any]] = Field(min_length=1, max_length=5000)
    source_name: str = Field(default="Form spreadsheet upload", min_length=2, max_length=240)
    source_system: str = Field(default="Form spreadsheet upload", min_length=2, max_length=120)
    import_reason: str | None = Field(default=None, max_length=500)


class XlsFormSurveyRow(BaseModel):
    type: str
    name: str
    label: str
    hint: str | None = None
    required: str | None = None
    constraint: str | None = None
    relevant: str | None = None
    calculation: str | None = None


class XlsFormChoiceRow(BaseModel):
    list_name: str
    name: str
    label: str


class XlsFormSettings(BaseModel):
    form_title: str
    form_id: str
    version: str
    default_language: str = "en"


class XlsFormWorkbook(BaseModel):
    survey: list[XlsFormSurveyRow]
    choices: list[XlsFormChoiceRow]
    settings: XlsFormSettings


class FormCollectionCompatibility(BaseModel):
    form_id: UUID
    version: int
    offline_ready: bool
    xlsform_ready: bool
    web_form_ready: bool
    mobile_app_ready: bool
    has_gps: bool
    has_repeat_groups: bool
    media_field_count: int
    warnings: list[str] = Field(default_factory=list)


class TemplateFieldSummary(BaseModel):
    field_count: int
    repeat_group_count: int
    has_gps: bool
    has_media: bool
    offline_compatible: bool


class FormTemplateRead(BaseModel):
    id: str
    name: str
    slug: str
    category: str
    description: str
    version: int
    tags: list[str]
    recommended_for: list[str]
    estimated_minutes: int
    popularity_score: int
    is_featured: bool
    summary: TemplateFieldSummary


class FormTemplateDetail(FormTemplateRead):
    template_schema: FormSchema
    logic_overview: list[str] = Field(default_factory=list)
    mobile_preview_fields: list[str] = Field(default_factory=list)


class TemplateDuplicateRequest(BaseModel):
    project_id: UUID
    survey_id: UUID
    name: str | None = Field(default=None, min_length=2, max_length=200)
    slug: str | None = Field(default=None, min_length=2, max_length=140, pattern=r"^[a-z0-9-]+$")
    publish: bool = False


class TemplateRecommendationRequest(BaseModel):
    organization_type: str | None = Field(default=None, max_length=80)
    recently_used_categories: list[str] = Field(default_factory=list, max_length=8)


class FieldOfficerInvite(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    full_name: str = Field(min_length=2, max_length=200)
    phone_number: str | None = Field(default=None, max_length=40)
    employee_code: str | None = Field(default=None, max_length=80)
    home_region: str | None = Field(default=None, max_length=160)
    temporary_password: str = Field(min_length=12)


class FieldOfficerRead(BaseModel):
    id: UUID
    user_id: UUID
    email: str
    full_name: str
    phone_number: str | None
    employee_code: str | None
    home_region: str | None
    supervisor_user_id: UUID | None = None
    supervisor_name: str | None = None
    last_sync_at: datetime | None
    last_seen_at: datetime | None
    last_latitude: float | None
    last_longitude: float | None
    device_id: str | None
    is_active: bool


class FieldOfficerSummaryMetric(BaseModel):
    label: str
    value: str
    tone: str = "neutral"
    route: str | None = None


class FieldOfficerAssignmentDetailRead(BaseModel):
    id: UUID
    project_id: UUID
    project_name: str
    form_id: UUID | None = None
    form_name: str | None = None
    region: str | None = None
    target: int = 0
    completed: int = 0
    status: str = "Assigned"
    is_active: bool = True
    updated_at: datetime


class FieldOfficerSubmissionDetailRead(BaseModel):
    id: UUID
    client_submission_id: str
    project_id: UUID | None = None
    project_name: str | None = None
    form_id: UUID
    form_name: str | None = None
    entity_id: UUID | None = None
    status: str
    source: str
    submitted_at: datetime
    sync_received_at: datetime
    quality_score: int


class FieldOfficerDeviceDetailRead(BaseModel):
    device_id: str
    device_name: str
    platform: str
    app_version: str | None = None
    os_version: str | None = None
    status: str
    last_seen_at: datetime | None = None
    last_sync_at: datetime | None = None


class FieldOfficerActivityEventRead(BaseModel):
    id: str
    action: str
    detail: str
    device_id: str | None = None
    project_id: UUID | None = None
    created_at: datetime
    status: str = "Recorded"


class FieldOfficerSecurityRead(BaseModel):
    username: str
    email: str
    account_status: str
    role: str | None = None
    scope_type: str | None = None
    project_id: str | None = None
    geography_id: str | None = None
    temporary_password_issued: bool = False
    password_last_changed_at: datetime | None = None
    last_login_at: datetime | None = None
    failed_login_attempts: int = 0
    mobile_qr_login_enabled: bool = False
    mobile_qr_login_payload: str | None = None
    credential_actions: list[str] = Field(default_factory=list)


class FieldOfficerPermissionRead(BaseModel):
    key: str
    label: str
    enabled: bool
    source: str


class FieldOfficerProfileUpdate(BaseModel):
    employee_code: str | None = Field(default=None, max_length=80)
    phone_number: str | None = Field(default=None, max_length=40)
    home_region: str | None = Field(default=None, max_length=160)
    supervisor_user_id: UUID | None = None
    is_active: bool | None = None


class FieldOfficerProfileDetailRead(BaseModel):
    officer: FieldOfficerRead
    organization_name: str | None = None
    team: str | None = None
    supervisor: str | None = None
    status: str
    metrics: list[FieldOfficerSummaryMetric] = Field(default_factory=list)
    assignments: list[FieldOfficerAssignmentDetailRead] = Field(default_factory=list)
    projects: list[FieldOfficerAssignmentDetailRead] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    forms: list[FieldOfficerAssignmentDetailRead] = Field(default_factory=list)
    beneficiaries: list[dict[str, Any]] = Field(default_factory=list)
    submissions: list[FieldOfficerSubmissionDetailRead] = Field(default_factory=list)
    performance: dict[str, Any] = Field(default_factory=dict)
    data_quality: dict[str, Any] = Field(default_factory=dict)
    devices: list[FieldOfficerDeviceDetailRead] = Field(default_factory=list)
    activity: list[FieldOfficerActivityEventRead] = Field(default_factory=list)
    permissions: list[FieldOfficerPermissionRead] = Field(default_factory=list)
    security: FieldOfficerSecurityRead
    audit_trail: list[FieldOfficerActivityEventRead] = Field(default_factory=list)


class OfficerAssignmentCreate(BaseModel):
    officer_id: UUID
    project_id: UUID
    form_id: UUID | None = None
    region: str | None = Field(default=None, max_length=160)
    is_active: bool = True


class OfficerAssignmentRead(BaseModel):
    id: UUID
    officer_id: UUID
    project_id: UUID
    form_id: UUID | None = None
    region: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


FIELD_WORK_ASSIGNMENT_STATUSES = (
    "Draft",
    "Assigned",
    "In Progress",
    "Completed",
    "Overdue",
    "Cancelled",
)

FIELD_WORK_ASSIGNMENT_PRIORITIES = ("Low", "Normal", "High", "Urgent")


class FieldWorkAssignmentCreate(BaseModel):
    project_id: UUID
    form_id: UUID | None = None
    supervisor_user_id: UUID | None = None
    name: str = Field(min_length=1, max_length=220)
    description: str | None = None
    assignment_type: str = Field(default="Form only", max_length=80)
    officer_ids: list[UUID] = Field(default_factory=list)
    assigned_entity_ids: list[str] = Field(default_factory=list)
    location: str | None = Field(default=None, max_length=240)
    start_date: date | None = None
    end_date: date | None = None
    target_count: int = Field(default=0, ge=0)
    priority: str = "Normal"

    @model_validator(mode="after")
    def validate_priority(self) -> "FieldWorkAssignmentCreate":
        if self.priority not in FIELD_WORK_ASSIGNMENT_PRIORITIES:
            raise ValueError(
                f"Priority must be one of {', '.join(FIELD_WORK_ASSIGNMENT_PRIORITIES)}"
            )
        return self


class FieldWorkAssignmentUpdate(BaseModel):
    form_id: UUID | None = None
    supervisor_user_id: UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=220)
    description: str | None = None
    assignment_type: str | None = Field(default=None, max_length=80)
    officer_ids: list[UUID] | None = None
    assigned_entity_ids: list[str] | None = None
    location: str | None = Field(default=None, max_length=240)
    start_date: date | None = None
    end_date: date | None = None
    target_count: int | None = Field(default=None, ge=0)
    completed_count: int | None = Field(default=None, ge=0)
    priority: str | None = None

    @model_validator(mode="after")
    def validate_priority(self) -> "FieldWorkAssignmentUpdate":
        if self.priority is not None and self.priority not in FIELD_WORK_ASSIGNMENT_PRIORITIES:
            raise ValueError(
                f"Priority must be one of {', '.join(FIELD_WORK_ASSIGNMENT_PRIORITIES)}"
            )
        return self


class FieldWorkAssignmentStatusUpdate(BaseModel):
    status: str
    reason: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_status(self) -> "FieldWorkAssignmentStatusUpdate":
        if self.status not in FIELD_WORK_ASSIGNMENT_STATUSES:
            raise ValueError(
                f"Status must be one of {', '.join(FIELD_WORK_ASSIGNMENT_STATUSES)}"
            )
        return self


class FieldWorkAssignmentRead(BaseModel):
    id: UUID
    project_id: UUID
    form_id: UUID | None = None
    created_by_user_id: UUID
    supervisor_user_id: UUID | None = None
    name: str
    description: str | None = None
    assignment_type: str
    officer_ids: list[UUID] = Field(default_factory=list)
    assigned_entity_ids: list[str] = Field(default_factory=list)
    location: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    target_count: int
    completed_count: int
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime


class FieldOfficerImportIssue(BaseModel):
    row_number: int
    email: str | None = None
    message: str


class FieldOfficerImportResponse(BaseModel):
    created_count: int
    skipped_count: int
    error_count: int
    officers: list[FieldOfficerRead] = Field(default_factory=list)
    issues: list[FieldOfficerImportIssue] = Field(default_factory=list)


class SubmissionCreate(BaseModel):
    client_submission_id: str = Field(min_length=4, max_length=160)
    project_id: UUID
    survey_id: UUID
    form_id: UUID
    form_version: int
    entity_id: UUID | None = None
    entity_type: str | None = Field(default=None, max_length=80)
    assignment_id: UUID | None = None
    supervisor_id: UUID | None = None
    frequency_period: str | None = Field(default=None, max_length=80)
    event_id: str | None = Field(default=None, max_length=160)
    payload: dict[str, Any]
    captured_at: datetime
    submitted_at: datetime
    offline_created: bool = False
    device: DeviceMetadata
    location: LocationCapture

    @model_validator(mode="after")
    def require_system_metadata(self) -> "SubmissionCreate":
        if not self.device.device_id:
            raise ValueError("device_id is required")
        return self


class SubmissionBeneficiaryLinkRead(BaseModel):
    id: str
    beneficiary_id: str
    beneficiary_uid: str
    display_name: str
    beneficiary_type: str
    link_type: str
    source: str
    source_field: str | None = None
    created_at: datetime


class SubmissionRead(BaseModel):
    id: UUID
    client_submission_id: str
    project_id: UUID | None = None
    survey_id: UUID | None = None
    form_id: UUID
    entity_id: UUID | None = None
    entity_type: str | None = None
    assignment_id: UUID | None = None
    supervisor_id: UUID | None = None
    frequency_period: str | None = None
    event_id: str | None = None
    field_officer_id: UUID | None = None
    status: str
    server_sequence: int
    captured_at: datetime
    submitted_at: datetime
    sync_received_at: datetime
    offline_created: bool
    device_id: str
    latitude: float
    longitude: float
    accuracy: float | None
    payload_json: dict[str, Any]
    is_imported: bool = False
    source_system: str | None = None
    source_record_id: str | None = None
    source_project_id: str | None = None
    source_form_id: str | None = None
    source_submission_id: str | None = None
    import_batch_id: UUID | None = None
    imported_at: datetime | None = None
    imported_by_user_id: UUID | None = None
    reviewed_by_user_id: UUID | None = None
    reviewed_at: datetime | None = None
    review_comments: str | None = None
    approved_by_user_id: UUID | None = None
    approved_at: datetime | None = None
    beneficiary_code: str | None = None
    submitted_by_name: str | None = None
    approved_by_name: str | None = None
    imported_by_name: str | None = None
    reviewed_by_name: str | None = None
    linked_beneficiaries: list[SubmissionBeneficiaryLinkRead] = Field(default_factory=list)
    review_quality: int | None = None
    redacted_fields: list[str] = Field(default_factory=list)
    spatial_flags: dict[str, Any] | None = None

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _populate_spatial_flags(self) -> "SubmissionRead":
        if self.spatial_flags is None:
            flags = self.payload_json.get("_spatial_flags")
            if isinstance(flags, dict):
                self.spatial_flags = flags
        return self


class SpatialQualityIssueRead(BaseModel):
    id: str
    issue_type: str = Field(alias="issueType")
    submission_id: str = Field(alias="submissionId")
    enumerator: str
    project: str
    location: str
    severity: str
    recommended_action: str = Field(alias="recommendedAction")
    validation_state: str = Field(alias="validationState")

    model_config = {"populate_by_name": True}


class CorrectionLogEntryRead(BaseModel):
    submission_id: UUID
    submission_key: str
    corrected_field: str
    old_value: Any = None
    new_value: Any = None
    corrected_by: UUID | None = None
    corrected_at: datetime
    reason: str | None = None
    change_type: str
    review_comment: str | None = None

    model_config = {"from_attributes": True}


class SubmissionRepeatRowRead(BaseModel):
    id: UUID
    submission_id: UUID
    parent_submission_key: str
    field_id: str
    row_index: int
    row_json: dict[str, Any]

    model_config = {"from_attributes": True}


class ImportCleaningRowRead(BaseModel):
    id: UUID
    client_submission_id: str
    form_id: UUID
    form_name: str
    project_id: UUID | None = None
    project_name: str | None = None
    status: str
    imported_at: datetime | None = None
    imported_by_user_id: UUID | None = None
    uploaded_by_name: str | None = None
    source_system: str | None = None
    source_record_id: str | None = None
    missing_fields: list[str] = Field(default_factory=list)
    missing_field_keys: list[str] = Field(default_factory=list)
    validation_issues: list[str] = Field(default_factory=list)
    response_values: dict[str, Any] = Field(default_factory=dict)
    issue_count: int
    missing_field_count: int
    ready_to_confirm: bool
    quality_status: str | None = None
    updated_at: datetime


class ImportCleaningBulkRowUpdate(BaseModel):
    submission_id: UUID
    responses: dict[str, Any]


class ImportCleaningBulkUpdateRequest(BaseModel):
    rows: list[ImportCleaningBulkRowUpdate] = Field(min_length=1, max_length=250)
    reason: str = Field(default="Bulk cleaned imported form rows.", min_length=4, max_length=1000)


class ImportCleaningBulkUpdateResponse(BaseModel):
    updated_rows: int
    skipped_rows: int
    issues: list[FormDataImportIssue] = Field(default_factory=list)
    rows: list[ImportCleaningRowRead] = Field(default_factory=list)


class FormDataImportResponse(BaseModel):
    imported_rows: int
    warning_count: int
    error_count: int
    issues: list[FormDataImportIssue] = Field(default_factory=list)
    submissions: list[SubmissionRead] = Field(default_factory=list)


class FormDataImportConfirmRequest(BaseModel):
    submission_ids: list[UUID] = Field(min_length=1, max_length=500)
    comment: str = Field(default="Cleaned imported form data confirmed for platform use.", min_length=4, max_length=1000)


class FormDataImportConfirmResponse(BaseModel):
    confirmed_rows: int
    skipped_rows: int
    issues: list[FormDataImportIssue] = Field(default_factory=list)
    submissions: list[SubmissionRead] = Field(default_factory=list)


class FormDataImportReturnRequest(BaseModel):
    submission_ids: list[UUID] = Field(min_length=1, max_length=500)
    comment: str = Field(default="Returned to source for correction and re-upload.", min_length=4, max_length=1000)


class FormDataImportReturnResponse(BaseModel):
    returned_rows: int
    skipped_rows: int
    issues: list[FormDataImportIssue] = Field(default_factory=list)
    submissions: list[SubmissionRead] = Field(default_factory=list)


class EntityFrequencyValidationRequest(BaseModel):
    form_id: UUID
    entity_id: UUID | None = None
    project_id: UUID | None = None
    frequency_rule: str = Field(pattern=r"^(once_ever|once_per_project|once_per_year|once_per_season|once_per_quarter|once_per_month|once_per_event|unlimited)$")
    frequency_period: str | None = Field(default=None, max_length=80)
    event_id: str | None = Field(default=None, max_length=160)


class EntityFrequencyValidationRead(BaseModel):
    allowed: bool
    decision: str
    reason: str
    existing_submission_id: UUID | None = None


class SubmissionReviewAction(BaseModel):
    action: str = Field(pattern=r"^(approve|reject|request_correction|start_review|archive)$")
    comment: str = Field(min_length=2, max_length=4000)


class SubmissionResponsesUpdate(BaseModel):
    responses: dict[str, Any]
    reason: str = Field(min_length=2, max_length=4000)


class SubmissionHistoryRead(BaseModel):
    id: UUID
    from_status: str | None
    to_status: str
    actor_user_id: UUID
    actor_name: str | None = None
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SyncBatchCreate(BaseModel):
    client_batch_id: str = Field(min_length=4, max_length=160)
    device: DeviceMetadata
    cursor: datetime | None = None
    submissions: list[SubmissionCreate] = Field(default_factory=list)


class SyncBatchRead(BaseModel):
    batch_id: UUID
    processed_count: int
    conflict_count: int
    server_time: datetime
    submissions: list[SubmissionRead]
    next_cursor: datetime
