import { useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "@/context/AppContext";
import { localDatabase } from "@/storage/localDatabase";

export default function HomeScreen() {
  const router = useRouter();
  const { session, refreshKey, isSyncing, lastSyncMessage, syncWork, syncQueue } = useAppContext();

  if (!session) {
    router.replace("/login");
    return null;
  }

  const assignments = localDatabase.assignments.list();
  const readyCount = assignments.filter((a) => a.formId && a.formVersionId).length;
  const draftCount = localDatabase.draftSubmissions.list().filter((d) => d.status === "Draft").length;
  const queueCount = localDatabase.syncQueue.list().filter((q) => q.status === "Queued" || q.status === "Failed").length;
  const failedCount = localDatabase.syncQueue.list().filter((q) => q.status === "Failed").length;
  const entityCount = localDatabase.entities.list().length;
  const syncedToday = localDatabase.draftSubmissions.list().filter(
    (d) => d.status === "Synced" && d.updatedAt?.startsWith(new Date().toISOString().slice(0, 10)),
  ).length;

  const user = session.bootstrap?.user;
  const org = session.bootstrap?.organization;
  const userName = user?.fullName ?? user?.email ?? "Field Officer";
  const orgName = org?.name ?? org?.slug ?? "";

  const stats: Array<{ label: string; value: number; tone?: "warn" | "ok" | "neutral" }> = [
    { label: "Assignments", value: assignments.length, tone: "neutral" },
    { label: "Ready forms", value: readyCount, tone: readyCount > 0 ? "ok" : "neutral" },
    { label: "Beneficiaries", value: entityCount, tone: "neutral" },
    { label: "Drafts", value: draftCount, tone: draftCount > 0 ? "warn" : "neutral" },
    { label: "Sync queue", value: queueCount, tone: queueCount > 0 ? "warn" : "ok" },
    { label: "Synced today", value: syncedToday, tone: "ok" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isSyncing} onRefresh={syncWork} tintColor="#12332b" />
        }
      >
        {/* Header */}
        <View style={{ gap: 2 }}>
          <Text style={{ color: "#12332b", fontSize: 22, fontWeight: "800" }}>
            Good {greeting()}, {firstName(userName)}
          </Text>
          <Text style={{ color: "#49635a", fontSize: 14 }}>{orgName}</Text>
        </View>

        {/* Action card */}
        <View style={card("primary")}>
          <Text style={{ color: "white", fontSize: 17, fontWeight: "800" }}>Today's field work</Text>
          <Text style={{ color: "#d7efe7", marginTop: 4, fontSize: 13 }}>
            Pull down to sync, or tap the buttons below. Collect records offline — they queue automatically.
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Pressable
              disabled={isSyncing}
              onPress={syncWork}
              style={[actionBtn("white"), { flex: 1 }]}
            >
              <Text style={{ color: "#12332b", fontWeight: "800" }}>
                {isSyncing ? "Syncing…" : "Sync work"}
              </Text>
            </Pressable>
            <Pressable
              disabled={isSyncing}
              onPress={syncQueue}
              style={[actionBtn("#d7efe7"), { flex: 1 }]}
            >
              <Text style={{ color: "#12332b", fontWeight: "800" }}>Upload queue</Text>
            </Pressable>
          </View>
          {failedCount > 0 && (
            <View style={{ marginTop: 10, backgroundColor: "#fff7ed", borderRadius: 10, padding: 10 }}>
              <Text style={{ color: "#9a3412", fontWeight: "700", fontSize: 13 }}>
                ⚠ {failedCount} submission(s) failed to upload. Tap Upload queue to retry.
              </Text>
            </View>
          )}
        </View>

        {/* Stats grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {stats.map(({ label, value, tone }) => (
            <View key={label} style={[card("neutral"), { minWidth: "30%", flexGrow: 1 }]}>
              <Text style={{ color: "#49635a", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {label}
              </Text>
              <Text style={{
                color: tone === "warn" && value > 0 ? "#9a3412" : tone === "ok" && value > 0 ? "#0f766e" : "#12332b",
                fontSize: 24,
                fontWeight: "800",
                marginTop: 4,
              }}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        {/* Quick links */}
        <View style={card("neutral")}>
          <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 16, marginBottom: 12 }}>Quick actions</Text>
          {[
            { label: "View assigned work", icon: "📋", route: "/(tabs)/assignments" },
            { label: "Review drafts & queue", icon: "📤", route: "/(tabs)/submissions" },
            { label: "Sync center", icon: "🔄", route: "/(tabs)/sync" },
            { label: "Settings", icon: "⚙️", route: "/settings" },
          ].map(({ label, icon, route }) => (
            <Pressable
              key={label}
              onPress={() => router.push(route as never)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#f0f5f3",
              }}
            >
              <Text style={{ fontSize: 18 }}>{icon}</Text>
              <Text style={{ color: "#12332b", fontWeight: "600", flex: 1 }}>{label}</Text>
              <Text style={{ color: "#8aa79b" }}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Last sync message */}
        {lastSyncMessage ? (
          <Text style={{ color: "#49635a", fontSize: 12, textAlign: "center" }}>{lastSyncMessage}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

function card(tone: "primary" | "neutral") {
  return {
    backgroundColor: tone === "primary" ? "#12332b" : "white",
    borderColor: tone === "primary" ? "#12332b" : "#dbe7e2",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  } as const;
}

function actionBtn(bg: string) {
  return {
    alignItems: "center" as const,
    backgroundColor: bg,
    borderRadius: 12,
    minHeight: 46,
    justifyContent: "center" as const,
    padding: 12,
  };
}
