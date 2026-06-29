// Powers the in-builder "Preview & test" simulator: it evaluates a form's relevance (show/hide),
// section visibility, calculations, answer piping, and required-field checks using the same operator
// and formula semantics as the mobile runtime — so builders see what field officers will see.
import { evaluateExpressionValue } from "@/lib/expressionEngine";
import { pipeText } from "@/lib/pipeText";
import { fieldTypeHasCapability, type DynamicForm, type FormField } from "@/lib/forms";

const NUMERIC_TYPES = new Set(["number", "decimal", "currency", "percentage", "counter", "slider", "rating", "nps"]);
const TEXT_TYPES = new Set(["text", "textarea", "phone", "email", "url", "password"]);

type Values = Map<string, unknown>;

type Operator =
  | "Equals"
  | "NotEquals"
  | "GreaterThan"
  | "LessThan"
  | "GreaterOrEqual"
  | "LessOrEqual"
  | "Between"
  | "In"
  | "Contains"
  | "NotContains"
  | "StartsWith"
  | "IsEmpty"
  | "IsNotEmpty";

type Condition = { variable: string; operator: Operator; value: string };

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return true;
  if (Array.isArray(value)) return value.length === 0 || value.every(isEmptyValue);
  if (typeof value === "object") {
    const entries = Object.values(value as Record<string, unknown>);
    return entries.length === 0 || entries.every(isEmptyValue);
  }
  return false;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function compare(value: unknown, operator: Operator, ruleValue: string): boolean {
  if (operator === "IsEmpty") return isEmptyValue(value);
  if (operator === "IsNotEmpty") return !isEmptyValue(value);
  if (operator === "Equals") return String(value) === ruleValue;
  if (operator === "NotEquals") return String(value) !== ruleValue;
  if (operator === "Contains" || operator === "NotContains") {
    const hit = Array.isArray(value)
      ? value.some((item) => String(item) === ruleValue)
      : String(value ?? "").toLowerCase().includes(ruleValue.toLowerCase());
    return operator === "Contains" ? hit : !hit;
  }
  if (operator === "StartsWith") return String(value ?? "").toLowerCase().startsWith(ruleValue.toLowerCase());
  if (operator === "In") {
    const allowed = splitList(ruleValue);
    const picks = (Array.isArray(value) ? value : [value]).map((item) => String(item).trim());
    return picks.some((pick) => allowed.includes(pick));
  }
  if (operator === "Between") {
    const [low, high] = splitList(ruleValue).map(Number);
    const numeric = Number(value);
    if (![low, high, numeric].every(Number.isFinite)) return false;
    return numeric >= low && numeric <= high;
  }
  const numericValue = Number(value);
  const numericRule = Number(ruleValue);
  if (!Number.isFinite(numericValue) || !Number.isFinite(numericRule)) return false;
  if (operator === "GreaterOrEqual") return numericValue >= numericRule;
  if (operator === "LessOrEqual") return numericValue <= numericRule;
  return operator === "GreaterThan" ? numericValue > numericRule : numericValue < numericRule;
}

/** Parses one `${variable} OP value` clause. Mirrors the backend logic compiler's operator set. */
function parseClause(clause: string): Condition | null {
  const text = clause.trim();
  const match = text.match(/^\$\{([^}]+)\}\s*(.*)$/);
  if (!match) return null;
  const variable = (match[1] ?? "").trim();
  const rest = (match[2] ?? "").trim();
  const lowered = rest.toLowerCase();
  if (lowered === "is empty" || lowered === "empty") return { variable, operator: "IsEmpty", value: "" };
  if (lowered === "is not empty" || lowered === "not empty") return { variable, operator: "IsNotEmpty", value: "" };
  const keywords: [string, Operator][] = [
    ["between ", "Between"],
    ["not contains ", "NotContains"],
    ["contains ", "Contains"],
    ["starts_with ", "StartsWith"],
    ["starts with ", "StartsWith"],
    ["in ", "In"],
  ];
  const keyword = keywords.find(([prefix]) => lowered.startsWith(prefix));
  let operator: Operator = "Equals";
  let value = "";
  if (keyword) {
    operator = keyword[1];
    value = rest.slice(keyword[0].length);
  } else if (rest.startsWith("!=")) {
    [operator, value] = ["NotEquals", rest.slice(2)];
  } else if (rest.startsWith(">=")) {
    [operator, value] = ["GreaterOrEqual", rest.slice(2)];
  } else if (rest.startsWith("<=")) {
    [operator, value] = ["LessOrEqual", rest.slice(2)];
  } else if (rest.startsWith("==")) {
    value = rest.slice(2);
  } else if (rest.startsWith(">")) {
    [operator, value] = ["GreaterThan", rest.slice(1)];
  } else if (rest.startsWith("<")) {
    [operator, value] = ["LessThan", rest.slice(1)];
  } else if (rest.startsWith("=")) {
    value = rest.slice(1);
  } else {
    return null;
  }
  return { variable, operator, value: value.trim().replace(/^['"]|['"]$/g, "") };
}

/** Evaluates a logic/relevance expression (single or and/or-joined clauses) against the answers. */
export function conditionPasses(expression: string | undefined, values: Values): boolean {
  const text = (expression ?? "").trim();
  if (!text) return true;
  const lowered = text.toLowerCase();
  const isAny = lowered.includes(" or ");
  const clauses = isAny ? text.split(/\s+or\s+/i) : text.split(/\s+and\s+/i);
  const results = clauses
    .map((clause) => parseClause(clause))
    .filter((condition): condition is Condition => condition !== null)
    .map((condition) => compare(values.get(condition.variable), condition.operator, condition.value));
  if (results.length === 0) return true;
  return isAny ? results.some(Boolean) : results.every(Boolean);
}

export type SimulatedField = {
  field: FormField;
  visible: boolean;
  required: boolean;
  label: string;
  hint: string;
  calculatedValue: unknown;
  issue: string | null;
};

export type SimulatedSection = {
  id: string;
  title: string;
  visible: boolean;
  fields: SimulatedField[];
};

function calcExpression(field: FormField): string | undefined {
  return field.calculation?.expression ?? field.logic?.find((rule) => rule.kind === "calculation")?.expression;
}

function constraintExpression(field: FormField): string | undefined {
  return field.validation?.expression ?? field.logic?.find((rule) => rule.kind === "validation")?.expression;
}

/** Evaluates a cross-field constraint (e.g. `${end} >= ${start}`). Unlike show/hide logic, both sides
 * may be variables, so this uses the calculation engine (which resolves every `${var}`). The logic
 * words `and`/`or` are normalised to `&&`/`||`. An unparseable expression is treated as passing. */
export function evaluateConstraint(expression: string | undefined, values: Values): boolean {
  const text = (expression ?? "").trim();
  if (!text) return true;
  const normalized = text.replace(/\band\b/gi, "&&").replace(/\bor\b/gi, "||");
  const result = evaluateExpressionValue(normalized, values);
  return result === null ? true : Boolean(result);
}

/** Mirrors the device validation: returns the first blocking issue for a field's answer, or null. */
function fieldIssue(field: FormField, value: unknown, required: boolean, answers: Values): string | null {
  if (isEmptyValue(value)) return required ? "Required — needs an answer" : null;
  const v = field.validation ?? {};
  if (NUMERIC_TYPES.has(field.type)) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "Must be a number.";
    if (v.min != null && n < v.min) return `Must be at least ${v.min}.`;
    if (v.max != null && n > v.max) return `Must be at most ${v.max}.`;
    if (v.integerOnly && !Number.isInteger(n)) return "Must be a whole number.";
  }
  if (TEXT_TYPES.has(field.type) && typeof value === "string") {
    if (v.minLength != null && value.length < v.minLength) return `Use at least ${v.minLength} characters.`;
    if (v.maxLength != null && value.length > v.maxLength) return `Use at most ${v.maxLength} characters.`;
    if (v.pattern) {
      try {
        if (!new RegExp(v.pattern).test(value)) return v.customMessage ?? "Doesn't match the required format.";
      } catch {
        /* an invalid pattern is reported by the health check, not here */
      }
    }
  }
  if (fieldTypeHasCapability(field.type, "multiSelect") && Array.isArray(value)) {
    if (v.minSelections != null && value.length < v.minSelections) return `Pick at least ${v.minSelections}.`;
    if (v.maxSelections != null && value.length > v.maxSelections) return `Pick at most ${v.maxSelections}.`;
  }
  const constraint = constraintExpression(field);
  if (constraint && !evaluateConstraint(constraint, answers)) {
    return v.customMessage ?? "Fails the validation rule for this question.";
  }
  return null;
}

/** Runs the whole form against a set of trial answers (keyed by variable name). */
export function simulateForm(form: DynamicForm, answers: Values): SimulatedSection[] {
  return form.sections.map((section) => {
    const sectionVisible = conditionPasses(section.visibleWhen, answers);
    const fields = form.fields
      .filter((field) => field.sectionId === section.id)
      .map<SimulatedField>((field) => {
        let visible = sectionVisible && field.type !== "hidden";
        let required = field.required;
        for (const rule of field.logic ?? []) {
          if (rule.kind === "calculation") continue;
          const passes = conditionPasses(rule.expression, answers);
          if (rule.kind === "show" || rule.kind === "visibility") visible = visible && passes;
          if (rule.kind === "hide" && passes) visible = false;
          if (rule.kind === "required" && passes) required = true;
        }
        const expression = calcExpression(field);
        const calculatedValue = expression ? evaluateExpressionValue(expression, answers) : null;
        const answer = answers.get(field.variableName ?? field.id);
        const issue = visible ? fieldIssue(field, answer, required, answers) : null;
        return {
          field,
          visible,
          required,
          label: pipeText(field.label, answers),
          hint: pipeText(field.hint ?? field.appearance?.helpText ?? "", answers),
          calculatedValue,
          issue,
        };
      });
    return { id: section.id, title: section.title, visible: sectionVisible, fields };
  });
}
