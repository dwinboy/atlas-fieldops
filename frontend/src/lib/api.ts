export type HealthResponse = {
  status: "ok";
};

export type LoginRequest = {
  email: string;
  password: string;
  organization_slug: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
};

export type CurrentPrincipal = {
  user_id: string;
  organization_id: string;
  roles: string[];
  permissions?: string[];
  scope_type?: string;
  menu_views?: string[];
  workflow_actions?: string[];
};

export type OrganizationCreate = {
  name: string;
  slug: string;
};

export type OrganizationRead = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export type UserCreate = {
  email: string;
  password: string;
  full_name: string;
  role_name: string;
  scope_type?: string | null;
  geography_ids?: string[];
  project_ids?: string[];
};

export type UserRead = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role_name?: string | null;
  scope_type?: string | null;
  geography_id?: string | null;
  project_id?: string | null;
  organization_unit_id?: string | null;
};

export type UserUpdate = {
  full_name?: string;
  role_name?: string;
  scope_type?: string;
  geography_id?: string | null;
  project_id?: string | null;
  organization_unit_id?: string | null;
  is_active?: boolean;
};

export type PasswordResetRead = {
  user_id: string;
  temporary_password: string;
};

export type RoleRead = {
  id: string;
  organization_id: string;
  name: string;
  label?: string;
  description?: string;
  scope_type?: string;
  is_system?: boolean;
  permissions: string[];
};

export type AccessCatalog = {
  roles: {
    name: string;
    label: string;
    description: string;
    scope_type: string;
    permissions: string[];
    workflow_actions: string[];
    menu_views: string[];
  }[];
  permissions: { key: string; label: string; group: string }[];
  scope_types: string[];
  workflow_actions: string[];
};

export type OrganizationUnitRead = {
  id: string;
  organization_id: string;
  parent_unit_id: string | null;
  name: string;
  code: string;
  unit_type: string;
  region: string | null;
};

export type FieldOfficerInvite = {
  email: string;
  full_name: string;
  phone_number?: string;
  employee_code?: string;
  home_region?: string;
  temporary_password: string;
};

export type FieldOfficerRead = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  employee_code: string | null;
  home_region: string | null;
  last_sync_at: string | null;
  last_seen_at: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  device_id: string | null;
  is_active: boolean;
};

export type SubmissionRead = {
  id: string;
  client_submission_id: string;
  form_id: string;
  field_officer_id: string;
  status: string;
  server_sequence: number;
  captured_at: string;
  submitted_at: string;
  sync_received_at: string;
  offline_created: boolean;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  payload_json: Record<string, unknown>;
};

export type OperationsSummary = {
  beneficiaries: number;
  active_programs: number;
  indicators: number;
  open_cases: number;
  quality_flags: number;
  sync_health_percent: number;
  offline_ready: boolean;
};

export type OperationalEventRead = {
  id: string;
  project_id: string | null;
  beneficiary_id: string | null;
  submission_id: string | null;
  actor_user_id: string | null;
  event_type: string;
  source_module: string;
  status: string;
  priority: string;
  summary: string;
  effects_json: Record<string, unknown>[];
  created_at: string;
};

export type WorkflowQueueItemRead = {
  id: string;
  project_id: string | null;
  beneficiary_id: string | null;
  submission_id: string | null;
  queue_type: string;
  trigger_event_type: string;
  status: string;
  priority: string;
  title: string;
  next_action: string;
  due_at: string | null;
  created_at: string;
};

export type OperationalEcosystemRead = {
  nodes: { id: string; label: string; node_type: string; status: string; count: number }[];
  edges: { source: string; target: string; label: string; health: string }[];
  recent_events: OperationalEventRead[];
  workflow_queue: WorkflowQueueItemRead[];
  attention_items: string[];
};

export type BeneficiaryRead = {
  id: string;
  project_id: string | null;
  beneficiary_uid: string;
  beneficiary_type: string;
  display_name: string;
  sex: string | null;
  birth_year: number | null;
  phone_number: string | null;
  region: string | null;
  district: string | null;
  community: string | null;
  enrollment_status: string;
  vulnerability_score: number;
  duplicate_risk_score: number;
  latitude: number | null;
  longitude: number | null;
  last_visit_at: string | null;
};

export type ProgramRead = {
  id: string;
  name: string;
  slug: string;
  region: string | null;
  is_active: boolean;
};

export type IndicatorRead = {
  id: string;
  project_id: string | null;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  reporting_frequency: string;
  baseline_value: number;
  target_value: number;
  current_value: number;
  sdg_code: string | null;
  formula: string | null;
  is_active: boolean;
  progress_percent: number;
};

export type CaseRead = {
  id: string;
  project_id: string | null;
  beneficiary_id: string | null;
  case_number: string;
  case_type: string;
  title: string;
  priority: string;
  status: string;
  assigned_to_user_id: string | null;
  due_at: string | null;
  closed_at: string | null;
  notes: string | null;
};

export type DonorReportRead = {
  id: string;
  project_id: string | null;
  name: string;
  donor: string | null;
  report_type: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  summary: string | null;
  export_formats: string[];
};

export type ImportPreviewRequest = {
  dataset_type: string;
  columns: string[];
  sample_rows: Record<string, unknown>[];
};

export type ImportPreviewResponse = {
  suggested_mapping: { source_column: string; target_field: string; required: boolean; transform?: string | null }[];
  issues: { row_number: number; field_name: string | null; issue_type: string; severity: string; message: string; suggested_fix: string | null }[];
  valid_rows: number;
  error_rows: number;
  duplicate_rows: number;
};

export type ImportJobCreate = {
  dataset_type: string;
  source_name: string;
  source_format: string;
  total_rows: number;
  mapping?: { source_column: string; target_field: string; required?: boolean; transform?: string | null }[];
};

export type ImportJobRead = {
  id: string;
  dataset_type: string;
  source_name: string;
  source_format: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  duplicate_rows: number;
  rollback_available: boolean;
};

export type ImportRowRead = {
  id: string;
  import_job_id: string;
  row_number: number;
  row_data: Record<string, unknown>;
  edited_data: Record<string, unknown>;
  validation_status: string;
  issue_count: number;
  version: number;
};

export type ImportUploadResponse = {
  job: ImportJobRead;
  columns: string[];
  preview_rows: Record<string, unknown>[];
  issues: ImportPreviewResponse["issues"];
};

export type ExportJobCreate = {
  dataset_type: string;
  export_format: string;
  filtered_view?: Record<string, unknown>;
  scheduled?: boolean;
};

export type ExportJobRead = {
  id: string;
  dataset_type: string;
  export_format: string;
  status: string;
  download_url: string | null;
  scheduled: boolean;
};

export type DataFormCreate = {
  name: string;
  slug: string;
  description?: string | null;
  schema: Record<string, unknown>;
  publish?: boolean;
};

export type DataFormRead = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  current_version: number;
  is_active: boolean;
};

export type TemplateFieldSummary = {
  field_count: number;
  repeat_group_count: number;
  has_gps: boolean;
  has_media: boolean;
  offline_compatible: boolean;
};

export type FormTemplateRead = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  version: number;
  tags: string[];
  recommended_for: string[];
  estimated_minutes: number;
  popularity_score: number;
  is_featured: boolean;
  summary: TemplateFieldSummary;
};

export type FormTemplateDetail = FormTemplateRead & {
  template_schema: Record<string, unknown>;
  logic_overview: string[];
  mobile_preview_fields: string[];
};

export type TemplateDuplicateRequest = {
  name?: string;
  slug?: string;
  publish?: boolean;
};

const apiBaseUrl =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string; bodyJson?: unknown } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("accept", "application/json");
  if (options.bodyJson !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (options.token) {
    headers.set("authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    body: options.bodyJson === undefined ? options.body : JSON.stringify(options.bodyJson)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || response.statusText, response.status);
  }

  return response.json() as Promise<T>;
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health", { cache: "no-store" });
}

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login", { method: "POST", bodyJson: payload });
}

export async function getCurrentPrincipal(token: string): Promise<CurrentPrincipal> {
  return request<CurrentPrincipal>("/auth/me", { token });
}

export async function createOrganization(payload: OrganizationCreate): Promise<OrganizationRead> {
  return request<OrganizationRead>("/organizations", { method: "POST", bodyJson: payload });
}

export async function listUsers(token: string): Promise<UserRead[]> {
  return request<UserRead[]>("/users", { token });
}

export async function createUser(token: string, payload: UserCreate): Promise<UserRead> {
  return request<UserRead>("/users", { method: "POST", token, bodyJson: payload });
}

export async function updateUser(token: string, userId: string, payload: UserUpdate): Promise<UserRead> {
  return request<UserRead>(`/users/${userId}`, { method: "PATCH", token, bodyJson: payload });
}

export async function resetUserPassword(token: string, userId: string): Promise<PasswordResetRead> {
  return request<PasswordResetRead>(`/users/${userId}/reset-password`, { method: "POST", token });
}

export async function listRoles(token: string): Promise<RoleRead[]> {
  return request<RoleRead[]>("/roles", { token });
}

export async function getAccessCatalog(token: string): Promise<AccessCatalog> {
  return request<AccessCatalog>("/roles/catalog", { token });
}

export async function listOrganizationUnits(token: string): Promise<OrganizationUnitRead[]> {
  return request<OrganizationUnitRead[]>("/roles/organization-units", { token });
}

export async function listFieldOfficers(token: string): Promise<FieldOfficerRead[]> {
  return request<FieldOfficerRead[]>("/field-officers", { token });
}

export async function inviteFieldOfficer(token: string, payload: FieldOfficerInvite): Promise<FieldOfficerRead> {
  return request<FieldOfficerRead>("/field-officers", { method: "POST", token, bodyJson: payload });
}

export async function listSubmissions(token: string, status?: string): Promise<SubmissionRead[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<SubmissionRead[]>(`/submissions${query}`, { token });
}

export async function reviewSubmission(
  token: string,
  submissionId: string,
  payload: { action: "approve" | "reject" | "request_correction" | "start_review"; comment: string }
): Promise<SubmissionRead> {
  return request<SubmissionRead>(`/submissions/${submissionId}/review`, {
    method: "POST",
    token,
    bodyJson: payload
  });
}

export async function getOperationsSummary(token: string): Promise<OperationsSummary> {
  return request<OperationsSummary>("/operations/summary", { token });
}

export async function getOperationalEcosystem(token: string): Promise<OperationalEcosystemRead> {
  return request<OperationalEcosystemRead>("/operations/ecosystem", { token });
}

export async function listBeneficiaries(token: string): Promise<BeneficiaryRead[]> {
  return request<BeneficiaryRead[]>("/operations/beneficiaries", { token });
}

export async function listPrograms(token: string): Promise<ProgramRead[]> {
  return request<ProgramRead[]>("/operations/programs", { token });
}

export async function listIndicators(token: string): Promise<IndicatorRead[]> {
  return request<IndicatorRead[]>("/operations/indicators", { token });
}

export async function listCases(token: string): Promise<CaseRead[]> {
  return request<CaseRead[]>("/operations/cases", { token });
}

export async function listReports(token: string): Promise<DonorReportRead[]> {
  return request<DonorReportRead[]>("/operations/reports", { token });
}

export async function previewImport(token: string, payload: ImportPreviewRequest): Promise<ImportPreviewResponse> {
  return request<ImportPreviewResponse>("/operations/data/imports/preview", { method: "POST", token, bodyJson: payload });
}

export async function createImportJob(token: string, payload: ImportJobCreate): Promise<ImportJobRead> {
  return request<ImportJobRead>("/operations/data/imports", { method: "POST", token, bodyJson: payload });
}

export async function listImportJobs(token: string): Promise<ImportJobRead[]> {
  return request<ImportJobRead[]>("/operations/data/imports", { token });
}

export async function uploadImportFile(token: string, datasetType: string, file: File): Promise<ImportUploadResponse> {
  const body = new FormData();
  body.set("dataset_type", datasetType);
  body.set("file", file);
  const response = await fetch(`${apiBaseUrl}/operations/data/imports/upload`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    body
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || response.statusText, response.status);
  }
  return response.json() as Promise<ImportUploadResponse>;
}

export async function listImportRows(token: string, importJobId: string): Promise<ImportRowRead[]> {
  return request<ImportRowRead[]>(`/operations/data/imports/${importJobId}/rows`, { token });
}

export async function updateImportRow(
  token: string,
  importJobId: string,
  rowId: string,
  payload: { changes: Record<string, unknown>; expected_version?: number }
): Promise<ImportRowRead> {
  return request<ImportRowRead>(`/operations/data/imports/${importJobId}/rows/${rowId}`, { method: "PATCH", token, bodyJson: payload });
}

export async function createExportJob(token: string, payload: ExportJobCreate): Promise<ExportJobRead> {
  return request<ExportJobRead>("/operations/data/exports", { method: "POST", token, bodyJson: payload });
}

export async function listForms(token: string): Promise<DataFormRead[]> {
  return request<DataFormRead[]>("/forms", { token });
}

export async function createForm(token: string, payload: DataFormCreate): Promise<DataFormRead> {
  return request<DataFormRead>("/forms", { method: "POST", token, bodyJson: payload });
}

export async function listFormTemplates(
  token: string,
  params: { category?: string; search?: string; organization_type?: string } = {}
): Promise<FormTemplateRead[]> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  return request<FormTemplateRead[]>(`/forms/templates${suffix}`, { token });
}

export async function getFormTemplate(token: string, templateId: string): Promise<FormTemplateDetail> {
  return request<FormTemplateDetail>(`/forms/templates/${templateId}`, { token });
}

export async function duplicateFormTemplate(
  token: string,
  templateId: string,
  payload: TemplateDuplicateRequest
): Promise<{ id: string; name: string; slug: string; status: string; current_version: number; is_active: boolean }> {
  return request(`/forms/templates/${templateId}/duplicate`, { method: "POST", token, bodyJson: payload });
}

export const api = {
  createOrganization,
  createExportJob,
  duplicateFormTemplate,
  createForm,
  createImportJob,
  createUser,
  getCurrentPrincipal,
  getHealth,
  getFormTemplate,
  getOperationalEcosystem,
  inviteFieldOfficer,
  getOperationsSummary,
  listBeneficiaries,
  listCases,
  listFieldOfficers,
  listForms,
  listFormTemplates,
  listIndicators,
  listImportJobs,
  listImportRows,
  listPrograms,
  listReports,
  listRoles,
  listSubmissions,
  listUsers,
  login,
  previewImport,
  reviewSubmission,
  resetUserPassword,
  updateImportRow,
  updateUser,
  uploadImportFile
};
