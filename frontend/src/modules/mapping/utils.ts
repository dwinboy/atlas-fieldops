import type { BadgeProps } from "@/components/ui/badge";
import type {
  LayerVisibility,
  MapFeatureRecord,
  MappingSection,
  MappingSummary,
  SpatialSeverity,
  SpatialStatus,
  SpatialValidationState,
} from "@/modules/mapping/data";

export function statusTone(status: SpatialStatus | SpatialValidationState): BadgeProps["tone"] {
  if (status === "Healthy" || status === "Passed") return "success";
  if (status === "Warning") return "warning";
  if (status === "Critical" || status === "Failed") return "danger";
  return "neutral";
}

export function severityTone(severity: SpatialSeverity): BadgeProps["tone"] {
  if (severity === "Critical") return "danger";
  if (severity === "High") return "warning";
  if (severity === "Medium") return "accent";
  return "neutral";
}

export function visibilityTone(visibility: LayerVisibility): BadgeProps["tone"] {
  if (visibility === "Restricted") return "danger";
  if (visibility === "Aggregated") return "warning";
  if (visibility === "Internal") return "accent";
  return "success";
}

export function coverageTone(value: number): BadgeProps["tone"] {
  if (value >= 80) return "success";
  if (value >= 50) return "warning";
  return "danger";
}

export function computeMappingSummary({
  boundaries,
  features,
  layers,
}: {
  boundaries: { status: SpatialStatus }[];
  features: MapFeatureRecord[];
  layers: { status: SpatialStatus }[];
}): MappingSummary {
  return {
    activeMapLayers: layers.filter((layer) => layer.status !== "Inactive").length,
    beneficiaryPoints: features.filter((feature) => feature.category === "Beneficiary").reduce((sum, feature) => sum + feature.count, 0),
    coverageGaps: features.filter((feature) => feature.status === "Critical" || feature.qualityScore < 70).length,
    facilityPoints: features.filter((feature) => feature.category === "Facility").reduce((sum, feature) => sum + feature.count, 0),
    gpsIssues: features.filter((feature) => feature.gpsAccuracy > 30 || feature.status === "Critical").length,
    projectLocations: features.filter((feature) => feature.category === "Project").reduce((sum, feature) => sum + feature.count, 0),
    submissionPoints: features.filter((feature) => feature.category === "Submission").reduce((sum, feature) => sum + feature.count, 0),
    uploadedBoundaries: boundaries.length,
  };
}

export function filterFeaturesBySection(features: MapFeatureRecord[], section: MappingSection): MapFeatureRecord[] {
  const categoryBySection: Partial<Record<MappingSection, MapFeatureRecord["category"]>> = {
    "beneficiary-maps": "Beneficiary",
    "coverage-maps": "Coverage",
    "data-quality-maps": "Quality",
    "facility-maps": "Facility",
    "indicator-maps": "Indicator",
    "project-maps": "Project",
    "submission-maps": "Submission",
  };
  const category = categoryBySection[section];
  if (!category) return features;
  const matching = features.filter((feature) => feature.category === category);
  return matching.length ? matching : features.filter((feature) => feature.category === "Project" || feature.category === category);
}

export function maskCoordinate(value: number, visibility: LayerVisibility): string {
  if (visibility === "Restricted" || visibility === "Aggregated") {
    return `${value.toFixed(1)}xx`;
  }
  return value.toFixed(5);
}

export function validateGpsPoint({
  accuracy,
  insideBoundary,
  manual,
}: {
  accuracy: number;
  insideBoundary: boolean;
  manual?: boolean;
}): SpatialValidationState {
  if (!insideBoundary) return "Failed";
  if (accuracy > 30 || manual) return "Warning";
  return "Passed";
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
