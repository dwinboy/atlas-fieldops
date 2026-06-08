import type { MobileFormVersion, MobileQuestion, MobileSubmission } from "@/models/contracts";
import { LogicEngine } from "@/forms/logicEngine";

export type FormValidationIssue = {
  questionId: string;
  label: string;
  message: string;
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
            message: "This required question must be answered before submit.",
            severity: "Error",
          });
          continue;
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

  private validateValue(question: MobileQuestion, value: unknown): FormValidationIssue[] {
    const issues: FormValidationIssue[] = [];
    const addIssue = (message: string, severity: "Error" | "Warning" = "Error") => {
      issues.push({ questionId: question.id, label: question.label, message, severity });
    };

    if (["Number", "Decimal", "Currency"].includes(question.type)) {
      const numeric = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isFinite(numeric)) {
        addIssue("Enter a valid number.");
        return issues;
      }
      for (const rule of question.validationRules) {
        if (rule.ruleType === "Min" && typeof rule.value === "number" && numeric < rule.value) {
          addIssue(rule.message || `Value must be at least ${rule.value}.`, rule.severity === "Warning" ? "Warning" : "Error");
        }
        if (rule.ruleType === "Max" && typeof rule.value === "number" && numeric > rule.value) {
          addIssue(rule.message || `Value must be at most ${rule.value}.`, rule.severity === "Warning" ? "Warning" : "Error");
        }
      }
    }

    if (question.type === "Date" || question.type === "DateTime") {
      const parsed = parseFieldDate(String(value), question.type);
      if (!parsed) {
        addIssue(question.type === "DateTime"
          ? "Enter a valid date and time using YYYY-MM-DD HH:MM, for example 2026-06-08 14:30."
          : "Enter a valid date using YYYY-MM-DD, for example 2026-06-08. You can type DD/MM/YYYY and the app will convert it.");
        return issues;
      }
      const allowsFuture = question.validationRules.some((rule) => rule.ruleType === "Custom" && rule.value === "allowFuture:true");
      if (!allowsFuture && parsed.getTime() > Date.now()) {
        addIssue("Date cannot be in the future.");
      }
    }

    if (question.type === "Time") {
      const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value).trim());
      if (!valid) {
        addIssue("Enter a valid 24-hour time using HH:MM, for example 14:30.");
      }
    }

    if (["Text", "LongText", "Barcode", "QRCode", "Consent"].includes(question.type)) {
      const text = String(value);
      for (const rule of question.validationRules) {
        if (rule.ruleType === "MinLength" && typeof rule.value === "number" && text.length < rule.value) {
          addIssue(rule.message || `Answer must have at least ${rule.value} characters.`, rule.severity === "Warning" ? "Warning" : "Error");
        }
        if (rule.ruleType === "MaxLength" && typeof rule.value === "number" && text.length > rule.value) {
          addIssue(rule.message || `Answer must have at most ${rule.value} characters.`, rule.severity === "Warning" ? "Warning" : "Error");
        }
        if (rule.ruleType === "Regex" && typeof rule.value === "string" && rule.value) {
          try {
            if (!new RegExp(rule.value).test(text)) {
              addIssue(rule.message || "Answer format is not valid.", rule.severity === "Warning" ? "Warning" : "Error");
            }
          } catch {
            addIssue("This question has an invalid validation pattern. Sync the form again.", "Warning");
          }
        }
      }
    }

    if (["SingleSelect", "Dropdown"].includes(question.type) && question.options.length) {
      const allowed = new Set(question.options.map((option) => option.value));
      if (!allowed.has(String(value))) {
        addIssue("Select one of the approved options.");
      }
    }

    if (question.type === "MultiSelect" && question.options.length) {
      const values = Array.isArray(value) ? value.map(String) : [String(value)];
      const allowed = new Set(question.options.map((option) => option.value));
      const invalid = values.filter((item) => !allowed.has(item));
      if (invalid.length) {
        addIssue("Remove choices that are not in the approved option list.");
      }
    }

    if (question.type === "Ranking" && question.options.length) {
      const values = Array.isArray(value) ? value.map(String) : [];
      const allowed = new Set(question.options.map((option) => option.value));
      const invalid = values.filter((item) => !allowed.has(item));
      const duplicates = values.filter((item, index) => values.indexOf(item) !== index);
      if (invalid.length) {
        addIssue("Ranking includes a choice that is not in the approved option list.");
      }
      if (duplicates.length) {
        addIssue("Each ranked choice can only appear once.");
      }
    }

    if (question.type === "RepeatGroup") {
      const rows = Array.isArray(value) ? value : [];
      const minRepeats = question.repeatSettings?.minRepeats ?? null;
      const maxRepeats = question.repeatSettings?.maxRepeats ?? null;
      if (minRepeats !== null && rows.length < minRepeats) {
        addIssue(`Add at least ${minRepeats} row(s).`);
      }
      if (maxRepeats !== null && rows.length > maxRepeats) {
        addIssue(`Remove extra rows. Maximum allowed is ${maxRepeats}.`);
      }
    }

    if (question.type === "Matrix") {
      const matrix = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
      if (question.required && Object.values(matrix).some((item) => Array.isArray(item) && item.length === 0)) {
        addIssue("Complete each matrix row before submitting.");
      }
    }

    if (question.type === "GPS" && typeof value === "object" && value !== null) {
      const gps = value as { accuracy?: unknown; latitude?: unknown; longitude?: unknown };
      const latitude = Number(gps.latitude);
      const longitude = Number(gps.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        addIssue("Capture valid GPS coordinates.");
      }
      const accuracyRule = question.validationRules.find((rule) => rule.ruleType === "Custom" && typeof rule.value === "string" && rule.value.startsWith("accuracyMax:"));
      const accuracyValue = typeof accuracyRule?.value === "string" ? accuracyRule.value : null;
      const accuracyLimit = accuracyValue ? Number(accuracyValue.replace("accuracyMax:", "")) : null;
      const accuracy = Number(gps.accuracy);
      if (accuracyLimit !== null && Number.isFinite(accuracy) && accuracy > accuracyLimit) {
        addIssue(accuracyRule?.message || `GPS accuracy must be ${accuracyLimit} meters or better.`);
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
