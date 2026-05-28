"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ClipboardCheck, GitPullRequestArrow, KeyRound, Network, Send, ShieldCheck, Smartphone, UserCheck, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  createAccessRequest,
  createApprovalMatrix,
  createClearanceLevel,
  createDelegation,
  createDepartment,
  createDevice,
  createOperationalZone,
  createTeam,
  createWorkforceProfile,
  getOrganizationGovernanceSummary,
  listAccessRequests,
  listApprovalMatrices,
  listClearanceLevels,
  listDelegations,
  listDepartments,
  listDevices,
  listOperationalZones,
  listSessionLogs,
  listTeams,
  listUsers,
  listWorkforceProfiles,
  reviewAccessRequest,
  simulateAccess,
  type AccessRequestRead,
  type AccessSimulationRead,
  type ApprovalMatrixRead,
  type DelegationRead,
  type DepartmentRead,
  type TeamRead,
  type UserRead,
  type WorkforceProfileRead
} from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import type { LucideIcon } from "lucide-react";

type WorkforceGovernanceCenterProps = {
  token: string | null;
};

type WorkforceSection = "setup" | "access" | "directory" | "security";

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "new-item";
}

function inSevenDays(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString();
}

function formatLabel(value: string | null | undefined): string {
  return value?.replaceAll("_", " ").replaceAll(".", " ") || "Not set";
}

function safeCode(value: string, fallback: string): string {
  const code = slugify(value);
  return code === "new-item" ? fallback : code;
}

export function WorkforceGovernanceCenter({ token }: WorkforceGovernanceCenterProps) {
  const [activeSection, setActiveSection] = useState<WorkforceSection>("setup");
  const [departmentName, setDepartmentName] = useState("Monitoring and Evaluation");
  const [teamName, setTeamName] = useState("District M&E Team");
  const [teamRegion, setTeamRegion] = useState("district-default");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [jobTitle, setJobTitle] = useState("M&E Manager");
  const [delegateUserId, setDelegateUserId] = useState("");
  const [requestPermission, setRequestPermission] = useState("data.export");
  const [simulateUserId, setSimulateUserId] = useState("");
  const [simulatePermissionName, setSimulatePermissionName] = useState("submissions.approve");
  const [simulateGeography, setSimulateGeography] = useState("district-default");
  const [simulation, setSimulation] = useState<AccessSimulationRead | null>(null);
  const pushToast = useWorkspaceStore((state) => state.pushToast);

  const summaryQuery = useQuery({ queryKey: ["org-governance-summary", token], queryFn: () => getOrganizationGovernanceSummary(token ?? ""), enabled: Boolean(token) });
  const departmentsQuery = useQuery({ queryKey: ["departments", token], queryFn: () => listDepartments(token ?? ""), enabled: Boolean(token) });
  const teamsQuery = useQuery({ queryKey: ["teams", token], queryFn: () => listTeams(token ?? ""), enabled: Boolean(token) });
  const usersQuery = useQuery({ queryKey: ["users", token], queryFn: () => listUsers(token ?? ""), enabled: Boolean(token) });
  const profilesQuery = useQuery({ queryKey: ["workforce-profiles", token], queryFn: () => listWorkforceProfiles(token ?? ""), enabled: Boolean(token) });
  const delegationsQuery = useQuery({ queryKey: ["delegations", token], queryFn: () => listDelegations(token ?? ""), enabled: Boolean(token) });
  const matricesQuery = useQuery({ queryKey: ["approval-matrices", token], queryFn: () => listApprovalMatrices(token ?? ""), enabled: Boolean(token) });
  const accessRequestsQuery = useQuery({ queryKey: ["access-requests", token], queryFn: () => listAccessRequests(token ?? ""), enabled: Boolean(token) });
  const clearancesQuery = useQuery({ queryKey: ["clearance-levels", token], queryFn: () => listClearanceLevels(token ?? ""), enabled: Boolean(token) });
  const zonesQuery = useQuery({ queryKey: ["operational-zones", token], queryFn: () => listOperationalZones(token ?? ""), enabled: Boolean(token) });
  const devicesQuery = useQuery({ queryKey: ["devices", token], queryFn: () => listDevices(token ?? ""), enabled: Boolean(token) });
  const sessionsQuery = useQuery({ queryKey: ["sessions", token], queryFn: () => listSessionLogs(token ?? ""), enabled: Boolean(token) });

  const firstDepartmentId = departmentsQuery.data?.[0]?.id ?? null;
  const firstTeamId = teamsQuery.data?.[0]?.id ?? null;
  const firstUserId = usersQuery.data?.[0]?.id ?? "";
  const activeUserId = selectedUserId || firstUserId;
  const activeDelegateUserId = delegateUserId || firstUserId;
  const queriesLoading = [
    summaryQuery,
    departmentsQuery,
    teamsQuery,
    usersQuery,
    profilesQuery,
    delegationsQuery,
    matricesQuery,
    accessRequestsQuery
  ].some((query) => query.isLoading);
  const queriesError = [
    summaryQuery,
    departmentsQuery,
    teamsQuery,
    usersQuery,
    profilesQuery,
    delegationsQuery,
    matricesQuery,
    accessRequestsQuery
  ].some((query) => query.isError);

  const createDepartmentMutation = useMutation({
    mutationFn: () => createDepartment(token ?? "", { name: departmentName, code: safeCode(departmentName, "department"), department_type: "department" }),
    onSuccess: async () => {
      pushToast({ title: "Department created", description: "The organization hierarchy now has a governed business unit.", tone: "success" });
      await Promise.all([departmentsQuery.refetch(), summaryQuery.refetch()]);
    }
  });

  const createTeamMutation = useMutation({
    mutationFn: () => createTeam(token ?? "", { name: teamName, code: safeCode(teamName, "team"), department_id: firstDepartmentId, region: teamRegion }),
    onSuccess: async () => {
      pushToast({ title: "Team created", description: "The team can now be used for assignments, routes, and approval visibility.", tone: "success" });
      await Promise.all([teamsQuery.refetch(), summaryQuery.refetch()]);
    }
  });

  const createProfileMutation = useMutation({
    mutationFn: () =>
      createWorkforceProfile(token ?? "", {
        user_id: activeUserId,
        job_title: jobTitle,
        employee_code: `EMP-${activeUserId.slice(0, 6)}`,
        department_id: firstDepartmentId,
        team_id: firstTeamId,
        clearance_level: "standard"
      }),
    onSuccess: async () => {
      pushToast({ title: "Workforce profile linked", description: "The user now has a managed workforce profile and reporting context.", tone: "success" });
      await Promise.all([profilesQuery.refetch(), summaryQuery.refetch()]);
    }
  });

  const createDelegationMutation = useMutation({
    mutationFn: () =>
      createDelegation(token ?? "", {
        delegate_user_id: activeDelegateUserId,
        permission: "submissions.approve",
        scope_type: "district",
        geography_id: teamRegion,
        starts_at: new Date().toISOString(),
        expires_at: inSevenDays(),
        reason: "Temporary operational coverage"
      }),
    onSuccess: async () => {
      pushToast({ title: "Delegation created", description: "Temporary approval access has an expiry date and audit trail.", tone: "success" });
      await Promise.all([delegationsQuery.refetch(), summaryQuery.refetch()]);
    }
  });

  const createMatrixMutation = useMutation({
    mutationFn: () =>
      createApprovalMatrix(token ?? "", {
        matrix_code: `submission-risk-${Date.now()}`,
        workflow_type: "submission",
        threshold_type: "risk_score",
        threshold_value: 0.7,
        required_role: "district_supervisor",
        approval_stage: "district_review",
        escalation_role: "regional_manager",
        sla_hours: 48
      }),
    onSuccess: async () => {
      pushToast({ title: "Approval matrix created", description: "High-risk submissions now have a defined review and escalation path.", tone: "success" });
      await Promise.all([matricesQuery.refetch(), summaryQuery.refetch()]);
    }
  });

  const createAccessRequestMutation = useMutation({
    mutationFn: () => createAccessRequest(token ?? "", { requested_permission: requestPermission, requested_scope_type: "project", reason: "Need temporary access for operational review." }),
    onSuccess: async () => {
      pushToast({ title: "Access request submitted", description: "Managers can approve or reject it from this center.", tone: "success" });
      await Promise.all([accessRequestsQuery.refetch(), summaryQuery.refetch()]);
    }
  });

  const reviewRequestMutation = useMutation({
    mutationFn: (payload: { id: string; decision: "approved" | "rejected" }) => reviewAccessRequest(token ?? "", payload.id, payload.decision),
    onSuccess: async (request) => {
      pushToast({ title: "Access request reviewed", description: `Request ${request.status}.`, tone: request.status === "approved" ? "success" : "warning" });
      await Promise.all([accessRequestsQuery.refetch(), summaryQuery.refetch()]);
    }
  });

  const foundationMutation = useMutation({
    mutationFn: async () => {
      const clearance = await createClearanceLevel(token ?? "", { code: "standard", label: "Standard operational access", rank: 1, allowed_data_classes: ["operational", "beneficiary"], requires_mfa: false });
      const zone = await createOperationalZone(token ?? "", { code: "district-default", name: "Default District Zone", zone_type: "district", geography_id: "district-default" });
      const device = await createDevice(token ?? "", { device_id: `device-${Date.now()}`, user_id: firstUserId || null, device_type: "mobile", label: "Managed field device", status: "trusted" });
      return { clearance, zone, device };
    },
    onSuccess: async () => {
      pushToast({ title: "Governance foundation added", description: "Clearance, zone, and device records are now active.", tone: "success" });
      await Promise.all([clearancesQuery.refetch(), zonesQuery.refetch(), devicesQuery.refetch(), summaryQuery.refetch()]);
    }
  });

  const simulateMutation = useMutation({
    mutationFn: () => simulateAccess(token ?? "", { user_id: simulateUserId || firstUserId, permission: simulatePermissionName, geography_id: simulateGeography || null }),
    onSuccess: (result) => {
      setSimulation(result);
      pushToast({ title: result.allowed ? "Access allowed" : "Access denied", description: result.reasons[0], tone: result.allowed ? "success" : "warning" });
    }
  });

  const userNameById = useMemo(() => {
    const map = new Map<string, UserRead>();
    for (const user of usersQuery.data ?? []) map.set(user.id, user);
    return map;
  }, [usersQuery.data]);

  const departmentColumns: TableColumn<DepartmentRead>[] = [
    { key: "name", header: "Department", value: (row) => row.name, render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.code}</p></div> },
    { key: "type", header: "Type", value: (row) => row.department_type, render: (row) => formatLabel(row.department_type) },
    { key: "manager", header: "Manager", value: (row) => row.manager_user_id ?? "", render: (row) => row.manager_user_id ? userNameById.get(row.manager_user_id)?.full_name ?? row.manager_user_id.slice(0, 8) : "Unassigned" }
  ];

  const teamColumns: TableColumn<TeamRead>[] = [
    { key: "team", header: "Team", value: (row) => row.name, render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.code}</p></div> },
    { key: "region", header: "Region", value: (row) => row.region ?? "", render: (row) => row.region ?? "No region" },
    { key: "status", header: "Status", value: (row) => row.is_active ? "active" : "inactive", render: (row) => <Badge tone={row.is_active ? "success" : "neutral"}>{row.is_active ? "Active" : "Inactive"}</Badge> }
  ];

  const profileColumns: TableColumn<WorkforceProfileRead>[] = [
    { key: "person", header: "Person", value: (row) => userNameById.get(row.user_id)?.full_name ?? row.user_id, render: (row) => <div><p className="font-medium">{userNameById.get(row.user_id)?.full_name ?? row.user_id.slice(0, 8)}</p><p className="text-xs text-muted-foreground">{row.job_title}</p></div> },
    { key: "status", header: "Lifecycle", value: (row) => row.lifecycle_status, render: (row) => <Badge tone={row.lifecycle_status === "active" ? "success" : "warning"}>{row.lifecycle_status}</Badge> },
    { key: "clearance", header: "Clearance", value: (row) => row.clearance_level, render: (row) => row.clearance_level }
  ];

  const delegationColumns: TableColumn<DelegationRead>[] = [
    { key: "delegate", header: "Delegate", value: (row) => row.delegate_user_id, render: (row) => userNameById.get(row.delegate_user_id)?.full_name ?? row.delegate_user_id.slice(0, 8) },
    { key: "permission", header: "Permission", value: (row) => row.permission, render: (row) => formatLabel(row.permission) },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={row.status === "active" ? "success" : "neutral"}>{row.status}</Badge> }
  ];

  const matrixColumns: TableColumn<ApprovalMatrixRead>[] = [
    { key: "matrix", header: "Matrix", value: (row) => row.matrix_code, render: (row) => <div><p className="font-medium">{row.matrix_code}</p><p className="text-xs text-muted-foreground">{row.workflow_type}</p></div> },
    { key: "role", header: "Required role", value: (row) => row.required_role, render: (row) => formatLabel(row.required_role) },
    { key: "sla", header: "SLA", value: (row) => String(row.sla_hours), render: (row) => `${row.sla_hours} hours` }
  ];

  const accessRequestColumns: TableColumn<AccessRequestRead>[] = [
    { key: "permission", header: "Request", value: (row) => row.requested_permission, render: (row) => <div><p className="font-medium">{formatLabel(row.requested_permission)}</p><p className="text-xs text-muted-foreground">{row.reason || "No reason provided"}</p></div> },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={row.status === "pending" ? "warning" : row.status === "approved" ? "success" : "neutral"}>{row.status}</Badge> },
    { key: "actions", header: "Actions", value: (row) => row.id, render: (row) => row.status === "pending" ? <div className="flex gap-2"><Button size="sm" type="button" variant="secondary" onClick={() => reviewRequestMutation.mutate({ id: row.id, decision: "approved" })}>Approve</Button><Button size="sm" type="button" variant="ghost" onClick={() => reviewRequestMutation.mutate({ id: row.id, decision: "rejected" })}>Reject</Button></div> : "Reviewed" }
  ];

  const summary = summaryQuery.data;
  const summaryCards: { label: string; value: number; icon: LucideIcon }[] = [
    { label: "Departments", value: summary?.departments ?? 0, icon: Network },
    { label: "Teams", value: summary?.teams ?? 0, icon: UsersRound },
    { label: "Profiles", value: summary?.workforce_profiles ?? 0, icon: ShieldCheck },
    { label: "Delegations", value: summary?.active_delegations ?? 0, icon: KeyRound },
    { label: "Devices", value: summary?.devices ?? 0, icon: Smartphone }
  ];
  const setupProgress = Math.round(
    ([
      Boolean(summary?.departments),
      Boolean(summary?.teams),
      Boolean(summary?.workforce_profiles),
      Boolean(summary?.approval_matrices),
      Boolean(summary?.clearance_levels),
      Boolean(summary?.devices)
    ].filter(Boolean).length /
      6) *
      100
  );
  const nextBestAction =
    !summary?.departments
      ? "Create your first department"
      : !summary.teams
        ? "Create an operational team"
        : !summary.workforce_profiles
          ? "Assign a user to a team"
          : !summary.approval_matrices
            ? "Add an approval rule"
            : !summary.clearance_levels || !summary.devices
              ? "Add safeguards"
              : "Test a user's access";
  const sections: { id: WorkforceSection; label: string; hint: string }[] = [
    { id: "setup", label: "Setup", hint: "Departments, teams, people" },
    { id: "access", label: "Access", hint: "Requests, delegation, simulation" },
    { id: "directory", label: "Directory", hint: "Tables and assignments" },
    { id: "security", label: "Security", hint: "Devices, sessions, clearances" }
  ];

  return (
    <section aria-labelledby="workforce-title" className="space-y-5">
      <div className="surface-premium overflow-hidden rounded-2xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Organizational governance</p>
            <h1 id="workforce-title" className="mt-2 text-2xl font-semibold tracking-tight">Workforce command center</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Set up teams, assign people, review access requests, and test exactly what each user can see before they start working.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={summary?.attention_items.length ? "warning" : "success"}>{summary?.governance_score ?? 0}% governed</Badge>
            <Button disabled={foundationMutation.isPending || !firstUserId} type="button" variant="secondary" onClick={() => foundationMutation.mutate()}>
              <ShieldCheck aria-hidden="true" />
              Add safeguards
            </Button>
            <Button disabled={createMatrixMutation.isPending} type="button" variant="primary" onClick={() => createMatrixMutation.mutate()}>
              <ClipboardCheck aria-hidden="true" />
              Add approval rule
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ["1", "Create departments", "Mirror your real organization structure."],
            ["2", "Create teams", "Group staff by region, project, or function."],
            ["3", "Assign profiles", "Connect each user to a manager, team, and clearance."],
            ["4", "Test access", "Verify access before work or exports begin."]
          ].map(([step, title, text]) => (
            <div className="rounded-xl border bg-background/70 p-3" key={step}>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{step}</span>
                <p className="text-sm font-medium">{title}</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border bg-background/75 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Setup progress</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Complete the basics before field teams begin collecting or approving data.</p>
              </div>
              <Badge tone={setupProgress >= 80 ? "success" : setupProgress >= 40 ? "warning" : "neutral"}>{setupProgress}% ready</Badge>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${setupProgress}%` }} />
            </div>
          </div>
          <div className="rounded-xl border bg-primary/5 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Next best action</p>
            <p className="mt-2 text-sm font-semibold">{nextBestAction}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">This keeps setup focused and prevents broad access before teams are structured.</p>
          </div>
        </div>
      </div>

      {queriesLoading ? (
        <div className="rounded-2xl border bg-panel p-4 text-sm text-muted-foreground">Loading workforce governance records...</div>
      ) : null}
      {queriesError ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm" role="alert">
          Some workforce governance data could not load. Check your connection and permissions, then refresh.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-5">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div className="surface-premium rounded-2xl p-4" key={label}>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon aria-hidden="true" className="text-primary" size={17} />
            </div>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {summary?.attention_items.length ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle aria-hidden="true" size={17} />
            <h2 className="text-sm font-semibold">Access governance attention</h2>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {summary.attention_items.map((item) => <p className="rounded-lg bg-background/70 p-3 text-sm" key={item}>{item}</p>)}
          </div>
        </div>
      ) : null}

      <div className="surface-premium rounded-2xl p-2">
        <div className="grid gap-2 md:grid-cols-4">
          {sections.map((section) => (
            <button
              className={`rounded-xl px-4 py-3 text-left transition ${
                activeSection === section.id ? "bg-primary/10 text-primary shadow-line" : "hover:bg-muted/60"
              }`}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              <span className="block text-sm font-semibold">{section.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{section.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {activeSection === "setup" ? (
      <div className="grid gap-4 xl:grid-cols-4">
        <form className="rounded-2xl border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); createDepartmentMutation.mutate(); }}>
          <div className="flex items-center gap-2">
            <Network aria-hidden="true" size={17} />
            <h2 className="text-sm font-semibold">Add a department</h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Use departments for M&E, programs, finance, compliance, and operations.</p>
          <label className="mt-3 block text-xs font-medium text-muted-foreground">
            Department name
            <Input className="mt-1" value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} />
          </label>
          <Button className="mt-4 w-full" disabled={!departmentName.trim() || createDepartmentMutation.isPending} type="submit" variant="primary">Create department</Button>
        </form>
        <form className="rounded-2xl border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); createTeamMutation.mutate(); }}>
          <div className="flex items-center gap-2">
            <UsersRound aria-hidden="true" size={17} />
            <h2 className="text-sm font-semibold">Create a team</h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Teams route field work, review queues, and alerts to the right people.</p>
          <label className="mt-3 block text-xs font-medium text-muted-foreground">
            Team name
            <Input className="mt-1" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
          </label>
          <label className="mt-2 block text-xs font-medium text-muted-foreground">
            Region or district code
            <Input className="mt-1" value={teamRegion} onChange={(event) => setTeamRegion(event.target.value)} />
          </label>
          <Button className="mt-4 w-full" disabled={!teamName.trim() || createTeamMutation.isPending} type="submit" variant="primary">Create team</Button>
        </form>
        <form className="rounded-2xl border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); createProfileMutation.mutate(); }}>
          <div className="flex items-center gap-2">
            <UserCheck aria-hidden="true" size={17} />
            <h2 className="text-sm font-semibold">Assign a person</h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Link an existing user to a job title, team, and clearance level.</p>
          <label className="mt-3 block text-xs font-medium text-muted-foreground">
            User
            <Select className="mt-1" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
            <option value="">Choose user</option>
            {(usersQuery.data ?? []).map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
            </Select>
          </label>
          <label className="mt-2 block text-xs font-medium text-muted-foreground">
            Job title
            <Input className="mt-1" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
          </label>
          <Button className="mt-4 w-full" disabled={!firstUserId || !firstDepartmentId || !firstTeamId || createProfileMutation.isPending} type="submit" variant="primary">Assign profile</Button>
        </form>
        <form className="rounded-2xl border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); createDelegationMutation.mutate(); }}>
          <div className="flex items-center gap-2">
            <KeyRound aria-hidden="true" size={17} />
            <h2 className="text-sm font-semibold">Delegate approval</h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Temporarily allow someone to approve submissions for this district.</p>
          <label className="mt-3 block text-xs font-medium text-muted-foreground">
            Delegate to
            <Select className="mt-1" value={delegateUserId} onChange={(event) => setDelegateUserId(event.target.value)}>
            <option value="">Choose delegate</option>
            {(usersQuery.data ?? []).map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
            </Select>
          </label>
          <Button className="mt-4 w-full" disabled={!firstUserId || createDelegationMutation.isPending} type="submit" variant="primary">Delegate approval</Button>
        </form>
      </div>
      ) : null}

      {activeSection === "access" ? (
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <section className="surface-premium rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <GitPullRequestArrow aria-hidden="true" size={18} />
            <h2 className="text-sm font-semibold">Check what a user can access</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Test a real permission before assigning work. This helps managers confirm whether a user can approve, export, or view data in a specific area.
          </p>
          <form className="mt-4 grid gap-4 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); simulateMutation.mutate(); }}>
            <label className="block text-sm font-medium">
              User
              <Select className="mt-2" value={simulateUserId} onChange={(event) => setSimulateUserId(event.target.value)}>
                <option value="">Choose user</option>
                {(usersQuery.data ?? []).map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
              </Select>
            </label>
            <label className="block text-sm font-medium">
              Permission
              <Input className="mt-2" value={simulatePermissionName} onChange={(event) => setSimulatePermissionName(event.target.value)} />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">Example: submissions.approve or data.export</span>
            </label>
            <label className="block text-sm font-medium">
              Geography
              <Input className="mt-2" value={simulateGeography} onChange={(event) => setSimulateGeography(event.target.value)} />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">Use the district or region code assigned to the user.</span>
            </label>
            <Button className="self-end" disabled={!firstUserId || simulateMutation.isPending} type="submit" variant="primary">Test access</Button>
          </form>
          {simulation ? (
            <div className="mt-4 rounded-xl border bg-background/80 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={simulation.allowed ? "success" : "warning"}>{simulation.allowed ? "Allowed" : "Denied"}</Badge>
                <span className="text-sm text-muted-foreground">Matched scope: {formatLabel(simulation.matched_scope)}</span>
              </div>
              <p className="mt-3 text-sm font-medium">Roles: {simulation.matched_roles.map(formatLabel).join(", ") || "none"}</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {simulation.reasons.map((reason) => (
                  <p className="flex gap-2 rounded-lg bg-muted/45 p-3 text-sm" key={reason}>
                    <CheckCircle2 aria-hidden="true" className={simulation.allowed ? "text-success" : "text-warning"} size={15} />
                    <span>{reason}</span>
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="surface-premium rounded-2xl p-4">
          <h2 className="text-sm font-semibold">Common manager actions</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Use these when you need a fast setup baseline or a controlled access request.</p>
          <div className="mt-4 space-y-3">
            <Button className="w-full justify-start" disabled={createMatrixMutation.isPending} type="button" variant="secondary" onClick={() => createMatrixMutation.mutate()}>
              <ClipboardCheck aria-hidden="true" />
              Create high-risk approval rule
            </Button>
            <Button className="w-full justify-start" disabled={foundationMutation.isPending || !firstUserId} type="button" variant="secondary" onClick={() => foundationMutation.mutate()}>
              <ShieldCheck aria-hidden="true" />
              Add standard safeguards
            </Button>
            <div className="rounded-xl border bg-background/80 p-3">
              <p className="text-sm font-medium">Request access</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Create a reviewable request instead of granting broad permissions informally.</p>
              <Input className="mt-2" value={requestPermission} onChange={(event) => setRequestPermission(event.target.value)} />
              <Button className="mt-3 w-full" disabled={createAccessRequestMutation.isPending} type="button" variant="primary" onClick={() => createAccessRequestMutation.mutate()}>
                <Send aria-hidden="true" />
                Submit request
              </Button>
            </div>
          </div>
        </aside>
      </div>
      ) : null}

      {activeSection === "directory" ? (
      <div className="grid gap-5 xl:grid-cols-2">
        <DataTable columns={departmentColumns} emptyLabel="No departments yet" rows={departmentsQuery.data ?? []} searchLabel="Search departments" title="Departments and business units" />
        <DataTable columns={teamColumns} emptyLabel="No teams yet" rows={teamsQuery.data ?? []} searchLabel="Search teams" title="Operational teams" />
        <DataTable columns={profileColumns} emptyLabel="No workforce profiles yet" rows={profilesQuery.data ?? []} searchLabel="Search workforce" title="Workforce directory" />
        <DataTable columns={delegationColumns} emptyLabel="No active delegations yet" rows={delegationsQuery.data ?? []} searchLabel="Search delegations" title="Temporary delegations" />
        <DataTable columns={matrixColumns} emptyLabel="No approval matrices yet" rows={matricesQuery.data ?? []} searchLabel="Search matrices" title="Approval matrices" />
        <DataTable columns={accessRequestColumns} emptyLabel="No access requests yet" rows={accessRequestsQuery.data ?? []} searchLabel="Search requests" title="Access requests" />
      </div>
      ) : null}

      {activeSection === "security" ? (
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Clearance levels", clearancesQuery.data?.length ?? 0, "Who can access sensitive datasets"],
          ["Operational zones", zonesQuery.data?.length ?? 0, "Geographic areas used for scoped access"],
          ["Trusted devices", devicesQuery.data?.length ?? 0, "Registered mobile and desktop devices"],
          ["Session logs", sessionsQuery.data?.length ?? 0, "Recent access and risk history"]
        ].map(([label, value, text]) => (
          <div className="rounded-2xl border bg-panel p-4" key={String(label)}>
            <p className="text-xs text-muted-foreground">{String(label)}</p>
            <p className="mt-2 text-2xl font-semibold">{String(value)}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{String(text)}</p>
          </div>
        ))}
        <div className="rounded-2xl border bg-panel p-4 md:col-span-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Security baseline</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Create standard clearance, a district zone, and a trusted device record for field operations.</p>
            </div>
            <Button disabled={foundationMutation.isPending || !firstUserId} type="button" variant="primary" onClick={() => foundationMutation.mutate()}>
              <ShieldCheck aria-hidden="true" />
              Add standard safeguards
            </Button>
          </div>
        </div>
      </div>
      ) : null}
    </section>
  );
}
