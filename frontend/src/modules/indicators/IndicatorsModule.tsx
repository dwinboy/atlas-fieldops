"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  BarChart3,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  GitBranch,
  History,
  Import,
  Link2,
  ListChecks,
  Network,
  Search,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  ApiError,
  createIndicator,
  getFormSchema,
  updateIndicator,
  getIndicatorDisaggregation,
  getIndicatorLinkedSubmissions,
  listForms,
  listIndicators,
  listProjects,
  listSurveys,
  type CurrentPrincipal,
  type DataFormSchemaRead,
  type IndicatorCreate,
  type IndicatorRead,
} from "@/lib/api";
import { useSectorTerminology } from "@/lib/sectorTerminology";
import { cn } from "@/lib/utils";
import {
  indicatorSections,
  previewAuditEvents as sampleIndicatorAuditEvents,
  previewBaselines as sampleIndicatorBaselines,
  previewDataSources as sampleIndicatorDataSources,
  previewIndicators,
  previewLogframeRows,
  previewReports,
  previewResultsFramework as sampleResultFramework,
  previewTargets as sampleIndicatorTargets,
  type IndicatorAuditEvent,
  type IndicatorBaseline,
  type IndicatorDataSource,
  type IndicatorRecord,
  type IndicatorReport,
  type IndicatorSection,
  type IndicatorStatus,
  type IndicatorTarget,
  type LogframeRow,
  type ResultsFrameworkNode,
} from "@/modules/indicators/data";
import {
  calculateIndicatorResult,
  computeIndicatorSummary,
  filterIndicatorsBySection,
  indicatorTone,
  prettifyFieldName,
  progressPercent,
  progressTone,
  summarizeTargets,
  targetAchievement,
  toCsv,
  validateFormQuestionLink,
} from "@/modules/indicators/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type IndicatorsModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

type FormulaOperation = "sum" | "average" | "count" | "percent" | "raw";

type IndicatorDraft = {
  baseline: string;
  calculationMethod: string;
  category: string;
  categoryOther: string;
  code: string;
  current: string;
  dataSource: string;
  definition: string;
  disaggregationFields: string[];
  fieldVariable: string;
  formId: string;
  frequency: IndicatorRecord["frequency"];
  manualFormula: boolean;
  name: string;
  operation: FormulaOperation;
  project: string;
  projectId: string;
  responsiblePerson: string;
  resultArea: string;
  surveyId: string;
  target: string;
  unit: string;
};

type IndicatorDetailTab =
  | "Overview"
  | "Data Sources"
  | "Targets"
  | "Baselines"
  | "Disaggregation"
  | "Projects"
  | "Forms"
  | "Progress"
  | "History"
  | "Audit Trail";

const detailTabs: IndicatorDetailTab[] = [
  "Overview",
  "Data Sources",
  "Targets",
  "Baselines",
  "Disaggregation",
  "Projects",
  "Forms",
  "Progress",
  "History",
  "Audit Trail",
];

const defaultIndicatorDraft: IndicatorDraft = {
  baseline: "0",
  calculationMethod: "Approved submissions only",
  category: "Outcome",
  categoryOther: "",
  code: "",
  current: "0",
  dataSource: "",
  definition: "",
  disaggregationFields: [],
  fieldVariable: "",
  formId: "",
  frequency: "Quarterly",
  manualFormula: false,
  name: "",
  operation: "sum",
  project: "Organization-wide",
  projectId: "",
  responsiblePerson: "",
  resultArea: "",
  surveyId: "",
  target: "0",
  unit: "count",
};

const DISAGGREGATION_FIELD_TYPES = ["select", "radio", "dropdown", "multiselect", "checkbox"];

function composeFormula(operation: FormulaOperation, fieldVariable: string): string {
  if (!fieldVariable) return "";
  if (operation === "raw") return fieldVariable;
  return `${operation}(${fieldVariable})`;
}

function resolvedCategory(draft: IndicatorDraft): string {
  if (draft.category === "Other") return draft.categoryOther.trim() || "Indicator";
  return draft.category;
}

type FormFieldOption = { key: string; label: string; type: string };

function flattenFormFields(schema: DataFormSchemaRead | null | undefined): FormFieldOption[] {
  const sections = ((schema?.schema as { sections?: unknown } | undefined)?.sections ?? []) as {
    fields?: { id?: string; variable_name?: string | null; label?: string; type?: string }[];
  }[];
  return sections.flatMap((section) =>
    (section.fields ?? []).map((field) => ({
      key: field.variable_name || field.id || "field",
      label: field.label || field.variable_name || field.id || "Field",
      type: field.type || "text",
    })),
  );
}

function isPreview(token: string | null): boolean {
  return !token || token === "preview-token";
}

function hasAnyPermission(principal: CurrentPrincipal | null | undefined, permissions: string[]): boolean {
  if (!principal || principal.platform_admin) return true;
  return permissions.some((permission) => principal.permissions?.includes(permission));
}

function normalizeIndicatorCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function apiFrequency(value: IndicatorRecord["frequency"]): IndicatorCreate["reporting_frequency"] {
  if (value === "Monthly") return "monthly";
  if (value === "Annual" || value === "Project lifetime") return "annual";
  return "quarterly";
}

function displayFrequency(value: string | null | undefined): IndicatorRecord["frequency"] {
  if (value === "monthly") return "Monthly";
  if (value === "annual") return "Annual";
  return "Quarterly";
}

function numberOrZero(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function messageFromError(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.message) as { detail?: unknown };
      if (typeof parsed.detail === "string") return parsed.detail;
      if (Array.isArray(parsed.detail)) return parsed.detail.map((item) => item?.msg ?? "Invalid field").join(" ");
    } catch {
      return error.message;
    }
  }
  return "Check the required fields and your indicator management permission.";
}

function mapApiIndicator(row: IndicatorRead): IndicatorRecord {
  const progress = row.progress_percent || progressPercent(row.current_value, row.baseline_value, row.target_value);
  const dataSource = row.survey_id ? "Survey-linked approved submissions" : null;
  const status: IndicatorStatus = !row.is_active
    ? "Archived"
    : row.baseline_value === null
      ? "Needs Baseline"
      : !dataSource
        ? "No Data Source"
        : progress >= 80 ? "On Track" : "Behind Target";
  return {
    baseline: row.baseline_value,
    calculationMethod: row.formula || "Current approved value compared against configured target.",
    calculationType: row.formula ? "Custom formula" : "Percentage",
    code: row.code,
    current: row.current_value,
    dataSource,
    definition: row.description ?? "Imported monitoring indicator.",
    disaggregation: row.disaggregation_fields.map(prettifyFieldName),
    frequency: displayFrequency(row.reporting_frequency),
    id: row.id,
    lastCalculatedAt: row.calculated_at ?? new Date().toISOString(),
    linkedForm: null,
    linkedQuestion: null,
    name: row.name,
    owner: "M&E Manager",
    project: row.project_id ? "Linked project" : "Organization-wide",
    responsiblePerson: "Data Manager",
    resultArea: row.sdg_code ?? "Monitoring framework",
    status,
    target: row.target_value,
    type: row.category || "Indicator",
    unit: row.unit,
  };
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

export function IndicatorsModule({ principal, token }: IndicatorsModuleProps) {
  const [activeSection, setActiveSection] = useState<IndicatorSection>("dashboard");
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<IndicatorDetailTab>("Overview");
  const [actionResult, setActionResult] = useState("");
  const [creationOpen, setCreationOpen] = useState(false);
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);
  const [indicatorDraft, setIndicatorDraft] = useState<IndicatorDraft>(defaultIndicatorDraft);
  const [localIndicators, setLocalIndicators] = useState<IndicatorRecord[]>([]);
  const queryClient = useQueryClient();
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const preview = isPreview(token);
  const canManageIndicators = hasAnyPermission(principal, ["indicators.manage"]);

  const indicatorsQuery = useQuery({
    queryKey: ["indicators-module", token],
    queryFn: () => listIndicators(token ?? ""),
    enabled: Boolean(token && !preview),
  });

  const indicators = useMemo(() => {
    const backendIndicators = preview ? previewIndicators : (indicatorsQuery.data ?? []).map(mapApiIndicator);
    const merged = preview ? [...localIndicators, ...backendIndicators] : backendIndicators;
    return merged.filter((indicator, index, rows) => rows.findIndex((row) => row.id === indicator.id) === index);
  }, [indicatorsQuery.data, localIndicators, preview]);
  const indicatorTargets = preview ? sampleIndicatorTargets : [];
  const indicatorBaselines = preview ? sampleIndicatorBaselines : [];
  const resultFramework = preview ? sampleResultFramework : [];
  const indicatorAuditEvents = preview ? sampleIndicatorAuditEvents : [];
  const indicatorDataSources = preview ? sampleIndicatorDataSources : [];
  const logframeRows = preview ? previewLogframeRows : [];
  const summary = useMemo(() => computeIndicatorSummary(indicators), [indicators]);
  const visibleIndicators = useMemo(() => filterIndicatorsBySection(indicators, activeSection), [activeSection, indicators]);
  const selectedIndicator = indicators.find((indicator) => indicator.id === selectedIndicatorId) ?? null;

  function openIndicator(indicator: IndicatorRecord, tab: IndicatorDetailTab = "Overview"): void {
    setSelectedIndicatorId(indicator.id);
    setActiveDetailTab(tab);
  }

  function exportIndicators(): void {
    downloadCsv(
      "atlas-indicators.csv",
      indicators.map((indicator) => ({
        baseline: indicator.baseline,
        code: indicator.code,
        current: indicator.current,
        dataSource: indicator.dataSource,
        name: indicator.name,
        progress: progressPercent(indicator.current, indicator.baseline, indicator.target),
        project: indicator.project,
        status: indicator.status,
        target: indicator.target,
        type: indicator.type,
      })),
    );
    setActionResult("Indicator export prepared. Production exports should write an immutable Governance audit event.");
    pushToast({ description: "The indicator library CSV is ready.", title: "Indicators exported", tone: "success" });
  }

  function indicatorFromDraft(id: string): IndicatorRecord {
    const baseline = numberOrZero(indicatorDraft.baseline);
    const target = numberOrZero(indicatorDraft.target);
    const current = numberOrZero(indicatorDraft.current);
    const progress = progressPercent(current, baseline, target);
    const formula = indicatorDraft.manualFormula
      ? indicatorDraft.calculationMethod.trim()
      : composeFormula(indicatorDraft.operation, indicatorDraft.fieldVariable) || indicatorDraft.calculationMethod.trim();
    return {
      baseline,
      calculationMethod: formula || "Approved submissions only",
      calculationType: "Percentage",
      code: normalizeIndicatorCode(indicatorDraft.code),
      current,
      dataSource: indicatorDraft.dataSource || null,
      definition: indicatorDraft.definition || "Indicator definition to be completed.",
      disaggregation: indicatorDraft.disaggregationFields.length ? indicatorDraft.disaggregationFields.map(prettifyFieldName) : ["Project", "Location"],
      frequency: indicatorDraft.frequency,
      id,
      lastCalculatedAt: new Date().toISOString(),
      linkedForm: null,
      linkedQuestion: null,
      name: indicatorDraft.name.trim(),
      owner: principal?.full_name ?? "M&E Manager",
      project: indicatorDraft.project || "Organization-wide",
      responsiblePerson: indicatorDraft.responsiblePerson || "Unassigned",
      resultArea: indicatorDraft.resultArea || "Results framework",
      status: progress >= 80 ? "On Track" : target > 0 ? "Behind Target" : "Needs Baseline",
      target,
      type: resolvedCategory(indicatorDraft),
      unit: indicatorDraft.unit || "count",
    };
  }

  const createIndicatorMutation = useMutation({
    mutationFn: () =>
      createIndicator(token ?? "", {
        baseline_value: numberOrZero(indicatorDraft.baseline),
        category: resolvedCategory(indicatorDraft),
        code: normalizeIndicatorCode(indicatorDraft.code),
        current_value: numberOrZero(indicatorDraft.current),
        description: indicatorDraft.definition || null,
        disaggregation_fields: indicatorDraft.disaggregationFields,
        formula:
          (indicatorDraft.manualFormula
            ? indicatorDraft.calculationMethod.trim()
            : composeFormula(indicatorDraft.operation, indicatorDraft.fieldVariable) || indicatorDraft.calculationMethod.trim()) || null,
        name: indicatorDraft.name.trim(),
        project_id: indicatorDraft.projectId || null,
        reporting_frequency: apiFrequency(indicatorDraft.frequency),
        sdg_code: indicatorDraft.resultArea || null,
        survey_id: indicatorDraft.surveyId || null,
        target_value: numberOrZero(indicatorDraft.target),
        unit: indicatorDraft.unit || "count",
      }),
    onSuccess: async (indicator) => {
      const created = mapApiIndicator(indicator);
      setLocalIndicators((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedIndicatorId(created.id);
      setActiveDetailTab("Overview");
      setActiveSection("library");
      setCreationOpen(false);
      setIndicatorDraft(defaultIndicatorDraft);
      await queryClient.invalidateQueries({ queryKey: ["indicators-module"] });
      pushToast({ title: "Indicator created", description: `${created.code} is ready for targets, baselines, and form links.`, tone: "success" });
    },
    onError: (error) => {
      const description = messageFromError(error);
      setActionResult(description);
      pushToast({ title: "Could not create indicator", description, tone: "danger" });
    },
  });

  const updateIndicatorMutation = useMutation({
    mutationFn: () =>
      updateIndicator(token ?? "", editingIndicatorId ?? "", {
        baseline_value: numberOrZero(indicatorDraft.baseline),
        current_value: numberOrZero(indicatorDraft.current),
        description: indicatorDraft.definition || null,
        name: indicatorDraft.name.trim(),
        reporting_frequency: apiFrequency(indicatorDraft.frequency),
        sdg_code: indicatorDraft.resultArea || null,
        target_value: numberOrZero(indicatorDraft.target),
        unit: indicatorDraft.unit || "count",
      }),
    onSuccess: async (indicator) => {
      const updated = mapApiIndicator(indicator);
      setLocalIndicators((current) => [updated, ...current.filter((item) => item.id !== updated.id)]);
      setCreationOpen(false);
      setEditingIndicatorId(null);
      setIndicatorDraft(defaultIndicatorDraft);
      await queryClient.invalidateQueries({ queryKey: ["indicators-module"] });
      pushToast({ title: "Indicator updated", description: `${updated.code} now reflects the revised values.`, tone: "success" });
    },
    onError: (error) => {
      const description = messageFromError(error);
      setActionResult(description);
      pushToast({ title: "Could not update indicator", description, tone: "danger" });
    },
  });

  function openCreateIndicator(): void {
    setActionResult("");
    setEditingIndicatorId(null);
    setIndicatorDraft(defaultIndicatorDraft);
    setCreationOpen(true);
  }

  function openEditIndicator(indicator: IndicatorRecord): void {
    setActionResult("");
    setEditingIndicatorId(indicator.id);
    setIndicatorDraft({
      ...defaultIndicatorDraft,
      baseline: String(indicator.baseline ?? 0),
      code: indicator.code,
      current: String(indicator.current ?? 0),
      definition: indicator.definition,
      frequency: indicator.frequency,
      name: indicator.name,
      resultArea: indicator.resultArea === "Monitoring framework" ? "" : indicator.resultArea,
      target: String(indicator.target ?? 0),
      unit: indicator.unit,
    });
    setCreationOpen(true);
  }

  function submitIndicator(): void {
    const code = normalizeIndicatorCode(indicatorDraft.code);
    if (!indicatorDraft.name.trim() || code.length < 2) {
      setActionResult("Indicator name and a valid code are required before saving.");
      return;
    }
    if (editingIndicatorId) {
      updateIndicatorMutation.mutate();
      return;
    }
    if (indicators.some((indicator) => indicator.code === code)) {
      setActionResult("An indicator with this code already exists. Use a unique indicator code.");
      return;
    }
    if (preview) {
      const created = indicatorFromDraft(`indicator-local-${Date.now()}`);
      setLocalIndicators((current) => [created, ...current]);
      setSelectedIndicatorId(created.id);
      setActiveDetailTab("Overview");
      setActiveSection("library");
      setCreationOpen(false);
      setIndicatorDraft(defaultIndicatorDraft);
      pushToast({ title: "Indicator added", description: `${created.code} was added to this preview workspace.`, tone: "success" });
      return;
    }
    createIndicatorMutation.mutate();
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="monitor">ANALYTICS</Badge>
              <Badge tone={summary.behindTarget ? "warning" : "success"}>{summary.behindTarget} behind target</Badge>
              <Badge tone={summary.withoutDataSource ? "danger" : "accent"}>{summary.withoutDataSource} without data source</Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Indicators</h1>
              <HelpHint label="About Indicators" title="Indicators">
                Manage the M&E measurement framework: indicator library, results frameworks, logframes, baselines, targets, calculations, form links, disaggregation, and progress tracking.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!canManageIndicators} onClick={openCreateIndicator} variant="primary">
              <BookOpenCheck aria-hidden="true" />
              Create indicator
            </Button>
            <Button onClick={exportIndicators} variant="secondary">
              <Download aria-hidden="true" />
              Export
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Indicator sections">
          {indicatorSections.map((section) => (
            <button
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                activeSection === section.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-panel hover:bg-muted",
              )}
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                setSelectedIndicatorId(null);
              }}
              type="button"
            >
              {section.label}
              {section.status === "planned" ? (
                <Badge tone={activeSection === section.id ? "neutral" : "accent"}>Planned</Badge>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {actionResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Indicator action</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{actionResult}</p>
            </div>
          </div>
        </section>
      ) : null}

      {selectedIndicator ? (
        <IndicatorDetailWorkspace
          auditEvents={indicatorAuditEvents}
          baselines={indicatorBaselines}
          canEdit={canManageIndicators && !preview}
          dataSources={indicatorDataSources}
          indicator={selectedIndicator}
          onClose={() => setSelectedIndicatorId(null)}
          onEdit={() => openEditIndicator(selectedIndicator)}
          preview={preview}
          setTab={setActiveDetailTab}
          tab={activeDetailTab}
          targets={indicatorTargets}
          token={token}
        />
      ) : null}

      {!selectedIndicator && activeSection === "dashboard" ? (
        <IndicatorsDashboard
          auditEvents={indicatorAuditEvents}
          indicators={indicators}
          onOpenAttention={() => setActiveSection("library")}
          onOpenReports={() => setActiveView("analytics")}
          preview={preview}
          resultFramework={resultFramework}
          summary={summary}
          targets={indicatorTargets}
        />
      ) : null}

      {!selectedIndicator && activeSection === "library" ? (
        <IndicatorLibrary indicators={visibleIndicators} loading={indicatorsQuery.isFetching} onCreateIndicator={openCreateIndicator} onImportIndicators={() => setActionResult("Indicator import will use the governed import center and audit every applied row.")} onOpenIndicator={openIndicator} />
      ) : null}
      {!selectedIndicator && activeSection === "results-framework" ? (
        preview ? <ResultsFramework resultFramework={resultFramework} /> : <ComingSoonSection sectionId="results-framework" />
      ) : null}
      {!selectedIndicator && activeSection === "logframes" ? (
        preview ? <Logframes rows={logframeRows} /> : <ComingSoonSection sectionId="logframes" />
      ) : null}
      {!selectedIndicator && activeSection === "targets" ? (
        preview ? <Targets targets={indicatorTargets} /> : <IndicatorTargetsOverview indicators={indicators} />
      ) : null}
      {!selectedIndicator && activeSection === "baselines" ? (
        preview ? <Baselines baselines={indicatorBaselines} /> : <IndicatorBaselinesOverview indicators={indicators} />
      ) : null}
      {!selectedIndicator && activeSection === "reports" ? (
        preview ? (
          <IndicatorReports onOpenReports={() => setActiveView("analytics")} reports={previewReports} />
        ) : (
          <IndicatorReportsOverview indicators={indicators} onOpenReports={() => setActiveView("analytics")} />
        )
      ) : null}
      <CreateIndicatorModal
        canSubmit={canManageIndicators && !createIndicatorMutation.isPending && !updateIndicatorMutation.isPending && Boolean(indicatorDraft.name.trim() && normalizeIndicatorCode(indicatorDraft.code).length >= 2)}
        draft={indicatorDraft}
        editing={Boolean(editingIndicatorId)}
        onChange={setIndicatorDraft}
        onOpenChange={(open) => {
          setCreationOpen(open);
          if (!open) setEditingIndicatorId(null);
        }}
        onSubmit={submitIndicator}
        open={creationOpen}
        preview={preview}
        saving={createIndicatorMutation.isPending || updateIndicatorMutation.isPending}
        token={token}
      />
    </section>
  );
}

const CATEGORY_ICONS: LucideIcon[] = [ListChecks, TrendingUp, Target];

function IndicatorsDashboard({
  auditEvents,
  indicators,
  onOpenAttention,
  onOpenReports,
  preview,
  resultFramework,
  summary,
  targets,
}: {
  auditEvents: IndicatorAuditEvent[];
  indicators: IndicatorRecord[];
  onOpenAttention: () => void;
  onOpenReports: () => void;
  preview: boolean;
  resultFramework: ResultsFrameworkNode[];
  summary: ReturnType<typeof computeIndicatorSummary>;
  targets: IndicatorTarget[];
}) {
  const targetSummary = summarizeTargets(targets);
  const categoryCards = summary.topCategories.map((category, index) => ({
    icon: CATEGORY_ICONS[index] ?? ListChecks,
    label: `${category.label} Indicators`,
    value: category.count,
  }));
  const cards: { icon: LucideIcon; label: string; tone?: BadgeProps["tone"]; value: string | number }[] = [
    { icon: BarChart3, label: "Total Indicators", value: summary.totalIndicators },
    ...categoryCards,
    { icon: CheckCircle2, label: "Indicators On Track", tone: "success", value: summary.onTrack },
    { icon: FileSpreadsheet, label: "Indicators Behind Target", tone: summary.behindTarget ? "warning" : "success", value: summary.behindTarget },
    { icon: Database, label: "Without Baseline", tone: summary.withoutBaseline ? "danger" : "success", value: summary.withoutBaseline },
    { icon: Link2, label: "Without Data Source", tone: summary.withoutDataSource ? "danger" : "success", value: summary.withoutDataSource },
    { icon: History, label: "Reporting Periods Due", tone: summary.reportingPeriodsDue ? "warning" : "neutral", value: summary.reportingPeriodsDue },
  ];
  const attention = indicators.filter((indicator) => indicator.status !== "On Track").slice(0, 4);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <button className="rounded-xl border bg-panel p-3 text-left shadow-line transition hover:border-primary/35 hover:bg-primary/5" key={card.label} onClick={onOpenAttention} type="button">
            <div className="flex items-center justify-between gap-3">
              <card.icon aria-hidden="true" className="text-primary" size={18} />
              {card.tone ? <Badge tone={card.tone}>RBM</Badge> : null}
            </div>
            <p className="mt-4 text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Indicator Performance Summary" action={<Button onClick={onOpenAttention} size="sm" variant="secondary">Open library</Button>}>
          <div className="space-y-3">
            {indicators.map((indicator) => {
              const progress = progressPercent(indicator.current, indicator.baseline, indicator.target);
              return (
                <div className="rounded-xl border bg-background/70 p-3" key={indicator.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{indicator.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{indicator.code} · {indicator.project}</p>
                    </div>
                    <Badge tone={progressTone(progress)}>{progress}%</Badge>
                  </div>
                  <ProgressBar value={progress} />
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Target Achievement Trends" action={<Button onClick={onOpenReports} size="sm" variant="secondary">Open reports</Button>}>
          {targets.length > 0 ? (
            <div className="grid gap-3">
              <Signal label="Average achievement" value={`${targetSummary.averageAchievement}%`} tone={progressTone(targetSummary.averageAchievement)} />
              <Signal label="Targets on track" value={targetSummary.onTrack} tone="success" />
              <Signal label="Targets behind" value={targetSummary.behind} tone={targetSummary.behind ? "warning" : "success"} />
              <Signal label="Calculation rule" value="Approved submissions only" tone="accent" />
            </div>
          ) : (
            <EmptyMini label="No period targets configured yet. Set targets to track achievement here." />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {preview ? (
          <Panel title="Results Framework Progress">
            <TimelineRows rows={resultFramework.slice(0, 5).map((node) => ({ label: `${node.level}: ${node.title}`, meta: `${node.progress}% · ${node.indicators.join(", ")}`, tone: progressTone(node.progress) }))} />
          </Panel>
        ) : (
          <Panel title="Indicator Categories">
            <TimelineRows
              emptyLabel="Create an indicator and set its category to see a breakdown here."
              rows={summary.topCategories.map((category) => ({ label: category.label, meta: `${category.count} indicator${category.count === 1 ? "" : "s"}`, tone: "accent" }))}
            />
          </Panel>
        )}
        <Panel title="Indicators Requiring Attention">
          <TimelineRows rows={attention.map((indicator) => ({ label: indicator.name, meta: `${indicator.status} · ${validateFormQuestionLink(indicator).join(", ") || "Calculation current"}`, tone: indicatorTone(indicator.status) }))} />
        </Panel>
        <Panel title="Upcoming Reporting Deadlines">
          <Signal label="Monthly indicators" value="2 due this week" tone="warning" />
          <Signal label="Quarterly indicators" value="2 due this month" tone="accent" />
          <Signal label="Recent update" value={auditEvents[0]?.action ?? "No updates"} />
        </Panel>
      </div>
    </div>
  );
}

function IndicatorLibrary({ indicators, loading, onCreateIndicator, onImportIndicators, onOpenIndicator }: { indicators: IndicatorRecord[]; loading: boolean; onCreateIndicator: () => void; onImportIndicators: () => void; onOpenIndicator: (indicator: IndicatorRecord, tab?: IndicatorDetailTab) => void }) {
  const columns: TableColumn<IndicatorRecord>[] = [
    { key: "code", header: "Code", value: (row) => row.code, render: (row) => <span className="font-mono text-xs">{row.code}</span> },
    {
      key: "indicator",
      header: "Indicator",
      value: (row) => `${row.name} ${row.project}`,
      render: (row) => (
        <button className="text-left" onClick={() => onOpenIndicator(row)} type="button">
          <p className="font-medium">{row.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{row.project} · {row.resultArea}</p>
        </button>
      ),
    },
    { key: "type", header: "Type", value: (row) => row.type, render: (row) => <Badge tone="accent">{row.type}</Badge> },
    { key: "source", header: "Data Source", value: (row) => row.dataSource ?? "", render: (row) => row.dataSource ?? <Badge tone="danger">Missing</Badge> },
    { key: "progress", header: "Progress", align: "right", value: (row) => String(progressPercent(row.current, row.baseline, row.target)), render: (row) => <Badge tone={progressTone(progressPercent(row.current, row.baseline, row.target))}>{progressPercent(row.current, row.baseline, row.target)}%</Badge> },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={indicatorTone(row.status)}>{row.status}</Badge> },
    { key: "actions", header: "Actions", align: "right", render: (row) => <Button onClick={() => onOpenIndicator(row, "Forms")} size="sm" variant="secondary"><Link2 aria-hidden="true" /> Link</Button> },
  ];

  return (
    <section className="space-y-4">
      <SectionHeader
        action={<div className="flex flex-wrap gap-2"><Button onClick={onCreateIndicator} variant="primary"><BookOpenCheck aria-hidden="true" /> Create indicator</Button><Button onClick={onImportIndicators} variant="secondary"><Import aria-hidden="true" /> Import indicators</Button></div>}
        description="Create, edit, archive, duplicate, import, export, and link indicators to projects, forms, questions, targets, baselines, and responsible people."
        route="/indicators/library"
        title="Indicator Library"
      />
      <DataTable
        columns={columns}
        emptyAction={{ label: "Create indicator", onClick: onCreateIndicator }}
        emptyDescription="Indicators measure project results. Define one with a baseline and target, then link it to form questions to track progress automatically."
        emptyLabel="No indicators yet"
        rows={indicators}
        searchLabel="Search indicators, projects, codes, owners"
        title={loading ? "Indicator library syncing" : "Indicator library"}
      />
    </section>
  );
}

function CreateIndicatorModal({ canSubmit, draft, editing = false, onChange, onOpenChange, onSubmit, open, preview, saving, token }: {
  canSubmit: boolean;
  draft: IndicatorDraft;
  editing?: boolean;
  onChange: (draft: IndicatorDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  preview: boolean;
  saving: boolean;
  token: string | null;
}) {
  const normalizedCode = normalizeIndicatorCode(draft.code);
  const terminology = useSectorTerminology(token, draft.projectId || null);
  const categoryOptions = terminology.indicatorCategoryOptions.includes(draft.category) || draft.category === "Other"
    ? terminology.indicatorCategoryOptions
    : [...terminology.indicatorCategoryOptions, draft.category];

  const projectsQuery = useQuery({
    queryKey: ["indicator-create-projects", token],
    queryFn: () => listProjects(token ?? ""),
    enabled: open && !preview && Boolean(token),
  });
  const surveysQuery = useQuery({
    queryKey: ["indicator-create-surveys", token, draft.projectId],
    queryFn: () => listSurveys(token ?? "", draft.projectId),
    enabled: open && !preview && Boolean(token) && Boolean(draft.projectId),
  });
  const formsQuery = useQuery({
    queryKey: ["indicator-create-forms", token],
    queryFn: () => listForms(token ?? ""),
    enabled: open && !preview && Boolean(token),
  });
  const formsForSurvey = useMemo(
    () => (formsQuery.data ?? []).filter((form) => !draft.surveyId || form.survey_id === draft.surveyId),
    [draft.surveyId, formsQuery.data],
  );
  const schemaQuery = useQuery({
    queryKey: ["indicator-create-schema", token, draft.formId],
    queryFn: () => getFormSchema(token ?? "", draft.formId),
    enabled: open && !preview && Boolean(token) && Boolean(draft.formId),
  });
  const formFields = useMemo(() => flattenFormFields(schemaQuery.data), [schemaQuery.data]);
  const disaggregationOptions = useMemo(
    () => formFields.filter((field) => DISAGGREGATION_FIELD_TYPES.includes(field.type)),
    [formFields],
  );
  const composedFormula = composeFormula(draft.operation, draft.fieldVariable);

  function toggleDisaggregationField(key: string): void {
    const active = draft.disaggregationFields.includes(key);
    if (active) {
      onChange({ ...draft, disaggregationFields: draft.disaggregationFields.filter((field) => field !== key) });
    } else if (draft.disaggregationFields.length < 6) {
      onChange({ ...draft, disaggregationFields: [...draft.disaggregationFields, key] });
    }
  }

  return (
    <Modal contentClassName="max-w-3xl" description={editing ? "Revise this indicator's definition, baseline, target, and reporting setup. The indicator code stays fixed because submissions and reports reference it." : "Create a reusable M&E indicator, then attach targets, baselines, forms, and calculations from the indicator workspace."} onOpenChange={onOpenChange} open={open} title={editing ? "Edit indicator" : "Create indicator"}>
      <div className="grid max-h-[70vh] gap-4 overflow-y-auto p-5 product-scrollbar">
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Indicator name" value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
          <Input disabled={editing} placeholder="Indicator code, e.g. WASH.ACCESS" value={draft.code} onChange={(event) => onChange({ ...draft, code: normalizeIndicatorCode(event.target.value) })} />
        </div>
        <Textarea placeholder="Definition" value={draft.definition} onChange={(event) => onChange({ ...draft, definition: event.target.value })} />
        <div className="grid gap-3 md:grid-cols-3">
          <Select value={draft.category} onChange={(event) => onChange({ ...draft, category: event.target.value })}>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
            <option value="Other">Other (type your own)</option>
          </Select>
          <Select value={draft.frequency} onChange={(event) => onChange({ ...draft, frequency: event.target.value as IndicatorRecord["frequency"] })}>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Annual">Annual</option>
            <option value="Project lifetime">Project lifetime</option>
          </Select>
          <Input placeholder="Unit, e.g. %, count, households" value={draft.unit} onChange={(event) => onChange({ ...draft, unit: event.target.value })} />
        </div>
        {draft.category === "Other" ? (
          <Input placeholder="Custom category name" value={draft.categoryOther} onChange={(event) => onChange({ ...draft, categoryOther: event.target.value })} />
        ) : null}
        <div className="grid gap-3 md:grid-cols-3">
          <Input inputMode="decimal" placeholder="Baseline" value={draft.baseline} onChange={(event) => onChange({ ...draft, baseline: event.target.value })} />
          <Input inputMode="decimal" placeholder="Target" value={draft.target} onChange={(event) => onChange({ ...draft, target: event.target.value })} />
          <Input inputMode="decimal" placeholder="Current value" value={draft.current} onChange={(event) => onChange({ ...draft, current: event.target.value })} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {preview ? (
            <Input placeholder="Project or program" value={draft.project} onChange={(event) => onChange({ ...draft, project: event.target.value })} />
          ) : (
            <Select
              value={draft.projectId}
              onChange={(event) => {
                const projectId = event.target.value;
                const projectName = projectsQuery.data?.find((project) => project.id === projectId)?.name ?? "Organization-wide";
                onChange({ ...draft, fieldVariable: "", formId: "", project: projectName, projectId, surveyId: "" });
              }}
            >
              <option value="">Organization-wide</option>
              {(projectsQuery.data ?? []).map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </Select>
          )}
          <Input placeholder="Responsible person" value={draft.responsiblePerson} onChange={(event) => onChange({ ...draft, responsiblePerson: event.target.value })} />
          <Input placeholder="Result area / SDG code" value={draft.resultArea} onChange={(event) => onChange({ ...draft, resultArea: event.target.value })} />
          <Input placeholder="Data source, e.g. Form / question" value={draft.dataSource} onChange={(event) => onChange({ ...draft, dataSource: event.target.value })} />
        </div>
        <div className="rounded-xl border bg-muted/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Calculation formula</p>
          {!preview ? (
            <>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <Select
                  disabled={!draft.projectId}
                  value={draft.surveyId}
                  onChange={(event) => onChange({ ...draft, fieldVariable: "", formId: "", surveyId: event.target.value })}
                >
                  <option value="">{draft.projectId ? "Select survey" : "Select a project first"}</option>
                  {(surveysQuery.data ?? []).map((survey) => (
                    <option key={survey.id} value={survey.id}>{survey.title}</option>
                  ))}
                </Select>
                <Select
                  disabled={!formsForSurvey.length}
                  value={draft.formId}
                  onChange={(event) => onChange({ ...draft, fieldVariable: "", formId: event.target.value })}
                >
                  <option value="">{formsForSurvey.length ? "Select form" : "No forms available"}</option>
                  {formsForSurvey.map((form) => (
                    <option key={form.id} value={form.id}>{form.name}</option>
                  ))}
                </Select>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Select
                  disabled={!formFields.length}
                  value={draft.fieldVariable}
                  onChange={(event) => onChange({ ...draft, fieldVariable: event.target.value })}
                >
                  <option value="">{formFields.length ? "Select field" : "Select a form first"}</option>
                  {formFields.map((field) => (
                    <option key={field.key} value={field.key}>{field.label}</option>
                  ))}
                </Select>
                <Select value={draft.operation} onChange={(event) => onChange({ ...draft, operation: event.target.value as FormulaOperation })}>
                  <option value="sum">Sum of values</option>
                  <option value="average">Average of values</option>
                  <option value="count">Count of submissions</option>
                  <option value="percent">Percent meeting condition</option>
                  <option value="raw">Raw field value</option>
                </Select>
              </div>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {composedFormula ? `Formula: ${composedFormula}` : "Select a project, form, field, and aggregation to build the formula."}
              </p>
            </>
          ) : null}
          <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <input checked={draft.manualFormula} onChange={(event) => onChange({ ...draft, manualFormula: event.target.checked })} type="checkbox" />
            Advanced: edit formula manually
          </label>
          {draft.manualFormula || preview ? (
            <Textarea
              className="mt-2"
              placeholder="Calculation formula, e.g. sum(yield_tons_ha) or percent(clean_water_access)"
              value={draft.calculationMethod}
              onChange={(event) => onChange({ ...draft, calculationMethod: event.target.value })}
            />
          ) : null}
        </div>
        {!preview && disaggregationOptions.length > 0 ? (
          <div className="rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disaggregation (optional, up to 6 fields)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {disaggregationOptions.map((field) => {
                const active = draft.disaggregationFields.includes(field.key);
                return (
                  <button
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                      active ? "border-primary bg-primary text-primary-foreground" : "bg-panel hover:bg-muted",
                    )}
                    key={field.key}
                    onClick={() => toggleDisaggregationField(field.key)}
                    type="button"
                  >
                    {field.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="rounded-xl border bg-muted/35 p-3 text-xs text-muted-foreground">
          Save readiness: {draft.name.trim() ? "name set" : "name missing"} · {normalizedCode.length >= 2 ? `code ${normalizedCode}` : "valid code missing"} · targets and baselines can be refined after creation.
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <Button onClick={() => onOpenChange(false)} variant="ghost">Cancel</Button>
        <Button disabled={!canSubmit} onClick={onSubmit} variant="primary">{saving ? "Saving..." : editing ? "Save changes" : "Create indicator"}</Button>
      </div>
    </Modal>
  );
}

function ResultsFramework({ resultFramework }: { resultFramework: ResultsFrameworkNode[] }) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  return (
    <section className="space-y-4">
      <SectionHeader
        action={<Button onClick={() => pushToast({ description: "Connect a results-framework editing service to add goal, impact, outcome, output, or activity levels. This control is a preview for now.", title: "Adding result levels isn't available yet", tone: "warning" })} variant="primary"><GitBranch aria-hidden="true" /> Add result level</Button>}
        description="Manage the logical structure from Goal to Impact, Outcomes, Outputs, Activities, and Indicators without duplicating project setup."
        route="/indicators/results-framework"
        title="Results Framework"
      />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Tree View">
          <div className="space-y-3">
            {resultFramework.map((node) => (
              <div className={cn("rounded-xl border bg-background/70 p-3", node.level !== "Goal" && "ml-4")} key={node.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Badge tone="accent">{node.level}</Badge>
                    <p className="mt-2 font-medium">{node.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{node.project} · {node.indicators.join(", ")}</p>
                  </div>
                  <Badge tone={progressTone(node.progress)}>{node.progress}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Matrix / Card View">
          <div className="grid gap-3 md:grid-cols-2">
            {resultFramework.map((node) => (
              <article className="rounded-xl border bg-background/70 p-3" key={node.id}>
                <div className="flex items-center justify-between">
                  <Badge tone="neutral">{node.level}</Badge>
                  <Badge tone={indicatorTone(node.status)}>{node.status}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium">{node.title}</p>
                <ProgressBar value={node.progress} />
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Logframes({ rows }: { rows: LogframeRow[] }) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const columns: TableColumn<LogframeRow>[] = [
    { key: "summary", header: "Narrative Summary", value: (row) => row.narrativeSummary, render: (row) => <span className="font-medium">{row.narrativeSummary}</span> },
    { key: "indicators", header: "Indicators", value: (row) => row.indicators.join(" "), render: (row) => row.indicators.join(", ") },
    { key: "verification", header: "Means of Verification", value: (row) => row.meansOfVerification, render: (row) => row.meansOfVerification },
    { key: "baseline", header: "Baseline", value: (row) => row.baseline, render: (row) => row.baseline },
    { key: "target", header: "Target", value: (row) => row.target, render: (row) => row.target },
    { key: "current", header: "Current", value: (row) => row.currentValue, render: (row) => row.currentValue },
    { key: "version", header: "Version", value: (row) => row.version, render: (row) => <Badge tone="accent">{row.version}</Badge> },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader action={<Button onClick={() => pushToast({ description: "Connect a logframe-authoring service to create donor-style logical frameworks. This control is a preview for now.", title: "Creating logframes isn't available yet", tone: "warning" })} variant="primary"><FileSpreadsheet aria-hidden="true" /> Create logframe</Button>} description="Manage donor-style logical frameworks with narrative summaries, indicators, verification, assumptions, baselines, targets, current values, exports, and versions." route="/indicators/logframes" title="Logframes" />
      <DataTable columns={columns} emptyLabel="No logframe rows yet" rows={rows} searchLabel="Search logframe rows, projects, indicators" title="Logframe rows" />
    </section>
  );
}

function Targets({ targets }: { targets: IndicatorTarget[] }) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const columns: TableColumn<IndicatorTarget>[] = [
    { key: "indicator", header: "Indicator", value: (row) => row.indicatorCode, render: (row) => <span className="font-mono text-xs">{row.indicatorCode}</span> },
    { key: "project", header: "Project", value: (row) => row.project, render: (row) => row.project },
    { key: "period", header: "Period", value: (row) => row.period, render: (row) => row.period },
    { key: "location", header: "Location", value: (row) => row.location, render: (row) => row.location },
    { key: "target", header: "Target", align: "right", value: (row) => String(row.targetValue), render: (row) => row.targetValue },
    { key: "achievement", header: "Achievement", align: "right", value: (row) => String(targetAchievement(row.actualValue, row.targetValue)), render: (row) => <Badge tone={progressTone(targetAchievement(row.actualValue, row.targetValue))}>{targetAchievement(row.actualValue, row.targetValue)}%</Badge> },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={indicatorTone(row.status)}>{row.status}</Badge> },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader action={<Button onClick={() => pushToast({ description: "Connect a targets service to set annual, quarterly, monthly, lifetime, or location-specific targets. This control is a preview for now.", title: "Setting targets isn't available yet", tone: "warning" })} variant="primary"><Target aria-hidden="true" /> Set target</Button>} description="Manage annual, quarterly, monthly, lifetime, location-specific, and disaggregated targets with actual-vs-target comparison." route="/indicators/targets" title="Targets" />
      <DataTable columns={columns} emptyLabel="No targets configured yet" rows={targets} searchLabel="Search targets, locations, projects" title="Indicator targets" />
    </section>
  );
}

function IndicatorTargetsOverview({ indicators }: { indicators: IndicatorRecord[] }) {
  const columns: TableColumn<IndicatorRecord>[] = [
    { key: "indicator", header: "Indicator", value: (row) => row.name, render: (row) => <div><p className="font-medium">{row.name}</p><p className="font-mono text-xs text-muted-foreground">{row.code}</p></div> },
    { key: "project", header: "Project", value: (row) => row.project, render: (row) => row.project },
    { key: "baseline", header: "Baseline", align: "right", value: (row) => String(row.baseline ?? ""), render: (row) => row.baseline ?? "—" },
    { key: "current", header: "Current", align: "right", value: (row) => String(row.current), render: (row) => row.current },
    { key: "target", header: "Target", align: "right", value: (row) => String(row.target), render: (row) => row.target },
    { key: "achievement", header: "Achievement", align: "right", value: (row) => String(progressPercent(row.current, row.baseline, row.target)), render: (row) => <Badge tone={progressTone(progressPercent(row.current, row.baseline, row.target))}>{progressPercent(row.current, row.baseline, row.target)}%</Badge> },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={indicatorTone(row.status)}>{row.status}</Badge> },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader description="Each indicator's configured target compared against its current calculated value. Period- and location-specific target tracking is on our roadmap." route="/indicators/targets" title="Targets" />
      <DataTable columns={columns} emptyLabel="No indicators configured yet" rows={indicators} searchLabel="Search indicators, projects" title="Indicator targets" />
    </section>
  );
}

function IndicatorBaselinesOverview({ indicators }: { indicators: IndicatorRecord[] }) {
  const columns: TableColumn<IndicatorRecord>[] = [
    { key: "indicator", header: "Indicator", value: (row) => row.name, render: (row) => <div><p className="font-medium">{row.name}</p><p className="font-mono text-xs text-muted-foreground">{row.code}</p></div> },
    { key: "project", header: "Project", value: (row) => row.project, render: (row) => row.project },
    { key: "baseline", header: "Baseline", align: "right", value: (row) => String(row.baseline ?? ""), render: (row) => row.baseline === null ? <Badge tone="warning">Missing</Badge> : `${row.baseline} ${row.unit}` },
    { key: "current", header: "Current", align: "right", value: (row) => String(row.current), render: (row) => `${row.current} ${row.unit}` },
    { key: "status", header: "Status", value: (row) => (row.baseline === null ? "Needs baseline" : "Baseline set"), render: (row) => <Badge tone={row.baseline === null ? "warning" : "success"}>{row.baseline === null ? "Needs baseline" : "Baseline set"}</Badge> },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader description="Baseline values configured on each indicator, compared against the current calculated value. Versioned, multi-location baseline history is on our roadmap." route="/indicators/baselines" title="Baselines" />
      <DataTable columns={columns} emptyLabel="No indicators configured yet" rows={indicators} searchLabel="Search indicators, projects" title="Indicator baselines" />
    </section>
  );
}

function Baselines({ baselines }: { baselines: IndicatorBaseline[] }) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const columns: TableColumn<IndicatorBaseline>[] = [
    { key: "indicator", header: "Indicator", value: (row) => row.indicatorCode, render: (row) => <span className="font-mono text-xs">{row.indicatorCode}</span> },
    { key: "project", header: "Project", value: (row) => row.project, render: (row) => row.project },
    { key: "location", header: "Location", value: (row) => row.location, render: (row) => row.location },
    { key: "value", header: "Baseline", align: "right", value: (row) => String(row.value), render: (row) => row.value },
    { key: "confidence", header: "Confidence", value: (row) => row.confidenceLevel, render: (row) => <Badge tone={row.confidenceLevel === "High" ? "success" : "warning"}>{row.confidenceLevel}</Badge> },
    { key: "locked", header: "Locked", value: (row) => String(row.locked), render: (row) => <Badge tone={row.locked ? "success" : "warning"}>{row.locked ? "Locked" : "Draft"}</Badge> },
    { key: "version", header: "Version", value: (row) => row.version, render: (row) => row.version },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader action={<Button onClick={() => pushToast({ description: "Connect a baselines service to add, import, or version approved baseline values. This control is a preview for now.", title: "Adding baselines isn't available yet", tone: "warning" })} variant="primary"><Database aria-hidden="true" /> Add baseline</Button>} description="Add, import, version, compare, and lock approved baseline values with methodology, source, confidence level, and notes." route="/indicators/baselines" title="Baselines" />
      <DataTable columns={columns} emptyLabel="No baselines configured yet" rows={baselines} searchLabel="Search baselines, projects, locations" title="Baseline values" />
    </section>
  );
}

function IndicatorReports({ onOpenReports, reports }: { onOpenReports: () => void; reports: IndicatorReport[] }) {
  const columns: TableColumn<IndicatorReport>[] = [
    { key: "name", header: "Report", value: (row) => row.name, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "type", header: "Type", value: (row) => row.type, render: (row) => row.type },
    { key: "project", header: "Project", value: (row) => row.project, render: (row) => row.project },
    { key: "period", header: "Period", value: (row) => row.period, render: (row) => row.period },
    { key: "formats", header: "Formats", value: (row) => row.formats.join(" "), render: (row) => row.formats.join(", ") },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={row.status === "Ready" ? "success" : row.status === "Draft" ? "warning" : "danger"}>{row.status}</Badge> },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader action={<Button onClick={onOpenReports} variant="primary"><FileSpreadsheet aria-hidden="true" /> Open Reports module</Button>} description="Prepare indicator-specific reports while formal outputs, scheduled reports, and exports remain owned by the Reports module." route="/indicators/reports" title="Indicator Reports" />
      <DataTable columns={columns} emptyLabel="No indicator reports yet" rows={reports} searchLabel="Search indicator reports, project, period" title="Indicator reports" />
    </section>
  );
}

function IndicatorReportsOverview({ indicators, onOpenReports }: { indicators: IndicatorRecord[]; onOpenReports: () => void }) {
  const columns: TableColumn<IndicatorRecord>[] = [
    { key: "indicator", header: "Indicator", value: (row) => row.name, render: (row) => <div><p className="font-medium">{row.name}</p><p className="font-mono text-xs text-muted-foreground">{row.code}</p></div> },
    { key: "project", header: "Project", value: (row) => row.project, render: (row) => row.project },
    { key: "frequency", header: "Frequency", value: (row) => row.frequency, render: (row) => row.frequency },
    { key: "lastCalculated", header: "Last Calculated", value: (row) => row.lastCalculatedAt, render: (row) => new Date(row.lastCalculatedAt).toLocaleString() },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={indicatorTone(row.status)}>{row.status}</Badge> },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader action={<Button onClick={onOpenReports} variant="primary"><FileSpreadsheet aria-hidden="true" /> Open Reports module</Button>} description="Current calculation status for each indicator. Build formal reports, exports, and donor outputs from the Reports module." route="/indicators/reports" title="Indicator Reports" />
      <DataTable columns={columns} emptyLabel="No indicators configured yet" rows={indicators} searchLabel="Search indicators, projects" title="Indicator reporting status" />
    </section>
  );
}

function IndicatorDetailWorkspace({
  auditEvents,
  baselines,
  canEdit,
  dataSources,
  indicator,
  onClose,
  onEdit,
  preview,
  setTab,
  tab,
  targets,
  token,
}: {
  auditEvents: IndicatorAuditEvent[];
  baselines: IndicatorBaseline[];
  canEdit: boolean;
  dataSources: IndicatorDataSource[];
  indicator: IndicatorRecord;
  onClose: () => void;
  onEdit: () => void;
  preview: boolean;
  setTab: (tab: IndicatorDetailTab) => void;
  tab: IndicatorDetailTab;
  targets: IndicatorTarget[];
  token: string | null;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={indicatorTone(indicator.status)}>{indicator.status}</Badge>
            <Badge tone="accent">{indicator.type}</Badge>
            <Badge tone={progressTone(progressPercent(indicator.current, indicator.baseline, indicator.target))}>{progressPercent(indicator.current, indicator.baseline, indicator.target)}%</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold">{indicator.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{indicator.code} · {indicator.project} · {indicator.resultArea}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!canEdit} onClick={onEdit} variant="primary">Edit indicator</Button>
          <Button onClick={onClose} variant="secondary">Back to indicators</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {detailTabs.map((item) => (
          <button className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium", tab === item ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")} key={item} onClick={() => setTab(item)} type="button">
            {item === "Audit Trail" && !preview ? "Linked Submissions" : item}
          </button>
        ))}
      </div>
      {tab === "Overview" ? <OverviewTab indicator={indicator} /> : null}
      {tab === "Data Sources" ? <DataSourcesTab dataSources={dataSources} indicator={indicator} preview={preview} /> : null}
      {tab === "Targets" ? <TargetRows indicator={indicator} targets={targets} /> : null}
      {tab === "Baselines" ? <BaselineRows baselines={baselines} indicator={indicator} /> : null}
      {tab === "Disaggregation" ? <DisaggregationTab indicator={indicator} preview={preview} token={token} /> : null}
      {tab === "Projects" ? <ProjectTab indicator={indicator} /> : null}
      {tab === "Forms" ? <FormsTab indicator={indicator} /> : null}
      {tab === "Progress" ? <ProgressTab indicator={indicator} /> : null}
      {tab === "History" ? <TimelineRows rows={auditEvents.filter((event) => event.indicatorId === indicator.id).map((event) => ({ label: event.action, meta: `${event.actor} · ${event.reason}`, tone: "accent" }))} /> : null}
      {tab === "Audit Trail" ? (
        preview ? <AuditRows auditEvents={auditEvents} indicator={indicator} /> : <LinkedSubmissionsPanel indicator={indicator} token={token} />
      ) : null}
    </section>
  );
}

function OverviewTab({ indicator }: { indicator: IndicatorRecord }) {
  const progress = progressPercent(indicator.current, indicator.baseline, indicator.target);
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Indicator Definition">
        <div className="grid gap-3 md:grid-cols-2">
          <Signal label="Indicator code" value={indicator.code} />
          <Signal label="Type" value={indicator.type} tone="accent" />
          <Signal label="Unit" value={indicator.unit} />
          <Signal label="Frequency" value={indicator.frequency} />
          <Signal label="Responsible" value={indicator.responsiblePerson} />
          <Signal label="Owner" value={indicator.owner} />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{indicator.definition}</p>
      </Panel>
      <Panel title="Current Result">
        <div className="grid gap-3 md:grid-cols-2">
          <Signal label="Baseline" value={indicator.baseline ?? "Missing"} tone={indicator.baseline === null ? "danger" : "success"} />
          <Signal label="Current" value={`${indicator.current} ${indicator.unit}`} />
          <Signal label="Target" value={`${indicator.target} ${indicator.unit}`} />
          <Signal label="Progress" value={`${progress}%`} tone={progressTone(progress)} />
          <Signal label="Calculation" value={indicator.calculationType} tone="accent" />
          <Signal label="Last calculated" value={new Date(indicator.lastCalculatedAt).toLocaleString()} />
        </div>
      </Panel>
    </div>
  );
}

function DataSourcesTab({ dataSources, indicator, preview }: { dataSources: IndicatorDataSource[]; indicator: IndicatorRecord; preview: boolean }) {
  const links = dataSources.filter((source) => source.indicatorId === indicator.id);
  const issues = validateFormQuestionLink(indicator);
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
      <Panel title="Approved Data Sources">
        {preview ? (
          <div className="space-y-3">
            {links.map((source) => (
              <div className="rounded-xl border bg-background/70 p-3" key={source.id}>
                <p className="font-medium">{source.formName} · {source.formVersion}</p>
                <p className="mt-1 text-xs text-muted-foreground">Numerator: {source.numeratorQuestion}{source.denominatorQuestion ? ` · Denominator: ${source.denominatorQuestion}` : ""}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <Signal label="Aggregation" value={source.aggregationLevel} />
                  <Signal label="Approved only" value={source.approvedSubmissionsOnly ? "Yes" : "No"} tone={source.approvedSubmissionsOnly ? "success" : "warning"} />
                </div>
              </div>
            ))}
            {!links.length ? <EmptyMini label="No form-question source is linked yet." /> : null}
          </div>
        ) : (
          <div className="space-y-3">
            <Signal label="Calculation formula" value={indicator.calculationMethod} tone="accent" />
            <Signal label="Project scope" value={indicator.project} />
            <Signal label="Last calculated" value={new Date(indicator.lastCalculatedAt).toLocaleString()} />
            <p className="text-xs leading-6 text-muted-foreground">
              The formula above runs against approved submissions. See the Linked Submissions tab for the individual records contributing to this calculation.
            </p>
          </div>
        )}
      </Panel>
      <Panel title="Calculation Validation">
        <TimelineRows rows={(issues.length ? issues : ["Ready for calculation"]).map((issue) => ({ label: issue, meta: issue === "Ready for calculation" ? "Uses approved submissions and current form version" : "Resolve before publishing report", tone: issue === "Ready for calculation" ? "success" : "danger" }))} />
      </Panel>
    </div>
  );
}

function TargetRows({ indicator, targets }: { indicator: IndicatorRecord; targets: IndicatorTarget[] }) {
  const rows = targets.filter((target) => target.indicatorId === indicator.id);
  if (!rows.length) {
    return <EmptyMini label={`No period targets configured for this indicator yet. Overall target: ${indicator.target} ${indicator.unit}.`} />;
  }
  return <TimelineRows rows={rows.map((row) => ({ label: `${row.period} · ${row.location}`, meta: `${row.actualValue} / ${row.targetValue} · ${targetAchievement(row.actualValue, row.targetValue)}%`, tone: progressTone(targetAchievement(row.actualValue, row.targetValue)) }))} />;
}

function BaselineRows({ baselines, indicator }: { baselines: IndicatorBaseline[]; indicator: IndicatorRecord }) {
  const rows = baselines.filter((baseline) => baseline.indicatorId === indicator.id);
  return <TimelineRows rows={(rows.length ? rows : []).map((row) => ({ label: `${row.indicatorCode} · ${row.location}`, meta: `${row.value} · ${row.methodology} · ${row.locked ? "Locked" : "Draft"}`, tone: row.locked ? "success" : "warning" }))} emptyLabel="No baseline has been approved for this indicator." />;
}

function DisaggregationTab({ indicator, preview, token }: { indicator: IndicatorRecord; preview: boolean; token: string | null }) {
  const disaggregationQuery = useQuery({
    enabled: !preview && Boolean(token),
    queryFn: () => getIndicatorDisaggregation(token ?? "", indicator.id),
    queryKey: ["indicator-disaggregation", token, indicator.id],
  });

  if (preview) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {indicator.disaggregation.map((item, index) => (
          <article className="rounded-2xl border bg-background/70 p-4" key={item}>
            <Badge tone="accent">Category {index + 1}</Badge>
            <p className="mt-3 font-medium">{item}</p>
            <p className="mt-1 text-xs text-muted-foreground">Progress tables and reports can split results by {item.toLowerCase()}.</p>
          </article>
        ))}
      </div>
    );
  }

  if (!indicator.disaggregation.length) {
    return <EmptyMini label="No disaggregation fields are configured for this indicator yet. Edit the indicator to add up to 6 fields." />;
  }

  if (disaggregationQuery.isLoading) {
    return <EmptyMini label="Loading disaggregation breakdown..." />;
  }

  const items = disaggregationQuery.data?.items ?? [];
  if (!items.length) {
    return <EmptyMini label="No approved submissions are available to compute a breakdown yet." />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const breakdownEntries = Object.entries(item.breakdown);
        return (
          <article className="rounded-2xl border bg-background/70 p-4" key={item.field_name}>
            <Badge tone="accent">{prettifyFieldName(item.field_name)}</Badge>
            <p className="mt-2 text-xs text-muted-foreground">{item.operation ? `${item.operation}(${item.field_name})` : item.field_name}</p>
            {breakdownEntries.length ? (
              <TimelineRows
                rows={breakdownEntries.map(([label, value]) => ({ label: prettifyFieldName(label), meta: String(value), tone: "neutral" }))}
              />
            ) : (
              <EmptyMini label="No approved submissions for this field yet." />
            )}
          </article>
        );
      })}
    </div>
  );
}

function LinkedSubmissionsPanel({ indicator, token }: { indicator: IndicatorRecord; token: string | null }) {
  const linkedSubmissionsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getIndicatorLinkedSubmissions(token ?? "", indicator.id),
    queryKey: ["indicator-linked-submissions", token, indicator.id],
  });

  if (linkedSubmissionsQuery.isLoading) {
    return <Panel title="Linked Submissions"><EmptyMini label="Loading linked submissions..." /></Panel>;
  }

  const data = linkedSubmissionsQuery.data;
  if (!data || !data.field_name) {
    return <Panel title="Linked Submissions"><EmptyMini label="This indicator's formula doesn't reference a form field, so no submissions can be linked." /></Panel>;
  }

  return (
    <Panel
      action={<Badge tone="accent">{data.operation ? `${data.operation}(${data.field_name})` : data.field_name} · {data.total_count}</Badge>}
      title="Linked Submissions"
    >
      <TimelineRows
        emptyLabel="No approved submissions contribute to this indicator yet."
        rows={data.items.map((item) => ({
          label: item.client_submission_id ?? item.submission_id,
          meta: `Submitted ${item.submitted_at ? new Date(item.submitted_at).toLocaleString() : "unknown"}${item.approved_at ? ` · Approved ${new Date(item.approved_at).toLocaleString()}` : ""} · Value: ${String(item.field_value ?? "—")}`,
          tone: "success",
        }))}
      />
    </Panel>
  );
}

function ProjectTab({ indicator }: { indicator: IndicatorRecord }) {
  return (
    <Panel title="Project Link">
      <Signal label="Project" value={indicator.project} />
      <Signal label="Result area" value={indicator.resultArea} />
      <Signal label="Responsible person" value={indicator.responsiblePerson} />
    </Panel>
  );
}

function FormsTab({ indicator }: { indicator: IndicatorRecord }) {
  return (
    <Panel title="Form Question Link">
      <Signal label="Linked form" value={indicator.linkedForm ?? "Missing"} tone={indicator.linkedForm ? "success" : "danger"} />
      <Signal label="Numerator question" value={indicator.linkedQuestion ?? "Missing"} tone={indicator.linkedQuestion ? "success" : "danger"} />
      <Signal label="Numerator" value={indicator.numerator ?? "Not configured"} />
      <Signal label="Denominator" value={indicator.denominator ?? "Not required"} />
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Forms collect the responses; Indicators define how approved submissions are calculated and aggregated.</p>
    </Panel>
  );
}

function ProgressTab({ indicator }: { indicator: IndicatorRecord }) {
  const progress = progressPercent(indicator.current, indicator.baseline, indicator.target);
  const simulatedResult = calculateIndicatorResult({ denominator: 120, numerator: 86, type: indicator.calculationType });
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
      <Panel title="Progress Over Time">
        <ProgressBar value={progress} />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Signal label="Baseline" value={indicator.baseline ?? "Missing"} />
          <Signal label="Current" value={indicator.current} />
          <Signal label="Target" value={indicator.target} />
        </div>
      </Panel>
      <Panel title="Calculation Engine">
        <Signal label="Type" value={indicator.calculationType} tone="accent" />
        <Signal label="Example approved result" value={simulatedResult} />
        <Signal label="Source form version" value={indicator.linkedForm ? "Current approved version" : "Missing"} tone={indicator.linkedForm ? "success" : "danger"} />
        <Signal label="Manual override" value="Permission + audit reason required" tone="warning" />
      </Panel>
    </div>
  );
}

function AuditRows({ auditEvents, indicator }: { auditEvents: IndicatorAuditEvent[]; indicator: IndicatorRecord }) {
  const rows: IndicatorAuditEvent[] = auditEvents.filter((event) => event.indicatorId === indicator.id);
  return <TimelineRows rows={rows.map((event) => ({ label: event.action, meta: `${event.actor} · ${new Date(event.createdAt).toLocaleString()} · ${event.reason}`, tone: "governance" }))} emptyLabel="No audit events for this indicator yet." />;
}

function SectionHeader({ action, description, route, title }: { action?: ReactNode; description: string; route: string; title: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-panel p-3 shadow-line xl:flex-row xl:items-center xl:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="monitor">{route}</Badge>
          <Badge tone="accent">Architecture route</Badge>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint>
        </div>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

function Panel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="rounded-xl border bg-panel p-3 shadow-line">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Signal({ label, tone = "neutral", value }: { label: string; tone?: BadgeProps["tone"]; value: string | number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge tone={tone}>{value ?? "Not set"}</Badge>
    </div>
  );
}

function TimelineRows({ emptyLabel = "No records yet.", rows }: { emptyLabel?: string; rows: { label: string; meta: string; tone?: BadgeProps["tone"] }[] }) {
  if (!rows.length) return <EmptyMini label={emptyLabel} />;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div className="rounded-xl border bg-background/70 p-3" key={`${row.label}-${row.meta}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{row.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.meta}</p>
            </div>
            {row.tone ? <Badge tone={row.tone}>Status</Badge> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full", value >= 80 ? "bg-success" : value >= 50 ? "bg-warning" : "bg-danger")} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function EmptyMini({ label }: { label: string }) {
  return <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">{label}</div>;
}

function ComingSoonSection({ action, sectionId }: { action?: ReactNode; sectionId: IndicatorSection }) {
  const meta = indicatorSections.find((section) => section.id === sectionId);
  if (!meta) return null;
  return (
    <section className="space-y-4">
      <SectionHeader action={action} description={meta.description} route={meta.route} title={meta.label} />
      <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">On our roadmap</p>
        <p className="mt-2 leading-6">{meta.label} is planned for a future release and isn&apos;t available in this workspace yet. {meta.description}</p>
      </div>
    </section>
  );
}
