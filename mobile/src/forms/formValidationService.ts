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
      const parsed = new Date(String(value));
      if (Number.isNaN(parsed.getTime())) {
        addIssue("Enter a valid date.");
        return issues;
      }
      const allowsFuture = question.validationRules.some((rule) => rule.ruleType === "Custom" && rule.value === "allowFuture:true");
      if (!allowsFuture && parsed.getTime() > Date.now()) {
        addIssue("Date cannot be in the future.");
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
