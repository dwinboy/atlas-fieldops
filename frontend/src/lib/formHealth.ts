// Static "health check" for a form: catches structural problems that would silently collect wrong
// or no data — broken variable references, duplicate variables, circular calculations, choice
// questions with no options, etc. — before the form is published. Pure, UI-free, and unit-testable.
import { fieldTypeHasCapability, type DynamicForm, type FormField } from "@/lib/forms";

export type FormHealthIssue = {
  severity: "error" | "warning";
  fieldId?: string;
  fieldLabel?: string;
  message: string;
};

/** Variable name a question/child is referenced by (falls back to its id). */
function varName(field: FormField): string {
  return field.variableName ?? field.id;
}

/** All `${variable}` tokens inside a piece of text (head of dotted paths, e.g. `members.age` → `members`). */
function tokensIn(text: string | undefined | null): string[] {
  if (!text) return [];
  return [...text.matchAll(/\$\{([^}]+)\}/g)].map((match) => (match[1] ?? "").trim().split(".")[0] ?? "");
}

function calcExpression(field: FormField): string | undefined {
  return field.calculation?.expression ?? field.logic?.find((rule) => rule.kind === "calculation")?.expression;
}

/** Every variable a field refers to through logic, calculations, defaults, piping, and selection. */
function referencedVariables(field: FormField): string[] {
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
  }
  return refs.filter(Boolean);
}

export function checkFormHealth(form: DynamicForm): FormHealthIssue[] {
  const issues: FormHealthIssue[] = [];
  const allFields = form.fields;
  const childFields = allFields.flatMap((field) => field.children ?? []);
  const everyField = [...allFields, ...childFields];

  // Known names that an expression/selection may reference.
  const known = new Set<string>();
  for (const field of everyField) {
    known.add(varName(field));
    known.add(field.id);
  }

  // 1) Duplicate variable names — two questions sharing a variable corrupt each other's answers.
  const seen = new Map<string, number>();
  for (const field of everyField) {
    const name = varName(field);
    seen.set(name, (seen.get(name) ?? 0) + 1);
  }
  for (const [name, count] of seen) {
    if (count > 1) {
      issues.push({ severity: "error", message: `Variable "${name}" is used by ${count} questions — each variable must be unique.` });
    }
  }

  // 2) References to unknown variables — logic/calc/piping/selection pointing at a deleted question.
  for (const field of everyField) {
    for (const ref of new Set(referencedVariables(field))) {
      if (!known.has(ref)) {
        issues.push({
          severity: "error",
          fieldId: field.id,
          fieldLabel: field.label,
          message: `"${field.label}" refers to "${ref}", which is not a question in this form.`,
        });
      }
    }
  }

  // 3) Circular calculations — A computes from B while B computes from A (never resolves).
  const calcGraph = new Map<string, string[]>();
  for (const field of everyField) {
    const expression = calcExpression(field);
    if (expression) calcGraph.set(varName(field), tokensIn(expression));
  }
  const calcVars = new Set(calcGraph.keys());
  for (const start of calcGraph.keys()) {
    const stack = [start];
    const visited = new Set<string>();
    let cyclic = false;
    while (stack.length) {
      const current = stack.pop() as string;
      for (const dep of calcGraph.get(current) ?? []) {
        if (dep === start) {
          cyclic = true;
          break;
        }
        if (calcVars.has(dep) && !visited.has(dep)) {
          visited.add(dep);
          stack.push(dep);
        }
      }
      if (cyclic) break;
    }
    if (cyclic) {
      issues.push({ severity: "error", message: `Calculation for "${start}" is circular — it depends on itself.` });
    }
  }

  // 4–8) Per-field structural checks.
  for (const field of everyField) {
    const staticOptions = !field.selection || field.selection.source === "static";
    if (fieldTypeHasCapability(field.type, "choice") && staticOptions && (field.options?.length ?? 0) === 0) {
      issues.push({ severity: "error", fieldId: field.id, fieldLabel: field.label, message: `"${field.label}" is a choice question with no options.` });
    }
    if (field.options?.length) {
      const lower = field.options.map((option) => option.trim().toLowerCase());
      if (new Set(lower).size !== lower.length) {
        issues.push({ severity: "warning", fieldId: field.id, fieldLabel: field.label, message: `"${field.label}" has duplicate options.` });
      }
    }
    if (["matrix_single", "matrix_multi", "grid"].includes(field.type) && (field.matrix?.columns?.length ?? 0) === 0) {
      issues.push({ severity: "error", fieldId: field.id, fieldLabel: field.label, message: `"${field.label}" is a matrix/grid with no columns.` });
    }
    if (field.type === "repeat_group" && (field.children?.length ?? 0) === 0) {
      issues.push({ severity: "warning", fieldId: field.id, fieldLabel: field.label, message: `"${field.label}" is a repeat group with no questions inside it.` });
    }
    if (field.type === "hidden" && field.required) {
      issues.push({ severity: "warning", fieldId: field.id, fieldLabel: field.label, message: `"${field.label}" is hidden but required — officers can't answer it.` });
    }
  }

  return issues;
}
