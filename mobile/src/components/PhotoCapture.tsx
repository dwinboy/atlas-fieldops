import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";

import { usePhotoCapture, type PhotoResult } from "@/hooks/usePhotoCapture";

type PhotoCaptureProps = {
  value: PhotoResult | null;
  onChange: (result: PhotoResult) => void;
  required?: boolean;
  label?: string;
};

export function PhotoCapture({ value, onChange, required = false, label = "Photo" }: PhotoCaptureProps) {
  const { isCapturing, error, takePhoto, pickFromGallery } = usePhotoCapture();

  async function handleCamera() {
    const result = await takePhoto();
    if (result) onChange(result);
  }

  async function handleGallery() {
    const result = await pickFromGallery();
    if (result) onChange(result);
  }

  return (
    <View style={{ gap: 10 }}>
      {/* Preview */}
      {value ? (
        <View style={{ gap: 8 }}>
          <Image
            source={{ uri: value.uri }}
            style={{ width: "100%", height: 220, borderRadius: 12, backgroundColor: "#f0f5f3" }}
            resizeMode="cover"
          />
          <Text style={{ color: "#49635a", fontSize: 12 }}>
            {value.fileName} · {value.width}×{value.height}
            {value.fileSize ? ` · ${(value.fileSize / 1024).toFixed(0)} KB` : ""}
          </Text>
        </View>
      ) : (
        <View style={{
          backgroundColor: required ? "#fff7ed" : "#f6faf8",
          borderColor: required ? "#fed7aa" : "#dbe7e2",
          borderRadius: 12,
          borderWidth: 1,
          borderStyle: "dashed",
          padding: 24,
          alignItems: "center",
          gap: 6,
        }}>
          <Text style={{ fontSize: 32 }}>📷</Text>
          <Text style={{ color: required ? "#9a3412" : "#49635a", fontWeight: "600", fontSize: 14 }}>
            {required ? `${label} required` : `No ${label.toLowerCase()} captured`}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          disabled={isCapturing}
          onPress={handleCamera}
          style={{
            flex: 1,
            backgroundColor: "#12332b",
            borderRadius: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 12,
          }}
        >
          {isCapturing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={{ fontSize: 16 }}>📷</Text>
          )}
          <Text style={{ color: "white", fontWeight: "700" }}>
            {value ? "Retake" : "Camera"}
          </Text>
        </Pressable>

        <Pressable
          disabled={isCapturing}
          onPress={handleGallery}
          style={{
            flex: 1,
            backgroundColor: "white",
            borderColor: "#dbe7e2",
            borderRadius: 12,
            borderWidth: 1,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 12,
          }}
        >
          <Text style={{ fontSize: 16 }}>🖼</Text>
          <Text style={{ color: "#12332b", fontWeight: "700" }}>Gallery</Text>
        </Pressable>
      </View>

      {error && (
        <View style={{ backgroundColor: "#fee2e2", borderRadius: 10, padding: 10 }}>
          <Text style={{ color: "#b42318", fontSize: 13 }}>{error}</Text>
        </View>
      )}
    </View>
  );
}
