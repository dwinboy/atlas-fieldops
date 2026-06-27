import { type FormControlsSettings } from "@/lib/api";
import { type BadgeProps } from "@/components/ui/badge";

function asSettingsRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function describeEntityCollectionWorkflow(
  controls: FormControlsSettings,
): {
  badge: string;
  description: string;
  entityLabel: string;
  tone: BadgeProps["tone"];
} {
  const entityControls = controls.entity_controls;
  const entityLabel = entityControls?.entity_type?.trim() || "Entity";
  const entityLabelLower = entityLabel.toLowerCase();
  const respondentIdentity = asSettingsRecord(controls.instrument?.respondent_identity);
  const rawRespondentIdentityMode =
    typeof respondentIdentity.mode === "string" && respondentIdentity.mode.trim()
      ? respondentIdentity.mode.trim()
      : null;
  const createsNewEntity = Boolean(entityControls?.creates_new_entity);
  const updatesExistingEntity = Boolean(entityControls?.updates_existing_entity);
  const requiresExistingEntity = Boolean(entityControls?.requires_existing_entity);
  const linkedToEntity = Boolean(entityControls?.linked_to_entity);
  const allowsAnonymous = Boolean(entityControls?.allows_anonymous);
  const respondentIdentityMode =
    rawRespondentIdentityMode === "existing_beneficiary"
    || rawRespondentIdentityMode === "new_registration"
    || rawRespondentIdentityMode === "existing_or_new"
    || rawRespondentIdentityMode === "anonymous_allowed"
      ? rawRespondentIdentityMode
      : createsNewEntity && updatesExistingEntity
        ? "existing_or_new"
        : createsNewEntity
          ? "new_registration"
          : updatesExistingEntity || requiresExistingEntity
            ? "existing_beneficiary"
            : allowsAnonymous || !linkedToEntity
              ? "anonymous_allowed"
              : null;

  if (!linkedToEntity) {
    return {
      badge: "Standalone form",
      description: "This form can collect standalone records without linking them to a tracked entity profile first.",
      entityLabel,
      tone: "neutral",
    };
  }
  if (respondentIdentityMode === "existing_beneficiary") {
    return {
      badge: `Follow-up on existing ${entityLabel}`,
      description: `Field officers must search for and select an existing ${entityLabelLower} before collection starts.`,
      entityLabel,
      tone: "warning",
    };
  }
  if (respondentIdentityMode === "existing_or_new") {
    return {
      badge: `Existing or new ${entityLabel}`,
      description: `Field officers can link an existing ${entityLabelLower} or continue without one to register a new ${entityLabelLower}.`,
      entityLabel,
      tone: "collect",
    };
  }
  if (respondentIdentityMode === "new_registration") {
    return {
      badge: `Creates new ${entityLabel}`,
      description: `This form is designed for registration or intake, so collection can create new ${entityLabelLower} records directly.`,
      entityLabel,
      tone: "success",
    };
  }
  if (respondentIdentityMode === "anonymous_allowed") {
    return {
      badge: "Anonymous or unlinked allowed",
      description: `This form can be submitted without a tracked ${entityLabelLower} when the workflow allows anonymous or unlinked collection.`,
      entityLabel,
      tone: "accent",
    };
  }
  if (updatesExistingEntity || requiresExistingEntity) {
    return {
      badge: `Updates existing ${entityLabel}`,
      description: `Approved submissions update existing ${entityLabelLower} records, so this form works best as a follow-up or profile maintenance tool.`,
      entityLabel,
      tone: "accent",
    };
  }
  return {
    badge: "Entity-linked form",
    description: `This form links to ${entityLabelLower} records, but the collection rule still needs a manager review.`,
    entityLabel,
    tone: "success",
  };
}
