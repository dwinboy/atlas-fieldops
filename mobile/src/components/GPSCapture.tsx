import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { GPSMapPreview } from "@/components/GPSMapPreview";
import { useGPS, type GPSResult } from "@/hooks/useGPS";

type GPSCaptureProps = {
  value: GPSResult | null;
  onChange: (result: GPSResult) => void;
  required?: boolean;
};

export function GPSCapture({ value, onChange, required = false }: GPSCaptureProps) {
  const { status, error, isCapturing, capture, reset } = useGPS();
  const [showMap, setShowMap] = useState(false);

  async function handleCapture() {
    const result = await capture();
    if (result) onChange(result);
  }

  const accuracyLabel = value?.accuracy != null ? `±${Math.round(value.accuracy)}m` : null;
  const isGoodAccuracy = value?.accuracy != null && value.accuracy <= 15;
  const isOkAccuracy = value?.accuracy != null && value.accuracy <= 50;

  return (
    <View style={{ gap: 10 }}>
      {/* Captured value display */}
      {value ? (
        <View style={{
          backgroundColor: "#f0fdf4",
          borderColor: "#bbf7d0",
          borderRadius: 12,
          borderWidth: 1,
          padding: 14,
          gap: 6,
        }}>
          <Text style={{ color: "#15803d", fontWeight: "700", fontSize: 13 }}>📍 GPS captured</Text>
          <Text style={{ color: "#12332b", fontSize: 14, fontFamily: "monospace" }}>
            {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            {accuracyLabel && (
              <View style={{
                backgroundColor: isGoodAccuracy ? "#dcfce7" : isOkAccuracy ? "#fff7ed" : "#fee2e2",
                borderRadius: 20,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: isGoodAccuracy ? "#15803d" : isOkAccuracy ? "#9a3412" : "#b42318",
                }}>
                  Accuracy {accuracyLabel}
                </Text>
              </View>
            )}
            {value.altitude != null && (
              <Text style={{ color: "#49635a", fontSize: 12 }}>Alt {value.altitude.toFixed(0)}m</Text>
            )}
          </View>
          <Pressable onPress={() => setShowMap((prev) => !prev)}>
            <Text style={{ color: "#15803d", fontSize: 12, fontWeight: "700" }}>
              {showMap ? "Hide map" : "View on map"}
            </Text>
          </Pressable>
          {showMap && (
            <GPSMapPreview accuracy={value.accuracy} latitude={value.latitude} longitude={value.longitude} />
          )}
        </View>
      ) : (
        <View style={{
          backgroundColor: required ? "#fff7ed" : "#f6faf8",
          borderColor: required ? "#fed7aa" : "#dbe7e2",
          borderRadius: 12,
          borderWidth: 1,
          padding: 14,
          alignItems: "center",
          gap: 4,
        }}>
          <Text style={{ color: required ? "#9a3412" : "#49635a", fontSize: 13, fontWeight: "600" }}>
            {required ? "GPS location required" : "No GPS captured yet"}
          </Text>
          <Text style={{ color: "#8aa79b", fontSize: 12 }}>
            Tap the button below to get your current location.
          </Text>
        </View>
      )}

      {/* Capture button */}
      <Pressable
        disabled={isCapturing}
        onPress={handleCapture}
        style={{
          backgroundColor: isCapturing ? "#8aa79b" : "#12332b",
          borderRadius: 12,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 10,
          paddingVertical: 14,
          paddingHorizontal: 20,
        }}
      >
        {isCapturing ? (
          <>
            <ActivityIndicator color="white" size="small" />
            <Text style={{ color: "white", fontWeight: "700" }}>
              {status === "requesting" ? "Requesting permission…" : "Getting location…"}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 18 }}>📡</Text>
            <Text style={{ color: "white", fontWeight: "700" }}>
              {value ? "Re-capture GPS" : "Capture GPS location"}
            </Text>
          </>
        )}
      </Pressable>

      {/* Error message */}
      {error && (
        <View style={{
          backgroundColor: "#fee2e2",
          borderColor: "#fca5a5",
          borderRadius: 10,
          borderWidth: 1,
          padding: 10,
        }}>
          <Text style={{ color: "#b42318", fontSize: 13, fontWeight: "600" }}>{error}</Text>
        </View>
      )}

      {/* Poor accuracy warning */}
      {value?.accuracy != null && value.accuracy > 50 && (
        <View style={{
          backgroundColor: "#fff7ed",
          borderColor: "#fed7aa",
          borderRadius: 10,
          borderWidth: 1,
          padding: 10,
        }}>
          <Text style={{ color: "#9a3412", fontSize: 12, fontWeight: "600" }}>
            ⚠ Poor GPS accuracy ({Math.round(value.accuracy)}m). Move to an open area and re-capture for better results.
          </Text>
        </View>
      )}
    </View>
  );
}
