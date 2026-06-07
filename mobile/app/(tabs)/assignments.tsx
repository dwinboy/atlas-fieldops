import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "@/context/AppContext";
import { DataCollectionSessionService } from "@/forms/dataCollectionSession";
import { localDatabase } from "@/storage/localDatabase";
import type { MobileAssignment } from "@/models/contracts";

const dataCollection = new DataCollectionSessionService(localDatabase);

export default function AssignmentsScreen() {
  const router = useRouter();
  const { refreshKey, isSyncing, syncWork } = useAppContext();
  const [search, setSearch] = useState("");

  const assignments = useMemo(() => {
    const all = localDatabase.assignments.list();
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((a) => {
      const form = a.formId ? localDatabase.forms.list().find((f) => f.id === a.formId) : null;
      const project = localDatabase.projects.list().find((p) => p.id === a.projectId);
      return [form?.name, project?.name].some((s) => s?.toLowerCase().includes(q));
    });
  }, [search, refreshKey]);

  function formName(formId: string | null) {
    if (!formId) return "No form assigned";
    return localDatabase.forms.list().find((f) => f.id === formId)?.name ?? "Unknown form";
  }

  function projectName(projectId: string) {
    return localDatabase.projects.list().find((p) => p.id === projectId)?.name ?? "Unknown project";
  }

  function openAssignment(assignment: MobileAssignment) {
    const formVersion = assignment.formVersionId
      ? localDatabase.formVersions.list().find((v) => v.id === assignment.formVersionId)
      : null;

    if (!assignment.formId || !assignment.formVersionId || !formVersion) {
      return; // card shows explanation
    }

    if (formVersion.entitySettings.requiresExistingEntity) {
      router.push(`/entity-select/${assignment.localId}`);
    } else {
      try {
        const result = dataCollection.startForm(assignment.localId, null);
        router.push(`/form-fill/${result.draft.localId}`);
      } catch (err) {
        // handled below via isReady check
      }
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isSyncing} onRefresh={syncWork} tintColor="#12332b" />
        }
      >
        <TextInput
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder="Search assignments…"
          placeholderTextColor="#b0c5bc"
          style={searchInput}
          value={search}
        />

        {assignments.length === 0 ? (
          <View style={emptyCard}>
            <Text style={{ color: "#9a3412", fontWeight: "800", fontSize: 15 }}>No assigned work on this device</Text>
            <Text style={{ color: "#9a3412", marginTop: 6, fontSize: 13 }}>
              Ask your supervisor to assign a published project form, then pull down to sync.
            </Text>
          </View>
        ) : (
          assignments.map((assignment) => {
            const isReady = Boolean(assignment.formId && assignment.formVersionId);
            const progress = assignment.targetCount
              ? `${assignment.completedCount} / ${assignment.targetCount} records`
              : `${assignment.completedCount} record(s) collected`;

            return (
              <Pressable
                key={assignment.localId}
                onPress={() => openAssignment(assignment)}
                style={{
                  backgroundColor: "white",
                  borderColor: isReady ? "#dbe7e2" : "#fed7aa",
                  borderRadius: 16,
                  borderWidth: 1,
                  padding: 16,
                  gap: 4,
                }}
              >
                <Text style={{ color: "#12332b", fontSize: 16, fontWeight: "800" }}>
                  {formName(assignment.formId)}
                </Text>
                <Text style={{ color: "#49635a", fontSize: 13 }}>
                  📁 {projectName(assignment.projectId)}
                </Text>
                <Text style={{ color: "#49635a", fontSize: 13 }}>📊 {progress}</Text>
                {assignment.locationIds?.length > 0 ? (
                  <Text style={{ color: "#49635a", fontSize: 13 }}>📍 {assignment.locationIds[0]}</Text>
                ) : null}

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <View style={{
                    backgroundColor: isReady ? "#d7efe7" : "#fff7ed",
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}>
                    <Text style={{
                      color: isReady ? "#0f766e" : "#9a3412",
                      fontWeight: "700",
                      fontSize: 12,
                    }}>
                      {isReady ? "Ready" : "Waiting for form"}
                    </Text>
                  </View>
                  {isReady && (
                    <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 13 }}>
                      Tap to start →
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })
        )}

        {assignments.length > 0 && (
          <Text style={{ color: "#8aa79b", fontSize: 12, textAlign: "center" }}>
            {assignments.length} assignment(s) • Pull down to sync latest work
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const searchInput = {
  backgroundColor: "white",
  borderColor: "#dbe7e2",
  borderRadius: 12,
  borderWidth: 1,
  color: "#12332b",
  fontSize: 15,
  padding: 12,
} as const;

const emptyCard = {
  backgroundColor: "#fff7ed",
  borderColor: "#fed7aa",
  borderRadius: 16,
  borderWidth: 1,
  padding: 16,
} as const;
