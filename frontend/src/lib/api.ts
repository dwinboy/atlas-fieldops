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

export const api = {
  createOrganization,
  createUser,
  getCurrentPrincipal,
  getHealth,
  listRoles,
  listUsers,
  login
};
