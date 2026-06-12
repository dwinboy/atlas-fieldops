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
