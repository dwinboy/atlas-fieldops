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
};

export type UserRead = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
};

export type RoleRead = {
  id: string;
  organization_id: string;
  name: string;
  permissions: string[];
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

export type BeneficiaryRead = {
  id: string;
  beneficiary_uid: string;
  beneficiary_type: string;
  display_name: string;
  region: string | null;
  community: string | null;
  enrollment_status: string;
  vulnerability_score: number;
  duplicate_risk_score: number;
  latitude: number | null;
  longitude: number | null;
  last_visit_at: string | null;
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

export async function listRoles(token: string): Promise<RoleRead[]> {
  return request<RoleRead[]>("/roles", { token });
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

export async function listBeneficiaries(token: string): Promise<BeneficiaryRead[]> {
  return request<BeneficiaryRead[]>("/operations/beneficiaries", { token });
}

export const api = {
  createOrganization,
  createUser,
  getCurrentPrincipal,
  getHealth,
  inviteFieldOfficer,
  getOperationsSummary,
  listBeneficiaries,
  listFieldOfficers,
  listRoles,
  listSubmissions,
  listUsers,
  login,
  reviewSubmission
};
