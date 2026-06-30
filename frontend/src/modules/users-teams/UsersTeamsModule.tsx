"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  Copy,
  Download,
  FileUp,
  KeyRound,
  Lock,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  RotateCcw,
  SearchCheck,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCog,
  UsersRound,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";

import { useContextualBack } from "@/hooks/useContextualBack";
import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyMini } from "@/components/ui/empty-mini";
import { ActionMenu } from "@/components/ui/dropdown-menu";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { UserProfileLink } from "@/components/ui/user-link";
import {
  ApiError,
  addUserRoleAssignment,
  createRole,
  resetRolePermissions,
  updateRole,
  createTeam,
  createUser,
  createWorkforceProfile,
  deactivateUserRoleAssignment,
  getAccessCatalog,
  getFieldOfficerProfile,
  getOrganizationContext,
  getOrganizationGovernanceSummary,
  getUsersTeamsSummary,
  importUsers,
  listFieldOfficers,
  listOrganizationUnits,
  listProjects,
  listRoles,
  listSessionLogs,
  listTeams,
  listUsers,
  listUsersTeamsActivityLogs,
  listWorkforceProfiles,
  resetUserPassword,
  simulateAccess,
  updateTeam,
  updateUser,
  updateUserRoleAssignment,
  updateWorkforceProfile,
  type AccessCatalog,
  type AccessSimulationRead,
  type CurrentPrincipal,
  type FieldOfficerProfileDetailRead,
  type RoleCreate,
  type RoleRead,
  type SessionLogRead,
  type TeamRead,
  type UserCreate,
  type UserOperationalProfileRead,
  type UserRead,
  type UserRoleAssignmentRead,
  type UsersTeamsActivityLogRead,
  type UsersTeamsSummaryRead,
  type WorkforceProfileRead,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  previewAccessCatalog,
  previewActivityLogs,
  previewOrganizationSummary,
  previewProfiles,
  previewRoles,
  previewSessions,
  previewSummary,
  previewTeams,
  previewUnits,
  previewUsers,
  type UsersTeamsSection,
  usersTeamsSectionFromPath,
  usersTeamsSections,
} from "@/modules/users-teams/data";
import {
  computeSummaryFromRecords,
  formatDateTime,
  groupPermissions,
  initials,
  matchesUserSetupFilter,
  normalizeRoleLabel,
  normalizeTeamCode,
  profileForUser,
  resolveTeamCode,
  statusTone,
  teamName,
  toCsv,
  type UserSetupFilter,
  userSetupIssues,
} from "@/modules/users-teams/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type UsersTeamsModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

type ModalMode = "access-test" | "edit-role" | "edit-team" | "edit-user" | "import-users" | "role" | "role-assignment" | "team" | "user" | null;
type EditRoleDraft = {
  id: string;
  name: string;
  label: string;
  description: string;
  scope_type: string;
  permissions: string[];
  is_system: boolean;
};
type AccessEditDraft = {
  geography_id: string;
  is_active: boolean;
  job_title: string;
  profile_id: string | null;
  project_id: string;
  role_name: string;
  scope_type: string;
  supervisor_user_id: string;
  team_id: string;
  user: UserRead | null;
};
type RoleAssignmentDraft = {
  assignment_id: string | null;
  geography_id: string;
  is_active: boolean;
  project_id: string;
  reason: string;
  role_name: string;
  scope_type: string;
  team_id: string;
  user: UserRead | null;
};
type RoleProfileTab = "overview" | "access" | "team" | "login" | "activity";
type AccessCenterTab = "users" | "roles" | "teams" | "permissions";

const defaultUserDraft: UserCreate = {
  email: "",
  full_name: "",
  geography_ids: [],
  password: "",
  project_ids: [],
  role_name: "field_officer",
  scope_type: "own" as NonNullable<UserCreate["scope_type"]>,
};

const defaultTeamDraft = {
  code: "",
  manager_user_id: "",
  name: "",
  organization_unit_id: "",
  region: "",
  team_type: "field_team",
};

const defaultEditTeamDraft = {
  ...defaultTeamDraft,
  id: "",
  is_active: true,
};

const defaultRoleDraft = {
  description: "",
  label: "",
  name: "",
  permissions: [] as string[],
  scope_type: "organization",
} satisfies RoleCreate;

const defaultAccessDraft = {
  permission: "users.view",
  user_id: "",
};

const fallbackAssignableRoles: [string, string][] = [
  ["organization_owner", "Organization Owner"],
  ["system_admin", "System Admin"],
  ["me_manager", "M&E Manager"],
  ["project_manager", "Project Manager"],
  ["data_manager", "Data Manager"],
  ["data_analyst", "Data Analyst"],
  ["district_supervisor", "District Supervisor"],
  ["field_officer", "Field Officer"],
  ["donor_viewer", "Donor / Viewer"],
];

const roleProfileTabs: { id: RoleProfileTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "access", label: "Roles & Permissions" },
  { id: "team", label: "Team & Workforce" },
  { id: "login", label: "Login & Device" },
  { id: "activity", label: "Activity" },
];

type RolesTabView = "list" | "architecture" | "matrix";

const rolesTabViews: { id: RolesTabView; label: string }[] = [
  { id: "list", label: "Roles list" },
  { id: "architecture", label: "Role architecture" },
  { id: "matrix", label: "Permission matrix" },
];

const accessCenterTabs: { id: AccessCenterTab; label: string; hint: string }[] = [
  { id: "users", label: "Users", hint: "Create people and open their access records." },
  { id: "roles", label: "Roles", hint: "Define permission bundles before assigning them." },
  { id: "teams", label: "Teams", hint: "Group staff by supervision, geography, or function." },
  { id: "permissions", label: "Permission checks", hint: "Confirm who can upload, clean, and review data." },
];

const missionPanelClass = "rounded-2xl border border-[#bec9bf]/45 bg-white shadow-sm";
const missionSubtlePanelClass = "rounded-2xl border border-[#bec9bf]/35 bg-[#f6fbf8] shadow-sm";

const emptyAccessCatalog = { roles: [], permissions: [], scope_types: [], workflow_actions: [] };
const defaultAccessEditDraft: AccessEditDraft = {
  geography_id: "",
  is_active: true,
  job_title: "",
  profile_id: null,
  project_id: "",
  role_name: "field_officer",
  scope_type: "own",
  supervisor_user_id: "",
  team_id: "",
  user: null,
};
const defaultRoleAssignmentDraft: RoleAssignmentDraft = {
  assignment_id: null,
  geography_id: "",
  is_active: true,
  project_id: "",
  reason: "",
  role_name: "field_officer",
  scope_type: "own",
  team_id: "",
  user: null,
};

function isPreview(token: string | null): boolean {
  return !token || token === "preview-token";
}

function messageFromApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.message) as { detail?: unknown };
      if (typeof parsed.detail === "string") return parsed.detail;
      if (Array.isArray(parsed.detail)) {
        return parsed.detail
          .map((item) => {
            const location = Array.isArray(item?.loc)
              ? item.loc.filter((part: unknown) => part !== "body").join(".")
              : "";
            const message = item?.msg ?? "Invalid field";
            return location ? `${location}: ${message}` : message;
          })
          .join(" ");
      }
    } catch {
      return error.message;
    }
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function hasAnyPermission(principal: CurrentPrincipal | null | undefined, permissions: string[]): boolean {
  if (!principal || principal.platform_admin) return true;
  return permissions.some((permission) => principal.permissions?.includes(permission));
}

function scopeSetupHint(scopeType?: string | null): string {
  if (scopeType === "field_team") {
    return "Field team scope uses the field-team boundary from your organization structure. Use the team selector separately when you also want this person tied to one named operational team.";
  }
  if (scopeType === "project") {
    return "Project scope keeps the role inside one project. Choose the project below before saving.";
  }
  if (scopeType === "country" || scopeType === "region" || scopeType === "district") {
    return "Choose the matching location boundary below so the person only sees work in that area.";
  }
  if (scopeType === "own") {
    return "Own scope keeps the user to their own records and directly assigned work.";
  }
  return "Choose the main boundary where this role should operate.";
}

function downloadCsv(filename: string, rows: Record<string, string | number | boolean | null | undefined>[]): void {
  const csv = toCsv(rows);
  if (!csv) return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const roleProfileFallbacks: Record<string, { displayName: string; group: string; responsibilities: string[] }> = {
  organization_owner: {
    displayName: "Organization Owner Profile",
    group: "Organization Leadership",
    responsibilities: ["Own tenant setup and governance", "Approve senior access changes", "Monitor organization risk"],
  },
  owner: {
    displayName: "Organization Owner Profile",
    group: "Organization Leadership",
    responsibilities: ["Own tenant setup and governance", "Approve senior access changes", "Monitor organization risk"],
  },
  system_admin: {
    displayName: "System Administration Profile",
    group: "Administration",
    responsibilities: ["Manage accounts and access", "Support password and device controls", "Maintain platform configuration"],
  },
  regional_manager: {
    displayName: "Regional Manager Profile",
    group: "Field Management",
    responsibilities: ["Manage regional teams", "Review regional progress", "Resolve escalated field issues"],
  },
  district_supervisor: {
    displayName: "Supervisor Profile",
    group: "Field Management",
    responsibilities: ["Supervise field officers", "Review field activity", "Resolve sync and data quality issues"],
  },
  field_officer: {
    displayName: "Field Officer Profile",
    group: "Field Collection",
    responsibilities: ["Collect assigned forms", "Sync mobile submissions", "Report field exceptions"],
  },
  me_manager: {
    displayName: "M&E Manager Profile",
    group: "Monitoring & Evaluation",
    responsibilities: ["Manage indicators and form quality", "Review approval workflows", "Protect reporting-ready data"],
  },
  project_manager: {
    displayName: "Project Manager Profile",
    group: "Project Delivery",
    responsibilities: ["Manage project delivery", "Track assignments and beneficiaries", "Coordinate field operations"],
  },
  data_manager: {
    displayName: "Data Manager Profile",
    group: "Data Management",
    responsibilities: ["Manage imports and cleaning", "Resolve duplicates", "Control exports and official datasets"],
  },
  data_analyst: {
    displayName: "Data Analyst Profile",
    group: "Analytics",
    responsibilities: ["Analyze approved data", "Prepare dashboards", "Support donor and indicator summaries"],
  },
  finance_officer: {
    displayName: "Finance Officer Profile",
    group: "Finance",
    responsibilities: ["Review financial evidence", "Track budget-linked operations", "Support donor compliance"],
  },
  compliance_auditor: {
    displayName: "Compliance Auditor Profile",
    group: "Governance",
    responsibilities: ["Inspect audit trails", "Review sensitive actions", "Flag compliance risks"],
  },
  donor_viewer: {
    displayName: "Donor Viewer Profile",
    group: "External Viewer",
    responsibilities: ["View approved progress", "Review donor-ready reports", "Monitor read-only project performance"],
  },
};

function profilesForUser(user: UserRead | null): UserOperationalProfileRead[] {
  if (!user) return [];
  if (user.operational_profiles?.length) return user.operational_profiles;
  const roleNames = new Set<string>();
  if (user.role_name) roleNames.add(user.role_name);
  for (const assignment of user.role_assignments ?? []) {
    roleNames.add(assignment.role_name);
  }
  return [...roleNames].map((roleName) => {
    const fallback = roleProfileFallbacks[roleName] ?? {
      displayName: `${normalizeRoleLabel(roleName)} Profile`,
      group: "Custom",
      responsibilities: ["Use assigned permissions inside the approved scope", "Complete assigned work with audit-ready activity"],
    };
    const assignment = user.role_assignments?.find((item) => item.role_name === roleName);
    return {
      id: `derived-${user.id}-${roleName}`,
      created_at: "",
      display_name: fallback.displayName,
      last_activity_at: null,
      metadata_json: {
        architecture_group: fallback.group,
        scope_type: assignment?.scope_type ?? user.scope_type ?? "organization",
      },
      metrics_json: {},
      primary_geography_id: assignment?.geography_id ?? user.geography_id ?? null,
      primary_project_id: assignment?.project_id ?? user.project_id ?? null,
      primary_team_id: assignment?.team_id ?? null,
      profile_type: roleName,
      responsibilities_json: fallback.responsibilities,
      status: user.is_active && (assignment?.is_active ?? true) ? "active" : "inactive",
      supervisor_user_id: null,
      updated_at: "",
    };
  });
}

export function UsersTeamsModule({ principal, token }: UsersTeamsModuleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<UsersTeamsSection>(() => usersTeamsSectionFromPath(pathname));
  const [accessCenterTab, setAccessCenterTab] = useState<AccessCenterTab>("users");
  const [rolesView, setRolesView] = useState<RolesTabView>("list");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedRoleProfileUserId, setSelectedRoleProfileUserId] = useState<string | null>(null);
  useContextualBack(Boolean(selectedRoleProfileUserId));
  const [selectedRoleProfileType, setSelectedRoleProfileType] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState(defaultUserDraft);
  const [teamDraft, setTeamDraft] = useState(defaultTeamDraft);
  const [editTeamDraft, setEditTeamDraft] = useState(defaultEditTeamDraft);
  const [roleDraft, setRoleDraft] = useState(defaultRoleDraft);
  const [editRoleDraft, setEditRoleDraft] = useState<EditRoleDraft | null>(null);
  const [accessDraft, setAccessDraft] = useState(defaultAccessDraft);
  const [accessEditDraft, setAccessEditDraft] = useState<AccessEditDraft>(defaultAccessEditDraft);
  const [roleAssignmentDraft, setRoleAssignmentDraft] = useState<RoleAssignmentDraft>(defaultRoleAssignmentDraft);
  const [accessResult, setAccessResult] = useState<AccessSimulationRead | null>(null);
  const [localUsers, setLocalUsers] = useState<UserRead[]>([]);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [passwordResult, setPasswordResult] = useState<{ name: string; password: string } | null>(null);
  const passwordResetTargetName = useRef("the user");
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const queryClient = useQueryClient();
  const preview = isPreview(token);
  const enabled = Boolean(token && !preview);
  const canManageUsers = hasAnyPermission(principal, ["users.create", "users.manage"]);
  const canManageRoles = hasAnyPermission(principal, ["roles.manage"]);
  const canManageTeams = hasAnyPermission(principal, ["officers.manage", "users.manage", "organization.hierarchy.manage"]);
  // Session/audit logs require the audit.view permission. Only fetch them when the role allows it,
  // otherwise the speculative request 403s and trips the global permission toast on a page the user
  // is legitimately allowed to open.
  const canViewAudit = hasAnyPermission(principal, ["audit.view"]);

  const usersQuery = useQuery({ queryKey: ["users-teams", "users", token], queryFn: () => listUsers(token ?? ""), enabled });
  const rolesQuery = useQuery({ queryKey: ["users-teams", "roles", token], queryFn: () => listRoles(token ?? ""), enabled });
  const teamsQuery = useQuery({ queryKey: ["users-teams", "teams", token], queryFn: () => listTeams(token ?? ""), enabled });
  const profilesQuery = useQuery({ queryKey: ["users-teams", "profiles", token], queryFn: () => listWorkforceProfiles(token ?? ""), enabled });
  const unitsQuery = useQuery({ queryKey: ["users-teams", "units", token], queryFn: () => listOrganizationUnits(token ?? ""), enabled });
  const sessionsQuery = useQuery({ queryKey: ["users-teams", "sessions", token], queryFn: () => listSessionLogs(token ?? ""), enabled: enabled && canViewAudit });
  const catalogQuery = useQuery({ queryKey: ["users-teams", "catalog", token], queryFn: () => getAccessCatalog(token ?? ""), enabled });
  const summaryQuery = useQuery({ queryKey: ["users-teams", "summary", token], queryFn: () => getUsersTeamsSummary(token ?? ""), enabled });
  const organizationSummaryQuery = useQuery({ queryKey: ["users-teams", "org-summary", token], queryFn: () => getOrganizationGovernanceSummary(token ?? ""), enabled });
  const activityQuery = useQuery({ queryKey: ["users-teams", "activity", token], queryFn: () => listUsersTeamsActivityLogs(token ?? ""), enabled });
  const organizationQuery = useQuery({ queryKey: ["users-teams", "organization", token], queryFn: () => getOrganizationContext(token ?? ""), enabled });
  const projectsQuery = useQuery({ queryKey: ["users-teams", "projects", token], queryFn: () => listProjects(token ?? ""), enabled });
  // Field-officer profile carries the mobile QR login, credential/security state, and
  // the granular permission list — fetched lazily only while a user profile is open.
  const fieldOfficersQuery = useQuery({
    queryKey: ["users-teams", "field-officers", token],
    queryFn: () => listFieldOfficers(token ?? ""),
    enabled: enabled && Boolean(selectedRoleProfileUserId),
  });
  const selectedOfficerId = useMemo(
    () => fieldOfficersQuery.data?.find((officer) => officer.user_id === selectedRoleProfileUserId)?.id ?? null,
    [fieldOfficersQuery.data, selectedRoleProfileUserId],
  );
  const fieldOfficerDetailQuery = useQuery({
    queryKey: ["users-teams", "field-officer-detail", token, selectedOfficerId],
    queryFn: () => getFieldOfficerProfile(token ?? "", selectedOfficerId ?? ""),
    enabled: enabled && Boolean(selectedOfficerId),
  });
  const fieldOfficerDetail: FieldOfficerProfileDetailRead | null = preview
    ? null
    : (fieldOfficerDetailQuery.data ?? null);

  const users = preview ? [...localUsers, ...previewUsers] : (usersQuery.data ?? []);
  const roles = useMemo(() => (preview ? previewRoles : (rolesQuery.data ?? [])), [preview, rolesQuery.data]);
  const teams = preview ? previewTeams : (teamsQuery.data ?? []);
  const profiles = preview ? previewProfiles : (profilesQuery.data ?? []);
  const units = preview ? previewUnits : (unitsQuery.data ?? []);
  const projects = preview ? [] : (projectsQuery.data ?? []);
  const sessions = preview ? previewSessions : (sessionsQuery.data ?? []);
  const catalog = useMemo(
    () => (preview ? previewAccessCatalog : (catalogQuery.data ?? emptyAccessCatalog)),
    [catalogQuery.data, preview],
  );
  const organizationSummary = preview
    ? previewOrganizationSummary
    : (organizationSummaryQuery.data ?? { governance_score: 100, pending_access_requests: 0, high_risk_sessions: 0, attention_items: [] });
  const activityLogs = preview ? previewActivityLogs : (activityQuery.data ?? []);
  const summary: UsersTeamsSummaryRead =
    preview
      ? (summaryQuery.data ?? computeSummaryFromRecords(users, roles, teams) ?? previewSummary)
      : (summaryQuery.data ?? computeSummaryFromRecords(users, roles, teams));

  const permissionGroups = useMemo(() => groupPermissions(catalog), [catalog]);
  const roleOptions = useMemo(() => {
    const roleNames = new Map<string, string>();
    for (const role of roles) {
      roleNames.set(role.name, role.label || normalizeRoleLabel(role.name));
    }
    for (const role of catalog.roles) {
      roleNames.set(role.name, role.label || normalizeRoleLabel(role.name));
    }
    if (!roleNames.size && !preview) {
      for (const [value, label] of fallbackAssignableRoles) {
        roleNames.set(value, label);
      }
    }
    return [...roleNames.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [catalog.roles, preview, roles]);
  const roleCatalogByName = useMemo(
    () => new Map(catalog.roles.map((role) => [role.name, role])),
    [catalog.roles],
  );

  const defaultAssignableRole = roleOptions.find(([value]) => value === defaultUserDraft.role_name)?.[0] ?? roleOptions[0]?.[0] ?? defaultUserDraft.role_name;
  const selectedRoleProfileUser = selectedRoleProfileUserId ? users.find((user) => user.id === selectedRoleProfileUserId) ?? null : null;
  const selectedRoleProfileProfiles = profilesForUser(selectedRoleProfileUser);
  const selectedRoleProfile = selectedRoleProfileProfiles.find((profile) => profile.profile_type === selectedRoleProfileType) ?? selectedRoleProfileProfiles[0] ?? null;

  useEffect(() => {
    const path = pathname.replace(/\/+$/, "");
    const match = path.match(/^\/users-teams\/role-profiles\/([^/]+)$/);
    if (match) {
      if (activeSection !== "users") {
        setActiveSection("users");
      }
      const nextUserId = decodeURIComponent(match[1]);
      if (selectedRoleProfileUserId !== nextUserId) {
        setSelectedRoleProfileUserId(nextUserId);
        setSelectedRoleProfileType(null);
      }
      return;
    }
    if (selectedRoleProfileUserId) {
      setSelectedRoleProfileUserId(null);
      setSelectedRoleProfileType(null);
    }
    const nextSection = usersTeamsSectionFromPath(path);
    if (nextSection !== activeSection) {
      setActiveSection(nextSection);
    }
  }, [activeSection, pathname, selectedRoleProfileUserId]);

  useEffect(() => {
    if (
      activeSection === "users" ||
      activeSection === "roles" ||
      activeSection === "teams" ||
      activeSection === "permissions"
    ) {
      setAccessCenterTab(activeSection);
    }
  }, [activeSection]);

  useEffect(() => {
    if (modalMode !== "user" || !roleOptions.length) return;
    if (!roleOptions.some(([value]) => value === userDraft.role_name)) {
      setUserDraft((current) => ({ ...current, role_name: roleOptions[0]?.[0] ?? defaultUserDraft.role_name }));
    }
  }, [modalMode, roleOptions, userDraft.role_name]);

  useEffect(() => {
    if (!selectedRoleProfileUser || selectedRoleProfileType) return;
    setSelectedRoleProfileType(profilesForUser(selectedRoleProfileUser)[0]?.profile_type ?? null);
  }, [selectedRoleProfileType, selectedRoleProfileUser]);

  function openRoleProfile(user: UserRead, profileType?: string | null): void {
    setActiveSection("users");
    setSelectedRoleProfileUserId(user.id);
    setSelectedRoleProfileType(profileType ?? profilesForUser(user)[0]?.profile_type ?? user.role_name ?? null);
    router.push(`/users-teams/role-profiles/${user.id}`);
  }

  function closeRoleProfile(): void {
    setSelectedRoleProfileUserId(null);
    setSelectedRoleProfileType(null);
    router.push("/users-teams/users");
  }

  function selectSection(section: UsersTeamsSection): void {
    setActiveSection(section);
    setSelectedRoleProfileUserId(null);
    setSelectedRoleProfileType(null);
    const route = usersTeamsSections.find((item) => item.id === section)?.route;
    if (route && route !== pathname) {
      router.push(route);
    }
  }

  const invalidateUsersTeams = async () => {
    await queryClient.invalidateQueries({ queryKey: ["users-teams"] });
  };

  function openCreateUserModal(): void {
    const defaultRole = roleCatalogByName.get(defaultAssignableRole);
    setUserDraft((current) => ({
      ...defaultUserDraft,
      email: current.email,
      full_name: current.full_name,
      password: current.password,
      role_name: roleOptions.some(([value]) => value === current.role_name) ? current.role_name : defaultAssignableRole,
      scope_type: current.scope_type ?? defaultRole?.scope_type ?? defaultUserDraft.scope_type,
    }));
    setModalMode("user");
  }

  function openEditTeam(team: TeamRead): void {
    setEditTeamDraft({
      code: team.code,
      id: team.id,
      is_active: team.is_active,
      manager_user_id: team.manager_user_id ?? "",
      name: team.name,
      organization_unit_id: team.organization_unit_id ?? "",
      region: team.region ?? "",
      team_type: team.team_type,
    });
    setModalMode("edit-team");
  }

  function openEditUserAccess(user: UserRead): void {
    const roleName = user.role_name ?? defaultAssignableRole;
    const role = roleCatalogByName.get(roleName);
    const workforceProfile = profileForUser(profiles, user.id);
    setAccessEditDraft({
      geography_id: user.geography_id ?? "",
      is_active: user.is_active,
      job_title: workforceProfile?.job_title ?? "",
      profile_id: workforceProfile?.id ?? null,
      project_id: user.project_id ?? "",
      role_name: roleName,
      scope_type: user.scope_type ?? role?.scope_type ?? "own",
      supervisor_user_id: workforceProfile?.supervisor_user_id ?? "",
      team_id: workforceProfile?.team_id ?? "",
      user,
    });
    setModalMode("edit-user");
  }

  function openRoleAssignments(user: UserRead): void {
    const firstAssignment = user.role_assignments?.[0];
    setRoleAssignmentDraft({
      assignment_id: null,
      geography_id: "",
      is_active: true,
      project_id: "",
      reason: "",
      role_name: firstAssignment?.role_name ?? user.role_name ?? defaultAssignableRole,
      scope_type: firstAssignment?.scope_type ?? user.scope_type ?? "own",
      team_id: "",
      user,
    });
    setModalMode("role-assignment");
  }

  function editRoleAssignment(user: UserRead, assignment: UserRoleAssignmentRead): void {
    setRoleAssignmentDraft({
      assignment_id: assignment.id,
      geography_id: assignment.geography_id ?? "",
      is_active: assignment.is_active,
      project_id: assignment.project_id ?? "",
      reason: assignment.reason ?? "",
      role_name: assignment.role_name,
      scope_type: assignment.scope_type,
      team_id: assignment.team_id ?? "",
      user,
    });
  }

  const createUserMutation = useMutation({
    mutationFn: () => createUser(token ?? "", userDraft),
    onSuccess: async (user) => {
      setModalMode(null);
      setUserDraft(defaultUserDraft);
      await invalidateUsersTeams();
      pushToast({ title: "User created", description: `${user.full_name} can now access this organization.`, tone: "success" });
    },
    onError: (error) =>
      pushToast({
        title: "Could not create user",
        description: messageFromApiError(error, "Check the email, temporary password, selected role, scope, and your user management permission."),
        tone: "danger",
      }),
  });

  function submitUser(): void {
    if (preview) {
      const email = userDraft.email.trim().toLowerCase();
      if (users.some((user) => user.email.toLowerCase() === email)) {
        pushToast({ title: "User already exists", description: "Use a unique email address for the preview user.", tone: "warning" });
        return;
      }
      const user: UserRead = {
        email,
        full_name: userDraft.full_name.trim(),
        id: `user-local-${Date.now()}`,
        is_active: true,
        login_slug: "preview",
        role_name: userDraft.role_name,
        scope_type: userDraft.scope_type,
        temporary_password: userDraft.password,
      };
      setLocalUsers((current) => [user, ...current]);
      setModalMode(null);
      setUserDraft({ ...defaultUserDraft, role_name: defaultAssignableRole });
      pushToast({ title: "User created", description: `${user.full_name} was added to this local workspace preview.`, tone: "success" });
      return;
    }
    createUserMutation.mutate();
  }

  const importUsersMutation = useMutation({
    mutationFn: () => {
      if (!selectedImportFile) throw new Error("Choose a CSV file");
      return importUsers(token ?? "", selectedImportFile);
    },
    onSuccess: async (result) => {
      setModalMode(null);
      setSelectedImportFile(null);
      await invalidateUsersTeams();
      pushToast({ title: "Users imported", description: `${result.created_count} created, ${result.skipped_count} skipped, ${result.error_count} issue(s).`, tone: result.error_count ? "warning" : "success" });
    },
    onError: () => pushToast({ title: "Import failed", description: "Use a CSV with email, full_name, role_name, and password columns.", tone: "danger" }),
  });

  const createTeamMutation = useMutation({
    mutationFn: () =>
      createTeam(token ?? "", {
        code: resolveTeamCode(teamDraft.name, teamDraft.code),
        manager_user_id: teamDraft.manager_user_id || null,
        name: teamDraft.name,
        organization_unit_id: teamDraft.organization_unit_id || null,
        region: teamDraft.region || null,
        team_type: teamDraft.team_type,
      }),
    onSuccess: async (team) => {
      setModalMode(null);
      setTeamDraft(defaultTeamDraft);
      await invalidateUsersTeams();
      pushToast({ title: "Team created", description: `${team.name} is ready for assignments.`, tone: "success" });
    },
    onError: (error) =>
      pushToast({
        title: "Could not create team",
        description: messageFromApiError(error, "Check the team name, code, and your team management permission."),
        tone: "danger",
      }),
  });

  const updateTeamMutation = useMutation({
    mutationFn: () =>
      updateTeam(token ?? "", editTeamDraft.id, {
        code: resolveTeamCode(editTeamDraft.name, editTeamDraft.code),
        is_active: editTeamDraft.is_active,
        manager_user_id: editTeamDraft.manager_user_id || null,
        name: editTeamDraft.name,
        organization_unit_id: editTeamDraft.organization_unit_id || null,
        region: editTeamDraft.region || null,
        team_type: editTeamDraft.team_type,
      }),
    onSuccess: async (team) => {
      setModalMode(null);
      setEditTeamDraft(defaultEditTeamDraft);
      await invalidateUsersTeams();
      pushToast({ title: "Team updated", description: `${team.name} has been updated.`, tone: "success" });
    },
    onError: (error) =>
      pushToast({
        title: "Could not update team",
        description: messageFromApiError(error, "Check the team name, code, and your team management permission."),
        tone: "danger",
      }),
  });

  const createRoleMutation = useMutation({
    mutationFn: () => createRole(token ?? "", roleDraft),
    onSuccess: async (role) => {
      setModalMode(null);
      setRoleDraft(defaultRoleDraft);
      await invalidateUsersTeams();
      pushToast({ title: "Role created", description: `${role.label || role.name} is available for user assignment.`, tone: "success" });
    },
    onError: () => pushToast({ title: "Could not create role", description: "Role names must be unique and permissions must be valid.", tone: "danger" }),
  });

  function openEditRole(role: RoleRead): void {
    setEditRoleDraft({
      id: role.id,
      name: role.name,
      label: role.label || normalizeRoleLabel(role.name),
      description: role.description ?? "",
      scope_type: role.scope_type ?? "organization",
      permissions: [...role.permissions],
      is_system: Boolean(role.is_system),
    });
    setModalMode("edit-role");
  }

  const updateRoleMutation = useMutation({
    mutationFn: () => {
      if (!editRoleDraft) throw new Error("No role selected");
      return updateRole(token ?? "", editRoleDraft.id, {
        label: editRoleDraft.label,
        description: editRoleDraft.description,
        scope_type: editRoleDraft.scope_type as RoleCreate["scope_type"],
        permissions: editRoleDraft.permissions,
      });
    },
    onSuccess: async (role) => {
      setModalMode(null);
      setEditRoleDraft(null);
      await invalidateUsersTeams();
      pushToast({ title: "Role updated", description: `${role.label || role.name} permissions saved. Users get the change on their next sign-in.`, tone: "success" });
    },
    onError: (error) => pushToast({ title: "Could not update role", description: messageFromApiError(error, "Check the permissions and your role-management access."), tone: "danger" }),
  });

  const resetRoleMutation = useMutation({
    mutationFn: (roleId: string) => resetRolePermissions(token ?? "", roleId),
    onSuccess: async (role) => {
      setEditRoleDraft((current) => (current && current.id === role.id ? { ...current, permissions: [...role.permissions] } : current));
      await invalidateUsersTeams();
      pushToast({ title: "Role reset to default", description: `${role.label || role.name} permissions were restored to the built-in default.`, tone: "success" });
    },
    onError: (error) => pushToast({ title: "Could not reset role", description: messageFromApiError(error, "This role may be custom and have no built-in default."), tone: "danger" }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => resetUserPassword(token ?? "", userId),
    onSuccess: (result) => {
      setPasswordResult({ name: passwordResetTargetName.current, password: result.temporary_password });
      pushToast({ title: "Temporary password created", description: "Share it securely — it is shown once.", tone: "success" });
    },
    onError: () => pushToast({ title: "Password reset failed", description: "You need user management permission to reset another account.", tone: "danger" }),
  });

  function resetPasswordForUser(target: UserRead): void {
    passwordResetTargetName.current = target.full_name;
    resetPasswordMutation.mutate(target.id);
  }

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ is_active, user }: { is_active: boolean; user: UserRead }) =>
      updateUser(token ?? "", user.id, { is_active, full_name: user.full_name, role_name: user.role_name ?? undefined }),
    onSuccess: async (_result, variables) => {
      setAccessEditDraft((current) =>
        current.user?.id === variables.user.id
          ? { ...current, is_active: variables.is_active, user: { ...current.user, is_active: variables.is_active } }
          : current,
      );
      setRoleAssignmentDraft((current) =>
        current.user?.id === variables.user.id
          ? { ...current, user: { ...current.user, is_active: variables.is_active } }
          : current,
      );
      await invalidateUsersTeams();
      pushToast({ title: "User status updated", description: "Access changes are now reflected across the organization.", tone: "success" });
    },
    onError: () => pushToast({ title: "Could not update user", description: "Check your user management permission.", tone: "danger" }),
  });

  const updateUserAccessMutation = useMutation({
    mutationFn: () => {
      if (!accessEditDraft.user) throw new Error("Choose a user");
      const currentUser = accessEditDraft.user;
      return updateUser(token ?? "", currentUser.id, {
        full_name: currentUser.full_name,
        geography_id: accessEditDraft.geography_id || null,
        is_active: accessEditDraft.is_active,
        project_id: accessEditDraft.project_id || null,
        role_name: accessEditDraft.role_name,
        scope_type: accessEditDraft.scope_type,
      }).then(async () => {
        const hasWorkforceDetails = Boolean(
          accessEditDraft.profile_id ||
          accessEditDraft.team_id ||
          accessEditDraft.supervisor_user_id ||
          accessEditDraft.job_title.trim(),
        );
        if (!hasWorkforceDetails) return null;
        const workforcePayload = {
          job_title: accessEditDraft.job_title.trim() || null,
          supervisor_user_id: accessEditDraft.supervisor_user_id || null,
          team_id: accessEditDraft.team_id || null,
        };
        if (accessEditDraft.profile_id) {
          return updateWorkforceProfile(token ?? "", accessEditDraft.profile_id, workforcePayload);
        }
        return createWorkforceProfile(token ?? "", {
          user_id: currentUser.id,
          job_title: accessEditDraft.job_title.trim() || "Team member",
          supervisor_user_id: accessEditDraft.supervisor_user_id || null,
          team_id: accessEditDraft.team_id || null,
        });
      });
    },
    onSuccess: async () => {
      setModalMode(null);
      setAccessEditDraft(defaultAccessEditDraft);
      await invalidateUsersTeams();
      pushToast({ title: "Access updated", description: "The user role and scope have been updated and audited.", tone: "success" });
    },
    onError: () => pushToast({ title: "Could not update access", description: "Check your permission, selected role, and scope.", tone: "danger" }),
  });

  const saveRoleAssignmentMutation = useMutation({
    mutationFn: () => {
      if (!roleAssignmentDraft.user) throw new Error("Choose a user");
      const payload = {
        geography_id: roleAssignmentDraft.geography_id || null,
        is_active: roleAssignmentDraft.is_active,
        project_id: roleAssignmentDraft.project_id || null,
        reason: roleAssignmentDraft.reason || null,
        role_name: roleAssignmentDraft.role_name,
        scope_type: roleAssignmentDraft.scope_type,
        team_id: roleAssignmentDraft.team_id || null,
      };
      if (roleAssignmentDraft.assignment_id) {
        return updateUserRoleAssignment(token ?? "", roleAssignmentDraft.user.id, roleAssignmentDraft.assignment_id, payload);
      }
      return addUserRoleAssignment(token ?? "", roleAssignmentDraft.user.id, payload);
    },
    onSuccess: async (user) => {
      setRoleAssignmentDraft({
        ...defaultRoleAssignmentDraft,
        role_name: defaultAssignableRole,
        user,
      });
      await invalidateUsersTeams();
      pushToast({ title: "Role assignment saved", description: "The user's effective access now includes this scoped role.", tone: "success" });
    },
    onError: () => pushToast({ title: "Could not save role assignment", description: "Check the role, scope, target, and your permission to assign it.", tone: "danger" }),
  });

  const deactivateRoleAssignmentMutation = useMutation({
    mutationFn: ({ assignment, user }: { assignment: UserRoleAssignmentRead; user: UserRead }) =>
      deactivateUserRoleAssignment(token ?? "", user.id, assignment.id),
    onSuccess: async (user) => {
      setRoleAssignmentDraft((current) => ({ ...current, assignment_id: null, user }));
      await invalidateUsersTeams();
      pushToast({ title: "Role assignment deactivated", description: "The role no longer contributes active access.", tone: "success" });
    },
    onError: () => pushToast({ title: "Could not deactivate assignment", description: "At least one primary account role may still be required.", tone: "danger" }),
  });

  const simulateAccessMutation = useMutation({
    mutationFn: () => simulateAccess(token ?? "", accessDraft),
    onSuccess: (result) => setAccessResult(result),
    onError: () => pushToast({ title: "Access test failed", description: "Choose a user and permission, then try again.", tone: "danger" }),
  });

  const userColumns: TableColumn<UserRead>[] = [
    {
      key: "identity",
      header: "User",
      value: (user) => `${user.full_name} ${user.email}`,
      render: (user) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(user.full_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{user.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      value: (user) => normalizeRoleLabel(user.role_name),
      render: (user) => <Badge tone="accent">{normalizeRoleLabel(user.role_name)}</Badge>,
    },
    {
      key: "profiles",
      header: "Profiles",
      value: (user) => profilesForUser(user).map((profile) => profile.display_name).join(" "),
      render: (user) => {
        const roleProfiles = profilesForUser(user);
        return (
          <div className="flex flex-wrap gap-1.5">
            {roleProfiles.slice(0, 2).map((profile) => (
              <Badge key={profile.id} tone={profile.status === "active" ? "success" : "neutral"}>
                {profile.display_name.replace(" Profile", "")}
              </Badge>
            ))}
            {roleProfiles.length > 2 ? <Badge tone="neutral">+{roleProfiles.length - 2}</Badge> : null}
          </div>
        );
      },
    },
    {
      key: "assignment",
      header: "Assignment",
      value: (user) => profileForUser(profiles, user.id)?.job_title ?? user.scope_type ?? "",
      render: (user) => {
        const profile = profileForUser(profiles, user.id);
        return (
          <div className="space-y-1">
            <p className="font-medium">{profile?.job_title ?? "No workforce profile"}</p>
            <p className="text-xs text-muted-foreground">{teamName(teams, profile?.team_id)}</p>
          </div>
        );
      },
    },
    {
      key: "scope",
      header: "Access Scope",
      value: (user) => user.scope_type ?? "",
      render: (user) => <span className="capitalize">{(user.scope_type ?? "organization").replace("_", " ")}</span>,
    },
    {
      key: "setup",
      header: "Setup",
      value: (user) => userSetupIssues(user, profileForUser(profiles, user.id)).join(" "),
      render: (user) => {
        const issues = userSetupIssues(user, profileForUser(profiles, user.id));
        return issues.length ? (
          <div className="space-y-1">
            <Badge tone="warning">Needs setup ({issues.length})</Badge>
            <p className="text-xs text-muted-foreground">{issues.slice(0, 2).join(" · ")}</p>
            <Button onClick={() => openEditUserAccess(user)} size="sm" variant="ghost">
              <Pencil aria-hidden="true" />
              Fix setup
            </Button>
          </div>
        ) : (
          <Badge tone="success">Ready</Badge>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      value: (user) => (user.is_active ? "active" : "inactive"),
      render: (user) => <Badge tone={statusTone(user.is_active)}>{user.is_active ? "Active" : "Inactive"}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (user) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button onClick={() => openRoleProfile(user)} size="sm" variant="secondary">
            <UserCog aria-hidden="true" />
            View profile
          </Button>
          <Button
            disabled={preview || !canManageUsers || saveRoleAssignmentMutation.isPending}
            onClick={() => openRoleAssignments(user)}
            size="sm"
            variant="secondary"
          >
            <ShieldCheck aria-hidden="true" />
            Manage access
          </Button>
          <ActionMenu
            label={`More actions for ${user.full_name}`}
            items={[
              {
                key: "reset-password",
                label: "Reset password",
                icon: <RotateCcw aria-hidden="true" />,
                disabled: preview || !canManageUsers || resetPasswordMutation.isPending,
                onSelect: () => resetPasswordForUser(user),
              },
              {
                key: "edit-scope",
                label: "Edit default role and scope",
                icon: <KeyRound aria-hidden="true" />,
                disabled: preview || !canManageUsers || updateUserAccessMutation.isPending,
                onSelect: () => openEditUserAccess(user),
              },
              {
                key: "toggle-access",
                label: user.is_active ? "Turn off sign-in" : "Turn on sign-in",
                icon: user.is_active ? <Lock aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />,
                disabled: preview || !canManageUsers || updateUserStatusMutation.isPending,
                onSelect: () => updateUserStatusMutation.mutate({ is_active: !user.is_active, user }),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  const roleColumns: TableColumn<RoleRead>[] = [
    {
      key: "role",
      header: "Role",
      value: (role) => role.label || role.name,
      render: (role) => (
        <div>
          <p className="font-medium">{role.label || normalizeRoleLabel(role.name)}</p>
          <p className="text-xs text-muted-foreground">{role.description || "Custom organization role"}</p>
        </div>
      ),
    },
    {
      key: "scope",
      header: "Default Scope",
      value: (role) => role.scope_type ?? "organization",
      render: (role) => <span className="capitalize">{(role.scope_type ?? "organization").replace("_", " ")}</span>,
    },
    { key: "permissions", header: "Permissions", value: (role) => String(role.permissions.length), render: (role) => <Badge tone="neutral">{role.permissions.length} permissions</Badge> },
    { key: "type", header: "Type", value: (role) => (role.is_system ? "system" : "custom"), render: (role) => <Badge tone={role.is_system ? "admin" : "success"}>{role.is_system ? "System" : "Custom"}</Badge> },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (role) => (
        <div className="flex justify-end">
          <Button disabled={preview || !canManageRoles} onClick={() => openEditRole(role)} size="sm" variant="secondary">
            <Pencil aria-hidden="true" />
            Edit permissions
          </Button>
        </div>
      ),
    },
  ];

  const teamColumns: TableColumn<TeamRead>[] = [
    {
      key: "team",
      header: "Team",
      value: (team) => `${team.name} ${team.code}`,
      render: (team) => (
        <div>
          <p className="font-medium">{team.name}</p>
          <p className="text-xs text-muted-foreground">{team.code}</p>
        </div>
      ),
    },
    { key: "type", header: "Type", value: (team) => team.team_type, render: (team) => <span className="capitalize">{team.team_type.replace("_", " ")}</span> },
    { key: "region", header: "Region", value: (team) => team.region ?? "", render: (team) => team.region ?? "All regions" },
    {
      key: "unit",
      header: "Organization Unit",
      value: (team) => units.find((unit) => unit.id === team.organization_unit_id)?.name ?? "",
      render: (team) => {
        const unit = units.find((candidate) => candidate.id === team.organization_unit_id);
        return unit ? <span>{unit.name}</span> : <span className="text-xs text-muted-foreground">Not placed in hierarchy</span>;
      },
    },
    { key: "members", header: "Members", value: (team) => String(profiles.filter((profile) => profile.team_id === team.id).length), render: (team) => <Badge tone="neutral">{profiles.filter((profile) => profile.team_id === team.id).length} members</Badge> },
    { key: "status", header: "Status", value: (team) => (team.is_active ? "active" : "inactive"), render: (team) => <Badge tone={statusTone(team.is_active)}>{team.is_active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (team) => (
        <div className="flex justify-end">
          <Button disabled={preview || !canManageTeams} onClick={() => openEditTeam(team)} size="sm" variant="secondary">
            <Pencil aria-hidden="true" />
            Edit
          </Button>
        </div>
      ),
    },
  ];

  const activityColumns: TableColumn<(typeof activityLogs)[number]>[] = [
    { key: "action", header: "Activity", value: (log) => log.action, render: (log) => <span className="font-medium">{log.action.replace(/\./g, " ")}</span> },
    { key: "user", header: "User", value: (log) => log.user_label ?? "", render: (log) => log.user_label ?? "System" },
    { key: "resource", header: "Resource", value: (log) => `${log.resource_type} ${log.resource_id}`, render: (log) => <span>{log.resource_type}</span> },
    { key: "status", header: "Status", value: (log) => log.status, render: (log) => <Badge tone={statusTone(log.status)}>{log.status}</Badge> },
    { key: "created", header: "Date", value: (log) => log.created_at, render: (log) => formatDateTime(log.created_at) },
  ];

  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-[#bec9bf]/45 bg-[#0c1f1b] p-4 text-white shadow-xl md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.22),transparent_34%),linear-gradient(135deg,rgba(0,82,50,0.84),rgba(12,31,27,0.96))]" />
        <div className="relative grid gap-5 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#93ecb8]">
                People mission control
              </span>
              <Badge tone={summary.permission_alerts ? "warning" : "success"}>
                {summary.permission_alerts ? `${summary.permission_alerts} access alert(s)` : "Access healthy"}
              </Badge>
              <HelpHint label="About" title="Users & Teams">
                Manage identities, roles, operational teams, organization structure, access boundaries, and user activity from one controlled workspace.
              </HelpHint>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Users & Teams</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              Control who can sign in, what roles they hold, which teams they belong to, and what operational data they can access.
            </p>
            <div className="mt-5 flex gap-2 overflow-x-auto product-scrollbar pb-1">
              {usersTeamsSections.map((section) => (
                <button
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    activeSection === section.id
                      ? "border-[#93ecb8] bg-[#93ecb8] text-[#0c1f1b]"
                      : "border-white/15 bg-white/8 text-white/78 hover:border-white/30 hover:bg-white/14",
                  )}
                  key={section.id}
                  onClick={() => selectSection(section.id)}
                  type="button"
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:justify-self-end">
            <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-4 backdrop-blur">
              <div className="flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="text-[#93ecb8]" size={18} />
                <p className="text-xs font-semibold uppercase tracking-wide text-white/58">Access readiness</p>
              </div>
              <p className="mt-2 text-2xl font-semibold">{summary.access_health_score}%</p>
              <p className="mt-1 text-xs text-white/58">{summary.pending_invitations} pending invitation(s)</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-4 backdrop-blur">
              <div className="flex items-center gap-2">
                <Activity aria-hidden="true" className="text-[#93ecb8]" size={18} />
                <p className="text-xs font-semibold uppercase tracking-wide text-white/58">Live activity</p>
              </div>
              <p className="mt-2 text-2xl font-semibold">{summary.active_sessions || sessions.length}</p>
              <p className="mt-1 text-xs text-white/58">{summary.recent_activity} audit event(s)</p>
            </div>
            <Button disabled={!canManageUsers || !roleOptions.length} onClick={openCreateUserModal} variant="primary">
              <Plus aria-hidden="true" />
              Create user
            </Button>
            <Button onClick={() => setModalMode("access-test")} variant="secondary">
              <SearchCheck aria-hidden="true" />
              Test access
            </Button>
          </div>
        </div>
      </div>

      {selectedRoleProfileUser ? (
        <RoleSpecificProfileWorkspace
          activityLogs={activityLogs}
          canManage={canManageUsers}
          catalog={catalog}
          fieldOfficerDetail={fieldOfficerDetail}
          onClose={closeRoleProfile}
          onOpenAccess={() => openEditUserAccess(selectedRoleProfileUser)}
          onOpenRoles={() => openRoleAssignments(selectedRoleProfileUser)}
          onResetPassword={() => resetPasswordForUser(selectedRoleProfileUser)}
          onSelectProfile={setSelectedRoleProfileType}
          onToggleStatus={() => updateUserStatusMutation.mutate({ is_active: !selectedRoleProfileUser.is_active, user: selectedRoleProfileUser })}
          profile={selectedRoleProfile}
          profiles={selectedRoleProfileProfiles}
          projects={projects}
          resettingPassword={resetPasswordMutation.isPending}
          roles={roles}
          sessions={sessions}
          teams={teams}
          togglingStatus={updateUserStatusMutation.isPending}
          user={selectedRoleProfileUser}
          users={users}
          workforceProfile={profileForUser(profiles, selectedRoleProfileUser.id)}
        />
      ) : null}

      {!selectedRoleProfileUser && activeSection === "dashboard" ? (
        <DashboardSection
          activeSessions={sessions.length}
          organizationName={organizationQuery.data?.name ?? principal?.organization_name ?? "Organization workspace"}
          organizationSummary={organizationSummary}
          roles={roles}
          summary={summary}
          teams={teams}
          users={users}
          onOpenSection={selectSection}
        />
      ) : null}

      {!selectedRoleProfileUser && activeSection === "users" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => downloadCsv("atlas-users.csv", users.map((user) => ({ email: user.email, full_name: user.full_name, role: user.role_name ?? "", status: user.is_active ? "active" : "inactive", scope: user.scope_type ?? "" })))} variant="secondary">
              <Download aria-hidden="true" />
              Export
            </Button>
            <Button disabled={preview || !canManageUsers} onClick={() => setModalMode("import-users")} variant="secondary">
              <FileUp aria-hidden="true" />
              Import CSV
            </Button>
            <Button disabled={!canManageUsers || !roleOptions.length} onClick={openCreateUserModal} variant="primary">
              <Plus aria-hidden="true" />
              Create user
            </Button>
          </div>
          <DataTable columns={userColumns} emptyLabel="No users have been created yet" rows={users} searchLabel="Search users, email, role, team" title="Users" />
        </section>
      ) : null}

      {!selectedRoleProfileUser && activeSection === "roles" ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <Button disabled={preview || !canManageRoles} onClick={() => setModalMode("role")} variant="primary">
              <Plus aria-hidden="true" />
              Create role
            </Button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto product-scrollbar">
            {rolesTabViews.map((view) => (
              <button
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  rolesView === view.id ? "border-primary bg-primary text-primary-foreground" : "bg-surface-container-lowest hover:bg-muted",
                )}
                key={view.id}
                onClick={() => setRolesView(view.id)}
                type="button"
              >
                {view.label}
              </button>
            ))}
          </div>
          {rolesView === "list" ? (
            <DataTable columns={roleColumns} emptyLabel="No roles have been configured yet" rows={roles} searchLabel="Search roles or permissions" title="Roles" />
          ) : null}
          {rolesView === "architecture" ? <RoleArchitecturePanel catalog={catalog.roles} /> : null}
          {rolesView === "matrix" ? <PermissionMatrix groups={permissionGroups} roles={roles} /> : null}
        </section>
      ) : null}

      {!selectedRoleProfileUser && activeSection === "teams" ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <Button disabled={preview || !canManageTeams} onClick={() => setModalMode("team")} variant="primary">
              <Plus aria-hidden="true" />
              Create team
            </Button>
          </div>
          <DataTable columns={teamColumns} emptyLabel="No operational teams have been created yet" rows={teams} searchLabel="Search teams, regions, project, lead" title="Teams" />
        </section>
      ) : null}

      {!selectedRoleProfileUser && activeSection === "organizations" ? (
        <OrganizationsSection
          onOpenSection={selectSection}
          organizationName={organizationQuery.data?.name ?? principal?.organization_name ?? "Organization workspace"}
          profiles={profiles}
          summary={summary}
          teams={teams}
          units={units}
          users={users}
        />
      ) : null}

      {!selectedRoleProfileUser && activeSection === "permissions" ? (
        <PermissionsSection
          catalog={catalog}
          catalogGroups={permissionGroups}
          onOpenAccessTest={() => setModalMode("access-test")}
          onOpenUserProfile={openRoleProfile}
          roles={roles}
          users={users}
        />
      ) : null}

      {!selectedRoleProfileUser && activeSection === "activity-logs" ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => downloadCsv("atlas-user-activity.csv", activityLogs.map((log) => ({ action: log.action, user: log.user_label ?? "System", resource: log.resource_type, status: log.status, created_at: log.created_at })))} variant="secondary">
              <Download aria-hidden="true" />
              Export
            </Button>
          </div>
          <DataTable columns={activityColumns} emptyLabel="No identity or access activity has been recorded yet" rows={activityLogs} searchLabel="Search activity, user, status" title="Recent Activity" />
        </section>
      ) : null}

      <CreateUserModal
        canSubmit={canManageUsers && Boolean(roleOptions.length) && !createUserMutation.isPending}
        canManageRoles={canManageRoles}
        draft={userDraft}
        onChange={setUserDraft}
        onCreateCustomRole={() => {
          setRoleDraft(defaultRoleDraft);
          setModalMode("role");
        }}
        onSubmit={submitUser}
        onOpenChange={(open) => setModalMode(open ? "user" : null)}
        open={modalMode === "user"}
        projects={projects}
        roleCatalogByName={roleCatalogByName}
        roleOptions={roleOptions}
        saving={createUserMutation.isPending}
        units={units}
      />
      <EditUserAccessModal
        canSubmit={!preview && canManageUsers && Boolean(accessEditDraft.user) && !updateUserAccessMutation.isPending}
        draft={accessEditDraft}
        onChange={setAccessEditDraft}
        onOpenChange={(open) => setModalMode(open ? "edit-user" : null)}
        onSubmit={() => updateUserAccessMutation.mutate()}
        open={modalMode === "edit-user"}
        projects={projects}
        roleCatalogByName={roleCatalogByName}
        roleOptions={roleOptions}
        saving={updateUserAccessMutation.isPending}
        teams={teams}
        units={units}
        users={users}
      />
      <RoleAssignmentsModal
        canSubmit={!preview && canManageUsers && Boolean(roleAssignmentDraft.user) && !saveRoleAssignmentMutation.isPending}
        canManage={canManageUsers}
        draft={roleAssignmentDraft}
        onChange={setRoleAssignmentDraft}
        onDeactivate={(assignment, user) => deactivateRoleAssignmentMutation.mutate({ assignment, user })}
        onEdit={editRoleAssignment}
        onOpenDefaultAccess={() => roleAssignmentDraft.user && openEditUserAccess(roleAssignmentDraft.user)}
        onOpenChange={(open) => setModalMode(open ? "role-assignment" : null)}
        onResetPassword={() => roleAssignmentDraft.user && resetPasswordForUser(roleAssignmentDraft.user)}
        onSubmit={() => saveRoleAssignmentMutation.mutate()}
        onToggleStatus={() =>
          roleAssignmentDraft.user &&
          updateUserStatusMutation.mutate({ is_active: !roleAssignmentDraft.user.is_active, user: roleAssignmentDraft.user })
        }
        open={modalMode === "role-assignment"}
        projects={projects}
        resettingPassword={resetPasswordMutation.isPending}
        roleCatalogByName={roleCatalogByName}
        roleOptions={roleOptions}
        saving={saveRoleAssignmentMutation.isPending}
        teams={teams}
        togglingStatus={updateUserStatusMutation.isPending}
        units={units}
      />
      <ImportUsersModal
        canSubmit={!preview && canManageUsers && Boolean(selectedImportFile) && !importUsersMutation.isPending}
        file={selectedImportFile}
        onFileChange={setSelectedImportFile}
        onOpenChange={(open) => setModalMode(open ? "import-users" : null)}
        onSubmit={() => importUsersMutation.mutate()}
        open={modalMode === "import-users"}
      />
      <CreateTeamModal
        canSubmit={!preview && canManageTeams && Boolean(teamDraft.name.trim()) && !createTeamMutation.isPending}
        draft={teamDraft}
        onChange={setTeamDraft}
        onOpenChange={(open) => setModalMode(open ? "team" : null)}
        onSubmit={() => createTeamMutation.mutate()}
        open={modalMode === "team"}
        units={units}
        users={users}
      />
      <EditTeamModal
        canSubmit={!preview && canManageTeams && Boolean(editTeamDraft.name.trim()) && !updateTeamMutation.isPending}
        draft={editTeamDraft}
        onChange={setEditTeamDraft}
        onOpenChange={(open) => setModalMode(open ? "edit-team" : null)}
        onSubmit={() => updateTeamMutation.mutate()}
        open={modalMode === "edit-team"}
        units={units}
        users={users}
      />
      <CreateRoleModal
        canSubmit={!preview && canManageRoles && Boolean(roleDraft.name && roleDraft.permissions.length) && !createRoleMutation.isPending}
        draft={roleDraft}
        groups={permissionGroups}
        onChange={setRoleDraft}
        onOpenChange={(open) => setModalMode(open ? "role" : null)}
        onSubmit={() => createRoleMutation.mutate()}
        open={modalMode === "role"}
      />
      <EditRoleModal
        canSubmit={!preview && canManageRoles && !updateRoleMutation.isPending}
        draft={editRoleDraft}
        groups={permissionGroups}
        onChange={setEditRoleDraft}
        onOpenChange={(open) => {
          if (!open) {
            setModalMode(null);
            setEditRoleDraft(null);
          }
        }}
        onReset={() => editRoleDraft && resetRoleMutation.mutate(editRoleDraft.id)}
        onSubmit={() => updateRoleMutation.mutate()}
        open={modalMode === "edit-role"}
        resetting={resetRoleMutation.isPending}
        saving={updateRoleMutation.isPending}
      />
      <AccessTestModal
        canSubmit={!preview && Boolean(accessDraft.user_id && accessDraft.permission) && !simulateAccessMutation.isPending}
        draft={accessDraft}
        groups={permissionGroups}
        onChange={(next) => {
          setAccessDraft(next);
          setAccessResult(null);
        }}
        onOpenChange={(open) => setModalMode(open ? "access-test" : null)}
        onSubmit={() => simulateAccessMutation.mutate()}
        open={modalMode === "access-test"}
        result={preview ? { allowed: true, decision: "allow", matched_roles: ["regional_manager"], matched_scope: "region", reasons: ["Preview mode uses sample access evaluation."] } : accessResult}
        users={users}
      />
      <PasswordResultModal result={passwordResult} onClose={() => setPasswordResult(null)} />
    </section>
  );
}

function PasswordResultModal({
  onClose,
  result,
}: {
  onClose: () => void;
  result: { name: string; password: string } | null;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal
      contentClassName="max-w-md"
      description="Share this one-time password securely. The user must change it at first sign-in."
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false);
          onClose();
        }
      }}
      open={Boolean(result)}
      title="Temporary password created"
    >
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          A new temporary password was generated for <span className="font-semibold text-foreground">{result?.name}</span>. It is shown only once.
        </p>
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2.5">
          <code className="select-all break-all font-mono text-sm font-semibold">{result?.password}</code>
          <Button
            onClick={() => {
              void navigator.clipboard?.writeText(result?.password ?? "");
              setCopied(true);
            }}
            size="sm"
            variant="secondary"
          >
            {copied ? <CheckCircle2 aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose} variant="primary">Done</Button>
        </div>
      </div>
    </Modal>
  );
}

function roleProfileGuidance(profileType?: string | null): {
  focus: string;
  priorityActions: string[];
  qualityControls: string[];
  governanceControls: string[];
  mobileReadiness: string[];
} {
  const type = profileType ?? "custom";
  if (type === "district_supervisor" || type === "regional_manager") {
    return {
      focus: "Supervision, team coverage, visit approval, field movement verification, sync risk, and returned submission follow-up.",
      priorityActions: ["Assign field officers to clear locations and projects", "Review visit requests before field movement", "Check late syncs and returned submissions daily", "Escalate GPS or duplicate concerns to Data Quality"],
      qualityControls: ["Monitor submissions completed too quickly", "Review static GPS and outside-area warnings", "Check repeated answers across field officers", "Return unclear records with specific correction notes"],
      governanceControls: ["Keep supervisor scope limited to assigned teams or locations", "Log reassignment and correction decisions", "Review account/device status before field deployment"],
      mobileReadiness: ["Confirm team devices are active", "Require sync before and after field visits", "Verify assigned forms and beneficiaries are downloaded"],
    };
  }
  if (type === "me_manager") {
    return {
      focus: "M&E design, indicator linkage, approval rules, data quality, reporting readiness, and donor evidence.",
      priorityActions: ["Approve form readiness before publishing", "Review pending submissions before they count", "Check indicator mappings and disaggregation", "Use reconciliation queues before reporting"],
      qualityControls: ["Review missing values, outliers, duplicate beneficiaries, and invalid GPS", "Confirm baseline and monitoring frequency rules", "Check completeness score by project and form"],
      governanceControls: ["Only approved data should update indicators and beneficiaries", "Require change requests for locked approved data", "Audit exports and report freezes"],
      mobileReadiness: ["Confirm mobile forms are compatible before assignment", "Ensure reference data and prefill rules are included in bootstrap"],
    };
  }
  if (type === "project_manager") {
    return {
      focus: "Project delivery, beneficiary coverage, assignments, field officer progress, deadlines, and operational blockers.",
      priorityActions: ["Review project health and assignment progress", "Ensure forms are attached to active projects", "Track beneficiaries reached versus targets", "Resolve overdue assignments with supervisors"],
      qualityControls: ["Check coverage gaps by location and team", "Monitor rejected or returned project submissions", "Review beneficiary profile conflicts before decisions"],
      governanceControls: ["Keep project access scoped to the project", "Use approval workflow before reports and dashboards count records", "Document major project setup changes"],
      mobileReadiness: ["Confirm field officers see only project-approved forms", "Check assignment targets and deadlines before field launch"],
    };
  }
  if (type === "data_manager") {
    return {
      focus: "Submission review, import quality, data cleaning, duplicate resolution, safe edits, exports, and official data protection.",
      priorityActions: ["Review pending submissions and import issues", "Resolve duplicates and unlinked records", "Approve profile update proposals where allowed", "Prepare governed exports only from approved data"],
      qualityControls: ["Run missing data, duplicate, outlier, GPS, and consistency checks", "Keep import and field-submitted data traceable", "Review every edit reason before saving official data"],
      governanceControls: ["Lock approved data and use change history", "Log exports with filters and purpose", "Use retention and archiving rules for sensitive data"],
      mobileReadiness: ["Confirm failed sync records are retryable", "Check attachment upload failures and queue health"],
    };
  }
  return {
    focus: "Operational responsibility, correct access scope, clear team ownership, audit-ready activity, and safe platform use.",
    priorityActions: ["Review role and scope before assigning work", "Confirm team or project ownership", "Test access for sensitive permissions", "Keep account status current"],
    qualityControls: ["Use the least powerful role needed", "Review data quality alerts related to this role", "Escalate unclear responsibility boundaries"],
    governanceControls: ["Record role changes and reasons", "Avoid broad organization scope unless needed", "Review audit activity after sensitive changes"],
    mobileReadiness: ["Mobile access is only needed for field collection roles", "Confirm device and offline settings when the role uses the mobile app"],
  };
}

function RoleProfileSignal({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function RoleSpecificProfileWorkspace({
  activityLogs,
  canManage,
  catalog,
  fieldOfficerDetail,
  onClose,
  onOpenAccess,
  onOpenRoles,
  onResetPassword,
  onSelectProfile,
  onToggleStatus,
  profile,
  profiles,
  projects,
  resettingPassword,
  roles,
  sessions,
  teams,
  togglingStatus,
  user,
  users,
  workforceProfile,
}: {
  activityLogs: UsersTeamsActivityLogRead[];
  canManage: boolean;
  catalog: AccessCatalog;
  fieldOfficerDetail: FieldOfficerProfileDetailRead | null;
  onClose: () => void;
  onOpenAccess: () => void;
  onOpenRoles: () => void;
  onResetPassword: () => void;
  onSelectProfile: (profileType: string | null) => void;
  onToggleStatus: () => void;
  profile: UserOperationalProfileRead | null;
  profiles: UserOperationalProfileRead[];
  projects: { id: string; name: string; project_code: string }[];
  resettingPassword: boolean;
  roles: RoleRead[];
  sessions: SessionLogRead[];
  teams: TeamRead[];
  togglingStatus: boolean;
  user: UserRead;
  users: UserRead[];
  workforceProfile?: WorkforceProfileRead;
}) {
  const [tab, setTab] = useState<RoleProfileTab>("overview");
  const guidance = roleProfileGuidance(profile?.profile_type ?? user.role_name);
  const activeAssignments = (user.role_assignments ?? []).filter((assignment) => assignment.is_active);
  const currentAssignment = profile
    ? activeAssignments.find((assignment) => assignment.role_name === profile.profile_type)
    : activeAssignments[0];
  const project = projects.find((item) => item.id === (profile?.primary_project_id ?? currentAssignment?.project_id ?? user.project_id));
  const team = teams.find((item) => item.id === (profile?.primary_team_id ?? currentAssignment?.team_id ?? workforceProfile?.team_id));
  const supervisor = workforceProfile?.supervisor_user_id
    ? (users.find((candidate) => candidate.id === workforceProfile.supervisor_user_id)?.full_name ?? "Assigned in workforce profile")
    : "Not assigned";
  const scopeLabel = (currentAssignment?.scope_type ?? user.scope_type ?? "organization").replace(/_/g, " ");
  const roleLabel = profile?.display_name ?? normalizeRoleLabel(user.role_name);
  const userSessions = sessions.filter((session) => session.user_id === user.id);
  const userActivity = activityLogs.filter((log) => log.user_id === user.id || log.user_label === user.full_name);
  const profileOptions = profiles.length ? profiles : profilesForUser(user);
  const setupIssues = userSetupIssues(user, workforceProfile);
  const effectivePermissions = useMemo(
    () => [...permissionsForUser(user, roles, catalog)].sort(),
    [catalog, roles, user],
  );

  const assignmentRows = (user.role_assignments ?? []).map((assignment) => ({
    id: assignment.id,
    role: assignment.role_label || normalizeRoleLabel(assignment.role_name),
    scope: assignment.scope_type.replace(/_/g, " "),
    project: projects.find((item) => item.id === assignment.project_id)?.name ?? assignment.project_id ?? "Not restricted",
    geography: assignment.geography_id ?? "Not restricted",
    status: assignment.is_active ? "Active" : "Inactive",
  }));

  const assignmentColumns: TableColumn<(typeof assignmentRows)[number]>[] = [
    { key: "role", header: "Role", value: (row) => row.role, render: (row) => <span className="font-medium">{row.role}</span> },
    { key: "scope", header: "Scope", value: (row) => row.scope, render: (row) => <span className="capitalize">{row.scope}</span> },
    { key: "project", header: "Project", value: (row) => row.project, render: (row) => row.project },
    { key: "geography", header: "Location", value: (row) => row.geography, render: (row) => row.geography },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
  ];

  const activityColumns: TableColumn<UsersTeamsActivityLogRead>[] = [
    { key: "action", header: "Action", value: (row) => row.action, render: (row) => <span className="font-medium">{row.action.replaceAll(".", " ")}</span> },
    { key: "resource", header: "Resource", value: (row) => row.resource_type, render: (row) => row.resource_type },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "date", header: "Date", value: (row) => row.created_at, render: (row) => formatDateTime(row.created_at) },
  ];

  const sessionRows = userSessions.map((session) => ({
    id: session.id,
    device: session.device_id ?? "Unknown device",
    location: session.location_hint ?? session.ip_address ?? "Unknown",
    status: session.status,
    started: session.created_at,
  }));
  const sessionColumns: TableColumn<(typeof sessionRows)[number]>[] = [
    { key: "device", header: "Device", value: (row) => row.device, render: (row) => <span className="font-medium">{row.device}</span> },
    { key: "location", header: "Location / IP", value: (row) => row.location, render: (row) => row.location },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "started", header: "Started", value: (row) => row.started, render: (row) => formatDateTime(row.started) },
  ];

  // Login & device data comes from the field-officer profile when this user is an officer.
  const security = fieldOfficerDetail?.security ?? null;
  const qrPayload = security?.mobile_qr_login_payload ?? null;
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrCopied, setQrCopied] = useState(false);
  useEffect(() => {
    setQrCopied(false);
    if (!qrPayload) {
      setQrImageUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(qrPayload, { margin: 1, width: 220 })
      .then((url) => {
        if (!cancelled) setQrImageUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrImageUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [qrPayload]);
  const officerPermissions = fieldOfficerDetail?.permissions ?? [];
  const devices = fieldOfficerDetail?.devices ?? [];

  return (
    <section className="space-y-4">
      {/* Header: identity, status, and every primary action in one expected place */}
      <div className="overflow-hidden rounded-2xl border bg-surface-container-lowest shadow-line">
        <div className="bg-gradient-to-r from-primary/12 via-primary/[0.06] to-transparent p-4">
          <button
            className="mb-3 inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={14} />
            Back to all users
          </button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3.5">
              <span
                className={cn(
                  "grid size-14 shrink-0 place-items-center rounded-2xl text-base font-semibold text-primary-foreground shadow-sm",
                  user.is_active ? "bg-primary" : "bg-muted-foreground",
                )}
              >
                {initials(user.full_name)}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight">{user.full_name}</h2>
                  <Badge tone={user.is_active ? "success" : "danger"}>{user.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone="accent">{roleLabel}</Badge>
                  <Badge tone="neutral"><ShieldCheck aria-hidden="true" className="mr-1 size-3" />{scopeLabel} scope</Badge>
                  <Badge tone="support"><UsersRound aria-hidden="true" className="mr-1 size-3" />{team?.name ?? teamName(teams, workforceProfile?.team_id)}</Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button disabled={!canManage} onClick={onOpenAccess} variant="primary">
                <Pencil aria-hidden="true" />
                Edit user
              </Button>
              <Button disabled={!canManage} onClick={onOpenRoles} variant="secondary">
                <ShieldCheck aria-hidden="true" />
                Manage roles
              </Button>
              <Button disabled={!canManage || resettingPassword} onClick={onResetPassword} variant="secondary">
                <RotateCcw aria-hidden="true" />
                Reset password
              </Button>
              <Button disabled={!canManage || togglingStatus} onClick={onToggleStatus} variant={user.is_active ? "danger" : "primary"}>
                {user.is_active ? <Lock aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                {user.is_active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
          {profileOptions.length > 1 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Profiles:</span>
              {profileOptions.map((item) => (
                <button
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                    profile?.profile_type === item.profile_type ? "border-primary bg-primary text-primary-foreground" : "bg-background/80 hover:bg-muted",
                  )}
                  key={item.id}
                  onClick={() => onSelectProfile(item.profile_type)}
                  type="button"
                >
                  {item.display_name.replace(" Profile", "")}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2 overflow-x-auto border-t bg-muted/20 px-3 py-2.5 product-scrollbar">
          {roleProfileTabs.map((item) => (
            <button
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                tab === item.id ? "border-primary bg-primary text-primary-foreground" : "bg-surface-container-lowest hover:bg-muted",
              )}
              key={item.id}
              onClick={() => setTab(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Setup banner: surfaces what is still required to operate, with a one-click fix */}
      {setupIssues.length ? (
        <div className="flex flex-col gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-semibold">Setup needs attention</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{setupIssues.join(" · ")}</p>
            </div>
          </div>
          {canManage ? (
            <Button onClick={onOpenAccess} size="sm" variant="secondary">
              <Pencil aria-hidden="true" />
              Fix setup
            </Button>
          ) : null}
        </div>
      ) : null}

      {tab === "overview" ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ProfileFactCard icon={ShieldCheck} label="Role" value={roleLabel} hint="What this person does on the platform" />
            <ProfileFactCard icon={KeyRound} label="Access scope" value={scopeLabel} hint="Determines what data this user can see" />
            <ProfileFactCard icon={Building2} label="Project" value={project?.name ?? user.project_id ?? "Not restricted"} hint="Active project context" />
            <ProfileFactCard icon={UsersRound} label="Team" value={team?.name ?? teamName(teams, workforceProfile?.team_id)} hint={team?.team_type?.replace(/_/g, " ") ?? "No team type"} />
            <ProfileFactCard icon={UserCog} label="Supervisor" value={supervisor} hint="Reports to" />
            <ProfileFactCard icon={Briefcase} label="Job title" value={workforceProfile?.job_title ?? roleLabel} hint={workforceProfile?.employee_code ? `Employee ${workforceProfile.employee_code}` : "No employee code"} />
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-3.5 shadow-card">
              <div className="flex items-center gap-2">
                <Sparkles aria-hidden="true" className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">What this user should focus on</h3>
              </div>
              <div className="mt-3 space-y-2">
                {guidance.priorityActions.map((item) => (
                  <div className="flex gap-2 rounded-lg border bg-background p-2.5 text-sm" key={item}>
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-3.5 shadow-card">
              <h3 className="text-sm font-semibold">At a glance</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <RoleProfileSignal label="Active role assignments" value={activeAssignments.length} />
                <RoleProfileSignal label="Effective permissions" value={effectivePermissions.length} />
                <RoleProfileSignal label="Active sessions" value={userSessions.length} />
                <RoleProfileSignal label="Recent activity" value={userActivity.length} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "access" ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-3.5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Default role &amp; scope</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">The primary access this account signs in with.</p>
              </div>
              {canManage ? (
                <Button onClick={onOpenAccess} size="sm" variant="secondary">
                  <KeyRound aria-hidden="true" />
                  Edit role &amp; scope
                </Button>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <RoleProfileSignal label="Role" value={roleLabel} />
              <RoleProfileSignal label="Scope" value={<span className="capitalize">{scopeLabel}</span>} />
              <RoleProfileSignal label="Location" value={user.geography_id ?? currentAssignment?.geography_id ?? "Not restricted"} />
              <RoleProfileSignal label="Project" value={project?.name ?? user.project_id ?? "Not restricted"} />
            </div>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-3.5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Role assignments</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Additional scoped roles layered on top of the default access.</p>
              </div>
              {canManage ? (
                <Button onClick={onOpenRoles} size="sm" variant="secondary">
                  <ShieldCheck aria-hidden="true" />
                  Manage roles
                </Button>
              ) : null}
            </div>
            <div className="mt-3">
              <DataTable columns={assignmentColumns} emptyLabel="Only the default role applies. Use Manage roles to add scoped access." rows={assignmentRows} searchLabel="Search role scope" title="Assigned roles" />
            </div>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-3.5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Permissions</h3>
                <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
                  Permissions are granted by the roles above — add or remove a role to change what this user can do. {effectivePermissions.length} permission(s) are currently active.
                </p>
              </div>
              {canManage ? (
                <Button onClick={onOpenRoles} size="sm" variant="secondary">
                  <ShieldCheck aria-hidden="true" />
                  Change via roles
                </Button>
              ) : null}
            </div>
            {officerPermissions.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {officerPermissions.map((permission) => (
                  <div className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2" key={permission.key}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{permission.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{permission.source}</p>
                    </div>
                    <Badge tone={permission.enabled ? "success" : "neutral"}>{permission.enabled ? "Allowed" : "Off"}</Badge>
                  </div>
                ))}
              </div>
            ) : effectivePermissions.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {effectivePermissions.map((permission) => (
                  <Badge key={permission} tone="neutral">{permission}</Badge>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No permissions resolved yet. Assign a role with permissions to grant access.</p>
            )}
          </div>
        </div>
      ) : null}

      {tab === "team" ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-3.5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Team &amp; workforce</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Where this person sits operationally and who they report to.</p>
              </div>
              {canManage ? (
                <Button onClick={onOpenAccess} size="sm" variant="secondary">
                  <UsersRound aria-hidden="true" />
                  Assign team &amp; supervisor
                </Button>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ProfileFactCard icon={UsersRound} label="Team" value={team?.name ?? "Unassigned"} hint={team?.team_type?.replace(/_/g, " ") ?? "No team type"} />
              <ProfileFactCard icon={MapPin} label="Region" value={team?.region ?? profile?.primary_geography_id ?? currentAssignment?.geography_id ?? "Not restricted"} hint="Operating area" />
              <ProfileFactCard icon={UserCog} label="Supervisor" value={supervisor} hint="Reports to" />
              <ProfileFactCard icon={Briefcase} label="Job title" value={workforceProfile?.job_title ?? roleLabel} hint="Workforce role" />
              <RoleProfileSignal label="Employee code" value={workforceProfile?.employee_code ?? "Not set"} />
              <RoleProfileSignal label="Clearance" value={workforceProfile?.clearance_level ?? "Not set"} />
              <RoleProfileSignal label="Performance score" value={workforceProfile?.performance_score ?? "Not measured"} />
              <RoleProfileSignal label="Lifecycle" value={workforceProfile?.lifecycle_status ?? "Active"} />
            </div>
          </div>
        </div>
      ) : null}

      {tab === "login" ? (
        <div className="space-y-3">
          {/* Credentials & password */}
          <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-3.5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Sign-in credentials</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">How this person signs in, and the controls to manage their access.</p>
              </div>
              {canManage ? (
                <Button disabled={resettingPassword} onClick={onResetPassword} size="sm" variant="secondary">
                  <RotateCcw aria-hidden="true" />
                  Reset password
                </Button>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ProfileFactCard icon={KeyRound} label="Username" value={security?.username ?? user.email} hint="Used to sign in" />
              <ProfileFactCard icon={ShieldCheck} label="Account status" value={security?.account_status ?? (user.is_active ? "Active" : "Inactive")} hint="Sign-in availability" />
              <RoleProfileSignal label="Last login" value={security?.last_login_at ? formatDateTime(security.last_login_at) : "Never"} />
              <RoleProfileSignal label="Password changed" value={security?.password_last_changed_at ? formatDateTime(security.password_last_changed_at) : "Never"} />
              <RoleProfileSignal label="Temporary password" value={security?.temporary_password_issued ? "Pending first sign-in" : "Not pending"} />
              <RoleProfileSignal label="Failed sign-ins" value={security?.failed_login_attempts ?? 0} />
            </div>
          </div>

          {/* Mobile QR login (field officers) */}
          <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-3.5 shadow-card">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <QrCode aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">Mobile app login (QR code)</h3>
                <p className="mt-0.5 max-w-2xl text-xs leading-5 text-muted-foreground">
                  Field officers scan this from the Atlas FieldOps app instead of typing a password. It never contains the password and stops working after a password reset, suspension, or deactivation.
                </p>
              </div>
            </div>
            {qrPayload ? (
              <div className="mt-3 flex flex-col gap-4 rounded-xl border bg-muted/20 p-3.5 sm:flex-row sm:items-center">
                {qrImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={`Mobile login QR for ${user.full_name}`} className="size-44 shrink-0 rounded-lg border bg-white p-2" src={qrImageUrl} />
                ) : (
                  <div className="flex size-44 shrink-0 items-center justify-center rounded-lg border bg-surface-container-lowest text-center text-xs text-muted-foreground">Generating QR…</div>
                )}
                <div className="min-w-0 space-y-2 text-sm">
                  <Badge tone={security?.mobile_qr_login_enabled ? "success" : "warning"}>
                    {security?.mobile_qr_login_enabled ? "Ready for mobile login" : "QR login unavailable"}
                  </Badge>
                  <p className="text-muted-foreground">In the app, choose <span className="font-medium text-foreground">Scan QR code</span> and point the camera here. If scanning isn&apos;t possible, reset the password and share temporary credentials instead.</p>
                  <Button
                    onClick={() => {
                      void navigator.clipboard?.writeText(qrPayload);
                      setQrCopied(true);
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    {qrCopied ? <CheckCircle2 aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    {qrCopied ? "Copied" : "Copy QR token"}
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyMini
                className="mt-3"
                icon={QrCode}
                label={
                  fieldOfficerDetail
                    ? "QR login appears once the officer account, membership, and field officer profile are all active."
                    : "Mobile QR login is available for field officers. This user does not have a field officer profile."
                }
              />
            )}
          </div>

          {/* Devices */}
          <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-3.5 shadow-card">
            <h3 className="text-sm font-semibold">Registered devices</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Phones and tablets this person has signed in from.</p>
            {devices.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {devices.map((device, index) => (
                  <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2" key={device.device_id ?? index}>
                    <Smartphone aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{device.device_id ?? "Unknown device"}</p>
                      <p className="truncate text-xs text-muted-foreground">Last sync {device.last_sync_at ? formatDateTime(device.last_sync_at) : "never"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No devices registered yet.</p>
            )}
          </div>
        </div>
      ) : null}

      {tab === "activity" ? (
        <div className="space-y-3">
          <DataTable columns={sessionColumns} emptyLabel="No active or recent sessions for this user." rows={sessionRows} searchLabel="Search sessions" title="Sessions" />
          <DataTable columns={activityColumns} emptyLabel="No recent activity for this user." rows={userActivity} searchLabel="Search activity" title="Recent activity" />
        </div>
      ) : null}
    </section>
  );
}

function ProfileFactCard({
  hint,
  icon: Icon,
  label,
  value,
}: {
  hint?: string;
  icon: typeof UsersRound;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5 text-primary/70" />
        {label}
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold capitalize" title={typeof value === "string" ? value : undefined}>{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DashboardSection({
  activeSessions,
  organizationName,
  organizationSummary,
  roles,
  summary,
  teams,
  users,
  onOpenSection,
}: {
  activeSessions: number;
  organizationName: string;
  organizationSummary: { governance_score: number; pending_access_requests: number; high_risk_sessions: number; attention_items: string[] };
  roles: RoleRead[];
  summary: UsersTeamsSummaryRead;
  teams: TeamRead[];
  users: UserRead[];
  onOpenSection: (section: UsersTeamsSection) => void;
}) {
  const cards = [
    { icon: UsersRound, label: "Total Users", value: summary.total_users, tone: "support" as const },
    { icon: CheckCircle2, label: "Active Users", value: summary.active_users, tone: "success" as const },
    { icon: Lock, label: "Locked Accounts", value: summary.locked_accounts, tone: summary.locked_accounts ? "danger" as const : "neutral" as const },
    { icon: ShieldCheck, label: "Roles", value: summary.roles, tone: "admin" as const },
    { icon: UserCog, label: "Teams", value: summary.teams, tone: "operate" as const },
    { icon: Activity, label: "Active Sessions", value: summary.active_sessions || activeSessions, tone: "daily" as const },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => (
          <button
            className="group rounded-2xl border border-[#bec9bf]/45 bg-white p-4 text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#005232]/45 hover:shadow-md"
            key={card.label}
            onClick={() => onOpenSection(card.label === "Active Sessions" ? "activity-logs" : "users")}
            type="button"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e7f7f1] text-[#005232] transition duration-300 group-hover:bg-[#005232] group-hover:text-white">
              <card.icon aria-hidden="true" size={21} />
            </span>
            <p className="mt-4 text-2xl font-bold tracking-tight text-[#101e1a]">{card.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#3f4942]/70">{card.label}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className={`${missionPanelClass} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#101e1a]">Access health</h2>
              <p className="mt-1 text-sm text-[#3f4942]/75">{organizationName} workforce and access readiness.</p>
            </div>
            <Badge tone={summary.access_health_score >= 80 ? "success" : "warning"}>{summary.access_health_score}% ready</Badge>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Signal label="Role coverage" value={`${roles.length} roles`} />
            <Signal label="Team structure" value={`${teams.length} teams`} />
            <Signal label="User activity" value={`${users.filter((user) => user.is_active).length} active`} />
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#d6e6e0]">
            <div className="h-full rounded-full bg-[#005232]" style={{ width: `${summary.access_health_score}%` }} />
          </div>
        </div>
        <div className={`${missionPanelClass} p-5`}>
          <h2 className="text-base font-semibold text-[#101e1a]">Permission alerts</h2>
          <div className="mt-4 space-y-3">
            <AlertRow label="Pending access requests" value={organizationSummary.pending_access_requests} />
            <AlertRow label="High risk sessions" value={organizationSummary.high_risk_sessions} />
            <AlertRow label="Governance score" value={`${organizationSummary.governance_score}%`} />
          </div>
          <div className="mt-4 rounded-xl border border-[#bec9bf]/30 bg-[#f6fbf8] p-3 text-sm text-[#3f4942]">
            {organizationSummary.attention_items[0] ?? "No immediate People-domain actions are waiting."}
          </div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <InsightCard icon={UsersRound} title="Team distribution" items={teams.slice(0, 4).map((team) => `${team.name} · ${team.region ?? "All regions"}`)} />
        <InsightCard icon={ShieldCheck} title="Role distribution" items={roles.slice(0, 4).map((role) => `${role.label || normalizeRoleLabel(role.name)} · ${role.permissions.length} permissions`)} />
        <InsightCard icon={Sparkles} title="Recent user activity" items={[`${summary.recent_activity} audit events`, `${summary.pending_invitations} pending invitation(s)`, `${summary.inactive_users} inactive account(s)`]} />
      </div>
    </div>
  );
}

function AccessCenterSection({
  accessCenterTab,
  canManageRoles,
  canManageTeams,
  canManageUsers,
  catalog,
  onCreateRole,
  onCreateTeam,
  onCreateUser,
  onEditTeam,
  onOpenDefaultAccess,
  onOpenAccessTest,
  onOpenOrganizations,
  onOpenRoleAssignments,
  onOpenRoleProfile,
  onToggleUserStatus,
  onSetAccessCenterTab,
  permissionGroups,
  preview,
  profiles,
  roles,
  teams,
  users,
}: {
  accessCenterTab: AccessCenterTab;
  canManageRoles: boolean;
  canManageTeams: boolean;
  canManageUsers: boolean;
  catalog: AccessCatalog;
  onCreateRole: () => void;
  onCreateTeam: () => void;
  onCreateUser: () => void;
  onEditTeam: (team: TeamRead) => void;
  onOpenDefaultAccess: (user: UserRead) => void;
  onOpenAccessTest: () => void;
  onOpenOrganizations: () => void;
  onOpenRoleAssignments: (user: UserRead) => void;
  onOpenRoleProfile: (user: UserRead) => void;
  onToggleUserStatus: (user: UserRead) => void;
  onSetAccessCenterTab: (tab: AccessCenterTab) => void;
  permissionGroups: ReturnType<typeof groupPermissions>;
  preview: boolean;
  profiles: WorkforceProfileRead[];
  roles: RoleRead[];
  teams: TeamRead[];
  users: UserRead[];
}) {
  const [userSetupFilter, setUserSetupFilter] = useState<UserSetupFilter>("all");
  const userRows = users.map((user) => {
    const workforceProfile = profileForUser(profiles, user.id);
    const stackedRoles = (user.role_assignments ?? []).filter((assignment) => assignment.is_active);
    const assignmentTeamId = stackedRoles.find((assignment) => assignment.team_id)?.team_id;
    const issues = userSetupIssues(user, workforceProfile);
    return {
      access: stackedRoles.length > 1 ? `${stackedRoles.length} active roles` : normalizeRoleLabel(user.role_name),
      issues,
      scope: (user.scope_type ?? "organization").replace("_", " "),
      team: teamName(teams, workforceProfile?.team_id ?? assignmentTeamId),
      user,
    };
  });
  const filteredUserRows = userRows.filter((row) => matchesUserSetupFilter(row.issues, row.user.is_active, userSetupFilter));
  const usersNeedingSetup = userRows.filter((row) => row.issues.length).length;
  const readyUsers = userRows.filter((row) => !row.issues.length).length;
  const inactiveUsers = userRows.filter((row) => !row.user.is_active).length;
  const userColumns: TableColumn<(typeof userRows)[number]>[] = [
    {
      key: "user",
      header: "User",
      value: (row) => `${row.user.full_name} ${row.user.email}`,
      render: (row) => (
        <button className="text-left" onClick={() => onOpenRoleProfile(row.user)} type="button">
          <span className="block font-medium text-primary hover:underline">{row.user.full_name}</span>
          <span className="block text-xs text-muted-foreground">{row.user.email}</span>
        </button>
      ),
    },
    {
      key: "access",
      header: "Current Access",
      value: (row) => `${row.access} ${row.scope}`,
      render: (row) => (
        <div className="space-y-1">
          <Badge tone="accent">{row.access}</Badge>
          <p className="text-xs capitalize text-muted-foreground">{row.scope}</p>
        </div>
      ),
    },
    {
      key: "team",
      header: "Team",
      value: (row) => row.team,
      render: (row) => (
        <span className={cn("text-sm", row.team === "Unassigned" ? "text-muted-foreground" : "")}>
          {row.team}
        </span>
      ),
    },
    {
      key: "setup",
      header: "Setup",
      value: (row) => row.issues.join(" "),
      render: (row) =>
        row.issues.length ? (
          <div className="space-y-1">
            <Badge tone="warning">Needs setup</Badge>
            <p className="text-xs text-muted-foreground">{row.issues.slice(0, 2).join(" · ")}</p>
            <Button onClick={() => onOpenDefaultAccess(row.user)} size="sm" variant="ghost">
              <Pencil aria-hidden="true" />
              Fix setup
            </Button>
          </div>
        ) : (
          <Badge tone="success">Ready</Badge>
        ),
    },
    {
      key: "status",
      header: "Status",
      value: (row) => (row.user.is_active ? "active" : "inactive"),
      render: (row) => <Badge tone={statusTone(row.user.is_active)}>{row.user.is_active ? "Active" : "Inactive"}</Badge>,
    },
    {
      key: "actions",
      header: "Manage",
      align: "right",
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button disabled={preview || !canManageUsers} onClick={() => onOpenRoleAssignments(row.user)} size="sm" variant="secondary">
            <ShieldCheck aria-hidden="true" />
            Manage access
          </Button>
        </div>
      ),
    },
  ];

  const roleColumns: TableColumn<RoleRead>[] = [
    {
      key: "role",
      header: "Role",
      value: (role) => `${role.label || role.name} ${role.description ?? ""}`,
      render: (role) => (
        <div>
          <p className="font-medium">{role.label || normalizeRoleLabel(role.name)}</p>
          <p className="text-xs text-muted-foreground">{role.description || "Custom organization role"}</p>
        </div>
      ),
    },
    {
      key: "scope",
      header: "Default Scope",
      value: (role) => role.scope_type ?? "organization",
      render: (role) => <span className="capitalize">{(role.scope_type ?? "organization").replace("_", " ")}</span>,
    },
    {
      key: "permissions",
      header: "Permissions",
      value: (role) => String(role.permissions.length),
      render: (role) => <Badge tone="neutral">{role.permissions.length} permissions</Badge>,
    },
    {
      key: "type",
      header: "Type",
      value: (role) => (role.is_system ? "system" : "custom"),
      render: (role) => <Badge tone={role.is_system ? "admin" : "success"}>{role.is_system ? "System" : "Custom"}</Badge>,
    },
  ];

  const teamColumns: TableColumn<TeamRead>[] = [
    {
      key: "team",
      header: "Team",
      value: (team) => `${team.name} ${team.code}`,
      render: (team) => (
        <div>
          <p className="font-medium">{team.name}</p>
          <p className="text-xs text-muted-foreground">{team.code}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      value: (team) => team.team_type,
      render: (team) => <span className="capitalize">{team.team_type.replace("_", " ")}</span>,
    },
    {
      key: "region",
      header: "Region",
      value: (team) => team.region ?? "",
      render: (team) => team.region ?? "All regions",
    },
    {
      key: "members",
      header: "Members",
      value: (team) => String(profiles.filter((profile) => profile.team_id === team.id).length),
      render: (team) => <Badge tone="neutral">{profiles.filter((profile) => profile.team_id === team.id).length} members</Badge>,
    },
    {
      key: "status",
      header: "Status",
      value: (team) => (team.is_active ? "active" : "inactive"),
      render: (team) => <Badge tone={statusTone(team.is_active)}>{team.is_active ? "Active" : "Inactive"}</Badge>,
    },
    {
      key: "actions",
      header: "Manage",
      align: "right",
      render: (team) => (
        <Button disabled={preview || !canManageTeams} onClick={() => onEditTeam(team)} size="sm" variant="secondary">
          <Pencil aria-hidden="true" />
          Edit
        </Button>
      ),
    },
  ];

  const stepCards = [
    {
      id: "roles" as const,
      label: "1. Confirm role templates",
      note: "Define the permission bundle people can receive.",
      badge: `${roles.length}`,
    },
    {
      id: "teams" as const,
      label: "2. Organize teams",
      note: "Group staff by supervisor, function, or location.",
      badge: `${teams.length}`,
    },
    {
      id: "users" as const,
      label: "3. Assign people",
      note: "Create users and attach the right role and scope.",
      badge: `${users.length}`,
    },
    {
      id: "permissions" as const,
      label: "4. Verify access",
      note: "Check who can upload, clean, and review data.",
      badge: `${catalog.permissions.length}`,
    },
  ];

  const primaryAction =
    accessCenterTab === "users" ? (
      <div className="flex flex-wrap gap-2">
        <Button disabled={!canManageUsers} onClick={onCreateUser} variant="primary">
          <Plus aria-hidden="true" />
          Create user
        </Button>
      </div>
    ) : accessCenterTab === "roles" ? (
      <div className="flex flex-wrap gap-2">
        <Button disabled={preview || !canManageRoles} onClick={onCreateRole} variant="primary">
          <Plus aria-hidden="true" />
          Create role
        </Button>
      </div>
    ) : accessCenterTab === "teams" ? (
      <div className="flex flex-wrap gap-2">
        <Button disabled={preview || !canManageTeams} onClick={onCreateTeam} variant="primary">
          <Plus aria-hidden="true" />
          Create team
        </Button>
        <Button onClick={onOpenOrganizations} variant="secondary">
          <Building2 aria-hidden="true" />
          Open structure
        </Button>
      </div>
    ) : (
      <div className="flex flex-wrap gap-2">
        <Button onClick={onOpenAccessTest} variant="primary">
          <SearchCheck aria-hidden="true" />
          Test access
        </Button>
      </div>
    );

  return (
    <section className="space-y-5">
      <SectionHeader
        action={primaryAction}
        description="Everything a project owner needs for access, roles, teams, and permission checks is grouped here in one guided workspace."
        title="Access Center"
      />
      <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-4">
          <div className={`${missionPanelClass} p-4`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#101e1a]">Recommended order</h3>
              <Badge tone="support">Owner workflow</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {stepCards.map((step) => (
                <button
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition duration-200",
                    accessCenterTab === step.id
                      ? "border-[#005232] bg-[#e7f7f1]"
                      : "border-[#bec9bf]/35 bg-[#fafaf8] hover:border-[#005232]/40 hover:bg-[#f6fbf8]",
                  )}
                  key={step.id}
                  onClick={() => onSetAccessCenterTab(step.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#101e1a]">{step.label}</p>
                    <Badge tone={accessCenterTab === step.id ? "accent" : "neutral"}>{step.badge}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[#3f4942]/75">{step.note}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-[#bec9bf]/35 bg-[#0c1f1b] p-4 text-white shadow-sm">
            <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#06B6D4]/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <CheckCircle2 aria-hidden="true" className="text-[#93ecb8]" size={17} />
                <h3 className="text-sm font-semibold">Data integrity verified</h3>
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div className="flex items-end gap-1.5">
                  {[16, 28, 20, 12, 24].map((height, index) => (
                    <span className="w-1 rounded-full bg-[#93ecb8]" key={index} style={{ height }} />
                  ))}
                </div>
                <span className="font-mono text-[10px] font-semibold tracking-widest text-[#93ecb8]/70">ACCESS-READY</span>
              </div>
            </div>
          </div>
          <div className={`${missionSubtlePanelClass} p-4`}>
            <h3 className="text-sm font-semibold text-[#101e1a]">What to do here</h3>
            <div className="mt-3 space-y-2 text-sm text-[#3f4942]/78">
              <p>Roles decide what a person is allowed to do.</p>
              <p>Teams decide who works together and who supervises whom.</p>
              <p>Users receive the correct role and scope for their job.</p>
              <p>Permission checks confirm the setup before live work starts.</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Tabs
            ariaLabel="Access center tabs"
            items={accessCenterTabs.map((item) => ({
              value: item.id,
              label: item.label,
              hint: item.hint,
              badge:
                item.id === "users" ? <Badge tone="neutral">{users.length}</Badge> :
                item.id === "roles" ? <Badge tone="neutral">{roles.length}</Badge> :
                item.id === "teams" ? <Badge tone="neutral">{teams.length}</Badge> :
                <Badge tone="neutral">{catalog.permissions.length}</Badge>,
            }))}
            onChange={onSetAccessCenterTab}
            value={accessCenterTab}
          />
          <TabPanel active={accessCenterTab === "users"}>
            <div className={`${missionPanelClass} p-4`}>
              <p className="text-sm font-semibold text-[#101e1a]">Users and access assignments</p>
              <p className="mt-1 text-sm text-[#3f4942]/75">
                Use Manage access for role assignments, sign-in control, password reset, and permission checks. Use Default role and scope only when you need to change the user&apos;s base access record.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Manage access", "Open the main control window for sign-in, permissions, and stacked access."],
                  ["Default role and scope", "Change the user&apos;s base role, project, team, or location scope."],
                  ["Teams", "Group people under the right supervisor or function."],
                  ["Turn off access", "Stop login immediately without removing history."],
                ].map(([label, detail]) => (
                  <div className="rounded-xl border border-[#bec9bf]/35 bg-[#f6fbf8] p-3" key={label}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#3f4942]/70">{label}</p>
                    <p className="mt-1 text-sm text-[#101e1a]">{detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={usersNeedingSetup ? "warning" : "success"}>
                  {usersNeedingSetup ? `${usersNeedingSetup} people still need setup` : "All listed people are ready"}
                </Badge>
                <Badge tone="neutral">{userRows.length} total users</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { id: "all" as const, label: "All users", count: userRows.length },
                  { id: "needs_setup" as const, label: "Needs setup", count: usersNeedingSetup },
                  { id: "ready" as const, label: "Ready", count: readyUsers },
                  { id: "inactive" as const, label: "Sign-in off", count: inactiveUsers },
                ].map((filter) => (
                  <Button
                    key={filter.id}
                    onClick={() => setUserSetupFilter(filter.id)}
                    size="sm"
                    variant={userSetupFilter === filter.id ? "primary" : "secondary"}
                  >
                    {filter.label}
                    <span className="ml-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
                      {filter.count}
                    </span>
                  </Button>
                ))}
              </div>
              <div className="mt-3">
                <DataTable
                  columns={userColumns}
                  emptyDescription={
                    userSetupFilter === "needs_setup"
                      ? "Everyone currently visible already has the minimum access setup in place."
                      : userSetupFilter === "ready"
                        ? "No users are fully ready yet. Finish team, supervisor, or scope setup first."
                        : userSetupFilter === "inactive"
                          ? "All visible users can currently sign in."
                          : undefined
                  }
                  emptyLabel={
                    userSetupFilter === "needs_setup"
                      ? "No users are waiting for setup"
                      : userSetupFilter === "ready"
                        ? "No ready users yet"
                        : userSetupFilter === "inactive"
                          ? "No inactive users"
                          : "No users have been created yet"
                  }
                  rows={filteredUserRows}
                  searchLabel="Search users, role, team"
                  title="People ready for access setup"
                />
              </div>
            </div>
          </TabPanel>
          <TabPanel active={accessCenterTab === "roles"}>
            <div className={`${missionPanelClass} p-4`}>
              <p className="text-sm font-semibold text-[#101e1a]">Role templates</p>
              <p className="mt-1 text-sm text-[#3f4942]/75">
                Define the permission bundle once, then assign it many times with the right project, location, team, or own-record scope.
              </p>
              <div className="mt-3">
                <DataTable
                  columns={roleColumns}
                  emptyLabel="No roles have been configured yet"
                  rows={roles}
                  searchLabel="Search roles or permissions"
                  title="Roles ready for delegation"
                />
              </div>
            </div>
          </TabPanel>
          <TabPanel active={accessCenterTab === "teams"}>
            <div className={`${missionPanelClass} p-4`}>
              <p className="text-sm font-semibold text-[#101e1a]">Operational teams</p>
              <p className="mt-1 text-sm text-[#3f4942]/75">
                Teams keep supervision, field work, and escalation paths understandable before you start assigning forms or project responsibilities.
              </p>
              <div className="mt-3">
                <DataTable
                  columns={teamColumns}
                  emptyLabel="No operational teams have been created yet"
                  rows={teams}
                  searchLabel="Search teams, region, type"
                  title="Teams ready for assignment"
                />
              </div>
            </div>
          </TabPanel>
          <TabPanel active={accessCenterTab === "permissions"}>
            <UserPermissionControlPanel
              catalog={catalog}
              onOpenUserProfile={onOpenRoleProfile}
              roles={roles}
              users={users}
            />
            <PermissionMatrix groups={permissionGroups} roles={roles} />
          </TabPanel>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ action, description, title }: { action?: React.ReactNode; description: string; title: string }) {
  return (
    <div className={`${missionPanelClass} flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-[#101e1a]">{title}</h2>
          <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint>
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#3f4942]/75">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#bec9bf]/35 bg-[#f6fbf8] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#3f4942]/70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#101e1a]">{value}</p>
    </div>
  );
}

function AlertRow({ label, value }: { label: string; value: number | string }) {
  const hasIssue = typeof value === "number" ? value > 0 : false;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#bec9bf]/35 bg-[#f6fbf8] px-3 py-2">
      <span className="text-sm text-[#101e1a]">{label}</span>
      <Badge tone={hasIssue ? "warning" : "success"}>{value}</Badge>
    </div>
  );
}

function InsightCard({ icon: Icon, items, title }: { icon: typeof UsersRound; items: string[]; title: string }) {
  return (
    <div className={`${missionPanelClass} p-4`}>
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e7f7f1] text-[#005232]">
          <Icon aria-hidden="true" size={17} />
        </span>
        <h3 className="font-semibold text-[#101e1a]">{title}</h3>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <p className="rounded-lg border border-[#bec9bf]/20 bg-[#f6fbf8] px-3 py-2 text-sm text-[#3f4942]" key={item}>{item}</p>
        ))}
      </div>
    </div>
  );
}

function PermissionMatrix({ groups, roles }: { groups: ReturnType<typeof groupPermissions>; roles: RoleRead[] }) {
  return (
    <div className={`${missionPanelClass} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#101e1a]">Permission Matrix</h3>
          <p className="mt-1 text-sm text-[#3f4942]/75">Permissions are grouped by module and evaluated server-side.</p>
        </div>
        <Badge tone="admin">{groups.length} modules</Badge>
      </div>
      <div className="mt-5 overflow-x-auto product-scrollbar">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[#f6fbf8] text-xs text-[#3f4942]/75">
            <tr className="border-y border-[#bec9bf]/35">
              <th className="py-2 pr-4">Module</th>
              {roles.slice(0, 5).map((role) => <th className="px-3 py-2" key={role.id}>{role.label || normalizeRoleLabel(role.name)}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#bec9bf]/25">
            {groups.map((group) => (
              <tr className="transition hover:bg-[#f6fbf8]" key={group.group}>
                <td className="py-3 pr-4 font-medium capitalize text-[#101e1a]">{group.group}</td>
                {roles.slice(0, 5).map((role) => {
                  const allowed = group.items.filter((item) => role.permissions.includes(item.key)).length;
                  return <td className="px-3 py-3" key={`${group.group}-${role.id}`}><Badge tone={allowed ? "success" : "neutral"}>{allowed}/{group.items.length}</Badge></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleArchitecturePanel({ catalog }: { catalog: AccessCatalog["roles"] }) {
  const groups = useMemo(() => {
    const grouped = new Map<string, AccessCatalog["roles"]>();
    for (const role of catalog) {
      const key = role.architecture_group || "Custom";
      grouped.set(key, [...(grouped.get(key) ?? []), role]);
    }
    const order = ["Platform", "Organization", "Project", "Field Operations", "Governance", "Support", "Viewer", "Custom"];
    return [...grouped.entries()].sort(
      ([left], [right]) => order.indexOf(left) - order.indexOf(right),
    );
  }, [catalog]);

  if (!groups.length) return null;

  return (
    <div className={`${missionPanelClass} p-4`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-semibold text-[#101e1a]">Role Architecture</h3>
          <p className="mt-1 text-sm text-[#3f4942]/75">
            Roles are templates. Real access is role plus scope: organization, project, location, team, or own records.
          </p>
        </div>
        <Badge tone="admin">Role + scope + permission</Badge>
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        {groups.map(([group, rolesInGroup]) => (
          <div className="rounded-2xl border border-[#bec9bf]/35 bg-[#f6fbf8] p-3" key={group}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#101e1a]">{group}</p>
              <Badge tone="neutral">{rolesInGroup.length}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {rolesInGroup.slice(0, 5).map((role) => (
                <div className="rounded-xl border border-[#bec9bf]/35 bg-white px-3 py-2 shadow-sm" key={role.name}>
                  <p className="text-sm font-medium text-[#101e1a]">{role.label}</p>
                  <p className="mt-1 text-xs text-[#3f4942]/75">
                    {role.common_usage || role.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="neutral">{role.scope_type.replace("_", " ")}</Badge>
                    <Badge tone="support">{role.permissions.length} permissions</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type OrgUnitSummary = { id: string; name: string; code: string; unit_type: string; parent_unit_id: string | null; region: string | null };

function OrganizationsSection({
  onOpenSection,
  organizationName,
  profiles,
  summary,
  teams,
  units,
  users,
}: {
  onOpenSection: (section: UsersTeamsSection) => void;
  organizationName: string;
  profiles: WorkforceProfileRead[];
  summary: UsersTeamsSummaryRead;
  teams: TeamRead[];
  units: OrgUnitSummary[];
  users: UserRead[];
}) {
  const rootUnits = units.filter((unit) => !unit.parent_unit_id || !units.some((candidate) => candidate.id === unit.parent_unit_id));
  const unassignedTeams = teams.filter((team) => !team.organization_unit_id || !units.some((unit) => unit.id === team.organization_unit_id));
  const teamMemberUserIds = new Set(profiles.filter((profile) => profile.team_id).map((profile) => profile.user_id));
  const unassignedUsers = users.filter((user) => !teamMemberUserIds.has(user.id));

  return (
    <section className="space-y-4">
      <SectionHeader description="See how regions, offices, teams, and people fit together — expand a level to drill into the next." title="Organization Structure" />
      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="relative overflow-hidden rounded-2xl border border-[#bec9bf]/35 bg-[#0c1f1b] p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#06B6D4]/20 blur-3xl" />
          <div className="relative">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[#93ecb8]">
              <Building2 aria-hidden="true" size={23} />
            </span>
            <h3 className="mt-4 text-xl font-semibold">{organizationName}</h3>
            <p className="mt-1 text-sm leading-6 text-white/65">Single-tenant organization workspace with multi-organization readiness.</p>
          </div>
          <div className="mt-3 grid gap-3">
            <Signal label="Users" value={`${summary.total_users}`} />
            <Signal label="Teams" value={`${summary.teams}`} />
            <Signal label="Roles" value={`${summary.roles}`} />
          </div>
        </div>
        <div className={`${missionPanelClass} p-4`}>
          <h3 className="font-semibold text-[#101e1a]">Hierarchy</h3>
          <p className="mt-1 text-xs text-[#3f4942]/70">
            Regions and offices contain teams, and teams contain people. Click a row to expand it.
          </p>
          <div className="mt-4 space-y-2">
            {rootUnits.length ? (
              rootUnits.map((unit) => (
                <OrgUnitNode key={unit.id} profiles={profiles} teams={teams} unit={unit} units={units} users={users} />
              ))
            ) : (
              <p className="rounded-xl border border-[#bec9bf]/35 bg-[#f6fbf8] px-3 py-3 text-xs text-[#3f4942]/75">
                No regions or offices have been set up yet. Add organizational units to build out your hierarchy.
              </p>
            )}
            {unassignedTeams.length || unassignedUsers.length ? (
              <details className="rounded-xl border border-[#bec9bf]/35 bg-[#f6fbf8] px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-[#101e1a]">
                  Not yet assigned to a region or office
                </summary>
                <div className="mt-2 space-y-2 border-l pl-4">
                  {unassignedTeams.length ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#bec9bf]/25 bg-white px-3 py-2 text-xs text-[#3f4942]/75">
                      <span>
                        Open a team and choose &quot;Place in organization
                        structure&quot; to move it into the hierarchy above.
                      </span>
                      <Button onClick={() => onOpenSection("teams")} size="sm" variant="secondary">
                        Go to Teams
                      </Button>
                    </div>
                  ) : null}
                  {unassignedTeams.map((team) => (
                    <TeamNode key={team.id} profiles={profiles} team={team} users={users} />
                  ))}
                  {unassignedUsers.length ? (
                    <div className="rounded-xl border border-[#bec9bf]/35 bg-white px-3 py-2">
                      <p className="text-sm font-medium text-[#101e1a]">People without a team</p>
                      <div className="mt-2 space-y-1.5">
                        {unassignedUsers.map((user) => (
                          <div className="flex items-center justify-between gap-3 text-xs" key={user.id}>
                            <p className="font-medium">{user.full_name}</p>
                            {user.role_name ? <Badge tone="neutral">{user.role_name}</Badge> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function OrgUnitNode({
  depth = 0,
  profiles,
  teams,
  unit,
  units,
  users,
}: {
  depth?: number;
  profiles: WorkforceProfileRead[];
  teams: TeamRead[];
  unit: OrgUnitSummary;
  units: OrgUnitSummary[];
  users: UserRead[];
}) {
  const childUnits = units.filter((candidate) => candidate.parent_unit_id === unit.id);
  const unitTeams = teams.filter((team) => team.organization_unit_id === unit.id);

  return (
    <details className="rounded-xl border border-[#bec9bf]/35 bg-[#f6fbf8] px-3 py-2" open={depth === 0}>
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-[#101e1a]">
        <span>
          {unit.name}
          <span className="ml-2 text-xs font-normal text-[#3f4942]/70">
            {unit.code} · {unit.unit_type}
            {unit.region ? ` · ${unit.region}` : ""}
          </span>
        </span>
        <Badge tone="neutral">
          {unitTeams.length} {unitTeams.length === 1 ? "team" : "teams"}
        </Badge>
      </summary>
      <div className="mt-2 space-y-2 border-l pl-4">
        {unitTeams.map((team) => (
          <TeamNode key={team.id} profiles={profiles} team={team} users={users} />
        ))}
        {childUnits.map((child) => (
          <OrgUnitNode depth={depth + 1} key={child.id} profiles={profiles} teams={teams} unit={child} units={units} users={users} />
        ))}
        {!unitTeams.length && !childUnits.length ? (
          <p className="text-xs text-[#3f4942]/70">No teams or sub-units here yet.</p>
        ) : null}
      </div>
    </details>
  );
}

function TeamNode({ profiles, team, users }: { profiles: WorkforceProfileRead[]; team: TeamRead; users: UserRead[] }) {
  const members = profiles.filter((profile) => profile.team_id === team.id);
  return (
    <details className="rounded-xl border border-[#bec9bf]/35 bg-white px-3 py-2 shadow-sm">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-[#101e1a]">
        <span>
          {team.name}
          <span className="ml-2 text-xs font-normal text-[#3f4942]/70">
            {team.code} · {team.team_type.replaceAll("_", " ")}
            {team.region ? ` · ${team.region}` : ""}
          </span>
        </span>
        <Badge tone="accent">
          {members.length} {members.length === 1 ? "person" : "people"}
        </Badge>
      </summary>
      <div className="mt-2 space-y-1.5">
        {members.length ? (
          members.map((profile) => {
            const user = users.find((candidate) => candidate.id === profile.user_id);
            const supervisor = profile.supervisor_user_id ? users.find((candidate) => candidate.id === profile.supervisor_user_id) : null;
            return (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f6fbf8] px-3 py-2 text-xs" key={profile.id}>
                <div>
                  <p className="font-medium">
                    <UserProfileLink userId={user?.id}>{user?.full_name ?? "Unknown user"}</UserProfileLink>
                  </p>
                  <p className="text-[#3f4942]/70">
                    {profile.job_title}
                    {supervisor ? (
                      <>
                        {" · reports to "}
                        <UserProfileLink userId={supervisor.id}>{supervisor.full_name}</UserProfileLink>
                      </>
                    ) : (
                      ""
                    )}
                  </p>
                </div>
                {user?.role_name ? <Badge tone="neutral">{user.role_name}</Badge> : null}
              </div>
            );
          })
        ) : (
          <p className="text-xs text-[#3f4942]/70">No team members assigned yet.</p>
        )}
      </div>
    </details>
  );
}

function PermissionsSection({
  catalog,
  catalogGroups,
  onOpenAccessTest,
  onOpenUserProfile,
  roles,
  users,
}: {
  catalog: AccessCatalog;
  catalogGroups: ReturnType<typeof groupPermissions>;
  onOpenAccessTest: () => void;
  onOpenUserProfile: (user: UserRead) => void;
  roles: RoleRead[];
  users: UserRead[];
}) {
  return (
    <section className="space-y-4">
      <SectionHeader
        action={<Button onClick={onOpenAccessTest} variant="primary"><SearchCheck aria-hidden="true" /> Test access</Button>}
        description="Manage who can upload form data, clean imported rows, review submissions, create users, and access project or location scoped records."
        title="Permission Management"
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <InsightCard icon={KeyRound} title="How access works" items={["Role gives permissions", "Scope limits project/location/team", "Profile shows effective access"]} />
        <InsightCard icon={FileUp} title="Data upload permissions" items={["Upload form data: data.import", "Clean many rows: data.bulk_edit", "Review field data: submissions.review"]} />
        <InsightCard icon={UsersRound} title="Manage a user" items={["Open user profile", "Manage role assignments", "Edit primary access scope"]} />
      </div>
      <UserPermissionControlPanel
        catalog={catalog}
        onOpenUserProfile={onOpenUserProfile}
        roles={roles}
        users={users}
      />
      <PermissionMatrix groups={catalogGroups} roles={roles} />
    </section>
  );
}

function permissionsForUser(user: UserRead, roles: RoleRead[], catalog: AccessCatalog): Set<string> {
  const permissions = new Set<string>();
  const roleMap = new Map<string, string[]>();
  for (const role of roles) {
    roleMap.set(role.name, role.permissions);
  }
  for (const role of catalog.roles) {
    roleMap.set(role.name, role.permissions);
  }
  const roleNames = new Set<string>();
  if (user.role_name) roleNames.add(user.role_name);
  for (const assignment of user.role_assignments ?? []) {
    if (assignment.is_active) roleNames.add(assignment.role_name);
  }
  for (const roleName of roleNames) {
    for (const permission of roleMap.get(roleName) ?? []) {
      permissions.add(permission);
    }
  }
  return permissions;
}

function UserPermissionControlPanel({
  catalog,
  onOpenUserProfile,
  roles,
  users,
}: {
  catalog: AccessCatalog;
  onOpenUserProfile: (user: UserRead) => void;
  roles: RoleRead[];
  users: UserRead[];
}) {
  const rows = users.map((user) => {
    const permissions = permissionsForUser(user, roles, catalog);
    const canImport = permissions.has("data.import");
    const canBulkClean = permissions.has("data.bulk_edit");
    const canReview = permissions.has("submissions.review") || permissions.has("submissions.approve");
    return {
      canBulkClean,
      canImport,
      canReview,
      permissions,
      user,
    };
  });
  const columns: TableColumn<(typeof rows)[number]>[] = [
    {
      key: "user",
      header: "User",
      value: (row) => `${row.user.full_name} ${row.user.email}`,
      render: (row) => (
        <button className="text-left" onClick={() => onOpenUserProfile(row.user)} type="button">
          <span className="block font-medium text-primary hover:underline">{row.user.full_name}</span>
          <span className="block text-xs text-muted-foreground">{row.user.email}</span>
        </button>
      ),
    },
    {
      key: "role",
      header: "Role / Scope",
      value: (row) => `${row.user.role_name ?? ""} ${row.user.scope_type ?? ""}`,
      render: (row) => (
        <div className="space-y-1">
          <Badge tone="accent">{normalizeRoleLabel(row.user.role_name)}</Badge>
          <p className="text-xs text-muted-foreground">{(row.user.scope_type ?? "organization").replace("_", " ")}</p>
        </div>
      ),
    },
    {
      key: "import",
      header: "Upload data",
      value: (row) => String(row.canImport),
      render: (row) => <Badge tone={row.canImport ? "success" : "warning"}>{row.canImport ? "Allowed" : "Needs data.import"}</Badge>,
    },
    {
      key: "clean",
      header: "Bulk clean",
      value: (row) => String(row.canBulkClean),
      render: (row) => <Badge tone={row.canBulkClean ? "success" : "warning"}>{row.canBulkClean ? "Allowed" : "Needs data.bulk_edit"}</Badge>,
    },
    {
      key: "review",
      header: "Review submissions",
      value: (row) => String(row.canReview),
      render: (row) => <Badge tone={row.canReview ? "success" : "neutral"}>{row.canReview ? "Allowed" : "Not assigned"}</Badge>,
    },
  ];

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-3.5 shadow-card">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-semibold">User permission control</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Use this table when someone cannot upload data, clean imports, or review submissions. Select a user to open their profile, then manage role assignments or edit scope.
          </p>
        </div>
        <Badge tone="support">{rows.filter((row) => row.canImport).length}/{rows.length} can upload</Badge>
      </div>
      <div className="mt-3">
        <DataTable columns={columns} emptyLabel="No users are available for permission review" rows={rows} searchLabel="Search users, roles, upload permission" title="User access to data workflows" />
      </div>
    </section>
  );
}

function CreateUserModal({ canManageRoles, canSubmit, draft, onChange, onCreateCustomRole, onOpenChange, onSubmit, open, projects, roleCatalogByName, roleOptions, saving, units }: {
  canManageRoles: boolean;
  canSubmit: boolean;
  draft: typeof defaultUserDraft;
  onChange: (draft: typeof defaultUserDraft) => void;
  onCreateCustomRole: () => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  projects: { id: string; name: string; project_code: string }[];
  roleCatalogByName: Map<string, AccessCatalog["roles"][number]>;
  roleOptions: [string, string][];
  saving: boolean;
  units: { id: string; name: string; code: string; unit_type: string; region: string | null }[];
}) {
  const selectedRole = roleCatalogByName.get(draft.role_name);
  const scopedUnits = units.filter((unit) => unit.unit_type === draft.scope_type);
  const needsProjectScope = draft.scope_type === "project";
  const needsGeographyScope = ["country", "region", "district", "field_team"].includes(draft.scope_type ?? "");
  const scopeHint = scopeSetupHint(draft.scope_type);
  return (
    <Modal description="Create an account, choose its role, and define the default access scope." onOpenChange={onOpenChange} open={open} title="Create user" contentClassName="max-w-2xl">
      <div className="grid gap-4 overflow-y-auto p-5 product-scrollbar">
        <Input placeholder="Full name" value={draft.full_name} onChange={(event) => onChange({ ...draft, full_name: event.target.value })} />
        <Input placeholder="Email address" type="email" value={draft.email} onChange={(event) => onChange({ ...draft, email: event.target.value })} />
        <Input placeholder="Temporary password (minimum 12 characters)" type="password" value={draft.password} onChange={(event) => onChange({ ...draft, password: event.target.value })} />
        <div className="rounded-xl border bg-muted/25 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold">Role and permissions</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose an existing role, or create a custom role first when this user needs a specific permission set.
              </p>
            </div>
            <Button disabled={!canManageRoles} onClick={onCreateCustomRole} size="sm" type="button" variant="secondary">
              <ShieldCheck aria-hidden="true" />
              Create custom role
            </Button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Role
              <Select
                value={draft.role_name}
                onChange={(event) => {
                  const nextRole = roleCatalogByName.get(event.target.value);
                  onChange({
                    ...draft,
                    geography_ids: [],
                    project_ids: [],
                    role_name: event.target.value,
                    scope_type: nextRole?.scope_type ?? draft.scope_type,
                  });
                }}
              >
                {roleOptions.length ? roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>) : <option value="">No roles available</option>}
              </Select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Access scope
              <Select
                value={draft.scope_type ?? ""}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    geography_ids: [],
                    project_ids: [],
                    scope_type: event.target.value,
                  })
                }
              >
                {["organization", "country", "region", "district", "field_team", "project", "own"].map((scope) => <option key={scope} value={scope}>{scope.replace("_", " ")}</option>)}
              </Select>
              <span className="text-[11px] font-normal text-muted-foreground">{scopeHint}</span>
            </label>
            {needsProjectScope ? (
              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                Project access
                <Select
                  value={draft.project_ids?.[0] ?? ""}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      project_ids: event.target.value ? [event.target.value] : [],
                    })
                  }
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} · {project.project_code}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}
            {needsGeographyScope ? (
              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                {draft.scope_type === "field_team" ? "Field-team boundary" : "Location access"}
                <Select
                  value={draft.geography_ids?.[0] ?? ""}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      geography_ids: event.target.value
                        ? [event.target.value]
                        : [],
                    })
                  }
                >
                  <option value="">Select {draft.scope_type?.replace("_", " ")}</option>
                  {scopedUnits.map((unit) => (
                    <option key={unit.id} value={unit.code}>
                      {unit.name} · {unit.code}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}
          </div>
          {selectedRole ? (
            <div className="mt-3 rounded-lg border bg-surface-container-lowest p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">{selectedRole.label}</p>
              <p className="mt-1">{selectedRole.common_usage || selectedRole.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="neutral">{selectedRole.architecture_group ?? "Custom"}</Badge>
                <Badge tone="support">{selectedRole.permissions.length} permissions</Badge>
                <Badge tone="accent">Default scope: {selectedRole.scope_type.replace("_", " ")}</Badge>
              </div>
            </div>
          ) : null}
        </div>
        {!roleOptions.length ? (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            No assignable roles are available for this account. Ask a System Admin to grant user management authority or create the required role template.
          </div>
        ) : null}
        <div className="rounded-xl border bg-muted/35 p-3 text-xs text-muted-foreground">
          Required before saving: full name, email, a 12-character temporary password, an assignable role, an access scope, and a project/location target when that scope requires one.
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <Button onClick={() => onOpenChange(false)} variant="ghost">Cancel</Button>
        <Button disabled={!canSubmit || !draft.email || !draft.full_name || draft.password.length < 12 || !roleOptions.length || (needsProjectScope && !draft.project_ids?.length) || (needsGeographyScope && !draft.geography_ids?.length)} onClick={onSubmit} variant="primary">{saving ? "Creating..." : "Create user"}</Button>
      </div>
    </Modal>
  );
}

function EditUserAccessModal({
  canSubmit,
  draft,
  onChange,
  onOpenChange,
  onSubmit,
  open,
  projects,
  roleCatalogByName,
  roleOptions,
  saving,
  teams,
  units,
  users,
}: {
  canSubmit: boolean;
  draft: AccessEditDraft;
  onChange: (draft: AccessEditDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  projects: { id: string; name: string; project_code: string }[];
  roleCatalogByName: Map<string, AccessCatalog["roles"][number]>;
  roleOptions: [string, string][];
  saving: boolean;
  teams: TeamRead[];
  units: { id: string; name: string; code: string; unit_type: string; region: string | null }[];
  users: UserRead[];
}) {
  const selectedRole = roleCatalogByName.get(draft.role_name);
  const needsProjectScope = draft.scope_type === "project";
  const needsGeographyScope = ["country", "region", "district", "field_team"].includes(draft.scope_type);
  const scopedUnits = units.filter((unit) => unit.unit_type === draft.scope_type);
  const scopeHint = scopeSetupHint(draft.scope_type);
  const availableTeams = teams.filter((team) => team.is_active && (!draft.project_id || !team.project_id || team.project_id === draft.project_id));
  const availableSupervisors = users.filter((user) => user.is_active && user.id !== draft.user?.id);
  return (
    <Modal
      contentClassName="max-w-2xl"
      description="Change the user's operational role, scope, and active status. This is audited and affects web and mobile access."
      onOpenChange={onOpenChange}
      open={open}
      title="Edit user access"
    >
      <div className="grid gap-4 overflow-y-auto p-5 product-scrollbar">
        <div className="rounded-xl border bg-muted/25 p-3">
          <p className="text-sm font-semibold">{draft.user?.full_name ?? "Selected user"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{draft.user?.email}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            Role
            <Select
              value={draft.role_name}
              onChange={(event) => {
                const nextRole = roleCatalogByName.get(event.target.value);
                onChange({
                  ...draft,
                  geography_id: "",
                  project_id: "",
                  role_name: event.target.value,
                  scope_type: nextRole?.scope_type ?? draft.scope_type,
                });
              }}
            >
              {roleOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            Access scope
            <Select
              value={draft.scope_type}
              onChange={(event) =>
                onChange({
                  ...draft,
                  geography_id: "",
                  project_id: "",
                  scope_type: event.target.value,
                })
              }
            >
              {["organization", "country", "region", "district", "field_team", "project", "own"].map((scope) => (
                <option key={scope} value={scope}>{scope.replace("_", " ")}</option>
              ))}
            </Select>
            <span className="text-[11px] font-normal text-muted-foreground">{scopeHint}</span>
          </label>
          {needsProjectScope ? (
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Project
              <Select value={draft.project_id} onChange={(event) => onChange({ ...draft, project_id: event.target.value })}>
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} · {project.project_code}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          {needsGeographyScope ? (
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              {draft.scope_type === "field_team" ? "Field-team boundary" : "Location boundary"}
              <Select value={draft.geography_id} onChange={(event) => onChange({ ...draft, geography_id: event.target.value })}>
                <option value="">Select {draft.scope_type.replace("_", " ")}</option>
                {scopedUnits.map((unit) => (
                  <option key={unit.id} value={unit.code}>
                    {unit.name} · {unit.code}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
            <input
              checked={draft.is_active}
              onChange={(event) => onChange({ ...draft, is_active: event.target.checked })}
              type="checkbox"
            />
            Account active
          </label>
        </div>
        <div className="rounded-xl border bg-muted/20 p-3">
          <p className="text-sm font-semibold">Team and supervisor</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Define who this person reports to and which field team they belong to. This helps assignments, supervision, and mobile visibility stay aligned.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Team
              <Select value={draft.team_id} onChange={(event) => onChange({ ...draft, team_id: event.target.value })}>
                <option value="">No team assigned</option>
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.region ? ` · ${team.region}` : ""}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Supervisor
              <Select value={draft.supervisor_user_id} onChange={(event) => onChange({ ...draft, supervisor_user_id: event.target.value })}>
                <option value="">No supervisor assigned</option>
                {availableSupervisors.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Job title
              <Input
                placeholder="Field Officer"
                value={draft.job_title}
                onChange={(event) => onChange({ ...draft, job_title: event.target.value })}
              />
            </label>
          </div>
        </div>
        <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">{selectedRole?.label ?? normalizeRoleLabel(draft.role_name)}</p>
          <p className="mt-1">{selectedRole?.common_usage || selectedRole?.description || "Custom organization role."}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="neutral">{selectedRole?.architecture_group ?? "Custom"}</Badge>
            <Badge tone="support">{selectedRole?.permissions.length ?? 0} permissions</Badge>
            <Badge tone="accent">Default scope: {(selectedRole?.scope_type ?? "own").replace("_", " ")}</Badge>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <Button onClick={() => onOpenChange(false)} variant="ghost">Cancel</Button>
        <Button
          disabled={!canSubmit || (needsProjectScope && !draft.project_id) || (needsGeographyScope && !draft.geography_id)}
          onClick={onSubmit}
          variant="primary"
        >
          {saving ? "Saving..." : "Save access"}
        </Button>
      </div>
    </Modal>
  );
}

function RoleAssignmentsModal({
  canManage,
  canSubmit,
  draft,
  onChange,
  onDeactivate,
  onEdit,
  onOpenDefaultAccess,
  onOpenChange,
  onResetPassword,
  onSubmit,
  onToggleStatus,
  open,
  projects,
  resettingPassword,
  roleCatalogByName,
  roleOptions,
  saving,
  teams,
  togglingStatus,
  units,
}: {
  canManage: boolean;
  canSubmit: boolean;
  draft: RoleAssignmentDraft;
  onChange: (draft: RoleAssignmentDraft) => void;
  onDeactivate: (assignment: UserRoleAssignmentRead, user: UserRead) => void;
  onEdit: (user: UserRead, assignment: UserRoleAssignmentRead) => void;
  onOpenDefaultAccess: () => void;
  onOpenChange: (open: boolean) => void;
  onResetPassword: () => void;
  onSubmit: () => void;
  onToggleStatus: () => void;
  open: boolean;
  projects: { id: string; name: string; project_code: string }[];
  resettingPassword: boolean;
  roleCatalogByName: Map<string, AccessCatalog["roles"][number]>;
  roleOptions: [string, string][];
  saving: boolean;
  teams: TeamRead[];
  togglingStatus: boolean;
  units: { id: string; name: string; code: string; unit_type: string; region: string | null }[];
}) {
  const selectedRole = roleCatalogByName.get(draft.role_name);
  const assignments = draft.user?.role_assignments ?? [];
  const roleProfiles = profilesForUser(draft.user);
  const needsProjectScope = draft.scope_type === "project";
  const needsGeographyScope = ["country", "region", "district", "field_team"].includes(draft.scope_type);
  const scopedUnits = units.filter((unit) => unit.unit_type === draft.scope_type);
  const availableTeams = teams.filter((team) => team.is_active && (!draft.project_id || !team.project_id || team.project_id === draft.project_id));
  const scopeHint = scopeSetupHint(draft.scope_type);
  return (
    <Modal
      contentClassName="max-w-4xl"
      description="Choose the person's permission bundle, then decide where that access applies: project, location, team, or own records."
      onOpenChange={onOpenChange}
      open={open}
      title="Manage access"
    >
      <div className="grid gap-4 p-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-xl border bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{draft.user?.full_name ?? "Selected user"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{draft.user?.email}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge tone={draft.user?.is_active ? "success" : "danger"}>{draft.user?.is_active ? "Sign-in allowed" : "Sign-in blocked"}</Badge>
              <Badge tone="admin">{assignments.filter((assignment) => assignment.is_active).length} active</Badge>
            </div>
          </div>
          <div className="mt-3 rounded-lg border bg-surface-container-lowest p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default role and sign-in</p>
                <p className="mt-1 text-sm font-semibold">
                  {normalizeRoleLabel(draft.user?.role_name)}
                  <span className="ml-2 text-xs font-normal capitalize text-muted-foreground">
                    {(draft.user?.scope_type ?? "organization").replace("_", " ")}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use this area when you need to block login, reset the password, or update the main role and scope record.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={!canManage} onClick={onOpenDefaultAccess} size="sm" variant="secondary">
                  <KeyRound aria-hidden="true" />
                  Default role and scope
                </Button>
                <Button disabled={!canManage || resettingPassword} onClick={onResetPassword} size="sm" variant="secondary">
                  <RotateCcw aria-hidden="true" />
                  Reset password
                </Button>
                <Button
                  disabled={!canManage || togglingStatus}
                  onClick={onToggleStatus}
                  size="sm"
                  variant={draft.user?.is_active ? "danger" : "secondary"}
                >
                  {draft.user?.is_active ? <Lock aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                  {draft.user?.is_active ? "Turn off sign-in" : "Turn on sign-in"}
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {assignments.length ? assignments.map((assignment) => (
              <div className="rounded-lg border bg-surface-container-lowest p-3" key={assignment.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{assignment.role_label || normalizeRoleLabel(assignment.role_name)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {assignment.scope_type.replace("_", " ")}
                      {assignment.project_id ? ` · Project ${assignment.project_id}` : ""}
                      {assignment.geography_id ? ` · ${assignment.geography_id}` : ""}
                      {assignment.team_id ? ` · ${teamName(teams, assignment.team_id)}` : ""}
                    </p>
                  </div>
                  <Badge tone={assignment.is_active ? "success" : "neutral"}>{assignment.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                {assignment.reason ? <p className="mt-2 text-xs text-muted-foreground">{assignment.reason}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => draft.user && onEdit(draft.user, assignment)} size="sm" variant="secondary">Edit</Button>
                  <Button disabled={!assignment.is_active || !draft.user} onClick={() => draft.user && onDeactivate(assignment, draft.user)} size="sm" variant="ghost">Deactivate</Button>
                </div>
              </div>
            )) : (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                No stacked assignments yet. Add one below so this user has explicit role and scope records.
              </div>
            )}
          </div>
          <div className="mt-4 border-t pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operational profiles</p>
              <Badge tone="neutral">{roleProfiles.length}</Badge>
            </div>
            <div className="mt-2 space-y-2">
              {roleProfiles.map((profile) => (
                <div className="rounded-lg border bg-background/70 p-2.5" key={profile.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{profile.display_name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {String(profile.metadata_json?.architecture_group ?? "Operational profile")}
                        {profile.metadata_json?.scope_type ? ` · ${String(profile.metadata_json.scope_type).replace("_", " ")}` : ""}
                      </p>
                    </div>
                    <Badge tone={profile.status === "active" ? "success" : "neutral"}>{profile.status}</Badge>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {profile.responsibilities_json.slice(0, 3).map((responsibility) => (
                      <li className="flex gap-2" key={responsibility}>
                        <span aria-hidden="true" className="mt-1 size-1.5 rounded-full bg-primary" />
                        <span>{responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {!roleProfiles.length ? (
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                  No role profile is available yet. Save a role assignment to generate the operational profile.
                </div>
              ) : null}
            </div>
          </div>
        </section>
        <section className="rounded-xl border bg-surface-container-lowest p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">{draft.assignment_id ? "Edit permission access" : "Add permission access"}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Choose the permission bundle first, then restrict which data area it covers.</p>
            </div>
            {draft.assignment_id ? (
              <Button onClick={() => onChange({ ...defaultRoleAssignmentDraft, role_name: draft.role_name, scope_type: draft.scope_type, user: draft.user })} size="sm" variant="ghost">New</Button>
            ) : null}
          </div>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Role
              <Select
                value={draft.role_name}
                onChange={(event) => {
                  const nextRole = roleCatalogByName.get(event.target.value);
                  onChange({
                    ...draft,
                    geography_id: "",
                    project_id: "",
                    role_name: event.target.value,
                    scope_type: nextRole?.scope_type ?? draft.scope_type,
                    team_id: "",
                  });
                }}
              >
                {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Scope
              <Select
                value={draft.scope_type}
                onChange={(event) => onChange({ ...draft, geography_id: "", project_id: "", scope_type: event.target.value, team_id: "" })}
              >
                {["organization", "country", "region", "district", "field_team", "project", "own"].map((scope) => (
                  <option key={scope} value={scope}>{scope.replace("_", " ")}</option>
                ))}
              </Select>
              <span className="text-[11px] font-normal text-muted-foreground">{scopeHint}</span>
            </label>
            {needsProjectScope ? (
              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                Project
                <Select value={draft.project_id} onChange={(event) => onChange({ ...draft, project_id: event.target.value })}>
                  <option value="">Select project</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.project_code}</option>)}
                </Select>
              </label>
            ) : null}
            {needsGeographyScope ? (
              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                {draft.scope_type === "field_team" ? "Field-team boundary" : "Location boundary"}
                <Select value={draft.geography_id} onChange={(event) => onChange({ ...draft, geography_id: event.target.value })}>
                  <option value="">Select {draft.scope_type.replace("_", " ")}</option>
                  {scopedUnits.map((unit) => <option key={unit.id} value={unit.code}>{unit.name} · {unit.code}</option>)}
                </Select>
              </label>
            ) : null}
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Team
              <Select value={draft.team_id} onChange={(event) => onChange({ ...draft, team_id: event.target.value })}>
                <option value="">No team restriction</option>
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.region ? ` · ${team.region}` : ""}
                  </option>
                ))}
              </Select>
              <span className="text-[11px] font-normal text-muted-foreground">
                Recommended when the person belongs to one field team or supervisor line.
              </span>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Reason
              <Textarea
                onChange={(event) => onChange({ ...draft, reason: event.target.value })}
                placeholder="Example: Temporary data review access for the Rice Resilience pilot."
                rows={3}
                value={draft.reason}
              />
            </label>
            {draft.assignment_id ? (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input checked={draft.is_active} onChange={(event) => onChange({ ...draft, is_active: event.target.checked })} type="checkbox" />
                Assignment active
              </label>
            ) : null}
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">{selectedRole?.label ?? normalizeRoleLabel(draft.role_name)}</p>
              <p className="mt-1">{selectedRole?.common_usage || selectedRole?.description || "Custom organization role."}</p>
            </div>
          </div>
        </section>
      </div>
      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <Button onClick={() => onOpenChange(false)} variant="ghost">Close</Button>
        <Button
          disabled={!canSubmit || (needsProjectScope && !draft.project_id) || (needsGeographyScope && !draft.geography_id)}
          onClick={onSubmit}
          variant="primary"
        >
          {saving ? "Saving..." : draft.assignment_id ? "Save assignment" : "Add assignment"}
        </Button>
      </div>
    </Modal>
  );
}

function ImportUsersModal({ canSubmit, file, onFileChange, onOpenChange, onSubmit, open }: {
  canSubmit: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
}) {
  return (
    <Modal description="Upload a CSV with email, full_name, role_name, and password columns." onOpenChange={onOpenChange} open={open} title="Import users">
      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">CSV template</p>
          <p className="mt-1">email,full_name,role_name,password,scope_type,geography_id,project_id</p>
        </div>
        <Input accept=".csv" type="file" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
        {file ? <Badge tone="success">{file.name}</Badge> : null}
      </div>
      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <Button onClick={() => onOpenChange(false)} variant="ghost">Cancel</Button>
        <Button disabled={!canSubmit} onClick={onSubmit} variant="primary">Import users</Button>
      </div>
    </Modal>
  );
}

function CreateTeamModal({ canSubmit, draft, onChange, onOpenChange, onSubmit, open, units, users }: {
  canSubmit: boolean;
  draft: typeof defaultTeamDraft;
  onChange: (draft: typeof defaultTeamDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  units: { id: string; name: string; code: string; unit_type: string; region: string | null }[];
  users: UserRead[];
}) {
  return (
    <Modal description="Create an operational team for assignments, supervision, and location-based work." onOpenChange={onOpenChange} open={open} title="Create team" contentClassName="max-w-2xl">
      <div className="grid gap-4 p-5">
        <Input placeholder="Team name" value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">
            Team code
            <Input
              className="mt-2"
              placeholder={resolveTeamCode(draft.name, draft.code)}
              value={draft.code}
              onChange={(event) => onChange({ ...draft, code: normalizeTeamCode(event.target.value) })}
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Leave this blank and Atlas will generate a safe code from the team name.
            </span>
          </label>
          <Input placeholder="Region or location" value={draft.region} onChange={(event) => onChange({ ...draft, region: event.target.value })} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Select value={draft.team_type} onChange={(event) => onChange({ ...draft, team_type: event.target.value })}>
            <option value="field_team">Field team</option>
            <option value="data_quality">Data quality</option>
            <option value="monitoring">Monitoring</option>
            <option value="analysis">Analysis</option>
          </Select>
          <Select value={draft.manager_user_id} onChange={(event) => onChange({ ...draft, manager_user_id: event.target.value })}>
            <option value="">No team lead yet</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
          </Select>
        </div>
        <label className="text-sm font-medium">
          Place in organization structure
          <Select
            className="mt-2"
            onChange={(event) => onChange({ ...draft, organization_unit_id: event.target.value })}
            value={draft.organization_unit_id}
          >
            <option value="">Not placed yet (shows as &quot;unassigned&quot;)</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.code} · {unit.unit_type})
              </option>
            ))}
          </Select>
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Choosing a region or office places this team in the Organizations
            hierarchy so it&apos;s easy to find later.
          </span>
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <Button onClick={() => onOpenChange(false)} variant="ghost">Cancel</Button>
        <Button disabled={!canSubmit} onClick={onSubmit} variant="primary">Create team</Button>
      </div>
    </Modal>
  );
}

function EditTeamModal({ canSubmit, draft, onChange, onOpenChange, onSubmit, open, units, users }: {
  canSubmit: boolean;
  draft: typeof defaultEditTeamDraft;
  onChange: (draft: typeof defaultEditTeamDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  units: { id: string; name: string; code: string; unit_type: string; region: string | null }[];
  users: UserRead[];
}) {
  return (
    <Modal description="Update this team's details, lead, and place in the organization structure." onOpenChange={onOpenChange} open={open} title={`Edit team${draft.name ? `: ${draft.name}` : ""}`} contentClassName="max-w-2xl">
      <div className="grid gap-4 p-5">
        <Input placeholder="Team name" value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">
            Team code
            <Input
              className="mt-2"
              placeholder={resolveTeamCode(draft.name, draft.code)}
              value={draft.code}
              onChange={(event) => onChange({ ...draft, code: normalizeTeamCode(event.target.value) })}
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Leave this blank and Atlas will keep using the generated code from the team name.
            </span>
          </label>
          <Input placeholder="Region or location" value={draft.region} onChange={(event) => onChange({ ...draft, region: event.target.value })} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Select value={draft.team_type} onChange={(event) => onChange({ ...draft, team_type: event.target.value })}>
            <option value="field_team">Field team</option>
            <option value="data_quality">Data quality</option>
            <option value="monitoring">Monitoring</option>
            <option value="analysis">Analysis</option>
          </Select>
          <Select value={draft.manager_user_id} onChange={(event) => onChange({ ...draft, manager_user_id: event.target.value })}>
            <option value="">No team lead yet</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
          </Select>
        </div>
        <label className="text-sm font-medium">
          Place in organization structure
          <Select
            className="mt-2"
            onChange={(event) => onChange({ ...draft, organization_unit_id: event.target.value })}
            value={draft.organization_unit_id}
          >
            <option value="">Not placed yet (shows as &quot;unassigned&quot;)</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.code} · {unit.unit_type})
              </option>
            ))}
          </Select>
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Choosing a region or office places this team in the Organizations
            hierarchy so it&apos;s easy to find later.
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input checked={draft.is_active} onChange={(event) => onChange({ ...draft, is_active: event.target.checked })} type="checkbox" />
          Team is active
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <Button onClick={() => onOpenChange(false)} variant="ghost">Cancel</Button>
        <Button disabled={!canSubmit} onClick={onSubmit} variant="primary">Save changes</Button>
      </div>
    </Modal>
  );
}

function CreateRoleModal({ canSubmit, draft, groups, onChange, onOpenChange, onSubmit, open }: {
  canSubmit: boolean;
  draft: typeof defaultRoleDraft;
  groups: ReturnType<typeof groupPermissions>;
  onChange: (draft: typeof defaultRoleDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
}) {
  function togglePermission(permission: string): void {
    const next = draft.permissions.includes(permission)
      ? draft.permissions.filter((item) => item !== permission)
      : [...draft.permissions, permission];
    onChange({ ...draft, permissions: next });
  }
  return (
    <Modal description="Create a controlled custom role from existing platform permissions." onOpenChange={onOpenChange} open={open} title="Create role" contentClassName="max-w-3xl">
      <div className="max-h-[70vh] overflow-y-auto p-5 product-scrollbar">
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Role name" value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
          <Input placeholder="Display label" value={draft.label} onChange={(event) => onChange({ ...draft, label: event.target.value })} />
        </div>
        <Textarea className="mt-3" placeholder="Description" value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} />
        <div className="mt-3">
          <Select value={draft.scope_type} onChange={(event) => onChange({ ...draft, scope_type: event.target.value })}>
            {["organization", "region", "district", "field_team", "project", "own"].map((scope) => <option key={scope} value={scope}>{scope.replace("_", " ")}</option>)}
          </Select>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {groups.map((group) => (
            <div className="rounded-xl border p-3" key={group.group}>
              <p className="text-sm font-semibold capitalize">{group.group}</p>
              <div className="mt-3 space-y-2">
                {group.items.map((permission) => (
                  <label className="flex items-center gap-2 text-sm" key={permission.key}>
                    <input checked={draft.permissions.includes(permission.key)} onChange={() => togglePermission(permission.key)} type="checkbox" />
                    <span>{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <Button onClick={() => onOpenChange(false)} variant="ghost">Cancel</Button>
        <Button disabled={!canSubmit} onClick={onSubmit} variant="primary">Create role</Button>
      </div>
    </Modal>
  );
}

function EditRoleModal({ canSubmit, draft, groups, onChange, onOpenChange, onReset, onSubmit, open, resetting, saving }: {
  canSubmit: boolean;
  draft: EditRoleDraft | null;
  groups: ReturnType<typeof groupPermissions>;
  onChange: (draft: EditRoleDraft) => void;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  onSubmit: () => void;
  open: boolean;
  resetting: boolean;
  saving: boolean;
}) {
  function togglePermission(permission: string): void {
    if (!draft) return;
    const next = draft.permissions.includes(permission)
      ? draft.permissions.filter((item) => item !== permission)
      : [...draft.permissions, permission];
    onChange({ ...draft, permissions: next });
  }
  return (
    <Modal
      description="Choose exactly what this role can do. Permissions take effect the next time each user signs in."
      onOpenChange={onOpenChange}
      open={open}
      title={draft ? `Edit role · ${draft.label}` : "Edit role"}
      contentClassName="max-w-3xl"
    >
      {draft ? (
        <>
          <div className="max-h-[70vh] overflow-y-auto p-5 product-scrollbar">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={draft.is_system ? "admin" : "success"}>{draft.is_system ? "Built-in role" : "Custom role"}</Badge>
              <Badge tone="neutral">{draft.permissions.length} permission{draft.permissions.length === 1 ? "" : "s"}</Badge>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input placeholder="Display label" value={draft.label} onChange={(event) => onChange({ ...draft, label: event.target.value })} />
              <Select value={draft.scope_type} onChange={(event) => onChange({ ...draft, scope_type: event.target.value })}>
                {["organization", "region", "district", "field_team", "project", "own"].map((scope) => <option key={scope} value={scope}>{scope.replace("_", " ")}</option>)}
              </Select>
            </div>
            <Textarea className="mt-3" placeholder="Description" value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} />
            <p className="mt-3 text-xs text-muted-foreground">
              Granting a &ldquo;manage&rdquo; permission automatically includes its matching &ldquo;view&rdquo; permission, so a role can never manage something it can&apos;t see.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {groups.map((group) => (
                <div className="rounded-xl border p-3" key={group.group}>
                  <p className="text-sm font-semibold capitalize">{group.group}</p>
                  <div className="mt-3 space-y-2">
                    {group.items.map((permission) => (
                      <label className="flex items-center gap-2 text-sm" key={permission.key}>
                        <input checked={draft.permissions.includes(permission.key)} onChange={() => togglePermission(permission.key)} type="checkbox" />
                        <span>{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-4">
            {draft.is_system ? (
              <Button disabled={resetting || saving} onClick={onReset} variant="ghost">
                <RotateCcw aria-hidden="true" />
                {resetting ? "Resetting…" : "Reset to default"}
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button onClick={() => onOpenChange(false)} variant="ghost">Cancel</Button>
              <Button disabled={!canSubmit} onClick={onSubmit} variant="primary">{saving ? "Saving…" : "Save permissions"}</Button>
            </div>
          </div>
        </>
      ) : null}
    </Modal>
  );
}

function AccessTestModal({ canSubmit, draft, groups, onChange, onOpenChange, onSubmit, open, result, users }: {
  canSubmit: boolean;
  draft: typeof defaultAccessDraft;
  groups: ReturnType<typeof groupPermissions>;
  onChange: (draft: typeof defaultAccessDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  result: AccessSimulationRead | null;
  users: UserRead[];
}) {
  const permissions = groups.flatMap((group) => group.items);
  return (
    <Modal description="Check whether a user can perform a specific action before assigning work or publishing access changes." onOpenChange={onOpenChange} open={open} title="Test access" contentClassName="max-w-2xl">
      <div className="grid gap-4 p-5">
        <Select value={draft.user_id} onChange={(event) => onChange({ ...draft, user_id: event.target.value })}>
          <option value="">Choose user</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
        </Select>
        <Select value={draft.permission} onChange={(event) => onChange({ ...draft, permission: event.target.value })}>
          {permissions.map((permission) => <option key={permission.key} value={permission.key}>{permission.label}</option>)}
        </Select>
        {result ? (
          <div className={cn("rounded-xl border p-4", result.allowed ? "border-success/30 bg-success/10" : "border-danger/30 bg-danger/10")}>
            <Badge tone={result.allowed ? "success" : "danger"}>{result.decision}</Badge>
            <p className="mt-3 text-sm font-medium">{result.allowed ? "Access allowed" : "Access denied"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{result.reasons.join(" ")}</p>
            {result.matched_scope ? <p className="mt-2 text-xs text-muted-foreground">Matched scope: {result.matched_scope}</p> : null}
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <Button onClick={() => onOpenChange(false)} variant="ghost">Close</Button>
        <Button disabled={!canSubmit} onClick={onSubmit} variant="primary">Run test</Button>
      </div>
    </Modal>
  );
}
