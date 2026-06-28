import { type FormControlsSettings, type FormWorkflowStage } from "@/lib/api";
import { type DynamicForm } from "@/lib/forms";

/** Default + normalization logic for a form's controls settings, and the workflow-stage presets. */

export const workflowPresets: Record<
  "simple" | "standard" | "correction",
  FormWorkflowStage[]
> = {
  simple: [
    {
      id: "submitted",
      name: "Submitted",
      reviewer_roles: ["me_manager"],
      reviewer_location_scope: "project",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 24,
    },
    {
      id: "approved",
      name: "Approved",
      reviewer_roles: ["me_manager"],
      reviewer_location_scope: "project",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 48,
    },
  ],
  standard: [
    {
      id: "submitted",
      name: "Submitted",
      reviewer_roles: ["survey_supervisor"],
      reviewer_location_scope: "assigned_location",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 24,
    },
    {
      id: "supervisor_review",
      name: "Supervisor Review",
      reviewer_roles: ["survey_supervisor"],
      reviewer_location_scope: "assigned_location",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 48,
    },
    {
      id: "data_manager_review",
      name: "Data Manager Review",
      reviewer_roles: ["data_manager", "data_quality_officer"],
      reviewer_location_scope: "project",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 48,
    },
    {
      id: "approved",
      name: "Approved",
      reviewer_roles: ["me_manager"],
      reviewer_location_scope: "project",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 72,
    },
  ],
  correction: [
    {
      id: "submitted",
      name: "Submitted",
      reviewer_roles: ["survey_supervisor"],
      reviewer_location_scope: "assigned_location",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 24,
    },
    {
      id: "returned_for_correction",
      name: "Returned for Correction",
      reviewer_roles: ["field_officer", "survey_supervisor"],
      reviewer_location_scope: "assigned_location",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 24,
    },
    {
      id: "reviewed",
      name: "Reviewed",
      reviewer_roles: ["data_manager"],
      reviewer_location_scope: "project",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 48,
    },
    {
      id: "approved",
      name: "Approved",
      reviewer_roles: ["me_manager"],
      reviewer_location_scope: "project",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 72,
    },
  ],
};

export function createDefaultFormControls(form?: DynamicForm): FormControlsSettings {
  const duplicateFields = (form?.fields ?? [])
    .slice(0, 2)
    .map((field) => field.variableName ?? field.id);

  return {
    reference_bindings: [],
    entity_controls: {
      linked_to_entity: true,
      entity_type: "Farmer",
      creates_new_entity: false,
      updates_existing_entity: false,
      requires_existing_entity: true,
      allows_anonymous: false,
      submission_frequency: "once_per_project",
      unique_fields: ["beneficiary_uid", "national_id"],
      matching_fields: [
        "phone_number",
        "household_id",
        "full_name",
        "date_of_birth",
        "village",
        "gps",
      ],
      duplicate_mode: "weighted",
      duplicate_threshold: 90,
      duplicate_action: "block",
      prefill_profile: true,
      lock_prefilled_fields: true,
      editable_with_reason: true,
      profile_update_mode: "with_supervisor_approval",
    },
    permission_rules: [
      {
        subject_type: "role",
        subject_name: "M&E Manager",
        permissions: [
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
        location_scope: "project",
        can_approve_own_submission: false,
        read_only: false,
      },
      {
        subject_type: "role",
        subject_name: "Field Officer",
        permissions: [
          "view_form",
          "submit_data",
          "edit_own_draft_submissions",
          "edit_returned_submissions",
        ],
        location_scope: "assigned_locations",
        can_approve_own_submission: false,
        read_only: false,
      },
      {
        subject_type: "role",
        subject_name: "Viewer / Donor",
        permissions: ["view_form", "view_submissions"],
        location_scope: "project",
        can_approve_own_submission: false,
        read_only: true,
      },
    ],
    workflow_stages: workflowPresets.standard,
    data_quality_rules: [
      {
        id: "required_fields",
        label: "Required fields",
        rule_type: "required",
        enabled: true,
        severity: "critical",
        blocking: true,
        fields: [],
        expression: null,
      },
      {
        id: "gps_boundary",
        label: "GPS boundary check",
        rule_type: "gps_boundary",
        enabled: true,
        severity: "high",
        blocking: false,
        fields: [],
        expression: null,
      },
      {
        id: "duplicate_detection",
        label: "Duplicate detection",
        rule_type: "duplicate",
        enabled: true,
        severity: "high",
        blocking: false,
        fields: duplicateFields,
        expression: null,
      },
      {
        id: "missing_consent",
        label: "Missing consent flag",
        rule_type: "consent",
        enabled: true,
        severity: "critical",
        blocking: true,
        fields: [],
        expression: null,
      },
    ],
    governance: {
      form_status: form?.status === "published" ? "published" : "draft",
      approval_workflow: "standard",
      required_review_levels: 2,
      submitted_records_editable: false,
      approved_records_editable: false,
      rejected_records_resubmittable: true,
      duplicate_submissions_allowed: false,
      duplicate_detection_fields: duplicateFields.length
        ? duplicateFields
        : ["respondent_id", "phone_number"],
      require_gps_capture: true,
      require_timestamp_capture: true,
      require_enumerator_assignment: true,
      require_supervisor_review: true,
      data_retention_days: 2555,
      export_restricted: true,
      sensitive_field_masking: true,
      pii_tagging_required: true,
      consent_required: true,
      minimum_quality_score: 80,
      review_sla_hours: 48,
      auto_lock_after_approval: true,
      auto_archive_after_project_closure: true,
    },
    instrument: {
      respondent_identity: {
        allow_anonymous: false,
        allow_new_registration: false,
        beneficiary_search_required: true,
        mode: "existing_beneficiary",
      },
    },
    audit: {
      immutable: true,
      reason_required_events: [
        "validation_rule_changed",
        "permission_changed",
        "form_published",
        "submission_rejected",
        "data_deleted",
        "export_performed",
      ],
      tracked_events: [
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
      export_allowed_roles: ["system_admin", "me_manager", "data_manager"],
    },
    versioning: {
      editing_published_creates_draft: true,
      preserve_submission_version_link: true,
      compare_versions_enabled: true,
      reference_lists_version_aware: true,
      archived_versions_viewable: true,
    },
  };
}

export function normalizeFormControls(
  value: unknown,
  form?: DynamicForm,
): FormControlsSettings {
  const defaults = createDefaultFormControls(form);
  if (!value || typeof value !== "object") {
    return defaults;
  }
  const record = value as Partial<FormControlsSettings>;
  const defaultEntityControls =
    defaults.entity_controls as NonNullable<
      FormControlsSettings["entity_controls"]
    >;
  const defaultInstrument = defaults.instrument ?? {};
  const recordInstrument =
    record.instrument && typeof record.instrument === "object"
      ? record.instrument
      : undefined;
  const defaultRespondentIdentity =
    defaultInstrument.respondent_identity &&
    typeof defaultInstrument.respondent_identity === "object"
      ? defaultInstrument.respondent_identity
      : {};
  const recordRespondentIdentity =
    recordInstrument?.respondent_identity &&
    typeof recordInstrument.respondent_identity === "object"
      ? recordInstrument.respondent_identity
      : {};

  return {
    reference_bindings: Array.isArray(record.reference_bindings)
      ? record.reference_bindings
      : defaults.reference_bindings,
    permission_rules: Array.isArray(record.permission_rules)
      ? record.permission_rules
      : defaults.permission_rules,
    workflow_stages: Array.isArray(record.workflow_stages)
      ? record.workflow_stages
      : defaults.workflow_stages,
    data_quality_rules: Array.isArray(record.data_quality_rules)
      ? record.data_quality_rules
      : defaults.data_quality_rules,
    entity_controls: {
      ...defaultEntityControls,
      ...(record.entity_controls ?? {}),
    },
    governance: { ...defaults.governance, ...(record.governance ?? {}) },
    instrument: {
      ...defaultInstrument,
      ...recordInstrument,
      respondent_identity: {
        ...defaultRespondentIdentity,
        ...recordRespondentIdentity,
      },
    },
    audit: { ...defaults.audit, ...(record.audit ?? {}) },
    versioning: { ...defaults.versioning, ...(record.versioning ?? {}) },
  };
}

/** The form-level controls workspace tabs. */
export type FormControlsTab =
  | "overview"
  | "entity"
  | "reference"
  | "permissions"
  | "workflow"
  | "quality"
  | "governance"
  | "audit"
  | "versions";
