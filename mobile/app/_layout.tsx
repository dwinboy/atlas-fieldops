import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppProvider } from "@/context/AppContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="dark" backgroundColor="#f6faf8" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="entity-select/[assignmentId]"
              options={{ headerShown: true, title: "Select Beneficiary", headerTintColor: "#12332b", headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="form-fill/[draftId]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="notifications"
              options={{ headerShown: true, title: "Notifications", headerTintColor: "#12332b", headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="settings"
              options={{ headerShown: true, title: "Settings", headerTintColor: "#12332b", headerBackTitle: "Back" }}
            />
          </Stack>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
