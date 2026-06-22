import type { SubmissionRead } from "@/lib/api";

export type SubmissionSection =
  | "dashboard"
  | "all"
  | "data"
  | "pending-review"
  | "approved"
  | "rejected"
  | "returned"
  | "archived";

export type SubmissionDetailTab =
  | "Overview"
  | "Responses"
  | "Workflow"
  | "Quality"
  | "Attachments"
  | "Location"
  | "History"
  | "Audit Trail";

export type SubmissionQualitySeverity = "Low" | "Medium" | "High" | "Critical";

export type SubmissionWorkflowStage =
  | "Draft"
  | "Import Staged"
  | "Submitted"
  | "Pending Review"
  | "Returned for Correction"
  | "Resubmitted"
  | "Approved"
  | "Rejected"
  | "Archived";

export type SubmissionRecord = SubmissionRead & {
  approval_rate_hint?: number;
  archived_at?: string | null;
  attachments: {
    id: string;
    file_name: string;
    file_type: "Image" | "Audio" | "Video" | "Document" | "Signature";
    size_label: string;
    uploaded_at: string;
  }[];
  audit_events: {
    action: string;
    actor: string;
    created_at: string;
    new_value?: string;
    old_value?: string;
    reason?: string;
  }[];
  duplicate_risk: "none" | "possible" | "probable";
  form_name: string;
  form_version: number;
  gps_status: "valid" | "warning" | "missing";
  history: {
    action: string;
    actor: string;
    comment?: string;
    created_at: string;
  }[];
  location_name: string;
  project_name: string;
  quality_flags: {
    id: string;
    check: string;
    message: string;
    severity: SubmissionQualitySeverity;
    status: "open" | "resolved" | "overridden";
  }[];
  quality_score: number;
  review_stage: SubmissionWorkflowStage;
  reviewer: string;
  sla_due_at: string;
  supervisor: string;
  workflow: {
    action_date?: string;
    comments?: string;
    reviewer: string;
    sla_status: "On Time" | "Warning" | "Overdue";
    stage: SubmissionWorkflowStage;
  }[];
};

export type SubmissionsSummary = {
  approval_rate: number;
  approved: number;
  archived: number;
  average_review_hours: number;
  pending_review: number;
  quality_alerts: number;
  rejected: number;
  returned: number;
  todays_submissions: number;
  total_submissions: number;
};

export const submissionSections: {
  description: string;
  id: SubmissionSection;
  label: string;
  route: string;
}[] = [
  { id: "dashboard", label: "Overview", route: "/submissions", description: "Operational submission status, review workload, quality, SLA, and bottlenecks." },
  { id: "all", label: "All Submissions", route: "/submissions/all", description: "Search, filter, review, export, and manage collected records." },
  { id: "data", label: "Data Explorer", route: "/submissions/data", description: "Spreadsheet view of collected field values for a single form, with CSV export." },
  { id: "pending-review", label: "Pending Review", route: "/submissions/pending-review", description: "Reviewer queue for submitted records waiting for a decision." },
  { id: "approved", label: "Approved", route: "/submissions/approved", description: "Approved and report-ready records." },
  { id: "rejected", label: "Rejected", route: "/submissions/rejected", description: "Rejected records and rejection reasons." },
  { id: "returned", label: "Returned", route: "/submissions/returned", description: "Records sent back for correction and resubmission." },
  { id: "archived", label: "Archived", route: "/submissions/archived", description: "Read-only historical records retained for audit and compliance." },
];

export function submissionSectionFromPath(pathname: string): SubmissionSection | null {
  const path = pathname.replace(/\/+$/, "") || "/submissions";
  const match = submissionSections.find((section) => section.route === path);
  return match?.id ?? null;
}

export const submissionDetailTabs: SubmissionDetailTab[] = [
  "Overview",
  "Responses",
  "Workflow",
  "Quality",
  "Attachments",
  "Location",
  "History",
  "Audit Trail",
];

const now = Date.now();

export const previewSubmissions: SubmissionRecord[] = [
  {
    id: "sub-001",
    accuracy: 8.4,
    attachments: [
      { id: "att-1", file_name: "farm_boundary.jpg", file_type: "Image", size_label: "1.8 MB", uploaded_at: new Date(now - 64 * 60 * 1000).toISOString() },
      { id: "att-2", file_name: "respondent_signature.png", file_type: "Signature", size_label: "220 KB", uploaded_at: new Date(now - 63 * 60 * 1000).toISOString() },
    ],
    audit_events: [
      { action: "Submission Submitted", actor: "Amina Diallo", created_at: new Date(now - 70 * 60 * 1000).toISOString(), new_value: "submitted" },
      { action: "Review Assigned", actor: "System", created_at: new Date(now - 62 * 60 * 1000).toISOString(), new_value: "Supervisor review" },
    ],
    captured_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    client_submission_id: "MOB-2026-0001",
    device_id: "preview-android-amina",
    duplicate_risk: "none",
    entity_id: "entity-farmer-musa",
    entity_type: "Farmer",
    field_officer_id: "Amina Diallo",
    form_id: "farmer-registration",
    form_name: "Farmer Registration Survey Form",
    form_version: 3,
    gps_status: "valid",
    history: [
      { action: "Created", actor: "Amina Diallo", created_at: new Date(now - 3 * 60 * 60 * 1000).toISOString() },
      { action: "Submitted", actor: "Amina Diallo", comment: "Synced after field visit.", created_at: new Date(now - 70 * 60 * 1000).toISOString() },
    ],
    latitude: 5.9631,
    location_name: "Mezam District",
    longitude: 10.1591,
    offline_created: true,
    payload_json: {
      consent_confirmed: true,
      farmer_name: "Musa Kamga",
      crop: "Maize",
      acreage: 2.4,
      household_members: 6,
      phone_number: "+237 600 100 001",
    },
    project_id: "preview-agriculture",
    project_name: "Agricultural Resilience Program",
    quality_flags: [],
    quality_score: 94,
    review_stage: "Pending Review",
    reviewer: "Grace M.",
    server_sequence: 2,
    sla_due_at: new Date(now + 16 * 60 * 60 * 1000).toISOString(),
    status: "under_review",
    submitted_at: new Date(now - 70 * 60 * 1000).toISOString(),
    supervisor: "Grace M.",
    survey_id: "preview-registration",
    sync_received_at: new Date(now - 65 * 60 * 1000).toISOString(),
    workflow: [
      { action_date: new Date(now - 70 * 60 * 1000).toISOString(), reviewer: "System", sla_status: "On Time", stage: "Submitted" },
      { reviewer: "Grace M.", sla_status: "On Time", stage: "Pending Review" },
    ],
  },
  {
    id: "sub-002",
    accuracy: 14.2,
    attachments: [
      { id: "att-3", file_name: "clinic_front.jpg", file_type: "Image", size_label: "1.1 MB", uploaded_at: new Date(now - 115 * 60 * 1000).toISOString() },
    ],
    audit_events: [
      { action: "Returned", actor: "Samuel K.", created_at: new Date(now - 70 * 60 * 1000).toISOString(), old_value: "pending_review", new_value: "correction_requested", reason: "Photo evidence missing boundary marker." },
    ],
    captured_at: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    client_submission_id: "MOB-2026-0002",
    device_id: "preview-android-joseph",
    duplicate_risk: "possible",
    entity_id: "entity-facility-bonaberi",
    entity_type: "Facility",
    field_officer_id: "Joseph N.",
    form_id: "facility-assessment",
    form_name: "Community Health Monitoring Form",
    form_version: 5,
    gps_status: "warning",
    history: [
      { action: "Submitted", actor: "Joseph N.", created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
      { action: "Returned for Correction", actor: "Samuel K.", comment: "Add the missing facility boundary photo.", created_at: new Date(now - 70 * 60 * 1000).toISOString() },
    ],
    latitude: 4.0511,
    location_name: "Littoral Region",
    longitude: 9.7679,
    offline_created: false,
    payload_json: {
      facility_name: "Bonaberi Health Post",
      service_available: true,
      referral_count: 11,
      notes: "Photo missing boundary marker",
    },
    project_id: "preview-health",
    project_name: "Community Health Access Project",
    quality_flags: [
      { id: "flag-photo", check: "Missing media evidence", message: "Boundary marker photo is missing.", severity: "High", status: "open" },
      { id: "flag-gps", check: "GPS accuracy", message: "Accuracy is above preferred 10m threshold.", severity: "Medium", status: "open" },
    ],
    quality_score: 68,
    review_stage: "Returned for Correction",
    reviewer: "Samuel K.",
    server_sequence: 1,
    sla_due_at: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
    status: "correction_requested",
    submitted_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    supervisor: "Samuel K.",
    survey_id: "preview-monitoring",
    sync_received_at: new Date(now - 115 * 60 * 1000).toISOString(),
    workflow: [
      { action_date: new Date(now - 2 * 60 * 60 * 1000).toISOString(), reviewer: "System", sla_status: "On Time", stage: "Submitted" },
      { action_date: new Date(now - 70 * 60 * 1000).toISOString(), comments: "Evidence missing.", reviewer: "Samuel K.", sla_status: "Overdue", stage: "Returned for Correction" },
    ],
  },
  {
    id: "sub-003",
    accuracy: 6.1,
    archived_at: null,
    attachments: [],
    audit_events: [
      { action: "Submission Approved", actor: "Data Manager", created_at: new Date(now - 25 * 60 * 1000).toISOString(), new_value: "approved", reason: "Clean record with consent and valid GPS." },
    ],
    captured_at: new Date(now - 7 * 60 * 60 * 1000).toISOString(),
    client_submission_id: "IMP-2026-0003",
    device_id: "legacy-import",
    duplicate_risk: "none",
    entity_id: "entity-esther",
    entity_type: "Beneficiary",
    field_officer_id: "Legacy import",
    form_id: "baseline-household",
    form_name: "Baseline Household Assessment",
    form_version: 1,
    gps_status: "valid",
    history: [
      { action: "Submitted", actor: "Amina Diallo", created_at: new Date(now - 6 * 60 * 60 * 1000).toISOString() },
      { action: "Approved", actor: "Data Manager", comment: "Ready for indicator aggregation.", created_at: new Date(now - 25 * 60 * 1000).toISOString() },
    ],
    latitude: 5.4744,
    location_name: "Bamenda",
    longitude: 10.4171,
    import_batch_id: "preview-import-batch-001",
    imported_at: new Date(now - 5.8 * 60 * 60 * 1000).toISOString(),
    imported_by_user_id: "Data Manager",
    is_imported: true,
    offline_created: false,
    payload_json: {
      consent_confirmed: true,
      respondent: "Esther F.",
      household_income: 185000,
      food_consumption_score: 43,
    },
    project_id: "preview-agriculture",
    project_name: "Agricultural Resilience Program",
    quality_flags: [],
    quality_score: 98,
    review_stage: "Approved",
    reviewer: "Data Manager",
    server_sequence: 4,
    sla_due_at: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    status: "approved",
    approved_at: new Date(now - 25 * 60 * 1000).toISOString(),
    approved_by_name: "Data Manager",
    submitted_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
    supervisor: "Grace M.",
    survey_id: "preview-baseline",
    source_record_id: "kobo-baseline-0003",
    source_system: "KoboToolbox",
    sync_received_at: new Date(now - 5.8 * 60 * 60 * 1000).toISOString(),
    workflow: [
      { action_date: new Date(now - 6 * 60 * 60 * 1000).toISOString(), reviewer: "System", sla_status: "On Time", stage: "Submitted" },
      { action_date: new Date(now - 25 * 60 * 1000).toISOString(), comments: "Ready for indicator aggregation.", reviewer: "Data Manager", sla_status: "On Time", stage: "Approved" },
    ],
  },
];

const generatedSubmissionSeeds: {
  actor: string;
  device: string;
  entity: string;
  entityType: string;
  form: string;
  formId: string;
  lat: number;
  location: string;
  lon: number;
  project: string;
  projectId: string;
  quality: number;
  status: SubmissionRead["status"];
  source: "mobile" | "import" | "web";
}[] = [
  { actor: "Miriam Otieno", device: "android-store-2250", entity: "STORE-2026-000009", entityType: "Store", form: "Retail Stock Count and Shelf Availability", formId: "preview-retail-stock-count", lat: -1.2864, location: "Nairobi Central", lon: 36.8172, project: "Retail Store Stock Visibility", projectId: "project-retail", quality: 91, status: "under_review", source: "mobile" },
  { actor: "Miriam Otieno", device: "android-store-2250", entity: "SKU-2026-000118", entityType: "Product", form: "Retail Stock Count and Shelf Availability", formId: "preview-retail-stock-count", lat: -1.2921, location: "Westlands Store", lon: 36.8219, project: "Retail Store Stock Visibility", projectId: "project-retail", quality: 72, status: "correction_requested", source: "mobile" },
  { actor: "Store Ops Import", device: "legacy-import", entity: "STORE-2026-000014", entityType: "Store", form: "Retail Stock Count and Shelf Availability", formId: "preview-retail-stock-count", lat: -1.3032, location: "Industrial Area", lon: 36.8517, project: "Retail Store Stock Visibility", projectId: "project-retail", quality: 96, status: "approved", source: "import" },
  { actor: "Ibrahima Ndiaye", device: "android-route-3310", entity: "SHIP-2026-000221", entityType: "Shipment", form: "Cold Chain Delivery Proof", formId: "preview-logistics-delivery-proof", lat: 14.7167, location: "Dakar Route 4", lon: -17.4677, project: "Cold Chain Delivery Monitoring", projectId: "project-logistics", quality: 93, status: "approved", source: "mobile" },
  { actor: "Ibrahima Ndiaye", device: "android-route-3310", entity: "VEH-2026-000018", entityType: "Vehicle", form: "Cold Chain Delivery Proof", formId: "preview-logistics-delivery-proof", lat: 14.7645, location: "Rufisque", lon: -17.3908, project: "Cold Chain Delivery Monitoring", projectId: "project-logistics", quality: 81, status: "under_review", source: "mobile" },
  { actor: "Audit Lead", device: "web-entry", entity: "SUP-2026-000031", entityType: "Supplier", form: "Supplier Compliance Audit Checklist", formId: "preview-supplier-audit", lat: -1.9441, location: "Kigali", lon: 30.0619, project: "Supplier Compliance Audit", projectId: "project-audits", quality: 77, status: "submitted", source: "web" },
  { actor: "Audit Lead", device: "web-entry", entity: "SUP-2026-000044", entityType: "Supplier", form: "Supplier Compliance Audit Checklist", formId: "preview-supplier-audit", lat: -1.9588, location: "Kigali Industrial Zone", lon: 30.1127, project: "Supplier Compliance Audit", projectId: "project-audits", quality: 58, status: "rejected", source: "web" },
  { actor: "Training Coordinator", device: "legacy-import", entity: "EMP-2026-000312", entityType: "Employee", form: "Workforce Training Attendance", formId: "preview-hr-training-attendance", lat: 0.3476, location: "Kampala Central", lon: 32.5825, project: "Workforce Training and Attendance", projectId: "project-hr", quality: 95, status: "approved", source: "import" },
  { actor: "Nora Talla", device: "android-field-9901", entity: "SCH-2026-000005", entityType: "School", form: "School Facility Assessment", formId: "preview-school-facility", lat: 4.0511, location: "Douala", lon: 9.7679, project: "Education Attendance Assessment", projectId: "project-edu", quality: 69, status: "correction_requested", source: "mobile" },
];

previewSubmissions.push(
  ...generatedSubmissionSeeds.map((seed, index): SubmissionRecord => {
    const submittedAt = new Date(now - (index + 9) * 45 * 60 * 1000).toISOString();
    const reviewedAt = new Date(now - (index + 2) * 20 * 60 * 1000).toISOString();
    const approved = seed.status === "approved";
    const returned = seed.status === "correction_requested";
    const rejected = seed.status === "rejected";
    const displayIdPrefix = seed.source === "import" ? "IMP" : seed.source === "web" ? "WEB" : "MOB";
    const statusLabel =
      approved ? "Approved" : returned ? "Returned for Correction" : rejected ? "Rejected" : "Pending Review";
    return {
      id: `sub-preview-${index + 10}`,
      accuracy: seed.source === "mobile" ? 9 + index : 0,
      attachments: seed.source === "mobile" ? [
        { id: `att-preview-${index}`, file_name: `${seed.formId}-evidence.jpg`, file_type: "Image", size_label: "1.4 MB", uploaded_at: submittedAt },
      ] : [],
      audit_events: [
        { action: "Submission Submitted", actor: seed.actor, created_at: submittedAt, new_value: seed.status },
        ...(approved || returned || rejected
          ? [{ action: statusLabel, actor: "Supervisor", created_at: reviewedAt, new_value: seed.status, old_value: "under_review", reason: approved ? "Approved for reporting." : "Needs follow-up before reporting." }]
          : []),
      ],
      captured_at: submittedAt,
      client_submission_id: `${displayIdPrefix}-2026-${String(index + 10).padStart(4, "0")}`,
      device_id: seed.device,
      duplicate_risk: seed.quality < 75 ? "possible" : "none",
      entity_id: seed.entity.toLowerCase(),
      entity_type: seed.entityType,
      field_officer_id: seed.actor,
      form_id: seed.formId,
      form_name: seed.form,
      form_version: index % 3 === 0 ? 2 : 1,
      gps_status: seed.source === "mobile" ? "valid" : "warning",
      history: [
        { action: "Submitted", actor: seed.actor, created_at: submittedAt },
        ...(approved || returned || rejected ? [{ action: statusLabel, actor: "Supervisor", comment: approved ? "Approved for reporting." : "Needs follow-up before reporting.", created_at: reviewedAt }] : []),
      ],
      import_batch_id: seed.source === "import" ? "preview-import-batch-002" : undefined,
      imported_at: seed.source === "import" ? submittedAt : undefined,
      imported_by_user_id: seed.source === "import" ? seed.actor : undefined,
      is_imported: seed.source === "import",
      latitude: seed.lat,
      location_name: seed.location,
      longitude: seed.lon,
      offline_created: seed.source === "mobile",
      payload_json: {
        entity_code: seed.entity,
        location: seed.location,
        operational_status: seed.quality > 80 ? "On track" : "Needs review",
        score: seed.quality,
        source_channel: seed.source,
      },
      project_id: seed.projectId,
      project_name: seed.project,
      quality_flags: seed.quality < 75 ? [
        { id: `flag-preview-${index}`, check: "Reviewer attention", message: "This record has a validation, GPS, duplicate, or evidence concern.", severity: seed.quality < 65 ? "High" : "Medium", status: "open" },
      ] : [],
      quality_score: seed.quality,
      review_stage: approved ? "Approved" : returned ? "Returned for Correction" : rejected ? "Rejected" : "Pending Review",
      reviewer: "Supervisor",
      server_sequence: 1,
      sla_due_at: new Date(now + (index + 1) * 4 * 60 * 60 * 1000).toISOString(),
      status: seed.status,
      approved_at: approved ? reviewedAt : undefined,
      approved_by_name: approved ? "Supervisor" : undefined,
      submitted_at: submittedAt,
      supervisor: "Supervisor",
      survey_id: `${seed.projectId}-survey`,
      sync_received_at: submittedAt,
      workflow: [
        { action_date: submittedAt, reviewer: "System", sla_status: index % 4 === 0 ? "Warning" : "On Time", stage: "Submitted" },
        { action_date: approved || returned || rejected ? reviewedAt : undefined, reviewer: "Supervisor", sla_status: index % 4 === 0 ? "Warning" : "On Time", stage: approved ? "Approved" : returned ? "Returned for Correction" : rejected ? "Rejected" : "Pending Review" },
      ],
    };
  }),
);
