import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const [walking, setWalking] = useState(false);
  const [autoTrace, setAutoTrace] = useState(true);
  const [intervalSec, setIntervalSec] = useState(10);
  const webviewRef = useRef<WebView>(null);
  const { capture, watchPosition } = useGPS();
  const watchSubRef = useRef<{ remove: () => void } | null>(null);
  const lastFixRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastDropRef = useRef(0);
  // Read latest auto-trace settings inside the long-lived watch callback.
  const autoTraceRef = useRef(autoTrace);
  const intervalRef = useRef(intervalSec);
  autoTraceRef.current = autoTrace;
  intervalRef.current = intervalSec;

  function sendCommand(command: PolygonMapCommand) {
    webviewRef.current?.injectJavaScript(`window.dispatchMapCommand(${JSON.stringify(command)}); true;`);
  }

  function stopWalking() {
    watchSubRef.current?.remove();
    watchSubRef.current = null;
    setWalking(false);
  }

  async function startWalking() {
    if (watchSubRef.current) return;
    lastDropRef.current = 0;
    const subscription = await watchPosition(
      (fix) => {
        lastFixRef.current = { latitude: fix.latitude, longitude: fix.longitude };
        sendCommand({
          type: "setLocation",
          latitude: fix.latitude,
          longitude: fix.longitude,
          accuracy: fix.accuracy,
          recenter: true,
        });
        if (autoTraceRef.current) {
          const now = Date.now();
          if (now - lastDropRef.current >= intervalRef.current * 1000) {
            lastDropRef.current = now;
            sendCommand({ type: "addPoint", latitude: fix.latitude, longitude: fix.longitude });
          }
        }
      },
      { timeInterval: 2000, distanceInterval: 1 },
    );
    if (subscription) {
      watchSubRef.current = subscription;
      setMapError(null);
      setWalking(true);
    } else {
      setMapError("Location permission is needed to walk the boundary.");
    }
  }

  function toggleWalking() {
    if (walking) {
      stopWalking();
    } else {
      void startWalking();
    }
  }

  async function addPointNow() {
    const fix = lastFixRef.current;
    if (fix) {
      lastDropRef.current = Date.now();
      sendCommand({ type: "addPoint", latitude: fix.latitude, longitude: fix.longitude });
      return;
    }
    const gps = await capture();
    if (gps) {
      lastDropRef.current = Date.now();
      sendCommand({ type: "addPoint", latitude: gps.latitude, longitude: gps.longitude });
    }
  }

  async function locateMe() {
    const last = lastFixRef.current;
    if (last) {
      sendCommand({ type: "setLocation", latitude: last.latitude, longitude: last.longitude, recenter: true });
      return;
    }
    const gps = await capture();
    if (gps) {
      lastFixRef.current = { latitude: gps.latitude, longitude: gps.longitude };
      sendCommand({ type: "setLocation", latitude: gps.latitude, longitude: gps.longitude, accuracy: gps.accuracy, recenter: true });
    }
  }

  // Always release the GPS watch when the editor closes or the component unmounts.
  useEffect(() => {
    if (!editing && watchSubRef.current) {
      watchSubRef.current.remove();
      watchSubRef.current = null;
      setWalking(false);
    }
    return () => {
      watchSubRef.current?.remove();
      watchSubRef.current = null;
    };
  }, [editing]);

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

  const instruction = walking
    ? autoTrace
      ? `Walking the boundary — a point drops automatically every ${intervalSec}s. Use "Add point" at sharp corners.`
      : `Walking — tap "Add point" at each corner of the boundary.`
    : `Walk the boundary with GPS, tap the map, or add points manually. Need ${minVertices}+ points, then tap "Done".`;

  if (editing) {
    return (
      <Modal animationType="slide" onRequestClose={() => setEditing(false)} presentationStyle="fullScreen" statusBarTranslucent visible>
        <SafeAreaView edges={["top", "bottom"]} style={styles.fullScreen}>
          <View style={styles.topBar}>
            <View style={styles.topBarText}>
              <Text style={styles.topTitle}>Draw boundary</Text>
              <Text style={styles.topSubtitle}>
                {vertexCount} point{vertexCount === 1 ? "" : "s"} · {minVertices} minimum
              </Text>
            </View>
            <Pressable accessibilityLabel="Close boundary editor" onPress={() => setEditing(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.mapFull}>
            <WebView
              onMessage={handleMessage}
              originWhitelist={["*"]}
              ref={webviewRef}
              source={{ html: buildPolygonMapHtml() }}
              style={styles.webview}
            />
            <Pressable accessibilityLabel="Center map on my location" onPress={() => void locateMe()} style={styles.locateButton}>
              <Text style={styles.locateButtonText}>◎</Text>
            </Pressable>
          </View>

          {mapError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{mapError}</Text>
            </View>
          ) : null}

          <View style={styles.bottomPanel}>
            <Text style={styles.instruction}>{instruction}</Text>
            <View style={styles.walkRow}>
              <Pressable onPress={toggleWalking} style={[styles.walkButton, styles.flexButton, walking ? styles.walkButtonActive : null]}>
                <Text style={[styles.walkButtonText, walking ? styles.walkButtonTextActive : null]}>
                  {walking ? "■ Stop walking" : "▶ Walk boundary"}
                </Text>
              </Pressable>
              <Pressable onPress={() => void addPointNow()} style={[styles.secondaryButton, styles.flexButton]}>
                <Text style={styles.secondaryButtonText}>＋ Add point</Text>
              </Pressable>
            </View>
            {walking ? (
              <View style={styles.walkRow}>
                <Pressable
                  onPress={() => setAutoTrace((current) => !current)}
                  style={[styles.toggleChip, autoTrace ? styles.toggleChipActive : null]}
                >
                  <Text style={[styles.toggleChipText, autoTrace ? styles.toggleChipTextActive : null]}>
                    {autoTrace ? "Auto-trace on" : "Auto-trace off"}
                  </Text>
                </Pressable>
                <Text style={styles.intervalLabel}>every</Text>
                {[5, 10, 30].map((sec) => (
                  <Pressable
                    key={sec}
                    onPress={() => setIntervalSec(sec)}
                    style={[styles.intervalChip, intervalSec === sec ? styles.intervalChipActive : null]}
                  >
                    <Text style={[styles.intervalChipText, intervalSec === sec ? styles.intervalChipTextActive : null]}>
                      {sec}s
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.controlsRow}>
              <Pressable onPress={() => sendCommand({ type: "undo" })} style={[styles.secondaryButton, styles.flexButton]}>
                <Text style={styles.secondaryButtonText}>Undo</Text>
              </Pressable>
              <Pressable onPress={() => sendCommand({ type: "clear" })} style={[styles.secondaryButton, styles.flexButton]}>
                <Text style={styles.secondaryButtonText}>Clear</Text>
              </Pressable>
              <Pressable onPress={() => sendCommand({ type: "close" })} style={[styles.primaryButton, styles.flexButton]}>
                <Text style={styles.primaryButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
  webview: {
    flex: 1,
  },
  fullScreen: {
    backgroundColor: "#0b1f1a",
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    backgroundColor: "#0b1f1a",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topBarText: {
    flex: 1,
  },
  topTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },
  topSubtitle: {
    color: "#9bb6ab",
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  mapFull: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  locateButton: {
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 999,
    bottom: 16,
    elevation: 4,
    height: 48,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: 48,
  },
  locateButtonText: {
    color: "#12332b",
    fontSize: 22,
    fontWeight: "700",
  },
  bottomPanel: {
    backgroundColor: "white",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  instruction: {
    color: "#49635a",
    fontSize: 13,
    lineHeight: 18,
  },
  flexButton: {
    flex: 1,
  },
  intervalLabel: {
    color: "#8aa79b",
    fontSize: 12,
    fontWeight: "600",
  },
  walkRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  walkButton: {
    alignItems: "center",
    backgroundColor: "#12332b",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  walkButtonActive: {
    backgroundColor: "#b42318",
  },
  walkButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  walkButtonTextActive: {
    color: "white",
  },
  toggleChip: {
    backgroundColor: "#f0f5f3",
    borderColor: "#dbe7e2",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  toggleChipActive: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  toggleChipText: {
    color: "#49635a",
    fontSize: 12,
    fontWeight: "700",
  },
  toggleChipTextActive: {
    color: "#15803d",
  },
  intervalChip: {
    backgroundColor: "#f0f5f3",
    borderColor: "#dbe7e2",
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 40,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  intervalChipActive: {
    backgroundColor: "#12332b",
    borderColor: "#12332b",
  },
  intervalChipText: {
    color: "#49635a",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  intervalChipTextActive: {
    color: "white",
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
    alignItems: "center",
    backgroundColor: "#f0f5f3",
    borderColor: "#dbe7e2",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#12332b",
    fontSize: 13,
    fontWeight: "700",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#12332b",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
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
