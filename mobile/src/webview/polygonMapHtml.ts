import { LEAFLET_CSS, LEAFLET_JS } from "@/webview/leafletAssets.generated";

export type PolygonMapCommand =
  | {
      type: "init";
      center?: { latitude: number; longitude: number } | null;
      existingPolygon?: number[][][] | null;
      minVertices?: number;
    }
  | { type: "addPoint"; latitude: number; longitude: number }
  | {
      type: "setLocation";
      latitude: number;
      longitude: number;
      accuracy?: number | null;
      recenter?: boolean;
    }
  | { type: "undo" }
  | { type: "clear" }
  | { type: "close" };

export type PolygonMapEvent =
  | { type: "ready" }
  | { type: "vertexAdded"; vertices: number[][]; vertexCount: number }
  | { type: "polygonClosed"; coordinates: number[][] }
  | { type: "error"; message: string };

/** Parses a `WebView.onMessage` payload into a typed `PolygonMapEvent`, or `null` if it isn't one. */
export function parsePolygonMapEvent(raw: string): PolygonMapEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const candidate = parsed as Record<string, unknown>;

  if (candidate.type === "ready") {
    return { type: "ready" };
  }
  if (candidate.type === "vertexAdded" && Array.isArray(candidate.vertices)) {
    const vertices = candidate.vertices.filter(isCoordinatePair);
    return { type: "vertexAdded", vertices, vertexCount: vertices.length };
  }
  if (candidate.type === "polygonClosed" && Array.isArray(candidate.coordinates)) {
    const coordinates = candidate.coordinates.filter(isCoordinatePair);
    return { type: "polygonClosed", coordinates };
  }
  if (candidate.type === "error") {
    return { type: "error", message: typeof candidate.message === "string" ? candidate.message : "Map error" };
  }
  return null;
}

function isCoordinatePair(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === "number" && Number.isFinite(item));
}

/** Builds the offline-bundled Leaflet HTML page used for tap-to-add-vertex polygon drawing. */
export function buildPolygonMapHtml(): string {
  const css = LEAFLET_CSS.replace(/<\/style/gi, "<\\/style");
  const js = LEAFLET_JS.replace(/<\/script/gi, "<\\/script");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>${css}</style>
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #eef3f1; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>${js}</script>
    <script>
      var map = L.map("map", { zoomControl: true, attributionControl: false }).setView([0, 0], 3);

      // Real basemap imagery so the boundary is drawn over actual terrain/roads (online).
      // Offline, tiles simply fail to load and the captured shape still renders.
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        crossOrigin: true,
      }).addTo(map);

      var vertices = [];
      var markers = [];
      var shapeLayer = null;
      var minVertices = 3;
      var locationMarker = null;
      var accuracyCircle = null;

      function setLocation(lat, lng, accuracy, recenter) {
        var latlng = [lat, lng];
        if (!locationMarker) {
          locationMarker = L.circleMarker(latlng, {
            radius: 7, color: "#ffffff", weight: 2, fillColor: "#2563eb", fillOpacity: 1,
          }).addTo(map);
        } else {
          locationMarker.setLatLng(latlng);
        }
        if (typeof accuracy === "number" && accuracy > 0) {
          if (!accuracyCircle) {
            accuracyCircle = L.circle(latlng, {
              radius: accuracy, color: "#3b82f6", weight: 1, fillColor: "#3b82f6", fillOpacity: 0.08,
            }).addTo(map);
          } else {
            accuracyCircle.setLatLng(latlng);
            accuracyCircle.setRadius(accuracy);
          }
        }
        if (recenter) {
          map.setView(latlng, Math.max(map.getZoom(), 17));
        }
      }

      var VERTEX_STYLE = { radius: 6, color: "#12332b", weight: 2, fillColor: "#ffffff", fillOpacity: 1 };
      var SHAPE_STYLE = { color: "#12332b", weight: 2, fillColor: "#12332b", fillOpacity: 0.15 };

      function post(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      function redraw() {
        if (shapeLayer) {
          map.removeLayer(shapeLayer);
          shapeLayer = null;
        }
        if (vertices.length >= 3) {
          shapeLayer = L.polygon(vertices, SHAPE_STYLE).addTo(map);
        } else if (vertices.length === 2) {
          shapeLayer = L.polyline(vertices, SHAPE_STYLE).addTo(map);
        }
      }

      function emitVertices() {
        post({ type: "vertexAdded", vertices: vertices.slice(), vertexCount: vertices.length });
      }

      function addVertex(latlng) {
        vertices.push([latlng.lat, latlng.lng]);
        markers.push(L.circleMarker(latlng, VERTEX_STYLE).addTo(map));
        redraw();
        emitVertices();
      }

      function undo() {
        if (!vertices.length) return;
        vertices.pop();
        var marker = markers.pop();
        if (marker) map.removeLayer(marker);
        redraw();
        emitVertices();
      }

      function clearAll() {
        vertices = [];
        markers.forEach(function (marker) { map.removeLayer(marker); });
        markers = [];
        redraw();
        emitVertices();
      }

      function closeShape() {
        if (vertices.length < minVertices) {
          post({ type: "error", message: "Add at least " + minVertices + " points before closing the shape." });
          return;
        }
        redraw();
        post({ type: "polygonClosed", coordinates: vertices.concat([vertices[0]]) });
      }

      map.on("click", function (event) { addVertex(event.latlng); });

      window.dispatchMapCommand = function (command) {
        if (!command || typeof command !== "object") return;
        if (command.type === "init") {
          if (typeof command.minVertices === "number" && command.minVertices >= 3) {
            minVertices = command.minVertices;
          }
          var ring = command.existingPolygon && command.existingPolygon[0];
          if (ring && ring.length >= 4) {
            vertices = ring.slice(0, ring.length - 1).map(function (point) { return [point[1], point[0]]; });
            vertices.forEach(function (point) {
              markers.push(L.circleMarker(point, VERTEX_STYLE).addTo(map));
            });
            redraw();
            if (shapeLayer) map.fitBounds(shapeLayer.getBounds(), { padding: [24, 24] });
            emitVertices();
          } else if (command.center) {
            map.setView([command.center.latitude, command.center.longitude], 16);
          }
        } else if (command.type === "addPoint") {
          addVertex({ lat: command.latitude, lng: command.longitude });
        } else if (command.type === "setLocation") {
          setLocation(command.latitude, command.longitude, command.accuracy, command.recenter);
        } else if (command.type === "undo") {
          undo();
        } else if (command.type === "clear") {
          clearAll();
        } else if (command.type === "close") {
          closeShape();
        }
      };

      post({ type: "ready" });
    </script>
  </body>
</html>`;
}
