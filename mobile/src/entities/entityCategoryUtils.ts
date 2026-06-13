import type { MobileEntityCategory } from "@/models/contracts";

export function normalizeEntityCategoryRecord(record: MobileEntityCategory): MobileEntityCategory {
  return {
    ...record,
    attributes: record.attributes.map((attribute) => ({
      ...attribute,
      fieldKey: attribute.fieldKey ?? (attribute as { field_key?: string }).field_key ?? "",
      fieldType: attribute.fieldType ?? (attribute as { field_type?: string }).field_type ?? "text",
      orderIndex: attribute.orderIndex ?? (attribute as { order_index?: number }).order_index ?? 0,
      defaultValue: attribute.defaultValue ?? (attribute as { default_value?: string | null }).default_value ?? null,
    })),
  };
}

export function pluralizeEntityCategory(label: string): string {
  const normalized = label.trim();
  if (!normalized) return "Records";
  const lower = normalized.toLowerCase();
  if (lower.endsWith("y")) return `${normalized.slice(0, -1)}ies`;
  if (lower.endsWith("s")) return normalized;
  return `${normalized}s`;
}

export function displayEntityCategoryName(
  entityType: string | null | undefined,
  categories: MobileEntityCategory[],
  fallback = "Entity",
): string {
  if (!entityType) return fallback;
  return categories.find((category) => category.id === entityType || category.slug === entityType || category.name === entityType)?.name
    ?? entityType
    ?? fallback;
}
