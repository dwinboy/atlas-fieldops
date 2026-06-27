import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppProvider } from "@/context/AppContext";
import { colors, fontFamily } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const TextAny = Text as unknown as { defaultProps?: Record<string, unknown> };
const TextInputAny = TextInput as unknown as { defaultProps?: Record<string, unknown> };

TextAny.defaultProps = {
  ...(TextAny.defaultProps ?? {}),
  style: [{ fontFamily: fontFamily.regular, color: colors.foreground }, TextAny.defaultProps?.style],
};
TextInputAny.defaultProps = {
  ...(TextInputAny.defaultProps ?? {}),
  style: [{ fontFamily: fontFamily.regular, color: colors.foreground }, TextInputAny.defaultProps?.style],
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="dark" backgroundColor={colors.background} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="pin" options={{ gestureEnabled: false }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="entity-select/[assignmentId]"
              options={{ headerShown: true, title: "Select Entity", headerTintColor: colors.primary, headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="form-fill/[draftId]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="notifications"
              options={{ headerShown: true, title: "Notifications", headerTintColor: colors.primary, headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="settings"
              options={{ headerShown: true, title: "Settings", headerTintColor: colors.primary, headerBackTitle: "Back" }}
            />
          </Stack>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
