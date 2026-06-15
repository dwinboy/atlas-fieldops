import { describe, expect, it } from "vitest";

import {
  previewBoundaries,
  previewMapFeatures,
  previewMapLayers,
} from "@/modules/mapping/data";
import type { IndicatorRead } from "@/lib/api";
import {
  applyMapFeatureFilters,
  computeMappingSummary,
  deriveIndicatorGeography,
  extentStatus,
  extentToBounds,
  featureSource,
  filterFeaturesBySection,
  maskCoordinate,
  statusColor,
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

  it("applies operational GIS filters without mutating the source feature set", () => {
    const filtered = applyMapFeatureFilters(previewMapFeatures, {
      category: "Submission",
      location: "Mezam",
      project: "Agricultural Resilience Program",
      source: "Field Submitted",
      status: "Healthy",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.category).toBe("Submission");
    expect(featureSource(filtered[0])).toBe("Field Submitted");
    expect(previewMapFeatures).toHaveLength(6);
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

  it("pads a project's GPS extent into a drawable bounding box", () => {
    const extent = { project: "P", pointCount: 5, centroidLat: 5, centroidLng: 10, minLat: 4, maxLat: 6, minLng: 9, maxLng: 11 };
    const bounds = extentToBounds(extent);
    expect(bounds.north).toBeGreaterThan(extent.maxLat);
    expect(bounds.south).toBeLessThan(extent.minLat);
    expect(bounds.east).toBeGreaterThan(extent.maxLng);
    expect(bounds.west).toBeLessThan(extent.minLng);

    // A single-point extent (zero width/height) still gets a non-zero padded box.
    const point = { project: "Q", pointCount: 1, centroidLat: 5, centroidLng: 10, minLat: 5, maxLat: 5, minLng: 10, maxLng: 10 };
    const pointBounds = extentToBounds(point);
    expect(pointBounds.north).toBeGreaterThan(pointBounds.south);
    expect(pointBounds.east).toBeGreaterThan(pointBounds.west);
  });

  it("classifies extent status and maps statuses to map colors", () => {
    expect(extentStatus(12)).toBe("Healthy");
    expect(extentStatus(5)).toBe("Warning");
    expect(extentStatus(1)).toBe("Critical");

    expect(statusColor("Healthy")).toMatch(/^#/);
    expect(statusColor("Warning")).toMatch(/^#/);
    expect(statusColor("Critical")).toMatch(/^#/);
    expect(statusColor("Inactive")).toMatch(/^#/);
  });

  it("derives project-level indicator geography from live metrics", () => {
    const base = {
      survey_id: null,
      description: null,
      sdg_code: null,
      formula: null,
      category: null,
      disaggregation_fields: [],
      calculated_at: null,
    };
    const indicators: IndicatorRead[] = [
      { ...base, id: "i1", project_id: "p1", code: "A", name: "Reach", unit: "", reporting_frequency: "Monthly", baseline_value: 0, target_value: 100, current_value: 80, is_active: true, progress_percent: 80 },
      { ...base, id: "i2", project_id: null, code: "B", name: "Coverage", unit: "%", reporting_frequency: "Quarterly", baseline_value: 0, target_value: 0, current_value: 5, is_active: true, progress_percent: 0 },
      { ...base, id: "i3", project_id: "p1", code: "C", name: "Archived", unit: "", reporting_frequency: "Monthly", baseline_value: 0, target_value: 10, current_value: 5, is_active: false, progress_percent: 50 },
    ];
    const geography = deriveIndicatorGeography(indicators, { p1: "Resilience Program" });

    expect(geography).toHaveLength(2); // inactive metric excluded
    expect(geography[0].achievementPercent).toBeGreaterThanOrEqual(geography[1].achievementPercent); // sorted desc
    const reach = geography.find((item) => item.id === "i1");
    expect(reach?.project).toBe("Resilience Program");
    expect(reach?.achievementPercent).toBe(80);
    const coverage = geography.find((item) => item.id === "i2");
    expect(coverage?.project).toBe("Organization-wide"); // no project_id
    expect(coverage?.achievementPercent).toBe(0); // zero target → 0
  });
});
