"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Archive,
  Building2,
  CheckCircle2,
  Database,
  FileClock,
  Flag,
  HeartPulse,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  PlugZap,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  createOrganization,
  createOrganizationSupportSession,
  getPlatformSettings,
  getPlatformSummary,
  getPlatformSystemHealth,
  listPlatformAuditLogs,
  listPlatformBackups,
  listPlatformFeatureFlags,
  listPlatformIntegrations,
  listPlatformLeads,
  listPlatformOrganizations,
  listPlatformOrganizationPlans,
  listPlatformRoles,
  listPlatformSecurityEvents,
  listPlatformSupportSessions,
  listPlatformUsage,
  listPlatformUsers,
  runPlatformUserSecurityAction,
  updatePlatformFeatureFlag,
  updatePlatformOrganizationStatus,
  type CurrentPrincipal,
  type PlatformAuditLogRead,
  type PlatformBackupJobRead,
  type PlatformFeatureFlagRead,
  type PlatformHealthServiceRead,
  type PlatformIntegrationRead,
  type PlatformLeadRead,
  type PlatformOrganizationRead,
  type PlatformOrganizationPlanRead,
  type PlatformOrganizationUsageRead,
  type PlatformRoleTemplateRead,
  type PlatformSecurityEventRead,
  type PlatformSupportSessionRead,
  type PlatformUserRead,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type PlatformConsoleProps = {
  onSignOut?: () => void;
  onTokenChanged?: (token: string) => void;
  principal?: CurrentPrincipal | null;
  token: string | null;
};

type PlatformSection =
  | "overview"
  | "organizations"
  | "users"
  | "roles"
  | "feature-flags"
  | "system-health"
  | "audit-logs"
  | "security"
  | "integrations"
  | "backups"
  | "settings";

type ConsoleSection = {
  description: string;
  icon: LucideIcon;
  id: PlatformSection;
  label: string;
  route: string;
};

type DangerousAction =
  | { kind: "suspend" | "reactivate"; organization: PlatformOrganizationRead }
  | { kind: "support"; organization: PlatformOrganizationRead }
  | { kind: "feature-enable" | "feature-disable"; flag: PlatformFeatureFlagRead }
  | { kind: "user-lock" | "user-unlock" | "user-reset" | "user-revoke" | "user-mfa"; user: PlatformUserRead }
  | { kind: "backup" | "maintenance" }
  | null;

const consoleSections: ConsoleSection[] = [
  { id: "overview", label: "Platform Overview", route: "/platform/overview", icon: Activity, description: "Tenant health and platform readiness." },
  { id: "organizations", label: "Organizations", route: "/platform/organizations", icon: Building2, description: "Tenant lifecycle and usage." },
  { id: "users", label: "Global Users", route: "/platform/users", icon: UsersRound, description: "Cross-organization identity support." },
  { id: "roles", label: "Global Roles", route: "/platform/roles", icon: UserCog, description: "Protected role templates." },
  { id: "feature-flags", label: "Feature Flags", route: "/platform/feature-flags", icon: Flag, description: "Global and tenant feature controls." },
  { id: "system-health", label: "System Health", route: "/platform/system-health", icon: HeartPulse, description: "API, database, jobs, and services." },
  { id: "audit-logs", label: "Audit Logs", route: "/platform/audit-logs", icon: FileClock, description: "Immutable platform events." },
  { id: "security", label: "Security", route: "/platform/security", icon: LockKeyhole, description: "Sessions, MFA, and risk events." },
  { id: "integrations", label: "Integrations", route: "/platform/integrations", icon: PlugZap, description: "Platform-wide providers." },
  { id: "backups", label: "Backups", route: "/platform/backups", icon: Database, description: "Backup jobs and restore points." },
  { id: "settings", label: "Platform Settings", route: "/platform/settings", icon: Settings, description: "Safe global runtime settings." },
];

function sectionFromPath(): PlatformSection {
  if (typeof window === "undefined") return "overview";
  const segment = window.location.pathname.split("/").filter(Boolean)[1];
  return consoleSections.some((section) => section.id === segment)
    ? (segment as PlatformSection)
    : "overview";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" | "platform" {
  const normalized = status.toLowerCase();
  if (["active", "healthy", "enabled", "configured", "success"].includes(normalized)) return "success";
  if (["critical", "suspended", "failed", "locked"].includes(normalized)) return "danger";
  if (["warning", "trial", "scheduled", "not_connected", "open"].includes(normalized)) return "warning";
  return "neutral";
}

function formatDate(value?: string | null): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Panel({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="surface-premium rounded-lg p-5">
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  tone = "neutral",
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "platform";
  value: string;
}) {
  return (
    <article className="rounded-lg border bg-panel p-4 shadow-line">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <span className="rounded-lg border bg-muted/40 p-2">
          <Icon aria-hidden="true" size={18} />
        </span>
      </div>
      <div className="mt-3">
        <Badge tone={tone}>{tone === "platform" ? "global" : tone}</Badge>
      </div>
    </article>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}

export function PlatformConsole({
  onSignOut,
  onTokenChanged,
  principal,
  token,
}: PlatformConsoleProps) {
  const [activeSection, setActiveSection] = useState<PlatformSection>("overview");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [organizationSlugEdited, setOrganizationSlugEdited] = useState(false);
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("ChangeMe12345!");
  const [dangerAction, setDangerAction] = useState<DangerousAction>(null);
  const [dangerReason, setDangerReason] = useState("");
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const operatorName =
    principal?.full_name?.trim() || principal?.email || "Platform operator";
  const operatorRole =
    principal?.roles?.[0]?.replaceAll("_", " ") ?? "Super Admin";

  useEffect(() => {
    setActiveSection(sectionFromPath());
  }, []);

  const enabled = Boolean(token && principal?.platform_admin && !principal.support_mode);
  const organizationsQuery = useQuery({ queryKey: ["platform-organizations", token], queryFn: () => listPlatformOrganizations(token ?? ""), enabled });
  const summaryQuery = useQuery({ queryKey: ["platform-summary", token], queryFn: () => getPlatformSummary(token ?? ""), enabled });
  const usersQuery = useQuery({ queryKey: ["platform-global-users", token], queryFn: () => listPlatformUsers(token ?? ""), enabled });
  const auditQuery = useQuery({ queryKey: ["platform-audit-logs", token], queryFn: () => listPlatformAuditLogs(token ?? "", 100), enabled });
  const settingsQuery = useQuery({ queryKey: ["platform-settings", token], queryFn: () => getPlatformSettings(token ?? ""), enabled });
  const rolesQuery = useQuery({ queryKey: ["platform-roles", token], queryFn: () => listPlatformRoles(token ?? ""), enabled });
  const flagsQuery = useQuery({ queryKey: ["platform-feature-flags", token], queryFn: () => listPlatformFeatureFlags(token ?? ""), enabled });
  const healthQuery = useQuery({ queryKey: ["platform-system-health", token], queryFn: () => getPlatformSystemHealth(token ?? ""), enabled });
  const securityQuery = useQuery({ queryKey: ["platform-security", token], queryFn: () => listPlatformSecurityEvents(token ?? ""), enabled });
  const integrationsQuery = useQuery({ queryKey: ["platform-integrations", token], queryFn: () => listPlatformIntegrations(token ?? ""), enabled });
  const backupsQuery = useQuery({ queryKey: ["platform-backups", token], queryFn: () => listPlatformBackups(token ?? ""), enabled });
  const usageQuery = useQuery({ queryKey: ["platform-usage", token], queryFn: () => listPlatformUsage(token ?? ""), enabled });
  const leadsQuery = useQuery({ queryKey: ["platform-leads", token], queryFn: () => listPlatformLeads(token ?? ""), enabled });
  const plansQuery = useQuery({ queryKey: ["platform-organization-plans", token], queryFn: () => listPlatformOrganizationPlans(token ?? ""), enabled });
  const supportSessionsQuery = useQuery({ queryKey: ["platform-support-sessions", token], queryFn: () => listPlatformSupportSessions(token ?? ""), enabled });

  const createOrganizationMutation = useMutation({
    mutationFn: () =>
      createOrganization(token ?? "", {
        name: organizationName.trim(),
        slug: organizationSlug.trim(),
        owner_email: ownerEmail.trim() || undefined,
        owner_full_name: ownerFullName.trim() || undefined,
        owner_password: ownerPassword.trim() || undefined,
      }),
    onSuccess: async (organization) => {
      setOrganizationName("");
      setOrganizationSlug("");
      setOrganizationSlugEdited(false);
      setOwnerFullName("");
      setOwnerEmail("");
      await organizationsQuery.refetch();
      await summaryQuery.refetch();
      pushToast({
        title: "Organization created",
        description: `${organization.name} is ready for first admin setup.`,
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Organization was not created",
        description: "Check the organization code, owner email, and Super Admin session.",
        tone: "danger",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ organization, isActive }: { organization: PlatformOrganizationRead; isActive: boolean }) =>
      updatePlatformOrganizationStatus(token ?? "", organization.id, isActive, dangerReason.trim()),
    onSuccess: async (organization) => {
      await organizationsQuery.refetch();
      await summaryQuery.refetch();
      await auditQuery.refetch();
      setDangerAction(null);
      setDangerReason("");
      pushToast({
        title: organization.is_active ? "Organization reactivated" : "Organization suspended",
        description: "The tenant lifecycle change was recorded for audit review.",
        tone: organization.is_active ? "success" : "warning",
      });
    },
    onError: () => {
      pushToast({
        title: "Organization status was not changed",
        description: "Confirm your Super Admin session and try again.",
        tone: "danger",
      });
    },
  });

  const supportMutation = useMutation({
    mutationFn: (organization: PlatformOrganizationRead) =>
      createOrganizationSupportSession(token ?? "", organization.id, dangerReason.trim()),
    onSuccess: (response) => {
      setDangerAction(null);
      setDangerReason("");
      onTokenChanged?.(response.access_token);
      pushToast({
        title: "Support access started",
        description: "You are entering tenant support mode with a visible support banner.",
        tone: "warning",
      });
    },
    onError: () => {
      pushToast({
        title: "Support access was blocked",
        description: "Confirm the organization is active and your Super Admin session is valid.",
        tone: "danger",
      });
    },
  });

  const userSecurityMutation = useMutation({
    mutationFn: ({ user, action }: { user: PlatformUserRead; action: "lock" | "unlock" | "force_password_reset" | "revoke_sessions" | "require_mfa" }) =>
      runPlatformUserSecurityAction(token ?? "", user.user_id, { action, reason: dangerReason.trim() }),
    onSuccess: async (result) => {
      await usersQuery.refetch();
      await auditQuery.refetch();
      await securityQuery.refetch();
      setDangerAction(null);
      setDangerReason("");
      pushToast({
        title: "Security action recorded",
        description: result.message,
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Security action was blocked",
        description: "Confirm the target account, reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  const featureFlagMutation = useMutation({
    mutationFn: ({ flag, enabled: nextEnabled }: { flag: PlatformFeatureFlagRead; enabled: boolean }) =>
      updatePlatformFeatureFlag(token ?? "", flag.key, { global_enabled: nextEnabled, reason: dangerReason.trim() }),
    onSuccess: async (flag) => {
      await flagsQuery.refetch();
      await auditQuery.refetch();
      setDangerAction(null);
      setDangerReason("");
      pushToast({
        title: `${flag.label} flag updated`,
        description: "The requested global feature flag change was captured in the platform audit trail.",
        tone: flag.global_enabled ? "success" : "warning",
      });
    },
    onError: () => {
      pushToast({
        title: "Feature flag was not changed",
        description: "Confirm the flag key and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  const activeDefinition = consoleSections.find((section) => section.id === activeSection) ?? consoleSections[0];
  const organizations = organizationsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const auditLogs = auditQuery.data ?? [];
  const flags = flagsQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const services = healthQuery.data?.services ?? [];
  const securityEvents = securityQuery.data ?? [];
  const integrations = integrationsQuery.data ?? [];
  const backups = backupsQuery.data ?? [];
  const usageRows = usageQuery.data ?? [];
  const leads = leadsQuery.data ?? [];
  const organizationPlans = plansQuery.data ?? [];
  const supportSessions = supportSessionsQuery.data ?? [];

  const platformCards = [
    { label: "Organizations", value: String(summaryQuery.data?.organization_count ?? organizations.length), icon: Building2, tone: "platform" as const },
    { label: "Active Organizations", value: String(summaryQuery.data?.active_organization_count ?? organizations.filter((item) => item.is_active).length), icon: CheckCircle2, tone: "success" as const },
    { label: "Global Users", value: String(summaryQuery.data?.tenant_user_count ?? users.length), icon: UsersRound, tone: "neutral" as const },
    { label: "Platform Admins", value: String(summaryQuery.data?.platform_admin_count ?? users.filter((user) => user.role_name === "super_admin").length), icon: ShieldCheck, tone: "platform" as const },
    { label: "Feature Flags", value: String(flags.length), icon: Flag, tone: "neutral" as const },
    { label: "System Health", value: healthQuery.data?.status ?? "checking", icon: HeartPulse, tone: statusTone(healthQuery.data?.status ?? "warning") },
    { label: "Backups", value: String(backups.length), icon: Database, tone: "warning" as const },
    { label: "Audit Events", value: String(summaryQuery.data?.audit_event_count ?? auditLogs.length), icon: FileClock, tone: "neutral" as const },
  ];

  const organizationColumns = useMemo<TableColumn<PlatformOrganizationRead>[]>(
    () => [
      {
        key: "name",
        header: "Organization",
        value: (row) => row.name,
        render: (row) => (
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.slug.toUpperCase()}</p>
          </div>
        ),
      },
      { key: "status", header: "Status", value: (row) => (row.is_active ? "active" : "suspended"), render: (row) => <Badge tone={row.is_active ? "success" : "danger"}>{row.is_active ? "Active" : "Suspended"}</Badge> },
      { key: "owner", header: "First admin", value: (row) => row.owner_email ?? "", render: (row) => row.owner_email ?? "Not assigned" },
      { key: "usage", header: "Usage", value: (row) => String(row.user_count), render: (row) => `${row.user_count} users` },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setDangerAction({ kind: "support", organization: row })}>
              <LifeBuoy aria-hidden="true" />
              Support
            </Button>
            <Button size="sm" variant={row.is_active ? "danger" : "primary"} onClick={() => setDangerAction({ kind: row.is_active ? "suspend" : "reactivate", organization: row })}>
              {row.is_active ? <Archive aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
              {row.is_active ? "Suspend" : "Reactivate"}
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const userColumns = useMemo<TableColumn<PlatformUserRead>[]>(
    () => [
      { key: "user", header: "User", value: (row) => `${row.full_name} ${row.email}`, render: (row) => <div><p className="font-medium">{row.full_name}</p><p className="text-xs text-muted-foreground">{row.email}</p></div> },
      { key: "organization", header: "Organization", value: (row) => row.organization_name, render: (row) => row.organization_name },
      { key: "role", header: "Role", value: (row) => row.role_name, render: (row) => <Badge tone={row.role_name === "super_admin" ? "platform" : "neutral"}>{row.role_name}</Badge> },
      { key: "status", header: "Status", value: (row) => String(row.is_active && row.membership_active), render: (row) => <Badge tone={row.is_active && row.membership_active ? "success" : "danger"}>{row.is_active && row.membership_active ? "Active" : "Locked"}</Badge> },
      { key: "updated", header: "Updated", value: (row) => row.updated_at, render: (row) => formatDate(row.updated_at) },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" type="button" variant="secondary" onClick={() => setDangerAction({ kind: row.is_active ? "user-lock" : "user-unlock", user: row })}>
              {row.is_active ? "Lock" : "Unlock"}
            </Button>
            <Button size="sm" type="button" variant="secondary" onClick={() => setDangerAction({ kind: "user-reset", user: row })}>
              Reset
            </Button>
            <Button size="sm" type="button" variant="secondary" onClick={() => setDangerAction({ kind: "user-revoke", user: row })}>
              Revoke sessions
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const auditColumns = useMemo<TableColumn<PlatformAuditLogRead>[]>(
    () => [
      { key: "time", header: "Time", value: (row) => row.created_at, render: (row) => formatDate(row.created_at) },
      { key: "action", header: "Action", value: (row) => row.action, render: (row) => <span className="font-medium">{row.action}</span> },
      { key: "actor", header: "Actor", value: (row) => row.actor_email ?? "", render: (row) => row.actor_email ?? "System" },
      { key: "organization", header: "Organization", value: (row) => row.organization_name ?? "", render: (row) => row.organization_name ?? "Platform" },
      { key: "resource", header: "Resource", value: (row) => row.resource_type, render: (row) => `${row.resource_type} / ${row.resource_id}` },
    ],
    [],
  );

  const renderOverview = () => (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {platformCards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <TenantUsageSnapshot rows={usageRows} />
        <LeadPipeline leads={leads} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Platform health" description="A Super Admin should know immediately whether the platform is configured and operating correctly.">
          <div className="grid gap-3 md:grid-cols-2">
            {services.slice(0, 6).map((service) => <ServiceCard key={service.service} service={service} />)}
          </div>
        </Panel>
        <Panel title="Recent configuration changes" description="Immutable audit events from platform and tenant support actions.">
          <div className="space-y-3">
            {auditLogs.slice(0, 6).map((log) => (
              <div className="rounded-lg border bg-panel p-3" key={log.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{log.action}</p>
                  <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{log.actor_email ?? "System"} · {log.organization_name ?? "Platform"}</p>
              </div>
            ))}
            {!auditLogs.length ? <EmptyState title="No audit events yet" detail="Platform organization, support, security, and backup actions will appear here." /> : null}
          </div>
        </Panel>
      </div>
    </div>
  );

  const renderOrganizations = () => (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Panel title="Create organization" description="Provision a tenant shell and first organization admin.">
          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            createOrganizationMutation.mutate();
          }}>
            <Input placeholder="Organization name" value={organizationName} onChange={(event) => {
              setOrganizationName(event.target.value);
              if (!organizationSlugEdited) setOrganizationSlug(slugify(event.target.value));
            }} required />
            <Input placeholder="Organization code" value={organizationSlug} onChange={(event) => {
              setOrganizationSlugEdited(true);
              setOrganizationSlug(slugify(event.target.value));
            }} required />
            <Input placeholder="First admin full name" value={ownerFullName} onChange={(event) => setOwnerFullName(event.target.value)} />
            <Input placeholder="First admin email" type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} />
            <Input placeholder="Temporary password" type="password" value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} />
            <Button className="w-full" disabled={createOrganizationMutation.isPending || !organizationName.trim() || !organizationSlug.trim()} type="submit" variant="primary">
              <Plus aria-hidden="true" />
              Create organization
            </Button>
          </form>
        </Panel>
        <DataTable columns={organizationColumns} emptyLabel={organizationsQuery.isFetching ? "Loading organizations..." : "No organizations found"} rows={organizations} searchLabel="Search organizations" title="Organizations" />
      </div>
      <OrganizationPlanGrid plans={organizationPlans} />
    </div>
  );

  const renderRoles = () => (
    <Panel title="Global role templates" description="Super Admin is a protected global template. System Admin and business roles are organization-level templates.">
      <div className="grid gap-3 lg:grid-cols-2">
        {roles.map((role: PlatformRoleTemplateRead) => (
          <article className="rounded-lg border bg-panel p-4 shadow-line" key={role.key}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{role.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{role.scope}</p>
              </div>
              <Badge tone={role.protected ? "platform" : "neutral"}>{role.protected ? "Protected" : role.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{role.permissions.join(", ")}</p>
          </article>
        ))}
      </div>
    </Panel>
  );

  const renderFlags = () => (
    <Panel title="Feature flags" description="Use global defaults with future organization overrides. Every change must be audited.">
      <div className="grid gap-3 lg:grid-cols-2">
        {flags.map((flag: PlatformFeatureFlagRead) => (
          <article className="rounded-lg border bg-panel p-4" key={flag.key}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{flag.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{flag.description}</p>
              </div>
              <Badge tone={flag.global_enabled ? "success" : "neutral"}>{flag.global_enabled ? "Enabled" : "Disabled"}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span>Env: {flag.environment}</span>
              <span>Rollout: {flag.rollout_percentage}%</span>
              <span>Overrides: {flag.organization_overrides}</span>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                type="button"
                variant={flag.global_enabled ? "secondary" : "primary"}
                onClick={() => setDangerAction({ kind: flag.global_enabled ? "feature-disable" : "feature-enable", flag })}
              >
                {flag.global_enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );

  const renderHealth = () => (
    <Panel title="System health" description="Safe health checks for API, database, queue, storage, notifications, jobs, and backups.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => <ServiceCard key={service.service} service={service} />)}
      </div>
    </Panel>
  );

  const renderSettings = () => {
    const settings = settingsQuery.data;
    return (
      <Panel title="Platform settings" description="Read-only safe runtime settings. Dangerous settings will require confirmation, reason, and re-authentication before write controls are enabled.">
        {settings ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["Platform name", settings.app_name],
              ["Environment", settings.app_env],
              ["API version", settings.api_version],
              ["Token timeout", `${settings.access_token_expire_minutes} minutes`],
              ["Database", settings.database_configured ? "Configured" : "Missing"],
              ["JWT secret", settings.jwt_secret_configured ? "Configured" : "Weak or missing"],
              ["Redis", settings.redis_configured ? "Configured" : "Local or missing"],
              ["Kafka", settings.kafka_configured ? "Configured" : "Local or missing"],
            ].map(([label, value]) => (
              <div className="rounded-lg border bg-panel p-4" key={label}>
                <p className="text-xs uppercase text-muted-foreground">{label}</p>
                <p className="mt-2 font-medium">{value}</p>
              </div>
            ))}
          </div>
        ) : <EmptyState title="Settings are loading" detail="Safe runtime settings will appear after the platform API responds." />}
      </Panel>
    );
  };

  const renderTableSection = () => {
    if (activeSection === "users") return <DataTable columns={userColumns} emptyLabel={usersQuery.isFetching ? "Loading users..." : "No users found"} rows={users} searchLabel="Search global users" title="Global users" />;
    if (activeSection === "audit-logs") return <DataTable columns={auditColumns} emptyLabel={auditQuery.isFetching ? "Loading audit logs..." : "No audit logs found"} rows={auditLogs} searchLabel="Search audit logs" title="Platform audit logs" />;
    if (activeSection === "security") return <SecurityEvents events={securityEvents} supportSessions={supportSessions} />;
    if (activeSection === "integrations") return <Integrations rows={integrations} />;
    if (activeSection === "backups") return <Backups rows={backups} onTrigger={() => setDangerAction({ kind: "backup" })} />;
    return null;
  };

  function confirmDangerousAction() {
    if (!dangerAction || !dangerReason.trim()) return;
    if ("organization" in dangerAction) {
      if (dangerAction.kind === "support") {
        supportMutation.mutate(dangerAction.organization);
        return;
      }
      statusMutation.mutate({
        organization: dangerAction.organization,
        isActive: dangerAction.kind === "reactivate",
      });
      return;
    }
    if ("user" in dangerAction) {
      const actionMap = {
        "user-lock": "lock",
        "user-unlock": "unlock",
        "user-reset": "force_password_reset",
        "user-revoke": "revoke_sessions",
        "user-mfa": "require_mfa",
      } as const;
      userSecurityMutation.mutate({ user: dangerAction.user, action: actionMap[dangerAction.kind] });
      return;
    }
    if ("flag" in dangerAction) {
      featureFlagMutation.mutate({ flag: dangerAction.flag, enabled: dangerAction.kind === "feature-enable" });
      return;
    }
    pushToast({
      title: dangerAction.kind === "backup" ? "Backup request recorded" : "Maintenance request recorded",
      description: "The elevated operation placeholder is ready for backend workflow integration and audit enforcement.",
      tone: "warning",
    });
    setDangerAction(null);
    setDangerReason("");
  }

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r bg-[#0f1d1a] text-white">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <KeyRound aria-hidden="true" size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Platform Console</p>
                  <p className="text-xs text-white/60">Super Admin only</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.06] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                  Signed in as
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {operatorName}
                </p>
                <p className="mt-1 truncate text-xs capitalize text-white/60">
                  {operatorRole} · Global platform access
                </p>
              </div>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {consoleSections.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;
                return (
                  <button
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition",
                      active ? "bg-white text-[#0f1d1a] shadow-line" : "text-white/72 hover:bg-white/10 hover:text-white",
                    )}
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      window.history.pushState(null, "", section.route);
                    }}
                    type="button"
                  >
                    <Icon aria-hidden="true" size={16} />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-white/10 p-4">
              <Button className="w-full justify-center bg-white/10 text-white hover:bg-white/15" onClick={onSignOut} type="button" variant="ghost">
                <LogOut aria-hidden="true" />
                Sign out
              </Button>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b bg-background/90 px-5 py-4 backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="platform">Global</Badge>
                  <Badge tone="warning">Separate from organization app</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">{activeDefinition.label}</h1>
                  <HelpHint label={`About ${activeDefinition.label}`} title={activeDefinition.label}>{activeDefinition.description}</HelpHint>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-lg border bg-panel/80 px-3 py-2 shadow-line">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Signed in as
                  </p>
                  <p className="truncate text-sm font-semibold">{operatorName}</p>
                </div>
                <label className="relative min-w-64">
                  <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                  <Input className="pl-9" placeholder="Search console" />
                </label>
                <Button onClick={() => setDangerAction({ kind: "maintenance" })} type="button" variant="secondary">
                  <AlertTriangle aria-hidden="true" />
                  Maintenance
                </Button>
              </div>
            </div>
          </header>

          <div className="space-y-5 p-5">
            {activeSection === "overview" ? renderOverview() : null}
            {activeSection === "organizations" ? renderOrganizations() : null}
            {activeSection === "roles" ? renderRoles() : null}
            {activeSection === "feature-flags" ? renderFlags() : null}
            {activeSection === "system-health" ? renderHealth() : null}
            {activeSection === "settings" ? renderSettings() : null}
            {["users", "audit-logs", "security", "integrations", "backups"].includes(activeSection) ? renderTableSection() : null}
          </div>
        </section>
      </div>

      <Modal
        contentClassName="max-w-lg"
        description="High-risk platform actions require a clear reason so the audit trail explains why the action happened."
        onOpenChange={(open) => {
          if (!open) {
            setDangerAction(null);
            setDangerReason("");
          }
        }}
        open={Boolean(dangerAction)}
        title="Confirm platform action"
      >
        <div className="space-y-4 p-5">
          <p className="text-sm leading-6 text-muted-foreground">{dangerAction ? dangerActionDescription(dangerAction) : ""}</p>
          <label className="grid gap-2 text-sm font-medium">
            Reason
            <textarea
              className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setDangerReason(event.target.value)}
              placeholder="Describe the support ticket, incident, request, or approved reason."
              value={dangerReason}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDangerAction(null)} type="button" variant="secondary">Cancel</Button>
            <Button
              disabled={!dangerReason.trim() || statusMutation.isPending || supportMutation.isPending || userSecurityMutation.isPending || featureFlagMutation.isPending}
              onClick={confirmDangerousAction}
              type="button"
              variant="danger"
            >
              Confirm action
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

function dangerActionDescription(action: NonNullable<DangerousAction>): string {
  if ("organization" in action) {
    if (action.kind === "support") return `Start Support Access Mode for ${action.organization.name}. This must be temporary, visible, and auditable.`;
    if (action.kind === "suspend") return `Suspend ${action.organization.name}. Normal users in this organization will be blocked from signing in.`;
    return `Reactivate ${action.organization.name}. Normal users can sign in again once active.`;
  }
  if ("user" in action) {
    if (action.kind === "user-lock") return `Lock ${action.user.email}. The user will be blocked from signing in until unlocked.`;
    if (action.kind === "user-unlock") return `Unlock ${action.user.email}. The user can sign in again if their organization is active.`;
    if (action.kind === "user-reset") return `Require a password reset for ${action.user.email}. This is recorded for identity-provider enforcement.`;
    if (action.kind === "user-revoke") return `Revoke active sessions for ${action.user.email}. This is recorded for session-store enforcement.`;
    return `Require MFA for ${action.user.email}. This is recorded for authentication-provider enforcement.`;
  }
  if ("flag" in action) {
    return `${action.kind === "feature-enable" ? "Enable" : "Disable"} the ${action.flag.label} feature flag globally for ${action.flag.environment}.`;
  }
  if (action.kind === "backup") return "Trigger a platform backup workflow. Restore operations will require elevated confirmation before they are enabled.";
  return "Enable maintenance mode controls. This is a dangerous platform-wide setting and must be audited.";
}

function TenantUsageSnapshot({ rows }: { rows: PlatformOrganizationUsageRead[] }) {
  const topRows = rows.slice(0, 5);
  return (
    <Panel title="Tenant usage snapshot" description="Consumption across organizations, useful for plan review, support prioritization, and capacity planning.">
      {topRows.length ? (
        <div className="space-y-3">
          {topRows.map((row) => (
            <div className="rounded-lg border bg-panel p-3" key={row.organization_id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.organization_name}</p>
                  <p className="text-xs text-muted-foreground">{row.user_count} users · {row.form_count} forms · {row.submission_count} submissions</p>
                </div>
                <Badge tone={row.is_active ? "success" : "danger"}>{row.is_active ? "Active" : "Suspended"}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No usage yet" detail="Tenant usage will appear after organizations start creating forms, users, imports, exports, and submissions." />
      )}
    </Panel>
  );
}

function LeadPipeline({ leads }: { leads: PlatformLeadRead[] }) {
  const topLeads = leads.slice(0, 5);
  return (
    <Panel title="Lead pipeline" description="Recent public website leads for sales follow-up and tenant onboarding.">
      {topLeads.length ? (
        <div className="space-y-3">
          {topLeads.map((lead) => (
            <div className="rounded-lg border bg-panel p-3" key={lead.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{lead.organization || lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.email} · {lead.country || "Country not set"}</p>
                </div>
                <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{lead.interest_area || lead.source} · {formatDate(lead.created_at)}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No leads captured yet" detail="Book-demo, contact, resource, and newsletter leads will appear here after public website submissions." />
      )}
    </Panel>
  );
}

function OrganizationPlanGrid({ plans }: { plans: PlatformOrganizationPlanRead[] }) {
  return (
    <Panel title="Plans and platform limits" description="Plan readiness and derived limits for tenant operations. Persistent billing integration can attach here later.">
      {plans.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {plans.map((plan) => (
            <article className="rounded-lg border bg-panel p-4" key={plan.organization_id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{plan.organization_name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.organization_slug} · {plan.plan}</p>
                </div>
                <Badge tone={statusTone(plan.status)}>{plan.status}</Badge>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                <span>{plan.user_limit.toLocaleString()} users</span>
                <span>{plan.submission_limit.toLocaleString()} submissions</span>
                <span>{plan.storage_limit_gb}GB storage</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${Math.min(plan.usage_percent, 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{plan.usage_percent}% of current derived limit</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No plans available" detail="Tenant plan rows appear after organizations are available to the Platform Console." />
      )}
    </Panel>
  );
}

function ServiceCard({ service }: { service: PlatformHealthServiceRead }) {
  return (
    <article className="rounded-lg border bg-panel p-4 shadow-line">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{service.service}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{service.detail}</p>
        </div>
        <Badge tone={statusTone(service.status)}>{service.status}</Badge>
      </div>
      {service.response_time_ms ? <p className="mt-3 text-xs text-muted-foreground">{service.response_time_ms}ms response</p> : null}
    </article>
  );
}

function SecurityEvents({ events, supportSessions }: { events: PlatformSecurityEventRead[]; supportSessions: PlatformSupportSessionRead[] }) {
  if (!events.length && !supportSessions.length) return <EmptyState title="No security events" detail="Failed logins, locked accounts, suspicious sessions, support access, MFA status, and policy events will appear here." />;
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <Panel title="Security center" description="High-risk actions such as lock, unlock, reset password, session revoke, and MFA requirement require confirmation and reason.">
        <div className="grid gap-3">
          {events.map((event) => (
            <article className="rounded-lg border bg-panel p-4" key={event.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{event.event_type}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{event.actor} · {formatDate(event.created_at)}</p>
                </div>
                <Badge tone={statusTone(event.severity)}>{event.severity}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{event.device ?? "Device details pending"} · {event.status}</p>
            </article>
          ))}
          {!events.length ? <EmptyState title="No security events" detail="Security alerts and policy events will appear here." /> : null}
        </div>
      </Panel>
      <Panel title="Support access sessions" description="Recent organization support-mode entries. Support access must remain explicit, visible, and auditable.">
        <div className="space-y-3">
          {supportSessions.map((session) => (
            <article className="rounded-lg border bg-panel p-4" key={session.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{session.organization_name ?? "Organization"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{session.actor_email ?? "Super Admin"} · {formatDate(session.started_at)}</p>
                </div>
                <Badge tone="warning">{session.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{session.reason || "No reason recorded"}</p>
            </article>
          ))}
          {!supportSessions.length ? <EmptyState title="No support sessions" detail="Support access sessions will appear after Super Admin enters tenant support mode." /> : null}
        </div>
      </Panel>
    </div>
  );
}

function Integrations({ rows }: { rows: PlatformIntegrationRead[] }) {
  return (
    <Panel title="Platform integrations" description="Secrets are never shown in the UI. Connection tests and disable actions are Super Admin-only and audited.">
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => (
          <article className="rounded-lg border bg-panel p-4" key={row.key}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{row.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{row.provider_type}</p>
              </div>
              <Badge tone={statusTone(row.health)}>{row.status}</Badge>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" type="button" variant="secondary">Test connection</Button>
              <Button size="sm" type="button" variant="secondary">Configure</Button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function Backups({ onTrigger, rows }: { onTrigger: () => void; rows: PlatformBackupJobRead[] }) {
  return (
    <Panel title="Backup and recovery" description="Backups are visible to Super Admins. Restore operations require re-authentication, reason, confirmation, and immutable audit logging.">
      <div className="mb-4 flex justify-end">
        <Button onClick={onTrigger} type="button" variant="primary">
          <Database aria-hidden="true" />
          Trigger backup
        </Button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => (
          <article className="rounded-lg border bg-panel p-4" key={row.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{row.backup_type}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{row.size} · {row.retention}</p>
              </div>
              <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Created {formatDate(row.created_at)}</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}
