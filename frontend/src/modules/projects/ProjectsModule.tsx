"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  FileChartColumn,
  Flag,
  Globe2,
  Layers3,
  MapPinned,
  Plus,
  ShieldCheck,
  Target,
  UploadCloud,
  UsersRound,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  ApiError,
  createProject,
  getProjectDetail,
  getProjectsSummary,
  listProjectTemplates,
  listProjects,
  updateProject,
  type CurrentPrincipal,
  type ProjectCreate,
  type ProjectDetailRead,
  type ProjectListItemRead,
  type ProjectRelatedRecordRead,
  type ProjectSummaryRead,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { ProjectBeneficiariesPanel } from "@/modules/beneficiaries/BeneficiariesModule";
import { ImportsMigrationModule } from "@/modules/imports-migration/ImportsMigrationModule";
import {
  projectSections,
  projectTabs,
  previewDetail,
  previewProjects,
  previewSummary,
  previewTemplates,
  type ProjectSection,
  type ProjectTab,
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
  settings_json: {
    automationRules: [],
    beneficiary: {
      codeFormat: "BEN-YYYY-000001",
      duplicateFields: ["Phone", "National ID", "Household ID", "Name + Village", "GPS"],
      primaryEntityType: "Beneficiary",
      profileUpdateRule: "Require review for name, phone, village, and GPS changes",
      secondaryEntityTypes: [],
    },
    formJourney: [
      "Registration required before baseline",
      "Baseline required before monitoring",
      "Monitoring required before endline",
    ],
    governance: {
      approvalWorkflow: "Submitted → Under Review → Approved",
      approvedDataOnly: true,
      consentPolicy: "Consent required where forms collect PII",
      exportRule: "Exports require permission and audit logging",
      retentionRule: "Retain project data according to organization policy",
      sensitiveDataControls: "Mask sensitive beneficiary fields for viewer roles",
    },
    indicators: {
      baselineRequired: false,
      disaggregation: ["Sex", "Age", "Location", "Disability status"],
      frequency: "Monthly",
      setupMode: "Configure later",
    },
    program: {
      expectedOutcomes: "",
      expectedOutputs: "",
      fundingSource: "",
      objective: "",
      resultAreas: "",
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

const countryOptions = [
  "Cameroon",
  "Ghana",
  "Kenya",
  "Liberia",
  "Malawi",
  "Nigeria",
  "Rwanda",
  "Sierra Leone",
  "South Africa",
  "Tanzania",
  "Uganda",
  "United States",
  "Zambia",
  "Zimbabwe",
];

const projectTypeOptions = [
  "Monitoring",
  "Evaluation",
  "Research",
  "Registration",
  "Humanitarian",
  "Agriculture",
  "Health",
  "Education",
  "Livelihood",
  "Protection",
  "WASH",
  "Custom",
];

const projectStatusOptions = [
  "draft",
  "planning",
  "active",
  "suspended",
  "completed",
  "archived",
];

const projectEntityTypeOptions = [
  "Farmer",
  "Household",
  "Beneficiary",
  "School",
  "Facility",
  "Village",
  "Group",
  "Health Worker",
  "Custom Entity",
];

const duplicateFieldOptions = [
  "Phone",
  "National ID",
  "Household ID",
  "Name + Village",
  "Name + Date of Birth",
  "GPS",
];

const submissionSourceOptions = [
  "Field Submitted",
  "Mobile",
  "Web Entry",
  "Uploaded",
  "Imported",
];

const projectFrequencyOptions = [
  "Monthly",
  "Quarterly",
  "Semi-annual",
  "Annual",
  "Seasonal",
  "Event-based",
];

const wizardSteps = [
  "Basic Information",
  "Program Setup",
  "Geographic Scope",
  "Beneficiaries",
  "Indicators",
  "Forms Setup",
  "Team Setup",
  "Governance",
  "Review",
  "Activate",
] as const;

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
      critical: true,
      label: "Geographic scope is selected",
      status: draft.country || draft.region || draft.district || draft.community
        ? "passed"
        : "failed",
      targetStep: 2,
    },
    {
      critical: true,
      label: "Primary beneficiary/entity type is selected",
      status:
        typeof beneficiary.primaryEntityType === "string" &&
        beneficiary.primaryEntityType.trim()
          ? "passed"
          : "failed",
      targetStep: 3,
    },
    {
      label: "Beneficiary code format is configured",
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
      label: "Indicator setup plan is defined",
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
    useState<ProjectSection>("dashboard");
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
  const queryClient = useQueryClient();
  const localProjects = useWorkspaceStore((state) => state.localProjects);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const upsertLocalProject = useWorkspaceStore(
    (state) => state.upsertLocalProject,
  );
  const preview = isPreview(token);
  const enabled = Boolean(token && !preview);
  const canManageProjects = hasAnyPermission(principal, [
    "projects.create",
    "projects.manage",
    "projects.edit",
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
  const detailQuery = useQuery({
    enabled: enabled && Boolean(selectedProjectId),
    queryKey: ["projects", "detail", token, selectedProjectId],
    queryFn: () => getProjectDetail(token ?? "", selectedProjectId ?? ""),
  });

  const projects = useMemo(
    () => (preview ? [...localProjects, ...previewProjects] : (projectsQuery.data ?? [])),
    [localProjects, preview, projectsQuery.data],
  );
  const summary: ProjectSummaryRead =
    preview ? (summaryQuery.data ?? computeProjectSummary(projects) ?? previewSummary) : (summaryQuery.data ?? computeProjectSummary(projects));
  const templates = preview ? previewTemplates : (templatesQuery.data ?? []);
  const selectedProject = selectedProjectId
    ? (projects.find((project) => project.id === selectedProjectId) ?? null)
    : null;
  const detail = selectedProjectId
    ? (detailQuery.data ??
      (selectedProject ? detailFromProject(selectedProject) : preview ? previewDetail : null))
    : null;
  const visibleProjects = useMemo(
    () => filterProjects(projects, activeSection),
    [activeSection, projects],
  );

  useEffect(() => {
    const match = pathname?.match(/^\/projects\/([^/]+)\/data-import\/?$/);
    if (!match?.[1]) return;
    setSelectedProjectId(match[1]);
    setActiveSection("all");
    setActiveTab("Data Import");
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
      key: "donor",
      header: "Donor",
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
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="monitor">OPERATIONS</Badge>
              <Badge tone={summary.attention_projects ? "warning" : "success"}>
                {summary.attention_projects
                  ? `${summary.attention_projects} need attention`
                  : "Projects healthy"}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Projects
              </h1>
              <HelpHint label="About Projects" title="Projects">
                Plan, monitor, govern, and connect project workspaces to forms,
                teams, locations, indicators, assignments, submissions, reports,
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
              onClick={() => setActiveSection(section.id)}
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
          onClose={() => setSelectedProjectId(null)}
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
          preview={preview}
          tab={activeTab}
          setTab={setActiveTab}
          token={token}
        />
      ) : null}

      {!selectedProjectId && activeSection === "dashboard" ? (
        <ProjectsDashboard
          projects={projects}
          summary={summary}
          onOpenProject={openProject}
        />
      ) : null}

      {!selectedProjectId &&
      ["all", "active", "draft", "closed"].includes(activeSection) ? (
        <section className="space-y-4">
          <SectionHeader
            action={
              <Button
                disabled={!canManageProjects}
                onClick={() => openProjectWizard()}
                variant="primary"
              >
                <Plus aria-hidden="true" /> Create project
              </Button>
            }
            description="Search, filter, sort, export, and open project workspaces. Detailed forms, submissions, mapping, reports, and governance remain in their modules."
            title={
              projectSections.find((section) => section.id === activeSection)
                ?.label ?? "Projects"
            }
          />
          <ProjectFilters />
          <DataTable
            columns={projectColumns}
            emptyLabel="No projects match this view yet"
            rows={visibleProjects}
            searchLabel="Search projects, donors, owners, countries"
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
        draft={projectDraft}
        error={projectWizardError}
        isEditing={Boolean(editingProjectId)}
        isSubmitting={createProjectMutation.isPending || updateProjectMutation.isPending}
        onChange={setProjectDraft}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) setProjectWizardError("");
        }}
        onSubmit={submitProject}
        open={wizardOpen}
        step={wizardStep}
        setStep={setWizardStep}
      />
    </section>
  );
}

function ProjectsDashboard({
  onOpenProject,
  projects,
  summary,
}: {
  onOpenProject: (project: ProjectListItemRead) => void;
  projects: ProjectListItemRead[];
  summary: ProjectSummaryRead;
}) {
  const cards = [
    { icon: Layers3, label: "Total Projects", value: summary.total_projects },
    {
      icon: CheckCircle2,
      label: "Active Projects",
      value: summary.active_projects,
    },
    {
      icon: ClipboardList,
      label: "Draft Projects",
      value: summary.draft_projects,
    },
    { icon: Archive, label: "Closed Projects", value: summary.closed_projects },
    {
      icon: UsersRound,
      label: "Beneficiaries",
      value: summary.total_beneficiaries,
    },
    {
      icon: FileChartColumn,
      label: "Submissions",
      value: summary.total_submissions,
    },
    { icon: BarChart3, label: "Active Forms", value: summary.active_forms },
    {
      icon: Target,
      label: "Indicator Rate",
      value: `${summary.indicator_achievement_rate}%`,
    },
  ];
  const rankedProjects = [...projects]
    .sort((left, right) => right.health_score - left.health_score)
    .slice(0, 4);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            className="rounded-xl border bg-panel p-3 shadow-line"
            key={card.label}
          >
            <card.icon aria-hidden="true" className="text-primary" size={18} />
            <p className="mt-4 text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border bg-panel p-3.5 shadow-line">
          <h2 className="font-semibold">Project Health Overview</h2>
          <div className="mt-4 space-y-3">
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
        <div className="rounded-xl border bg-panel p-3.5 shadow-line">
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
          <p className="mt-4 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
            Budget summary is future-ready. Financial controls should connect
            here without duplicating Reports or Governance.
          </p>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <InsightCard
          icon={Globe2}
          title="Geographic Coverage"
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
  detail,
  onClose,
  onOpenForms,
  onOpenBeneficiaries,
  onOpenIndicators,
  onOpenReports,
  onOpenSubmissions,
  onOpenTeams,
  preview,
  setTab,
  tab,
  token,
}: {
  detail: ProjectDetailRead;
  onClose: () => void;
  onOpenForms: () => void;
  onOpenBeneficiaries: () => void;
  onOpenIndicators: () => void;
  onOpenReports: () => void;
  onOpenSubmissions: () => void;
  onOpenTeams: () => void;
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
            {detail.project_code} · {detail.donor ?? "No donor set"} ·{" "}
            {detail.region ?? "All regions"}
          </p>
        </div>
        <Button onClick={onClose} variant="secondary">
          Back to list
        </Button>
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
        <ProjectOverview detail={detail} onSelectTab={setTab} />
      ) : null}
      {tab === "Beneficiaries" ? (
        <ProjectBeneficiariesPanel
          onOpenRegistry={onOpenBeneficiaries}
          preview={preview}
          projectId={detail.id}
          token={token}
        />
      ) : null}
      {tab === "Data Import" ? (
        <ImportsMigrationModule mode="project" projectId={detail.id} token={token} />
      ) : null}
      {tab === "Forms" ? (
        <RelatedTab
          actionLabel="Open Forms"
          description="Forms are managed in the Forms module. This tab shows the project relationship only."
          onAction={onOpenForms}
          records={detail.forms}
          title="Project Forms"
        />
      ) : null}
      {tab === "Indicators" ? (
        <RelatedTab
          actionLabel="Open Indicators"
          description="Indicators stay reusable and are tracked in the Indicators module."
          onAction={onOpenIndicators}
          records={detail.indicators}
          title="Project Indicators"
        />
      ) : null}
      {tab === "Locations" ? (
        <RelatedTab
          actionLabel="Open Mapping"
          description="Projects consume mapping boundaries and coverage; GIS tools remain in Mapping."
          records={detail.locations}
          title="Project Locations"
        />
      ) : null}
      {tab === "Teams" ? (
        <RelatedTab
          actionLabel="Open Users & Teams"
          description="Project teams reference Users & Teams without duplicating identity management."
          onAction={onOpenTeams}
          records={detail.teams}
          title="Project Teams"
        />
      ) : null}
      {tab === "Assignments" ? (
        <RelatedTab
          description="Assignments are operational activities owned by Field Operations."
          records={detail.assignments}
          title="Project Assignments"
        />
      ) : null}
      {tab === "Submissions" ? (
        <RelatedTab
          actionLabel="Open Submissions"
          description="Collected records are reviewed in Submissions; this tab shows project-level counts and recent records."
          onAction={onOpenSubmissions}
          records={detail.submissions}
          title="Project Submissions"
        />
      ) : null}
      {tab === "Reports" ? (
        <RelatedTab
          actionLabel="Open Reports"
          description="Project reports, indicator reports, and coverage reports are produced in Reports."
          onAction={onOpenReports}
          records={detail.reports}
          title="Project Reports"
        />
      ) : null}
      {tab === "Data Quality" ? <ProjectDataQuality detail={detail} /> : null}
      {tab === "Governance" ? <ProjectGovernance detail={detail} /> : null}
      {tab === "Settings" ? <ProjectSettings detail={detail} /> : null}
      {tab === "Audit Trail" ? <AuditTrail detail={detail} /> : null}
    </section>
  );
}

function ProjectOverview({
  detail,
  onSelectTab,
}: {
  detail: ProjectDetailRead;
  onSelectTab: (tab: ProjectTab) => void;
}) {
  const health = projectHealthSummary(detail);
  const settingsDraft = { settings_json: detail.settings_json ?? {} };
  const beneficiaryType =
    settingText(settingsDraft, "beneficiary", "primaryEntityType") ||
    "Not configured";
  const approvalWorkflow =
    settingText(settingsDraft, "governance", "approvalWorkflow") ||
    "Not configured";
  const overviewCards: {
    label: string;
    value: string;
    tab: ProjectTab;
    tone?: "success" | "warning" | "danger" | "neutral";
  }[] = [
    {
      label: "Beneficiaries",
      tab: "Beneficiaries",
      value: `${detail.beneficiary_count}`,
    },
    { label: "Forms", tab: "Forms", value: `${detail.active_forms}` },
    {
      label: "Assignments",
      tab: "Assignments",
      value: `${detail.active_assignments}`,
    },
    {
      label: "Submissions",
      tab: "Submissions",
      value: `${detail.total_submissions}`,
    },
    {
      label: "Indicators",
      tab: "Indicators",
      value: `${detail.indicator_count}`,
    },
    {
      label: "Data Quality",
      tab: "Data Quality",
      tone: health.qualityTone,
      value: health.qualityLabel,
    },
    {
      label: "Coverage",
      tab: "Locations",
      value: detail.region ?? detail.country ?? "All areas",
    },
    {
      label: "Field Officers",
      tab: "Teams",
      value: `${detail.teams.length || detail.active_assignments}`,
    },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border bg-background/50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">Project Summary</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {detail.description ??
                  "Project metadata is ready for ownership, locations, indicators, teams, forms, and governance setup."}
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
          <div className="mt-4 grid gap-3 md:grid-cols-3">
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
            onClick={() => onSelectTab("Locations")}
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
          title="Beneficiary Journey"
          lines={[
            "Registration before baseline",
            "Baseline before monitoring",
            "Monitoring before endline",
          ]}
          onClick={() => onSelectTab("Governance")}
        />
        <InfoPanel
          title="Project Health Inputs"
          lines={[
            "Coverage and submissions",
            "Data quality and approvals",
            "Indicator and assignment progress",
          ]}
          onClick={() => onSelectTab("Data Quality")}
        />
        <InfoPanel
          title="Source Tracking"
          lines={submissionSourceOptions}
          onClick={() => onSelectTab("Submissions")}
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
    ["Duplicate candidates", `${Math.max(0, Math.round(detail.beneficiary_count * 0.015))}`],
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
        ? "Beneficiaries, indicators, and reports use approved records"
        : "Draft policy allows unapproved data where configured",
    ],
  ];
  const beneficiaryItems = [
    ["Primary Entity", settingText(settingsDraft, "beneficiary", "primaryEntityType") || "Not configured"],
    ["Code Format", settingText(settingsDraft, "beneficiary", "codeFormat") || "BEN-YYYY-000001"],
    [
      "Duplicate Checks",
      settingStringList(settingsDraft, "beneficiary", "duplicateFields").join(", ") ||
        "Phone, ID, household, name + village, GPS",
    ],
    ["Profile Update Rule", settingText(settingsDraft, "beneficiary", "profileUpdateRule") || "Require review for sensitive changes"],
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
        <h3 className="font-semibold">Beneficiary Rules</h3>
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
          <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
            No records are attached yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProjectSettings({ detail }: { detail: ProjectDetailRead }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        ["Project Status", detail.status],
        ["Ownership", detail.owner ?? "Unassigned"],
        ["Default Locations", detail.region ?? detail.country ?? "All areas"],
        ["Default Teams", `${detail.teams.length} assigned team(s)`],
        ["Approval Requirements", "Project manager approval before closure"],
        ["Retention Rules", "Controlled by Governance"],
        ["Consent Policies", "Inherited from forms and governance"],
        ["Read-only Rules", "Closed projects become read-only"],
      ].map(([label, value]) => (
        <Signal key={label} label={label} value={value} />
      ))}
    </div>
  );
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
          <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
            No project audit events yet. Governance keeps the immutable audit
            trail.
          </div>
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
        description="Reusable project structures for baseline, endline, monitoring, evaluation, registration, and multi-country programs."
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
              <Signal label="Indicators" value={`${template.indicators}`} />
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
  canSubmit,
  draft,
  error,
  isEditing,
  isSubmitting,
  onChange,
  onOpenChange,
  onSubmit,
  open,
  setStep,
  step,
}: {
  canSubmit: boolean;
  draft: ProjectCreate;
  error: string;
  isEditing: boolean;
  isSubmitting: boolean;
  onChange: (draft: ProjectCreate) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
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
      description="Create the project container for beneficiaries, forms, indicators, teams, submissions, governance, and reports."
      onOpenChange={onOpenChange}
      open={open}
      title={isEditing ? "Edit project" : "Project creation wizard"}
    >
      <div className="grid max-h-[72vh] gap-5 overflow-y-auto p-5 product-scrollbar lg:grid-cols-[220px_1fr]">
        <aside className="space-y-2">
          {wizardSteps.map((label, index) => (
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
              <span className="grid size-6 place-items-center rounded-full bg-muted text-xs font-semibold">
                {index + 1}
              </span>
              {label}
            </button>
          ))}
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
            draft={draft}
            duplicateFields={duplicateFields}
            onChange={onChange}
            readiness={readiness}
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
  draft,
  duplicateFields,
  onChange,
  readiness,
  setDuplicateField,
  setStep,
  step,
  updateSettings,
}: {
  draft: ProjectCreate;
  duplicateFields: string[];
  onChange: (draft: ProjectCreate) => void;
  readiness: ReturnType<typeof projectReadiness>;
  setDuplicateField: (field: string, enabled: boolean) => void;
  setStep: (step: number) => void;
  step: number;
  updateSettings: (section: string, patch: ProjectSettingsSection) => void;
}) {
  if (step === 0) {
    return (
      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Project name"
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
          <Input
            placeholder="Project code"
            value={draft.project_code}
            onChange={(event) =>
              onChange({ ...draft, project_code: event.target.value.toUpperCase() })
            }
          />
        </div>
        <Textarea
          placeholder="Description"
          value={draft.description ?? ""}
          onChange={(event) =>
            onChange({ ...draft, description: event.target.value })
          }
        />
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            value={draft.program_type ?? ""}
            onChange={(event) =>
              onChange({ ...draft, program_type: event.target.value })
            }
          >
            <option value="">Project type</option>
            {projectTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
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
          <Input
            placeholder="Project owner"
            value={draft.owner ?? ""}
            onChange={(event) => onChange({ ...draft, owner: event.target.value })}
          />
          <Input
            aria-label="Start date"
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
          <Input
            aria-label="End date"
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
        </div>
      </div>
    );
  }
  if (step === 1) {
    return (
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
            placeholder="Donor"
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
  }
  if (step === 2) {
    return (
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
        <div className="grid gap-3 md:grid-cols-3">
          <InfoPanel
            title="Select Existing Locations"
            lines={["Use the organization hierarchy", "Drives assignments and reports"]}
            onClick={() => undefined}
          />
          <ProjectSetupFileCard
            accept=".csv,.xlsx,.xls,.json"
            fileName={settingText(draft, "geography", "locationImportFileName")}
            inputId="project-location-import-file"
            title="Import Locations"
            lines={["CSV and Excel-ready", "Use Data Import for large lists"]}
            onFileSelected={(file) =>
              updateSettings("geography", {
                locationImportFileName: file.name,
                locationImportFileSize: file.size,
                locationImportFileType: file.type || "unknown",
              })
            }
          />
          <ProjectSetupFileCard
            accept=".geojson,.json,.kml,.zip"
            fileName={settingText(draft, "geography", "boundaryFileName")}
            inputId="project-boundary-upload-file"
            title="Upload Boundaries"
            lines={["GeoJSON/KML/Shapefile-ready", "Used for GPS checks"]}
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
  }
  if (step === 3) {
    return (
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
            {projectEntityTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
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
          <Input
            placeholder="Code format, e.g. FRM-YYYY-000001"
            value={settingText(draft, "beneficiary", "codeFormat")}
            onChange={(event) =>
              updateSettings("beneficiary", { codeFormat: event.target.value })
            }
          />
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
            {duplicateFieldOptions.map((field) => (
              <label
                className="flex items-center gap-2 rounded-xl border bg-panel px-3 py-2 text-sm"
                key={field}
              >
                <input
                  checked={duplicateFields.includes(field)}
                  onChange={(event) =>
                    setDuplicateField(field, event.target.checked)
                  }
                  type="checkbox"
                />
                {field}
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (step === 4) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          value={settingText(draft, "indicators", "setupMode")}
          onChange={(event) =>
            updateSettings("indicators", { setupMode: event.target.value })
          }
        >
          <option value="Configure later">Configure later</option>
          <option value="Create now">Create indicators now</option>
          <option value="Import indicators">Import indicators</option>
          <option value="Use templates">Use indicator templates</option>
        </Select>
        <Select
          value={settingText(draft, "indicators", "frequency")}
          onChange={(event) =>
            updateSettings("indicators", { frequency: event.target.value })
          }
        >
          {projectFrequencyOptions.map((frequency) => (
            <option key={frequency} value={frequency}>
              {frequency}
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
          placeholder="Disaggregation categories, e.g. Sex, Age, Location"
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
  }
  if (step === 5) {
    return (
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
          placeholder="Form journey, e.g. Registration → Baseline → Monitoring → Endline"
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
            {submissionSourceOptions.map((source) => (
              <Badge key={source} tone="neutral">
                {source}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (step === 6) {
    return (
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
          placeholder="M&E Manager"
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
  }
  if (step === 7) {
    return (
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
          Only approved submissions update beneficiaries, indicators, and reports
        </label>
      </div>
    );
  }
  if (step === 8 || step === 9) {
    return (
      <div className="space-y-3">
        {step === 9 ? (
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
        ) : null}
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
        </div>
        <ReadinessChecklist checks={readiness.checks} onSelectStep={setStep} />
        {step === 9 && readiness.failedCritical ? (
          <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            Activation is blocked until critical readiness checks pass. Save as
            draft or open the required section from the checklist.
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
      This project setup step is ready for future configuration.
    </div>
  );
}

function ProjectSetupFileCard({
  accept,
  fileName,
  inputId,
  lines,
  onFileSelected,
  title,
}: {
  accept: string;
  fileName: string;
  inputId: string;
  lines: string[];
  onFileSelected: (file: File) => void;
  title: string;
}) {
  return (
    <label
      className="cursor-pointer rounded-2xl border bg-background/50 p-4 text-left transition hover:border-primary hover:bg-primary/5"
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
      <input
        accept={accept}
        className="sr-only"
        id={inputId}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
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

function ProjectFilters() {
  return (
    <div className="grid gap-3 rounded-xl border bg-panel p-3 shadow-line md:grid-cols-5">
      <Input placeholder="Status" />
      <Input placeholder="Country" />
      <Input placeholder="Region" />
      <Input placeholder="Owner" />
      <Input placeholder="Date range" />
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
  icon: Icon,
  lines,
  title,
}: {
  icon: typeof Globe2;
  lines: string[];
  title: string;
}) {
  return (
    <div className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="text-primary" size={18} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mt-4 space-y-2">
        {lines.map((line) => (
          <p
            className="rounded-lg bg-muted/35 px-3 py-2 text-sm text-muted-foreground"
            key={line}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
