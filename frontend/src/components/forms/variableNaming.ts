import { type FormField } from "@/lib/forms";

/** Pure helpers for deriving and validating question variable names from labels. */

export function variableNameFromQuestion(
  question: string,
  existingNames: string[],
): string {
  const base = variableBaseFromQuestion(question);
  let candidate = base;
  let suffix = 2;
  while (existingNames.includes(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function variableBaseFromQuestion(question: string): string {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "can",
    "did",
    "do",
    "does",
    "for",
    "has",
    "have",
    "how",
    "is",
    "of",
    "please",
    "respondent",
    "the",
    "this",
    "to",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "with",
    "your",
  ]);
  return (
    question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word && !stopWords.has(word))
      .slice(0, 5)
      .join("_") || `question_${Date.now().toString(36)}`
  );
}

export function normalizeVariableNameInput(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 64);
  if (!normalized) return "";
  return /^[a-z_]/.test(normalized) ? normalized : `q_${normalized}`.slice(0, 64);
}

export function isValidVariableName(value: string | undefined): boolean {
  return Boolean(value && /^[a-z_][a-z0-9_]{0,63}$/.test(value));
}

function escapedRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function autoVariableAliases(label: string): string[] {
  const normalized = normalizeVariableNameInput(label);
  if (!normalized) return [];
  const aliases = new Set<string>([normalized, variableBaseFromQuestion(label)]);
  const genericSuffixes = [
    "answer",
    "capture",
    "code",
    "entry",
    "evidence",
    "field",
    "id",
    "list",
    "location",
    "number",
    "question",
    "response",
    "signature",
  ];
  const removableSuffixes = new Set(genericSuffixes);
  const parts = normalized.split("_").filter(Boolean);
  for (let index = parts.length; index > 1; index -= 1) {
    const tail = parts[index - 1];
    if (!removableSuffixes.has(tail)) break;
    const base = parts.slice(0, index - 1).join("_");
    if (!base) continue;
    aliases.add(base);
    for (const suffix of genericSuffixes) {
      aliases.add(`${base}_${suffix}`);
    }
  }
  return Array.from(aliases).filter(Boolean);
}

export function labelPatchWithAutoVariable(
  field: FormField,
  nextLabel: string,
  existingNames: string[],
): Partial<FormField> {
  const currentVariable = field.variableName?.trim();
  const previousAutoVariable = variableNameFromQuestion(
    field.label,
    existingNames,
  );
  const previousBaseVariable = variableBaseFromQuestion(field.label);
  const idAutoVariable = field.id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const priorAliases = autoVariableAliases(field.label);
  const shouldRegenerate =
    !currentVariable ||
    currentVariable === field.id ||
    currentVariable === idAutoVariable ||
    currentVariable === previousAutoVariable ||
    currentVariable === previousBaseVariable ||
    priorAliases.includes(currentVariable) ||
    priorAliases.some((alias) =>
      new RegExp(`^${escapedRegExp(alias)}_(?:answer|capture|code|entry|evidence|field|id|list|location|number|question|response|signature)$`).test(
        currentVariable,
      ),
    ) ||
    new RegExp(`^${escapedRegExp(previousBaseVariable)}_\\d+$`).test(currentVariable);
  return {
    label: nextLabel,
    ...(shouldRegenerate
      ? { variableName: variableNameFromQuestion(nextLabel, existingNames) }
      : {}),
  };
}
