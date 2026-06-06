"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  CheckCircle2,
  Download,
  FileUp,
  KeyRound,
  Lock,
  Plus,
  RotateCcw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UserCog,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  createRole,
  createTeam,
  createUser,
  getAccessCatalog,
  getOrganizationContext,
  getOrganizationGovernanceSummary,
  getUsersTeamsSummary,
  importUsers,
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
  updateUser,
  type AccessSimulationRead,
  type CurrentPrincipal,
  type RoleCreate,
  type RoleRead,
  type TeamRead,
  type UserCreate,
  type UserRead,
  type UsersTeamsSummaryRead,
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
  usersTeamsSections,
  type UsersTeamsSection,
} from "@/modules/users-teams/data";
import {
  computeSummaryFromRecords,
  formatDateTime,
  groupPermissions,
  initials,
  normalizeRoleLabel,
  profileForUser,
  statusTone,
  teamName,
  toCsv,
} from "@/modules/users-teams/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type UsersTeamsModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

type ModalMode = "access-test" | "import-users" | "role" | "team" | "user" | null;

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
  region: "",
  team_type: "field_team",
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
  ["me_manager", "M&E Manager"],
  ["data_analyst", "Data Analyst"],
  ["district_supervisor", "District Supervisor"],
  ["field_officer", "Field Officer"],
];

const emptyAccessCatalog = { roles: [], permissions: [], scope_types: [], workflow_actions: [] };

function isPreview(token: string | null): boolean {
  return !token || token === "preview-token";
}

function hasAnyPermission(principal: CurrentPrincipal | null | undefined, permissions: string[]): boolean {
  if (!principal || principal.platform_admin) return true;
  return permissions.some((permission) => principal.permissions?.includes(permission));
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

export function UsersTeamsModule({ principal, token }: UsersTeamsModuleProps) {
  const [activeSection, setActiveSection] = useState<UsersTeamsSection>("dashboard");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [userDraft, setUserDraft] = useState(defaultUserDraft);
  const [teamDraft, setTeamDraft] = useState(defaultTeamDraft);
  const [roleDraft, setRoleDraft] = useState(defaultRoleDraft);
  const [accessDraft, setAccessDraft] = useState(defaultAccessDraft);
  const [accessResult, setAccessResult] = useState<AccessSimulationRead | null>(null);
  const [localUsers, setLocalUsers] = useState<UserRead[]>([]);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const queryClient = useQueryClient();
  const preview = isPreview(token);
  const enabled = Boolean(token && !preview);
  const canManageUsers = hasAnyPermission(principal, ["users.create", "users.manage"]);
  const canManageRoles = hasAnyPermission(principal, ["roles.manage"]);
  const canManageTeams = hasAnyPermission(principal, ["officers.manage", "users.manage"]);

  const usersQuery = useQuery({ queryKey: ["users-teams", "users", token], queryFn: () => listUsers(token ?? ""), enabled });
  const rolesQuery = useQuery({ queryKey: ["users-teams", "roles", token], queryFn: () => listRoles(token ?? ""), enabled });
  const teamsQuery = useQuery({ queryKey: ["users-teams", "teams", token], queryFn: () => listTeams(token ?? ""), enabled });
  const profilesQuery = useQuery({ queryKey: ["users-teams", "profiles", token], queryFn: () => listWorkforceProfiles(token ?? ""), enabled });
  const unitsQuery = useQuery({ queryKey: ["users-teams", "units", token], queryFn: () => listOrganizationUnits(token ?? ""), enabled });
  const sessionsQuery = useQuery({ queryKey: ["users-teams", "sessions", token], queryFn: () => listSessionLogs(token ?? ""), enabled });
  const catalogQuery = useQuery({ queryKey: ["users-teams", "catalog", token], queryFn: () => getAccessCatalog(token ?? ""), enabled });
  const summaryQuery = useQuery({ queryKey: ["users-teams", "summary", token], queryFn: () => getUsersTeamsSummary(token ?? ""), enabled });
  const organizationSummaryQuery = useQuery({ queryKey: ["users-teams", "org-summary", token], queryFn: () => getOrganizationGovernanceSummary(token ?? ""), enabled });
  const activityQuery = useQuery({ queryKey: ["users-teams", "activity", token], queryFn: () => listUsersTeamsActivityLogs(token ?? ""), enabled });
  const organizationQuery = useQuery({ queryKey: ["users-teams", "organization", token], queryFn: () => getOrganizationContext(token ?? ""), enabled });
  const projectsQuery = useQuery({ queryKey: ["users-teams", "projects", token], queryFn: () => listProjects(token ?? ""), enabled });

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

  const defaultAssignableRole = roleOptions.find(([value]) => value === defaultUserDraft.role_name)?.[0] ?? roleOptions[0]?.[0] ?? defaultUserDraft.role_name;

  useEffect(() => {
    if (modalMode !== "user" || !roleOptions.length) return;
    if (!roleOptions.some(([value]) => value === userDraft.role_name)) {
      setUserDraft((current) => ({ ...current, role_name: roleOptions[0]?.[0] ?? defaultUserDraft.role_name }));
    }
  }, [modalMode, roleOptions, userDraft.role_name]);

  const invalidateUsersTeams = async () => {
    await queryClient.invalidateQueries({ queryKey: ["users-teams"] });
  };

  function openCreateUserModal(): void {
    setUserDraft((current) => ({
      ...defaultUserDraft,
      email: current.email,
      full_name: current.full_name,
      password: current.password,
      role_name: roleOptions.some(([value]) => value === current.role_name) ? current.role_name : defaultAssignableRole,
      scope_type: current.scope_type ?? defaultUserDraft.scope_type,
    }));
    setModalMode("user");
  }

  const createUserMutation = useMutation({
    mutationFn: () => createUser(token ?? "", userDraft),
    onSuccess: async (user) => {
      setModalMode(null);
      setUserDraft(defaultUserDraft);
      await invalidateUsersTeams();
      pushToast({ title: "User created", description: `${user.full_name} can now access this organization.`, tone: "success" });
    },
    onError: () => pushToast({ title: "Could not create user", description: "Check the email, password length, role, and your permissions.", tone: "danger" }),
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
        code: teamDraft.code,
        manager_user_id: teamDraft.manager_user_id || null,
        name: teamDraft.name,
        region: teamDraft.region || null,
        team_type: teamDraft.team_type,
      }),
    onSuccess: async (team) => {
      setModalMode(null);
      setTeamDraft(defaultTeamDraft);
      await invalidateUsersTeams();
      pushToast({ title: "Team created", description: `${team.name} is ready for assignments.`, tone: "success" });
    },
    onError: () => pushToast({ title: "Could not create team", description: "Check the team code and your team management permission.", tone: "danger" }),
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

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => resetUserPassword(token ?? "", userId),
    onSuccess: (result) => pushToast({ title: "Temporary password created", description: `Temporary password: ${result.temporary_password}`, tone: "success" }),
    onError: () => pushToast({ title: "Password reset failed", description: "You need user management permission to reset another account.", tone: "danger" }),
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ is_active, user }: { is_active: boolean; user: UserRead }) =>
      updateUser(token ?? "", user.id, { is_active, full_name: user.full_name, role_name: user.role_name ?? undefined }),
    onSuccess: async () => {
      await invalidateUsersTeams();
      pushToast({ title: "User status updated", description: "Access changes are now reflected across the organization.", tone: "success" });
    },
    onError: () => pushToast({ title: "Could not update user", description: "Check your user management permission.", tone: "danger" }),
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
        <div className="flex justify-end gap-2">
          <Button disabled={preview || !canManageUsers || resetPasswordMutation.isPending} onClick={() => resetPasswordMutation.mutate(user.id)} size="sm" variant="secondary">
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
          <Button disabled={preview || !canManageUsers || updateUserStatusMutation.isPending} onClick={() => updateUserStatusMutation.mutate({ is_active: !user.is_active, user })} size="sm" variant="ghost">
            {user.is_active ? "Deactivate" : "Activate"}
          </Button>
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
    { key: "members", header: "Members", value: (team) => String(profiles.filter((profile) => profile.team_id === team.id).length), render: (team) => <Badge tone="neutral">{profiles.filter((profile) => profile.team_id === team.id).length} members</Badge> },
    { key: "status", header: "Status", value: (team) => (team.is_active ? "active" : "inactive"), render: (team) => <Badge tone={statusTone(team.is_active)}>{team.is_active ? "Active" : "Inactive"}</Badge> },
  ];

  const activityColumns: TableColumn<(typeof activityLogs)[number]>[] = [
    { key: "action", header: "Activity", value: (log) => log.action, render: (log) => <span className="font-medium">{log.action.replace(/\./g, " ")}</span> },
    { key: "user", header: "User", value: (log) => log.user_label ?? "", render: (log) => log.user_label ?? "System" },
    { key: "resource", header: "Resource", value: (log) => `${log.resource_type} ${log.resource_id}`, render: (log) => <span>{log.resource_type}</span> },
    { key: "status", header: "Status", value: (log) => log.status, render: (log) => <Badge tone={statusTone(log.status)}>{log.status}</Badge> },
    { key: "created", header: "Date", value: (log) => log.created_at, render: (log) => formatDateTime(log.created_at) },
  ];

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="support">PEOPLE</Badge>
              <Badge tone={summary.permission_alerts ? "warning" : "success"}>
                {summary.permission_alerts ? `${summary.permission_alerts} access alert(s)` : "Access healthy"}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Users & Teams</h1>
              <HelpHint label="About Users & Teams" title="Users & Teams">
                Manage identities, roles, operational teams, organization structure, access boundaries, and user activity from one controlled workspace.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!canManageUsers || !roleOptions.length} onClick={openCreateUserModal} variant="primary">
              <Plus aria-hidden="true" />
              Create user
            </Button>
            <Button disabled={preview || !canManageUsers} onClick={() => setModalMode("import-users")} variant="secondary">
              <FileUp aria-hidden="true" />
              Import CSV
            </Button>
            <Button onClick={() => setModalMode("access-test")} variant="secondary">
              <SearchCheck aria-hidden="true" />
              Test access
            </Button>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto product-scrollbar">
          {usersTeamsSections.map((section) => (
            <button
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                activeSection === section.id ? "border-primary bg-primary text-primary-foreground" : "bg-panel hover:bg-muted",
              )}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {activeSection === "dashboard" ? (
        <DashboardSection
          activeSessions={sessions.length}
          organizationName={organizationQuery.data?.name ?? principal?.organization_name ?? "Organization workspace"}
          organizationSummary={organizationSummary}
          roles={roles}
          summary={summary}
          teams={teams}
          users={users}
          onOpenSection={setActiveSection}
        />
      ) : null}

      {activeSection === "users" ? (
        <section className="space-y-4">
          <SectionHeader
            action={
              <div className="flex gap-2">
                <Button onClick={() => downloadCsv("atlas-users.csv", users.map((user) => ({ email: user.email, full_name: user.full_name, role: user.role_name ?? "", status: user.is_active ? "active" : "inactive", scope: user.scope_type ?? "" })))} variant="secondary">
                  <Download aria-hidden="true" />
                  Export
                </Button>
                <Button disabled={!canManageUsers || !roleOptions.length} onClick={openCreateUserModal} variant="primary">
                  <Plus aria-hidden="true" />
                  Create user
                </Button>
              </div>
            }
            description="Create, invite, activate, deactivate, assign roles, and reset access for organization users."
            title="User Management"
          />
          <DataTable columns={userColumns} emptyLabel="No users have been created yet" rows={users} searchLabel="Search users, email, role, team" title="Users" />
        </section>
      ) : null}

      {activeSection === "roles" ? (
        <section className="space-y-4">
          <SectionHeader
            action={
              <Button disabled={preview || !canManageRoles} onClick={() => setModalMode("role")} variant="primary">
                <Plus aria-hidden="true" />
                Create role
              </Button>
            }
            description="Define role templates and permission sets by module, feature, action, and access scope."
            title="Role Management"
          />
          <DataTable columns={roleColumns} emptyLabel="No roles have been configured yet" rows={roles} searchLabel="Search roles or permissions" title="Roles" />
          <PermissionMatrix groups={permissionGroups} roles={roles} />
        </section>
      ) : null}

      {activeSection === "teams" ? (
        <section className="space-y-4">
          <SectionHeader
            action={
              <Button disabled={preview || !canManageTeams} onClick={() => setModalMode("team")} variant="primary">
                <Plus aria-hidden="true" />
                Create team
              </Button>
            }
            description="Organize supervisors, field officers, data quality officers, analysts, and operational teams."
            title="Team Management"
          />
          <DataTable columns={teamColumns} emptyLabel="No operational teams have been created yet" rows={teams} searchLabel="Search teams, regions, project, lead" title="Teams" />
        </section>
      ) : null}

      {activeSection === "organizations" ? (
        <OrganizationsSection organizationName={organizationQuery.data?.name ?? principal?.organization_name ?? "Organization workspace"} units={units} summary={summary} />
      ) : null}

      {activeSection === "permissions" ? (
        <PermissionsSection catalogGroups={permissionGroups} roles={roles} users={users} onOpenAccessTest={() => setModalMode("access-test")} />
      ) : null}

      {activeSection === "activity-logs" ? (
        <section className="space-y-4">
          <SectionHeader
            action={
              <Button onClick={() => downloadCsv("atlas-user-activity.csv", activityLogs.map((log) => ({ action: log.action, user: log.user_label ?? "System", resource: log.resource_type, status: log.status, created_at: log.created_at })))} variant="secondary">
                <Download aria-hidden="true" />
                Export
              </Button>
            }
            description="Monitor login, account, permission, team, and identity changes. Audit administration remains in Governance."
            title="Activity Logs"
          />
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
        roleOptions={roleOptions}
        saving={createUserMutation.isPending}
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
        canSubmit={!preview && canManageTeams && Boolean(teamDraft.name && teamDraft.code) && !createTeamMutation.isPending}
        draft={teamDraft}
        onChange={setTeamDraft}
        onOpenChange={(open) => setModalMode(open ? "team" : null)}
        onSubmit={() => createTeamMutation.mutate()}
        open={modalMode === "team"}
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
    </section>
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
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => (
          <button className="rounded-xl border bg-panel p-3 text-left shadow-line transition hover:-translate-y-0.5 hover:shadow-elevated" key={card.label} onClick={() => onOpenSection(card.label === "Teams" ? "teams" : card.label === "Roles" ? "roles" : "users")} type="button">
            <card.icon aria-hidden="true" className="text-primary" size={18} />
            <p className="mt-4 text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border bg-panel p-3.5 shadow-line">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Access health</h2>
              <p className="mt-1 text-sm text-muted-foreground">{organizationName} workforce and access readiness.</p>
            </div>
            <Badge tone={summary.access_health_score >= 80 ? "success" : "warning"}>{summary.access_health_score}% ready</Badge>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Signal label="Role coverage" value={`${roles.length} roles`} />
            <Signal label="Team structure" value={`${teams.length} teams`} />
            <Signal label="User activity" value={`${users.filter((user) => user.is_active).length} active`} />
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${summary.access_health_score}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-panel p-3.5 shadow-line">
          <h2 className="text-base font-semibold">Permission alerts</h2>
          <div className="mt-4 space-y-3">
            <AlertRow label="Pending access requests" value={organizationSummary.pending_access_requests} />
            <AlertRow label="High risk sessions" value={organizationSummary.high_risk_sessions} />
            <AlertRow label="Governance score" value={`${organizationSummary.governance_score}%`} />
          </div>
          <div className="mt-4 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
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

function SectionHeader({ action, description, title }: { action?: React.ReactNode; description: string; title: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-panel p-3.5 shadow-line md:flex-row md:items-start md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function AlertRow({ label, value }: { label: string; value: number | string }) {
  const hasIssue = typeof value === "number" ? value > 0 : false;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/50 px-3 py-2">
      <span className="text-sm">{label}</span>
      <Badge tone={hasIssue ? "warning" : "success"}>{value}</Badge>
    </div>
  );
}

function InsightCard({ icon: Icon, items, title }: { icon: typeof UsersRound; items: string[]; title: string }) {
  return (
    <div className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="text-primary" size={18} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <p className="rounded-lg bg-muted/35 px-3 py-2 text-sm text-muted-foreground" key={item}>{item}</p>
        ))}
      </div>
    </div>
  );
}

function PermissionMatrix({ groups, roles }: { groups: ReturnType<typeof groupPermissions>; roles: RoleRead[] }) {
  return (
    <div className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Permission Matrix</h3>
          <p className="mt-1 text-sm text-muted-foreground">Permissions are grouped by module and evaluated server-side.</p>
        </div>
        <Badge tone="admin">{groups.length} modules</Badge>
      </div>
      <div className="mt-5 overflow-x-auto product-scrollbar">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pr-4">Module</th>
              {roles.slice(0, 5).map((role) => <th className="px-3 py-2" key={role.id}>{role.label || normalizeRoleLabel(role.name)}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y">
            {groups.map((group) => (
              <tr key={group.group}>
                <td className="py-3 pr-4 font-medium capitalize">{group.group}</td>
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

function OrganizationsSection({ organizationName, summary, units }: { organizationName: string; summary: UsersTeamsSummaryRead; units: { id: string; name: string; code: string; unit_type: string; parent_unit_id: string | null; region: string | null }[] }) {
  return (
    <section className="space-y-4">
      <SectionHeader description="Manage the tenant organization structure and keep identity assignments aligned to offices, regions, and locations." title="Organization Structure" />
      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-xl border bg-panel p-3.5 shadow-line">
          <Building2 aria-hidden="true" className="text-primary" size={22} />
          <h3 className="mt-4 text-lg font-semibold">{organizationName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Single-tenant organization workspace with multi-organization readiness.</p>
          <div className="mt-3 grid gap-3">
            <Signal label="Users" value={`${summary.total_users}`} />
            <Signal label="Teams" value={`${summary.teams}`} />
            <Signal label="Roles" value={`${summary.roles}`} />
          </div>
        </div>
        <div className="rounded-xl border bg-panel p-3.5 shadow-line">
          <h3 className="font-semibold">Hierarchy</h3>
          <div className="mt-4 space-y-2">
            {units.map((unit) => (
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/50 px-3 py-3" key={unit.id}>
                <div>
                  <p className="font-medium">{unit.name}</p>
                  <p className="text-xs text-muted-foreground">{unit.code} · {unit.unit_type} · {unit.region ?? "No region"}</p>
                </div>
                <Badge tone={unit.parent_unit_id ? "neutral" : "accent"}>{unit.parent_unit_id ? "Child unit" : "Root"}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PermissionsSection({ catalogGroups, onOpenAccessTest, roles, users }: { catalogGroups: ReturnType<typeof groupPermissions>; onOpenAccessTest: () => void; roles: RoleRead[]; users: UserRead[] }) {
  return (
    <section className="space-y-4">
      <SectionHeader
        action={<Button onClick={onOpenAccessTest} variant="primary"><SearchCheck aria-hidden="true" /> Test access</Button>}
        description="Inspect role permissions, user overrides, and access scopes before assigning people to sensitive workflows."
        title="Permission Management"
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <InsightCard icon={KeyRound} title="Access model" items={["RBAC roles", "Project/location scopes", "Team and own-record boundaries"]} />
        <InsightCard icon={ShieldCheck} title="Configured roles" items={roles.slice(0, 4).map((role) => role.label || normalizeRoleLabel(role.name))} />
        <InsightCard icon={UsersRound} title="Users under control" items={[`${users.length} total users`, `${users.filter((user) => user.is_active).length} active`, `${users.filter((user) => !user.is_active).length} inactive`]} />
      </div>
      <PermissionMatrix groups={catalogGroups} roles={roles} />
    </section>
  );
}

function CreateUserModal({ canManageRoles, canSubmit, draft, onChange, onCreateCustomRole, onOpenChange, onSubmit, open, projects, roleOptions, saving, units }: {
  canManageRoles: boolean;
  canSubmit: boolean;
  draft: typeof defaultUserDraft;
  onChange: (draft: typeof defaultUserDraft) => void;
  onCreateCustomRole: () => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  projects: { id: string; name: string; project_code: string }[];
  roleOptions: [string, string][];
  saving: boolean;
  units: { id: string; name: string; code: string; unit_type: string; region: string | null }[];
}) {
  const scopedUnits = units.filter((unit) => unit.unit_type === draft.scope_type);
  const needsProjectScope = draft.scope_type === "project";
  const needsGeographyScope = ["country", "region", "district", "field_team"].includes(draft.scope_type ?? "");
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
              <Select value={draft.role_name} onChange={(event) => onChange({ ...draft, role_name: event.target.value })}>
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
                Location/team access
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

function CreateTeamModal({ canSubmit, draft, onChange, onOpenChange, onSubmit, open, users }: {
  canSubmit: boolean;
  draft: typeof defaultTeamDraft;
  onChange: (draft: typeof defaultTeamDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  users: UserRead[];
}) {
  return (
    <Modal description="Create an operational team for assignments, supervision, and location-based work." onOpenChange={onOpenChange} open={open} title="Create team" contentClassName="max-w-2xl">
      <div className="grid gap-4 p-5">
        <Input placeholder="Team name" value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Team code" value={draft.code} onChange={(event) => onChange({ ...draft, code: event.target.value.toUpperCase() })} />
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
      </div>
      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <Button onClick={() => onOpenChange(false)} variant="ghost">Cancel</Button>
        <Button disabled={!canSubmit} onClick={onSubmit} variant="primary">Create team</Button>
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
