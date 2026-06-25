import type {
  AccessCatalog,
  RoleRead,
  TeamRead,
  UserRead,
  UsersTeamsSummaryRead,
  WorkforceProfileRead,
} from "@/lib/api";

const fieldTeamRoleKeys = new Set(["district_supervisor", "field_officer", "regional_manager"]);
const geographyScopeKeys = new Set(["community", "country", "district", "province", "region", "sub_district", "village", "ward"]);

function normalizedKey(value?: string | null): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function normalizeRoleLabel(roleName?: string | null): string {
  if (!roleName) return "No role";
  return roleName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function statusTone(status: string | boolean | undefined): "success" | "warning" | "danger" | "neutral" {
  if (typeof status === "boolean") return status ? "success" : "warning";
  const normalized = (status ?? "").toLowerCase();
  if (["active", "approved", "accepted", "healthy", "allowed", "recorded"].includes(normalized)) return "success";
  if (["pending", "warning", "invited", "inactive"].includes(normalized)) return "warning";
  if (["suspended", "locked", "critical", "denied", "rejected", "high_risk"].includes(normalized)) return "danger";
  return "neutral";
}

export function normalizeTeamCode(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function resolveTeamCode(name: string, code?: string | null): string {
  return normalizeTeamCode(code) || normalizeTeamCode(name) || "team";
}

export function profileForUser(profiles: WorkforceProfileRead[], userId: string): WorkforceProfileRead | undefined {
  return profiles.find((profile) => profile.user_id === userId);
}

export function teamName(teams: TeamRead[], teamId?: string | null): string {
  if (!teamId) return "Unassigned";
  return teams.find((team) => team.id === teamId)?.name ?? "Unknown team";
}

export function userSetupIssues(user: UserRead, profile?: WorkforceProfileRead | null): string[] {
  const issues: string[] = [];
  const activeAssignments = (user.role_assignments ?? []).filter((assignment) => assignment.is_active);
  const roleKey = normalizedKey(user.role_name);
  const scopeKey = normalizedKey(user.scope_type);
  const effectiveProjectId = user.project_id ?? activeAssignments.find((assignment) => assignment.project_id)?.project_id ?? null;
  const effectiveGeographyId = user.geography_id ?? activeAssignments.find((assignment) => assignment.geography_id)?.geography_id ?? null;
  const effectiveTeamId = profile?.team_id ?? activeAssignments.find((assignment) => assignment.team_id)?.team_id ?? null;

  if (!roleKey) issues.push("Default role missing");
  if (fieldTeamRoleKeys.has(roleKey) && !profile) issues.push("No workforce profile");
  if ((fieldTeamRoleKeys.has(roleKey) || scopeKey === "field_team") && !effectiveTeamId) issues.push("No team assigned");
  if (roleKey === "field_officer" && !profile?.supervisor_user_id) issues.push("No supervisor linked");
  if (scopeKey === "project" && !effectiveProjectId) issues.push("Project scope is not set");
  if (geographyScopeKeys.has(scopeKey) && !effectiveGeographyId) issues.push("Location boundary is not set");

  return [...new Set(issues)];
}

export type UserSetupFilter = "all" | "inactive" | "needs_setup" | "ready";

export function matchesUserSetupFilter(issues: string[], isActive: boolean, filter: UserSetupFilter): boolean {
  if (filter === "needs_setup") return issues.length > 0;
  if (filter === "ready") return issues.length === 0;
  if (filter === "inactive") return !isActive;
  return true;
}

export function computeSummaryFromRecords(
  users: UserRead[],
  roles: RoleRead[],
  teams: TeamRead[],
): UsersTeamsSummaryRead {
  const activeUsers = users.filter((user) => user.is_active).length;
  return {
    access_health_score: users.length && roles.length ? 86 : 64,
    active_sessions: 0,
    active_users: activeUsers,
    high_risk_sessions: 0,
    inactive_users: Math.max(users.length - activeUsers, 0),
    locked_accounts: 0,
    organizations: 1,
    pending_access_requests: 0,
    pending_invitations: users.filter((user) => user.temporary_password).length,
    permission_alerts: 0,
    recent_activity: 0,
    roles: roles.length,
    suspended_users: 0,
    teams: teams.length,
    total_users: users.length,
  };
}

export function groupPermissions(catalog: AccessCatalog): { group: string; items: { key: string; label: string }[] }[] {
  const groups = new Map<string, { key: string; label: string }[]>();
  for (const permission of catalog.permissions) {
    const items = groups.get(permission.group) ?? [];
    items.push({ key: permission.key, label: permission.label });
    groups.set(permission.group, items);
  }
  return [...groups.entries()]
    .map(([group, items]) => ({ group, items: items.sort((left, right) => left.label.localeCompare(right.label)) }))
    .sort((left, right) => left.group.localeCompare(right.group));
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

export function toCsv(rows: Record<string, string | number | boolean | null | undefined>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => JSON.stringify(row[header] ?? "")).join(","));
  }
  return lines.join("\n");
}
