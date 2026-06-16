import type { BadgeProps } from "@/components/ui/badge";
import type { IndicatorRead } from "@/lib/api";
import { statusTone as canonicalStatusTone } from "@/lib/statusTones";
import type {
  BoundaryRecord,
  DrawnBoundary,
  IndicatorGeography,
  LayerVisibility,
  MapFeatureRecord,
  MappingSection,
  MappingSummary,
  ProjectDataCoverage,
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

/**
 * Derive real geographic-data coverage per project from live map features and
 * the full project list. Reports actual GPS-tagged record counts (no fabricated
 * targets) and flags projects producing zero geographic evidence — a real M&E
 * gap that needs no boundary geometry or coverage targets to surface.
 */
export function deriveProjectDataCoverage(
  features: MapFeatureRecord[],
  projectNames: string[],
): ProjectDataCoverage[] {
  const counts = new Map<string, { submissions: number; beneficiaries: number }>();
  for (const name of projectNames) {
    counts.set(name, { submissions: 0, beneficiaries: 0 });
  }
  for (const feature of features) {
    if (feature.category !== "Submission" && feature.category !== "Beneficiary" && feature.category !== "Facility") continue;
    const entry = counts.get(feature.project) ?? { submissions: 0, beneficiaries: 0 };
    if (feature.category === "Submission") entry.submissions += 1;
    else entry.beneficiaries += 1;
    counts.set(feature.project, entry);
  }
  const maxRecords = Math.max(
    1,
    ...Array.from(counts.values()).map((entry) => entry.submissions + entry.beneficiaries),
  );
  return Array.from(counts.entries())
    .map(([project, entry]) => {
      const recordCount = entry.submissions + entry.beneficiaries;
      const share = recordCount / maxRecords;
      const status: SpatialStatus =
        recordCount === 0 ? "Critical" : share >= 0.5 ? "Healthy" : "Warning";
      return {
        project,
        recordCount,
        submissions: entry.submissions,
        beneficiaries: entry.beneficiaries,
        hasData: recordCount > 0,
        status,
      };
    })
    .sort((left, right) => right.recordCount - left.recordCount);
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
    "field-officer-maps": "Field Officer",
    "indicator-maps": "Indicator",
    "project-maps": "Project",
    "submission-maps": "Submission",
  };
  const category = categoryBySection[section];
  if (!category) return features;
  const matching = features.filter((feature) => feature.category === category);
  return matching.length ? matching : features.filter((feature) => feature.category === "Project" || feature.category === category);
}

export type MapFeatureFilters = {
  category: string;
  location: string;
  project: string;
  source: string;
  status: string;
};

export function featureSource(feature: MapFeatureRecord): string {
  if (feature.source) return feature.source;
  if (typeof feature.popup.Source === "string") return feature.popup.Source;
  if (typeof feature.popup["Submission source"] === "string") return feature.popup["Submission source"];
  if (feature.category === "Submission") return "Field Submitted";
  if (feature.category === "Beneficiary" || feature.category === "Facility") return "Entity Registry";
  if (feature.category === "Assignment") return "Field Operations";
  if (feature.category === "Field Officer") return "Mobile Sync";
  if (feature.category === "Quality") return "Data Quality";
  if (feature.category === "Indicator") return "Indicator Result";
  return "Project Registry";
}

export function applyMapFeatureFilters(features: MapFeatureRecord[], filters: MapFeatureFilters): MapFeatureRecord[] {
  return features.filter((feature) => {
    const location = [feature.location, feature.region, feature.district].join(" ").toLowerCase();
    return (
      (!filters.project || feature.project === filters.project) &&
      (!filters.category || feature.category === filters.category) &&
      (!filters.status || feature.status === filters.status) &&
      (!filters.source || featureSource(feature) === filters.source) &&
      (!filters.location || location.includes(filters.location.toLowerCase()))
    );
  });
}

export type MapAreaAssignmentSummary = {
  entityIds: string[];
  location: string;
  projects: string[];
  targetCount: number;
};

export function summarizeMapAreaForAssignment(features: MapFeatureRecord[]): MapAreaAssignmentSummary {
  const projects = Array.from(new Set(features.map((feature) => feature.project).filter(Boolean))).sort();
  const locations = Array.from(new Set(features.map((feature) => feature.district || feature.region || feature.location).filter(Boolean))).sort();
  return {
    entityIds: features
      .filter((feature) => feature.category === "Beneficiary" || feature.category === "Facility")
      .map((feature) => {
        const rawEntityId = feature.popup["Entity record ID"];
        return typeof rawEntityId === "string" ? rawEntityId : feature.id;
      }),
    location: locations.slice(0, 3).join(", ") || "Selected map area",
    projects,
    targetCount: features.reduce((sum, feature) => sum + Math.max(1, feature.count), 0),
  };
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

export type MapBoundaryShape = {
  id: string;
  label: string;
  bounds: BoundingBox;
  status: SpatialStatus;
  pointCount: number;
};

/** Pads a project's GPS extent into a drawable bounding box (avoids zero-area rectangles for single-point extents). */
export function extentToBounds(extent: ProjectExtent): BoundingBox {
  const padLat = Math.max((extent.maxLat - extent.minLat) * 0.1, 0.01);
  const padLng = Math.max((extent.maxLng - extent.minLng) * 0.1, 0.01);
  return {
    east: extent.maxLng + padLng,
    north: extent.maxLat + padLat,
    south: extent.minLat - padLat,
    west: extent.minLng - padLng,
  };
}

export function extentStatus(pointCount: number): SpatialStatus {
  return pointCount >= 10 ? "Healthy" : pointCount >= 3 ? "Warning" : "Critical";
}

export function statusColor(status: SpatialStatus): string {
  if (status === "Healthy") return "#16a34a";
  if (status === "Warning") return "#f59e0b";
  if (status === "Inactive") return "#94a3b8";
  return "#dc2626";
}

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
      const isAssignment = feature.category === "Assignment";
      const isOfficer = feature.category === "Field Officer";
      const issueType = isBeneficiary
        ? "High duplicate risk"
        : isAssignment
          ? "Assignment coverage issue"
          : isOfficer
            ? "Field officer sync/GPS issue"
            : "Low GPS accuracy";
      const recommendedAction = isBeneficiary
        ? "Review for duplicate beneficiary records before approval."
        : isAssignment
          ? "Review assignment progress, deadline, or target coverage with the supervisor."
          : isOfficer
            ? "Check last sync, device status, and whether the officer is inside the assigned area."
            : "Request a GPS recapture or review submission accuracy before approval.";
      return {
        enumerator: "—",
        id: `quality-${feature.id}`,
        issueType,
        location: feature.location,
        project: feature.project,
        recommendedAction,
        severity: feature.status === "Critical" ? "Critical" : "Medium",
        sourceFeatureId: feature.id,
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

/**
 * Serialize map features to a GeoJSON FeatureCollection so users can open the
 * current view in QGIS, ArcGIS, kepler.gl, or any standard GIS tool. Sensitive
 * coordinates are masked to the configured precision before export.
 */
export function toGeoJson(features: MapFeatureRecord[], visibility: LayerVisibility): string {
  return JSON.stringify(
    {
      type: "FeatureCollection",
      features: features.map((feature) => {
        const [latitude, longitude] = maskedCoordinates(feature, visibility);
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [longitude, latitude] },
          properties: {
            id: feature.id,
            label: feature.label,
            category: feature.category,
            project: feature.project,
            location: feature.location,
            status: feature.status,
            qualityScore: feature.qualityScore,
            gpsAccuracy: feature.gpsAccuracy,
          },
        };
      }),
    },
    null,
    2,
  );
}

/** Serialize a sketched boundary polygon to a GeoJSON FeatureCollection for export and external GIS tools. */
export function drawnBoundaryToGeoJson(boundary: DrawnBoundary): string {
  const ring = [...boundary.positions, boundary.positions[0]].map(([latitude, longitude]) => [longitude, latitude]);
  return JSON.stringify(
    {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [ring] },
          properties: { id: boundary.id, name: boundary.name, createdAt: boundary.createdAt },
        },
      ],
    },
    null,
    2,
  );
}

/** Represents a sketched boundary in the boundary registry table until it's exported and formally registered. */
export function boundaryFromDrawnShape(boundary: DrawnBoundary): BoundaryRecord {
  return {
    code: `DRW-${boundary.id.slice(-6).toUpperCase()}`,
    coveragePercent: 0,
    geometryStatus: "Needs review",
    id: boundary.id,
    name: boundary.name,
    parent: "Drawn on map",
    status: "Warning",
    type: "Project Area",
    updatedAt: boundary.createdAt,
    validationIssues: ["Sketched on the map this session. Export GeoJSON and register the official boundary for formal reporting."],
    version: "drawn",
  };
}

/**
 * Build the indicator-geography cards from live metrics, attributing each metric
 * to its project and showing real baseline/current/target and achievement. This
 * makes the Indicator Maps view real (project-level) instead of a placeholder;
 * finer sub-project geography depends on location-tagged metric data (roadmap).
 */
export function deriveIndicatorGeography(
  indicators: IndicatorRead[],
  projectNameById: Record<string, string>,
): IndicatorGeography[] {
  return indicators
    .filter((indicator) => indicator.is_active)
    .map((indicator) => {
      const project = (indicator.project_id && projectNameById[indicator.project_id]) || "Organization-wide";
      const achievementPercent =
        indicator.target_value > 0
          ? Math.max(0, Math.min(999, Math.round((indicator.current_value / indicator.target_value) * 100)))
          : 0;
      return {
        id: indicator.id,
        indicator: indicator.name,
        project,
        location: project,
        baseline: indicator.baseline_value,
        current: indicator.current_value,
        target: indicator.target_value,
        achievementPercent,
        period: indicator.reporting_frequency || "Current",
      };
    })
    .sort((left, right) => right.achievementPercent - left.achievementPercent);
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
