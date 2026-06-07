import { Tabs, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

// Simple icon components using text/emoji placeholders (no icon lib installed)
function TabIcon({ symbol, label, focused }: { symbol: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: 2, paddingTop: 4 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{symbol}</Text>
      <Text style={{ fontSize: 10, color: focused ? "#12332b" : "#8aa79b", fontWeight: focused ? "700" : "500" }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#f6faf8" },
        headerTintColor: "#12332b",
        headerTitleStyle: { fontWeight: "800" },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: "white",
          borderTopColor: "#dbe7e2",
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
        headerRight: () => (
          <Pressable
            onPress={() => router.push("/notifications")}
            style={{ marginRight: 16 }}
          >
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon symbol="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: "Assignments",
          tabBarIcon: ({ focused }) => <TabIcon symbol="📋" label="Work" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="submissions"
        options={{
          title: "Submissions",
          tabBarIcon: ({ focused }) => <TabIcon symbol="📤" label="Drafts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: "Sync Center",
          tabBarIcon: ({ focused }) => <TabIcon symbol="🔄" label="Sync" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="forms"
        options={{
          title: "Forms",
          tabBarIcon: ({ focused }) => <TabIcon symbol="📄" label="Forms" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
