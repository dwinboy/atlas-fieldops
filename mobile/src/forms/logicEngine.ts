import type { MobileFormVersion, MobileLogicRule, MobileQuestion, MobileSubmission } from "@/models/contracts";

export type QuestionLogicState = {
  visible: boolean;
  required: boolean;
  calculatedValue: unknown;
  skippedToQuestionId: string | null;
};

function compare(value: unknown, rule: MobileLogicRule): boolean {
  if (rule.operator === "IsEmpty") {
    return value === null || value === undefined || value === "";
  }
  if (rule.operator === "IsNotEmpty") {
    return value !== null && value !== undefined && value !== "";
  }
  if (rule.operator === "Equals") {
    return String(value) === String(rule.value);
  }
  if (rule.operator === "NotEquals") {
    return String(value) !== String(rule.value);
  }
  if (rule.operator === "Contains") {
    return Array.isArray(value) ? value.includes(rule.value) : String(value ?? "").includes(String(rule.value));
  }
  const numericValue = Number(value);
  const numericRule = Number(rule.value);
  if (!Number.isFinite(numericValue) || !Number.isFinite(numericRule)) {
    return false;
  }
  return rule.operator === "GreaterThan" ? numericValue > numericRule : numericValue < numericRule;
}

export class LogicEngine {
  evaluate(formVersion: MobileFormVersion, draft: MobileSubmission): Record<string, QuestionLogicState> {
    const responses = new Map(draft.responses.map((response) => [response.questionId, response.value]));
    const questions = formVersion.sections.flatMap((section) => section.questions);
    const state: Record<string, QuestionLogicState> = {};
    for (const question of questions) {
      state[question.id] = {
        visible: true,
        required: question.required,
        calculatedValue: null,
        skippedToQuestionId: null,
      };
    }
    for (const question of questions) {
      this.applyQuestionRules(question, responses, state);
    }
    return state;
  }

  private applyQuestionRules(question: MobileQuestion, responses: Map<string, unknown>, state: Record<string, QuestionLogicState>): void {
    for (const rule of question.logicRules) {
      const passes = compare(responses.get(rule.sourceQuestionId), rule);
      const targetId = rule.targetQuestionId ?? question.id;
      const target = state[targetId];
      if (!target) {
        continue;
      }
      if (rule.action === "ShowIf") {
        target.visible = passes;
      }
      if (rule.action === "HideIf" && passes) {
        target.visible = false;
      }
      if (rule.action === "RequiredIf" && passes) {
        target.required = true;
      }
      if (rule.action === "SkipTo" && passes) {
        state[question.id].skippedToQuestionId = rule.targetQuestionId;
      }
      if (rule.action === "Calculate" && passes) {
        target.calculatedValue = rule.value;
      }
    }
  }
}
