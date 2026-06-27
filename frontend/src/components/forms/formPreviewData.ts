import { type FormImportRun, type FormQualityFlag } from "@/components/forms/formBuilderTypes";
import { type ProgramRead, type SubmissionRead, type SurveyRead } from "@/lib/api";
import { type DynamicForm } from "@/lib/forms";
import { slugify } from "@/lib/utils";

/** Sample projects/surveys and preview submission/import/quality data for the builder preview mode. */

export const previewFormProjects: ProgramRead[] = [
  {
    id: "preview-agriculture",
    name: "Agricultural Resilience Program",
    slug: "agricultural-resilience",
    region: "North West",
    is_active: true,
  },
  {
    id: "preview-health",
    name: "Community Health Outreach",
    slug: "community-health",
    region: "Central",
    is_active: true,
  },
];

export const previewFormSurveys: SurveyRead[] = [
  {
    id: "preview-baseline",
    organization_id: "preview-org",
    project_id: "preview-agriculture",
    created_by_user_id: "preview-user",
    owner_user_id: "preview-user",
    manager_user_id: null,
    title: "Baseline Survey",
    code: "AGR-BASE-2026",
    description: "Baseline household and farm data collection.",
    survey_type: "baseline",
    status: "active",
    start_date: "2026-06-01",
    end_date: "2026-06-30",
    geographic_scope: "North West districts",
    target_population: "Smallholder farmers",
    indicator_ids_json: [],
    custom_type_label: null,
    is_active: true,
  },
  {
    id: "preview-registration",
    organization_id: "preview-org",
    project_id: "preview-agriculture",
    created_by_user_id: "preview-user",
    owner_user_id: "preview-user",
    manager_user_id: null,
    title: "Farmer Registration Survey",
    code: "AGR-REG-2026",
    description: "Registration and eligibility data collection.",
    survey_type: "farmer_survey",
    status: "draft",
    start_date: null,
    end_date: null,
    geographic_scope: "Program communities",
    target_population: "Farmers",
    indicator_ids_json: [],
    custom_type_label: null,
    is_active: true,
  },
];

export function createPreviewSubmissionRows(form: DynamicForm): SubmissionRead[] {
  const now = Date.now();
  const primaryField = form.fields[0];
  const evidenceField = form.fields.find((field) =>
    [
      "gps",
      "geolocation",
      "map",
      "geofence",
      "polygon",
      "photo",
      "image",
      "file",
    ].includes(field.type),
  );
  return [
    {
      id: `${form.id}-review-001`,
      client_submission_id: `${form.id.slice(0, 10)}-0001`,
      project_id: "preview-agriculture",
      survey_id: "preview-baseline",
      form_id: form.id,
      field_officer_id: "officer-001",
      status: "under_review",
      server_sequence: 1,
      captured_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      submitted_at: new Date(now - 75 * 60 * 1000).toISOString(),
      sync_received_at: new Date(now - 70 * 60 * 1000).toISOString(),
      offline_created: true,
      device_id: "preview-android-001",
      latitude: 5.9631,
      longitude: 10.1591,
      accuracy: 8.4,
      payload_json: {
        [primaryField?.variableName ?? primaryField?.id ?? "respondent"]:
          "Sample respondent",
        [evidenceField?.variableName ?? evidenceField?.id ?? "evidence"]:
          evidenceField ? "Captured" : "Not required",
        quality_score: 86,
      },
    },
    {
      id: `${form.id}-review-002`,
      client_submission_id: `${form.id.slice(0, 10)}-0002`,
      project_id: "preview-agriculture",
      survey_id: "preview-baseline",
      form_id: form.id,
      field_officer_id: "officer-002",
      status: "correction_requested",
      server_sequence: 2,
      captured_at: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      submitted_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      sync_received_at: new Date(now - 110 * 60 * 1000).toISOString(),
      offline_created: false,
      device_id: "preview-web-entry-002",
      latitude: 4.0511,
      longitude: 9.7679,
      accuracy: 18.2,
      payload_json: {
        [primaryField?.variableName ?? primaryField?.id ?? "respondent"]:
          "Needs correction",
        issue: "Photo evidence or reference value needs confirmation",
        quality_score: 62,
      },
    },
  ];
}

export function createPreviewImportRuns(form: DynamicForm): FormImportRun[] {
  return [
    {
      id: `${form.id}-import-1`,
      fileName: `${slugify(form.name)}-field-data.xlsx`,
      rows: 120,
      mappedColumns: Math.max(form.fields.length - 1, 1),
      validRows: 113,
      issueCount: 7,
      status: "validated",
      createdAt: new Date().toISOString(),
    },
  ];
}

export function createPreviewQualityFlags(
  form: DynamicForm,
  submissions: SubmissionRead[],
): FormQualityFlag[] {
  const mediaCount = form.fields.filter((field) =>
    ["photo", "image", "audio", "video", "file", "signature"].includes(
      field.type,
    ),
  ).length;
  const gpsCount = form.fields.filter((field) =>
    ["gps", "geolocation", "map", "geofence", "polygon"].includes(field.type),
  ).length;
  const reviewCount = submissions.filter((submission) =>
    ["submitted", "under_review", "correction_requested"].includes(
      submission.status,
    ),
  ).length;
  return [
    {
      id: `${form.id}-quality-gps`,
      label: "GPS accuracy outside target",
      severity: gpsCount ? "High" : "Medium",
      affectedRecords: gpsCount ? 4 : 0,
      owner: "Survey supervisor",
      status: gpsCount ? "monitoring" : "resolved",
      recommendation: gpsCount
        ? "Ask enumerators to wait for stronger GPS accuracy before saving records."
        : "Add GPS capture if location evidence is required for this survey.",
    },
    {
      id: `${form.id}-quality-review`,
      label: "Records waiting for review",
      severity: reviewCount > 1 ? "High" : "Medium",
      affectedRecords: reviewCount,
      owner: "Data manager",
      status: reviewCount ? "open" : "resolved",
      recommendation:
        "Use the submission review workspace to approve clean records or return records for correction.",
    },
    {
      id: `${form.id}-quality-media`,
      label: "Evidence attachment check",
      severity: mediaCount ? "Medium" : "Low",
      affectedRecords: mediaCount ? 2 : 0,
      owner: "Data quality officer",
      status: mediaCount ? "monitoring" : "resolved",
      recommendation: mediaCount
        ? "Check that photos, signatures, or files are readable before approval."
        : "No media evidence is required on this form.",
    },
  ];
}
