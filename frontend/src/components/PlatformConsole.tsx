"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Archive,
  Building2,
  CheckCircle2,
  Database,
  Smartphone,
  FileClock,
  Flag,
  HeartPulse,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  PlugZap,
  Plus,
  PackageCheck,
  RotateCcw,
  Rocket,
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
  getPlatformBackupPolicy,
  getPlatformMobileFleet,
  getPlatformRelease,
  getPlatformSecurityPolicy,
  getPlatformSummary,
  getPlatformSystemHealth,
  listPlatformAuditLogs,
  listPlatformBackups,
  listPlatformDataIsolationIssues,
  listPlatformFeatureFlags,
  listPlatformIntegrations,
  listPlatformLeads,
  listPlatformOrganizations,
  listPlatformOrganizationPlans,
  listPlatformRoles,
  listPlatformSecurityEvents,
  listPlatformSectorPacks,
  listPlatformSupportSessions,
  listPlatformSupportQueue,
  listPlatformUsage,
  listPlatformUsers,
  runPlatformUserSecurityAction,
  updatePlatformFeatureFlag,
  updatePlatformBackupPolicy,
  updatePlatformIntegration,
  updatePlatformOrganizationPlan,
  updatePlatformRelease,
  updatePlatformOrganizationStatus,
  updatePlatformSecurityPolicy,
  type CurrentPrincipal,
  type PlatformAuditLogRead,
  type PlatformBackupJobRead,
  type PlatformBackupPolicyRead,
  type PlatformDataIsolationIssueRead,
  type PlatformFeatureFlagRead,
  type PlatformHealthServiceRead,
  type PlatformIntegrationRead,
  type PlatformLeadRead,
  type PlatformMobileFleetDeviceRead,
  type PlatformMobileFleetSummaryRead,
  type PlatformOrganizationRead,
  type PlatformOrganizationPlanRead,
  type PlatformOrganizationUsageRead,
  type PlatformReleaseRead,
  type PlatformRoleTemplateRead,
  type PlatformSecurityEventRead,
  type PlatformSecurityPolicyRead,
  type PlatformSectorPackRead,
  type PlatformSupportSessionRead,
  type PlatformTenantSupportQueueItemRead,
  type PlatformUserRead,
} from "@/lib/api";
import { statusTone as canonicalStatusTone } from "@/lib/statusTones";
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
  | "data-isolation"
  | "feature-flags"
  | "system-health"
  | "audit-logs"
  | "support-queue"
  | "security"
  | "mobile-fleet"
  | "sector-packs"
  | "integrations"
  | "backups"
  | "release-center"
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

type PlanDraft = {
  enabled_modules: string;
  plan: string;
  reason: string;
  status: string;
  storage_limit_gb: string;
  submission_limit: string;
  user_limit: string;
};

type SecurityPolicyDraft = Omit<PlatformSecurityPolicyRead, "updated_at"> & {
  reason: string;
};

type BackupPolicyDraft = Omit<PlatformBackupPolicyRead, "updated_at"> & {
  reason: string;
};

type ReleaseDraft = Pick<
  PlatformReleaseRead,
  | "backend_version"
  | "frontend_version"
  | "mobile_version"
  | "release_status"
  | "maintenance_mode"
  | "maintenance_message"
  | "maintenance_starts_at"
  | "maintenance_ends_at"
  | "affected_services"
  | "announcement_enabled"
  | "announcement_title"
  | "announcement_body"
  | "announcement_tone"
  | "release_notes"
> & {
  reason: string;
};

type IntegrationDraft = {
  health: string;
  notes: string;
  owner: string;
  reason: string;
  status: string;
};

const consoleSections: ConsoleSection[] = [
  { id: "overview", label: "Platform Overview", route: "/platform/overview", icon: Activity, description: "Tenant health and platform readiness." },
  { id: "organizations", label: "Organizations", route: "/platform/organizations", icon: Building2, description: "Tenant lifecycle and usage." },
  { id: "users", label: "Global Users", route: "/platform/users", icon: UsersRound, description: "Cross-organization identity support." },
  { id: "roles", label: "Global Roles", route: "/platform/roles", icon: UserCog, description: "Protected role templates." },
  { id: "data-isolation", label: "Data Isolation", route: "/platform/data-isolation", icon: ShieldCheck, description: "Tenant boundary checks and leakage risks." },
  { id: "feature-flags", label: "Feature Flags", route: "/platform/feature-flags", icon: Flag, description: "Global and tenant feature controls." },
  { id: "system-health", label: "System Health", route: "/platform/system-health", icon: HeartPulse, description: "API, database, jobs, and services." },
  { id: "audit-logs", label: "Audit Logs", route: "/platform/audit-logs", icon: FileClock, description: "Immutable platform events." },
  { id: "support-queue", label: "Support Queue", route: "/platform/support-queue", icon: LifeBuoy, description: "Tenants that likely need platform intervention." },
  { id: "security", label: "Security", route: "/platform/security", icon: LockKeyhole, description: "Sessions, MFA, and risk events." },
  { id: "mobile-fleet", label: "Mobile Fleet", route: "/platform/mobile-fleet", icon: Smartphone, description: "App versions, devices, sync health, and offline risk." },
  { id: "sector-packs", label: "Sector Packs", route: "/platform/sector-packs", icon: PackageCheck, description: "Starter content for sectors, forms, entities, indicators, reports, and mobile rules." },
  { id: "integrations", label: "Integrations", route: "/platform/integrations", icon: PlugZap, description: "Platform-wide providers." },
  { id: "backups", label: "Backups", route: "/platform/backups", icon: Database, description: "Backup jobs and restore points." },
  { id: "release-center", label: "Release Center", route: "/platform/release-center", icon: Rocket, description: "Version visibility, deployment readiness, maintenance mode, and rollout notes." },
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
  const tone = canonicalStatusTone(status);
  return tone === "success" || tone === "warning" || tone === "danger"
    ? tone
    : "neutral";
}

function formatDate(value?: string | null): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateTimeInput(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 16);
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
  const [planToEdit, setPlanToEdit] = useState<PlatformOrganizationPlanRead | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanDraft>({
    enabled_modules: "",
    plan: "",
    reason: "",
    status: "",
    storage_limit_gb: "",
    submission_limit: "",
    user_limit: "",
  });
  const [securityPolicyDraft, setSecurityPolicyDraft] = useState<SecurityPolicyDraft>({
    failed_login_lock_threshold: 5,
    ip_allowlist_enabled: false,
    mfa_required_for_admins: false,
    mfa_required_for_all_users: false,
    password_min_length: 10,
    password_rotation_days: 180,
    reason: "",
    session_timeout_minutes: 60,
    support_session_timeout_minutes: 60,
  });
  const [backupPolicyDraft, setBackupPolicyDraft] = useState<BackupPolicyDraft>({
    anonymize_archived_data: false,
    backup_frequency: "Daily",
    configuration_retention_days: 30,
    reason: "",
    restore_approver_role: "super_admin",
    restore_requires_approval: true,
    retention_days: 90,
    tenant_export_enabled: true,
  });
  const [releaseDraft, setReleaseDraft] = useState<ReleaseDraft>({
    announcement_body: "",
    announcement_enabled: false,
    announcement_title: "",
    announcement_tone: "info",
    backend_version: "local",
    affected_services: [],
    frontend_version: "managed-by-vercel",
    maintenance_ends_at: null,
    maintenance_message: "",
    maintenance_mode: false,
    maintenance_starts_at: null,
    mobile_version: "1.0.0-test",
    reason: "",
    release_notes: "",
    release_status: "Ready for review",
  });
  const [integrationToEdit, setIntegrationToEdit] = useState<PlatformIntegrationRead | null>(null);
  const [integrationDraft, setIntegrationDraft] = useState<IntegrationDraft>({
    health: "warning",
    notes: "",
    owner: "Platform team",
    reason: "",
    status: "not_connected",
  });
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
  const securityPolicyQuery = useQuery({ queryKey: ["platform-security-policy", token], queryFn: () => getPlatformSecurityPolicy(token ?? ""), enabled });
  const mobileFleetQuery = useQuery({ queryKey: ["platform-mobile-fleet", token], queryFn: () => getPlatformMobileFleet(token ?? ""), enabled });
  const releaseQuery = useQuery({ queryKey: ["platform-release", token], queryFn: () => getPlatformRelease(token ?? ""), enabled });
  const sectorPacksQuery = useQuery({ queryKey: ["platform-sector-packs", token], queryFn: () => listPlatformSectorPacks(token ?? ""), enabled });
  const integrationsQuery = useQuery({ queryKey: ["platform-integrations", token], queryFn: () => listPlatformIntegrations(token ?? ""), enabled });
  const backupsQuery = useQuery({ queryKey: ["platform-backups", token], queryFn: () => listPlatformBackups(token ?? ""), enabled });
  const backupPolicyQuery = useQuery({ queryKey: ["platform-backup-policy", token], queryFn: () => getPlatformBackupPolicy(token ?? ""), enabled });
  const usageQuery = useQuery({ queryKey: ["platform-usage", token], queryFn: () => listPlatformUsage(token ?? ""), enabled });
  const dataIsolationQuery = useQuery({ queryKey: ["platform-data-isolation", token], queryFn: () => listPlatformDataIsolationIssues(token ?? ""), enabled });
  const leadsQuery = useQuery({ queryKey: ["platform-leads", token], queryFn: () => listPlatformLeads(token ?? ""), enabled });
  const plansQuery = useQuery({ queryKey: ["platform-organization-plans", token], queryFn: () => listPlatformOrganizationPlans(token ?? ""), enabled });
  const supportSessionsQuery = useQuery({ queryKey: ["platform-support-sessions", token], queryFn: () => listPlatformSupportSessions(token ?? ""), enabled });
  const supportQueueQuery = useQuery({ queryKey: ["platform-support-queue", token], queryFn: () => listPlatformSupportQueue(token ?? ""), enabled });

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

  const planMutation = useMutation({
    mutationFn: (plan: PlatformOrganizationPlanRead) =>
      updatePlatformOrganizationPlan(token ?? "", plan.organization_id, {
        plan: planDraft.plan.trim(),
        status: planDraft.status.trim(),
        user_limit: Number(planDraft.user_limit),
        submission_limit: Number(planDraft.submission_limit),
        storage_limit_gb: Number(planDraft.storage_limit_gb),
        enabled_modules: planDraft.enabled_modules
          .split(",")
          .map((module) => module.trim())
          .filter(Boolean),
        reason: planDraft.reason.trim(),
      }),
    onSuccess: async () => {
      await plansQuery.refetch();
      await usageQuery.refetch();
      await auditQuery.refetch();
      setPlanToEdit(null);
      pushToast({
        title: "Tenant plan updated",
        description: "Plan limits and enabled modules were saved with an audit reason.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Tenant plan was not updated",
        description: "Check numeric limits, enabled modules, reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  function openPlanEditor(plan: PlatformOrganizationPlanRead) {
    setPlanToEdit(plan);
    setPlanDraft({
      enabled_modules: plan.enabled_modules.join(", "),
      plan: plan.plan,
      reason: "",
      status: plan.status,
      storage_limit_gb: String(plan.storage_limit_gb),
      submission_limit: String(plan.submission_limit),
      user_limit: String(plan.user_limit),
    });
  }

  const securityPolicyMutation = useMutation({
    mutationFn: () => updatePlatformSecurityPolicy(token ?? "", securityPolicyDraft),
    onSuccess: async () => {
      await securityPolicyQuery.refetch();
      await auditQuery.refetch();
      setSecurityPolicyDraft((draft) => ({ ...draft, reason: "" }));
      pushToast({
        title: "Security policy updated",
        description: "Platform security settings were saved and audited.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Security policy was not updated",
        description: "Check the policy values, audit reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  const backupPolicyMutation = useMutation({
    mutationFn: () => updatePlatformBackupPolicy(token ?? "", backupPolicyDraft),
    onSuccess: async () => {
      await backupPolicyQuery.refetch();
      await auditQuery.refetch();
      setBackupPolicyDraft((draft) => ({ ...draft, reason: "" }));
      pushToast({
        title: "Backup policy updated",
        description: "Backup, retention, export, and restore controls were saved and audited.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Backup policy was not updated",
        description: "Check policy values, audit reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: () => updatePlatformRelease(token ?? "", releaseDraft),
    onSuccess: async () => {
      await releaseQuery.refetch();
      await auditQuery.refetch();
      setReleaseDraft((draft) => ({ ...draft, reason: "" }));
      pushToast({
        title: "Release center updated",
        description: "Deployment readiness and rollout notes were saved and audited.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Release center was not updated",
        description: "Check version fields, audit reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  const integrationMutation = useMutation({
    mutationFn: (integration: PlatformIntegrationRead) =>
      updatePlatformIntegration(token ?? "", integration.key, integrationDraft),
    onSuccess: async () => {
      await integrationsQuery.refetch();
      await auditQuery.refetch();
      setIntegrationToEdit(null);
      pushToast({
        title: "Integration updated",
        description: "Provider status and health metadata were saved and audited.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Integration was not updated",
        description: "Check provider status, health, reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  function openIntegrationEditor(integration: PlatformIntegrationRead) {
    setIntegrationToEdit(integration);
    setIntegrationDraft({
      health: integration.health,
      notes: "",
      owner: "Platform team",
      reason: "",
      status: integration.status,
    });
  }

  const activeDefinition = consoleSections.find((section) => section.id === activeSection) ?? consoleSections[0];
  const organizations = organizationsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const auditLogs = auditQuery.data ?? [];
  const flags = flagsQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const services = healthQuery.data?.services ?? [];
  const securityEvents = securityQuery.data ?? [];
  const mobileFleet = mobileFleetQuery.data;
  const sectorPacks = sectorPacksQuery.data ?? [];
  const integrations = integrationsQuery.data ?? [];
  const backups = backupsQuery.data ?? [];
  const release = releaseQuery.data;
  const usageRows = usageQuery.data ?? [];
  const dataIsolationIssues = dataIsolationQuery.data ?? [];
  const leads = leadsQuery.data ?? [];
  const organizationPlans = plansQuery.data ?? [];
  const supportSessions = supportSessionsQuery.data ?? [];
  const supportQueue = supportQueueQuery.data ?? [];

  useEffect(() => {
    const policy = securityPolicyQuery.data;
    if (!policy) return;
    setSecurityPolicyDraft({
      failed_login_lock_threshold: policy.failed_login_lock_threshold,
      ip_allowlist_enabled: policy.ip_allowlist_enabled,
      mfa_required_for_admins: policy.mfa_required_for_admins,
      mfa_required_for_all_users: policy.mfa_required_for_all_users,
      password_min_length: policy.password_min_length,
      password_rotation_days: policy.password_rotation_days,
      reason: "",
      session_timeout_minutes: policy.session_timeout_minutes,
      support_session_timeout_minutes: policy.support_session_timeout_minutes,
    });
  }, [securityPolicyQuery.data]);

  useEffect(() => {
    const policy = backupPolicyQuery.data;
    if (!policy) return;
    setBackupPolicyDraft({
      anonymize_archived_data: policy.anonymize_archived_data,
      backup_frequency: policy.backup_frequency,
      configuration_retention_days: policy.configuration_retention_days,
      reason: "",
      restore_approver_role: policy.restore_approver_role,
      restore_requires_approval: policy.restore_requires_approval,
      retention_days: policy.retention_days,
      tenant_export_enabled: policy.tenant_export_enabled,
    });
  }, [backupPolicyQuery.data]);

  useEffect(() => {
    const current = releaseQuery.data;
    if (!current) return;
    setReleaseDraft({
      announcement_body: current.announcement_body,
      announcement_enabled: current.announcement_enabled,
      announcement_title: current.announcement_title,
      announcement_tone: current.announcement_tone,
      backend_version: current.backend_version,
      affected_services: current.affected_services,
      frontend_version: current.frontend_version,
      maintenance_ends_at: current.maintenance_ends_at ?? null,
      maintenance_message: current.maintenance_message,
      maintenance_mode: current.maintenance_mode,
      maintenance_starts_at: current.maintenance_starts_at ?? null,
      mobile_version: current.mobile_version,
      reason: "",
      release_notes: current.release_notes,
      release_status: current.release_status,
    });
  }, [releaseQuery.data]);

  const platformCards = [
    { label: "Organizations", value: String(summaryQuery.data?.organization_count ?? organizations.length), icon: Building2, tone: "platform" as const },
    { label: "Active Organizations", value: String(summaryQuery.data?.active_organization_count ?? organizations.filter((item) => item.is_active).length), icon: CheckCircle2, tone: "success" as const },
    { label: "Global Users", value: String(summaryQuery.data?.tenant_user_count ?? users.length), icon: UsersRound, tone: "neutral" as const },
    { label: "Platform Admins", value: String(summaryQuery.data?.platform_admin_count ?? users.filter((user) => user.role_name === "super_admin").length), icon: ShieldCheck, tone: "platform" as const },
    { label: "Isolation Issues", value: String(dataIsolationIssues.length), icon: AlertTriangle, tone: dataIsolationIssues.some((issue) => issue.severity === "critical") ? "danger" as const : dataIsolationIssues.length ? "warning" as const : "success" as const },
    { label: "Mobile Devices", value: String(mobileFleet?.active_devices ?? 0), icon: Smartphone, tone: mobileFleet?.offline_devices ? "warning" as const : "success" as const },
    { label: "Support Queue", value: String(supportQueue.length), icon: LifeBuoy, tone: supportQueue.some((item) => item.priority === "critical") ? "danger" as const : supportQueue.length ? "warning" as const : "success" as const },
    { label: "Sector Packs", value: String(sectorPacks.length), icon: PackageCheck, tone: "platform" as const },
    { label: "Feature Flags", value: String(flags.length), icon: Flag, tone: "neutral" as const },
    { label: "System Health", value: healthQuery.data?.status ?? "checking", icon: HeartPulse, tone: statusTone(healthQuery.data?.status ?? "warning") },
    { label: "Backups", value: String(backups.length), icon: Database, tone: "warning" as const },
    { label: "Release", value: release?.release_status ?? "review", icon: Rocket, tone: release?.maintenance_mode ? "warning" as const : "success" as const },
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

  const dataIsolationColumns = useMemo<TableColumn<PlatformDataIsolationIssueRead>[]>(
    () => [
      {
        key: "severity",
        header: "Severity",
        value: (row) => row.severity,
        render: (row) => <Badge tone={statusTone(row.severity)}>{row.severity}</Badge>,
      },
      {
        key: "organization",
        header: "Organization",
        value: (row) => row.organization_name ?? "",
        render: (row) => (
          <div>
            <p className="font-medium">{row.organization_name ?? "Platform"}</p>
            <p className="text-xs text-muted-foreground">{row.organization_slug ?? "global"}</p>
          </div>
        ),
      },
      { key: "issue", header: "Issue", value: (row) => row.issue_type, render: (row) => row.issue_type },
      { key: "resource", header: "Resource", value: (row) => row.resource_type, render: (row) => row.resource_type },
      { key: "records", header: "Records", value: (row) => String(row.affected_records), render: (row) => row.affected_records.toLocaleString() },
      {
        key: "fix",
        header: "Recommended action",
        value: (row) => `${row.detail} ${row.recommendation}`,
        render: (row) => (
          <div className="max-w-xl">
            <p className="text-sm">{row.detail}</p>
            <p className="mt-1 text-xs text-muted-foreground">{row.recommendation}</p>
          </div>
        ),
      },
    ],
    [],
  );

  const mobileDeviceColumns = useMemo<TableColumn<PlatformMobileFleetDeviceRead>[]>(
    () => [
      {
        key: "device",
        header: "Device",
        value: (row) => `${row.device_id} ${row.officer_name ?? ""}`,
        render: (row) => (
          <div>
            <p className="font-mono text-xs font-medium">{row.device_id}</p>
            <p className="text-xs text-muted-foreground">{row.officer_name ?? "Officer not recorded"}</p>
          </div>
        ),
      },
      { key: "organization", header: "Organization", value: (row) => row.organization_name, render: (row) => row.organization_name },
      { key: "version", header: "App version", value: (row) => row.app_version, render: (row) => row.app_version },
      { key: "sync", header: "Last sync", value: (row) => row.last_sync_at ?? "", render: (row) => formatDate(row.last_sync_at) },
      { key: "submissions", header: "Submissions", value: (row) => String(row.submission_count), render: (row) => row.submission_count.toLocaleString() },
      { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    ],
    [],
  );

  const supportQueueColumns = useMemo<TableColumn<PlatformTenantSupportQueueItemRead>[]>(
    () => [
      {
        key: "organization",
        header: "Organization",
        value: (row) => row.organization_name,
        render: (row) => (
          <div>
            <p className="font-medium">{row.organization_name}</p>
            <p className="text-xs text-muted-foreground">{row.organization_slug}</p>
          </div>
        ),
      },
      { key: "priority", header: "Priority", value: (row) => row.priority, render: (row) => <Badge tone={statusTone(row.priority)}>{row.priority}</Badge> },
      { key: "issues", header: "Issues", value: (row) => row.reasons.join(" "), render: (row) => <div className="max-w-xl text-sm text-muted-foreground">{row.reasons.join(" · ")}</div> },
      { key: "usage", header: "Usage", value: (row) => `${row.user_count} ${row.submission_count}`, render: (row) => `${row.user_count} users · ${row.submission_count} submissions` },
      { key: "support", header: "Last support", value: (row) => row.last_support_at ?? "", render: (row) => formatDate(row.last_support_at) },
      { key: "action", header: "Recommended action", value: (row) => row.recommended_action, render: (row) => <span className="text-sm">{row.recommended_action}</span> },
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
      <OrganizationPlanGrid onEdit={openPlanEditor} plans={organizationPlans} />
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
    if (activeSection === "support-queue") return <DataTable columns={supportQueueColumns} emptyLabel={supportQueueQuery.isFetching ? "Checking tenant support risks..." : "No tenants currently need platform support"} rows={supportQueue} searchLabel="Search support queue" title="Tenant support queue" />;
    if (activeSection === "data-isolation") return <DataTable columns={dataIsolationColumns} emptyLabel={dataIsolationQuery.isFetching ? "Checking tenant boundaries..." : "No tenant isolation issues found"} rows={dataIsolationIssues} searchLabel="Search isolation issues" title="Data isolation auditor" />;
    if (activeSection === "audit-logs") return <DataTable columns={auditColumns} emptyLabel={auditQuery.isFetching ? "Loading audit logs..." : "No audit logs found"} rows={auditLogs} searchLabel="Search audit logs" title="Platform audit logs" />;
    if (activeSection === "security") {
      return (
        <SecurityEvents
          draft={securityPolicyDraft}
          events={securityEvents}
          isSaving={securityPolicyMutation.isPending}
          onDraftChange={setSecurityPolicyDraft}
          onSave={() => securityPolicyMutation.mutate()}
          supportSessions={supportSessions}
        />
      );
    }
    if (activeSection === "mobile-fleet") return <MobileFleet columns={mobileDeviceColumns} fleet={mobileFleet} isLoading={mobileFleetQuery.isFetching} />;
    if (activeSection === "sector-packs") return <SectorPacks packs={sectorPacks} isLoading={sectorPacksQuery.isFetching} />;
    if (activeSection === "integrations") return <Integrations onEdit={openIntegrationEditor} rows={integrations} />;
    if (activeSection === "backups") {
      return (
        <Backups
          draft={backupPolicyDraft}
          isSaving={backupPolicyMutation.isPending}
          onDraftChange={setBackupPolicyDraft}
          onSave={() => backupPolicyMutation.mutate()}
          onTrigger={() => setDangerAction({ kind: "backup" })}
          rows={backups}
        />
      );
    }
    if (activeSection === "release-center") {
      return (
        <ReleaseCenter
          draft={releaseDraft}
          isLoading={releaseQuery.isFetching}
          isSaving={releaseMutation.isPending}
          onDraftChange={setReleaseDraft}
          onSave={() => releaseMutation.mutate()}
          release={release}
        />
      );
    }
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
                <Button onClick={() => {
                  setActiveSection("release-center");
                  window.history.pushState(null, "", "/platform/release-center");
                }} type="button" variant="secondary">
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
            {["users", "support-queue", "data-isolation", "audit-logs", "security", "mobile-fleet", "sector-packs", "integrations", "backups", "release-center"].includes(activeSection) ? renderTableSection() : null}
          </div>
        </section>
      </div>

      <Modal
        contentClassName="max-w-2xl"
        description="Plan changes affect tenant capacity and module availability. Every change is saved with an audit reason."
        onOpenChange={(open) => {
          if (!open) setPlanToEdit(null);
        }}
        open={Boolean(planToEdit)}
        title={planToEdit ? `Edit plan for ${planToEdit.organization_name}` : "Edit tenant plan"}
      >
        <div className="grid gap-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Plan
              <Input value={planDraft.plan} onChange={(event) => setPlanDraft((draft) => ({ ...draft, plan: event.target.value }))} placeholder="Professional" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Status
              <Input value={planDraft.status} onChange={(event) => setPlanDraft((draft) => ({ ...draft, status: event.target.value }))} placeholder="Active" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              User limit
              <Input min={1} type="number" value={planDraft.user_limit} onChange={(event) => setPlanDraft((draft) => ({ ...draft, user_limit: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Submission limit
              <Input min={1} type="number" value={planDraft.submission_limit} onChange={(event) => setPlanDraft((draft) => ({ ...draft, submission_limit: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Storage limit GB
              <Input min={1} type="number" value={planDraft.storage_limit_gb} onChange={(event) => setPlanDraft((draft) => ({ ...draft, storage_limit_gb: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Enabled modules
              <Input value={planDraft.enabled_modules} onChange={(event) => setPlanDraft((draft) => ({ ...draft, enabled_modules: event.target.value }))} placeholder="projects, forms, reports" />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Audit reason
            <textarea
              className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setPlanDraft((draft) => ({ ...draft, reason: event.target.value }))}
              placeholder="Example: Customer upgraded to Enterprise plan after contract approval."
              value={planDraft.reason}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setPlanToEdit(null)} type="button" variant="secondary">Cancel</Button>
            <Button
              disabled={
                !planToEdit ||
                !planDraft.plan.trim() ||
                !planDraft.status.trim() ||
                !planDraft.reason.trim() ||
                Number(planDraft.user_limit) < 1 ||
                Number(planDraft.submission_limit) < 1 ||
                Number(planDraft.storage_limit_gb) < 1 ||
                planMutation.isPending
              }
              onClick={() => {
                if (planToEdit) planMutation.mutate(planToEdit);
              }}
              type="button"
              variant="primary"
            >
              Save plan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-xl"
        description="Update provider status and operational health. Secrets are never shown or stored from this screen."
        onOpenChange={(open) => {
          if (!open) setIntegrationToEdit(null);
        }}
        open={Boolean(integrationToEdit)}
        title={integrationToEdit ? `Configure ${integrationToEdit.name}` : "Configure integration"}
      >
        <div className="grid gap-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Status
              <Input value={integrationDraft.status} onChange={(event) => setIntegrationDraft((draft) => ({ ...draft, status: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Health
              <Input value={integrationDraft.health} onChange={(event) => setIntegrationDraft((draft) => ({ ...draft, health: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Owner
              <Input value={integrationDraft.owner} onChange={(event) => setIntegrationDraft((draft) => ({ ...draft, owner: event.target.value }))} />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Notes
            <textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" value={integrationDraft.notes} onChange={(event) => setIntegrationDraft((draft) => ({ ...draft, notes: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Audit reason
            <textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" value={integrationDraft.reason} onChange={(event) => setIntegrationDraft((draft) => ({ ...draft, reason: event.target.value }))} />
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIntegrationToEdit(null)} type="button" variant="secondary">Cancel</Button>
            <Button
              disabled={!integrationToEdit || !integrationDraft.status.trim() || !integrationDraft.health.trim() || !integrationDraft.reason.trim() || integrationMutation.isPending}
              onClick={() => {
                if (integrationToEdit) integrationMutation.mutate(integrationToEdit);
              }}
              type="button"
              variant="primary"
            >
              Save integration
            </Button>
          </div>
        </div>
      </Modal>

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

function OrganizationPlanGrid({ onEdit, plans }: { onEdit: (plan: PlatformOrganizationPlanRead) => void; plans: PlatformOrganizationPlanRead[] }) {
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
              <p className="mt-2 text-xs text-muted-foreground">{plan.usage_percent}% of current limit</p>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => onEdit(plan)} size="sm" type="button" variant="secondary">
                  Edit plan
                </Button>
              </div>
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

function SecurityEvents({
  draft,
  events,
  isSaving,
  onDraftChange,
  onSave,
  supportSessions,
}: {
  draft: SecurityPolicyDraft;
  events: PlatformSecurityEventRead[];
  isSaving: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<SecurityPolicyDraft>>;
  onSave: () => void;
  supportSessions: PlatformSupportSessionRead[];
}) {
  return (
    <div className="space-y-5">
      <Panel title="Security policy" description="Platform-wide identity defaults for MFA, passwords, sessions, support access, and lockout behavior.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            Password minimum length
            <Input min={8} type="number" value={draft.password_min_length} onChange={(event) => onDraftChange((current) => ({ ...current, password_min_length: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Password rotation days
            <Input min={0} type="number" value={draft.password_rotation_days} onChange={(event) => onDraftChange((current) => ({ ...current, password_rotation_days: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Session timeout minutes
            <Input min={5} type="number" value={draft.session_timeout_minutes} onChange={(event) => onDraftChange((current) => ({ ...current, session_timeout_minutes: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Failed login lock threshold
            <Input min={1} type="number" value={draft.failed_login_lock_threshold} onChange={(event) => onDraftChange((current) => ({ ...current, failed_login_lock_threshold: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Support session timeout minutes
            <Input min={5} type="number" value={draft.support_session_timeout_minutes} onChange={(event) => onDraftChange((current) => ({ ...current, support_session_timeout_minutes: Number(event.target.value) }))} />
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.mfa_required_for_admins} onChange={(event) => onDraftChange((current) => ({ ...current, mfa_required_for_admins: event.target.checked }))} type="checkbox" />
            Require MFA for admins
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.mfa_required_for_all_users} onChange={(event) => onDraftChange((current) => ({ ...current, mfa_required_for_all_users: event.target.checked }))} type="checkbox" />
            Require MFA for all users
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.ip_allowlist_enabled} onChange={(event) => onDraftChange((current) => ({ ...current, ip_allowlist_enabled: event.target.checked }))} type="checkbox" />
            Enable IP allowlist
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Audit reason
          <textarea
            className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Example: Enforcing admin MFA before production rollout."
            value={draft.reason}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button disabled={!draft.reason.trim() || isSaving} onClick={onSave} type="button" variant="primary">
            Save security policy
          </Button>
        </div>
      </Panel>
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
    </div>
  );
}

function MobileFleet({
  columns,
  fleet,
  isLoading,
}: {
  columns: TableColumn<PlatformMobileFleetDeviceRead>[];
  fleet?: PlatformMobileFleetSummaryRead;
  isLoading: boolean;
}) {
  if (!fleet) return <EmptyState title={isLoading ? "Loading mobile fleet" : "No mobile fleet data"} detail="Mobile device and sync data will appear after field officers register devices and sync submissions." />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Smartphone} label="Active devices" value={String(fleet.active_devices)} tone="success" />
        <StatCard icon={AlertTriangle} label="Offline devices" value={String(fleet.offline_devices)} tone={fleet.offline_devices ? "warning" : "success"} />
        <StatCard icon={UsersRound} label="Active users" value={String(fleet.active_users)} />
        <StatCard icon={Activity} label="Submissions synced" value={fleet.submission_throughput.toLocaleString()} />
      </div>
      <Panel title="Version policy" description="Super Admin should verify production and minimum supported app versions before field rollout.">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-panel p-4">
            <p className="text-xs uppercase text-muted-foreground">Production version</p>
            <p className="mt-2 font-semibold">{fleet.current_production_version}</p>
          </div>
          <div className="rounded-lg border bg-panel p-4">
            <p className="text-xs uppercase text-muted-foreground">Minimum supported</p>
            <p className="mt-2 font-semibold">{fleet.minimum_supported_version}</p>
          </div>
          <div className="rounded-lg border bg-panel p-4">
            <p className="text-xs uppercase text-muted-foreground">Version distribution</p>
            <p className="mt-2 font-semibold">{Object.entries(fleet.app_versions).map(([version, count]) => `${version}: ${count}`).join(", ") || "No devices"}</p>
          </div>
        </div>
      </Panel>
      <DataTable columns={columns} emptyLabel="No registered field devices found." rows={fleet.devices} searchLabel="Search devices" title="Mobile fleet devices" />
    </div>
  );
}

function SectorPacks({ isLoading, packs }: { isLoading: boolean; packs: PlatformSectorPackRead[] }) {
  if (!packs.length) return <EmptyState title={isLoading ? "Loading sector packs" : "No sector packs found"} detail="Platform sector starter content will appear here after the catalog is available." />;
  return (
    <Panel title="Sector pack manager" description="Review platform starter content for industries. Each pack defines entities, starter forms, indicators, reports, validation, quality rules, workflows, and mobile guidance.">
      <div className="grid gap-3 xl:grid-cols-2">
        {packs.map((pack) => (
          <article className="rounded-lg border bg-panel p-4 shadow-line" key={pack.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{pack.name}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{pack.description}</p>
              </div>
              <Badge tone="platform">{pack.sector}</Badge>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <SummaryList title="Entities" items={pack.entity_types} />
              <SummaryList title="Forms" items={pack.form_templates} />
              <SummaryList title="Indicators" items={pack.indicator_templates} />
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <SummaryList title="Quality rules" items={pack.data_quality_rules} />
              <SummaryList title="Mobile guidance" items={pack.mobile_guidance} />
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function SummaryList({ items, title }: { items: string[]; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{items.slice(0, 4).join(", ") || "Not set"}{items.length > 4 ? ` +${items.length - 4}` : ""}</p>
    </div>
  );
}

function Integrations({ onEdit, rows }: { onEdit: (row: PlatformIntegrationRead) => void; rows: PlatformIntegrationRead[] }) {
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
              <Button onClick={() => onEdit(row)} size="sm" type="button" variant="secondary">Configure</Button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function ReleaseCenter({
  draft,
  isLoading,
  isSaving,
  onDraftChange,
  onSave,
  release,
}: {
  draft: ReleaseDraft;
  isLoading: boolean;
  isSaving: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<ReleaseDraft>>;
  onSave: () => void;
  release?: PlatformReleaseRead;
}) {
  if (!release) return <EmptyState title={isLoading ? "Loading release center" : "Release center unavailable"} detail="Deployment readiness, version labels, and rollout notes will appear after the platform API responds." />;
  const readiness = [
    ["Database", release.database_ready],
    ["JWT secret", release.jwt_ready],
    ["Redis", release.redis_ready],
    ["Kafka", release.kafka_ready],
  ] as const;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Rocket} label="Release status" value={release.release_status} tone={release.maintenance_mode ? "warning" : "success"} />
        <StatCard icon={Settings} label="Environment" value={release.environment} tone="platform" />
        <StatCard icon={Activity} label="Backend" value={release.backend_version} tone="neutral" />
        <StatCard icon={Smartphone} label="Mobile" value={release.mobile_version} tone="neutral" />
      </div>
      <Panel title="Deployment readiness" description="Use this as the Super Admin release checklist before mobile builds, backend deploys, and public frontend rollout.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {readiness.map(([label, ready]) => (
            <div className="rounded-lg border bg-panel p-4" key={label}>
              <p className="text-xs uppercase text-muted-foreground">{label}</p>
              <Badge className="mt-2" tone={ready ? "success" : "warning"}>{ready ? "Ready" : "Needs setup"}</Badge>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2">
          {release.checklist.map((item) => (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm" key={item}>
              <CheckCircle2 aria-hidden="true" className="text-primary" size={15} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Release controls" description="Record the version labels and rollout notes that support teams should use during production deployments.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            Backend version
            <Input value={draft.backend_version} onChange={(event) => onDraftChange((current) => ({ ...current, backend_version: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Frontend version
            <Input value={draft.frontend_version} onChange={(event) => onDraftChange((current) => ({ ...current, frontend_version: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Mobile version
            <Input value={draft.mobile_version} onChange={(event) => onDraftChange((current) => ({ ...current, mobile_version: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Release status
            <Input value={draft.release_status} onChange={(event) => onDraftChange((current) => ({ ...current, release_status: event.target.value }))} />
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.maintenance_mode} onChange={(event) => onDraftChange((current) => ({ ...current, maintenance_mode: event.target.checked }))} type="checkbox" />
            Maintenance mode planned
          </label>
        </div>
        <div className="mt-4 rounded-lg border bg-muted/20 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">Maintenance window</h3>
            <p className="mt-1 text-xs text-muted-foreground">Use this when backend, frontend, mobile sync, imports, or reporting may be interrupted.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2 text-sm font-medium">
              Starts
              <Input type="datetime-local" value={formatDateTimeInput(draft.maintenance_starts_at)} onChange={(event) => onDraftChange((current) => ({ ...current, maintenance_starts_at: event.target.value || null }))} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Ends
              <Input type="datetime-local" value={formatDateTimeInput(draft.maintenance_ends_at)} onChange={(event) => onDraftChange((current) => ({ ...current, maintenance_ends_at: event.target.value || null }))} />
            </label>
            <label className="grid gap-2 text-sm font-medium xl:col-span-2">
              Affected services
              <Input
                placeholder="Backend, Mobile sync, Imports"
                value={draft.affected_services.join(", ")}
                onChange={(event) => onDraftChange((current) => ({
                  ...current,
                  affected_services: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                }))}
              />
            </label>
          </div>
          <label className="mt-3 grid gap-2 text-sm font-medium">
            User-facing maintenance message
            <textarea
              className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => onDraftChange((current) => ({ ...current, maintenance_message: event.target.value }))}
              placeholder="Example: Mobile sync may be delayed while the backend is being upgraded."
              value={draft.maintenance_message}
            />
          </label>
        </div>
        <div className="mt-4 rounded-lg border bg-muted/20 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">Workspace announcement</h3>
            <p className="mt-1 text-xs text-muted-foreground">Show a platform notice to signed-in workspace users for rollout updates, incidents, or support guidance.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[180px_1fr_180px]">
            <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
              <input checked={draft.announcement_enabled} onChange={(event) => onDraftChange((current) => ({ ...current, announcement_enabled: event.target.checked }))} type="checkbox" />
              Show notice
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Title
              <Input value={draft.announcement_title} onChange={(event) => onDraftChange((current) => ({ ...current, announcement_title: event.target.value }))} placeholder="System update" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Tone
              <Input value={draft.announcement_tone} onChange={(event) => onDraftChange((current) => ({ ...current, announcement_tone: event.target.value }))} placeholder="info, warning, danger" />
            </label>
          </div>
          <label className="mt-3 grid gap-2 text-sm font-medium">
            Message
            <textarea
              className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => onDraftChange((current) => ({ ...current, announcement_body: event.target.value }))}
              placeholder="Tell users what changed, what to do, and when normal service resumes."
              value={draft.announcement_body}
            />
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Release notes
          <textarea
            className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, release_notes: event.target.value }))}
            placeholder="Summarize what changed, who should test it, and what support should watch after deploy."
            value={draft.release_notes}
          />
        </label>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Audit reason
          <textarea
            className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Example: Preparing production rollout after QA sign-off."
            value={draft.reason}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button disabled={!draft.reason.trim() || isSaving} onClick={onSave} type="button" variant="primary">
            Save release state
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function Backups({
  draft,
  isSaving,
  onDraftChange,
  onSave,
  onTrigger,
  rows,
}: {
  draft: BackupPolicyDraft;
  isSaving: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<BackupPolicyDraft>>;
  onSave: () => void;
  onTrigger: () => void;
  rows: PlatformBackupJobRead[];
}) {
  return (
    <div className="space-y-5">
      <Panel title="Backup and retention policy" description="Configure platform backup frequency, retention, export, restore approval, and archive anonymization defaults.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            Backup frequency
            <Input value={draft.backup_frequency} onChange={(event) => onDraftChange((current) => ({ ...current, backup_frequency: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Data retention days
            <Input min={1} type="number" value={draft.retention_days} onChange={(event) => onDraftChange((current) => ({ ...current, retention_days: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Config retention days
            <Input min={1} type="number" value={draft.configuration_retention_days} onChange={(event) => onDraftChange((current) => ({ ...current, configuration_retention_days: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Restore approver role
            <Input value={draft.restore_approver_role} onChange={(event) => onDraftChange((current) => ({ ...current, restore_approver_role: event.target.value }))} />
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.tenant_export_enabled} onChange={(event) => onDraftChange((current) => ({ ...current, tenant_export_enabled: event.target.checked }))} type="checkbox" />
            Tenant export enabled
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.restore_requires_approval} onChange={(event) => onDraftChange((current) => ({ ...current, restore_requires_approval: event.target.checked }))} type="checkbox" />
            Restore requires approval
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.anonymize_archived_data} onChange={(event) => onDraftChange((current) => ({ ...current, anonymize_archived_data: event.target.checked }))} type="checkbox" />
            Anonymize archived data
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Audit reason
          <textarea
            className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Example: Updating retention policy for production rollout."
            value={draft.reason}
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onTrigger} type="button" variant="secondary">
            <Database aria-hidden="true" />
            Trigger backup
          </Button>
          <Button disabled={!draft.reason.trim() || isSaving} onClick={onSave} type="button" variant="primary">
            Save policy
          </Button>
        </div>
      </Panel>
      <Panel title="Backup jobs" description="Backups are visible to Super Admins. Restore operations require re-authentication, reason, confirmation, and immutable audit logging.">
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
      </div>
  );
}
