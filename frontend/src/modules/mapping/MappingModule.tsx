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
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  listBeneficiaries,
  listIndicators,
  listProjects,
  listSubmissions,
  type CurrentPrincipal,
  type IndicatorRead,
  type ProjectListItemRead,
} from "@/lib/api";
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

type MapViewerProps = {
  activeSection: MappingSection;
  allFeatures: MapFeatureRecord[];
  areaBounds: BoundingBox | null;
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
  onDrawModeChange: (active: boolean) => void;
  onFeatureSelect: (feature: MapFeatureRecord) => void;
  onFinishBoundaryDraw: () => void;
  onFiltersChange: (filters: MapFeatureFilters) => void;
  onDensityModeChange: (enabled: boolean) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerVisibilityChange: (layerId: string, visible: boolean) => void;
  onOpenFeatureSource: (feature: MapFeatureRecord) => void;
  onMapQueryChange: (query: string) => void;
  onStartBoundaryDraw: (mode: "polygon" | "rectangle") => void;
  privacyVisibility: LayerVisibility;
  sectionInfo: { label: string; description: string };
  selectedFeature: MapFeatureRecord | null;
};

const basemaps: MapBasemap[] = ["Light", "Streets", "Terrain", "Satellite"];

const REAL_DATA_SECTIONS: MappingSection[] = ["dashboard", "project-maps", "submission-maps", "beneficiary-maps", "facility-maps", "coverage-maps", "indicator-maps", "data-quality-maps", "layers", "boundaries"];

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
    return {
      createdAt: new Date().toISOString(),
      description: `Auto-derived ${category.toLowerCase()} point layer from live GPS-tagged records.`,
      featureCount: rows.length,
      geometryType: "Point",
      id: `live-layer-${category.toLowerCase()}`,
      name: `${category} points`,
      owner: "Atlas FieldOps",
      source: "Live submissions and entity records",
      status: hasCritical ? "Critical" : hasWarning ? "Warning" : "Healthy",
      type: `${category} evidence`,
      version: "live",
      visibility: category === "Beneficiary" ? "Restricted" : "Internal",
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

function layerFeatureCategory(layer: MapLayerRecord): MapFeatureRecord["category"] | null {
  const direct = layerCategory(layer);
  if (direct) return direct;
  const text = `${layer.name} ${layer.type}`.toLowerCase();
  if (text.includes("submission")) return "Submission";
  if (text.includes("beneficiar") || text.includes("household") || text.includes("farmer")) return "Beneficiary";
  if (text.includes("facilit") || text.includes("clinic") || text.includes("school") || text.includes("warehouse") || text.includes("water")) return "Facility";
  if (text.includes("indicator")) return "Indicator";
  if (text.includes("quality") || text.includes("gps issue")) return "Quality";
  if (text.includes("coverage")) return "Coverage";
  if (text.includes("project") || text.includes("boundary")) return "Project";
  return null;
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
  const preserveFeatureIdRef = useRef<string | null>(null);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
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

  const realMapFeatures = useMemo<MapFeatureRecord[]>(() => {
    const projectNameById: Record<string, string> = Object.fromEntries(
      (projectsQuery.data ?? []).map((project) => [project.id, project.name]),
    );
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

    return [...submissionFeatures, ...beneficiaryFeatures];
  }, [beneficiariesQuery.data, projectsQuery.data, submissionsQuery.data, terminology]);

  const latestSubmissionFeature = useMemo(
    () => realMapFeatures.find((feature) => feature.category === "Submission") ?? null,
    [realMapFeatures],
  );

  const mapFeatures = useMemo(() => (preview ? previewMapFeatures : realMapFeatures), [preview, realMapFeatures]);
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
  const mapLayers = useMemo(() => (preview ? previewMapLayers : deriveLiveMapLayers(realMapFeatures)), [preview, realMapFeatures]);
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
  const spatialIssues = useMemo(
    () => (preview ? previewSpatialIssues : deriveQualityIssues(realMapFeatures)),
    [preview, realMapFeatures],
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
    setBoundaryDrawPoints([]);
    setBoundaryDrawMode(mode);
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

  function openFeatureSource(feature: MapFeatureRecord): void {
    if (feature.category === "Submission") setActiveView("submissions");
    else if (feature.category === "Beneficiary" || feature.category === "Facility") setActiveView("beneficiaries");
    else if (feature.category === "Quality") setActiveView("dataQuality");
    else if (feature.category === "Indicator") setActiveView("indicators");
    else setActiveView("map");
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
          onOpenSubmissions={() => setActiveView("submissions")}
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
            onDrawModeChange={handleDrawModeChange}
            onDensityModeChange={setDensityMode}
            onFeatureSelect={setSelectedFeature}
            onFiltersChange={setFilters}
            onFinishBoundaryDraw={finishBoundaryDraw}
            onLayerOpacityChange={(layerId, opacity) => setLayerOpacity((current) => ({ ...current, [layerId]: opacity }))}
            onLayerVisibilityChange={(layerId, visible) => setLayerVisibility((current) => ({ ...current, [layerId]: visible }))}
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
            onOpenIndicators={() => setActiveView("indicators")}
            projectDataCoverage={projectDataCoverage}
            onOpenDataQuality={() => setActiveView("dataQuality")}
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
    </section>
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
  onDrawModeChange,
  onDensityModeChange,
  onFeatureSelect,
  onFiltersChange,
  onFinishBoundaryDraw,
  onLayerOpacityChange,
  onLayerVisibilityChange,
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
  const showBoundaryShapes = activeSection === "boundaries" || activeSection === "project-maps";
  const visibleBoundaryShapes = showBoundaryShapes ? boundaryShapes : [];
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

  function toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void mapContainerRef.current?.requestFullscreen();
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
    <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="rounded-xl border bg-panel p-3 shadow-line">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Layer control</h2>
            <p className="mt-1 text-xs text-muted-foreground">Role-aware visibility, status, and geometry type.</p>
          </div>
          <Layers aria-hidden="true" className="text-primary" size={18} />
        </div>
        <div className="mt-4 space-y-2">
          {layers.map((layer) => (
            <div className={cn("rounded-xl border bg-background/70 p-3 transition", layerVisibility[layer.id] === false && "opacity-60")} key={layer.id}>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  checked={layerVisibility[layer.id] !== false}
                  className="mt-1 accent-primary"
                  onChange={(event) => onLayerVisibilityChange(layer.id, event.target.checked)}
                  type="checkbox"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{layer.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{layer.geometryType} · {layer.featureCount.toLocaleString()} features</span>
                </span>
                <Badge tone={visibilityTone(layer.visibility)}>{layer.visibility}</Badge>
              </label>
              <div className="mt-3 flex items-center gap-2">
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
      </aside>

      <div className="overflow-hidden rounded-2xl border bg-panel shadow-line">
        <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Map Overview</h2>
              <HelpHint label="About this map" title={activeInfo.label}>{activeInfo.description}</HelpHint>
            </div>
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
            <Button onClick={toggleFullscreen} size="sm" variant="secondary"><Maximize2 aria-hidden="true" /> Fullscreen</Button>
            <Button onClick={() => window.print()} size="sm" variant="secondary"><Printer aria-hidden="true" /> Print</Button>
          </div>
        </div>
        <div className="grid gap-2 border-b bg-background/60 p-3 md:grid-cols-2 xl:grid-cols-6">
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
        <div className="relative min-h-[480px] overflow-hidden" ref={mapContainerRef}>
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
            <div className="pointer-events-auto absolute bottom-4 left-4 rounded-xl border bg-panel/95 p-3 shadow-line">
              <p className="text-xs font-semibold">Legend</p>
              <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                <LegendItem color="bg-success" label="Healthy spatial evidence" />
                <LegendItem color="bg-warning" label="Needs validation" />
                <LegendItem color="bg-danger" label="Critical issue or gap" />
                {showBoundaryShapes ? <LegendItem color="border-2 border-primary bg-transparent" label="Project extent (observed boundary)" /> : null}
              </div>
            </div>
            <div className="pointer-events-auto absolute right-4 top-4 max-w-56 rounded-xl border bg-panel/95 p-3 text-xs shadow-line">
              <p className="font-semibold">Draw / select area</p>
              {areaBounds ? (
                <>
                  <p className="mt-1 text-muted-foreground">
                    {features.length} feature{features.length === 1 ? "" : "s"} inside the drawn area.
                  </p>
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
                        ? `${boundaryDrawPoints.length} point${boundaryDrawPoints.length === 1 ? "" : "s"} placed. Add at least 3 points.`
                        : boundaryDrawMode === "rectangle"
                          ? "Drag on the map to sketch a rectangle boundary."
                          : "Sketch a project boundary and export it as GeoJSON."}
                    </p>
                    <div className="mt-2 grid gap-2">
                      {boundaryDrawMode ? (
                        <>
                          {boundaryDrawMode === "polygon" ? (
                            <Button disabled={boundaryDrawPoints.length < 3} onClick={onFinishBoundaryDraw} size="sm" variant="primary">
                              <FileJson aria-hidden="true" />
                              Finish polygon
                            </Button>
                          ) : null}
                          <Button onClick={onCancelBoundaryDraw} size="sm" variant="secondary">
                            Cancel boundary
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
          </div>
        </div>
      </div>

      <aside className="rounded-xl border bg-panel p-3 shadow-line">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Results summary</h2>
            <p className="mt-1 text-xs text-muted-foreground">Popup details and companion map context.</p>
          </div>
          <Filter aria-hidden="true" className="text-primary" size={18} />
        </div>
        {selectedFeature ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border bg-background/70 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{selectedFeature.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedFeature.project}</p>
                </div>
                <Badge tone={statusTone(selectedFeature.status)}>{selectedFeature.status}</Badge>
              </div>
            </div>
            <Signal label="Location" value={selectedFeature.location} />
            <Signal label="Coordinates" value={`${maskCoordinate(selectedFeature.latitude, privacyVisibility)}, ${maskCoordinate(selectedFeature.longitude, privacyVisibility)}`} tone={privacyVisibility === "Aggregated" ? "warning" : "accent"} />
            <Signal label="GPS accuracy" value={`${selectedFeature.gpsAccuracy}m`} tone={selectedFeature.gpsAccuracy <= 30 ? "success" : "warning"} />
            <Signal label="Quality score" value={`${selectedFeature.qualityScore}%`} tone={coverageTone(selectedFeature.qualityScore)} />
            <Button className="w-full" onClick={() => onOpenFeatureSource(selectedFeature)} size="sm" variant="secondary">
              Open source module
            </Button>
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-xs font-semibold">Popup details</p>
              <div className="mt-2 space-y-2">
                {Object.entries(selectedFeature.popup).map(([label, value]) => (
                  <div className="flex justify-between gap-3 text-xs" key={label}>
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyMini label="Select a point, layer, or boundary to inspect details." />
        )}
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
  const normalized = category.charAt(0).toUpperCase() + category.slice(1);
  if (["Project", "Submission", "Beneficiary", "Facility", "Coverage", "Indicator", "Quality"].includes(normalized)) {
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
    const totalRecords = projectDataCoverage.reduce((sum, item) => sum + item.recordCount, 0);
    return (
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
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
      <Panel title="Coverage Summary">
        <div className="space-y-3">
          {coverage.map((item) => (
            <div className="rounded-xl border bg-background/70 p-3" key={item.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{item.location}</p>
                <Badge tone={statusTone(item.status)}>{item.gapType}</Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", item.coveragePercent >= 80 ? "bg-success" : item.coveragePercent >= 50 ? "bg-warning" : "bg-danger")} style={{ width: `${item.coveragePercent}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{item.actual} of {item.target} target records · {item.coveragePercent}% coverage</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Coverage Outputs">
        <Signal label="Covered communities" value="1 location on target" tone="success" />
        <Signal label="Under-covered communities" value="2 locations" tone="warning" />
        <Signal label="No-data areas" value="1 critical gap" tone="danger" />
        <Signal label="Over-sampled areas" value="None detected" tone="success" />
      </Panel>
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

  return (
    <section className="space-y-4">
      <SectionHeader
        action={<Button onClick={onOpenIndicators} size="sm" variant="secondary">Open Indicators</Button>}
        description="Indicator progress by project geography, using active indicators and GPS-derived project extents."
        route="/mapping/indicator-maps"
        title="Indicator Maps"
      />
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
      <DataTable columns={columns} emptyLabel="No spatial quality issues detected" rows={issues} searchLabel="Search issue, submission, enumerator, location" title="Spatial quality issue table" />
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
