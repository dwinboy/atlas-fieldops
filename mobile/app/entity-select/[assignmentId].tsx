import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DataCollectionSessionService } from "@/forms/dataCollectionSession";
import { localDatabase } from "@/storage/localDatabase";
import type { MobileEntity } from "@/models/contracts";
import { useAppContext } from "@/context/AppContext";

const dataCollection = new DataCollectionSessionService(localDatabase);

const OTHER_RESULTS_LIMIT = 15;
const MIN_BROAD_SEARCH_LENGTH = 2;

const STATUS_TONES: Record<MobileEntity["status"], { bg: string; fg: string }> = {
  Active: { bg: "#d7efe7", fg: "#0f766e" },
  Inactive: { bg: "#f1f5f9", fg: "#475569" },
  Deceased: { bg: "#f1f5f9", fg: "#475569" },
  Moved: { bg: "#fef3c7", fg: "#92400e" },
  Duplicate: { bg: "#fee2e2", fg: "#b91c1c" },
  Archived: { bg: "#f1f5f9", fg: "#475569" },
};

const AVATAR_PALETTE = ["#12332b", "#0f766e", "#1d4ed8", "#7c3aed", "#b45309"];

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

  const query = search.trim().toLowerCase();

  const matchesQuery = (entity: MobileEntity): boolean => {
    if (!query) return true;
    return [
      entity.entityUid,
      entity.name,
      entity.phone,
      entity.householdId,
      entity.nationalId,
      entity.location?.village,
      entity.location?.community,
      entity.location?.district,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  };

  const assignedEntities = useMemo(() => {
    if (!assignment) return [];
    return localDatabase.entities
      .list()
      .filter((e) => assignment.entityIds.includes(e.id))
      .filter(matchesQuery);
  }, [assignment, search]);

  const otherEntities = useMemo(() => {
    if (!assignment || query.length < MIN_BROAD_SEARCH_LENGTH) return [];
    const assignedIds = new Set(assignment.entityIds);
    return localDatabase.entities
      .list()
      .filter((e) => !assignedIds.has(e.id))
      .filter((e) => e.entityType === entityType)
      .filter(matchesQuery)
      .slice(0, OTHER_RESULTS_LIMIT + 1);
  }, [assignment, search, entityType]);

  const otherEntitiesShown = otherEntities.slice(0, OTHER_RESULTS_LIMIT);
  const otherEntitiesTruncated = otherEntities.length > OTHER_RESULTS_LIMIT;
  const isSearching = query.length > 0;
  const isBroadSearch = query.length >= MIN_BROAD_SEARCH_LENGTH;
  const noResultsAtAll = isSearching && assignedEntities.length === 0 && otherEntitiesShown.length === 0;

  function startDraft(entity: MobileEntity, isAssigned: boolean) {
    if (!assignment) return;
    const proceed = () => {
      try {
        setError("");
        const result = dataCollection.startForm(assignment.localId, entity.localId);
        refresh();
        router.push(`/form-fill/${result.draft.localId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start form.");
      }
    };

    if (isAssigned) {
      proceed();
      return;
    }

    Alert.alert(
      "Use this record?",
      `${entity.name || "This record"} was not pre-assigned to you for this survey. Continue only if you're confident this is the right ${entityType}.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: proceed },
      ],
    );
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
      <ScrollView contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
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
            {assignment.entityIds.length} {entityType}(s) assigned to this survey
          </Text>
        </View>

        {/* Search */}
        <View>
          <TextInput
            autoCapitalize="none"
            clearButtonMode="while-editing"
            onChangeText={setSearch}
            placeholder="Search by name, ID, phone, household, or village…"
            placeholderTextColor="#b0c5bc"
            style={{
              backgroundColor: "white",
              borderColor: "#dbe7e2",
              borderRadius: 12,
              borderWidth: 1,
              color: "#12332b",
              fontSize: 15,
              padding: 12,
              paddingRight: search.length > 0 ? 40 : 12,
            }}
            value={search}
          />
          {search.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear search"
              hitSlop={10}
              onPress={() => setSearch("")}
              style={{ position: "absolute", right: 10, top: 0, bottom: 0, justifyContent: "center" }}
            >
              <Text style={{ color: "#8aa79b", fontSize: 16, fontWeight: "800" }}>✕</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={{ color: "#8aa79b", fontSize: 12, marginTop: -6 }}>
          {isBroadSearch
            ? "Showing records assigned to you, plus other matches from your synced data."
            : "Showing records assigned to you. Keep typing to search all synced records."}
        </Text>

        {error ? (
          <View style={warnCard}>
            <Text style={{ color: "#9a3412", fontWeight: "700" }}>{error}</Text>
          </View>
        ) : null}

        {/* Assigned entities */}
        <SectionHeader
          title={`Assigned ${entityType}s`}
          count={assignedEntities.length}
        />
        {assignedEntities.length === 0 ? (
          <View style={warnCard}>
            <Text style={{ color: "#9a3412", fontWeight: "800" }}>
              {isSearching ? `No assigned ${entityType}s match your search` : `No ${entityType}s assigned yet`}
            </Text>
            <Text style={{ color: "#9a3412", marginTop: 6, fontSize: 13 }}>
              {isSearching
                ? isBroadSearch
                  ? "Check the other matches below, or refine your search."
                  : "Try a different search term, or type at least 2 characters to search all synced records."
                : "Sync assigned work or ask your supervisor to assign beneficiaries."}
            </Text>
          </View>
        ) : (
          assignedEntities.map((entity) => (
            <EntityCard
              key={entity.localId}
              entity={entity}
              query={query}
              onPress={() => startDraft(entity, true)}
            />
          ))
        )}

        {/* Other matches from the broader local dataset */}
        {isBroadSearch && otherEntitiesShown.length > 0 ? (
          <>
            <SectionHeader
              title="Other matches"
              count={otherEntities.length > OTHER_RESULTS_LIMIT ? `${OTHER_RESULTS_LIMIT}+` : otherEntitiesShown.length}
              hint={`Not part of this assignment — confirm it's the right ${entityType} before using it.`}
            />
            {otherEntitiesShown.map((entity) => (
              <EntityCard
                key={entity.localId}
                entity={entity}
                query={query}
                tag="Other record"
                onPress={() => startDraft(entity, false)}
              />
            ))}
            {otherEntitiesTruncated ? (
              <Text style={{ color: "#8aa79b", fontSize: 12, textAlign: "center" }}>
                Showing the first {OTHER_RESULTS_LIMIT} matches. Refine your search to narrow results.
              </Text>
            ) : null}
          </>
        ) : null}

        {noResultsAtAll ? (
          <View style={warnCard}>
            <Text style={{ color: "#9a3412", fontWeight: "800" }}>No {entityType}s found</Text>
            <Text style={{ color: "#9a3412", marginTop: 6, fontSize: 13 }}>
              Double-check the spelling, or sync to download the latest records.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, count, hint }: { title: string; count: number | string; hint?: string }) {
  return (
    <View style={{ marginTop: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {title}
        </Text>
        <Text style={{ color: "#8aa79b", fontSize: 12, fontWeight: "700" }}>{count}</Text>
      </View>
      {hint ? <Text style={{ color: "#8aa79b", fontSize: 12, marginTop: 2 }}>{hint}</Text> : null}
    </View>
  );
}

function EntityCard({
  entity,
  query,
  tag,
  onPress,
}: {
  entity: MobileEntity;
  query: string;
  tag?: string;
  onPress: () => void;
}) {
  const location = [entity.location?.village, entity.location?.community, entity.location?.district]
    .filter(Boolean)
    .join(", ") || "No location";
  const statusTone = STATUS_TONES[entity.status] ?? STATUS_TONES.Active;
  const avatarColor = AVATAR_PALETTE[hashString(entity.entityUid || entity.id) % AVATAR_PALETTE.length];

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: "white",
        borderColor: "#dbe7e2",
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: avatarColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800", fontSize: 14 }}>{initials(entity.name)}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 15, flexShrink: 1 }}>
              <HighlightedText text={entity.name || "Unnamed"} query={query} />
            </Text>
            <View style={{ backgroundColor: statusTone.bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: statusTone.fg, fontWeight: "700", fontSize: 11 }}>{entity.status}</Text>
            </View>
          </View>
          <Text style={{ color: "#49635a", fontSize: 13 }}>
            ID: <HighlightedText text={entity.entityUid} query={query} />
          </Text>
        </View>
      </View>

      {tag ? (
        <View style={{ alignSelf: "flex-start", backgroundColor: "#fff7ed", borderColor: "#fed7aa", borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ color: "#9a3412", fontWeight: "700", fontSize: 11 }}>{tag}</Text>
        </View>
      ) : null}

      {entity.phone ? (
        <Text style={{ color: "#49635a", fontSize: 13 }}>
          📞 <HighlightedText text={entity.phone} query={query} />
        </Text>
      ) : null}
      <Text style={{ color: "#49635a", fontSize: 13 }}>
        📍 <HighlightedText text={location} query={query} />
      </Text>
      {entity.householdId ? (
        <Text style={{ color: "#8aa79b", fontSize: 12 }}>
          Household: <HighlightedText text={entity.householdId} query={query} />
        </Text>
      ) : null}
      <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 13, marginTop: 6 }}>
        Tap to start form →
      </Text>
    </Pressable>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <Text>{text}</Text>;
  const lower = text.toLowerCase();
  const index = lower.indexOf(query);
  if (index === -1) return <Text>{text}</Text>;
  return (
    <Text>
      {text.slice(0, index)}
      <Text style={{ backgroundColor: "#fef08a", color: "#713f12", fontWeight: "800" }}>
        {text.slice(index, index + query.length)}
      </Text>
      {text.slice(index + query.length)}
    </Text>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const warnCard = {
  backgroundColor: "#fff7ed",
  borderColor: "#fed7aa",
  borderRadius: 14,
  borderWidth: 1,
  padding: 14,
} as const;
