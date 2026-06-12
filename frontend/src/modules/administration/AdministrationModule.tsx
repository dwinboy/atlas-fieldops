"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  ArrowDownToLine,
  Bell,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  Edit3,
  Flag,
  Globe2,
  KeyRound,
  Layers3,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import {
  getHealth,
  getAdministrationSummary,
  createAdministrationApiKey,
  createAdministrationBackup,
  createAdministrationIntegration,
  createAdministrationLocation,
  createAdministrationNotificationRule,
  createAdministrationReferenceList,
  createAdministrationReferenceValue,
  disconnectAdministrationIntegration,
  listAdministrationApiKeys,
  listAdministrationBackups,
  listAdministrationFeatureFlags,
  listAdministrationIntegrations,
  listAdministrationLocations,
  listAdministrationNotificationRules,
  listAdministrationReferenceLists,
  listAdministrationSystemSettings,
  requestAdministrationRecovery,
  revokeAdministrationApiKey,
  rotateAdministrationApiKey,
  testAdministrationIntegration,
  updateAdministrationLocation,
  updateAdministrationNotificationRule,
  updateAdministrationReferenceValue,
  upsertAdministrationFeatureFlag,
  upsertAdministrationSystemSetting,
  getPlatformSettings,
  getPlatformSummary,
  listPlatformAuditLogs,
  listPlatformUsage,
  type AdministrationApiKeyRead,
  type AdministrationBackupJobRead,
  type AdministrationFeatureFlagRead,
  type AdministrationIntegrationRead,
  type AdministrationLocationRead,
  type AdministrationNotificationRuleRead,
  type AdministrationReferenceListRead,
  type AdministrationReferenceValueRead,
  type AdministrationSystemSettingRead,
  type CurrentPrincipal,
  type PlatformSettingsRead,
  type PlatformSummaryRead,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { ImportsMigrationModule } from "@/modules/imports-migration/ImportsMigrationModule";
import {
  administrationPages,
  initialApiKeys,
  initialBackupJobs,
  initialConfigurationChanges,
  initialFeatureFlags,
  initialIntegrations,
  initialLocations,
  initialNotificationRules,
  initialReferenceLists,
  initialSystemSettings,
} from "@/modules/administration/data";
import type {
  AdministrationPageConfig,
  AdministrationSection,
  AdminStatus,
  MobileManagementArea,
  ApiKeyRecord,
  BackupJob,
  ConfigurationChange,
  FeatureFlag,
  IntegrationRecord,
  LocationRecord,
  LocationType,
  NotificationRule,
  ReferenceList,
  ReferenceValue,
  SystemSettings,
} from "@/modules/administration/types";
import {
  activeNotificationCount,
  activeReferenceValueCount,
  createAdministrationChange,
  filterByQuery,
  getAdministrationOverviewMetrics,
  statusTone,
  toCsv,
} from "@/modules/administration/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type AdministrationModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

type ModalMode =
  | "api-key"
  | "backup"
  | "integration"
  | "location"
  | "location-import"
  | "notification"
  | "reference-list"
  | "reference-value"
  | "restore"
  | null;

const defaultLocationDraft: Omit<LocationRecord, "id" | "updatedAt"> = {
  boundaryReference: "",
  code: "",
  coordinates: "",
  name: "",
  parentId: null,
  status: "active",
  type: "Country",
};

const defaultReferenceListDraft: Omit<
  ReferenceList,
  "id" | "updatedAt" | "values" | "version"
> = {
  category: "General",
  description: "",
  name: "",
  status: "active",
};

const defaultReferenceValueDraft: Omit<ReferenceValue, "id"> = {
  active: true,
  code: "",
  description: "",
  label: "",
};

const defaultNotificationDraft: Omit<NotificationRule, "id"> = {
  channel: "In-App",
  eventType: "Submission Alerts",
  frequency: "Immediate",
  recipients: "Supervisor",
  status: "active",
  template: "",
};

const defaultApiKeyDraft: Omit<ApiKeyRecord, "id" | "lastUsed" | "status"> = {
  name: "",
  owner: "",
  rateLimit: "1,000 requests/hour",
  scope: "Read",
};

const defaultIntegrationDraft: Omit<IntegrationRecord, "id" | "lastSync" | "status"> = {
  name: "",
  owner: "System Admin",
  type: "Email Service",
};

const locationTypes: LocationType[] = [
  "Country",
  "Region",
  "Province/State",
  "District",
  "Community",
  "Village",
  "Facility",
];

function formatTimestamp(): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const legacyMobileRouteAreas: Record<string, MobileManagementArea> = {
  "/administration/mobile-devices": "devices",
  "/administration/mobile-versions": "versions",
  "/administration/mobile-pilots": "pilots",
  "/administration/mobile-monitoring": "monitoring",
  "/administration/mobile-feedback": "feedback",
  "/administration/mobile-testing": "testing",
};

const mobileManagementTabs: { value: MobileManagementArea; label: string; hint: string }[] = [
  { value: "devices", label: "Devices", hint: "Registered Android devices, status, and remote logout controls" },
  { value: "versions", label: "Versions", hint: "Production, staging, and minimum supported app versions" },
  { value: "pilots", label: "Pilots", hint: "Pilot programs, field officers, devices, and rollout status" },
  { value: "monitoring", label: "Monitoring", hint: "Sync health, crashes, offline devices, and version distribution" },
  { value: "feedback", label: "Feedback", hint: "Field feedback and diagnostics from mobile users" },
  { value: "testing", label: "Testing", hint: "Offline, GPS, attachment, sync, and large-form field tests" },
];

function formatApiDate(value?: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function apiEnvironment(value: string): FeatureFlag["environment"] {
  const normalized = value.toLowerCase();
  if (normalized === "staging") return "Staging";
  if (normalized === "development") return "Development";
  return "Production";
}

function apiStatus(value: string): "active" | "archived" {
  return value === "archived" ? "archived" : "active";
}

function mapLocation(row: AdministrationLocationRead): LocationRecord {
  const hasCoordinates =
    typeof row.latitude === "number" && typeof row.longitude === "number";
  return {
    boundaryReference: row.boundary_reference ?? "",
    code: row.code,
    coordinates: hasCoordinates ? `${row.latitude},${row.longitude}` : "",
    id: row.id,
    name: row.name,
    parentId: row.parent_location_id ?? null,
    status: apiStatus(row.status),
    type: locationTypes.includes(row.location_type as LocationType)
      ? (row.location_type as LocationType)
      : "Country",
    updatedAt: formatApiDate(row.updated_at),
  };
}

function mapReferenceValue(row: AdministrationReferenceValueRead): ReferenceValue {
  return {
    active: row.is_active,
    code: row.code,
    description: row.description ?? "",
    id: row.id,
    label: row.label,
  };
}

function mapReferenceList(row: AdministrationReferenceListRead): ReferenceList {
  return {
    category: row.category,
    description: row.description ?? "",
    id: row.id,
    name: row.name,
    status: apiStatus(row.status),
    updatedAt: formatApiDate(row.updated_at),
    values: row.values.map(mapReferenceValue),
    version: row.version,
  };
}

function mapNotificationRule(row: AdministrationNotificationRuleRead): NotificationRule {
  return {
    channel: row.channel as NotificationRule["channel"],
    eventType: row.event_type,
    frequency: row.frequency as NotificationRule["frequency"],
    id: row.id,
    recipients: row.recipients_json.join(", "),
    status: row.status === "active" ? "active" : "disabled",
    template: row.template,
  };
}

function mapApiKey(row: AdministrationApiKeyRead): ApiKeyRecord {
  return {
    id: row.id,
    lastUsed: formatApiDate(row.last_used_at),
    name: row.api_name,
    owner: row.owner,
    rateLimit: row.rate_limit,
    scope: row.scope as ApiKeyRecord["scope"],
    status: row.status === "revoked" ? "revoked" : "active",
  };
}

function mapIntegration(row: AdministrationIntegrationRead): IntegrationRecord {
  const status =
    row.status === "connected" || row.status === "warning"
      ? row.status
      : "disconnected";
  return {
    id: row.id,
    lastSync: formatApiDate(row.last_sync_at),
    name: row.name,
    owner: row.owner,
    status,
    type: row.integration_type,
  };
}

function mapFeatureFlag(row: AdministrationFeatureFlagRead): FeatureFlag {
  return {
    enabled: row.enabled,
    environment: apiEnvironment(row.environment),
    id: row.id,
    name: row.label,
    rollout: row.rollout_percentage,
  };
}

function mapBackup(row: AdministrationBackupJobRead): BackupJob {
  return {
    date: formatApiDate(row.created_at),
    id: row.id,
    retentionDays: row.retention_days,
    size: row.size_bytes ? `${Math.round(row.size_bytes / 1024 / 1024)} MB` : "Queued",
    status:
      row.status === "completed" || row.status === "failed"
        ? row.status
        : "scheduled",
    type: row.backup_type as BackupJob["type"],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringSetting(
  settings: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = settings[key];
  return typeof value === "string" ? value : fallback;
}

function numberSetting(
  settings: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = settings[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanSetting(
  settings: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const value = settings[key];
  return typeof value === "boolean" ? value : fallback;
}

function mapSystemSettings(
  rows: AdministrationSystemSettingRead[],
  fallback: SystemSettings,
): SystemSettings {
  const platformSettings =
    rows.find((row) => row.setting_key === "platform-settings" && row.environment === "production") ??
    rows.find((row) => row.setting_key === "platform-settings");
  if (!platformSettings || !isRecord(platformSettings.setting_value_json)) {
    return fallback;
  }

  const value = platformSettings.setting_value_json;
  const security = isRecord(value.security) ? value.security : {};

  return {
    brandColor: stringSetting(value, "brandColor", fallback.brandColor),
    currency: stringSetting(value, "currency", fallback.currency),
    dateFormat: stringSetting(value, "dateFormat", fallback.dateFormat),
    defaultLanguage: stringSetting(value, "defaultLanguage", fallback.defaultLanguage),
    logoUrl: stringSetting(value, "logoUrl", fallback.logoUrl),
    numberFormat: stringSetting(value, "numberFormat", fallback.numberFormat),
    organizationName: stringSetting(value, "organizationName", fallback.organizationName),
    platformName: stringSetting(value, "platformName", fallback.platformName),
    security: {
      allowedDomains: stringSetting(security, "allowedDomains", fallback.security.allowedDomains),
      complexityRules: stringSetting(security, "complexityRules", fallback.security.complexityRules),
      concurrentSessions: numberSetting(security, "concurrentSessions", fallback.security.concurrentSessions),
      idleTimeoutMinutes: numberSetting(security, "idleTimeoutMinutes", fallback.security.idleTimeoutMinutes),
      loginRestrictions: stringSetting(security, "loginRestrictions", fallback.security.loginRestrictions),
      minimumLength: numberSetting(security, "minimumLength", fallback.security.minimumLength),
      mfaRequired: booleanSetting(security, "mfaRequired", fallback.security.mfaRequired),
      passwordExpirationDays: numberSetting(security, "passwordExpirationDays", fallback.security.passwordExpirationDays),
      sessionTimeoutMinutes: numberSetting(security, "sessionTimeoutMinutes", fallback.security.sessionTimeoutMinutes),
    },
    timeZone: stringSetting(value, "timeZone", fallback.timeZone),
  };
}

function SectionHeader({
  activePage,
  canManage,
  onPrimaryAction,
}: {
  activePage: AdministrationPageConfig;
  canManage: boolean;
  onPrimaryAction: () => void;
}) {
  const Icon = activePage.icon;

  return (
    <div className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
            <Icon aria-hidden="true" size={21} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="platform">SYSTEM</Badge>
              <Badge tone={canManage ? "success" : "warning"}>
                {canManage ? "Full access" : "Read only"}
              </Badge>
              <span className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {activePage.route}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {activePage.title}
              </h2>
              <HelpHint label={`About ${activePage.title}`} title={activePage.title}>
                {activePage.description}
              </HelpHint>
            </div>
          </div>
        </div>
        <Button
          disabled={!canManage}
          onClick={onPrimaryAction}
          type="button"
          variant="primary"
        >
          <Plus aria-hidden="true" />
          {activePage.primaryAction}
        </Button>
      </div>
    </div>
  );
}

function AdministrationModuleSelector({
  activeSection,
  onSelect,
}: {
  activeSection: AdministrationSection;
  onSelect: (section: AdministrationSection) => void;
}) {
  return (
    <section
      aria-label="Administration settings"
      className="rounded-xl border bg-panel p-3 shadow-line"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Administration settings</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Open location hierarchy, reference data, notifications, APIs,
            integrations, system settings, and backup controls.
          </p>
        </div>
        <Badge tone="neutral">{administrationPages.length} modules</Badge>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {administrationPages.map((page) => {
          const Icon = page.icon;
          const active = activeSection === page.id;
          return (
            <button
              className={cn(
                "rounded-xl border bg-background p-3 text-left transition hover:border-primary/35 hover:bg-primary/5",
                active && "border-primary/40 bg-primary/10 text-primary",
              )}
              key={page.id}
              onClick={() => onSelect(page.id)}
              type="button"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border bg-panel">
                  <Icon aria-hidden="true" size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {page.title.replace("Administration ", "")}
                  </span>
                  <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
                    {page.route}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FilterBar({
  category,
  environment,
  onCategoryChange,
  onEnvironmentChange,
  onQueryChange,
  onStatusChange,
  query,
  status,
}: {
  category: string;
  environment: string;
  onCategoryChange: (value: string) => void;
  onEnvironmentChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  query: string;
  status: string;
}) {
  return (
    <div className="grid gap-3 rounded-xl border bg-panel p-3 shadow-line md:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
      <label className="relative">
        <span className="sr-only">Search administration records</span>
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={15}
        />
        <Input
          className="pl-9"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search records"
          value={query}
        />
      </label>
      <Select
        aria-label="Filter by status"
        onChange={(event) => onStatusChange(event.target.value)}
        value={status}
      >
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="connected">Connected</option>
        <option value="disabled">Disabled</option>
        <option value="archived">Archived</option>
        <option value="failed">Failed</option>
      </Select>
      <Select
        aria-label="Filter by category"
        onChange={(event) => onCategoryChange(event.target.value)}
        value={category}
      >
        <option value="all">All categories</option>
        <option value="General">General</option>
        <option value="Localization">Localization</option>
        <option value="Finance">Finance</option>
        <option value="Security">Security</option>
        <option value="System">System</option>
      </Select>
      <Select
        aria-label="Filter by environment"
        onChange={(event) => onEnvironmentChange(event.target.value)}
        value={environment}
      >
        <option value="all">All environments</option>
        <option value="Production">Production</option>
        <option value="Staging">Staging</option>
        <option value="Development">Development</option>
      </Select>
    </div>
  );
}

function ConfigPanel({
  children,
  icon: Icon,
  title,
  tone = "neutral",
}: {
  children: ReactNode;
  icon: typeof Settings;
  title: string;
  tone?: "accent" | "danger" | "neutral" | "success" | "warning";
}) {
  return (
    <section className="rounded-xl border bg-panel p-3 shadow-line">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl border",
            tone === "success" && "bg-success/10 text-success",
            tone === "warning" && "bg-warning/10 text-warning",
            tone === "danger" && "bg-danger/10 text-danger",
            tone === "accent" && "bg-primary/10 text-primary",
            tone === "neutral" && "bg-muted text-muted-foreground",
          )}
        >
          <Icon aria-hidden="true" size={17} />
        </span>
      </div>
      {children}
    </section>
  );
}

export function AdministrationModule({
  principal,
  token,
}: AdministrationModuleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeSection, setActiveSection] =
    useState<AdministrationSection>("dashboard");
  const [mobileArea, setMobileArea] = useState<MobileManagementArea>("devices");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [locations, setLocations] = useState(initialLocations);
  const [referenceLists, setReferenceLists] = useState(initialReferenceLists);
  const [selectedReferenceListId, setSelectedReferenceListId] = useState(
    initialReferenceLists[0]?.id ?? "",
  );
  const [notificationRules, setNotificationRules] = useState(
    initialNotificationRules,
  );
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [featureFlags, setFeatureFlags] = useState(initialFeatureFlags);
  const [systemSettings, setSystemSettings] = useState(initialSystemSettings);
  const [backupJobs, setBackupJobs] = useState(initialBackupJobs);
  const [changes, setChanges] = useState(initialConfigurationChanges);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [locationDraft, setLocationDraft] = useState(defaultLocationDraft);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [referenceListDraft, setReferenceListDraft] = useState(
    defaultReferenceListDraft,
  );
  const [referenceValueDraft, setReferenceValueDraft] = useState(
    defaultReferenceValueDraft,
  );
  const [notificationDraft, setNotificationDraft] = useState(
    defaultNotificationDraft,
  );
  const [apiKeyDraft, setApiKeyDraft] = useState(defaultApiKeyDraft);
  const [integrationDraft, setIntegrationDraft] = useState(
    defaultIntegrationDraft,
  );
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState("CSV");
  const [restoreReason, setRestoreReason] = useState("");
  const [actionResult, setActionResult] = useState("");
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const actor =
    principal?.full_name?.trim() ||
    principal?.email?.trim() ||
    "Local administrator";
  const isPreview = token === "preview-token" || !principal;
  const canManage = Boolean(
    isPreview || (principal?.platform_admin && !principal.support_mode),
  );
  const hasPlatformAccess = Boolean(
    token && token !== "preview-token" && principal?.platform_admin,
  );
  const administrationDataEnabled = hasPlatformAccess;

  function selectAdministrationSection(section: AdministrationSection): void {
    const page = administrationPages.find((item) => item.id === section);
    setActiveSection(section);
    setActionResult("");
    if (page && page.route !== pathname) {
      router.push(page.route);
    }
  }

  const summaryQuery = useQuery({
    queryKey: ["administration-platform-summary", token],
    queryFn: () => getPlatformSummary(token ?? ""),
    enabled: hasPlatformAccess,
  });
  const settingsQuery = useQuery({
    queryKey: ["administration-platform-settings", token],
    queryFn: () => getPlatformSettings(token ?? ""),
    enabled: hasPlatformAccess,
  });
  const healthQuery = useQuery({
    queryKey: ["administration-platform-health"],
    queryFn: getHealth,
    enabled: hasPlatformAccess,
  });
  const usageQuery = useQuery({
    queryKey: ["administration-platform-usage", token],
    queryFn: () => listPlatformUsage(token ?? ""),
    enabled: hasPlatformAccess,
  });
  const auditQuery = useQuery({
    queryKey: ["administration-platform-audit", token],
    queryFn: () => listPlatformAuditLogs(token ?? "", 25),
    enabled: hasPlatformAccess,
  });
  const administrationSummaryQuery = useQuery({
    queryKey: ["administration-summary", token],
    queryFn: () => getAdministrationSummary(token ?? ""),
    enabled: administrationDataEnabled,
  });
  const administrationLocationsQuery = useQuery({
    queryKey: ["administration-locations", token],
    queryFn: () => listAdministrationLocations(token ?? ""),
    enabled: administrationDataEnabled,
  });
  const administrationReferenceListsQuery = useQuery({
    queryKey: ["administration-reference-lists", token],
    queryFn: () => listAdministrationReferenceLists(token ?? ""),
    enabled: administrationDataEnabled,
  });
  const administrationNotificationRulesQuery = useQuery({
    queryKey: ["administration-notification-rules", token],
    queryFn: () => listAdministrationNotificationRules(token ?? ""),
    enabled: administrationDataEnabled,
  });
  const administrationApiKeysQuery = useQuery({
    queryKey: ["administration-api-keys", token],
    queryFn: () => listAdministrationApiKeys(token ?? ""),
    enabled: administrationDataEnabled,
  });
  const administrationIntegrationsQuery = useQuery({
    queryKey: ["administration-integrations", token],
    queryFn: () => listAdministrationIntegrations(token ?? ""),
    enabled: administrationDataEnabled,
  });
  const administrationSystemSettingsQuery = useQuery({
    queryKey: ["administration-system-settings", token],
    queryFn: () => listAdministrationSystemSettings(token ?? ""),
    enabled: administrationDataEnabled,
  });
  const administrationFeatureFlagsQuery = useQuery({
    queryKey: ["administration-feature-flags", token],
    queryFn: () => listAdministrationFeatureFlags(token ?? ""),
    enabled: administrationDataEnabled,
  });
  const administrationBackupsQuery = useQuery({
    queryKey: ["administration-backups", token],
    queryFn: () => listAdministrationBackups(token ?? ""),
    enabled: administrationDataEnabled,
  });

  useEffect(() => {
    const normalizedPath = (pathname ?? "").replace(/\/+$/, "") || "/administration";
    const legacyMobileArea = Object.entries(legacyMobileRouteAreas).find(([route]) =>
      normalizedPath.startsWith(route),
    )?.[1];
    if (legacyMobileArea) {
      setMobileArea(legacyMobileArea);
      if (activeSection !== "mobile") {
        setActiveSection("mobile");
      }
      return;
    }
    const nextSection = administrationPages.find((page) => page.route === normalizedPath)?.id;
    if (nextSection && nextSection !== activeSection) {
      setActiveSection(nextSection);
    }
  }, [activeSection, pathname]);

  useEffect(() => {
    if (administrationLocationsQuery.data) {
      setLocations(administrationLocationsQuery.data.map(mapLocation));
    }
  }, [administrationLocationsQuery.data]);

  useEffect(() => {
    if (!administrationReferenceListsQuery.data) {
      return;
    }
    const nextLists = administrationReferenceListsQuery.data.map(mapReferenceList);
    setReferenceLists(nextLists);
    setSelectedReferenceListId((current) => current || nextLists[0]?.id || "");
  }, [administrationReferenceListsQuery.data]);

  useEffect(() => {
    if (administrationNotificationRulesQuery.data) {
      setNotificationRules(
        administrationNotificationRulesQuery.data.map(mapNotificationRule),
      );
    }
  }, [administrationNotificationRulesQuery.data]);

  useEffect(() => {
    if (administrationApiKeysQuery.data) {
      setApiKeys(administrationApiKeysQuery.data.map(mapApiKey));
    }
  }, [administrationApiKeysQuery.data]);

  useEffect(() => {
    if (administrationIntegrationsQuery.data) {
      setIntegrations(administrationIntegrationsQuery.data.map(mapIntegration));
    }
  }, [administrationIntegrationsQuery.data]);

  useEffect(() => {
    if (administrationSystemSettingsQuery.data) {
      setSystemSettings((current) =>
        mapSystemSettings(administrationSystemSettingsQuery.data, current),
      );
    }
  }, [administrationSystemSettingsQuery.data]);

  useEffect(() => {
    if (administrationFeatureFlagsQuery.data?.length) {
      setFeatureFlags(administrationFeatureFlagsQuery.data.map(mapFeatureFlag));
    }
  }, [administrationFeatureFlagsQuery.data]);

  useEffect(() => {
    if (administrationBackupsQuery.data) {
      setBackupJobs(administrationBackupsQuery.data.map(mapBackup));
    }
  }, [administrationBackupsQuery.data]);

  const activePage =
    administrationPages.find((page) => page.id === activeSection) ??
    administrationPages[0];
  const selectedReferenceList =
    referenceLists.find((list) => list.id === selectedReferenceListId) ??
    referenceLists[0] ??
    null;
  const platformSummary: PlatformSummaryRead | undefined = summaryQuery.data;
  const administrationSummary = administrationSummaryQuery.data;
  const runtimeSettings: PlatformSettingsRead | undefined = settingsQuery.data;
  const failedJobs =
    administrationSummary?.failed_jobs ??
    backupJobs.filter((backup) => backup.status === "failed").length +
    integrations.filter((integration) => integration.status === "warning").length +
    (healthQuery.isError ? 1 : 0);
  const platformHealth =
    healthQuery.isError ||
    runtimeSettings?.database_configured === false ||
    runtimeSettings?.jwt_secret_configured === false
      ? "critical"
      : runtimeSettings?.redis_configured === false ||
          runtimeSettings?.kafka_configured === false
        ? "warning"
        : "healthy";
  const activeUsers =
    administrationSummary?.active_users ??
    platformSummary?.tenant_user_count ??
    usageQuery.data?.reduce((sum, row) => sum + row.user_count, 0) ??
    0;
  const overviewMetrics = getAdministrationOverviewMetrics({
    activeProjects: administrationSummary?.active_projects ?? 0,
    activeUsers,
    apiKeys,
    backups: backupJobs,
    failedJobs,
    featureFlags,
    healthStatus: platformHealth,
    integrations,
    locations,
    organizations:
      administrationSummary?.organizations ??
      platformSummary?.organization_count ??
      0,
  });

  function recordChange(type: string, resource: string, detail: string): void {
    const change = createAdministrationChange({
      actor,
      detail,
      resource,
      type,
    });
    setChanges((current) => [change, ...current].slice(0, 30));
    setActionResult(detail);
    pushToast({ title: type, description: detail, tone: "success" });
  }

  function openPrimaryAction(): void {
    const modalBySection: Record<AdministrationSection, ModalMode> = {
      "api-settings": "api-key",
      "backup-recovery": "backup",
      dashboard: null,
      integrations: "integration",
      "imports-migration": null,
      "location-hierarchy": "location",
      mobile: null,
      "notification-settings": "notification",
      "reference-data": "reference-list",
      "system-settings": null,
    };

    if (activeSection === "dashboard") {
      setActionResult(
        `Platform health is ${platformHealth}. Review alerts, integrations, backups, and environment settings below.`,
      );
      return;
    }
    if (activeSection === "system-settings") {
      saveSystemSettings();
      return;
    }
    if (activeSection === "imports-migration") {
      setActionResult("Start from Upload / Select Source below. You can upload a file or use sample migration data to test the assistant.");
      return;
    }
    if (activeSection === "mobile") {
      setActionResult(
        "Mobile pilot controls are ready. Use the readiness table below to review devices, releases, monitoring, feedback, and field test gates before deployment.",
      );
      return;
    }
    if (activeSection === "location-hierarchy") {
      setEditingLocationId(null);
      setLocationDraft(defaultLocationDraft);
    }
    setModalMode(modalBySection[activeSection]);
  }

  async function archiveLocation(locationId: string): Promise<void> {
    let archivedLocation: LocationRecord | null = null;
    if (administrationDataEnabled && token) {
      try {
        archivedLocation = mapLocation(
          await updateAdministrationLocation(token, locationId, {
            status: "archived",
          }),
        );
      } catch {
        pushToast({
          title: "Location not archived",
          description: "The backend rejected the location archive request.",
          tone: "danger",
        });
        return;
      }
    }
    setLocations((current) =>
      current.map((location) =>
        location.id === locationId
          ? archivedLocation ?? { ...location, status: "archived", updatedAt: formatTimestamp() }
          : location,
      ),
    );
    recordChange(
      "Location archived",
      "Location Hierarchy",
      "A location was archived and will no longer be used for new assignments.",
    );
  }

  async function submitLocation(): Promise<void> {
    const [latitude, longitude] = locationDraft.coordinates
      .split(",")
      .map((value) => Number(value.trim()));

    if (editingLocationId) {
      const trimmedName = locationDraft.name.trim();
      let updatedLocation: LocationRecord | null = null;
      if (administrationDataEnabled && token) {
        try {
          updatedLocation = mapLocation(
            await updateAdministrationLocation(token, editingLocationId, {
              boundary_reference: locationDraft.boundaryReference || null,
              latitude: Number.isFinite(latitude) ? latitude : null,
              location_type: locationDraft.type,
              longitude: Number.isFinite(longitude) ? longitude : null,
              name: trimmedName,
              parent_location_id: locationDraft.parentId || null,
              status: locationDraft.status,
            }),
          );
        } catch {
          pushToast({
            title: "Location not updated",
            description: "The backend rejected the location update. Check required fields and try again.",
            tone: "danger",
          });
          return;
        }
      }
      setLocations((current) =>
        current.map((location) =>
          location.id === editingLocationId
            ? updatedLocation ?? {
                ...location,
                ...locationDraft,
                name: trimmedName,
                parentId: locationDraft.parentId || null,
                updatedAt: formatTimestamp(),
              }
            : location,
        ),
      );
      setEditingLocationId(null);
      setLocationDraft(defaultLocationDraft);
      setModalMode(null);
      recordChange(
        "Location updated",
        "Location Hierarchy",
        `${trimmedName} was updated.`,
      );
      return;
    }

    let nextLocation: LocationRecord = {
      ...locationDraft,
      code: locationDraft.code.trim().toUpperCase(),
      id: makeId("loc"),
      name: locationDraft.name.trim(),
      parentId: locationDraft.parentId || null,
      updatedAt: formatTimestamp(),
    };
    if (administrationDataEnabled && token) {
      try {
        nextLocation = mapLocation(
          await createAdministrationLocation(token, {
            boundary_reference: locationDraft.boundaryReference || null,
            code: locationDraft.code,
            latitude: Number.isFinite(latitude) ? latitude : null,
            location_type: locationDraft.type,
            longitude: Number.isFinite(longitude) ? longitude : null,
            name: locationDraft.name,
            parent_location_id: locationDraft.parentId || null,
            status: locationDraft.status,
          }),
        );
      } catch {
        pushToast({
          title: "Location not saved",
          description: "The backend rejected the location. Check required fields and try again.",
          tone: "danger",
        });
        return;
      }
    }
    setLocations((current) => [nextLocation, ...current]);
    setLocationDraft(defaultLocationDraft);
    setModalMode(null);
    recordChange(
      "Location created",
      "Location Hierarchy",
      `${nextLocation.name} was added as a ${nextLocation.type}.`,
    );
  }

  async function importLocations(): Promise<void> {
    const rows = importText
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean);
    let nextLocations = rows.map<LocationRecord>((row, index) => {
      const [name = `Imported location ${index + 1}`, code = `IMP${index + 1}`, type = "Community"] =
        row.split(",").map((value) => value.trim());
      return {
        boundaryReference: "",
        code: code.toUpperCase(),
        coordinates: "",
        id: makeId(`loc-import-${index}`),
        name,
        parentId: null,
        status: "active",
        type: locationTypes.includes(type as LocationType)
          ? (type as LocationType)
          : "Community",
        updatedAt: formatTimestamp(),
      };
    });
    if (administrationDataEnabled && token) {
      try {
        const persistedLocations = [];
        for (const location of nextLocations) {
          persistedLocations.push(
            mapLocation(
              await createAdministrationLocation(token, {
                boundary_reference: location.boundaryReference || null,
                code: location.code,
                latitude: null,
                location_type: location.type,
                longitude: null,
                name: location.name,
                parent_location_id: null,
                status: location.status,
              }),
            ),
          );
        }
        nextLocations = persistedLocations;
      } catch {
        pushToast({
          title: "Locations not imported",
          description: "One or more imported rows were rejected by the backend.",
          tone: "danger",
        });
        return;
      }
    }
    setLocations((current) => [...nextLocations, ...current]);
    setImportText("");
    setModalMode(null);
    recordChange(
      "Locations imported",
      "Location Hierarchy",
      `${nextLocations.length} ${importFormat} location row${nextLocations.length === 1 ? "" : "s"} imported.`,
    );
  }

  async function createReferenceList(): Promise<void> {
    let nextList: ReferenceList = {
      ...referenceListDraft,
      id: makeId("ref"),
      name: referenceListDraft.name.trim(),
      updatedAt: formatTimestamp(),
      values: [],
      version: 1,
    };
    if (administrationDataEnabled && token) {
      try {
        nextList = mapReferenceList(
          await createAdministrationReferenceList(token, {
            category: referenceListDraft.category,
            description: referenceListDraft.description,
            name: referenceListDraft.name,
            status: referenceListDraft.status,
          }),
        );
      } catch {
        pushToast({
          title: "Reference list not saved",
          description: "The backend rejected the reference list. Check the name and category.",
          tone: "danger",
        });
        return;
      }
    }
    setReferenceLists((current) => [nextList, ...current]);
    setSelectedReferenceListId(nextList.id);
    setReferenceListDraft(defaultReferenceListDraft);
    setModalMode(null);
    recordChange(
      "Reference list created",
      "Reference Data",
      `${nextList.name} was created as a platform-wide reference list.`,
    );
  }

  async function createReferenceValue(): Promise<void> {
    if (!selectedReferenceList) return;
    let nextValue: ReferenceValue = {
      ...referenceValueDraft,
      code: referenceValueDraft.code.trim().toUpperCase(),
      id: makeId("value"),
      label: referenceValueDraft.label.trim(),
    };
    if (administrationDataEnabled && token) {
      try {
        nextValue = mapReferenceValue(
          await createAdministrationReferenceValue(token, selectedReferenceList.id, {
            code: referenceValueDraft.code,
            description: referenceValueDraft.description,
            is_active: referenceValueDraft.active,
            label: referenceValueDraft.label,
          }),
        );
      } catch {
        pushToast({
          title: "Reference value not saved",
          description: "The backend rejected the value. Check the code is unique for this list.",
          tone: "danger",
        });
        return;
      }
    }
    setReferenceLists((current) =>
      current.map((list) =>
        list.id === selectedReferenceList.id
          ? {
              ...list,
              updatedAt: formatTimestamp(),
              values: [nextValue, ...list.values],
              version: list.version + 1,
            }
          : list,
      ),
    );
    setReferenceValueDraft(defaultReferenceValueDraft);
    setModalMode(null);
    recordChange(
      "Reference value added",
      "Reference Data",
      `${nextValue.label} was added to ${selectedReferenceList.name}.`,
    );
  }

  async function toggleReferenceValue(valueId: string): Promise<void> {
    if (!selectedReferenceList) return;
    const currentValue = selectedReferenceList.values.find(
      (value) => value.id === valueId,
    );
    if (!currentValue) return;
    let persistedValue: ReferenceValue | null = null;
    if (administrationDataEnabled && token) {
      try {
        persistedValue = mapReferenceValue(
          await updateAdministrationReferenceValue(token, valueId, {
            is_active: !currentValue.active,
          }),
        );
      } catch {
        pushToast({
          title: "Reference value not changed",
          description: "The backend rejected the reference value status change.",
          tone: "danger",
        });
        return;
      }
    }
    setReferenceLists((current) =>
      current.map((list) =>
        list.id === selectedReferenceList.id
          ? {
              ...list,
              updatedAt: formatTimestamp(),
              values: list.values.map((value) =>
                value.id === valueId
                  ? persistedValue ?? { ...value, active: !value.active }
                  : value,
              ),
              version: list.version + 1,
            }
          : list,
      ),
    );
    recordChange(
      "Reference value changed",
      "Reference Data",
      `${selectedReferenceList.name} was versioned after a value status change.`,
    );
  }

  async function createNotificationRule(): Promise<void> {
    let nextRule: NotificationRule = {
      ...notificationDraft,
      id: makeId("notify"),
    };
    if (administrationDataEnabled && token) {
      try {
        nextRule = mapNotificationRule(
          await createAdministrationNotificationRule(token, {
            channel: notificationDraft.channel,
            event_type: notificationDraft.eventType,
            frequency: notificationDraft.frequency,
            recipients: notificationDraft.recipients
              .split(",")
              .map((recipient) => recipient.trim())
              .filter(Boolean),
            status: notificationDraft.status === "active" ? "active" : "inactive",
            template: notificationDraft.template,
          }),
        );
      } catch {
        pushToast({
          title: "Notification rule not saved",
          description: "The backend rejected the notification rule. Check event type and recipients.",
          tone: "danger",
        });
        return;
      }
    }
    setNotificationRules((current) => [nextRule, ...current]);
    setNotificationDraft(defaultNotificationDraft);
    setModalMode(null);
    recordChange(
      "Notification rule created",
      "Notification Settings",
      `${nextRule.eventType} will notify ${nextRule.recipients} through ${nextRule.channel}.`,
    );
  }

  async function toggleNotificationRule(ruleId: string): Promise<void> {
    const currentRule = notificationRules.find((rule) => rule.id === ruleId);
    if (!currentRule) return;
    const nextStatus = currentRule.status === "active" ? "inactive" : "active";
    let persistedRule: NotificationRule | null = null;
    if (administrationDataEnabled && token) {
      try {
        persistedRule = mapNotificationRule(
          await updateAdministrationNotificationRule(token, ruleId, {
            status: nextStatus,
          }),
        );
      } catch {
        pushToast({
          title: "Notification rule not changed",
          description: "The backend rejected the notification status change.",
          tone: "danger",
        });
        return;
      }
    }
    setNotificationRules((current) =>
      current.map((rule) =>
        rule.id === ruleId
          ? persistedRule ?? {
              ...rule,
              status: rule.status === "active" ? "disabled" : "active",
            }
          : rule,
      ),
    );
    recordChange(
      "Notification rule changed",
      "Notification Settings",
      "A notification delivery rule was enabled or disabled.",
    );
  }

  async function createApiKey(): Promise<void> {
    let nextKey: ApiKeyRecord = {
      ...apiKeyDraft,
      id: makeId("api"),
      lastUsed: "Never",
      name: apiKeyDraft.name.trim(),
      status: "active",
    };
    if (administrationDataEnabled && token) {
      try {
        nextKey = mapApiKey(
          await createAdministrationApiKey(token, {
            api_name: apiKeyDraft.name,
            owner: apiKeyDraft.owner,
            rate_limit: apiKeyDraft.rateLimit,
            scope: apiKeyDraft.scope,
          }),
        );
      } catch {
        pushToast({
          title: "API key not created",
          description: "The backend rejected the API key request. Check owner and scope.",
          tone: "danger",
        });
        return;
      }
    }
    setApiKeys((current) => [nextKey, ...current]);
    setApiKeyDraft(defaultApiKeyDraft);
    setModalMode(null);
    recordChange(
      "API key created",
      "API Settings",
      `${nextKey.name} was created with ${nextKey.scope} scope. Copy the generated secret from the secure backend once persistence is enabled.`,
    );
  }

  async function updateApiKeyStatus(keyId: string, status: "active" | "revoked"): Promise<void> {
    let updatedKey: ApiKeyRecord | null = null;
    if (administrationDataEnabled && token) {
      try {
        updatedKey = mapApiKey(
          status === "revoked"
            ? await revokeAdministrationApiKey(token, keyId)
            : await rotateAdministrationApiKey(token, keyId),
        );
      } catch {
        pushToast({
          title: "API key was not updated",
          description: "The backend rejected the API key status change.",
          tone: "danger",
        });
        return;
      }
    }
    setApiKeys((current) =>
      current.map((key) =>
        key.id === keyId ? (updatedKey ?? { ...key, status }) : key,
      ),
    );
    recordChange(
      status === "revoked" ? "API key revoked" : "API key rotated",
      "API Settings",
      "API key status was changed and must be audited before production persistence.",
    );
  }

  async function createIntegration(): Promise<void> {
    let nextIntegration: IntegrationRecord = {
      ...integrationDraft,
      id: makeId("integration"),
      lastSync: "Not tested",
      name: integrationDraft.name.trim(),
      status: "disconnected",
    };
    if (administrationDataEnabled && token) {
      try {
        nextIntegration = mapIntegration(
          await createAdministrationIntegration(token, {
            integration_type: integrationDraft.type,
            name: integrationDraft.name,
            owner: integrationDraft.owner,
          }),
        );
      } catch {
        pushToast({
          title: "Integration not registered",
          description: "The backend rejected the integration details.",
          tone: "danger",
        });
        return;
      }
    }
    setIntegrations((current) => [nextIntegration, ...current]);
    setIntegrationDraft(defaultIntegrationDraft);
    setModalMode(null);
    recordChange(
      "Integration registered",
      "Integrations",
      `${nextIntegration.name} was registered and is ready for credentials.`,
    );
  }

  async function updateIntegration(
    integrationId: string,
    status: IntegrationRecord["status"],
  ): Promise<void> {
    let updatedIntegration: IntegrationRecord | null = null;
    if (administrationDataEnabled && token) {
      try {
        updatedIntegration = mapIntegration(
          status === "disconnected"
            ? await disconnectAdministrationIntegration(token, integrationId)
            : await testAdministrationIntegration(token, integrationId),
        );
      } catch {
        pushToast({
          title: "Integration status not changed",
          description: "The backend could not update this integration.",
          tone: "danger",
        });
        return;
      }
    }
    setIntegrations((current) =>
      current.map((integration) =>
        integration.id === integrationId
          ? updatedIntegration ?? {
            ...integration,
            lastSync:
              status === "connected" || status === "warning"
                ? formatTimestamp()
                : "Disconnected",
            status,
          }
          : integration,
      ),
    );
    recordChange(
      status === "connected"
        ? "Integration connected"
        : status === "warning"
          ? "Integration test warning"
          : "Integration disconnected",
      "Integrations",
      "Integration status was updated from the Administration module.",
    );
  }

  async function saveSystemSettings(): Promise<void> {
    if (administrationDataEnabled && token) {
      try {
        await upsertAdministrationSystemSetting(token, {
          category: "System",
          environment: "production",
          is_sensitive: false,
          setting_key: "platform-settings",
          setting_value_json: systemSettings,
        });
      } catch {
        pushToast({
          title: "System settings not saved",
          description: "The backend rejected the platform settings update.",
          tone: "danger",
        });
        return;
      }
    }
    recordChange(
      "System settings saved",
      "System Settings",
      `${systemSettings.platformName} defaults, localization, branding, and security settings were updated.`,
    );
  }

  async function toggleFeatureFlag(flagId: string): Promise<void> {
    const currentFlag = featureFlags.find((flag) => flag.id === flagId);
    if (!currentFlag) return;
    const nextEnabled = !currentFlag.enabled;
    let persistedFlag: FeatureFlag | null = null;
    if (administrationDataEnabled && token) {
      try {
        persistedFlag = mapFeatureFlag(
          await upsertAdministrationFeatureFlag(token, {
            enabled: nextEnabled,
            environment: currentFlag.environment.toLowerCase(),
            flag_key: currentFlag.name.toLowerCase().replaceAll(" ", "-"),
            label: currentFlag.name,
            rollout_percentage: currentFlag.rollout,
          }),
        );
      } catch {
        pushToast({
          title: "Feature flag not changed",
          description: "The backend rejected the feature flag update.",
          tone: "danger",
        });
        return;
      }
    }
    setFeatureFlags((current) =>
      current.map((flag) =>
        flag.id === flagId ? (persistedFlag ?? { ...flag, enabled: nextEnabled }) : flag,
      ),
    );
    recordChange(
      "Feature flag changed",
      "System Settings",
      "A platform feature flag was enabled or disabled.",
    );
  }

  async function createBackup(type: BackupJob["type"] = "Database Backup"): Promise<void> {
    let nextBackup: BackupJob = {
      date: formatTimestamp(),
      id: makeId("backup"),
      retentionDays: 30,
      size: "Queued",
      status: "scheduled",
      type,
    };
    if (administrationDataEnabled && token) {
      try {
        nextBackup = mapBackup(
          await createAdministrationBackup(token, {
            backup_type: type,
            retention_days: 30,
          }),
        );
      } catch {
        pushToast({
          title: "Backup not scheduled",
          description: "The backend rejected the backup request.",
          tone: "danger",
        });
        return;
      }
    }
    setBackupJobs((current) => [nextBackup, ...current]);
    setModalMode(null);
    recordChange(
      "Backup scheduled",
      "Backup & Recovery",
      `${type} was queued. Background execution requires the backend backup worker.`,
    );
  }

  async function restoreBackup(): Promise<void> {
    if (!restoreReason.trim()) {
      setActionResult("Enter a reason before starting a recovery operation.");
      return;
    }
    if (administrationDataEnabled && token) {
      try {
        await requestAdministrationRecovery(token, { reason: restoreReason });
      } catch {
        pushToast({
          title: "Restore not requested",
          description: "The backend rejected the recovery request.",
          tone: "danger",
        });
        return;
      }
    }
    setRestoreReason("");
    setModalMode(null);
    recordChange(
      "Restore requested",
      "Backup & Recovery",
      "A recovery operation was requested with elevated-permission reason capture.",
    );
  }

  function exportRecords(name: string, rows: Array<Record<string, string | number | boolean | null | undefined>>): void {
    const csv = toCsv(rows);
    if (!csv) {
      setActionResult(`No ${name} records are available to export.`);
      return;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    recordChange(
      "Export performed",
      "Administration",
      `${name}.csv was generated from the current filtered records.`,
    );
  }

  const locationRows = useMemo(() => {
    const rows = filterByQuery(locations, query, [
      (location) => location.name,
      (location) => location.code,
      (location) => location.type,
    ]);
    return statusFilter === "all"
      ? rows
      : rows.filter((location) => location.status === statusFilter);
  }, [locations, query, statusFilter]);

  const referenceRows = useMemo(() => {
    const rows = filterByQuery(referenceLists, query, [
      (list) => list.name,
      (list) => list.category,
      (list) => list.description,
    ]);
    return rows.filter((list) => {
      const statusMatches =
        statusFilter === "all" || list.status === statusFilter;
      const categoryMatches =
        categoryFilter === "all" || list.category === categoryFilter;
      return statusMatches && categoryMatches;
    });
  }, [categoryFilter, query, referenceLists, statusFilter]);

  const notificationRows = useMemo(
    () =>
      filterByQuery(notificationRules, query, [
        (rule) => rule.eventType,
        (rule) => rule.channel,
        (rule) => rule.recipients,
      ]).filter((rule) => statusFilter === "all" || rule.status === statusFilter),
    [notificationRules, query, statusFilter],
  );

  const apiKeyRows = useMemo(
    () =>
      filterByQuery(apiKeys, query, [
        (key) => key.name,
        (key) => key.owner,
        (key) => key.scope,
      ]).filter((key) => statusFilter === "all" || key.status === statusFilter),
    [apiKeys, query, statusFilter],
  );

  const integrationRows = useMemo(
    () =>
      filterByQuery(integrations, query, [
        (integration) => integration.name,
        (integration) => integration.type,
        (integration) => integration.owner,
      ]).filter(
        (integration) =>
          statusFilter === "all" || integration.status === statusFilter,
      ),
    [integrations, query, statusFilter],
  );

  const backupRows = useMemo(
    () =>
      filterByQuery(backupJobs, query, [
        (backup) => backup.id,
        (backup) => backup.type,
        (backup) => backup.status,
      ]).filter((backup) => statusFilter === "all" || backup.status === statusFilter),
    [backupJobs, query, statusFilter],
  );

  const locationColumns: TableColumn<LocationRecord>[] = [
    {
        header: "Location",
        key: "location",
        render: (location) => (
          <div>
            <p className="font-medium">{location.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {location.code || "No code"}
            </p>
          </div>
        ),
        value: (location) => `${location.name} ${location.code}`,
      },
      {
        header: "Type",
        key: "type",
        render: (location) => location.type,
        value: (location) => location.type,
      },
      {
        header: "Coordinates",
        key: "coordinates",
        render: (location) => location.coordinates || "Not set",
        value: (location) => location.coordinates,
      },
      {
        header: "Status",
        key: "status",
        render: (location) => (
          <Badge tone={statusTone(location.status)}>{location.status}</Badge>
        ),
        value: (location) => location.status,
      },
      {
        header: "Actions",
        key: "actions",
        render: (location) => (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canManage}
              onClick={() => {
                setEditingLocationId(location.id);
                setLocationDraft({
                  boundaryReference: location.boundaryReference,
                  code: location.code,
                  coordinates: location.coordinates,
                  name: location.name,
                  parentId: location.parentId,
                  status: location.status,
                  type: location.type,
                });
                setModalMode("location");
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Edit3 aria-hidden="true" />
              Edit
            </Button>
            <Button
              disabled={!canManage || location.status === "archived"}
              onClick={() => archiveLocation(location.id)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Archive aria-hidden="true" />
              Archive
            </Button>
          </div>
        ),
      },
  ];

  const referenceColumns: TableColumn<ReferenceList>[] = [
    {
        header: "List",
        key: "list",
        render: (list) => (
          <button
            className="text-left"
            onClick={() => setSelectedReferenceListId(list.id)}
            type="button"
          >
            <p className="font-medium">{list.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {list.description || "No description"}
            </p>
          </button>
        ),
        value: (list) => list.name,
      },
      {
        align: "right",
        header: "Values",
        key: "values",
        render: (list) => list.values.length.toLocaleString(),
        value: (list) => String(list.values.length),
      },
      {
        header: "Category",
        key: "category",
        render: (list) => list.category,
        value: (list) => list.category,
      },
      {
        header: "Version",
        key: "version",
        render: (list) => `v${list.version}`,
        value: (list) => String(list.version),
      },
      {
        header: "Status",
        key: "status",
        render: (list) => <Badge tone={statusTone(list.status)}>{list.status}</Badge>,
        value: (list) => list.status,
      },
  ];

  const notificationColumns: TableColumn<NotificationRule>[] = [
    {
        header: "Event",
        key: "event",
        render: (rule) => (
          <div>
            <p className="font-medium">{rule.eventType}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {rule.template}
            </p>
          </div>
        ),
        value: (rule) => `${rule.eventType} ${rule.template}`,
      },
      {
        header: "Channel",
        key: "channel",
        render: (rule) => rule.channel,
        value: (rule) => rule.channel,
      },
      {
        header: "Recipients",
        key: "recipients",
        render: (rule) => rule.recipients,
        value: (rule) => rule.recipients,
      },
      {
        header: "Frequency",
        key: "frequency",
        render: (rule) => rule.frequency,
        value: (rule) => rule.frequency,
      },
      {
        header: "Status",
        key: "status",
        render: (rule) => <Badge tone={statusTone(rule.status)}>{rule.status}</Badge>,
        value: (rule) => rule.status,
      },
      {
        header: "Actions",
        key: "actions",
        render: (rule) => (
          <Button
            disabled={!canManage}
            onClick={() => toggleNotificationRule(rule.id)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {rule.status === "active" ? "Disable" : "Enable"}
          </Button>
        ),
      },
  ];

  const apiKeyColumns: TableColumn<ApiKeyRecord>[] = [
    {
        header: "API key",
        key: "api",
        render: (key) => (
          <div>
            <p className="font-medium">{key.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{key.owner}</p>
          </div>
        ),
        value: (key) => `${key.name} ${key.owner}`,
      },
      {
        header: "Scope",
        key: "scope",
        render: (key) => key.scope,
        value: (key) => key.scope,
      },
      {
        header: "Rate limit",
        key: "rate",
        render: (key) => key.rateLimit,
        value: (key) => key.rateLimit,
      },
      {
        header: "Last used",
        key: "last",
        render: (key) => key.lastUsed,
        value: (key) => key.lastUsed,
      },
      {
        header: "Status",
        key: "status",
        render: (key) => <Badge tone={statusTone(key.status)}>{key.status}</Badge>,
        value: (key) => key.status,
      },
      {
        header: "Actions",
        key: "actions",
        render: (key) => (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canManage || key.status === "revoked"}
              onClick={() => updateApiKeyStatus(key.id, "active")}
              size="sm"
              type="button"
              variant="ghost"
            >
              Rotate
            </Button>
            <Button
              disabled={!canManage || key.status === "revoked"}
              onClick={() => updateApiKeyStatus(key.id, "revoked")}
              size="sm"
              type="button"
              variant="ghost"
            >
              Revoke
            </Button>
          </div>
        ),
      },
  ];

  const integrationColumns: TableColumn<IntegrationRecord>[] = [
    {
        header: "Integration",
        key: "integration",
        render: (integration) => (
          <div>
            <p className="font-medium">{integration.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {integration.type}
            </p>
          </div>
        ),
        value: (integration) => `${integration.name} ${integration.type}`,
      },
      {
        header: "Owner",
        key: "owner",
        render: (integration) => integration.owner,
        value: (integration) => integration.owner,
      },
      {
        header: "Last sync",
        key: "sync",
        render: (integration) => integration.lastSync,
        value: (integration) => integration.lastSync,
      },
      {
        header: "Status",
        key: "status",
        render: (integration) => (
          <Badge tone={statusTone(integration.status)}>{integration.status}</Badge>
        ),
        value: (integration) => integration.status,
      },
      {
        header: "Actions",
        key: "actions",
        render: (integration) => (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canManage}
              onClick={() => updateIntegration(integration.id, "connected")}
              size="sm"
              type="button"
              variant="ghost"
            >
              Test
            </Button>
            <Button
              disabled={!canManage}
              onClick={() =>
                updateIntegration(
                  integration.id,
                  integration.status === "connected"
                    ? "disconnected"
                    : "connected",
                )
              }
              size="sm"
              type="button"
              variant="ghost"
            >
              {integration.status === "connected" ? "Disconnect" : "Connect"}
            </Button>
          </div>
        ),
      },
  ];

  const backupColumns: TableColumn<BackupJob>[] = [
    {
        header: "Backup",
        key: "backup",
        render: (backup) => (
          <div>
            <p className="font-medium">{backup.id}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{backup.type}</p>
          </div>
        ),
        value: (backup) => `${backup.id} ${backup.type}`,
      },
      {
        header: "Date",
        key: "date",
        render: (backup) => backup.date,
        value: (backup) => backup.date,
      },
      {
        header: "Size",
        key: "size",
        render: (backup) => backup.size,
        value: (backup) => backup.size,
      },
      {
        header: "Retention",
        key: "retention",
        render: (backup) => `${backup.retentionDays} days`,
        value: (backup) => String(backup.retentionDays),
      },
      {
        header: "Status",
        key: "status",
        render: (backup) => <Badge tone={statusTone(backup.status)}>{backup.status}</Badge>,
        value: (backup) => backup.status,
      },
      {
        header: "Actions",
        key: "actions",
        render: () => (
          <Button
            disabled={!canManage}
            onClick={() => setModalMode("restore")}
            size="sm"
            type="button"
            variant="ghost"
          >
            Restore
          </Button>
        ),
      },
  ];

  return (
    <section className="space-y-3" aria-labelledby="administration-title">
      <SectionHeader
        activePage={activePage}
        canManage={canManage}
        onPrimaryAction={openPrimaryAction}
      />

      {activeSection !== "dashboard" ? (
        <AdministrationModuleSelector
          activeSection={activeSection}
          onSelect={selectAdministrationSection}
        />
      ) : null}

      {actionResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 text-success"
              size={18}
            />
            <p className="text-sm leading-6 text-muted-foreground">
              {actionResult}
            </p>
          </div>
        </section>
      ) : null}

      {activeSection !== "dashboard" && activeSection !== "imports-migration" ? (
        <FilterBar
          category={categoryFilter}
          environment={environmentFilter}
          onCategoryChange={setCategoryFilter}
          onEnvironmentChange={setEnvironmentFilter}
          onQueryChange={setQuery}
          onStatusChange={setStatusFilter}
          query={query}
          status={statusFilter}
        />
      ) : null}

      {activeSection === "dashboard" ? (
        <>
          <AdministrationDashboard
            activeNotificationCount={activeNotificationCount(notificationRules)}
            activeReferenceValueCount={activeReferenceValueCount(referenceLists)}
            apiKeys={apiKeys}
            auditRecords={auditQuery.data ?? []}
            backupJobs={backupJobs}
            changes={changes}
            failedJobs={failedJobs}
            featureFlags={featureFlags}
            healthStatus={platformHealth}
            integrations={integrations}
            metrics={overviewMetrics}
            runtimeSettings={runtimeSettings}
            summary={platformSummary}
          />
          <AdministrationModuleSelector
            activeSection={activeSection}
            onSelect={selectAdministrationSection}
          />
        </>
      ) : null}

      {activeSection === "location-hierarchy" ? (
        <LocationHierarchyView
          canManage={canManage}
          locations={locations}
          locationRows={locationRows}
          onExport={() =>
            exportRecords(
              "locations",
              locationRows.map((location) => ({
                boundaryReference: location.boundaryReference,
                code: location.code,
                coordinates: location.coordinates,
                name: location.name,
                status: location.status,
                type: location.type,
              })),
            )
          }
          onImport={() => setModalMode("location-import")}
          tableColumns={locationColumns}
        />
      ) : null}

      {activeSection === "reference-data" ? (
        <ReferenceDataView
          canManage={canManage}
          onAddValue={() => setModalMode("reference-value")}
          onExport={() =>
            exportRecords(
              "reference-data",
              referenceRows.map((list) => ({
                category: list.category,
                name: list.name,
                status: list.status,
                values: list.values.length,
                version: list.version,
              })),
            )
          }
          onToggleValue={toggleReferenceValue}
          referenceRows={referenceRows}
          selectedReferenceList={selectedReferenceList}
          tableColumns={referenceColumns}
        />
      ) : null}

      {activeSection === "notification-settings" ? (
        <NotificationSettingsView
          notificationRows={notificationRows}
          onExport={() =>
            exportRecords(
              "notification-rules",
              notificationRows.map((rule) => ({
                channel: rule.channel,
                eventType: rule.eventType,
                frequency: rule.frequency,
                recipients: rule.recipients,
                status: rule.status,
              })),
            )
          }
          tableColumns={notificationColumns}
        />
      ) : null}

      {activeSection === "api-settings" ? (
        <ApiSettingsView
          apiKeyRows={apiKeyRows}
          tableColumns={apiKeyColumns}
        />
      ) : null}

      {activeSection === "integrations" ? (
        <IntegrationsView
          integrationRows={integrationRows}
          tableColumns={integrationColumns}
        />
      ) : null}

      {activeSection === "system-settings" ? (
        <SystemSettingsView
          canManage={canManage}
          featureFlags={featureFlags}
          onToggleFeatureFlag={toggleFeatureFlag}
          setFeatureFlags={setFeatureFlags}
          setSystemSettings={setSystemSettings}
          systemSettings={systemSettings}
        />
      ) : null}

      {activeSection === "backup-recovery" ? (
        <BackupRecoveryView
          backupRows={backupRows}
          tableColumns={backupColumns}
        />
      ) : null}

      {activeSection === "imports-migration" ? (
        <ImportsMigrationModule token={token} />
      ) : null}

      {activeSection === "mobile" ? (
        <MobileReadinessView area={mobileArea} onAreaChange={setMobileArea} />
      ) : null}

      <AdministrationModal
        apiKeyDraft={apiKeyDraft}
        backupCreate={createBackup}
        canManage={canManage}
        editingLocationId={editingLocationId}
        importFormat={importFormat}
        importText={importText}
        integrationDraft={integrationDraft}
        locationDraft={locationDraft}
        locations={locations}
        modalMode={modalMode}
        notificationDraft={notificationDraft}
        onClose={() => {
          setModalMode(null);
          setEditingLocationId(null);
          setLocationDraft(defaultLocationDraft);
        }}
        onCreateApiKey={createApiKey}
        onCreateIntegration={createIntegration}
        onCreateNotification={createNotificationRule}
        onCreateReferenceList={createReferenceList}
        onCreateReferenceValue={createReferenceValue}
        onImportLocations={importLocations}
        onRestore={restoreBackup}
        onSubmitLocation={submitLocation}
        referenceListDraft={referenceListDraft}
        referenceValueDraft={referenceValueDraft}
        restoreReason={restoreReason}
        selectedReferenceList={selectedReferenceList}
        setApiKeyDraft={setApiKeyDraft}
        setImportFormat={setImportFormat}
        setImportText={setImportText}
        setIntegrationDraft={setIntegrationDraft}
        setLocationDraft={setLocationDraft}
        setNotificationDraft={setNotificationDraft}
        setReferenceListDraft={setReferenceListDraft}
        setReferenceValueDraft={setReferenceValueDraft}
        setRestoreReason={setRestoreReason}
      />
    </section>
  );
}

function AdministrationDashboard({
  activeNotificationCount: notificationCount,
  activeReferenceValueCount: referenceValueCount,
  apiKeys,
  auditRecords,
  backupJobs,
  changes,
  failedJobs,
  featureFlags,
  healthStatus,
  integrations,
  metrics,
  runtimeSettings,
  summary,
}: {
  activeNotificationCount: number;
  activeReferenceValueCount: number;
  apiKeys: ApiKeyRecord[];
  auditRecords: Array<{ action: string; created_at: string; resource_type: string }>;
  backupJobs: BackupJob[];
  changes: ConfigurationChange[];
  failedJobs: number;
  featureFlags: FeatureFlag[];
  healthStatus: "healthy" | "warning" | "critical";
  integrations: IntegrationRecord[];
  metrics: ReturnType<typeof getAdministrationOverviewMetrics>;
  runtimeSettings?: PlatformSettingsRead;
  summary?: PlatformSummaryRead;
}) {
  const connectedIntegrations = integrations.filter(
    (integration) => integration.status === "connected",
  ).length;
  const latestBackup = backupJobs[0];
  const enabledFlags = featureFlags.filter((flag) => flag.enabled).length;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {metrics.map((metric) => (
          <article
            className="rounded-xl border bg-panel p-3 shadow-line"
            key={metric.label}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {metric.label}
              </p>
              <Badge tone={metric.tone}>{metric.value}</Badge>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {metric.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {metric.detail}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ConfigPanel
          icon={ShieldCheck}
          title="Platform Health"
          tone={
            healthStatus === "healthy"
              ? "success"
              : healthStatus === "warning"
                ? "warning"
                : "danger"
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["API health", healthStatus],
              ["Database", runtimeSettings?.database_configured ? "healthy" : "critical"],
              ["JWT secret", runtimeSettings?.jwt_secret_configured ? "healthy" : "critical"],
              ["Redis", runtimeSettings?.redis_configured ? "healthy" : "warning"],
              ["Kafka", runtimeSettings?.kafka_configured ? "healthy" : "warning"],
              ["Failed jobs", failedJobs ? "critical" : "healthy"],
            ].map(([label, value]) => (
              <div className="rounded-xl border bg-background/80 p-3" key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <Badge className="mt-2" tone={statusTone(value)}>
                  {String(value)}
                </Badge>
              </div>
            ))}
          </div>
        </ConfigPanel>

        <ConfigPanel icon={AlertTriangle} title="System Alerts" tone={failedJobs ? "danger" : "success"}>
          {failedJobs ? (
            <div className="space-y-2 text-sm">
              <p className="text-danger">
                {failedJobs} system item{failedJobs === 1 ? "" : "s"} require attention.
              </p>
              <p className="text-muted-foreground">
                Review failed backups, integration warnings, and runtime
                environment settings before production changes.
              </p>
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              No critical administration alerts are active from the current
              runtime checks and local configuration state.
            </p>
          )}
        </ConfigPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ConfigPanel icon={Cloud} title="Integration Status" tone={connectedIntegrations ? "success" : "warning"}>
          <p className="text-2xl font-semibold">{connectedIntegrations}/{integrations.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Connected integrations. API keys: {apiKeys.length}.
          </p>
        </ConfigPanel>
        <ConfigPanel icon={Database} title="Backup Status" tone={latestBackup?.status === "failed" ? "danger" : latestBackup ? "success" : "warning"}>
          <p className="text-sm font-semibold">
            {latestBackup ? latestBackup.type : "No backups scheduled"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {latestBackup
              ? `${latestBackup.status} · ${latestBackup.date}`
              : "Create or schedule a backup before production launch."}
          </p>
        </ConfigPanel>
        <ConfigPanel icon={Bell} title="Notification Activity" tone={notificationCount ? "success" : "warning"}>
          <p className="text-2xl font-semibold">{notificationCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Active notification rules. Reference values: {referenceValueCount}.
          </p>
        </ConfigPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <ConfigPanel icon={RefreshCw} title="Recent Configuration Changes" tone="neutral">
          <div className="divide-y">
            {changes.slice(0, 6).map((change) => (
              <div className="py-3 text-sm" key={change.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{change.type}</p>
                  <span className="text-xs text-muted-foreground">{change.time}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {change.detail}
                </p>
              </div>
            ))}
          </div>
        </ConfigPanel>
        <ConfigPanel icon={Settings} title="Environment Information" tone="neutral">
          <dl className="space-y-3 text-sm">
            {[
              ["Environment", runtimeSettings?.app_env ?? "Local preview"],
              ["API version", runtimeSettings?.api_version ?? "v1"],
              ["Platform name", runtimeSettings?.app_name ?? "Atlas FieldOps"],
              ["Organizations", summary?.organization_count ?? 0],
              ["Enabled flags", enabledFlags],
              ["Audit events", summary?.audit_event_count ?? auditRecords.length],
            ].map(([label, value]) => (
              <div className="flex items-center justify-between gap-3" key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </ConfigPanel>
      </div>
    </div>
  );
}

type MobileReadinessRecord = {
  detail: string;
  id: string;
  name: string;
  owner: string;
  status: AdminStatus;
  updatedAt: string;
};

function mobileReadinessRows(area: MobileManagementArea): MobileReadinessRecord[] {
  const updatedAt = formatTimestamp();
  const rowsByArea: Record<MobileManagementArea, MobileReadinessRecord[]> = {
    devices: [
      {
        detail: "Device registration endpoint, remote logout flag, and blocked/lost/retired statuses are available.",
        id: "mobile-device-registry",
        name: "Device registry",
        owner: "System Admin",
        status: "active",
        updatedAt,
      },
      {
        detail: "Remote wipe is architecture-ready and intentionally held for a future elevated confirmation workflow.",
        id: "mobile-device-remote-wipe",
        name: "Remote wipe readiness",
        owner: "Security",
        status: "warning",
        updatedAt,
      },
    ],
    versions: [
      {
        detail: "Production, staging, minimum supported version, optional update, and mandatory update policy are exposed.",
        id: "mobile-version-policy",
        name: "Version policy",
        owner: "Release Manager",
        status: "active",
        updatedAt,
      },
      {
        detail: "Android package, support URLs, privacy URL, permissions, icon, and splash configuration are centralized.",
        id: "android-release-config",
        name: "Android release config",
        owner: "Mobile",
        status: "scheduled",
        updatedAt,
      },
    ],
    pilots: [
      {
        detail: "Pilot records track project, dates, devices, field officers, supervisors, status, feedback, and issues.",
        id: "mobile-pilot-program",
        name: "Pilot program tracking",
        owner: "Pilot Coordinator",
        status: "active",
        updatedAt,
      },
      {
        detail: "Rollout decisions use devices, sync rate, crash rate, feedback volume, and field testing evidence.",
        id: "pilot-dashboard-gates",
        name: "Pilot dashboard gates",
        owner: "M&E Manager",
        status: "scheduled",
        updatedAt,
      },
    ],
    monitoring: [
      {
        detail: "Monitoring summary covers active devices, sync failures, crashes, offline devices, app versions, and throughput.",
        id: "mobile-monitoring-summary",
        name: "Monitoring center",
        owner: "Operations",
        status: "healthy",
        updatedAt,
      },
      {
        detail: "Crash reports capture device, app version, severity, message, and stack trace without form answers.",
        id: "mobile-crash-reports",
        name: "Crash reporting",
        owner: "QA",
        status: "active",
        updatedAt,
      },
    ],
    feedback: [
      {
        detail: "Field officers can submit bug, performance, sync, feature, or other feedback with diagnostics.",
        id: "mobile-feedback-channel",
        name: "Feedback intake",
        owner: "Support",
        status: "active",
        updatedAt,
      },
      {
        detail: "Diagnostics include storage, queue, conflicts, failed syncs, and fake offline mode state.",
        id: "mobile-diagnostics-package",
        name: "Diagnostics package",
        owner: "Support",
        status: "healthy",
        updatedAt,
      },
    ],
    testing: [
      {
        detail: "Offline, GPS, attachment, sync, and large-form testing records are ready for pilot evidence capture.",
        id: "mobile-field-tests",
        name: "Field testing workflows",
        owner: "QA",
        status: "active",
        updatedAt,
      },
      {
        detail: "Low-end Android, weak network, reboot, failed sync, and app update scenarios are documented.",
        id: "mobile-test-plan",
        name: "Pilot test plan",
        owner: "QA",
        status: "scheduled",
        updatedAt,
      },
    ],
  };
  return rowsByArea[area];
}

function MobileReadinessView({
  area,
  onAreaChange,
}: {
  area: MobileManagementArea;
  onAreaChange: (area: MobileManagementArea) => void;
}) {
  const rows = mobileReadinessRows(area);
  const columns: TableColumn<MobileReadinessRecord>[] = [
    {
      header: "Control",
      key: "name",
      render: (row) => (
        <div>
          <p className="font-semibold">{row.name}</p>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
            {row.detail}
          </p>
        </div>
      ),
      value: (row) => `${row.name} ${row.detail}`,
    },
    {
      header: "Owner",
      key: "owner",
      render: (row) => row.owner,
      value: (row) => row.owner,
    },
    {
      header: "Status",
      key: "status",
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
      value: (row) => row.status,
    },
    {
      header: "Updated",
      key: "updated",
      render: (row) => row.updatedAt,
      value: (row) => row.updatedAt,
    },
  ];

  return (
    <div className="space-y-3">
      <Tabs
        ariaLabel="Mobile management areas"
        items={mobileManagementTabs}
        onChange={onAreaChange}
        value={area}
      />
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Pilot gate", "Ready for controlled field validation"],
          ["Device safety", "Registration and remote logout ready"],
          ["Release policy", "Minimum version enforcement ready"],
          ["Support loop", "Crash, feedback, and diagnostics ready"],
        ].map(([label, value]) => (
          <article className="rounded-xl border bg-panel p-3 shadow-line" key={label}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-sm font-semibold leading-5">{value}</p>
          </article>
        ))}
      </div>
      <DataTable
        columns={columns}
        emptyLabel="No mobile readiness controls found"
        rows={rows}
        searchLabel="Search mobile readiness controls"
        title="Mobile Pilot Readiness"
      />
    </div>
  );
}

function LocationHierarchyView({
  canManage,
  locationRows,
  locations,
  onExport,
  onImport,
  tableColumns,
}: {
  canManage: boolean;
  locationRows: LocationRecord[];
  locations: LocationRecord[];
  onExport: () => void;
  onImport: () => void;
  tableColumns: TableColumn<LocationRecord>[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <ConfigPanel icon={Globe2} title="Hierarchy Tree View" tone={locations.length ? "success" : "warning"}>
        <div className="space-y-2">
          {locations.length ? (
            locationTypes.map((type) => {
              const rows = locations.filter((location) => location.type === type);
              if (!rows.length) return null;
              return (
                <div className="rounded-xl border bg-background/80 p-3" key={type}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {type}
                  </p>
                  <div className="mt-2 space-y-1">
                    {rows.map((location) => (
                      <p className="text-sm" key={location.id}>
                        {location.name}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              No master locations exist yet. Create or import countries,
              regions, districts, communities, villages, and facilities.
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={!canManage} onClick={onImport} type="button" variant="secondary">
            <UploadCloud aria-hidden="true" />
            Import
          </Button>
          <Button onClick={onExport} type="button" variant="secondary">
            <Download aria-hidden="true" />
            Export
          </Button>
        </div>
      </ConfigPanel>

      <div className="space-y-4">
        <DataTable
          columns={tableColumns}
          emptyLabel="No locations configured"
          rows={locationRows}
          searchLabel="Search locations"
          title="Location hierarchy table"
        />
      </div>
    </div>
  );
}

function ReferenceDataView({
  canManage,
  onAddValue,
  onExport,
  onToggleValue,
  referenceRows,
  selectedReferenceList,
  tableColumns,
}: {
  canManage: boolean;
  onAddValue: () => void;
  onExport: () => void;
  onToggleValue: (valueId: string) => void;
  referenceRows: ReferenceList[];
  selectedReferenceList: ReferenceList | null;
  tableColumns: TableColumn<ReferenceList>[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={onExport} type="button" variant="secondary">
            <ArrowDownToLine aria-hidden="true" />
            Export values
          </Button>
        </div>
        <DataTable
          columns={tableColumns}
          emptyLabel="No reference lists configured"
          rows={referenceRows}
          searchLabel="Search reference lists"
          title="Reference lists"
        />
      </div>

      <ConfigPanel icon={Layers3} title="Selected List Values" tone={selectedReferenceList ? "success" : "warning"}>
        {selectedReferenceList ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{selectedReferenceList.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Version {selectedReferenceList.version} · {selectedReferenceList.values.length} values
                </p>
              </div>
              <Button disabled={!canManage} onClick={onAddValue} size="sm" type="button" variant="secondary">
                Add value
              </Button>
            </div>
            <div className="mt-4 divide-y">
              {selectedReferenceList.values.map((value) => (
                <div className="flex items-center justify-between gap-3 py-3" key={value.id}>
                  <div>
                    <p className="text-sm font-medium">{value.label}</p>
                    <p className="text-xs text-muted-foreground">{value.code}</p>
                  </div>
                  <Button
                    disabled={!canManage}
                    onClick={() => onToggleValue(value.id)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {value.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Select a reference list.</p>
        )}
      </ConfigPanel>
    </div>
  );
}

function NotificationSettingsView({
  notificationRows,
  onExport,
  tableColumns,
}: {
  notificationRows: NotificationRule[];
  onExport: () => void;
  tableColumns: TableColumn<NotificationRule>[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {["Email", "In-App", "SMS", "Push"].map((channel) => (
          <ConfigPanel icon={Bell} key={channel} title={channel} tone={channel === "SMS" || channel === "Push" ? "warning" : "success"}>
            <p className="text-sm text-muted-foreground">
              {channel === "SMS" || channel === "Push"
                ? "Future-ready channel."
                : `${notificationRows.filter((rule) => rule.channel === channel).length} configured rules.`}
            </p>
          </ConfigPanel>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onExport} type="button" variant="secondary">
          Export rules
        </Button>
      </div>
      <DataTable
        columns={tableColumns}
        emptyLabel="No notification rules configured"
        rows={notificationRows}
        searchLabel="Search notification rules"
        title="Notification rules"
      />
    </div>
  );
}

function ApiSettingsView({
  apiKeyRows,
  tableColumns,
}: {
  apiKeyRows: ApiKeyRecord[];
  tableColumns: TableColumn<ApiKeyRecord>[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <ConfigPanel icon={KeyRound} title="API Usage Dashboard" tone={apiKeyRows.length ? "success" : "warning"}>
          <p className="text-2xl font-semibold">{apiKeyRows.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Registered API keys.</p>
        </ConfigPanel>
        <ConfigPanel icon={ShieldCheck} title="Rate Limiting" tone="success">
          <p className="text-sm text-muted-foreground">
            Per-key rate limits are shown in the table and should be enforced by the backend gateway.
          </p>
        </ConfigPanel>
        <ConfigPanel icon={RefreshCw} title="Audit Logging" tone="success">
          <p className="text-sm text-muted-foreground">
            Create, rotate, and revoke actions are tracked as configuration changes.
          </p>
        </ConfigPanel>
      </div>
      <DataTable
        columns={tableColumns}
        emptyLabel="No API keys configured"
        rows={apiKeyRows}
        searchLabel="Search API keys"
        title="API keys"
      />
    </div>
  );
}

function IntegrationsView({
  integrationRows,
  tableColumns,
}: {
  integrationRows: IntegrationRecord[];
  tableColumns: TableColumn<IntegrationRecord>[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {["Email Services", "SMS Services", "Cloud Storage", "GIS Services", "BI Tools"].map((name) => (
          <ConfigPanel icon={Cloud} key={name} title={name} tone="neutral">
            <p className="text-sm text-muted-foreground">
              {integrationRows.filter((integration) => name.includes(integration.type.split(" ")[0])).length} entries
            </p>
          </ConfigPanel>
        ))}
      </div>
      <DataTable
        columns={tableColumns}
        emptyLabel="No integrations configured"
        rows={integrationRows}
        searchLabel="Search integrations"
        title="Integrations"
      />
    </div>
  );
}

function SystemSettingsView({
  canManage,
  featureFlags,
  onToggleFeatureFlag,
  setFeatureFlags,
  setSystemSettings,
  systemSettings,
}: {
  canManage: boolean;
  featureFlags: FeatureFlag[];
  onToggleFeatureFlag: (flagId: string) => void;
  setFeatureFlags: Dispatch<SetStateAction<FeatureFlag[]>>;
  setSystemSettings: Dispatch<SetStateAction<SystemSettings>>;
  systemSettings: SystemSettings;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-4 xl:grid-cols-2">
        <ConfigPanel icon={Settings} title="General Settings" tone="neutral">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Platform name</span>
              <Input
                disabled={!canManage}
                onChange={(event) =>
                  setSystemSettings((current) => ({
                    ...current,
                    platformName: event.target.value,
                  }))
                }
                value={systemSettings.platformName}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Time zone</span>
              <Input
                disabled={!canManage}
                onChange={(event) =>
                  setSystemSettings((current) => ({
                    ...current,
                    timeZone: event.target.value,
                  }))
                }
                value={systemSettings.timeZone}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Date format</span>
              <Input
                disabled={!canManage}
                onChange={(event) =>
                  setSystemSettings((current) => ({
                    ...current,
                    dateFormat: event.target.value,
                  }))
                }
                value={systemSettings.dateFormat}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Default language</span>
              <Input
                disabled={!canManage}
                onChange={(event) =>
                  setSystemSettings((current) => ({
                    ...current,
                    defaultLanguage: event.target.value,
                  }))
                }
                value={systemSettings.defaultLanguage}
              />
            </label>
          </div>
        </ConfigPanel>

        <ConfigPanel icon={ShieldCheck} title="Security Settings" tone="success">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Minimum password length</span>
              <Input
                disabled={!canManage}
                min={8}
                onChange={(event) =>
                  setSystemSettings((current) => ({
                    ...current,
                    security: {
                      ...current.security,
                      minimumLength: Number(event.target.value),
                    },
                  }))
                }
                type="number"
                value={systemSettings.security.minimumLength}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Session timeout minutes</span>
              <Input
                disabled={!canManage}
                min={15}
                onChange={(event) =>
                  setSystemSettings((current) => ({
                    ...current,
                    security: {
                      ...current.security,
                      sessionTimeoutMinutes: Number(event.target.value),
                    },
                  }))
                }
                type="number"
                value={systemSettings.security.sessionTimeoutMinutes}
              />
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Allowed domains</span>
              <Input
                disabled={!canManage}
                onChange={(event) =>
                  setSystemSettings((current) => ({
                    ...current,
                    security: {
                      ...current.security,
                      allowedDomains: event.target.value,
                    },
                  }))
                }
                placeholder="example.org, donor.org"
                value={systemSettings.security.allowedDomains}
              />
            </label>
            <label className="flex items-center gap-3 rounded-xl border bg-background/80 p-3 md:col-span-2">
              <input
                checked={systemSettings.security.mfaRequired}
                disabled={!canManage}
                onChange={(event) =>
                  setSystemSettings((current) => ({
                    ...current,
                    security: {
                      ...current.security,
                      mfaRequired: event.target.checked,
                    },
                  }))
                }
                type="checkbox"
              />
              <span className="text-sm">Require MFA for administrators</span>
            </label>
          </div>
        </ConfigPanel>
      </div>

      <ConfigPanel icon={Flag} title="Feature Flag Management" tone="accent">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {featureFlags.map((flag) => (
            <article className="rounded-xl border bg-background/80 p-4" key={flag.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{flag.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {flag.environment} · {flag.rollout}% rollout
                  </p>
                </div>
                <Badge tone={flag.enabled ? "success" : "neutral"}>
                  {flag.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <label className="mt-4 block space-y-1.5">
                <span className="text-xs text-muted-foreground">Rollout percentage</span>
                <Input
                  disabled={!canManage}
                  max={100}
                  min={0}
                  onChange={(event) =>
                    setFeatureFlags((current) =>
                      current.map((candidate) =>
                        candidate.id === flag.id
                          ? {
                              ...candidate,
                              rollout: Number(event.target.value),
                            }
                          : candidate,
                      ),
                    )
                  }
                  type="number"
                  value={flag.rollout}
                />
              </label>
              <Button
                className="mt-3 w-full"
                disabled={!canManage}
                onClick={() => onToggleFeatureFlag(flag.id)}
                type="button"
                variant="secondary"
              >
                {flag.enabled ? "Disable" : "Enable"}
              </Button>
            </article>
          ))}
        </div>
      </ConfigPanel>
    </div>
  );
}

function BackupRecoveryView({
  backupRows,
  tableColumns,
}: {
  backupRows: BackupJob[];
  tableColumns: TableColumn<BackupJob>[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {["Database Backup", "File Backup", "Configuration Backup"].map((type) => (
          <ConfigPanel icon={Database} key={type} title={type} tone="neutral">
            <p className="text-sm text-muted-foreground">
              {backupRows.filter((backup) => backup.type === type).length} jobs recorded.
            </p>
          </ConfigPanel>
        ))}
      </div>
      <DataTable
        columns={tableColumns}
        emptyLabel="No backup jobs configured"
        rows={backupRows}
        searchLabel="Search backup jobs"
        title="Backup jobs"
      />
    </div>
  );
}

function AdministrationModal(props: {
  apiKeyDraft: Omit<ApiKeyRecord, "id" | "lastUsed" | "status">;
  backupCreate: (type?: BackupJob["type"]) => void;
  canManage: boolean;
  editingLocationId: string | null;
  importFormat: string;
  importText: string;
  integrationDraft: Omit<IntegrationRecord, "id" | "lastSync" | "status">;
  locationDraft: Omit<LocationRecord, "id" | "updatedAt">;
  locations: LocationRecord[];
  modalMode: ModalMode;
  notificationDraft: Omit<NotificationRule, "id">;
  onClose: () => void;
  onCreateApiKey: () => void;
  onCreateIntegration: () => void;
  onCreateNotification: () => void;
  onCreateReferenceList: () => void;
  onCreateReferenceValue: () => void;
  onImportLocations: () => void;
  onRestore: () => void;
  onSubmitLocation: () => void;
  referenceListDraft: Omit<ReferenceList, "id" | "updatedAt" | "values" | "version">;
  referenceValueDraft: Omit<ReferenceValue, "id">;
  restoreReason: string;
  selectedReferenceList: ReferenceList | null;
  setApiKeyDraft: Dispatch<SetStateAction<Omit<ApiKeyRecord, "id" | "lastUsed" | "status">>>;
  setImportFormat: (value: string) => void;
  setImportText: (value: string) => void;
  setIntegrationDraft: Dispatch<SetStateAction<Omit<IntegrationRecord, "id" | "lastSync" | "status">>>;
  setLocationDraft: Dispatch<SetStateAction<Omit<LocationRecord, "id" | "updatedAt">>>;
  setNotificationDraft: Dispatch<SetStateAction<Omit<NotificationRule, "id">>>;
  setReferenceListDraft: Dispatch<SetStateAction<Omit<ReferenceList, "id" | "updatedAt" | "values" | "version">>>;
  setReferenceValueDraft: Dispatch<SetStateAction<Omit<ReferenceValue, "id">>>;
  setRestoreReason: (value: string) => void;
}) {
  const { modalMode, onClose } = props;

  return (
    <Modal
      contentClassName="max-w-2xl"
      description="Administration actions are captured as configuration changes and must be backed by server-side authorization in production."
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={Boolean(modalMode)}
      title={
        modalMode === "location"
          ? props.editingLocationId
            ? "Edit location"
            : "Create location"
          : modalMode === "location-import"
            ? "Import locations"
            : modalMode === "reference-list"
              ? "Create reference list"
              : modalMode === "reference-value"
                ? "Add reference value"
                : modalMode === "notification"
                  ? "Create notification rule"
                  : modalMode === "api-key"
                    ? "Create API key"
                    : modalMode === "integration"
                      ? "Connect integration"
                      : modalMode === "restore"
                        ? "Request restore"
                        : "Create backup"
      }
    >
      <div className="overflow-y-auto p-5 product-scrollbar">
        {modalMode === "location" ? (
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              props.onSubmitLocation();
            }}
          >
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Name</span>
              <Input
                required
                value={props.locationDraft.name}
                onChange={(event) =>
                  props.setLocationDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Code{props.editingLocationId ? " (cannot be changed)" : ""}
              </span>
              <Input
                disabled={Boolean(props.editingLocationId)}
                required
                value={props.locationDraft.code}
                onChange={(event) =>
                  props.setLocationDraft((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Type</span>
              <Select
                value={props.locationDraft.type}
                onChange={(event) =>
                  props.setLocationDraft((current) => ({
                    ...current,
                    type: event.target.value as LocationType,
                  }))
                }
              >
                {locationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Parent location</span>
              <Select
                value={props.locationDraft.parentId ?? ""}
                onChange={(event) =>
                  props.setLocationDraft((current) => ({
                    ...current,
                    parentId: event.target.value || null,
                  }))
                }
              >
                <option value="">No parent</option>
                {props.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Coordinates</span>
              <Input
                placeholder="lat,lng"
                value={props.locationDraft.coordinates}
                onChange={(event) =>
                  props.setLocationDraft((current) => ({
                    ...current,
                    coordinates: event.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Boundary reference</span>
              <Input
                placeholder="GeoJSON file, boundary id, or map layer"
                value={props.locationDraft.boundaryReference}
                onChange={(event) =>
                  props.setLocationDraft((current) => ({
                    ...current,
                    boundaryReference: event.target.value,
                  }))
                }
              />
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button disabled={!props.canManage} type="submit" variant="primary">
                {props.editingLocationId ? "Save changes" : "Save location"}
              </Button>
              <Button onClick={onClose} type="button" variant="ghost">
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {modalMode === "location-import" ? (
          <div className="space-y-4">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Import format</span>
              <Select
                value={props.importFormat}
                onChange={(event) => props.setImportFormat(event.target.value)}
              >
                <option value="CSV">CSV</option>
                <option value="Excel">Excel</option>
                <option value="GeoJSON">GeoJSON</option>
              </Select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Location rows</span>
              <Textarea
                onChange={(event) => props.setImportText(event.target.value)}
                placeholder="Name, Code, Type&#10;North Region, NR, Region"
                value={props.importText}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!props.canManage} onClick={props.onImportLocations} type="button" variant="primary">
                Import locations
              </Button>
              <Button onClick={onClose} type="button" variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {modalMode === "reference-list" ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              props.onCreateReferenceList();
            }}
          >
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">List name</span>
              <Input
                onChange={(event) =>
                  props.setReferenceListDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Facility Types"
                required
                value={props.referenceListDraft.name}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Category</span>
              <Input
                onChange={(event) =>
                  props.setReferenceListDraft((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                placeholder="Facilities"
                required
                value={props.referenceListDraft.category}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              <Textarea
                onChange={(event) =>
                  props.setReferenceListDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Reusable values used across forms, projects, and analytics"
                value={props.referenceListDraft.description}
              />
            </label>
            <Button disabled={!props.canManage} type="submit" variant="primary">
              Create list
            </Button>
          </form>
        ) : null}

        {modalMode === "reference-value" ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              props.onCreateReferenceValue();
            }}
          >
            <p className="text-sm text-muted-foreground">
              Adding value to {props.selectedReferenceList?.name ?? "selected list"}.
            </p>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Value label</span>
              <Input
                onChange={(event) =>
                  props.setReferenceValueDraft((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="Hospital"
                required
                value={props.referenceValueDraft.label}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Value code</span>
              <Input
                onChange={(event) =>
                  props.setReferenceValueDraft((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                placeholder="HOSP"
                required
                value={props.referenceValueDraft.code}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              <Textarea
                onChange={(event) =>
                  props.setReferenceValueDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Optional reference-value guidance"
                value={props.referenceValueDraft.description}
              />
            </label>
            <Button disabled={!props.canManage} type="submit" variant="primary">
              Add value
            </Button>
          </form>
        ) : null}

        {modalMode === "notification" ? (
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              props.onCreateNotification();
            }}
          >
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Event type</span>
              <Input
                onChange={(event) =>
                  props.setNotificationDraft((current) => ({
                    ...current,
                    eventType: event.target.value,
                  }))
                }
                placeholder="Quality Alerts"
                required
                value={props.notificationDraft.eventType}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Channel</span>
              <Select
                value={props.notificationDraft.channel}
                onChange={(event) =>
                  props.setNotificationDraft((current) => ({
                    ...current,
                    channel: event.target.value as NotificationRule["channel"],
                  }))
                }
              >
                <option value="Email">Email</option>
                <option value="In-App">In-App</option>
                <option value="SMS">SMS</option>
                <option value="Push">Push</option>
              </Select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Recipients</span>
              <Input
                onChange={(event) =>
                  props.setNotificationDraft((current) => ({
                    ...current,
                    recipients: event.target.value,
                  }))
                }
                placeholder="Data managers"
                required
                value={props.notificationDraft.recipients}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Frequency</span>
              <Select
                value={props.notificationDraft.frequency}
                onChange={(event) =>
                  props.setNotificationDraft((current) => ({
                    ...current,
                    frequency: event.target.value as NotificationRule["frequency"],
                  }))
                }
              >
                <option value="Immediate">Immediate</option>
                <option value="Daily digest">Daily digest</option>
                <option value="Weekly digest">Weekly digest</option>
              </Select>
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Template</span>
              <Textarea
                onChange={(event) =>
                  props.setNotificationDraft((current) => ({
                    ...current,
                    template: event.target.value,
                  }))
                }
                placeholder="Submission {{id}} has a critical quality flag."
                required
                value={props.notificationDraft.template}
              />
            </label>
            <Button disabled={!props.canManage} type="submit" variant="primary">
              Create rule
            </Button>
          </form>
        ) : null}

        {modalMode === "api-key" ? (
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              props.onCreateApiKey();
            }}
          >
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">API name</span>
              <Input
                onChange={(event) =>
                  props.setApiKeyDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Power BI export"
                required
                value={props.apiKeyDraft.name}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Owner</span>
              <Input
                onChange={(event) =>
                  props.setApiKeyDraft((current) => ({
                    ...current,
                    owner: event.target.value,
                  }))
                }
                placeholder="Data team"
                required
                value={props.apiKeyDraft.owner}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Scope</span>
              <Select
                value={props.apiKeyDraft.scope}
                onChange={(event) =>
                  props.setApiKeyDraft((current) => ({
                    ...current,
                    scope: event.target.value as ApiKeyRecord["scope"],
                  }))
                }
              >
                <option value="Read">Read</option>
                <option value="Write">Write</option>
                <option value="Admin">Admin</option>
              </Select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Rate limit</span>
              <Input
                onChange={(event) =>
                  props.setApiKeyDraft((current) => ({
                    ...current,
                    rateLimit: event.target.value,
                  }))
                }
                value={props.apiKeyDraft.rateLimit}
              />
            </label>
            <Button disabled={!props.canManage} type="submit" variant="primary">
              Create API key
            </Button>
          </form>
        ) : null}

        {modalMode === "integration" ? (
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              props.onCreateIntegration();
            }}
          >
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Integration name</span>
              <Input
                onChange={(event) =>
                  props.setIntegrationDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Mapbox"
                required
                value={props.integrationDraft.name}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Integration type</span>
              <Select
                value={props.integrationDraft.type}
                onChange={(event) =>
                  props.setIntegrationDraft((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
              >
                <option value="Email Service">Email Service</option>
                <option value="SMS Service">SMS Service</option>
                <option value="Cloud Storage">Cloud Storage</option>
                <option value="GIS Service">GIS Service</option>
                <option value="Authentication Provider">Authentication Provider</option>
                <option value="Business Intelligence">Business Intelligence</option>
              </Select>
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Owner</span>
              <Input
                onChange={(event) =>
                  props.setIntegrationDraft((current) => ({
                    ...current,
                    owner: event.target.value,
                  }))
                }
                placeholder="Platform team"
                required
                value={props.integrationDraft.owner}
              />
            </label>
            <Button disabled={!props.canManage} type="submit" variant="primary">
              Register integration
            </Button>
          </form>
        ) : null}

        {modalMode === "backup" ? (
          <div className="grid gap-3">
            {(["Database Backup", "File Backup", "Configuration Backup"] as const).map((type) => (
              <Button
                disabled={!props.canManage}
                key={type}
                onClick={() => props.backupCreate(type)}
                type="button"
                variant="secondary"
              >
                {type}
              </Button>
            ))}
          </div>
        ) : null}

        {modalMode === "restore" ? (
          <div className="space-y-4">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Restore reason</span>
              <Textarea
                onChange={(event) => props.setRestoreReason(event.target.value)}
                placeholder="Explain why recovery is required. This reason is mandatory for audit."
                value={props.restoreReason}
              />
            </label>
            <Button disabled={!props.canManage} onClick={props.onRestore} type="button" variant="primary">
              Request restore
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
