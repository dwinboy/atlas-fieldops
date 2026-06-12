import { useMemo } from "react";
import { Bell, CheckCheck, CircleCheck, ClipboardList, RefreshCw, Undo2, XCircle, type LucideIcon } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, EmptyState } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { localDatabase } from "@/storage/localDatabase";
import type { MobileNotification } from "@/models/contracts";
import { colors, fontFamily, radii, spacing, tone, type Tone, typography } from "@/theme";

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
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {unreadCount > 0 && (
          <View style={styles.headerRow}>
            <Text style={styles.unreadText}>{unreadCount} unread</Text>
            <Pressable onPress={markAllRead} style={styles.markAllRow} hitSlop={8}>
              <CheckCheck size={14} color={colors.primary} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          </View>
        )}

        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="Sync your assigned work to receive updates from your supervisor."
          />
        ) : (
          notifications.map((n) => {
            const { icon: Icon, tone: iconTone } = typeInfo(n.title);
            const tones = tone(iconTone);
            const isUnread = !n.readAt;

            return (
              <Pressable key={n.localId} onPress={() => markRead(n)}>
                <Card padding="md" style={styles.card}>
                  <View style={[styles.iconCircle, { backgroundColor: tones.bg }]}>
                    <Icon size={18} color={tones.fg} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title} numberOfLines={2}>{n.title}</Text>
                      {isUnread && <View style={styles.unreadDot} />}
                    </View>
                    {n.body ? <Text style={styles.body}>{n.body}</Text> : null}
                    <Text style={styles.date}>{formatDate(n.createdAt)}</Text>
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function typeInfo(title: string): { icon: LucideIcon; tone: Tone } {
  const value = title.toLowerCase();
  if (value.includes("return")) return { icon: Undo2, tone: "warning" };
  if (value.includes("assign")) return { icon: ClipboardList, tone: "info" };
  if (value.includes("approve")) return { icon: CircleCheck, tone: "success" };
  if (value.includes("reject")) return { icon: XCircle, tone: "danger" };
  if (value.includes("sync")) return { icon: RefreshCw, tone: "info" };
  return { icon: Bell, tone: "neutral" };
}

const styles = StyleSheet.create({
  body: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  card: {
    flexDirection: "row",
    gap: spacing.md,
  },
  content: {
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  date: {
    ...typography.micro,
    color: colors.mutedForeground,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: radii.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  markAllRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  markAllText: {
    ...typography.small,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  title: {
    ...typography.body,
    color: colors.foreground,
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
    marginRight: spacing.sm,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  unreadDot: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    height: 8,
    marginTop: 4,
    width: 8,
  },
  unreadText: {
    ...typography.small,
    color: colors.mutedForeground,
  },
});
