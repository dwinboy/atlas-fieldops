import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Logo } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { isValidPin, pinService } from "@/auth/pinService";
import { colors, fontFamily, radii, spacing, typography } from "@/theme";

type PinMode = "set" | "unlock";

export default function PinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: PinMode = params.mode === "set" ? "set" : "unlock";
  const { session, logout } = useAppContext();

  const [entry, setEntry] = useState("");
  const [firstPin, setFirstPin] = useState(""); // set mode: first entry before confirm
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const confirming = mode === "set" && firstPin.length === 4;
  const title = mode === "set" ? (confirming ? "Confirm your PIN" : "Create a login PIN") : "Enter your PIN";
  const subtitle =
    mode === "set"
      ? "Set a 4-digit PIN so you can sign in offline next time, without internet."
      : "Use your 4-digit PIN to sign in. No internet needed.";

  async function commit(nextEntry: string) {
    if (mode === "unlock") {
      setBusy(true);
      const result = await pinService.verifyPin(nextEntry);
      setBusy(false);
      if (result.ok) {
        router.replace("/(tabs)/home");
        return;
      }
      setEntry("");
      if (result.lockedOut) {
        // Too many wrong attempts: drop the local session and force an online sign-in.
        await pinService.clearPin();
        await logout();
        router.replace("/login");
        return;
      }
      setMessage(`Incorrect PIN. ${result.remainingAttempts} attempt(s) left before you must sign in online again.`);
      return;
    }

    // set mode
    if (!confirming) {
      setFirstPin(nextEntry);
      setEntry("");
      setMessage("");
      return;
    }
    if (nextEntry !== firstPin) {
      setFirstPin("");
      setEntry("");
      setMessage("The two PINs did not match. Start again.");
      return;
    }
    setBusy(true);
    try {
      await pinService.setPin(nextEntry);
      router.replace("/(tabs)/home");
    } catch {
      setMessage("Could not save the PIN. Try again.");
      setFirstPin("");
      setEntry("");
    } finally {
      setBusy(false);
    }
  }

  function press(digit: string) {
    if (busy || entry.length >= 4) return;
    const next = entry + digit;
    setEntry(next);
    setMessage("");
    if (next.length === 4 && isValidPin(next)) {
      void commit(next);
    }
  }

  function backspace() {
    setEntry((current) => current.slice(0, -1));
  }

  // If somehow there is no session, unlocking makes no sense — send to login.
  if (mode === "unlock" && !session) {
    router.replace("/login");
    return null;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        <Logo size={56} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.dots}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={[styles.dot, index < entry.length ? styles.dotFilled : null]} />
          ))}
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.pad}>
          {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]].map((rowKeys) => (
            <View key={rowKeys.join("")} style={styles.padRow}>
              {rowKeys.map((digit) => (
                <Pressable key={digit} onPress={() => press(digit)} style={styles.key}>
                  <Text style={styles.keyText}>{digit}</Text>
                </Pressable>
              ))}
            </View>
          ))}
          <View style={styles.padRow}>
            <View style={styles.key} />
            <Pressable onPress={() => press("0")} style={styles.key}>
              <Text style={styles.keyText}>0</Text>
            </Pressable>
            <Pressable onPress={backspace} style={styles.key}>
              <Text style={styles.keyBackspace}>⌫</Text>
            </Pressable>
          </View>
        </View>

        {mode === "unlock" ? (
          <Button
            onPress={async () => {
              await pinService.clearPin();
              await logout();
              router.replace("/login");
            }}
            variant="secondary"
          >
            Forgot PIN? Sign in online
          </Button>
        ) : (
          <Button onPress={() => router.replace("/(tabs)/home")} variant="secondary">
            Skip for now
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xl,
  },
  dot: {
    borderColor: colors.primary,
    borderRadius: 999,
    borderWidth: 2,
    height: 16,
    width: 16,
  },
  dotFilled: {
    backgroundColor: colors.primary,
  },
  dots: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  key: {
    alignItems: "center",
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  keyBackspace: {
    color: colors.mutedForeground,
    fontSize: 24,
  },
  keyText: {
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    fontSize: 28,
    fontWeight: "600",
  },
  message: {
    ...typography.small,
    color: colors.warning,
    textAlign: "center",
  },
  pad: {
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  padRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  title: {
    ...typography.display,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    marginTop: spacing.md,
  },
});
