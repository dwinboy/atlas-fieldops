import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { AuthService } from "@/auth/authService";
import { ExpoSecureSessionStore } from "@/auth/expoSecureSessionStore.native";
import { pinService } from "@/auth/pinService";
import { Logo } from "@/components/ui";
import { colors, spacing } from "@/theme";

const auth = new AuthService(new ExpoSecureSessionStore());

export default function Index() {
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);

  useEffect(() => {
    auth
      .currentSession()
      .then(async (s) => {
        setHasSession(!!s);
        setPinRequired(Boolean(s) && (await pinService.hasPin()));
        setChecked(true);
      })
      .catch(() => {
        setChecked(true);
      });
  }, []);

  if (!checked) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, gap: spacing.lg }}>
        <Logo size={64} />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!hasSession) return <Redirect href="/login" />;
  if (pinRequired) return <Redirect href="/pin?mode=unlock" />;
  return <Redirect href="/(tabs)/home" />;
}
