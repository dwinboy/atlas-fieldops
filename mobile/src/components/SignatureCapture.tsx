import * as FileSystem from "expo-file-system";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import SignatureView, { type SignatureViewRef } from "react-native-signature-canvas";

export type SignatureResult = {
  uri: string;
  capturedAt: string;
};

type SignatureCaptureProps = {
  value: SignatureResult | null;
  onChange: (result: SignatureResult | null) => void;
  required?: boolean;
};

export function SignatureCapture({ value, onChange, required = false }: SignatureCaptureProps) {
  const ref = useRef<SignatureViewRef>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOK(signature: string) {
    setIsSaving(true);
    setError(null);
    try {
      const base64 = signature.replace(/^data:image\/\w+;base64,/, "");
      const dir = `${FileSystem.documentDirectory}signatures`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
      const uri = `${dir}/signature-${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      onChange({ uri, capturedAt: new Date().toISOString() });
      setIsDrawing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the signature.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isDrawing) {
    return (
      <View style={{ gap: 10 }}>
        <View style={{ height: 240, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#dbe7e2" }}>
          <SignatureView
            ref={ref}
            onOK={handleOK}
            onEmpty={() => setError("Draw a signature before saving.")}
            descriptionText=""
            webStyle=".m-signature-pad--footer { display: none; margin: 0; } .m-signature-pad { box-shadow: none; border: none; }"
            autoClear={false}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={() => ref.current?.clearSignature()} style={secondaryBtn}>
            <Text style={secondaryBtnText}>Clear</Text>
          </Pressable>
          <Pressable disabled={isSaving} onPress={() => ref.current?.readSignature()} style={[primaryBtn, { flex: 1 }]}>
            {isSaving ? <ActivityIndicator color="white" size="small" /> : <Text style={primaryBtnText}>Save signature</Text>}
          </Pressable>
          <Pressable onPress={() => { setIsDrawing(false); setError(null); }} style={secondaryBtn}>
            <Text style={secondaryBtnText}>Cancel</Text>
          </Pressable>
        </View>
        {error && <Text style={{ color: "#b42318", fontSize: 12 }}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {value ? (
        <View style={{ gap: 8 }}>
          <Image
            source={{ uri: value.uri }}
            style={{ width: "100%", height: 140, borderRadius: 12, backgroundColor: "white", borderWidth: 1, borderColor: "#dbe7e2" }}
            resizeMode="contain"
          />
          <Text style={{ color: "#49635a", fontSize: 12 }}>Signed {new Date(value.capturedAt).toLocaleString()}</Text>
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
          <Text style={{ fontSize: 28 }}>✍️</Text>
          <Text style={{ color: required ? "#9a3412" : "#49635a", fontWeight: "700", fontSize: 14 }}>
            {required ? "Signature required" : "No signature captured"}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable onPress={() => { setError(null); setIsDrawing(true); }} style={[primaryBtn, { flex: 1 }]}>
          <Text style={primaryBtnText}>{value ? "Re-sign" : "Add signature"}</Text>
        </Pressable>
        {value && (
          <Pressable onPress={() => onChange(null)} style={secondaryBtn}>
            <Text style={secondaryBtnText}>Clear</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const primaryBtn = {
  alignItems: "center",
  backgroundColor: "#12332b",
  borderRadius: 12,
  flexDirection: "row",
  justifyContent: "center",
  paddingVertical: 14,
} as const;

const primaryBtnText = {
  color: "white",
  fontWeight: "700",
} as const;

const secondaryBtn = {
  alignItems: "center",
  backgroundColor: "white",
  borderColor: "#dbe7e2",
  borderRadius: 12,
  borderWidth: 1,
  justifyContent: "center",
  paddingHorizontal: 16,
  paddingVertical: 14,
} as const;

const secondaryBtnText = {
  color: "#12332b",
  fontWeight: "700",
} as const;
