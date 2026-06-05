"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  ClipboardPenLine,
  Copy,
  Database,
  Download,
  FileStack,
  GitBranch,
  History,
  MapPinned,
  Plus,
  ShieldCheck,
  Smartphone,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CurrentPrincipal } from "@/lib/api";
import { listForms, listFormTemplates } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FormCreationWorkspace } from "@/modules/forms/FormCreationWorkspace";
import {
  formDetailTabs,
  formsSections,
  normalizeBackendForm,
  previewForms,
  previewTemplates,
  type FormDetailTab,
  type FormListItem,
  type FormsSection,
} from "@/modules/forms/data";
import { computeFormsSummary, filterForms, formatDate, qualityTone, statusTone, toCsv } from "@/modules/forms/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type FormsModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

function isPreview(token: string | null): boolean {
  return !token || token === "preview-token";
}

function hasAnyPermission(principal: CurrentPrincipal | null | undefined, permissions: string[]): boolean {
  if (!principal || principal.platform_admin) return true;
  return permissions.some((permission) => principal.permissions?.includes(permission));
}

function downloadCsv(filename: string, rows: Record<string, string | number | boolean | null | undefined>[]): void {
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

export function FormsModule({ principal, token }: FormsModuleProps) {
  const [activeSection, setActiveSection] = useState<FormsSection>("dashboard");
  const [activeTab, setActiveTab] = useState<FormDetailTab>("Overview");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [creationOpen, setCreationOpen] = useState(false);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const preview = isPreview(token);
  const enabled = Boolean(token && !preview);
  const canManageForms = hasAnyPermission(principal, ["forms.manage", "forms.create", "forms.edit", "forms.publish"]);

  const formsQuery = useQuery({ queryKey: ["forms-module", token], queryFn: () => listForms(token ?? ""), enabled });
  const templatesQuery = useQuery({ queryKey: ["forms-module", "templates", token], queryFn: () => listFormTemplates(token ?? ""), enabled });

  const forms = useMemo<FormListItem[]>(
    () => (preview ? previewForms : (formsQuery.data ?? []).map(normalizeBackendForm)),
    [formsQuery.data, preview],
  );
  const templates = templatesQuery.data?.length ? templatesQuery.data : previewTemplates;
  const summary = computeFormsSummary(forms);
  const visibleForms = useMemo(() => filterForms(forms, activeSection), [activeSection, forms]);
  const selectedForm = forms.find((form) => form.id === selectedFormId) ?? null;

  function openForm(form: FormListItem, tab: FormDetailTab = "Overview"): void {
    setSelectedFormId(form.id);
    setActiveTab(tab);
  }

  const columns: TableColumn<FormListItem>[] = [
    {
      key: "name",
      header: "Form",
      value: (form) => `${form.name} ${form.slug}`,
      render: (form) => (
        <button className="text-left" onClick={() => openForm(form)} type="button">
          <p className="font-medium text-foreground">{form.name}</p>
          <p className="text-xs text-muted-foreground">{form.slug}</p>
        </button>
      ),
    },
    { key: "project", header: "Project", value: (form) => form.project_name, render: (form) => form.project_name },
    { key: "version", header: "Version", value: (form) => String(form.version), render: (form) => `v${form.version}` },
    { key: "status", header: "Status", value: (form) => form.status, render: (form) => <Badge tone={statusTone(form.status)}>{form.status}</Badge> },
    { key: "owner", header: "Owner", value: (form) => form.owner, render: (form) => form.owner },
    { key: "questions", header: "Questions", value: (form) => String(form.questions), render: (form) => form.questions },
    { key: "updated", header: "Last Updated", value: (form) => form.updated_at, render: (form) => formatDate(form.updated_at) },
    { key: "assignments", header: "Assignments", value: (form) => String(form.active_assignments), render: (form) => form.active_assignments },
    { key: "submissions", header: "Submissions", value: (form) => String(form.total_submissions), render: (form) => form.total_submissions },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (form) => (
        <div className="flex justify-end gap-2">
          <Button onClick={() => openForm(form)} size="sm" variant="secondary">View</Button>
          <Button onClick={() => openForm(form, "Builder")} size="sm" variant="ghost">Edit</Button>
        </div>
      ),
    },
  ];

  if (creationOpen) {
    return <FormCreationWorkspace existingForms={forms} onBack={() => setCreationOpen(false)} token={token} />;
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border bg-panel p-5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="collect">OPERATIONS</Badge>
              <Badge tone={summary.forms_with_quality_issues ? "warning" : "success"}>
                {summary.forms_with_quality_issues ? `${summary.forms_with_quality_issues} quality alerts` : "Forms healthy"}
              </Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Forms</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Design, publish, version, govern, and manage survey/data collection forms with reference data, workflow, quality, mapping, permissions, and audit controls.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!canManageForms} onClick={() => setCreationOpen(true)} variant="primary">
              <Plus aria-hidden="true" />
              Create form
            </Button>
            <Button onClick={() => downloadCsv("atlas-forms.csv", forms.map((form) => ({ name: form.name, project: form.project_name, version: form.version, status: form.status, owner: form.owner, questions: form.questions, submissions: form.total_submissions })))} variant="secondary">
              <Download aria-hidden="true" />
              Export
            </Button>
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto product-scrollbar" aria-label="Forms sections">
          {formsSections.map((section) => (
            <button
              className={cn("shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition", activeSection === section.id ? "border-primary bg-primary text-primary-foreground" : "bg-panel hover:bg-muted")}
              key={section.id}
              onClick={() => {
                setSelectedFormId(null);
                setActiveSection(section.id);
              }}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {selectedForm ? (
        <FormDetailWorkspace
          form={selectedForm}
          onClose={() => setSelectedFormId(null)}
          onOpenBuilder={() => setCreationOpen(true)}
          onOpenDataQuality={() => setActiveView("dataQuality")}
          onOpenMapping={() => setActiveView("map")}
          onOpenSubmissions={() => setActiveView("submissions")}
          tab={activeTab}
          setTab={setActiveTab}
        />
      ) : null}

      {!selectedForm && activeSection === "dashboard" ? (
        <FormsDashboard forms={forms} summary={summary} onOpenForm={openForm} />
      ) : null}

      {!selectedForm && ["all", "draft", "published", "archived"].includes(activeSection) ? (
        <section className="space-y-4">
          <SectionHeader
            action={<Button disabled={!canManageForms} onClick={() => setCreationOpen(true)} variant="primary"><Plus aria-hidden="true" /> Create form</Button>}
            description={formsSections.find((section) => section.id === activeSection)?.description ?? "Manage forms"}
            title={formsSections.find((section) => section.id === activeSection)?.label ?? "Forms"}
          />
          <FormFilters />
          <DataTable columns={columns} emptyLabel="No forms match this view yet" rows={visibleForms} searchLabel="Search forms, projects, owners, status" title="Form list" />
        </section>
      ) : null}

      {!selectedForm && activeSection === "templates" ? (
        <TemplatesSection onOpenBuilder={() => setCreationOpen(true)} templates={templates} />
      ) : null}

      {!selectedForm && activeSection === "reference-data" ? (
        <ReferenceDataSection onOpenBuilder={() => setCreationOpen(true)} />
      ) : null}
    </section>
  );
}

function FormsDashboard({ forms, onOpenForm, summary }: { forms: FormListItem[]; onOpenForm: (form: FormListItem, tab?: FormDetailTab) => void; summary: ReturnType<typeof computeFormsSummary> }) {
  const cards = [
    { icon: FileStack, label: "Total Forms", value: summary.total_forms },
    { icon: ClipboardPenLine, label: "Draft Forms", value: summary.draft_forms },
    { icon: Smartphone, label: "Published Forms", value: summary.published_forms },
    { icon: Archive, label: "Archived Forms", value: summary.archived_forms },
    { icon: ClipboardCheck, label: "Pending Approval", value: summary.pending_approval_forms },
    { icon: CheckCircle2, label: "Active Collection", value: summary.active_collection_forms },
    { icon: ShieldCheck, label: "Quality Issues", value: summary.forms_with_quality_issues },
    { icon: History, label: "Recently Updated", value: summary.recently_updated_forms },
  ];
  const recentlyPublished = forms.filter((form) => form.status === "published").slice(0, 4);
  const mostUsed = [...forms].sort((left, right) => right.total_submissions - left.total_submissions).slice(0, 4);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div className="rounded-2xl border bg-panel p-4 shadow-line" key={card.label}>
            <card.icon aria-hidden="true" className="text-primary" size={18} />
            <p className="mt-4 text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border bg-panel p-5 shadow-line">
          <h2 className="font-semibold">Most Used Forms</h2>
          <div className="mt-4 space-y-3">
            {mostUsed.map((form) => (
              <button className="w-full rounded-xl border bg-background/50 p-3 text-left transition hover:bg-muted/50" key={form.id} onClick={() => onOpenForm(form)} type="button">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{form.name}</p>
                    <p className="text-xs text-muted-foreground">{form.project_name} · v{form.version}</p>
                  </div>
                  <Badge tone={qualityTone(form.quality_score)}>{form.quality_score}%</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>{form.questions} questions</span>
                  <span>{form.active_assignments} assignments</span>
                  <span>{form.total_submissions} submissions</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-panel p-5 shadow-line">
          <h2 className="font-semibold">Governance Alerts</h2>
          <div className="mt-4 space-y-3">
            <Signal label="Forms pending approval" value={`${summary.pending_approval_forms}`} tone={summary.pending_approval_forms ? "warning" : "success"} />
            <Signal label="Forms with quality issues" value={`${summary.forms_with_quality_issues}`} tone={summary.forms_with_quality_issues ? "warning" : "success"} />
            <Signal label="Active collection forms" value={`${summary.active_collection_forms}`} />
          </div>
          <div className="mt-4 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
            Form governance remains form-level: permissions, workflow, data quality, mapping settings, versions, and audit trail belong here.
          </div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <InsightCard icon={History} title="Recent Form Activity" lines={forms.slice(0, 4).map((form) => `${form.name} updated ${formatDate(form.updated_at)}`)} />
        <InsightCard icon={Smartphone} title="Recently Published" lines={recentlyPublished.map((form) => `${form.name} · ${form.active_assignments} assignment(s)`)} />
        <InsightCard icon={GitBranch} title="Version Activity" lines={forms.slice(0, 4).map((form) => `${form.name}: v${form.version} · ${form.status}`)} />
      </div>
    </div>
  );
}

function FormDetailWorkspace({ form, onClose, onOpenBuilder, onOpenDataQuality, onOpenMapping, onOpenSubmissions, setTab, tab }: {
  form: FormListItem;
  onClose: () => void;
  onOpenBuilder: () => void;
  onOpenDataQuality: () => void;
  onOpenMapping: () => void;
  onOpenSubmissions: () => void;
  setTab: (tab: FormDetailTab) => void;
  tab: FormDetailTab;
}) {
  return (
    <section className="space-y-4 rounded-2xl border bg-panel p-5 shadow-line">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(form.status)}>{form.status}</Badge>
            <Badge tone={qualityTone(form.quality_score)}>Quality {form.quality_score}%</Badge>
            <Badge tone="collect">v{form.version}</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold">{form.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{form.project_name} · {form.survey_name} · {form.owner}</p>
        </div>
        <Button onClick={onClose} variant="secondary">Back to list</Button>
      </div>
      <div className="flex gap-2 overflow-x-auto product-scrollbar">
        {formDetailTabs.map((item) => (
          <button className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium", tab === item ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")} key={item} onClick={() => setTab(item)} type="button">
            {item}
          </button>
        ))}
      </div>
      {tab === "Overview" ? <FormOverview form={form} /> : null}
      {tab === "Builder" ? <FormTabCard actionLabel="Open Builder" icon={ClipboardPenLine} onAction={onOpenBuilder} title="Professional Survey Builder" lines={["Approved route: /forms/:formId/builder.", "Question library, templates, drag-and-drop ordering, inline editing, validation, logic, calculations, preview, import, and deployment all live in the builder.", `${form.questions} questions across ${form.sections} section(s).`]} /> : null}
      {tab === "Questions" ? <FormTabCard actionLabel="Open Builder" icon={ClipboardPenLine} onAction={onOpenBuilder} title="Question Structure" lines={["Questions are managed through the canonical builder so there is no duplicate form designer.", "Use sections, groups, repeat groups, variable names, validation, option lists, reference bindings, and logic from the builder.", "Published versions remain protected; edits create draft versions before publishing."]} /> : null}
      {tab === "Reference Data" ? <FormTabCard actionLabel="Manage in Builder" icon={Database} onAction={onOpenBuilder} title="Reference Data Binding" lines={["Bind fields to countries, regions, districts, communities, facilities, donors, beneficiaries, and custom lists.", "Support controlled values, hierarchy, active/inactive values, effective dates, and version-aware warnings.", "Prevent invalid free-text values when controlled lists are required."]} /> : null}
      {tab === "Permissions" ? <FormTabCard actionLabel="Manage Permissions" icon={ShieldCheck} onAction={onOpenBuilder} title="Form Access Control" lines={["Configure role, user, team, project, and location-level access.", "Control view, edit, publish, archive, assign, export, review, approve, and manage controls permissions.", "Field officers should only see assigned published forms."]} /> : null}
      {tab === "Workflow" ? <FormTabCard actionLabel="Configure Workflow" icon={Workflow} onAction={onOpenBuilder} title="Approval Workflow" lines={["Simple, standard, and correction workflows are configurable per form.", "Reviewer role, team, location scope, required comments, and SLA rules are form-level settings.", "Submission decisions remain in Submissions, with form workflow determining the path."]} /> : null}
      {tab === "Data Quality" ? <FormTabCard actionLabel="Open Data Quality" icon={ClipboardCheck} onAction={onOpenDataQuality} title="Data Quality Rules" lines={["Required fields, ranges, duplicate detection, outliers, GPS validation, consent checks, duration rules, and severity controls.", "Critical rules can block submission or route records for correction.", "Detailed investigation belongs in Data Quality."]} /> : null}
      {tab === "Governance" ? <FormTabCard actionLabel="Manage Governance" icon={ShieldCheck} onAction={onOpenBuilder} title="Form Governance" lines={["Set status, consent, edits after approval, duplicate prevention, retention, masking, export restrictions, and record locking.", "High-risk changes require reason capture and immutable audit evidence.", "Governance Administration remains outside Forms; this is form-level governance only."]} /> : null}
      {tab === "Mapping Settings" ? <FormTabCard actionLabel="Open Mapping" icon={MapPinned} onAction={onOpenMapping} title="Form Mapping Settings" lines={["Require GPS, set accuracy thresholds, boundary validation, allowed collection areas, coordinate masking, and duplicate GPS detection.", "GIS analysis remains in Mapping; Forms only defines collection behavior.", "Submission GPS evidence stays tied to the form version used in the field."]} /> : null}
      {tab === "Preview" ? <FormTabCard actionLabel="Open Preview Flow" icon={Smartphone} onAction={onOpenBuilder} title="Preview & Test" lines={["Approved route: /forms/:formId/preview.", "Test web, tablet, mobile, enumerator, and respondent modes before publishing.", "Preview runs are test-only and do not count as real submissions."]} /> : null}
      {tab === "Review" ? <FormTabCard actionLabel="Open Publish Review" icon={ClipboardCheck} onAction={onOpenBuilder} title="Publish Readiness Review" lines={["Approved route: /forms/:formId/review.", "Publishing is blocked when critical checks fail: missing project, no questions, duplicate variables, invalid logic, or unreviewed controls.", "Publishing creates an immutable version and makes the form available for field assignments."]} /> : null}
      {tab === "Version History" ? <FormTabCard actionLabel="Open Builder" icon={GitBranch} onAction={onOpenBuilder} title="Version History" lines={[`Current version: v${form.version}.`, "Published forms are never overwritten silently.", "Old submissions remain linked to the exact version used during collection."]} /> : null}
      {tab === "Audit Trail" ? <FormTabCard actionLabel="Open Submissions" icon={History} onAction={onOpenSubmissions} title="Audit Trail" lines={["Track form created, question changes, rule changes, permissions, workflow, publish, archive, export, and submission events.", "Audit records are immutable and integrate with Governance Audit Trail.", "Authorized users can filter/export logs for form accountability."]} /> : null}
    </section>
  );
}

function FormOverview({ form }: { form: FormListItem }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-2xl border bg-background/50 p-5">
        <h3 className="font-semibold">Form Overview</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{form.description ?? "No description has been added yet."}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Signal label="Project" value={form.project_name} />
          <Signal label="Owner" value={form.owner} />
          <Signal label="Current Version" value={`v${form.version}`} />
          <Signal label="Status" value={form.status} />
          <Signal label="Active Assignments" value={`${form.active_assignments}`} />
          <Signal label="Total Submissions" value={`${form.total_submissions}`} />
        </div>
      </div>
      <div className="rounded-2xl border bg-background/50 p-5">
        <h3 className="font-semibold">Builder & Governance Summary</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Signal label="Questions" value={`${form.questions}`} />
          <Signal label="Sections" value={`${form.sections}`} />
          <Signal label="Workflow Status" value={form.pending_approval ? "Pending approval" : "Configured"} tone={form.pending_approval ? "warning" : "success"} />
          <Signal label="Quality Score" value={`${form.quality_score}%`} tone={form.quality_score >= 70 ? "success" : "warning"} />
        </div>
      </div>
    </div>
  );
}

function TemplatesSection({ onOpenBuilder, templates }: { onOpenBuilder: () => void; templates: typeof previewTemplates }) {
  return (
    <section className="space-y-4">
      <SectionHeader action={<Button onClick={onOpenBuilder} variant="primary"><Plus aria-hidden="true" /> Create from template</Button>} description="Reusable baseline, endline, monitoring, assessment, registration, case management, training, and feedback forms." title="Form Templates" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <div className="rounded-2xl border bg-panel p-5 shadow-line" key={template.id}>
            <Badge tone={template.is_featured ? "accent" : "neutral"}>{template.category}</Badge>
            <h3 className="mt-3 font-semibold">{template.name}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{template.description}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Signal label="Fields" value={`${template.summary.field_count}`} />
              <Signal label="GPS" value={template.summary.has_gps ? "Yes" : "No"} />
              <Signal label="Setup" value={`${template.estimated_minutes}m`} />
            </div>
            <Button className="mt-4 w-full" onClick={onOpenBuilder} variant="secondary">
              <Copy aria-hidden="true" />
              Use template
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReferenceDataSection({ onOpenBuilder }: { onOpenBuilder: () => void }) {
  const lists = [
    ["Administrative hierarchy", "Country -> Region -> District -> Community", "Versioned"],
    ["Facilities", "Schools, clinics, warehouses, service points", "Active"],
    ["Beneficiary categories", "Household, farmer, youth, group, facility", "Active"],
    ["Donor and intervention codes", "Donors, activities, intervention types", "Draft"],
  ];
  return (
    <section className="space-y-4">
      <SectionHeader action={<Button onClick={onOpenBuilder} variant="primary"><Database aria-hidden="true" /> Bind to questions</Button>} description="Manage form-level controlled reference lists and attach them to questions. System-wide master data stays in Administration." title="Form Reference Data" />
      <div className="grid gap-4 md:grid-cols-2">
        {lists.map(([name, description, status]) => (
          <div className="rounded-2xl border bg-panel p-5 shadow-line" key={name}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </div>
              <Badge tone={status === "Draft" ? "warning" : "success"}>{status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FormTabCard({ actionLabel, icon: Icon, lines, onAction, title }: { actionLabel: string; icon: LucideIcon; lines: string[]; onAction: () => void; title: string }) {
  return (
    <div className="rounded-2xl border bg-background/50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
            <Icon aria-hidden="true" size={18} />
          </span>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {lines.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>
        </div>
        <Button onClick={onAction} variant="secondary">{actionLabel}</Button>
      </div>
    </div>
  );
}

function FormFilters() {
  return (
    <div className="grid gap-3 rounded-2xl border bg-panel p-4 shadow-line md:grid-cols-5">
      <Input placeholder="Project" />
      <Input placeholder="Status" />
      <Input placeholder="Owner" />
      <Input placeholder="Form type" />
      <Input placeholder="Date range" />
    </div>
  );
}

function SectionHeader({ action, description, title }: { action?: ReactNode; description: string; title: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-panel p-5 shadow-line md:flex-row md:items-start md:justify-between">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function Signal({ label, tone = "neutral", value }: { label: string; tone?: "success" | "warning" | "danger" | "neutral"; value: string }) {
  return (
    <div className="rounded-xl border bg-background/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold", tone === "warning" && "text-warning", tone === "danger" && "text-danger", tone === "success" && "text-success")}>{value}</p>
    </div>
  );
}

function InsightCard({ icon: Icon, lines, title }: { icon: LucideIcon; lines: string[]; title: string }) {
  return (
    <div className="rounded-2xl border bg-panel p-5 shadow-line">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="text-primary" size={18} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mt-4 space-y-2">
        {lines.length ? lines.map((line) => <p className="rounded-xl border bg-background/50 px-3 py-2 text-sm text-muted-foreground" key={line}>{line}</p>) : <p className="rounded-xl border border-dashed bg-muted/30 px-3 py-3 text-sm text-muted-foreground">No activity yet.</p>}
      </div>
    </div>
  );
}
