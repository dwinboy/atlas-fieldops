import type {
  MobileQuestion,
  MobileReferenceList,
  MobileReferenceValue,
  MobileSelectionConfig,
  MobileSelectionFilter,
} from "@/models/contracts";

export type SimpleOption = {
  id: string;
  label: string;
  value: string;
  /** Extra text (non-display columns) the searchable list also matches against. */
  search?: string;
};

/**
 * Resolves the selectable options for a question. The unified `selection` config is honored when
 * present (dataset list with display/value/search columns, row filters, and cascade), otherwise it
 * falls back to the legacy `referenceListId`/`cascadingParentQuestionId` reference path, and finally
 * to the question's static options. All resolution is offline against the synced reference lists.
 */
export function resolveQuestionOptions(
  question: MobileQuestion,
  responses: Map<string, unknown>,
  referenceLists: MobileReferenceList[],
): SimpleOption[] {
  const selection = question.selection ?? null;
  const listId = selection?.datasetId ?? question.referenceListId;
  if (!listId) {
    return staticOptions(question);
  }

  const list = referenceLists.find((item) => item.id === listId || item.slug === listId);
  if (!list) {
    return staticOptions(question);
  }

  let values = list.values.filter((value) => value.active);

  // Cascade: only show children of the parent answer.
  const cascadeParentId = selection?.cascadingParentQuestionId ?? question.cascadingParentQuestionId;
  if (cascadeParentId) {
    const parentCode = parentCodeValue(responses.get(cascadeParentId));
    if (parentCode === null) {
      return [];
    }
    values = values.filter((value) => value.parentCode === parentCode);
  }

  // Column filters (static value or driven by another answer).
  for (const filter of selection?.filters ?? []) {
    const target = filterTarget(filter, responses);
    if (target === null) {
      // A dynamic filter whose source question isn't answered yet blocks the list.
      return [];
    }
    values = values.filter((value) => matchesFilter(columnValue(value, filter.column), filter.op, target));
  }

  return values
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((value) => ({
      id: value.id,
      label: columnValue(value, selection?.displayColumn) || value.label,
      value: columnValue(value, selection?.valueColumn) || value.code,
      search: searchText(value, selection),
    }));
}

/**
 * True when a cascading/filtered select has no usable options yet because a question it depends on
 * (its cascade parent or a dynamic filter source) has not been answered.
 */
export function isCascadeBlocked(question: MobileQuestion, responses: Map<string, unknown>): boolean {
  const selection = question.selection ?? null;
  const cascadeParentId = selection?.cascadingParentQuestionId ?? question.cascadingParentQuestionId;
  if (cascadeParentId && parentCodeValue(responses.get(cascadeParentId)) === null) {
    return true;
  }
  for (const filter of selection?.filters ?? []) {
    if (filter.fromQuestionId && parentCodeValue(responses.get(filter.fromQuestionId)) === null) {
      return true;
    }
  }
  return false;
}

function filterTarget(filter: MobileSelectionFilter, responses: Map<string, unknown>): string | null {
  if (filter.fromQuestionId) {
    return parentCodeValue(responses.get(filter.fromQuestionId));
  }
  const raw = (filter.value ?? "").trim();
  return raw.length > 0 ? raw : null;
}

function matchesFilter(actual: string, op: MobileSelectionFilter["op"], target: string): boolean {
  const a = actual.trim().toLowerCase();
  const b = target.trim().toLowerCase();
  switch (op) {
    case "neq":
      return a !== b;
    case "in":
      return b
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .includes(a);
    case "contains":
      return a.includes(b);
    case "eq":
    default:
      return a === b;
  }
}

/** Reads a column from a reference value: the multi-column `data` row first, then the built-in
 * code/label aliases, so configs work for both rich datasets and simple code/label lists. */
function columnValue(value: MobileReferenceValue, column?: string | null): string {
  if (!column) return "";
  if (value.data && column in value.data) {
    const raw = value.data[column];
    return raw === null || raw === undefined ? "" : String(raw);
  }
  if (column === "code") return value.code;
  if (column === "label") return value.label;
  return "";
}

function searchText(value: MobileReferenceValue, selection: MobileSelectionConfig | null): string {
  const parts = new Set<string>([value.label, value.code]);
  for (const column of selection?.searchColumns ?? []) {
    const resolved = columnValue(value, column);
    if (resolved) parts.add(resolved);
  }
  if (value.data) {
    for (const raw of Object.values(value.data)) {
      if (raw !== null && raw !== undefined) parts.add(String(raw));
    }
  }
  return Array.from(parts).join(" ");
}

function parentCodeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const first = value.find((item) => String(item ?? "").trim().length > 0);
    return first === undefined ? null : String(first).trim();
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate = record.value ?? record.id ?? record.code;
    if (candidate !== undefined && candidate !== null) {
      const normalized = String(candidate).trim();
      return normalized.length > 0 ? normalized : null;
    }
    return null;
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
