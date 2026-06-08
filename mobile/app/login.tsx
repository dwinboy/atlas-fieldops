"use client";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthService } from "@/auth/authService";
import { ExpoSecureSessionStore } from "@/auth/expoSecureSessionStore.native";
import { useAppContext } from "@/context/AppContext";

const authService = new AuthService(new ExpoSecureSessionStore());
type LoginMode = "password" | "qr";

function messageIsError(message: string) {
  const normalized = message.toLowerCase();
  return [
    "failed",
    "enter",
    "invalid",
    "blocked",
    "denied",
    "error",
    "cannot",
    "could not",
    "expired",
    "check credentials",
  ].some((term) => normalized.includes(term));
}

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAppContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>("password");
  const [qrScanned, setQrScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  async function handleLogin() {
    if (!email.trim() || !password || !orgSlug.trim()) {
      setMessage("Enter your email, password, and organization code.");
      return;
    }
    setIsLoading(true);
    setMessage("Signing in…");
    try {
      const s = await authService.login(email.trim(), password, orgSlug.trim());
      setSession(s);
      router.replace("/(tabs)/home");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Login failed. Check credentials and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleQrLogin(data: string) {
    if (!data.trim()) {
      setMessage("This QR code is empty. Ask your supervisor to show your mobile QR code again.");
      return;
    }
    setQrScanned(true);
    setIsLoading(true);
    setMessage("Signing in with QR code...");
    try {
      const s = await authService.loginWithQr(data);
      setSession(s);
      router.replace("/(tabs)/home");
    } catch (err) {
      setQrScanned(false);
      setMessage(err instanceof Error ? err.message : "QR login failed. Ask your supervisor to confirm your account is active.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (qrScanned || isLoading) return;
    void handleQrLogin(result.data);
  }

  const isErrorMessage = message ? messageIsError(message) : false;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 8, marginBottom: 32 }}>
            <Text style={{ color: "#12332b", fontSize: 30, fontWeight: "800", letterSpacing: -0.5 }}>
              Atlas FieldOps
            </Text>
            <Text style={{ color: "#49635a", fontSize: 15 }}>
              Sign in to access your assigned field work.
            </Text>
          </View>

          <View style={{
            backgroundColor: "white",
            borderColor: "#dbe7e2",
            borderRadius: 20,
            borderWidth: 1,
            gap: 12,
            padding: 20,
          }}>
            <View style={{ backgroundColor: "#f6faf8", borderRadius: 14, flexDirection: "row", gap: 4, padding: 4 }}>
              {(["password", "qr"] as LoginMode[]).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    setMode(item);
                    setMessage("");
                    setQrScanned(false);
                  }}
                  style={{
                    alignItems: "center",
                    backgroundColor: mode === item ? "#12332b" : "transparent",
                    borderRadius: 10,
                    flex: 1,
                    padding: 10,
                  }}
                >
                  <Text style={{ color: mode === item ? "white" : "#49635a", fontSize: 13, fontWeight: "800" }}>
                    {item === "password" ? "Password" : "Scan QR code"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === "password" ? (
              <>
                <View style={{ gap: 6 }}>
                  <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 13 }}>Organization code</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setOrgSlug}
                    placeholder="e.g. acme-ngo"
                    placeholderTextColor="#b0c5bc"
                    style={inputStyle}
                    value={orgSlug}
                  />
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 13 }}>Email</Text>
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor="#b0c5bc"
                    style={inputStyle}
                    value={email}
                  />
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 13 }}>Password</Text>
                  <TextInput
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#b0c5bc"
                    secureTextEntry
                    style={inputStyle}
                    value={password}
                  />
                </View>

                <Pressable
                  disabled={isLoading}
                  onPress={handleLogin}
                  style={{
                    alignItems: "center",
                    backgroundColor: isLoading ? "#8aa79b" : "#12332b",
                    borderRadius: 14,
                    flexDirection: "row",
                    justifyContent: "center",
                    marginTop: 4,
                    minHeight: 52,
                    padding: 14,
                    gap: 10,
                  }}
                >
                  {isLoading && <ActivityIndicator color="white" size="small" />}
                  <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
                    {isLoading ? "Signing in…" : "Sign in"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={{ color: "#49635a", fontSize: 14, lineHeight: 20 }}>
                  Scan the mobile QR code from your field officer profile. Ask your supervisor or manager to open your profile if you do not have the code.
                </Text>
                {cameraPermission?.granted ? (
                  <View style={{ borderColor: "#dbe7e2", borderRadius: 16, borderWidth: 1, height: 280, overflow: "hidden" }}>
                    <CameraView
                      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                      onBarcodeScanned={qrScanned || isLoading ? undefined : handleBarcodeScanned}
                      style={{ flex: 1 }}
                    />
                    <View style={{
                      alignSelf: "center",
                      borderColor: "rgba(255,255,255,0.9)",
                      borderRadius: 18,
                      borderWidth: 3,
                      height: 180,
                      position: "absolute",
                      top: 50,
                      width: 180,
                    }} />
                  </View>
                ) : (
                  <View style={{ backgroundColor: "#f6faf8", borderColor: "#dbe7e2", borderRadius: 16, borderWidth: 1, gap: 10, padding: 16 }}>
                    <Text style={{ color: "#12332b", fontSize: 15, fontWeight: "800" }}>Camera permission needed</Text>
                    <Text style={{ color: "#49635a", fontSize: 14, lineHeight: 20 }}>
                      Atlas FieldOps needs camera access only to scan your login QR code.
                    </Text>
                    <Pressable
                      onPress={() => {
                        void requestCameraPermission();
                      }}
                      style={{
                        alignItems: "center",
                        backgroundColor: "#12332b",
                        borderRadius: 14,
                        minHeight: 48,
                        justifyContent: "center",
                        padding: 12,
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "800" }}>Allow camera</Text>
                    </Pressable>
                  </View>
                )}
                {qrScanned ? (
                  <Pressable
                    disabled={isLoading}
                    onPress={() => {
                      setQrScanned(false);
                      setMessage("");
                    }}
                    style={{
                      alignItems: "center",
                      borderColor: "#dbe7e2",
                      borderRadius: 14,
                      borderWidth: 1,
                      minHeight: 48,
                      justifyContent: "center",
                      padding: 12,
                    }}
                  >
                    <Text style={{ color: "#12332b", fontWeight: "800" }}>Scan again</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>

          {message ? (
            <View style={{
              backgroundColor: isErrorMessage ? "#fff7ed" : "#f0fdf4",
              borderColor: isErrorMessage ? "#fed7aa" : "#bbf7d0",
              borderRadius: 12,
              borderWidth: 1,
              marginTop: 16,
              padding: 14,
            }}>
              <Text style={{
                color: isErrorMessage ? "#9a3412" : "#15803d",
                fontSize: 14,
                fontWeight: "600",
              }}>
                {message}
              </Text>
            </View>
          ) : null}

          <Text style={{ color: "#8aa79b", fontSize: 12, marginTop: 24, textAlign: "center" }}>
            Contact your supervisor for your organization code and credentials.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const inputStyle = {
  backgroundColor: "#f6faf8",
  borderColor: "#dbe7e2",
  borderRadius: 12,
  borderWidth: 1,
  color: "#12332b",
  fontSize: 15,
  padding: 14,
} as const;
