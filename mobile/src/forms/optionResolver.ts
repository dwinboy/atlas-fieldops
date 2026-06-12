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
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.length > 0 ? String(value[0]) : null;
  return String(value);
}

function staticOptions(question: MobileQuestion): SimpleOption[] {
  return question.options.map((option) => ({ id: option.id, label: option.label, value: option.value }));
}
