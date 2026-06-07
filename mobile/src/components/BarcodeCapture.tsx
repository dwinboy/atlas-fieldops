import { Pressable, Text, TextInput, View } from "react-native";

type BarcodeCaptureProps = {
  value: string;
  onChange: (code: string) => void;
  mode?: "barcode" | "qr";
  required?: boolean;
};

export function BarcodeCapture({ value, onChange, mode = "barcode", required = false }: BarcodeCaptureProps) {
  const label = mode === "qr" ? "QR code" : "Barcode";

  return (
    <View style={{ gap: 10 }}>
      {value ? (
        <View style={{
          backgroundColor: "#f0fdf4",
          borderColor: "#bbf7d0",
          borderRadius: 12,
          borderWidth: 1,
          padding: 14,
          gap: 4,
        }}>
          <Text style={{ color: "#15803d", fontWeight: "700", fontSize: 13 }}>
            {label} entered
          </Text>
          <Text style={{ color: "#12332b", fontFamily: "monospace", fontSize: 14 }}>{value}</Text>
        </View>
      ) : (
        <View style={{
          backgroundColor: required ? "#fff7ed" : "#f6faf8",
          borderColor: required ? "#fed7aa" : "#dbe7e2",
          borderRadius: 12,
          borderWidth: 1,
          padding: 14,
          gap: 4,
        }}>
          <Text style={{ color: required ? "#9a3412" : "#49635a", fontWeight: "600" }}>
            {required ? `${label} required` : `No ${label.toLowerCase()} entered`}
          </Text>
        </View>
      )}

      <TextInput
        autoCapitalize="characters"
        autoCorrect={false}
        onChangeText={onChange}
        placeholder={`Type or scan ${label.toLowerCase()}…`}
        placeholderTextColor="#b0c5bc"
        style={{
          backgroundColor: "#f6faf8",
          borderColor: "#dbe7e2",
          borderRadius: 12,
          borderWidth: 1,
          color: "#12332b",
          fontSize: 15,
          padding: 14,
          fontFamily: "monospace",
        }}
        value={value}
      />

      <View style={{
        backgroundColor: "#fff7ed",
        borderColor: "#fed7aa",
        borderRadius: 10,
        borderWidth: 1,
        padding: 10,
      }}>
        <Text style={{ color: "#9a3412", fontSize: 12 }}>
          📱 Camera barcode scanning will be enabled in the next build. Enter the code manually for now.
        </Text>
      </View>
    </View>
  );
}
