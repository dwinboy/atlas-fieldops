import { useMemo, useState } from "react";
import { FileText, User } from "lucide-react-native";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, Card, EmptyState, Input } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import type { MobileFormVersion } from "@/models/contracts";
import { localDatabase } from "@/storage/localDatabase";
import { colors, fontFamily, radii, spacing, tone, typography } from "@/theme";

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
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncWork} tintColor={colors.primary} />}
      >
        <Input
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder="Search forms…"
          value={search}
        />

        {forms.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No forms downloaded"
            description="Pull down to sync assigned forms from the web platform."
          />
        ) : (
          forms.map((form) => {
            const version = latestVersion(form.id);
            const isOfflineReady = !!version;
            const sections = sectionCount(form.id);
            const questions = questionCount(form.id);
            const readiness = version ? mobileReadiness(version) : null;
            const readinessTone = readiness?.tone === "warn" ? "warning" : isOfflineReady ? "success" : "neutral";
            const readinessTones = tone(readinessTone);

            return (
              <Card key={form.localId} padding="lg" style={{ gap: spacing.xs }}>
                <View style={styles.titleRow}>
                  <Text style={styles.formName} numberOfLines={2}>
                    {form.name ?? "Unnamed form"}
                  </Text>
                  <Badge label={readiness ? `${readiness.score}% ready` : "No version"} tone={readinessTone} />
                </View>

                {form.description ? (
                  <Text style={styles.description} numberOfLines={2}>{form.description}</Text>
                ) : null}

                <View style={styles.metaRow}>
                  {version && <Text style={styles.metaText}>Version {version.version}</Text>}
                  <Text style={styles.metaText}>
                    {sections} section(s) · {questions} question(s)
                  </Text>
                  <Text style={styles.metaText}>{versionCount(form.id)} version(s) stored</Text>
                </View>

                {version?.entitySettings.requiresExistingEntity && (
                  <View style={styles.requiresEntityRow}>
                    <User size={14} color={colors.mutedForeground} />
                    <Text style={styles.metaText}>Requires beneficiary selection</Text>
                  </View>
                )}

                {readiness ? (
                  <View style={[styles.readinessCard, { backgroundColor: readinessTones.bg, borderColor: readinessTones.border }]}>
                    <Text style={[styles.readinessTitle, { color: readinessTones.fg }]}>Field readiness</Text>
                    {readiness.notes.map((note) => (
                      <Text key={note} style={styles.readinessNote}>• {note}</Text>
                    ))}
                  </View>
                ) : null}

                <Text style={styles.footnote}>Read-only on mobile • Managed from web platform</Text>
              </Card>
            );
          })
        )}

        {forms.length > 0 && (
          <Text style={styles.summary}>{forms.length} form(s) on this device</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function mobileReadiness(version: MobileFormVersion | null): { score: number; tone: "ok" | "warn"; notes: string[] } {
  if (!version) return { score: 0, tone: "warn", notes: ["No published version is stored on this device."] };
  const questions = version.sections.flatMap((section) => section.questions);
  const gpsCount = questions.filter((question) => question.type === "GPS").length;
  const mediaCount = questions.filter((question) => ["Photo", "Video", "Audio", "FileUpload", "Signature"].includes(question.type)).length;
  const complexCount = questions.filter((question) => ["RepeatGroup", "Matrix", "Ranking", "CalculatedField"].includes(question.type)).length;
  const requiredCount = questions.filter((question) => question.required).length;
  const notes = [
    `${questions.length} question(s), ${requiredCount} required`,
    gpsCount ? `${gpsCount} GPS question(s): capture outside when possible` : "No GPS question required by this form",
    mediaCount ? `${mediaCount} evidence question(s): check camera/storage before field work` : "No media evidence question required",
    complexCount ? `${complexCount} advanced question(s): review before submit` : "Standard question flow",
  ];
  const score = version.offlineCompatible ? 100 : 85;
  return { score, tone: score >= 95 ? "ok" : "warn", notes };
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  description: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  footnote: {
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metaText: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  readinessCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 4,
    padding: spacing.sm,
  },
  readinessNote: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  readinessTitle: {
    ...typography.small,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  requiresEntityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  summary: {
    ...typography.small,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
