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
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import type { CurrentPrincipal } from "@/lib/api";
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
  type SpatialQualityIssue,
} from "@/modules/mapping/data";
import {
  computeMappingSummary,
  coverageTone,
  filterFeaturesBySection,
  maskCoordinate,
  severityTone,
  statusTone,
  toCsv,
  validateGpsPoint,
  visibilityTone,
} from "@/modules/mapping/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type MappingModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

type MapViewerProps = {
  activeSection: MappingSection;
  basemap: MapBasemap;
  features: MapFeatureRecord[];
  layers: MapLayerRecord[];
  onBasemapChange: (basemap: MapBasemap) => void;
  onFeatureSelect: (feature: MapFeatureRecord) => void;
  privacyVisibility: LayerVisibility;
  selectedFeature: MapFeatureRecord | null;
};

const basemaps: MapBasemap[] = ["Light", "Streets", "Terrain", "Satellite"];

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
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const preview = !token || token === "preview-token";
  const mapFeatures = useMemo(() => (preview ? previewMapFeatures : []), [preview]);
  const mapLayers = useMemo(() => (preview ? previewMapLayers : []), [preview]);
  const boundaries = useMemo(() => (preview ? previewBoundaries : []), [preview]);
  const coverage = useMemo(() => (preview ? previewCoverage : []), [preview]);
  const indicatorGeography = useMemo(() => (preview ? previewIndicatorGeography : []), [preview]);
  const spatialIssues = useMemo(() => (preview ? previewSpatialIssues : []), [preview]);
  const restricted = isRestrictedMapViewer(principal);
  const privacyVisibility: LayerVisibility = restricted ? "Aggregated" : "Internal";

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

  useEffect(() => {
    setSelectedFeature(visibleFeatures[0] ?? null);
  }, [visibleFeatures]);

  function selectSection(section: MappingSection): void {
    setActiveSection(section);
    setSelectedFeature(filterFeaturesBySection(mapFeatures, section)[0] ?? null);
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
          {mappingSections.map((section) => (
            <button
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
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
          onOpenQuality={() => setActiveSection("data-quality-maps")}
          onOpenSubmissions={() => setActiveView("submissions")}
          summary={summary}
        />
      ) : null}

      <EnterpriseMapViewer
        activeSection={activeSection}
        basemap={basemap}
        features={visibleFeatures}
        layers={mapLayers}
        onBasemapChange={setBasemap}
        onFeatureSelect={setSelectedFeature}
        privacyVisibility={privacyVisibility}
        selectedFeature={selectedFeature}
      />

      <SectionContent
        activeSection={activeSection}
        boundaries={boundaries}
        coverage={coverage}
        indicatorGeography={indicatorGeography}
        mapFeatures={mapFeatures}
        mapLayers={mapLayers}
        privacyVisibility={privacyVisibility}
        selectedFeature={selectedFeature}
        setActiveSection={setActiveSection}
        spatialIssues={spatialIssues}
      />
    </section>
  );
}

function MappingDashboard({
  onOpenQuality,
  onOpenSubmissions,
  summary,
}: {
  onOpenQuality: () => void;
  onOpenSubmissions: () => void;
  summary: MappingSummary;
}) {
  const cards: { icon: LucideIcon; label: string; tone?: BadgeProps["tone"]; value: string | number }[] = [
    { icon: Layers, label: "Active Map Layers", value: summary.activeMapLayers },
    { icon: MapPinned, label: "Project Locations", value: summary.projectLocations },
    { icon: LocateFixed, label: "Submission Points", value: summary.submissionPoints.toLocaleString() },
    { icon: Shield, label: "Beneficiary Points", value: summary.beneficiaryPoints.toLocaleString() },
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
        <Signal label="Latest synced point" value="MOB-2026-0001 · 6m accuracy" tone="success" />
        <Signal label="Boundary warnings" value="2 records need review" tone="warning" />
        <Button className="mt-3" onClick={onOpenSubmissions} size="sm" variant="secondary">Open submissions</Button>
      </Panel>
      <Panel title="Data Quality Spatial Alerts">
        <Signal label="Duplicate cluster" value="Critical · Littoral / Wouri" tone="danger" />
        <Signal label="Outside boundary" value="High · Far North" tone="warning" />
        <Button className="mt-3" onClick={onOpenQuality} size="sm" variant="secondary">Open quality map</Button>
      </Panel>
      <Panel title="Boundary Upload Status">
        <Signal label="Administrative boundaries" value="v4 validated" tone="success" />
        <Signal label="Project area" value="2 missing community polygons" tone="warning" />
      </Panel>
      <Panel title="High-Priority Geographic Gaps">
        <Signal label="No-data area" value="Mayo-Sava target not reached" tone="danger" />
        <Signal label="Under-covered" value="Wouri facility assessment" tone="warning" />
      </Panel>
    </div>
  );
}

function EnterpriseMapViewer({
  activeSection,
  basemap,
  features,
  layers,
  onBasemapChange,
  onFeatureSelect,
  privacyVisibility,
  selectedFeature,
}: MapViewerProps) {
  const activeInfo = mappingSections.find((section) => section.id === activeSection) ?? mappingSections[0];
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
            <button className="w-full rounded-xl border bg-background/70 p-3 text-left transition hover:border-primary/30 hover:bg-primary/5" key={layer.id} type="button">
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
              <Input className="pl-9" placeholder="Search project, location, layer" />
            </label>
            <Select value={basemap} onChange={(event) => onBasemapChange(event.target.value as MapBasemap)}>
              {basemaps.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
            <Button size="sm" variant="secondary"><Maximize2 aria-hidden="true" /> Fullscreen</Button>
            <Button size="sm" variant="secondary"><Printer aria-hidden="true" /> Print</Button>
          </div>
        </div>
        <div className={cn("relative min-h-[480px] overflow-hidden", basemapClass(basemap))}>
          <div className="absolute inset-0 opacity-60">
            <div className="absolute left-[10%] top-[16%] h-[30%] w-[30%] rounded-[45%] border border-primary/30 bg-primary/10" />
            <div className="absolute right-[14%] top-[20%] h-[28%] w-[22%] rounded-[42%] border border-warning/30 bg-warning/10" />
            <div className="absolute bottom-[15%] left-[34%] h-[32%] w-[28%] rounded-[46%] border border-success/30 bg-success/10" />
            <div className="absolute bottom-[12%] right-[20%] h-[26%] w-[20%] rounded-[44%] border border-danger/30 bg-danger/10" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:42px_42px]" />
          {features.map((feature) => (
            <button
              aria-label={`${feature.category}: ${feature.label}`}
              className={cn(
                "absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border bg-panel/95 px-2.5 py-1 text-xs font-medium shadow-line transition hover:scale-105",
                selectedFeature?.id === feature.id ? "border-primary text-primary ring-4 ring-primary/10" : "border-border",
              )}
              key={feature.id}
              onClick={() => onFeatureSelect(feature)}
              style={{ left: `${feature.x}%`, top: `${feature.y}%` }}
              type="button"
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", pointColor(feature.status))} />
              {feature.label}
            </button>
          ))}
          <div className="absolute bottom-4 left-4 rounded-xl border bg-panel/95 p-3 shadow-line">
            <p className="text-xs font-semibold">Legend</p>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <LegendItem color="bg-success" label="Healthy spatial evidence" />
              <LegendItem color="bg-warning" label="Needs validation" />
              <LegendItem color="bg-danger" label="Critical issue or gap" />
            </div>
          </div>
          <div className="absolute right-4 top-4 rounded-xl border bg-panel/95 p-3 text-xs shadow-line">
            <p className="font-semibold">Draw / select area</p>
            <p className="mt-1 text-muted-foreground">Bounding-box and polygon tools are ready for GIS engine integration.</p>
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
  privacyVisibility,
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
  privacyVisibility: LayerVisibility;
  selectedFeature: MapFeatureRecord | null;
  setActiveSection: (section: MappingSection) => void;
  spatialIssues: SpatialQualityIssue[];
}) {
  if (activeSection === "layers") return <LayersTable layers={mapLayers} />;
  if (activeSection === "boundaries") return <BoundariesTable boundaries={boundaries} />;
  if (activeSection === "coverage-maps") return <CoverageWorkspace coverage={coverage} />;
  if (activeSection === "indicator-maps") return <IndicatorWorkspace indicatorGeography={indicatorGeography} />;
  if (activeSection === "data-quality-maps") {
    return <SpatialQualityWorkspace issues={spatialIssues} />;
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
        route={mappingSections.find((section) => section.id === activeSection)?.route ?? "/mapping"}
        title={mappingSections.find((section) => section.id === activeSection)?.label ?? "Mapping"}
        description={mappingSections.find((section) => section.id === activeSection)?.description ?? "Spatial analysis"}
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

function LayersTable({ layers }: { layers: MapLayerRecord[] }) {
  const columns: TableColumn<MapLayerRecord>[] = [
    { key: "name", header: "Layer", value: (row) => row.name, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "type", header: "Type", value: (row) => row.type, render: (row) => row.type },
    { key: "visibility", header: "Visibility", value: (row) => row.visibility, render: (row) => <Badge tone={visibilityTone(row.visibility)}>{row.visibility}</Badge> },
    { key: "geometry", header: "Geometry", value: (row) => row.geometryType, render: (row) => row.geometryType },
    { key: "features", header: "Features", align: "right", value: (row) => String(row.featureCount), render: (row) => row.featureCount.toLocaleString() },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "actions", header: "Actions", align: "right", render: () => <Button size="sm" variant="secondary"><Eye aria-hidden="true" /> Metadata</Button> },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader
        action={<Button variant="primary"><Upload aria-hidden="true" /> Upload GeoJSON, KML, Shapefile, or CSV</Button>}
        description="Manage reusable spatial layers, versions, metadata, visibility, permissions, activation, downloads, and archive status."
        route="/mapping/layers"
        title="Map Layers"
      />
      <DataTable columns={columns} emptyLabel="No spatial layers yet" rows={layers} searchLabel="Search layers, owners, sources" title="Spatial layer registry" />
    </section>
  );
}

function BoundariesTable({ boundaries }: { boundaries: BoundaryRecord[] }) {
  const columns: TableColumn<BoundaryRecord>[] = [
    { key: "name", header: "Boundary", value: (row) => row.name, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "type", header: "Type", value: (row) => row.type, render: (row) => row.type },
    { key: "parent", header: "Parent", value: (row) => row.parent, render: (row) => row.parent },
    { key: "coverage", header: "Coverage", align: "right", value: (row) => String(row.coveragePercent), render: (row) => <Badge tone={coverageTone(row.coveragePercent)}>{row.coveragePercent}%</Badge> },
    { key: "geometry", header: "Geometry", value: (row) => row.geometryStatus, render: (row) => <Badge tone={statusTone(row.geometryStatus)}>{row.geometryStatus}</Badge> },
    { key: "version", header: "Version", value: (row) => row.version, render: (row) => row.version },
    { key: "actions", header: "Actions", align: "right", render: () => <Button size="sm" variant="secondary"><Archive aria-hidden="true" /> History</Button> },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader
        action={<Button variant="primary"><Upload aria-hidden="true" /> Upload boundary</Button>}
        description="Validate geometry, simplify polygons, assign boundaries to locations, version changes, and archive old boundaries."
        route="/mapping/boundaries"
        title="Boundaries"
      />
      <DataTable columns={columns} emptyLabel="No boundaries configured yet" rows={boundaries} searchLabel="Search boundaries, codes, hierarchy" title="Boundary registry" />
    </section>
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

function SpatialQualityWorkspace({ issues }: { issues: SpatialQualityIssue[] }) {
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
        action={<Button variant="secondary"><FileWarning aria-hidden="true" /> Open Data Quality</Button>}
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

function basemapClass(basemap: MapBasemap): string {
  if (basemap === "Satellite") return "bg-slate-900 text-slate-50";
  if (basemap === "Terrain") return "bg-[linear-gradient(135deg,#d9f99d,#bae6fd)]";
  if (basemap === "Streets") return "bg-[linear-gradient(135deg,#f8fafc,#dbeafe)]";
  return "bg-[linear-gradient(135deg,#ffffff,#eef2ff)]";
}

function pointColor(status: string): string {
  if (status === "Healthy") return "bg-success";
  if (status === "Warning") return "bg-warning";
  return "bg-danger";
}

export const mappingValidationEngine = {
  validateGpsPoint,
};
