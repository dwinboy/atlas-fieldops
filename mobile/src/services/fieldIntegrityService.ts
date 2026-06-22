import type {
  MobileAssignment,
  MobileCollectionIntegrity,
  MobileFormVersion,
  MobileIntegritySignal,
  MobileQuestion,
  MobileSubmission,
} from "@/models/contracts";

type SignalInput = Omit<MobileIntegritySignal, "createdAt">;

export class FieldIntegrityService {
  evaluate(
    draft: MobileSubmission,
    formVersion: MobileFormVersion,
    assignment: MobileAssignment | null,
    reviewedAt = new Date().toISOString(),
  ): MobileCollectionIntegrity {
    const questions = formVersion.sections.flatMap((section) => section.questions);
    const responses = new Map(draft.responses.map((response) => [response.questionId, response.value]));
    const questionValues = expandQuestionValues(questions, responses);
    const startedAtMs = new Date(draft.createdAt).getTime();
    const reviewedAtMs = new Date(reviewedAt).getTime();
    const durationSeconds = Number.isFinite(startedAtMs) && Number.isFinite(reviewedAtMs)
      ? Math.max(0, Math.round((reviewedAtMs - startedAtMs) / 1000))
      : 0;
    const expectedMinimumSeconds = this.expectedMinimumSeconds(questions);
    const gpsQuestionValues = questionValues.filter(({ question }) => question.type === "GPS" || question.qualityControls?.captureGps);
    const firstGps = gpsQuestionValues
      .map(({ value }) => value)
      .find((value) => typeof value === "object" && value !== null) as { accuracy?: unknown; latitude?: unknown; longitude?: unknown } | undefined;
    const gpsCaptured = Boolean(firstGps && Number.isFinite(Number(firstGps.latitude)) && Number.isFinite(Number(firstGps.longitude)));
    const gpsAccuracy = firstGps?.accuracy == null ? null : Number(firstGps.accuracy);
    const mediaQuestionValues = questionValues.filter(({ question }) => ["Photo", "Video", "Audio", "FileUpload", "Signature"].includes(question.type) || question.qualityControls?.photoEvidence);
    const requiredMediaCount = mediaQuestionValues.filter(({ question }) => question.required || question.qualityControls?.photoEvidence).length;
    const mediaEvidenceCount = mediaQuestionValues.filter(({ question, value }) => hasAnswer(value, question.type)).length;
    const signals: SignalInput[] = [];

    if (durationSeconds > 0 && durationSeconds < expectedMinimumSeconds) {
      signals.push({
        code: "INTERVIEW_TOO_FAST",
        severity: durationSeconds < Math.max(30, expectedMinimumSeconds * 0.45) ? "Critical" : "Warning",
        message: `This form was completed in ${formatDuration(durationSeconds)}, below the expected minimum of ${formatDuration(expectedMinimumSeconds)}.`,
        evidence: { durationSeconds, expectedMinimumSeconds },
      });
    }

    if (formVersion.entitySettings.requiresExistingEntity && !draft.entityId) {
      signals.push({
        code: "MISSING_REQUIRED_ENTITY",
        severity: "Critical",
        message: "This form requires an existing entity record, but the draft is not linked to one.",
        evidence: { requiresExistingEntity: true },
      });
    }

    const requiredGpsCount = gpsQuestionValues.filter(({ question }) => question.required || question.qualityControls?.captureGps).length;
    if (requiredGpsCount > 0 && !gpsCaptured) {
      signals.push({
        code: "GPS_REQUIRED_MISSING",
        severity: "Critical",
        message: "GPS is required for this form but was not captured.",
        evidence: { requiredGpsCount },
      });
    }

    if (gpsCaptured && gpsAccuracy !== null && Number.isFinite(gpsAccuracy) && gpsAccuracy > 50) {
      signals.push({
        code: "POOR_GPS_ACCURACY",
        severity: gpsAccuracy > 100 ? "Critical" : "Warning",
        message: `GPS accuracy is ${Math.round(gpsAccuracy)}m. Supervisors should verify this location if the record is important.`,
        evidence: { gpsAccuracy },
      });
    }

    if (assignment?.locationIds?.length && !gpsCaptured && gpsQuestionValues.length > 0) {
      signals.push({
        code: "ASSIGNED_LOCATION_NOT_VERIFIED",
        severity: "Warning",
        message: "The assignment has location restrictions, but the submission has no usable GPS evidence.",
        evidence: { locationIds: assignment.locationIds },
      });
    }

    for (const { question, value } of questionValues) {
      const questionMinimum = Number(question.qualityControls?.minimumSeconds ?? 0);
      if (Number.isFinite(questionMinimum) && questionMinimum > 0 && durationSeconds > 0 && durationSeconds < questionMinimum) {
        signals.push({
          code: "QUESTION_MINIMUM_DURATION_NOT_MET",
          severity: question.qualityControls?.integrityAction === "block_submission" ? "Critical" : "Warning",
          message: `${question.label} is configured with a minimum collection time of ${formatDuration(questionMinimum)}.`,
          evidence: { questionId: question.id, variableName: question.variableName, durationSeconds, questionMinimum },
        });
      }
      if (question.privacyControls?.consentRequired && !hasAnswer(value, question.type)) {
        signals.push({
          code: "CONSENT_REQUIRED_MISSING",
          severity: "Critical",
          message: `${question.label} requires consent before the record can be trusted.`,
          evidence: { questionId: question.id, variableName: question.variableName },
        });
      }
      if (question.beneficiaryMapping?.duplicateKey && hasAnswer(value, question.type)) {
        signals.push({
          code: "DUPLICATE_KEY_COLLECTED",
          severity: "Info",
          message: `${question.label} will be used by the web app to check for duplicate beneficiaries.`,
          evidence: { questionId: question.id, beneficiaryField: question.beneficiaryMapping.beneficiaryField ?? null },
        });
      }
    }

    if (requiredMediaCount > 0 && mediaEvidenceCount < requiredMediaCount) {
      signals.push({
        code: "REQUIRED_EVIDENCE_MISSING",
        severity: "Critical",
        message: `${requiredMediaCount - mediaEvidenceCount} required evidence answer(s) are missing.`,
        evidence: { requiredMediaCount, mediaEvidenceCount },
      });
    }

    const repeated = repeatedAnswerSignal(questionValues);
    if (repeated) {
      signals.push(repeated);
    }

    const stampedSignals = signals.map((signal) => ({ ...signal, createdAt: reviewedAt }));
    const score = Math.max(0, 100 - stampedSignals.reduce((total, signal) => total + (signal.severity === "Critical" ? 25 : signal.severity === "Warning" ? 10 : 3), 0));
    return {
      score,
      riskLevel: score < 60 ? "High" : score < 85 ? "Medium" : "Low",
      startedAt: draft.createdAt,
      reviewedAt,
      durationSeconds,
      expectedMinimumSeconds,
      gpsCaptured,
      gpsAccuracy: gpsAccuracy !== null && Number.isFinite(gpsAccuracy) ? gpsAccuracy : null,
      mediaEvidenceCount,
      requiredMediaCount,
      signals: stampedSignals,
    };
  }

  private expectedMinimumSeconds(questions: MobileQuestion[]): number {
    const visibleQuestionEstimate = Math.max(questions.length, 1);
    const repeatPenalty = questions.filter((question) => question.type === "RepeatGroup").length * 45;
    const mediaPenalty = questions.filter((question) => ["Photo", "Video", "Audio", "FileUpload", "Signature"].includes(question.type)).length * 20;
    const configuredMinimum = questions.reduce((max, question) => {
      const value = Number(question.qualityControls?.minimumSeconds ?? 0);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);
    return Math.max(60, configuredMinimum, visibleQuestionEstimate * 8 + repeatPenalty + mediaPenalty);
  }
}

function hasAnswer(value: unknown, questionType: MobileQuestion["type"]): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (questionType === "GPS" && typeof value === "object") {
    const gps = value as { latitude?: unknown; longitude?: unknown };
    return Number.isFinite(Number(gps.latitude)) && Number.isFinite(Number(gps.longitude));
  }
  if (["Photo", "Video", "Audio", "FileUpload", "Signature"].includes(questionType) && typeof value === "object") {
    const evidence = value as { reference?: unknown; uri?: unknown; localUri?: unknown };
    return String(evidence.reference ?? evidence.uri ?? evidence.localUri ?? "").trim().length > 0;
  }
  return true;
}

function repeatedAnswerSignal(questionValues: Array<{ question: MobileQuestion; value: unknown }>): SignalInput | null {
  const eligibleIds = new Set(
    questionValues
      .map(({ question }) => question)
      .filter((question) => ["Text", "LongText", "SingleSelect", "Dropdown"].includes(question.type))
      .map((question) => question.id),
  );
  const values = questionValues
    .filter(({ question }) => eligibleIds.has(question.id))
    .map(({ value }) => String(value ?? "").trim().toLowerCase())
    .filter((value) => value.length >= 2);
  if (values.length < 6) return null;
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const [answer, count] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? ["", 0];
  if (count / values.length < 0.7) return null;
  return {
    code: "REPEATED_ANSWER_PATTERN",
    severity: "Warning",
    message: "Many text/select answers are identical. Supervisor should verify this was not copied across questions.",
    evidence: { repeatedAnswer: answer, repeatedCount: count, checkedAnswers: values.length },
  };
}

function expandQuestionValues(
  questions: MobileQuestion[],
  responses: Map<string, unknown>,
): Array<{ question: MobileQuestion; value: unknown }> {
  const expanded: Array<{ question: MobileQuestion; value: unknown }> = [];

  for (const question of questions) {
    const value = responses.get(question.id);
    if (question.type !== "RepeatGroup") {
      expanded.push({ question, value });
      continue;
    }

    expanded.push({ question, value });
    const rows = Array.isArray(value) ? value.filter(isRecord) : [];
    const childQuestions = repeatGroupFields(question);
    for (const row of rows) {
      const rowResponses = new Map(Object.entries(row));
      expanded.push(...expandQuestionValues(childQuestions, rowResponses));
    }
  }

  return expanded;
}

function repeatGroupFields(question: MobileQuestion): MobileQuestion[] {
  const metadata = isRecord(question.defaultValue) ? question.defaultValue : {};
  const rawFields = Array.isArray(metadata.fields)
    ? metadata.fields
    : Array.isArray(metadata.questions)
      ? metadata.questions
      : Array.isArray(metadata.children)
        ? metadata.children
        : [];
  return rawFields.filter((field): field is MobileQuestion => isRecord(field) && typeof field.id === "string" && typeof field.type === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}
