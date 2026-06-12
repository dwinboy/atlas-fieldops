import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Inbox, MapPin, User } from "lucide-react-native";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, Card, EmptyState } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { localDatabase } from "@/storage/localDatabase";
import type { MobileReviewStatus, MobileSubmission } from "@/models/contracts";
import { colors, fontFamily, radii, spacing, tone, type Tone, typography } from "@/theme";

type FilterTab = "all" | "draft" | "queued" | "failed" | "synced";

const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "queued", label: "Queued" },
  { key: "failed", label: "Failed" },
  { key: "synced", label: "Synced" },
];

export default function SubmissionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { refreshKey, isSyncing, syncQueue } = useAppContext();
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    const requestedFilter = normalizeFilter(params.filter);
    if (requestedFilter && requestedFilter !== filter) {
      setFilter(requestedFilter);
    }
  }, [params.filter, filter]);

  const submissions = useMemo(() => {
    const all = localDatabase.draftSubmissions.list().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    if (filter === "all") return all;
    if (filter === "draft") return all.filter((s) => s.status === "Draft" || s.status === "ReturnedForCorrection");
    if (filter === "queued") return all.filter((s) => s.status === "ReadyToSubmit" || s.status === "Queued");
    if (filter === "failed") return all.filter((s) => s.status === "Failed");
    if (filter === "synced") return all.filter((s) => s.status === "Synced");
    return all;
  }, [filter, refreshKey]);

  const counts = useMemo(() => {
    const all = localDatabase.draftSubmissions.list();
    return {
      draft: all.filter((s) => s.status === "Draft" || s.status === "ReturnedForCorrection").length,
      queued: all.filter((s) => s.status === "ReadyToSubmit" || s.status === "Queued").length,
      failed: all.filter((s) => s.status === "Failed").length,
      synced: all.filter((s) => s.status === "Synced").length,
    };
  }, [refreshKey]);

  function formName(formId: string) {
    return localDatabase.forms.list().find((f) => f.id === formId)?.name ?? "Unknown form";
  }

  function entityName(entityId: string | null) {
    if (!entityId) return null;
    const e = localDatabase.entities.list().find((en) => en.id === entityId);
    return e?.name ?? null;
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {FILTER_TABS.map(({ key, label }) => {
          const count = key === "all" ? undefined : counts[key as keyof typeof counts];
          const active = filter === key;
          return (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[styles.tab, active ? styles.tabActive : null]}
            >
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{label}</Text>
              {count !== undefined && count > 0 && (
                <View style={[styles.tabCount, active ? styles.tabCountActive : null]}>
                  <Text style={[styles.tabCountText, active ? styles.tabCountTextActive : null]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncQueue} tintColor={colors.primary} />}
      >
        {counts.failed > 0 && (
          <Pressable onPress={syncQueue}>
            <Card tone="warning" padding="md" style={styles.failedRow}>
              <AlertTriangle size={16} color={colors.warning} />
              <Text style={styles.failedText}>{counts.failed} submission(s) failed — tap to retry upload</Text>
            </Card>
          </Pressable>
        )}

        {submissions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No submissions here"
            description={filter === "all" ? "Open an assignment to start collecting." : `No ${filter} submissions.`}
          />
        ) : (
          submissions.map((s) => {
            const status = statusInfo(s);
            const review = s.status === "Synced" ? reviewStatusInfo(s.reviewStatus) : null;
            const isDraft = s.status === "Draft" || s.status === "ReturnedForCorrection";
            const entity = entityName(s.entityId);

            return (
              <Pressable key={s.localId} onPress={() => isDraft ? router.push(`/form-fill/${s.localId}`) : undefined}>
                <Card padding="lg" style={[styles.card, !isDraft ? styles.cardSynced : null]}>
                  <View style={styles.titleRow}>
                    <Text style={styles.formName} numberOfLines={2}>{formName(s.formId)}</Text>
                    <View style={styles.badgeStack}>
                      <Badge label={status.label} tone={status.tone} />
                      {review && <Badge label={review.label} tone={review.tone} />}
                    </View>
                  </View>

                  {entity && (
                    <View style={styles.metaRow}>
                      <User size={14} color={colors.mutedForeground} />
                      <Text style={styles.metaText}>{entity}</Text>
                    </View>
                  )}

                  {s.location?.latitude != null && (
                    <View style={styles.metaRow}>
                      <MapPin size={14} color={colors.mutedForeground} />
                      <Text style={styles.metaText}>
                        {s.location.latitude.toFixed(5)}, {s.location.longitude?.toFixed(5)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.footerRow}>
                    <Text style={styles.footerText}>
                      {s.responses.length} answer(s) · {formatDate(s.updatedAt)}
                    </Text>
                    {isDraft && (
                      <View style={styles.continueRow}>
                        <Text style={styles.continueLabel}>Continue</Text>
                        <ChevronRight size={14} color={colors.primary} />
                      </View>
                    )}
                  </View>

                  {s.status === "ReturnedForCorrection" && (
                    <View style={styles.returnedBanner}>
                      <Text style={styles.returnedText}>
                        {s.reviewComments
                          ? `Returned for correction: ${s.reviewComments}`
                          : "Returned for correction — tap to review and resubmit."}
                      </Text>
                    </View>
                  )}

                  {review && s.reviewComments && (
                    <View style={[styles.returnedBanner, { backgroundColor: tone(review.tone).bg }]}>
                      <Text style={[styles.returnedText, { color: tone(review.tone).fg }]}>
                        {review.label}: {s.reviewComments}
                      </Text>
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusInfo(s: MobileSubmission): { label: string; tone: Tone } {
  switch (s.status) {
    case "Draft": return { label: "Draft", tone: "neutral" };
    case "ReturnedForCorrection": return { label: "Returned", tone: "warning" };
    case "ReadyToSubmit":
    case "Queued": return { label: "Queued", tone: "info" };
    case "Failed": return { label: "Failed", tone: "danger" };
    case "Synced": return { label: "Synced", tone: "success" };
    default: return { label: s.status, tone: "neutral" };
  }
}

function reviewStatusInfo(reviewStatus: MobileReviewStatus | null): { label: string; tone: Tone } | null {
  switch (reviewStatus) {
    case "approved": return { label: "Approved", tone: "success" };
    case "under_review": return { label: "Under review", tone: "info" };
    case "returned": return { label: "Returned", tone: "warning" };
    case "pending_review": return { label: "Pending review", tone: "neutral" };
    default: return null;
  }
}

function normalizeFilter(value: string | undefined): FilterTab | null {
  if (!value) return null;
  return FILTER_TABS.some((tab) => tab.key === value) ? (value as FilterTab) : null;
}

const styles = StyleSheet.create({
  badgeStack: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  card: {
    gap: spacing.xs,
  },
  cardSynced: {
    opacity: 0.85,
  },
  content: {
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  continueLabel: {
    ...typography.small,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  continueRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  failedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  failedText: {
    ...typography.small,
    color: colors.foreground,
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    ...typography.micro,
    color: colors.mutedForeground,
  },
  formName: {
    ...typography.headingSm,
    color: colors.foreground,
    flex: 1,
    fontFamily: fontFamily.semibold,
    marginRight: spacing.sm,
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
  returnedBanner: {
    backgroundColor: tone("warning").bg,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  returnedText: {
    ...typography.small,
    color: tone("warning").fg,
    fontFamily: fontFamily.medium,
    fontWeight: "500",
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  tab: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabCount: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  tabCountActive: {
    backgroundColor: colors.primaryForeground,
  },
  tabCountText: {
    ...typography.micro,
    color: colors.primaryForeground,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  tabCountTextActive: {
    color: colors.primary,
  },
  tabLabel: {
    ...typography.small,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: colors.primaryForeground,
  },
  tabsContent: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  tabsScroll: {
    maxHeight: 56,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
