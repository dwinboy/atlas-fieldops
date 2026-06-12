import { Tabs, useRouter } from "expo-router";
import { Bell, ClipboardList, FileText, Home, RefreshCw, Send } from "lucide-react-native";

import { IconButton, Logo } from "@/components/ui";
import { colors, fontFamily, spacing, typography } from "@/theme";

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: fontFamily.semibold, fontWeight: "600" },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { ...typography.micro, fontFamily: fontFamily.medium, fontWeight: "500" },
        headerLeft: () => <Logo size={28} style={{ marginLeft: spacing.lg }} />,
        headerRight: () => (
          <IconButton
            icon={Bell}
            accessibilityLabel="Notifications"
            color={colors.primary}
            onPress={() => router.push("/notifications")}
            style={{ marginRight: 8 }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: "Work",
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="forms"
        options={{
          title: "Forms",
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="submissions"
        options={{
          title: "Drafts",
          tabBarIcon: ({ color, size }) => <Send color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: "Sync",
          tabBarIcon: ({ color, size }) => <RefreshCw color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
