"use client";

import "leaflet/dist/leaflet.css";

import L, { type Map as LeafletMapInstance } from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import type { LayerVisibility, MapBasemap, MapFeatureRecord } from "@/modules/mapping/data";
import { maskedCoordinates, pointColor, type BoundingBox } from "@/modules/mapping/utils";

const DRAW_COLOR = "#13766d";

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

function featureIcon(feature: MapFeatureRecord, isSelected: boolean): L.DivIcon {
  const color = pointColor(feature.status);
  const ring = isSelected ? " scale-125 ring-4 ring-primary/40" : "";
  return L.divIcon({
    className: "",
    html: `<span class="block h-3.5 w-3.5 rounded-full border-2 border-white shadow-md ${color}${ring}"></span>`,
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

type LeafletMapProps = {
  areaBounds: BoundingBox | null;
  basemap: MapBasemap;
  drawMode: boolean;
  features: MapFeatureRecord[];
  onAreaBoundsChange: (bounds: BoundingBox | null) => void;
  onFeatureSelect: (feature: MapFeatureRecord) => void;
  onMapReady?: (map: LeafletMapInstance) => void;
  privacyVisibility: LayerVisibility;
  selectedFeature: MapFeatureRecord | null;
};

export default function LeafletMap({
  areaBounds,
  basemap,
  drawMode,
  features,
  onAreaBoundsChange,
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

  return (
    <div className="absolute inset-0">
      <MapContainer center={DEFAULT_CENTER} className="h-full w-full" scrollWheelZoom zoom={DEFAULT_ZOOM}>
        <TileLayer attribution={tile.attribution} maxZoom={tile.maxZoom} url={tile.url} />
        <FitBounds points={points} />
        <MapReadyBridge onMapReady={onMapReady} />
        <BoundingBoxDraw active={drawMode} bounds={areaBounds} onBoundsChange={onAreaBoundsChange} />
        {features.map((feature, index) => (
          <Marker
            eventHandlers={{ click: () => onFeatureSelect(feature) }}
            icon={featureIcon(feature, selectedFeature?.id === feature.id)}
            key={feature.id}
            position={points[index]}
          />
        ))}
      </MapContainer>
    </div>
  );
}
