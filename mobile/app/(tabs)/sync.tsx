import { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "@/context/AppContext";
import { localDatabase } from "@/storage/localDatabase";

export default function SyncScreen() {
  const { refreshKey, isSyncing, isOnline, lastSyncMessage, syncWork, syncQueue } = useAppContext();

  const queue = useMemo(() => localDatabase.syncQueue.list(), [refreshKey]);
  const logs = useMemo(
    () =>
      localDatabase.syncLogs
        .list()
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, 20),
    [refreshKey],
  );

  const pending = queue.filter((q) => q.status === "Queued" || q.status === "Syncing").length;
  const failed = queue.filter((q) => q.status === "Failed").length;
  const synced = queue.filter((q) => q.status === "Synced").length;

  const assignments = localDatabase.assignments.list().length;
  const forms = localDatabase.forms.list().length;
  const entities = localDatabase.entities.list().length;
  const drafts = localDatabase.draftSubmissions.list().length;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={{ gap: 14, padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncQueue} tintColor="#12332b" />}
      >
        {/* Network status */}
        <View style={{
          backgroundColor: isOnline ? "#12332b" : "#9a3412",
          borderRadius: 16,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}>
          <Text style={{ fontSize: 22 }}>{isOnline ? "🌐" : "📵"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
              {isOnline ? "Online" : "Offline"}
            </Text>
            <Text style={{ color: "#d7efe7", fontSize: 13 }}>
              {isOnline
                ? pending > 0
                  ? `${pending} item(s) ready to upload`
                  : "All data is current"
                : "Data is saved locally — will sync when connection returns"}
            </Text>
          </View>
        </View>

        {/* Upload actions */}
        <View style={card}>
          <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 16, marginBottom: 12 }}>
            Upload submissions
          </Text>
          <View style={{ gap: 10 }}>
            <ActionRow
              label="Sync assigned work"
              sub="Download latest assignments, forms, and beneficiaries"
              onPress={syncWork}
              loading={isSyncing}
              icon="⬇️"
            />
            <ActionRow
              label="Upload queued submissions"
              sub={`${pending} pending · ${failed} failed`}
              onPress={syncQueue}
              loading={isSyncing}
              icon="⬆️"
              tone={failed > 0 ? "warn" : "neutral"}
            />
          </View>
        </View>

        {/* Queue summary */}
        <View style={card}>
          <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 16, marginBottom: 12 }}>
            Queue summary
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              { label: "Pending", value: pending, color: pending > 0 ? "#9a3412" : "#0f766e" },
              { label: "Failed", value: failed, color: failed > 0 ? "#b42318" : "#49635a" },
              { label: "Synced", value: synced, color: "#0f766e" },
            ].map(({ label, value, color }) => (
              <View key={label} style={{ flex: 1, alignItems: "center", gap: 2 }}>
                <Text style={{ color, fontSize: 24, fontWeight: "800" }}>{value}</Text>
                <Text style={{ color: "#49635a", fontSize: 11, fontWeight: "600" }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Device data */}
        <View style={card}>
          <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 16, marginBottom: 12 }}>
            On this device
          </Text>
          {[
            { label: "Assignments", value: assignments, icon: "📋" },
            { label: "Forms", value: forms, icon: "📄" },
            { label: "Beneficiaries", value: entities, icon: "👥" },
            { label: "Draft submissions", value: drafts, icon: "📝" },
          ].map(({ label, value, icon }) => (
            <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f5f3" }}>
              <Text style={{ color: "#49635a", fontSize: 14 }}>{icon} {label}</Text>
              <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 14 }}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Sync log */}
        {logs.length > 0 && (
          <View style={card}>
            <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 16, marginBottom: 12 }}>
              Recent sync history
            </Text>
            {logs.map((log) => (
              <View key={log.localId} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f5f3", gap: 2 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: log.status === "Completed" ? "#0f766e" : "#9a3412", fontWeight: "700", fontSize: 13 }}>
                    {log.status === "Completed" ? "✓" : "⚠"} {log.status}
                  </Text>
                  <Text style={{ color: "#8aa79b", fontSize: 12 }}>{formatDate(log.startedAt)}</Text>
                </View>
                <Text style={{ color: "#49635a", fontSize: 12 }}>{log.message}</Text>
                <Text style={{ color: "#8aa79b", fontSize: 11 }}>
                  {log.synced} synced · {log.failed} failed · {log.mode}
                </Text>
              </View>
            ))}
          </View>
        )}

        {lastSyncMessage ? (
          <Text style={{ color: "#49635a", fontSize: 12, textAlign: "center" }}>{lastSyncMessage}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionRow({
  label, sub, onPress, loading, icon, tone = "neutral",
}: {
  label: string; sub: string; onPress: () => void; loading: boolean; icon: string; tone?: "neutral" | "warn";
}) {
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: tone === "warn" ? "#fff7ed" : "#f6faf8",
        borderRadius: 12,
        padding: 14,
        opacity: loading ? 0.6 : 1,
      }}
    >
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 14 }}>{label}</Text>
        <Text style={{ color: "#49635a", fontSize: 12 }}>{sub}</Text>
      </View>
      <Text style={{ color: loading ? "#8aa79b" : "#12332b", fontWeight: "800" }}>
        {loading ? "…" : "›"}
      </Text>
    </Pressable>
  );
}

const card = {
  backgroundColor: "white",
  borderColor: "#dbe7e2",
  borderRadius: 16,
  borderWidth: 1,
  padding: 16,
} as const;
