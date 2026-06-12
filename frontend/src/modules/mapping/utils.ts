import type { BadgeProps } from "@/components/ui/badge";
import { statusTone as canonicalStatusTone } from "@/lib/statusTones";
import type {
  LayerVisibility,
  MapFeatureRecord,
  MappingSection,
  MappingSummary,
  ProjectExtent,
  SpatialQualityIssue,
  SpatialSeverity,
  SpatialStatus,
  SpatialValidationState,
} from "@/modules/mapping/data";

export function statusTone(status: SpatialStatus | SpatialValidationState): BadgeProps["tone"] {
  return canonicalStatusTone(status);
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

export function maskedCoordinates(
  feature: { latitude: number; longitude: number; sensitive?: boolean },
  visibility: LayerVisibility,
): [number, number] {
  if (feature.sensitive && (visibility === "Aggregated" || visibility === "Restricted")) {
    return [Math.round(feature.latitude * 100) / 100, Math.round(feature.longitude * 100) / 100];
  }
  return [feature.latitude, feature.longitude];
}

export type BoundingBox = { north: number; south: number; east: number; west: number };

export function isFeatureInBounds(feature: { latitude: number; longitude: number }, bounds: BoundingBox): boolean {
  return (
    feature.latitude <= bounds.north &&
    feature.latitude >= bounds.south &&
    feature.longitude >= bounds.west &&
    feature.longitude <= bounds.east
  );
}

export function pointColor(status: string): string {
  if (status === "Healthy") return "bg-success";
  if (status === "Warning") return "bg-warning";
  return "bg-danger";
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

export function deriveQualityIssues(features: MapFeatureRecord[]): SpatialQualityIssue[] {
  return features
    .filter((feature) => feature.status !== "Healthy")
    .map((feature) => {
      const isBeneficiary = feature.category === "Beneficiary";
      return {
        enumerator: "—",
        id: `quality-${feature.id}`,
        issueType: isBeneficiary ? "High duplicate risk" : "Low GPS accuracy",
        location: feature.location,
        project: feature.project,
        recommendedAction: isBeneficiary
          ? "Review for duplicate beneficiary records before approval."
          : "Request a GPS recapture or review submission accuracy before approval.",
        severity: feature.status === "Critical" ? "Critical" : "Medium",
        submissionId: feature.category === "Submission" ? feature.label : feature.id,
        validationState: "Needs review" as SpatialValidationState,
      };
    });
}

export function computeProjectExtents(features: MapFeatureRecord[]): ProjectExtent[] {
  const groups = new Map<string, MapFeatureRecord[]>();
  for (const feature of features) {
    const key = feature.project || "Unassigned project";
    const list = groups.get(key) ?? [];
    list.push(feature);
    groups.set(key, list);
  }
  return Array.from(groups.entries())
    .map(([project, items]) => {
      const lats = items.map((item) => item.latitude);
      const lngs = items.map((item) => item.longitude);
      return {
        centroidLat: lats.reduce((sum, value) => sum + value, 0) / lats.length,
        centroidLng: lngs.reduce((sum, value) => sum + value, 0) / lngs.length,
        maxLat: Math.max(...lats),
        maxLng: Math.max(...lngs),
        minLat: Math.min(...lats),
        minLng: Math.min(...lngs),
        pointCount: items.length,
        project,
      };
    })
    .sort((a, b) => b.pointCount - a.pointCount);
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
