import { Fingerprint } from "lucide-react";

import {
  fieldAppearanceWithMetadata,
  fieldAppearanceWithTag,
  fieldMetadataValue,
  hasFieldTag,
} from "@/components/forms/fieldMetadata";
import { Badge } from "@/components/ui/badge";
import { HelpHint } from "@/components/ui/help-hint";
import { Select } from "@/components/ui/input";
import { updateField, type DynamicForm, type FormField } from "@/lib/forms";

/** Entity & profile-mapping settings tab (profile impact, entity field, update rule, dedup tags). */
export function BeneficiarySettingsPanel({
  field,
  form,
  onUpdateForm,
}: {
  field: FormField;
  form: DynamicForm;
  onUpdateForm: (form: DynamicForm) => void;
}) {
  return (
                            <section className="mt-4 rounded-lg border bg-panel p-4">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Fingerprint aria-hidden="true" className="text-primary" size={16} />
                                  <h3 className="text-sm font-semibold">Entity and profile mapping</h3><HelpHint label="About this tab" title="Entity and profile mapping">Use this answer to create or update a tracked record (beneficiary, household, facility) and keep one source of truth.</HelpHint>
                                </div>
                                <Badge tone="admin">Entity data</Badge>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                Control whether this answer creates, updates, or only supports the entity profile.
                              </p>
                              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                <label className="text-sm font-semibold">
                                  Profile impact
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "profile-impact", event.target.value),
                                        }),
                                      )
                                    }
                                    value={fieldMetadataValue(field, "profile-impact")}
                                  >
                                    <option value="">No profile impact</option>
                                    <option value="creates_profile">Creates profile field</option>
                                    <option value="updates_profile">Updates profile field</option>
                                    <option value="evidence_only">Evidence only</option>
                                    <option value="requires_review">Profile update requires review</option>
                                  </Select>
                                </label>
                                <label className="text-sm font-semibold">
                                  Entity field
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "beneficiary-field", event.target.value),
                                        }),
                                      )
                                    }
                                    value={fieldMetadataValue(field, "beneficiary-field")}
                                  >
                                    <option value="">Not mapped</option>
                                    <option value="full_name">Full name</option>
                                    <option value="phone">Phone</option>
                                    <option value="gender">Sex / gender</option>
                                    <option value="date_of_birth">Date of birth</option>
                                    <option value="age">Age</option>
                                    <option value="national_id">National ID</option>
                                    <option value="household_id">Household ID</option>
                                    <option value="village">Village / community</option>
                                    <option value="gps">GPS / location</option>
                                    <option value="legacy_id">Legacy ID</option>
                                  </Select>
                                </label>
                                <label className="text-sm font-semibold">
                                  Update rule
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "profile-update-rule", event.target.value),
                                        }),
                                      )
                                    }
                                    value={fieldMetadataValue(field, "profile-update-rule")}
                                  >
                                    <option value="">Form default</option>
                                    <option value="keep_history">Keep history</option>
                                    <option value="require_review">Require profile update approval</option>
                                    <option value="auto_update">Auto-update after approval</option>
                                    <option value="source_only">Store as source evidence only</option>
                                  </Select>
                                </label>
                                <label className="flex items-center gap-2 text-sm font-semibold">
                                  <input
                                    checked={hasFieldTag(field, "duplicate-key")}
                                    className="h-4 w-4"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithTag(field, "duplicate-key", event.target.checked),
                                          validation: {
                                            ...field.validation,
                                            duplicateCheck: event.target.checked || undefined,
                                          },
                                        }),
                                      )
                                    }
                                    type="checkbox"
                                  />
                                  Use for duplicate matching
                                </label>
                                <label className="flex items-center gap-2 text-sm font-semibold">
                                  <input
                                    checked={hasFieldTag(field, "source-of-truth")}
                                    className="h-4 w-4"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithTag(field, "source-of-truth", event.target.checked),
                                        }),
                                      )
                                    }
                                    type="checkbox"
                                  />
                                  Source of truth for this field
                                </label>
                                <label className="flex items-center gap-2 text-sm font-semibold">
                                  <input
                                    checked={hasFieldTag(field, "lineage-required")}
                                    className="h-4 w-4"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithTag(field, "lineage-required", event.target.checked),
                                        }),
                                      )
                                    }
                                    type="checkbox"
                                  />
                                  Show source lineage on profile
                                </label>
                              </div>
                            </section>
  );
}
