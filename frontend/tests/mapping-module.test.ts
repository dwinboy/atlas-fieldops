import { describe, expect, it } from "vitest";

import {
  previewBoundaries,
  previewMapFeatures,
  previewMapLayers,
} from "@/modules/mapping/data";
import {
  computeMappingSummary,
  filterFeaturesBySection,
  maskCoordinate,
  validateGpsPoint,
} from "@/modules/mapping/utils";

describe("Mapping module helpers", () => {
  it("computes dashboard spatial activity from layers, boundaries, and map features", () => {
    const summary = computeMappingSummary({
      boundaries: previewBoundaries,
      features: previewMapFeatures,
      layers: previewMapLayers,
    });

    expect(summary.activeMapLayers).toBe(4);
    expect(summary.uploadedBoundaries).toBe(4);
    expect(summary.submissionPoints).toBe(18420);
    expect(summary.gpsIssues).toBeGreaterThan(0);
    expect(summary.coverageGaps).toBeGreaterThan(0);
  });

  it("filters map features by architecture-approved mapping section", () => {
    expect(filterFeaturesBySection(previewMapFeatures, "submission-maps").every((feature) => feature.category === "Submission")).toBe(true);
    expect(filterFeaturesBySection(previewMapFeatures, "data-quality-maps").every((feature) => feature.category === "Quality")).toBe(true);
    expect(filterFeaturesBySection(previewMapFeatures, "dashboard")).toHaveLength(previewMapFeatures.length);
  });

  it("masks sensitive coordinates for restricted or aggregated visibility", () => {
    expect(maskCoordinate(5.96312, "Internal")).toBe("5.96312");
    expect(maskCoordinate(5.96312, "Restricted")).toBe("6.0xx");
    expect(maskCoordinate(10.15912, "Aggregated")).toBe("10.2xx");
  });

  it("validates GPS points using boundary, accuracy, and manual-entry signals", () => {
    expect(validateGpsPoint({ accuracy: 8, insideBoundary: true })).toBe("Passed");
    expect(validateGpsPoint({ accuracy: 35, insideBoundary: true })).toBe("Warning");
    expect(validateGpsPoint({ accuracy: 8, insideBoundary: true, manual: true })).toBe("Warning");
    expect(validateGpsPoint({ accuracy: 8, insideBoundary: false })).toBe("Failed");
  });
});
