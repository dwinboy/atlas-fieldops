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
import { localDatabase } from "@/storage/localDatabase";
import type { MobileFormSection, MobileQuestion } from "@/models/contracts";

const dataCollection = new DataCollectionSessionService(localDatabase);
const validationService = new FormValidationService();
const logicEngine = new LogicEngine();

export default function FormFillScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const router = useRouter();
  const { refresh } = useAppContext();

  const [refreshKey, setRefreshKey] = useState(0);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);

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
    () => (draft && formVersion && submitAttempted ? validationService.validate(formVersion, draft) : []),
    [draft, formVersion, submitAttempted, refreshKey],
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

  function handleSubmit() {
    setSubmitAttempted(true);
    if (!draftId) return;

    try {
      const result = dataCollection.submitDraft(draftId);
      if (!result.queued) {
        // Has validation errors — scroll to top so user sees them
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
            onPress={handleSubmit}
            style={{
              flex: 1,
              backgroundColor: "#12332b",
              borderRadius: 14,
              alignItems: "center",
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }}>
              Save & queue submission ✓
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
