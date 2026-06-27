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
  /** The full source row, used to auto-fill other questions when this option is chosen. */
  data?: Record<string, unknown>;
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

  // Column filters combine with all (AND) or any (OR). A dynamic filter whose source question is
  // unanswered is skipped (not blocking) so "any"/optional filters behave intuitively.
  const filters = selection?.filters ?? [];
  if (filters.length > 0) {
    const matchAny = selection?.filterMatch === "any";
    values = values.filter((value) => {
      const results = filters
        .map((filter) => evaluateFilter(columnValue(value, filter.column), filter, responses))
        .filter((result): result is boolean => result !== null);
      if (results.length === 0) return true;
      return matchAny ? results.some(Boolean) : results.every(Boolean);
    });
  }

  return values
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((value) => ({
      id: value.id,
      label: columnValue(value, selection?.displayColumn) || value.label,
      value: columnValue(value, selection?.valueColumn) || value.code,
      search: searchText(value, selection),
      data: rowData(value),
    }));
}

/**
 * True when a cascading/filtered select has no usable options yet because a question it depends on
 * (its cascade parent or a dynamic filter source) has not been answered.
 */
export function isCascadeBlocked(question: MobileQuestion, responses: Map<string, unknown>): boolean {
  const selection = question.selection ?? null;
  const cascadeParentId = selection?.cascadingParentQuestionId ?? question.cascadingParentQuestionId;
  return Boolean(cascadeParentId && parentCodeValue(responses.get(cascadeParentId)) === null);
}

/**
 * Evaluates a single filter against a column value. Returns null when the filter is dynamic and its
 * source question is unanswered (so the caller can skip it rather than exclude everything). Shared by
 * the dataset resolver and the entity/linked-record matchers so all sources behave identically.
 */
export function evaluateFilter(
  actual: string,
  filter: MobileSelectionFilter,
  responses: Map<string, unknown>,
): boolean | null {
  const a = actual.trim();
  if (filter.op === "empty") return a.length === 0;
  if (filter.op === "not_empty") return a.length > 0;

  const target = filter.fromQuestionId
    ? parentCodeValue(responses.get(filter.fromQuestionId))
    : (filter.value ?? "").trim() || null;
  if (target === null) return null;

  const al = a.toLowerCase();
  const bl = target.toLowerCase();
  const an = Number(a);
  const bn = Number(target);
  const numeric = Number.isFinite(an) && Number.isFinite(bn);
  switch (filter.op) {
    case "neq":
      return al !== bl;
    case "in":
      return bl.split(",").map((item) => item.trim()).filter(Boolean).includes(al);
    case "contains":
      return al.includes(bl);
    case "starts_with":
      return al.startsWith(bl);
    case "gt":
      return numeric ? an > bn : al > bl;
    case "lt":
      return numeric ? an < bn : al < bl;
    case "gte":
      return numeric ? an >= bn : al >= bl;
    case "lte":
      return numeric ? an <= bn : al <= bl;
    case "between": {
      const upper = (filter.value2 ?? "").trim();
      const un = Number(upper);
      if (numeric && Number.isFinite(un)) return an >= bn && an <= un;
      return al >= bl && al <= upper.toLowerCase();
    }
    case "eq":
    default:
      return al === bl;
  }
}

function rowData(value: MobileReferenceValue): Record<string, unknown> {
  return { ...(value.data ?? {}), code: value.code, label: value.label, parentCode: value.parentCode };
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
