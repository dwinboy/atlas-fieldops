import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Save,
  User,
} from "lucide-react-native";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, EmptyState } from "@/components/ui";
import { QuestionRenderer } from "@/components/QuestionRenderer";
import { useAppContext } from "@/context/AppContext";
import { describeEntityHierarchy, describeFormEntityWorkflow } from "@/entities/entityCategoryUtils";
import { DataCollectionSessionService } from "@/forms/dataCollectionSession";
import { FormValidationService } from "@/forms/formValidationService";
import { LogicEngine } from "@/forms/logicEngine";
import type { FormValidationIssue } from "@/forms/formValidationService";
import { FieldIntegrityService } from "@/services/fieldIntegrityService";
import { localDatabase } from "@/storage/localDatabase";
import { isCascadeBlocked, resolveQuestionOptions } from "@/forms/optionResolver";
import type { MobileCollectionIntegrity, MobileFormSection, MobileFormVersion, MobileQuestion, MobileReferenceList, MobileSubmission } from "@/models/contracts";
import { colors, fontFamily, radii, spacing, tone, type Tone, typography } from "@/theme";

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
    () =>
      draft && formVersion && (submitAttempted || reviewMode)
        ? [...validationService.validate(formVersion, draft, localDatabase.referenceLists.list()), ...dataCollection.evaluateRiskIssues(draft, formVersion)]
        : [],
    [draft, formVersion, submitAttempted, reviewMode, refreshKey],
  );

  const progress = useMemo(
    () => (draft && formVersion ? validationService.progress(formVersion, draft, localDatabase.referenceLists.list()) : { answered: 0, total: 0, percent: 0 }),
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

  const selectedEntity = useMemo(() => {
    if (!draft?.entityId) return null;
    return localDatabase.entities.list().find((e) => e.id === draft.entityId) ?? null;
  }, [draft, refreshKey]);

  const entityName = selectedEntity?.name ?? null;

  const entityHierarchy = useMemo(
    () => (selectedEntity ? describeEntityHierarchy(selectedEntity, localDatabase.entities.list()) : null),
    [refreshKey, selectedEntity],
  );
  const entityWorkflow = useMemo(
    () =>
      formVersion
        ? describeFormEntityWorkflow(formVersion.entitySettings, localDatabase.entityCategories.list())
        : null,
    [formVersion, refreshKey],
  );

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

  const referenceLists: MobileReferenceList[] = useMemo(
    () => localDatabase.referenceLists.list(),
    [refreshKey],
  );

  const allResponses = useMemo(
    () => new Map<string, unknown>((draft?.responses ?? []).map((r) => [r.questionId, r.value])),
    [draft, refreshKey],
  );

  const allQuestions: MobileQuestion[] = useMemo(
    () => (formVersion?.sections ?? []).flatMap((section) => section.questions),
    [formVersion],
  );

  useEffect(() => {
    if (!draftId || !draft) return;
    let didUpdate = false;
    for (const question of allQuestions) {
      if (question.type !== "CalculatedField" && String(question.type) !== "Calculated") continue;
      const calculated = logicState[question.id]?.calculatedValue ?? null;
      const current = draft.responses.find((r) => r.questionId === question.id)?.value;
      if (calculated === null) {
        if (!hasStoredAnswer(current, question.type)) continue;
        dataCollection.answerQuestion(draftId, question.id, question.variableName, null);
        didUpdate = true;
        continue;
      }
      if (calculated !== current) {
        dataCollection.answerQuestion(draftId, question.id, question.variableName, calculated);
        didUpdate = true;
      }
    }
    if (didUpdate) {
      setRefreshKey((k) => k + 1);
    }
  }, [draft, draftId, allQuestions, logicState]);

  function handleAnswer(questionId: string, variableName: string, value: unknown) {
    if (!draftId) return;
    let updated = dataCollection.answerQuestion(draftId, questionId, variableName, value);
    updated = clearInvalidatedCascades(updated, questionId);
    updated = clearHiddenLogicAnswers(updated);
    setReviewMode(false);
    setRefreshKey((k) => k + 1);
  }

  function clearInvalidatedCascades(draftState: MobileSubmission, changedQuestionId: string): MobileSubmission {
    if (!draftId) return draftState;
    let current = draftState;
    let queue = [changedQuestionId];

    while (queue.length > 0) {
      const nextQueue: string[] = [];
      const responses = new Map(current.responses.map((r) => [r.questionId, r.value]));

      for (const parentId of queue) {
        const children = allQuestions.filter((q) => q.cascadingParentQuestionId === parentId);
        for (const child of children) {
          const childValue = responses.get(child.id);
          if (!hasStoredAnswer(childValue, child.type)) continue;
          if (isCascadeBlocked(child, responses)) {
            current = dataCollection.answerQuestion(
              draftId,
              child.id,
              child.variableName,
              emptyValueForQuestion(child.type),
            );
            nextQueue.push(child.id);
            continue;
          }
          const validOptions = resolveQuestionOptions(child, responses, referenceLists);
          const validValues = new Set(validOptions.map((opt) => opt.value));
          const stillValid = Array.isArray(childValue)
            ? childValue.every((item) => validValues.has(String(item)))
            : validValues.has(String(childValue));
          if (!stillValid) {
            current = dataCollection.answerQuestion(
              draftId,
              child.id,
              child.variableName,
              emptyValueForQuestion(child.type),
            );
            nextQueue.push(child.id);
          }
        }
      }

      queue = nextQueue;
    }

    return current;
  }

  function clearHiddenLogicAnswers(draftState: MobileSubmission): MobileSubmission {
    if (!draftId || !formVersion) return draftState;
    let current = draftState;

    while (true) {
      const hiddenQuestion = allQuestions.find((question) => {
        if (question.type === "Hidden") return false;
        const state = logicEngine.evaluate(formVersion, current)[question.id];
        if (state?.visible !== false) return false;
        const response = current.responses.find((item) => item.questionId === question.id);
        return response !== undefined && hasStoredAnswer(response.value, question.type);
      });

      if (!hiddenQuestion) {
        return current;
      }

      current = dataCollection.answerQuestion(
        draftId,
        hiddenQuestion.id,
        hiddenQuestion.variableName,
        emptyValueForQuestion(hiddenQuestion.type),
      );
      current = clearInvalidatedCascades(current, hiddenQuestion.id);
    }
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
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <View style={{ padding: spacing.lg }}>
          <EmptyState
            icon={AlertTriangle}
            title="Form draft not found"
            description="Sync assigned work and start the assignment again."
          />
        </View>
      </SafeAreaView>
    );
  }

  const isLastSection = sectionIndex === sections.length - 1;
  const sectionIssues = allIssues.filter((i) =>
    currentQuestions.some((q) => q.id === i.questionId),
  );
  const integrity = integrityService.evaluate(draft, formVersion, assignment);
  const reviewSummary = buildReviewSummary(
    draft,
    formVersion,
    progress,
    allIssues,
    entityName,
    entityWorkflow,
    integrity,
    draft.linkedEntityIds.length,
    entityHierarchy?.summary ?? null,
  );

  if (reviewMode) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => setReviewMode(false)} style={styles.headerAction} hitSlop={8}>
              <ChevronLeft size={18} color={colors.primaryForeground} />
              <Text style={styles.headerActionLabel}>Back</Text>
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>Review submission</Text>
            <View style={{ width: 64 }} />
          </View>
          <Text style={styles.headerSubtitle}>Saved on this device {formatRelativeSave(draft.updatedAt)}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Card padding="lg">
            <Text style={styles.cardTitle}>{form.name}</Text>
            <Text style={styles.cardSubtitle}>
              Check this summary before saving the record to the sync queue.
            </Text>
            <View style={styles.pillRow}>
              <ReviewPill label="Complete" value={`${progress.percent}%`} pillTone={progress.percent >= 100 ? "ok" : "warn"} />
              <ReviewPill label="Answered" value={`${progress.answered}/${progress.total}`} pillTone="neutral" />
              <ReviewPill label="Errors" value={String(reviewSummary.errorCount)} pillTone={reviewSummary.errorCount ? "bad" : "ok"} />
              <ReviewPill label="Integrity" value={`${integrity.score}%`} pillTone={integrity.riskLevel === "High" ? "bad" : integrity.riskLevel === "Medium" ? "warn" : "ok"} />
            </View>
          </Card>

          <Card padding="lg">
            <Text style={[styles.cardTitle, { marginBottom: spacing.sm }]}>Field checks</Text>
            {reviewSummary.rows.map((row, index) => (
              <View key={row.label} style={[styles.checkRow, index === reviewSummary.rows.length - 1 ? styles.checkRowLast : null]}>
                <Text style={styles.checkLabel}>{row.label}</Text>
                <Text style={[styles.checkValue, { color: pillToneColor(row.tone) }]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </Card>

          {allIssues.length > 0 ? (
            <Card padding="lg" style={{ gap: spacing.sm }}>
              <Text style={styles.cardTitle}>Questions needing attention</Text>
              {allIssues.map((issue) => {
                const issueTone = tone(issue.severity === "Error" ? "danger" : "warning");
                return (
                  <Pressable
                    key={`${issue.questionId}-${issue.message}`}
                    onPress={() => {
                      const targetSectionIndex = sections.findIndex((section) =>
                        section.questions.some((question) => question.id === issue.questionId),
                      );
                      if (targetSectionIndex >= 0) setSectionIndex(targetSectionIndex);
                      setReviewMode(false);
                    }}
                    style={[styles.issueRow, { backgroundColor: issueTone.bg }]}
                  >
                    <Text style={[styles.issueTitle, { color: issueTone.fg }]}>{issue.label}</Text>
                    <Text style={[styles.issueMessage, { color: issueTone.fg }]}>{issue.message}</Text>
                    {issue.fixHint ? <Text style={styles.issueHint}>Fix: {issue.fixHint}</Text> : null}
                    <View style={styles.issueLinkRow}>
                      <Text style={styles.issueLink}>Tap to edit this answer</Text>
                      <ChevronRight size={14} color={colors.primary} />
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          ) : (
            <Card tone="success" padding="lg" style={styles.readyCard}>
              <CircleCheck size={20} color={tone("success").fg} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.cardTitle, { color: tone("success").fg }]}>Ready to queue</Text>
                <Text style={styles.cardSubtitle}>
                  This submission will stay safe on this device and upload when Sync is available.
                </Text>
              </View>
            </Card>
          )}

          <Card padding="lg" style={{ gap: spacing.sm }}>
            <Text style={styles.cardTitle}>Integrity signals for supervisor</Text>
            {integrity.signals.length === 0 ? (
              <Text style={styles.cardSubtitle}>
                No unusual field-work signals detected. Supervisors will still review according to the project workflow.
              </Text>
            ) : (
              integrity.signals.map((signal) => {
                const signalTone = tone(signal.severity === "Critical" ? "danger" : "warning");
                return (
                  <View key={signal.code} style={[styles.signalRow, { backgroundColor: signalTone.bg }]}>
                    <Text style={[styles.issueTitle, { color: signalTone.fg }]}>
                      {signal.severity}: {signal.code.replaceAll("_", " ")}
                    </Text>
                    <Text style={[styles.issueMessage, { color: signalTone.fg }]}>{signal.message}</Text>
                  </View>
                );
              })
            )}
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <Button variant="secondary" onPress={() => setReviewMode(false)} style={{ flex: 1 }}>
            Edit answers
          </Button>
          <Button
            variant="primary"
            disabled={reviewSummary.errorCount > 0}
            onPress={handleSubmit}
            rightIcon={<CircleCheck size={18} color={colors.primaryForeground} />}
            style={{ flex: 1 }}
          >
            Queue for sync
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={handleBack} style={styles.headerAction} hitSlop={8}>
            <ChevronLeft size={18} color={colors.primaryForeground} />
            <Text style={styles.headerActionLabel}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{form.name}</Text>
          <Pressable onPress={confirmDiscard} style={styles.headerAction} hitSlop={8}>
            <Save size={16} color={colors.primaryForeground} />
            <Text style={styles.headerActionLabel}>Save & exit</Text>
          </Pressable>
        </View>

        {entityName ? (
          <View style={styles.entityRow}>
            <User size={14} color={colors.primaryForeground} />
            <Text style={styles.headerSubtitle}>{entityName}</Text>
          </View>
        ) : null}
        {entityHierarchy?.summary ? (
          <Text style={styles.headerSubtitle}>Linked context: {entityHierarchy.summary}</Text>
        ) : null}
        {entityWorkflow ? (
          <Text style={styles.headerSubtitle}>
            {draft.entityId
              ? `Linked ${entityWorkflow.label.toLowerCase()} selected for this submission.`
              : entityWorkflow.helperText}
          </Text>
        ) : null}

        <Text style={styles.headerSubtitle}>Saved on this device {formatRelativeSave(draft.updatedAt)}</Text>

        <View style={{ gap: spacing.xs }}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.headerSubtitle}>
              Section {sectionIndex + 1} of {sections.length}
            </Text>
            <Text style={styles.headerSubtitle}>
              {progress.percent}% complete
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
          </View>
        </View>
      </View>

      {currentSection ? (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{currentSection.title}</Text>
          {currentSection.description ? (
            <Text style={styles.sectionDescription}>{currentSection.description}</Text>
          ) : null}
        </View>
      ) : null}

      {submitAttempted && sectionIssues.filter((i) => i.severity === "Error").length > 0 ? (
        <Card tone="danger" padding="md" style={styles.sectionErrorCard}>
          <AlertTriangle size={16} color={tone("danger").fg} />
          <Text style={[styles.sectionErrorText, { color: tone("danger").fg }]}>
            {sectionIssues.filter((i) => i.severity === "Error").length} question(s) need attention before you can submit.
          </Text>
        </Card>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {currentQuestions.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No questions in this section" />
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
                allResponses={allResponses}
                referenceLists={referenceLists}
              />
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        {sectionIndex > 0 ? (
          <Button
            variant="secondary"
            leftIcon={<ChevronLeft size={18} color={colors.foreground} />}
            onPress={() => setSectionIndex((i) => i - 1)}
            style={{ flex: 1 }}
          >
            Previous
          </Button>
        ) : null}

        {isLastSection ? (
          <Button
            variant="primary"
            rightIcon={<CircleCheck size={18} color={colors.primaryForeground} />}
            onPress={openReview}
            style={{ flex: 1 }}
          >
            Review submission
          </Button>
        ) : (
          <Button
            variant="primary"
            rightIcon={<ChevronRight size={18} color={colors.primaryForeground} />}
            onPress={handleNext}
            style={{ flex: 1 }}
          >
            Next section
          </Button>
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
  entityWorkflow: ReturnType<typeof describeFormEntityWorkflow> | null,
  integrity: MobileCollectionIntegrity,
  linkedEntityCount: number,
  entityHierarchySummary: string | null,
) {
  const responses = new Map(draft.responses.map((response) => [response.questionId, response.value]));
  const questions = formVersion.sections.flatMap((section) => section.questions);
  const questionValues = expandQuestionValues(questions, responses);
  const gpsQuestions = questionValues.filter(({ question }) => question.type === "GPS" || question.qualityControls?.captureGps);
  const mediaQuestions = questionValues.filter(({ question }) => ["Photo", "Video", "Audio", "FileUpload", "Signature"].includes(question.type) || question.qualityControls?.photoEvidence);
  const gpsCaptured = gpsQuestions.filter(({ question, value }) => hasAnswer(value, question.type)).length;
  const mediaCaptured = mediaQuestions.filter(({ question, value }) => hasAnswer(value, question.type)).length;
  const requiredGps = gpsQuestions.filter(({ question }) => question.required || question.qualityControls?.captureGps).length;
  const requiredMedia = mediaQuestions.filter(({ question }) => question.required || question.qualityControls?.photoEvidence).length;
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
        label: "Entity link",
        value: entityName
          ? entityName
          : entityWorkflow?.needsEntityPicker && !entityWorkflow.allowsCreateWithoutSelection
            ? `Missing required ${entityWorkflow.label.toLowerCase()}`
            : entityWorkflow?.allowsCreateWithoutSelection
              ? entityWorkflow.needsEntityPicker
                ? `No existing ${entityWorkflow.label.toLowerCase()} selected — new record will be created`
                : `New ${entityWorkflow.label.toLowerCase()} record will be created from this submission`
              : "No tracked record required",
        tone:
          entityWorkflow?.needsEntityPicker && !entityWorkflow.allowsCreateWithoutSelection && !entityName
            ? "bad" as const
            : entityName
              ? "ok" as const
              : "neutral" as const,
      },
      {
        label: "Linked context",
        value: entityHierarchySummary
          ? entityHierarchySummary
          : linkedEntityCount > 0
            ? `${linkedEntityCount} related record(s)`
            : "None",
        tone: "neutral" as const,
      },
      {
        label: "Completion",
        value: `${progress.answered} of ${progress.total} questions answered`,
        tone: progress.percent >= 100 ? "ok" as const : "warn" as const,
      },
      {
        label: "GPS evidence",
        value: gpsQuestions.length ? `${gpsCaptured} of ${gpsQuestions.length} GPS answer(s)` : "Not required",
        tone: gpsQuestions.length > 0 && gpsCaptured < requiredGps ? "bad" as const : "ok" as const,
      },
      {
        label: "Media evidence",
        value: mediaQuestions.length ? `${mediaCaptured} of ${mediaQuestions.length} evidence answer(s)` : "Not required",
        tone: mediaQuestions.length > 0 && mediaCaptured < requiredMedia ? "bad" as const : "ok" as const,
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
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (questionType === "GPS" && typeof value === "object") {
    const gps = value as { latitude?: unknown; longitude?: unknown };
    return Number.isFinite(Number(gps.latitude)) && Number.isFinite(Number(gps.longitude));
  }
  if (questionType === "Matrix") {
    return hasMeaningfulMatrixAnswers(value);
  }
  if (["Photo", "Video", "Audio", "FileUpload", "Signature"].includes(questionType) && typeof value === "object") {
    const evidence = value as { reference?: unknown; uri?: unknown; localUri?: unknown };
    return String(evidence.reference ?? evidence.uri ?? evidence.localUri ?? "").trim().length > 0;
  }
  return true;
}

function hasStoredAnswer(value: unknown, questionType: MobileQuestion["type"]): boolean {
  if (questionType === "Matrix") {
    return value !== null && value !== undefined && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0;
  }
  if (questionType === "Consent") {
    return value === true || value === false;
  }
  return hasAnswer(value, questionType);
}

function emptyValueForQuestion(questionType: MobileQuestion["type"]): unknown {
  switch (questionType) {
    case "MultiSelect":
    case "Ranking":
    case "RepeatGroup":
      return [];
    case "Matrix":
      return {};
    case "Consent":
    case "GPS":
    case "Photo":
    case "Audio":
    case "Video":
    case "FileUpload":
    case "Signature":
    case "Barcode":
    case "QRCode":
    case "CalculatedField":
    case "Polygon":
      return null;
    default:
      return "";
  }
}

function hasMeaningfulMatrixAnswers(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).some((item) => {
    if (item === null || item === undefined || item === "") {
      return false;
    }
    if (Array.isArray(item)) {
      return item.length > 0;
    }
    return true;
  });
}

function expandQuestionValues(
  questions: MobileQuestion[],
  responses: Map<string, unknown>,
): Array<{ question: MobileQuestion; value: unknown }> {
  const expanded: Array<{ question: MobileQuestion; value: unknown }> = [];

  for (const question of questions) {
    const value = responses.get(question.id);
    expanded.push({ question, value });
    if (question.type !== "RepeatGroup") {
      continue;
    }
    const rows = Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null && !Array.isArray(row)) : [];
    const children = repeatGroupFields(question);
    for (const row of rows) {
      expanded.push(...expandQuestionValues(children, new Map(Object.entries(row))));
    }
  }

  return expanded;
}

function repeatGroupFields(question: MobileQuestion): MobileQuestion[] {
  if (Array.isArray(question.defaultValue) && question.defaultValue.length > 0) {
    return question.defaultValue.filter(
      (field): field is MobileQuestion =>
        typeof field === "object" && field !== null && !Array.isArray(field) && typeof field.id === "string" && typeof field.type === "string",
    );
  }
  const metadata =
    question.defaultValue && typeof question.defaultValue === "object" && !Array.isArray(question.defaultValue)
      ? question.defaultValue as Record<string, unknown>
      : {};
  const rawFields =
    Array.isArray(metadata.fields) ? metadata.fields
      : Array.isArray(metadata.questions) ? metadata.questions
        : Array.isArray(metadata.children) ? metadata.children
          : [];
  return rawFields.filter((field): field is MobileQuestion => typeof field === "object" && field !== null && !Array.isArray(field) && typeof field.id === "string" && typeof field.type === "string");
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

type PillTone = "ok" | "warn" | "bad" | "neutral";

function pillToneToTone(value: PillTone): Tone {
  switch (value) {
    case "ok": return "success";
    case "warn": return "warning";
    case "bad": return "danger";
    default: return "neutral";
  }
}

function pillToneColor(value: PillTone): string {
  return tone(pillToneToTone(value)).fg;
}

function ReviewPill({ label, value, pillTone }: { label: string; value: string; pillTone: PillTone }) {
  const t = tone(pillToneToTone(pillTone));
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.pillLabel, { color: t.fg }]}>{label}</Text>
      <Text style={[styles.pillValue, { color: t.fg }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardSubtitle: {
    ...typography.small,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  cardTitle: {
    ...typography.headingSm,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
  },
  checkLabel: {
    ...typography.small,
    color: colors.mutedForeground,
    flex: 1,
  },
  checkRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  checkRowLast: {
    borderBottomWidth: 0,
  },
  checkValue: {
    ...typography.small,
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
    textAlign: "right",
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  entityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
  },
  footer: {
    backgroundColor: colors.panel,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing["2xl"],
  },
  header: {
    backgroundColor: colors.primary,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  headerActionLabel: {
    ...typography.small,
    color: colors.primaryForeground,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerSubtitle: {
    ...typography.micro,
    color: colors.primaryForeground,
    opacity: 0.85,
    textAlign: "center",
  },
  headerTitle: {
    ...typography.headingSm,
    color: colors.primaryForeground,
    flex: 1,
    textAlign: "center",
  },
  issueHint: {
    ...typography.micro,
    color: colors.mutedForeground,
  },
  issueLink: {
    ...typography.micro,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
  },
  issueLinkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    marginTop: 4,
  },
  issueMessage: {
    ...typography.micro,
  },
  issueRow: {
    borderRadius: radii.lg,
    gap: 2,
    padding: spacing.md,
  },
  issueTitle: {
    ...typography.small,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
  },
  pill: {
    borderRadius: radii.lg,
    minWidth: 80,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillLabel: {
    ...typography.micro,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pillValue: {
    ...typography.headingSm,
    fontFamily: fontFamily.semibold,
    marginTop: 2,
  },
  progressFill: {
    backgroundColor: colors.primaryForeground,
    borderRadius: radii.sm,
    height: 6,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: radii.sm,
    height: 6,
  },
  readyCard: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionDescription: {
    ...typography.small,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  sectionErrorCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionErrorText: {
    ...typography.small,
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
  },
  sectionHeader: {
    backgroundColor: colors.muted,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.headingSm,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
  },
  signalRow: {
    borderRadius: radii.lg,
    gap: 2,
    padding: spacing.md,
  },
});
