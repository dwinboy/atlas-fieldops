import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "@/context/AppContext";
import { localDatabase } from "@/storage/localDatabase";

export default function BeneficiariesScreen() {
  const { refreshKey, isSyncing, syncWork } = useAppContext();
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncWork} tintColor="#12332b" />}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ color: "#12332b", fontSize: 22, fontWeight: "800" }}>
            Assigned beneficiaries
          </Text>
          <Text style={{ color: "#49635a", fontSize: 13 }}>
            These are the beneficiary records downloaded for your assigned field work.
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
