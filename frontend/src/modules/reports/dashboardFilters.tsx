"use client";

import { Filter, X } from "lucide-react";

import { Select } from "@/components/ui/input";
import type { DataFormRead, DataQualitySignalRead, IndicatorRead, ProjectListItemRead, SubmissionRead } from "@/lib/api";
import { isApprovedSubmission, isCorrectionSubmission, isPendingReviewSubmission, isRejectedSubmission } from "@/lib/dashboard";
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

function isWithinPreviousPeriod(value: string | null | undefined, days: number): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  const periodMs = days * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return time >= now - 2 * periodMs && time < now - periodMs;
}

export function filterSubmissionsByFilters(submissions: SubmissionRead[], filters: DashboardFilters): SubmissionRead[] {
  const days = dashboardRangeDays(filters.range);
  return submissions.filter(
    (submission) =>
      (filters.projectId === "all" || submission.project_id === filters.projectId) &&
      isWithinRange(submission.submitted_at ?? submission.captured_at, days),
  );
}

/**
 * Submissions from the period immediately preceding the selected date range, used to compute
 * trend deltas for KPI widgets. Returns an empty array for the "all time" range, which has no
 * comparable previous period.
 */
export function filterSubmissionsByPreviousPeriod(submissions: SubmissionRead[], filters: DashboardFilters): SubmissionRead[] {
  const days = dashboardRangeDays(filters.range);
  if (days === null) return [];
  return submissions.filter(
    (submission) =>
      (filters.projectId === "all" || submission.project_id === filters.projectId) &&
      isWithinPreviousPeriod(submission.submitted_at ?? submission.captured_at, days),
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

/** Quality signals from the period immediately preceding the selected date range, for KPI trend deltas. */
export function filterQualitySignalsByPreviousPeriod(
  signals: DataQualitySignalRead[],
  filters: DashboardFilters,
  allowedSubmissionIds: Set<string> | null,
): DataQualitySignalRead[] {
  const days = dashboardRangeDays(filters.range);
  if (days === null) return [];
  return signals.filter(
    (signal) =>
      isWithinPreviousPeriod(signal.created_at, days) &&
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

export type SubmissionStatusCategory = "approved" | "pending" | "rejected" | "returned";

/** A drill-down filter applied on top of the dashboard filters when the user clicks a chart segment. */
export type DashboardCrossFilter =
  | { field: "status"; value: SubmissionStatusCategory; label: string }
  | { field: "severity"; value: string; label: string }
  | { field: "form"; value: string; label: string };

const submissionStatusPredicates: Record<SubmissionStatusCategory, (submission: SubmissionRead) => boolean> = {
  approved: isApprovedSubmission,
  pending: isPendingReviewSubmission,
  rejected: isRejectedSubmission,
  returned: isCorrectionSubmission,
};

export function applyCrossFilterToSubmissions(submissions: SubmissionRead[], crossFilter: DashboardCrossFilter | null): SubmissionRead[] {
  if (!crossFilter) return submissions;
  if (crossFilter.field === "status") return submissions.filter(submissionStatusPredicates[crossFilter.value]);
  if (crossFilter.field === "form") return submissions.filter((submission) => submission.form_id === crossFilter.value);
  return submissions;
}

export function applyCrossFilterToQualitySignals(signals: DataQualitySignalRead[], crossFilter: DashboardCrossFilter | null): DataQualitySignalRead[] {
  if (!crossFilter || crossFilter.field !== "severity") return signals;
  return signals.filter((signal) => signal.severity.toLowerCase() === crossFilter.value);
}

/** Toggles a cross filter off if the same chart segment is clicked again, otherwise replaces it. */
export function toggleCrossFilter(current: DashboardCrossFilter | null, next: DashboardCrossFilter): DashboardCrossFilter | null {
  if (current && current.field === next.field && current.value === next.value) return null;
  return next;
}

export function CrossFilterChip({ crossFilter, onClear }: { crossFilter: DashboardCrossFilter | null; onClear: () => void }) {
  if (!crossFilter) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
      <span>Drilled into: {crossFilter.label}</span>
      <button aria-label="Clear drill-down filter" className="rounded-full p-0.5 hover:bg-primary/20" onClick={onClear} type="button">
        <X aria-hidden="true" className="h-3 w-3" />
      </button>
    </div>
  );
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
