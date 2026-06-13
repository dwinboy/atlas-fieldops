import type { DataFormRead, FormTemplateRead } from "@/lib/api";

export type FormsSection =
  | "dashboard"
  | "all"
  | "analytics"
  | "draft"
  | "published"
  | "archived"
  | "templates"
  | "reference-data"
  | "governance-dashboard";

export type FormDetailTab =
  | "Overview"
  | "Analytics"
  | "Configuration"
  | "Relationships"
  | "Translations"
  | "Offline Readiness"
  | "Comparison";

export type FormListItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  project_id?: string | null;
  project_name: string;
  survey_name: string;
  version: number;
  status: string;
  owner: string;
  created_by: string;
  form_type: string;
  questions: number;
  sections: number;
  active_assignments: number;
  total_submissions: number;
  uploaded_records?: number;
  field_submitted_records?: number;
  approved_submissions?: number;
  pending_review_submissions?: number;
  rejected_returned_submissions?: number;
  linked_beneficiaries?: number;
  last_submission_at?: string | null;
  quality_score: number;
  pending_approval: boolean;
  has_quality_issues: boolean;
  recently_updated: boolean;
  updated_at: string;
  controls_json?: DataFormRead["controls_json"];
};

export type FormsSummary = {
  total_forms: number;
  draft_forms: number;
  published_forms: number;
  archived_forms: number;
  pending_approval_forms: number;
  active_collection_forms: number;
  forms_with_quality_issues: number;
  recently_updated_forms: number;
};

export const formsSections: {
  id: FormsSection;
  label: string;
  route: string;
  description: string;
}[] = [
  { id: "dashboard", label: "Overview", route: "/forms", description: "Organization-wide form status, usage, quality, and governance signals." },
  { id: "all", label: "All Forms", route: "/forms/all", description: "All survey and data collection forms." },
  { id: "analytics", label: "Analytics", route: "/forms/analytics", description: "Form usage, completion, approval, quality, question, source, and mobile-readiness analytics." },
  { id: "draft", label: "Draft", route: "/forms/draft", description: "Forms still being designed or configured." },
  { id: "published", label: "Published", route: "/forms/published", description: "Forms available for field collection." },
  { id: "archived", label: "Archived", route: "/forms/archived", description: "Retired forms kept for audit and version history." },
  { id: "templates", label: "Templates", route: "/forms/templates", description: "Reusable baseline, monitoring, registration, and assessment templates." },
  { id: "reference-data", label: "Reference Data", route: "/forms/reference-data", description: "Controlled lists and bindings used by form questions." },
  { id: "governance-dashboard", label: "Governance", route: "/forms/governance-dashboard", description: "Forms missing approval, mappings, workflow, duplicate controls, version review, or recent use." },
];

export const formDetailTabs: FormDetailTab[] = [
  "Overview",
  "Analytics",
  "Configuration",
  "Relationships",
  "Translations",
  "Offline Readiness",
  "Comparison",
];

export const previewForms: FormListItem[] = [
  {
    id: "preview-farmer-registration",
    name: "Farmer Registration Survey Form",
    slug: "farmer-registration-survey-form",
    description: "Registers farmers, households, GPS, consent, and crop profile data for baseline targeting.",
    project_id: "preview-agriculture",
    project_name: "Agricultural Resilience Program",
    survey_name: "Farmer Registration Survey",
    version: 3,
    status: "published",
    owner: "Operations Manager",
    created_by: "Survey owner",
    form_type: "Registration",
    questions: 42,
    sections: 6,
    active_assignments: 12,
    total_submissions: 1840,
    uploaded_records: 240,
    field_submitted_records: 1600,
    approved_submissions: 1510,
    pending_review_submissions: 84,
    rejected_returned_submissions: 26,
    linked_beneficiaries: 1475,
    last_submission_at: new Date().toISOString(),
    quality_score: 91,
    pending_approval: false,
    has_quality_issues: false,
    recently_updated: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: "preview-baseline-household",
    name: "Baseline Household Assessment",
    slug: "baseline-household-assessment",
    description: "Baseline household, income, food security, GPS, and evidence form.",
    project_id: "preview-agriculture",
    project_name: "Agricultural Resilience Program",
    survey_name: "Baseline Survey",
    version: 1,
    status: "draft",
    owner: "Data Manager",
    created_by: "Operations Manager",
    form_type: "Baseline",
    questions: 58,
    sections: 8,
    active_assignments: 0,
    total_submissions: 0,
    uploaded_records: 0,
    field_submitted_records: 0,
    approved_submissions: 0,
    pending_review_submissions: 0,
    rejected_returned_submissions: 0,
    linked_beneficiaries: 0,
    last_submission_at: null,
    quality_score: 72,
    pending_approval: true,
    has_quality_issues: true,
    recently_updated: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: "preview-health-monitoring",
    name: "Community Health Monitoring Form",
    slug: "community-health-monitoring-form",
    description: "Monthly outreach visit monitoring with service delivery and referral checks.",
    project_id: "preview-health",
    project_name: "Community Health Access Project",
    survey_name: "Monitoring Survey",
    version: 5,
    status: "published",
    owner: "Health Program Lead",
    created_by: "Data Manager",
    form_type: "Monitoring",
    questions: 34,
    sections: 5,
    active_assignments: 8,
    total_submissions: 965,
    uploaded_records: 120,
    field_submitted_records: 845,
    approved_submissions: 720,
    pending_review_submissions: 88,
    rejected_returned_submissions: 157,
    linked_beneficiaries: 0,
    last_submission_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    quality_score: 84,
    pending_approval: false,
    has_quality_issues: true,
    recently_updated: false,
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: "preview-retail-stock-count",
    name: "Retail Stock Count and Shelf Availability",
    slug: "retail-stock-count-and-shelf-availability",
    description: "Store inventory count with SKU, brand, supplier, stock level, expiry, photo evidence, and variance notes.",
    project_id: "project-retail",
    project_name: "Retail Store Stock Visibility",
    survey_name: "Weekly Store Stock Count",
    version: 2,
    status: "published",
    owner: "Retail Operations Lead",
    created_by: "Inventory Manager",
    form_type: "Inventory Count",
    questions: 36,
    sections: 5,
    active_assignments: 11,
    total_submissions: 3580,
    uploaded_records: 820,
    field_submitted_records: 2760,
    approved_submissions: 3020,
    pending_review_submissions: 210,
    rejected_returned_submissions: 350,
    linked_beneficiaries: 1540,
    last_submission_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    quality_score: 89,
    pending_approval: false,
    has_quality_issues: true,
    recently_updated: true,
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "preview-logistics-delivery-proof",
    name: "Cold Chain Delivery Proof",
    slug: "cold-chain-delivery-proof",
    description: "Delivery verification with route, vehicle, temperature, receiving signature, GPS, and exception reporting.",
    project_id: "project-logistics",
    project_name: "Cold Chain Delivery Monitoring",
    survey_name: "Delivery Verification",
    version: 4,
    status: "published",
    owner: "Logistics Manager",
    created_by: "Operations Coordinator",
    form_type: "Delivery Proof",
    questions: 31,
    sections: 6,
    active_assignments: 9,
    total_submissions: 2140,
    uploaded_records: 0,
    field_submitted_records: 2140,
    approved_submissions: 1885,
    pending_review_submissions: 119,
    rejected_returned_submissions: 136,
    linked_beneficiaries: 620,
    last_submission_at: new Date(Date.now() - 1000 * 60 * 27).toISOString(),
    quality_score: 92,
    pending_approval: false,
    has_quality_issues: false,
    recently_updated: false,
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: "preview-supplier-audit",
    name: "Supplier Compliance Audit Checklist",
    slug: "supplier-compliance-audit-checklist",
    description: "Audit checklist with compliance findings, corrective actions, attachments, risk rating, and manager sign-off.",
    project_id: "project-audits",
    project_name: "Supplier Compliance Audit",
    survey_name: "Supplier Audit Round 1",
    version: 1,
    status: "draft",
    owner: "Compliance Manager",
    created_by: "Audit Lead",
    form_type: "Audit Checklist",
    questions: 54,
    sections: 9,
    active_assignments: 0,
    total_submissions: 0,
    uploaded_records: 0,
    field_submitted_records: 0,
    approved_submissions: 0,
    pending_review_submissions: 0,
    rejected_returned_submissions: 0,
    linked_beneficiaries: 0,
    last_submission_at: null,
    quality_score: 78,
    pending_approval: true,
    has_quality_issues: true,
    recently_updated: true,
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: "preview-hr-training-attendance",
    name: "Workforce Training Attendance",
    slug: "workforce-training-attendance",
    description: "Training attendance, employee ID, department, session feedback, facilitator notes, and signature capture.",
    project_id: "project-hr",
    project_name: "Workforce Training and Attendance",
    survey_name: "Training Attendance",
    version: 3,
    status: "published",
    owner: "HR Manager",
    created_by: "Training Coordinator",
    form_type: "Attendance",
    questions: 24,
    sections: 4,
    active_assignments: 7,
    total_submissions: 1280,
    uploaded_records: 300,
    field_submitted_records: 980,
    approved_submissions: 1110,
    pending_review_submissions: 52,
    rejected_returned_submissions: 118,
    linked_beneficiaries: 430,
    last_submission_at: new Date(Date.now() - 1000 * 60 * 36).toISOString(),
    quality_score: 87,
    pending_approval: false,
    has_quality_issues: false,
    recently_updated: true,
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
];

export const previewTemplates: FormTemplateRead[] = [
  {
    id: "tpl-baseline",
    name: "Baseline Survey",
    slug: "baseline-survey",
    category: "Baseline",
    description: "Starter assessment questionnaire with household, demographic, GPS, consent, and metric sections.",
    version: 1,
    tags: ["assessment", "household", "operations"],
    recommended_for: ["NGO", "Government", "Agriculture"],
    estimated_minutes: 30,
    popularity_score: 96,
    is_featured: true,
    summary: { field_count: 48, repeat_group_count: 1, has_gps: true, has_media: true, offline_compatible: true },
  },
  {
    id: "tpl-monitoring",
    name: "Routine Operations Check",
    slug: "routine-operations-check",
    category: "Operations",
    description: "Recurring operations form with targets, status, GPS evidence, issue logging, and supervisor review.",
    version: 2,
    tags: ["operations", "quality", "field"],
    recommended_for: ["Operations", "Field Teams"],
    estimated_minutes: 18,
    popularity_score: 88,
    is_featured: true,
    summary: { field_count: 32, repeat_group_count: 0, has_gps: true, has_media: true, offline_compatible: true },
  },
  {
    id: "tpl-feedback",
    name: "Beneficiary Feedback",
    slug: "beneficiary-feedback",
    category: "Beneficiary Feedback",
    description: "Simple feedback and complaints form with consent, case routing, and sensitive field controls.",
    version: 1,
    tags: ["feedback", "complaints", "safeguarding"],
    recommended_for: ["NGO", "Humanitarian"],
    estimated_minutes: 12,
    popularity_score: 76,
    is_featured: false,
    summary: { field_count: 24, repeat_group_count: 0, has_gps: false, has_media: false, offline_compatible: true },
  },
  {
    id: "tpl-retail-stock",
    name: "Retail Stock Count",
    slug: "retail-stock-count",
    category: "Inventory",
    description: "SKU, brand, supplier, shelf availability, stock variance, expiry, photo evidence, and manager review.",
    version: 1,
    tags: ["retail", "inventory", "stock", "store"],
    recommended_for: ["Retail", "Inventory", "Operations"],
    estimated_minutes: 16,
    popularity_score: 91,
    is_featured: true,
    summary: { field_count: 36, repeat_group_count: 1, has_gps: true, has_media: true, offline_compatible: true },
  },
  {
    id: "tpl-delivery-proof",
    name: "Delivery Proof and Route Check",
    slug: "delivery-proof-route-check",
    category: "Logistics",
    description: "Route, vehicle, shipment condition, delivery time, receiver signature, GPS, and exception handling.",
    version: 1,
    tags: ["logistics", "delivery", "route", "signature"],
    recommended_for: ["Logistics", "Supply Chain", "Operations"],
    estimated_minutes: 14,
    popularity_score: 87,
    is_featured: false,
    summary: { field_count: 31, repeat_group_count: 0, has_gps: true, has_media: true, offline_compatible: true },
  },
  {
    id: "tpl-compliance-audit",
    name: "Compliance Audit Checklist",
    slug: "compliance-audit-checklist",
    category: "Audit",
    description: "Findings, evidence files, risk rating, corrective actions, responsible owner, due date, and approval workflow.",
    version: 1,
    tags: ["audit", "compliance", "inspection", "risk"],
    recommended_for: ["Audits", "Inspections", "Manufacturing"],
    estimated_minutes: 28,
    popularity_score: 84,
    is_featured: false,
    summary: { field_count: 54, repeat_group_count: 1, has_gps: true, has_media: true, offline_compatible: true },
  },
];

export function normalizeBackendForm(form: DataFormRead, index = 0): FormListItem {
  const controls = form.controls_json && typeof form.controls_json === "object" ? form.controls_json : {};
  const referenceBindings = Array.isArray((controls as { reference_bindings?: unknown }).reference_bindings)
    ? ((controls as { reference_bindings: unknown[] }).reference_bindings.length)
    : 0;
  const workflowStages = Array.isArray((controls as { workflow_stages?: unknown }).workflow_stages)
    ? ((controls as { workflow_stages: unknown[] }).workflow_stages.length)
    : 0;
  const qualityRules = Array.isArray((controls as { data_quality_rules?: unknown }).data_quality_rules)
    ? ((controls as { data_quality_rules: unknown[] }).data_quality_rules.length)
    : 0;
  const questionEstimate = Math.max(referenceBindings + workflowStages + qualityRules, 3);
  const activeAssignments = form.status === "published" && form.is_active ? Math.max(1, workflowStages || 1) : 0;
  return {
    id: form.id,
    name: form.name,
    slug: form.slug,
    description: form.description,
    project_id: form.project_id,
    project_name: form.project_id ? `Project ${form.project_id.slice(0, 8)}` : "Project not assigned",
    survey_name: form.survey_id ? `Survey ${form.survey_id.slice(0, 8)}` : "Survey not assigned",
    version: form.current_version,
    status: form.status,
    owner: "Form owner",
    created_by: "Operations Manager",
    form_type: form.status === "published" ? "Published Collection" : "Draft Collection",
    questions: questionEstimate,
    sections: Math.max(1, Math.ceil(questionEstimate / 8)),
    active_assignments: activeAssignments,
    total_submissions: 0,
    uploaded_records: 0,
    field_submitted_records: 0,
    approved_submissions: 0,
    pending_review_submissions: 0,
    rejected_returned_submissions: 0,
    linked_beneficiaries: 0,
    last_submission_at: null,
    quality_score: form.status === "published" ? 86 : 68,
    pending_approval: form.status === "draft",
    has_quality_issues: qualityRules > 0 && form.status !== "archived",
    recently_updated: index < 3,
    updated_at: new Date().toISOString(),
    controls_json: form.controls_json,
  };
}
