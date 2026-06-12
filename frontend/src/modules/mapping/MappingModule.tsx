"use client";

import {
  Archive,
  CheckCircle2,
  CircleDot,
  Download,
  Eye,
  FileWarning,
  Filter,
  Layers,
  LocateFixed,
  Map,
  MapPinned,
  Maximize2,
  Navigation,
  Printer,
  Search,
  Shield,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Map as LeafletMapInstance } from "leaflet";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  listBeneficiaries,
  listProjects,
  listSubmissions,
  type CurrentPrincipal,
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
  type IndicatorGeography,
  type LayerVisibility,
  type MapBasemap,
  type MapFeatureRecord,
  type MapLayerRecord,
  type MappingSection,
  type MappingSummary,
  type ProjectExtent,
  type SpatialQualityIssue,
} from "@/modules/mapping/data";
import {
  computeMappingSummary,
  computeProjectExtents,
  coverageTone,
  deriveQualityIssues,
  filterFeaturesBySection,
  isFeatureInBounds,
  maskCoordinate,
  severityTone,
  statusTone,
  toCsv,
  validateGpsPoint,
  visibilityTone,
  type BoundingBox,
} from "@/modules/mapping/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type MappingModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

type MapViewerProps = {
  activeSection: MappingSection;
  areaBounds: BoundingBox | null;
  basemap: MapBasemap;
  drawMode: boolean;
  features: MapFeatureRecord[];
  layers: MapLayerRecord[];
  mapQuery: string;
  onAreaBoundsChange: (bounds: BoundingBox | null) => void;
  onBasemapChange: (basemap: MapBasemap) => void;
  onDrawModeChange: (active: boolean) => void;
  onFeatureSelect: (feature: MapFeatureRecord) => void;
  onMapQueryChange: (query: string) => void;
  privacyVisibility: LayerVisibility;
  sectionInfo: { label: string; description: string };
  selectedFeature: MapFeatureRecord | null;
};

const basemaps: MapBasemap[] = ["Light", "Streets", "Terrain", "Satellite"];

const REAL_DATA_SECTIONS: MappingSection[] = ["dashboard", "project-maps", "submission-maps", "beneficiary-maps", "data-quality-maps"];

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

export function MappingModule({ principal, token }: MappingModuleProps) {
  const [activeSection, setActiveSection] = useState<MappingSection>("dashboard");
  const [basemap, setBasemap] = useState<MapBasemap>("Light");
  const [selectedFeature, setSelectedFeature] = useState<MapFeatureRecord | null>(null);
  const [mapResult, setMapResult] = useState("");
  const [mapQuery, setMapQuery] = useState("");
  const [drawMode, setDrawMode] = useState(false);
  const [areaBounds, setAreaBounds] = useState<BoundingBox | null>(null);
  const preserveFeatureIdRef = useRef<string | null>(null);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const pendingMapFeatureId = useWorkspaceStore((state) => state.pendingMapFeatureId);
  const setPendingMapFeatureId = useWorkspaceStore((state) => state.setPendingMapFeatureId);
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
          Status: submission.status,
          Submitted: new Date(submission.submitted_at).toLocaleDateString(),
        },
        project: projectNameById[submission.project_id ?? ""] ?? "Unassigned project",
        qualityScore: submission.accuracy == null ? 60 : Math.max(0, Math.min(100, Math.round(100 - submission.accuracy))),
        region: "",
        status: submission.accuracy == null ? "Warning" : accuracy <= 15 ? "Healthy" : accuracy <= 30 ? "Warning" : "Critical",
      };
    });

    const beneficiaryFeatures: MapFeatureRecord[] = geotaggedBeneficiaries.map((beneficiary) => {
      const latitude = beneficiary.latitude as number;
      const longitude = beneficiary.longitude as number;
      const duplicateRisk = beneficiary.duplicate_risk_score ?? 0;
      return {
        category: "Beneficiary",
        count: 1,
        district: beneficiary.district ?? "",
        gpsAccuracy: 0,
        id: `beneficiary-${beneficiary.id}`,
        label: beneficiary.display_name,
        latitude,
        location: [beneficiary.community, beneficiary.district, beneficiary.region].filter(Boolean).join(", ") || "Location not recorded",
        longitude,
        popup: {
          [`${terminology.primaryEntity} ID`]: beneficiary.beneficiary_uid,
          Enrollment: beneficiary.enrollment_status,
          Type: beneficiary.beneficiary_type,
          "Vulnerability score": beneficiary.vulnerability_score,
        },
        project: projectNameById[beneficiary.project_id ?? ""] ?? "Unassigned project",
        qualityScore: Math.round((1 - duplicateRisk) * 100),
        region: beneficiary.region ?? "",
        sensitive: true,
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
  const mapLayers = useMemo(() => (preview ? previewMapLayers : []), [preview]);
  const boundaries = useMemo(() => (preview ? previewBoundaries : []), [preview]);
  const coverage = useMemo(() => (preview ? previewCoverage : []), [preview]);
  const indicatorGeography = useMemo(() => (preview ? previewIndicatorGeography : []), [preview]);
  const spatialIssues = useMemo(
    () => (preview ? previewSpatialIssues : deriveQualityIssues(realMapFeatures)),
    [preview, realMapFeatures],
  );
  const projectExtents = useMemo(() => computeProjectExtents(realMapFeatures), [realMapFeatures]);
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

  const visibleFeatures = useMemo(
    () => filterFeaturesBySection(mapFeatures, activeSection),
    [activeSection, mapFeatures],
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
  }

  function viewProjectExtentOnMap(extent: ProjectExtent): void {
    const padLat = Math.max((extent.maxLat - extent.minLat) * 0.1, 0.01);
    const padLng = Math.max((extent.maxLng - extent.minLng) * 0.1, 0.01);
    setAreaBounds({
      east: extent.maxLng + padLng,
      north: extent.maxLat + padLat,
      south: extent.minLat - padLat,
      west: extent.minLng - padLng,
    });
    setActiveSection("submission-maps");
    setDrawMode(false);
  }

  function exportCurrentView(): void {
    downloadCsv(
      "atlas-mapping-view.csv",
      visibleFeatures.map((feature) => ({
        category: feature.category,
        gpsAccuracy: feature.gpsAccuracy,
        label: feature.label,
        latitude: maskCoordinate(feature.latitude, privacyVisibility),
        location: feature.location,
        longitude: maskCoordinate(feature.longitude, privacyVisibility),
        project: feature.project,
        qualityScore: feature.qualityScore,
        status: feature.status,
      })),
    );
    setMapResult("Map export prepared. Export access should be audited by Governance for production deployments.");
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
              Export map
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
              {section.status === "planned" ? (
                <Badge tone={activeSection === section.id ? "neutral" : "accent"}>Planned</Badge>
              ) : null}
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
            areaBounds={areaBounds}
            basemap={basemap}
            drawMode={drawMode}
            features={spatiallyFilteredFeatures}
            layers={searchedLayers}
            mapQuery={mapQuery}
            onAreaBoundsChange={setAreaBounds}
            onBasemapChange={setBasemap}
            onDrawModeChange={setDrawMode}
            onFeatureSelect={setSelectedFeature}
            onMapQueryChange={setMapQuery}
            privacyVisibility={privacyVisibility}
            sectionInfo={activeInfo}
            selectedFeature={selectedFeature}
          />

          <SectionContent
            activeSection={activeSection}
            boundaries={boundaries}
            coverage={coverage}
            indicatorGeography={indicatorGeography}
            mapFeatures={spatiallyFilteredFeatures}
            mapLayers={mapLayers}
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
    </section>
  );
}

function MappingDashboard({
  latestSubmissionFeature,
  onOpenQuality,
  onOpenSubmissions,
  preview,
  summary,
  terminology,
}: {
  latestSubmissionFeature: MapFeatureRecord | null;
  onOpenQuality: () => void;
  onOpenSubmissions: () => void;
  preview: boolean;
  summary: MappingSummary;
  terminology: SectorTerminology;
}) {
  const cards: { icon: LucideIcon; label: string; tone?: BadgeProps["tone"]; value: string | number }[] = [
    { icon: Layers, label: "Active Map Layers", value: summary.activeMapLayers },
    { icon: MapPinned, label: "Project Locations", value: summary.projectLocations },
    { icon: LocateFixed, label: "Submission Points", value: summary.submissionPoints.toLocaleString() },
    { icon: Shield, label: `${terminology.primaryEntityPlural} Points`, value: summary.beneficiaryPoints.toLocaleString() },
    { icon: CircleDot, label: "Facility Points", value: summary.facilityPoints },
    { icon: Map, label: "Uploaded Boundaries", value: summary.uploadedBoundaries },
    { icon: FileWarning, label: "GPS Issues", tone: summary.gpsIssues ? "warning" : "success", value: summary.gpsIssues },
    { icon: Navigation, label: "Coverage Gaps", tone: summary.coverageGaps ? "danger" : "success", value: summary.coverageGaps },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article className="rounded-xl border bg-panel p-3 shadow-line" key={card.label}>
          <div className="flex items-center justify-between gap-3">
            <card.icon aria-hidden="true" className="text-primary" size={18} />
            {card.tone ? <Badge tone={card.tone}>Spatial</Badge> : null}
          </div>
          <p className="mt-4 text-2xl font-semibold">{card.value}</p>
          <p className="text-xs text-muted-foreground">{card.label}</p>
        </article>
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
  areaBounds,
  basemap,
  drawMode,
  features,
  layers,
  mapQuery,
  onAreaBoundsChange,
  onBasemapChange,
  onDrawModeChange,
  onFeatureSelect,
  onMapQueryChange,
  privacyVisibility,
  sectionInfo,
  selectedFeature,
}: MapViewerProps) {
  const activeInfo = sectionInfo;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const [metadataLayer, setMetadataLayer] = useState<MapLayerRecord | null>(null);

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
            <button className="w-full rounded-xl border bg-background/70 p-3 text-left transition hover:border-primary/30 hover:bg-primary/5" key={layer.id} onClick={() => setMetadataLayer(layer)} type="button">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{layer.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{layer.geometryType} · {layer.featureCount.toLocaleString()} features</p>
                </div>
                <Badge tone={visibilityTone(layer.visibility)}>{layer.visibility}</Badge>
              </div>
            </button>
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
        <div className="relative min-h-[480px] overflow-hidden" ref={mapContainerRef}>
          <LeafletMap
            areaBounds={areaBounds}
            basemap={basemap}
            drawMode={drawMode}
            features={features}
            onAreaBoundsChange={onAreaBoundsChange}
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
  indicatorGeography,
  mapFeatures,
  mapLayers,
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
  indicatorGeography: IndicatorGeography[];
  mapFeatures: MapFeatureRecord[];
  mapLayers: MapLayerRecord[];
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
  if (activeSection === "layers") return <LayersTable layers={mapLayers} />;
  if (activeSection === "boundaries") return <BoundariesTable boundaries={boundaries} />;
  if (activeSection === "coverage-maps") return <CoverageWorkspace coverage={coverage} />;
  if (activeSection === "indicator-maps") return <IndicatorWorkspace indicatorGeography={indicatorGeography} />;
  if (activeSection === "data-quality-maps") {
    return <SpatialQualityWorkspace issues={spatialIssues} onOpenDataQuality={onOpenDataQuality} />;
  }
  if (activeSection === "project-maps" && !preview) {
    return <ProjectOverviewWorkspace extents={projectExtents} onViewOnMap={onViewProjectExtent} />;
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
  onViewOnMap,
}: {
  extents: ProjectExtent[];
  onViewOnMap: (extent: ProjectExtent) => void;
}) {
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
            </article>
          ))}
        </div>
      ) : (
        <EmptyMini label="No GPS-tagged submissions or records yet. Project extent will appear here once field data includes GPS coordinates." />
      )}
    </section>
  );
}

function LayersTable({ layers }: { layers: MapLayerRecord[] }) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const [metadataLayer, setMetadataLayer] = useState<MapLayerRecord | null>(null);
  const columns: TableColumn<MapLayerRecord>[] = [
    { key: "name", header: "Layer", value: (row) => row.name, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "type", header: "Type", value: (row) => row.type, render: (row) => row.type },
    { key: "visibility", header: "Visibility", value: (row) => row.visibility, render: (row) => <Badge tone={visibilityTone(row.visibility)}>{row.visibility}</Badge> },
    { key: "geometry", header: "Geometry", value: (row) => row.geometryType, render: (row) => row.geometryType },
    { key: "features", header: "Features", align: "right", value: (row) => String(row.featureCount), render: (row) => row.featureCount.toLocaleString() },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "actions", header: "Actions", align: "right", render: (row) => <Button onClick={() => setMetadataLayer(row)} size="sm" variant="secondary"><Eye aria-hidden="true" /> Metadata</Button> },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader
        action={
          <Button
            onClick={() =>
              pushToast({
                title: "Upload isn't available yet",
                description: "Connect a GIS file-processing service to upload spatial layers. This control is a preview for now.",
                tone: "warning",
              })
            }
            variant="primary"
          >
            <Upload aria-hidden="true" /> Upload GeoJSON, KML, Shapefile, or CSV
          </Button>
        }
        description="Manage reusable spatial layers, versions, metadata, visibility, permissions, activation, downloads, and archive status."
        route="/mapping/layers"
        title="Map Layers"
      />
      <DataTable columns={columns} emptyLabel="No spatial layers yet" rows={layers} searchLabel="Search layers, owners, sources" title="Spatial layer registry" />
      <LayerDetailsModal
        layer={metadataLayer}
        onOpenChange={(open) => {
          if (!open) setMetadataLayer(null);
        }}
      />
    </section>
  );
}

function BoundariesTable({ boundaries }: { boundaries: BoundaryRecord[] }) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const [historyBoundary, setHistoryBoundary] = useState<BoundaryRecord | null>(null);
  const columns: TableColumn<BoundaryRecord>[] = [
    { key: "name", header: "Boundary", value: (row) => row.name, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "type", header: "Type", value: (row) => row.type, render: (row) => row.type },
    { key: "parent", header: "Parent", value: (row) => row.parent, render: (row) => row.parent },
    { key: "coverage", header: "Coverage", align: "right", value: (row) => String(row.coveragePercent), render: (row) => <Badge tone={coverageTone(row.coveragePercent)}>{row.coveragePercent}%</Badge> },
    { key: "geometry", header: "Geometry", value: (row) => row.geometryStatus, render: (row) => <Badge tone={statusTone(row.geometryStatus)}>{row.geometryStatus}</Badge> },
    { key: "version", header: "Version", value: (row) => row.version, render: (row) => row.version },
    { key: "actions", header: "Actions", align: "right", render: (row) => <Button onClick={() => setHistoryBoundary(row)} size="sm" variant="secondary"><Archive aria-hidden="true" /> History</Button> },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader
        action={
          <Button
            onClick={() =>
              pushToast({
                title: "Upload isn't available yet",
                description: "Connect a GIS file-processing service to upload boundary geometry. This control is a preview for now.",
                tone: "warning",
              })
            }
            variant="primary"
          >
            <Upload aria-hidden="true" /> Upload boundary
          </Button>
        }
        description="Validate geometry, simplify polygons, assign boundaries to locations, version changes, and archive old boundaries."
        route="/mapping/boundaries"
        title="Boundaries"
      />
      <DataTable columns={columns} emptyLabel="No boundaries configured yet" rows={boundaries} searchLabel="Search boundaries, codes, hierarchy" title="Boundary registry" />
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

function CoverageWorkspace({ coverage }: { coverage: CoverageRecord[] }) {
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

function IndicatorWorkspace({ indicatorGeography }: { indicatorGeography: IndicatorGeography[] }) {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
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
        </article>
      ))}
    </section>
  );
}

function SpatialQualityWorkspace({
  issues,
  onOpenDataQuality,
}: {
  issues: SpatialQualityIssue[];
  onOpenDataQuality: () => void;
}) {
  const columns: TableColumn<SpatialQualityIssue>[] = [
    { key: "issue", header: "Issue", value: (row) => row.issueType, render: (row) => <span className="font-medium">{row.issueType}</span> },
    { key: "submission", header: "Submission", value: (row) => row.submissionId, render: (row) => row.submissionId },
    { key: "enumerator", header: "Enumerator", value: (row) => row.enumerator, render: (row) => row.enumerator },
    { key: "location", header: "Location", value: (row) => row.location, render: (row) => row.location },
    { key: "severity", header: "Severity", value: (row) => row.severity, render: (row) => <Badge tone={severityTone(row.severity)}>{row.severity}</Badge> },
    { key: "state", header: "Validation", value: (row) => row.validationState, render: (row) => <Badge tone={statusTone(row.validationState)}>{row.validationState}</Badge> },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader
        action={<Button onClick={onOpenDataQuality} variant="secondary"><FileWarning aria-hidden="true" /> Open Data Quality</Button>}
        description="Review GPS mismatches, duplicate points, outlier locations, low-quality submissions, and boundary violations."
        route="/mapping/data-quality-maps"
        title="Data Quality Maps"
      />
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
  "facility-maps": "On our roadmap — Facility Maps require a facility registry (schools, clinics, water points, offices, warehouses) that hasn't been built yet.",
  "coverage-maps": "On our roadmap — Coverage Maps require coverage targets and boundary geometry that aren't connected yet.",
  "indicator-maps": "On our roadmap — Indicator Maps require linking indicator values and targets to specific locations, which isn't connected yet.",
  layers: "On our roadmap — Map Layers require a GIS file-processing service for uploading, versioning, and managing spatial layers.",
  boundaries: "On our roadmap — Boundaries require administrative and project boundary geometry uploads, which aren't connected yet.",
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
          {NOT_AVAILABLE_REASONS[section.id] ?? "This view is on our roadmap and isn't connected to live data yet for this organization."}
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
