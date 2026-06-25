import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, MapPin, Phone, Search, UserSearch, X } from "lucide-react-native";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, Button, Card, EmptyState, IconButton, Input } from "@/components/ui";
import {
  describeEntityHierarchy,
  describeFormEntityWorkflow,
  displayEntityCategoryName,
  entityCategoryTrailForEntity,
  entityCategoryTrailForFormSettings,
  entityMatchesFormEntityScope,
  pluralizeEntityCategory,
} from "@/entities/entityCategoryUtils";
import { DataCollectionSessionService } from "@/forms/dataCollectionSession";
import { localDatabase } from "@/storage/localDatabase";
import type { MobileEntity, MobileEntityCategory } from "@/models/contracts";
import { useAppContext } from "@/context/AppContext";
import { colors, fontFamily, radii, spacing, tone, type Tone, typography } from "@/theme";

const dataCollection = new DataCollectionSessionService(localDatabase);

const OTHER_RESULTS_LIMIT = 15;
const MIN_BROAD_SEARCH_LENGTH = 2;

const STATUS_TONE: Record<MobileEntity["status"], Tone> = {
  Active: "success",
  Inactive: "neutral",
  Deceased: "neutral",
  Moved: "warning",
  Duplicate: "danger",
  Archived: "neutral",
};

const AVATAR_PALETTE = [colors.primary, colors.info, colors.warning, colors.danger, colors.accent];

export default function EntitySelectScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const router = useRouter();
  const { refresh, refreshKey } = useAppContext();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const entityCategories = useMemo(() => localDatabase.entityCategories.list(), [refreshKey]);
  const allEntities = useMemo(() => localDatabase.entities.list(), [refreshKey]);

  const assignment = useMemo(
    () => localDatabase.assignments.get(assignmentId ?? ""),
    [assignmentId],
  );

  const formVersion = useMemo(() => {
    if (!assignment?.formVersionId) return null;
    return localDatabase.formVersions.list().find((v) => v.id === assignment.formVersionId) ?? null;
  }, [assignment]);

  const entityType = useMemo(() => {
    const settings = formVersion?.entitySettings;
    const category = settings?.entityCategoryId
      ? entityCategories.find((item) => item.id === settings.entityCategoryId)
      : null;
    return category?.name ?? displayEntityCategoryName(settings?.entityType, entityCategories, "Entity");
  }, [entityCategories, formVersion]);
  const entityTypePlural = pluralizeEntityCategory(entityType);
  const workflow = useMemo(
    () =>
      formVersion
        ? describeFormEntityWorkflow(formVersion.entitySettings, entityCategories)
        : null,
    [entityCategories, formVersion],
  );
  const formCategoryTrail = useMemo(
    () =>
      formVersion
        ? entityCategoryTrailForFormSettings(formVersion.entitySettings, entityCategories)
        : null,
    [entityCategories, formVersion],
  );

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
      ...Object.values(entity.profile ?? {}),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  };

  const assignedEntities = useMemo(() => {
    if (!assignment) return [];
    return allEntities
      .filter((e) => assignment.entityIds.includes(e.id))
      .filter(matchesQuery);
  }, [allEntities, assignment, search]);

  const otherEntities = useMemo(() => {
    if (!assignment || query.length < MIN_BROAD_SEARCH_LENGTH) return [];
    const assignedIds = new Set(assignment.entityIds);
    return allEntities
      .filter((e) => !assignedIds.has(e.id))
      .filter((e) => !formVersion || entityMatchesFormEntityScope(e, formVersion, entityCategories))
      .filter(matchesQuery)
      .slice(0, OTHER_RESULTS_LIMIT + 1);
  }, [allEntities, assignment, entityCategories, formVersion, query.length, search]);

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

  function startNewDraft() {
    if (!assignment || !workflow?.allowsCreateWithoutSelection) return;
    try {
      setError("");
      const result = dataCollection.startForm(assignment.localId, null);
      refresh();
      router.push(`/form-fill/${result.draft.localId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start form.");
    }
  }

  if (!assignment) {
    return (
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <View style={{ padding: spacing.lg }}>
          <EmptyState
            icon={AlertTriangle}
            title="Assignment not found"
            description="Sync your assigned work and try again."
          />
        </View>
      </SafeAreaView>
    );
  }

  const formName = assignment.formId
    ? localDatabase.forms.list().find((f) => f.id === assignment.formId)?.name ?? "Assigned form"
    : "No form";

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card tone="primary" padding="lg" style={{ gap: 4 }}>
          <Text style={styles.contextTitle}>{formName}</Text>
          <Text style={styles.contextSubtitle}>
            Select the {entityType.toLowerCase()} you are working with to begin data collection.
          </Text>
          {formCategoryTrail ? (
            <Text style={[styles.contextSubtitle, { marginTop: spacing.xs, opacity: 0.9 }]}>
              Category path: {formCategoryTrail}
            </Text>
          ) : null}
          {workflow ? (
            <Text style={[styles.contextSubtitle, { marginTop: spacing.xs, opacity: 0.92 }]}>
              {workflow.helperText}
            </Text>
          ) : null}
          <Text style={[styles.contextSubtitle, { marginTop: spacing.xs, opacity: 0.85 }]}>
            {assignment.entityIds.length} {entityTypePlural} assigned to this survey
          </Text>
        </Card>

        {workflow?.allowsCreateWithoutSelection ? (
          <Card padding="lg" style={{ gap: spacing.sm }}>
            <Text style={styles.sectionTitle}>Start a new {entityType.toLowerCase()} record</Text>
            <Text style={styles.entityMeta}>
              Continue without selecting an existing record when this submission should register a new {entityType.toLowerCase()}.
            </Text>
            <Button onPress={startNewDraft} rightIcon={<ChevronRight size={16} color={colors.primaryForeground} />}>
              Continue without selection
            </Button>
          </Card>
        ) : null}

        <View>
          <Search size={18} color={colors.mutedForeground} style={styles.searchIcon} />
          <Input
            autoCapitalize="none"
            clearButtonMode="while-editing"
            onChangeText={setSearch}
            placeholder={`Search ${entityTypePlural.toLowerCase()} by name, ID, phone, code, or location…`}
            value={search}
            style={styles.searchInput}
          />
          {search.length > 0 ? (
            <IconButton
              icon={X}
              accessibilityLabel="Clear search"
              size={16}
              onPress={() => setSearch("")}
              style={styles.clearButton}
            />
          ) : null}
        </View>
        <Text style={styles.hint}>
          {isBroadSearch
            ? "Showing records assigned to you, plus other matches from your synced data."
            : workflow?.allowsCreateWithoutSelection
              ? "Showing records assigned to you. Keep typing to search all synced records, or continue without selection to register a new record."
              : "Showing records assigned to you. Keep typing to search all synced records."}
        </Text>

        {error ? (
          <Card tone="warning" padding="md">
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        <ListSectionHeader title={`Assigned ${entityTypePlural}`} count={assignedEntities.length} />
        {assignedEntities.length === 0 ? (
          <EmptyState
            icon={UserSearch}
            title={isSearching ? `No assigned ${entityTypePlural} match your search` : `No ${entityTypePlural} assigned yet`}
            description={
              isSearching
                ? isBroadSearch
                  ? "Check the other matches below, or refine your search."
                  : "Try a different search term, or type at least 2 characters to search all synced records."
                : "Sync assigned work or ask your supervisor to assign records."
            }
          />
        ) : (
          assignedEntities.map((entity) => (
            <EntityCard
              key={entity.localId}
              allEntities={allEntities}
              entityCategories={entityCategories}
              entity={entity}
              query={query}
              onPress={() => startDraft(entity, true)}
            />
          ))
        )}

        {isBroadSearch && otherEntitiesShown.length > 0 ? (
          <>
            <ListSectionHeader
              title="Other matches"
              count={otherEntities.length > OTHER_RESULTS_LIMIT ? `${OTHER_RESULTS_LIMIT}+` : otherEntitiesShown.length}
              hint={`Not part of this assignment — confirm it's the right ${entityType} before using it.`}
            />
            {otherEntitiesShown.map((entity) => (
              <EntityCard
                key={entity.localId}
                allEntities={allEntities}
                entityCategories={entityCategories}
                entity={entity}
                query={query}
                tag="Other record"
                onPress={() => startDraft(entity, false)}
              />
            ))}
            {otherEntitiesTruncated ? (
              <Text style={styles.footer}>
                Showing the first {OTHER_RESULTS_LIMIT} matches. Refine your search to narrow results.
              </Text>
            ) : null}
          </>
        ) : null}

        {noResultsAtAll ? (
          <EmptyState
            icon={UserSearch}
            title={`No ${entityTypePlural} found`}
            description="Double-check the spelling, or sync to download the latest records."
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ListSectionHeader({ title, count, hint }: { title: string; count: number | string; hint?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Badge label={String(count)} tone="neutral" />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function EntityCard({
  allEntities,
  entityCategories,
  entity,
  query,
  tag,
  onPress,
}: {
  allEntities: MobileEntity[];
  entityCategories: MobileEntityCategory[];
  entity: MobileEntity;
  query: string;
  tag?: string;
  onPress: () => void;
}) {
  const location = [entity.location?.village, entity.location?.community, entity.location?.district]
    .filter(Boolean)
    .join(", ") || "No location";
  const statusTone = STATUS_TONE[entity.status] ?? "neutral";
  const avatarColor = AVATAR_PALETTE[hashString(entity.entityUid || entity.id) % AVATAR_PALETTE.length];
  const hierarchy = describeEntityHierarchy(entity, allEntities);
  const categoryTrail = entityCategoryTrailForEntity(entity, entityCategories);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <Card padding="lg" style={{ gap: spacing.sm }}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarLabel}>{initials(entity.name)}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.entityName} numberOfLines={1}>
                <HighlightedText text={entity.name || "Unnamed"} query={query} />
              </Text>
              <Badge label={entity.status} tone={statusTone} />
            </View>
            <Text style={styles.entityMeta}>
              ID: <HighlightedText text={entity.entityUid} query={query} />
            </Text>
          </View>
        </View>

        {tag ? <Badge label={tag} tone="warning" /> : null}

        {entity.phone ? (
          <View style={styles.metaRow}>
            <Phone size={14} color={colors.mutedForeground} />
            <Text style={styles.entityMeta}><HighlightedText text={entity.phone} query={query} /></Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <MapPin size={14} color={colors.mutedForeground} />
          <Text style={styles.entityMeta}><HighlightedText text={location} query={query} /></Text>
        </View>
        {categoryTrail ? <Text style={styles.entityMicro}>Category: {categoryTrail}</Text> : null}
        {entity.householdId ? (
          <Text style={styles.entityMicro}>
            Household: <HighlightedText text={entity.householdId} query={query} />
          </Text>
        ) : null}
        {hierarchy.summary ? <Text style={styles.entityMicro}>Linked records: {hierarchy.summary}</Text> : null}
        {hierarchy.parentLine ? <Text style={styles.entityMicro}>{hierarchy.parentLine}</Text> : null}
        {hierarchy.childLine ? <Text style={styles.entityMicro}>{hierarchy.childLine}</Text> : null}

        <View style={styles.startRow}>
          <Text style={styles.startLabel}>Tap to start form</Text>
          <ChevronRight size={16} color={colors.primary} />
        </View>
      </Card>
    </Pressable>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <Text>{text}</Text>;
  const lower = text.toLowerCase();
  const index = lower.indexOf(query);
  if (index === -1) return <Text>{text}</Text>;
  const highlight = tone("warning");
  return (
    <Text>
      {text.slice(0, index)}
      <Text style={{ backgroundColor: highlight.bg, color: highlight.fg, fontWeight: "800" }}>
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

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: radii.full,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarLabel: {
    ...typography.small,
    color: colors.primaryForeground,
    fontFamily: fontFamily.semibold,
    fontWeight: "800",
  },
  cardHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  cardTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  clearButton: {
    height: 32,
    position: "absolute",
    right: spacing.xs,
    top: 7,
    width: 32,
  },
  contextSubtitle: {
    ...typography.small,
    color: colors.primaryForeground,
  },
  contextTitle: {
    ...typography.headingSm,
    color: colors.primaryForeground,
    fontFamily: fontFamily.semibold,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  entityMeta: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  entityMicro: {
    ...typography.micro,
    color: colors.mutedForeground,
  },
  entityName: {
    ...typography.headingSm,
    color: colors.foreground,
    flexShrink: 1,
    fontFamily: fontFamily.semibold,
  },
  errorText: {
    ...typography.small,
    color: tone("warning").fg,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
  },
  footer: {
    ...typography.micro,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  hint: {
    ...typography.micro,
    color: colors.mutedForeground,
    marginTop: -spacing.xs,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  searchIcon: {
    left: spacing.md,
    position: "absolute",
    top: 14,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: spacing["2xl"] + spacing.xs,
    paddingRight: spacing["2xl"] + spacing.xs,
  },
  sectionHeader: {
    gap: 2,
    marginTop: spacing.xs,
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    ...typography.micro,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  startLabel: {
    ...typography.small,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
  },
  startRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    justifyContent: "flex-end",
    marginTop: 2,
  },
});
