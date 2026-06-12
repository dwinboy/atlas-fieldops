"use client";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthService } from "@/auth/authService";
import { ExpoSecureSessionStore } from "@/auth/expoSecureSessionStore.native";
import { Button, Card, Input } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { colors, fontFamily, radii, spacing, tone, typography } from "@/theme";

const authService = new AuthService(new ExpoSecureSessionStore());
const atlasLogo = require("../assets/atlas-fieldops-logo.png");
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
  const messageTone = isErrorMessage ? tone("warning") : tone("success");

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image
              accessibilityLabel="Atlas FieldOps logo"
              resizeMode="contain"
              source={atlasLogo}
              style={styles.logo}
            />
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={styles.title}>Atlas FieldOps</Text>
              <Text style={styles.subtitle}>Sign in to access your assigned field work.</Text>
            </View>
          </View>

          <Card padding="lg" style={{ gap: spacing.md }}>
            <View style={styles.modeSwitch}>
              {(["password", "qr"] as LoginMode[]).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    setMode(item);
                    setMessage("");
                    setQrScanned(false);
                  }}
                  style={[styles.modeButton, mode === item ? styles.modeButtonActive : null]}
                >
                  <Text style={[styles.modeButtonText, mode === item ? styles.modeButtonTextActive : null]}>
                    {item === "password" ? "Password" : "Scan QR code"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === "password" ? (
              <>
                <Input
                  label="Organization code"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setOrgSlug}
                  placeholder="e.g. acme-ngo"
                  value={orgSlug}
                />
                <Input
                  label="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  value={email}
                />
                <Input
                  label="Password"
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  value={password}
                />

                <Button variant="primary" size="lg" loading={isLoading} onPress={handleLogin} style={{ marginTop: spacing.xs }}>
                  {isLoading ? "Signing in…" : "Sign in"}
                </Button>
              </>
            ) : (
              <View style={{ gap: spacing.md }}>
                <Text style={styles.qrHelp}>
                  Scan the mobile QR code from your field officer profile. Ask your supervisor or manager to open your profile if you do not have the code.
                </Text>
                {cameraPermission?.granted ? (
                  <View style={styles.cameraFrame}>
                    <CameraView
                      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                      onBarcodeScanned={qrScanned || isLoading ? undefined : handleBarcodeScanned}
                      style={{ flex: 1 }}
                    />
                    <View style={styles.cameraReticle} />
                  </View>
                ) : (
                  <Card tone="neutral" padding="lg" style={{ gap: spacing.sm }}>
                    <Text style={styles.cameraTitle}>Camera permission needed</Text>
                    <Text style={styles.qrHelp}>
                      Atlas FieldOps needs camera access only to scan your login QR code.
                    </Text>
                    <Button
                      variant="primary"
                      onPress={() => {
                        void requestCameraPermission();
                      }}
                    >
                      Allow camera
                    </Button>
                  </Card>
                )}
                {qrScanned ? (
                  <Button
                    variant="secondary"
                    disabled={isLoading}
                    onPress={() => {
                      setQrScanned(false);
                      setMessage("");
                    }}
                  >
                    Scan again
                  </Button>
                ) : null}
              </View>
            )}
          </Card>

          {message ? (
            <View style={[styles.messageBanner, { backgroundColor: messageTone.bg, borderColor: messageTone.border }]}>
              <Text style={[styles.messageText, { color: messageTone.fg }]}>{message}</Text>
            </View>
          ) : null}

          <Text style={styles.footerHint}>
            Contact your supervisor for your organization code and credentials.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cameraFrame: {
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    height: 280,
    overflow: "hidden",
  },
  cameraReticle: {
    alignSelf: "center",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 18,
    borderWidth: 3,
    height: 180,
    position: "absolute",
    top: 50,
    width: 180,
  },
  cameraTitle: {
    ...typography.headingSm,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
  },
  footerHint: {
    ...typography.micro,
    color: colors.mutedForeground,
    marginTop: spacing["2xl"],
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing["3xl"],
  },
  logo: {
    height: 86,
    width: 86,
  },
  messageBanner: {
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  messageText: {
    ...typography.body,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  modeButton: {
    alignItems: "center",
    borderRadius: radii.md,
    flex: 1,
    padding: spacing.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    ...typography.small,
    color: colors.mutedForeground,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  modeButtonTextActive: {
    color: colors.primaryForeground,
  },
  modeSwitch: {
    backgroundColor: colors.muted,
    borderRadius: radii.lg,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
  },
  qrHelp: {
    ...typography.body,
    color: colors.mutedForeground,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedForeground,
  },
  title: {
    ...typography.display,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
  },
});
