import type { MobileFormVersion, MobileQuestion, MobileSubmission } from "@/models/contracts";
import { LogicEngine } from "@/forms/logicEngine";

export type FormValidationIssue = {
  questionId: string;
  label: string;
  message: string;
  fixHint?: string;
  severity: "Error" | "Warning";
};

export class FormValidationService {
  validate(formVersion: MobileFormVersion, draft: MobileSubmission): FormValidationIssue[] {
    const responses = new Map(draft.responses.map((response) => [response.questionId, response.value]));
    const logicState = new LogicEngine().evaluate(formVersion, draft);
    const issues: FormValidationIssue[] = [];
    for (const section of formVersion.sections) {
      for (const question of section.questions) {
        const state = logicState[question.id];
        if (state?.visible === false) {
          continue;
        }
        const value = responses.get(question.id);
        const required = Boolean(state?.required);
        const missing = this.isMissing(value, question.type);
        if (required && missing) {
          issues.push({
            questionId: question.id,
            label: question.label,
            message: question.mobileControls?.blockedHelp ?? "This required question must be answered before submit.",
            fixHint: question.mobileControls?.blockedHelp
              ? "Follow the field guidance shown for this question. If the answer is not available, ask your supervisor how this form should handle it."
              : undefined,
            severity: "Error",
          });
          continue;
        }
        if (question.privacyControls?.consentRequired && missing) {
          issues.push({
            questionId: question.id,
            label: question.label,
            message: question.mobileControls?.blockedHelp ?? "Consent must be captured before this answer can be submitted.",
            fixHint: "Confirm consent with the respondent, then capture the configured consent answer. If consent is refused, follow the form instructions.",
            severity: "Error",
          });
          continue;
        }
        if (question.qualityControls?.captureGps && !this.hasUsableGps(draft)) {
          issues.push({
            questionId: question.id,
            label: question.label,
            message: question.mobileControls?.blockedHelp ?? "GPS evidence is required for this record.",
            fixHint: "Move to an open area, capture GPS on the GPS question, then review the record again.",
            severity: question.qualityControls.integrityAction === "block_submission" ? "Error" : "Warning",
          });
        }
        if (question.qualityControls?.photoEvidence && missing) {
          issues.push({
            questionId: question.id,
            label: question.label,
            message: question.mobileControls?.blockedHelp ?? "Photo evidence is expected for this question.",
            fixHint: "Capture the required photo or ask your supervisor whether this evidence can be returned later.",
            severity: question.qualityControls.integrityAction === "block_submission" ? "Error" : "Warning",
          });
        }
        if (missing) {
          continue;
        }
        issues.push(...this.validateValue(question, value));
      }
    }
    return issues;
  }

  validateRequired(formVersion: MobileFormVersion, draft: MobileSubmission): FormValidationIssue[] {
    return this.validate(formVersion, draft).filter((issue) => issue.message.includes("required"));
  }

  private isMissing(value: unknown, questionType: MobileQuestion["type"]): boolean {
    if (questionType === "RepeatGroup" || questionType === "Ranking" || questionType === "MultiSelect") {
      return !Array.isArray(value) || value.length === 0;
    }
    if (questionType === "Matrix") {
      return !value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0;
    }
    if (questionType === "Polygon") {
      if (!value || typeof value !== "object" || Array.isArray(value)) return true;
      const polygon = value as { type?: unknown; coordinates?: unknown };
      if (polygon.type !== "Polygon" || !Array.isArray(polygon.coordinates)) return true;
      const ring = polygon.coordinates[0];
      return !Array.isArray(ring) || ring.length < 4;
    }
    if (questionType === "Audio" || questionType === "FileUpload" || questionType === "Signature") {
      if (typeof value === "string") return value.trim().length === 0;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const reference = (value as { reference?: unknown; uri?: unknown; localUri?: unknown }).reference
          ?? (value as { uri?: unknown }).uri
          ?? (value as { localUri?: unknown }).localUri;
        return String(reference ?? "").trim().length === 0;
      }
    }
    return (
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "boolean" && questionType === "Consent" && value === false)
    );
  }

  private hasUsableGps(draft: MobileSubmission): boolean {
    if (draft.location?.latitude !== null && draft.location?.longitude !== null) {
      return true;
    }
    return draft.responses.some((response) => {
      const value = response.value;
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const candidate = value as { type?: unknown; latitude?: unknown; longitude?: unknown; coordinates?: unknown };
      if (candidate.type === "Polygon" && Array.isArray(candidate.coordinates)) {
        const ring = candidate.coordinates[0];
        const firstVertex = Array.isArray(ring) ? ring[0] : null;
        return (
          Array.isArray(firstVertex) &&
          Number.isFinite(Number(firstVertex[0])) &&
          Number.isFinite(Number(firstVertex[1]))
        );
      }
      return Number.isFinite(Number(candidate.latitude)) && Number.isFinite(Number(candidate.longitude));
    });
  }

  private validateValue(question: MobileQuestion, value: unknown): FormValidationIssue[] {
    const issues: FormValidationIssue[] = [];
    const addIssue = (message: string, severity: "Error" | "Warning" = "Error", fixHint?: string) => {
      issues.push({
        questionId: question.id,
        label: question.label,
        message: question.mobileControls?.blockedHelp ?? message,
        fixHint: question.mobileControls?.blockedHelp ? `${fixHint ?? ""} ${question.mobileControls.blockedHelp}`.trim() : fixHint,
        severity,
      });
    };

    if (["Number", "Decimal", "Currency"].includes(question.type)) {
      const numeric = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isFinite(numeric)) {
        addIssue("Enter a valid number.", "Error", "Use digits only. If the answer is unknown, choose a configured 'Don't know' option instead of typing text.");
        return issues;
      }
      if (hasCustomRule(question, "integerOnly:true") && !Number.isInteger(numeric)) {
        addIssue("Enter a whole number without decimals.", "Error", "Use a count such as 1, 2, or 10. Do not enter 1.5 for this question.");
      }
      for (const rule of question.validationRules) {
        if (rule.ruleType === "Min" && typeof rule.value === "number" && numeric < rule.value) {
          addIssue(rule.message || `Value must be at least ${rule.value}.`, rule.severity === "Warning" ? "Warning" : "Error", `Enter a value from ${rule.value} upward, or ask your supervisor if the form limit is wrong.`);
        }
        if (rule.ruleType === "Max" && typeof rule.value === "number" && numeric > rule.value) {
          addIssue(rule.message || `Value must be at most ${rule.value}.`, rule.severity === "Warning" ? "Warning" : "Error", `Enter a value of ${rule.value} or lower, or ask your supervisor if the limit should be changed.`);
        }
      }
    }

    if (question.type === "Date" || question.type === "DateTime") {
      const parsed = parseFieldDate(String(value), question.type);
      if (!parsed) {
        addIssue(question.type === "DateTime"
          ? "Enter a valid date and time using YYYY-MM-DD HH:MM, for example 2026-06-08 14:30."
          : "Enter a valid date using YYYY-MM-DD, for example 2026-06-08. You can type DD/MM/YYYY and the app will convert it.",
          "Error",
          question.type === "DateTime" ? "Use the date buttons when possible, or type 2026-06-08 14:30." : "Use the 'Use today' button when the date is today, or type the date as 2026-06-08.");
        return issues;
      }
      const blockFutureDates = hasCustomRule(question, "blockFutureDates:true");
      const blockPastDates = hasCustomRule(question, "blockPastDates:true");
      const minDate = customRuleDate(question, "minDate");
      const maxDate = customRuleDate(question, "maxDate");
      if (minDate && parsed.getTime() < minDate.getTime()) {
        addIssue(`Date must be on or after ${formatRuleDate(minDate)}.`, "Error", "Choose a date inside the allowed range for this question.");
      }
      if (maxDate && parsed.getTime() > maxDate.getTime()) {
        addIssue(`Date must be on or before ${formatRuleDate(maxDate)}.`, "Error", "Choose a date inside the allowed range for this question.");
      }
      if (blockFutureDates && parsed.getTime() > Date.now()) {
        addIssue("Date cannot be in the future.", "Error", "Enter the date when the event already happened. If this is meant to be a planned future date, ask your manager to allow future dates for this question.");
      }
      if (blockPastDates && parsed.toDateString() !== new Date().toDateString() && parsed.getTime() < Date.now()) {
        addIssue("Date cannot be in the past.", "Error", "Enter today or a future date, or ask your manager to change the date rule for this question.");
      }
    }

    if (question.type === "Time") {
      const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value).trim());
      if (!valid) {
        addIssue("Enter a valid 24-hour time using HH:MM, for example 14:30.", "Error", "Use the 'Use current time' button or type time like 09:15 or 16:45.");
      }
    }

    if (["Text", "LongText", "Barcode", "QRCode", "Consent"].includes(question.type)) {
      const text = String(value);
      for (const rule of question.validationRules) {
        if (rule.ruleType === "MinLength" && typeof rule.value === "number" && text.length < rule.value) {
          addIssue(rule.message || `Answer must have at least ${rule.value} characters.`, rule.severity === "Warning" ? "Warning" : "Error", "Add more detail so the reviewer can understand this answer.");
        }
        if (rule.ruleType === "MaxLength" && typeof rule.value === "number" && text.length > rule.value) {
          addIssue(rule.message || `Answer must have at most ${rule.value} characters.`, rule.severity === "Warning" ? "Warning" : "Error", "Shorten the answer or move long notes to a comments question if available.");
        }
        if (rule.ruleType === "Regex" && typeof rule.value === "string" && rule.value) {
          try {
            if (!new RegExp(rule.value).test(text)) {
              addIssue(rule.message || "Answer format is not valid.", rule.severity === "Warning" ? "Warning" : "Error", "Check spelling, spacing, symbols, and the required format shown by your supervisor.");
            }
          } catch {
            addIssue("This question has an invalid validation pattern. Sync the form again.", "Warning", "Pull down to sync assigned work. If it remains, ask your manager to fix the web form validation rule.");
          }
        }
      }
    }

    if (["SingleSelect", "Dropdown"].includes(question.type) && question.options.length) {
      const allowed = new Set(question.options.map((option) => option.value));
      if (!allowed.has(String(value))) {
        addIssue("Select one of the approved options.", "Error", "Clear the answer and choose one of the visible options. If the right option is missing, ask your manager to update the reference list.");
      }
    }

    if (question.type === "MultiSelect" && question.options.length) {
      const values = Array.isArray(value) ? value.map(String) : [String(value)];
      const allowed = new Set(question.options.map((option) => option.value));
      const invalid = values.filter((item) => !allowed.has(item));
      if (invalid.length) {
        addIssue("Remove choices that are not in the approved option list.", "Error", "Remove invalid choices and select only the options shown on the screen.");
      }
    }

    if (question.type === "Ranking" && question.options.length) {
      const values = Array.isArray(value) ? value.map(String) : [];
      const allowed = new Set(question.options.map((option) => option.value));
      const invalid = values.filter((item) => !allowed.has(item));
      const duplicates = values.filter((item, index) => values.indexOf(item) !== index);
      if (invalid.length) {
        addIssue("Ranking includes a choice that is not in the approved option list.", "Error", "Remove the invalid ranked item and select from the available choices.");
      }
      if (duplicates.length) {
        addIssue("Each ranked choice can only appear once.", "Error", "Remove duplicate ranked choices. Each option should appear once in the final order.");
      }
    }

    if (question.type === "RepeatGroup") {
      const rows = Array.isArray(value) ? value : [];
      const minRepeats = question.repeatSettings?.minRepeats ?? null;
      const maxRepeats = question.repeatSettings?.maxRepeats ?? null;
      if (minRepeats !== null && rows.length < minRepeats) {
        addIssue(`Add at least ${minRepeats} row(s).`, "Error", "Tap 'Add row' and complete one row for each repeated item required by the form.");
      }
      if (maxRepeats !== null && rows.length > maxRepeats) {
        addIssue(`Remove extra rows. Maximum allowed is ${maxRepeats}.`, "Error", "Remove extra rows or ask your supervisor to increase the repeat limit in the web form.");
      }
    }

    if (question.type === "Matrix") {
      const matrix = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
      if (question.required && Object.values(matrix).some((item) => Array.isArray(item) && item.length === 0)) {
        addIssue("Complete each matrix row before submitting.", "Error", "Review each row in the matrix and choose the required response.");
      }
    }

    if (question.type === "Polygon" && typeof value === "object" && value !== null && !Array.isArray(value)) {
      const polygon = value as { type?: unknown; coordinates?: unknown };
      const ring = polygon.type === "Polygon" && Array.isArray(polygon.coordinates) ? polygon.coordinates[0] : null;
      if (!Array.isArray(ring)) {
        addIssue("Draw a boundary on the map.", "Error", "Tap 'Draw boundary' and add at least 3 points, then tap 'Done' to close the shape.");
        return issues;
      }

      const minVerticesRule = question.validationRules.find((rule) => rule.ruleType === "Custom" && typeof rule.value === "string" && rule.value.startsWith("minVertices:"));
      const minVertices = typeof minVerticesRule?.value === "string" ? Number(minVerticesRule.value.replace("minVertices:", "")) : 3;
      const vertexCount = Math.max(0, ring.length - 1);
      if (Number.isFinite(minVertices) && vertexCount < minVertices) {
        addIssue(minVerticesRule?.message || `Draw a boundary with at least ${minVertices} points.`, minVerticesRule?.severity === "Warning" ? "Warning" : "Error", "Tap 'Edit boundary' and add more points before closing the shape.");
      }

      const requireClosedRule = question.validationRules.find((rule) => rule.ruleType === "Custom" && rule.value === "requireClosed:true");
      if (requireClosedRule) {
        const first = ring[0];
        const last = ring[ring.length - 1];
        const isClosed = Array.isArray(first) && Array.isArray(last) && first[0] === last[0] && first[1] === last[1];
        if (!isClosed) {
          addIssue(requireClosedRule.message || "The boundary must form a closed shape.", requireClosedRule.severity === "Warning" ? "Warning" : "Error", "Tap 'Edit boundary' and tap 'Done' to connect the last point back to the first.");
        }
      }
    }

    if (question.type === "GPS" && typeof value === "object" && value !== null) {
      const gps = value as { accuracy?: unknown; latitude?: unknown; longitude?: unknown };
      const latitude = Number(gps.latitude);
      const longitude = Number(gps.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        addIssue("Capture valid GPS coordinates.", "Error", "Tap capture GPS again, stay outside if possible, and wait until the phone reports a location.");
      }
      const accuracyRule = question.validationRules.find((rule) => rule.ruleType === "Custom" && typeof rule.value === "string" && rule.value.startsWith("accuracyMax:"));
      const accuracyValue = typeof accuracyRule?.value === "string" ? accuracyRule.value : null;
      const accuracyLimit = accuracyValue ? Number(accuracyValue.replace("accuracyMax:", "")) : null;
      const accuracy = Number(gps.accuracy);
      if (accuracyLimit !== null && Number.isFinite(accuracy) && accuracy > accuracyLimit) {
        addIssue(accuracyRule?.message || `GPS accuracy must be ${accuracyLimit} meters or better.`, "Error", "Move to an open area and recapture GPS. If the location is correct but accuracy remains poor, add a note if the form allows it.");
      }
    }

    return issues;
  }

  progress(formVersion: MobileFormVersion, draft: MobileSubmission): { answered: number; total: number; percent: number } {
    const responses = new Map(draft.responses.map((response) => [response.questionId, response.value]));
    const logicState = new LogicEngine().evaluate(formVersion, draft);
    let total = 0;
    let answered = 0;
    for (const section of formVersion.sections) {
      for (const question of section.questions) {
        const state = logicState[question.id];
        if (state?.visible === false) {
          continue;
        }
        total += 1;
        const value = responses.get(question.id);
        if (!this.isMissing(value, question.type)) {
          answered += 1;
        }
      }
    }
    return { answered, total, percent: total === 0 ? 0 : Math.round((answered / total) * 100) };
  }
}

function hasCustomRule(question: MobileQuestion, value: string): boolean {
  return question.validationRules.some((rule) => rule.ruleType === "Custom" && rule.value === value);
}

function customRuleDate(question: MobileQuestion, prefix: "minDate" | "maxDate"): Date | null {
  const rule = question.validationRules.find(
    (candidate) => candidate.ruleType === "Custom" && typeof candidate.value === "string" && candidate.value.startsWith(`${prefix}:`),
  );
  if (!rule || typeof rule.value !== "string") return null;
  return parseFieldDate(rule.value.slice(prefix.length + 1), "Date");
}

function formatRuleDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseFieldDate(value: string, questionType: MobileQuestion["type"]): Date | null {
  const raw = value.trim();
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return buildStrictDate(Number(year), Number(month), Number(day));
  }

  const dateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (dateTime && questionType === "DateTime") {
    const [, year, month, day, hour, minute] = dateTime;
    return buildStrictDate(Number(year), Number(month), Number(day), Number(hour), Number(minute));
  }

  const slashDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const [, first, second, year] = slashDate;
    return buildStrictDate(Number(year), Number(second), Number(first));
  }

  const dashDate = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashDate) {
    const [, first, second, year] = dashDate;
    return buildStrictDate(Number(year), Number(second), Number(first));
  }

  return null;
}

function buildStrictDate(year: number, month: number, day: number, hour = 0, minute = 0): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute
  ) {
    return null;
  }
  return parsed;
}
