import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "@/context/AppContext";
import { localDatabase } from "@/storage/localDatabase";
import type { MobileNotification } from "@/models/contracts";

export default function NotificationsScreen() {
  const { refreshKey, refresh } = useAppContext();

  const notifications = useMemo(
    () =>
      localDatabase.notifications
        .list()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [refreshKey],
  );

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  function markRead(n: MobileNotification) {
    if (n.readAt) return;
    localDatabase.notifications.upsert({ ...n, readAt: new Date().toISOString() });
    refresh();
  }

  function markAllRead() {
    const now = new Date().toISOString();
    for (const n of notifications.filter((n) => !n.readAt)) {
      localDatabase.notifications.upsert({ ...n, readAt: now });
    }
    refresh();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ gap: 10, padding: 16, paddingBottom: 32 }}>
        {unreadCount > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#49635a", fontSize: 13 }}>{unreadCount} unread</Text>
            <Pressable onPress={markAllRead}>
              <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 13 }}>Mark all read</Text>
            </Pressable>
          </View>
        )}

        {notifications.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 60, gap: 10 }}>
            <Text style={{ fontSize: 40 }}>🔔</Text>
            <Text style={{ color: "#49635a", fontWeight: "700" }}>No notifications</Text>
            <Text style={{ color: "#8aa79b", fontSize: 13 }}>
              Sync your assigned work to receive updates from your supervisor.
            </Text>
          </View>
        ) : (
          notifications.map((n) => {
            const payload = n.payload as Record<string, unknown>;
            const title = String(payload?.title ?? "Notification");
            const body = String(payload?.body ?? payload?.message ?? "");
            const ntype = String(payload?.type ?? "info");
            const isUnread = !n.readAt;

            return (
              <Pressable
                key={n.localId}
                onPress={() => markRead(n)}
                style={{
                  backgroundColor: isUnread ? "#f0fdf4" : "white",
                  borderColor: isUnread ? "#bbf7d0" : "#dbe7e2",
                  borderRadius: 14,
                  borderWidth: isUnread ? 2 : 1,
                  padding: 14,
                  gap: 4,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 14, flex: 1, marginRight: 8 }}>
                    {typeIcon(ntype)} {title}
                  </Text>
                  {isUnread && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#0f766e", marginTop: 4 }} />
                  )}
                </View>
                {body ? <Text style={{ color: "#49635a", fontSize: 13 }}>{body}</Text> : null}
                <Text style={{ color: "#8aa79b", fontSize: 12 }}>{formatDate(n.createdAt)}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function typeIcon(type: string): string {
  if (type.includes("return")) return "↩";
  if (type.includes("assign")) return "📋";
  if (type.includes("approve")) return "✅";
  if (type.includes("reject")) return "❌";
  if (type.includes("sync")) return "🔄";
  return "🔔";
}
