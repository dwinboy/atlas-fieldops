import { describe, expect, it } from "vitest";

import { indicatorReportsRoute } from "@/modules/indicators/IndicatorsModule";
import { previewIndicators, previewTargets } from "@/modules/indicators/data";
import {
  calculateIndicatorResult,
  computeIndicatorSummary,
  deriveLogframeRows,
  deriveResultsMatrix,
  progressPercent,
  summarizeTargets,
  targetAchievement,
  validateFormQuestionLink,
} from "@/modules/indicators/utils";

describe("Indicators module helpers", () => {
  it("routes indicator reporting actions to the reports workspace", () => {
    expect(indicatorReportsRoute()).toBe("/reports");
  });

  it("computes the M&E indicator overview metrics", () => {
    const summary = computeIndicatorSummary(previewIndicators);

    expect(summary.totalIndicators).toBe(4);
    expect(summary.topCategories.find((category) => category.label === "Output")?.count).toBe(1);
    expect(summary.topCategories.find((category) => category.label === "Outcome")?.count).toBe(2);
    expect(summary.topCategories.find((category) => category.label === "Impact")?.count).toBe(1);
    expect(summary.behindTarget).toBe(2);
    expect(summary.withoutBaseline).toBe(1);
    expect(summary.withoutDataSource).toBe(1);
  });

  it("calculates baseline-to-target progress safely", () => {
    expect(progressPercent(2.6, 1.8, 3.2)).toBe(57);
    expect(progressPercent(56, 38, 75)).toBe(49);
    expect(progressPercent(88, 64, 88)).toBe(100);
    expect(progressPercent(10, 10, 10)).toBe(100);
  });

  it("validates form-question links for calculation readiness", () => {
    expect(validateFormQuestionLink(previewIndicators[0])).toEqual([]);
    expect(validateFormQuestionLink(previewIndicators[3])).toContain("Missing linked form");
    expect(validateFormQuestionLink(previewIndicators[3])).toContain("Missing approved data source");
  });

  it("derives a results matrix by grouping live metrics under their result area", () => {
    const matrix = deriveResultsMatrix(previewIndicators);
    const areas = new Set(
      previewIndicators
        .filter((indicator) => indicator.status !== "Archived")
        .map((indicator) => indicator.resultArea?.trim() || "Unassigned result area"),
    );
    expect(matrix.length).toBe(areas.size);
    for (const node of matrix) {
      expect(node.level).toBe("Outcome");
      expect(node.indicators.length).toBeGreaterThan(0);
      expect(node.progress).toBeGreaterThanOrEqual(0);
      expect(node.progress).toBeLessThanOrEqual(100);
    }
    // Areas are ordered by how many metrics roll up into them (desc).
    for (let index = 1; index < matrix.length; index += 1) {
      expect(matrix[index - 1].indicators.length).toBeGreaterThanOrEqual(matrix[index].indicators.length);
    }
  });

  it("builds live logframe rows from configured metrics with real values", () => {
    const rows = deriveLogframeRows(previewIndicators);
    const active = previewIndicators.filter((indicator) => indicator.status !== "Archived");
    expect(rows).toHaveLength(active.length);
    const first = rows[0];
    const source = active[0];
    expect(first.id).toBe(source.id);
    expect(first.indicators).toEqual([source.code]);
    expect(first.target).toBe(String(source.target));
    expect(first.currentValue).toBe(String(source.current));
    expect(first.baseline).toBe(source.baseline === null ? "—" : String(source.baseline));
    expect(first.narrativeSummary).toBe(source.resultArea?.trim() || source.name);
  });

  it("supports calculation and target achievement engines", () => {
    expect(calculateIndicatorResult({ denominator: 120, numerator: 86, type: "Percentage" })).toBe(72);
    expect(calculateIndicatorResult({ denominator: 4, numerator: 10, type: "Average" })).toBe(2.5);
    expect(targetAchievement(2.6, 3.2)).toBe(81);

    const targetSummary = summarizeTargets(previewTargets);
    expect(targetSummary.onTrack).toBe(1);
    expect(targetSummary.behind).toBe(2);
    expect(targetSummary.averageAchievement).toBeGreaterThan(70);
  });
});
