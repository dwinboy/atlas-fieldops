"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

const DEFAULT_CENTER: [number, number] = [10, 10];
const DEFAULT_ZOOM = 3;

export type EmbeddedMapPoint = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  status?: string;
};

const statusColors: Record<string, string> = {
  approved: "bg-success",
  pending: "bg-warning",
  rejected: "bg-danger",
  returned: "bg-warning",
};

function pointIcon(status?: string): L.DivIcon {
  const color = statusColors[(status ?? "").toLowerCase()] ?? "bg-primary";
  return L.divIcon({
    className: "",
    html: `<span class="block h-3 w-3 rounded-full border-2 border-white shadow-md ${color}"></span>`,
    iconAnchor: [6, 6],
    iconSize: [12, 12],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
  }, [map, points]);

  return null;
}

export default function EmbeddedMap({ points }: { points: EmbeddedMapPoint[] }) {
  const positions = useMemo<[number, number][]>(() => points.map((point) => [point.lat, point.lng]), [points]);

  return (
    <div className="relative h-full w-full">
      <MapContainer center={DEFAULT_CENTER} className="h-full w-full" scrollWheelZoom={false} zoom={DEFAULT_ZOOM}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={20}
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds points={positions} />
        {points.map((point, index) => (
          <Marker icon={pointIcon(point.status)} key={point.id} position={positions[index]}>
            {point.label ? <Popup>{point.label}</Popup> : null}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
