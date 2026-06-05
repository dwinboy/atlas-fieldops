import type { CurrentPrincipal } from "@/lib/api";

export type PlatformRole =
  | "Super Admin"
  | "System Admin"
  | "M&E Manager"
  | "Data Manager"
  | "Supervisor"
  | "Field Officer"
  | "Viewer/Donor";

const roleAliases: Record<string, PlatformRole> = {
  admin: "System Admin",
  administrator: "System Admin",
  platform_admin: "Super Admin",
  platformadmin: "Super Admin",
  platform_owner: "Super Admin",
  platformowner: "Super Admin",
  super_admin: "Super Admin",
  superadmin: "Super Admin",
  system_admin: "System Admin",
  systemadmin: "System Admin",
  me_manager: "M&E Manager",
  m_e_manager: "M&E Manager",
  monitoring_evaluation_manager: "M&E Manager",
  monitoring_and_evaluation_manager: "M&E Manager",
  manager: "M&E Manager",
  regional_manager: "M&E Manager",
  project_manager: "M&E Manager",
  data_manager: "Data Manager",
  datamanager: "Data Manager",
  supervisor: "Supervisor",
  field_supervisor: "Supervisor",
  field_officer: "Field Officer",
  fieldofficer: "Field Officer",
  enumerator: "Field Officer",
  collector: "Field Officer",
  viewer: "Viewer/Donor",
  donor: "Viewer/Donor",
  external_reviewer: "Viewer/Donor",
  readonly: "Viewer/Donor",
};

function normalizeRoleName(role: string): string {
  return role.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function normalizePlatformRoles(
  principal?: CurrentPrincipal | null,
): PlatformRole[] {
  if (!principal) {
    return [];
  }

  if (principal.platform_admin && !principal.support_mode) {
    return ["Super Admin"];
  }

  if (principal.platform_admin && principal.support_mode) {
    return ["System Admin"];
  }

  const roles = principal.roles
    .map((role) => roleAliases[normalizeRoleName(role)])
    .filter((role): role is PlatformRole => Boolean(role));

  return [...new Set(roles)];
}

export function hasRoleAccess(
  allowedRoles: PlatformRole[],
  principal?: CurrentPrincipal | null,
): boolean {
  if (!principal) {
    return true;
  }

  if (principal.platform_admin && !principal.support_mode) {
    return allowedRoles.includes("Super Admin");
  }

  const roles = normalizePlatformRoles(principal);
  if (!roles.length) {
    return false;
  }

  return roles.some((role) => allowedRoles.includes(role));
}

export function hasPermissionAccess(
  requiredPermissions: string[] | undefined,
  principal?: CurrentPrincipal | null,
): boolean {
  if (!requiredPermissions?.length || !principal) {
    return true;
  }

  if (principal.platform_admin) {
    return true;
  }

  const permissions = new Set(principal.permissions ?? []);
  return requiredPermissions.every((permission) => permissions.has(permission));
}
