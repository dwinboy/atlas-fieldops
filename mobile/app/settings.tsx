import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Activity, ChevronRight, FileText, KeyRound, LogOut, ScrollText, Trash2 } from "lucide-react-native";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Constants from "expo-constants";

import { Button, Card } from "@/components/ui";
import { pinService } from "@/auth/pinService";
import { useAppContext } from "@/context/AppContext";
import { androidReleaseConfig } from "@/config/releaseConfig";
import { localDatabase } from "@/storage/localDatabase";
import { colors, fontFamily, radii, spacing, typography } from "@/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { session, logout, refreshKey } = useAppContext();
  const [clearing, setClearing] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      pinService.hasPin().then((value) => {
        if (active) setHasPin(value);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  function handleRemovePin() {
    Alert.alert(
      "Remove login PIN",
      "You'll need internet to sign in next time you open the app. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove PIN",
          style: "destructive",
          onPress: async () => {
            await pinService.clearPin();
            setHasPin(false);
          },
        },
      ],
    );
  }

  const user = session?.bootstrap?.user;
  const org = session?.bootstrap?.organization;
  const officer = session?.bootstrap?.fieldOfficerProfile;
  const supervisor = session?.bootstrap?.supervisor;
  const permissionSet = session?.bootstrap?.permissionSet;
  const mobileRules = session?.bootstrap?.mobileRules;
  const device = session?.bootstrap?.device;
  const assignedCounts = session?.bootstrap?.assignedCounts;

  const deviceStats = useMemo(() => ({
    assignments: localDatabase.assignments.list().length,
    forms: localDatabase.forms.list().length,
    entities: localDatabase.entities.list().length,
    entityCategories: localDatabase.entityCategories.list().length,
    drafts: localDatabase.draftSubmissions.list().filter((d) => d.status !== "Synced").length,
    syncLogs: localDatabase.syncLogs.list().length,
  }), [refreshKey]);

  async function handleLogout() {
    Alert.alert(
      "Log out",
      "Unsynced drafts and queued submissions will remain on this device and sync when you log back in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ],
    );
  }

  function handleClearSynced() {
    Alert.alert(
      "Clear synced data",
      "This removes synced submissions and sync logs from this device to free up storage. Unsynced drafts are kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear synced data",
          style: "destructive",
          onPress: () => {
            setClearing(true);
            const synced = localDatabase.draftSubmissions.list().filter((d) => d.status === "Synced");
            for (const d of synced) localDatabase.draftSubmissions.remove(d.localId);
            const logs = localDatabase.syncLogs.list();
            for (const l of logs) localDatabase.syncLogs.remove(l.localId);
            setClearing(false);
            Alert.alert("Done", `Cleared ${synced.length} synced submission(s) and ${logs.length} sync log(s).`);
          },
        },
      ],
    );
  }

  function handleDiagnostics() {
    const queue = localDatabase.syncQueue.list();
    const failed = queue.filter((item) => item.status === "Failed").length;
    const queued = queue.filter((item) => item.status === "Queued" || item.status === "Syncing").length;
    const lastLog = localDatabase.syncLogs.list().sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    Alert.alert(
      "Field diagnostics",
      [
        `App: ${appVersion} (${buildEnv})`,
        `Device: ${device?.deviceId ?? session?.bootstrap?.lastSync.deviceId ?? "Pending registration"}`,
        `Status: ${device?.status ?? session?.bootstrap?.blockedState.deviceStatus ?? "Unknown"}`,
        `Assignments: ${deviceStats.assignments}`,
        `Forms: ${deviceStats.forms}`,
        `Entities: ${deviceStats.entities}`,
        `Entity categories: ${deviceStats.entityCategories}`,
        `Unsynced drafts: ${deviceStats.drafts}`,
        `Queued uploads: ${queued}`,
        `Failed uploads: ${failed}`,
        `Last sync: ${lastLog?.message ?? device?.lastSyncAt ?? session?.bootstrap?.lastSync.lastSyncedAt ?? "Never"}`,
      ].join("\n"),
    );
  }

  function openLegalLink(url: string) {
    Linking.openURL(url).catch(() => {
      Alert.alert("Couldn't open link", "Please check your internet connection and try again.");
    });
  }

  const appVersion = Constants.expoConfig?.version ?? "—";
  const buildEnv = Constants.expoConfig?.extra?.appEnv ?? "production";

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>

        <Section title="Account">
          <Row label="Name" value={officer?.fullName ?? user?.fullName ?? user?.email ?? "—"} />
          <Row label="Username" value={officer?.username ?? user?.email?.split("@")[0] ?? "—"} />
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Organization" value={org?.name ?? org?.slug ?? "—"} />
          <Row label="Employee ID" value={officer?.employeeCode ?? "—"} />
          <Row label="Role" value={user?.roles?.join(", ") || "Field officer"} />
          <Row label="Status" value={officer?.status ?? session?.bootstrap?.blockedState.accountStatus ?? "—"} />
          <Row label="Supervisor" value={supervisor?.fullName ?? officer?.supervisorName ?? "Not assigned"} last />
        </Section>

        <Section title="Data on this device">
          <Row label="Assigned projects" value={String(assignedCounts?.projects ?? deviceStats.assignments)} />
          <Row label="Assignments" value={String(assignedCounts?.assignments ?? deviceStats.assignments)} />
          <Row label="Forms" value={String(assignedCounts?.forms ?? deviceStats.forms)} />
          <Row label="Entities" value={String(assignedCounts?.beneficiaries ?? deviceStats.entities)} />
          <Row label="Active drafts" value={String(deviceStats.drafts)} />
          <Row label="Sync logs" value={String(deviceStats.syncLogs)} last />
        </Section>

        <Section title="Permissions">
          <Row label="Collect data" value={permissionSet?.canCollectData ? "Allowed" : "Blocked"} />
          <Row label="Work offline" value={permissionSet?.canWorkOffline ? "Allowed" : "Blocked"} />
          <Row label="Use GPS" value={permissionSet?.canUseGps ? "Allowed" : "Blocked"} />
          <Row label="Upload media" value={permissionSet?.canUploadMedia ? "Allowed" : "Blocked"} />
          <Row label="Correct returned submissions" value={permissionSet?.canCorrectReturnedSubmissions ? "Allowed" : "Blocked"} last />
        </Section>

        <Section title="Sync behaviour">
          <Row label="Offline collection" value={mobileRules?.offlineCollectionAllowed ? "Allowed" : "Blocked"} />
          <Row label="Sync required first" value={mobileRules?.syncRequired ? "Yes" : "No"} />
          <Row label="Max offline days" value={String(mobileRules?.maxOfflineDays ?? 7)} />
          <Row label="GPS required" value={mobileRules?.gpsRequired ? "Yes" : "No"} />
          <Row label="Photo required" value={mobileRules?.photoRequired ? "Yes" : "No"} />
          <Row label="Minimum app version" value={mobileRules?.minimumAppVersion ?? "—"} last />
        </Section>

        <Section title="Security">
          <ActionRow
            icon={KeyRound}
            label={hasPin ? "Change login PIN" : "Set up login PIN"}
            sub={
              hasPin
                ? "Update the 4-digit PIN you use to sign in offline."
                : "Create a 4-digit PIN to sign in offline, without internet."
            }
            onPress={() => router.push("/pin?mode=set")}
            last={!hasPin}
          />
          {hasPin ? (
            <ActionRow
              icon={Trash2}
              label="Remove login PIN"
              sub="Disable offline PIN sign-in. Internet will be required to sign in."
              onPress={handleRemovePin}
              last
            />
          ) : null}
        </Section>

        <Section title="Storage">
          <ActionRow
            icon={Trash2}
            label="Clear synced data"
            sub="Removes synced submissions and logs. Unsynced drafts are kept."
            onPress={handleClearSynced}
            disabled={clearing}
            last
          />
        </Section>

        <Section title="Field support">
          <ActionRow
            icon={Activity}
            label="Show diagnostics"
            sub="Share app status, queue counts, and last sync details with support. No form answers are shown."
            onPress={handleDiagnostics}
            last
          />
        </Section>

        <Section title="App info">
          <Row label="Version" value={appVersion} />
          <Row label="Environment" value={buildEnv} />
          <Row label="Platform" value="Android" />
          <Row label="Device ID" value={device?.deviceId ?? session?.bootstrap?.lastSync.deviceId ?? "Pending registration"} />
          <Row label="Device status" value={device?.status ?? session?.bootstrap?.blockedState.deviceStatus ?? "—"} />
          <Row label="Last sync" value={device?.lastSyncAt ?? session?.bootstrap?.lastSync.lastSyncedAt ?? "Never"} last />
        </Section>

        <Section title="Legal">
          <ActionRow
            icon={ScrollText}
            label="Privacy Policy"
            sub="How your data is collected, used, and protected."
            onPress={() => openLegalLink(androidReleaseConfig.privacyPolicyUrl)}
          />
          <ActionRow
            icon={FileText}
            label="Terms of Service"
            sub="The terms for using Atlas FieldOps."
            onPress={() => openLegalLink(androidReleaseConfig.termsUrl)}
            last
          />
        </Section>

        <Button variant="danger" leftIcon={<LogOut size={18} color={colors.primaryForeground} />} onPress={handleLogout}>
          Log out
        </Button>

        <Text style={styles.footer}>
          Atlas FieldOps · {appVersion} · {buildEnv}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card padding="xs" style={styles.sectionCard}>
        {children}
      </Card>
    </View>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last ? styles.rowLast : null]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function ActionRow({
  icon: Icon, label, sub, onPress, disabled, last = false,
}: {
  icon: typeof Trash2; label: string; sub: string; onPress: () => void; disabled?: boolean; last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.actionRow, last ? styles.rowLast : null, { opacity: disabled ? 0.6 : 1 }]}
    >
      <View style={styles.actionIcon}>
        <Icon size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </View>
      <ChevronRight size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionIcon: {
    alignItems: "center",
    backgroundColor: colors.muted,
    borderRadius: radii.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  actionRow: {
    alignItems: "center",
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
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  footer: {
    ...typography.micro,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  rowLabel: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowValue: {
    ...typography.small,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
    maxWidth: "55%",
    textAlign: "right",
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  section: {
    gap: spacing.xs,
  },
  sectionCard: {
    overflow: "hidden",
    padding: 0,
  },
  sectionTitle: {
    ...typography.micro,
    color: colors.mutedForeground,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xs,
    textTransform: "uppercase",
  },
});
