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
  email?: string | null;
  full_name?: string | null;
  organization_slug?: string | null;
  organization_name?: string | null;
  roles: string[];
  permissions?: string[];
  scope_type?: string;
  menu_views?: string[];
  workflow_actions?: string[];
};

export type OrganizationCreate = {
  name: string;
  slug: string;
  owner_email?: string;
  owner_full_name?: string;
  owner_password?: string;
};

export type OrganizationRead = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  owner_email?: string | null;
  temporary_password?: string | null;
};

export type OrganizationContext = {
  organization_id: string;
  name: string;
  slug: string;
  roles: string[];
  logo_url?: string | null;
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
  login_slug?: string | null;
  temporary_password?: string | null;
};

export type UserImportIssue = {
  row_number: number;
  email?: string | null;
  message: string;
};

export type UserImportResponse = {
  created_count: number;
  skipped_count: number;
  error_count: number;
  users: UserRead[];
  issues: UserImportIssue[];
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

export type OrganizationUnitImportIssue = {
  row_number: number;
  code?: string | null;
  message: string;
};

export type OrganizationUnitImportResponse = {
  created_count: number;
  skipped_count: number;
  error_count: number;
  units: OrganizationUnitRead[];
  issues: OrganizationUnitImportIssue[];
};

export type DataRouteCreate = {
  title: string;
  data_type?: string;
  target_role_name?: string | null;
  target_team_id?: string | null;
  target_user_id?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
  instructions: string;
};

export type DataRouteRead = {
  id: string;
  title: string;
  data_type: string;
  target_role_name: string | null;
  target_team_id: string | null;
  target_user_id: string | null;
  priority: string;
  instructions: string;
  status: string;
  created_at: string;
};

export type GovernanceSummary = {
  policies: number;
  validation_rules: number;
  retention_policies: number;
  open_quality_signals: number;
  audit_events: number;
  lineage_events: number;
  export_events: number;
  consent_records: number;
  compliance_score: number;
  attention_items: string[];
};

export type GovernancePolicyRead = {
  id: string;
  name: string;
  policy_type: string;
  lifecycle_state: string;
  version: number;
  enforcement_level: string;
  rules_json: Record<string, unknown>;
  approved_at: string | null;
  created_at: string;
};

export type RetentionPolicyRead = {
  id: string;
  record_type: string;
  retention_years: number;
  archive_after_days: number;
  legal_hold: boolean;
  purge_allowed: boolean;
  anonymize_on_export: boolean;
  created_at: string;
};

export type ValidationRuleRead = {
  id: string;
  rule_code: string;
  name: string;
  target_entity: string;
  severity: string;
  expression: string;
  version: number;
  is_active: boolean;
  created_at: string;
};

export type DataVersionRead = {
  id: string;
  entity_type: string;
  entity_id: string;
  version_number: number;
  change_type: string;
  field_changes_json: Record<string, unknown>;
  rollback_available: boolean;
  created_at: string;
};

export type LineageEventRead = {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  transformation: string;
  lineage_json: Record<string, unknown>;
  created_at: string;
};

export type ExportLogRead = {
  id: string;
  dataset_type: string;
  export_format: string;
  status: string;
  anonymized: boolean;
  record_count: number;
  risk_score: number;
  created_at: string;
};

export type MasterDataEntryRead = {
  id: string;
  category: string;
  code: string;
  label: string;
  status: string;
  version: number;
  created_at: string;
};

export type OrganizationGovernanceSummary = {
  departments: number;
  teams: number;
  workforce_profiles: number;
  active_delegations: number;
  pending_access_requests: number;
  approval_matrices: number;
  clearance_levels: number;
  devices: number;
  active_sessions: number;
  high_risk_sessions: number;
  governance_score: number;
  attention_items: string[];
};

export type DepartmentRead = {
  id: string;
  name: string;
  code: string;
  department_type: string;
  parent_department_id: string | null;
  manager_user_id: string | null;
  created_at: string;
};

export type TeamRead = {
  id: string;
  name: string;
  code: string;
  team_type: string;
  department_id: string | null;
  organization_unit_id: string | null;
  manager_user_id: string | null;
  region: string | null;
  project_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type WorkforceProfileRead = {
  id: string;
  user_id: string;
  employee_code: string | null;
  job_title: string;
  department_id: string | null;
  team_id: string | null;
  supervisor_user_id: string | null;
  lifecycle_status: string;
  clearance_level: string;
  performance_score: number;
  created_at: string;
};

export type DelegationRead = {
  id: string;
  delegator_user_id: string;
  delegate_user_id: string;
  permission: string;
  scope_type: string;
  geography_id: string | null;
  project_id: string | null;
  starts_at: string;
  expires_at: string;
  status: string;
  reason: string | null;
};

export type ApprovalMatrixRead = {
  id: string;
  matrix_code: string;
  workflow_type: string;
  threshold_type: string;
  threshold_value: number;
  required_role: string;
  approval_stage: string;
  escalation_role: string | null;
  sla_hours: number;
  is_active: boolean;
};

export type AccessRequestRead = {
  id: string;
  requester_user_id: string;
  requested_permission: string;
  requested_scope_type: string;
  geography_id: string | null;
  project_id: string | null;
  reason: string;
  status: string;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type ClearanceLevelRead = {
  id: string;
  code: string;
  label: string;
  rank: number;
  allowed_data_classes: string[];
  requires_mfa: boolean;
};

export type OperationalZoneRead = {
  id: string;
  code: string;
  name: string;
  zone_type: string;
  parent_zone_id: string | null;
  geography_id: string | null;
  is_active: boolean;
};

export type DeviceRead = {
  id: string;
  user_id: string | null;
  device_id: string;
  device_type: string;
  label: string;
  status: string;
  last_seen_at: string | null;
};

export type SessionLogRead = {
  id: string;
  user_id: string;
  device_id: string | null;
  ip_address: string | null;
  location_hint: string | null;
  risk_score: number;
  status: string;
  created_at: string;
  ended_at: string | null;
};

export type AccessSimulationRead = {
  allowed: boolean;
  decision: string;
  matched_roles: string[];
  matched_scope: string | null;
  reasons: string[];
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

export type FieldOfficerImportIssue = {
  row_number: number;
  email?: string | null;
  message: string;
};

export type FieldOfficerImportResponse = {
  created_count: number;
  skipped_count: number;
  error_count: number;
  officers: FieldOfficerRead[];
  issues: FieldOfficerImportIssue[];
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

export type ImportApplyResponse = {
  job: ImportJobRead;
  created_records: number;
  updated_records: number;
  skipped_rows: number;
  dataset_type: string;
  message: string;
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

export type PublicCollectionLinkCreate = {
  form_id: string;
  slug: string;
  title: string;
  description?: string | null;
  access_mode?: "public" | "restricted" | "partner";
  require_authentication?: boolean;
  allow_offline_web?: boolean;
  expires_at?: string | null;
  allowed_domains?: string[];
  permission_json?: Record<string, unknown>;
};

export type PublicCollectionLinkRead = {
  id: string;
  form_id: string;
  slug: string;
  title: string;
  description: string | null;
  access_mode: string;
  status: string;
  require_authentication: boolean;
  allow_offline_web: boolean;
  expires_at: string | null;
  allowed_domains: string[];
  permission_json: Record<string, unknown>;
  submission_count: number;
  public_url: string;
};

export type MediaEvidenceCreate = {
  media_type: string;
  file_name: string;
  storage_url: string;
  mime_type: string;
  size_bytes?: number;
  submission_id?: string | null;
  beneficiary_id?: string | null;
  form_id?: string | null;
  checksum?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  captured_at?: string | null;
  metadata_json?: Record<string, unknown>;
};

export type MediaEvidenceRead = {
  id: string;
  submission_id: string | null;
  beneficiary_id: string | null;
  form_id: string | null;
  media_type: string;
  file_name: string;
  storage_url: string;
  mime_type: string;
  size_bytes: number;
  review_status: string;
  checksum: string | null;
  latitude: number | null;
  longitude: number | null;
  captured_at: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export type DataFormCreate = {
  name: string;
  slug: string;
  description?: string | null;
  schema: Record<string, unknown>;
  publish?: boolean;
};

export type XlsFormWorkbook = {
  survey: {
    type: string;
    name: string;
    label: string;
    hint?: string | null;
    required?: string | null;
    constraint?: string | null;
    relevant?: string | null;
    calculation?: string | null;
  }[];
  choices: { list_name: string; name: string; label: string }[];
  settings: {
    form_title: string;
    form_id: string;
    version: string;
    default_language: string;
  };
};

export type FormCollectionCompatibility = {
  form_id: string;
  version: number;
  offline_ready: boolean;
  xlsform_ready: boolean;
  web_form_ready: boolean;
  mobile_app_ready: boolean;
  has_gps: boolean;
  has_repeat_groups: boolean;
  media_field_count: number;
  warnings: string[];
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

export function resolveApiBaseUrl(candidate: string | undefined): string {
  const apiUrl = candidate?.trim().replace(/\/+$/, "");
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is required");
  }
  return apiUrl.endsWith("/api/v1") ? apiUrl : `${apiUrl}/api/v1`;
}

function getApiBaseUrl(): string {
  return resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}

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

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
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

export async function getOrganizationContext(token: string): Promise<OrganizationContext> {
  return request<OrganizationContext>("/organizations/me", { token });
}

export async function createOrganization(token: string, payload: OrganizationCreate): Promise<OrganizationRead> {
  return request<OrganizationRead>("/organizations", { method: "POST", token, bodyJson: payload });
}

export async function listUsers(token: string): Promise<UserRead[]> {
  return request<UserRead[]>("/users", { token });
}

export async function createUser(token: string, payload: UserCreate): Promise<UserRead> {
  return request<UserRead>("/users", { method: "POST", token, bodyJson: payload });
}

export async function importUsers(token: string, file: File): Promise<UserImportResponse> {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch(`${getApiBaseUrl()}/users/import`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    body
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || response.statusText, response.status);
  }
  return response.json() as Promise<UserImportResponse>;
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

export async function importOrganizationUnits(token: string, file: File): Promise<OrganizationUnitImportResponse> {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch(`${getApiBaseUrl()}/operations/units/import`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    body
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || response.statusText, response.status);
  }
  return response.json() as Promise<OrganizationUnitImportResponse>;
}

export async function routeData(token: string, payload: DataRouteCreate): Promise<DataRouteRead> {
  return request<DataRouteRead>("/operations/data-routes", { method: "POST", token, bodyJson: payload });
}

export async function getGovernanceSummary(token: string): Promise<GovernanceSummary> {
  return request<GovernanceSummary>("/governance/summary", { token });
}

export async function listGovernancePolicies(token: string): Promise<GovernancePolicyRead[]> {
  return request<GovernancePolicyRead[]>("/governance/policies", { token });
}

export async function createGovernancePolicy(token: string, payload: {
  name: string;
  policy_type: string;
  lifecycle_state?: string;
  enforcement_level?: string;
  rules_json?: Record<string, unknown>;
}): Promise<GovernancePolicyRead> {
  return request<GovernancePolicyRead>("/governance/policies", { method: "POST", token, bodyJson: payload });
}

export async function listRetentionPolicies(token: string): Promise<RetentionPolicyRead[]> {
  return request<RetentionPolicyRead[]>("/governance/retention-policies", { token });
}

export async function createRetentionPolicy(token: string, payload: {
  record_type: string;
  retention_years: number;
  archive_after_days: number;
  legal_hold?: boolean;
  purge_allowed?: boolean;
  anonymize_on_export?: boolean;
}): Promise<RetentionPolicyRead> {
  return request<RetentionPolicyRead>("/governance/retention-policies", { method: "POST", token, bodyJson: payload });
}

export async function listValidationRules(token: string): Promise<ValidationRuleRead[]> {
  return request<ValidationRuleRead[]>("/governance/validation-rules", { token });
}

export async function createValidationRule(token: string, payload: {
  rule_code: string;
  name: string;
  target_entity: string;
  severity?: string;
  expression?: string;
}): Promise<ValidationRuleRead> {
  return request<ValidationRuleRead>("/governance/validation-rules", { method: "POST", token, bodyJson: payload });
}

export async function listDataVersions(token: string): Promise<DataVersionRead[]> {
  return request<DataVersionRead[]>("/governance/data-versions", { token });
}

export async function listLineageEvents(token: string): Promise<LineageEventRead[]> {
  return request<LineageEventRead[]>("/governance/lineage", { token });
}

export async function listExportLogs(token: string): Promise<ExportLogRead[]> {
  return request<ExportLogRead[]>("/governance/export-logs", { token });
}

export async function governExport(token: string, payload: {
  dataset_type: string;
  export_format: string;
  anonymized?: boolean;
  record_count?: number;
  filters_json?: Record<string, unknown>;
}): Promise<ExportLogRead> {
  return request<ExportLogRead>("/governance/export-logs", { method: "POST", token, bodyJson: payload });
}

export async function listMasterDataEntries(token: string): Promise<MasterDataEntryRead[]> {
  return request<MasterDataEntryRead[]>("/governance/master-data", { token });
}

export async function getOrganizationGovernanceSummary(token: string): Promise<OrganizationGovernanceSummary> {
  return request<OrganizationGovernanceSummary>("/organization-governance/summary", { token });
}

export async function listDepartments(token: string): Promise<DepartmentRead[]> {
  return request<DepartmentRead[]>("/organization-governance/departments", { token });
}

export async function createDepartment(token: string, payload: {
  name: string;
  code: string;
  department_type?: string;
  manager_user_id?: string | null;
}): Promise<DepartmentRead> {
  return request<DepartmentRead>("/organization-governance/departments", { method: "POST", token, bodyJson: payload });
}

export async function listTeams(token: string): Promise<TeamRead[]> {
  return request<TeamRead[]>("/organization-governance/teams", { token });
}

export async function createTeam(token: string, payload: {
  name: string;
  code: string;
  team_type?: string;
  department_id?: string | null;
  organization_unit_id?: string | null;
  manager_user_id?: string | null;
  region?: string | null;
  project_id?: string | null;
}): Promise<TeamRead> {
  return request<TeamRead>("/organization-governance/teams", { method: "POST", token, bodyJson: payload });
}

export async function listWorkforceProfiles(token: string): Promise<WorkforceProfileRead[]> {
  return request<WorkforceProfileRead[]>("/organization-governance/workforce-profiles", { token });
}

export async function createWorkforceProfile(token: string, payload: {
  user_id: string;
  employee_code?: string | null;
  job_title?: string;
  department_id?: string | null;
  team_id?: string | null;
  supervisor_user_id?: string | null;
  lifecycle_status?: string;
  clearance_level?: string;
}): Promise<WorkforceProfileRead> {
  return request<WorkforceProfileRead>("/organization-governance/workforce-profiles", { method: "POST", token, bodyJson: payload });
}

export async function listDelegations(token: string): Promise<DelegationRead[]> {
  return request<DelegationRead[]>("/organization-governance/delegations", { token });
}

export async function createDelegation(token: string, payload: {
  delegate_user_id: string;
  permission: string;
  scope_type?: string;
  geography_id?: string | null;
  project_id?: string | null;
  starts_at: string;
  expires_at: string;
  reason?: string | null;
}): Promise<DelegationRead> {
  return request<DelegationRead>("/organization-governance/delegations", { method: "POST", token, bodyJson: payload });
}

export async function listApprovalMatrices(token: string): Promise<ApprovalMatrixRead[]> {
  return request<ApprovalMatrixRead[]>("/organization-governance/approval-matrices", { token });
}

export async function createApprovalMatrix(token: string, payload: {
  matrix_code: string;
  workflow_type?: string;
  threshold_type?: string;
  threshold_value?: number;
  required_role: string;
  approval_stage?: string;
  escalation_role?: string | null;
  sla_hours?: number;
  conditions_json?: Record<string, unknown>;
}): Promise<ApprovalMatrixRead> {
  return request<ApprovalMatrixRead>("/organization-governance/approval-matrices", { method: "POST", token, bodyJson: payload });
}

export async function listAccessRequests(token: string): Promise<AccessRequestRead[]> {
  return request<AccessRequestRead[]>("/organization-governance/access-requests", { token });
}

export async function createAccessRequest(token: string, payload: {
  requested_permission: string;
  requested_scope_type?: string;
  geography_id?: string | null;
  project_id?: string | null;
  reason?: string;
  expires_at?: string | null;
}): Promise<AccessRequestRead> {
  return request<AccessRequestRead>("/organization-governance/access-requests", { method: "POST", token, bodyJson: payload });
}

export async function reviewAccessRequest(token: string, requestId: string, decision: "approved" | "rejected"): Promise<AccessRequestRead> {
  return request<AccessRequestRead>(`/organization-governance/access-requests/${requestId}/review`, {
    method: "POST",
    token,
    bodyJson: { decision }
  });
}

export async function listClearanceLevels(token: string): Promise<ClearanceLevelRead[]> {
  return request<ClearanceLevelRead[]>("/organization-governance/clearance-levels", { token });
}

export async function createClearanceLevel(token: string, payload: {
  code: string;
  label: string;
  rank?: number;
  allowed_data_classes?: string[];
  requires_mfa?: boolean;
}): Promise<ClearanceLevelRead> {
  return request<ClearanceLevelRead>("/organization-governance/clearance-levels", { method: "POST", token, bodyJson: payload });
}

export async function listOperationalZones(token: string): Promise<OperationalZoneRead[]> {
  return request<OperationalZoneRead[]>("/organization-governance/zones", { token });
}

export async function createOperationalZone(token: string, payload: {
  code: string;
  name: string;
  zone_type?: string;
  parent_zone_id?: string | null;
  geography_id?: string | null;
  boundary_json?: Record<string, unknown>;
}): Promise<OperationalZoneRead> {
  return request<OperationalZoneRead>("/organization-governance/zones", { method: "POST", token, bodyJson: payload });
}

export async function listDevices(token: string): Promise<DeviceRead[]> {
  return request<DeviceRead[]>("/organization-governance/devices", { token });
}

export async function createDevice(token: string, payload: {
  device_id: string;
  user_id?: string | null;
  device_type?: string;
  label?: string;
  status?: string;
  metadata_json?: Record<string, unknown>;
}): Promise<DeviceRead> {
  return request<DeviceRead>("/organization-governance/devices", { method: "POST", token, bodyJson: payload });
}

export async function listSessionLogs(token: string): Promise<SessionLogRead[]> {
  return request<SessionLogRead[]>("/organization-governance/sessions", { token });
}

export async function simulateAccess(token: string, payload: {
  user_id: string;
  permission: string;
  geography_id?: string | null;
  project_id?: string | null;
  organization_unit_id?: string | null;
  workflow_stage?: string | null;
}): Promise<AccessSimulationRead> {
  return request<AccessSimulationRead>("/organization-governance/simulate-access", { method: "POST", token, bodyJson: payload });
}

export async function listFieldOfficers(token: string): Promise<FieldOfficerRead[]> {
  return request<FieldOfficerRead[]>("/field-officers", { token });
}

export async function inviteFieldOfficer(token: string, payload: FieldOfficerInvite): Promise<FieldOfficerRead> {
  return request<FieldOfficerRead>("/field-officers", { method: "POST", token, bodyJson: payload });
}

export async function importFieldOfficers(token: string, file: File): Promise<FieldOfficerImportResponse> {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch(`${getApiBaseUrl()}/field-officers/import`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    body
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || response.statusText, response.status);
  }
  return response.json() as Promise<FieldOfficerImportResponse>;
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
  const response = await fetch(`${getApiBaseUrl()}/operations/data/imports/upload`, {
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

export async function applyImportJob(token: string, importJobId: string): Promise<ImportApplyResponse> {
  return request<ImportApplyResponse>(`/operations/data/imports/${importJobId}/apply`, { method: "POST", token });
}

export async function createExportJob(token: string, payload: ExportJobCreate): Promise<ExportJobRead> {
  return request<ExportJobRead>("/operations/data/exports", { method: "POST", token, bodyJson: payload });
}

export async function listPublicCollectionLinks(token: string): Promise<PublicCollectionLinkRead[]> {
  return request<PublicCollectionLinkRead[]>("/operations/data/public-links", { token });
}

export async function createPublicCollectionLink(token: string, payload: PublicCollectionLinkCreate): Promise<PublicCollectionLinkRead> {
  return request<PublicCollectionLinkRead>("/operations/data/public-links", { method: "POST", token, bodyJson: payload });
}

export async function listMediaEvidence(token: string): Promise<MediaEvidenceRead[]> {
  return request<MediaEvidenceRead[]>("/operations/data/media-evidence", { token });
}

export async function createMediaEvidence(token: string, payload: MediaEvidenceCreate): Promise<MediaEvidenceRead> {
  return request<MediaEvidenceRead>("/operations/data/media-evidence", { method: "POST", token, bodyJson: payload });
}

export async function listForms(token: string): Promise<DataFormRead[]> {
  return request<DataFormRead[]>("/forms", { token });
}

export async function createForm(token: string, payload: DataFormCreate): Promise<DataFormRead> {
  return request<DataFormRead>("/forms", { method: "POST", token, bodyJson: payload });
}

export async function exportFormXlsForm(token: string, formId: string): Promise<XlsFormWorkbook> {
  return request<XlsFormWorkbook>(`/forms/${formId}/xlsform`, { token });
}

export async function getFormCollectionCompatibility(token: string, formId: string): Promise<FormCollectionCompatibility> {
  return request<FormCollectionCompatibility>(`/forms/${formId}/compatibility`, { token });
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
  applyImportJob,
  createAccessRequest,
  createApprovalMatrix,
  createClearanceLevel,
  createDelegation,
  createDepartment,
  createDevice,
  createOrganization,
  createExportJob,
  createMediaEvidence,
  createPublicCollectionLink,
  createOperationalZone,
  duplicateFormTemplate,
  exportFormXlsForm,
  createForm,
  createGovernancePolicy,
  createImportJob,
  createUser,
  createTeam,
  createWorkforceProfile,
  createRetentionPolicy,
  createValidationRule,
  getCurrentPrincipal,
  getHealth,
  getFormTemplate,
  getFormCollectionCompatibility,
  getGovernanceSummary,
  getOrganizationGovernanceSummary,
  getOrganizationContext,
  getOperationalEcosystem,
  governExport,
  importFieldOfficers,
  importOrganizationUnits,
  importUsers,
  inviteFieldOfficer,
  getOperationsSummary,
  listBeneficiaries,
  listCases,
  listAccessRequests,
  listApprovalMatrices,
  listClearanceLevels,
  listDelegations,
  listDepartments,
  listDevices,
  listDataVersions,
  listExportLogs,
  listMediaEvidence,
  listPublicCollectionLinks,
  listFieldOfficers,
  listForms,
  listFormTemplates,
  listGovernancePolicies,
  listIndicators,
  listImportJobs,
  listImportRows,
  listLineageEvents,
  listMasterDataEntries,
  listOperationalZones,
  listPrograms,
  listReports,
  listRetentionPolicies,
  listRoles,
  listSessionLogs,
  listSubmissions,
  listTeams,
  listValidationRules,
  listUsers,
  listWorkforceProfiles,
  login,
  previewImport,
  reviewSubmission,
  resetUserPassword,
  routeData,
  reviewAccessRequest,
  simulateAccess,
  updateImportRow,
  updateUser,
  uploadImportFile
};
