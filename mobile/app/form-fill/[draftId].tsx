import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { QuestionRenderer } from "@/components/QuestionRenderer";
import { useAppContext } from "@/context/AppContext";
import { DataCollectionSessionService } from "@/forms/dataCollectionSession";
import { FormValidationService } from "@/forms/formValidationService";
import { LogicEngine } from "@/forms/logicEngine";
import type { FormValidationIssue } from "@/forms/formValidationService";
import { FieldIntegrityService } from "@/services/fieldIntegrityService";
import { localDatabase } from "@/storage/localDatabase";
import type { MobileCollectionIntegrity, MobileFormSection, MobileFormVersion, MobileQuestion, MobileSubmission } from "@/models/contracts";

const dataCollection = new DataCollectionSessionService(localDatabase);
const validationService = new FormValidationService();
const logicEngine = new LogicEngine();
const integrityService = new FieldIntegrityService();

export default function FormFillScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const router = useRouter();
  const { refresh } = useAppContext();

  const [refreshKey, setRefreshKey] = useState(0);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const draft = useMemo(
    () => localDatabase.draftSubmissions.get(draftId ?? ""),
    [draftId, refreshKey],
  );

  const form = useMemo(
    () => (draft ? localDatabase.forms.list().find((f) => f.id === draft.formId) : null),
    [draft],
  );

  const formVersion = useMemo(
    () => (draft ? localDatabase.formVersions.list().find((v) => v.id === draft.formVersionId) : null),
    [draft],
  );

  const logicState = useMemo(
    () => (draft && formVersion ? logicEngine.evaluate(formVersion, draft) : {}),
    [draft, formVersion, refreshKey],
  );

  const allIssues: FormValidationIssue[] = useMemo(
    () => (draft && formVersion && (submitAttempted || reviewMode) ? validationService.validate(formVersion, draft) : []),
    [draft, formVersion, submitAttempted, reviewMode, refreshKey],
  );

  const progress = useMemo(
    () => (draft && formVersion ? validationService.progress(formVersion, draft) : { answered: 0, total: 0, percent: 0 }),
    [draft, formVersion, refreshKey],
  );

  const sections: MobileFormSection[] = useMemo(
    () => (formVersion?.sections ?? []).slice().sort((a, b) => a.order - b.order),
    [formVersion],
  );

  const currentSection = sections[sectionIndex] ?? null;

  const currentQuestions: MobileQuestion[] = useMemo(
    () => (currentSection ? currentSection.questions.slice().sort((a, b) => a.order - b.order) : []),
    [currentSection],
  );

  const entityName = useMemo(() => {
    if (!draft?.entityId) return null;
    return localDatabase.entities.list().find((e) => e.id === draft.entityId)?.name ?? null;
  }, [draft]);

  const assignment = useMemo(
    () => (draft?.assignmentId ? localDatabase.assignments.list().find((item) => item.id === draft.assignmentId) ?? null : null),
    [draft],
  );

  const responseValue = useCallback(
    (questionId: string) => {
      if (!draft) return undefined;
      return draft.responses.find((r) => r.questionId === questionId)?.value;
    },
    [draft, refreshKey],
  );

  function handleAnswer(questionId: string, variableName: string, value: unknown) {
    if (!draftId) return;
    dataCollection.answerQuestion(draftId, questionId, variableName, value);
    setReviewMode(false);
    setRefreshKey((k) => k + 1);
  }

  function handleNext() {
    if (sectionIndex < sections.length - 1) {
      setSectionIndex((i) => i + 1);
    }
  }

  function handleBack() {
    if (sectionIndex > 0) {
      setSectionIndex((i) => i - 1);
    } else {
      router.back();
    }
  }

  function openReview() {
    setSubmitAttempted(true);
    setReviewMode(true);
  }

  function handleSubmit() {
    setSubmitAttempted(true);
    if (!draftId) return;

    try {
      const result = dataCollection.submitDraft(draftId);
      if (!result.queued) {
        const errors = result.issues.filter((issue) => issue.severity === "Error");
        const firstIssue = errors[0] ?? result.issues[0];
        if (firstIssue) {
          const targetSectionIndex = sections.findIndex((section) =>
            section.questions.some((question) => question.id === firstIssue.questionId),
          );
          if (targetSectionIndex >= 0) {
            setSectionIndex(targetSectionIndex);
            setReviewMode(false);
          }
        }
        Alert.alert(
          "Check required answers",
          errors.length > 0
            ? `${errors.length} question(s) need attention. I moved you to the first section with an issue.`
            : "Review the highlighted questions before submitting.",
        );
        return;
      }
      refresh();
      Alert.alert(
        "Submission queued",
        "Your record has been saved and queued for upload. Tap Sync in the Sync Center when internet is available.",
        [{ text: "Done", onPress: () => router.replace("/(tabs)/submissions") }],
      );
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not queue this submission.");
    }
  }

  function confirmDiscard() {
    Alert.alert(
      "Discard changes?",
      "Your draft is saved on this device. You can continue it later from the Submissions tab.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Save and exit", style: "default", onPress: () => router.back() },
      ],
    );
  }

  if (!draft || !form || !formVersion) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8", padding: 20 }}>
        <View style={{ backgroundColor: "#fff7ed", borderColor: "#fed7aa", borderRadius: 14, borderWidth: 1, padding: 16 }}>
          <Text style={{ color: "#9a3412", fontWeight: "800" }}>Form draft not found</Text>
          <Text style={{ color: "#9a3412", fontSize: 13, marginTop: 6 }}>
            Sync assigned work and start the assignment again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLastSection = sectionIndex === sections.length - 1;
  const sectionIssues = allIssues.filter((i) =>
    currentQuestions.some((q) => q.id === i.questionId),
  );
  const integrity = integrityService.evaluate(draft, formVersion, assignment);
  const reviewSummary = buildReviewSummary(draft, formVersion, progress, allIssues, entityName, integrity);

  if (reviewMode) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }}>
        <View style={{
          backgroundColor: "#12332b",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 16,
          gap: 8,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable onPress={() => setReviewMode(false)} style={{ padding: 4 }}>
              <Text style={{ color: "#d7efe7", fontWeight: "700", fontSize: 15 }}>‹ Back</Text>
            </Pressable>
            <Text style={{ color: "white", fontWeight: "800", fontSize: 15, flex: 1, textAlign: "center" }} numberOfLines={1}>
              Review submission
            </Text>
            <View style={{ width: 64 }} />
          </View>
          <Text style={{ color: "#d7efe7", fontSize: 12, textAlign: "center" }}>
            Saved on this device {formatRelativeSave(draft.updatedAt)}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 28 }}>
          <View style={reviewCard}>
            <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 16 }}>{form.name}</Text>
            <Text style={{ color: "#49635a", fontSize: 13, marginTop: 4 }}>
              Check this summary before saving the record to the sync queue.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <ReviewPill label="Complete" value={`${progress.percent}%`} tone={progress.percent >= 100 ? "ok" : "warn"} />
              <ReviewPill label="Answered" value={`${progress.answered}/${progress.total}`} tone="neutral" />
              <ReviewPill label="Errors" value={String(reviewSummary.errorCount)} tone={reviewSummary.errorCount ? "bad" : "ok"} />
              <ReviewPill label="Integrity" value={`${integrity.score}%`} tone={integrity.riskLevel === "High" ? "bad" : integrity.riskLevel === "Medium" ? "warn" : "ok"} />
            </View>
          </View>

          <View style={reviewCard}>
            <Text style={reviewTitle}>Field checks</Text>
            {reviewSummary.rows.map((row) => (
              <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 7, borderBottomColor: "#f0f5f3", borderBottomWidth: 1 }}>
                <Text style={{ color: "#49635a", flex: 1 }}>{row.label}</Text>
                <Text style={{ color: row.tone === "bad" ? "#b42318" : row.tone === "warn" ? "#9a3412" : "#12332b", fontWeight: "800", textAlign: "right", flex: 1 }}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          {allIssues.length > 0 ? (
            <View style={reviewCard}>
              <Text style={reviewTitle}>Questions needing attention</Text>
              {allIssues.map((issue) => (
                <Pressable
                  key={`${issue.questionId}-${issue.message}`}
                  onPress={() => {
                    const targetSectionIndex = sections.findIndex((section) =>
                      section.questions.some((question) => question.id === issue.questionId),
                    );
                    if (targetSectionIndex >= 0) setSectionIndex(targetSectionIndex);
                    setReviewMode(false);
                  }}
                  style={{
                    backgroundColor: issue.severity === "Error" ? "#fee2e2" : "#fff7ed",
                    borderRadius: 10,
                    padding: 10,
                    gap: 3,
                    marginTop: 8,
                  }}
                >
                  <Text style={{ color: issue.severity === "Error" ? "#b42318" : "#9a3412", fontWeight: "800" }}>{issue.label}</Text>
                  <Text style={{ color: issue.severity === "Error" ? "#7f1d1d" : "#9a3412", fontSize: 12 }}>{issue.message}</Text>
                  {issue.fixHint ? <Text style={{ color: "#49635a", fontSize: 12 }}>Fix: {issue.fixHint}</Text> : null}
                  <Text style={{ color: "#12332b", fontSize: 12, fontWeight: "700" }}>Tap to edit this answer →</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ ...reviewCard, backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}>
              <Text style={{ color: "#0f766e", fontWeight: "800" }}>Ready to queue</Text>
              <Text style={{ color: "#49635a", fontSize: 13, marginTop: 4 }}>
                This submission will stay safe on this device and upload when Sync is available.
              </Text>
            </View>
          )}

          <View style={reviewCard}>
            <Text style={reviewTitle}>Integrity signals for supervisor</Text>
            {integrity.signals.length === 0 ? (
              <Text style={{ color: "#49635a", fontSize: 13 }}>
                No unusual field-work signals detected. Supervisors will still review according to the project workflow.
              </Text>
            ) : (
              integrity.signals.map((signal) => (
                <View
                  key={signal.code}
                  style={{
                    backgroundColor: signal.severity === "Critical" ? "#fee2e2" : "#fff7ed",
                    borderRadius: 10,
                    gap: 3,
                    marginTop: 8,
                    padding: 10,
                  }}
                >
                  <Text style={{ color: signal.severity === "Critical" ? "#b42318" : "#9a3412", fontWeight: "800" }}>
                    {signal.severity}: {signal.code.replaceAll("_", " ")}
                  </Text>
                  <Text style={{ color: "#49635a", fontSize: 12 }}>{signal.message}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={{
          backgroundColor: "white",
          borderTopColor: "#dbe7e2",
          borderTopWidth: 1,
          flexDirection: "row",
          gap: 12,
          padding: 16,
          paddingBottom: 24,
        }}>
          <Pressable
            onPress={() => setReviewMode(false)}
            style={{
              flex: 1,
              backgroundColor: "white",
              borderColor: "#dbe7e2",
              borderRadius: 14,
              borderWidth: 1,
              alignItems: "center",
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "#12332b", fontWeight: "700" }}>Edit answers</Text>
          </Pressable>
          <Pressable
            disabled={reviewSummary.errorCount > 0}
            onPress={handleSubmit}
            style={{
              flex: 1,
              backgroundColor: reviewSummary.errorCount > 0 ? "#b0c5bc" : "#12332b",
              borderRadius: 14,
              alignItems: "center",
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }}>
              Queue for sync
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }}>
      {/* Header */}
      <View style={{
        backgroundColor: "#12332b",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        gap: 10,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={handleBack} style={{ padding: 4 }}>
            <Text style={{ color: "#d7efe7", fontWeight: "700", fontSize: 15 }}>‹ Back</Text>
          </Pressable>
          <Text style={{ color: "white", fontWeight: "800", fontSize: 15, flex: 1, textAlign: "center" }} numberOfLines={1}>
            {form.name}
          </Text>
          <Pressable onPress={confirmDiscard} style={{ padding: 4 }}>
            <Text style={{ color: "#d7efe7", fontWeight: "700", fontSize: 13 }}>Save & exit</Text>
          </Pressable>
        </View>

        {entityName && (
          <Text style={{ color: "#d7efe7", fontSize: 13, textAlign: "center" }}>
            👤 {entityName}
          </Text>
        )}

        <Text style={{ color: "#d7efe7", fontSize: 12, textAlign: "center" }}>
          Saved on this device {formatRelativeSave(draft.updatedAt)}
        </Text>

        {/* Progress bar */}
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#d7efe7", fontSize: 12 }}>
              Section {sectionIndex + 1} of {sections.length}
            </Text>
            <Text style={{ color: "#d7efe7", fontSize: 12 }}>
              {progress.percent}% complete
            </Text>
          </View>
          <View style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 4, height: 6 }}>
            <View style={{
              backgroundColor: "white",
              borderRadius: 4,
              height: 6,
              width: `${progress.percent}%`,
            }} />
          </View>
        </View>
      </View>

      {/* Section header */}
      {currentSection && (
        <View style={{
          backgroundColor: "#f0fdf4",
          borderBottomColor: "#dbe7e2",
          borderBottomWidth: 1,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
          <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 16 }}>
            {currentSection.title}
          </Text>
          {currentSection.description ? (
            <Text style={{ color: "#49635a", fontSize: 13, marginTop: 2 }}>
              {currentSection.description}
            </Text>
          ) : null}
        </View>
      )}

      {/* Section-level errors */}
      {submitAttempted && sectionIssues.filter((i) => i.severity === "Error").length > 0 && (
        <View style={{
          backgroundColor: "#fee2e2",
          borderColor: "#fca5a5",
          borderWidth: 1,
          marginHorizontal: 16,
          marginTop: 12,
          borderRadius: 12,
          padding: 12,
        }}>
          <Text style={{ color: "#b42318", fontWeight: "700" }}>
            {sectionIssues.filter((i) => i.severity === "Error").length} question(s) need attention before you can submit.
          </Text>
        </View>
      )}

      {/* Questions */}
      <ScrollView
        contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {currentQuestions.length === 0 ? (
          <View style={{
            alignItems: "center",
            paddingVertical: 40,
            gap: 8,
          }}>
            <Text style={{ fontSize: 36 }}>📋</Text>
            <Text style={{ color: "#49635a", fontWeight: "700" }}>No questions in this section</Text>
          </View>
        ) : (
          currentQuestions.map((q) => {
            const state = logicState[q.id];
            const visible = state?.visible !== false;
            return (
              <QuestionRenderer
                key={q.id}
                question={q}
                value={responseValue(q.id)}
                onAnswer={handleAnswer}
                issues={submitAttempted ? allIssues.filter((i) => i.questionId === q.id) : []}
                visible={visible}
              />
            );
          })
        )}
      </ScrollView>

      {/* Navigation footer */}
      <View style={{
        backgroundColor: "white",
        borderTopColor: "#dbe7e2",
        borderTopWidth: 1,
        flexDirection: "row",
        gap: 12,
        padding: 16,
        paddingBottom: 24,
      }}>
        {sectionIndex > 0 && (
          <Pressable
            onPress={() => setSectionIndex((i) => i - 1)}
            style={{
              flex: 1,
              backgroundColor: "white",
              borderColor: "#dbe7e2",
              borderRadius: 14,
              borderWidth: 1,
              alignItems: "center",
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "#12332b", fontWeight: "700" }}>‹ Previous</Text>
          </Pressable>
        )}

        {isLastSection ? (
          <Pressable
            onPress={openReview}
            style={{
              flex: 1,
              backgroundColor: "#12332b",
              borderRadius: 14,
              alignItems: "center",
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }}>
              Review submission ✓
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleNext}
            style={{
              flex: 1,
              backgroundColor: "#12332b",
              borderRadius: 14,
              alignItems: "center",
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>Next section ›</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function buildReviewSummary(
  draft: MobileSubmission,
  formVersion: MobileFormVersion,
  progress: { answered: number; total: number; percent: number },
  issues: FormValidationIssue[],
  entityName: string | null,
  integrity: MobileCollectionIntegrity,
) {
  const responses = new Map(draft.responses.map((response) => [response.questionId, response.value]));
  const questions = formVersion.sections.flatMap((section) => section.questions);
  const gpsQuestions = questions.filter((question) => question.type === "GPS");
  const mediaQuestions = questions.filter((question) => ["Photo", "Video", "Audio", "FileUpload", "Signature"].includes(question.type));
  const gpsCaptured = gpsQuestions.filter((question) => hasAnswer(responses.get(question.id), question.type)).length;
  const mediaCaptured = mediaQuestions.filter((question) => hasAnswer(responses.get(question.id), question.type)).length;
  const errorCount = issues.filter((issue) => issue.severity === "Error").length;
  const warningCount = issues.filter((issue) => issue.severity === "Warning").length;

  return {
    errorCount,
    rows: [
      {
        label: "Draft safety",
        value: `Saved ${formatRelativeSave(draft.updatedAt)}`,
        tone: "ok" as const,
      },
      {
        label: "Beneficiary link",
        value: entityName ?? (formVersion.entitySettings.requiresExistingEntity ? "Missing required beneficiary" : "Not required"),
        tone: formVersion.entitySettings.requiresExistingEntity && !entityName ? "bad" as const : "ok" as const,
      },
      {
        label: "Completion",
        value: `${progress.answered} of ${progress.total} questions answered`,
        tone: progress.percent >= 100 ? "ok" as const : "warn" as const,
      },
      {
        label: "GPS evidence",
        value: gpsQuestions.length ? `${gpsCaptured} of ${gpsQuestions.length} GPS answer(s)` : "Not required",
        tone: gpsQuestions.length && gpsCaptured < gpsQuestions.filter((question) => question.required).length ? "bad" as const : "ok" as const,
      },
      {
        label: "Media evidence",
        value: mediaQuestions.length ? `${mediaCaptured} of ${mediaQuestions.length} evidence answer(s)` : "Not required",
        tone: mediaQuestions.length && mediaCaptured < mediaQuestions.filter((question) => question.required).length ? "bad" as const : "ok" as const,
      },
      {
        label: "Validation",
        value: errorCount ? `${errorCount} error(s) to fix` : warningCount ? `${warningCount} warning(s)` : "No blocking issues",
        tone: errorCount ? "bad" as const : warningCount ? "warn" as const : "ok" as const,
      },
      {
        label: "Integrity score",
        value: `${integrity.score}% · ${integrity.riskLevel} risk`,
        tone: integrity.riskLevel === "High" ? "bad" as const : integrity.riskLevel === "Medium" ? "warn" as const : "ok" as const,
      },
    ],
  };
}

function hasAnswer(value: unknown, questionType: MobileQuestion["type"]): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (questionType === "GPS" && typeof value === "object") {
    const gps = value as { latitude?: unknown; longitude?: unknown };
    return Number.isFinite(Number(gps.latitude)) && Number.isFinite(Number(gps.longitude));
  }
  if (["Audio", "FileUpload", "Signature"].includes(questionType) && typeof value === "object") {
    const evidence = value as { reference?: unknown; uri?: unknown; localUri?: unknown };
    return String(evidence.reference ?? evidence.uri ?? evidence.localUri ?? "").trim().length > 0;
  }
  return true;
}

function formatRelativeSave(iso: string): string {
  const savedAt = new Date(iso).getTime();
  if (!Number.isFinite(savedAt)) return "recently";
  const seconds = Math.max(0, Math.round((Date.now() - savedAt) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function ReviewPill({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "bad" | "neutral" }) {
  const colors = {
    ok: { bg: "#d7efe7", text: "#0f766e" },
    warn: { bg: "#fff7ed", text: "#9a3412" },
    bad: { bg: "#fee2e2", text: "#b42318" },
    neutral: { bg: "#f0f5f3", text: "#49635a" },
  }[tone];
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 }}>
      <Text style={{ color: colors.text, fontSize: 11, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

const reviewCard = {
  backgroundColor: "white",
  borderColor: "#dbe7e2",
  borderRadius: 16,
  borderWidth: 1,
  padding: 14,
} as const;

const reviewTitle = {
  color: "#12332b",
  fontSize: 15,
  fontWeight: "800",
  marginBottom: 8,
} as const;
