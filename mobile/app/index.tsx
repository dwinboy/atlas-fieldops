import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { AuthService } from "@/auth/authService";
import { ExpoSecureSessionStore } from "@/auth/expoSecureSessionStore.native";
import { Logo } from "@/components/ui";
import { colors, spacing } from "@/theme";

const auth = new AuthService(new ExpoSecureSessionStore());

export default function Index() {
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    auth.currentSession().then((s) => {
      setHasSession(!!s);
      setChecked(true);
    }).catch(() => {
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

  return <Redirect href={hasSession ? "/(tabs)/home" : "/login"} />;
}
