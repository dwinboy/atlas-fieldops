"use client";

import "leaflet/dist/leaflet.css";

import L, { type Map as LeafletMapInstance } from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, Rectangle, TileLayer, Tooltip, useMap } from "react-leaflet";

import type { DrawnBoundary, LayerVisibility, MapBasemap, MapFeatureRecord } from "@/modules/mapping/data";
import { maskedCoordinates, pointColor, statusColor, type BoundingBox, type MapBoundaryShape } from "@/modules/mapping/utils";

const DRAW_COLOR = "#13766d";
export type BoundaryDrawMode = "polygon" | "rectangle" | null;

const DEFAULT_CENTER: [number, number] = [10, 10];
const DEFAULT_ZOOM = 3;

const BASEMAP_TILES: Record<MapBasemap, { url: string; attribution: string; maxZoom: number }> = {
  Light: {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  },
  Streets: {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  },
  Terrain: {
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  },
  Satellite: {
    attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  },
};

function featureIcon(feature: MapFeatureRecord, isSelected: boolean, opacity: number): L.DivIcon {
  const color = pointColor(feature.status);
  const ring = isSelected ? " scale-125 ring-4 ring-primary/40" : "";
  return L.divIcon({
    className: "",
    html: `<span class="block h-3.5 w-3.5 rounded-full border-2 border-white shadow-md ${color}${ring}" style="opacity:${opacity}"></span>`,
    iconAnchor: [7, 7],
    iconSize: [14, 14],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
  }, [map, points]);

  return null;
}

function MapReadyBridge({ onMapReady }: { onMapReady?: (map: LeafletMapInstance) => void }) {
  const map = useMap();

  useEffect(() => {
    onMapReady?.(map);
  }, [map, onMapReady]);

  return null;
}

function BoundingBoxDraw({
  active,
  bounds,
  onBoundsChange,
}: {
  active: boolean;
  bounds: BoundingBox | null;
  onBoundsChange: (bounds: BoundingBox | null) => void;
}) {
  const map = useMap();
  const rectangleRef = useRef<L.Rectangle | null>(null);
  const startRef = useRef<L.LatLng | null>(null);

  useEffect(() => {
    if (!active) return;

    map.dragging.disable();
    const container = map.getContainer();
    container.style.cursor = "crosshair";

    function clearRectangle(): void {
      if (rectangleRef.current) {
        map.removeLayer(rectangleRef.current);
        rectangleRef.current = null;
      }
    }

    function onMouseDown(event: L.LeafletMouseEvent): void {
      startRef.current = event.latlng;
      clearRectangle();
    }

    function onMouseMove(event: L.LeafletMouseEvent): void {
      if (!startRef.current) return;
      const latLngBounds = L.latLngBounds(startRef.current, event.latlng);
      if (rectangleRef.current) {
        rectangleRef.current.setBounds(latLngBounds);
      } else {
        rectangleRef.current = L.rectangle(latLngBounds, {
          color: DRAW_COLOR,
          fillOpacity: 0.1,
          weight: 2,
        }).addTo(map);
      }
    }

    function onMouseUp(event: L.LeafletMouseEvent): void {
      if (!startRef.current) return;
      const latLngBounds = L.latLngBounds(startRef.current, event.latlng);
      startRef.current = null;
      onBoundsChange({
        east: latLngBounds.getEast(),
        north: latLngBounds.getNorth(),
        south: latLngBounds.getSouth(),
        west: latLngBounds.getWest(),
      });
    }

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
      map.dragging.enable();
      container.style.cursor = "";
      startRef.current = null;
    };
  }, [active, map, onBoundsChange]);

  useEffect(() => {
    if (!bounds && rectangleRef.current) {
      map.removeLayer(rectangleRef.current);
      rectangleRef.current = null;
    }
  }, [bounds, map]);

  return null;
}

/** Click-to-place vertex drawing for sketching a boundary polygon. Finishing is triggered externally once 3+ points exist. */
function PolygonVertexDraw({
  active,
  onAddPoint,
}: {
  active: boolean;
  onAddPoint: (point: [number, number]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;

    const container = map.getContainer();
    container.style.cursor = "crosshair";
    map.doubleClickZoom.disable();

    function onClick(event: L.LeafletMouseEvent): void {
      onAddPoint([event.latlng.lat, event.latlng.lng]);
    }

    map.on("click", onClick);

    return () => {
      map.off("click", onClick);
      map.doubleClickZoom.enable();
      container.style.cursor = "";
    };
  }, [active, map, onAddPoint]);

  return null;
}

/** Drag-to-draw a rectangular boundary, completing as a 4-point polygon ring. */
function RectangleBoundaryDraw({
  active,
  onComplete,
}: {
  active: boolean;
  onComplete: (positions: [number, number][]) => void;
}) {
  const map = useMap();
  const rectangleRef = useRef<L.Rectangle | null>(null);
  const startRef = useRef<L.LatLng | null>(null);

  useEffect(() => {
    if (!active) return;

    map.dragging.disable();
    const container = map.getContainer();
    container.style.cursor = "crosshair";

    function clearRectangle(): void {
      if (rectangleRef.current) {
        map.removeLayer(rectangleRef.current);
        rectangleRef.current = null;
      }
    }

    function onMouseDown(event: L.LeafletMouseEvent): void {
      startRef.current = event.latlng;
      clearRectangle();
    }

    function onMouseMove(event: L.LeafletMouseEvent): void {
      if (!startRef.current) return;
      const latLngBounds = L.latLngBounds(startRef.current, event.latlng);
      if (rectangleRef.current) {
        rectangleRef.current.setBounds(latLngBounds);
      } else {
        rectangleRef.current = L.rectangle(latLngBounds, {
          color: DRAW_COLOR,
          fillOpacity: 0.1,
          weight: 2,
        }).addTo(map);
      }
    }

    function onMouseUp(event: L.LeafletMouseEvent): void {
      if (!startRef.current) return;
      const latLngBounds = L.latLngBounds(startRef.current, event.latlng);
      startRef.current = null;
      clearRectangle();
      const northEast = latLngBounds.getNorthEast();
      const southWest = latLngBounds.getSouthWest();
      onComplete([
        [northEast.lat, southWest.lng],
        [northEast.lat, northEast.lng],
        [southWest.lat, northEast.lng],
        [southWest.lat, southWest.lng],
      ]);
    }

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
      map.dragging.enable();
      container.style.cursor = "";
      clearRectangle();
      startRef.current = null;
    };
  }, [active, map, onComplete]);

  return null;
}

type LeafletMapProps = {
  areaBounds: BoundingBox | null;
  basemap: MapBasemap;
  boundaryDrawMode: BoundaryDrawMode;
  boundaryDrawPoints: [number, number][];
  boundaryShapes: MapBoundaryShape[];
  drawMode: boolean;
  drawnBoundaries: DrawnBoundary[];
  densityMode: boolean;
  featureOpacityByCategory: Partial<Record<MapFeatureRecord["category"], number>>;
  features: MapFeatureRecord[];
  onAreaBoundsChange: (bounds: BoundingBox | null) => void;
  onBoundaryDrawComplete: (positions: [number, number][]) => void;
  onBoundaryDrawPoint: (point: [number, number]) => void;
  onFeatureSelect: (feature: MapFeatureRecord) => void;
  onMapReady?: (map: LeafletMapInstance) => void;
  privacyVisibility: LayerVisibility;
  selectedFeature: MapFeatureRecord | null;
};

export default function LeafletMap({
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
  onAreaBoundsChange,
  onBoundaryDrawComplete,
  onBoundaryDrawPoint,
  onFeatureSelect,
  onMapReady,
  privacyVisibility,
  selectedFeature,
}: LeafletMapProps) {
  const tile = BASEMAP_TILES[basemap];
  const points = useMemo<[number, number][]>(
    () => features.map((feature) => maskedCoordinates(feature, privacyVisibility)),
    [features, privacyVisibility],
  );
  const fitPoints = useMemo<[number, number][]>(() => {
    const corners: [number, number][] = boundaryShapes.flatMap((shape) => [
      [shape.bounds.north, shape.bounds.east],
      [shape.bounds.south, shape.bounds.west],
    ]);
    return [...points, ...corners];
  }, [boundaryShapes, points]);

  return (
    <div className="absolute inset-0">
      <MapContainer center={DEFAULT_CENTER} className="h-full w-full" scrollWheelZoom zoom={DEFAULT_ZOOM}>
        <TileLayer attribution={tile.attribution} maxZoom={tile.maxZoom} url={tile.url} />
        <FitBounds points={fitPoints} />
        <MapReadyBridge onMapReady={onMapReady} />
        <BoundingBoxDraw active={drawMode} bounds={areaBounds} onBoundsChange={onAreaBoundsChange} />
        <PolygonVertexDraw active={boundaryDrawMode === "polygon"} onAddPoint={onBoundaryDrawPoint} />
        <RectangleBoundaryDraw active={boundaryDrawMode === "rectangle"} onComplete={onBoundaryDrawComplete} />
        {boundaryShapes.map((shape) => (
          <Rectangle
            bounds={[
              [shape.bounds.south, shape.bounds.west],
              [shape.bounds.north, shape.bounds.east],
            ]}
            key={shape.id}
            pathOptions={{ color: statusColor(shape.status), fillOpacity: 0.06, weight: 2 }}
          >
            <Tooltip sticky>{shape.label} · {shape.pointCount.toLocaleString()} point{shape.pointCount === 1 ? "" : "s"}</Tooltip>
          </Rectangle>
        ))}
        {drawnBoundaries.map((boundary) => (
          <Polygon
            key={boundary.id}
            pathOptions={{ color: DRAW_COLOR, fillOpacity: 0.1, weight: 2 }}
            positions={boundary.positions}
          >
            <Tooltip sticky>{boundary.name}</Tooltip>
          </Polygon>
        ))}
        {boundaryDrawPoints.length ? (
          <>
            {boundaryDrawPoints.length >= 3 ? (
              <Polygon
                pathOptions={{ color: DRAW_COLOR, dashArray: boundaryDrawMode === "polygon" ? "6 4" : "2 6", fillOpacity: 0.08, weight: 2 }}
                positions={boundaryDrawPoints}
              />
            ) : (
              <Polyline pathOptions={{ color: DRAW_COLOR, dashArray: boundaryDrawMode === "polygon" ? "6 4" : "2 6", weight: 2 }} positions={boundaryDrawPoints} />
            )}
            {boundaryDrawPoints.map((point, index) => (
              <CircleMarker center={point} key={`${point[0]}-${point[1]}-${index}`} pathOptions={{ color: DRAW_COLOR, fillOpacity: 1 }} radius={4} />
            ))}
          </>
        ) : null}
        {densityMode
          ? features.map((feature, index) => {
              const opacity = featureOpacityByCategory[feature.category] ?? 1;
              return (
                <CircleMarker
                  center={points[index]}
                  key={`${feature.id}-density`}
                  pathOptions={{ color: statusColor(feature.status), fillColor: statusColor(feature.status), fillOpacity: 0.14 * opacity, opacity: 0.28 * opacity, weight: 1 }}
                  radius={Math.max(16, Math.min(46, 14 + Math.sqrt(feature.count) * 1.2))}
                >
                  <Tooltip sticky>{feature.label} density · {feature.count.toLocaleString()} record{feature.count === 1 ? "" : "s"}</Tooltip>
                </CircleMarker>
              );
            })
          : null}
        {features.map((feature, index) => (
          <Marker
            eventHandlers={{ click: () => onFeatureSelect(feature) }}
            icon={featureIcon(feature, selectedFeature?.id === feature.id, featureOpacityByCategory[feature.category] ?? 1)}
            key={feature.id}
            position={points[index]}
          />
        ))}
      </MapContainer>
    </div>
  );
}
