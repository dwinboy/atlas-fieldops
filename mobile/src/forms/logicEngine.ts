import { evaluateExpressionValue } from "@/forms/expressionEngine";
import type {
  MobileFormVersion,
  MobileLogicRule,
  MobileQuestion,
  MobileSubmission,
  MobileVisibilityRule,
} from "@/models/contracts";

/** The condition portion shared by logic rules and section relevance. */
type ConditionRule = Pick<MobileLogicRule, "sourceQuestionId" | "operator" | "value" | "conditions" | "match">;

export type QuestionLogicState = {
  visible: boolean;
  required: boolean;
  calculatedValue: unknown;
  skippedToQuestionId: string | null;
};

function compareValue(value: unknown, operator: MobileLogicRule["operator"], ruleValue: unknown): boolean {
  if (operator === "IsEmpty") {
    return isEmptyValue(value);
  }
  if (operator === "IsNotEmpty") {
    return !isEmptyValue(value);
  }
  if (operator === "Equals") {
    return String(value) === String(ruleValue);
  }
  if (operator === "NotEquals") {
    return String(value) !== String(ruleValue);
  }
  if (operator === "Contains" || operator === "NotContains") {
    const hit = Array.isArray(value)
      ? value.some((item) => String(item) === String(ruleValue))
      : String(value ?? "").toLowerCase().includes(String(ruleValue).toLowerCase());
    return operator === "Contains" ? hit : !hit;
  }
  if (operator === "StartsWith") {
    return String(value ?? "").toLowerCase().startsWith(String(ruleValue).toLowerCase());
  }
  if (operator === "In") {
    // The rule value is a comma-separated allow-list (e.g. "Kano,Lagos"); a multi-select answer
    // passes if any of its picks is in the list.
    const allowed = splitList(ruleValue);
    const picks = (Array.isArray(value) ? value : [value]).map((item) => String(item).trim());
    return picks.some((pick) => allowed.includes(pick));
  }
  if (operator === "Between") {
    // The rule value is "low,high"; inclusive on both ends.
    const [low, high] = splitList(ruleValue).map(Number);
    const numeric = Number(value);
    if (![low, high, numeric].every(Number.isFinite)) return false;
    return numeric >= low && numeric <= high;
  }
  const numericValue = Number(value);
  const numericRule = Number(ruleValue);
  if (!Number.isFinite(numericValue) || !Number.isFinite(numericRule)) {
    return false;
  }
  if (operator === "GreaterOrEqual") return numericValue >= numericRule;
  if (operator === "LessOrEqual") return numericValue <= numericRule;
  return operator === "GreaterThan" ? numericValue > numericRule : numericValue < numericRule;
}

/** Splits a comma-separated rule value (used by `In` / `Between`) into trimmed, non-empty parts. */
function splitList(ruleValue: unknown): string[] {
  return String(ruleValue ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Evaluates a rule's condition(s). Multi-condition rules combine by `match` (all = AND, any = OR);
 * single-condition rules use the top-level source/operator/value. */
function rulePasses(rule: ConditionRule, responses: Map<string, unknown>): boolean {
  if (rule.conditions && rule.conditions.length > 0) {
    const results = rule.conditions.map((condition) =>
      compareValue(responses.get(condition.sourceQuestionId), condition.operator, condition.value),
    );
    return rule.match === "any" ? results.some(Boolean) : results.every(Boolean);
  }
  return compareValue(responses.get(rule.sourceQuestionId), rule.operator, rule.value);
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0 || value.every((item) => isEmptyValue(item));
  }
  if (typeof value === "object") {
    const entries = Object.values(value);
    return entries.length === 0 || entries.every((entry) => isEmptyValue(entry));
  }
  return false;
}

/** Whether a section is shown given the current answers (keyed by question id). No rule = always shown. */
export function evaluateVisibility(
  rule: MobileVisibilityRule | null | undefined,
  responses: Map<string, unknown>,
): boolean {
  if (!rule) return true;
  return rulePasses(rule, responses);
}

export class LogicEngine {
  evaluate(formVersion: MobileFormVersion, draft: MobileSubmission): Record<string, QuestionLogicState> {
    const responses = new Map(draft.responses.map((response) => [response.questionId, response.value]));
    const questions = formVersion.sections.flatMap((section) => section.questions);
    return evaluateQuestionLogicStates(questions, responses);
  }
}

export function evaluateQuestionLogicStates(
  questions: MobileQuestion[],
  responses: Map<string, unknown>,
): Record<string, QuestionLogicState> {
    const variableValues = new Map<string, unknown>();
    for (const question of questions) {
      variableValues.set(question.variableName, responses.get(question.id));
    }
    const state: Record<string, QuestionLogicState> = {};
    for (const question of questions) {
      state[question.id] = {
        visible: question.type !== "Hidden",
        required: question.required,
        calculatedValue: null,
        skippedToQuestionId: null,
      };
    }
    for (const question of questions) {
      applyQuestionRules(question, responses, variableValues, state);
    }
    return state;
}

function applyQuestionRules(
  question: MobileQuestion,
  responses: Map<string, unknown>,
  variableValues: Map<string, unknown>,
  state: Record<string, QuestionLogicState>,
): void {
  for (const rule of question.logicRules) {
    const targetId = rule.targetQuestionId ?? question.id;
    const target = state[targetId];
    if (!target) {
      continue;
    }
    if (rule.action === "Calculate") {
      // Calculate rules recompute unconditionally — `operator`/`sourceQuestionId`
      // are placeholders from rule generation, not a visibility condition.
      target.calculatedValue = evaluateExpressionValue(String(rule.value ?? ""), variableValues);
      continue;
    }
    const passes = rulePasses(rule, responses);
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
  }
}
