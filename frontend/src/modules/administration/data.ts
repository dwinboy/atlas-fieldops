import {
  Activity,
  Bell,
  Bug,
  Cloud,
  ClipboardCheck,
  Database,
  Flag,
  Globe2,
  KeyRound,
  Layers3,
  MessageSquare,
  Rocket,
  Settings,
  Smartphone,
  UploadCloud,
} from "lucide-react";

import type {
  AdministrationPageConfig,
  ApiKeyRecord,
  BackupJob,
  ConfigurationChange,
  FeatureFlag,
  IntegrationRecord,
  LocationRecord,
  NotificationRule,
  ReferenceList,
  SystemSettings,
} from "@/modules/administration/types";

export const administrationPages: AdministrationPageConfig[] = [
  {
    description:
      "Platform health, environment, configuration changes, integrations, alerts, and backup status.",
    icon: Settings,
    id: "dashboard",
    primaryAction: "Review health",
    route: "/administration",
    title: "Administration Dashboard",
  },
  {
    description:
      "Manage the global country, region, district, community, village, and facility hierarchy.",
    icon: Globe2,
    id: "location-hierarchy",
    primaryAction: "Create location",
    route: "/administration/location-hierarchy",
    title: "Location Hierarchy",
  },
  {
    description:
      "Maintain reusable platform-wide master lists and values used by forms, projects, and analytics.",
    icon: Layers3,
    id: "reference-data",
    primaryAction: "Create reference list",
    route: "/administration/reference-data",
    title: "Reference Data",
  },
  {
    description:
      "Configure notification channels, templates, recipients, and delivery rules.",
    icon: Bell,
    id: "notification-settings",
    primaryAction: "Create notification rule",
    route: "/administration/notification-settings",
    title: "Notification Settings",
  },
  {
    description:
      "Manage API keys, scopes, owners, usage status, and rate limits.",
    icon: KeyRound,
    id: "api-settings",
    primaryAction: "Create API key",
    route: "/administration/api-settings",
    title: "API Settings",
  },
  {
    description:
      "Connect, test, and monitor email, SMS, storage, GIS, authentication, and BI integrations.",
    icon: Cloud,
    id: "integrations",
    primaryAction: "Connect integration",
    route: "/administration/integrations",
    title: "Integrations",
  },
  {
    description:
      "Manage global defaults, security rules, localization, branding, and feature flags.",
    icon: Flag,
    id: "system-settings",
    primaryAction: "Save settings",
    route: "/administration/system-settings",
    title: "System Settings",
  },
  {
    description:
      "Create, schedule, review, and restore database, file, and configuration backups.",
    icon: Database,
    id: "backup-recovery",
    primaryAction: "Create backup",
    route: "/administration/backup-recovery",
    title: "Backup & Recovery",
  },
  {
    description:
      "Import projects, forms, beneficiaries, submissions, indicators, locations, users, and historical records from other M&E tools.",
    icon: UploadCloud,
    id: "imports-migration",
    primaryAction: "Start import",
    route: "/administration/imports-migration",
    title: "Imports & Migration",
  },
  {
    description:
      "Register, monitor, block, retire, and force logout Android devices used by field teams.",
    icon: Smartphone,
    id: "mobile-devices",
    primaryAction: "Register device",
    route: "/administration/mobile-devices",
    title: "Mobile Devices",
  },
  {
    description:
      "Control production, staging, and minimum supported mobile app versions for safe rollout.",
    icon: Rocket,
    id: "mobile-versions",
    primaryAction: "Update policy",
    route: "/administration/mobile-versions",
    title: "Mobile Versions",
  },
  {
    description:
      "Plan and track mobile field pilots by project, devices, field officers, supervisors, feedback, and issues.",
    icon: ClipboardCheck,
    id: "mobile-pilots",
    primaryAction: "Create pilot",
    route: "/administration/mobile-pilots",
    title: "Mobile Pilots",
  },
  {
    description:
      "Monitor active devices, sync health, crash trends, offline devices, app versions, and submission throughput.",
    icon: Activity,
    id: "mobile-monitoring",
    primaryAction: "Review health",
    route: "/administration/mobile-monitoring",
    title: "Mobile Monitoring",
  },
  {
    description:
      "Review field feedback from mobile users, including diagnostics for sync, performance, and usability issues.",
    icon: MessageSquare,
    id: "mobile-feedback",
    primaryAction: "Review feedback",
    route: "/administration/mobile-feedback",
    title: "Mobile Feedback",
  },
  {
    description:
      "Record offline, GPS, attachment, sync, and large-form test results before rollout.",
    icon: Bug,
    id: "mobile-testing",
    primaryAction: "Record test",
    route: "/administration/mobile-testing",
    title: "Mobile Testing",
  },
];

export const initialLocations: LocationRecord[] = [];

export const initialReferenceLists: ReferenceList[] = [
  {
    category: "Localization",
    description: "Default languages available across the platform.",
    id: "ref-languages",
    name: "Languages",
    status: "active",
    updatedAt: "2026-06-01 09:00",
    values: [
      {
        active: true,
        code: "en",
        description: "English interface and reports.",
        id: "value-en",
        label: "English",
      },
      {
        active: true,
        code: "fr",
        description: "French interface and reports.",
        id: "value-fr",
        label: "French",
      },
    ],
    version: 1,
  },
  {
    category: "Finance",
    description: "Currencies supported for budgets and donor reports.",
    id: "ref-currencies",
    name: "Currencies",
    status: "active",
    updatedAt: "2026-06-01 09:00",
    values: [
      {
        active: true,
        code: "USD",
        description: "United States Dollar.",
        id: "value-usd",
        label: "US Dollar",
      },
      {
        active: true,
        code: "EUR",
        description: "Euro.",
        id: "value-eur",
        label: "Euro",
      },
      {
        active: true,
        code: "XAF",
        description: "Central African CFA franc.",
        id: "value-xaf",
        label: "CFA Franc BEAC",
      },
    ],
    version: 1,
  },
];

export const initialNotificationRules: NotificationRule[] = [
  {
    channel: "In-App",
    eventType: "Submission Alerts",
    frequency: "Immediate",
    id: "notify-submission-review",
    recipients: "Data Manager, Supervisor",
    status: "active",
    template: "New submission waiting for review",
  },
  {
    channel: "Email",
    eventType: "System Alerts",
    frequency: "Immediate",
    id: "notify-system-alerts",
    recipients: "System Admin",
    status: "active",
    template: "Critical system alert",
  },
];

export const initialApiKeys: ApiKeyRecord[] = [];

export const initialIntegrations: IntegrationRecord[] = [
  {
    id: "integration-email",
    lastSync: "Not connected",
    name: "Transactional Email",
    owner: "System Admin",
    status: "disconnected",
    type: "Email Service",
  },
  {
    id: "integration-storage",
    lastSync: "Not connected",
    name: "Object Storage",
    owner: "System Admin",
    status: "disconnected",
    type: "Cloud Storage",
  },
  {
    id: "integration-gis",
    lastSync: "Not connected",
    name: "GIS Tiles",
    owner: "System Admin",
    status: "disconnected",
    type: "GIS Service",
  },
];

export const initialFeatureFlags: FeatureFlag[] = [
  {
    enabled: true,
    environment: "Production",
    id: "flag-mapping",
    name: "Mapping",
    rollout: 100,
  },
  {
    enabled: true,
    environment: "Production",
    id: "flag-indicators",
    name: "Indicator Engine",
    rollout: 100,
  },
  {
    enabled: false,
    environment: "Production",
    id: "flag-ai",
    name: "AI Features",
    rollout: 0,
  },
  {
    enabled: true,
    environment: "Production",
    id: "flag-mobile-sync",
    name: "Mobile Sync",
    rollout: 100,
  },
];

export const initialSystemSettings: SystemSettings = {
  brandColor: "#138a4a",
  currency: "USD",
  dateFormat: "DD MMM YYYY",
  defaultLanguage: "English",
  logoUrl: "",
  numberFormat: "1,234.56",
  organizationName: "Atlas FieldOps",
  platformName: "Atlas FieldOps",
  security: {
    allowedDomains: "",
    complexityRules: "Uppercase, lowercase, number, special character",
    concurrentSessions: 2,
    idleTimeoutMinutes: 30,
    loginRestrictions: "Allow approved organization domains",
    minimumLength: 12,
    mfaRequired: false,
    passwordExpirationDays: 180,
    sessionTimeoutMinutes: 480,
  },
  timeZone: "UTC",
};

export const initialBackupJobs: BackupJob[] = [];

export const initialConfigurationChanges: ConfigurationChange[] = [
  {
    actor: "System",
    detail: "Administration module initialized from architecture reference.",
    id: "change-initialized",
    resource: "Administration",
    time: "2026-06-05 09:00",
    type: "Module initialized",
  },
];
