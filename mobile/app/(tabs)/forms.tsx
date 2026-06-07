import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "@/context/AppContext";
import { localDatabase } from "@/storage/localDatabase";

export default function FormsScreen() {
  const { refreshKey, isSyncing, syncWork } = useAppContext();
  const [search, setSearch] = useState("");

  const forms = useMemo(() => {
    const all = localDatabase.forms.list();
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((f) => f.name?.toLowerCase().includes(q));
  }, [search, refreshKey]);

  function versionCount(formId: string) {
    return localDatabase.formVersions.list().filter((v) => v.formId === formId).length;
  }

  function latestVersion(formId: string) {
    const versions = localDatabase.formVersions.list().filter((v) => v.formId === formId);
    return versions.sort((a, b) => b.version - a.version)[0] ?? null;
  }

  function sectionCount(formId: string) {
    const v = latestVersion(formId);
    return v ? v.sections.length : 0;
  }

  function questionCount(formId: string) {
    const v = latestVersion(formId);
    if (!v) return 0;
    return v.sections.reduce((acc, s) => acc + s.questions.length, 0);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncWork} tintColor="#12332b" />}
      >
        <TextInput
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder="Search forms…"
          placeholderTextColor="#b0c5bc"
          style={{
            backgroundColor: "white",
            borderColor: "#dbe7e2",
            borderRadius: 12,
            borderWidth: 1,
            color: "#12332b",
            fontSize: 15,
            padding: 12,
          }}
          value={search}
        />

        {forms.length === 0 ? (
          <View style={{
            alignItems: "center",
            paddingVertical: 48,
            gap: 8,
          }}>
            <Text style={{ fontSize: 40 }}>📄</Text>
            <Text style={{ color: "#49635a", fontWeight: "700" }}>No forms downloaded</Text>
            <Text style={{ color: "#8aa79b", fontSize: 13 }}>
              Pull down to sync assigned forms from the web platform.
            </Text>
          </View>
        ) : (
          forms.map((form) => {
            const version = latestVersion(form.id);
            const isOfflineReady = !!version;
            const sections = sectionCount(form.id);
            const questions = questionCount(form.id);

            return (
              <View
                key={form.localId}
                style={{
                  backgroundColor: "white",
                  borderColor: "#dbe7e2",
                  borderRadius: 16,
                  borderWidth: 1,
                  padding: 16,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 15, flex: 1, marginRight: 8 }}>
                    {form.name ?? "Unnamed form"}
                  </Text>
                  <View style={{
                    backgroundColor: isOfflineReady ? "#d7efe7" : "#f0f5f3",
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                  }}>
                    <Text style={{ color: isOfflineReady ? "#0f766e" : "#49635a", fontWeight: "700", fontSize: 12 }}>
                      {isOfflineReady ? "Offline ready" : "No version"}
                    </Text>
                  </View>
                </View>

                {form.description ? (
                  <Text style={{ color: "#49635a", fontSize: 13 }} numberOfLines={2}>{form.description}</Text>
                ) : null}

                <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                  {version && (
                    <Text style={{ color: "#8aa79b", fontSize: 12 }}>
                      Version {version.version}
                    </Text>
                  )}
                  <Text style={{ color: "#8aa79b", fontSize: 12 }}>
                    {sections} section(s) · {questions} question(s)
                  </Text>
                  <Text style={{ color: "#8aa79b", fontSize: 12 }}>
                    {versionCount(form.id)} version(s) stored
                  </Text>
                </View>

                {version?.entitySettings.requiresExistingEntity && (
                  <Text style={{ color: "#49635a", fontSize: 12 }}>
                    👤 Requires beneficiary selection
                  </Text>
                )}

                <Text style={{ color: "#8aa79b", fontSize: 11 }}>
                  Read-only on mobile • Managed from web platform
                </Text>
              </View>
            );
          })
        )}

        {forms.length > 0 && (
          <Text style={{ color: "#8aa79b", fontSize: 12, textAlign: "center" }}>
            {forms.length} form(s) on this device
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
