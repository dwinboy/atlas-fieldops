"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  FileChartColumn,
  Flag,
  Globe2,
  Layers3,
  MapPinned,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  UploadCloud,
  UsersRound,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";

import { useContextualBack } from "@/hooks/useContextualBack";
import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyMini } from "@/components/ui/empty-mini";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { KpiShard } from "@/components/ui/kpi-shard";
import { Modal } from "@/components/ui/modal";
import {
  ApiError,
  activatePredefinedEntityCategory,
  createProject,
  createEntityCategory,
  getProjectDetail,
  getProjectsSummary,
  importOrganizationUnits,
  installProjectSectorForms,
  installProjectSectorIndicators,
  installProjectSectorReports,
  listProjectSectorPacks,
  listProjectTemplates,
  listProjects,
  listEntityCategories,
  listPredefinedEntityCategories,
  updateEntityCategory,
  updateProject,
  type CurrentPrincipal,
  type ProjectCreate,
  type ProjectDetailRead,
  type ProjectListItemRead,
  type ProjectRelatedRecordRead,
  type ProjectSectorPackRead,
  type ProjectSummaryRead,
  type ProjectUpdate,
  type EntityAttributeCreate,
  type EntityCategoryRead,
  type PredefinedEntityCategoryRead,
} from "@/lib/api";
import { SECTOR_TERMINOLOGY } from "@/lib/sectorTerminology";
import { OptionSetsProvider, useOptionChoices } from "@/lib/optionSets";
import { cn } from "@/lib/utils";
import { ProjectBeneficiariesPanel } from "@/modules/beneficiaries/BeneficiariesModule";
import { previewEntities } from "@/modules/beneficiaries/data";
import { ImportsMigrationModule } from "@/modules/imports-migration/ImportsMigrationModule";
import {
  projectSections,
  projectSectionFromPath,
  projectTabs,
  previewDetail,
  previewProjects,
  previewSummary,
  previewTemplates,
  routeForStatusGroup,
  statusGroupChips,
  statusGroupFromPath,
  type ProjectSection,
  type ProjectTab,
  type StatusGroup,
} from "@/modules/projects/data";
import {
  computeProjectSummary,
  filterProjects,
  formatDate,
  healthTone,
  projectCodeFromName,
  statusTone,
  toCsv,
} from "@/modules/projects/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type ProjectsModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

const defaultProjectDraft: ProjectCreate = {
  category: "",
  community: "",
  country: "",
  description: "",
  district: "",
  donor: "",
  end_date: null,
  implementing_organization: "",
  name: "",
  owner: "",
  program_type: "",
  project_code: "",
  region: "",
  sector_id: "",
  settings_json: {
    automationRules: [],
    beneficiary: {
      codeFormat: "REC-YYYY-000001",
      duplicateFields: ["External ID", "Name + Location", "GPS"],
      primaryEntityType: "Record",
      profileUpdateRule: "Require review for identity and critical field changes",
      secondaryEntityTypes: [],
    },
    formJourney: [
      "Registration required before assessment",
      "Assessment required before follow-up",
      "Follow-up required before reporting",
    ],
    governance: {
      approvalWorkflow: "Submitted → Under Review → Approved",
      approvedDataOnly: true,
      consentPolicy: "Consent required where records collect personal or sensitive data",
      exportRule: "Exports require permission and audit logging",
      retentionRule: "Retain project data according to organization policy",
      sensitiveDataControls: "Mask sensitive fields for restricted roles",
    },
    indicators: {
      baselineRequired: false,
      disaggregation: ["Location", "Category", "Status"],
      frequency: "Monthly",
      setupMode: "Configure later",
    },
    program: {
      budgetAmount: "",
      budgetCurrency: "USD",
      expectedOutcomes: "",
      expectedOutputs: "",
      fundingSource: "",
      grantReference: "",
      objective: "",
      resultAreas: "",
      targetBeneficiaries: "",
    },
    team: {
      dataManager: "",
      fieldOfficers: "",
      meManager: "",
      projectManager: "",
      supervisors: "",
    },
  },
  start_date: null,
  status: "draft",
};

const indicatorSetupModes = [
  {
    value: "Configure later",
    label: "Skip metrics for now and finish project setup",
    help: "The project can still be created, forms can still be attached, and metrics can be added later from Indicators.",
  },
  {
    value: "Create now",
    label: "Create metrics now",
    help: "Define the first metrics during project setup.",
  },
  {
    value: "Import indicators",
    label: "Import metrics",
    help: "Bring in a prepared metric list from another source.",
  },
  {
    value: "Use templates",
    label: "Use metric templates",
    help: "Start from sector-based metric templates and adjust them later.",
  },
] as const;

const richPreviewSectorPacks: ProjectSectorPackRead[] = ([
  {
    dashboard_widgets: ["Farmer coverage", "Yield progress", "Input distribution", "Training completion"],
    data_quality_rules: ["Duplicate farmer by phone or name + village", "Static GPS", "Yield outliers"],
    description: "For farmer registration, extension visits, input distribution, yield monitoring, cooperatives, and seasonal agriculture programs.",
    entity_types: ["Farmer", "Household", "Farm", "Cooperative", "Village"],
    form_templates: ["Farmer Registration", "Baseline Farm Survey", "Input Distribution", "Seasonal Yield Monitoring", "Endline Survey"],
    governance_defaults: { approvalWorkflow: "Submitted → Supervisor Review → Data Manager Review → Approved", approvedDataOnly: true },
    id: "agriculture",
    indicator_templates: ["Farmers registered", "Farmers trained", "Improved seed adoption rate", "Average yield per hectare"],
    mobile_guidance: ["Require GPS at farm or household", "Allow offline collection", "Prefill assigned farmers"],
    name: "Agriculture and Farmer Programs",
    recommended_settings: {
      beneficiary: {
        codeFormat: "FRM-YYYY-000001",
        duplicateFields: ["Phone", "National ID", "Household ID", "Name + Village", "GPS"],
        primaryEntityType: "Farmer",
        profileUpdateRule: "Require review for name, phone, village, and GPS changes",
        secondaryEntityTypes: ["Household", "Farm", "Cooperative"],
      },
      forms: {
        journey: "Farmer Registration → Baseline Farm Survey → Seasonal Monitoring → Endline Survey",
        starterPack: "Install project starter pack",
      },
      indicators: {
        dataSource: "Approved farmer registration, training, distribution, and yield monitoring forms",
        disaggregation: ["Sex", "Age", "Village", "Crop", "Farm size"],
        frequency: "Seasonal",
        setupMode: "Use indicator templates",
      },
    },
    report_templates: ["Monthly extension report", "Seasonal yield report", "Input distribution report"],
    sector: "Agriculture",
    terminology: { field_visit: "Extension visit", primary_entity: "Farmer", secondary_entities: "Household, Farm, Cooperative", submission: "Farm record" },
    validation_rules: ["Farm size cannot be negative", "Harvest date cannot be in the future", "Yield must match crop and season"],
    workflows: ["Registration → Baseline → Monitoring → Endline", "Training attendance → Follow-up visit"],
  },
  {
    dashboard_widgets: ["Referral follow-up", "Facility coverage", "Sensitive data quality", "Visit timeliness"],
    data_quality_rules: ["Duplicate client by phone or ID", "Missing consent", "Invalid age/date"],
    description: "For community health work, facility assessments, referrals, service follow-up, campaigns, and sensitive health data collection.",
    entity_types: ["Patient", "Client", "Household", "Facility", "Health Worker"],
    form_templates: ["Client Intake", "Facility Assessment", "Referral Follow-up", "Community Health Visit"],
    governance_defaults: { approvalWorkflow: "Submitted → Supervisor Review → Data Manager Review → Approved", approvedDataOnly: true },
    id: "health",
    indicator_templates: ["Clients reached", "Referral completion rate", "Facilities assessed", "Service uptake"],
    mobile_guidance: ["Mask sensitive fields", "Require consent before submission", "Support offline visits"],
    name: "Health and Community Systems",
    recommended_settings: {
      beneficiary: {
        codeFormat: "HLT-YYYY-000001",
        duplicateFields: ["Phone", "National ID", "Name + Date of Birth", "Name + Village"],
        primaryEntityType: "Beneficiary",
        profileUpdateRule: "Require review for name, phone, village, and GPS changes",
        secondaryEntityTypes: ["Household", "Facility", "Health Worker"],
      },
      forms: { journey: "Client Intake → Health Visit → Referral Follow-up", starterPack: "Install project starter pack" },
      indicators: {
        dataSource: "Approved intake, facility, referral, and visit forms",
        disaggregation: ["Sex", "Age", "Location", "Disability status", "Service type"],
        frequency: "Monthly",
        setupMode: "Use indicator templates",
      },
    },
    report_templates: ["Monthly health outreach report", "Facility assessment report", "Referral tracking report"],
    sector: "Health",
    terminology: { field_visit: "Health visit", primary_entity: "Patient or Client", secondary_entities: "Household, Facility, Health Worker", submission: "Health record" },
    validation_rules: ["Date of birth cannot be in the future", "Age must match date of birth", "Consent required for PII"],
    workflows: ["Client Intake → Service Visit → Referral Follow-up", "Facility Assessment → Improvement Action → Verification"],
  },
  {
    dashboard_widgets: ["School coverage", "Attendance trend", "Learning outcomes", "Teacher support"],
    data_quality_rules: ["Duplicate school by code or name + district", "Attendance outliers", "Missing location"],
    description: "For school profiles, attendance monitoring, teacher support, learning assessments, and education access programs.",
    entity_types: ["School", "Student", "Teacher", "Classroom", "Household"],
    form_templates: ["School Registration", "Attendance Monitoring", "Teacher Observation", "Learning Assessment"],
    governance_defaults: { approvalWorkflow: "Submitted → Under Review → Approved", approvedDataOnly: true },
    id: "education",
    indicator_templates: ["Schools monitored", "Attendance rate", "Students assessed", "Learning outcome improvement"],
    mobile_guidance: ["Prefill assigned schools", "Require GPS at school", "Work offline during rural visits"],
    name: "Education and School Monitoring",
    recommended_settings: {
      beneficiary: {
        codeFormat: "SCH-YYYY-000001",
        duplicateFields: ["Name + Village", "GPS"],
        primaryEntityType: "School",
        profileUpdateRule: "Require review for name, phone, village, and GPS changes",
        secondaryEntityTypes: ["Student", "Teacher", "Classroom"],
      },
      forms: { journey: "School Registration → Baseline Assessment → Attendance Monitoring → Endline Assessment", starterPack: "Install project starter pack" },
      indicators: {
        dataSource: "Approved school, attendance, assessment, and teacher observation forms",
        disaggregation: ["Sex", "Age", "Grade", "School", "District"],
        frequency: "Monthly",
        setupMode: "Use indicator templates",
      },
    },
    report_templates: ["Monthly school monitoring report", "Learning assessment report", "Attendance report"],
    sector: "Education",
    terminology: { field_visit: "School monitoring visit", primary_entity: "School or Student", secondary_entities: "Teacher, Classroom, Household", submission: "Education record" },
    validation_rules: ["Attendance cannot exceed enrollment", "Assessment date cannot be in the future", "School code required"],
    workflows: ["School Registration → Baseline Assessment → Attendance Monitoring → Endline Assessment"],
  },
] as Array<
  Omit<
    ProjectSectorPackRead,
    | "form_definitions"
    | "indicator_definitions"
    | "report_definitions"
    | "manager_controls"
  >
>).map((pack) => ({
  ...pack,
  form_definitions: [],
  indicator_definitions: [],
  manager_controls: {},
  report_definitions: [],
}));

// Generate a complete pack for every other canonical sector so the wizard
// shows the full set even in preview / offline-fallback mode. IDs match the
// backend sector packs, so a real session's richer packs supersede these.
function buildFallbackSectorPack(sector: {
  metricPluralLabel?: string;
  optionalModules?: string[];
  sectorId: string;
  sectorName: string;
  primaryEntity: string;
  primaryEntityPlural: string;
  recordLabel?: string;
  workflowLabel?: string;
}): ProjectSectorPackRead {
  const entity = sector.primaryEntity;
  const metricLabel = sector.metricPluralLabel ?? "Metrics";
  const workflowLabel = sector.workflowLabel ?? "Operational workflow";
  const optionalModules = sector.optionalModules ?? [sector.primaryEntityPlural, "Locations", metricLabel, "Reports"];
  return {
    id: sector.sectorId,
    name: sector.sectorName,
    sector: sector.sectorName,
    description: `Starter configuration for ${sector.sectorName.toLowerCase()} — entities, forms, ${metricLabel.toLowerCase()}, workflows, reports, and governance tuned for ${sector.primaryEntityPlural.toLowerCase()}.`,
    terminology: { primary_entity: entity, secondary_entities: optionalModules.slice(1, 4).join(", "), field_visit: workflowLabel, submission: sector.recordLabel ?? "Record" },
    entity_types: Array.from(new Set([entity, ...optionalModules.slice(0, 4)])),
    form_templates: [`${entity} Registration`, `${entity} Assessment`, "Operational Checklist", "Follow-up Record"],
    form_definitions: [],
    indicator_templates: [`${sector.primaryEntityPlural} registered`, `${sector.primaryEntityPlural} active`, "Activities completed"],
    indicator_definitions: [],
    dashboard_widgets: [`${entity} coverage`, "Activity progress", "Data quality"],
    report_templates: ["Monthly operations report", "Performance summary"],
    report_definitions: [],
    validation_rules: ["Required identifiers present", "Dates cannot be in the future"],
    data_quality_rules: [`Duplicate ${entity.toLowerCase()} by phone or name + location`, "Static GPS across many records"],
    workflows: [`${entity} Registration → Assessment → Follow-up → Reporting`],
    mobile_guidance: ["Allow offline collection", "Capture GPS where relevant", "Prefill assigned records"],
    governance_defaults: {
      approvalWorkflow: "Submitted → Supervisor Review → Data Manager Review → Approved",
      approvedDataOnly: true,
      consentPolicy: "Consent required before collecting identifiable data",
    },
    recommended_settings: {
      beneficiary: {
        primaryEntityType: entity,
        secondaryEntityTypes: optionalModules.slice(1, 4),
        codeFormat: `${entity.slice(0, 3).toUpperCase()}-YYYY-000001`,
        duplicateFields: ["External ID", "Name + Location", "GPS"],
        profileUpdateRule: "Require review for identity and critical field changes",
      },
      forms: {
        starterPack: "Install project starter pack",
        journey: `${entity} Registration → Assessment → Follow-up → Reporting`,
      },
      indicators: {
        setupMode: "Use metric templates when needed",
        frequency: "Monthly",
        dataSource: "Approved submissions",
        disaggregation: ["Location", "Category", "Status"],
      },
    },
    manager_controls: {},
  };
}

const previewSectorPacks: ProjectSectorPackRead[] = (() => {
  const covered = new Set(richPreviewSectorPacks.map((pack) => pack.id));
  const generated = Object.values(SECTOR_TERMINOLOGY)
    .filter((sector) => sector.sectorId !== "custom" && !covered.has(sector.sectorId))
    .map(buildFallbackSectorPack);
  const customPack = covered.has("custom")
    ? []
    : [buildFallbackSectorPack(SECTOR_TERMINOLOGY.custom)];
  return [...richPreviewSectorPacks, ...generated, ...customPack];
})();

const sectorPackPriority = [
  "agriculture",
  "health",
  "education",
  "wash",
  "humanitarian",
  "nutrition",
  "livelihoods",
  "protection",
  "governance",
  "environment",
  "research",
  "retail",
  "inventory",
  "sales",
  "logistics",
  "manufacturing",
  "hr",
  "assets",
  "audits",
  "inspections",
  "custom",
];

function sortedSectorPacks(packs: ProjectSectorPackRead[]): ProjectSectorPackRead[] {
  return [...packs].sort((first, second) => {
    const firstRank = sectorPackPriority.indexOf(first.id);
    const secondRank = sectorPackPriority.indexOf(second.id);
    if (firstRank !== -1 || secondRank !== -1) {
      return (firstRank === -1 ? 999 : firstRank) - (secondRank === -1 ? 999 : secondRank);
    }
    return first.name.localeCompare(second.name);
  });
}

function completeSectorPacks(apiPacks: ProjectSectorPackRead[] | undefined): ProjectSectorPackRead[] {
  const byId = new Map<string, ProjectSectorPackRead>();
  for (const pack of previewSectorPacks) byId.set(pack.id, pack);
  for (const pack of apiPacks ?? []) byId.set(pack.id, pack);
  return sortedSectorPacks(Array.from(byId.values()));
}

const countryCodes = [
  "AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM", "AW", "AU", "AT", "AZ",
  "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM", "BT", "BO", "BQ", "BA", "BW", "BV", "BR",
  "IO", "BN", "BG", "BF", "BI", "KH", "CM", "CA", "CV", "KY", "CF", "TD", "CL", "CN", "CX", "CC",
  "CO", "KM", "CG", "CD", "CK", "CR", "CI", "HR", "CU", "CW", "CY", "CZ", "DK", "DJ", "DM", "DO",
  "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF",
  "GA", "GM", "GE", "DE", "GH", "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY",
  "HT", "HM", "VA", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT", "JM",
  "JP", "JE", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY",
  "LI", "LT", "LU", "MO", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX",
  "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NC", "NZ", "NI",
  "NE", "NG", "NU", "NF", "MK", "MP", "NO", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH",
  "PN", "PL", "PT", "PR", "QA", "RE", "RO", "RU", "RW", "BL", "SH", "KN", "LC", "MF", "PM", "VC",
  "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS",
  "SS", "ES", "LK", "SD", "SR", "SJ", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TK",
  "TO", "TT", "TN", "TR", "TM", "TC", "TV", "UG", "UA", "AE", "GB", "US", "UM", "UY", "UZ", "VU",
  "VE", "VN", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW",
] as const;

const countryDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryOptions = countryCodes
  .map((code) => countryDisplayNames.of(code) ?? code)
  .sort((left, right) => left.localeCompare(right));

const projectStatusOptions = [
  "draft",
  "planning",
  "active",
  "suspended",
  "completed",
  "archived",
];

const submissionSourceOptions = [
  "Field Submitted",
  "Mobile",
  "Web Entry",
  "Uploaded",
  "Imported",
];

const wizardSteps = ["Basics", "Setup", "Review & activate"] as const;

// Maps a readiness check's original section index onto the new 3-step model.
// Only the create-required fields (name, code, type) live on step 0 "Basics";
// every other field is grouped under step 1 "Setup". Step 2 is review/activate.
function wizardStepForCheck(targetStep: number): number {
  return targetStep === 0 ? 0 : 1;
}

function isPreview(token: string | null): boolean {
  return !token || token === "preview-token";
}

function messageFromError(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.message) as { detail?: unknown };
      if (typeof parsed.detail === "string") return parsed.detail;
      if (Array.isArray(parsed.detail))
        return parsed.detail
          .map((item) => {
            const location = Array.isArray(item?.loc)
              ? item.loc.filter((part: unknown) => part !== "body").join(".")
              : "";
            const message = item?.msg ?? "Invalid field";
            return location ? `${location}: ${message}` : message;
          })
          .join(" ");
    } catch {
      return error.message;
    }
  }
  return "Check the project code, required fields, and your project permissions.";
}

function optionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const text = value.map((item) => String(item).trim()).filter(Boolean).join(", ");
    return text || null;
  }
  if (typeof value === "object") return null;
  const text = String(value).trim();
  return text || null;
}

function requiredText(value: unknown): string {
  return optionalText(value) ?? "";
}

function sanitizeProjectSettings(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeProjectPayload(draft: ProjectCreate): ProjectCreate {
  const generatedCode = draft.project_code || projectCodeFromName(draft.name);
  return {
    category: optionalText(draft.category),
    community: optionalText(draft.community),
    country: optionalText(draft.country),
    description: optionalText(draft.description),
    district: optionalText(draft.district),
    donor: optionalText(draft.donor),
    end_date: optionalText(draft.end_date),
    implementing_organization: optionalText(draft.implementing_organization),
    name: requiredText(draft.name),
    owner: optionalText(draft.owner),
    program_type: optionalText(draft.program_type),
    project_code: generatedCode
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, ""),
    region: optionalText(draft.region),
    sector_id: optionalText(draft.sector_id),
    settings_json: sanitizeProjectSettings(draft.settings_json),
    start_date: optionalText(draft.start_date),
    status: optionalText(draft.status)?.toLowerCase() ?? "draft",
  };
}

type ProjectSettingsSection = Record<string, unknown>;
type ReadinessCheck = {
  label: string;
  status: "passed" | "warning" | "failed";
  critical?: boolean;
  targetStep: number;
};

function sectionSettings(
  draft: Pick<ProjectCreate, "settings_json">,
  section: string,
): ProjectSettingsSection {
  const root = draft.settings_json ?? {};
  const value = root[section];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as ProjectSettingsSection)
    : {};
}

function settingText(
  draft: Pick<ProjectCreate, "settings_json">,
  section: string,
  key: string,
  fallback = "",
): string {
  const value = sectionSettings(draft, section)[key];
  return typeof value === "string" ? value : fallback;
}

function settingBoolean(
  draft: Pick<ProjectCreate, "settings_json">,
  section: string,
  key: string,
  fallback = false,
): boolean {
  const value = sectionSettings(draft, section)[key];
  return typeof value === "boolean" ? value : fallback;
}

function settingStringList(
  draft: Pick<ProjectCreate, "settings_json">,
  section: string,
  key: string,
): string[] {
  const value = sectionSettings(draft, section)[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

type BeneficiaryCodeFormatParts = {
  digits: number;
  includeYear: boolean;
  prefix: string;
  separator: "-" | "/" | "_";
};

const entityCodePrefixes: Record<string, string> = {
  Beneficiary: "BEN",
  Farmer: "FRM",
  Household: "HH",
  Facility: "FAC",
  School: "SCH",
  Village: "VIL",
  Group: "GRP",
  "Health Worker": "HW",
};

function defaultEntityCodePrefix(entityType: string): string {
  const configuredPrefix = entityCodePrefixes[entityType];
  if (configuredPrefix) return configuredPrefix;
  return entityType.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "BEN";
}

function parseBeneficiaryCodeFormat(value: string, entityType: string): BeneficiaryCodeFormatParts {
  const cleaned = value.trim().toUpperCase();
  const prefix = cleaned.match(/^([A-Z0-9]{2,12})/)?.[1] ?? defaultEntityCodePrefix(entityType);
  const separator = cleaned.includes("/") ? "/" : cleaned.includes("_") ? "_" : "-";
  const zeroRun = cleaned.match(/0{3,10}/)?.[0];
  return {
    digits: Math.min(10, Math.max(3, zeroRun?.length ?? 6)),
    includeYear: /YYYY|YEAR|20\d{2}/.test(cleaned) || !cleaned,
    prefix,
    separator,
  };
}

function buildBeneficiaryCodeFormat(parts: BeneficiaryCodeFormatParts): string {
  return [parts.prefix, parts.includeYear ? "YYYY" : null, "0".repeat(parts.digits)]
    .filter(Boolean)
    .join(parts.separator);
}

function beneficiaryCodePreview(value: string, entityType: string): string {
  const parts = parseBeneficiaryCodeFormat(value, entityType);
  return buildBeneficiaryCodeFormat(parts)
    .replace("YYYY", String(new Date().getFullYear()))
    .replace(/0{3,10}/, (match) => "1".padStart(match.length, "0"));
}

function topLevelStringList(
  settingsJson: Record<string, unknown> | undefined,
  key: string,
): string[] {
  const value = settingsJson?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mergeProjectSettings(
  draft: ProjectCreate,
  section: string,
  patch: ProjectSettingsSection,
): ProjectCreate {
  return {
    ...draft,
    settings_json: {
      ...(draft.settings_json ?? {}),
      [section]: {
        ...sectionSettings(draft, section),
        ...patch,
      },
    },
  };
}

function applySectorPackToDraft(
  draft: ProjectCreate,
  pack: ProjectSectorPackRead,
): ProjectCreate {
  const currentSettings = sanitizeProjectSettings(draft.settings_json);
  const recommendedSettings = sanitizeProjectSettings(pack.recommended_settings);
  const nextSettings: Record<string, unknown> = { ...currentSettings };

  for (const [section, sectionDefaults] of Object.entries(recommendedSettings)) {
    const currentSection = sectionSettings(
      { settings_json: nextSettings },
      section,
    );
    if (
      sectionDefaults &&
      typeof sectionDefaults === "object" &&
      !Array.isArray(sectionDefaults)
    ) {
      nextSettings[section] = {
        ...currentSection,
        ...(sectionDefaults as Record<string, unknown>),
      };
    }
  }

  const currentGovernance = sectionSettings(
    { settings_json: nextSettings },
    "governance",
  );
  nextSettings.governance = {
    ...currentGovernance,
    ...pack.governance_defaults,
  };
  nextSettings.sector = {
    dashboardWidgets: pack.dashboard_widgets,
    dataQualityRules: pack.data_quality_rules,
    entityTypes: pack.entity_types,
    formDefinitions: pack.form_definitions,
    formTemplates: pack.form_templates,
    indicatorDefinitions: pack.indicator_definitions,
    id: pack.id,
    indicatorTemplates: pack.indicator_templates,
    managerControls: pack.manager_controls,
    mobileGuidance: pack.mobile_guidance,
    name: pack.name,
    reportDefinitions: pack.report_definitions,
    reportTemplates: pack.report_templates,
    sector: pack.sector,
    terminology: pack.terminology,
    validationRules: pack.validation_rules,
    workflows: pack.workflows,
  };

  return {
    ...draft,
    category: draft.category || pack.sector,
    program_type: draft.program_type || pack.sector,
    sector_id: pack.id,
    settings_json: nextSettings,
  };
}

function selectedSectorPack(
  draft: Pick<ProjectCreate, "sector_id" | "settings_json">,
  packs: ProjectSectorPackRead[],
): ProjectSectorPackRead | null {
  if (draft.sector_id) {
    return packs.find((pack) => pack.id === draft.sector_id) ?? null;
  }
  const sector = sectionSettings(draft, "sector");
  const sectorId = sector.id;
  return typeof sectorId === "string"
    ? packs.find((pack) => pack.id === sectorId) ?? null
    : null;
}

function dateInputValue(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function projectReadiness(draft: ProjectCreate): {
  checks: ReadinessCheck[];
  score: number;
  failedCritical: number;
  category: "Ready" | "Needs Review" | "Not Ready";
} {
  const beneficiary = sectionSettings(draft, "beneficiary");
  const governance = sectionSettings(draft, "governance");
  const program = sectionSettings(draft, "program");
  const forms = sectionSettings(draft, "forms");
  const team = sectionSettings(draft, "team");
  const checks: ReadinessCheck[] = [
    {
      critical: true,
      label: "Project name is set",
      status: draft.name.trim() ? "passed" : "failed",
      targetStep: 0,
    },
    {
      critical: true,
      label: "Project code is set",
      status:
        draft.project_code || projectCodeFromName(draft.name)
          ? "passed"
          : "failed",
      targetStep: 0,
    },
    {
      label: "Sector pack is selected",
      status: draft.sector_id || sectionSettings(draft, "sector").id
        ? "passed"
        : "warning",
      targetStep: 0,
    },
    {
      critical: true,
      label: "Project type is selected",
      status: draft.program_type ? "passed" : "failed",
      targetStep: 0,
    },
    {
      label: "Project dates are defined",
      status: draft.start_date && draft.end_date ? "passed" : "warning",
      targetStep: 0,
    },
    {
      label: "Program objective is documented",
      status: typeof program.objective === "string" && program.objective.trim()
        ? "passed"
        : "warning",
      targetStep: 1,
    },
    {
      label: "Budget and funding are recorded",
      status:
        (typeof program.budgetAmount === "string" && program.budgetAmount.trim()) ||
        (typeof program.fundingSource === "string" && program.fundingSource.trim())
          ? "passed"
          : "warning",
      targetStep: 1,
    },
    {
      critical: true,
      label: "Geographic scope is selected",
      status: draft.country || draft.region || draft.district || draft.community
        ? "passed"
        : "failed",
      targetStep: 2,
    },
    {
      critical: true,
      label: "Primary entity type is selected",
      status:
        typeof beneficiary.primaryEntityType === "string" &&
        beneficiary.primaryEntityType.trim()
          ? "passed"
          : "failed",
      targetStep: 3,
    },
    {
      label: "Entity code format is configured",
      status:
        typeof beneficiary.codeFormat === "string" &&
        beneficiary.codeFormat.trim()
          ? "passed"
          : "warning",
      targetStep: 3,
    },
    {
      label: "Duplicate matching rules are configured",
      status:
        Array.isArray(beneficiary.duplicateFields) &&
        beneficiary.duplicateFields.length
          ? "passed"
          : "warning",
      targetStep: 3,
    },
    {
      label: "Metric setup plan is defined",
      status: sectionSettings(draft, "indicators").setupMode
        ? "passed"
        : "warning",
      targetStep: 4,
    },
    {
      label: "Form starter or journey plan is defined",
      status: forms.starterPack || forms.journey
        ? "passed"
        : "warning",
      targetStep: 5,
    },
    {
      critical: true,
      label: "Project owner or manager is assigned",
      status:
        draft.owner ||
        (typeof team.projectManager === "string" && team.projectManager.trim())
          ? "passed"
          : "failed",
      targetStep: 6,
    },
    {
      critical: true,
      label: "Approval workflow is configured",
      status:
        typeof governance.approvalWorkflow === "string" &&
        governance.approvalWorkflow.trim()
          ? "passed"
          : "failed",
      targetStep: 7,
    },
    {
      label: "Consent and retention rules are documented",
      status: governance.consentPolicy && governance.retentionRule
        ? "passed"
        : "warning",
      targetStep: 7,
    },
  ];
  const passed = checks.filter((check) => check.status === "passed").length;
  const warnings = checks.filter((check) => check.status === "warning").length;
  const failedCritical = checks.filter(
    (check) => check.critical && check.status === "failed",
  ).length;
  const score = Math.max(
    0,
    Math.round(((passed + warnings * 0.45) / checks.length) * 100),
  );
  return {
    category: score >= 85 && failedCritical === 0
      ? "Ready"
      : score >= 60
        ? "Needs Review"
        : "Not Ready",
    checks,
    failedCritical,
    score,
  };
}

function projectFromDraft(draft: ProjectCreate): ProjectListItemRead {
  const now = new Date().toISOString();
  return {
    active_assignments: 0,
    active_forms: 0,
    beneficiary_count: 0,
    country: draft.country || null,
    created_at: now,
    donor: draft.donor || null,
    end_date: draft.end_date ?? null,
    health_score: 35,
    health_status: "Needs Attention",
    id: `project-local-${Date.now()}`,
    indicator_count: 0,
    name: draft.name,
    owner: draft.owner || null,
    progress_percent: 10,
    project_code: draft.project_code,
    region: draft.region || draft.country || null,
    sector_id: draft.sector_id ?? null,
    sector_name: settingText(draft, "sector", "name") || draft.category || null,
    start_date: draft.start_date ?? null,
    status: draft.status ?? "draft",
    total_submissions: 0,
    updated_at: now,
  };
}

function detailFromProject(project: ProjectListItemRead): ProjectDetailRead {
  return {
    ...project,
    assignments: [],
    audit_trail: [],
    category: null,
    description: null,
    forms: [],
    implementing_organization: null,
    indicators: [],
    locations: [],
    program_type: null,
    reports: [],
    settings_json: {},
    submissions: [],
    teams: [],
  };
}

function hasAnyPermission(
  principal: CurrentPrincipal | null | undefined,
  permissions: string[],
): boolean {
  if (!principal || principal.platform_admin) return true;
  return permissions.some((permission) =>
    principal.permissions?.includes(permission),
  );
}

function downloadCsv(
  filename: string,
  rows: Record<string, string | number | boolean | null | undefined>[],
): void {
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

export function ProjectsModule({ principal, token }: ProjectsModuleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeSection, setActiveSection] =
    useState<ProjectSection>(() => projectSectionFromPath(pathname));
  const [statusGroup, setStatusGroup] = useState<StatusGroup>(() =>
    statusGroupFromPath(pathname),
  );
  const [activeTab, setActiveTab] = useState<ProjectTab>("Overview");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [projectDraft, setProjectDraft] =
    useState<ProjectCreate>(defaultProjectDraft);
  const [projectWizardError, setProjectWizardError] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  useContextualBack(Boolean(selectedProjectId));
  const queryClient = useQueryClient();
  const localProjects = useWorkspaceStore((state) => state.localProjects);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const upsertLocalProject = useWorkspaceStore(
    (state) => state.upsertLocalProject,
  );
  const preview = isPreview(token);
  const enabled = Boolean(token && !preview);
  const canManageProjects = preview || hasAnyPermission(principal, [
    "projects.create",
    "projects.manage",
    "projects.edit",
  ]);
  const canManageOrganization = hasAnyPermission(principal, [
    "organization.manage",
  ]);

  const projectsQuery = useQuery({
    queryKey: ["projects", token],
    queryFn: () => listProjects(token ?? ""),
    enabled,
  });
  const summaryQuery = useQuery({
    queryKey: ["projects", "summary", token],
    queryFn: () => getProjectsSummary(token ?? ""),
    enabled,
  });
  const templatesQuery = useQuery({
    queryKey: ["projects", "templates", token],
    queryFn: () => listProjectTemplates(token ?? ""),
    enabled,
  });
  const sectorPacksQuery = useQuery({
    queryKey: ["projects", "sector-packs", token],
    queryFn: () => listProjectSectorPacks(token ?? ""),
    enabled,
  });
  const detailQuery = useQuery({
    enabled: enabled && Boolean(selectedProjectId),
    queryKey: ["projects", "detail", token, selectedProjectId],
    queryFn: () => getProjectDetail(token ?? "", selectedProjectId ?? ""),
  });

  const previewEntityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entity of previewEntities) {
      counts.set(entity.projectId, (counts.get(entity.projectId) ?? 0) + 1);
    }
    return counts;
  }, []);
  const projects = useMemo(() => {
    if (!preview) return projectsQuery.data ?? [];
    return [...localProjects, ...previewProjects].map((project) => ({
      ...project,
      beneficiary_count: previewEntityCounts.get(project.id) ?? 0,
    }));
  }, [localProjects, preview, previewEntityCounts, projectsQuery.data]);
  const summary: ProjectSummaryRead =
    preview ? (summaryQuery.data ?? computeProjectSummary(projects) ?? previewSummary) : (summaryQuery.data ?? computeProjectSummary(projects));
  const templates = preview ? previewTemplates : (templatesQuery.data ?? []);
  const sectorPacks = preview
    ? sortedSectorPacks(previewSectorPacks)
    : completeSectorPacks(sectorPacksQuery.data);
  const selectedProject = selectedProjectId
    ? (projects.find((project) => project.id === selectedProjectId) ?? null)
    : null;
  const detail = selectedProjectId
    ? (detailQuery.data ??
      (selectedProject ? detailFromProject(selectedProject) : preview ? previewDetail : null))
    : null;
  const visibleProjects = useMemo(
    () => filterProjects(projects, statusGroup || "all"),
    [projects, statusGroup],
  );
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const projectFilters = {
    country: filterCountry,
    dateFrom: filterDateFrom,
    dateTo: filterDateTo,
    owner: filterOwner,
    region: filterRegion,
    status: filterStatus,
  };
  function setProjectFilters(patch: Partial<typeof projectFilters>): void {
    if (patch.status !== undefined) setFilterStatus(patch.status);
    if (patch.country !== undefined) setFilterCountry(patch.country);
    if (patch.region !== undefined) setFilterRegion(patch.region);
    if (patch.owner !== undefined) setFilterOwner(patch.owner);
    if (patch.dateFrom !== undefined) setFilterDateFrom(patch.dateFrom);
    if (patch.dateTo !== undefined) setFilterDateTo(patch.dateTo);
  }
  const filteredProjects = useMemo(() => {
    const fromTime = filterDateFrom ? new Date(filterDateFrom).getTime() : null;
    const toTime = filterDateTo ? new Date(filterDateTo).getTime() : null;
    return visibleProjects.filter((project) => {
      if (filterStatus && project.status !== filterStatus) return false;
      if (filterCountry && project.country !== filterCountry) return false;
      if (filterRegion && project.region !== filterRegion) return false;
      if (filterOwner && project.owner !== filterOwner) return false;
      if (fromTime !== null || toTime !== null) {
        if (!project.start_date) return false;
        const startTime = new Date(project.start_date).getTime();
        if (fromTime !== null && startTime < fromTime) return false;
        if (toTime !== null && startTime > toTime) return false;
      }
      return true;
    });
  }, [filterCountry, filterDateFrom, filterDateTo, filterOwner, filterRegion, filterStatus, visibleProjects]);

  function selectSection(section: ProjectSection): void {
    setActiveSection(section);
    if (section !== "all") setStatusGroup("");
    const route = projectSections.find((item) => item.id === section)?.route;
    if (route && route !== pathname) router.push(route);
  }

  function selectStatusGroup(group: StatusGroup): void {
    setActiveSection("all");
    setStatusGroup(group);
    const route = routeForStatusGroup(group);
    if (route !== pathname) router.push(route);
  }

  useEffect(() => {
    const normalizedPath = pathname?.replace(/\/+$/, "") || "";
    if (normalizedPath === "/projects/create") {
      setSelectedProjectId(null);
      setActiveSection("dashboard");
      setProjectWizardError("");
      setEditingProjectId(null);
      setProjectDraft(defaultProjectDraft);
      setWizardStep(0);
      setWizardOpen(true);
      return;
    }
    const match = pathname?.match(/^\/projects\/([^/]+)\/data-import\/?$/);
    if (match?.[1]) {
      setSelectedProjectId(match[1]);
      setActiveSection("all");
      setActiveTab("Settings & Governance");
      return;
    }
    const nextSection = projectSectionFromPath(normalizedPath);
    setActiveSection((current) => (current === nextSection ? current : nextSection));
    const nextStatusGroup = statusGroupFromPath(normalizedPath);
    setStatusGroup((current) => (current === nextStatusGroup ? current : nextStatusGroup));
  }, [pathname]);

  const createProjectMutation = useMutation({
    mutationFn: () =>
      createProject(token ?? "", normalizeProjectPayload(projectDraft)),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      upsertLocalProject(project);
      setWizardOpen(false);
      setWizardStep(0);
      setProjectWizardError("");
      setProjectDraft(defaultProjectDraft);
      setSelectedProjectId(project.id);
      setActiveSection("all");
      pushToast({
        title: "Project created",
        description: `${project.name} is ready for setup and activation.`,
        tone: "success",
      });
    },
    onError: (error) => {
      const description = messageFromError(error);
      setProjectWizardError(description);
      pushToast({
        title: "Could not create project",
        description,
        tone: "danger",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: () =>
      updateProject(
        token ?? "",
        editingProjectId ?? "",
        normalizeProjectPayload(projectDraft),
      ),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      upsertLocalProject(project);
      setWizardOpen(false);
      setWizardStep(0);
      setEditingProjectId(null);
      setProjectWizardError("");
      setProjectDraft(defaultProjectDraft);
      setSelectedProjectId(project.id);
      setActiveSection("all");
      pushToast({
        title: "Project updated",
        description: `${project.name} was updated.`,
        tone: "success",
      });
    },
    onError: (error) => {
      const description = messageFromError(error);
      setProjectWizardError(description);
      pushToast({
        title: "Could not update project",
        description,
        tone: "danger",
      });
    },
  });

  const importUnitsMutation = useMutation({
    mutationFn: (file: File) => importOrganizationUnits(token ?? "", file),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["users-teams", "units", token] });
      pushToast({
        title: "Locations imported",
        description: `${result.created_count} created, ${result.skipped_count} skipped, ${result.error_count} issue(s).`,
        tone: result.error_count ? "warning" : "success",
      });
    },
    onError: () =>
      pushToast({
        title: "Location import failed",
        description: "Use a CSV with name, code, unit_type columns (optional parent_code, region).",
        tone: "danger",
      }),
  });

  const updateProjectSettingsMutation = useMutation({
    mutationFn: ({
      projectId,
      settings,
    }: {
      projectId: string;
      settings: Record<string, unknown>;
    }) =>
      updateProject(token ?? "", projectId, {
        settings_json: settings,
      } satisfies ProjectUpdate),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      pushToast({
        title: "Sector pack updated",
        description:
          "Project-specific terminology, templates, validation, dashboards, and reports were saved.",
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Could not save sector pack",
        description: messageFromError(error),
        tone: "danger",
      });
    },
  });

  const installSectorFormsMutation = useMutation({
    mutationFn: (projectId: string) =>
      installProjectSectorForms(token ?? "", projectId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      pushToast({
        title: "Starter forms installed",
        description: result.message,
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Could not install forms",
        description: messageFromError(error),
        tone: "danger",
      });
    },
  });

  const installSectorIndicatorsMutation = useMutation({
    mutationFn: (projectId: string) =>
      installProjectSectorIndicators(token ?? "", projectId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      pushToast({
        title: "Metric templates installed",
        description: result.message,
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Could not install metrics",
        description: messageFromError(error),
        tone: "danger",
      });
    },
  });

  const installSectorReportsMutation = useMutation({
    mutationFn: (projectId: string) =>
      installProjectSectorReports(token ?? "", projectId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      pushToast({
        title: "Report templates installed",
        description: result.message,
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Could not install reports",
        description: messageFromError(error),
        tone: "danger",
      });
    },
  });

  function openProjectWizard(nextDraft: ProjectCreate = projectDraft): void {
    setProjectWizardError("");
    setEditingProjectId(null);
    setProjectDraft(nextDraft);
    setWizardOpen(true);
  }

  function openProjectEditor(project: ProjectListItemRead): void {
    const currentDetail =
      detail && detail.id === project.id ? detail : detailFromProject(project);
    setProjectWizardError("");
    setEditingProjectId(project.id);
    setProjectDraft({
      ...defaultProjectDraft,
      category: currentDetail.category ?? defaultProjectDraft.category,
      country: currentDetail.country ?? "",
      description: currentDetail.description ?? "",
      donor: currentDetail.donor ?? "",
      end_date: currentDetail.end_date ?? null,
      implementing_organization:
        currentDetail.implementing_organization ?? "",
      name: currentDetail.name,
      owner: currentDetail.owner ?? "",
      program_type: currentDetail.program_type ?? "",
      project_code: currentDetail.project_code,
      region: currentDetail.region ?? "",
      sector_id: currentDetail.sector_id ?? "",
      settings_json: currentDetail.settings_json ?? defaultProjectDraft.settings_json,
      start_date: currentDetail.start_date ?? null,
      status: currentDetail.status,
    });
    setWizardStep(0);
    setWizardOpen(true);
  }

  function submitProject(): void {
    const payload = normalizeProjectPayload(projectDraft);
    const readiness = projectReadiness(payload);
    if (!payload.name || !payload.project_code) {
      setProjectWizardError(
        "Project name and project code are required before creation.",
      );
      setWizardStep(0);
      return;
    }
    if (payload.status === "active" && readiness.failedCritical > 0) {
      const firstFailure = readiness.checks.find(
        (check) => check.critical && check.status === "failed",
      );
      setProjectWizardError(
        "Project activation is blocked until critical readiness checks pass.",
      );
      setWizardStep(firstFailure?.targetStep ?? 8);
      return;
    }
    setProjectDraft(payload);
    setProjectWizardError("");
    if (preview) {
      const project = projectFromDraft(payload);
      upsertLocalProject(project);
      setWizardOpen(false);
      setWizardStep(0);
      setSelectedProjectId(project.id);
      setActiveSection("all");
      pushToast({
        title: "Project created",
        description: `${project.name} was added to this local workspace preview.`,
        tone: "success",
      });
      return;
    }
    if (editingProjectId) {
      updateProjectMutation.mutate();
      return;
    }
    createProjectMutation.mutate();
  }

  function openProject(project: ProjectListItemRead): void {
    setSelectedProjectId(project.id);
    setActiveTab("Overview");
  }

  function openAttentionProject(): void {
    const attentionProject = [...projects]
      .filter((project) => project.health_score < 70)
      .sort((left, right) => left.health_score - right.health_score)[0];
    if (attentionProject) {
      openProject(attentionProject);
      return;
    }
    selectSection("all");
  }

  function saveProjectSettings(settings: Record<string, unknown>): void {
    if (!detail) return;
    if (preview) {
      queryClient.setQueryData(
        ["projects", "detail", token, detail.id],
        { ...detail, settings_json: settings },
      );
      pushToast({
        title: "Sector pack updated",
        description:
          "Project-specific sector settings were saved in this local preview.",
        tone: "success",
      });
      return;
    }
    updateProjectSettingsMutation.mutate({
      projectId: detail.id,
      settings,
    });
  }

  const projectColumns: TableColumn<ProjectListItemRead>[] = [
    {
      key: "name",
      header: "Project",
      value: (project) => `${project.name} ${project.project_code}`,
      render: (project) => (
        <button
          className="text-left"
          onClick={() => openProject(project)}
          type="button"
        >
          <p className="font-medium text-foreground">{project.name}</p>
          <p className="text-xs text-muted-foreground">
            {project.project_code}
          </p>
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      value: (project) => project.status,
      render: (project) => (
        <Badge tone={statusTone(project.status)}>{project.status}</Badge>
      ),
    },
    {
      key: "sector",
      header: "Sector",
      value: (project) => project.sector_name ?? project.sector_id ?? "",
      render: (project) => project.sector_name ?? "Custom",
    },
    {
      key: "donor",
      header: "Funder / Client",
      value: (project) => project.donor ?? "",
      render: (project) => project.donor ?? "Not set",
    },
    {
      key: "country",
      header: "Country/Region",
      value: (project) => `${project.country ?? ""} ${project.region ?? ""}`,
      render: (project) => project.country ?? project.region ?? "All areas",
    },
    {
      key: "owner",
      header: "Owner",
      value: (project) => project.owner ?? "",
      render: (project) => project.owner ?? "Unassigned",
    },
    {
      key: "forms",
      header: "Forms",
      value: (project) => String(project.active_forms),
      render: (project) => <Badge tone="neutral">{project.active_forms}</Badge>,
    },
    {
      key: "assignments",
      header: "Assignments",
      value: (project) => String(project.active_assignments),
      render: (project) => (
        <Badge tone="neutral">{project.active_assignments}</Badge>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      value: (project) => String(project.progress_percent),
      render: (project) => `${project.progress_percent}%`,
    },
    {
      key: "health",
      header: "Health",
      value: (project) => project.health_status,
      render: (project) => (
        <Badge tone={healthTone(project.health_status)}>
          {project.health_status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (project) => (
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => openProject(project)}
            size="sm"
            variant="secondary"
          >
            View
          </Button>
          <Button
            disabled={!canManageProjects}
            onClick={() => openProjectEditor(project)}
            size="sm"
            variant="ghost"
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <OptionSetsProvider token={token}>
    <section className="space-y-3">
      <div className="module-header rounded-xl p-3.5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="monitor">OPERATIONS</Badge>
              <button
                className="rounded-full"
                onClick={() => {
                  if (summary.attention_projects) {
                    openAttentionProject();
                    return;
                  }
                  selectSection("all");
                }}
                type="button"
              >
                <Badge tone={summary.attention_projects ? "warning" : "success"}>
                  {summary.attention_projects
                    ? `${summary.attention_projects} need attention`
                    : "Projects healthy"}
                </Badge>
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Projects
              </h1>
              <HelpHint label="About Projects" title="Projects">
                Plan, monitor, govern, and connect project workspaces to forms,
                teams, locations, metrics, assignments, submissions, reports,
                and audit trails.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canManageProjects}
              onClick={() => openProjectWizard()}
              variant="primary"
            >
              <Plus aria-hidden="true" />
              Create project
            </Button>
            <Button
              onClick={() =>
                downloadCsv(
                  "atlas-projects.csv",
                  projects.map((project) => ({
                    name: project.name,
                    code: project.project_code,
                    status: project.status,
                    donor: project.donor ?? "",
                    region: project.region ?? "",
                    progress: project.progress_percent,
                    health: project.health_status,
                  })),
                )
              }
              variant="secondary"
            >
              <Download aria-hidden="true" />
              Export
            </Button>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto product-scrollbar">
          {projectSections.map((section) => (
            <button
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                activeSection === section.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-panel hover:bg-muted",
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

      {selectedProjectId && detail ? (
        <ProjectDetailWorkspace
          detail={detail}
          canManageProjects={canManageProjects}
          installSectorFormsPending={installSectorFormsMutation.isPending}
          installSectorIndicatorsPending={installSectorIndicatorsMutation.isPending}
          installSectorReportsPending={installSectorReportsMutation.isPending}
          isSavingSettings={updateProjectSettingsMutation.isPending}
          onClose={() => setSelectedProjectId(null)}
          onEditProject={() => {
            const selectedProject = projects.find((project) => project.id === detail.id);
            if (selectedProject) openProjectEditor(selectedProject);
          }}
          onInstallSectorForms={() => {
            if (preview) {
              pushToast({
                title: "Starter forms preview",
                description:
                  "In production this installs editable draft forms from the selected sector pack.",
                tone: "neutral",
              });
              return;
            }
            installSectorFormsMutation.mutate(detail.id);
          }}
          onInstallSectorIndicators={() => {
            if (preview) {
              pushToast({
                title: "Metric templates preview",
                description:
                  "In production this installs editable metric templates from the selected sector pack.",
                tone: "neutral",
              });
              return;
            }
            installSectorIndicatorsMutation.mutate(detail.id);
          }}
          onInstallSectorReports={() => {
            if (preview) {
              pushToast({
                title: "Report templates preview",
                description:
                  "In production this installs editable report packages from the selected sector pack.",
                tone: "neutral",
              });
              return;
            }
            installSectorReportsMutation.mutate(detail.id);
          }}
          onOpenForms={() => {
            setActiveView("forms");
            router.push("/forms");
          }}
          onOpenBeneficiaries={() => {
            setActiveView("beneficiaries");
            router.push(`/projects/${detail.id}/beneficiaries`);
          }}
          onOpenIndicators={() => {
            setActiveView("indicators");
            router.push("/indicators");
          }}
          onOpenMapping={() => {
            setActiveView("map");
            router.push("/mapping");
          }}
          onOpenReports={() => {
            setActiveView("analytics");
            router.push("/reports");
          }}
          onOpenSubmissions={() => {
            setActiveView("submissions");
            router.push("/submissions");
          }}
          onOpenTeams={() => {
            setActiveView("organizations");
            router.push("/users-teams");
          }}
          onUpdateSettings={saveProjectSettings}
          preview={preview}
          tab={activeTab}
          setTab={setActiveTab}
          token={token}
        />
      ) : null}

      {!selectedProjectId && activeSection === "dashboard" ? (
        <ProjectsDashboard
          onOpenEntities={() => router.push("/beneficiaries")}
          onOpenForms={() => router.push("/forms")}
          projects={projects}
          onOpenIndicators={() => router.push("/indicators")}
          summary={summary}
          onOpenProject={openProject}
          onOpenSection={selectSection}
          onOpenStatusGroup={selectStatusGroup}
          onOpenSubmissions={() => router.push("/submissions")}
        />
      ) : null}

      {!selectedProjectId && activeSection === "all" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {statusGroupChips.map((chip) => (
              <button
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
                  statusGroup === chip.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-panel hover:bg-muted",
                )}
                key={chip.id || "all"}
                onClick={() => selectStatusGroup(chip.id)}
                type="button"
              >
                {chip.label}
                <span className="ml-1.5 text-[11px] opacity-70">
                  {filterProjects(projects, chip.id || "all").length}
                </span>
              </button>
            ))}
          </div>
          <ProjectFilters
            filters={projectFilters}
            onChange={setProjectFilters}
            projects={visibleProjects}
          />
          <DataTable
            columns={projectColumns}
            emptyAction={
              canManageProjects
                ? { label: "Create project", onClick: () => openProjectWizard() }
                : undefined
            }
            emptyDescription="Projects hold your forms, field teams, entities, metrics, and reports. Create one to set up the operating context first."
            emptyLabel="No projects match this view yet"
            rows={filteredProjects}
            searchLabel="Search projects, funders, clients, owners, countries"
            title="Project list"
          />
        </section>
      ) : null}

      {!selectedProjectId && activeSection === "templates" ? (
        <TemplatesSection
          templates={templates}
          onUseTemplate={(template) => {
            openProjectWizard({
              ...defaultProjectDraft,
              name: template.name,
              project_code: projectCodeFromName(template.name),
              program_type: template.template_type,
            });
          }}
        />
      ) : null}

      <ProjectWizard
        canSubmit={
          canManageProjects &&
          Boolean(
            projectDraft.name.trim() &&
            (
              projectDraft.project_code ||
              projectCodeFromName(projectDraft.name)
            ).trim(),
          ) &&
          !createProjectMutation.isPending &&
          !updateProjectMutation.isPending
        }
        canImportLocations={canManageOrganization && enabled}
        draft={projectDraft}
        error={projectWizardError}
        importingLocations={importUnitsMutation.isPending}
        isEditing={Boolean(editingProjectId)}
        isSubmitting={createProjectMutation.isPending || updateProjectMutation.isPending}
        onChange={setProjectDraft}
        onImportLocations={(file) => importUnitsMutation.mutate(file)}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) setProjectWizardError("");
        }}
        onSubmit={submitProject}
        open={wizardOpen}
        sectorPacks={sectorPacks}
        step={wizardStep}
        setStep={setWizardStep}
      />
    </section>
    </OptionSetsProvider>
  );
}

function ProjectsDashboard({
  onOpenEntities,
  onOpenForms,
  onOpenIndicators,
  onOpenProject,
  onOpenSection,
  onOpenStatusGroup,
  onOpenSubmissions,
  projects,
  summary,
}: {
  onOpenEntities: () => void;
  onOpenForms: () => void;
  onOpenIndicators: () => void;
  onOpenProject: (project: ProjectListItemRead) => void;
  onOpenSection: (section: ProjectSection) => void;
  onOpenStatusGroup: (group: StatusGroup) => void;
  onOpenSubmissions: () => void;
  projects: ProjectListItemRead[];
  summary: ProjectSummaryRead;
}) {
  const cards = [
    { icon: Layers3, label: "Total Projects", onClick: () => onOpenStatusGroup(""), value: summary.total_projects },
    {
      icon: CheckCircle2,
      label: "Active Projects",
      onClick: () => onOpenStatusGroup("active"),
      value: summary.active_projects,
    },
    {
      icon: ClipboardList,
      label: "Draft Projects",
      onClick: () => onOpenStatusGroup("draft"),
      value: summary.draft_projects,
    },
    { icon: Archive, label: "Closed Projects", onClick: () => onOpenStatusGroup("closed"), value: summary.closed_projects },
    {
      icon: UsersRound,
      label: "Entities",
      onClick: onOpenEntities,
      value: summary.total_beneficiaries,
    },
    {
      icon: FileChartColumn,
      label: "Submissions",
      onClick: onOpenSubmissions,
      value: summary.total_submissions,
    },
    { icon: BarChart3, label: "Active Forms", onClick: onOpenForms, value: summary.active_forms },
    {
      icon: Target,
      label: "Metric Rate",
      onClick: onOpenIndicators,
      value: `${summary.indicator_achievement_rate}%`,
    },
  ];
  const rankedProjects = [...projects]
    .sort((left, right) => right.health_score - left.health_score)
    .slice(0, 4);
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <KpiShard
            key={card.label}
            icon={card.icon}
            label={card.label}
            onClick={card.onClick}
            value={card.value}
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-border-subtle bg-surface-container-lowest p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
          <h2 className="font-semibold">Project Health Overview</h2>
          <div className="mt-4 space-y-3">
            {rankedProjects.length === 0 ? (
              <EmptyMini
                icon={Layers3}
                label="No projects yet. Create your first project to track its health, team, and progress here."
              />
            ) : null}
            {rankedProjects.map((project) => (
              <button
                className="w-full rounded-xl border bg-background/50 p-3 text-left transition hover:bg-muted/50"
                key={project.id}
                onClick={() => onOpenProject(project)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.project_code} · {project.region ?? "All regions"}
                    </p>
                  </div>
                  <Badge tone={healthTone(project.health_status)}>
                    {project.health_score}%
                  </Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${project.health_score}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-container-lowest p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
          <h2 className="font-semibold">Upcoming Deadlines & Risk Alerts</h2>
          <div className="mt-4 space-y-3">
            <Signal
              label="Completion rate"
              value={`${summary.project_completion_rate}%`}
            />
            <Signal
              label="Field officers active"
              value={`${summary.active_field_officers}`}
            />
            <Signal
              label="Risk alerts"
              value={`${summary.risk_alerts}`}
              tone={summary.risk_alerts ? "warning" : "success"}
            />
          </div>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <InsightCard
          icon={Globe2}
          title="Geographic Coverage"
          emptyLabel="Coverage appears here once projects have a country or region set."
          lines={projects
            .slice(0, 4)
            .map(
              (project) =>
                `${project.name}: ${project.country ?? project.region ?? "All areas"}`,
            )}
        />
        <InsightCard
          icon={CalendarClock}
          title="Recent Project Activity"
          emptyLabel="Recent edits and updates to your projects will show up here."
          lines={projects
            .slice(0, 4)
            .map(
              (project) =>
                `${project.name} updated ${formatDate(project.updated_at)}`,
            )}
        />
        <InsightCard
          icon={Flag}
          title="Status Distribution"
          lines={[
            `${summary.active_projects} active`,
            `${summary.draft_projects} draft`,
            `${summary.closed_projects} closed`,
            `${summary.attention_projects} need attention`,
          ]}
        />
      </div>
    </div>
  );
}

function ProjectDetailWorkspace({
  canManageProjects,
  detail,
  installSectorFormsPending,
  installSectorIndicatorsPending,
  installSectorReportsPending,
  isSavingSettings,
  onClose,
  onEditProject,
  onInstallSectorForms,
  onInstallSectorIndicators,
  onInstallSectorReports,
  onOpenForms,
  onOpenBeneficiaries,
  onOpenIndicators,
  onOpenMapping,
  onOpenReports,
  onOpenSubmissions,
  onOpenTeams,
  onUpdateSettings,
  preview,
  setTab,
  tab,
  token,
}: {
  canManageProjects: boolean;
  detail: ProjectDetailRead;
  installSectorFormsPending: boolean;
  installSectorIndicatorsPending: boolean;
  installSectorReportsPending: boolean;
  isSavingSettings: boolean;
  onClose: () => void;
  onEditProject: () => void;
  onInstallSectorForms: () => void;
  onInstallSectorIndicators: () => void;
  onInstallSectorReports: () => void;
  onOpenForms: () => void;
  onOpenBeneficiaries: () => void;
  onOpenIndicators: () => void;
  onOpenMapping: () => void;
  onOpenReports: () => void;
  onOpenSubmissions: () => void;
  onOpenTeams: () => void;
  onUpdateSettings: (settings: Record<string, unknown>) => void;
  preview: boolean;
  setTab: (tab: ProjectTab) => void;
  tab: ProjectTab;
  token: string | null;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(detail.status)}>{detail.status}</Badge>
            <Badge tone={healthTone(detail.health_status)}>
              {detail.health_status} · {detail.health_score}%
            </Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold">{detail.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail.project_code} · {detail.donor ?? "No funder/client set"} ·{" "}
            {detail.region ?? "All regions"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageProjects ? (
            <Button onClick={onEditProject} variant="primary">
              Edit project
            </Button>
          ) : null}
          <Button onClick={onClose} variant="secondary">
            Back to list
          </Button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto product-scrollbar">
        {projectTabs.map((item) => (
          <button
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
              tab === item
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
            key={item}
            onClick={() => setTab(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Overview" ? (
        <ProjectOverview
          canManageProjects={canManageProjects}
          detail={detail}
          installSectorFormsPending={installSectorFormsPending}
          installSectorIndicatorsPending={installSectorIndicatorsPending}
          installSectorReportsPending={installSectorReportsPending}
          onInstallSectorForms={onInstallSectorForms}
          onInstallSectorIndicators={onInstallSectorIndicators}
          onInstallSectorReports={onInstallSectorReports}
          onSelectTab={setTab}
        />
      ) : null}
      {tab === "Entities" ? (
        <ProjectBeneficiariesPanel
          onOpenRegistry={onOpenBeneficiaries}
          preview={preview}
          projectId={detail.id}
          token={token}
        />
      ) : null}
      {tab === "Linked work" ? (
        <div className="space-y-5">
          <p className="rounded-xl border border-dashed bg-muted/20 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
            Forms, metrics, locations, teams, submissions, and reports stay in
            their own workspaces so they remain reusable. This tab shows how each
            one is linked to this project and lets you jump straight there.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <RelatedTab
              actionLabel="Open Forms"
              description="Forms are managed in the Forms module. This shows the project relationship only."
              onAction={onOpenForms}
              records={detail.forms}
              title="Forms"
            />
            <RelatedTab
              actionLabel="Open Metrics"
              description="Metrics stay reusable and are tracked in the Metrics workspace for KPI and results tracking."
              onAction={onOpenIndicators}
              records={detail.indicators}
              title="Metrics"
            />
            <RelatedTab
              actionLabel="Open Mapping"
              description="Projects consume mapping boundaries and coverage; GIS tools remain in Mapping."
              onAction={onOpenMapping}
              records={detail.locations}
              title="Locations"
            />
            <RelatedTab
              actionLabel="Open Users & Teams"
              description="Project teams reference Users & Teams without duplicating identity management."
              onAction={onOpenTeams}
              records={detail.teams}
              title="Teams"
            />
            <RelatedTab
              description="Assignments are operational activities owned by Field Operations."
              records={detail.assignments}
              title="Assignments"
            />
            <RelatedTab
              actionLabel="Open Submissions"
              description="Collected records are reviewed in Submissions; this shows project-level counts and recent records."
              onAction={onOpenSubmissions}
              records={detail.submissions}
              title="Submissions"
            />
            <RelatedTab
              actionLabel="Open Reports"
              description="Project reports, metric reports, and coverage reports are produced in Reports."
              onAction={onOpenReports}
              records={detail.reports}
              title="Reports"
            />
          </div>
        </div>
      ) : null}
      {tab === "Settings & Governance" ? (
        <div className="space-y-4">
          <ProjectSettings
            canManageProjects={canManageProjects}
            detail={detail}
            isSaving={isSavingSettings}
            onUpdateSettings={onUpdateSettings}
            token={token}
          />
          <SectionHeader
            description="Default approval workflow, consent, retention, and entity rules applied to this project."
            title="Governance"
          />
          <ProjectGovernance detail={detail} />
          <SectionHeader
            description="Validation coverage, GPS quality, and duplicate review for this project."
            title="Data Quality"
          />
          <ProjectDataQuality detail={detail} />
          <SectionHeader
            description="Bring external data into this project or migrate records between systems."
            title="Data Import & Migration"
          />
          <ImportsMigrationModule mode="project" projectId={detail.id} token={token} />
          <SectionHeader
            description="Immutable record of changes made to this project."
            title="Audit Trail"
          />
          <AuditTrail detail={detail} />
        </div>
      ) : null}
    </section>
  );
}

function ProjectOverview({
  canManageProjects,
  detail,
  installSectorFormsPending,
  installSectorIndicatorsPending,
  installSectorReportsPending,
  onInstallSectorForms,
  onInstallSectorIndicators,
  onInstallSectorReports,
  onSelectTab,
}: {
  canManageProjects: boolean;
  detail: ProjectDetailRead;
  installSectorFormsPending: boolean;
  installSectorIndicatorsPending: boolean;
  installSectorReportsPending: boolean;
  onInstallSectorForms: () => void;
  onInstallSectorIndicators: () => void;
  onInstallSectorReports: () => void;
  onSelectTab: (tab: ProjectTab) => void;
}) {
  const health = projectHealthSummary(detail);
  const settingsDraft = { settings_json: detail.settings_json ?? {} };
  const sectorSettings = sectionSettings(settingsDraft, "sector");
  const sectorName =
    (typeof sectorSettings.name === "string" && sectorSettings.name) ||
    detail.sector_name ||
    "Custom sector";
  const sectorFormTemplates = Array.isArray(sectorSettings.formTemplates)
    ? sectorSettings.formTemplates.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const sectorIndicatorTemplates = Array.isArray(sectorSettings.indicatorTemplates)
    ? sectorSettings.indicatorTemplates.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const sectorInstalled =
    typeof sectorSettings.installed === "object" &&
    sectorSettings.installed !== null &&
    !Array.isArray(sectorSettings.installed)
      ? (sectorSettings.installed as Record<string, unknown>)
      : {};
  const sectorFormsInstalled =
    typeof sectorInstalled.forms === "object" &&
    sectorInstalled.forms !== null &&
    "installed" in sectorInstalled.forms;
  const sectorIndicatorsInstalled =
    typeof sectorInstalled.indicators === "object" &&
    sectorInstalled.indicators !== null &&
    "installed" in sectorInstalled.indicators;
  const sectorReportsInstalled =
    typeof sectorInstalled.reports === "object" &&
    sectorInstalled.reports !== null &&
    "installed" in sectorInstalled.reports;
  const beneficiaryType =
    settingText(settingsDraft, "beneficiary", "primaryEntityType") ||
    "Not configured";
  const approvalWorkflow =
    settingText(settingsDraft, "governance", "approvalWorkflow") ||
    "Not configured";
  const formJourney = topLevelStringList(detail.settings_json, "formJourney");
  const overviewCards: {
    label: string;
    value: string;
    tab: ProjectTab;
    tone?: "success" | "warning" | "danger" | "neutral";
  }[] = [
    {
      label: "Entities",
      tab: "Entities",
      value: `${detail.beneficiary_count}`,
    },
    { label: "Forms", tab: "Linked work", value: `${detail.active_forms}` },
    {
      label: "Assignments",
      tab: "Linked work",
      value: `${detail.active_assignments}`,
    },
    {
      label: "Submissions",
      tab: "Linked work",
      value: `${detail.total_submissions}`,
    },
    {
      label: "Metrics",
      tab: "Linked work",
      value: `${detail.indicator_count}`,
    },
    {
      label: "Data Quality",
      tab: "Settings & Governance",
      tone: health.qualityTone,
      value: health.qualityLabel,
    },
    {
      label: "Coverage",
      tab: "Linked work",
      value: detail.region ?? detail.country ?? "All areas",
    },
    {
      label: "Field Officers",
      tab: "Linked work",
      value: `${detail.teams.length || detail.active_assignments}`,
    },
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-background/50 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="support">Sector setup</Badge>
              <Badge tone={detail.sector_id ? "success" : "warning"}>
                {detail.sector_id ? sectorName : "No sector selected"}
              </Badge>
            </div>
            <h3 className="mt-2 font-semibold">
              Project setup checklist
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Use the sector pack to install editable forms and metrics,
              then assign teams, publish forms, and sync field officers. The
              project remains customizable for funder, client, and local requirements.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canManageProjects || !detail.sector_id || installSectorFormsPending}
              onClick={onInstallSectorForms}
              size="sm"
              variant={sectorFormsInstalled || detail.active_forms ? "secondary" : "primary"}
            >
              {installSectorFormsPending
                ? "Installing forms..."
                : sectorFormsInstalled || detail.active_forms
                  ? "Install/update forms"
                  : "Install starter forms"}
            </Button>
            <Button
              disabled={!canManageProjects || !detail.sector_id || installSectorIndicatorsPending}
              onClick={onInstallSectorIndicators}
              size="sm"
              variant={sectorIndicatorsInstalled || detail.indicator_count ? "secondary" : "primary"}
            >
              {installSectorIndicatorsPending
                ? "Installing metrics..."
                : sectorIndicatorsInstalled || detail.indicator_count
                  ? "Install/update metrics"
                : "Install metrics"}
            </Button>
            <Button
              disabled={!canManageProjects || !detail.sector_id || installSectorReportsPending}
              onClick={onInstallSectorReports}
              size="sm"
              variant={sectorReportsInstalled || detail.reports.length ? "secondary" : "primary"}
            >
              {installSectorReportsPending
                ? "Installing reports..."
                : sectorReportsInstalled || detail.reports.length
                  ? "Install/update reports"
                  : "Install reports"}
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-7">
          {[
            ["Sector", detail.sector_id ? "Ready" : "Select pack", Boolean(detail.sector_id), "Overview"],
            ["Forms", detail.active_forms || sectorFormsInstalled ? "Ready" : "Install", Boolean(detail.active_forms || sectorFormsInstalled), "Linked work"],
            ["Metrics", detail.indicator_count || sectorIndicatorsInstalled ? "Ready" : "Install", Boolean(detail.indicator_count || sectorIndicatorsInstalled), "Linked work"],
            ["Reports", detail.reports.length || sectorReportsInstalled ? "Ready" : "Install", Boolean(detail.reports.length || sectorReportsInstalled), "Linked work"],
            ["Teams", detail.teams.length || detail.active_assignments ? "Assigned" : "Assign", Boolean(detail.teams.length || detail.active_assignments), "Linked work"],
            ["Governance", approvalWorkflow !== "Not configured" ? "Ready" : "Configure", approvalWorkflow !== "Not configured", "Settings & Governance"],
            ["Mobile", detail.active_assignments && detail.active_forms ? "Ready" : "Assign work", Boolean(detail.active_assignments && detail.active_forms), "Linked work"],
          ].map(([label, value, ready, target]) => (
            <button
              className="rounded-xl border bg-panel p-3 text-left transition hover:border-primary hover:bg-primary/5"
              key={String(label)}
              onClick={() => onSelectTab(target as ProjectTab)}
              type="button"
            >
              <Badge tone={ready ? "success" : "warning"}>
                {ready ? "Done" : "Next"}
              </Badge>
              <p className="mt-2 text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-semibold">{value}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border bg-background/50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">Project Summary</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {detail.description ??
                  "Project metadata is ready for ownership, locations, metrics, teams, forms, and governance setup."}
              </p>
            </div>
            <Badge tone={health.tone}>
              {health.score}% · {health.label}
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => (
              <button
                className="rounded-xl border bg-background/50 p-3 text-left transition hover:border-primary hover:bg-primary/5"
                key={card.label}
                onClick={() => onSelectTab(card.tab)}
                type="button"
              >
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p
                  className={cn(
                    "mt-1 truncate text-sm font-semibold",
                    card.tone === "warning" && "text-warning",
                    card.tone === "danger" && "text-danger",
                    card.tone === "success" && "text-success",
                  )}
                >
                  {card.value}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Signal label="Sector" value={sectorName} tone="success" />
            <Signal
              label="Primary entity"
              value={beneficiaryType}
              tone={beneficiaryType === "Not configured" ? "warning" : "success"}
            />
            <Signal
              label="Approval workflow"
              value={approvalWorkflow}
              tone={approvalWorkflow === "Not configured" ? "warning" : "success"}
            />
            <Signal
              label="Progress"
              value={`${detail.progress_percent}%`}
              tone={detail.progress_percent < 40 ? "warning" : "success"}
            />
          </div>
        </div>
        <div className="rounded-2xl border bg-background/50 p-5">
          <h3 className="font-semibold">Coverage Map Preview</h3>
          <button
            className="mt-4 grid min-h-64 w-full place-items-center rounded-2xl border bg-[radial-gradient(circle_at_25%_25%,rgba(20,184,166,0.18),transparent_28%),linear-gradient(135deg,rgba(34,197,94,0.15),rgba(15,23,42,0.04))] p-5 text-center transition hover:border-primary"
            onClick={() => onSelectTab("Linked work")}
            type="button"
          >
            <div>
              <MapPinned
                aria-hidden="true"
                className="mx-auto text-primary"
                size={34}
              />
              <p className="mt-3 font-semibold">
                {detail.region ?? detail.country ?? "Assigned project areas"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Open Locations for boundaries, layers, GPS validation, and
                spatial analysis.
              </p>
            </div>
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <InfoPanel
          title="Sector Pack"
          lines={[
            sectorName,
            sectorFormTemplates.length
              ? `${sectorFormTemplates.slice(0, 2).join(", ")} forms`
              : "Custom form templates",
            sectorIndicatorTemplates.length
              ? `${sectorIndicatorTemplates.slice(0, 2).join(", ")} metrics`
              : "Custom metrics",
          ]}
          onClick={() => onSelectTab("Linked work")}
        />
        <InfoPanel
          title="Entity Journey"
          lines={
            formJourney.length
              ? formJourney
              : [
                  "Registration before assessment",
                  "Assessment before follow-up",
                  "Follow-up before reporting",
                ]
          }
          onClick={() => onSelectTab("Settings & Governance")}
        />
        <InfoPanel
          title="Project Health Inputs"
          lines={[
            "Coverage and submissions",
            "Data quality and approvals",
            "Metric and assignment progress",
          ]}
          onClick={() => onSelectTab("Settings & Governance")}
        />
        <InfoPanel
          title="Source Tracking"
          lines={submissionSourceOptions}
          onClick={() => onSelectTab("Linked work")}
        />
      </div>
    </div>
  );
}

function projectHealthSummary(detail: ProjectDetailRead): {
  label: string;
  qualityLabel: string;
  qualityTone: "success" | "warning" | "danger" | "neutral";
  score: number;
  tone: "success" | "warning" | "danger" | "neutral";
} {
  const score = detail.health_score || Math.round(
    (detail.progress_percent + Math.min(detail.total_submissions, 100)) / 2,
  );
  if (score >= 85) {
    return {
      label: "Excellent",
      qualityLabel: "Low risk",
      qualityTone: "success",
      score,
      tone: "success",
    };
  }
  if (score >= 65) {
    return {
      label: "Good",
      qualityLabel: "Review",
      qualityTone: "warning",
      score,
      tone: "success",
    };
  }
  if (score >= 40) {
    return {
      label: "Needs Attention",
      qualityLabel: "Issues",
      qualityTone: "warning",
      score,
      tone: "warning",
    };
  }
  return {
    label: "Critical",
    qualityLabel: "High risk",
    qualityTone: "danger",
    score,
    tone: "danger",
  };
}

function InfoPanel({
  lines,
  onClick,
  title,
}: {
  lines: string[];
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className="rounded-2xl border bg-background/50 p-4 text-left transition hover:border-primary hover:bg-primary/5"
      onClick={onClick}
      type="button"
    >
      <p className="font-semibold">{title}</p>
      <div className="mt-3 space-y-1.5">
        {lines.map((line) => (
          <p className="text-xs text-muted-foreground" key={line}>
            {line}
          </p>
        ))}
      </div>
    </button>
  );
}

function ProjectDataQuality({ detail }: { detail: ProjectDetailRead }) {
  const health = projectHealthSummary(detail);
  const items = [
    ["Duplicate Review", detail.beneficiary_count > 0 ? "Tracked in Entities" : "No entities yet"],
    ["Missing data checks", detail.total_submissions ? "Active" : "Waiting for data"],
    ["GPS issues", detail.total_submissions ? "Tracked in Data Quality" : "No submissions yet"],
    ["Validation failures", detail.total_submissions ? "Review queue enabled" : "No issues yet"],
    ["Quality score", `${health.score}%`],
    ["Approval impact", "Only approved records count toward results"],
  ];
  return (
    <div className="rounded-2xl border bg-background/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Project Data Quality</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Project-level quality checks summarize duplicates, missing values,
            GPS issues, validation failures, and approval readiness.
          </p>
        </div>
        <Badge tone={health.qualityTone}>{health.qualityLabel}</Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {items.map(([label, value]) => (
          <Signal key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

function ProjectGovernance({ detail }: { detail: ProjectDetailRead }) {
  const settingsDraft = { settings_json: detail.settings_json ?? {} };
  const governanceItems = [
    ["Approval Workflow", settingText(settingsDraft, "governance", "approvalWorkflow") || "Submitted → Under Review → Approved"],
    ["Consent Policy", settingText(settingsDraft, "governance", "consentPolicy") || "Set consent rules during project setup"],
    ["Retention Rule", settingText(settingsDraft, "governance", "retentionRule") || "Use organization retention policy"],
    ["Export Rule", settingText(settingsDraft, "governance", "exportRule") || "Exports require permission and audit logging"],
    ["Sensitive Data", settingText(settingsDraft, "governance", "sensitiveDataControls") || "Mask sensitive fields for restricted roles"],
    [
      "Approved Data Only",
      settingBoolean(settingsDraft, "governance", "approvedDataOnly", true)
        ? "Entities, metrics, and reports use approved records"
        : "Draft policy allows unapproved data where configured",
    ],
  ];
  const beneficiaryItems = [
    ["Primary Entity", settingText(settingsDraft, "beneficiary", "primaryEntityType") || "Not configured"],
    ["Code Format", settingText(settingsDraft, "beneficiary", "codeFormat") || "REC-YYYY-000001"],
    [
      "Duplicate Checks",
      settingStringList(settingsDraft, "beneficiary", "duplicateFields").join(", ") ||
        "External ID, name + location, GPS",
    ],
    ["Profile Update Rule", settingText(settingsDraft, "beneficiary", "profileUpdateRule") || "Require review for identity and critical field changes"],
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-2xl border bg-background/50 p-5">
        <h3 className="font-semibold">Governance Defaults</h3>
        <div className="mt-4 grid gap-3">
          {governanceItems.map(([label, value]) => (
            <Signal key={label} label={label} value={value} />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border bg-background/50 p-5">
        <h3 className="font-semibold">Entity Rules</h3>
        <div className="mt-4 grid gap-3">
          {beneficiaryItems.map(([label, value]) => (
            <Signal key={label} label={label} value={value} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RelatedTab({
  actionLabel,
  description,
  onAction,
  records,
  title,
}: {
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  records: ProjectRelatedRecordRead[];
  title: string;
}) {
  return (
    <div className="rounded-2xl border bg-background/50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{title}</h3>
            <HelpHint label={`About ${title}`} title={title}>
              {description}
            </HelpHint>
          </div>
        </div>
        {actionLabel && onAction ? (
          <Button onClick={onAction} variant="secondary">
            {actionLabel}
          </Button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {records.map((record) => (
          <div className="rounded-xl border bg-panel p-4" key={record.id}>
            <Badge tone={statusTone(record.status)}>{record.status}</Badge>
            <p className="mt-3 font-medium">{record.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {record.metric ?? record.category ?? "Project relationship"}
            </p>
          </div>
        ))}
        {!records.length ? (
          <EmptyMini icon={ClipboardList} label="No records are attached yet." />
        ) : null}
      </div>
    </div>
  );
}

function ProjectSettings({
  canManageProjects,
  detail,
  isSaving,
  onUpdateSettings,
  token,
}: {
  canManageProjects: boolean;
  detail: ProjectDetailRead;
  isSaving: boolean;
  onUpdateSettings: (settings: Record<string, unknown>) => void;
  token: string | null;
}) {
  const [settings, setSettings] = useState<Record<string, unknown>>(() =>
    sanitizeProjectSettings(detail.settings_json),
  );

  useEffect(() => {
    setSettings(sanitizeProjectSettings(detail.settings_json));
  }, [detail.id, detail.settings_json]);

  const draft = { settings_json: settings };
  const sectorSettings = sectionSettings(draft, "sector");
  const beneficiarySettings = sectionSettings(draft, "beneficiary");
  const terminology =
    typeof sectorSettings.terminology === "object" &&
    sectorSettings.terminology !== null &&
    !Array.isArray(sectorSettings.terminology)
      ? (sectorSettings.terminology as Record<string, unknown>)
      : {};
  const sectorName =
    settingText(draft, "sector", "name") || detail.sector_name || "Custom sector";
  const setSection = (section: string, patch: Record<string, unknown>): void => {
    setSettings((current) => {
      const currentSection =
        typeof current[section] === "object" &&
        current[section] !== null &&
        !Array.isArray(current[section])
          ? (current[section] as Record<string, unknown>)
          : {};
      return {
        ...current,
        [section]: {
          ...currentSection,
          ...patch,
        },
      };
    });
  };
  const setSector = (patch: Record<string, unknown>): void =>
    setSection("sector", patch);
  const setTerminology = (key: string, value: string): void => {
    setSector({ terminology: { ...terminology, [key]: value } });
  };
  const setSectorList = (key: string, value: string): void =>
    setSector({ [key]: splitLines(value) });
  const setBeneficiary = (patch: Record<string, unknown>): void =>
    setSection("beneficiary", patch);
  const categoriesQuery = useQuery({
    enabled: Boolean(token && token !== "preview-token"),
    queryFn: () => listEntityCategories(token ?? "", { include_archived: true, project_id: detail.id }),
    queryKey: ["entity-categories", token, detail.id],
  });
  const libraryQuery = useQuery({
    enabled: Boolean(token && token !== "preview-token"),
    queryFn: () => listPredefinedEntityCategories(token ?? ""),
    queryKey: ["entity-category-library", token],
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Project Status", detail.status],
          ["Ownership", detail.owner ?? "Unassigned"],
          ["Default Locations", detail.region ?? detail.country ?? "All areas"],
          ["Default Teams", `${detail.teams.length} assigned team(s)`],
        ].map(([label, value]) => (
          <Signal key={label} label={label} value={value} />
        ))}
      </div>

      <div className="rounded-2xl border bg-background/50 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Badge tone="support">Sector Pack Manager</Badge>
            <h3 className="mt-2 font-semibold">{sectorName}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Customize this project&apos;s sector pack before installing or updating
              starter forms, metrics, dashboards, and reports. These settings
              stay inside the project and do not create another module.
            </p>
          </div>
          <Button
            disabled={!canManageProjects || isSaving}
            onClick={() => onUpdateSettings(settings)}
            variant="primary"
          >
            {isSaving ? "Saving..." : "Save sector pack"}
          </Button>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-3">
            <div className="rounded-xl border bg-panel p-3">
              <h4 className="text-sm font-semibold">Terminology</h4>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Set the words this project uses so agriculture, health, education,
                infrastructure, retail, logistics, audits, and custom projects do not all have to
                sound like beneficiary-only programs.
              </p>
              <div className="mt-3 grid gap-2">
                <FieldInput
                  disabled={!canManageProjects}
                  label="Primary entity name"
                  onChange={(event) =>
                    setTerminology("primary_entity", event.target.value)
                  }
                  value={String(terminology.primary_entity ?? "")}
                />
                <FieldInput
                  disabled={!canManageProjects}
                  label="Secondary entities"
                  onChange={(event) =>
                    setTerminology("secondary_entities", event.target.value)
                  }
                  value={String(terminology.secondary_entities ?? "")}
                />
                <FieldInput
                  disabled={!canManageProjects}
                  label="Field visit label"
                  onChange={(event) =>
                    setTerminology("field_visit", event.target.value)
                  }
                  value={String(terminology.field_visit ?? "")}
                />
                <FieldInput
                  disabled={!canManageProjects}
                  label="Submission label"
                  onChange={(event) =>
                    setTerminology("submission", event.target.value)
                  }
                  value={String(terminology.submission ?? "")}
                />
                <FieldInput
                  disabled={!canManageProjects}
                  label="Registry label"
                  onChange={(event) =>
                    setTerminology("registry", event.target.value)
                  }
                  value={String(terminology.registry ?? "")}
                />
                <FieldInput
                  disabled={!canManageProjects}
                  label="Form label"
                  onChange={(event) =>
                    setTerminology("form", event.target.value)
                  }
                  value={String(terminology.form ?? "")}
                />
                <FieldInput
                  disabled={!canManageProjects}
                  label="Approval label"
                  onChange={(event) =>
                    setTerminology("approval", event.target.value)
                  }
                  value={String(terminology.approval ?? "")}
                />
                <FieldInput
                  disabled={!canManageProjects}
                  label="Report label"
                  onChange={(event) =>
                    setTerminology("report", event.target.value)
                  }
                  value={String(terminology.report ?? "")}
                />
              </div>
              <div className="mt-3 rounded-lg border bg-background/70 p-3 text-xs leading-5 text-muted-foreground">
                <p className="font-semibold text-foreground">Preview</p>
                <p className="mt-1">
                  {String(terminology.registry || "Registry")} tracks{" "}
                  {String(terminology.primary_entity || beneficiarySettings.primaryEntityType || "entities")}.
                  Field teams submit {String(terminology.submission || "records")} using{" "}
                  {String(terminology.form || "forms")}; managers complete{" "}
                  {String(terminology.approval || "review")} before data appears in{" "}
                  {String(terminology.report || "reports")}.
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-panel p-3">
              <h4 className="text-sm font-semibold">Entity controls</h4>
              <div className="mt-3 grid gap-2">
                <FieldInput
                  disabled={!canManageProjects}
                  label="Primary entity type"
                  onChange={(event) =>
                    setBeneficiary({ primaryEntityType: event.target.value })
                  }
                  value={String(beneficiarySettings.primaryEntityType ?? "")}
                />
                <BeneficiaryCodeFormatDesigner
                  disabled={!canManageProjects}
                  entityType={String(beneficiarySettings.primaryEntityType ?? "Record")}
                  onChange={(codeFormat) => setBeneficiary({ codeFormat })}
                  value={String(beneficiarySettings.codeFormat ?? "")}
                />
                <ListEditor
                  disabled={!canManageProjects}
                  label="Custom entity types"
                  onChange={(value) => setSectorList("entityTypes", value)}
                  value={joinLines(settingStringList(draft, "sector", "entityTypes"))}
                />
              </div>
            </div>

            <EntityCategoryManager
              canManage={canManageProjects}
              categories={categoriesQuery.data ?? []}
              detail={detail}
              isLoading={categoriesQuery.isLoading || libraryQuery.isLoading}
              library={libraryQuery.data ?? []}
              token={token}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ListEditor
              disabled={!canManageProjects}
              label="Custom form templates"
              onChange={(value) => setSectorList("formTemplates", value)}
              value={joinLines(settingStringList(draft, "sector", "formTemplates"))}
            />
            <ListEditor
              disabled={!canManageProjects}
              label="Custom metrics"
              onChange={(value) => setSectorList("indicatorTemplates", value)}
              value={joinLines(settingStringList(draft, "sector", "indicatorTemplates"))}
            />
            <ListEditor
              disabled={!canManageProjects}
              label="Validation rules"
              onChange={(value) => setSectorList("validationRules", value)}
              value={joinLines(settingStringList(draft, "sector", "validationRules"))}
            />
            <ListEditor
              disabled={!canManageProjects}
              label="Data quality rules"
              onChange={(value) => setSectorList("dataQualityRules", value)}
              value={joinLines(settingStringList(draft, "sector", "dataQualityRules"))}
            />
            <ListEditor
              disabled={!canManageProjects}
              label="Dashboard widgets"
              onChange={(value) => setSectorList("dashboardWidgets", value)}
              value={joinLines(settingStringList(draft, "sector", "dashboardWidgets"))}
            />
            <ListEditor
              disabled={!canManageProjects}
              label="Report templates"
              onChange={(value) => setSectorList("reportTemplates", value)}
              value={joinLines(settingStringList(draft, "sector", "reportTemplates"))}
            />
            <div className="md:col-span-2">
              <ListEditor
                disabled={!canManageProjects}
                label="Mobile field guidance"
                onChange={(value) => setSectorList("mobileGuidance", value)}
                value={joinLines(settingStringList(draft, "sector", "mobileGuidance"))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      <Input disabled={disabled} onChange={onChange} value={value} />
    </label>
  );
}

function BeneficiaryCodeFormatDesigner({
  disabled,
  entityType,
  onChange,
  value,
}: {
  disabled?: boolean;
  entityType: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const parts = parseBeneficiaryCodeFormat(value, entityType);
  const setParts = (patch: Partial<BeneficiaryCodeFormatParts>): void =>
    onChange(buildBeneficiaryCodeFormat({ ...parts, ...patch }));
  const preview = beneficiaryCodePreview(value, entityType);

  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-foreground">Entity code format</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Controls new entity codes created from approved submissions and imports.
          </p>
        </div>
        <Badge tone="support">{preview}</Badge>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-4">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Prefix
          <Input
            disabled={disabled}
            maxLength={12}
            onChange={(event) =>
              setParts({
                prefix:
                  event.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase() ||
                  defaultEntityCodePrefix(entityType),
              })
            }
            value={parts.prefix}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Separator
          <Select
            disabled={disabled}
            onChange={(event) =>
              setParts({ separator: event.target.value as BeneficiaryCodeFormatParts["separator"] })
            }
            value={parts.separator}
          >
            <option value="-">Dash (-)</option>
            <option value="/">Slash (/)</option>
            <option value="_">Underscore (_)</option>
          </Select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Sequence length
          <Select
            disabled={disabled}
            onChange={(event) => setParts({ digits: Number(event.target.value) })}
            value={String(parts.digits)}
          >
            {[4, 5, 6, 7, 8].map((digits) => (
              <option key={digits} value={digits}>
                {digits} digits
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 rounded-lg border bg-panel px-3 py-2 text-xs font-medium text-muted-foreground">
          <input
            checked={parts.includeYear}
            disabled={disabled}
            onChange={(event) => setParts({ includeYear: event.target.checked })}
            type="checkbox"
          />
          Include year
        </label>
      </div>
      <label className="mt-3 grid gap-1 text-xs font-medium text-muted-foreground">
        Advanced pattern
        <Input
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          placeholder="ENT-YYYY-000001 or PRD-YYYY-000001"
          value={value}
        />
      </label>
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
        Existing codes stay unchanged. Imports can keep a legacy ID separately while Atlas assigns this official ID.
      </p>
    </div>
  );
}

function EntityCategoryManager({
  canManage,
  categories,
  detail,
  isLoading,
  library,
  token,
}: {
  canManage: boolean;
  categories: EntityCategoryRead[];
  detail: ProjectDetailRead;
  isLoading: boolean;
  library: PredefinedEntityCategoryRead[];
  token: string | null;
}) {
  const queryClient = useQueryClient();
  const [customName, setCustomName] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const activeCategoryNames = new Set(categories.filter((category) => category.status !== "archived").map((category) => category.slug));
  const availablePresets = library.filter((category) => !activeCategoryNames.has(category.slug)).slice(0, 80);
  const activeCategories = categories.filter((category) => category.status !== "archived");
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const childCountById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const category of categories) {
      if (!category.parent_category_id) continue;
      counts.set(category.parent_category_id, (counts.get(category.parent_category_id) ?? 0) + 1);
    }
    return counts;
  }, [categories]);
  const categoryPath = useCallback((category: EntityCategoryRead): string => {
    const path: string[] = [category.name];
    const seen = new Set<string>([category.id]);
    let current = category.parent_category_id ? categoryById.get(category.parent_category_id) : undefined;
    while (current && !seen.has(current.id)) {
      path.unshift(current.name);
      seen.add(current.id);
      current = current.parent_category_id ? categoryById.get(current.parent_category_id) : undefined;
    }
    return path.join(" -> ");
  }, [categoryById]);
  const activeCategoriesSorted = useMemo(
    () => [...activeCategories].sort((left, right) => categoryPath(left).localeCompare(categoryPath(right))),
    [activeCategories, categoryPath],
  );
  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["entity-categories", token, detail.id] });
  };
  const activateMutation = useMutation({
    mutationFn: (slug: string) => activatePredefinedEntityCategory(token ?? "", detail.id, slug),
    onSuccess: () => void invalidate(),
  });
  const createMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string }) =>
      createEntityCategory(token ?? "", {
        attributes: [
          { field_key: "name", field_type: "text", label: "Name", required: true },
          { field_key: "status", field_type: "dropdown", label: "Status", options_json: ["active", "inactive", "archived"] },
          { field_key: "location", field_type: "text", label: "Location" },
        ],
        color: "#0f8a4b",
        description: `Custom ${name} entity category for ${detail.name}.`,
        icon: "layers",
        name,
        parent_category_id: parentId || null,
        project_id: detail.id,
        statuses_json: ["active", "inactive", "archived"],
      }),
    onSuccess: () => {
      setCustomName("");
      setParentCategoryId("");
      void invalidate();
    },
  });
  const archiveMutation = useMutation({
    mutationFn: (category: EntityCategoryRead) =>
      updateEntityCategory(token ?? "", category.id, { status: category.status === "archived" ? "active" : "archived" }),
    onSuccess: () => void invalidate(),
  });

  return (
    <div className="rounded-xl border bg-panel p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">Entity Category Manager</h4>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Define what this project tracks: people, institutions, assets, locations, groups, cases, or any custom record type.
          </p>
        </div>
        <Badge tone="support">{categories.filter((category) => category.status !== "archived").length} active</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {isLoading ? <p className="text-xs text-muted-foreground">Loading entity categories...</p> : null}
        {activeCategoriesSorted.slice(0, 8).map((category) => (
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/70 px-3 py-2" key={category.id}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                <p className="truncate text-sm font-medium">{category.name}</p>
                <Badge tone={category.status === "archived" ? "neutral" : "success"}>{category.status}</Badge>
                {childCountById.get(category.id) ? (
                  <Badge tone="neutral">{childCountById.get(category.id)} child</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {category.attributes.length} field(s) · {category.sector ?? "custom"} · {category.statuses_json.join(", ") || "standard workflow"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Category path: <span className="font-medium text-foreground">{categoryPath(category)}</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                New record code example: <span className="font-medium text-foreground">{beneficiaryCodePreview("", category.name)}</span>
              </p>
            </div>
            <Button
              disabled={!canManage || archiveMutation.isPending}
              onClick={() => archiveMutation.mutate(category)}
              size="sm"
              variant="ghost"
            >
              {category.status === "archived" ? "Restore" : "Archive"}
            </Button>
          </div>
        ))}
        {!categories.length && !isLoading ? (
          <EmptyMini
            icon={UsersRound}
            label="No entity categories configured yet. Activate a sector preset or create a custom category before building entity-linked forms."
          />
        ) : null}
      </div>
      <div className="mt-3 grid gap-2">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Activate sector preset
          <Select
            disabled={!canManage || activateMutation.isPending}
            onChange={(event) => setSelectedPreset(event.target.value)}
            value={selectedPreset}
          >
            <option value="">Choose predefined category</option>
            {availablePresets.map((category) => (
              <option key={`${category.sector}-${category.slug}`} value={category.slug}>
                {category.name} · {category.sector}
              </option>
            ))}
          </Select>
        </label>
        <Button
          disabled={!canManage || !selectedPreset || activateMutation.isPending}
          onClick={() => {
            activateMutation.mutate(selectedPreset);
            setSelectedPreset("");
          }}
          size="sm"
          variant="secondary"
        >
          Activate preset
        </Button>
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <Input
              disabled={!canManage || createMutation.isPending}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="Create custom category, e.g. Innovation Hub"
              value={customName}
            />
            <Select
              disabled={!canManage || createMutation.isPending}
              onChange={(event) => setParentCategoryId(event.target.value)}
              value={parentCategoryId}
            >
              <option value="">No parent category</option>
              {activeCategoriesSorted.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryPath(category)}
                </option>
              ))}
            </Select>
          </div>
          <Button
            disabled={!canManage || customName.trim().length < 2 || createMutation.isPending}
            onClick={() => createMutation.mutate({ name: customName.trim(), parentId: parentCategoryId })}
            size="sm"
            variant="primary"
          >
            Create category
          </Button>
        </div>
      </div>
    </div>
  );
}

function ListEditor({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      <Textarea
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        value={value}
      />
    </label>
  );
}

function joinLines(value: string[]): string {
  return value.join("\n");
}

function splitLines(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function AuditTrail({ detail }: { detail: ProjectDetailRead }) {
  return (
    <div className="rounded-2xl border bg-background/50 p-5">
      <h3 className="font-semibold">Project Audit Trail</h3>
      <div className="mt-4 space-y-3">
        {detail.audit_trail.map((event) => (
          <div className="rounded-xl border bg-panel px-4 py-3" key={event.id}>
            <p className="font-medium">{event.action.replace(/\./g, " ")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {event.user ?? "System"} · {formatDate(event.created_at)} ·{" "}
              {event.resource_type}
            </p>
          </div>
        ))}
        {!detail.audit_trail.length ? (
          <EmptyMini
            icon={CalendarClock}
            label="No project audit events yet. Governance keeps the immutable audit trail."
          />
        ) : null}
      </div>
    </div>
  );
}

function TemplatesSection({
  onUseTemplate,
  templates,
}: {
  onUseTemplate: (template: (typeof templates)[number]) => void;
  templates: {
    id: string;
    name: string;
    template_type: string;
    description: string;
    forms: number;
    indicators: number;
    governance_controls: number;
    status: string;
  }[];
}) {
  return (
    <section className="space-y-4">
      <SectionHeader
        description="Reusable project structures for assessments, operations, inspections, registration, review, and multi-location programs."
        title="Project Templates"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <div
            className="rounded-xl border bg-panel p-3.5 shadow-line"
            key={template.id}
          >
            <Badge tone="monitor">{template.template_type}</Badge>
            <h3 className="mt-3 font-semibold">{template.name}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {template.description}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <Signal label="Forms" value={`${template.forms}`} />
              <Signal label="Metrics" value={`${template.indicators}`} />
              <Signal
                label="Controls"
                value={`${template.governance_controls}`}
              />
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => onUseTemplate(template)}
              variant="secondary"
            >
              Use template
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectWizard({
  canImportLocations,
  canSubmit,
  draft,
  error,
  importingLocations,
  isEditing,
  isSubmitting,
  onChange,
  onImportLocations,
  onOpenChange,
  onSubmit,
  open,
  sectorPacks,
  setStep,
  step,
}: {
  canImportLocations: boolean;
  canSubmit: boolean;
  draft: ProjectCreate;
  error: string;
  importingLocations: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  onChange: (draft: ProjectCreate) => void;
  onImportLocations: (file: File) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  sectorPacks: ProjectSectorPackRead[];
  setStep: (step: number) => void;
  step: number;
}) {
  const maxStep = wizardSteps.length - 1;
  const readiness = projectReadiness(draft);
  const duplicateFields = settingStringList(
    draft,
    "beneficiary",
    "duplicateFields",
  );
  const updateSettings = (
    section: string,
    patch: ProjectSettingsSection,
  ): void => onChange(mergeProjectSettings(draft, section, patch));
  const setDuplicateField = (field: string, enabled: boolean): void => {
    const next = new Set(duplicateFields);
    if (enabled) next.add(field);
    else next.delete(field);
    updateSettings("beneficiary", { duplicateFields: Array.from(next) });
  };
  const finalDisabled =
    !canSubmit ||
    isSubmitting ||
    (draft.status === "active" && readiness.failedCritical > 0);

  return (
    <Modal
      contentClassName="max-w-5xl"
      description="Create the project container for entities, forms, metrics, teams, submissions, governance, and reports."
      onOpenChange={onOpenChange}
      open={open}
      title={isEditing ? "Edit project" : "Project creation wizard"}
    >
      <div className="grid max-h-[72vh] gap-5 overflow-y-auto p-5 product-scrollbar lg:grid-cols-[220px_1fr]">
        <aside className="space-y-2">
          {wizardSteps.map((label, index) => {
            const stepChecks = readiness.checks.filter((check) => wizardStepForCheck(check.targetStep) === index);
            const stepStatus = stepChecks.some((check) => check.status === "failed")
              ? "failed"
              : stepChecks.some((check) => check.status === "warning")
                ? "warning"
                : stepChecks.length
                  ? "passed"
                  : "neutral";
            return (
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm",
                  step === index
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted",
                )}
                key={label}
                onClick={() => setStep(index)}
                type="button"
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                    stepStatus === "passed"
                      ? "bg-success/15 text-success"
                      : stepStatus === "failed"
                        ? "bg-danger/15 text-danger"
                        : stepStatus === "warning"
                          ? "bg-warning/15 text-warning"
                          : "bg-muted",
                  )}
                >
                  {stepStatus === "passed" ? (
                    <CheckCircle2 aria-hidden="true" size={14} />
                  ) : stepStatus === "failed" || stepStatus === "warning" ? (
                    <AlertTriangle aria-hidden="true" size={14} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{label}</span>
              </button>
            );
          })}
        </aside>
        <div className="space-y-4">
          <div className="rounded-2xl border bg-muted/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Step {step + 1} of {wizardSteps.length}
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  {wizardSteps[step]}
                </h3>
              </div>
              <Badge
                tone={
                  readiness.category === "Ready"
                    ? "success"
                    : readiness.category === "Needs Review"
                      ? "warning"
                      : "danger"
                }
              >
                {readiness.score}% · {readiness.category}
              </Badge>
            </div>
          </div>
          <ProjectWizardStepContent
            canImportLocations={canImportLocations}
            draft={draft}
            duplicateFields={duplicateFields}
            importingLocations={importingLocations}
            onChange={onChange}
            onImportLocations={onImportLocations}
            readiness={readiness}
            sectorPacks={sectorPacks}
            setDuplicateField={setDuplicateField}
            setStep={setStep}
            step={step}
            updateSettings={updateSettings}
          />
          {error ? (
            <div
              className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
              role="alert"
            >
              {error}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex justify-between gap-2 border-t px-5 py-4">
        <Button
          disabled={step === 0}
          onClick={() => setStep(Math.max(step - 1, 0))}
          variant="ghost"
        >
          Back
        </Button>
        <div className="flex gap-2">
          <Button onClick={() => onOpenChange(false)} variant="ghost">
            Cancel
          </Button>
          {step < maxStep ? (
            <Button
              onClick={() => setStep(Math.min(step + 1, maxStep))}
              variant="primary"
            >
              Continue
            </Button>
          ) : (
            <Button disabled={finalDisabled} onClick={onSubmit} variant="primary">
              {isSubmitting
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? draft.status === "active"
                    ? "Save and activate"
                    : "Save project"
                  : draft.status === "active"
                    ? "Create and activate"
                    : "Create project"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ProjectWizardStepContent({
  canImportLocations,
  draft,
  duplicateFields,
  importingLocations,
  onChange,
  onImportLocations,
  readiness,
  sectorPacks,
  setDuplicateField,
  setStep,
  step,
  updateSettings,
}: {
  canImportLocations: boolean;
  draft: ProjectCreate;
  duplicateFields: string[];
  importingLocations: boolean;
  onChange: (draft: ProjectCreate) => void;
  onImportLocations: (file: File) => void;
  readiness: ReturnType<typeof projectReadiness>;
  sectorPacks: ProjectSectorPackRead[];
  setDuplicateField: (field: string, enabled: boolean) => void;
  setStep: (step: number) => void;
  step: number;
  updateSettings: (section: string, patch: ProjectSettingsSection) => void;
}) {
  const activeSectorPack = selectedSectorPack(draft, sectorPacks);
  // Owner-managed reference data (falls back to bundled defaults when not customized).
  const projectTypeChoices = useOptionChoices("project.type");
  const entityTypeChoices = useOptionChoices("project.entity_type");
  const frequencyChoices = useOptionChoices("project.frequency");
  const duplicateFieldChoices = useOptionChoices("duplicate.field");
  const submissionSourceChoices = useOptionChoices("submission.source");

  const basics = (
      <div className="grid gap-3">
        <div className="rounded-2xl border bg-background/50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold">Sector pack</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                Choose the industry context for this project. Atlas keeps the
                same configurable engine, but suggests the right entity types, forms,
                metrics, validation rules, dashboards, reports, and mobile
                guidance for the sector.
              </p>
            </div>
            <Select
              className="lg:w-72"
              value={draft.sector_id ?? ""}
              onChange={(event) => {
                const pack = sectorPacks.find(
                  (item) => item.id === event.target.value,
                );
                onChange(
                  pack
                    ? applySectorPackToDraft(draft, pack)
                    : { ...draft, sector_id: event.target.value },
                );
              }}
            >
              <option value="">Select sector pack</option>
              {sectorPacks.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.sector} · {pack.name}
                </option>
              ))}
            </Select>
          </div>
          {activeSectorPack ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-xl border bg-panel p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Entities
                </p>
                <p className="mt-2 text-sm leading-5">
                  {activeSectorPack.entity_types.slice(0, 5).join(", ")}
                </p>
              </div>
              <div className="rounded-xl border bg-panel p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Starter forms
                </p>
                <p className="mt-2 text-sm leading-5">
                  {activeSectorPack.form_templates.slice(0, 4).join(", ")}
                </p>
              </div>
              <div className="rounded-xl border bg-panel p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Sector controls
                </p>
                <p className="mt-2 text-sm leading-5">
                  {activeSectorPack.validation_rules.slice(0, 3).join(", ")}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-warning/35 bg-warning/10 p-3 text-sm text-warning">
              A sector pack is recommended. You can still create a custom
              project, but sector packs make the setup faster and more
              professional for real field work.
            </div>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            <span>Project name</span>
            <Input
              placeholder="e.g. Northern Region Health Survey"
              value={draft.name}
              onChange={(event) =>
                onChange({
                  ...draft,
                  name: event.target.value,
                  project_code:
                    draft.project_code || projectCodeFromName(event.target.value),
                })
              }
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            <span>Project code</span>
            <Input
              placeholder="e.g. NRHS-2026"
              value={draft.project_code}
              onChange={(event) =>
                onChange({ ...draft, project_code: event.target.value.toUpperCase() })
              }
            />
          </label>
        </div>
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          <span>Description</span>
          <Textarea
            placeholder="What this project collects, who it serves, and the decisions it supports."
            value={draft.description ?? ""}
            onChange={(event) =>
              onChange({ ...draft, description: event.target.value })
            }
          />
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            <span>Project type</span>
            <Select
              value={draft.program_type ?? ""}
              onChange={(event) =>
                onChange({ ...draft, program_type: event.target.value })
              }
            >
              <option value="">Select project type</option>
              {projectTypeChoices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            <span>Status</span>
            <Select
              value={draft.status ?? "draft"}
              onChange={(event) =>
                onChange({ ...draft, status: event.target.value })
              }
            >
              {projectStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            <span>Project owner</span>
            <Input
              placeholder="e.g. Operations Manager"
              value={draft.owner ?? ""}
              onChange={(event) => onChange({ ...draft, owner: event.target.value })}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            <span>Start date</span>
            <Input
              type="date"
              value={dateInputValue(draft.start_date)}
              onInput={(event) =>
                onChange({
                  ...draft,
                  start_date: event.currentTarget.value || null,
                })
              }
              onChange={(event) =>
                onChange({ ...draft, start_date: event.target.value || null })
              }
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            <span>End date</span>
            <Input
              type="date"
              value={dateInputValue(draft.end_date)}
              onInput={(event) =>
                onChange({
                  ...draft,
                  end_date: event.currentTarget.value || null,
                })
              }
              onChange={(event) =>
                onChange({ ...draft, end_date: event.target.value || null })
              }
            />
          </label>
        </div>
      </div>
  );
  const programDetails = (
      <div className="grid gap-3">
        <Textarea
          placeholder="Program objective"
          value={settingText(draft, "program", "objective")}
          onChange={(event) =>
            updateSettings("program", { objective: event.target.value })
          }
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Textarea
            placeholder="Expected outcomes"
            value={settingText(draft, "program", "expectedOutcomes")}
            onChange={(event) =>
              updateSettings("program", { expectedOutcomes: event.target.value })
            }
          />
          <Textarea
            placeholder="Expected outputs"
            value={settingText(draft, "program", "expectedOutputs")}
            onChange={(event) =>
              updateSettings("program", { expectedOutputs: event.target.value })
            }
          />
          <Input
            placeholder="Result areas"
            value={settingText(draft, "program", "resultAreas")}
            onChange={(event) =>
              updateSettings("program", { resultAreas: event.target.value })
            }
          />
          <Input
            placeholder="Funding source"
            value={settingText(draft, "program", "fundingSource")}
            onChange={(event) =>
              updateSettings("program", { fundingSource: event.target.value })
            }
          />
          <Input
            placeholder="Grant / award reference"
            value={settingText(draft, "program", "grantReference")}
            onChange={(event) =>
              updateSettings("program", { grantReference: event.target.value })
            }
          />
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <Input
              inputMode="decimal"
              placeholder="Total budget"
              value={settingText(draft, "program", "budgetAmount")}
              onChange={(event) =>
                updateSettings("program", {
                  budgetAmount: event.target.value.replace(/[^0-9.]/g, ""),
                })
              }
            />
            <Select
              aria-label="Budget currency"
              value={settingText(draft, "program", "budgetCurrency", "USD")}
              onChange={(event) =>
                updateSettings("program", { budgetCurrency: event.target.value })
              }
            >
              {["USD", "EUR", "GBP", "XAF", "XOF", "KES", "NGN", "GHS", "ETB", "UGX", "TZS", "RWF", "ZAR"].map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </Select>
          </div>
          <Input
            inputMode="numeric"
            placeholder="Target records / entities"
            value={settingText(draft, "program", "targetBeneficiaries")}
            onChange={(event) =>
              updateSettings("program", {
                targetBeneficiaries: event.target.value.replace(/[^0-9]/g, ""),
              })
            }
          />
          <Input
            placeholder="Funder, client, or donor"
            value={draft.donor ?? ""}
            onChange={(event) => onChange({ ...draft, donor: event.target.value })}
          />
          <Input
            placeholder="Implementing organization"
            value={draft.implementing_organization ?? ""}
            onChange={(event) =>
              onChange({
                ...draft,
                implementing_organization: event.target.value,
              })
            }
          />
          <Input
            placeholder="Program category"
            value={draft.category ?? ""}
            onChange={(event) =>
              onChange({ ...draft, category: event.target.value })
            }
          />
        </div>
      </div>
  );
  const geography = (
      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            value={draft.country ?? ""}
            onChange={(event) =>
              onChange({ ...draft, country: event.target.value })
            }
          >
            <option value="">Select country</option>
            {countryOptions.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Region"
            value={draft.region ?? ""}
            onChange={(event) => onChange({ ...draft, region: event.target.value })}
          />
          <Input
            placeholder="District"
            value={draft.district ?? ""}
            onChange={(event) =>
              onChange({ ...draft, district: event.target.value })
            }
          />
          <Input
            placeholder="Community"
            value={draft.community ?? ""}
            onChange={(event) =>
              onChange({ ...draft, community: event.target.value })
            }
          />
          <Input
            placeholder="Village"
            value={settingText(draft, "geography", "village")}
            onChange={(event) =>
              updateSettings("geography", { village: event.target.value })
            }
          />
          <Input
            placeholder="Facility or site"
            value={settingText(draft, "geography", "facility")}
            onChange={(event) =>
              updateSettings("geography", { facility: event.target.value })
            }
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ProjectSetupFileCard
            accept=".csv"
            disabled={!canImportLocations || importingLocations}
            fileName={settingText(draft, "geography", "locationImportFileName")}
            inputId="project-location-import-file"
            title="Import Locations"
            lines={["CSV columns: name, code, unit_type", "Optional: parent_code, region"]}
            onFileSelected={(file) => {
              updateSettings("geography", {
                locationImportFileName: file.name,
                locationImportFileSize: file.size,
                locationImportFileType: file.type || "unknown",
              });
              onImportLocations(file);
            }}
            statusLine={
              importingLocations
                ? "Importing..."
                : !canImportLocations
                  ? "Requires organization management permission"
                  : undefined
            }
          />
          <ProjectSetupFileCard
            accept=".geojson,.json,.kml,.zip"
            fileName={settingText(draft, "geography", "boundaryFileName")}
            inputId="project-boundary-upload-file"
            title="Upload Boundaries"
            lines={["GeoJSON/KML/Shapefile", "Stored as a project reference only"]}
            onFileSelected={(file) =>
              updateSettings("geography", {
                boundaryFileName: file.name,
                boundaryFileSize: file.size,
                boundaryFileType: file.type || "unknown",
              })
            }
          />
        </div>
      </div>
  );
  const entities = (
      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            value={settingText(draft, "beneficiary", "primaryEntityType")}
            onChange={(event) =>
              updateSettings("beneficiary", {
                primaryEntityType: event.target.value,
              })
            }
          >
            <option value="">Primary entity type</option>
            {entityTypeChoices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Secondary entity types, comma separated"
            value={settingStringList(
              draft,
              "beneficiary",
              "secondaryEntityTypes",
            ).join(", ")}
            onChange={(event) =>
              updateSettings("beneficiary", {
                secondaryEntityTypes: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
          <div className="md:col-span-2">
            <BeneficiaryCodeFormatDesigner
              entityType={settingText(draft, "beneficiary", "primaryEntityType", "Beneficiary")}
              onChange={(codeFormat) => updateSettings("beneficiary", { codeFormat })}
              value={settingText(draft, "beneficiary", "codeFormat")}
            />
          </div>
          <Select
            value={settingText(
              draft,
              "beneficiary",
              "profileUpdateRule",
            )}
            onChange={(event) =>
              updateSettings("beneficiary", {
                profileUpdateRule: event.target.value,
              })
            }
          >
            <option value="Require review for name, phone, village, and GPS changes">
              Require review for sensitive changes
            </option>
            <option value="Keep history and update automatically">
              Keep history and update automatically
            </option>
            <option value="Keep history only">Keep history only</option>
          </Select>
        </div>
        <div className="rounded-2xl border bg-background/50 p-4">
          <p className="font-medium">Duplicate detection fields</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {duplicateFieldChoices.map((choice) => (
              <label
                className="flex items-center gap-2 rounded-xl border bg-panel px-3 py-2 text-sm"
                key={choice.value}
              >
                <input
                  checked={duplicateFields.includes(choice.value)}
                  onChange={(event) =>
                    setDuplicateField(choice.value, event.target.checked)
                  }
                  type="checkbox"
                />
                {choice.label}
              </label>
            ))}
          </div>
        </div>
      </div>
  );
  const indicatorSetupMode =
    indicatorSetupModes.find(
      (mode) => mode.value === settingText(draft, "indicators", "setupMode"),
    ) ?? indicatorSetupModes[0];
  const metrics = (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Select
            value={settingText(draft, "indicators", "setupMode")}
            onChange={(event) =>
              updateSettings("indicators", { setupMode: event.target.value })
            }
          >
            {indicatorSetupModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </Select>
          <p className="text-sm text-muted-foreground">
            {indicatorSetupMode.help}
          </p>
        </div>
        <Select
          value={settingText(draft, "indicators", "frequency")}
          onChange={(event) =>
            updateSettings("indicators", { frequency: event.target.value })
          }
        >
          {frequencyChoices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Data source"
          value={settingText(draft, "indicators", "dataSource")}
          onChange={(event) =>
            updateSettings("indicators", { dataSource: event.target.value })
          }
        />
        <Input
          placeholder="Responsible person"
          value={settingText(draft, "indicators", "responsiblePerson")}
          onChange={(event) =>
            updateSettings("indicators", {
              responsiblePerson: event.target.value,
            })
          }
        />
        <Textarea
          placeholder="Breakdown categories, e.g. Location, Category, Status"
          value={settingStringList(
            draft,
            "indicators",
            "disaggregation",
          ).join(", ")}
          onChange={(event) =>
            updateSettings("indicators", {
              disaggregation: event.target.value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
  );
  const forms = (
      <div className="grid gap-3">
        <Select
          value={settingText(draft, "forms", "starterPack")}
          onChange={(event) =>
            updateSettings("forms", { starterPack: event.target.value })
          }
        >
          <option value="">Forms setup option</option>
          <option value="Attach existing forms">Attach existing forms</option>
          <option value="Create new forms">Create new forms</option>
          <option value="Use form templates">Use form templates</option>
          <option value="Install project starter pack">
            Install project starter pack
          </option>
        </Select>
        <Textarea
          placeholder="Form journey, e.g. Registration → Assessment → Follow-up → Reporting"
          value={settingText(draft, "forms", "journey")}
          onChange={(event) =>
            updateSettings("forms", { journey: event.target.value })
          }
        />
        <Textarea
          placeholder="Prerequisites and follow-up rules"
          value={settingText(draft, "forms", "prerequisites")}
          onChange={(event) =>
            updateSettings("forms", { prerequisites: event.target.value })
          }
        />
        <div className="rounded-2xl border bg-background/50 p-4">
          <p className="font-medium">Submission sources tracked</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {submissionSourceChoices.map((choice) => (
              <Badge key={choice.value} tone="neutral">
                {choice.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>
  );
  const team = (
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          placeholder="Project Manager"
          value={settingText(draft, "team", "projectManager") || draft.owner || ""}
          onChange={(event) =>
            onChange(
              mergeProjectSettings(
                { ...draft, owner: event.target.value },
                "team",
                { projectManager: event.target.value },
              ),
            )
          }
        />
        <Input
          placeholder="Operations or data manager"
          value={settingText(draft, "team", "meManager")}
          onChange={(event) =>
            updateSettings("team", { meManager: event.target.value })
          }
        />
        <Input
          placeholder="Data Manager"
          value={settingText(draft, "team", "dataManager")}
          onChange={(event) =>
            updateSettings("team", { dataManager: event.target.value })
          }
        />
        <Input
          placeholder="Supervisors"
          value={settingText(draft, "team", "supervisors")}
          onChange={(event) =>
            updateSettings("team", { supervisors: event.target.value })
          }
        />
        <Textarea
          placeholder="Field officers, teams, or location assignments"
          value={settingText(draft, "team", "fieldOfficers")}
          onChange={(event) =>
            updateSettings("team", { fieldOfficers: event.target.value })
          }
        />
        <Select
          value={settingText(
            draft,
            "team",
            "assignmentMode",
            "Assigned users only",
          )}
          onChange={(event) =>
            updateSettings("team", { assignmentMode: event.target.value })
          }
        >
          <option value="Assigned users only">Assigned users only</option>
          <option value="Location and project restricted">
            Location and project restricted
          </option>
          <option value="Project-wide access">Project-wide access</option>
        </Select>
      </div>
  );
  const governance = (
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          value={settingText(draft, "governance", "approvalWorkflow")}
          onChange={(event) =>
            updateSettings("governance", {
              approvalWorkflow: event.target.value,
            })
          }
        >
          <option value="Submitted → Under Review → Approved">
            Submitted → Under Review → Approved
          </option>
          <option value="Submitted → Supervisor Review → Data Manager Review → Approved">
            Supervisor and Data Manager review
          </option>
          <option value="Submitted → Returned / Rejected / Approved">
            Simple review with return and reject
          </option>
        </Select>
        <Input
          placeholder="Consent policy"
          value={settingText(draft, "governance", "consentPolicy")}
          onChange={(event) =>
            updateSettings("governance", { consentPolicy: event.target.value })
          }
        />
        <Input
          placeholder="Data retention rule"
          value={settingText(draft, "governance", "retentionRule")}
          onChange={(event) =>
            updateSettings("governance", { retentionRule: event.target.value })
          }
        />
        <Input
          placeholder="Export rule"
          value={settingText(draft, "governance", "exportRule")}
          onChange={(event) =>
            updateSettings("governance", { exportRule: event.target.value })
          }
        />
        <Input
          placeholder="Sensitive data controls"
          value={settingText(draft, "governance", "sensitiveDataControls")}
          onChange={(event) =>
            updateSettings("governance", {
              sensitiveDataControls: event.target.value,
            })
          }
        />
        <label className="flex items-center gap-2 rounded-xl border bg-panel px-3 py-2 text-sm">
          <input
            checked={settingBoolean(
              draft,
              "governance",
              "approvedDataOnly",
              true,
            )}
            onChange={(event) =>
              updateSettings("governance", {
                approvedDataOnly: event.target.checked,
              })
            }
            type="checkbox"
          />
          Only approved submissions update entities, metrics, and reports
        </label>
      </div>
  );
  const review = (
      <div className="space-y-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Project status
          <Select
            value={draft.status ?? "draft"}
            onChange={(event) =>
              onChange({ ...draft, status: event.target.value })
            }
          >
            {projectStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <Signal label="Project" value={draft.name || "Not named"} />
          <Signal
            label="Code"
            value={(
              draft.project_code ||
              projectCodeFromName(draft.name) ||
              "Not set"
            ).toLowerCase()}
          />
          <Signal
            label="Project type"
            value={draft.program_type || "Not selected"}
            tone={draft.program_type ? "success" : "warning"}
          />
          <Signal
            label="Primary entity"
            value={
              settingText(draft, "beneficiary", "primaryEntityType") ||
              "Not selected"
            }
            tone={
              settingText(draft, "beneficiary", "primaryEntityType")
                ? "success"
                : "warning"
            }
          />
          <Signal
            label="Budget"
            value={
              settingText(draft, "program", "budgetAmount")
                ? `${settingText(draft, "program", "budgetCurrency", "USD")} ${Number(settingText(draft, "program", "budgetAmount")).toLocaleString()}`
                : "Not set"
            }
            tone={settingText(draft, "program", "budgetAmount") ? "success" : "neutral"}
          />
          <Signal
            label="Target reach"
            value={
              settingText(draft, "program", "targetBeneficiaries")
                ? `${Number(settingText(draft, "program", "targetBeneficiaries")).toLocaleString()} ${settingText(draft, "beneficiary", "primaryEntityPlural") || "records"}`
                : "Not set"
            }
            tone={settingText(draft, "program", "targetBeneficiaries") ? "success" : "neutral"}
          />
        </div>
        <ReadinessChecklist
          checks={readiness.checks}
          onSelectStep={(targetStep) => setStep(wizardStepForCheck(targetStep))}
        />
        {draft.status === "active" && readiness.failedCritical ? (
          <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            Activation is blocked until critical readiness checks pass. Save as
            draft or open the required section from the checklist.
          </p>
        ) : null}
      </div>
  );

  if (step === 0) return basics;
  if (step === 2) return review;
  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-dashed bg-muted/20 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
        The sections below are recommended for a complete, activation-ready
        project. Required items are marked, and everything else can be added now
        or later — your project is already saved as a draft.
      </p>
      <WizardSection defaultOpen tag="Required to activate" title="Geographic scope">
        {geography}
      </WizardSection>
      <WizardSection defaultOpen tag="Required to activate" title="Entities">
        {entities}
      </WizardSection>
      <WizardSection defaultOpen tag="Required to activate" title="Team & roles">
        {team}
      </WizardSection>
      <WizardSection defaultOpen tag="Required to activate" title="Governance & review">
        {governance}
      </WizardSection>
      <WizardSection tag="Optional" title="Program details">
        {programDetails}
      </WizardSection>
      <WizardSection tag="Optional" title="Metrics plan">
        {metrics}
      </WizardSection>
      <WizardSection tag="Optional" title="Forms plan">
        {forms}
      </WizardSection>
    </div>
  );
}

function WizardSection({
  children,
  defaultOpen = false,
  tag,
  title,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  tag: string;
  title: string;
}) {
  return (
    <details
      className="group rounded-2xl border bg-background/50 [&_summary::-webkit-details-marker]:hidden"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <span className="flex items-center gap-2">
          <ChevronRight
            aria-hidden="true"
            className="text-muted-foreground transition-transform group-open:rotate-90"
            size={16}
          />
          <span className="text-sm font-semibold">{title}</span>
        </span>
        <Badge tone={tag === "Optional" ? "neutral" : "warning"}>{tag}</Badge>
      </summary>
      <div className="border-t p-4">{children}</div>
    </details>
  );
}

function ProjectSetupFileCard({
  accept,
  disabled,
  fileName,
  inputId,
  lines,
  onFileSelected,
  statusLine,
  title,
}: {
  accept: string;
  disabled?: boolean;
  fileName: string;
  inputId: string;
  lines: string[];
  onFileSelected: (file: File) => void;
  statusLine?: string;
  title: string;
}) {
  return (
    <label
      className={cn(
        "rounded-2xl border bg-background/50 p-4 text-left transition",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-primary hover:bg-primary/5",
      )}
      htmlFor={inputId}
    >
      <span className="flex items-center gap-2 font-semibold">
        <UploadCloud aria-hidden="true" className="text-primary" size={16} />
        {title}
      </span>
      <span className="mt-3 block space-y-1.5">
        {lines.map((line) => (
          <span className="block text-xs text-muted-foreground" key={line}>
            {line}
          </span>
        ))}
      </span>
      <span className="mt-3 block rounded-lg border border-dashed bg-panel px-3 py-2 text-xs text-muted-foreground">
        {fileName ? `Selected: ${fileName}` : "Choose file"}
      </span>
      {statusLine ? (
        <span className="mt-1.5 block text-xs font-medium text-accent-foreground">
          {statusLine}
        </span>
      ) : null}
      <input
        accept={accept}
        className="sr-only"
        disabled={disabled}
        id={inputId}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
          event.target.value = "";
        }}
        type="file"
      />
    </label>
  );
}

function ReadinessChecklist({
  checks,
  onSelectStep,
}: {
  checks: ReadinessCheck[];
  onSelectStep: (step: number) => void;
}) {
  return (
    <div className="rounded-2xl border bg-muted/35 p-3">
      <p className="font-medium">Project readiness checklist</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {checks.map((check) => (
          <button
            className="flex items-center justify-between gap-2 rounded-lg border bg-panel px-3 py-2 text-left text-xs transition hover:border-primary"
            key={check.label}
            onClick={() => onSelectStep(check.targetStep)}
            type="button"
          >
            <span>{check.label}</span>
            <Badge
              tone={
                check.status === "passed"
                  ? "success"
                  : check.status === "warning"
                    ? "warning"
                    : "danger"
              }
            >
              {check.status === "passed"
                ? "Ready"
                : check.status === "warning"
                  ? "Review"
                  : "Required"}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

type ProjectFiltersState = {
  country: string;
  dateFrom: string;
  dateTo: string;
  owner: string;
  region: string;
  status: string;
};

function ProjectFilters({
  filters,
  onChange,
  projects,
}: {
  filters: ProjectFiltersState;
  onChange: (patch: Partial<ProjectFiltersState>) => void;
  projects: ProjectListItemRead[];
}) {
  const statuses = Array.from(
    new Set(projects.map((project) => project.status).filter(Boolean)),
  );
  const countries = Array.from(
    new Set(projects.map((project) => project.country).filter((value): value is string => Boolean(value))),
  );
  const regions = Array.from(
    new Set(projects.map((project) => project.region).filter((value): value is string => Boolean(value))),
  );
  const owners = Array.from(
    new Set(projects.map((project) => project.owner).filter((value): value is string => Boolean(value))),
  );
  const hasActiveFilters =
    Boolean(filters.status) ||
    Boolean(filters.country) ||
    Boolean(filters.region) ||
    Boolean(filters.owner) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);
  return (
    <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-container-lowest p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          <span>Status</span>
          <Select
            onChange={(event) => onChange({ status: event.target.value })}
            value={filters.status}
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          <span>Country</span>
          <Select
            onChange={(event) => onChange({ country: event.target.value })}
            value={filters.country}
          >
            <option value="">All countries</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          <span>Region</span>
          <Select
            onChange={(event) => onChange({ region: event.target.value })}
            value={filters.region}
          >
            <option value="">All regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          <span>Owner</span>
          <Select
            onChange={(event) => onChange({ owner: event.target.value })}
            value={filters.owner}
          >
            <option value="">All owners</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </Select>
        </label>
        <div className="col-span-2 grid gap-1.5 text-xs font-medium text-muted-foreground md:col-span-3 xl:col-span-2">
          <span>Start date range</span>
          <div className="flex items-center gap-2">
            <Input
              aria-label="Start date from"
              onChange={(event) => onChange({ dateFrom: event.target.value })}
              type="date"
              value={filters.dateFrom}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              aria-label="Start date to"
              onChange={(event) => onChange({ dateTo: event.target.value })}
              type="date"
              value={filters.dateTo}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          disabled={!hasActiveFilters}
          onClick={() =>
            onChange({ country: "", dateFrom: "", dateTo: "", owner: "", region: "", status: "" })
          }
          variant="ghost"
        >
          <SlidersHorizontal aria-hidden="true" />
          Clear filters
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({
  action,
  description,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-panel p-3.5 shadow-line md:flex-row md:items-start md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <HelpHint label={`About ${title}`} title={title}>
            {description}
          </HelpHint>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function Signal({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "neutral";
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function InsightCard({
  emptyLabel,
  icon: Icon,
  lines,
  title,
}: {
  emptyLabel?: string;
  icon: typeof Globe2;
  lines: string[];
  title: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-container-lowest p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="text-primary" size={18} strokeWidth={1.5} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mt-4 space-y-2">
        {lines.length === 0 ? (
          <EmptyMini icon={Icon} label={emptyLabel ?? "Nothing to show yet."} />
        ) : (
          lines.map((line) => (
            <p
              className="rounded-lg bg-muted/35 px-3 py-2 text-sm text-muted-foreground"
              key={line}
            >
              {line}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
