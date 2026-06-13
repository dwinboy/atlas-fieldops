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
  toGeoJson,
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

  it("exports map features as standard GeoJSON with [lng, lat] order and masks sensitive points", () => {
    const geojson = JSON.parse(toGeoJson(previewMapFeatures, "Internal"));
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features).toHaveLength(previewMapFeatures.length);
    const first = geojson.features[0];
    expect(first.type).toBe("Feature");
    expect(first.geometry.type).toBe("Point");
    // GeoJSON coordinate order is [longitude, latitude].
    expect(first.geometry.coordinates).toEqual([previewMapFeatures[0].longitude, previewMapFeatures[0].latitude]);
    expect(first.properties.category).toBe(previewMapFeatures[0].category);

    // Sensitive features are rounded (masked) when visibility is aggregated.
    const sensitive = previewMapFeatures.find((feature) => feature.sensitive);
    if (sensitive) {
      const aggregated = JSON.parse(toGeoJson([sensitive], "Aggregated"));
      const [lng, lat] = aggregated.features[0].geometry.coordinates;
      expect(lat).toBe(Math.round(sensitive.latitude * 100) / 100);
      expect(lng).toBe(Math.round(sensitive.longitude * 100) / 100);
    }
  });
});
