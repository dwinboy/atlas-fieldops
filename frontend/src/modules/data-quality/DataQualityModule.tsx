"use client";

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileWarning,
  Gauge,
  GitCompare,
  ListChecks,
  LocateFixed,
  MapPinned,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import type { CurrentPrincipal } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  dataQualitySections,
  previewDuplicateGroups,
  previewGpsIssues,
  previewOutliers,
  previewQualityAuditEvents,
  previewQualityIssues,
  previewQualityRules,
  previewQualityScores,
  previewRiskAlerts,
  previewValidationFailures,
  type DataQualitySection,
  type DuplicateGroup,
  type GPSIssueRecord,
  type OutlierRecord,
  type QualityAuditEvent,
  type QualityIssue,
  type QualityRuleRecord,
  type RiskAlertRecord,
  type ValidationFailureRecord,
} from "@/modules/data-quality/data";
import {
  averageResolutionImpact,
  buildQualityInvestigationSummary,
  calculateQualityScore,
  computeQualitySummary,
  filterIssuesBySection,
  nextInvestigationStatus,
  qualityCategory,
  scoreTone,
  severityTone,
  statusTone,
  toCsv,
} from "@/modules/data-quality/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type DataQualityModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

type IssueDetailTab = "Overview" | "Related Submission" | "Investigation" | "Resolution" | "History" | "Audit Trail";

const issueTabs: IssueDetailTab[] = ["Overview", "Related Submission", "Investigation", "Resolution", "History", "Audit Trail"];

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

export function DataQualityModule({ principal }: DataQualityModuleProps) {
  const [activeSection, setActiveSection] = useState<DataQualitySection>("dashboard");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [activeIssueTab, setActiveIssueTab] = useState<IssueDetailTab>("Overview");
  const [actionResult, setActionResult] = useState("");
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const organizationScore = previewQualityScores.Organization;
  const summary = useMemo(() => computeQualitySummary(previewQualityIssues, organizationScore), [organizationScore]);
  const visibleIssues = useMemo(() => filterIssuesBySection(previewQualityIssues, activeSection), [activeSection]);
  const selectedIssue = previewQualityIssues.find((issue) => issue.id === selectedIssueId) ?? null;
  const roleLabel = principal?.roles?.join(", ") || "Workspace user";

  function openIssue(issue: QualityIssue, tab: IssueDetailTab = "Overview"): void {
    setSelectedIssueId(issue.id);
    setActiveIssueTab(tab);
    setActionResult(buildQualityInvestigationSummary(issue));
  }

  function exportIssues(): void {
    downloadCsv(
      "atlas-data-quality-issues.csv",
      previewQualityIssues.map((issue) => ({
        assignedTo: issue.assignedTo,
        detectedAt: issue.detectedAt,
        enumerator: issue.enumerator,
        form: issue.form,
        id: issue.id,
        location: issue.location,
        project: issue.project,
        severity: issue.severity,
        status: issue.status,
        submissionId: issue.submissionId,
        supervisor: issue.supervisor,
        title: issue.title,
        type: issue.type,
      })),
    );
    setActionResult("Quality issue export prepared. Production exports should be permission-controlled and audited through Governance.");
    pushToast({ title: "Quality issues exported", description: "The data quality issue CSV is ready.", tone: "success" });
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="governance">ANALYTICS</Badge>
              <Badge tone={scoreTone(summary.overallScore)}>{summary.overallScore}/100 · {qualityCategory(summary.overallScore)}</Badge>
              <Badge tone={summary.criticalIssues ? "danger" : "success"}>{summary.criticalIssues} critical</Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Data Quality</h1>
              <HelpHint label="About Data Quality" title="Data Quality">
                Monitor trust, detect duplicates, outliers, GPS issues, missing data, validation failures, risk alerts, and manage quality rules before records power indicators, reports, and program decisions.
              </HelpHint>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Access context: {roleLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setActiveSection("rules")} type="button" variant="secondary">
              <ListChecks aria-hidden="true" /> Manage rules
            </Button>
            <Button onClick={exportIssues} type="button">
              <Download aria-hidden="true" /> Export issues
            </Button>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 product-scrollbar">
          {dataQualitySections.map((section) => (
            <button
              className={cn(
                "min-w-36 rounded-lg border px-2.5 py-1.5 text-left transition hover:border-primary/40 hover:bg-primary/5",
                activeSection === section.id ? "border-primary/50 bg-primary/10 shadow-line" : "bg-background",
              )}
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                setSelectedIssueId(null);
              }}
              type="button"
            >
              <span className="text-xs font-semibold">{section.label}</span>
              <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">{section.route}</span>
            </button>
          ))}
        </div>
      </div>

      {actionResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Data quality update</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{actionResult}</p>
            </div>
          </div>
        </section>
      ) : null}

      {selectedIssue ? (
        <IssueDetail
          auditEvents={previewQualityAuditEvents.filter((event) => event.issueId === selectedIssue.id)}
          issue={selectedIssue}
          onBack={() => setSelectedIssueId(null)}
          onOpenGovernance={() => setActiveView("governance")}
          onOpenMapping={() => setActiveView("map")}
          selectedTab={activeIssueTab}
          setSelectedTab={setActiveIssueTab}
        />
      ) : null}

      {!selectedIssue && activeSection === "dashboard" ? (
        <QualityLanding
          onOpenIssue={openIssue}
          onOpenSection={setActiveSection}
          summary={summary}
        />
      ) : null}
      {!selectedIssue && activeSection === "quality-dashboard" ? <QualityDashboard onOpenIssue={openIssue} /> : null}
      {!selectedIssue && activeSection === "duplicates" ? <DuplicatesSection groups={previewDuplicateGroups} issues={visibleIssues} onOpenIssue={openIssue} /> : null}
      {!selectedIssue && activeSection === "outliers" ? <OutliersSection outliers={previewOutliers} issues={visibleIssues} onOpenIssue={openIssue} /> : null}
      {!selectedIssue && activeSection === "gps-issues" ? <GPSIssuesSection gpsIssues={previewGpsIssues} issues={visibleIssues} onOpenIssue={openIssue} onOpenMapping={() => setActiveView("map")} /> : null}
      {!selectedIssue && activeSection === "missing-data" ? <IssueTable description="Track missing required fields, incomplete sections, missing consent, missing attachments, and missing GPS." issues={visibleIssues} onOpenIssue={openIssue} route="/data-quality/missing-data" title="Missing Data" /> : null}
      {!selectedIssue && activeSection === "validation-failures" ? <ValidationFailuresSection failures={previewValidationFailures} issues={visibleIssues} onOpenIssue={openIssue} /> : null}
      {!selectedIssue && activeSection === "risk-alerts" ? <RiskAlertsSection alerts={previewRiskAlerts} issues={visibleIssues} onOpenGovernance={() => setActiveView("governance")} onOpenIssue={openIssue} /> : null}
      {!selectedIssue && activeSection === "rules" ? <QualityRulesSection rules={previewQualityRules} /> : null}

      <section className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Module boundaries</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Data Quality detects, monitors, investigates, and resolves quality issues. Forms define validation rules, Submissions store records, Mapping visualizes spatial issues, Governance handles compliance escalation, and Reports publish formal outputs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setActiveView("submissions")} type="button" variant="secondary">
              <ClipboardCheck aria-hidden="true" /> Submissions
            </Button>
            <Button onClick={() => setActiveView("map")} type="button" variant="secondary">
              <MapPinned aria-hidden="true" /> Mapping
            </Button>
            <Button onClick={() => setActiveView("analytics")} type="button" variant="secondary">
              <BarChart3 aria-hidden="true" /> Reports
            </Button>
          </div>
        </div>
      </section>
    </section>
  );
}

function QualityLanding({
  onOpenIssue,
  onOpenSection,
  summary,
}: {
  onOpenIssue: (issue: QualityIssue) => void;
  onOpenSection: (section: DataQualitySection) => void;
  summary: ReturnType<typeof computeQualitySummary>;
}) {
  const cards = [
    { icon: Gauge, label: "Overall Data Quality Score", value: `${summary.overallScore}/100`, tone: scoreTone(summary.overallScore) },
    { icon: FileWarning, label: "Open Quality Issues", value: summary.openQualityIssues, tone: summary.openQualityIssues ? "warning" : "success" },
    { icon: AlertTriangle, label: "Critical Issues", value: summary.criticalIssues, tone: summary.criticalIssues ? "danger" : "success" },
    { icon: GitCompare, label: "Duplicate Records", value: summary.duplicateRecords, tone: "warning" },
    { icon: LocateFixed, label: "GPS Issues", value: summary.gpsIssues, tone: "danger" },
    { icon: ShieldAlert, label: "Validation Failures", value: summary.validationFailures, tone: "warning" },
    { icon: ClipboardCheck, label: "Missing Data Records", value: summary.missingDataRecords, tone: "danger" },
    { icon: Sparkles, label: "High-Risk Submissions", value: summary.highRiskSubmissions, tone: "danger" },
    { icon: CheckCircle2, label: "Resolved Issues", value: summary.resolvedIssues, tone: "success" },
  ] satisfies { icon: LucideIcon; label: string; tone: BadgeProps["tone"]; value: number | string }[];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => <MetricCard icon={card.icon} key={card.label} label={card.label} tone={card.tone} value={card.value} />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel action={<Button onClick={() => onOpenSection("quality-dashboard")} size="sm" variant="secondary">Open dashboard</Button>} title="Quality Trends">
          <TrendBars scores={previewQualityScores.Organization} />
        </Panel>
        <Panel title="Open Investigations">
          <Timeline
            records={previewQualityIssues.filter((issue) => issue.status !== "Resolved" && issue.status !== "Closed").slice(0, 5).map((issue) => ({
              badge: issue.severity,
              label: issue.title,
              meta: `${issue.status} · ${issue.project} · ${issue.assignedTo}`,
              onClick: () => onOpenIssue(issue),
              tone: severityTone(issue.severity),
            }))}
          />
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <RankingPanel title="Quality by Project" rows={[["Health Facility Readiness", 91], ["Agricultural Resilience Program", 84], ["Social Protection Response", 78], ["School Attendance Recovery", 74]]} />
        <RankingPanel title="Quality by Form" rows={[["Facility Assessment", 92], ["Farmer Registration Survey", 83], ["Household Verification Form", 76], ["Market Access Survey", 69]]} />
        <RankingPanel title="Quality by Enumerator" rows={[["Helen P.", 92], ["Amina D.", 84], ["Jean F.", 75], ["Peter O.", 61]]} />
      </div>
      <Panel title="Top Quality Issues">
        <IssueCards issues={previewQualityIssues.slice(0, 4)} onOpenIssue={onOpenIssue} />
      </Panel>
    </div>
  );
}

function QualityDashboard({ onOpenIssue }: { onOpenIssue: (issue: QualityIssue) => void }) {
  return (
    <div className="space-y-3">
      <SectionHeader
        action={<Button type="button"><Download aria-hidden="true" /> Export dashboard</Button>}
        description="Executive quality overview with KPI cards, trend charts, severity breakdowns, heatmaps, ranking tables, and resolution progress."
        route="/data-quality/dashboard"
        title="Quality Dashboard"
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Panel title="Issue Severity Breakdown">
          <div className="grid gap-3 md:grid-cols-4">
            {(["Critical", "High", "Medium", "Low"] as const).map((severity) => (
              <div className="rounded-xl border bg-background p-4" key={severity}>
                <Badge tone={severityTone(severity)}>{severity}</Badge>
                <p className="mt-3 text-2xl font-semibold">{previewQualityIssues.filter((issue) => issue.severity === severity).length}</p>
                <p className="text-xs text-muted-foreground">Open and historical quality issues</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Resolution Progress">
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Average score impact</p>
            <p className="mt-2 text-3xl font-semibold">{averageResolutionImpact(previewQualityIssues)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Potential score recovery if open issues are resolved.</p>
          </div>
        </Panel>
      </div>
      <Panel title="Quality Heatmap">
        <div className="grid gap-3 md:grid-cols-4">
          {Object.entries(previewQualityScores).map(([scope, score]) => {
            const value = calculateQualityScore(score);
            return (
              <div className="rounded-xl border bg-background p-4" key={scope}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{scope}</p>
                  <Badge tone={scoreTone(value)}>{value}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{qualityCategory(value)}</p>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title="Issues Requiring Attention">
        <IssueCards issues={previewQualityIssues.filter((issue) => issue.severity === "Critical" || issue.severity === "High")} onOpenIssue={onOpenIssue} />
      </Panel>
    </div>
  );
}

function DuplicatesSection({ groups, issues, onOpenIssue }: { groups: DuplicateGroup[]; issues: QualityIssue[]; onOpenIssue: (issue: QualityIssue) => void }) {
  const columns: TableColumn<DuplicateGroup>[] = [
    { header: "Group", key: "id", render: (group) => <div><p className="font-medium">{group.id}</p><p className="text-xs text-muted-foreground">{group.records.join(", ")}</p></div>, value: (group) => group.id },
    { header: "Method", key: "method", render: (group) => group.matchingMethod, value: (group) => group.matchingMethod },
    { header: "Fields", key: "fields", render: (group) => group.fields.join(", "), value: (group) => group.fields.join(" ") },
    { header: "Confidence", key: "confidence", render: (group) => `${group.confidence}%`, value: (group) => String(group.confidence) },
    { header: "Severity", key: "severity", render: (group) => <Badge tone={severityTone(group.severity)}>{group.severity}</Badge>, value: (group) => group.severity },
    { header: "Status", key: "status", render: (group) => <Badge tone={statusTone(group.status)}>{group.status}</Badge>, value: (group) => group.status },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader description="Detect and manage exact, fuzzy, and rule-based duplicate records across beneficiary IDs, household IDs, phone numbers, national IDs, GPS, and custom fields." route="/data-quality/duplicates" title="Duplicates" />
      <DataTable columns={columns} emptyLabel="No duplicate groups yet" rows={groups} searchLabel="Search duplicate groups, fields, records" title="Duplicate groups" />
      <IssueTable description="Duplicate issue workflow for compare, merge, mark valid, or flag for investigation." issues={issues} onOpenIssue={onOpenIssue} route="/data-quality/duplicates" title="Duplicate Investigations" />
    </div>
  );
}

function OutliersSection({ issues, onOpenIssue, outliers }: { issues: QualityIssue[]; onOpenIssue: (issue: QualityIssue) => void; outliers: OutlierRecord[] }) {
  const columns: TableColumn<OutlierRecord>[] = [
    { header: "Outlier", key: "outlier", render: (row) => <div><p className="font-medium">{row.field}</p><p className="text-xs text-muted-foreground">{row.outlierType}</p></div>, value: (row) => `${row.field} ${row.outlierType}` },
    { header: "Observed", key: "observed", render: (row) => row.observedValue, value: (row) => row.observedValue },
    { header: "Expected", key: "expected", render: (row) => row.expectedRange, value: (row) => row.expectedRange },
    { header: "Submission", key: "submission", render: (row) => row.submissionId, value: (row) => row.submissionId },
    { header: "Severity", key: "severity", render: (row) => <Badge tone={severityTone(row.severity)}>{row.severity}</Badge>, value: (row) => row.severity },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader description="Identify statistical, business-rule, location, and behavioral outliers such as impossible ages, extreme income, and unusually fast surveys." route="/data-quality/outliers" title="Outliers" />
      <DataTable columns={columns} emptyLabel="No outliers yet" rows={outliers} searchLabel="Search outliers, fields, submissions" title="Outlier records" />
      <IssueTable description="Review outliers, mark valid, flag for correction, or assign investigation." issues={issues} onOpenIssue={onOpenIssue} route="/data-quality/outliers" title="Outlier Investigations" />
    </div>
  );
}

function GPSIssuesSection({ gpsIssues, issues, onOpenIssue, onOpenMapping }: { gpsIssues: GPSIssueRecord[]; issues: QualityIssue[]; onOpenIssue: (issue: QualityIssue) => void; onOpenMapping: () => void }) {
  const columns: TableColumn<GPSIssueRecord>[] = [
    { header: "Issue", key: "issue", render: (row) => <div><p className="font-medium">{row.issueType}</p><p className="text-xs text-muted-foreground">{row.submissionId}</p></div>, value: (row) => `${row.issueType} ${row.submissionId}` },
    { header: "Coordinates", key: "coords", render: (row) => row.coordinates, value: (row) => row.coordinates },
    { header: "Accuracy", key: "accuracy", render: (row) => row.accuracyMeters === null ? "Missing" : `${row.accuracyMeters}m`, value: (row) => String(row.accuracyMeters ?? "missing") },
    { header: "Boundary", key: "boundary", render: (row) => row.boundary, value: (row) => row.boundary },
    { header: "Severity", key: "severity", render: (row) => <Badge tone={severityTone(row.severity)}>{row.severity}</Badge>, value: (row) => row.severity },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader action={<Button onClick={onOpenMapping} variant="secondary"><MapPinned aria-hidden="true" /> Open Mapping</Button>} description="Monitor missing GPS, outside-boundary points, duplicate coordinates, low accuracy, suspicious locations, and invalid coordinates. GIS visualization remains in Mapping." route="/data-quality/gps-issues" title="GPS Issues" />
      <DataTable columns={columns} emptyLabel="No GPS issues yet" rows={gpsIssues} searchLabel="Search GPS issues, submission, boundary" title="GPS issue records" />
      <IssueTable description="Assign investigation, open map, resolve issue, or return affected submission for correction." issues={issues} onOpenIssue={onOpenIssue} route="/data-quality/gps-issues" title="GPS Investigations" />
    </div>
  );
}

function ValidationFailuresSection({ failures, issues, onOpenIssue }: { failures: ValidationFailureRecord[]; issues: QualityIssue[]; onOpenIssue: (issue: QualityIssue) => void }) {
  const columns: TableColumn<ValidationFailureRecord>[] = [
    { header: "Rule", key: "rule", render: (row) => <div><p className="font-medium">{row.ruleName}</p><p className="text-xs text-muted-foreground">{row.category}</p></div>, value: (row) => `${row.ruleName} ${row.category}` },
    { header: "Field", key: "field", render: (row) => row.field, value: (row) => row.field },
    { header: "Submission", key: "submission", render: (row) => row.submissionId, value: (row) => row.submissionId },
    { header: "Severity", key: "severity", render: (row) => <Badge tone={severityTone(row.severity)}>{row.severity}</Badge>, value: (row) => row.severity },
    { header: "Status", key: "status", render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>, value: (row) => row.status },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader description="Track range, logic, cross-field, conditional logic, and reference data rule failures generated by forms and workflows." route="/data-quality/validation-failures" title="Validation Failures" />
      <DataTable columns={columns} emptyLabel="No validation failures yet" rows={failures} searchLabel="Search validation failures, rules, fields" title="Validation failure records" />
      <IssueTable description="Review failed rule, inspect submission, override with reason, or resolve the issue." issues={issues} onOpenIssue={onOpenIssue} route="/data-quality/validation-failures" title="Validation Investigations" />
    </div>
  );
}

function RiskAlertsSection({ alerts, issues, onOpenGovernance, onOpenIssue }: { alerts: RiskAlertRecord[]; issues: QualityIssue[]; onOpenGovernance: () => void; onOpenIssue: (issue: QualityIssue) => void }) {
  const columns: TableColumn<RiskAlertRecord>[] = [
    { header: "Alert", key: "alert", render: (alert) => <div><p className="font-medium">{alert.pattern}</p><p className="text-xs text-muted-foreground">{alert.category}</p></div>, value: (alert) => `${alert.pattern} ${alert.category}` },
    { header: "Owner", key: "owner", render: (alert) => alert.owner, value: (alert) => alert.owner },
    { header: "Risk", key: "risk", render: (alert) => <Badge tone={severityTone(alert.riskLevel)}>{alert.riskLevel}</Badge>, value: (alert) => alert.riskLevel },
    { header: "Status", key: "status", render: (alert) => <Badge tone={statusTone(alert.status)}>{alert.status}</Badge>, value: (alert) => alert.status },
    { header: "Action", key: "action", render: (alert) => alert.recommendedAction, value: (alert) => alert.recommendedAction },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader action={<Button onClick={onOpenGovernance} variant="secondary"><ShieldCheck aria-hidden="true" /> Governance review</Button>} description="Investigate data fraud, enumerator fraud, submission manipulation, location fraud, mass duplicates, and abnormal activity." route="/data-quality/risk-alerts" title="Risk Alerts" />
      <DataTable columns={columns} emptyLabel="No risk alerts yet" rows={alerts} searchLabel="Search risk alerts, owners, patterns" title="Risk alert center" />
      <IssueTable description="Escalate, assign reviewer, resolve, or send suspicious high-risk records to Governance Review." issues={issues} onOpenIssue={onOpenIssue} route="/data-quality/risk-alerts" title="High-Risk Investigations" />
    </div>
  );
}

function QualityRulesSection({ rules }: { rules: QualityRuleRecord[] }) {
  const columns: TableColumn<QualityRuleRecord>[] = [
    { header: "Rule", key: "name", render: (rule) => <div><p className="font-medium">{rule.name}</p><p className="text-xs text-muted-foreground">{rule.description}</p></div>, value: (rule) => `${rule.name} ${rule.description}` },
    { header: "Type", key: "type", render: (rule) => rule.type, value: (rule) => rule.type },
    { header: "Scope", key: "scope", render: (rule) => <div><p>{rule.scope}</p><p className="text-xs text-muted-foreground">{rule.project}</p></div>, value: (rule) => `${rule.scope} ${rule.project}` },
    { header: "Severity", key: "severity", render: (rule) => <Badge tone={severityTone(rule.severity)}>{rule.severity}</Badge>, value: (rule) => rule.severity },
    { header: "Status", key: "active", render: (rule) => <Badge tone={rule.active ? "success" : "neutral"}>{rule.active ? "Active" : "Archived"}</Badge>, value: (rule) => String(rule.active) },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader action={<Button type="button"><Plus aria-hidden="true" /> Create Rule</Button>} description="Manage platform-wide completeness, consistency, GPS, duplicate, outlier, timeliness, and custom rules with project, form, indicator, or organization scope." route="/data-quality/rules" title="Quality Rules" />
      <DataTable columns={columns} emptyLabel="No quality rules yet" rows={rules} searchLabel="Search rules, type, scope, project" title="Quality rules management" />
      <Panel title="Rule testing and background processing">
        <div className="grid gap-3 md:grid-cols-3">
          {["Test rule against sample submissions", "Run long checks asynchronously", "Write rule changes to Governance audit trail"].map((item) => (
            <div className="rounded-xl border bg-background p-4 text-sm" key={item}>{item}</div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function IssueTable({ description, issues, onOpenIssue, route, title }: { description: string; issues: QualityIssue[]; onOpenIssue: (issue: QualityIssue) => void; route: string; title: string }) {
  const columns: TableColumn<QualityIssue>[] = [
    {
      header: "Issue",
      key: "issue",
      render: (issue) => (
        <button className="text-left font-medium text-primary hover:underline" onClick={() => onOpenIssue(issue)} type="button">
          {issue.title}
          <span className="mt-1 block text-xs font-normal text-muted-foreground">{issue.description}</span>
        </button>
      ),
      value: (issue) => `${issue.title} ${issue.description} ${issue.type}`,
    },
    { header: "Severity", key: "severity", render: (issue) => <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>, value: (issue) => issue.severity },
    { header: "Status", key: "status", render: (issue) => <Badge tone={statusTone(issue.status)}>{issue.status}</Badge>, value: (issue) => issue.status },
    { header: "Project/Form", key: "project", render: (issue) => <div><p>{issue.project}</p><p className="text-xs text-muted-foreground">{issue.form}</p></div>, value: (issue) => `${issue.project} ${issue.form}` },
    { header: "Owner", key: "owner", render: (issue) => <div><p>{issue.assignedTo}</p><p className="text-xs text-muted-foreground">{issue.enumerator}</p></div>, value: (issue) => `${issue.assignedTo} ${issue.enumerator}` },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader description={description} route={route} title={title} />
      <DataTable columns={columns} emptyLabel={`No ${title.toLowerCase()} yet`} rows={issues} searchLabel={`Search ${title.toLowerCase()}, project, form, owner`} title={title} />
    </div>
  );
}

function IssueDetail({
  auditEvents,
  issue,
  onBack,
  onOpenGovernance,
  onOpenMapping,
  selectedTab,
  setSelectedTab,
}: {
  auditEvents: QualityAuditEvent[];
  issue: QualityIssue;
  onBack: () => void;
  onOpenGovernance: () => void;
  onOpenMapping: () => void;
  selectedTab: IssueDetailTab;
  setSelectedTab: (tab: IssueDetailTab) => void;
}) {
  return (
    <section className="space-y-3 rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>
            <Badge tone={statusTone(issue.status)}>{issue.status}</Badge>
            <Badge tone="neutral">{issue.type}</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold">{issue.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{issue.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onBack} type="button" variant="secondary">Back to Data Quality</Button>
          <Button onClick={issue.type === "GPS Issue" ? onOpenMapping : onOpenGovernance} type="button">
            {issue.type === "GPS Issue" ? <MapPinned aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
            {issue.type === "GPS Issue" ? "Open map" : "Escalate"}
          </Button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto border-b pb-2 product-scrollbar">
        {issueTabs.map((tab) => (
          <button
            className={cn("rounded-full px-2.5 py-1 text-xs transition", selectedTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}
            key={tab}
            onClick={() => setSelectedTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
      {selectedTab === "Overview" ? <IssueOverview issue={issue} /> : null}
      {selectedTab === "Related Submission" ? <KeyValuePanel rows={[["Submission ID", issue.submissionId], ["Project", issue.project], ["Form", issue.form], ["Enumerator", issue.enumerator], ["Supervisor", issue.supervisor], ["Location", issue.location]]} title="Related Submission" /> : null}
      {selectedTab === "Investigation" ? <InvestigationPanel issue={issue} /> : null}
      {selectedTab === "Resolution" ? <KeyValuePanel rows={[["Recommended action", issue.recommendedAction], ["Next status", nextInvestigationStatus(issue.status)], ["Score impact", `${issue.scoreImpact} points`], ["Assigned to", issue.assignedTo]]} title="Resolution" /> : null}
      {selectedTab === "History" ? <Timeline records={[{ badge: "Detected", label: issue.title, meta: `${new Date(issue.detectedAt).toLocaleString()} · ${issue.assignedTo}`, tone: statusTone("Detected") }, { badge: issue.status, label: "Current workflow status", meta: `Next step: ${nextInvestigationStatus(issue.status)}`, tone: statusTone(issue.status) }]} /> : null}
      {selectedTab === "Audit Trail" ? <Timeline records={auditEvents.map((event) => ({ badge: event.action, label: event.actor, meta: `${new Date(event.createdAt).toLocaleString()} · ${event.reason}`, tone: "governance" }))} /> : null}
    </section>
  );
}

function IssueOverview({ issue }: { issue: QualityIssue }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <KeyValuePanel rows={[["Project", issue.project], ["Form", issue.form], ["Submission", issue.submissionId], ["Assigned to", issue.assignedTo], ["Detected", new Date(issue.detectedAt).toLocaleString()], ["Score impact", `${issue.scoreImpact} points`]]} title="Issue Summary" />
      <Panel title="Evidence">
        <div className="space-y-2">
          {issue.evidence.map((item) => (
            <div className="rounded-xl border bg-background p-3 text-sm" key={item}>{item}</div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function InvestigationPanel({ issue }: { issue: QualityIssue }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Panel title="Investigation Workflow">
        <div className="grid gap-3 md:grid-cols-5">
          {["Detected", "Assigned", "Under Investigation", "Resolved", "Closed"].map((step) => (
            <div className={cn("rounded-xl border p-3 text-sm", issue.status === step ? "border-primary/50 bg-primary/10" : "bg-background")} key={step}>
              {step}
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Investigation Actions">
        <div className="space-y-2">
          {["Assign investigator", "Add notes", "Add evidence", "Escalate", "Resolve", "Close"].map((action) => (
            <button className="flex w-full items-center justify-between rounded-xl border bg-background p-3 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5" key={action} type="button">
              {action}
              <ArrowRight aria-hidden="true" size={15} />
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function IssueCards({ issues, onOpenIssue }: { issues: QualityIssue[]; onOpenIssue: (issue: QualityIssue) => void }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {issues.map((issue) => (
        <button className="rounded-2xl border bg-background p-4 text-left shadow-line transition hover:border-primary/40 hover:bg-primary/5" key={issue.id} onClick={() => onOpenIssue(issue)} type="button">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{issue.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{issue.project} · {issue.form}</p>
            </div>
            <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{issue.recommendedAction}</p>
        </button>
      ))}
    </div>
  );
}

function MetricCard({ icon: Icon, label, tone, value }: { icon: LucideIcon; label: string; tone: BadgeProps["tone"]; value: number | string }) {
  return (
    <article className="rounded-xl border bg-panel p-3 shadow-line">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon aria-hidden="true" size={18} />
        </span>
        <Badge tone={tone}>Quality</Badge>
      </div>
      <p className="mt-4 text-2xl font-semibold">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </article>
  );
}

function Panel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionHeader({ action, description, route, title }: { action?: ReactNode; description: string; route: string; title: string }) {
  return (
    <div className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="governance">ANALYTICS</Badge>
            <Badge tone="accent">{route}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{title}</h2>
            <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint>
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

function Timeline({ records }: { records: { badge: string; label: string; meta: string; onClick?: () => void; tone: BadgeProps["tone"] }[] }) {
  if (!records.length) return <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">No records yet.</div>;
  return (
    <div className="space-y-3">
      {records.map((record, index) => {
        const content = (
          <>
            <Badge tone={record.tone}>{record.badge}</Badge>
            <div>
              <p className="text-sm font-medium">{record.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{record.meta}</p>
            </div>
          </>
        );
        if (record.onClick) {
          return (
            <button className="flex w-full gap-3 rounded-xl border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5" key={`${record.label}-${index}`} onClick={record.onClick} type="button">
              {content}
            </button>
          );
        }
        return <div className="flex gap-3 rounded-xl border bg-background p-3" key={`${record.label}-${index}`}>{content}</div>;
      })}
    </div>
  );
}

function RankingPanel({ rows, title }: { rows: [string, number][]; title: string }) {
  return (
    <Panel title={title}>
      <div className="space-y-3">
        {rows.map(([label, score]) => (
          <div className="rounded-xl border bg-background p-3" key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{label}</p>
              <Badge tone={scoreTone(score)}>{score}</Badge>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TrendBars({ scores }: { scores: Record<string, number> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Object.entries(scores).map(([label, value]) => (
        <div className="rounded-xl border bg-background p-3" key={label}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{label.replace(/([A-Z])/g, " $1").trim()}</p>
            <Badge tone={scoreTone(value)}>{value}</Badge>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function KeyValuePanel({ rows, title }: { rows: [string, string][]; title: string }) {
  return (
    <Panel title={title}>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div className="rounded-xl border bg-background p-3" key={label}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-2 text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
