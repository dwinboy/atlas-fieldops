import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Constants from "expo-constants";

import { useAppContext } from "@/context/AppContext";
import { localDatabase } from "@/storage/localDatabase";

export default function SettingsScreen() {
  const router = useRouter();
  const { session, logout } = useAppContext();
  const [clearing, setClearing] = useState(false);

  const user = session?.bootstrap?.user;
  const org = session?.bootstrap?.organization;

  const deviceStats = useMemo(() => ({
    assignments: localDatabase.assignments.list().length,
    forms: localDatabase.forms.list().length,
    entities: localDatabase.entities.list().length,
    drafts: localDatabase.draftSubmissions.list().filter((d) => d.status !== "Synced").length,
    syncLogs: localDatabase.syncLogs.list().length,
  }), []);

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
          <Row label="Name" value={user?.fullName ?? user?.email ?? "—"} />
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Organization" value={org?.name ?? org?.slug ?? "—"} />
          <Row label="Role" value={user?.role ?? "Field officer"} />
        </Section>

        {/* Device data */}
        <Section title="Data on this device">
          <Row label="Assignments" value={String(deviceStats.assignments)} />
          <Row label="Forms" value={String(deviceStats.forms)} />
          <Row label="Beneficiaries" value={String(deviceStats.entities)} />
          <Row label="Active drafts" value={String(deviceStats.drafts)} />
          <Row label="Sync logs" value={String(deviceStats.syncLogs)} />
        </Section>

        {/* Sync policy info */}
        <Section title="Sync behaviour">
          <View style={{ padding: 14, gap: 6 }}>
            <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 13 }}>Automatic sync</Text>
            <Text style={{ color: "#49635a", fontSize: 13 }}>
              The app syncs queued submissions automatically when it returns to the foreground with an internet connection.
            </Text>
          </View>
          <View style={{ padding: 14, gap: 6, borderTopColor: "#f0f5f3", borderTopWidth: 1 }}>
            <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 13 }}>Offline mode</Text>
            <Text style={{ color: "#49635a", fontSize: 13 }}>
              All assigned work and collected records are available offline. Sync is not required to collect data.
            </Text>
          </View>
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
