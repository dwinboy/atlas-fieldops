import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "@/context/AppContext";
import { DataCollectionSessionService } from "@/forms/dataCollectionSession";
import { localDatabase } from "@/storage/localDatabase";
import type { MobileAssignment, MobileEntity } from "@/models/contracts";

const dataCollection = new DataCollectionSessionService(localDatabase);

const ACTIVE_ASSIGNMENT_STATUSES = new Set(["Assigned", "InProgress", "Overdue"]);

function eligibleAssignmentsFor(entity: MobileEntity): { assignment: MobileAssignment; formName: string }[] {
  const seenForms = new Set<string>();
  const results: { assignment: MobileAssignment; formName: string }[] = [];
  for (const assignment of localDatabase.assignments.list()) {
    if (!assignment.formId || !assignment.formVersionId) continue;
    if (!ACTIVE_ASSIGNMENT_STATUSES.has(assignment.status)) continue;
    if (seenForms.has(assignment.formId)) continue;
    const formVersion = localDatabase.formVersions.list().find((v) => v.id === assignment.formVersionId);
    if (!formVersion) continue;
    const settings = formVersion.entitySettings;
    if (!settings.linkedToEntity || settings.entityType !== entity.entityType) continue;
    if (!settings.updatesExistingEntity && !settings.requiresExistingEntity) continue;
    seenForms.add(assignment.formId);
    const form = localDatabase.forms.list().find((f) => f.id === assignment.formId);
    results.push({ assignment, formName: form?.name ?? "Form" });
  }
  return results;
}

export default function BeneficiariesScreen() {
  const router = useRouter();
  const { refreshKey, isSyncing, syncWork, refresh } = useAppContext();
  const [search, setSearch] = useState("");

  const beneficiaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = localDatabase.entities.list();
    if (!q) return all;
    return all.filter((entity) => {
      const village = entity.location.village ?? entity.location.community ?? entity.location.district ?? "";
      return [
        entity.entityUid,
        entity.name,
        entity.phone,
        entity.householdId,
        entity.nationalId,
        village,
        entity.entityType,
      ].some((value) => String(value ?? "").toLowerCase().includes(q));
    });
  }, [search, refreshKey]);

  function startDraft(entity: MobileEntity, assignment: MobileAssignment) {
    try {
      const result = dataCollection.startForm(assignment.localId, entity.localId);
      refresh();
      router.push(`/form-fill/${result.draft.localId}`);
    } catch (err) {
      Alert.alert("Could not start form", err instanceof Error ? err.message : "Sync your work and try again.");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncWork} tintColor="#12332b" />}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ color: "#12332b", fontSize: 22, fontWeight: "800" }}>
            Beneficiaries
          </Text>
          <Text style={{ color: "#49635a", fontSize: 13 }}>
            Search the beneficiary records synced to this device, and continue data collection on any linked form.
          </Text>
        </View>

        <TextInput
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder="Search name, code, phone, household, or village"
          placeholderTextColor="#b0c5bc"
          style={searchInput}
          value={search}
        />

        {beneficiaries.length === 0 ? (
          <View style={emptyCard}>
            <Text style={{ color: "#9a3412", fontWeight: "800", fontSize: 15 }}>
              No assigned beneficiaries on this device
            </Text>
            <Text style={{ color: "#9a3412", marginTop: 6, fontSize: 13 }}>
              Sync assigned work. If this remains empty, ask your supervisor to assign beneficiaries or use a registration form that creates new beneficiaries.
            </Text>
          </View>
        ) : (
          beneficiaries.map((entity) => {
            const location = [
              entity.location.village,
              entity.location.community,
              entity.location.district,
            ].filter(Boolean).join(", ");
            const actions = entity.status === "Active" ? eligibleAssignmentsFor(entity) : [];

            return (
              <View key={entity.localId} style={beneficiaryCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 15 }}>
                      {entity.name || "Unnamed beneficiary"}
                    </Text>
                    <Text style={{ color: "#49635a", fontSize: 12, marginTop: 2 }}>
                      {entity.entityUid} · {entity.entityType}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: "#d7efe7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" }}>
                    <Text style={{ color: "#0f766e", fontWeight: "700", fontSize: 12 }}>{entity.status}</Text>
                  </View>
                </View>

                <View style={{ gap: 3 }}>
                  {entity.phone ? <Text style={mutedText}>Phone: {entity.phone}</Text> : null}
                  {entity.householdId ? <Text style={mutedText}>Household: {entity.householdId}</Text> : null}
                  {location ? <Text style={mutedText}>Location: {location}</Text> : null}
                  {entity.assignedFormIds.length > 0 ? (
                    <Text style={mutedText}>{entity.assignedFormIds.length} assigned form(s)</Text>
                  ) : null}
                </View>

                {actions.length > 0 ? (
                  <View style={{ gap: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: "#eef3f1", paddingTop: 10 }}>
                    <Text style={{ color: "#8aa79b", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Continue data collection
                    </Text>
                    {actions.map(({ assignment, formName }) => (
                      <Pressable
                        key={assignment.localId}
                        onPress={() => startDraft(entity, assignment)}
                        style={{
                          backgroundColor: "#12332b",
                          borderRadius: 10,
                          paddingVertical: 9,
                          paddingHorizontal: 12,
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }} numberOfLines={1}>
                          {formName}
                        </Text>
                        <Text style={{ color: "#d7efe7", fontWeight: "700", fontSize: 13 }}>Start →</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        {beneficiaries.length > 0 ? (
          <Text style={{ color: "#8aa79b", fontSize: 12, textAlign: "center" }}>
            {beneficiaries.length} beneficiary record(s) on this device
          </Text>
        ) : null}
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

const beneficiaryCard = {
  backgroundColor: "white",
  borderColor: "#dbe7e2",
  borderRadius: 16,
  borderWidth: 1,
  gap: 10,
  padding: 14,
} as const;

const mutedText = {
  color: "#49635a",
  fontSize: 13,
} as const;
