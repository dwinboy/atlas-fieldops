"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  ArrowLeft,
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
  Table2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import type { CurrentPrincipal, DataFormSchemaRead, SubmissionRead } from "@/lib/api";
import { getFormSchema, listForms, listFormTemplates, listSubmissions } from "@/lib/api";
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
import {
  computeFormsSummary,
  filterForms,
  formatDate,
  qualityTone,
  statusTone,
  toCsv,
} from "@/modules/forms/utils";
import { useWorkspaceStore } from "@/stores/workspace";
import { getPreviewSubmissions } from "@/modules/submissions/utils";
import type { SubmissionRecord } from "@/modules/submissions/data";

type FormsModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

function isPreview(token: string | null): boolean {
  return !token || token === "preview-token";
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

type FormStats = {
  approved_submissions: number;
  field_submitted_records: number;
  last_submission_at: string | null;
  linked_beneficiaries: number;
  pending_review_submissions: number;
  rejected_returned_submissions: number;
  total_submissions: number;
  uploaded_records: number;
};

type FormGridQuestion = {
  key: string;
  label: string;
  type: string;
  section: string;
};

function isImportedSubmission(submission: SubmissionRead | SubmissionRecord): boolean {
  return Boolean(
    submission.is_imported ||
      submission.import_batch_id ||
      submission.imported_at ||
      submission.source_system,
  );
}

function submissionSourceLabel(submission: SubmissionRead | SubmissionRecord): string {
  if (isImportedSubmission(submission)) return "Uploaded / Imported";
  if (submission.offline_created) return "Mobile";
  return "Field Submitted";
}

function submissionActorLabel(submission: SubmissionRead | SubmissionRecord): string {
  if (isImportedSubmission(submission)) {
    return submission.imported_by_user_id ?? "Uploaded user";
  }
  return submission.field_officer_id;
}

function statusBucket(status: string): "approved" | "pending" | "rejectedReturned" | "other" {
  if (status === "approved") return "approved";
  if (["submitted", "under_review", "pending_review", "resubmitted"].includes(status)) return "pending";
  if (["rejected", "correction_requested", "needs_correction", "returned"].includes(status)) return "rejectedReturned";
  return "other";
}

function emptyStats(): FormStats {
  return {
    approved_submissions: 0,
    field_submitted_records: 0,
    last_submission_at: null,
    linked_beneficiaries: 0,
    pending_review_submissions: 0,
    rejected_returned_submissions: 0,
    total_submissions: 0,
    uploaded_records: 0,
  };
}

function statValue(form: FormListItem, key: keyof FormStats): number {
  const value = form[key];
  return typeof value === "number" ? value : 0;
}

function buildFormStats(submissions: (SubmissionRead | SubmissionRecord)[]): Map<string, FormStats> {
  const map = new Map<string, FormStats>();
  for (const submission of submissions) {
    const stats = map.get(submission.form_id) ?? emptyStats();
    stats.total_submissions += 1;
    if (isImportedSubmission(submission)) {
      stats.uploaded_records += 1;
    } else {
      stats.field_submitted_records += 1;
    }
    const bucket = statusBucket(submission.status);
    if (bucket === "approved") stats.approved_submissions += 1;
    if (bucket === "pending") stats.pending_review_submissions += 1;
    if (bucket === "rejectedReturned") stats.rejected_returned_submissions += 1;
    if (submission.entity_id) stats.linked_beneficiaries += 1;
    const date = submission.imported_at ?? submission.submitted_at ?? submission.sync_received_at;
    if (
      date &&
      (!stats.last_submission_at ||
        new Date(date).getTime() > new Date(stats.last_submission_at).getTime())
    ) {
      stats.last_submission_at = date;
    }
    map.set(submission.form_id, stats);
  }
  return map;
}

function questionsFromSchema(schema: DataFormSchemaRead | null): FormGridQuestion[] {
  const sections = ((schema?.schema as { sections?: unknown })?.sections ?? []) as {
    title?: string;
    fields?: {
      id?: string;
      variable_name?: string | null;
      label?: string;
      type?: string;
    }[];
  }[];
  return sections.flatMap((section) =>
    (section.fields ?? []).map((field) => ({
      key: field.variable_name || field.id || "field",
      label: field.label || field.variable_name || field.id || "Field",
      section: section.title || "Form questions",
      type: field.type || "text",
    })),
  );
}

function payloadColumns(submissions: (SubmissionRead | SubmissionRecord)[]): FormGridQuestion[] {
  const keys = new Map<string, FormGridQuestion>();
  for (const submission of submissions) {
    for (const [key, value] of Object.entries(submission.payload_json ?? {})) {
      if (key.startsWith("_") || keys.has(key)) continue;
      keys.set(key, {
        key,
        label: key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
        section: "Uploaded / legacy fields",
        type: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "text",
      });
    }
  }
  return Array.from(keys.values());
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function previewSubmissionFormId(submission: SubmissionRecord): string {
  const formName = submission.form_name.toLowerCase();
  if (submission.form_id.includes("farmer") || formName.includes("farmer")) {
    return "preview-farmer-registration";
  }
  if (submission.form_id.includes("baseline") || formName.includes("baseline")) {
    return "preview-baseline-household";
  }
  if (submission.form_id.includes("health") || formName.includes("health")) {
    return "preview-health-monitoring";
  }
  return submission.form_id;
}

export function FormsModule({ principal, token }: FormsModuleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<FormsSection>("dashboard");
  const [activeTab, setActiveTab] = useState<FormDetailTab>("Overview");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [creationOpen, setCreationOpen] = useState(false);
  const [builderFormId, setBuilderFormId] = useState<string | null>(null);
  const localForms = useWorkspaceStore((state) => state.localForms);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const preview = isPreview(token);
  const enabled = Boolean(token && !preview);
  const canManageForms = hasAnyPermission(principal, [
    "forms.manage",
    "forms.create",
    "forms.edit",
    "forms.publish",
  ]);

  const formsQuery = useQuery({
    queryKey: ["forms-module", token],
    queryFn: () => listForms(token ?? ""),
    enabled,
  });
  const submissionsQuery = useQuery({
    queryKey: ["forms-module", "submissions", token],
    queryFn: () => listSubmissions(token ?? ""),
    enabled,
  });
  const templatesQuery = useQuery({
    queryKey: ["forms-module", "templates", token],
    queryFn: () => listFormTemplates(token ?? ""),
    enabled,
  });

  const formSubmissions = useMemo<(SubmissionRead | SubmissionRecord)[]>(
    () =>
      preview
        ? getPreviewSubmissions().map((submission) => ({
            ...submission,
            form_id: previewSubmissionFormId(submission),
          }))
        : (submissionsQuery.data ?? []),
    [preview, submissionsQuery.data],
  );
  const formStats = useMemo(() => buildFormStats(formSubmissions), [formSubmissions]);
  const forms = useMemo<FormListItem[]>(() => {
    const baseForms = preview
      ? [...localForms, ...previewForms]
      : (formsQuery.data ?? []).map(normalizeBackendForm);
    return baseForms.map((form) => {
      const stats = formStats.get(form.id);
      if (!stats) return form;
      return {
        ...form,
        ...stats,
      };
    });
  }, [formStats, formsQuery.data, localForms, preview]);
  const templates = preview ? previewTemplates : (templatesQuery.data ?? []);
  const summary = computeFormsSummary(forms);
  const visibleForms = useMemo(
    () => filterForms(forms, activeSection),
    [activeSection, forms],
  );
  const selectedForm = forms.find((form) => form.id === selectedFormId) ?? null;
  const isCreateRoute =
    (pathname ?? "").replace(/\/+$/, "") === "/forms/create";
  const dataRouteMatch = pathname?.match(/^\/forms\/([^/]+)\/data\/?$/);
  const dataFormId = dataRouteMatch?.[1] ? decodeURIComponent(dataRouteMatch[1]) : null;
  const dataForm = dataFormId ? forms.find((form) => form.id === dataFormId) ?? null : null;

  useEffect(() => {
    if (!isCreateRoute) {
      return;
    }
    setSelectedFormId(null);
    setBuilderFormId(null);
    setCreationOpen(true);
  }, [isCreateRoute]);

  useEffect(() => {
    const normalizedPath = (pathname ?? "").replace(/\/+$/, "");
    const sectionFromPath = formsSections.find((section) => section.route === normalizedPath);
    if (sectionFromPath) {
      setSelectedFormId(null);
      setActiveSection(sectionFromPath.id);
    }
  }, [pathname]);

  function openForm(form: FormListItem, tab: FormDetailTab = "Overview"): void {
    if (["all", "published", "archived"].includes(activeSection)) {
      router.push(`/forms/${form.id}/data`);
      return;
    }
    setSelectedFormId(form.id);
    setActiveTab(tab);
  }

  function openFormsSection(section: FormsSection): void {
    const route = formsSections.find((item) => item.id === section)?.route ?? "/forms";
    router.push(route);
    setSelectedFormId(null);
    setActiveSection(section);
  }

  function openFormData(formId: string, query?: string): void {
    router.push(`/forms/${formId}/data${query ? `?${query}` : ""}`);
  }

  const columns: TableColumn<FormListItem>[] = [
    {
      key: "name",
      header: "Form",
      value: (form) => `${form.name} ${form.slug}`,
      render: (form) => (
        <button
          className="text-left"
          onClick={() => openForm(form)}
          type="button"
        >
          <p className="font-medium text-foreground">{form.name}</p>
          <p className="text-xs text-muted-foreground">{form.slug}</p>
        </button>
      ),
    },
    {
      key: "project",
      header: "Project",
      value: (form) => form.project_name,
      render: (form) => form.project_name,
    },
    {
      key: "version",
      header: "Version",
      value: (form) => String(form.version),
      render: (form) => `v${form.version}`,
    },
    {
      key: "status",
      header: "Status",
      value: (form) => form.status,
      render: (form) => (
        <Badge tone={statusTone(form.status)}>{form.status}</Badge>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      value: (form) => form.owner,
      render: (form) => form.owner,
    },
    {
      key: "questions",
      header: "Questions",
      value: (form) => String(form.questions),
      render: (form) => form.questions,
    },
    {
      key: "updated",
      header: "Last Updated",
      value: (form) => form.updated_at,
      render: (form) => formatDate(form.updated_at),
    },
    {
      key: "assignments",
      header: "Assignments",
      value: (form) => String(form.active_assignments),
      render: (form) => form.active_assignments,
    },
    {
      key: "submissions",
      header: "Submissions",
      value: (form) => String(form.total_submissions),
      render: (form) => form.total_submissions,
    },
    {
      key: "source",
      header: "Source Split",
      value: (form) =>
        `${statValue(form, "uploaded_records")} ${statValue(form, "field_submitted_records")}`,
      render: (form) => (
        <div className="space-y-1 text-xs">
          <p>{statValue(form, "field_submitted_records")} field/mobile</p>
          <p className="text-muted-foreground">
            {statValue(form, "uploaded_records")} uploaded
          </p>
        </div>
      ),
    },
    {
      key: "approval",
      header: "Approval",
      value: (form) =>
        `${statValue(form, "approved_submissions")} ${statValue(form, "pending_review_submissions")} ${statValue(form, "rejected_returned_submissions")}`,
      render: (form) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone="success">{statValue(form, "approved_submissions")} approved</Badge>
          <Badge tone="warning">{statValue(form, "pending_review_submissions")} pending</Badge>
          <Badge tone={statValue(form, "rejected_returned_submissions") ? "danger" : "neutral"}>
            {statValue(form, "rejected_returned_submissions")} returned/rejected
          </Badge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (form) => (
        <div className="flex justify-end gap-2">
          <Button onClick={() => openForm(form)} size="sm" variant="secondary">
            View data
          </Button>
          <Button
            onClick={() => openForm(form, "Builder")}
            size="sm"
            variant="ghost"
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  if (creationOpen) {
    const builderForm = builderFormId
      ? forms.find((form) => form.id === builderFormId)
      : null;
    return (
      <FormCreationWorkspace
        existingForms={forms}
        initialForm={builderForm}
        onBack={() => {
          if (
            typeof window !== "undefined" &&
            window.location.pathname.replace(/\/+$/, "") === "/forms/create"
          ) {
            window.history.replaceState(null, "", "/forms");
          }
          setCreationOpen(false);
          setBuilderFormId(null);
        }}
        token={token}
      />
    );
  }

  if (dataFormId) {
    return (
      <FormDataGridWorkspace
        canExport={hasAnyPermission(principal, ["submissions.export", "reports.export", "forms.manage"])}
        form={dataForm}
        formId={dataFormId}
        onBack={() => router.push("/forms/all")}
        searchParams={searchParams}
        submissions={formSubmissions.filter((submission) => submission.form_id === dataFormId)}
        token={token}
      />
    );
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="collect">OPERATIONS</Badge>
              <Badge
                tone={summary.forms_with_quality_issues ? "warning" : "success"}
              >
                {summary.forms_with_quality_issues
                  ? `${summary.forms_with_quality_issues} quality alerts`
                  : "Forms healthy"}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Forms</h1>
              <HelpHint label="About Forms" title="Forms">
                Design, publish, version, govern, and manage survey/data
                collection forms with reference data, workflow, quality,
                mapping, permissions, and audit controls.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canManageForms}
              onClick={() => {
                setBuilderFormId(null);
                setCreationOpen(true);
              }}
              variant="primary"
            >
              <Plus aria-hidden="true" />
              Create form
            </Button>
            <Button
              onClick={() =>
                downloadCsv(
                  "atlas-forms.csv",
                  forms.map((form) => ({
                    name: form.name,
                    project: form.project_name,
                    version: form.version,
                    status: form.status,
                    owner: form.owner,
                    questions: form.questions,
                    submissions: form.total_submissions,
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
        <div
          className="mt-3 flex gap-1.5 overflow-x-auto product-scrollbar"
          aria-label="Forms sections"
        >
          {formsSections.map((section) => (
            <button
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                activeSection === section.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-panel hover:bg-muted",
              )}
              key={section.id}
              onClick={() => openFormsSection(section.id)}
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
          onOpenBuilder={() => {
            setBuilderFormId(selectedForm.id);
            setCreationOpen(true);
          }}
          onOpenDataQuality={() => setActiveView("dataQuality")}
          onOpenMapping={() => setActiveView("map")}
          onOpenSubmissions={() => setActiveView("submissions")}
          tab={activeTab}
          setTab={setActiveTab}
        />
      ) : null}

      {!selectedForm && activeSection === "dashboard" ? (
        <FormsDashboard
          forms={forms}
          onOpenForm={openForm}
          onOpenSection={openFormsSection}
          summary={summary}
        />
      ) : null}

      {!selectedForm &&
      ["all", "draft", "published", "archived"].includes(activeSection) ? (
        <section className="space-y-4">
          <SectionHeader
            action={
              <Button
                disabled={!canManageForms}
                onClick={() => {
                  setBuilderFormId(null);
                  setCreationOpen(true);
                }}
                variant="primary"
              >
                <Plus aria-hidden="true" /> Create form
              </Button>
            }
            description={
              formsSections.find((section) => section.id === activeSection)
                ?.description ?? "Manage forms"
            }
            title={
              formsSections.find((section) => section.id === activeSection)
                ?.label ?? "Forms"
            }
          />
          <FormFilters />
          {activeSection === "all" ? (
            <DataTable
              columns={columns}
              emptyLabel="No forms match this view yet"
              rows={visibleForms}
              searchLabel="Search forms, projects, owners, status"
              title="Form list"
            />
          ) : (
            <FormStatusCards
              canManageForms={canManageForms}
              forms={visibleForms}
              onAssign={(form) => {
                setActiveView("officers");
                router.push(`/field-operations?formId=${encodeURIComponent(form.id)}`);
              }}
              onEdit={(form) => {
                setBuilderFormId(form.id);
                setCreationOpen(true);
              }}
              onOpenData={(form, query) => openFormData(form.id, query)}
              section={activeSection}
            />
          )}
        </section>
      ) : null}

      {!selectedForm && activeSection === "templates" ? (
        <TemplatesSection
          onOpenBuilder={() => {
            setBuilderFormId(null);
            setCreationOpen(true);
          }}
          templates={templates}
        />
      ) : null}

      {!selectedForm && activeSection === "reference-data" ? (
        <ReferenceDataSection
          onOpenBuilder={() => {
            setBuilderFormId(null);
            setCreationOpen(true);
          }}
        />
      ) : null}
    </section>
  );
}

function FormsDashboard({
  forms,
  onOpenForm,
  onOpenSection,
  summary,
}: {
  forms: FormListItem[];
  onOpenForm: (form: FormListItem, tab?: FormDetailTab) => void;
  onOpenSection: (section: FormsSection) => void;
  summary: ReturnType<typeof computeFormsSummary>;
}) {
  const cards = [
    { icon: FileStack, label: "Total Forms", section: "all" as FormsSection, value: summary.total_forms },
    {
      icon: ClipboardPenLine,
      label: "Draft Forms",
      section: "draft" as FormsSection,
      value: summary.draft_forms,
    },
    {
      icon: Smartphone,
      label: "Published Forms",
      section: "published" as FormsSection,
      value: summary.published_forms,
    },
    { icon: Archive, label: "Archived Forms", section: "archived" as FormsSection, value: summary.archived_forms },
    {
      icon: ClipboardCheck,
      label: "Pending Approval",
      section: "draft" as FormsSection,
      value: summary.pending_approval_forms,
    },
    {
      icon: CheckCircle2,
      label: "Active Collection",
      section: "published" as FormsSection,
      value: summary.active_collection_forms,
    },
    {
      icon: ShieldCheck,
      label: "Quality Issues",
      section: "all" as FormsSection,
      value: summary.forms_with_quality_issues,
    },
    {
      icon: History,
      label: "Recently Updated",
      section: "all" as FormsSection,
      value: summary.recently_updated_forms,
    },
  ];
  const recentlyPublished = forms
    .filter((form) => form.status === "published")
    .slice(0, 4);
  const mostUsed = [...forms]
    .sort((left, right) => right.total_submissions - left.total_submissions)
    .slice(0, 4);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button
            className="rounded-xl border bg-panel p-3 text-left shadow-line transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
            key={card.label}
            onClick={() => onOpenSection(card.section)}
            type="button"
          >
            <card.icon aria-hidden="true" className="text-primary" size={18} />
            <p className="mt-4 text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border bg-panel p-3.5 shadow-line">
          <h2 className="font-semibold">Most Used Forms</h2>
          <div className="mt-4 space-y-3">
            {mostUsed.map((form) => (
              <button
                className="w-full rounded-xl border bg-background/50 p-3 text-left transition hover:bg-muted/50"
                key={form.id}
                onClick={() => onOpenForm(form)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{form.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {form.project_name} · v{form.version}
                    </p>
                  </div>
                  <Badge tone={qualityTone(form.quality_score)}>
                    {form.quality_score}%
                  </Badge>
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
        <div className="rounded-xl border bg-panel p-3.5 shadow-line">
          <h2 className="font-semibold">Governance Alerts</h2>
          <div className="mt-4 space-y-3">
            <Signal
              label="Forms pending approval"
              value={`${summary.pending_approval_forms}`}
              tone={summary.pending_approval_forms ? "warning" : "success"}
            />
            <Signal
              label="Forms with quality issues"
              value={`${summary.forms_with_quality_issues}`}
              tone={summary.forms_with_quality_issues ? "warning" : "success"}
            />
            <Signal
              label="Active collection forms"
              value={`${summary.active_collection_forms}`}
            />
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-sm font-medium">
            Form governance
            <HelpHint label="About form governance" title="Form governance">
              Form governance remains form-level: permissions, workflow, data
              quality, mapping settings, versions, and audit trail belong here.
            </HelpHint>
          </div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <InsightCard
          icon={History}
          title="Recent Form Activity"
          lines={forms
            .slice(0, 4)
            .map(
              (form) => `${form.name} updated ${formatDate(form.updated_at)}`,
            )}
        />
        <InsightCard
          icon={Smartphone}
          title="Recently Published"
          lines={recentlyPublished.map(
            (form) => `${form.name} · ${form.active_assignments} assignment(s)`,
          )}
        />
        <InsightCard
          icon={GitBranch}
          title="Version Activity"
          lines={forms
            .slice(0, 4)
            .map((form) => `${form.name}: v${form.version} · ${form.status}`)}
        />
      </div>
    </div>
  );
}

function FormStatusCards({
  canManageForms,
  forms,
  onAssign,
  onEdit,
  onOpenData,
  section,
}: {
  canManageForms: boolean;
  forms: FormListItem[];
  onAssign: (form: FormListItem) => void;
  onEdit: (form: FormListItem) => void;
  onOpenData: (form: FormListItem, query?: string) => void;
  section: FormsSection;
}) {
  if (!forms.length) {
    return (
      <div className="rounded-xl border border-dashed bg-panel p-8 text-center">
        <FileStack aria-hidden="true" className="mx-auto text-muted-foreground" size={24} />
        <p className="mt-3 font-medium">No {section} forms yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Forms will appear here when they match this status.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {forms.map((form) => {
        const readiness = Math.max(
          20,
          Math.min(100, Math.round((form.quality_score + (form.project_id ? 15 : -15)) / 1.15)),
        );
        const isDraft = section === "draft";
        const isPublished = section === "published";
        const isArchived = section === "archived";
        const openPrimary = () => {
          if (isDraft) {
            onEdit(form);
          } else {
            onOpenData(form);
          }
        };
        return (
          <article
            className="rounded-xl border bg-panel p-4 shadow-line transition hover:border-primary/35 hover:shadow-soft"
            key={form.id}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
              openPrimary();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              openPrimary();
            }}
            role="button"
            tabIndex={0}
          >
            <div className="block w-full text-left">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(form.status)}>{form.status}</Badge>
                    <Badge tone={form.project_id ? "success" : "warning"}>
                    {form.project_id ? "Project attached" : "Project not attached"}
                    </Badge>
                    {isArchived ? <Badge tone="neutral">Read only</Badge> : null}
                  </div>
                  <button
                    className="mt-3 text-left text-lg font-semibold transition hover:text-primary"
                    onClick={openPrimary}
                    type="button"
                  >
                    {form.name}
                  </button>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {form.form_type} · {form.owner}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 px-3 py-2 text-right">
                  <p className="text-lg font-semibold">v{form.version}</p>
                  <p className="text-xs text-muted-foreground">version</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <Signal label="Project" value={form.project_name || "Not attached"} />
                <Signal label="Last updated" value={formatDate(form.updated_at)} />
                <Signal label="Sections" value={`${form.sections}`} />
                <Signal label="Questions" value={`${form.questions}`} />
              </div>
              {isDraft ? (
                <div className="mt-4 rounded-xl border bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">Readiness</span>
                    <span>{readiness}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${readiness}%` }} />
                  </div>
                  {!form.project_id ? (
                    <p className="mt-2 text-xs text-warning">
                      Attach this form to a project before publishing if governance requires project context.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <MiniStat label="Total" value={statValue(form, "total_submissions")} onClick={() => onOpenData(form, "filter=all")} />
                  <MiniStat label="Approved" value={statValue(form, "approved_submissions")} onClick={() => onOpenData(form, "status=approved")} />
                  <MiniStat label="Pending" value={statValue(form, "pending_review_submissions")} onClick={() => onOpenData(form, "status=pending_review")} />
                  <MiniStat label="Uploaded" value={statValue(form, "uploaded_records")} onClick={() => onOpenData(form, "source=uploaded")} />
                  <MiniStat label="Field" value={statValue(form, "field_submitted_records")} onClick={() => onOpenData(form, "source=field")} />
                  <MiniStat label="Returned" value={statValue(form, "rejected_returned_submissions")} onClick={() => onOpenData(form, "status=returned")} />
                  <MiniStat label="Entities" value={statValue(form, "linked_beneficiaries")} onClick={() => onOpenData(form, "entity=linked")} />
                  <MiniStat label="Last" value={form.last_submission_at ? formatDate(form.last_submission_at) : "None"} onClick={() => onOpenData(form)} />
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
              {isDraft ? (
                <>
                  <Button disabled={!canManageForms} onClick={() => onEdit(form)} size="sm" variant="primary">
                    Continue Editing
                  </Button>
                  <Button onClick={() => onOpenData(form)} size="sm" variant="secondary">
                    Preview
                  </Button>
                  <Button disabled={!canManageForms || !form.project_id} onClick={() => onEdit(form)} size="sm" variant="secondary">
                    Publish
                  </Button>
                </>
              ) : null}
              {isPublished ? (
                <>
                  <Button onClick={() => onOpenData(form)} size="sm" variant="primary">
                    <Table2 aria-hidden="true" />
                    View Data
                  </Button>
                  <Button disabled={!canManageForms} onClick={() => onAssign(form)} size="sm" variant="secondary">
                    Assign
                  </Button>
                  <Button disabled={!canManageForms} onClick={() => onEdit(form)} size="sm" variant="secondary">
                    New Version
                  </Button>
                  <Button disabled={!canManageForms} size="sm" variant="secondary">
                    Archive
                  </Button>
                </>
              ) : null}
              {isArchived ? (
                <>
                  <Button onClick={() => onOpenData(form)} size="sm" variant="primary">
                    View Historical Data
                  </Button>
                  <Button disabled={!canManageForms} size="sm" variant="secondary">
                    Restore
                  </Button>
                  <Button size="sm" variant="secondary">
                    Export
                  </Button>
                </>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MiniStat({
  label,
  onClick,
  value,
}: {
  label: string;
  onClick: () => void;
  value: string | number;
}) {
  return (
    <button
      className="rounded-lg border bg-background/70 p-2 text-left transition hover:border-primary/40 hover:bg-primary/5"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      type="button"
    >
      <p className="text-base font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </button>
  );
}

function FormDataGridWorkspace({
  canExport,
  form,
  formId,
  onBack,
  searchParams,
  submissions,
  token,
}: {
  canExport: boolean;
  form: FormListItem | null;
  formId: string;
  onBack: () => void;
  searchParams: ReturnType<typeof useSearchParams>;
  submissions: (SubmissionRead | SubmissionRecord)[];
  token: string | null;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [sourceFilter, setSourceFilter] = useState(searchParams.get("source") ?? "all");
  const schemaQuery = useQuery({
    enabled: Boolean(token && token !== "preview-token" && formId),
    queryFn: () => getFormSchema(token ?? "", formId),
    queryKey: ["forms", "data-grid", "schema", token, formId],
  });
  const schemaQuestions = questionsFromSchema(schemaQuery.data ?? null);
  const allQuestionMap = new Map<string, FormGridQuestion>();
  for (const question of [...schemaQuestions, ...payloadColumns(submissions)]) {
    if (!allQuestionMap.has(question.key)) allQuestionMap.set(question.key, question);
  }
  const questions = Array.from(allQuestionMap.values());
  const filteredSubmissions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return submissions.filter((submission) => {
      const source = submissionSourceLabel(submission);
      if (sourceFilter === "uploaded" && !isImportedSubmission(submission)) return false;
      if (sourceFilter === "field" && isImportedSubmission(submission)) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "pending_review") {
          if (!["submitted", "under_review", "pending_review", "resubmitted"].includes(submission.status)) return false;
        } else if (statusFilter === "returned") {
          if (!["rejected", "correction_requested", "needs_correction", "returned"].includes(submission.status)) return false;
        } else if (submission.status !== statusFilter) {
          return false;
        }
      }
      if (!term) return true;
      return [
        submission.client_submission_id,
        source,
        submissionActorLabel(submission),
        submission.status,
        submission.entity_id ?? "",
        ...Object.values(submission.payload_json ?? {}).map(formatCell),
      ].join(" ").toLowerCase().includes(term);
    });
  }, [search, sourceFilter, statusFilter, submissions]);
  const stats = buildFormStats(submissions).get(formId) ?? emptyStats();

  function exportGrid(): void {
    downloadCsv(
      `${form?.slug ?? formId}-data.csv`,
      filteredSubmissions.map((submission) => ({
        submission_id: submission.client_submission_id,
        source: submissionSourceLabel(submission),
        submitted_or_uploaded_by: submissionActorLabel(submission),
        date: submission.imported_at ?? submission.submitted_at,
        status: submission.status,
        entity_code: submission.entity_id ?? "",
        project: form?.project_name ?? submission.project_id ?? "",
        form_version: submission.server_sequence,
        ...Object.fromEntries(
          questions.map((question) => [
            question.label,
            formatCell(submission.payload_json?.[question.key]),
          ]),
        ),
      })),
    );
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="collect">FORM DATA</Badge>
              <Badge tone={form?.status === "published" ? "success" : "neutral"}>
                {form?.status ?? "Unknown form"}
              </Badge>
              <Badge tone="accent">{filteredSubmissions.length} visible rows</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {form?.name ?? "Form data"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Spreadsheet-style view of submissions, uploaded records, approval
              status, source attribution, and every question response.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onBack} variant="secondary">
              <ArrowLeft aria-hidden="true" />
              Back to forms
            </Button>
            <Button disabled={!canExport || !filteredSubmissions.length} onClick={exportGrid} variant="secondary">
              <Download aria-hidden="true" />
              Export grid
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <MiniStat label="Total submissions" value={stats.total_submissions} onClick={() => setStatusFilter("all")} />
          <MiniStat label="Approved" value={stats.approved_submissions} onClick={() => setStatusFilter("approved")} />
          <MiniStat label="Uploaded / imported" value={stats.uploaded_records} onClick={() => setSourceFilter("uploaded")} />
          <MiniStat label="Field submitted" value={stats.field_submitted_records} onClick={() => setSourceFilter("field")} />
        </div>
      </div>

      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="grid gap-3 xl:grid-cols-[1fr_180px_180px]">
          <label className="relative">
            <Database aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Search any response, submission ID, source, officer, or status" value={search} />
          </label>
          <Select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="all">All statuses</option>
            <option value="pending_review">Pending review</option>
            <option value="approved">Approved</option>
            <option value="returned">Returned/rejected</option>
          </Select>
          <Select onChange={(event) => setSourceFilter(event.target.value)} value={sourceFilter}>
            <option value="all">All sources</option>
            <option value="field">Field/mobile</option>
            <option value="uploaded">Uploaded/imported</option>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-panel shadow-line">
        <div className="overflow-auto product-scrollbar">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-muted/70 text-left text-xs uppercase text-muted-foreground">
                {["Submission ID", "Source", "Submitted / Uploaded By", "Date", "Status", "Entity Code", "Project", "Version"].map((header, index) => (
                  <th
                    className={cn(
                      "sticky top-0 z-20 border-b px-3 py-3 font-semibold",
                      index === 0 ? "left-0 z-30 bg-muted" : "bg-muted/70",
                    )}
                    key={header}
                  >
                    {header}
                  </th>
                ))}
                {questions.map((question) => (
                  <th className="sticky top-0 z-10 min-w-52 border-b bg-muted/70 px-3 py-3 font-semibold" key={question.key}>
                    <div>{question.label}</div>
                    <div className="mt-0.5 normal-case text-muted-foreground">{question.key}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission) => (
                <tr className="odd:bg-background even:bg-muted/20" key={submission.id}>
                  <td className="sticky left-0 z-10 border-b bg-inherit px-3 py-3 font-medium">{submission.client_submission_id}</td>
                  <td className="border-b px-3 py-3">
                    <Badge tone={isImportedSubmission(submission) ? "warning" : "success"}>
                      {submissionSourceLabel(submission)}
                    </Badge>
                    {submission.source_system ? (
                      <p className="mt-1 text-xs text-muted-foreground">{submission.source_system}</p>
                    ) : null}
                  </td>
                  <td className="border-b px-3 py-3">{submissionActorLabel(submission)}</td>
                  <td className="border-b px-3 py-3">{formatDate(submission.imported_at ?? submission.submitted_at)}</td>
                  <td className="border-b px-3 py-3">
                    <Badge tone={statusTone(submission.status)}>{submission.status}</Badge>
                  </td>
                  <td className="border-b px-3 py-3">{submission.entity_id ?? "Not linked"}</td>
                  <td className="border-b px-3 py-3">{form?.project_name ?? submission.project_id ?? "Project missing"}</td>
                  <td className="border-b px-3 py-3">v{submission.server_sequence}</td>
                  {questions.map((question) => (
                    <td className="max-w-72 border-b px-3 py-3 align-top" key={`${submission.id}-${question.key}`}>
                      <div className="max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-md bg-background/65 p-2">
                        {formatCell(submission.payload_json?.[question.key]) || <span className="text-muted-foreground">Blank</span>}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredSubmissions.length ? (
            <div className="p-10 text-center">
              <Table2 aria-hidden="true" className="mx-auto text-muted-foreground" size={24} />
              <p className="mt-3 font-medium">No data rows match this view</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload historical data, sync mobile submissions, or clear the filters.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FormDetailWorkspace({
  form,
  onClose,
  onOpenBuilder,
  onOpenDataQuality,
  onOpenMapping,
  onOpenSubmissions,
  setTab,
  tab,
}: {
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
    <section className="space-y-4 rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(form.status)}>{form.status}</Badge>
            <Badge tone={qualityTone(form.quality_score)}>
              Quality {form.quality_score}%
            </Badge>
            <Badge tone="collect">v{form.version}</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold">{form.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {form.project_name} · {form.survey_name} · {form.owner}
          </p>
        </div>
        <Button onClick={onClose} variant="secondary">
          Back to list
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto product-scrollbar">
        {formDetailTabs.map((item) => (
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
      {tab === "Overview" ? <FormOverview form={form} /> : null}
      {tab === "Builder" ? (
        <FormTabCard
          actionLabel="Open Builder"
          icon={ClipboardPenLine}
          onAction={onOpenBuilder}
          title="Professional Survey Builder"
          lines={[
            "Approved route: /forms/:formId/builder.",
            "Question library, templates, drag-and-drop ordering, inline editing, validation, logic, calculations, preview, import, and deployment all live in the builder.",
            `${form.questions} questions across ${form.sections} section(s).`,
          ]}
        />
      ) : null}
      {tab === "Questions" ? (
        <FormTabCard
          actionLabel="Open Builder"
          icon={ClipboardPenLine}
          onAction={onOpenBuilder}
          title="Question Structure"
          lines={[
            "Questions are managed through the canonical builder so there is no duplicate form designer.",
            "Use sections, groups, repeat groups, variable names, validation, option lists, reference bindings, and logic from the builder.",
            "Published versions remain protected; edits create draft versions before publishing.",
          ]}
        />
      ) : null}
      {tab === "Reference Data" ? (
        <FormTabCard
          actionLabel="Manage in Builder"
          icon={Database}
          onAction={onOpenBuilder}
          title="Reference Data Binding"
          lines={[
            "Bind fields to countries, regions, districts, communities, facilities, donors, beneficiaries, and custom lists.",
            "Support controlled values, hierarchy, active/inactive values, effective dates, and version-aware warnings.",
            "Prevent invalid free-text values when controlled lists are required.",
          ]}
        />
      ) : null}
      {tab === "Permissions" ? (
        <FormTabCard
          actionLabel="Manage Permissions"
          icon={ShieldCheck}
          onAction={onOpenBuilder}
          title="Form Access Control"
          lines={[
            "Configure role, user, team, project, and location-level access.",
            "Control view, edit, publish, archive, assign, export, review, approve, and manage controls permissions.",
            "Field officers should only see assigned published forms.",
          ]}
        />
      ) : null}
      {tab === "Workflow" ? (
        <FormTabCard
          actionLabel="Configure Workflow"
          icon={Workflow}
          onAction={onOpenBuilder}
          title="Approval Workflow"
          lines={[
            "Simple, standard, and correction workflows are configurable per form.",
            "Reviewer role, team, location scope, required comments, and SLA rules are form-level settings.",
            "Submission decisions remain in Submissions, with form workflow determining the path.",
          ]}
        />
      ) : null}
      {tab === "Data Quality" ? (
        <FormTabCard
          actionLabel="Open Data Quality"
          icon={ClipboardCheck}
          onAction={onOpenDataQuality}
          title="Data Quality Rules"
          lines={[
            "Required fields, ranges, duplicate detection, outliers, GPS validation, consent checks, duration rules, and severity controls.",
            "Critical rules can block submission or route records for correction.",
            "Detailed investigation belongs in Data Quality.",
          ]}
        />
      ) : null}
      {tab === "Governance" ? (
        <FormTabCard
          actionLabel="Manage Governance"
          icon={ShieldCheck}
          onAction={onOpenBuilder}
          title="Form Governance"
          lines={[
            "Set status, consent, edits after approval, duplicate prevention, retention, masking, export restrictions, and record locking.",
            "High-risk changes require reason capture and immutable audit evidence.",
            "Governance Administration remains outside Forms; this is form-level governance only.",
          ]}
        />
      ) : null}
      {tab === "Mapping Settings" ? (
        <FormTabCard
          actionLabel="Open Mapping"
          icon={MapPinned}
          onAction={onOpenMapping}
          title="Form Mapping Settings"
          lines={[
            "Require GPS, set accuracy thresholds, boundary validation, allowed collection areas, coordinate masking, and duplicate GPS detection.",
            "GIS analysis remains in Mapping; Forms only defines collection behavior.",
            "Submission GPS evidence stays tied to the form version used in the field.",
          ]}
        />
      ) : null}
      {tab === "Preview" ? (
        <FormTabCard
          actionLabel="Open Preview Flow"
          icon={Smartphone}
          onAction={onOpenBuilder}
          title="Preview & Test"
          lines={[
            "Approved route: /forms/:formId/preview.",
            "Test web, tablet, mobile, enumerator, and respondent modes before publishing.",
            "Preview runs are test-only and do not count as real submissions.",
          ]}
        />
      ) : null}
      {tab === "Review" ? (
        <FormTabCard
          actionLabel="Open Publish Review"
          icon={ClipboardCheck}
          onAction={onOpenBuilder}
          title="Publish Readiness Review"
          lines={[
            "Approved route: /forms/:formId/review.",
            "Publishing is blocked when critical checks fail: missing project, no questions, duplicate variables, invalid logic, or unreviewed controls.",
            "Publishing creates an immutable version and makes the form available for field assignments.",
          ]}
        />
      ) : null}
      {tab === "Version History" ? (
        <FormTabCard
          actionLabel="Open Builder"
          icon={GitBranch}
          onAction={onOpenBuilder}
          title="Version History"
          lines={[
            `Current version: v${form.version}.`,
            "Published forms are never overwritten silently.",
            "Old submissions remain linked to the exact version used during collection.",
          ]}
        />
      ) : null}
      {tab === "Audit Trail" ? (
        <FormTabCard
          actionLabel="Open Submissions"
          icon={History}
          onAction={onOpenSubmissions}
          title="Audit Trail"
          lines={[
            "Track form created, question changes, rule changes, permissions, workflow, publish, archive, export, and submission events.",
            "Audit records are immutable and integrate with Governance Audit Trail.",
            "Authorized users can filter/export logs for form accountability.",
          ]}
        />
      ) : null}
    </section>
  );
}

function FormOverview({ form }: { form: FormListItem }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-2xl border bg-background/50 p-5">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Form Overview</h3>
          <HelpHint label="About this form" title="Form Overview">
            {form.description ?? "No description has been added yet."}
          </HelpHint>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Signal label="Project" value={form.project_name} />
          <Signal label="Owner" value={form.owner} />
          <Signal label="Current Version" value={`v${form.version}`} />
          <Signal label="Status" value={form.status} />
          <Signal
            label="Active Assignments"
            value={`${form.active_assignments}`}
          />
          <Signal
            label="Total Submissions"
            value={`${form.total_submissions}`}
          />
        </div>
      </div>
      <div className="rounded-2xl border bg-background/50 p-5">
        <h3 className="font-semibold">Builder & Governance Summary</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Signal label="Questions" value={`${form.questions}`} />
          <Signal label="Sections" value={`${form.sections}`} />
          <Signal
            label="Workflow Status"
            value={form.pending_approval ? "Pending approval" : "Configured"}
            tone={form.pending_approval ? "warning" : "success"}
          />
          <Signal
            label="Quality Score"
            value={`${form.quality_score}%`}
            tone={form.quality_score >= 70 ? "success" : "warning"}
          />
        </div>
      </div>
    </div>
  );
}

function TemplatesSection({
  onOpenBuilder,
  templates,
}: {
  onOpenBuilder: () => void;
  templates: typeof previewTemplates;
}) {
  return (
    <section className="space-y-4">
      <SectionHeader
        action={
          <Button onClick={onOpenBuilder} variant="primary">
            <Plus aria-hidden="true" /> Create from template
          </Button>
        }
        description="Reusable baseline, endline, monitoring, assessment, registration, case management, training, and feedback forms."
        title="Form Templates"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <div
            className="rounded-xl border bg-panel p-3.5 shadow-line"
            key={template.id}
          >
            <Badge tone={template.is_featured ? "accent" : "neutral"}>
              {template.category}
            </Badge>
            <div className="mt-3 flex items-center gap-2">
              <h3 className="font-semibold">{template.name}</h3>
              <HelpHint label={`About ${template.name}`} title={template.name}>
                {template.description}
              </HelpHint>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Signal
                label="Fields"
                value={`${template.summary.field_count}`}
              />
              <Signal
                label="GPS"
                value={template.summary.has_gps ? "Yes" : "No"}
              />
              <Signal label="Setup" value={`${template.estimated_minutes}m`} />
            </div>
            <Button
              className="mt-4 w-full"
              onClick={onOpenBuilder}
              variant="secondary"
            >
              <Copy aria-hidden="true" />
              Use template
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReferenceDataSection({
  onOpenBuilder,
}: {
  onOpenBuilder: () => void;
}) {
  const lists = [
    [
      "Administrative hierarchy",
      "Country -> Region -> District -> Community",
      "Versioned",
    ],
    ["Facilities", "Schools, clinics, warehouses, service points", "Active"],
    [
      "Beneficiary categories",
      "Household, farmer, youth, group, facility",
      "Active",
    ],
    [
      "Donor and intervention codes",
      "Donors, activities, intervention types",
      "Draft",
    ],
  ];
  return (
    <section className="space-y-4">
      <SectionHeader
        action={
          <Button onClick={onOpenBuilder} variant="primary">
            <Database aria-hidden="true" /> Bind to questions
          </Button>
        }
        description="Manage form-level controlled reference lists and attach them to questions. System-wide master data stays in Administration."
        title="Form Reference Data"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {lists.map(([name, description, status]) => (
          <div
            className="rounded-xl border bg-panel p-3.5 shadow-line"
            key={name}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{name}</h3>
                <div className="mt-2">
                  <HelpHint label={`About ${name}`} title={name}>
                    {description}
                  </HelpHint>
                </div>
              </div>
              <Badge tone={status === "Draft" ? "warning" : "success"}>
                {status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FormTabCard({
  actionLabel,
  icon: Icon,
  lines,
  onAction,
  title,
}: {
  actionLabel: string;
  icon: LucideIcon;
  lines: string[];
  onAction: () => void;
  title: string;
}) {
  return (
    <div className="rounded-2xl border bg-background/50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
            <Icon aria-hidden="true" size={18} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{title}</h3>
              <HelpHint label={`About ${title}`} title={title}>
                {lines.join(" ")}
              </HelpHint>
            </div>
          </div>
        </div>
        <Button onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

function FormFilters() {
  return (
    <div className="grid gap-3 rounded-xl border bg-panel p-3 shadow-line md:grid-cols-5">
      <Input placeholder="Project" />
      <Input placeholder="Status" />
      <Input placeholder="Owner" />
      <Input placeholder="Form type" />
      <Input placeholder="Date range" />
    </div>
  );
}

function SectionHeader({
  action,
  description,
  title,
}: {
  action?: ReactNode;
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
  icon: LucideIcon;
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
        {lines.length ? (
          lines.map((line, index) => (
            <p
              className="rounded-xl border bg-background/50 px-3 py-2 text-sm text-muted-foreground"
              key={`${line}-${index}`}
            >
              {line}
            </p>
          ))
        ) : (
          <p className="rounded-xl border border-dashed bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
            No activity yet.
          </p>
        )}
      </div>
    </div>
  );
}
