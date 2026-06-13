import { useMemo } from "react";
import {
  ClipboardList,
  Download,
  FileEdit,
  FileText,
  Upload,
  Users,
  Wifi,
  WifiOff,
  CircleCheck,
  AlertTriangle,
  ChevronRight,
} from "lucide-react-native";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { localDatabase } from "@/storage/localDatabase";
import type { MobileSyncOperation } from "@/models/contracts";
import { colors, fontFamily, radii, spacing, tone, typography } from "@/theme";

const OPERATION_LABELS: Record<MobileSyncOperation, string> = {
  CREATE_SUBMISSION: "Submission upload",
  UPDATE_DRAFT: "Draft update",
  UPLOAD_ATTACHMENT: "Attachment upload",
  SUBMIT_CORRECTION: "Correction resubmission",
  UPLOAD_AUDIT_EVENT: "Audit log sync",
  MARK_NOTIFICATION_READ: "Notification update",
  CREATE_VISIT_REQUEST: "Visit request",
  VISIT_CHECK_IN: "Visit check-in",
  VISIT_CHECK_OUT: "Visit check-out",
  RESOLVE_CONFLICT: "Conflict resolution",
};

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
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncQueue} tintColor={colors.primary} />}
      >
        <Card tone={isOnline ? "primary" : "warning"} padding="lg" style={styles.statusCard}>
          {isOnline ? (
            <Wifi size={22} color={colors.primaryForeground} />
          ) : (
            <WifiOff size={22} color={tone("warning").fg} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, !isOnline && { color: tone("warning").fg }]}>
              {isOnline ? "Online" : "Offline"}
            </Text>
            <Text style={[styles.statusSubtitle, !isOnline && { color: tone("warning").fg, opacity: 0.85 }]}>
              {isOnline
                ? pending > 0
                  ? `${pending} item(s) ready to upload`
                  : "All data is current"
                : "Data is saved locally — will sync when connection returns"}
            </Text>
          </View>
        </Card>

        <Card padding="lg">
          <SectionHeader title="Upload submissions" />
          <View style={{ gap: spacing.sm }}>
            <ActionRow
              label="Sync assigned work"
              sub="Download latest assignments, forms, and entity records"
              onPress={syncWork}
              loading={isSyncing}
              icon={Download}
            />
            <ActionRow
              label="Upload queued submissions"
              sub={`${pending} pending · ${failed} failed`}
              onPress={syncQueue}
              loading={isSyncing}
              icon={Upload}
              tone={failed > 0 ? "warning" : "neutral"}
            />
          </View>
        </Card>

        <Card padding="lg">
          <SectionHeader title="Queue summary" />
          <View style={styles.summaryRow}>
            {[
              { label: "Pending", value: pending, color: pending > 0 ? colors.warning : colors.success },
              { label: "Failed", value: failed, color: failed > 0 ? colors.danger : colors.mutedForeground },
              { label: "Synced", value: synced, color: colors.success },
            ].map(({ label, value, color }) => (
              <View key={label} style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color }]}>{value}</Text>
                <Text style={styles.summaryLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {failed > 0 && (
          <Card padding="lg" tone="danger">
            <SectionHeader title="Failed uploads" />
            <View style={{ gap: spacing.sm }}>
              {queue
                .filter((item) => item.status === "Failed")
                .map((item) => (
                  <View key={item.localId} style={styles.failedItem}>
                    <View style={styles.failedItemHeader}>
                      <Text style={styles.failedItemTitle}>{OPERATION_LABELS[item.operation] ?? item.operation}</Text>
                      <Badge label={`${item.retryCount} retr${item.retryCount === 1 ? "y" : "ies"}`} tone="danger" />
                    </View>
                    {item.errorMessage && <Text style={styles.failedItemMessage}>{item.errorMessage}</Text>}
                    {item.lastAttemptAt && (
                      <Text style={styles.failedItemMeta}>Last attempt {formatDate(item.lastAttemptAt)}</Text>
                    )}
                  </View>
                ))}
            </View>
            <Button variant="danger" size="sm" onPress={syncQueue} loading={isSyncing} style={{ marginTop: spacing.sm }}>
              Retry failed uploads
            </Button>
          </Card>
        )}

        <Card padding="lg">
          <SectionHeader title="On this device" />
          {[
            { label: "Assignments", value: assignments, icon: ClipboardList },
            { label: "Forms", value: forms, icon: FileText },
            { label: "Entities", value: entities, icon: Users },
            { label: "Draft submissions", value: drafts, icon: FileEdit },
          ].map(({ label, value, icon: Icon }, index, arr) => (
            <View key={label} style={[styles.deviceRow, index === arr.length - 1 ? { borderBottomWidth: 0 } : null]}>
              <View style={styles.deviceLabelRow}>
                <Icon size={16} color={colors.mutedForeground} />
                <Text style={styles.deviceLabel}>{label}</Text>
              </View>
              <Text style={styles.deviceValue}>{value}</Text>
            </View>
          ))}
        </Card>

        {logs.length > 0 && (
          <Card padding="lg">
            <SectionHeader title="Recent sync history" />
            {logs.map((log, index) => {
              const completed = log.status === "Completed";
              const StatusIcon = completed ? CircleCheck : AlertTriangle;
              return (
                <View
                  key={log.localId}
                  style={[styles.logRow, index === logs.length - 1 ? { borderBottomWidth: 0 } : null]}
                >
                  <View style={styles.logHeaderRow}>
                    <View style={styles.deviceLabelRow}>
                      <StatusIcon size={14} color={completed ? colors.success : colors.warning} />
                      <Text style={[styles.logStatus, { color: completed ? colors.success : colors.warning }]}>
                        {log.status}
                      </Text>
                    </View>
                    <Text style={styles.logDate}>{formatDate(log.startedAt)}</Text>
                  </View>
                  <Text style={styles.logMessage}>{log.message}</Text>
                  <Text style={styles.logMeta}>
                    {log.synced} synced · {log.failed} failed · {log.mode}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        {lastSyncMessage ? <Text style={styles.lastSync}>{lastSyncMessage}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionRow({
  label, sub, onPress, loading, icon: Icon, tone: rowTone = "neutral",
}: {
  label: string; sub: string; onPress: () => void; loading: boolean; icon: typeof Download; tone?: "neutral" | "warning";
}) {
  const tones = tone(rowTone === "warning" ? "warning" : "neutral");
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={[styles.actionRow, { backgroundColor: rowTone === "warning" ? tones.bg : colors.muted, opacity: loading ? 0.6 : 1 }]}
    >
      <View style={styles.actionIcon}>
        <Icon size={18} color={rowTone === "warning" ? tones.fg : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </View>
      <ChevronRight size={18} color={loading ? colors.mutedForeground : colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionIcon: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderRadius: radii.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  actionLabel: {
    ...typography.body,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  actionRow: {
    alignItems: "center",
    borderRadius: radii.lg,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  actionSub: {
    ...typography.micro,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  deviceLabel: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  deviceLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  deviceRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  deviceValue: {
    ...typography.small,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  failedItem: {
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    gap: 2,
    padding: spacing.sm,
  },
  failedItemHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  failedItemMessage: {
    ...typography.small,
    color: colors.foreground,
  },
  failedItemMeta: {
    ...typography.micro,
    color: colors.mutedForeground,
  },
  failedItemTitle: {
    ...typography.small,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  lastSync: {
    ...typography.small,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  logDate: {
    ...typography.micro,
    color: colors.mutedForeground,
  },
  logHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  logMessage: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  logMeta: {
    ...typography.micro,
    color: colors.mutedForeground,
  },
  logRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 2,
    paddingVertical: spacing.sm,
  },
  logStatus: {
    ...typography.small,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  statusCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  statusSubtitle: {
    ...typography.small,
    color: colors.primaryForeground,
    marginTop: 2,
    opacity: 0.85,
  },
  statusTitle: {
    ...typography.headingSm,
    color: colors.primaryForeground,
    fontFamily: fontFamily.semibold,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  summaryLabel: {
    ...typography.micro,
    color: colors.mutedForeground,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryValue: {
    ...typography.display,
    fontFamily: fontFamily.semibold,
  },
});
