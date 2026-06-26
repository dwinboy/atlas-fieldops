import { Tabs, useRouter } from "expo-router";
import { Bell, ClipboardList, FileText, Home, RefreshCw, Send } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { IconButton, Logo } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { localDatabase } from "@/storage/localDatabase";
import { colors, fontFamily, spacing, typography } from "@/theme";

/** Header bell with an unread badge so field officers notice returned-for-correction
 * submissions and supervisor messages without opening the notifications screen. */
function NotificationBell() {
  const router = useRouter();
  const { refreshKey } = useAppContext();
  // refreshKey is read so the badge recomputes after a sync or a read/unread change.
  void refreshKey;
  const unreadCount = localDatabase.notifications.list().filter((notification) => !notification.readAt).length;
  return (
    <View style={styles.bellWrap}>
      <IconButton
        icon={Bell}
        accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        color={colors.primary}
        onPress={() => router.push("/notifications")}
      />
      {unreadCount > 0 ? (
        <View pointerEvents="none" style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
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
        headerRight: () => <NotificationBell />,
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

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 999,
    height: 16,
    justifyContent: "center",
    minWidth: 16,
    paddingHorizontal: 3,
    position: "absolute",
    right: 2,
    top: 2,
  },
  badgeText: {
    color: "#ffffff",
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
  },
  bellWrap: {
    marginRight: 8,
    position: "relative",
  },
});
