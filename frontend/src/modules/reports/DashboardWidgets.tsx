"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ApprovalStatusChart, FormResponseChart, type FormResponseDatum } from "@/components/dashboard/DashboardCharts";
import { Button } from "@/components/ui/button";
import type {
  DashboardWidget,
  DataQualitySignalRead,
  DonorReportMetrics,
  IndicatorRead,
  SubmissionRead,
} from "@/lib/api";
import type { DashboardApprovalOverview, DashboardCoverageOverview, FormPerformance } from "@/lib/dashboard";
import type { EmbeddedMapPoint } from "@/modules/mapping/EmbeddedMap";
import { progressTone } from "@/modules/indicators/utils";
import type { ReportRecord } from "@/modules/reports/data";

const EmbeddedMap = dynamic(() => import("@/modules/mapping/EmbeddedMap"), { ssr: false });

export type DashboardWidgetData = {
  indicators: IndicatorRead[];
  formPerformance: FormPerformance[];
  approvalOverview: DashboardApprovalOverview;
  coverage: DashboardCoverageOverview;
  qualitySignals: DataQualitySignalRead[];
  donorReports: ReportRecord[];
  submissions: SubmissionRead[];
  trendDays?: number;
};

export function cycleWidgetWidth(width: number): 1 | 2 | 3 {
  if (width >= 3) return 1;
  return (width + 1) as 1 | 2 | 3;
}

type TooltipEntry = {
  color?: string;
  name?: string;
  value?: number;
};

function ChartTooltip({ active, label, payload }: { active?: boolean; label?: string; payload?: TooltipEntry[] }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-panel px-3 py-2 text-xs shadow-elevated">
      {label ? <p className="font-semibold text-foreground">{label}</p> : null}
      {payload.map((entry) => (
        <p className="flex items-center gap-1.5 text-muted-foreground" key={entry.name}>
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-medium text-foreground">{(entry.value ?? 0).toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

export const submissionMetricLabels: Record<string, string> = {
  total: "Total submissions",
  approved: "Approved submissions",
  pending: "Pending review",
  rejected: "Rejected submissions",
  returned: "Returned for correction",
};

export const donorMetricLabels: Record<string, string> = {
  submissions_total: "Total submissions",
  submissions_approved: "Approved submissions",
  beneficiaries: "Beneficiaries reached",
  projects: "Projects covered",
};

export const formMetricLabels: Record<string, string> = {
  total: "Total submissions",
  approved: "Approved submissions",
  pending: "Pending review",
  quality: "Quality score",
};

export type KpiValue = {
  label: string;
  value: string;
  detail?: string;
};

export function getKpiValue(widget: DashboardWidget, data: DashboardWidgetData): KpiValue | null {
  switch (widget.data_source) {
    case "indicators": {
      const indicator = data.indicators.find((item) => item.id === widget.reference_id);
      if (!indicator) return null;
      return {
        label: indicator.name,
        value: `${indicator.current_value.toLocaleString()} ${indicator.unit}`.trim(),
        detail: `${indicator.progress_percent}% of target ${indicator.target_value.toLocaleString()} ${indicator.unit}`.trim(),
      };
    }
    case "submissions": {
      const overview = data.approvalOverview;
      const metric = widget.metric ?? "total";
      const value =
        metric === "approved"
          ? overview.approved
          : metric === "pending"
            ? overview.pending
            : metric === "rejected"
              ? overview.rejected
              : metric === "returned"
                ? overview.returned
                : overview.total;
      return { label: submissionMetricLabels[metric] ?? submissionMetricLabels.total, value: value.toLocaleString() };
    }
    case "data_quality": {
      const metric = widget.metric ?? "open";
      const value =
        metric === "critical"
          ? data.qualitySignals.filter((signal) => signal.severity.toLowerCase() === "critical").length
          : data.qualitySignals.filter((signal) => signal.status.toLowerCase() === "open").length;
      return { label: metric === "critical" ? "Critical quality issues" : "Open quality issues", value: value.toLocaleString() };
    }
    case "donor_report": {
      const report = data.donorReports.find((item) => item.id === widget.reference_id);
      if (!report?.metrics) return null;
      const metric = (widget.metric ?? "submissions_total") as keyof DonorReportMetrics;
      const value = report.metrics[metric];
      if (typeof value !== "number") return null;
      return { label: donorMetricLabels[metric] ?? metric, value: value.toLocaleString(), detail: report.title };
    }
    case "form_performance": {
      const performance = data.formPerformance.find((item) => item.form.id === widget.reference_id);
      if (!performance) return null;
      const metric = widget.metric ?? "total";
      const value =
        metric === "approved"
          ? performance.approved
          : metric === "pending"
            ? performance.pendingReview
            : metric === "quality"
              ? performance.qualityScore
              : performance.totalSubmissions;
      return {
        label: `${performance.form.name} · ${formMetricLabels[metric] ?? formMetricLabels.total}`,
        value: `${value.toLocaleString()}${metric === "quality" ? "%" : ""}`,
      };
    }
    default:
      return null;
  }
}

export type WidgetTableRow = { id: string; cells: string[] };

export function getIndicatorTableRows(indicators: IndicatorRead[]): WidgetTableRow[] {
  return indicators.map((indicator) => ({
    id: indicator.id,
    cells: [
      indicator.code,
      indicator.name,
      `${indicator.current_value.toLocaleString()} ${indicator.unit}`.trim(),
      `${indicator.target_value.toLocaleString()} ${indicator.unit}`.trim(),
      `${indicator.progress_percent}%`,
    ],
  }));
}

export function getFormPerformanceTableRows(formPerformance: FormPerformance[]): WidgetTableRow[] {
  return formPerformance.map((item) => ({
    id: item.form.id,
    cells: [item.form.name, item.totalSubmissions.toLocaleString(), item.pendingReview.toLocaleString(), `${item.qualityScore}%`],
  }));
}

export function getQualitySignalTableRows(signals: DataQualitySignalRead[]): WidgetTableRow[] {
  return signals.map((signal) => ({
    id: signal.id,
    cells: [signal.summary, signal.severity, signal.status],
  }));
}

export type TrendPoint = { date: string; count: number };

export function getSubmissionsTrend(submissions: SubmissionRead[], days = 14): TrendPoint[] {
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    buckets.set(date.toISOString().slice(0, 10), 0);
  }
  for (const submission of submissions) {
    const submittedAt = submission.submitted_at || submission.captured_at;
    if (!submittedAt) continue;
    const key = submittedAt.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

export type SeverityCount = { severity: string; count: number; color: string };

const severityColors: Record<string, string> = {
  critical: "hsl(var(--danger))",
  high: "hsl(var(--warning))",
  medium: "hsl(var(--accent))",
  low: "hsl(var(--success))",
};

export function getQualitySeverityCounts(signals: DataQualitySignalRead[]): SeverityCount[] {
  const counts = new Map<string, number>();
  for (const signal of signals) {
    const key = signal.severity.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([severity, count]) => ({
    severity: severity.charAt(0).toUpperCase() + severity.slice(1),
    count,
    color: severityColors[severity] ?? "hsl(var(--muted-foreground))",
  }));
}

export function getIndicatorProgressData(indicators: IndicatorRead[]): FormResponseDatum[] {
  return indicators.map((indicator) => ({ name: indicator.code || indicator.name, responses: indicator.progress_percent }));
}

export function getFormPerformanceBarData(formPerformance: FormPerformance[]): FormResponseDatum[] {
  return formPerformance.map((item) => ({ name: item.form.name, responses: item.totalSubmissions }));
}

export function getQualitySeverityBarData(signals: DataQualitySignalRead[]): FormResponseDatum[] {
  return getQualitySeverityCounts(signals).map((item) => ({ name: item.severity, responses: item.count }));
}

export function WidgetEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

function WidgetProgress({ label, value, detail }: { label: string; value: number; detail: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cnTone(progressTone(clamped))}>{clamped}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={clamped >= 80 ? "h-full rounded-full bg-success" : clamped >= 50 ? "h-full rounded-full bg-warning" : "h-full rounded-full bg-danger"}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function cnTone(tone: ReturnType<typeof progressTone>): string {
  if (tone === "success") return "font-semibold text-success";
  if (tone === "warning") return "font-semibold text-warning";
  if (tone === "danger") return "font-semibold text-danger";
  return "font-semibold text-muted-foreground";
}

function SeverityDonutChart({ signals }: { signals: DataQualitySignalRead[] }) {
  const data = getQualitySeverityCounts(signals).filter((entry) => entry.count > 0);
  if (!data.length) return <WidgetEmptyState message="No data quality signals yet." />;

  return (
    <div className="flex items-center gap-3">
      <div className="h-32 w-32 shrink-0">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              innerRadius="64%"
              nameKey="severity"
              outerRadius="100%"
              paddingAngle={data.length > 1 ? 3 : 0}
              stroke="hsl(var(--panel))"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell fill={entry.color} key={entry.severity} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((entry) => (
          <li className="flex items-center justify-between gap-2 text-xs" key={entry.severity}>
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="truncate">{entry.severity}</span>
            </span>
            <span className="shrink-0 font-semibold">{entry.count.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubmissionsTrendChart({ days = 14, submissions }: { days?: number; submissions: SubmissionRead[] }) {
  const data = getSubmissionsTrend(submissions, days);
  if (!data.some((point) => point.count > 0)) return <WidgetEmptyState message={`No submissions in the last ${days} days.`} />;

  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ bottom: 0, left: 0, right: 12, top: 8 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="date"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickFormatter={(value: string) => value.slice(5)}
            tickLine={false}
          />
          <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} width={28} />
          <Tooltip content={<ChartTooltip />} />
          <Line dataKey="count" dot={false} name="Submissions" stroke="hsl(var(--primary))" strokeWidth={2} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function WidgetTable({ headers, rows }: { headers: string[]; rows: WidgetTableRow[] }) {
  if (!rows.length) return <WidgetEmptyState message="No data available yet." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {headers.map((header) => (
              <th className="pb-1.5 pr-3 font-medium" key={header}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 6).map((row) => (
            <tr className="border-b last:border-0" key={row.id}>
              {row.cells.map((cell, index) => (
                <td className="py-1.5 pr-3" key={index}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardWidgetBody({ widget, data }: { widget: DashboardWidget; data: DashboardWidgetData }) {
  switch (widget.type) {
    case "kpi": {
      const kpi = getKpiValue(widget, data);
      if (!kpi) return <WidgetEmptyState message="Select a data source to show a value." />;
      return (
        <div>
          <p className="text-2xl font-semibold">{kpi.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{kpi.label}</p>
          {kpi.detail ? <p className="mt-1 text-xs text-muted-foreground">{kpi.detail}</p> : null}
        </div>
      );
    }
    case "bar_chart": {
      if (widget.data_source === "indicators") {
        const chartData = getIndicatorProgressData(data.indicators);
        if (!chartData.length) return <WidgetEmptyState message="No indicators available yet." />;
        return <FormResponseChart data={chartData} />;
      }
      if (widget.data_source === "form_performance") {
        const chartData = getFormPerformanceBarData(data.formPerformance);
        if (!chartData.length) return <WidgetEmptyState message="No active forms with submissions yet." />;
        return <FormResponseChart data={chartData} />;
      }
      if (widget.data_source === "data_quality") {
        const chartData = getQualitySeverityBarData(data.qualitySignals);
        if (!chartData.length) return <WidgetEmptyState message="No data quality signals yet." />;
        return <FormResponseChart data={chartData} />;
      }
      return <WidgetEmptyState message="Unsupported data source for this chart." />;
    }
    case "pie_chart": {
      if (widget.data_source === "submissions") {
        const { approved, pending, rejected, returned } = data.approvalOverview;
        return <ApprovalStatusChart approved={approved} pending={pending} rejected={rejected} returned={returned} />;
      }
      if (widget.data_source === "data_quality") {
        return <SeverityDonutChart signals={data.qualitySignals} />;
      }
      return <WidgetEmptyState message="Unsupported data source for this chart." />;
    }
    case "line_chart": {
      if (widget.data_source === "submissions") {
        return <SubmissionsTrendChart days={data.trendDays} submissions={data.submissions} />;
      }
      return <WidgetEmptyState message="Unsupported data source for this chart." />;
    }
    case "table": {
      if (widget.data_source === "indicators") {
        return <WidgetTable headers={["Code", "Indicator", "Current", "Target", "Progress"]} rows={getIndicatorTableRows(data.indicators)} />;
      }
      if (widget.data_source === "form_performance") {
        return <WidgetTable headers={["Form", "Submissions", "Pending", "Quality"]} rows={getFormPerformanceTableRows(data.formPerformance)} />;
      }
      if (widget.data_source === "data_quality") {
        return <WidgetTable headers={["Summary", "Severity", "Status"]} rows={getQualitySignalTableRows(data.qualitySignals)} />;
      }
      return <WidgetEmptyState message="Unsupported data source for this table." />;
    }
    case "progress": {
      if (widget.data_source === "indicators") {
        const indicator = data.indicators.find((item) => item.id === widget.reference_id);
        if (!indicator) return <WidgetEmptyState message="Select an indicator to track progress." />;
        return (
          <WidgetProgress
            detail={`${indicator.current_value.toLocaleString()} / ${indicator.target_value.toLocaleString()} ${indicator.unit}`.trim()}
            label={indicator.name}
            value={indicator.progress_percent}
          />
        );
      }
      if (widget.data_source === "form_performance") {
        const performance = data.formPerformance.find((item) => item.form.id === widget.reference_id);
        if (!performance) return <WidgetEmptyState message="Select a form to track completion." />;
        return (
          <WidgetProgress
            detail={`${performance.approved.toLocaleString()} of ${performance.totalSubmissions.toLocaleString()} approved`}
            label={performance.form.name}
            value={performance.completion}
          />
        );
      }
      return <WidgetEmptyState message="Unsupported data source for this widget." />;
    }
    case "map_link": {
      const points: EmbeddedMapPoint[] = data.submissions
        .filter((submission) => Number.isFinite(submission.latitude) && Number.isFinite(submission.longitude))
        .map((submission) => ({
          id: submission.id,
          lat: submission.latitude as number,
          lng: submission.longitude as number,
          label: submission.status,
          status: submission.status,
        }));
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold">{data.coverage.coveragePercent}%</p>
              <p className="text-xs text-muted-foreground">
                {data.coverage.locatedSubmissions.toLocaleString()} of {data.coverage.totalSubmissions.toLocaleString()} submissions mapped across{" "}
                {data.coverage.uniqueLocations.toLocaleString()} locations.
              </p>
            </div>
            <Link href="/mapping">
              <Button size="sm" type="button" variant="secondary">
                Open mapping
              </Button>
            </Link>
          </div>
          {points.length ? (
            <div className="h-48 overflow-hidden rounded-lg border">
              <EmbeddedMap points={points} />
            </div>
          ) : (
            <WidgetEmptyState message="No located submissions yet." />
          )}
        </div>
      );
    }
    default:
      return <WidgetEmptyState message="Unsupported widget type." />;
  }
}
