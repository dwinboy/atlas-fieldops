import type { MobileQuestion, MobileReferenceList } from "@/models/contracts";

export type SimpleOption = {
  id: string;
  label: string;
  value: string;
};

/**
 * Resolves the selectable options for a question, following
 * `referenceListId`/`cascadingParentQuestionId` against the offline reference
 * lists when present, otherwise falling back to the question's static options.
 */
export function resolveQuestionOptions(
  question: MobileQuestion,
  responses: Map<string, unknown>,
  referenceLists: MobileReferenceList[],
): SimpleOption[] {
  if (!question.referenceListId) {
    return staticOptions(question);
  }

  const list = referenceLists.find(
    (item) => item.id === question.referenceListId || item.slug === question.referenceListId,
  );
  if (!list) {
    return staticOptions(question);
  }

  if (question.cascadingParentQuestionId) {
    const parentCode = parentCodeValue(responses.get(question.cascadingParentQuestionId));
    if (parentCode === null) {
      return [];
    }
    return list.values
      .filter((value) => value.active && value.parentCode === parentCode)
      .sort((a, b) => a.order - b.order)
      .map((value) => ({ id: value.id, label: value.label, value: value.code }));
  }

  return list.values
    .filter((value) => value.active)
    .sort((a, b) => a.order - b.order)
    .map((value) => ({ id: value.id, label: value.label, value: value.code }));
}

/**
 * True when a cascading select has no usable options yet because its parent
 * question has not been answered.
 */
export function isCascadeBlocked(question: MobileQuestion, responses: Map<string, unknown>): boolean {
  if (!question.cascadingParentQuestionId) return false;
  return parentCodeValue(responses.get(question.cascadingParentQuestionId)) === null;
}

function parentCodeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const first = value.find((item) => String(item ?? "").trim().length > 0);
    return first === undefined ? null : String(first).trim();
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function staticOptions(question: MobileQuestion): SimpleOption[] {
  if (question.options.length > 0) {
    return question.options.map((option) => ({ id: option.id, label: option.label, value: option.value }));
  }
  return optionListFromUnknown(question.defaultValue, "options");
}

function optionListFromUnknown(
  value: unknown,
  fallbackKey: string,
): SimpleOption[] {
  const rawOptions = Array.isArray(value)
    ? value
    : value && typeof value === "object" && !Array.isArray(value)
      ? Array.isArray((value as Record<string, unknown>).options)
        ? (value as Record<string, unknown>).options as unknown[]
        : []
      : [];
  return rawOptions.map((item, index) => {
    if (typeof item === "object" && item !== null && !Array.isArray(item)) {
      const option = item as Record<string, unknown>;
      const rawValue = option.value ?? option.id ?? option.name ?? option.label ?? `${fallbackKey}_${index + 1}`;
      return {
        id: String(option.id ?? rawValue),
        label: String(option.label ?? option.name ?? option.text ?? rawValue),
        value: String(rawValue),
      };
    }
    const label = String(item || `${fallbackKey} ${index + 1}`);
    return {
      id: label,
      label,
      value: label,
    };
  });
}
