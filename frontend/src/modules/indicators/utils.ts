import type { BadgeProps } from "@/components/ui/badge";
import type {
  IndicatorRecord,
  IndicatorSection,
  IndicatorStatus,
  IndicatorSummary,
  IndicatorTarget,
  ResultsFrameworkNode,
} from "@/modules/indicators/data";

export function progressPercent(current: number, baseline: number | null, target: number): number {
  if (target === baseline) return target > 0 && current >= target ? 100 : 0;
  const start = baseline ?? 0;
  const denominator = target - start;
  if (denominator <= 0) return current >= target ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round(((current - start) / denominator) * 100)));
}

export function targetAchievement(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(999, Math.round((actual / target) * 100)));
}

export function indicatorTone(status: IndicatorStatus): BadgeProps["tone"] {
  if (status === "On Track") return "success";
  if (status === "Behind Target") return "warning";
  if (status === "Archived") return "neutral";
  return "danger";
}

export function progressTone(value: number): BadgeProps["tone"] {
  if (value >= 80) return "success";
  if (value >= 50) return "warning";
  return "danger";
}

export function computeIndicatorSummary(indicators: IndicatorRecord[]): IndicatorSummary {
  const counts = new Map<string, number>();
  for (const indicator of indicators) {
    const label = indicator.type || "Indicator";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const topCategories = Array.from(counts.entries())
    .map(([label, count]) => ({ count, label }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  return {
    behindTarget: indicators.filter((indicator) => indicator.status === "Behind Target").length,
    onTrack: indicators.filter((indicator) => indicator.status === "On Track").length,
    reportingPeriodsDue: indicators.filter((indicator) => indicator.frequency === "Monthly" || indicator.frequency === "Quarterly").length,
    topCategories,
    totalIndicators: indicators.length,
    withoutBaseline: indicators.filter((indicator) => indicator.baseline === null).length,
    withoutDataSource: indicators.filter((indicator) => !indicator.dataSource).length,
  };
}

export function prettifyFieldName(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function filterIndicatorsBySection(indicators: IndicatorRecord[], section: IndicatorSection): IndicatorRecord[] {
  if (section === "dashboard" || section === "library" || section === "reports") return indicators;
  if (section === "targets") return indicators.filter((indicator) => indicator.target > 0);
  if (section === "baselines") return indicators.filter((indicator) => indicator.baseline !== null);
  return indicators;
}

export function validateFormQuestionLink(indicator: IndicatorRecord): string[] {
  const issues: string[] = [];
  if (!indicator.linkedForm) issues.push("Missing linked form");
  if (!indicator.linkedQuestion) issues.push("Missing numerator question");
  if (indicator.calculationType === "Percentage" && !indicator.denominator) issues.push("Percentage indicators require a denominator");
  if (!indicator.dataSource) issues.push("Missing approved data source");
  return issues;
}

export function calculateIndicatorResult({
  denominator,
  numerator,
  type,
}: {
  denominator?: number;
  numerator: number;
  type: IndicatorRecord["calculationType"];
}): number {
  if (type === "Count" || type === "Sum") return numerator;
  if (type === "Average") return denominator && denominator > 0 ? Number((numerator / denominator).toFixed(2)) : 0;
  if (type === "Percentage") return denominator && denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
  if (type === "Ratio") return denominator && denominator > 0 ? Number((numerator / denominator).toFixed(2)) : 0;
  return numerator;
}

/**
 * Build a real results matrix by grouping live metrics under their result area.
 * This drives the Results Framework matrix/card view from actual indicator data
 * instead of a static sample, so the matrix reflects what teams configured —
 * adapting to whatever result areas a sector pack or project defines.
 */
export function deriveResultsMatrix(indicators: IndicatorRecord[]): ResultsFrameworkNode[] {
  const groups = new Map<string, IndicatorRecord[]>();
  for (const indicator of indicators) {
    if (indicator.status === "Archived") continue;
    const area = indicator.resultArea?.trim() || "Unassigned result area";
    const list = groups.get(area) ?? [];
    list.push(indicator);
    groups.set(area, list);
  }
  return Array.from(groups.entries())
    .map(([area, items]) => {
      const projects = Array.from(new Set(items.map((item) => item.project)));
      const progresses = items.map((item) => progressPercent(item.current, item.baseline, item.target));
      const progress = progresses.length
        ? Math.round(progresses.reduce((sum, value) => sum + value, 0) / progresses.length)
        : 0;
      const status: IndicatorStatus =
        progress >= 80 ? "On Track" : items.some((item) => item.target > 0) ? "Behind Target" : "Needs Baseline";
      return {
        id: `result-area-${area.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        level: "Outcome" as const,
        title: area,
        project: projects.length === 1 ? projects[0] : `${projects.length} projects`,
        parentId: null,
        indicators: items.map((item) => item.code),
        progress,
        status,
      };
    })
    .sort((left, right) => right.indicators.length - left.indicators.length);
}

export function summarizeTargets(targets: IndicatorTarget[]): { averageAchievement: number; behind: number; onTrack: number } {
  const achievements = targets.map((target) => targetAchievement(target.actualValue, target.targetValue));
  const averageAchievement = achievements.length
    ? Math.round(achievements.reduce((sum, value) => sum + value, 0) / achievements.length)
    : 0;
  return {
    averageAchievement,
    behind: targets.filter((target) => target.status === "Behind Target").length,
    onTrack: targets.filter((target) => target.status === "On Track").length,
  };
}

export function toCsv(rows: Record<string, string | number | boolean | null | undefined>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
