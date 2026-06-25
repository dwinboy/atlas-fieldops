import type { MobileEntity, MobileEntityCategory, MobileFormEntitySettings, MobileFormVersion } from "@/models/contracts";

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function normalizeEntityCategoryRecord(record: MobileEntityCategory): MobileEntityCategory {
  return {
    ...record,
    parentCategoryId:
      record.parentCategoryId ?? (record as { parent_category_id?: string | null }).parent_category_id ?? null,
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
  const normalized = normalize(entityType);
  return categories.find((category) => (
    category.id === entityType
    || normalize(category.slug) === normalized
    || normalize(category.name) === normalized
  ))?.name
    ?? entityType
    ?? fallback;
}

export function formEntityLabel(
  settings: MobileFormEntitySettings,
  categories: MobileEntityCategory[],
  fallback = "Entity",
): string {
  if (settings.entityCategoryId) {
    const category = categories.find((item) => item.id === settings.entityCategoryId);
    if (category?.name) return category.name;
  }
  return displayEntityCategoryName(settings.entityType, categories, fallback);
}

export function describeFormEntityWorkflow(
  settings: MobileFormEntitySettings,
  categories: MobileEntityCategory[],
): {
  allowsCreateWithoutSelection: boolean;
  helperText: string;
  label: string;
  needsEntityPicker: boolean;
} {
  const label = formEntityLabel(settings, categories, "Entity");
  const lower = label.toLowerCase();
  if (settings.respondentIdentityMode === "existing_beneficiary") {
    return {
      allowsCreateWithoutSelection: false,
      helperText: `Search and select the correct ${lower} before you begin this form.`,
      label,
      needsEntityPicker: true,
    };
  }
  if (settings.respondentIdentityMode === "existing_or_new") {
    return {
      allowsCreateWithoutSelection: true,
      helperText:
        settings.entitySearchMode === "required"
          ? `Search for the right ${lower} first. If it does not exist, you can continue to register a new ${lower}.`
          : `You can link an existing ${lower} or continue without one to register a new ${lower}.`,
      label,
      needsEntityPicker: true,
    };
  }
  if (settings.respondentIdentityMode === "new_registration") {
    return {
      allowsCreateWithoutSelection: true,
      helperText: `Continue without selecting a record to register a new ${lower}.`,
      label,
      needsEntityPicker: false,
    };
  }
  if (settings.respondentIdentityMode === "anonymous_allowed") {
    return {
      allowsCreateWithoutSelection: true,
      helperText: `This form allows anonymous collection when the project does not require a tracked ${lower}.`,
      label,
      needsEntityPicker: false,
    };
  }
  if (!settings.linkedToEntity) {
    return {
      allowsCreateWithoutSelection: true,
      helperText: "This form can be submitted without linking to a tracked record first.",
      label,
      needsEntityPicker: false,
    };
  }
  if (requiresEntitySelection(settings)) {
    return {
      allowsCreateWithoutSelection: false,
      helperText: `Search and select the correct ${lower} before you begin this form.`,
      label,
      needsEntityPicker: true,
    };
  }
  if (settings.createsNewEntity && settings.updatesExistingEntity) {
    return {
      allowsCreateWithoutSelection: true,
      helperText: `You can link an existing ${lower} or continue without one to register a new ${lower}.`,
      label,
      needsEntityPicker: true,
    };
  }
  if (settings.updatesExistingEntity) {
    return {
      allowsCreateWithoutSelection: false,
      helperText: `Select the existing ${lower} this form is updating.`,
      label,
      needsEntityPicker: true,
    };
  }
  if (settings.createsNewEntity) {
    return {
      allowsCreateWithoutSelection: true,
      helperText: `Continue without selecting a record to register a new ${lower}.`,
      label,
      needsEntityPicker: false,
    };
  }
  return {
    allowsCreateWithoutSelection: false,
    helperText: `Use this form with the correct ${lower} record when one is available.`,
    label,
    needsEntityPicker: false,
  };
}

export function requiresEntitySelection(settings: MobileFormEntitySettings): boolean {
  if (settings.respondentIdentityMode === "existing_beneficiary") return true;
  if (
    settings.respondentIdentityMode === "existing_or_new"
    || settings.respondentIdentityMode === "new_registration"
    || settings.respondentIdentityMode === "anonymous_allowed"
  ) {
    return false;
  }
  if (!settings.linkedToEntity) return false;
  if (settings.updatesExistingEntity && !settings.createsNewEntity) return true;
  if (settings.createsNewEntity) return false;
  return settings.requiresExistingEntity;
}

export function resolveEntityCategoryForEntity(
  entity: MobileEntity,
  categories: MobileEntityCategory[],
): MobileEntityCategory | null {
  if (entity.entityCategoryId) {
    const category = categories.find((item) => item.id === entity.entityCategoryId);
    if (category) return category;
  }
  const normalized = normalize(entity.entityType);
  return categories.find((category) => (
    category.id === entity.entityType
    || normalize(category.slug) === normalized
    || normalize(category.name) === normalized
  )) ?? null;
}

function entityCategoryTrail(
  category: MobileEntityCategory,
  categories: MobileEntityCategory[],
): string {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const trail: string[] = [];
  const seen = new Set<string>();
  let current: MobileEntityCategory | null = category;
  while (current && !seen.has(current.id)) {
    trail.unshift(current.name);
    seen.add(current.id);
    current = current.parentCategoryId ? byId.get(current.parentCategoryId) ?? null : null;
  }
  return trail.join(" / ");
}

export function entityCategoryTrailForEntity(
  entity: MobileEntity,
  categories: MobileEntityCategory[],
): string | null {
  const category = resolveEntityCategoryForEntity(entity, categories);
  if (!category) return null;
  return entityCategoryTrail(category, categories);
}

export function entityCategoryTrailForFormSettings(
  settings: MobileFormEntitySettings,
  categories: MobileEntityCategory[],
): string | null {
  const categoryId = settings.entityCategoryId;
  if (!categoryId) return null;
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return null;
  return entityCategoryTrail(category, categories);
}

function categoryMatchesOrDescendsFrom(
  entityCategoryId: string,
  targetCategoryId: string,
  categories: MobileEntityCategory[],
): boolean {
  if (entityCategoryId === targetCategoryId) return true;
  const byId = new Map(categories.map((category) => [category.id, category]));
  const seen = new Set<string>();
  let current = byId.get(entityCategoryId) ?? null;
  while (current?.parentCategoryId && !seen.has(current.parentCategoryId)) {
    if (current.parentCategoryId === targetCategoryId) return true;
    seen.add(current.parentCategoryId);
    current = byId.get(current.parentCategoryId) ?? null;
  }
  return false;
}

export function entityMatchesFormEntityScope(
  entity: MobileEntity,
  formVersion: MobileFormVersion,
  categories: MobileEntityCategory[],
): boolean {
  if (!formVersion.entitySettings.linkedToEntity) {
    return true;
  }

  const formCategoryId = formVersion.entitySettings.entityCategoryId ?? null;
  const entityCategory = resolveEntityCategoryForEntity(entity, categories);
  if (formCategoryId && entityCategory?.id) {
    return categoryMatchesOrDescendsFrom(entityCategory.id, formCategoryId, categories);
  }
  if (formCategoryId) {
    const formCategory = categories.find((category) => category.id === formCategoryId);
    if (formCategory) {
      return normalize(formCategory.name) === normalize(entity.entityType)
        || normalize(formCategory.slug) === normalize(entity.entityType);
    }
  }
  return !normalize(formVersion.entitySettings.entityType) || normalize(formVersion.entitySettings.entityType) === normalize(entity.entityType);
}

export function entityMatchesCategoryFilter(
  entity: MobileEntity,
  targetCategoryId: string,
  categories: MobileEntityCategory[],
): boolean {
  const entityCategory = resolveEntityCategoryForEntity(entity, categories);
  if (entityCategory?.id) {
    return categoryMatchesOrDescendsFrom(entityCategory.id, targetCategoryId, categories);
  }
  const targetCategory = categories.find((item) => item.id === targetCategoryId);
  if (!targetCategory) return false;
  return normalize(targetCategory.name) === normalize(entity.entityType)
    || normalize(targetCategory.slug) === normalize(entity.entityType);
}

function summarizeNames(names: string[]): string {
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

export function describeEntityHierarchy(
  entity: MobileEntity,
  entities: MobileEntity[],
): {
  summary: string | null;
  parentLine: string | null;
  childLine: string | null;
} {
  const byId = new Map(entities.map((item) => [item.id, item]));
  const parentNames = entity.parentEntityIds
    .map((id) => byId.get(id)?.name || byId.get(id)?.entityUid || null)
    .filter((value): value is string => Boolean(value));
  const childNames = entity.childEntityIds
    .map((id) => byId.get(id)?.name || byId.get(id)?.entityUid || null)
    .filter((value): value is string => Boolean(value));
  const summary = [
    parentNames.length ? `${parentNames.length} parent` : null,
    childNames.length ? `${childNames.length} child${childNames.length === 1 ? "" : "ren"}` : null,
  ].filter(Boolean).join(" · ") || null;
  return {
    summary,
    parentLine: parentNames.length ? `Parent: ${summarizeNames(parentNames)}` : null,
    childLine: childNames.length ? `Children: ${summarizeNames(childNames)}` : null,
  };
}
