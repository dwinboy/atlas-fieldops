import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polygon as SvgPolygon } from "react-native-svg";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { useGPS } from "@/hooks/useGPS";
import type { MobilePolygonGeometry } from "@/models/contracts";
import { buildPolygonMapHtml, parsePolygonMapEvent, type PolygonMapCommand } from "@/webview/polygonMapHtml";

type PolygonCaptureProps = {
  value: MobilePolygonGeometry | null;
  onChange: (result: MobilePolygonGeometry) => void;
  required?: boolean;
  minVertices?: number;
};

export function PolygonCapture({ value, onChange, required = false, minVertices = 3 }: PolygonCaptureProps) {
  const [editing, setEditing] = useState(false);
  const [vertexCount, setVertexCount] = useState(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const webviewRef = useRef<WebView>(null);
  const { capture } = useGPS();

  function sendCommand(command: PolygonMapCommand) {
    webviewRef.current?.injectJavaScript(`window.dispatchMapCommand(${JSON.stringify(command)}); true;`);
  }

  function startEditing() {
    setMapError(null);
    setVertexCount(value?.coordinates?.[0] ? Math.max(0, value.coordinates[0].length - 1) : 0);
    setEditing(true);
  }

  async function handleReady() {
    if (value?.coordinates) {
      sendCommand({ type: "init", existingPolygon: value.coordinates, minVertices });
      return;
    }
    const gps = await capture();
    sendCommand({
      type: "init",
      center: gps ? { latitude: gps.latitude, longitude: gps.longitude } : null,
      minVertices,
    });
  }

  function handleMessage(event: WebViewMessageEvent) {
    const message = parsePolygonMapEvent(event.nativeEvent.data);
    if (!message) return;
    if (message.type === "ready") {
      void handleReady();
    } else if (message.type === "vertexAdded") {
      setMapError(null);
      setVertexCount(message.vertexCount);
    } else if (message.type === "polygonClosed") {
      const ring = message.coordinates.map(([lat, lng]) => [lng, lat]);
      onChange({
        type: "Polygon",
        coordinates: [ring],
        properties: { capturedAt: new Date().toISOString(), vertexCount: ring.length - 1 },
      });
      setEditing(false);
    } else if (message.type === "error") {
      setMapError(message.message);
    }
  }

  if (editing) {
    return (
      <View style={{ gap: 10 }}>
        <View style={styles.mapContainer}>
          <WebView
            onMessage={handleMessage}
            originWhitelist={["*"]}
            ref={webviewRef}
            source={{ html: buildPolygonMapHtml() }}
            style={styles.webview}
          />
        </View>
        <Text style={styles.helperText}>
          Tap the map to add points ({vertexCount} added, {minVertices} minimum). Tap "Done" to close the shape.
        </Text>
        {mapError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{mapError}</Text>
          </View>
        )}
        <View style={styles.controlsRow}>
          <Pressable onPress={() => sendCommand({ type: "undo" })} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Undo</Text>
          </Pressable>
          <Pressable onPress={() => sendCommand({ type: "clear" })} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </Pressable>
          <Pressable onPress={() => setEditing(false)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={() => sendCommand({ type: "close" })} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const ring = value?.coordinates?.[0] ?? null;

  return (
    <View style={{ gap: 10 }}>
      {ring && ring.length >= 4 ? (
        <View style={styles.previewCard}>
          <PolygonPreview ring={ring} />
          <Text style={styles.previewLabel}>
            Boundary captured · {ring.length - 1} points
          </Text>
        </View>
      ) : (
        <View style={[styles.placeholderCard, required ? styles.placeholderCardRequired : null]}>
          <Text style={[styles.placeholderTitle, required ? styles.placeholderTitleRequired : null]}>
            {required ? "Boundary required" : "No boundary drawn yet"}
          </Text>
          <Text style={styles.placeholderHint}>Tap the button below to draw a boundary on the map.</Text>
        </View>
      )}
      <Pressable onPress={startEditing} style={styles.primaryButtonWide}>
        <Text style={styles.primaryButtonText}>{ring ? "Edit boundary" : "Draw boundary"}</Text>
      </Pressable>
    </View>
  );
}

function PolygonPreview({ ring }: { ring: number[][] }) {
  const lngs = ring.map((point) => point[0]);
  const lats = ring.map((point) => point[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const spanLng = maxLng - minLng || 1;
  const spanLat = maxLat - minLat || 1;
  const padding = 10;
  const size = 100 - padding * 2;

  const points = ring
    .map(([lng, lat]) => {
      const x = padding + ((lng - minLng) / spanLng) * size;
      const y = padding + ((maxLat - lat) / spanLat) * size;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Svg height={140} viewBox="0 0 100 100" width="100%">
      <SvgPolygon fill="#12332b" fillOpacity={0.15} points={points} stroke="#12332b" strokeWidth={1.5} />
      {ring.slice(0, -1).map(([lng, lat], index) => {
        const cx = padding + ((lng - minLng) / spanLng) * size;
        const cy = padding + ((maxLat - lat) / spanLat) * size;
        return <Circle cx={cx} cy={cy} fill="#12332b" key={index} r={2} />;
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    borderColor: "#dbe7e2",
    borderRadius: 12,
    borderWidth: 1,
    height: 320,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
  },
  helperText: {
    color: "#49635a",
    fontSize: 12,
  },
  errorCard: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  errorText: {
    color: "#b42318",
    fontSize: 13,
    fontWeight: "600",
  },
  controlsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: "#f0f5f3",
    borderColor: "#dbe7e2",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#12332b",
    fontSize: 13,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: "#12332b",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  primaryButtonWide: {
    alignItems: "center",
    backgroundColor: "#12332b",
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  previewCard: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  previewLabel: {
    color: "#15803d",
    fontSize: 13,
    fontWeight: "700",
  },
  placeholderCard: {
    alignItems: "center",
    backgroundColor: "#f6faf8",
    borderColor: "#dbe7e2",
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  placeholderCardRequired: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
  },
  placeholderTitle: {
    color: "#49635a",
    fontSize: 13,
    fontWeight: "600",
  },
  placeholderTitleRequired: {
    color: "#9a3412",
  },
  placeholderHint: {
    color: "#8aa79b",
    fontSize: 12,
  },
});
