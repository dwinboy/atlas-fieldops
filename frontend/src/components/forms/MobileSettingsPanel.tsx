import { Smartphone } from "lucide-react";

import {
  fieldAppearanceWithMetadata,
  fieldAppearanceWithTag,
  fieldMetadataValue,
  hasFieldTag,
} from "@/components/forms/fieldMetadata";
import { Badge } from "@/components/ui/badge";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import { updateField, type DynamicForm, type FormField } from "@/lib/forms";

/** Mobile field-experience settings tab (display mode, blocked-help, offline/sync behaviour tags). */
export function MobileSettingsPanel({
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
                                  <Smartphone aria-hidden="true" className="text-primary" size={16} />
                                  <h3 className="text-sm font-semibold">Mobile field experience</h3><HelpHint label="About this tab" title="Mobile field experience">Tune how this question behaves in the mobile app — offline, keyboard, and on-screen guidance.</HelpHint>
                                </div>
                                <Badge tone="success">Offline-ready</Badge>
                              </div>
                              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                <label className="text-sm font-semibold">
                                  Mobile display mode
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "mobile", event.target.value),
                                        }),
                                      )
                                    }
                                    value={fieldMetadataValue(field, "mobile")}
                                  >
                                    <option value="">Default</option>
                                    <option value="compact">Compact</option>
                                    <option value="large-tap">Large tap area</option>
                                    <option value="full-screen">Full-screen capture</option>
                                    <option value="review-before-next">Review before next</option>
                                  </Select>
                                </label>
                                <label className="text-sm font-semibold lg:col-span-2">
                                  Field officer guidance when blocked
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "blocked-help", event.target.value),
                                        }),
                                      )
                                    }
                                    placeholder="Example: Use YYYY-MM-DD. If unsure, ask supervisor before submitting."
                                    value={fieldMetadataValue(field, "blocked-help")}
                                  />
                                </label>
                                {[
                                  ["offline-compatible", "Works offline"],
                                  ["low-bandwidth", "Use low-bandwidth mode"],
                                  ["prefill-allowed", "Allow mobile prefill"],
                                  ["save-draft-after-answer", "Auto-save after this answer"],
                                  ["review-answer-before-submit", "Review answer before submit"],
                                  ["sync-priority", "High sync priority"],
                                ].map(([tag, label]) => (
                                  <label className="flex items-center gap-2 text-sm font-semibold" key={tag}>
                                    <input
                                      checked={hasFieldTag(field, tag)}
                                      className="h-4 w-4"
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(form, field.id, {
                                            appearance: fieldAppearanceWithTag(field, tag, event.target.checked),
                                          }),
                                        )
                                      }
                                      type="checkbox"
                                    />
                                    {label}
                                  </label>
                                ))}
                              </div>
                            </section>
  );
}
