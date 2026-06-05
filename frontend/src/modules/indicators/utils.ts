import type { BadgeProps } from "@/components/ui/badge";
import type {
  IndicatorRecord,
  IndicatorSection,
  IndicatorStatus,
  IndicatorSummary,
  IndicatorTarget,
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
  return {
    behindTarget: indicators.filter((indicator) => indicator.status === "Behind Target").length,
    impactIndicators: indicators.filter((indicator) => indicator.type === "Impact").length,
    onTrack: indicators.filter((indicator) => indicator.status === "On Track").length,
    outcomeIndicators: indicators.filter((indicator) => indicator.type === "Outcome").length,
    outputIndicators: indicators.filter((indicator) => indicator.type === "Output").length,
    reportingPeriodsDue: indicators.filter((indicator) => indicator.frequency === "Monthly" || indicator.frequency === "Quarterly").length,
    totalIndicators: indicators.length,
    withoutBaseline: indicators.filter((indicator) => indicator.baseline === null).length,
    withoutDataSource: indicators.filter((indicator) => !indicator.dataSource).length,
  };
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
