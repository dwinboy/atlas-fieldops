import { describe, expect, it } from "vitest";

import { previewIndicators, previewTargets } from "@/modules/indicators/data";
import {
  calculateIndicatorResult,
  computeIndicatorSummary,
  progressPercent,
  summarizeTargets,
  targetAchievement,
  validateFormQuestionLink,
} from "@/modules/indicators/utils";

describe("Indicators module helpers", () => {
  it("computes the M&E indicator overview metrics", () => {
    const summary = computeIndicatorSummary(previewIndicators);

    expect(summary.totalIndicators).toBe(4);
    expect(summary.outputIndicators).toBe(1);
    expect(summary.outcomeIndicators).toBe(2);
    expect(summary.impactIndicators).toBe(1);
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
