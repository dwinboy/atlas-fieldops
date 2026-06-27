import { type FormField } from "@/lib/forms";

/** Pure helpers for reading and writing question behaviour tags and key:value metadata stored inline
 * in a field's appearance.helpText (e.g. [consent-required], [sensitivity:pii]). */

export function hasFieldTag(field: FormField, tag: string): boolean {
  return Boolean(field.appearance?.helpText?.includes(`[${tag}]`));
}

export function fieldAppearanceWithTag(
  field: FormField,
  tag: string,
  enabled: boolean,
): FormField["appearance"] {
  const token = `[${tag}]`;
  const current = field.appearance?.helpText ?? "";
  const cleaned = current.replace(token, "").replace(/\s+/g, " ").trim();
  return {
    ...field.appearance,
    helpText: enabled ? `${cleaned} ${token}`.trim() : cleaned,
  };
}

export function fieldMetadataValue(field: FormField, key: string): string {
  const match = (field.appearance?.helpText ?? "").match(new RegExp(`\\[${key}:([^\\]]+)\\]`));
  return match?.[1] ?? "";
}

export function fieldAppearanceWithMetadata(field: FormField, key: string, value: string): FormField["appearance"] {
  const current = field.appearance?.helpText ?? "";
  const cleaned = current.replace(new RegExp(`\\s*\\[${key}:[^\\]]+\\]`, "g"), "").replace(/\s+/g, " ").trim();
  return {
    ...field.appearance,
    helpText: value ? `${cleaned} [${key}:${value}]`.trim() : cleaned,
  };
}
