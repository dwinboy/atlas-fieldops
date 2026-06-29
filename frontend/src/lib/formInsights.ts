// Comprehension helpers for the builder: turn a question's configuration into a plain-language
// summary and a map of how it connects to other questions — so a builder can see what each question
// does and what it touches without reading `${}` expressions. Pure and unit-testable.
import { type DynamicForm, type FormField } from "@/lib/forms";

/** `${variable}` tokens in a piece of text (head of dotted paths). */
function tokensIn(text: string | undefined | null): string[] {
  if (!text) return [];
  return [...text.matchAll(/\$\{([^}]+)\}/g)].map((m) => (m[1] ?? "").trim().split(".")[0] ?? "");
}

function calcExpression(field: FormField): string | undefined {
  return field.calculation?.expression ?? field.logic?.find((rule) => rule.kind === "calculation")?.expression;
}

/** Every variable name this field refers to via logic, calculation, default, piping, and selection. */
export function referencedVariables(field: FormField): string[] {
  const refs: string[] = [];
  for (const rule of field.logic ?? []) refs.push(...tokensIn(rule.expression));
  refs.push(...tokensIn(field.calculation?.expression));
  refs.push(...tokensIn(field.validation?.expression));
  refs.push(...tokensIn(field.dynamicDefault));
  refs.push(...tokensIn(field.label), ...tokensIn(field.hint), ...tokensIn(field.appearance?.helpText));
  const selection = field.selection;
  if (selection) {
    if (selection.fromQuestionVariable) refs.push(selection.fromQuestionVariable);
    if (selection.cascadeFromVariable) refs.push(selection.cascadeFromVariable);
    for (const filter of selection.filters ?? []) if (filter.fromVariable) refs.push(filter.fromVariable);
    for (const fill of selection.autofill ?? []) if (fill.toVariable) refs.push(fill.toVariable);
  }
  return [...new Set(refs.filter(Boolean))];
}

function defaultModeLabel(field: FormField): string | null {
  const dynamic = (field.dynamicDefault ?? "").trim();
  if (dynamic === "today()") return "Pre-filled with today’s date";
  if (/^\$\{[^}]+\}$/.test(dynamic)) return "Pre-filled from another answer";
  if (dynamic) return "Pre-filled by a formula";
  const fixed = field.defaultValue;
  if (fixed !== undefined && fixed !== null && fixed !== "") return "Pre-filled with a fixed value";
  return null;
}

function sourceLabel(field: FormField): string | null {
  const source = field.selection?.source;
  if (!source || source === "static") return null;
  const noun = ["matrix_single", "matrix_multi", "grid", "repeat_group"].includes(field.type) ? "Rows" : "Options";
  if (source === "dataset") return `${noun} from a dataset`;
  if (source === "question") return `${noun} from another question`;
  if (source === "record") return `${noun} from another form’s records`;
  return null;
}

/** A one-line, plain-English description of what a question does (relevance, requirement, default,
 * calculation, and where its options/rows come from). Empty string when there is nothing notable. */
export function describeField(field: FormField): string {
  const parts: string[] = [];

  const showRule = field.logic?.find((rule) => rule.kind === "show" || rule.kind === "visibility");
  const hideRule = field.logic?.find((rule) => rule.kind === "hide");
  if (showRule) parts.push(`Shown only when ${readableCondition(showRule.message, showRule.expression)}`);
  else if (hideRule) parts.push(`Hidden when ${readableCondition(hideRule.message, hideRule.expression)}`);

  const requiredRule = field.logic?.find((rule) => rule.kind === "required");
  if (field.required) parts.push("Required");
  else if (requiredRule) parts.push(`Required when ${readableCondition(requiredRule.message, requiredRule.expression)}`);

  const defaultLabel = defaultModeLabel(field);
  if (defaultLabel) parts.push(defaultLabel);

  if (calcExpression(field)) parts.push("Auto-calculated");

  const source = sourceLabel(field);
  if (source) parts.push(source);

  return parts.join(" · ");
}

/** Prefer the builder's stored human message; otherwise show the raw condition expression. */
function readableCondition(message: string | undefined, expression: string): string {
  if (message) {
    // Visual-builder messages read like "show this question when Region is KN." — keep the clause
    // after "when" so the summary stays short.
    const match = message.match(/when (.+?)\.?$/i);
    if (match) return match[1] ?? expression;
  }
  return expression;
}

export type FieldConnections = {
  dependsOn: { id: string; label: string }[];
  usedBy: { id: string; label: string }[];
};

/** What a question depends on (questions it references) and what depends on it (questions that
 * reference its variable) — so a builder can see the impact before renaming or deleting it. */
export function fieldConnections(form: DynamicForm, field: FormField): FieldConnections {
  const byVariable = new Map<string, FormField>();
  for (const candidate of form.fields) {
    if (candidate.variableName) byVariable.set(candidate.variableName, candidate);
  }
  const ownVariable = field.variableName;

  const dependsOn = referencedVariables(field)
    .map((variable) => byVariable.get(variable))
    .filter((f): f is FormField => f !== undefined && f.id !== field.id)
    .map((f) => ({ id: f.id, label: f.label }));

  const usedBy = ownVariable
    ? form.fields
        .filter((candidate) => candidate.id !== field.id && referencedVariables(candidate).includes(ownVariable))
        .map((candidate) => ({ id: candidate.id, label: candidate.label }))
    : [];

  // De-duplicate by id.
  const dedupe = (items: { id: string; label: string }[]) => [...new Map(items.map((i) => [i.id, i])).values()];
  return { dependsOn: dedupe(dependsOn), usedBy: dedupe(usedBy) };
}
