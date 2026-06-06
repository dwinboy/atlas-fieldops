import type { LucideIcon } from "lucide-react";

export type AdministrationSection =
  | "dashboard"
  | "location-hierarchy"
  | "reference-data"
  | "notification-settings"
  | "api-settings"
  | "integrations"
  | "system-settings"
  | "backup-recovery"
  | "imports-migration";

export type AdminStatus =
  | "active"
  | "archived"
  | "critical"
  | "disabled"
  | "failed"
  | "healthy"
  | "scheduled"
  | "warning";

export type EnvironmentName = "Production" | "Staging" | "Development";

export type LocationType =
  | "Country"
  | "Region"
  | "Province/State"
  | "District"
  | "Community"
  | "Village"
  | "Facility";

export type LocationRecord = {
  boundaryReference: string;
  code: string;
  coordinates: string;
  id: string;
  name: string;
  parentId: string | null;
  status: "active" | "archived";
  type: LocationType;
  updatedAt: string;
};

export type ReferenceValue = {
  active: boolean;
  code: string;
  description: string;
  id: string;
  label: string;
};

export type ReferenceList = {
  category: string;
  description: string;
  id: string;
  name: string;
  status: "active" | "archived";
  updatedAt: string;
  values: ReferenceValue[];
  version: number;
};

export type NotificationRule = {
  channel: "Email" | "In-App" | "SMS" | "Push";
  eventType: string;
  frequency: "Immediate" | "Daily digest" | "Weekly digest";
  id: string;
  recipients: string;
  status: "active" | "disabled";
  template: string;
};

export type ApiKeyRecord = {
  id: string;
  lastUsed: string;
  name: string;
  owner: string;
  rateLimit: string;
  scope: "Read" | "Write" | "Admin";
  status: "active" | "revoked";
};

export type IntegrationRecord = {
  id: string;
  lastSync: string;
  name: string;
  owner: string;
  status: "connected" | "disconnected" | "warning";
  type: string;
};

export type FeatureFlag = {
  enabled: boolean;
  environment: EnvironmentName;
  id: string;
  name: string;
  rollout: number;
};

export type SecuritySettings = {
  allowedDomains: string;
  complexityRules: string;
  concurrentSessions: number;
  idleTimeoutMinutes: number;
  loginRestrictions: string;
  minimumLength: number;
  mfaRequired: boolean;
  passwordExpirationDays: number;
  sessionTimeoutMinutes: number;
};

export type SystemSettings = {
  brandColor: string;
  currency: string;
  dateFormat: string;
  defaultLanguage: string;
  logoUrl: string;
  numberFormat: string;
  organizationName: string;
  platformName: string;
  security: SecuritySettings;
  timeZone: string;
};

export type BackupJob = {
  date: string;
  id: string;
  retentionDays: number;
  size: string;
  status: "completed" | "failed" | "scheduled";
  type: "Database Backup" | "File Backup" | "Configuration Backup";
};

export type ConfigurationChange = {
  actor: string;
  detail: string;
  id: string;
  resource: string;
  time: string;
  type: string;
};

export type AdministrationPageConfig = {
  description: string;
  icon: LucideIcon;
  id: AdministrationSection;
  primaryAction: string;
  route: string;
  title: string;
};
