import { useRouter } from "expo-router";
import { AlertTriangle, ChevronRight, ClipboardList, MapPin, RefreshCw, Send, Settings } from "lucide-react-native";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { localDatabase } from "@/storage/localDatabase";
import { colors, fontFamily, radii, spacing, tone, typography } from "@/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { session, refreshKey, isSyncing, isOnline, lastSyncMessage, syncWork, syncQueue } = useAppContext();

  if (!session) {
    router.replace("/login");
    return null;
  }

  const assignments = localDatabase.assignments.list();
  const readyCount = assignments.filter((a) => a.formId && a.formVersionId).length;
  const openDrafts = localDatabase.draftSubmissions.list().filter((d) => d.status === "Draft");
  const draftCount = openDrafts.length;
  const latestDraft =
    [...openDrafts].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0] ?? null;
  const latestDraftFormName = latestDraft
    ? localDatabase.forms.list().find((form) => form.id === latestDraft.formId)?.name ?? "Saved draft"
    : "";
  const queueCount = localDatabase.syncQueue.list().filter((q) => q.status === "Queued" || q.status === "Failed").length;
  const failedCount = localDatabase.syncQueue.list().filter((q) => q.status === "Failed").length;
  const entityCount = localDatabase.entities.list().length;
  const formCount = localDatabase.forms.list().length;
  const referenceListCount = localDatabase.referenceLists.list().length;
  // Everything needed to collect offline is downloaded once assigned work + a usable form exist.
  const offlineReady = readyCount > 0 || (formCount > 0 && assignments.length > 0);
  const lastSyncedAt =
    localDatabase.syncLogs
      .list()
      .map((log) => log.completedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;
  const syncedToday = localDatabase.draftSubmissions.list().filter(
    (d) => d.status === "Synced" && d.updatedAt?.startsWith(new Date().toISOString().slice(0, 10)),
  ).length;
  const visitRequestCount = localDatabase.visitRequests.list().filter((visit) => visit.status !== "completed").length;

  const user = session.bootstrap?.user;
  const org = session.bootstrap?.organization;
  const userName = user?.fullName ?? user?.email ?? "Field Officer";
  const orgName = org?.name ?? org?.slug ?? "";

  const stats: Array<{
    label: string;
    value: number;
    tone?: "warn" | "ok" | "neutral";
    route: string;
    hint: string;
  }> = [
    { label: "Assignments", value: assignments.length, tone: "neutral", route: "/(tabs)/assignments", hint: "Open assigned work" },
    { label: "Ready forms", value: readyCount, tone: readyCount > 0 ? "ok" : "neutral", route: "/(tabs)/forms", hint: "View downloaded forms" },
    { label: "Entities", value: entityCount, tone: "neutral", route: "/beneficiaries", hint: "View assigned records" },
    { label: "Drafts", value: draftCount, tone: draftCount > 0 ? "warn" : "neutral", route: "/(tabs)/submissions?filter=draft", hint: "Continue saved drafts" },
    { label: "Sync queue", value: queueCount, tone: queueCount > 0 ? "warn" : "ok", route: "/(tabs)/sync", hint: "Review uploads" },
    { label: "Synced today", value: syncedToday, tone: "ok", route: "/(tabs)/submissions?filter=synced", hint: "See synced records" },
    { label: "Visit requests", value: visitRequestCount, tone: visitRequestCount > 0 ? "warn" : "neutral", route: "/visit-requests", hint: "Plan approved movement" },
  ];

  const quickLinks = [
    { label: "View assigned work", icon: ClipboardList, route: "/(tabs)/assignments" },
    { label: "Review drafts & queue", icon: Send, route: "/(tabs)/submissions" },
    { label: "Request a field visit", icon: MapPin, route: "/visit-requests" },
    { label: "Sync center", icon: RefreshCw, route: "/(tabs)/sync" },
    { label: "Settings", icon: Settings, route: "/settings" },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncWork} tintColor={colors.primary} />}
      >
        <View style={{ gap: 2 }}>
          <Text style={styles.greeting}>
            Good {greeting()}, {firstName(userName)}
          </Text>
          <Text style={styles.orgName}>{orgName}</Text>
        </View>

        <View style={[styles.readinessCard, offlineReady ? styles.readinessReady : styles.readinessWarn]}>
          <View style={styles.readinessHeader}>
            <Text style={[styles.readinessTitle, offlineReady ? styles.readinessTitleReady : styles.readinessTitleWarn]}>
              {offlineReady ? "✓ Ready for offline use" : "Connect and sync before the field"}
            </Text>
            <View style={[styles.netChip, isOnline ? styles.netChipOnline : styles.netChipOffline]}>
              <Text style={[styles.netChipText, isOnline ? styles.netChipTextOnline : styles.netChipTextOffline]}>
                {isOnline ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
          <Text style={styles.readinessBody}>
            {offlineReady
              ? `${formCount} form${formCount === 1 ? "" : "s"} · ${assignments.length} assignment${assignments.length === 1 ? "" : "s"} · ${entityCount} record${entityCount === 1 ? "" : "s"}${referenceListCount > 0 ? ` · ${referenceListCount} option list${referenceListCount === 1 ? "" : "s"}` : ""} saved to this device. You can collect without a connection — submissions upload when you reconnect.`
              : "No assigned work is downloaded yet. Connect to Wi-Fi or mobile data and run a full sync so your forms and records are available offline in the field."}
          </Text>
          <Text style={styles.readinessSync}>
            {lastSyncedAt ? `Last synced ${relativeTime(lastSyncedAt)}` : "Not synced yet"}
          </Text>
        </View>

        <Card tone="primary" padding="lg" style={{ gap: spacing.md }}>
          <View>
            <Text style={styles.actionTitle}>Today's field work</Text>
            <Text style={styles.actionSubtitle}>
              Pull down to sync, or tap the buttons below. Collect records offline — they queue automatically.
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Button
              variant="secondary"
              disabled={isSyncing}
              onPress={syncWork}
              style={{ flex: 1 }}
            >
              {isSyncing ? "Syncing…" : "Full sync"}
            </Button>
            <Button
              variant="secondary"
              disabled={isSyncing}
              onPress={syncQueue}
              style={{ flex: 1 }}
            >
              Retry queue
            </Button>
          </View>
          {failedCount > 0 && (
            <View style={styles.failedBanner}>
              <AlertTriangle size={16} color={colors.warning} />
              <Text style={styles.failedBannerText}>
                {failedCount} submission(s) failed to upload. Tap Upload queue to retry.
              </Text>
            </View>
          )}
        </Card>

        {latestDraft ? (
          <Pressable
            onPress={() => router.push(`/form-fill/${latestDraft.localId}` as never)}
            style={({ pressed }) => [styles.continueCard, { opacity: pressed ? 0.78 : 1 }]}
          >
            <ClipboardList size={20} color={colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.continueLabel}>Continue collecting</Text>
              <Text numberOfLines={1} style={styles.continueForm}>
                {latestDraftFormName}
              </Text>
              <Text style={styles.continueHint}>
                {draftCount > 1 ? `${draftCount} drafts in progress` : "1 draft in progress"} ·{" "}
                {latestDraft.responses.length} answer(s) saved
              </Text>
            </View>
            <ChevronRight size={18} color={colors.primary} />
          </Pressable>
        ) : null}

        <View style={styles.statsGrid}>
          {stats.map(({ label, value, tone, route, hint }) => (
            <Pressable
              key={label}
              onPress={() => router.push(route as never)}
              style={({ pressed }) => [styles.statCard, { opacity: pressed ? 0.78 : 1 }]}
            >
              <Text style={styles.statLabel}>{label}</Text>
              <Text
                style={[
                  styles.statValue,
                  tone === "warn" && value > 0 ? { color: colors.warning } : null,
                  tone === "ok" && value > 0 ? { color: colors.success } : null,
                ]}
              >
                {value}
              </Text>
              <Text style={styles.statHint}>{hint}</Text>
            </Pressable>
          ))}
        </View>

        <Card padding="lg">
          <Text style={styles.quickActionsTitle}>Quick actions</Text>
          {quickLinks.map(({ label, icon: Icon, route }, index) => (
            <Pressable
              key={label}
              onPress={() => router.push(route as never)}
              style={[styles.quickLink, index === quickLinks.length - 1 ? { borderBottomWidth: 0 } : null]}
            >
              <Icon size={18} color={colors.primary} />
              <Text style={styles.quickLinkLabel}>{label}</Text>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </Card>

        {lastSyncMessage ? <Text style={styles.lastSync}>{lastSyncMessage}</Text> : null}
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

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "recently";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const styles = StyleSheet.create({
  actionSubtitle: {
    ...typography.small,
    color: colors.primaryForeground,
    marginTop: spacing.xs,
    opacity: 0.85,
  },
  actionTitle: {
    ...typography.headingLg,
    color: colors.primaryForeground,
    fontFamily: fontFamily.semibold,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  continueCard: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.primary,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  continueForm: {
    ...typography.body,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
  },
  continueHint: {
    ...typography.micro,
    color: colors.mutedForeground,
  },
  continueLabel: {
    ...typography.micro,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    textTransform: "uppercase",
  },
  failedBanner: {
    alignItems: "center",
    backgroundColor: colors.primaryForeground,
    borderRadius: radii.lg,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  failedBannerText: {
    ...typography.small,
    color: colors.foreground,
    flex: 1,
    fontFamily: fontFamily.medium,
    fontWeight: "500",
  },
  greeting: {
    ...typography.headingLg,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
  },
  lastSync: {
    ...typography.small,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  orgName: {
    ...typography.body,
    color: colors.mutedForeground,
  },
  netChip: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  netChipOffline: {
    backgroundColor: tone("warning").bg,
  },
  netChipOnline: {
    backgroundColor: tone("success").bg,
  },
  netChipText: {
    ...typography.micro,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  netChipTextOffline: {
    color: tone("warning").fg,
  },
  netChipTextOnline: {
    color: tone("success").fg,
  },
  readinessBody: {
    ...typography.small,
    color: colors.foreground,
    marginTop: spacing.xs,
  },
  readinessCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  readinessHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  readinessReady: {
    backgroundColor: tone("success").bg,
    borderColor: tone("success").border,
  },
  readinessSync: {
    ...typography.micro,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  readinessTitle: {
    ...typography.headingSm,
    fontFamily: fontFamily.semibold,
  },
  readinessTitleReady: {
    color: tone("success").fg,
  },
  readinessTitleWarn: {
    color: tone("warning").fg,
  },
  readinessWarn: {
    backgroundColor: tone("warning").bg,
    borderColor: tone("warning").border,
  },
  quickActionsTitle: {
    ...typography.headingSm,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    marginBottom: spacing.sm,
  },
  quickLink: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  quickLinkLabel: {
    ...typography.body,
    color: colors.foreground,
    flex: 1,
    fontFamily: fontFamily.medium,
    fontWeight: "500",
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  statCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    width: "48%",
  },
  statHint: {
    ...typography.micro,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  statLabel: {
    ...typography.micro,
    color: colors.mutedForeground,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statValue: {
    ...typography.display,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
});
