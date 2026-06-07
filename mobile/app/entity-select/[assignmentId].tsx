import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DataCollectionSessionService } from "@/forms/dataCollectionSession";
import { localDatabase } from "@/storage/localDatabase";
import type { MobileEntity } from "@/models/contracts";
import { useAppContext } from "@/context/AppContext";

const dataCollection = new DataCollectionSessionService(localDatabase);

export default function EntitySelectScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const router = useRouter();
  const { refresh } = useAppContext();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const assignment = useMemo(
    () => localDatabase.assignments.get(assignmentId ?? ""),
    [assignmentId],
  );

  const formVersion = useMemo(() => {
    if (!assignment?.formVersionId) return null;
    return localDatabase.formVersions.list().find((v) => v.id === assignment.formVersionId) ?? null;
  }, [assignment]);

  const entityType = formVersion?.entitySettings?.entityType ?? "beneficiary";

  const entities = useMemo(() => {
    if (!assignment) return [];
    const q = search.trim().toLowerCase();
    return localDatabase.entities
      .list()
      .filter((e) => assignment.entityIds.includes(e.id))
      .filter((e) => {
        if (!q) return true;
        return [e.entityUid, e.name, e.phone, e.householdId, e.location?.village, e.location?.community]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      });
  }, [assignment, search]);

  function locationLine(e: MobileEntity): string {
    return [e.location?.village, e.location?.community, e.location?.district]
      .filter(Boolean)
      .join(", ") || "No location";
  }

  function startDraft(entity: MobileEntity) {
    if (!assignment) return;
    try {
      const result = dataCollection.startForm(assignment.localId, entity.localId);
      refresh();
      router.push(`/form-fill/${result.draft.localId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start form.");
    }
  }

  if (!assignment) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8", padding: 20 }}>
        <View style={warnCard}>
          <Text style={{ color: "#9a3412", fontWeight: "800" }}>Assignment not found</Text>
          <Text style={{ color: "#9a3412", marginTop: 6, fontSize: 13 }}>
            Sync your assigned work and try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const formName = assignment.formId
    ? localDatabase.forms.list().find((f) => f.id === assignment.formId)?.name ?? "Assigned form"
    : "No form";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 32 }}>
        {/* Context card */}
        <View style={{
          backgroundColor: "#12332b",
          borderRadius: 16,
          padding: 16,
          gap: 4,
        }}>
          <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>{formName}</Text>
          <Text style={{ color: "#d7efe7", fontSize: 13 }}>
            Select the {entityType} you are visiting to begin data collection.
          </Text>
          <Text style={{ color: "#d7efe7", fontSize: 12, marginTop: 4 }}>
            {entities.length} {entityType}(s) assigned to this survey
          </Text>
        </View>

        {/* Search */}
        <TextInput
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder={`Search by name, ID, phone, or location…`}
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

        {error ? (
          <View style={warnCard}>
            <Text style={{ color: "#9a3412", fontWeight: "700" }}>{error}</Text>
          </View>
        ) : null}

        {/* Entity list */}
        {entities.length === 0 ? (
          <View style={warnCard}>
            <Text style={{ color: "#9a3412", fontWeight: "800" }}>No {entityType}s found</Text>
            <Text style={{ color: "#9a3412", marginTop: 6, fontSize: 13 }}>
              {search
                ? "Try a different search term."
                : "Sync assigned work or ask your supervisor to assign beneficiaries."}
            </Text>
          </View>
        ) : (
          entities.map((entity) => (
            <Pressable
              key={entity.localId}
              onPress={() => startDraft(entity)}
              style={{
                backgroundColor: "white",
                borderColor: "#dbe7e2",
                borderRadius: 16,
                borderWidth: 1,
                padding: 16,
                gap: 4,
              }}
            >
              <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 15 }}>{entity.name}</Text>
              <Text style={{ color: "#49635a", fontSize: 13 }}>ID: {entity.entityUid}</Text>
              {entity.phone ? (
                <Text style={{ color: "#49635a", fontSize: 13 }}>📞 {entity.phone}</Text>
              ) : null}
              <Text style={{ color: "#49635a", fontSize: 13 }}>📍 {locationLine(entity)}</Text>
              {entity.householdId ? (
                <Text style={{ color: "#8aa79b", fontSize: 12 }}>Household: {entity.householdId}</Text>
              ) : null}
              <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 13, marginTop: 6 }}>
                Tap to start form →
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const warnCard = {
  backgroundColor: "#fff7ed",
  borderColor: "#fed7aa",
  borderRadius: 14,
  borderWidth: 1,
  padding: 14,
} as const;
