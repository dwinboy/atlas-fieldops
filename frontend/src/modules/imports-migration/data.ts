import type {
  ImportAnalysisResponse,
  ImportJobRead,
  ImportPreviewResponse,
  ImportSupportedSourceRead,
} from "@/lib/api";

export const importTypes = [
  { id: "projects", label: "Project", target: "Project.Name", description: "Project metadata, donor, dates, owner, and status." },
  { id: "entity_registry", label: "Beneficiary / Entity Registry", target: "Entity.FullName", description: "Farmers, households, beneficiaries, schools, facilities, and groups." },
  { id: "form_definitions", label: "Form Definition", target: "Form.Question", description: "XLSForm, JSON, or CSV field lists imported as draft forms." },
  { id: "submissions", label: "Submissions", target: "Submission.Payload", description: "Historical records linked to project, form, version, and entity when available." },
  { id: "indicators", label: "Indicators", target: "Indicator.Code", description: "Indicator library, definitions, unit, frequency, baseline, and target." },
  { id: "baselines", label: "Baselines", target: "IndicatorBaseline.Value", description: "Baseline values by project, location, period, and disaggregation." },
  { id: "targets", label: "Targets", target: "IndicatorTarget.Value", description: "Project, annual, quarterly, monthly, and location-specific targets." },
  { id: "locations", label: "Locations", target: "Location.Code", description: "Country, region, district, community, village, and facility hierarchy." },
  { id: "boundaries", label: "Boundaries", target: "Boundary.Geometry", description: "GeoJSON, KML, and shapefile-ready administrative or project boundaries." },
  { id: "users_teams", label: "Users & Teams", target: "User.Email", description: "Users, teams, supervisors, roles, locations, and project assignments." },
];

export const previewSources: ImportSupportedSourceRead[] = [
  {
    description: "Upload CSV, Excel, JSON, XLSForm, GeoJSON, or KML exports from existing tools.",
    id: "upload_file",
    label: "Upload File",
    phase: "Phase 1",
    status: "available",
    supported_formats: ["CSV", "Excel", "JSON", "XLSForm", "GeoJSON", "KML"],
  },
  {
    description: "Connector placeholder for future direct KoboToolbox project, form, and submission pull.",
    id: "kobotoolbox",
    label: "KoboToolbox",
    phase: "Phase 2",
    status: "connector-ready",
    supported_formats: ["API", "XLSForm", "CSV"],
  },
  {
    description: "Connector placeholder for ODK Central projects and historical submissions.",
    id: "odk_central",
    label: "ODK Central",
    phase: "Phase 2",
    status: "connector-ready",
    supported_formats: ["API", "XLSForm", "CSV"],
  },
  {
    description: "Connector placeholder for DHIS2 indicators, org units, event data, and locations.",
    id: "dhis2",
    label: "DHIS2",
    phase: "Phase 2",
    status: "connector-ready",
    supported_formats: ["API", "CSV", "JSON"],
  },
];

export const previewImportJobs: ImportJobRead[] = [
  {
    completed_at: "2026-06-04T08:45:00Z",
    dataset_type: "entity_registry",
    duplicate_rows: 12,
    error_rows: 3,
    failed_records: 3,
    id: "import-batch-farmer-registry",
    rollback_available: true,
    skipped_records: 12,
    source_format: "xlsx",
    source_name: "Kobo farmer registry export.xlsx",
    source_system: "KoboToolbox",
    status: "completed_with_errors",
    successful_records: 1248,
    target_mode: "existing_project",
    total_rows: 1263,
    valid_rows: 1248,
  },
  {
    completed_at: "2026-06-03T11:20:00Z",
    dataset_type: "form_definitions",
    duplicate_rows: 0,
    error_rows: 0,
    failed_records: 0,
    id: "import-batch-baseline-xlsform",
    rollback_available: false,
    skipped_records: 0,
    source_format: "xlsx",
    source_name: "baseline_xlsform.xlsx",
    source_system: "ODK Central",
    status: "validated",
    successful_records: 1,
    target_mode: "new_form",
    total_rows: 87,
    valid_rows: 87,
  },
];

export const previewValidation: ImportPreviewResponse = {
  duplicate_rows: 2,
  error_rows: 1,
  issues: [
    {
      field_name: "phone_number",
      issue_type: "duplicate_entity",
      message: "Phone number matches an existing farmer profile.",
      row_number: 4,
      severity: "warning",
      suggested_fix: "Review possible duplicate before import.",
    },
    {
      field_name: "district",
      issue_type: "unknown_location",
      message: "District does not match the platform location hierarchy.",
      row_number: 9,
      severity: "error",
      suggested_fix: "Map this district to an approved location or create it in Administration.",
    },
  ],
  suggested_mapping: [
    { required: true, source_column: "farmer_name", target_field: "Entity.FullName", transform: "Trim whitespace" },
    { required: false, source_column: "mobile", target_field: "Entity.PhoneNumber", transform: "Normalize phone number" },
    { required: true, source_column: "district", target_field: "Location.District", transform: "Match reference value" },
    { required: false, source_column: "improved_seed", target_field: "FormQuestion.improved_seed", transform: "Convert yes/no values" },
  ],
  valid_rows: 18,
};

export const sampleRows: Record<string, unknown>[] = [
  { farmer_name: "Musa Kamga", mobile: "+237 699 123 458", district: "Mezam", improved_seed: "Yes" },
  { farmer_name: "Amina Bello", mobile: "+237 677 014 220", district: "Wouri", improved_seed: "No" },
  { farmer_name: "Moussa Kamga", mobile: "+237 699 123 458", district: "Mezam", improved_seed: "Yes" },
  { farmer_name: "John T.", mobile: "+237677000001", district: "Mbalmayo", improved_seed: "Yes", monitoring_date: "12/10/24" },
  { farmer_name: "John Thomas", mobile: "677 000 001", district: "MBALMAYO", improved_seed: "Yes", monitoring_date: "10-12-2024" },
];

export const previewSmartAnalysis: ImportAnalysisResponse = {
  date_formats: [
    {
      detected_format: "DD/MM/YYYY",
      field_name: "monitoring_date",
      invalid_rows: [],
      normalized_preview: ["2024-10-12", "2024-12-10"],
    },
  ],
  duplicate_groups: [
    {
      actions: ["Merge now", "Use existing beneficiary", "Keep separate", "Review later"],
      confidence: 95,
      group_id: "duplicate-group-john-thomas",
      reason: "same normalized phone number, similar names, same village or district",
      recommended_action: "Use existing beneficiary if these records describe the same farmer.",
      records: [
        { display_name: "John T.", legacy_id: null, location: "Mbalmayo", phone_number: "+237677000001", row_number: 4 },
        { display_name: "John Thomas", legacy_id: null, location: "MBALMAYO", phone_number: "677 000 001", row_number: 5 },
      ],
    },
    {
      actions: ["Merge now", "Use existing beneficiary", "Keep separate", "Review later"],
      confidence: 92,
      group_id: "duplicate-group-musa-kamga",
      reason: "same normalized phone number, similar names, same village or district",
      recommended_action: "Review before creating a second farmer profile.",
      records: [
        { display_name: "Musa Kamga", legacy_id: null, location: "Mezam", phone_number: "+237 699 123 458", row_number: 1 },
        { display_name: "Moussa Kamga", legacy_id: null, location: "Mezam", phone_number: "+237 699 123 458", row_number: 3 },
      ],
    },
  ],
  entity_matches: [
    {
      actions: ["Link submission", "Create new beneficiary", "Leave unlinked", "Review later"],
      confidence: 91,
      match_type: "entity",
      row_numbers: [4],
      source_value: "Row 4: John T.",
      suggested_value: "John Thomas - existing beneficiary candidate",
    },
  ],
  generated_ids: [
    { entity_type: "Farmer", generated_by_import: true, generated_id: "FRM-2026-000001", legacy_id: null, row_number: 1 },
    { entity_type: "Farmer", generated_by_import: true, generated_id: "FRM-2026-000002", legacy_id: null, row_number: 2 },
    { entity_type: "Farmer", generated_by_import: true, generated_id: "FRM-2026-000003", legacy_id: null, row_number: 3 },
  ],
  gps_warnings: [
    {
      field_name: "gps",
      issue_type: "gps_missing",
      message: "GPS is missing, so this historical record will have lower location precision.",
      row_number: 1,
      severity: "warning",
      suggested_fix: "Import this record and collect GPS in future visits.",
    },
  ],
  indicator_matches: [
    {
      actions: ["Accept match", "Choose different indicator", "Create new indicator", "Store as legacy indicator"],
      confidence: 95,
      match_type: "indicator",
      row_numbers: [1],
      source_value: "improved_seed",
      suggested_value: "% of farmers using improved seeds",
    },
  ],
  legacy_fields: ["improved_seed"],
  location_matches: [
    {
      actions: ["Accept match", "Choose different location", "Create new location", "Skip records"],
      confidence: 98,
      match_type: "location",
      row_numbers: [1, 3],
      source_value: "Mezam",
      suggested_value: "Mezam District",
    },
    {
      actions: ["Accept match", "Choose different location", "Create new location", "Skip records"],
      confidence: 98,
      match_type: "location",
      row_numbers: [4, 5],
      source_value: "Mbalmayo",
      suggested_value: "Mbalmayo District",
    },
  ],
  preview_counts: { create: 300, errors: 2, skip: 20, update: 180, warnings: 15 },
  progress_percent: 100,
  quality_report: {
    data_quality_score: 82,
    duplicate_candidates: 25,
    errors: 2,
    import_batch_id: "analysis-draft",
    location_issues: 10,
    records_created: 300,
    records_skipped: 20,
    records_updated: 180,
    recommendations: [
      "Review duplicate farmers before import.",
      "Confirm unknown villages and save location mappings.",
      "Keep unmatched legacy fields so historical data is preserved.",
    ],
    source_system: "KoboToolbox",
    unlinked_submissions: 4,
    warnings: 15,
  },
  readiness: {
    category: "Needs Review",
    factors: {
      duplicate_rate: 5,
      error_count: 2,
      field_mapping_completeness: 92,
      indicator_mapping_confidence: 95,
      valid_dates: 96,
      valid_gps: 80,
      valid_locations: 88,
      warning_count: 15,
    },
    issues: [
      "25 possible duplicate farmers",
      "10 unknown villages",
      "4 invalid dates",
      "2 unmapped required fields",
    ],
    recommended_action: "Review duplicates and fix unknown villages before import.",
    score: 82,
  },
  suggested_mapping: previewValidation.suggested_mapping,
  validation_issues: previewValidation.issues,
};
