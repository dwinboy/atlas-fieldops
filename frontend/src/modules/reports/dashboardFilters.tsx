"use client";

import { Filter } from "lucide-react";

import { Select } from "@/components/ui/input";
import type { DataFormRead, DataQualitySignalRead, IndicatorRead, ProjectListItemRead, SubmissionRead } from "@/lib/api";
import type { ReportRecord } from "@/modules/reports/data";

export type DashboardDateRange = "7d" | "30d" | "90d" | "all";

export type DashboardFilters = {
  projectId: string;
  range: DashboardDateRange;
};

export const defaultDashboardFilters: DashboardFilters = { projectId: "all", range: "30d" };

export const dashboardRangeOptions: { value: DashboardDateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export function dashboardRangeDays(range: DashboardDateRange): number | null {
  if (range === "all") return null;
  return Number(range.replace("d", ""));
}

function isWithinRange(value: string | null | undefined, days: number | null): boolean {
  if (days === null) return true;
  if (!value) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(value).getTime() >= cutoff;
}

export function filterSubmissionsByFilters(submissions: SubmissionRead[], filters: DashboardFilters): SubmissionRead[] {
  const days = dashboardRangeDays(filters.range);
  return submissions.filter(
    (submission) =>
      (filters.projectId === "all" || submission.project_id === filters.projectId) &&
      isWithinRange(submission.submitted_at ?? submission.captured_at, days),
  );
}

export function filterIndicatorsByFilters(indicators: IndicatorRead[], filters: DashboardFilters): IndicatorRead[] {
  if (filters.projectId === "all") return indicators;
  return indicators.filter((indicator) => indicator.project_id === filters.projectId);
}

export function filterFormsByFilters(forms: DataFormRead[], filters: DashboardFilters): DataFormRead[] {
  if (filters.projectId === "all") return forms;
  return forms.filter((form) => form.project_id === filters.projectId);
}

export function filterQualitySignalsByFilters(
  signals: DataQualitySignalRead[],
  filters: DashboardFilters,
  allowedSubmissionIds: Set<string> | null,
): DataQualitySignalRead[] {
  const days = dashboardRangeDays(filters.range);
  return signals.filter(
    (signal) =>
      isWithinRange(signal.created_at, days) &&
      (allowedSubmissionIds === null || !signal.submission_id || allowedSubmissionIds.has(signal.submission_id)),
  );
}

export function filterDonorReportsByFilters(
  reports: ReportRecord[],
  filters: DashboardFilters,
  projects: ProjectListItemRead[],
): ReportRecord[] {
  if (filters.projectId === "all") return reports;
  const project = projects.find((item) => item.id === filters.projectId);
  if (!project) return reports;
  return reports.filter((report) => report.project === project.name);
}

export function DashboardFilterBar({
  filters,
  onChange,
  projects,
}: {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  projects: ProjectListItemRead[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-2 text-sm">
      <Filter aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Select
        className="min-w-[10rem]"
        onChange={(event) => onChange({ ...filters, projectId: event.target.value })}
        value={filters.projectId}
      >
        <option value="all">All projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>
      <Select
        className="min-w-[9rem]"
        onChange={(event) => onChange({ ...filters, range: event.target.value as DashboardDateRange })}
        value={filters.range}
      >
        {dashboardRangeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
