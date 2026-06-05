import type { BadgeProps } from "@/components/ui/badge";
import type {
  AdminStatus,
  ApiKeyRecord,
  BackupJob,
  ConfigurationChange,
  FeatureFlag,
  IntegrationRecord,
  LocationRecord,
  NotificationRule,
  ReferenceList,
} from "@/modules/administration/types";

export type AdministrationOverviewInput = {
  activeProjects: number;
  activeUsers: number;
  apiKeys: ApiKeyRecord[];
  backups: BackupJob[];
  failedJobs: number;
  featureFlags: FeatureFlag[];
  healthStatus: "healthy" | "warning" | "critical";
  integrations: IntegrationRecord[];
  locations: LocationRecord[];
  organizations: number;
};

export type AdministrationOverviewMetric = {
  detail: string;
  label: string;
  tone: BadgeProps["tone"];
  value: string;
};

export function createAdministrationChange({
  actor,
  detail,
  resource,
  type,
}: {
  actor: string;
  detail: string;
  resource: string;
  type: string;
}): ConfigurationChange {
  return {
    actor,
    detail,
    id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    resource,
    time: new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date()),
    type,
  };
}

export function getAdministrationOverviewMetrics({
  activeProjects,
  activeUsers,
  apiKeys,
  backups,
  failedJobs,
  featureFlags,
  healthStatus,
  integrations,
  locations,
  organizations,
}: AdministrationOverviewInput): AdministrationOverviewMetric[] {
  const countryCount = locations.filter(
    (location) => location.type === "Country" && location.status === "active",
  ).length;
  const connectedIntegrations = integrations.filter(
    (integration) => integration.status === "connected",
  ).length;
  const scheduledBackups = backups.filter(
    (backup) => backup.status === "scheduled",
  ).length;
  const enabledFlags = featureFlags.filter((flag) => flag.enabled).length;

  return [
    {
      detail: "Tenant workspaces tracked by the platform.",
      label: "Organizations",
      tone: organizations ? "accent" : "neutral",
      value: organizations.toLocaleString(),
    },
    {
      detail: "Countries configured in the master location hierarchy.",
      label: "Countries",
      tone: countryCount ? "success" : "neutral",
      value: countryCount.toLocaleString(),
    },
    {
      detail: "Users currently counted across platform workspaces.",
      label: "Active users",
      tone: activeUsers ? "accent" : "neutral",
      value: activeUsers.toLocaleString(),
    },
    {
      detail: "Project metric is ready for backend project summary wiring.",
      label: "Active projects",
      tone: activeProjects ? "success" : "neutral",
      value: activeProjects.toLocaleString(),
    },
    {
      detail: "Connected external services and active API keys.",
      label: "API integrations",
      tone: connectedIntegrations || apiKeys.length ? "success" : "neutral",
      value: (connectedIntegrations + apiKeys.length).toLocaleString(),
    },
    {
      detail: "Runtime health from safe server checks.",
      label: "System health",
      tone:
        healthStatus === "healthy"
          ? "success"
          : healthStatus === "warning"
            ? "warning"
            : "danger",
      value:
        healthStatus === "healthy"
          ? "Healthy"
          : healthStatus === "warning"
            ? "Warning"
            : "Critical",
    },
    {
      detail: "Backups scheduled for automatic execution.",
      label: "Scheduled backups",
      tone: scheduledBackups ? "success" : "neutral",
      value: scheduledBackups.toLocaleString(),
    },
    {
      detail: "Failed jobs from backups or integrations requiring action.",
      label: "Failed jobs",
      tone: failedJobs ? "danger" : "success",
      value: failedJobs.toLocaleString(),
    },
    {
      detail: "Enabled platform features for the selected environment.",
      label: "Active feature flags",
      tone: enabledFlags ? "accent" : "neutral",
      value: enabledFlags.toLocaleString(),
    },
  ];
}

export function statusTone(status: AdminStatus | string): BadgeProps["tone"] {
  if (["active", "completed", "connected", "healthy"].includes(status)) {
    return "success";
  }
  if (["archived", "disabled", "disconnected", "scheduled"].includes(status)) {
    return "neutral";
  }
  if (["failed", "critical", "revoked"].includes(status)) {
    return "danger";
  }
  return "warning";
}

export function filterByQuery<T>(
  rows: T[],
  query: string,
  fields: Array<(row: T) => string>,
): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return rows;
  return rows.filter((row) =>
    fields.some((field) => field(row).toLowerCase().includes(normalizedQuery)),
  );
}

export function toCsv(
  rows: Array<Record<string, string | number | boolean | null | undefined>>,
): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | boolean | null | undefined) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;

  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}

export function activeNotificationCount(rules: NotificationRule[]): number {
  return rules.filter((rule) => rule.status === "active").length;
}

export function activeReferenceValueCount(lists: ReferenceList[]): number {
  return lists.reduce(
    (sum, list) => sum + list.values.filter((value) => value.active).length,
    0,
  );
}

