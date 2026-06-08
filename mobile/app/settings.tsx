import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Constants from "expo-constants";

import { useAppContext } from "@/context/AppContext";
import { localDatabase } from "@/storage/localDatabase";

export default function SettingsScreen() {
  const router = useRouter();
  const { session, logout, refreshKey } = useAppContext();
  const [clearing, setClearing] = useState(false);

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

  const appVersion = Constants.expoConfig?.version ?? "—";
  const buildEnv = Constants.expoConfig?.extra?.appEnv ?? "production";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 40 }}>

        {/* Account */}
        <Section title="Account">
          <Row label="Name" value={officer?.fullName ?? user?.fullName ?? user?.email ?? "—"} />
          <Row label="Username" value={officer?.username ?? user?.email?.split("@")[0] ?? "—"} />
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Organization" value={org?.name ?? org?.slug ?? "—"} />
          <Row label="Employee ID" value={officer?.employeeCode ?? "—"} />
          <Row label="Role" value={user?.roles?.join(", ") || "Field officer"} />
          <Row label="Status" value={officer?.status ?? session?.bootstrap?.blockedState.accountStatus ?? "—"} />
          <Row label="Supervisor" value={supervisor?.fullName ?? officer?.supervisorName ?? "Not assigned"} />
        </Section>

        {/* Device data */}
        <Section title="Data on this device">
          <Row label="Assigned projects" value={String(assignedCounts?.projects ?? deviceStats.assignments)} />
          <Row label="Assignments" value={String(assignedCounts?.assignments ?? deviceStats.assignments)} />
          <Row label="Forms" value={String(assignedCounts?.forms ?? deviceStats.forms)} />
          <Row label="Beneficiaries" value={String(assignedCounts?.beneficiaries ?? deviceStats.entities)} />
          <Row label="Active drafts" value={String(deviceStats.drafts)} />
          <Row label="Sync logs" value={String(deviceStats.syncLogs)} />
        </Section>

        <Section title="Permissions">
          <Row label="Collect data" value={permissionSet?.canCollectData ? "Allowed" : "Blocked"} />
          <Row label="Work offline" value={permissionSet?.canWorkOffline ? "Allowed" : "Blocked"} />
          <Row label="Use GPS" value={permissionSet?.canUseGps ? "Allowed" : "Blocked"} />
          <Row label="Upload media" value={permissionSet?.canUploadMedia ? "Allowed" : "Blocked"} />
          <Row label="Correct returned submissions" value={permissionSet?.canCorrectReturnedSubmissions ? "Allowed" : "Blocked"} />
        </Section>

        {/* Sync policy info */}
        <Section title="Sync behaviour">
          <Row label="Offline collection" value={mobileRules?.offlineCollectionAllowed ? "Allowed" : "Blocked"} />
          <Row label="Sync required first" value={mobileRules?.syncRequired ? "Yes" : "No"} />
          <Row label="Max offline days" value={String(mobileRules?.maxOfflineDays ?? 7)} />
          <Row label="GPS required" value={mobileRules?.gpsRequired ? "Yes" : "No"} />
          <Row label="Photo required" value={mobileRules?.photoRequired ? "Yes" : "No"} />
          <Row label="Minimum app version" value={mobileRules?.minimumAppVersion ?? "—"} />
        </Section>

        {/* Storage actions */}
        <Section title="Storage">
          <Pressable
            onPress={handleClearSynced}
            disabled={clearing}
            style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Text style={{ fontSize: 20 }}>🗑</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 14 }}>Clear synced data</Text>
              <Text style={{ color: "#49635a", fontSize: 12 }}>
                Removes synced submissions and logs. Unsynced drafts are kept.
              </Text>
            </View>
            <Text style={{ color: "#8aa79b" }}>›</Text>
          </Pressable>
        </Section>

        {/* App info */}
        <Section title="App info">
          <Row label="Version" value={appVersion} />
          <Row label="Environment" value={buildEnv} />
          <Row label="Platform" value="Android" />
          <Row label="Device ID" value={device?.deviceId ?? session?.bootstrap?.lastSync.deviceId ?? "Pending registration"} />
          <Row label="Device status" value={device?.status ?? session?.bootstrap?.blockedState.deviceStatus ?? "—"} />
          <Row label="Last sync" value={device?.lastSyncAt ?? session?.bootstrap?.lastSync.lastSyncedAt ?? "Never"} />
        </Section>

        {/* Log out */}
        <Pressable
          onPress={handleLogout}
          style={{
            backgroundColor: "white",
            borderColor: "#fca5a5",
            borderRadius: 16,
            borderWidth: 1,
            padding: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#b42318", fontWeight: "800", fontSize: 15 }}>Log out</Text>
        </Pressable>

        <Text style={{ color: "#8aa79b", fontSize: 11, textAlign: "center" }}>
          Atlas FieldOps · {appVersion} · {buildEnv}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{
        color: "#49635a",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.8,
        marginBottom: 4,
        paddingHorizontal: 4,
        textTransform: "uppercase",
      }}>
        {title}
      </Text>
      <View style={{
        backgroundColor: "white",
        borderColor: "#dbe7e2",
        borderRadius: 16,
        borderWidth: 1,
        overflow: "hidden",
      }}>
        {children}
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#f0f5f3",
    }}>
      <Text style={{ color: "#49635a", fontSize: 14 }}>{label}</Text>
      <Text style={{ color: "#12332b", fontWeight: "600", fontSize: 14, maxWidth: "55%", textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}
