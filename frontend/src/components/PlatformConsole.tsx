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
  getPlatformApiGovernancePolicy,
  getPlatformAiGovernancePolicy,
  getPlatformCommunicationPolicy,
  getPlatformCompliancePolicy,
  getPlatformSettings,
  getPlatformBackupPolicy,
  getPlatformTenantLifecyclePolicy,
  getPlatformMobileFleet,
  getPlatformObservabilityPolicy,
  getPlatformQuotaPolicy,
  getPlatformRelease,
  getPlatformRetentionPolicy,
  getPlatformSecurityPolicy,
  getPlatformSlaPolicy,
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
  updatePlatformApiGovernancePolicy,
  updatePlatformAiGovernancePolicy,
  updatePlatformCommunicationPolicy,
  updatePlatformBackupPolicy,
  updatePlatformCompliancePolicy,
  updatePlatformIntegration,
  updatePlatformOrganizationPlan,
  updatePlatformObservabilityPolicy,
  updatePlatformQuotaPolicy,
  updatePlatformRelease,
  updatePlatformRetentionPolicy,
  updatePlatformOrganizationStatus,
  updatePlatformSecurityPolicy,
  updatePlatformSlaPolicy,
  updatePlatformTenantLifecyclePolicy,
  type CurrentPrincipal,
  type PlatformApiGovernancePolicyRead,
  type PlatformAiGovernancePolicyRead,
  type PlatformAuditLogRead,
  type PlatformBackupJobRead,
  type PlatformBackupPolicyRead,
  type PlatformCommunicationPolicyRead,
  type PlatformCompliancePolicyRead,
  type PlatformDataIsolationIssueRead,
  type PlatformFeatureFlagRead,
  type PlatformHealthServiceRead,
  type PlatformIntegrationRead,
  type PlatformLeadRead,
  type PlatformMobileFleetDeviceRead,
  type PlatformMobileFleetSummaryRead,
  type PlatformObservabilityPolicyRead,
  type PlatformOrganizationRead,
  type PlatformOrganizationPlanRead,
  type PlatformOrganizationUsageRead,
  type PlatformQuotaPolicyRead,
  type PlatformReleaseRead,
  type PlatformRetentionPolicyRead,
  type PlatformRoleTemplateRead,
  type PlatformSecurityEventRead,
  type PlatformSecurityPolicyRead,
  type PlatformSectorPackRead,
  type PlatformSlaPolicyRead,
  type PlatformSupportSessionRead,
  type PlatformTenantSupportQueueItemRead,
  type PlatformTenantLifecyclePolicyRead,
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
  | "tenant-lifecycle"
  | "compliance"
  | "sla"
  | "quotas"
  | "observability"
  | "retention"
  | "api-governance"
  | "ai-governance"
  | "communications"
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

type TenantLifecycleDraft = Omit<PlatformTenantLifecyclePolicyRead, "updated_at"> & {
  onboarding_checklist_text: string;
  reason: string;
};

type ComplianceDraft = Omit<PlatformCompliancePolicyRead, "updated_at"> & {
  allowed_data_regions_text: string;
  reason: string;
};

type SlaDraft = Omit<PlatformSlaPolicyRead, "updated_at"> & {
  reason: string;
};

type QuotaDraft = Omit<PlatformQuotaPolicyRead, "updated_at"> & {
  reason: string;
};

type ObservabilityDraft = Omit<PlatformObservabilityPolicyRead, "updated_at"> & {
  reason: string;
};

type RetentionDraft = Omit<PlatformRetentionPolicyRead, "updated_at"> & {
  reason: string;
};

type ApiGovernanceDraft = Omit<PlatformApiGovernancePolicyRead, "updated_at"> & {
  reason: string;
};

type AiGovernanceDraft = Omit<PlatformAiGovernancePolicyRead, "updated_at"> & {
  reason: string;
};

type CommunicationDraft = Omit<PlatformCommunicationPolicyRead, "updated_at"> & {
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
  { id: "tenant-lifecycle", label: "Tenant Lifecycle", route: "/platform/tenant-lifecycle", icon: Building2, description: "Default onboarding, trial, grace, and suspension controls." },
  { id: "compliance", label: "Compliance", route: "/platform/compliance", icon: ShieldCheck, description: "Data residency, export approval, masking, and retention posture." },
  { id: "sla", label: "SLA & Support", route: "/platform/sla", icon: LifeBuoy, description: "Support response targets, escalation contacts, and incident posture." },
  { id: "quotas", label: "Quotas", route: "/platform/quotas", icon: Database, description: "Usage warning thresholds, rate limits, overage behavior, and notifications." },
  { id: "observability", label: "Observability", route: "/platform/observability", icon: HeartPulse, description: "Health checks, alert thresholds, mobile sync risk, and alert routing." },
  { id: "retention", label: "Retention", route: "/platform/retention", icon: Archive, description: "Tenant data, audit log, export, backup, and anonymization retention." },
  { id: "api-governance", label: "API Governance", route: "/platform/api-governance", icon: KeyRound, description: "Public API access, API key expiry, webhook retries, and secret rotation." },
  { id: "ai-governance", label: "AI Governance", route: "/platform/ai-governance", icon: Activity, description: "AI assistance, PII redaction, human review, budgets, and audit controls." },
  { id: "communications", label: "Communications", route: "/platform/communications", icon: LifeBuoy, description: "Email, SMS, push, tenant broadcasts, and notification log defaults." },
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
  const [tenantLifecycleDraft, setTenantLifecycleDraft] = useState<TenantLifecycleDraft>({
    default_plan: "Professional",
    default_submission_limit: 100000,
    default_user_limit: 50,
    grace_days: 7,
    onboarding_checklist: [],
    onboarding_checklist_text: "",
    reason: "",
    require_owner_before_activation: true,
    require_project_before_activation: false,
    suspend_after_grace: true,
    trial_days: 14,
  });
  const [complianceDraft, setComplianceDraft] = useState<ComplianceDraft>({
    allowed_data_regions: ["EU", "US", "Africa", "Custom"],
    allowed_data_regions_text: "EU\nUS\nAfrica\nCustom",
    audit_retention_days: 3650,
    data_processing_contact: "",
    default_data_region: "EU",
    pii_masking_default: true,
    reason: "",
    require_dpa_for_exports: true,
    require_export_approval: true,
    subprocessors_public_url: "",
  });
  const [slaDraft, setSlaDraft] = useState<SlaDraft>({
    critical_response_minutes: 60,
    escalation_email: "",
    high_response_hours: 4,
    incident_manager: "",
    normal_response_hours: 24,
    reason: "",
    status_page_url: "",
    support_session_max_minutes: 60,
    uptime_target_percent: 99.5,
  });
  const [quotaDraft, setQuotaDraft] = useState<QuotaDraft>({
    api_rate_limit_per_minute: 600,
    critical_threshold_percent: 95,
    notify_owners_on_warning: true,
    notify_super_admins_on_critical: true,
    reason: "",
    storage_overage_action: "warn",
    submission_overage_action: "warn",
    warning_threshold_percent: 80,
  });
  const [observabilityDraft, setObservabilityDraft] = useState<ObservabilityDraft>({
    alert_email: "",
    api_error_rate_threshold_percent: 5,
    health_check_interval_seconds: 60,
    mobile_sync_failure_threshold_percent: 10,
    offline_device_alert_days: 7,
    pager_channel: "",
    reason: "",
    slow_request_threshold_ms: 2000,
  });
  const [retentionDraft, setRetentionDraft] = useState<RetentionDraft>({
    anonymize_deleted_user_days: 30,
    audit_log_retention_days: 3650,
    backup_retention_days: 90,
    export_retention_days: 30,
    inactive_tenant_archive_days: 180,
    legal_hold_enabled: true,
    reason: "",
    tenant_data_retention_days: 2555,
  });
  const [apiGovernanceDraft, setApiGovernanceDraft] = useState<ApiGovernanceDraft>({
    api_key_expiry_days: 180,
    audit_external_access: true,
    public_api_enabled: true,
    reason: "",
    require_scoped_api_keys: true,
    secret_rotation_days: 90,
    webhook_retry_attempts: 5,
    webhook_timeout_seconds: 15,
  });
  const [aiGovernanceDraft, setAiGovernanceDraft] = useState<AiGovernanceDraft>({
    ai_features_enabled: true,
    audit_ai_actions: true,
    default_provider: "OpenAI",
    human_review_required: true,
    max_prompt_retention_days: 30,
    monthly_token_budget: 1_000_000,
    pii_redaction_required: true,
    reason: "",
  });
  const [communicationDraft, setCommunicationDraft] = useState<CommunicationDraft>({
    default_from_email: "support@atlasfieldops.com",
    notification_log_retention_days: 365,
    push_notifications_enabled: true,
    reason: "",
    sms_enabled: false,
    support_reply_to_email: "support@atlasfieldops.com",
    tenant_broadcasts_enabled: true,
    transactional_email_enabled: true,
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
  const tenantLifecycleQuery = useQuery({ queryKey: ["platform-tenant-lifecycle-policy", token], queryFn: () => getPlatformTenantLifecyclePolicy(token ?? ""), enabled });
  const compliancePolicyQuery = useQuery({ queryKey: ["platform-compliance-policy", token], queryFn: () => getPlatformCompliancePolicy(token ?? ""), enabled });
  const slaPolicyQuery = useQuery({ queryKey: ["platform-sla-policy", token], queryFn: () => getPlatformSlaPolicy(token ?? ""), enabled });
  const quotaPolicyQuery = useQuery({ queryKey: ["platform-quota-policy", token], queryFn: () => getPlatformQuotaPolicy(token ?? ""), enabled });
  const observabilityPolicyQuery = useQuery({ queryKey: ["platform-observability-policy", token], queryFn: () => getPlatformObservabilityPolicy(token ?? ""), enabled });
  const retentionPolicyQuery = useQuery({ queryKey: ["platform-retention-policy", token], queryFn: () => getPlatformRetentionPolicy(token ?? ""), enabled });
  const apiGovernancePolicyQuery = useQuery({ queryKey: ["platform-api-governance-policy", token], queryFn: () => getPlatformApiGovernancePolicy(token ?? ""), enabled });
  const aiGovernancePolicyQuery = useQuery({ queryKey: ["platform-ai-governance-policy", token], queryFn: () => getPlatformAiGovernancePolicy(token ?? ""), enabled });
  const communicationPolicyQuery = useQuery({ queryKey: ["platform-communication-policy", token], queryFn: () => getPlatformCommunicationPolicy(token ?? ""), enabled });
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

  const tenantLifecycleMutation = useMutation({
    mutationFn: () =>
      updatePlatformTenantLifecyclePolicy(token ?? "", {
        default_plan: tenantLifecycleDraft.default_plan,
        default_submission_limit: tenantLifecycleDraft.default_submission_limit,
        default_user_limit: tenantLifecycleDraft.default_user_limit,
        grace_days: tenantLifecycleDraft.grace_days,
        onboarding_checklist: tenantLifecycleDraft.onboarding_checklist_text.split("\n").map((item) => item.trim()).filter(Boolean),
        reason: tenantLifecycleDraft.reason,
        require_owner_before_activation: tenantLifecycleDraft.require_owner_before_activation,
        require_project_before_activation: tenantLifecycleDraft.require_project_before_activation,
        suspend_after_grace: tenantLifecycleDraft.suspend_after_grace,
        trial_days: tenantLifecycleDraft.trial_days,
      }),
    onSuccess: async () => {
      await tenantLifecycleQuery.refetch();
      await auditQuery.refetch();
      setTenantLifecycleDraft((draft) => ({ ...draft, reason: "" }));
      pushToast({
        title: "Tenant lifecycle policy updated",
        description: "Trial, grace, activation, and onboarding defaults were saved and audited.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Tenant lifecycle policy was not updated",
        description: "Check numeric limits, checklist, audit reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  const compliancePolicyMutation = useMutation({
    mutationFn: () =>
      updatePlatformCompliancePolicy(token ?? "", {
        allowed_data_regions: complianceDraft.allowed_data_regions_text.split("\n").map((item) => item.trim()).filter(Boolean),
        audit_retention_days: complianceDraft.audit_retention_days,
        data_processing_contact: complianceDraft.data_processing_contact,
        default_data_region: complianceDraft.default_data_region,
        pii_masking_default: complianceDraft.pii_masking_default,
        reason: complianceDraft.reason,
        require_dpa_for_exports: complianceDraft.require_dpa_for_exports,
        require_export_approval: complianceDraft.require_export_approval,
        subprocessors_public_url: complianceDraft.subprocessors_public_url,
      }),
    onSuccess: async () => {
      await compliancePolicyQuery.refetch();
      await auditQuery.refetch();
      setComplianceDraft((draft) => ({ ...draft, reason: "" }));
      pushToast({
        title: "Compliance policy updated",
        description: "Data residency, masking, export, and audit retention defaults were saved and audited.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Compliance policy was not updated",
        description: "Check regions, retention days, contact details, reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  const slaPolicyMutation = useMutation({
    mutationFn: () => updatePlatformSlaPolicy(token ?? "", slaDraft),
    onSuccess: async () => {
      await slaPolicyQuery.refetch();
      await auditQuery.refetch();
      setSlaDraft((draft) => ({ ...draft, reason: "" }));
      pushToast({
        title: "SLA policy updated",
        description: "Support targets, escalation contacts, and incident defaults were saved and audited.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "SLA policy was not updated",
        description: "Check response targets, escalation contacts, reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  const quotaPolicyMutation = useMutation({
    mutationFn: () => updatePlatformQuotaPolicy(token ?? "", quotaDraft),
    onSuccess: async () => {
      await quotaPolicyQuery.refetch();
      await auditQuery.refetch();
      setQuotaDraft((draft) => ({ ...draft, reason: "" }));
      pushToast({
        title: "Quota policy updated",
        description: "Usage thresholds, rate limits, overage behavior, and notifications were saved and audited.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Quota policy was not updated",
        description: "Check thresholds, rate limit, overage actions, reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  const observabilityPolicyMutation = useMutation({
    mutationFn: () => updatePlatformObservabilityPolicy(token ?? "", observabilityDraft),
    onSuccess: async () => {
      await observabilityPolicyQuery.refetch();
      await auditQuery.refetch();
      setObservabilityDraft((draft) => ({ ...draft, reason: "" }));
      pushToast({
        title: "Observability policy updated",
        description: "Health cadence, alert thresholds, mobile sync risk, and routing were saved and audited.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Observability policy was not updated",
        description: "Check thresholds, alert routing, reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  const retentionPolicyMutation = useMutation({
    mutationFn: () => updatePlatformRetentionPolicy(token ?? "", retentionDraft),
    onSuccess: async () => {
      await retentionPolicyQuery.refetch();
      await auditQuery.refetch();
      setRetentionDraft((draft) => ({ ...draft, reason: "" }));
      pushToast({
        title: "Retention policy updated",
        description: "Tenant data, audit log, backup, export, and anonymization retention were saved and audited.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Retention policy was not updated",
        description: "Check retention windows, legal hold, reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  const apiGovernancePolicyMutation = useMutation({
    mutationFn: () => updatePlatformApiGovernancePolicy(token ?? "", apiGovernanceDraft),
    onSuccess: async () => {
      await apiGovernancePolicyQuery.refetch();
      await auditQuery.refetch();
      setApiGovernanceDraft((draft) => ({ ...draft, reason: "" }));
      pushToast({
        title: "API governance policy updated",
        description: "API access, key expiry, webhook retry, secret rotation, and external audit defaults were saved.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "API governance policy was not updated",
        description: "Check API defaults, webhook settings, reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  const aiGovernancePolicyMutation = useMutation({
    mutationFn: () => updatePlatformAiGovernancePolicy(token ?? "", aiGovernanceDraft),
    onSuccess: async () => {
      await aiGovernancePolicyQuery.refetch();
      await auditQuery.refetch();
      setAiGovernanceDraft((draft) => ({ ...draft, reason: "" }));
      pushToast({
        title: "AI governance policy updated",
        description: "AI defaults, PII redaction, human review, token budget, and audit controls were saved.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "AI governance policy was not updated",
        description: "Check provider, budget, retention, reason, and Super Admin permissions.",
        tone: "danger",
      });
    },
  });

  const communicationPolicyMutation = useMutation({
    mutationFn: () => updatePlatformCommunicationPolicy(token ?? "", communicationDraft),
    onSuccess: async () => {
      await communicationPolicyQuery.refetch();
      await auditQuery.refetch();
      setCommunicationDraft((draft) => ({ ...draft, reason: "" }));
      pushToast({
        title: "Communication policy updated",
        description: "Email, SMS, push, tenant broadcasts, and notification retention were saved.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Communication policy was not updated",
        description: "Check sender addresses, notification defaults, reason, and Super Admin permissions.",
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
  const tenantLifecycle = tenantLifecycleQuery.data;
  const compliancePolicy = compliancePolicyQuery.data;
  const slaPolicy = slaPolicyQuery.data;
  const quotaPolicy = quotaPolicyQuery.data;
  const observabilityPolicy = observabilityPolicyQuery.data;
  const retentionPolicy = retentionPolicyQuery.data;
  const apiGovernancePolicy = apiGovernancePolicyQuery.data;
  const aiGovernancePolicy = aiGovernancePolicyQuery.data;
  const communicationPolicy = communicationPolicyQuery.data;

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

  useEffect(() => {
    const policy = tenantLifecycleQuery.data;
    if (!policy) return;
    setTenantLifecycleDraft({
      default_plan: policy.default_plan,
      default_submission_limit: policy.default_submission_limit,
      default_user_limit: policy.default_user_limit,
      grace_days: policy.grace_days,
      onboarding_checklist: policy.onboarding_checklist,
      onboarding_checklist_text: policy.onboarding_checklist.join("\n"),
      reason: "",
      require_owner_before_activation: policy.require_owner_before_activation,
      require_project_before_activation: policy.require_project_before_activation,
      suspend_after_grace: policy.suspend_after_grace,
      trial_days: policy.trial_days,
    });
  }, [tenantLifecycleQuery.data]);

  useEffect(() => {
    const policy = compliancePolicyQuery.data;
    if (!policy) return;
    setComplianceDraft({
      allowed_data_regions: policy.allowed_data_regions,
      allowed_data_regions_text: policy.allowed_data_regions.join("\n"),
      audit_retention_days: policy.audit_retention_days,
      data_processing_contact: policy.data_processing_contact,
      default_data_region: policy.default_data_region,
      pii_masking_default: policy.pii_masking_default,
      reason: "",
      require_dpa_for_exports: policy.require_dpa_for_exports,
      require_export_approval: policy.require_export_approval,
      subprocessors_public_url: policy.subprocessors_public_url,
    });
  }, [compliancePolicyQuery.data]);

  useEffect(() => {
    const policy = slaPolicyQuery.data;
    if (!policy) return;
    setSlaDraft({
      critical_response_minutes: policy.critical_response_minutes,
      escalation_email: policy.escalation_email,
      high_response_hours: policy.high_response_hours,
      incident_manager: policy.incident_manager,
      normal_response_hours: policy.normal_response_hours,
      reason: "",
      status_page_url: policy.status_page_url,
      support_session_max_minutes: policy.support_session_max_minutes,
      uptime_target_percent: policy.uptime_target_percent,
    });
  }, [slaPolicyQuery.data]);

  useEffect(() => {
    const policy = quotaPolicyQuery.data;
    if (!policy) return;
    setQuotaDraft({
      api_rate_limit_per_minute: policy.api_rate_limit_per_minute,
      critical_threshold_percent: policy.critical_threshold_percent,
      notify_owners_on_warning: policy.notify_owners_on_warning,
      notify_super_admins_on_critical: policy.notify_super_admins_on_critical,
      reason: "",
      storage_overage_action: policy.storage_overage_action,
      submission_overage_action: policy.submission_overage_action,
      warning_threshold_percent: policy.warning_threshold_percent,
    });
  }, [quotaPolicyQuery.data]);

  useEffect(() => {
    const policy = observabilityPolicyQuery.data;
    if (!policy) return;
    setObservabilityDraft({
      alert_email: policy.alert_email,
      api_error_rate_threshold_percent: policy.api_error_rate_threshold_percent,
      health_check_interval_seconds: policy.health_check_interval_seconds,
      mobile_sync_failure_threshold_percent: policy.mobile_sync_failure_threshold_percent,
      offline_device_alert_days: policy.offline_device_alert_days,
      pager_channel: policy.pager_channel,
      reason: "",
      slow_request_threshold_ms: policy.slow_request_threshold_ms,
    });
  }, [observabilityPolicyQuery.data]);

  useEffect(() => {
    const policy = retentionPolicyQuery.data;
    if (!policy) return;
    setRetentionDraft({
      anonymize_deleted_user_days: policy.anonymize_deleted_user_days,
      audit_log_retention_days: policy.audit_log_retention_days,
      backup_retention_days: policy.backup_retention_days,
      export_retention_days: policy.export_retention_days,
      inactive_tenant_archive_days: policy.inactive_tenant_archive_days,
      legal_hold_enabled: policy.legal_hold_enabled,
      reason: "",
      tenant_data_retention_days: policy.tenant_data_retention_days,
    });
  }, [retentionPolicyQuery.data]);

  useEffect(() => {
    const policy = apiGovernancePolicyQuery.data;
    if (!policy) return;
    setApiGovernanceDraft({
      api_key_expiry_days: policy.api_key_expiry_days,
      audit_external_access: policy.audit_external_access,
      public_api_enabled: policy.public_api_enabled,
      reason: "",
      require_scoped_api_keys: policy.require_scoped_api_keys,
      secret_rotation_days: policy.secret_rotation_days,
      webhook_retry_attempts: policy.webhook_retry_attempts,
      webhook_timeout_seconds: policy.webhook_timeout_seconds,
    });
  }, [apiGovernancePolicyQuery.data]);

  useEffect(() => {
    const policy = aiGovernancePolicyQuery.data;
    if (!policy) return;
    setAiGovernanceDraft({
      ai_features_enabled: policy.ai_features_enabled,
      audit_ai_actions: policy.audit_ai_actions,
      default_provider: policy.default_provider,
      human_review_required: policy.human_review_required,
      max_prompt_retention_days: policy.max_prompt_retention_days,
      monthly_token_budget: policy.monthly_token_budget,
      pii_redaction_required: policy.pii_redaction_required,
      reason: "",
    });
  }, [aiGovernancePolicyQuery.data]);

  useEffect(() => {
    const policy = communicationPolicyQuery.data;
    if (!policy) return;
    setCommunicationDraft({
      default_from_email: policy.default_from_email,
      notification_log_retention_days: policy.notification_log_retention_days,
      push_notifications_enabled: policy.push_notifications_enabled,
      reason: "",
      sms_enabled: policy.sms_enabled,
      support_reply_to_email: policy.support_reply_to_email,
      tenant_broadcasts_enabled: policy.tenant_broadcasts_enabled,
      transactional_email_enabled: policy.transactional_email_enabled,
    });
  }, [communicationPolicyQuery.data]);

  const platformCards = [
    { label: "Organizations", value: String(summaryQuery.data?.organization_count ?? organizations.length), icon: Building2, tone: "platform" as const },
    { label: "Active Organizations", value: String(summaryQuery.data?.active_organization_count ?? organizations.filter((item) => item.is_active).length), icon: CheckCircle2, tone: "success" as const },
    { label: "Global Users", value: String(summaryQuery.data?.tenant_user_count ?? users.length), icon: UsersRound, tone: "neutral" as const },
    { label: "Platform Admins", value: String(summaryQuery.data?.platform_admin_count ?? users.filter((user) => user.role_name === "super_admin").length), icon: ShieldCheck, tone: "platform" as const },
    { label: "Isolation Issues", value: String(dataIsolationIssues.length), icon: AlertTriangle, tone: dataIsolationIssues.some((issue) => issue.severity === "critical") ? "danger" as const : dataIsolationIssues.length ? "warning" as const : "success" as const },
    { label: "Mobile Devices", value: String(mobileFleet?.active_devices ?? 0), icon: Smartphone, tone: mobileFleet?.offline_devices ? "warning" as const : "success" as const },
    { label: "Support Queue", value: String(supportQueue.length), icon: LifeBuoy, tone: supportQueue.some((item) => item.priority === "critical") ? "danger" as const : supportQueue.length ? "warning" as const : "success" as const },
    { label: "Trial Days", value: String(tenantLifecycle?.trial_days ?? 14), icon: Building2, tone: "neutral" as const },
    { label: "Data Region", value: compliancePolicy?.default_data_region ?? "EU", icon: ShieldCheck, tone: compliancePolicy?.require_export_approval ? "success" as const : "warning" as const },
    { label: "Uptime Target", value: `${slaPolicy?.uptime_target_percent ?? 99.5}%`, icon: HeartPulse, tone: "success" as const },
    { label: "Quota Warning", value: `${quotaPolicy?.warning_threshold_percent ?? 80}%`, icon: Database, tone: "warning" as const },
    { label: "Health Cadence", value: `${observabilityPolicy?.health_check_interval_seconds ?? 60}s`, icon: HeartPulse, tone: "success" as const },
    { label: "Audit Retention", value: `${retentionPolicy?.audit_log_retention_days ?? 3650}d`, icon: Archive, tone: "platform" as const },
    { label: "Public API", value: apiGovernancePolicy?.public_api_enabled === false ? "Off" : "On", icon: KeyRound, tone: apiGovernancePolicy?.public_api_enabled === false ? "warning" as const : "success" as const },
    { label: "AI Controls", value: aiGovernancePolicy?.ai_features_enabled === false ? "Off" : "On", icon: Activity, tone: aiGovernancePolicy?.ai_features_enabled === false ? "warning" as const : "success" as const },
    { label: "Email", value: communicationPolicy?.transactional_email_enabled === false ? "Off" : "On", icon: LifeBuoy, tone: communicationPolicy?.transactional_email_enabled === false ? "warning" as const : "success" as const },
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
    if (activeSection === "tenant-lifecycle") {
      return (
        <TenantLifecyclePolicy
          draft={tenantLifecycleDraft}
          isLoading={tenantLifecycleQuery.isFetching}
          isSaving={tenantLifecycleMutation.isPending}
          onDraftChange={setTenantLifecycleDraft}
          onSave={() => tenantLifecycleMutation.mutate()}
          policy={tenantLifecycle}
        />
      );
    }
    if (activeSection === "compliance") {
      return (
        <CompliancePolicy
          draft={complianceDraft}
          isLoading={compliancePolicyQuery.isFetching}
          isSaving={compliancePolicyMutation.isPending}
          onDraftChange={setComplianceDraft}
          onSave={() => compliancePolicyMutation.mutate()}
          policy={compliancePolicy}
        />
      );
    }
    if (activeSection === "sla") {
      return (
        <SlaPolicy
          draft={slaDraft}
          isLoading={slaPolicyQuery.isFetching}
          isSaving={slaPolicyMutation.isPending}
          onDraftChange={setSlaDraft}
          onSave={() => slaPolicyMutation.mutate()}
          policy={slaPolicy}
        />
      );
    }
    if (activeSection === "quotas") {
      return (
        <QuotaPolicy
          draft={quotaDraft}
          isLoading={quotaPolicyQuery.isFetching}
          isSaving={quotaPolicyMutation.isPending}
          onDraftChange={setQuotaDraft}
          onSave={() => quotaPolicyMutation.mutate()}
          policy={quotaPolicy}
        />
      );
    }
    if (activeSection === "observability") {
      return (
        <ObservabilityPolicy
          draft={observabilityDraft}
          isLoading={observabilityPolicyQuery.isFetching}
          isSaving={observabilityPolicyMutation.isPending}
          onDraftChange={setObservabilityDraft}
          onSave={() => observabilityPolicyMutation.mutate()}
          policy={observabilityPolicy}
        />
      );
    }
    if (activeSection === "retention") {
      return (
        <RetentionPolicy
          draft={retentionDraft}
          isLoading={retentionPolicyQuery.isFetching}
          isSaving={retentionPolicyMutation.isPending}
          onDraftChange={setRetentionDraft}
          onSave={() => retentionPolicyMutation.mutate()}
          policy={retentionPolicy}
        />
      );
    }
    if (activeSection === "api-governance") {
      return (
        <ApiGovernancePolicy
          draft={apiGovernanceDraft}
          isLoading={apiGovernancePolicyQuery.isFetching}
          isSaving={apiGovernancePolicyMutation.isPending}
          onDraftChange={setApiGovernanceDraft}
          onSave={() => apiGovernancePolicyMutation.mutate()}
          policy={apiGovernancePolicy}
        />
      );
    }
    if (activeSection === "ai-governance") {
      return (
        <AiGovernancePolicy
          draft={aiGovernanceDraft}
          isLoading={aiGovernancePolicyQuery.isFetching}
          isSaving={aiGovernancePolicyMutation.isPending}
          onDraftChange={setAiGovernanceDraft}
          onSave={() => aiGovernancePolicyMutation.mutate()}
          policy={aiGovernancePolicy}
        />
      );
    }
    if (activeSection === "communications") {
      return (
        <CommunicationPolicy
          draft={communicationDraft}
          isLoading={communicationPolicyQuery.isFetching}
          isSaving={communicationPolicyMutation.isPending}
          onDraftChange={setCommunicationDraft}
          onSave={() => communicationPolicyMutation.mutate()}
          policy={communicationPolicy}
        />
      );
    }
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
            {["users", "support-queue", "data-isolation", "audit-logs", "security", "mobile-fleet", "tenant-lifecycle", "compliance", "sla", "quotas", "observability", "retention", "api-governance", "ai-governance", "communications", "sector-packs", "integrations", "backups", "release-center"].includes(activeSection) ? renderTableSection() : null}
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

function TenantLifecyclePolicy({
  draft,
  isLoading,
  isSaving,
  onDraftChange,
  onSave,
  policy,
}: {
  draft: TenantLifecycleDraft;
  isLoading: boolean;
  isSaving: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<TenantLifecycleDraft>>;
  onSave: () => void;
  policy?: PlatformTenantLifecyclePolicyRead;
}) {
  if (!policy) return <EmptyState title={isLoading ? "Loading tenant lifecycle policy" : "Tenant lifecycle policy unavailable"} detail="Trial, grace, activation, and onboarding defaults will appear after the platform API responds." />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="Trial" value={`${policy.trial_days} days`} tone="neutral" />
        <StatCard icon={AlertTriangle} label="Grace Period" value={`${policy.grace_days} days`} tone={policy.suspend_after_grace ? "warning" : "neutral"} />
        <StatCard icon={UsersRound} label="Default Users" value={policy.default_user_limit.toLocaleString()} tone="neutral" />
        <StatCard icon={Activity} label="Default Submissions" value={policy.default_submission_limit.toLocaleString()} tone="neutral" />
      </div>
      <Panel title="Tenant lifecycle policy" description="Set the default SaaS rules used when organizations are onboarded, reviewed, or suspended. Tenant-specific plan overrides stay on the Organizations page.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            Trial days
            <Input min={0} type="number" value={draft.trial_days} onChange={(event) => onDraftChange((current) => ({ ...current, trial_days: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Grace days
            <Input min={0} type="number" value={draft.grace_days} onChange={(event) => onDraftChange((current) => ({ ...current, grace_days: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Default plan
            <Input value={draft.default_plan} onChange={(event) => onDraftChange((current) => ({ ...current, default_plan: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Default user limit
            <Input min={1} type="number" value={draft.default_user_limit} onChange={(event) => onDraftChange((current) => ({ ...current, default_user_limit: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Default submission limit
            <Input min={1} type="number" value={draft.default_submission_limit} onChange={(event) => onDraftChange((current) => ({ ...current, default_submission_limit: Number(event.target.value) }))} />
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.suspend_after_grace} onChange={(event) => onDraftChange((current) => ({ ...current, suspend_after_grace: event.target.checked }))} type="checkbox" />
            Suspend after grace
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.require_owner_before_activation} onChange={(event) => onDraftChange((current) => ({ ...current, require_owner_before_activation: event.target.checked }))} type="checkbox" />
            Require owner before activation
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.require_project_before_activation} onChange={(event) => onDraftChange((current) => ({ ...current, require_project_before_activation: event.target.checked }))} type="checkbox" />
            Require project before activation
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Onboarding checklist
          <textarea
            className="min-h-32 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, onboarding_checklist_text: event.target.value }))}
            placeholder="One onboarding step per line."
            value={draft.onboarding_checklist_text}
          />
        </label>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Audit reason
          <textarea
            className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Example: Updating tenant defaults before onboarding new customers."
            value={draft.reason}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button disabled={!draft.reason.trim() || isSaving} onClick={onSave} type="button" variant="primary">
            Save lifecycle policy
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function CompliancePolicy({
  draft,
  isLoading,
  isSaving,
  onDraftChange,
  onSave,
  policy,
}: {
  draft: ComplianceDraft;
  isLoading: boolean;
  isSaving: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<ComplianceDraft>>;
  onSave: () => void;
  policy?: PlatformCompliancePolicyRead;
}) {
  if (!policy) return <EmptyState title={isLoading ? "Loading compliance policy" : "Compliance policy unavailable"} detail="Data residency, export, masking, and audit retention controls will appear after the platform API responds." />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShieldCheck} label="Default Region" value={policy.default_data_region} tone="platform" />
        <StatCard icon={Database} label="Allowed Regions" value={String(policy.allowed_data_regions.length)} tone="neutral" />
        <StatCard icon={Archive} label="Audit Retention" value={`${policy.audit_retention_days} days`} tone="neutral" />
        <StatCard icon={CheckCircle2} label="Export Approval" value={policy.require_export_approval ? "Required" : "Optional"} tone={policy.require_export_approval ? "success" : "warning"} />
      </div>
      <Panel title="Compliance and data residency policy" description="Set global defaults for data residency, export approval, PII masking, audit retention, and compliance contact metadata.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            Default data region
            <Input value={draft.default_data_region} onChange={(event) => onDraftChange((current) => ({ ...current, default_data_region: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Audit retention days
            <Input min={30} type="number" value={draft.audit_retention_days} onChange={(event) => onDraftChange((current) => ({ ...current, audit_retention_days: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Data processing contact
            <Input value={draft.data_processing_contact} onChange={(event) => onDraftChange((current) => ({ ...current, data_processing_contact: event.target.value }))} placeholder="privacy@atlasfieldops.com" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Subprocessors URL
            <Input value={draft.subprocessors_public_url} onChange={(event) => onDraftChange((current) => ({ ...current, subprocessors_public_url: event.target.value }))} placeholder="https://..." />
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.pii_masking_default} onChange={(event) => onDraftChange((current) => ({ ...current, pii_masking_default: event.target.checked }))} type="checkbox" />
            Mask PII by default
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.require_export_approval} onChange={(event) => onDraftChange((current) => ({ ...current, require_export_approval: event.target.checked }))} type="checkbox" />
            Require export approval
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.require_dpa_for_exports} onChange={(event) => onDraftChange((current) => ({ ...current, require_dpa_for_exports: event.target.checked }))} type="checkbox" />
            Require DPA for exports
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Allowed data regions
          <textarea
            className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, allowed_data_regions_text: event.target.value }))}
            placeholder="One region per line."
            value={draft.allowed_data_regions_text}
          />
        </label>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Audit reason
          <textarea
            className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Example: Updating data residency defaults for enterprise rollout."
            value={draft.reason}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button disabled={!draft.reason.trim() || isSaving} onClick={onSave} type="button" variant="primary">
            Save compliance policy
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function SlaPolicy({
  draft,
  isLoading,
  isSaving,
  onDraftChange,
  onSave,
  policy,
}: {
  draft: SlaDraft;
  isLoading: boolean;
  isSaving: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<SlaDraft>>;
  onSave: () => void;
  policy?: PlatformSlaPolicyRead;
}) {
  if (!policy) return <EmptyState title={isLoading ? "Loading SLA policy" : "SLA policy unavailable"} detail="Support response targets and escalation contacts will appear after the platform API responds." />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HeartPulse} label="Uptime Target" value={`${policy.uptime_target_percent}%`} tone="success" />
        <StatCard icon={AlertTriangle} label="Critical Response" value={`${policy.critical_response_minutes} min`} tone="warning" />
        <StatCard icon={LifeBuoy} label="High Response" value={`${policy.high_response_hours} hrs`} tone="neutral" />
        <StatCard icon={KeyRound} label="Support Session Max" value={`${policy.support_session_max_minutes} min`} tone="platform" />
      </div>
      <Panel title="SLA and support policy" description="Set global support targets and escalation details for incidents, tenant support, and production operations.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            Uptime target %
            <Input min={90} max={100} step={0.1} type="number" value={draft.uptime_target_percent} onChange={(event) => onDraftChange((current) => ({ ...current, uptime_target_percent: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Critical response minutes
            <Input min={5} type="number" value={draft.critical_response_minutes} onChange={(event) => onDraftChange((current) => ({ ...current, critical_response_minutes: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            High response hours
            <Input min={1} type="number" value={draft.high_response_hours} onChange={(event) => onDraftChange((current) => ({ ...current, high_response_hours: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Normal response hours
            <Input min={1} type="number" value={draft.normal_response_hours} onChange={(event) => onDraftChange((current) => ({ ...current, normal_response_hours: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Support session max minutes
            <Input min={5} type="number" value={draft.support_session_max_minutes} onChange={(event) => onDraftChange((current) => ({ ...current, support_session_max_minutes: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Escalation email
            <Input value={draft.escalation_email} onChange={(event) => onDraftChange((current) => ({ ...current, escalation_email: event.target.value }))} placeholder="support@atlasfieldops.com" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Incident manager
            <Input value={draft.incident_manager} onChange={(event) => onDraftChange((current) => ({ ...current, incident_manager: event.target.value }))} placeholder="Platform Operations" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Status page URL
            <Input value={draft.status_page_url} onChange={(event) => onDraftChange((current) => ({ ...current, status_page_url: event.target.value }))} placeholder="https://status.atlasfieldops.com" />
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Audit reason
          <textarea
            className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Example: Updating production support targets before enterprise rollout."
            value={draft.reason}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button disabled={!draft.reason.trim() || isSaving} onClick={onSave} type="button" variant="primary">
            Save SLA policy
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function QuotaPolicy({
  draft,
  isLoading,
  isSaving,
  onDraftChange,
  onSave,
  policy,
}: {
  draft: QuotaDraft;
  isLoading: boolean;
  isSaving: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<QuotaDraft>>;
  onSave: () => void;
  policy?: PlatformQuotaPolicyRead;
}) {
  if (!policy) return <EmptyState title={isLoading ? "Loading quota policy" : "Quota policy unavailable"} detail="Usage thresholds, rate limits, and overage controls will appear after the platform API responds." />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={AlertTriangle} label="Warning Threshold" value={`${policy.warning_threshold_percent}%`} tone="warning" />
        <StatCard icon={ShieldCheck} label="Critical Threshold" value={`${policy.critical_threshold_percent}%`} tone="danger" />
        <StatCard icon={Activity} label="API Rate Limit" value={`${policy.api_rate_limit_per_minute}/min`} tone="neutral" />
        <StatCard icon={UsersRound} label="Owner Alerts" value={policy.notify_owners_on_warning ? "On" : "Off"} tone={policy.notify_owners_on_warning ? "success" : "warning"} />
      </div>
      <Panel title="Usage and quota policy" description="Set global thresholds and default overage behavior for tenant plan limits, API consumption, storage, and submissions.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            Warning threshold %
            <Input min={1} max={100} type="number" value={draft.warning_threshold_percent} onChange={(event) => onDraftChange((current) => ({ ...current, warning_threshold_percent: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Critical threshold %
            <Input min={1} max={100} type="number" value={draft.critical_threshold_percent} onChange={(event) => onDraftChange((current) => ({ ...current, critical_threshold_percent: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            API rate limit per minute
            <Input min={1} type="number" value={draft.api_rate_limit_per_minute} onChange={(event) => onDraftChange((current) => ({ ...current, api_rate_limit_per_minute: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Storage overage action
            <Input value={draft.storage_overage_action} onChange={(event) => onDraftChange((current) => ({ ...current, storage_overage_action: event.target.value }))} placeholder="warn, block_uploads, suspend" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Submission overage action
            <Input value={draft.submission_overage_action} onChange={(event) => onDraftChange((current) => ({ ...current, submission_overage_action: event.target.value }))} placeholder="warn, block_new, suspend" />
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.notify_owners_on_warning} onChange={(event) => onDraftChange((current) => ({ ...current, notify_owners_on_warning: event.target.checked }))} type="checkbox" />
            Notify owners on warning
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.notify_super_admins_on_critical} onChange={(event) => onDraftChange((current) => ({ ...current, notify_super_admins_on_critical: event.target.checked }))} type="checkbox" />
            Notify Super Admins on critical
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Audit reason
          <textarea
            className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Example: Updating quota thresholds before enterprise tenant rollout."
            value={draft.reason}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button disabled={!draft.reason.trim() || isSaving} onClick={onSave} type="button" variant="primary">
            Save quota policy
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function ObservabilityPolicy({
  draft,
  isLoading,
  isSaving,
  onDraftChange,
  onSave,
  policy,
}: {
  draft: ObservabilityDraft;
  isLoading: boolean;
  isSaving: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<ObservabilityDraft>>;
  onSave: () => void;
  policy?: PlatformObservabilityPolicyRead;
}) {
  if (!policy) return <EmptyState title={isLoading ? "Loading observability policy" : "Observability policy unavailable"} detail="Health checks, alert thresholds, and mobile sync risk controls will appear after the platform API responds." />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HeartPulse} label="Health Cadence" value={`${policy.health_check_interval_seconds}s`} tone="success" />
        <StatCard icon={AlertTriangle} label="API Error Alert" value={`${policy.api_error_rate_threshold_percent}%`} tone="warning" />
        <StatCard icon={Smartphone} label="Mobile Sync Alert" value={`${policy.mobile_sync_failure_threshold_percent}%`} tone="warning" />
        <StatCard icon={Activity} label="Slow Request" value={`${policy.slow_request_threshold_ms}ms`} tone="neutral" />
      </div>
      <Panel title="Observability and alerting policy" description="Set global health-check cadence, alert thresholds, mobile sync risk, offline-device alerts, and support routing for platform operations.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            Health check interval seconds
            <Input min={10} type="number" value={draft.health_check_interval_seconds} onChange={(event) => onDraftChange((current) => ({ ...current, health_check_interval_seconds: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            API error threshold %
            <Input min={0} max={100} step={0.1} type="number" value={draft.api_error_rate_threshold_percent} onChange={(event) => onDraftChange((current) => ({ ...current, api_error_rate_threshold_percent: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Slow request threshold ms
            <Input min={100} type="number" value={draft.slow_request_threshold_ms} onChange={(event) => onDraftChange((current) => ({ ...current, slow_request_threshold_ms: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Mobile sync failure %
            <Input min={0} max={100} step={0.1} type="number" value={draft.mobile_sync_failure_threshold_percent} onChange={(event) => onDraftChange((current) => ({ ...current, mobile_sync_failure_threshold_percent: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Offline device alert days
            <Input min={1} type="number" value={draft.offline_device_alert_days} onChange={(event) => onDraftChange((current) => ({ ...current, offline_device_alert_days: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Alert email
            <Input value={draft.alert_email} onChange={(event) => onDraftChange((current) => ({ ...current, alert_email: event.target.value }))} placeholder="ops@atlasfieldops.com" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Pager channel
            <Input value={draft.pager_channel} onChange={(event) => onDraftChange((current) => ({ ...current, pager_channel: event.target.value }))} placeholder="#platform-alerts" />
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Audit reason
          <textarea
            className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Example: Tightening mobile sync alerts before a large pilot rollout."
            value={draft.reason}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button disabled={!draft.reason.trim() || isSaving} onClick={onSave} type="button" variant="primary">
            Save observability policy
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function RetentionPolicy({
  draft,
  isLoading,
  isSaving,
  onDraftChange,
  onSave,
  policy,
}: {
  draft: RetentionDraft;
  isLoading: boolean;
  isSaving: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<RetentionDraft>>;
  onSave: () => void;
  policy?: PlatformRetentionPolicyRead;
}) {
  if (!policy) return <EmptyState title={isLoading ? "Loading retention policy" : "Retention policy unavailable"} detail="Tenant data, audit log, export, backup, and anonymization retention will appear after the platform API responds." />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Database} label="Tenant Data" value={`${policy.tenant_data_retention_days}d`} tone="platform" />
        <StatCard icon={FileClock} label="Audit Logs" value={`${policy.audit_log_retention_days}d`} tone="success" />
        <StatCard icon={Archive} label="Backups" value={`${policy.backup_retention_days}d`} tone="neutral" />
        <StatCard icon={ShieldCheck} label="Legal Hold" value={policy.legal_hold_enabled ? "Enabled" : "Off"} tone={policy.legal_hold_enabled ? "success" : "warning"} />
      </div>
      <Panel title="Data retention and archiving policy" description="Set platform defaults for tenant records, audit trails, exports, backups, inactive tenant archiving, deleted-user anonymization, and legal hold behavior.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            Tenant data retention days
            <Input min={30} type="number" value={draft.tenant_data_retention_days} onChange={(event) => onDraftChange((current) => ({ ...current, tenant_data_retention_days: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Audit log retention days
            <Input min={365} type="number" value={draft.audit_log_retention_days} onChange={(event) => onDraftChange((current) => ({ ...current, audit_log_retention_days: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Backup retention days
            <Input min={7} type="number" value={draft.backup_retention_days} onChange={(event) => onDraftChange((current) => ({ ...current, backup_retention_days: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Export retention days
            <Input min={1} type="number" value={draft.export_retention_days} onChange={(event) => onDraftChange((current) => ({ ...current, export_retention_days: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Archive inactive tenant after days
            <Input min={30} type="number" value={draft.inactive_tenant_archive_days} onChange={(event) => onDraftChange((current) => ({ ...current, inactive_tenant_archive_days: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Anonymize deleted users after days
            <Input min={1} type="number" value={draft.anonymize_deleted_user_days} onChange={(event) => onDraftChange((current) => ({ ...current, anonymize_deleted_user_days: Number(event.target.value) }))} />
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.legal_hold_enabled} onChange={(event) => onDraftChange((current) => ({ ...current, legal_hold_enabled: event.target.checked }))} type="checkbox" />
            Legal hold can pause deletion
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Audit reason
          <textarea
            className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Example: Aligning retention defaults with enterprise customer data governance requirements."
            value={draft.reason}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button disabled={!draft.reason.trim() || isSaving} onClick={onSave} type="button" variant="primary">
            Save retention policy
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function ApiGovernancePolicy({
  draft,
  isLoading,
  isSaving,
  onDraftChange,
  onSave,
  policy,
}: {
  draft: ApiGovernanceDraft;
  isLoading: boolean;
  isSaving: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<ApiGovernanceDraft>>;
  onSave: () => void;
  policy?: PlatformApiGovernancePolicyRead;
}) {
  if (!policy) return <EmptyState title={isLoading ? "Loading API governance policy" : "API governance policy unavailable"} detail="Public API, API key, webhook, and secret rotation controls will appear after the platform API responds." />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={KeyRound} label="Public API" value={policy.public_api_enabled ? "Enabled" : "Disabled"} tone={policy.public_api_enabled ? "success" : "warning"} />
        <StatCard icon={ShieldCheck} label="Scoped Keys" value={policy.require_scoped_api_keys ? "Required" : "Optional"} tone={policy.require_scoped_api_keys ? "success" : "warning"} />
        <StatCard icon={PlugZap} label="Webhook Retries" value={String(policy.webhook_retry_attempts)} tone="neutral" />
        <StatCard icon={FileClock} label="Secret Rotation" value={`${policy.secret_rotation_days}d`} tone="platform" />
      </div>
      <Panel title="API and integration governance policy" description="Set global defaults for public API access, API key expiry, webhook retry behavior, connector secret rotation, and external-access auditing.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.public_api_enabled} onChange={(event) => onDraftChange((current) => ({ ...current, public_api_enabled: event.target.checked }))} type="checkbox" />
            Public API enabled
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.require_scoped_api_keys} onChange={(event) => onDraftChange((current) => ({ ...current, require_scoped_api_keys: event.target.checked }))} type="checkbox" />
            Require scoped API keys
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.audit_external_access} onChange={(event) => onDraftChange((current) => ({ ...current, audit_external_access: event.target.checked }))} type="checkbox" />
            Audit external access
          </label>
          <label className="grid gap-2 text-sm font-medium">
            API key expiry days
            <Input min={1} type="number" value={draft.api_key_expiry_days} onChange={(event) => onDraftChange((current) => ({ ...current, api_key_expiry_days: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Webhook retry attempts
            <Input min={0} type="number" value={draft.webhook_retry_attempts} onChange={(event) => onDraftChange((current) => ({ ...current, webhook_retry_attempts: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Webhook timeout seconds
            <Input min={1} type="number" value={draft.webhook_timeout_seconds} onChange={(event) => onDraftChange((current) => ({ ...current, webhook_timeout_seconds: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Secret rotation days
            <Input min={1} type="number" value={draft.secret_rotation_days} onChange={(event) => onDraftChange((current) => ({ ...current, secret_rotation_days: Number(event.target.value) }))} />
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Audit reason
          <textarea
            className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Example: Enforcing scoped API keys before enabling partner integrations."
            value={draft.reason}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button disabled={!draft.reason.trim() || isSaving} onClick={onSave} type="button" variant="primary">
            Save API governance policy
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function AiGovernancePolicy({
  draft,
  isLoading,
  isSaving,
  onDraftChange,
  onSave,
  policy,
}: {
  draft: AiGovernanceDraft;
  isLoading: boolean;
  isSaving: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<AiGovernanceDraft>>;
  onSave: () => void;
  policy?: PlatformAiGovernancePolicyRead;
}) {
  if (!policy) return <EmptyState title={isLoading ? "Loading AI governance policy" : "AI governance policy unavailable"} detail="AI assistance, PII redaction, review, token budget, and audit controls will appear after the platform API responds." />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Activity} label="AI Features" value={policy.ai_features_enabled ? "Enabled" : "Disabled"} tone={policy.ai_features_enabled ? "success" : "warning"} />
        <StatCard icon={ShieldCheck} label="PII Redaction" value={policy.pii_redaction_required ? "Required" : "Optional"} tone={policy.pii_redaction_required ? "success" : "warning"} />
        <StatCard icon={UserCog} label="Human Review" value={policy.human_review_required ? "Required" : "Optional"} tone={policy.human_review_required ? "success" : "warning"} />
        <StatCard icon={Database} label="Token Budget" value={policy.monthly_token_budget.toLocaleString()} tone="platform" />
      </div>
      <Panel title="AI governance policy" description="Set platform defaults for AI-assisted workflows, provider selection, PII protection, human review, prompt retention, token budget, and audit logging.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.ai_features_enabled} onChange={(event) => onDraftChange((current) => ({ ...current, ai_features_enabled: event.target.checked }))} type="checkbox" />
            AI features enabled
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.pii_redaction_required} onChange={(event) => onDraftChange((current) => ({ ...current, pii_redaction_required: event.target.checked }))} type="checkbox" />
            Require PII redaction
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.human_review_required} onChange={(event) => onDraftChange((current) => ({ ...current, human_review_required: event.target.checked }))} type="checkbox" />
            Require human review
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.audit_ai_actions} onChange={(event) => onDraftChange((current) => ({ ...current, audit_ai_actions: event.target.checked }))} type="checkbox" />
            Audit AI actions
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Default provider
            <Input value={draft.default_provider} onChange={(event) => onDraftChange((current) => ({ ...current, default_provider: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Monthly token budget
            <Input min={0} type="number" value={draft.monthly_token_budget} onChange={(event) => onDraftChange((current) => ({ ...current, monthly_token_budget: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Prompt retention days
            <Input min={0} type="number" value={draft.max_prompt_retention_days} onChange={(event) => onDraftChange((current) => ({ ...current, max_prompt_retention_days: Number(event.target.value) }))} />
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Audit reason
          <textarea
            className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Example: Requiring human review before enabling AI-assisted data cleaning for tenants."
            value={draft.reason}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button disabled={!draft.reason.trim() || isSaving} onClick={onSave} type="button" variant="primary">
            Save AI governance policy
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function CommunicationPolicy({
  draft,
  isLoading,
  isSaving,
  onDraftChange,
  onSave,
  policy,
}: {
  draft: CommunicationDraft;
  isLoading: boolean;
  isSaving: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<CommunicationDraft>>;
  onSave: () => void;
  policy?: PlatformCommunicationPolicyRead;
}) {
  if (!policy) return <EmptyState title={isLoading ? "Loading communication policy" : "Communication policy unavailable"} detail="Email, SMS, push, broadcast, and notification log defaults will appear after the platform API responds." />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={LifeBuoy} label="Transactional Email" value={policy.transactional_email_enabled ? "Enabled" : "Disabled"} tone={policy.transactional_email_enabled ? "success" : "warning"} />
        <StatCard icon={Smartphone} label="SMS" value={policy.sms_enabled ? "Enabled" : "Disabled"} tone={policy.sms_enabled ? "success" : "neutral"} />
        <StatCard icon={Activity} label="Push" value={policy.push_notifications_enabled ? "Enabled" : "Disabled"} tone={policy.push_notifications_enabled ? "success" : "warning"} />
        <StatCard icon={FileClock} label="Log Retention" value={`${policy.notification_log_retention_days}d`} tone="platform" />
      </div>
      <Panel title="Communication policy" description="Set platform defaults for transactional email, support replies, SMS, push notifications, tenant broadcasts, and notification log retention.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.transactional_email_enabled} onChange={(event) => onDraftChange((current) => ({ ...current, transactional_email_enabled: event.target.checked }))} type="checkbox" />
            Transactional email enabled
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.sms_enabled} onChange={(event) => onDraftChange((current) => ({ ...current, sms_enabled: event.target.checked }))} type="checkbox" />
            SMS enabled
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.push_notifications_enabled} onChange={(event) => onDraftChange((current) => ({ ...current, push_notifications_enabled: event.target.checked }))} type="checkbox" />
            Push notifications enabled
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-panel p-3 text-sm font-medium">
            <input checked={draft.tenant_broadcasts_enabled} onChange={(event) => onDraftChange((current) => ({ ...current, tenant_broadcasts_enabled: event.target.checked }))} type="checkbox" />
            Tenant broadcasts enabled
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Default from email
            <Input value={draft.default_from_email} onChange={(event) => onDraftChange((current) => ({ ...current, default_from_email: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Support reply-to email
            <Input value={draft.support_reply_to_email} onChange={(event) => onDraftChange((current) => ({ ...current, support_reply_to_email: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Notification log retention days
            <Input min={30} type="number" value={draft.notification_log_retention_days} onChange={(event) => onDraftChange((current) => ({ ...current, notification_log_retention_days: Number(event.target.value) }))} />
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium">
          Audit reason
          <textarea
            className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onDraftChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Example: Enabling tenant broadcasts before the next release communication."
            value={draft.reason}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button disabled={!draft.reason.trim() || isSaving} onClick={onSave} type="button" variant="primary">
            Save communication policy
          </Button>
        </div>
      </Panel>
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
