"use client";

import { useQuery } from "@tanstack/react-query";
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
import { Input, Select } from "@/components/ui/input";
import type { CurrentPrincipal, IndicatorRead } from "@/lib/api";
import { listIndicators } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  indicatorSections,
  previewAuditEvents,
  previewBaselines,
  previewDataSources,
  previewIndicators,
  previewLogframeRows,
  previewReports,
  previewResultsFramework,
  previewTargets,
  type IndicatorAuditEvent,
  type IndicatorBaseline,
  type IndicatorRecord,
  type IndicatorReport,
  type IndicatorSection,
  type IndicatorTarget,
  type LogframeRow,
  type ResultsFrameworkNode,
} from "@/modules/indicators/data";
import {
  calculateIndicatorResult,
  computeIndicatorSummary,
  filterIndicatorsBySection,
  indicatorTone,
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

function isPreview(token: string | null): boolean {
  return !token || token === "preview-token";
}

function mapApiIndicator(row: IndicatorRead): IndicatorRecord {
  const progress = row.progress_percent || progressPercent(row.current_value, row.baseline_value, row.target_value);
  return {
    baseline: row.baseline_value,
    calculationMethod: row.formula || "Current approved value compared against configured target.",
    calculationType: row.formula ? "Custom formula" : "Percentage",
    code: row.code,
    current: row.current_value,
    dataSource: row.survey_id ? "Survey-linked approved submissions" : null,
    definition: row.description ?? "Imported monitoring indicator.",
    disaggregation: ["Project", "Location"],
    frequency: (row.reporting_frequency || "Quarterly") as IndicatorRecord["frequency"],
    id: row.id,
    lastCalculatedAt: new Date().toISOString(),
    linkedForm: null,
    linkedQuestion: null,
    name: row.name,
    owner: "M&E Manager",
    project: row.project_id ? "Linked project" : "Organization-wide",
    responsiblePerson: "Data Manager",
    resultArea: row.sdg_code ?? "Monitoring framework",
    status: row.is_active ? (progress >= 80 ? "On Track" : "Behind Target") : "Archived",
    target: row.target_value,
    type: "Outcome",
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

export function IndicatorsModule({ token }: IndicatorsModuleProps) {
  const [activeSection, setActiveSection] = useState<IndicatorSection>("dashboard");
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<IndicatorDetailTab>("Overview");
  const [actionResult, setActionResult] = useState("");
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const preview = isPreview(token);

  const indicatorsQuery = useQuery({
    queryKey: ["indicators-module", token],
    queryFn: () => listIndicators(token ?? ""),
    enabled: Boolean(token && !preview),
  });

  const indicators = useMemo(
    () => (preview ? previewIndicators : (indicatorsQuery.data ?? []).map(mapApiIndicator)),
    [indicatorsQuery.data, preview],
  );
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
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border bg-panel p-5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="monitor">ANALYTICS</Badge>
              <Badge tone={summary.behindTarget ? "warning" : "success"}>{summary.behindTarget} behind target</Badge>
              <Badge tone={summary.withoutDataSource ? "danger" : "accent"}>{summary.withoutDataSource} without data source</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Indicators</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage the M&E measurement framework: indicator library, results frameworks, logframes, baselines, targets, calculations, form links, disaggregation, and progress tracking.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setActiveSection("library")} variant="primary">
              <BookOpenCheck aria-hidden="true" />
              Create indicator
            </Button>
            <Button onClick={exportIndicators} variant="secondary">
              <Download aria-hidden="true" />
              Export
            </Button>
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto product-scrollbar" aria-label="Indicator sections">
          {indicatorSections.map((section) => (
            <button
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition",
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
          indicator={selectedIndicator}
          onClose={() => setSelectedIndicatorId(null)}
          setTab={setActiveDetailTab}
          tab={activeDetailTab}
        />
      ) : null}

      {!selectedIndicator && activeSection === "dashboard" ? (
        <IndicatorsDashboard
          indicators={indicators}
          onOpenAttention={() => setActiveSection("library")}
          onOpenReports={() => setActiveView("analytics")}
          summary={summary}
        />
      ) : null}

      {!selectedIndicator && activeSection === "library" ? (
        <IndicatorLibrary indicators={visibleIndicators} loading={indicatorsQuery.isFetching} onOpenIndicator={openIndicator} />
      ) : null}
      {!selectedIndicator && activeSection === "results-framework" ? <ResultsFramework /> : null}
      {!selectedIndicator && activeSection === "logframes" ? <Logframes /> : null}
      {!selectedIndicator && activeSection === "targets" ? <Targets /> : null}
      {!selectedIndicator && activeSection === "baselines" ? <Baselines /> : null}
      {!selectedIndicator && activeSection === "reports" ? <IndicatorReports onOpenReports={() => setActiveView("analytics")} /> : null}
    </section>
  );
}

function IndicatorsDashboard({
  indicators,
  onOpenAttention,
  onOpenReports,
  summary,
}: {
  indicators: IndicatorRecord[];
  onOpenAttention: () => void;
  onOpenReports: () => void;
  summary: ReturnType<typeof computeIndicatorSummary>;
}) {
  const targetSummary = summarizeTargets(previewTargets);
  const cards: { icon: LucideIcon; label: string; tone?: BadgeProps["tone"]; value: string | number }[] = [
    { icon: BarChart3, label: "Total Indicators", value: summary.totalIndicators },
    { icon: ListChecks, label: "Output Indicators", value: summary.outputIndicators },
    { icon: TrendingUp, label: "Outcome Indicators", value: summary.outcomeIndicators },
    { icon: Target, label: "Impact Indicators", value: summary.impactIndicators },
    { icon: CheckCircle2, label: "Indicators On Track", tone: "success", value: summary.onTrack },
    { icon: FileSpreadsheet, label: "Indicators Behind Target", tone: summary.behindTarget ? "warning" : "success", value: summary.behindTarget },
    { icon: Database, label: "Without Baseline", tone: summary.withoutBaseline ? "danger" : "success", value: summary.withoutBaseline },
    { icon: Link2, label: "Without Data Source", tone: summary.withoutDataSource ? "danger" : "success", value: summary.withoutDataSource },
    { icon: History, label: "Reporting Periods Due", tone: summary.reportingPeriodsDue ? "warning" : "neutral", value: summary.reportingPeriodsDue },
  ];
  const attention = indicators.filter((indicator) => indicator.status !== "On Track").slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <article className="rounded-2xl border bg-panel p-4 shadow-line" key={card.label}>
            <div className="flex items-center justify-between gap-3">
              <card.icon aria-hidden="true" className="text-primary" size={18} />
              {card.tone ? <Badge tone={card.tone}>RBM</Badge> : null}
            </div>
            <p className="mt-4 text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </article>
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
          <div className="grid gap-3">
            <Signal label="Average achievement" value={`${targetSummary.averageAchievement}%`} tone={progressTone(targetSummary.averageAchievement)} />
            <Signal label="Targets on track" value={targetSummary.onTrack} tone="success" />
            <Signal label="Targets behind" value={targetSummary.behind} tone={targetSummary.behind ? "warning" : "success"} />
            <Signal label="Calculation rule" value="Approved submissions only" tone="accent" />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Results Framework Progress">
          <TimelineRows rows={previewResultsFramework.slice(0, 5).map((node) => ({ label: `${node.level}: ${node.title}`, meta: `${node.progress}% · ${node.indicators.join(", ")}`, tone: progressTone(node.progress) }))} />
        </Panel>
        <Panel title="Indicators Requiring Attention">
          <TimelineRows rows={attention.map((indicator) => ({ label: indicator.name, meta: `${indicator.status} · ${validateFormQuestionLink(indicator).join(", ") || "Calculation current"}`, tone: indicatorTone(indicator.status) }))} />
        </Panel>
        <Panel title="Upcoming Reporting Deadlines">
          <Signal label="Monthly indicators" value="2 due this week" tone="warning" />
          <Signal label="Quarterly indicators" value="2 due this month" tone="accent" />
          <Signal label="Recent update" value={previewAuditEvents[0]?.action ?? "No updates"} />
        </Panel>
      </div>
    </div>
  );
}

function IndicatorLibrary({ indicators, loading, onOpenIndicator }: { indicators: IndicatorRecord[]; loading: boolean; onOpenIndicator: (indicator: IndicatorRecord, tab?: IndicatorDetailTab) => void }) {
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
        action={<div className="flex flex-wrap gap-2"><Button variant="primary"><BookOpenCheck aria-hidden="true" /> Create indicator</Button><Button variant="secondary"><Import aria-hidden="true" /> Import indicators</Button></div>}
        description="Create, edit, archive, duplicate, import, export, and link indicators to projects, forms, questions, targets, baselines, and responsible people."
        route="/indicators/library"
        title="Indicator Library"
      />
      <DataTable columns={columns} emptyLabel="No indicators yet" rows={indicators} searchLabel="Search indicators, projects, codes, owners" title={loading ? "Indicator library syncing" : "Indicator library"} />
    </section>
  );
}

function ResultsFramework() {
  return (
    <section className="space-y-4">
      <SectionHeader
        action={<Button variant="primary"><GitBranch aria-hidden="true" /> Add result level</Button>}
        description="Manage the logical structure from Goal to Impact, Outcomes, Outputs, Activities, and Indicators without duplicating project setup."
        route="/indicators/results-framework"
        title="Results Framework"
      />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Tree View">
          <div className="space-y-3">
            {previewResultsFramework.map((node) => (
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
            {previewResultsFramework.map((node) => (
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

function Logframes() {
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
      <SectionHeader action={<Button variant="primary"><FileSpreadsheet aria-hidden="true" /> Create logframe</Button>} description="Manage donor-style logical frameworks with narrative summaries, indicators, verification, assumptions, baselines, targets, current values, exports, and versions." route="/indicators/logframes" title="Logframes" />
      <DataTable columns={columns} emptyLabel="No logframe rows yet" rows={previewLogframeRows} searchLabel="Search logframe rows, projects, indicators" title="Logframe rows" />
    </section>
  );
}

function Targets() {
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
      <SectionHeader action={<Button variant="primary"><Target aria-hidden="true" /> Set target</Button>} description="Manage annual, quarterly, monthly, lifetime, location-specific, and disaggregated targets with actual-vs-target comparison." route="/indicators/targets" title="Targets" />
      <DataTable columns={columns} emptyLabel="No targets configured yet" rows={previewTargets} searchLabel="Search targets, locations, projects" title="Indicator targets" />
    </section>
  );
}

function Baselines() {
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
      <SectionHeader action={<Button variant="primary"><Database aria-hidden="true" /> Add baseline</Button>} description="Add, import, version, compare, and lock approved baseline values with methodology, source, confidence level, and notes." route="/indicators/baselines" title="Baselines" />
      <DataTable columns={columns} emptyLabel="No baselines configured yet" rows={previewBaselines} searchLabel="Search baselines, projects, locations" title="Baseline values" />
    </section>
  );
}

function IndicatorReports({ onOpenReports }: { onOpenReports: () => void }) {
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
      <DataTable columns={columns} emptyLabel="No indicator reports yet" rows={previewReports} searchLabel="Search indicator reports, project, period" title="Indicator reports" />
    </section>
  );
}

function IndicatorDetailWorkspace({ indicator, onClose, setTab, tab }: { indicator: IndicatorRecord; onClose: () => void; setTab: (tab: IndicatorDetailTab) => void; tab: IndicatorDetailTab }) {
  return (
    <section className="space-y-4 rounded-2xl border bg-panel p-5 shadow-line">
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
        <Button onClick={onClose} variant="secondary">Back to indicators</Button>
      </div>
      <div className="flex gap-2 overflow-x-auto product-scrollbar">
        {detailTabs.map((item) => (
          <button className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium", tab === item ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")} key={item} onClick={() => setTab(item)} type="button">
            {item}
          </button>
        ))}
      </div>
      {tab === "Overview" ? <OverviewTab indicator={indicator} /> : null}
      {tab === "Data Sources" ? <DataSourcesTab indicator={indicator} /> : null}
      {tab === "Targets" ? <TargetRows indicator={indicator} /> : null}
      {tab === "Baselines" ? <BaselineRows indicator={indicator} /> : null}
      {tab === "Disaggregation" ? <DisaggregationTab indicator={indicator} /> : null}
      {tab === "Projects" ? <ProjectTab indicator={indicator} /> : null}
      {tab === "Forms" ? <FormsTab indicator={indicator} /> : null}
      {tab === "Progress" ? <ProgressTab indicator={indicator} /> : null}
      {tab === "History" ? <TimelineRows rows={previewAuditEvents.filter((event) => event.indicatorId === indicator.id).map((event) => ({ label: event.action, meta: `${event.actor} · ${event.reason}`, tone: "accent" }))} /> : null}
      {tab === "Audit Trail" ? <AuditRows indicator={indicator} /> : null}
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

function DataSourcesTab({ indicator }: { indicator: IndicatorRecord }) {
  const links = previewDataSources.filter((source) => source.indicatorId === indicator.id);
  const issues = validateFormQuestionLink(indicator);
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
      <Panel title="Approved Data Sources">
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
      </Panel>
      <Panel title="Calculation Validation">
        <TimelineRows rows={(issues.length ? issues : ["Ready for calculation"]).map((issue) => ({ label: issue, meta: issue === "Ready for calculation" ? "Uses approved submissions and current form version" : "Resolve before publishing report", tone: issue === "Ready for calculation" ? "success" : "danger" }))} />
      </Panel>
    </div>
  );
}

function TargetRows({ indicator }: { indicator: IndicatorRecord }) {
  const rows = previewTargets.filter((target) => target.indicatorId === indicator.id);
  return <TimelineRows rows={(rows.length ? rows : [{ period: "No configured target", location: indicator.project, actualValue: 0, targetValue: indicator.target, status: indicator.status }]).map((row) => ({ label: `${row.period} · ${row.location}`, meta: `${row.actualValue} / ${row.targetValue} · ${targetAchievement(row.actualValue, row.targetValue)}%`, tone: progressTone(targetAchievement(row.actualValue, row.targetValue)) }))} />;
}

function BaselineRows({ indicator }: { indicator: IndicatorRecord }) {
  const rows = previewBaselines.filter((baseline) => baseline.indicatorId === indicator.id);
  return <TimelineRows rows={(rows.length ? rows : []).map((row) => ({ label: `${row.indicatorCode} · ${row.location}`, meta: `${row.value} · ${row.methodology} · ${row.locked ? "Locked" : "Draft"}`, tone: row.locked ? "success" : "warning" }))} emptyLabel="No baseline has been approved for this indicator." />;
}

function DisaggregationTab({ indicator }: { indicator: IndicatorRecord }) {
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

function AuditRows({ indicator }: { indicator: IndicatorRecord }) {
  const rows: IndicatorAuditEvent[] = previewAuditEvents.filter((event) => event.indicatorId === indicator.id);
  return <TimelineRows rows={rows.map((event) => ({ label: event.action, meta: `${event.actor} · ${new Date(event.createdAt).toLocaleString()} · ${event.reason}`, tone: "governance" }))} emptyLabel="No audit events for this indicator yet." />;
}

function SectionHeader({ action, description, route, title }: { action?: ReactNode; description: string; route: string; title: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-panel p-4 shadow-line xl:flex-row xl:items-center xl:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="monitor">{route}</Badge>
          <Badge tone="accent">Architecture route</Badge>
        </div>
        <h2 className="mt-3 text-lg font-semibold">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

function Panel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="rounded-2xl border bg-panel p-4 shadow-line">
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
