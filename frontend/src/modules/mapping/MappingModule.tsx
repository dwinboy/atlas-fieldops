"use client";

import {
  Archive,
  CheckCircle2,
  CircleDot,
  Download,
  Eye,
  FileJson,
  FileWarning,
  Filter,
  Layers,
  LocateFixed,
  Map,
  MapPin,
  MapPinned,
  Maximize2,
  Navigation,
  PenLine,
  Printer,
  Search,
  Shield,
  Square,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Map as LeafletMapInstance } from "leaflet";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  createFieldOfficerAssignment,
  createFieldWorkAssignment,
  listBeneficiaries,
  listFieldOfficers,
  listFieldWorkAssignments,
  listForms,
  listIndicators,
  listProjects,
  listSubmissions,
  type CurrentPrincipal,
  type DataFormRead,
  type FieldOfficerRead,
  type FieldWorkAssignmentRead,
  type IndicatorRead,
  type ProjectListItemRead,
} from "@/lib/api";
import { previewOfficers } from "@/modules/field-operations/data";
import { previewForms } from "@/modules/forms/data";
import { useSectorTerminology, type SectorTerminology } from "@/lib/sectorTerminology";
import { cn } from "@/lib/utils";
import {
  mappingSections,
  previewBoundaries,
  previewCoverage,
  previewIndicatorGeography,
  previewMapFeatures,
  previewMapLayers,
  previewSpatialIssues,
  type BoundaryRecord,
  type CoverageRecord,
  type DrawnBoundary,
  type IndicatorGeography,
  type LayerVisibility,
  type MapBasemap,
  type MapFeatureRecord,
  type MapLayerRecord,
  type MappingSection,
  type MappingSummary,
  type ProjectDataCoverage,
  type ProjectExtent,
  type SpatialQualityIssue,
} from "@/modules/mapping/data";
import {
  boundaryFromDrawnShape,
  computeMappingSummary,
  computeProjectExtents,
  coverageTone,
  applyMapFeatureFilters,
  deriveProjectDataCoverage,
  deriveQualityIssues,
  drawnBoundaryToGeoJson,
  extentStatus,
  extentToBounds,
  featureSource,
  filterFeaturesBySection,
  isFeatureInBounds,
  maskCoordinate,
  severityTone,
  statusTone,
  summarizeMapAreaForAssignment,
  toGeoJson,
  toCsv,
  validateGpsPoint,
  visibilityTone,
  type BoundingBox,
  type MapFeatureFilters,
  type MapBoundaryShape,
} from "@/modules/mapping/utils";
import type { BoundaryDrawMode } from "@/modules/mapping/LeafletMap";
import { useWorkspaceStore } from "@/stores/workspace";

type MappingModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

export function mappingWorkspaceRouteForTarget(
  target: "beneficiaries" | "data-quality" | "field-operations" | "indicators" | "mapping" | "submissions",
): string {
  switch (target) {
    case "beneficiaries":
      return "/beneficiaries";
    case "data-quality":
      return "/data-quality";
    case "field-operations":
      return "/field-operations";
    case "indicators":
      return "/indicators";
    case "submissions":
      return "/submissions";
    case "mapping":
      return "/mapping";
  }
}

export function mappingFeatureSourceRoute(feature: MapFeatureRecord): string {
  if (feature.category === "Submission") return mappingWorkspaceRouteForTarget("submissions");
  if (feature.category === "Beneficiary" || feature.category === "Facility") return mappingWorkspaceRouteForTarget("beneficiaries");
  if (feature.category === "Quality") return mappingWorkspaceRouteForTarget("data-quality");
  if (feature.category === "Indicator") return mappingWorkspaceRouteForTarget("indicators");
  if (feature.category === "Assignment" || feature.category === "Field Officer") return mappingWorkspaceRouteForTarget("field-operations");
  return mappingWorkspaceRouteForTarget("mapping");
}

type MapViewerProps = {
  activeSection: MappingSection;
  allFeatures: MapFeatureRecord[];
  areaBounds: BoundingBox | null;
  areaAssignmentSummary: ReturnType<typeof summarizeMapAreaForAssignment>;
  basemap: MapBasemap;
  boundaryDrawMode: BoundaryDrawMode;
  boundaryDrawPoints: [number, number][];
  boundaryShapes: MapBoundaryShape[];
  drawMode: boolean;
  drawnBoundaries: DrawnBoundary[];
  features: MapFeatureRecord[];
  featureOpacityByCategory: Partial<Record<MapFeatureRecord["category"], number>>;
  filters: MapFeatureFilters;
  layers: MapLayerRecord[];
  layerOpacity: Record<string, number>;
  layerVisibility: Record<string, boolean>;
  mapQuery: string;
  densityMode: boolean;
  onAreaBoundsChange: (bounds: BoundingBox | null) => void;
  onBasemapChange: (basemap: MapBasemap) => void;
  onBoundaryDrawComplete: (positions: [number, number][]) => void;
  onBoundaryDrawPoint: (point: [number, number]) => void;
  onCancelBoundaryDraw: () => void;
  onCreateAreaAssignment: () => void;
  onDrawModeChange: (active: boolean) => void;
  onFeatureSelect: (feature: MapFeatureRecord) => void;
  onFinishBoundaryDraw: () => void;
  onFiltersChange: (filters: MapFeatureFilters) => void;
  onDensityModeChange: (enabled: boolean) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerVisibilityChange: (layerId: string, visible: boolean) => void;
  onPauseBoundaryDraw: () => void;
  onOpenFeatureSource: (feature: MapFeatureRecord) => void;
  onMapQueryChange: (query: string) => void;
  onStartBoundaryDraw: (mode: "polygon" | "rectangle") => void;
  privacyVisibility: LayerVisibility;
  sectionInfo: { label: string; description: string };
  selectedFeature: MapFeatureRecord | null;
};

type MapAssignmentDraft = {
  description: string;
  endDate: string;
  formId: string;
  name: string;
  officerIds: string[];
  priority: "Low" | "Normal" | "High" | "Urgent";
  projectName: string;
  startDate: string;
};

type MapWorkspaceMode = "explore" | "analyze" | "draw" | "assign" | "export";

type SavedMapView = {
  basemap: MapBasemap;
  createdAt: string;
  densityMode: boolean;
  filters: MapFeatureFilters;
  id: string;
  mode: MapWorkspaceMode;
  name: string;
};

type MapExportReadiness = {
  blockers: string[];
  label: string;
  recommendations: string[];
  score: number;
  tone: BadgeProps["tone"];
};

const basemaps: MapBasemap[] = ["Light", "Streets", "Terrain", "Satellite"];

const mapWorkspaceModes: {
  description: string;
  id: MapWorkspaceMode;
  label: string;
}[] = [
  { description: "Browse points, boundaries, and popups.", id: "explore", label: "Explore" },
  { description: "Use density, quality, and performance layers.", id: "analyze", label: "Analyze" },
  { description: "Sketch project or operational boundaries.", id: "draw", label: "Draw Boundary" },
  { description: "Select an area and create field work.", id: "assign", label: "Assign Work" },
  { description: "Prepare CSV, GeoJSON, print, or report outputs.", id: "export", label: "Export" },
];

const REAL_DATA_SECTIONS: MappingSection[] = ["dashboard", "project-maps", "submission-maps", "beneficiary-maps", "facility-maps", "field-officer-maps", "coverage-maps", "indicator-maps", "data-quality-maps", "layers", "boundaries"];

function sectionFromPath(pathname: string | null): MappingSection {
  const match = mappingSections.find((section) => section.route === pathname);
  return match?.id ?? "dashboard";
}

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
  ssr: false,
});

function isRestrictedMapViewer(principal: CurrentPrincipal | null | undefined): boolean {
  if (!principal) return false;
  const roleText = principal.roles.join(" ").toLowerCase();
  return roleText.includes("viewer") || roleText.includes("donor") || roleText.includes("field officer");
}

function downloadCsv(filename: string, rows: Record<string, string | number | boolean | null | undefined>[]): void {
  const csv = toCsv(rows);
  if (!csv) return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadGeoJson(filename: string, geojson: string): void {
  const blob = new Blob([geojson], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function deriveLiveMapLayers(features: MapFeatureRecord[]): MapLayerRecord[] {
  const categories = Array.from(new Set(features.map((feature) => feature.category)));
  return categories.map((category) => {
    const rows = features.filter((feature) => feature.category === category);
    const hasCritical = rows.some((feature) => feature.status === "Critical");
    const hasWarning = rows.some((feature) => feature.status === "Warning");
    const restrictedCategory = category === "Beneficiary" || category === "Field Officer";
    return {
      createdAt: new Date().toISOString(),
      description: `Auto-derived ${category.toLowerCase()} point layer from live GPS-tagged records.`,
      featureCount: rows.length,
      geometryType: "Point",
      id: `live-layer-${category.toLowerCase()}`,
      name: `${category} points`,
      owner: "Atlas FieldOps",
      source: category === "Assignment" ? "Field assignments" : category === "Field Officer" ? "Mobile sync" : "Live submissions and entity records",
      status: hasCritical ? "Critical" : hasWarning ? "Warning" : "Healthy",
      type: `${category} evidence`,
      version: "live",
      visibility: restrictedCategory ? "Restricted" : "Internal",
    };
  });
}

function extensionFromFileName(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension ? extension.toUpperCase() : "FILE";
}

function geometryFromFileName(fileName: string): MapLayerRecord["geometryType"] {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith(".csv")) return "Point";
  if (normalized.endsWith(".kml")) return "LineString";
  if (normalized.includes("boundary") || normalized.includes("polygon")) return "Polygon";
  return "MultiPolygon";
}

function uploadedLayerFromFile(file: File): MapLayerRecord {
  return {
    createdAt: new Date().toISOString(),
    description: `${file.name} has been selected in this workspace and is ready for GIS processing when the backend file service is connected.`,
    featureCount: 0,
    geometryType: geometryFromFileName(file.name),
    id: `uploaded-layer-${file.name}-${file.lastModified}`,
    name: file.name.replace(/\.[^.]+$/u, ""),
    owner: "Current user",
    source: `${extensionFromFileName(file.name)} upload`,
    status: "Warning",
    type: "Uploaded spatial layer",
    version: "pending",
    visibility: "Internal",
  };
}

function uploadedBoundaryFromFile(file: File): BoundaryRecord {
  const name = file.name.replace(/\.[^.]+$/u, "");
  return {
    code: `UPL-${String(file.lastModified).slice(-6)}`,
    coveragePercent: 0,
    geometryStatus: "Needs review",
    id: `uploaded-boundary-${file.name}-${file.lastModified}`,
    name,
    parent: "Uploaded boundary file",
    status: "Warning",
    type: "Project Area",
    updatedAt: new Date().toISOString(),
    validationIssues: [`${extensionFromFileName(file.name)} file selected. Process geometry, validate overlap, and approve before formal reporting.`],
    version: "pending",
  };
}

function deriveLiveBoundaries(extents: ProjectExtent[]): BoundaryRecord[] {
  return extents.map((extent, index) => ({
    code: `EXT-${index + 1}`,
    coveragePercent: Math.min(100, Math.max(1, extent.pointCount * 10)),
    geometryStatus: "Needs review",
    id: `live-boundary-${index}`,
    name: `${extent.project} observed extent`,
    parent: "Project GPS evidence",
    status: extentStatus(extent.pointCount),
    type: "Project Area",
    updatedAt: new Date().toISOString(),
    validationIssues: ["Derived from point extent; upload official boundary geometry for formal reporting."],
    version: "derived",
  }));
}

function emptyMapFeatureFilters(): MapFeatureFilters {
  return { category: "", location: "", project: "", source: "", status: "" };
}

function defaultSavedMapViews(): SavedMapView[] {
  return [
    {
      basemap: "Light",
      createdAt: "preset",
      densityMode: false,
      filters: { ...emptyMapFeatureFilters(), category: "Assignment" },
      id: "preset-field-assignments",
      mode: "assign",
      name: "Field assignments",
    },
    {
      basemap: "Light",
      createdAt: "preset",
      densityMode: true,
      filters: { ...emptyMapFeatureFilters(), category: "Quality" },
      id: "preset-quality-risks",
      mode: "analyze",
      name: "Quality risks",
    },
    {
      basemap: "Terrain",
      createdAt: "preset",
      densityMode: true,
      filters: { ...emptyMapFeatureFilters(), category: "Indicator" },
      id: "preset-performance-hotspots",
      mode: "analyze",
      name: "Performance hotspots",
    },
  ];
}

function layerFeatureCategory(layer: MapLayerRecord): MapFeatureRecord["category"] | null {
  const direct = layerCategory(layer);
  if (direct) return direct;
  const text = `${layer.name} ${layer.type}`.toLowerCase();
  if (text.includes("submission")) return "Submission";
  if (text.includes("beneficiar") || text.includes("household") || text.includes("farmer")) return "Beneficiary";
  if (text.includes("facilit") || text.includes("clinic") || text.includes("school") || text.includes("warehouse") || text.includes("water")) return "Facility";
  if (text.includes("indicator")) return "Indicator";
  if (text.includes("quality") || text.includes("gps issue")) return "Quality";
  if (text.includes("assignment")) return "Assignment";
  if (text.includes("field officer") || text.includes("officer")) return "Field Officer";
  if (text.includes("coverage")) return "Coverage";
  if (text.includes("project") || text.includes("boundary")) return "Project";
  return null;
}

function layerGroupLabel(layer: MapLayerRecord): string {
  const category = layerFeatureCategory(layer);
  if (category === "Assignment" || category === "Field Officer") return "Operational";
  if (category === "Submission" || category === "Beneficiary" || category === "Facility") return "Evidence";
  if (category === "Indicator" || category === "Coverage") return "Performance";
  if (category === "Quality") return "Data Quality";
  return "Boundaries & Reference";
}

function categoryLegendColor(category: MapFeatureRecord["category"]): string {
  if (category === "Assignment") return "bg-primary";
  if (category === "Field Officer") return "bg-accent";
  if (category === "Submission") return "bg-success";
  if (category === "Beneficiary") return "bg-emerald-500";
  if (category === "Facility") return "bg-sky-500";
  if (category === "Indicator") return "bg-violet-500";
  if (category === "Quality") return "bg-danger";
  if (category === "Coverage") return "bg-warning";
  return "bg-muted-foreground";
}

function exportReadiness({
  featureCount,
  privacyVisibility,
  qualityIssues,
  sensitiveCount,
}: {
  featureCount: number;
  privacyVisibility: LayerVisibility;
  qualityIssues: number;
  sensitiveCount: number;
}): MapExportReadiness {
  const blockers: string[] = [];
  const recommendations: string[] = [];
  if (featureCount === 0) blockers.push("No visible map records in the current view.");
  if (qualityIssues > 0) recommendations.push(`${qualityIssues} mapped record${qualityIssues === 1 ? "" : "s"} need spatial quality review.`);
  if (sensitiveCount > 0 && privacyVisibility !== "Aggregated") recommendations.push("Sensitive locations are visible to internal users; use aggregated view for donor or public exports.");
  if (sensitiveCount > 0 && privacyVisibility === "Aggregated") recommendations.push("Sensitive coordinates will be masked in exports.");
  const score = Math.max(0, 100 - blockers.length * 45 - recommendations.length * 15);
  return {
    blockers,
    label: blockers.length ? "Blocked" : score >= 80 ? "Ready" : "Review before export",
    recommendations,
    score,
    tone: blockers.length ? "danger" : score >= 80 ? "success" : "warning",
  };
}

function featureLayerId(feature: MapFeatureRecord, layers: MapLayerRecord[]): string | null {
  const layer = layers.find((candidate) => layerFeatureCategory(candidate) === feature.category);
  return layer?.id ?? null;
}

function deriveLiveIndicatorGeography({
  indicators,
  projectExtents,
  projects,
}: {
  indicators: IndicatorRead[];
  projectExtents: ProjectExtent[];
  projects: ProjectListItemRead[];
}): IndicatorGeography[] {
  const projectNameById = new globalThis.Map(projects.map((project) => [project.id, project.name]));
  const extentByProject = new globalThis.Map(projectExtents.map((extent) => [extent.project, extent]));
  return indicators
    .filter((indicator) => indicator.is_active)
    .map((indicator) => {
      const project = indicator.project_id ? projectNameById.get(indicator.project_id) ?? "Linked project" : "Organization-wide";
      const extent = extentByProject.get(project);
      return {
        achievementPercent: indicator.progress_percent,
        baseline: indicator.baseline_value,
        current: indicator.current_value,
        id: `live-indicator-${indicator.id}`,
        indicator: indicator.name,
        location: extent
          ? `${extent.centroidLat.toFixed(4)}, ${extent.centroidLng.toFixed(4)} (${extent.pointCount} located record${extent.pointCount === 1 ? "" : "s"})`
          : "No project GPS extent yet",
        period: indicator.calculated_at ? new Date(indicator.calculated_at).toLocaleDateString() : indicator.reporting_frequency,
        project,
        target: indicator.target_value,
      };
    });
}

function categoryFromEntityType(entityType: string | null | undefined): MapFeatureRecord["category"] {
  const normalized = (entityType ?? "").toLowerCase();
  if (/(facility|clinic|hospital|school|water point|borehole|store|warehouse|site|asset)/.test(normalized)) return "Facility";
  return "Beneficiary";
}

function assignmentStatus(record: FieldWorkAssignmentRead): MapFeatureRecord["status"] {
  const status = record.status.toLowerCase();
  if (status.includes("overdue") || status.includes("cancelled")) return "Critical";
  if (status.includes("complete")) return "Healthy";
  const target = Math.max(1, record.target_count);
  const progress = record.completed_count / target;
  return progress >= 0.8 ? "Healthy" : progress >= 0.35 ? "Warning" : "Critical";
}

function officerActivityStatus(officer: FieldOfficerRead): MapFeatureRecord["status"] {
  if (!officer.is_active) return "Inactive";
  if (!officer.last_sync_at && !officer.last_seen_at) return "Warning";
  const timestamp = new Date(officer.last_sync_at ?? officer.last_seen_at ?? "").getTime();
  if (Number.isNaN(timestamp)) return "Warning";
  const hoursSinceSync = (Date.now() - timestamp) / (1000 * 60 * 60);
  if (hoursSinceSync <= 24) return "Healthy";
  if (hoursSinceSync <= 72) return "Warning";
  return "Critical";
}

function featureProjectCentroids(features: MapFeatureRecord[]): Map<string, { latitude: number; longitude: number; count: number }> {
  const groups = new globalThis.Map<string, MapFeatureRecord[]>();
  for (const feature of features) {
    const items = groups.get(feature.project) ?? [];
    items.push(feature);
    groups.set(feature.project, items);
  }
  return new globalThis.Map(
    Array.from(groups.entries()).map(([project, items]) => [
      project,
      {
        count: items.length,
        latitude: items.reduce((sum, feature) => sum + feature.latitude, 0) / items.length,
        longitude: items.reduce((sum, feature) => sum + feature.longitude, 0) / items.length,
      },
    ]),
  );
}

function qualityMapFeatures(issues: SpatialQualityIssue[], sourceFeatures: MapFeatureRecord[]): MapFeatureRecord[] {
  const featureById = new globalThis.Map(sourceFeatures.map((feature) => [feature.id, feature]));
  return issues.flatMap((issue) => {
    const sourceFeature = issue.sourceFeatureId ? featureById.get(issue.sourceFeatureId) : null;
    if (!sourceFeature) return [];
    return [
      {
        category: "Quality" as const,
        count: 1,
        district: sourceFeature.district,
        gpsAccuracy: sourceFeature.gpsAccuracy,
        id: `quality-feature-${issue.id}`,
        label: issue.issueType,
        latitude: sourceFeature.latitude,
        location: issue.location,
        longitude: sourceFeature.longitude,
        popup: {
          "Issue type": issue.issueType,
          "Related record": sourceFeature.label,
          "Recommended action": issue.recommendedAction,
          Severity: issue.severity,
        },
        project: issue.project,
        qualityScore: Math.max(0, sourceFeature.qualityScore - 20),
        region: sourceFeature.region,
        source: "Data Quality",
        status: issue.severity === "Critical" || issue.validationState === "Failed" ? "Critical" : "Warning",
      },
    ];
  });
}

export function MappingModule({ principal, token }: MappingModuleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<MappingSection>(() => sectionFromPath(pathname));
  const [basemap, setBasemap] = useState<MapBasemap>("Light");
  const [selectedFeature, setSelectedFeature] = useState<MapFeatureRecord | null>(null);
  const [mapResult, setMapResult] = useState("");
  const [mapQuery, setMapQuery] = useState("");
  const [drawMode, setDrawMode] = useState(false);
  const [areaBounds, setAreaBounds] = useState<BoundingBox | null>(null);
  const [boundaryDrawMode, setBoundaryDrawMode] = useState<BoundaryDrawMode>(null);
  const [boundaryDrawPoints, setBoundaryDrawPoints] = useState<[number, number][]>([]);
  const [pendingBoundaryPositions, setPendingBoundaryPositions] = useState<[number, number][] | null>(null);
  const [boundaryNameDraft, setBoundaryNameDraft] = useState("");
  const [drawnBoundaries, setDrawnBoundaries] = useState<DrawnBoundary[]>([]);
  const [densityMode, setDensityMode] = useState(false);
  const [filters, setFilters] = useState<MapFeatureFilters>(() => emptyMapFeatureFilters());
  const [layerOpacity, setLayerOpacity] = useState<Record<string, number>>({});
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({});
  const [assignmentDraft, setAssignmentDraft] = useState<MapAssignmentDraft | null>(null);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const preserveFeatureIdRef = useRef<string | null>(null);
  const pendingMapFeatureId = useWorkspaceStore((state) => state.pendingMapFeatureId);
  const setPendingMapFeatureId = useWorkspaceStore((state) => state.setPendingMapFeatureId);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const preview = !token || token === "preview-token";
  const terminology = useSectorTerminology(token);

  const submissionsQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listSubmissions(token ?? ""),
    queryKey: ["mapping", "submissions", token],
  });
  const beneficiariesQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listBeneficiaries(token ?? ""),
    queryKey: ["mapping", "beneficiaries", token],
  });
  const projectsQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listProjects(token ?? ""),
    queryKey: ["mapping", "projects", token],
  });
  const indicatorsQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listIndicators(token ?? ""),
    queryKey: ["mapping", "indicators", token],
  });
  const formsQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listForms(token ?? ""),
    queryKey: ["mapping", "forms", token],
  });
  const fieldOfficersQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listFieldOfficers(token ?? ""),
    queryKey: ["mapping", "field-officers", token],
  });
  const fieldWorkAssignmentsQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listFieldWorkAssignments(token ?? ""),
    queryKey: ["mapping", "field-work-assignments", token],
  });

  const realMapFeatures = useMemo<MapFeatureRecord[]>(() => {
    const projectNameById: Record<string, string> = Object.fromEntries(
      (projectsQuery.data ?? []).map((project) => [project.id, project.name]),
    );
    const formNameById: Record<string, string> = Object.fromEntries(
      (formsQuery.data ?? []).map((form) => [form.id, form.name]),
    );
    const officerById = new globalThis.Map((fieldOfficersQuery.data ?? []).map((officer) => [officer.id, officer]));
    const geotaggedSubmissions = (submissionsQuery.data ?? [])
      .filter((submission) => submission.latitude && submission.longitude)
      .sort((left, right) => new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime());
    const geotaggedBeneficiaries = (beneficiariesQuery.data ?? []).filter(
      (beneficiary) => beneficiary.latitude && beneficiary.longitude,
    );

    const submissionFeatures: MapFeatureRecord[] = geotaggedSubmissions.map((submission) => {
      const accuracy = submission.accuracy ?? 0;
      const source = submission.is_imported ? "Imported" : submission.offline_created ? "Mobile" : submission.device_id ? "Field Submitted" : "Web Entry";
      return {
        category: "Submission",
        count: 1,
        district: "",
        gpsAccuracy: accuracy,
        id: `submission-${submission.id}`,
        label: submission.client_submission_id || submission.id,
        latitude: submission.latitude,
        location: "Field GPS capture",
        longitude: submission.longitude,
        popup: {
          "GPS accuracy": submission.accuracy != null ? `${submission.accuracy}m` : "Unknown",
          "Submission ID": submission.client_submission_id,
          "Submission source": source,
          "Submitted by": submission.submitted_by_name ?? "Unknown",
          Status: submission.status,
          Submitted: new Date(submission.submitted_at).toLocaleDateString(),
        },
        project: projectNameById[submission.project_id ?? ""] ?? "Unassigned project",
        qualityScore: submission.accuracy == null ? 60 : Math.max(0, Math.min(100, Math.round(100 - submission.accuracy))),
        region: "",
        source,
        status: submission.accuracy == null ? "Warning" : accuracy <= 15 ? "Healthy" : accuracy <= 30 ? "Warning" : "Critical",
      };
    });

    const beneficiaryFeatures: MapFeatureRecord[] = geotaggedBeneficiaries.map((beneficiary) => {
      const latitude = beneficiary.latitude as number;
      const longitude = beneficiary.longitude as number;
      const duplicateRisk = beneficiary.duplicate_risk_score ?? 0;
      const category = categoryFromEntityType(beneficiary.beneficiary_type);
      return {
        category,
        count: 1,
        district: beneficiary.district ?? "",
        gpsAccuracy: 0,
        id: `${category.toLowerCase()}-${beneficiary.id}`,
        label: beneficiary.display_name,
        latitude,
        location: [beneficiary.community, beneficiary.district, beneficiary.region].filter(Boolean).join(", ") || "Location not recorded",
        longitude,
        popup: {
          [`${terminology.primaryEntity} ID`]: beneficiary.beneficiary_uid,
          Enrollment: beneficiary.enrollment_status,
          "Entity record ID": beneficiary.id,
          Source: "Entity Registry",
          Type: beneficiary.beneficiary_type,
          "Vulnerability score": beneficiary.vulnerability_score,
        },
        project: projectNameById[beneficiary.project_id ?? ""] ?? "Unassigned project",
        qualityScore: Math.round((1 - duplicateRisk) * 100),
        region: beneficiary.region ?? "",
        sensitive: true,
        source: "Entity Registry",
        status: duplicateRisk >= 0.7 ? "Critical" : duplicateRisk >= 0.4 ? "Warning" : "Healthy",
      };
    });

    const locatedEvidence = [...submissionFeatures, ...beneficiaryFeatures];
    const centroidsByProject = featureProjectCentroids(locatedEvidence);
    const entityFeatureByRawId = new globalThis.Map(
      geotaggedBeneficiaries.map((beneficiary, index) => [beneficiary.id, beneficiaryFeatures[index]]),
    );

    const assignmentFeatures: MapFeatureRecord[] = (fieldWorkAssignmentsQuery.data ?? []).flatMap((assignment) => {
      const project = projectNameById[assignment.project_id] ?? "Unassigned project";
      const assignedEntityFeature = assignment.assigned_entity_ids
        .map((entityId) => entityFeatureByRawId.get(entityId))
        .find(Boolean);
      const assignedOfficer = assignment.officer_ids
        .map((officerId) => officerById.get(officerId))
        .find((officer) => officer?.last_latitude && officer.last_longitude);
      const centroid = centroidsByProject.get(project);
      const latitude = assignedEntityFeature?.latitude ?? assignedOfficer?.last_latitude ?? centroid?.latitude;
      const longitude = assignedEntityFeature?.longitude ?? assignedOfficer?.last_longitude ?? centroid?.longitude;
      if (latitude == null || longitude == null) return [];
      const status = assignmentStatus(assignment);
      const target = Math.max(1, assignment.target_count);
      const completion = Math.min(100, Math.round((assignment.completed_count / target) * 100));
      return [
        {
          category: "Assignment" as const,
          count: Math.max(1, assignment.target_count),
          district: assignedEntityFeature?.district ?? "",
          gpsAccuracy: assignedOfficer ? 12 : 0,
          id: `assignment-${assignment.id}`,
          label: assignment.name,
          latitude,
          location: assignment.location || assignedEntityFeature?.location || "Assignment area",
          longitude,
          popup: {
            Completed: assignment.completed_count,
            Form: assignment.form_id ? formNameById[assignment.form_id] ?? "Linked form" : "No form linked",
            Officers: assignment.officer_ids.length,
            Priority: assignment.priority,
            Status: assignment.status,
            Target: assignment.target_count,
          },
          project,
          qualityScore: completion,
          region: assignedEntityFeature?.region ?? "",
          source: "Field Operations",
          status,
        },
      ];
    });

    const assignmentCountByOfficer = new globalThis.Map<string, number>();
    for (const assignment of fieldWorkAssignmentsQuery.data ?? []) {
      for (const officerId of assignment.officer_ids) {
        assignmentCountByOfficer.set(officerId, (assignmentCountByOfficer.get(officerId) ?? 0) + 1);
      }
    }
    const officerFeatures: MapFeatureRecord[] = (fieldOfficersQuery.data ?? []).flatMap((officer) => {
      if (officer.last_latitude == null || officer.last_longitude == null) return [];
      const status = officerActivityStatus(officer);
      return [
        {
          category: "Field Officer" as const,
          count: 1,
          district: officer.home_region ?? "",
          gpsAccuracy: 10,
          id: `field-officer-${officer.id}`,
          label: officer.full_name,
          latitude: officer.last_latitude,
          location: officer.home_region || "Last mobile sync location",
          longitude: officer.last_longitude,
          popup: {
            "Active assignments": assignmentCountByOfficer.get(officer.id) ?? 0,
            Device: officer.device_id ?? "Not registered",
            "Last seen": officer.last_seen_at ? new Date(officer.last_seen_at).toLocaleString() : "Unknown",
            "Last sync": officer.last_sync_at ? new Date(officer.last_sync_at).toLocaleString() : "Unknown",
            Supervisor: officer.supervisor_name ?? "Not assigned",
          },
          project: "Field Operations",
          qualityScore: status === "Healthy" ? 95 : status === "Warning" ? 70 : 35,
          region: officer.home_region ?? "",
          source: "Mobile Sync",
          status,
        },
      ];
    });

    const indicatorFeatures: MapFeatureRecord[] = (indicatorsQuery.data ?? []).flatMap((indicator) => {
      if (!indicator.is_active) return [];
      const project = indicator.project_id ? projectNameById[indicator.project_id] ?? "Linked project" : "Organization-wide";
      const centroid = centroidsByProject.get(project) ?? Array.from(centroidsByProject.values())[0];
      if (!centroid) return [];
      const achievement = Math.round(indicator.progress_percent);
      return [
        {
          category: "Indicator" as const,
          count: Math.max(1, Math.round(indicator.current_value)),
          district: "",
          gpsAccuracy: 0,
          id: `indicator-${indicator.id}`,
          label: indicator.name,
          latitude: centroid.latitude,
          location: `${project} performance area`,
          longitude: centroid.longitude,
          popup: {
            Achievement: `${achievement}%`,
            Baseline: indicator.baseline_value,
            Current: indicator.current_value,
            Target: indicator.target_value,
          },
          project,
          qualityScore: Math.max(0, Math.min(100, achievement)),
          region: "",
          source: "Indicator Result",
          status: achievement >= 80 ? "Healthy" : achievement >= 50 ? "Warning" : "Critical",
        },
      ];
    });

    return [...locatedEvidence, ...assignmentFeatures, ...officerFeatures, ...indicatorFeatures];
  }, [
    beneficiariesQuery.data,
    fieldOfficersQuery.data,
    fieldWorkAssignmentsQuery.data,
    formsQuery.data,
    indicatorsQuery.data,
    projectsQuery.data,
    submissionsQuery.data,
    terminology,
  ]);

  const latestSubmissionFeature = useMemo(
    () => realMapFeatures.find((feature) => feature.category === "Submission") ?? null,
    [realMapFeatures],
  );

  const baseMapFeatures = useMemo(() => (preview ? previewMapFeatures : realMapFeatures), [preview, realMapFeatures]);
  const spatialIssues = useMemo(
    () => (preview ? previewSpatialIssues : deriveQualityIssues(baseMapFeatures)),
    [baseMapFeatures, preview],
  );
  const liveQualityFeatures = useMemo(
    () => (preview ? [] : qualityMapFeatures(spatialIssues, baseMapFeatures)),
    [baseMapFeatures, preview, spatialIssues],
  );
  const mapFeatures = useMemo(
    () => (preview ? previewMapFeatures : [...baseMapFeatures, ...liveQualityFeatures]),
    [baseMapFeatures, liveQualityFeatures, preview],
  );
  const assignmentForms = useMemo<DataFormRead[]>(
    () =>
      preview
        ? previewForms.map((form) => ({
            controls_json: form.controls_json,
            current_version: form.version,
            description: form.description ?? null,
            form_type: null,
            id: form.id,
            is_active: true,
            name: form.name,
            project_id: form.project_id ?? null,
            slug: form.slug,
            status: form.status,
            survey_id: null,
          }))
        : (formsQuery.data ?? []).filter((form) => form.is_active && form.status.toLowerCase() === "published"),
    [formsQuery.data, preview],
  );
  const assignmentOfficers = useMemo<FieldOfficerRead[]>(
    () => (preview ? previewOfficers : fieldOfficersQuery.data ?? []).filter((officer) => officer.is_active),
    [fieldOfficersQuery.data, preview],
  );
  const projectExtents = useMemo(() => computeProjectExtents(mapFeatures), [mapFeatures]);
  const boundaryShapes = useMemo<MapBoundaryShape[]>(
    () =>
      projectExtents.map((extent) => ({
        bounds: extentToBounds(extent),
        id: `extent-${extent.project}`,
        label: `${extent.project} extent`,
        pointCount: extent.pointCount,
        status: extentStatus(extent.pointCount),
      })),
    [projectExtents],
  );
  const mapLayers = useMemo(() => (preview ? previewMapLayers : deriveLiveMapLayers(mapFeatures)), [preview, mapFeatures]);
  useEffect(() => {
    setLayerVisibility((current) => {
      const next: Record<string, boolean> = {};
      for (const layer of mapLayers) next[layer.id] = current[layer.id] ?? true;
      return next;
    });
    setLayerOpacity((current) => {
      const next: Record<string, number> = {};
      for (const layer of mapLayers) next[layer.id] = current[layer.id] ?? 100;
      return next;
    });
  }, [mapLayers]);
  const controlledMapFeatures = useMemo(() => {
    const filtered = applyMapFeatureFilters(mapFeatures, filters);
    return filtered.filter((feature) => {
      const layerId = featureLayerId(feature, mapLayers);
      return !layerId || layerVisibility[layerId] !== false;
    });
  }, [filters, layerVisibility, mapFeatures, mapLayers]);
  const featureOpacityByCategory = useMemo<Partial<Record<MapFeatureRecord["category"], number>>>(() => {
    const opacityByCategory: Partial<Record<MapFeatureRecord["category"], number>> = {};
    for (const layer of mapLayers) {
      const category = layerFeatureCategory(layer);
      if (!category) continue;
      opacityByCategory[category] = (layerOpacity[layer.id] ?? 100) / 100;
    }
    return opacityByCategory;
  }, [layerOpacity, mapLayers]);
  const boundaries = useMemo(() => (preview ? previewBoundaries : deriveLiveBoundaries(projectExtents)), [preview, projectExtents]);
  const coverage = useMemo(() => (preview ? previewCoverage : []), [preview]);
  const indicatorGeography = useMemo(
    () =>
      preview
        ? previewIndicatorGeography
        : deriveLiveIndicatorGeography({
            indicators: indicatorsQuery.data ?? [],
            projectExtents,
            projects: projectsQuery.data ?? [],
          }),
    [indicatorsQuery.data, preview, projectExtents, projectsQuery.data],
  );
  const projectDataCoverage = useMemo<ProjectDataCoverage[]>(
    () =>
      preview
        ? []
        : deriveProjectDataCoverage(
            realMapFeatures,
            (projectsQuery.data ?? []).map((project) => project.name),
          ),
    [preview, projectsQuery.data, realMapFeatures],
  );
  const restricted = isRestrictedMapViewer(principal);
  const privacyVisibility: LayerVisibility = restricted ? "Aggregated" : "Internal";
  const sections = useMemo(
    () =>
      mappingSections.map((section) =>
        section.id === "beneficiary-maps"
          ? { ...section, label: `${terminology.primaryEntityPlural} Maps`, description: `${terminology.primaryEntityPlural} and household geography with privacy masking and aggregated role-based views.` }
          : section,
      ),
    [terminology],
  );
  const activeInfo = sections.find((section) => section.id === activeSection) ?? sections[0];

  useEffect(() => {
    const routeSection = sectionFromPath(pathname);
    if (routeSection !== activeSection) setActiveSection(routeSection);
  }, [activeSection, pathname]);

  const visibleFeatures = useMemo(
    () => filterFeaturesBySection(controlledMapFeatures, activeSection),
    [activeSection, controlledMapFeatures],
  );
  const summary = useMemo(
    () =>
      computeMappingSummary({
        boundaries,
        features: mapFeatures,
        layers: mapLayers,
      }),
    [boundaries, mapFeatures, mapLayers],
  );

  const searchedFeatures = useMemo(() => {
    const query = mapQuery.trim().toLowerCase();
    if (!query) return visibleFeatures;
    return visibleFeatures.filter((feature) =>
      [feature.label, feature.project, feature.location, feature.region, feature.district, feature.category].some(
        (value) => value.toLowerCase().includes(query),
      ),
    );
  }, [mapQuery, visibleFeatures]);

  const spatiallyFilteredFeatures = useMemo(
    () => (areaBounds ? searchedFeatures.filter((feature) => isFeatureInBounds(feature, areaBounds)) : searchedFeatures),
    [areaBounds, searchedFeatures],
  );
  const selectedAreaAssignmentSummary = useMemo(
    () => summarizeMapAreaForAssignment(areaBounds ? spatiallyFilteredFeatures : []),
    [areaBounds, spatiallyFilteredFeatures],
  );

  const searchedLayers = useMemo(() => {
    const query = mapQuery.trim().toLowerCase();
    if (!query) return mapLayers;
    return mapLayers.filter((layer) =>
      [layer.name, layer.type, layer.source, layer.owner].some((value) => value.toLowerCase().includes(query)),
    );
  }, [mapLayers, mapQuery]);

  useEffect(() => {
    if (preserveFeatureIdRef.current) {
      const preserved = searchedFeatures.find((feature) => feature.id === preserveFeatureIdRef.current);
      preserveFeatureIdRef.current = null;
      if (preserved) {
        setSelectedFeature(preserved);
        return;
      }
    }
    setSelectedFeature(searchedFeatures[0] ?? null);
  }, [searchedFeatures]);

  useEffect(() => {
    if (!pendingMapFeatureId) return;
    const section: MappingSection = pendingMapFeatureId.startsWith("beneficiary-")
      ? "beneficiary-maps"
      : pendingMapFeatureId.startsWith("facility-")
        ? "facility-maps"
      : pendingMapFeatureId.startsWith("submission-")
        ? "submission-maps"
        : activeSection;
    const feature = mapFeatures.find((candidate) => candidate.id === pendingMapFeatureId);
    if (section === activeSection) {
      setSelectedFeature(feature ?? searchedFeatures[0] ?? null);
    } else {
      preserveFeatureIdRef.current = feature?.id ?? null;
      setActiveSection(section);
    }
    setAreaBounds(null);
    setDrawMode(false);
    setPendingMapFeatureId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMapFeatureId, mapFeatures, setPendingMapFeatureId]);

  function selectSection(section: MappingSection): void {
    setActiveSection(section);
    setSelectedFeature(filterFeaturesBySection(mapFeatures, section)[0] ?? null);
    setAreaBounds(null);
    setDrawMode(false);
    cancelBoundaryDraw();
    const route = mappingSections.find((item) => item.id === section)?.route;
    if (route && route !== pathname) router.push(route);
  }

  function viewProjectExtentOnMap(extent: ProjectExtent): void {
    setAreaBounds(extentToBounds(extent));
    setActiveSection("submission-maps");
    setDrawMode(false);
    cancelBoundaryDraw();
  }

  function handleDrawModeChange(active: boolean): void {
    setDrawMode(active);
    if (active) cancelBoundaryDraw();
  }

  function startBoundaryDraw(mode: "polygon" | "rectangle"): void {
    setDrawMode(false);
    setAreaBounds(null);
    if (mode === "rectangle" || boundaryDrawPoints.length === 0) {
      setBoundaryDrawPoints([]);
    }
    setBoundaryDrawMode(mode);
  }

  function pauseBoundaryDraw(): void {
    setBoundaryDrawMode(null);
  }

  function cancelBoundaryDraw(): void {
    setBoundaryDrawMode(null);
    setBoundaryDrawPoints([]);
  }

  function handleBoundaryDrawPoint(point: [number, number]): void {
    setBoundaryDrawPoints((current) => [...current, point]);
  }

  function finishBoundaryDraw(): void {
    if (boundaryDrawPoints.length < 3) return;
    setPendingBoundaryPositions(boundaryDrawPoints);
    setBoundaryDrawMode(null);
    setBoundaryDrawPoints([]);
  }

  function handleBoundaryDrawComplete(positions: [number, number][]): void {
    setPendingBoundaryPositions(positions);
    setBoundaryDrawMode(null);
    setBoundaryDrawPoints([]);
  }

  function saveDrawnBoundary(): void {
    if (!pendingBoundaryPositions) return;
    const name = boundaryNameDraft.trim() || `Sketched boundary ${drawnBoundaries.length + 1}`;
    setDrawnBoundaries((current) => [
      ...current,
      { createdAt: new Date().toISOString(), id: `drawn-boundary-${Date.now()}`, name, positions: pendingBoundaryPositions },
    ]);
    setPendingBoundaryPositions(null);
    setBoundaryNameDraft("");
    pushToast({
      description: `"${name}" added to the boundary registry for this session. Export GeoJSON to register it officially.`,
      title: "Boundary sketched",
      tone: "success",
    });
  }

  function discardDrawnBoundary(): void {
    setPendingBoundaryPositions(null);
    setBoundaryNameDraft("");
  }

  function deleteDrawnBoundary(id: string): void {
    setDrawnBoundaries((current) => current.filter((boundary) => boundary.id !== id));
  }

  function exportDrawnBoundary(boundary: DrawnBoundary): void {
    downloadGeoJson(`${boundary.name.trim().toLowerCase().replace(/\s+/g, "-") || boundary.id}.geojson`, drawnBoundaryToGeoJson(boundary));
  }

  function exportCurrentView(): void {
    downloadCsv(
      "atlas-mapping-view.csv",
      spatiallyFilteredFeatures.map((feature) => ({
        category: feature.category,
        count: feature.count,
        district: feature.district,
        gpsAccuracy: feature.gpsAccuracy,
        label: feature.label,
        latitude: maskCoordinate(feature.latitude, privacyVisibility),
        location: feature.location,
        longitude: maskCoordinate(feature.longitude, privacyVisibility),
        popupDetails: JSON.stringify(feature.popup),
        project: feature.project,
        qualityScore: feature.qualityScore,
        region: feature.region,
        sensitive: Boolean(feature.sensitive),
        status: feature.status,
      })),
    );
    setMapResult(`Map export prepared with ${spatiallyFilteredFeatures.length} record(s) from the current filtered view. Export access should be audited by Governance for production deployments.`);
  }

  function exportCurrentGeoJson(): void {
    downloadGeoJson("atlas-mapping-view.geojson", toGeoJson(spatiallyFilteredFeatures, privacyVisibility));
    setMapResult(`GeoJSON export prepared with ${spatiallyFilteredFeatures.length} mapped feature(s). Sensitive coordinates follow the active role-based visibility policy.`);
  }

  function openAreaAssignmentDraft(): void {
    if (!areaBounds || spatiallyFilteredFeatures.length === 0) {
      pushToast({
        description: "Draw/select an area on the map first. The assignment will use the mapped records inside that area.",
        title: "Select a map area",
        tone: "warning",
      });
      return;
    }
    const summary = summarizeMapAreaForAssignment(spatiallyFilteredFeatures);
    const projectName = summary.projects[0] ?? "";
    const startDate = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const firstMatchingForm = assignmentForms.find((form) => {
      const project = projectsQuery.data?.find((item) => item.name === projectName);
      return project ? form.project_id === project.id : previewForms.some((item) => item.id === form.id && item.project_name === projectName);
    }) ?? assignmentForms[0];
    setAssignmentDraft({
      description: `GIS assignment from ${summary.location}. Includes ${spatiallyFilteredFeatures.length} mapped point(s), ${summary.targetCount.toLocaleString()} target record(s), and ${summary.entityIds.length} entity/facility record(s).`,
      endDate,
      formId: firstMatchingForm?.id ?? "",
      name: `${projectName || "Map area"} field assignment`,
      officerIds: assignmentOfficers[0]?.id ? [assignmentOfficers[0].id] : [],
      priority: summary.projects.length > 1 ? "High" : "Normal",
      projectName,
      startDate,
    });
  }

  async function submitAreaAssignment(): Promise<void> {
    if (!assignmentDraft) return;
    const summary = summarizeMapAreaForAssignment(spatiallyFilteredFeatures);
    const selectedProject = (projectsQuery.data ?? []).find((project) => project.name === assignmentDraft.projectName);
    const selectedForm = assignmentForms.find((form) => form.id === assignmentDraft.formId);
    const selectedOfficers = assignmentOfficers.filter((officer) => assignmentDraft.officerIds.includes(officer.id));
    if (!preview && (!token || !selectedProject || !selectedForm || selectedOfficers.length === 0)) {
      pushToast({
        description: "Choose one saved project, one published form, and at least one active field officer before creating a live assignment.",
        title: "Assignment needs saved records",
        tone: "warning",
      });
      return;
    }
    setAssignmentSaving(true);
    try {
      if (!preview && token && selectedProject && selectedForm) {
        await createFieldWorkAssignment(token, {
          assigned_entity_ids: summary.entityIds,
          description: assignmentDraft.description,
          end_date: assignmentDraft.endDate || null,
          form_id: selectedForm.id,
          location: summary.location,
          name: assignmentDraft.name,
          officer_ids: selectedOfficers.map((officer) => officer.id),
          priority: assignmentDraft.priority,
          project_id: selectedProject.id,
          start_date: assignmentDraft.startDate || null,
          target_count: summary.targetCount,
          assignment_type: summary.entityIds.length ? "Form + Entity list" : "Form + Location",
        });
        await Promise.all(
          selectedOfficers.map((officer) =>
            createFieldOfficerAssignment(token, {
              form_id: selectedForm.id,
              is_active: true,
              officer_id: officer.id,
              project_id: selectedProject.id,
              region: summary.location,
            }),
          ),
        );
      }
      setMapResult(`Assignment draft created from ${summary.location}: ${selectedOfficers.length || assignmentDraft.officerIds.length} officer(s), ${summary.targetCount.toLocaleString()} target record(s), ${summary.entityIds.length} entity/facility link(s).`);
      pushToast({
        description: preview ? "Preview assignment created from the selected GIS area." : "Live field assignment created and linked to the selected map area.",
        title: "Map assignment ready",
        tone: "success",
      });
      setAssignmentDraft(null);
    } catch (error) {
      pushToast({
        description: error instanceof Error ? error.message : "The assignment could not be created.",
        title: "Assignment failed",
        tone: "danger",
      });
    } finally {
      setAssignmentSaving(false);
    }
  }

  function openFeatureSource(feature: MapFeatureRecord): void {
    router.push(mappingFeatureSourceRoute(feature));
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="monitor">ANALYTICS</Badge>
              <Badge tone={summary.gpsIssues ? "warning" : "success"}>
                {summary.gpsIssues} GPS issues
              </Badge>
              <Badge tone={restricted ? "warning" : "accent"}>
                {restricted ? "Aggregated coordinates" : "Internal map access"}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Mapping</h1>
              <HelpHint label="About Mapping" title="Mapping">
                Visualize project scope, submission GPS evidence, beneficiaries, facilities, coverage, indicators, spatial data quality, reusable layers, and boundaries from one GIS workspace.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setActiveSection("layers")} variant="primary">
              <Upload aria-hidden="true" />
              Upload layer
            </Button>
            <Button onClick={exportCurrentView} variant="secondary">
              <Download aria-hidden="true" />
              Export CSV
            </Button>
            <Button onClick={exportCurrentGeoJson} variant="secondary">
              <FileJson aria-hidden="true" />
              Export GeoJSON
            </Button>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto product-scrollbar" aria-label="Mapping sections">
          {sections.map((section) => (
            <button
              className={cn(
                "shrink-0 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                activeSection === section.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-panel hover:bg-muted",
              )}
              key={section.id}
              onClick={() => selectSection(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {mapResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Map action</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{mapResult}</p>
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === "dashboard" ? (
        <MappingDashboard
          latestSubmissionFeature={latestSubmissionFeature}
          onOpenQuality={() => setActiveSection("data-quality-maps")}
          onOpenSection={selectSection}
          onOpenSubmissions={() => router.push(mappingWorkspaceRouteForTarget("submissions"))}
          preview={preview}
          summary={summary}
          terminology={terminology}
        />
      ) : null}

      {preview || REAL_DATA_SECTIONS.includes(activeSection) ? (
        <>
          <EnterpriseMapViewer
            activeSection={activeSection}
            allFeatures={mapFeatures}
            areaBounds={areaBounds}
            areaAssignmentSummary={selectedAreaAssignmentSummary}
            basemap={basemap}
            boundaryDrawMode={boundaryDrawMode}
            boundaryDrawPoints={boundaryDrawPoints}
            boundaryShapes={boundaryShapes}
            drawMode={drawMode}
            drawnBoundaries={drawnBoundaries}
            densityMode={densityMode}
            featureOpacityByCategory={featureOpacityByCategory}
            features={spatiallyFilteredFeatures}
            filters={filters}
            layers={searchedLayers}
            layerOpacity={layerOpacity}
            layerVisibility={layerVisibility}
            mapQuery={mapQuery}
            onAreaBoundsChange={setAreaBounds}
            onBasemapChange={setBasemap}
            onBoundaryDrawComplete={handleBoundaryDrawComplete}
            onBoundaryDrawPoint={handleBoundaryDrawPoint}
            onCancelBoundaryDraw={cancelBoundaryDraw}
            onCreateAreaAssignment={openAreaAssignmentDraft}
            onDrawModeChange={handleDrawModeChange}
            onDensityModeChange={setDensityMode}
            onFeatureSelect={setSelectedFeature}
            onFiltersChange={setFilters}
            onFinishBoundaryDraw={finishBoundaryDraw}
            onLayerOpacityChange={(layerId, opacity) => setLayerOpacity((current) => ({ ...current, [layerId]: opacity }))}
            onLayerVisibilityChange={(layerId, visible) => setLayerVisibility((current) => ({ ...current, [layerId]: visible }))}
            onPauseBoundaryDraw={pauseBoundaryDraw}
            onOpenFeatureSource={openFeatureSource}
            onMapQueryChange={setMapQuery}
            onStartBoundaryDraw={startBoundaryDraw}
            privacyVisibility={privacyVisibility}
            sectionInfo={activeInfo}
            selectedFeature={selectedFeature}
          />

          <SectionContent
            activeSection={activeSection}
            boundaries={boundaries}
            coverage={coverage}
            drawnBoundaries={drawnBoundaries}
            indicatorGeography={indicatorGeography}
            mapFeatures={spatiallyFilteredFeatures}
            mapLayers={mapLayers}
            onDeleteDrawnBoundary={deleteDrawnBoundary}
            onExportDrawnBoundary={exportDrawnBoundary}
            onFeatureSelect={setSelectedFeature}
            onOpenIndicators={() => router.push(mappingWorkspaceRouteForTarget("indicators"))}
            projectDataCoverage={projectDataCoverage}
            onOpenDataQuality={() => router.push(mappingWorkspaceRouteForTarget("data-quality"))}
            onViewProjectExtent={viewProjectExtentOnMap}
            preview={preview}
            privacyVisibility={privacyVisibility}
            projectExtents={projectExtents}
            sectionInfo={activeInfo}
            selectedFeature={selectedFeature}
            setActiveSection={setActiveSection}
            spatialIssues={spatialIssues}
          />
        </>
      ) : (
        <MappingNotAvailable section={activeInfo} onSelectSection={selectSection} />
      )}

      <Modal
        onOpenChange={(open) => {
          if (!open) discardDrawnBoundary();
        }}
        open={pendingBoundaryPositions !== null}
        title="Name this boundary"
      >
        <div className="space-y-3 p-5">
          <p className="text-sm leading-6 text-muted-foreground">
            This boundary is sketched on the map for this session only. Save it to add it to the boundary registry, then export it as GeoJSON to register the official geometry.
          </p>
          <Input
            autoFocus
            onChange={(event) => setBoundaryNameDraft(event.target.value)}
            placeholder="e.g. Mezam project area"
            value={boundaryNameDraft}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={discardDrawnBoundary} variant="secondary">Discard</Button>
            <Button onClick={saveDrawnBoundary} variant="primary">Save boundary</Button>
          </div>
        </div>
      </Modal>
      <MapAreaAssignmentModal
        draft={assignmentDraft}
        forms={assignmentForms}
        officers={assignmentOfficers}
        onDraftChange={setAssignmentDraft}
        onOpenChange={(open) => {
          if (!open) setAssignmentDraft(null);
        }}
        onSubmit={() => {
          void submitAreaAssignment();
        }}
        preview={preview}
        projects={projectsQuery.data ?? []}
        saving={assignmentSaving}
        summary={selectedAreaAssignmentSummary}
      />
    </section>
  );
}

function MapAreaAssignmentModal({
  draft,
  forms,
  officers,
  onDraftChange,
  onOpenChange,
  onSubmit,
  preview,
  projects,
  saving,
  summary,
}: {
  draft: MapAssignmentDraft | null;
  forms: DataFormRead[];
  officers: FieldOfficerRead[];
  onDraftChange: (draft: MapAssignmentDraft | null) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  preview: boolean;
  projects: ProjectListItemRead[];
  saving: boolean;
  summary: ReturnType<typeof summarizeMapAreaForAssignment>;
}) {
  const projectOptions = useMemo(
    () => (summary.projects.length ? summary.projects : projects.map((project) => project.name)),
    [projects, summary.projects],
  );
  const selectedProjectId = projects.find((project) => project.name === draft?.projectName)?.id ?? null;
  const formsForProject = useMemo(
    () =>
      forms.filter((form) => {
        if (!draft?.projectName) return true;
        if (preview) {
          const previewForm = previewForms.find((item) => item.id === form.id);
          return previewForm?.project_name === draft.projectName;
        }
        return !selectedProjectId || form.project_id === selectedProjectId;
      }),
    [draft?.projectName, forms, preview, selectedProjectId],
  );
  if (!draft) return null;
  const currentDraft = draft;
  const canSubmit = Boolean(draft.name.trim() && draft.projectName && draft.formId && draft.officerIds.length);
  function update(next: Partial<MapAssignmentDraft>): void {
    onDraftChange({ ...currentDraft, ...next });
  }
  function updateProject(projectName: string): void {
    const nextProjectId = projects.find((project) => project.name === projectName)?.id ?? null;
    const nextForm = forms.find((form) => {
      if (preview) return previewForms.find((item) => item.id === form.id)?.project_name === projectName;
      return !nextProjectId || form.project_id === nextProjectId;
    });
    update({ formId: nextForm?.id ?? "", projectName });
  }
  return (
    <Modal onOpenChange={onOpenChange} open={Boolean(draft)} title="Create assignment from map area">
      <div className="space-y-4 p-5">
        <div className="rounded-xl border bg-muted/20 p-3">
          <p className="text-sm font-semibold">Selected GIS area</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <Signal label="Target records" value={summary.targetCount.toLocaleString()} tone="accent" />
            <Signal label="Entity/facility links" value={summary.entityIds.length.toLocaleString()} tone={summary.entityIds.length ? "success" : "neutral"} />
            <Signal label="Location" value={summary.location} tone="neutral" />
          </div>
          {summary.projects.length > 1 ? (
            <p className="mt-2 text-xs text-warning">This area contains records from multiple projects. Choose the project that owns this assignment.</p>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Assignment name</span>
            <Input value={draft.name} onChange={(event) => update({ name: event.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Project</span>
            <Select value={draft.projectName} onChange={(event) => updateProject(event.target.value)}>
              <option value="">Choose project</option>
              {projectOptions.map((project) => <option key={project} value={project}>{project}</option>)}
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Published form</span>
            <Select value={draft.formId} onChange={(event) => update({ formId: event.target.value })}>
              <option value="">Choose form</option>
              {formsForProject.map((form) => <option key={form.id} value={form.id}>{form.name}</option>)}
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Priority</span>
            <Select value={draft.priority} onChange={(event) => update({ priority: event.target.value as MapAssignmentDraft["priority"] })}>
              {["Normal", "High", "Urgent", "Low"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Start date</span>
            <Input type="date" value={draft.startDate} onChange={(event) => update({ startDate: event.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">End date</span>
            <Input type="date" value={draft.endDate} onChange={(event) => update({ endDate: event.target.value })} />
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">Field officers</p>
            <Badge tone={draft.officerIds.length ? "success" : "warning"}>{draft.officerIds.length} selected</Badge>
          </div>
          <div className="grid max-h-44 gap-2 overflow-y-auto rounded-xl border bg-background/70 p-2 product-scrollbar md:grid-cols-2">
            {officers.length ? officers.map((officer) => {
              const checked = draft.officerIds.includes(officer.id);
              return (
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border bg-panel p-2 text-sm" key={officer.id}>
                  <input
                    checked={checked}
                    className="mt-1 accent-primary"
                    onChange={(event) =>
                      update({
                        officerIds: event.target.checked
                          ? [...draft.officerIds, officer.id]
                          : draft.officerIds.filter((id) => id !== officer.id),
                      })
                    }
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-medium">{officer.full_name}</span>
                    <span className="text-xs text-muted-foreground">{officer.home_region ?? "No region"} · {officer.supervisor_name ?? "No supervisor"}</span>
                  </span>
                </label>
              );
            }) : <EmptyMini label="No active field officers available." />}
          </div>
        </div>

        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Supervisor notes</span>
          <Textarea value={draft.description} onChange={(event) => update({ description: event.target.value })} />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            {preview ? "Preview creates a test assignment summary. Live workspace creates Field Operations and mobile form assignments." : "Live assignments sync through Field Operations and the mobile assignment endpoint."}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => onOpenChange(false)} variant="secondary">Cancel</Button>
            <Button disabled={!canSubmit || saving} onClick={onSubmit} variant="primary">
              {saving ? "Creating..." : "Create assignment"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function MappingDashboard({
  latestSubmissionFeature,
  onOpenQuality,
  onOpenSection,
  onOpenSubmissions,
  preview,
  summary,
  terminology,
}: {
  latestSubmissionFeature: MapFeatureRecord | null;
  onOpenQuality: () => void;
  onOpenSection: (section: MappingSection) => void;
  onOpenSubmissions: () => void;
  preview: boolean;
  summary: MappingSummary;
  terminology: SectorTerminology;
}) {
  const cards: { icon: LucideIcon; label: string; section: MappingSection; tone?: BadgeProps["tone"]; value: string | number }[] = [
    { icon: Layers, label: "Active Map Layers", section: "layers", value: summary.activeMapLayers },
    { icon: MapPinned, label: "Project Locations", section: "project-maps", value: summary.projectLocations },
    { icon: LocateFixed, label: "Submission Points", section: "submission-maps", value: summary.submissionPoints.toLocaleString() },
    { icon: Shield, label: `${terminology.primaryEntityPlural} Points`, section: "beneficiary-maps", value: summary.beneficiaryPoints.toLocaleString() },
    { icon: CircleDot, label: "Facility Points", section: "facility-maps", value: summary.facilityPoints },
    { icon: Map, label: "Boundaries", section: "boundaries", value: summary.uploadedBoundaries },
    { icon: FileWarning, label: "GPS Issues", section: "data-quality-maps", tone: summary.gpsIssues ? "warning" : "success", value: summary.gpsIssues },
    { icon: Navigation, label: "Coverage Gaps", section: "coverage-maps", tone: summary.coverageGaps ? "danger" : "success", value: summary.coverageGaps },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <button className="rounded-xl border bg-panel p-3 text-left shadow-line transition hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30" key={card.label} onClick={() => onOpenSection(card.section)} type="button">
          <div className="flex items-center justify-between gap-3">
            <card.icon aria-hidden="true" className="text-primary" size={18} />
            {card.tone ? <Badge tone={card.tone}>Spatial</Badge> : null}
          </div>
          <p className="mt-4 text-2xl font-semibold">{card.value}</p>
          <p className="text-xs text-muted-foreground">{card.label}</p>
        </button>
      ))}
      <Panel title="Recent GPS Activity">
        {preview ? (
          <>
            <Signal label="Latest synced point" value="MOB-2026-0001 · 6m accuracy" tone="success" />
            <Signal label="Boundary warnings" value="2 records need review" tone="warning" />
          </>
        ) : latestSubmissionFeature ? (
          <Signal
            label="Latest GPS submission"
            value={`${latestSubmissionFeature.label} · ${latestSubmissionFeature.gpsAccuracy}m accuracy`}
            tone={latestSubmissionFeature.gpsAccuracy <= 30 ? "success" : "warning"}
          />
        ) : (
          <EmptyMini label="No GPS-tagged submissions yet." />
        )}
        <Button className="mt-3" onClick={onOpenSubmissions} size="sm" variant="secondary">Open submissions</Button>
      </Panel>
      <Panel title="Data Quality Spatial Alerts">
        {preview ? (
          <>
            <Signal label="Duplicate cluster" value="Critical · Littoral / Wouri" tone="danger" />
            <Signal label="Outside boundary" value="High · Far North" tone="warning" />
          </>
        ) : summary.gpsIssues > 0 ? (
          <Signal label="GPS accuracy issues" value={`${summary.gpsIssues} point(s) need review`} tone="warning" />
        ) : (
          <EmptyMini label="No spatial accuracy issues detected in your submissions." />
        )}
        <Button className="mt-3" onClick={onOpenQuality} size="sm" variant="secondary">Open quality map</Button>
      </Panel>
      <Panel title="Boundary Upload Status">
        {preview ? (
          <>
            <Signal label="Administrative boundaries" value="v4 validated" tone="success" />
            <Signal label="Project area" value="2 missing community polygons" tone="warning" />
          </>
        ) : (
          <EmptyMini label="Boundary uploads aren't connected yet for this organization." />
        )}
      </Panel>
      <Panel title="High-Priority Geographic Gaps">
        {preview ? (
          <>
            <Signal label="No-data area" value="Mayo-Sava target not reached" tone="danger" />
            <Signal label="Under-covered" value="Wouri facility assessment" tone="warning" />
          </>
        ) : (
          <EmptyMini label="Coverage gap analysis isn't connected yet. This will populate once coverage targets are configured." />
        )}
      </Panel>
    </div>
  );
}

function EnterpriseMapViewer({
  activeSection,
  allFeatures,
  areaBounds,
  areaAssignmentSummary,
  basemap,
  boundaryDrawMode,
  boundaryDrawPoints,
  boundaryShapes,
  drawMode,
  drawnBoundaries,
  densityMode,
  featureOpacityByCategory,
  features,
  filters,
  layers,
  layerOpacity,
  layerVisibility,
  mapQuery,
  onAreaBoundsChange,
  onBasemapChange,
  onBoundaryDrawComplete,
  onBoundaryDrawPoint,
  onCancelBoundaryDraw,
  onCreateAreaAssignment,
  onDrawModeChange,
  onDensityModeChange,
  onFeatureSelect,
  onFiltersChange,
  onFinishBoundaryDraw,
  onLayerOpacityChange,
  onLayerVisibilityChange,
  onPauseBoundaryDraw,
  onOpenFeatureSource,
  onMapQueryChange,
  onStartBoundaryDraw,
  privacyVisibility,
  sectionInfo,
  selectedFeature,
}: MapViewerProps) {
  const activeInfo = sectionInfo;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const [metadataLayer, setMetadataLayer] = useState<MapLayerRecord | null>(null);
  const [activeMode, setActiveMode] = useState<MapWorkspaceMode>("explore");
  const [savedViews, setSavedViews] = useState<SavedMapView[]>(() => defaultSavedMapViews());
  const [saveViewName, setSaveViewName] = useState("");
  const showBoundaryShapes = activeSection === "boundaries" || activeSection === "project-maps";
  const visibleBoundaryShapes = showBoundaryShapes ? boundaryShapes : [];
  const activeModeInfo = mapWorkspaceModes.find((mode) => mode.id === activeMode) ?? mapWorkspaceModes[0];
  const filterOptions = useMemo(
    () => ({
      categories: Array.from(new Set(allFeatures.map((feature) => feature.category))).sort(),
      locations: Array.from(new Set(allFeatures.flatMap((feature) => [feature.region, feature.district, feature.location]).filter(Boolean))).sort(),
      projects: Array.from(new Set(allFeatures.map((feature) => feature.project).filter(Boolean))).sort(),
      sources: Array.from(new Set(allFeatures.map(featureSource))).sort(),
      statuses: Array.from(new Set(allFeatures.map((feature) => feature.status))).sort(),
    }),
    [allFeatures],
  );
  const groupedLayers = useMemo(() => {
    const groups = new globalThis.Map<string, MapLayerRecord[]>();
    for (const layer of layers) {
      const group = layerGroupLabel(layer);
      groups.set(group, [...(groups.get(group) ?? []), layer]);
    }
    const order = ["Operational", "Evidence", "Performance", "Data Quality", "Boundaries & Reference"];
    return order
      .map((label) => ({ label, layers: groups.get(label) ?? [] }))
      .filter((group) => group.layers.length > 0);
  }, [layers]);
  const legendStatusItems = useMemo(
    () =>
      (["Healthy", "Warning", "Critical", "Inactive"] as const)
        .map((status) => ({
          color: status === "Healthy" ? "bg-success" : status === "Warning" ? "bg-warning" : status === "Inactive" ? "bg-muted-foreground" : "bg-danger",
          count: features.filter((feature) => feature.status === status).length,
          label: status,
        }))
        .filter((item) => item.count > 0),
    [features],
  );
  const legendCategoryItems = useMemo(
    () =>
      Array.from(new Set(features.map((feature) => feature.category)))
        .sort()
        .map((category) => ({
          color: categoryLegendColor(category),
          count: features.filter((feature) => feature.category === category).length,
          label: category,
        })),
    [features],
  );
  const sensitiveFeatureCount = useMemo(() => features.filter((feature) => feature.sensitive).length, [features]);
  const qualityIssueCount = useMemo(
    () => features.filter((feature) => feature.category === "Quality" || feature.status === "Critical" || feature.gpsAccuracy > 30).length,
    [features],
  );
  const readiness = useMemo(
    () =>
      exportReadiness({
        featureCount: features.length,
        privacyVisibility,
        qualityIssues: qualityIssueCount,
        sensitiveCount: sensitiveFeatureCount,
      }),
    [features.length, privacyVisibility, qualityIssueCount, sensitiveFeatureCount],
  );

  function changeMode(mode: MapWorkspaceMode): void {
    setActiveMode(mode);
    if (mode === "explore") {
      onDrawModeChange(false);
      onCancelBoundaryDraw();
      return;
    }
    if (mode === "analyze") {
      onDensityModeChange(true);
      onDrawModeChange(false);
      return;
    }
    if (mode === "draw") {
      onDrawModeChange(false);
      onAreaBoundsChange(null);
      if (!boundaryDrawMode && boundaryDrawPoints.length === 0) onStartBoundaryDraw("polygon");
      return;
    }
    if (mode === "assign") {
      onCancelBoundaryDraw();
      onAreaBoundsChange(null);
      onDrawModeChange(true);
      return;
    }
    onDrawModeChange(false);
    onCancelBoundaryDraw();
  }

  function applySavedView(view: SavedMapView): void {
    changeMode(view.mode);
    onBasemapChange(view.basemap);
    onDensityModeChange(view.densityMode);
    onFiltersChange(view.filters);
  }

  function saveCurrentView(): void {
    const name = saveViewName.trim();
    if (!name) return;
    setSavedViews((current) => [
      {
        basemap,
        createdAt: new Date().toISOString(),
        densityMode,
        filters,
        id: `saved-map-view-${Date.now()}`,
        mode: activeMode,
        name,
      },
      ...current.filter((view) => view.name.toLowerCase() !== name.toLowerCase()),
    ]);
    setSaveViewName("");
  }

  function toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void mapContainerRef.current?.requestFullscreen().then(() => {
        window.setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
      });
    }
  }

  useEffect(() => {
    function handleFullscreenChange(): void {
      mapInstanceRef.current?.invalidateSize();
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <section className="grid gap-4">
      <div className="overflow-hidden rounded-2xl border bg-panel shadow-line">
        <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Map Overview</h2>
              <HelpHint label="About this map" title={activeInfo.label}>{activeInfo.description}</HelpHint>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Filter records above the map, draw/select an area on the map, then create assignments or export the filtered view.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="relative min-w-48">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input
                className="pl-9"
                onChange={(event) => onMapQueryChange(event.target.value)}
                placeholder="Search project, location, layer"
                value={mapQuery}
              />
            </label>
            <Select value={basemap} onChange={(event) => onBasemapChange(event.target.value as MapBasemap)}>
              {basemaps.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
            <Button onClick={toggleFullscreen} size="sm" variant="secondary"><Maximize2 aria-hidden="true" /> Full screen map</Button>
            <Button onClick={() => window.print()} size="sm" variant="secondary"><Printer aria-hidden="true" /> Print</Button>
          </div>
        </div>
        <div className="border-b bg-background/80 p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-1 overflow-x-auto product-scrollbar" aria-label="Map workspace modes">
              {mapWorkspaceModes.map((mode) => (
                <button
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    activeMode === mode.id
                      ? "border-primary bg-primary text-primary-foreground shadow-line"
                      : "bg-panel text-foreground hover:border-primary/40 hover:bg-primary/5",
                  )}
                  key={mode.id}
                  onClick={() => changeMode(mode.id)}
                  type="button"
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground xl:max-w-xl">
              <span className="font-semibold text-foreground">{activeModeInfo.label}:</span> {activeModeInfo.description}
            </div>
          </div>
        </div>
        <div className="grid gap-2 border-b bg-background/60 p-3 md:grid-cols-2 2xl:grid-cols-6">
          <Select aria-label="Filter by project" value={filters.project} onChange={(event) => onFiltersChange({ ...filters, project: event.target.value })}>
            <option value="">All projects</option>
            {filterOptions.projects.map((project) => <option key={project} value={project}>{project}</option>)}
          </Select>
          <Select aria-label="Filter by layer category" value={filters.category} onChange={(event) => onFiltersChange({ ...filters, category: event.target.value })}>
            <option value="">All map types</option>
            {filterOptions.categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </Select>
          <Select aria-label="Filter by spatial status" value={filters.status} onChange={(event) => onFiltersChange({ ...filters, status: event.target.value })}>
            <option value="">All statuses</option>
            {filterOptions.statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </Select>
          <Select aria-label="Filter by data source" value={filters.source} onChange={(event) => onFiltersChange({ ...filters, source: event.target.value })}>
            <option value="">All sources</option>
            {filterOptions.sources.map((source) => <option key={source} value={source}>{source}</option>)}
          </Select>
          <Select aria-label="Filter by location" value={filters.location} onChange={(event) => onFiltersChange({ ...filters, location: event.target.value })}>
            <option value="">All locations</option>
            {filterOptions.locations.map((location) => <option key={location} value={location}>{location}</option>)}
          </Select>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => onDensityModeChange(!densityMode)} size="sm" variant={densityMode ? "primary" : "secondary"}>
              {densityMode ? "Density on" : "Density view"}
            </Button>
            <Button className="flex-1" onClick={() => onFiltersChange(emptyMapFeatureFilters())} size="sm" variant="secondary">
              Clear
            </Button>
          </div>
        </div>
        <div className="relative h-[calc(100vh-250px)] min-h-[620px] overflow-hidden" ref={mapContainerRef}>
          <LeafletMap
            areaBounds={areaBounds}
            basemap={basemap}
            boundaryDrawMode={boundaryDrawMode}
            boundaryDrawPoints={boundaryDrawPoints}
            boundaryShapes={visibleBoundaryShapes}
            drawMode={drawMode}
            drawnBoundaries={drawnBoundaries}
            densityMode={densityMode}
            featureOpacityByCategory={featureOpacityByCategory}
            features={features}
            onAreaBoundsChange={onAreaBoundsChange}
            onBoundaryDrawComplete={onBoundaryDrawComplete}
            onBoundaryDrawPoint={onBoundaryDrawPoint}
            onFeatureSelect={onFeatureSelect}
            onMapReady={(map) => {
              mapInstanceRef.current = map;
            }}
            privacyVisibility={privacyVisibility}
            selectedFeature={selectedFeature}
          />
          <div className="pointer-events-none absolute inset-0 z-[1000]">
            <div className="pointer-events-auto absolute left-4 top-4">
              <Button className="shadow-elevated" onClick={toggleFullscreen} size="sm" variant="primary">
                <Maximize2 aria-hidden="true" />
                Full screen map
              </Button>
            </div>
            <div className="pointer-events-auto absolute bottom-4 left-4 rounded-xl border bg-panel/95 p-3 shadow-line">
              <p className="text-xs font-semibold">Legend</p>
              <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                {legendStatusItems.map((item) => (
                  <LegendItem color={item.color} key={item.label} label={`${item.label} (${item.count})`} />
                ))}
                <div className="my-1 border-t" />
                {legendCategoryItems.slice(0, 6).map((item) => (
                  <LegendItem color={item.color} key={item.label} label={`${item.label} (${item.count})`} />
                ))}
                {showBoundaryShapes ? <LegendItem color="border-2 border-primary bg-transparent" label="Project extent (observed boundary)" /> : null}
              </div>
            </div>
            <div className="pointer-events-auto absolute right-4 top-4 max-w-64 rounded-xl border bg-panel/95 p-3 text-xs shadow-line">
              <p className="font-semibold">Draw / select area</p>
              {areaBounds ? (
                <>
                  <p className="mt-1 text-muted-foreground">
                    {features.length} feature{features.length === 1 ? "" : "s"} inside the drawn area.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Target: {areaAssignmentSummary.targetCount.toLocaleString()} record{areaAssignmentSummary.targetCount === 1 ? "" : "s"} · {areaAssignmentSummary.entityIds.length} entity/facility link{areaAssignmentSummary.entityIds.length === 1 ? "" : "s"}
                  </p>
                  <Button className="mt-2 w-full" disabled={!features.length} onClick={onCreateAreaAssignment} size="sm" variant="primary">
                    Create assignment from area
                  </Button>
                  <Button className="mt-2 w-full" onClick={() => onAreaBoundsChange(null)} size="sm" variant="secondary">
                    Clear area filter
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-1 text-muted-foreground">
                    {drawMode ? "Drag on the map to draw a bounding box." : "Drag on the map to filter features by area."}
                  </p>
                  <Button
                    className="mt-2 w-full"
                    onClick={() => {
                      if (!drawMode) onAreaBoundsChange(null);
                      onDrawModeChange(!drawMode);
                    }}
                    size="sm"
                    variant={drawMode ? "secondary" : "primary"}
                  >
                    {drawMode ? "Cancel drawing" : "Draw area"}
                  </Button>
                  <div className="mt-3 border-t pt-3">
                    <p className="font-semibold">Boundary sketch</p>
                    <p className="mt-1 text-muted-foreground">
                      {boundaryDrawMode === "polygon"
                        ? `${boundaryDrawPoints.length} point${boundaryDrawPoints.length === 1 ? "" : "s"} placed. Click the zoomed map to add points.`
                        : boundaryDrawMode === "rectangle"
                          ? "Drag on the map to sketch a rectangle boundary."
                          : boundaryDrawPoints.length
                            ? `${boundaryDrawPoints.length} point${boundaryDrawPoints.length === 1 ? "" : "s"} saved. Pan, zoom, or resume drawing.`
                            : "Zoom or fullscreen the map first, then place polygon points."}
                    </p>
                    <div className="mt-2 grid gap-2">
                      {boundaryDrawMode ? (
                        <>
                          {boundaryDrawMode === "polygon" ? (
                            <>
                              <Button onClick={onPauseBoundaryDraw} size="sm" variant="secondary">
                                Pause to zoom/pan
                              </Button>
                              <Button disabled={boundaryDrawPoints.length < 3} onClick={onFinishBoundaryDraw} size="sm" variant="primary">
                                <FileJson aria-hidden="true" />
                                Finish polygon
                              </Button>
                            </>
                          ) : null}
                          <Button onClick={onCancelBoundaryDraw} size="sm" variant="secondary">
                            Clear boundary
                          </Button>
                        </>
                      ) : boundaryDrawPoints.length ? (
                        <>
                          <Button onClick={() => onStartBoundaryDraw("polygon")} size="sm" variant="primary">
                            <PenLine aria-hidden="true" />
                            Resume polygon
                          </Button>
                          <Button disabled={boundaryDrawPoints.length < 3} onClick={onFinishBoundaryDraw} size="sm" variant="secondary">
                            <FileJson aria-hidden="true" />
                            Finish polygon
                          </Button>
                          <Button onClick={onCancelBoundaryDraw} size="sm" variant="secondary">
                            Clear boundary
                          </Button>
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <Button onClick={() => onStartBoundaryDraw("polygon")} size="sm" variant="secondary">
                            <PenLine aria-hidden="true" />
                            Polygon
                          </Button>
                          <Button onClick={() => onStartBoundaryDraw("rectangle")} size="sm" variant="secondary">
                            <Square aria-hidden="true" />
                            Rectangle
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            {selectedFeature ? (
              <MapInspectorCard
                feature={selectedFeature}
                onOpenFeatureSource={onOpenFeatureSource}
                privacyVisibility={privacyVisibility}
              />
            ) : null}
          </div>
        </div>
      </div>

      <aside className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border bg-panel p-3 shadow-line">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">GIS controls</h2>
              <p className="mt-1 text-xs text-muted-foreground">Turn layers on/off and adjust visibility.</p>
            </div>
            <Layers aria-hidden="true" className="text-primary" size={18} />
          </div>
          <div className="mt-3 max-h-[360px] space-y-3 overflow-y-auto pr-1 product-scrollbar">
            {groupedLayers.map((group) => (
              <section className="rounded-xl border bg-background/60 p-2.5" key={group.label}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{group.label}</p>
                  <Badge tone="neutral">{group.layers.length}</Badge>
                </div>
                <div className="space-y-2">
                  {group.layers.map((layer) => (
                    <div className={cn("rounded-lg border bg-panel p-2 transition", layerVisibility[layer.id] === false && "opacity-60")} key={layer.id}>
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          checked={layerVisibility[layer.id] !== false}
                          className="mt-1 accent-primary"
                          onChange={(event) => onLayerVisibilityChange(layer.id, event.target.checked)}
                          type="checkbox"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{layer.name}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{layer.geometryType} · {layer.featureCount.toLocaleString()} features</span>
                        </span>
                        <Badge tone={visibilityTone(layer.visibility)}>{layer.visibility}</Badge>
                      </label>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">Opacity</span>
                        <input
                          aria-label={`${layer.name} opacity`}
                          className="min-w-0 flex-1 accent-primary"
                          max={100}
                          min={20}
                          onChange={(event) => onLayerOpacityChange(layer.id, Number(event.target.value))}
                          type="range"
                          value={layerOpacity[layer.id] ?? 100}
                        />
                        <button className="text-xs font-medium text-primary hover:underline" onClick={() => setMetadataLayer(layer)} type="button">
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-panel p-3 shadow-line">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Workspace settings</h2>
              <p className="mt-1 text-xs text-muted-foreground">Privacy, mode guidance, and map readiness.</p>
            </div>
            <Filter aria-hidden="true" className="text-primary" size={18} />
          </div>
          <div className="mt-3 grid gap-2">
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-sm font-semibold">Boundary workflow</p>
              <div className="mt-3 grid gap-2">
                <WorkflowStep complete={drawnBoundaries.length > 0 || boundaryShapes.length > 0} label="Draw or upload boundary" />
                <WorkflowStep complete={boundaryShapes.length > 0} label="Compare with GPS evidence" />
                <WorkflowStep complete={false} label="Validate geometry and overlaps" />
                <WorkflowStep complete={false} label="Approve as official boundary" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Sketched boundaries can be exported as GeoJSON now. Official approval and overlap validation require the backend GIS registry.
              </p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Export readiness</p>
                  <p className="mt-1 text-xs text-muted-foreground">Checks privacy, visible records, and spatial quality before download.</p>
                </div>
                <Badge tone={readiness.tone}>{readiness.score}% · {readiness.label}</Badge>
              </div>
              <div className="mt-3 grid gap-2">
                <Signal label="Visible export records" value={features.length.toLocaleString()} tone={features.length ? "success" : "danger"} />
                <Signal label="Sensitive records" value={sensitiveFeatureCount.toLocaleString()} tone={sensitiveFeatureCount ? "warning" : "success"} />
                <Signal label="Spatial issues" value={qualityIssueCount.toLocaleString()} tone={qualityIssueCount ? "warning" : "success"} />
              </div>
              {[...readiness.blockers, ...readiness.recommendations].length ? (
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {[...readiness.blockers, ...readiness.recommendations].map((item) => (
                    <p key={item}>• {item}</p>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Saved views</p>
                  <p className="mt-1 text-xs text-muted-foreground">Open common GIS views or save the current filters.</p>
                </div>
                <Badge tone="accent">{savedViews.length}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {savedViews.map((view) => (
                  <Button key={view.id} onClick={() => applySavedView(view)} size="sm" variant={view.createdAt === "preset" ? "secondary" : "primary"}>
                    {view.name}
                  </Button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  aria-label="Saved map view name"
                  onChange={(event) => setSaveViewName(event.target.value)}
                  placeholder="Name this view"
                  value={saveViewName}
                />
                <Button disabled={!saveViewName.trim()} onClick={saveCurrentView} size="sm" variant="secondary">
                  Save
                </Button>
              </div>
            </div>
            <Signal label="Active mode" value={activeModeInfo.label} tone="accent" />
            <Signal
              label="Location visibility"
              value={privacyVisibility === "Aggregated" ? "Coordinates masked" : "Internal exact view"}
              tone={privacyVisibility === "Aggregated" ? "warning" : "success"}
            />
            <Signal label="Visible records" value={features.length.toLocaleString()} />
            {selectedFeature ? (
              <Signal label="Selected source" value={featureSource(selectedFeature)} tone="neutral" />
            ) : (
              <EmptyMini label="Click a map point to inspect its source, quality, and next action." />
            )}
          </div>
        </section>
      </aside>
      <LayerDetailsModal
        layer={metadataLayer}
        onOpenChange={(open) => {
          if (!open) setMetadataLayer(null);
        }}
      />
    </section>
  );
}

function MapInspectorCard({
  feature,
  onOpenFeatureSource,
  privacyVisibility,
}: {
  feature: MapFeatureRecord;
  onOpenFeatureSource: (feature: MapFeatureRecord) => void;
  privacyVisibility: LayerVisibility;
}) {
  return (
    <aside className="pointer-events-auto absolute bottom-4 right-4 max-h-[52%] w-[min(360px,calc(100%-2rem))] overflow-y-auto rounded-2xl border bg-panel/95 p-3 shadow-elevated backdrop-blur product-scrollbar">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{feature.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{feature.category} · {feature.project}</p>
        </div>
        <Badge tone={statusTone(feature.status)}>{feature.status}</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        <Signal label="Location" value={feature.location} />
        <Signal
          label="Coordinates"
          value={`${maskCoordinate(feature.latitude, privacyVisibility)}, ${maskCoordinate(feature.longitude, privacyVisibility)}`}
          tone={privacyVisibility === "Aggregated" ? "warning" : "accent"}
        />
        <Signal label="GPS accuracy" value={`${feature.gpsAccuracy}m`} tone={feature.gpsAccuracy <= 30 ? "success" : "warning"} />
        <Signal label="Quality score" value={`${feature.qualityScore}%`} tone={coverageTone(feature.qualityScore)} />
        <Signal label="Source" value={featureSource(feature)} />
      </div>
      <div className="mt-3 rounded-xl border bg-background/70 p-3">
        <p className="text-xs font-semibold">Record details</p>
        <div className="mt-2 space-y-2">
          {Object.entries(feature.popup).map(([label, value]) => (
            <div className="flex justify-between gap-3 text-xs" key={label}>
              <span className="text-muted-foreground">{label}</span>
              <span className="text-right font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <Button className="mt-3 w-full" onClick={() => onOpenFeatureSource(feature)} size="sm" variant="primary">
        Open source module
      </Button>
    </aside>
  );
}

function SectionContent({
  activeSection,
  boundaries,
  coverage,
  drawnBoundaries,
  indicatorGeography,
  mapFeatures,
  mapLayers,
  onDeleteDrawnBoundary,
  onExportDrawnBoundary,
  onFeatureSelect,
  onOpenIndicators,
  projectDataCoverage,
  onOpenDataQuality,
  onViewProjectExtent,
  preview,
  privacyVisibility,
  projectExtents,
  sectionInfo,
  selectedFeature,
  setActiveSection,
  spatialIssues,
}: {
  activeSection: MappingSection;
  boundaries: BoundaryRecord[];
  coverage: CoverageRecord[];
  drawnBoundaries: DrawnBoundary[];
  indicatorGeography: IndicatorGeography[];
  mapFeatures: MapFeatureRecord[];
  mapLayers: MapLayerRecord[];
  onDeleteDrawnBoundary: (id: string) => void;
  onExportDrawnBoundary: (boundary: DrawnBoundary) => void;
  onFeatureSelect: (feature: MapFeatureRecord) => void;
  onOpenIndicators: () => void;
  projectDataCoverage: ProjectDataCoverage[];
  onOpenDataQuality: () => void;
  onViewProjectExtent: (extent: ProjectExtent) => void;
  preview: boolean;
  privacyVisibility: LayerVisibility;
  projectExtents: ProjectExtent[];
  sectionInfo: { description: string; label: string; route: string };
  selectedFeature: MapFeatureRecord | null;
  setActiveSection: (section: MappingSection) => void;
  spatialIssues: SpatialQualityIssue[];
}) {
  if (activeSection === "layers") return <LayersTable features={mapFeatures} layers={mapLayers} onFeatureSelect={onFeatureSelect} privacyVisibility={privacyVisibility} />;
  if (activeSection === "boundaries") {
    return (
      <BoundariesTable
        boundaries={boundaries}
        drawnBoundaries={drawnBoundaries}
        features={mapFeatures}
        onDeleteDrawnBoundary={onDeleteDrawnBoundary}
        onExportDrawnBoundary={onExportDrawnBoundary}
        privacyVisibility={privacyVisibility}
      />
    );
  }
  if (activeSection === "coverage-maps") return <CoverageWorkspace coverage={coverage} features={mapFeatures} preview={preview} privacyVisibility={privacyVisibility} projectDataCoverage={projectDataCoverage} />;
  if (activeSection === "field-officer-maps") return <FieldOfficerMapWorkspace features={mapFeatures} onFeatureSelect={onFeatureSelect} privacyVisibility={privacyVisibility} />;
  if (activeSection === "facility-maps") return <FacilityMapWorkspace features={mapFeatures} onFeatureSelect={onFeatureSelect} privacyVisibility={privacyVisibility} />;
  if (activeSection === "indicator-maps") return <IndicatorWorkspace indicatorGeography={indicatorGeography} onOpenIndicators={onOpenIndicators} />;
  if (activeSection === "data-quality-maps") {
    return <SpatialQualityWorkspace features={mapFeatures} issues={spatialIssues} onFeatureSelect={onFeatureSelect} onOpenDataQuality={onOpenDataQuality} />;
  }
  if (activeSection === "project-maps" && !preview) {
    return <ProjectOverviewWorkspace extents={projectExtents} features={mapFeatures} onFeatureSelect={onFeatureSelect} onViewOnMap={onViewProjectExtent} privacyVisibility={privacyVisibility} />;
  }

  const features = filterFeaturesBySection(mapFeatures, activeSection);
  const columns: TableColumn<MapFeatureRecord>[] = [
    { key: "label", header: "Map Feature", value: (row) => row.label, render: (row) => <span className="font-medium">{row.label}</span> },
    { key: "project", header: "Project", value: (row) => row.project, render: (row) => row.project },
    { key: "location", header: "Location", value: (row) => row.location, render: (row) => row.location },
    { key: "coordinates", header: "Coordinates", value: (row) => `${row.latitude},${row.longitude}`, render: (row) => `${maskCoordinate(row.latitude, privacyVisibility)}, ${maskCoordinate(row.longitude, privacyVisibility)}` },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "quality", header: "Quality", align: "right", value: (row) => String(row.qualityScore), render: (row) => <Badge tone={coverageTone(row.qualityScore)}>{row.qualityScore}%</Badge> },
  ];

  return (
    <section className="space-y-4">
      <SectionHeader
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setActiveSection("layers")} variant="secondary"><Layers aria-hidden="true" /> Manage layers</Button>
            <Button onClick={() => setActiveSection("boundaries")} variant="secondary"><Map aria-hidden="true" /> Boundaries</Button>
          </div>
        }
        route={sectionInfo.route}
        title={sectionInfo.label}
        description={sectionInfo.description}
      />
      {selectedFeature?.sensitive ? (
        <section className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm font-semibold">Privacy control applied</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">This layer contains sensitive household or beneficiary locations. Unauthorized users see masked coordinates or aggregated district-level geography.</p>
        </section>
      ) : null}
      <DataTable columns={columns} emptyLabel="No map features match this view yet" rows={features} searchLabel="Search map features, projects, locations" title="Companion spatial table" />
    </section>
  );
}

function ProjectOverviewWorkspace({
  extents,
  features,
  onFeatureSelect,
  onViewOnMap,
  privacyVisibility,
}: {
  extents: ProjectExtent[];
  features: MapFeatureRecord[];
  onFeatureSelect: (feature: MapFeatureRecord) => void;
  onViewOnMap: (extent: ProjectExtent) => void;
  privacyVisibility: LayerVisibility;
}) {
  const [selectedProject, setSelectedProject] = useState("");
  const sourceFeatures = selectedProject ? features.filter((feature) => feature.project === selectedProject) : [];
  const columns: TableColumn<MapFeatureRecord>[] = [
    { key: "label", header: "GPS record", value: (row) => row.label, render: (row) => <span className="font-medium">{row.label}</span> },
    { key: "category", header: "Type", value: (row) => row.category, render: (row) => row.category },
    { key: "location", header: "Location", value: (row) => row.location, render: (row) => row.location },
    { key: "coordinates", header: "Coordinates", value: (row) => `${row.latitude},${row.longitude}`, render: (row) => `${maskCoordinate(row.latitude, privacyVisibility)}, ${maskCoordinate(row.longitude, privacyVisibility)}` },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "quality", header: "Quality", align: "right", value: (row) => String(row.qualityScore), render: (row) => <Badge tone={coverageTone(row.qualityScore)}>{row.qualityScore}%</Badge> },
    { key: "action", header: "Action", align: "right", render: (row) => <Button onClick={() => onFeatureSelect(row)} size="sm" variant="secondary">Inspect</Button> },
  ];

  return (
    <section className="space-y-4">
      <SectionHeader
        description="Project extent computed from GPS-tagged submissions and records. This is a coverage proxy, not official boundary geometry — boundary uploads are on our roadmap."
        route="/mapping/project-maps"
        title="Project Maps"
      />
      {extents.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {extents.map((extent) => (
            <article className="rounded-xl border bg-panel p-3 shadow-line" key={extent.project}>
              <h2 className="text-sm font-semibold">{extent.project}</h2>
              <div className="mt-3 grid gap-2">
                <Signal label="GPS-tagged points" value={extent.pointCount.toLocaleString()} />
                <Signal label="Centroid" value={`${extent.centroidLat.toFixed(4)}, ${extent.centroidLng.toFixed(4)}`} />
                <Signal label="Latitude range" value={`${extent.minLat.toFixed(4)} to ${extent.maxLat.toFixed(4)}`} />
                <Signal label="Longitude range" value={`${extent.minLng.toFixed(4)} to ${extent.maxLng.toFixed(4)}`} />
              </div>
              <Button className="mt-3" onClick={() => onViewOnMap(extent)} size="sm" variant="secondary">
                View on map
              </Button>
              <Button className="mt-2" onClick={() => setSelectedProject(extent.project)} size="sm" variant="secondary">
                View source records
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyMini label="No GPS-tagged submissions or records yet. Project extent will appear here once field data includes GPS coordinates." />
      )}
      <DataTable
        columns={columns}
        emptyDescription="Click View source records on a project extent to inspect the GPS points behind it."
        emptyLabel="No project selected"
        rows={sourceFeatures}
        searchLabel="Search project GPS records"
        title={selectedProject ? `${selectedProject} source records` : "Project extent source records"}
      />
    </section>
  );
}

function layerCategory(layer: MapLayerRecord): MapFeatureRecord["category"] | null {
  const match = layer.id.match(/^live-layer-(.+)$/);
  if (!match) return null;
  const category = match[1];
  const normalized = category
    .split(/[\s-]+/u)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  if (["Project", "Submission", "Beneficiary", "Facility", "Coverage", "Indicator", "Quality", "Assignment", "Field Officer"].includes(normalized)) {
    return normalized as MapFeatureRecord["category"];
  }
  return null;
}

function LayersTable({
  features,
  layers,
  onFeatureSelect,
  privacyVisibility,
}: {
  features: MapFeatureRecord[];
  layers: MapLayerRecord[];
  onFeatureSelect: (feature: MapFeatureRecord) => void;
  privacyVisibility: LayerVisibility;
}) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [metadataLayer, setMetadataLayer] = useState<MapLayerRecord | null>(null);
  const [sourceLayer, setSourceLayer] = useState<MapLayerRecord | null>(null);
  const [uploadedLayers, setUploadedLayers] = useState<MapLayerRecord[]>([]);
  const tableLayers = useMemo(() => [...uploadedLayers, ...layers], [layers, uploadedLayers]);
  const sourceCategory = sourceLayer ? layerCategory(sourceLayer) : null;
  const sourceFeatures = sourceCategory ? features.filter((feature) => feature.category === sourceCategory) : [];
  const healthyLayers = tableLayers.filter((layer) => layer.status === "Healthy");
  const reviewLayers = tableLayers.filter((layer) => layer.status !== "Healthy");
  const restrictedLayers = tableLayers.filter((layer) => layer.visibility === "Restricted" || layer.visibility === "Aggregated");
  const totalFeatures = tableLayers.reduce((sum, layer) => sum + layer.featureCount, 0);
  function registerLayerUpload(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const uploads = files.map(uploadedLayerFromFile);
    setUploadedLayers((current) => [...uploads, ...current]);
    pushToast({
      title: "Layer file registered",
      description: `${uploads.length} file${uploads.length === 1 ? "" : "s"} added to the layer registry for GIS processing.`,
      tone: "success",
    });
    event.target.value = "";
  }
  const columns: TableColumn<MapLayerRecord>[] = [
    { key: "name", header: "Layer", value: (row) => row.name, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "type", header: "Type", value: (row) => row.type, render: (row) => row.type },
    { key: "visibility", header: "Visibility", value: (row) => row.visibility, render: (row) => <Badge tone={visibilityTone(row.visibility)}>{row.visibility}</Badge> },
    { key: "geometry", header: "Geometry", value: (row) => row.geometryType, render: (row) => row.geometryType },
    { key: "features", header: "Features", align: "right", value: (row) => String(row.featureCount), render: (row) => row.featureCount.toLocaleString() },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button onClick={() => setSourceLayer(row)} size="sm" variant="secondary"><MapPin aria-hidden="true" /> Sources</Button>
          <Button onClick={() => setMetadataLayer(row)} size="sm" variant="secondary"><Eye aria-hidden="true" /> Metadata</Button>
        </div>
      ),
    },
  ];
  const sourceColumns: TableColumn<MapFeatureRecord>[] = [
    { key: "label", header: "Source record", value: (row) => row.label, render: (row) => <span className="font-medium">{row.label}</span> },
    { key: "project", header: "Project", value: (row) => row.project, render: (row) => row.project },
    { key: "location", header: "Location", value: (row) => row.location, render: (row) => row.location },
    { key: "coordinates", header: "Coordinates", value: (row) => `${row.latitude},${row.longitude}`, render: (row) => `${maskCoordinate(row.latitude, privacyVisibility)}, ${maskCoordinate(row.longitude, privacyVisibility)}` },
    { key: "accuracy", header: "GPS", align: "right", value: (row) => String(row.gpsAccuracy), render: (row) => `${row.gpsAccuracy}m` },
    { key: "quality", header: "Quality", align: "right", value: (row) => String(row.qualityScore), render: (row) => <Badge tone={coverageTone(row.qualityScore)}>{row.qualityScore}%</Badge> },
    { key: "action", header: "Action", align: "right", render: (row) => <Button onClick={() => onFeatureSelect(row)} size="sm" variant="secondary">Inspect</Button> },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader
        action={
          <>
            <input
              accept=".geojson,.json,.kml,.csv,.zip"
              className="hidden"
              multiple
              onChange={registerLayerUpload}
              ref={uploadInputRef}
              type="file"
            />
            <Button onClick={() => uploadInputRef.current?.click()} variant="primary">
              <Upload aria-hidden="true" /> Upload GeoJSON, KML, Shapefile, or CSV
            </Button>
          </>
        }
        description="Review live point layers derived from submissions and entity records. Uploaded GIS files are registered here for processing and governance review."
        route="/mapping/layers"
        title="Map Layers"
      />
      <div className="grid gap-3 md:grid-cols-4">
        <Signal label="Registered layers" value={tableLayers.length.toLocaleString()} tone={tableLayers.length ? "success" : "warning"} />
        <Signal label="Healthy layers" value={healthyLayers.length.toLocaleString()} tone={healthyLayers.length ? "success" : "warning"} />
        <Signal label="Needs review" value={reviewLayers.length.toLocaleString()} tone={reviewLayers.length ? "warning" : "success"} />
        <Signal label="Layer features" value={totalFeatures.toLocaleString()} tone="accent" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Layer governance">
          <Signal label="Restricted or aggregated" value={`${restrictedLayers.length} layer(s)`} tone={restrictedLayers.length ? "warning" : "success"} />
          <Signal label="Uploaded pending files" value={`${uploadedLayers.length} layer(s)`} tone={uploadedLayers.length ? "warning" : "neutral"} />
          <Signal label="Live data layers" value={`${layers.length} layer(s)`} tone={layers.length ? "success" : "warning"} />
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-sm font-semibold">Recommended action</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Review restricted layers before export, inspect source records for warning layers, and validate uploaded GIS files before using them for official reporting.
            </p>
          </div>
        </Panel>
        <Panel title="Upload readiness">
          <WorkflowStep complete={uploadedLayers.length > 0 || layers.length > 0} label="Layer registered" />
          <WorkflowStep complete={sourceLayer !== null} label="Source records inspected" />
          <WorkflowStep complete={reviewLayers.length === 0 && tableLayers.length > 0} label="No warning/critical layer status" />
          <WorkflowStep complete={false} label="Backend GIS validation approved" />
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Files selected here are registered for the workspace. Formal geometry validation, version approval, and audit persistence require the GIS backend registry.
          </p>
        </Panel>
      </div>
      <DataTable columns={columns} emptyLabel="No live GPS records yet. Layers appear after submissions, entities, or selected GIS files include coordinates." rows={tableLayers} searchLabel="Search layers, owners, sources" title="Spatial layer registry" />
      <DataTable
        columns={sourceColumns}
        emptyDescription="Click Sources on a layer to inspect the live GPS records that created it."
        emptyLabel="No layer selected"
        rows={sourceFeatures}
        searchLabel="Search layer source records"
        title={sourceLayer ? `${sourceLayer.name} source records` : "Layer source records"}
      />
      <LayerDetailsModal
        layer={metadataLayer}
        onOpenChange={(open) => {
          if (!open) setMetadataLayer(null);
        }}
      />
    </section>
  );
}

function boundaryProjectName(boundary: BoundaryRecord): string {
  return boundary.name.replace(/ observed extent$/u, "");
}

function BoundariesTable({
  boundaries,
  drawnBoundaries,
  features,
  onDeleteDrawnBoundary,
  onExportDrawnBoundary,
  privacyVisibility,
}: {
  boundaries: BoundaryRecord[];
  drawnBoundaries: DrawnBoundary[];
  features: MapFeatureRecord[];
  onDeleteDrawnBoundary: (id: string) => void;
  onExportDrawnBoundary: (boundary: DrawnBoundary) => void;
  privacyVisibility: LayerVisibility;
}) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [historyBoundary, setHistoryBoundary] = useState<BoundaryRecord | null>(null);
  const [sourceBoundary, setSourceBoundary] = useState<BoundaryRecord | null>(null);
  const [uploadedBoundaries, setUploadedBoundaries] = useState<BoundaryRecord[]>([]);
  const drawnBoundaryRecords = useMemo(() => drawnBoundaries.map(boundaryFromDrawnShape), [drawnBoundaries]);
  const drawnBoundaryById = useMemo(
    () => new globalThis.Map(drawnBoundaries.map((boundary) => [boundary.id, boundary])),
    [drawnBoundaries],
  );
  const tableBoundaries = useMemo(
    () => [...drawnBoundaryRecords, ...uploadedBoundaries, ...boundaries],
    [boundaries, drawnBoundaryRecords, uploadedBoundaries],
  );
  const sourceProject = sourceBoundary ? boundaryProjectName(sourceBoundary) : "";
  const sourceFeatures = sourceProject ? features.filter((feature) => feature.project === sourceProject) : [];
  function registerBoundaryUpload(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const uploads = files.map(uploadedBoundaryFromFile);
    setUploadedBoundaries((current) => [...uploads, ...current]);
    pushToast({
      title: "Boundary file registered",
      description: `${uploads.length} boundary file${uploads.length === 1 ? "" : "s"} added for geometry validation and approval.`,
      tone: "success",
    });
    event.target.value = "";
  }
  const columns: TableColumn<BoundaryRecord>[] = [
    { key: "name", header: "Boundary", value: (row) => row.name, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "type", header: "Type", value: (row) => row.type, render: (row) => row.type },
    { key: "parent", header: "Parent", value: (row) => row.parent, render: (row) => row.parent },
    { key: "coverage", header: "Coverage", align: "right", value: (row) => String(row.coveragePercent), render: (row) => <Badge tone={coverageTone(row.coveragePercent)}>{row.coveragePercent}%</Badge> },
    { key: "geometry", header: "Geometry", value: (row) => row.geometryStatus, render: (row) => <Badge tone={statusTone(row.geometryStatus)}>{row.geometryStatus}</Badge> },
    { key: "version", header: "Version", value: (row) => row.version, render: (row) => row.version },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => {
        const drawnBoundary = drawnBoundaryById.get(row.id);
        return (
          <div className="flex flex-wrap justify-end gap-1.5">
            {drawnBoundary ? (
              <>
                <Button onClick={() => onExportDrawnBoundary(drawnBoundary)} size="sm" variant="secondary"><FileJson aria-hidden="true" /> Export</Button>
                <Button onClick={() => onDeleteDrawnBoundary(drawnBoundary.id)} size="sm" variant="secondary"><Trash2 aria-hidden="true" /> Remove</Button>
              </>
            ) : (
              <>
                <Button onClick={() => setSourceBoundary(row)} size="sm" variant="secondary"><MapPin aria-hidden="true" /> Sources</Button>
                <Button onClick={() => setHistoryBoundary(row)} size="sm" variant="secondary"><Archive aria-hidden="true" /> History</Button>
              </>
            )}
          </div>
        );
      },
    },
  ];
  const sourceColumns: TableColumn<MapFeatureRecord>[] = [
    { key: "label", header: "Boundary source", value: (row) => row.label, render: (row) => <span className="font-medium">{row.label}</span> },
    { key: "category", header: "Type", value: (row) => row.category, render: (row) => row.category },
    { key: "location", header: "Location", value: (row) => row.location, render: (row) => row.location },
    { key: "coordinates", header: "Coordinates", value: (row) => `${row.latitude},${row.longitude}`, render: (row) => `${maskCoordinate(row.latitude, privacyVisibility)}, ${maskCoordinate(row.longitude, privacyVisibility)}` },
    { key: "quality", header: "Quality", align: "right", value: (row) => String(row.qualityScore), render: (row) => <Badge tone={coverageTone(row.qualityScore)}>{row.qualityScore}%</Badge> },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader
        action={
          <>
            <input
              accept=".geojson,.json,.kml,.zip"
              className="hidden"
              multiple
              onChange={registerBoundaryUpload}
              ref={uploadInputRef}
              type="file"
            />
            <Button onClick={() => uploadInputRef.current?.click()} variant="primary">
              <Upload aria-hidden="true" /> Upload boundary
            </Button>
          </>
        }
        description="Review project extents derived from GPS evidence and register official boundary files for validation and governance approval."
        route="/mapping/boundaries"
        title="Boundaries"
      />
      <DataTable columns={columns} emptyLabel="No GPS-derived project extents yet. Boundaries appear after projects have located records or selected boundary files." rows={tableBoundaries} searchLabel="Search boundaries, codes, hierarchy" title="Boundary registry" />
      <DataTable
        columns={sourceColumns}
        emptyDescription="Click Sources on a boundary to inspect the GPS records used to derive its observed project extent."
        emptyLabel="No boundary selected"
        rows={sourceFeatures}
        searchLabel="Search boundary source records"
        title={sourceBoundary ? `${sourceBoundary.name} source records` : "Boundary source records"}
      />
      <BoundaryDetailsModal
        boundary={historyBoundary}
        onOpenChange={(open) => {
          if (!open) setHistoryBoundary(null);
        }}
      />
    </section>
  );
}

function LayerDetailsModal({ layer, onOpenChange }: { layer: MapLayerRecord | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Modal onOpenChange={onOpenChange} open={Boolean(layer)} title={layer?.name ?? "Layer metadata"}>
      {layer ? (
        <div className="space-y-3 p-5">
          <p className="text-sm leading-6 text-muted-foreground">{layer.description}</p>
          <div className="space-y-2">
            <Signal label="Type" value={layer.type} />
            <Signal label="Source" value={layer.source} />
            <Signal label="Owner" value={layer.owner} />
            <Signal label="Visibility" tone={visibilityTone(layer.visibility)} value={layer.visibility} />
            <Signal label="Geometry type" value={layer.geometryType} />
            <Signal label="Status" tone={statusTone(layer.status)} value={layer.status} />
            <Signal label="Version" value={layer.version} />
            <Signal label="Features" value={layer.featureCount.toLocaleString()} />
            <Signal label="Created" value={new Date(layer.createdAt).toLocaleDateString()} />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function BoundaryDetailsModal({ boundary, onOpenChange }: { boundary: BoundaryRecord | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Modal onOpenChange={onOpenChange} open={Boolean(boundary)} title={boundary?.name ?? "Boundary history"}>
      {boundary ? (
        <div className="space-y-3 p-5">
          <div className="space-y-2">
            <Signal label="Code" value={boundary.code} />
            <Signal label="Type" value={boundary.type} />
            <Signal label="Parent" value={boundary.parent} />
            <Signal label="Status" tone={statusTone(boundary.status)} value={boundary.status} />
            <Signal label="Geometry status" tone={statusTone(boundary.geometryStatus)} value={boundary.geometryStatus} />
            <Signal label="Coverage" tone={coverageTone(boundary.coveragePercent)} value={`${boundary.coveragePercent}%`} />
            <Signal label="Version" value={boundary.version} />
            <Signal label="Updated" value={new Date(boundary.updatedAt).toLocaleDateString()} />
          </div>
          {boundary.validationIssues.length ? (
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-xs font-semibold">Validation issues</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {boundary.validationIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

function CoverageWorkspace({
  coverage,
  features,
  preview,
  privacyVisibility,
  projectDataCoverage,
}: {
  coverage: CoverageRecord[];
  features: MapFeatureRecord[];
  preview: boolean;
  privacyVisibility: LayerVisibility;
  projectDataCoverage: ProjectDataCoverage[];
}) {
  const [selectedProject, setSelectedProject] = useState("");
  const sourceFeatures = selectedProject ? features.filter((feature) => feature.project === selectedProject) : [];
  const previewCoverageTotals = useMemo(
    () => ({
      covered: coverage.filter((item) => item.gapType === "Covered").length,
      noData: coverage.filter((item) => item.gapType === "No-data").length,
      overSampled: coverage.filter((item) => item.gapType === "Over-sampled").length,
      underCovered: coverage.filter((item) => item.gapType === "Under-covered").length,
    }),
    [coverage],
  );
  const priorityCoverage = useMemo(
    () =>
      [...coverage].sort((left, right) => {
        const severityScore = (item: CoverageRecord) => (item.gapType === "No-data" ? 3 : item.gapType === "Under-covered" ? 2 : item.gapType === "Over-sampled" ? 1 : 0);
        return severityScore(right) - severityScore(left) || left.coveragePercent - right.coveragePercent;
      }),
    [coverage],
  );
  const columns: TableColumn<MapFeatureRecord>[] = [
    { key: "label", header: "Coverage record", value: (row) => row.label, render: (row) => <span className="font-medium">{row.label}</span> },
    { key: "category", header: "Type", value: (row) => row.category, render: (row) => row.category },
    { key: "location", header: "Location", value: (row) => row.location, render: (row) => row.location },
    { key: "coordinates", header: "Coordinates", value: (row) => `${row.latitude},${row.longitude}`, render: (row) => `${maskCoordinate(row.latitude, privacyVisibility)}, ${maskCoordinate(row.longitude, privacyVisibility)}` },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "quality", header: "Quality", align: "right", value: (row) => String(row.qualityScore), render: (row) => <Badge tone={coverageTone(row.qualityScore)}>{row.qualityScore}%</Badge> },
  ];

  if (!preview) {
    const projectsWithData = projectDataCoverage.filter((item) => item.hasData);
    const noDataProjects = projectDataCoverage.filter((item) => !item.hasData);
    const weakCoverageProjects = projectDataCoverage.filter((item) => item.hasData && item.status !== "Healthy");
    const totalRecords = projectDataCoverage.reduce((sum, item) => sum + item.recordCount, 0);
    return (
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="xl:col-span-2 grid gap-3 md:grid-cols-4">
          <Signal label="Located records" value={totalRecords.toLocaleString()} tone="accent" />
          <Signal label="Projects with data" value={projectsWithData.length.toLocaleString()} tone={projectsWithData.length ? "success" : "warning"} />
          <Signal label="No GPS evidence" value={noDataProjects.length.toLocaleString()} tone={noDataProjects.length ? "danger" : "success"} />
          <Signal label="Needs attention" value={weakCoverageProjects.length.toLocaleString()} tone={weakCoverageProjects.length ? "warning" : "success"} />
        </div>
        <Panel title="Data coverage by project">
          <p className="mb-3 text-xs text-muted-foreground">
            Geographic evidence captured per project from approved submissions and located entities. Target-based coverage gaps populate once coverage targets and boundary geometry are configured.
          </p>
          {projectDataCoverage.length === 0 ? (
            <EmptyMini label="No GPS-tagged submissions or entities yet. Coverage appears once field teams sync located records." />
          ) : (
            <div className="space-y-2">
              {projectDataCoverage.map((item) => {
                const share = totalRecords ? Math.round((item.recordCount / totalRecords) * 100) : 0;
                return (
                  <div className="rounded-xl border bg-background/70 p-3" key={item.project}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-medium">{item.project}</p>
                      <Badge tone={statusTone(item.status)}>
                        {item.hasData ? `${item.recordCount} record(s)` : "No data"}
                      </Badge>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", item.hasData ? "bg-primary" : "bg-danger/40")}
                        style={{ width: `${item.hasData ? Math.max(6, share) : 4}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.submissions} submission(s) · {item.beneficiaries} entity record(s){item.hasData ? ` · ${share}% of org records` : " · needs field GPS evidence"}
                    </p>
                    {item.hasData ? (
                      <Button className="mt-3" onClick={() => setSelectedProject(item.project)} size="sm" variant="secondary">
                        View coverage records
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel title="Coverage outputs">
          <Signal label="Projects with geographic data" value={`${projectsWithData.length} project(s)`} tone={projectsWithData.length ? "success" : "warning"} />
          <Signal label="Projects with no GPS evidence" value={`${noDataProjects.length} project(s)`} tone={noDataProjects.length ? "danger" : "success"} />
          <Signal label="Total located records" value={`${totalRecords.toLocaleString()} record(s)`} tone="accent" />
          <Signal label="Target-based gap analysis" value="Requires coverage targets (roadmap)" tone="neutral" />
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-sm font-semibold">Next supervisor action</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Review projects with no GPS evidence first, then create map-area assignments for weak coverage projects once targets are configured.
            </p>
          </div>
        </Panel>
        <div className="xl:col-span-2">
          <DataTable
            columns={columns}
            emptyDescription="Click View coverage records on a project to inspect the located records behind the coverage count."
            emptyLabel="No project selected"
            rows={sourceFeatures}
            searchLabel="Search coverage source records"
            title={selectedProject ? `${selectedProject} coverage records` : "Coverage source records"}
          />
        </div>
      </section>
    );
  }
  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="xl:col-span-2 grid gap-3 md:grid-cols-4">
        <Signal label="Covered" value={previewCoverageTotals.covered} tone="success" />
        <Signal label="Under-covered" value={previewCoverageTotals.underCovered} tone="warning" />
        <Signal label="No-data" value={previewCoverageTotals.noData} tone="danger" />
        <Signal label="Over-sampled" value={previewCoverageTotals.overSampled} tone={previewCoverageTotals.overSampled ? "warning" : "success"} />
      </div>
      <Panel title="Coverage Summary">
        <div className="space-y-3">
          {priorityCoverage.map((item) => (
            <div className="rounded-xl border bg-background/70 p-3" key={item.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{item.location}</p>
                <Badge tone={statusTone(item.status)}>{item.gapType}</Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", item.coveragePercent >= 80 ? "bg-success" : item.coveragePercent >= 50 ? "bg-warning" : "bg-danger")} style={{ width: `${item.coveragePercent}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{item.actual} of {item.target} target records · {item.coveragePercent}% coverage</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => setSelectedProject(item.project)} size="sm" variant="secondary">
                  View records
                </Button>
                <Button onClick={() => setSelectedProject(item.project)} size="sm" variant={item.status === "Healthy" ? "secondary" : "primary"}>
                  Plan follow-up
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Coverage Outputs">
        <Signal label="Covered communities" value="1 location on target" tone="success" />
        <Signal label="Under-covered communities" value="2 locations" tone="warning" />
        <Signal label="No-data areas" value="1 critical gap" tone="danger" />
        <Signal label="Over-sampled areas" value="None detected" tone="success" />
        <div className="rounded-xl border bg-background/70 p-3">
          <p className="text-sm font-semibold">Recommended action</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Prioritize no-data areas, then under-covered locations. Use Assign Work mode to draw the affected area and create a supervisor assignment.
          </p>
        </div>
      </Panel>
      <div className="xl:col-span-2">
        <DataTable
          columns={columns}
          emptyDescription="Click View records on a coverage area to inspect matching mapped evidence."
          emptyLabel="No coverage project selected"
          rows={sourceFeatures}
          searchLabel="Search coverage records"
          title={selectedProject ? `${selectedProject} mapped evidence` : "Coverage evidence"}
        />
      </div>
    </section>
  );
}

function FieldOfficerMapWorkspace({
  features,
  onFeatureSelect,
  privacyVisibility,
}: {
  features: MapFeatureRecord[];
  onFeatureSelect: (feature: MapFeatureRecord) => void;
  privacyVisibility: LayerVisibility;
}) {
  const officers = features.filter((feature) => feature.category === "Field Officer");
  const assignments = features.filter((feature) => feature.category === "Assignment");
  const healthyOfficers = officers.filter((feature) => feature.status === "Healthy");
  const needsAttention = officers.filter((feature) => feature.status !== "Healthy");
  const columns: TableColumn<MapFeatureRecord>[] = [
    { key: "label", header: "Field Officer", value: (row) => row.label, render: (row) => <span className="font-medium">{row.label}</span> },
    { key: "location", header: "Last Location", value: (row) => row.location, render: (row) => row.location },
    { key: "source", header: "Source", value: (row) => featureSource(row), render: (row) => featureSource(row) },
    { key: "coordinates", header: "Coordinates", value: (row) => `${row.latitude},${row.longitude}`, render: (row) => `${maskCoordinate(row.latitude, privacyVisibility)}, ${maskCoordinate(row.longitude, privacyVisibility)}` },
    { key: "status", header: "Sync Status", value: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "quality", header: "Signal", align: "right", value: (row) => String(row.qualityScore), render: (row) => <Badge tone={coverageTone(row.qualityScore)}>{row.qualityScore}%</Badge> },
    { key: "action", header: "Action", align: "right", render: (row) => <Button onClick={() => onFeatureSelect(row)} size="sm" variant="secondary">Inspect</Button> },
  ];

  return (
    <section className="space-y-4">
      <SectionHeader
        description="Supervisor view of field officer mobile sync locations, device activity, and assignment coverage signals."
        route="/mapping/field-officer-maps"
        title="Field Officer Maps"
      />
      <div className="grid gap-3 md:grid-cols-4">
        <Signal label="Located officers" value={officers.length.toLocaleString()} tone={officers.length ? "success" : "warning"} />
        <Signal label="Healthy sync" value={healthyOfficers.length.toLocaleString()} tone={healthyOfficers.length ? "success" : "warning"} />
        <Signal label="Needs attention" value={needsAttention.length.toLocaleString()} tone={needsAttention.length ? "warning" : "success"} />
        <Signal label="Mapped assignments" value={assignments.length.toLocaleString()} tone={assignments.length ? "accent" : "neutral"} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Supervisor action queue">
          {needsAttention.length ? (
            <div className="space-y-2">
              {needsAttention.map((officer) => (
                <button
                  className="w-full rounded-xl border bg-background/70 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  key={officer.id}
                  onClick={() => onFeatureSelect(officer)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{officer.label}</p>
                    <Badge tone={statusTone(officer.status)}>{officer.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{officer.location} · {featureSource(officer)}</p>
                </button>
              ))}
            </div>
          ) : (
            <EmptyMini label="All located field officers have healthy recent sync signals." />
          )}
        </Panel>
        <Panel title="Operational interpretation">
          <Signal label="Mobile evidence" value="Last sync GPS and device signals" tone="accent" />
          <Signal label="Assignment context" value={`${assignments.length} mapped assignment point(s)`} tone={assignments.length ? "success" : "neutral"} />
          <Signal label="Privacy" value={privacyVisibility === "Aggregated" ? "Coordinates masked" : "Internal exact view"} tone={privacyVisibility === "Aggregated" ? "warning" : "success"} />
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-sm font-semibold">Recommended action</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Check officers with stale sync or missing device signals before approving location-sensitive submissions. Use assignment layers to compare where work was planned against where mobile activity happened.
            </p>
          </div>
        </Panel>
      </div>
      <DataTable
        columns={columns}
        emptyDescription="Field officer points appear once the mobile app sends last sync GPS/device metadata."
        emptyLabel="No field officer activity points"
        rows={officers}
        searchLabel="Search officers, locations, supervisors"
        title="Field officer activity"
      />
    </section>
  );
}

function FacilityMapWorkspace({
  features,
  onFeatureSelect,
  privacyVisibility,
}: {
  features: MapFeatureRecord[];
  onFeatureSelect: (feature: MapFeatureRecord) => void;
  privacyVisibility: LayerVisibility;
}) {
  const facilities = features.filter((feature) => feature.category === "Facility");
  const healthy = facilities.filter((feature) => feature.status === "Healthy");
  const needsReview = facilities.filter((feature) => feature.status !== "Healthy");
  const facilityTypes = Array.from(
    facilities.reduce((types, facility) => {
      const type = typeof facility.popup["Facility type"] === "string"
        ? facility.popup["Facility type"]
        : typeof facility.popup.Type === "string"
          ? facility.popup.Type
          : "Facility";
      types.set(type, (types.get(type) ?? 0) + Math.max(1, facility.count));
      return types;
    }, new globalThis.Map<string, number>()),
  ).sort((left, right) => right[1] - left[1]);
  const columns: TableColumn<MapFeatureRecord>[] = [
    { key: "label", header: "Facility / Site", value: (row) => row.label, render: (row) => <span className="font-medium">{row.label}</span> },
    { key: "project", header: "Project", value: (row) => row.project, render: (row) => row.project },
    { key: "location", header: "Location", value: (row) => row.location, render: (row) => row.location },
    { key: "coordinates", header: "Coordinates", value: (row) => `${row.latitude},${row.longitude}`, render: (row) => `${maskCoordinate(row.latitude, privacyVisibility)}, ${maskCoordinate(row.longitude, privacyVisibility)}` },
    { key: "status", header: "Readiness", value: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "quality", header: "Signal", align: "right", value: (row) => String(row.qualityScore), render: (row) => <Badge tone={coverageTone(row.qualityScore)}>{row.qualityScore}%</Badge> },
    { key: "action", header: "Action", align: "right", render: (row) => <Button onClick={() => onFeatureSelect(row)} size="sm" variant="secondary">Inspect</Button> },
  ];

  return (
    <section className="space-y-4">
      <SectionHeader
        description="Operational view of schools, clinics, water points, warehouses, stores, assets, and other service sites linked to project geography."
        route="/mapping/facility-maps"
        title="Facility Maps"
      />
      <div className="grid gap-3 md:grid-cols-4">
        <Signal label="Mapped facilities" value={facilities.length.toLocaleString()} tone={facilities.length ? "success" : "warning"} />
        <Signal label="Healthy sites" value={healthy.length.toLocaleString()} tone={healthy.length ? "success" : "warning"} />
        <Signal label="Needs review" value={needsReview.length.toLocaleString()} tone={needsReview.length ? "warning" : "success"} />
        <Signal label="Service types" value={facilityTypes.length.toLocaleString()} tone="accent" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Service type mix">
          {facilityTypes.length ? (
            <div className="space-y-2">
              {facilityTypes.map(([type, count]) => (
                <div className="rounded-xl border bg-background/70 p-3" key={type}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{type}</p>
                    <Badge tone="accent">{count.toLocaleString()}</Badge>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, Math.min(100, (count / Math.max(1, facilities.length)) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyMini label="No mapped facilities yet. Facility records appear once entities or reference layers include GPS coordinates." />
          )}
        </Panel>
        <Panel title="Facility operations">
          <Signal label="Reference source" value="Entity registry and facility layers" tone="accent" />
          <Signal label="Privacy" value={privacyVisibility === "Aggregated" ? "Coordinates masked" : "Internal exact view"} tone={privacyVisibility === "Aggregated" ? "warning" : "success"} />
          <Signal label="Review queue" value={`${needsReview.length} site(s)`} tone={needsReview.length ? "warning" : "success"} />
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-sm font-semibold">Recommended action</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Use this view to confirm service site coordinates, identify missing facility coverage, and link field assignments to the nearest school, clinic, warehouse, water point, or asset.
            </p>
          </div>
        </Panel>
      </div>
      <DataTable
        columns={columns}
        emptyDescription="Facilities appear when entity categories such as schools, clinics, water points, warehouses, stores, or assets have GPS coordinates."
        emptyLabel="No facility points"
        rows={facilities}
        searchLabel="Search facilities, projects, locations"
        title="Facility and service-site records"
      />
    </section>
  );
}

function IndicatorWorkspace({
  indicatorGeography,
  onOpenIndicators,
}: {
  indicatorGeography: IndicatorGeography[];
  onOpenIndicators: () => void;
}) {
  if (!indicatorGeography.length) {
    return (
      <section className="space-y-3 rounded-xl border bg-panel p-4 shadow-line">
        <EmptyMini label="No indicator geography yet. Create active indicators and collect GPS-tagged project data to map indicator progress." />
        <Button onClick={onOpenIndicators} size="sm" variant="secondary">Open Indicators</Button>
      </section>
    );
  }

  const onTrack = indicatorGeography.filter((item) => item.achievementPercent >= 80);
  const watchList = indicatorGeography.filter((item) => item.achievementPercent >= 50 && item.achievementPercent < 80);
  const offTrack = indicatorGeography.filter((item) => item.achievementPercent < 50);
  const priorityIndicators = [...indicatorGeography].sort((left, right) => left.achievementPercent - right.achievementPercent);
  const columns: TableColumn<IndicatorGeography>[] = [
    { key: "indicator", header: "Indicator", value: (row) => row.indicator, render: (row) => <span className="font-medium">{row.indicator}</span> },
    { key: "project", header: "Project", value: (row) => row.project, render: (row) => row.project },
    { key: "location", header: "Location", value: (row) => row.location, render: (row) => row.location },
    { key: "period", header: "Period", value: (row) => row.period, render: (row) => row.period },
    { key: "achievement", header: "Achievement", align: "right", value: (row) => String(row.achievementPercent), render: (row) => <Badge tone={coverageTone(row.achievementPercent)}>{row.achievementPercent}%</Badge> },
    { key: "action", header: "Action", align: "right", render: () => <Button onClick={onOpenIndicators} size="sm" variant="secondary">Review</Button> },
  ];

  return (
    <section className="space-y-4">
      <SectionHeader
        action={<Button onClick={onOpenIndicators} size="sm" variant="secondary">Open Indicators</Button>}
        description="Indicator progress by project geography, using active indicators and GPS-derived project extents."
        route="/mapping/indicator-maps"
        title="Indicator Maps"
      />
      <div className="grid gap-3 md:grid-cols-4">
        <Signal label="Mapped indicators" value={indicatorGeography.length.toLocaleString()} tone="accent" />
        <Signal label="On track" value={onTrack.length.toLocaleString()} tone={onTrack.length ? "success" : "neutral"} />
        <Signal label="Watch list" value={watchList.length.toLocaleString()} tone={watchList.length ? "warning" : "success"} />
        <Signal label="Off track" value={offTrack.length.toLocaleString()} tone={offTrack.length ? "danger" : "success"} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Priority hotspots">
          <div className="space-y-2">
            {priorityIndicators.slice(0, 4).map((item) => (
              <div className="rounded-xl border bg-background/70 p-3" key={item.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.indicator}</p>
                  <Badge tone={coverageTone(item.achievementPercent)}>{item.achievementPercent}%</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.project} · {item.location}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", item.achievementPercent >= 80 ? "bg-success" : item.achievementPercent >= 50 ? "bg-warning" : "bg-danger")} style={{ width: `${Math.max(4, item.achievementPercent)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Performance interpretation">
          <Signal label="Geographic signal" value="Project GPS extent + indicator result" tone="accent" />
          <Signal label="Review priority" value={offTrack.length ? `${offTrack.length} off-track result(s)` : "No critical indicator hotspots"} tone={offTrack.length ? "danger" : "success"} />
          <Signal label="Decision use" value="Target follow-up locations" tone="neutral" />
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-sm font-semibold">Recommended action</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Start with off-track indicators, inspect the project location, then assign follow-up collection or verification where performance is weakest.
            </p>
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {indicatorGeography.map((item) => (
          <article className="rounded-xl border bg-panel p-3 shadow-line" key={item.id}>
            <Badge tone={coverageTone(item.achievementPercent)}>Achievement {item.achievementPercent}%</Badge>
            <h2 className="mt-3 text-sm font-semibold">{item.indicator}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{item.project} · {item.location}</p>
            <div className="mt-4 grid gap-2">
              <Signal label="Baseline" value={item.baseline} />
              <Signal label="Current" value={item.current} />
              <Signal label="Target" value={item.target} />
              <Signal label="Period" value={item.period} />
            </div>
            <Button className="mt-3" onClick={onOpenIndicators} size="sm" variant="secondary">
              Review indicator
            </Button>
          </article>
        ))}
      </div>
      <DataTable
        columns={columns}
        emptyLabel="No mapped indicators"
        rows={priorityIndicators}
        searchLabel="Search indicators, projects, locations"
        title="Indicator geography ranking"
      />
    </section>
  );
}

function SpatialQualityWorkspace({
  features,
  issues,
  onFeatureSelect,
  onOpenDataQuality,
}: {
  features: MapFeatureRecord[];
  issues: SpatialQualityIssue[];
  onFeatureSelect: (feature: MapFeatureRecord) => void;
  onOpenDataQuality: () => void;
}) {
  const criticalIssues = issues.filter((issue) => issue.severity === "Critical").length;
  const highIssues = issues.filter((issue) => issue.severity === "High").length;
  const mediumIssues = issues.filter((issue) => issue.severity === "Medium").length;
  const priorityIssues = useMemo(
    () =>
      [...issues].sort((left, right) => {
        const score = (severity: SpatialQualityIssue["severity"]) => (severity === "Critical" ? 4 : severity === "High" ? 3 : severity === "Medium" ? 2 : 1);
        return score(right.severity) - score(left.severity);
      }),
    [issues],
  );
  const issueTypes = useMemo(
    () =>
      Array.from(
        issues.reduce((groups, issue) => {
          groups.set(issue.issueType, (groups.get(issue.issueType) ?? 0) + 1);
          return groups;
        }, new globalThis.Map<string, number>()),
      ).sort((left, right) => right[1] - left[1]),
    [issues],
  );
  const featureById = useMemo(() => new globalThis.Map(features.map((feature) => [feature.id, feature])), [features]);
  const columns: TableColumn<SpatialQualityIssue>[] = [
    {
      key: "issue",
      header: "Issue",
      value: (row) => row.issueType,
      render: (row) => (
        <div>
          <p className="font-medium">{row.issueType}</p>
          <p className="mt-1 text-xs text-muted-foreground">{row.project}</p>
        </div>
      ),
    },
    { key: "submission", header: "Submission", value: (row) => row.submissionId, render: (row) => row.submissionId },
    { key: "enumerator", header: "Enumerator", value: (row) => row.enumerator, render: (row) => row.enumerator },
    { key: "location", header: "Location", value: (row) => row.location, render: (row) => row.location },
    { key: "action", header: "Recommended Action", value: (row) => row.recommendedAction, render: (row) => <span className="text-sm leading-5">{row.recommendedAction}</span> },
    { key: "severity", header: "Severity", value: (row) => row.severity, render: (row) => <Badge tone={severityTone(row.severity)}>{row.severity}</Badge> },
    { key: "state", header: "Validation", value: (row) => row.validationState, render: (row) => <Badge tone={statusTone(row.validationState)}>{row.validationState}</Badge> },
    {
      key: "inspect",
      header: "Inspect",
      align: "right",
      render: (row) => {
        const feature = row.sourceFeatureId ? featureById.get(row.sourceFeatureId) : undefined;
        return <Button disabled={!feature} onClick={() => feature ? onFeatureSelect(feature) : undefined} size="sm" variant="secondary">Inspect</Button>;
      },
    },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader
        action={<Button onClick={onOpenDataQuality} variant="secondary"><FileWarning aria-hidden="true" /> Open Data Quality</Button>}
        description="Review GPS mismatches, duplicate points, outlier locations, low-quality submissions, and boundary violations."
        route="/mapping/data-quality-maps"
        title="Data Quality Maps"
      />
      <div className="grid gap-3 md:grid-cols-4">
        <Signal label="Spatial issues" value={issues.length.toLocaleString()} tone={issues.length ? "warning" : "success"} />
        <Signal label="Critical" value={criticalIssues.toLocaleString()} tone={criticalIssues ? "danger" : "success"} />
        <Signal label="High" value={highIssues.toLocaleString()} tone={highIssues ? "warning" : "success"} />
        <Signal label="Medium" value={mediumIssues.toLocaleString()} tone={mediumIssues ? "accent" : "success"} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Triage priority">
          {priorityIssues.length ? (
            <div className="space-y-2">
              {priorityIssues.slice(0, 5).map((issue) => {
                const feature = issue.sourceFeatureId ? featureById.get(issue.sourceFeatureId) : undefined;
                return (
                  <div className="rounded-xl border bg-background/70 p-3" key={issue.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{issue.issueType}</p>
                      <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{issue.project} · {issue.location}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{issue.recommendedAction}</p>
                    <Button disabled={!feature} onClick={() => feature ? onFeatureSelect(feature) : undefined} className="mt-3" size="sm" variant="secondary">
                      Inspect source
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyMini label="No spatial quality issues detected in this map view." />
          )}
        </Panel>
        <Panel title="Issue patterns">
          {issueTypes.length ? (
            <div className="space-y-2">
              {issueTypes.map(([issueType, count]) => (
                <div className="rounded-xl border bg-background/70 p-3" key={issueType}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{issueType}</p>
                    <Badge tone="warning">{count}</Badge>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-warning" style={{ width: `${Math.max(8, Math.min(100, (count / Math.max(1, issues.length)) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyMini label="No repeated issue pattern detected." />
          )}
          <div className="mt-3 rounded-xl border bg-background/70 p-3">
            <p className="text-sm font-semibold">Recommended workflow</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Inspect critical issues first, open the source module, return or correct records where needed, then approve only records with acceptable GPS and entity evidence.
            </p>
          </div>
        </Panel>
      </div>
      <DataTable columns={columns} emptyLabel="No spatial quality issues detected" rows={priorityIssues} searchLabel="Search issue, submission, enumerator, location" title="Spatial quality issue table" />
    </section>
  );
}

function SectionHeader({ action, description, route, title }: { action?: ReactNode; description: string; route: string; title: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-panel p-3 shadow-line xl:flex-row xl:items-center xl:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="monitor">{route}</Badge>
          <Badge tone="accent">Architecture route</Badge>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint>
        </div>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

function Panel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="rounded-xl border bg-panel p-3 shadow-line">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Signal({ label, tone = "neutral", value }: { label: string; tone?: BadgeProps["tone"]; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}

function WorkflowStep({ complete, label }: { complete: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", complete ? "border-success bg-success text-success-foreground" : "border-muted-foreground/30 bg-muted/30 text-muted-foreground")}>
        {complete ? <CheckCircle2 aria-hidden="true" size={12} /> : null}
      </span>
      <span className={complete ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
      <span>{label}</span>
    </div>
  );
}

function EmptyMini({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

const NOT_AVAILABLE_REASONS: Partial<Record<MappingSection, string>> = {
  layers: "Map Layers are available from live GPS records and selected GIS files. Backend geometry processing can add formal versioning and validation.",
  boundaries: "Boundaries are available from GPS-derived project extents and selected boundary files. Backend geometry processing can add formal approval workflows.",
};

function MappingNotAvailable({
  onSelectSection,
  section,
}: {
  onSelectSection: (section: MappingSection) => void;
  section: { id: MappingSection; label: string; route: string; description: string };
}) {
  return (
    <section className="space-y-4">
      <SectionHeader description={section.description} route={section.route} title={section.label} />
      <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
        <Map aria-hidden="true" className="mx-auto text-muted-foreground" size={28} />
        <h2 className="mt-3 text-sm font-semibold">{section.label} isn&apos;t available yet</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {NOT_AVAILABLE_REASONS[section.id] ?? "This view needs live organization data before it can display useful records."}
          {" "}Project Maps, Submission Maps, Beneficiary Maps, and Data Quality Maps are available now using your real data.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button onClick={() => onSelectSection("project-maps")} variant="secondary">
            <MapPinned aria-hidden="true" /> View Project Overview
          </Button>
          <Button onClick={() => onSelectSection("submission-maps")} variant="secondary">
            <LocateFixed aria-hidden="true" /> View Submission Maps
          </Button>
          <Button onClick={() => onSelectSection("beneficiary-maps")} variant="secondary">
            <Shield aria-hidden="true" /> View Beneficiary Maps
          </Button>
          <Button onClick={() => onSelectSection("data-quality-maps")} variant="secondary">
            <FileWarning aria-hidden="true" /> View Data Quality Map
          </Button>
        </div>
      </div>
    </section>
  );
}

export const mappingValidationEngine = {
  validateGpsPoint,
};
