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
  implementing_organization: "",
  name: "",
  owner: "",
  program_type: "",
  project_code: "",
  region: "",
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

const wizardSteps = [
  "Basic Information",
  "Locations",
  "Project Structure",
  "Indicators",
  "Forms",
  "Governance",
  "Review & Activate",
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
          .map((item) => item?.msg ?? "Invalid field")
          .join(" ");
    } catch {
      return error.message;
    }
  }
  return "Check the project code, required fields, and your project permissions.";
}

function normalizeProjectPayload(draft: ProjectCreate): ProjectCreate {
  const generatedCode = draft.project_code || projectCodeFromName(draft.name);
  return {
    ...draft,
    name: draft.name.trim(),
    project_code: generatedCode
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, ""),
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
    end_date: null,
    health_score: 35,
    health_status: "Needs Attention",
    id: `project-local-${Date.now()}`,
    indicator_count: 0,
    name: draft.name,
    owner: draft.owner || null,
    progress_percent: 10,
    project_code: draft.project_code,
    region: draft.region || draft.country || null,
    start_date: null,
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
    setProjectWizardError("");
    setEditingProjectId(project.id);
    setProjectDraft({
      ...defaultProjectDraft,
      country: project.country ?? "",
      donor: project.donor ?? "",
      name: project.name,
      owner: project.owner ?? "",
      project_code: project.project_code,
      region: project.region ?? "",
      status: project.status,
    });
    setWizardStep(0);
    setWizardOpen(true);
  }

  function submitProject(): void {
    const payload = normalizeProjectPayload(projectDraft);
    if (!payload.name || !payload.project_code) {
      setProjectWizardError(
        "Project name and project code are required before creation.",
      );
      setWizardStep(0);
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
      {tab === "Overview" ? <ProjectOverview detail={detail} /> : null}
      {tab === "Beneficiaries" ? (
        <ProjectBeneficiariesPanel
          onOpenRegistry={onOpenBeneficiaries}
          preview={preview}
          projectId={detail.id}
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
      {tab === "Settings" ? <ProjectSettings detail={detail} /> : null}
      {tab === "Audit Trail" ? <AuditTrail detail={detail} /> : null}
    </section>
  );
}

function ProjectOverview({ detail }: { detail: ProjectDetailRead }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-2xl border bg-background/50 p-5">
        <h3 className="font-semibold">Project Summary</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {detail.description ??
            "Project metadata is ready for ownership, locations, indicators, teams, forms, and governance setup."}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Signal label="Progress" value={`${detail.progress_percent}%`} />
          <Signal label="Forms" value={`${detail.active_forms}`} />
          <Signal label="Assignments" value={`${detail.active_assignments}`} />
          <Signal label="Submissions" value={`${detail.total_submissions}`} />
          <Signal label="Indicators" value={`${detail.indicator_count}`} />
          <Signal label="Beneficiaries" value={`${detail.beneficiary_count}`} />
        </div>
      </div>
      <div className="rounded-2xl border bg-background/50 p-5">
        <h3 className="font-semibold">Coverage Map Preview</h3>
        <div className="mt-4 grid min-h-64 place-items-center rounded-2xl border bg-[radial-gradient(circle_at_25%_25%,rgba(20,184,166,0.18),transparent_28%),linear-gradient(135deg,rgba(34,197,94,0.15),rgba(15,23,42,0.04))] p-5 text-center">
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
              Open Mapping for boundaries, layers, GPS validation, and spatial
              analysis.
            </p>
          </div>
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
  return (
    <Modal
      contentClassName="max-w-4xl"
      description="Create a project with the required operating context before attaching detailed forms, teams, indicators, and governance."
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
          {step === 0 ? (
            <div className="grid gap-3">
              <Input
                placeholder="Project name"
                value={draft.name}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    name: event.target.value,
                    project_code:
                      draft.project_code ||
                      projectCodeFromName(event.target.value),
                  })
                }
              />
              <Input
                placeholder="Project code"
                value={draft.project_code}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    project_code: event.target.value.toUpperCase(),
                  })
                }
              />
              <Textarea
                placeholder="Description"
                value={draft.description ?? ""}
                onChange={(event) =>
                  onChange({ ...draft, description: event.target.value })
                }
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Category"
                  value={draft.category ?? ""}
                  onChange={(event) =>
                    onChange({ ...draft, category: event.target.value })
                  }
                />
                <Input
                  placeholder="Donor"
                  value={draft.donor ?? ""}
                  onChange={(event) =>
                    onChange({ ...draft, donor: event.target.value })
                  }
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
              </div>
            </div>
          ) : null}
          {step === 1 ? (
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
                onChange={(event) =>
                  onChange({ ...draft, region: event.target.value })
                }
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
            </div>
          ) : null}
          {step >= 2 && step <= 5 ? <WizardPlanningStep step={step} /> : null}
          {step === 6 ? (
            <div className="space-y-3">
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
                label="Program type"
                value={draft.program_type ?? "Monitoring Program"}
              />
              <Signal label="Status" value={draft.status ?? "draft"} />
              <div className="rounded-xl border bg-muted/35 p-3 text-sm">
                <p className="font-medium">Creation readiness</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <ReadinessItem
                    passed={Boolean(draft.name.trim())}
                    label="Project name"
                  />
                  <ReadinessItem
                    passed={Boolean(
                      (
                        draft.project_code || projectCodeFromName(draft.name)
                      ).trim(),
                    )}
                    label="Project code"
                  />
                  <ReadinessItem
                    passed={Boolean(draft.program_type)}
                    label="Program type"
                  />
                  <ReadinessItem
                    passed={Boolean(
                      draft.country ||
                      draft.region ||
                      draft.district ||
                      draft.community,
                    )}
                    label="Location can be completed after creation"
                    warning
                  />
                </div>
              </div>
              <p className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
                After creation, open the project detail tabs to attach forms,
                indicators, teams, assignments, locations, reports, settings,
                and audit context.
              </p>
            </div>
          ) : null}
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
            <Button disabled={!canSubmit} onClick={onSubmit} variant="primary">
              {isSubmitting
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save project"
                  : "Create project"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ReadinessItem({
  label,
  passed,
  warning = false,
}: {
  label: string;
  passed: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-panel px-3 py-2 text-xs">
      <span>{label}</span>
      <Badge tone={passed ? "success" : warning ? "warning" : "danger"}>
        {passed ? "Ready" : warning ? "Later" : "Required"}
      </Badge>
    </div>
  );
}

function WizardPlanningStep({ step }: { step: number }) {
  const content: Record<number, [string, string[]]> = {
    2: [
      "Project Structure",
      ["Departments", "Teams", "Supervisors", "Field officers"],
    ],
    3: [
      "Indicators",
      ["Baseline values", "Targets", "Indicator library selection"],
    ],
    4: ["Forms", ["Attach forms", "Create forms", "Assign form templates"]],
    5: ["Governance", ["Permissions", "Approval rules", "Retention rules"]],
  };
  const [title, items] = content[step];
  return (
    <div className="rounded-2xl border bg-muted/30 p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Detailed configuration happens from the project workspace tabs after
        creation to avoid duplicating specialist modules.
      </p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <div
            className="rounded-xl border bg-panel px-3 py-2 text-sm"
            key={item}
          >
            {item}
          </div>
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
