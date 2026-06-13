import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ArrowRight, Search, Users } from "lucide-react-native";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, Card, EmptyState, Input } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { displayEntityCategoryName } from "@/entities/entityCategoryUtils";
import { DataCollectionSessionService } from "@/forms/dataCollectionSession";
import { localDatabase } from "@/storage/localDatabase";
import type { MobileAssignment, MobileEntity } from "@/models/contracts";
import { colors, fontFamily, radii, spacing, type Tone, typography } from "@/theme";

const dataCollection = new DataCollectionSessionService(localDatabase);

const ACTIVE_ASSIGNMENT_STATUSES = new Set(["Assigned", "InProgress", "Overdue"]);

const STATUS_TONE: Record<MobileEntity["status"], Tone> = {
  Active: "success",
  Inactive: "neutral",
  Deceased: "neutral",
  Moved: "warning",
  Duplicate: "danger",
  Archived: "neutral",
};

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
    if (!settings.linkedToEntity || !matchesEntityCategory(entity, settings.entityType, settings.entityCategoryId)) continue;
    if (!settings.updatesExistingEntity && !settings.requiresExistingEntity) continue;
    seenForms.add(assignment.formId);
    const form = localDatabase.forms.list().find((f) => f.id === assignment.formId);
    results.push({ assignment, formName: form?.name ?? "Form" });
  }
  return results;
}

function displayEntityType(entity: MobileEntity): string {
  return displayEntityTypeValue(entity.entityType);
}

function displayEntityTypeValue(entityType: string): string {
  return displayEntityCategoryName(entityType, localDatabase.entityCategories.list());
}

function matchesEntityCategory(entity: MobileEntity, entityType: string | null, categoryId?: string | null): boolean {
  if (entityType && entity.entityType === entityType) return true;
  const category = categoryId
    ? localDatabase.entityCategories.list().find((item) => item.id === categoryId)
    : null;
  if (!category) return false;
  return entity.entityType === category.id || entity.entityType === category.slug || entity.entityType === category.name;
}

export default function BeneficiariesScreen() {
  const router = useRouter();
  const { refreshKey, isSyncing, syncWork, refresh } = useAppContext();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const beneficiaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = localDatabase.entities.list();
    return all.filter((entity) => {
      if (categoryFilter !== "all" && entity.entityType !== categoryFilter) return false;
      if (!q) return true;
      const village = entity.location.village ?? entity.location.community ?? entity.location.district ?? "";
      return [
        entity.entityUid,
        entity.name,
        entity.phone,
        entity.householdId,
        entity.nationalId,
        village,
        entity.entityType,
        ...Object.values(entity.profile ?? {}),
      ].some((value) => String(value ?? "").toLowerCase().includes(q));
    });
  }, [categoryFilter, search, refreshKey]);

  const categories = useMemo(() => {
    const values = new Set(localDatabase.entities.list().map((entity) => entity.entityType).filter(Boolean));
    return [...values].sort((a, b) => displayEntityTypeValue(a).localeCompare(displayEntityTypeValue(b)));
  }, [refreshKey]);

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
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncWork} tintColor={colors.primary} />}
      >
        <View style={{ gap: spacing.xs }}>
          <Text style={styles.headerTitle}>Entities</Text>
          <Text style={styles.headerSubtitle}>
            Search the entity records synced to this device, and continue data collection on any linked form.
          </Text>
        </View>

        <View style={styles.searchRow}>
          <Search size={18} color={colors.mutedForeground} style={styles.searchIcon} />
          <Input
            autoCapitalize="none"
            onChangeText={setSearch}
            placeholder="Search name, code, phone, household, or village"
            value={search}
            style={styles.searchInput}
          />
        </View>

        {categories.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <Pressable onPress={() => setCategoryFilter("all")}>
              <Badge label="All" tone={categoryFilter === "all" ? "success" : "neutral"} />
            </Pressable>
            {categories.map((category) => (
              <Pressable key={category} onPress={() => setCategoryFilter(category)}>
                <Badge label={displayEntityTypeValue(category)} tone={categoryFilter === category ? "success" : "neutral"} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {beneficiaries.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No assigned records on this device"
            description="Sync assigned work. If this remains empty, ask your supervisor to assign entities or use a registration form that creates new records."
          />
        ) : (
          beneficiaries.map((entity) => {
            const location = [
              entity.location.village,
              entity.location.community,
              entity.location.district,
            ].filter(Boolean).join(", ");
            const actions = entity.status === "Active" ? eligibleAssignmentsFor(entity) : [];
            const profileFields = categoryProfilePreview(entity);

            return (
              <Card key={entity.localId} padding="lg" style={{ gap: spacing.sm }}>
                <View style={styles.titleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{entity.name || "Unnamed record"}</Text>
                    <Text style={styles.meta}>
                      {entity.entityUid} · {displayEntityType(entity)}
                    </Text>
                  </View>
                  <Badge label={entity.status} tone={STATUS_TONE[entity.status] ?? "neutral"} />
                </View>

                <View style={{ gap: 2 }}>
                  {entity.phone ? <Text style={styles.meta}>Phone: {entity.phone}</Text> : null}
                  {entity.householdId ? <Text style={styles.meta}>Household: {entity.householdId}</Text> : null}
                  {location ? <Text style={styles.meta}>Location: {location}</Text> : null}
                  {profileFields.map(({ label, value }) => (
                    <Text key={label} style={styles.meta}>{label}: {value}</Text>
                  ))}
                  {entity.assignedFormIds.length > 0 ? (
                    <Text style={styles.meta}>{entity.assignedFormIds.length} assigned form(s)</Text>
                  ) : null}
                </View>

                {actions.length > 0 ? (
                  <View style={styles.actionsBlock}>
                    <Text style={styles.actionsLabel}>Continue data collection</Text>
                    {actions.map(({ assignment, formName }) => (
                      <Pressable
                        key={assignment.localId}
                        onPress={() => startDraft(entity, assignment)}
                        style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.85 : 1 }]}
                      >
                        <Text style={styles.actionLabel} numberOfLines={1}>{formName}</Text>
                        <View style={styles.actionStart}>
                          <Text style={styles.actionStartLabel}>Start</Text>
                          <ArrowRight size={14} color={colors.primaryForeground} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </Card>
            );
          })
        )}

        {beneficiaries.length > 0 ? (
          <Text style={styles.footer}>
            {beneficiaries.length} entity record(s) on this device
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function categoryProfilePreview(entity: MobileEntity): Array<{ label: string; value: string }> {
  const category = localDatabase.entityCategories.list().find(
    (item) => item.id === entity.entityType || item.slug === entity.entityType || item.name === entity.entityType,
  );
  if (!category) return [];
  return category.attributes
    .filter((attribute) => !["name", "phone", "phone_number", "household_id", "location"].includes(attribute.fieldKey))
    .map((attribute) => {
      const raw = entity.profile?.[attribute.fieldKey];
      return raw === undefined || raw === null || raw === "" ? null : { label: attribute.label, value: String(raw) };
    })
    .filter((item): item is { label: string; value: string } => Boolean(item))
    .slice(0, 3);
}

const styles = StyleSheet.create({
  actionLabel: {
    ...typography.small,
    color: colors.foreground,
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
  },
  actionRow: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
  },
  actionStart: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  actionStartLabel: {
    ...typography.small,
    color: colors.primaryForeground,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
  },
  actionsBlock: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  actionsLabel: {
    ...typography.micro,
    color: colors.mutedForeground,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  footer: {
    ...typography.micro,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  filterRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  headerSubtitle: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  headerTitle: {
    ...typography.display,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
  },
  meta: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  name: {
    ...typography.headingSm,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
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
  },
  searchRow: {
    justifyContent: "center",
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
});
