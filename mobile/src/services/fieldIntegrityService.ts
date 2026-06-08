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
    const startedAtMs = new Date(draft.createdAt).getTime();
    const reviewedAtMs = new Date(reviewedAt).getTime();
    const durationSeconds = Number.isFinite(startedAtMs) && Number.isFinite(reviewedAtMs)
      ? Math.max(0, Math.round((reviewedAtMs - startedAtMs) / 1000))
      : 0;
    const expectedMinimumSeconds = this.expectedMinimumSeconds(questions);
    const gpsQuestions = questions.filter((question) => question.type === "GPS");
    const gpsValues = gpsQuestions.map((question) => responses.get(question.id)).filter(Boolean);
    const firstGps = gpsValues.find((value) => typeof value === "object" && value !== null) as { accuracy?: unknown; latitude?: unknown; longitude?: unknown } | undefined;
    const gpsCaptured = Boolean(firstGps && Number.isFinite(Number(firstGps.latitude)) && Number.isFinite(Number(firstGps.longitude)));
    const gpsAccuracy = firstGps?.accuracy == null ? null : Number(firstGps.accuracy);
    const mediaQuestions = questions.filter((question) => ["Photo", "Video", "Audio", "FileUpload", "Signature"].includes(question.type));
    const requiredMediaCount = mediaQuestions.filter((question) => question.required).length;
    const mediaEvidenceCount = mediaQuestions.filter((question) => hasAnswer(responses.get(question.id), question.type)).length;
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
        message: "This form requires an existing beneficiary, but the draft is not linked to one.",
        evidence: { requiresExistingEntity: true },
      });
    }

    const requiredGpsCount = gpsQuestions.filter((question) => question.required).length;
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

    if (assignment?.locationIds?.length && !gpsCaptured && gpsQuestions.length > 0) {
      signals.push({
        code: "ASSIGNED_LOCATION_NOT_VERIFIED",
        severity: "Warning",
        message: "The assignment has location restrictions, but the submission has no usable GPS evidence.",
        evidence: { locationIds: assignment.locationIds },
      });
    }

    if (requiredMediaCount > 0 && mediaEvidenceCount < requiredMediaCount) {
      signals.push({
        code: "REQUIRED_EVIDENCE_MISSING",
        severity: "Critical",
        message: `${requiredMediaCount - mediaEvidenceCount} required evidence answer(s) are missing.`,
        evidence: { requiredMediaCount, mediaEvidenceCount },
      });
    }

    const repeated = repeatedAnswerSignal(draft, questions);
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
    return Math.max(60, visibleQuestionEstimate * 8 + repeatPenalty + mediaPenalty);
  }
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

function repeatedAnswerSignal(draft: MobileSubmission, questions: MobileQuestion[]): SignalInput | null {
  const eligibleIds = new Set(
    questions
      .filter((question) => ["Text", "LongText", "SingleSelect", "Dropdown"].includes(question.type))
      .map((question) => question.id),
  );
  const values = draft.responses
    .filter((response) => eligibleIds.has(response.questionId))
    .map((response) => String(response.value ?? "").trim().toLowerCase())
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}
