import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ClipboardList, Folder, MapPin, BarChart3, ChevronRight } from "lucide-react-native";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, Card, EmptyState, Input } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { DataCollectionSessionService } from "@/forms/dataCollectionSession";
import { localDatabase } from "@/storage/localDatabase";
import type { MobileAssignment } from "@/models/contracts";
import { colors, fontFamily, spacing, typography } from "@/theme";

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
      Alert.alert(
        "Form not ready",
        "Sync assigned work. If this still appears, ask your supervisor to publish and assign the form again.",
      );
      return;
    }

    if (formVersion.entitySettings.requiresExistingEntity) {
      router.push(`/entity-select/${assignment.localId}`);
    } else {
      try {
        const result = dataCollection.startForm(assignment.localId, null);
        router.push(`/form-fill/${result.draft.localId}`);
      } catch (err) {
        Alert.alert(
          "Cannot start assignment",
          err instanceof Error ? err.message : "This assignment could not be opened. Sync assigned work and try again.",
        );
      }
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncWork} tintColor={colors.primary} />}
      >
        <Input
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder="Search assignments…"
          value={search}
        />

        {assignments.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No assigned work on this device"
            description="Ask your supervisor to assign a published project form, then pull down to sync."
          />
        ) : (
          assignments.map((assignment) => {
            const isReady = Boolean(assignment.formId && assignment.formVersionId);
            const label = assignmentEntityLabel(assignment);
            const progress = assignment.targetCount
              ? `${assignment.completedCount} / ${assignment.targetCount} ${pluralize(label)}`
              : `${assignment.completedCount} ${pluralize(label)} collected`;

            return (
              <Pressable key={assignment.localId} onPress={() => openAssignment(assignment)}>
                <Card padding="lg" tone={isReady ? "neutral" : "warning"} style={{ gap: spacing.xs }}>
                  <Text style={styles.formName}>{formName(assignment.formId)}</Text>
                  <View style={styles.metaRow}>
                    <Folder size={14} color={colors.mutedForeground} />
                    <Text style={styles.metaText}>{projectName(assignment.projectId)}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <BarChart3 size={14} color={colors.mutedForeground} />
                    <Text style={styles.metaText}>{progress}</Text>
                  </View>
                  {assignment.locationIds?.length > 0 ? (
                    <View style={styles.metaRow}>
                      <MapPin size={14} color={colors.mutedForeground} />
                      <Text style={styles.metaText}>{assignment.locationIds[0]}</Text>
                    </View>
                  ) : null}

                  <View style={styles.footerRow}>
                    <Badge label={isReady ? "Ready" : "Waiting for form"} tone={isReady ? "success" : "warning"} />
                    {isReady && (
                      <View style={styles.startRow}>
                        <Text style={styles.startLabel}>Tap to start</Text>
                        <ChevronRight size={16} color={colors.primary} />
                      </View>
                    )}
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}

        {assignments.length > 0 && (
          <Text style={styles.summary}>{assignments.length} assignment(s) • Pull down to sync latest work</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function assignmentEntityLabel(assignment: MobileAssignment): string {
  if (!assignment.formVersionId) return "record";
  const version = localDatabase.formVersions.list().find((v) => v.id === assignment.formVersionId);
  const settings = version?.entitySettings;
  const category = settings?.entityCategoryId
    ? localDatabase.entityCategories.list().find((item) => item.id === settings.entityCategoryId)
    : null;
  return category?.name ?? settings?.entityType ?? "record";
}

function pluralize(label: string): string {
  if (label.toLowerCase().endsWith("y")) return `${label.slice(0, -1)}ies`;
  if (label.toLowerCase().endsWith("s")) return label;
  return `${label}s`;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  formName: {
    ...typography.headingSm,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  metaText: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  startLabel: {
    ...typography.small,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  startRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  summary: {
    ...typography.small,
    color: colors.mutedForeground,
    textAlign: "center",
  },
});
