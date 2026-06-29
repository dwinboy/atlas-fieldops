// Schema-change impact analysis: compares two versions of a form and flags edits that would break
// comparability with already-collected data (removed/renamed/retyped questions, changed option
// codes) versus safe additions. Pure and unit-testable. Used to warn before publishing over a live
// version. Questions are matched by their stable `id`; a changed `variableName` is a rename.
import { exportedOptions, type DynamicForm, type FormField } from "@/lib/forms";

export type FormChange = {
  severity: "breaking" | "safe" | "info";
  variable?: string;
  message: string;
};

function collectsData(field: FormField): boolean {
  return !["article", "hidden"].includes(field.type);
}

function optionCodes(field: FormField): string[] {
  if (!field.options?.length) return [];
  return exportedOptions(field.options, field.optionValues).map((option) => option.value);
}

/** All breaking/safe/info changes from `previous` to `next`. Empty when nothing material changed. */
export function diffForms(previous: DynamicForm, next: DynamicForm): FormChange[] {
  const changes: FormChange[] = [];
  const prevById = new Map(previous.fields.map((field) => [field.id, field]));
  const nextById = new Map(next.fields.map((field) => [field.id, field]));

  for (const [id, prev] of prevById) {
    const current = nextById.get(id);
    const variable = prev.variableName ?? id;
    if (!current) {
      if (collectsData(prev)) {
        changes.push({
          severity: "breaking",
          variable,
          message: `Question removed: "${prev.label}" (${variable}) — answers already collected for it become orphaned.`,
        });
      }
      continue;
    }
    if ((prev.variableName ?? id) !== (current.variableName ?? id)) {
      changes.push({
        severity: "breaking",
        variable,
        message: `Variable renamed: ${prev.variableName ?? id} → ${current.variableName ?? id} — breaks analysis, exports, and links that use the old name.`,
      });
    }
    if (prev.type !== current.type) {
      changes.push({
        severity: "breaking",
        variable,
        message: `Type changed for ${variable}: ${prev.type} → ${current.type} — values already collected may not fit the new type.`,
      });
    }
    const prevCodes = new Set(optionCodes(prev));
    const nextCodes = new Set(optionCodes(current));
    const removedCodes = [...prevCodes].filter((code) => !nextCodes.has(code));
    const addedCodes = [...nextCodes].filter((code) => !prevCodes.has(code));
    if (removedCodes.length) {
      changes.push({
        severity: "breaking",
        variable,
        message: `Option code(s) removed for ${variable}: ${removedCodes.join(", ")} — answers stored with these codes will no longer decode.`,
      });
    }
    if (addedCodes.length) {
      changes.push({
        severity: "safe",
        variable,
        message: `Option(s) added for ${variable}: ${addedCodes.join(", ")}.`,
      });
    }
    if (prev.label !== current.label) {
      changes.push({ severity: "info", variable, message: `Label changed for ${variable}.` });
    }
    if (!prev.required && current.required) {
      changes.push({
        severity: "info",
        variable,
        message: `${variable} is now required — records collected earlier may have left it blank.`,
      });
    }
  }

  for (const [id, current] of nextById) {
    if (!prevById.has(id) && collectsData(current)) {
      changes.push({
        severity: "safe",
        variable: current.variableName ?? id,
        message: `Question added: "${current.label}".`,
      });
    }
  }

  return changes;
}
