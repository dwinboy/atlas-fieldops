import { Palette } from "lucide-react";

import { CalculationBuilder } from "@/components/forms/CalculationBuilder";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import { updateField, type DynamicForm, type FormField } from "@/lib/forms";

/** Advanced/appearance settings tab (display width, mobile hint, style token, repeat-group limits). */
export function AppearanceSettingsPanel({
  field,
  form,
  onUpdateForm,
}: {
  field: FormField;
  form: DynamicForm;
  onUpdateForm: (form: DynamicForm) => void;
}) {
  return (
                            <section className="mt-4 space-y-4 rounded-lg border bg-surface-container-lowest p-4">
                              <div className="flex items-center gap-2">
                                <Palette
                                  aria-hidden="true"
                                  className="text-primary"
                                  size={16}
                                />
                                <h3 className="text-sm font-semibold">
                                  Advanced question settings
                                </h3><HelpHint label="About this tab" title="Advanced question settings">Power-user options: appearance, width, custom expressions, and developer-level settings.</HelpHint>
                              </div>
                              <div className="grid gap-3 lg:grid-cols-3">
                                <label className="text-sm font-semibold">
                                  Display width
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(
                                          form,
                                          field.id,
                                          {
                                            appearance: {
                                              ...field.appearance,
                                              width: event.target.value as
                                                | "full"
                                                | "half"
                                                | "third",
                                            },
                                          },
                                        ),
                                      )
                                    }
                                    value={
                                      field.appearance?.width ?? "full"
                                    }
                                  >
                                    <option value="full">Full width</option>
                                    <option value="half">Half width</option>
                                    <option value="third">Third width</option>
                                  </Select>
                                </label>
                                <label className="text-sm font-semibold">
                                  Mobile display hint
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(
                                          form,
                                          field.id,
                                          {
                                            appearance: {
                                              ...field.appearance,
                                              helpText:
                                                `${(field.appearance?.helpText ?? "").replace(/\[mobile:[^\]]+\]/g, "").trim()} ${event.target.value ? `[mobile:${event.target.value}]` : ""}`.trim(),
                                            },
                                          },
                                        ),
                                      )
                                    }
                                    value={
                                      field.appearance?.helpText?.match(
                                        /\[mobile:([^\]]+)\]/,
                                      )?.[1] ?? ""
                                    }
                                  >
                                    <option value="">Default</option>
                                    <option value="compact">Compact</option>
                                    <option value="large-tap">
                                      Large tap area
                                    </option>
                                    <option value="full-screen">
                                      Full-screen capture
                                    </option>
                                  </Select>
                                </label>
                                <label className="text-sm font-semibold">
                                  Custom style token
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(
                                          form,
                                          field.id,
                                          {
                                            appearance: {
                                              ...field.appearance,
                                              helpText:
                                                `${(field.appearance?.helpText ?? "").replace(/\[style:[^\]]+\]/g, "").trim()} ${event.target.value ? `[style:${event.target.value}]` : ""}`.trim(),
                                            },
                                          },
                                        ),
                                      )
                                    }
                                    placeholder="for example compact-card"
                                    value={
                                      field.appearance?.helpText?.match(
                                        /\[style:([^\]]+)\]/,
                                      )?.[1] ?? ""
                                    }
                                  />
                                </label>
                              </div>

                              {field.type === "repeat_group" ? (
                                <div className="grid gap-3 rounded-md border bg-background p-3 lg:grid-cols-3">
                                  <label className="text-sm font-semibold">
                                    Minimum repeats
                                    <Input
                                      className="mt-2"
                                      min={0}
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(
                                            form,
                                            field.id,
                                            {
                                              repeat: {
                                                ...field.repeat,
                                                min:
                                                  event.target.value === ""
                                                    ? undefined
                                                    : Number(
                                                        event.target.value,
                                                      ),
                                              },
                                            },
                                          ),
                                        )
                                      }
                                      type="number"
                                      value={field.repeat?.min ?? ""}
                                    />
                                  </label>
                                  <label className="text-sm font-semibold">
                                    Maximum repeats
                                    <Input
                                      className="mt-2"
                                      min={0}
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(
                                            form,
                                            field.id,
                                            {
                                              repeat: {
                                                ...field.repeat,
                                                max:
                                                  event.target.value === ""
                                                    ? undefined
                                                    : Number(
                                                        event.target.value,
                                                      ),
                                              },
                                            },
                                          ),
                                        )
                                      }
                                      type="number"
                                      value={field.repeat?.max ?? ""}
                                    />
                                  </label>
                                  <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
                                    <input
                                      checked={Boolean(
                                        field.repeat?.allowNested,
                                      )}
                                      className="h-4 w-4"
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(
                                            form,
                                            field.id,
                                            {
                                              repeat: {
                                                ...field.repeat,
                                                allowNested:
                                                  event.target.checked,
                                              },
                                            },
                                          ),
                                        )
                                      }
                                      type="checkbox"
                                    />
                                    Allow nested groups
                                  </label>
                                  <label className="flex items-center gap-2 pt-6 text-sm font-semibold lg:col-span-3">
                                    <input
                                      checked={Boolean(field.repeatEntity)}
                                      className="h-4 w-4"
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(form, field.id, {
                                            repeatEntity: event.target.checked
                                              ? { entityType: "Household Member", relationship: "member_of" }
                                              : undefined,
                                          }),
                                        )
                                      }
                                      type="checkbox"
                                    />
                                    Register each row as an entity
                                    <HelpHint label="About roster entities" title="Register each row as an entity">
                                      Turns each repeat row into a tracked record (e.g. each household
                                      member becomes a person entity) linked to this form’s main entity.
                                      Created when the submission is approved, so members can be followed
                                      up and counted on their own.
                                    </HelpHint>
                                  </label>
                                  {field.repeatEntity ? (
                                    <>
                                      <label className="text-sm font-medium">
                                        Entity type
                                        <Input
                                          className="mt-2"
                                          onChange={(event) =>
                                            onUpdateForm(
                                              updateField(form, field.id, {
                                                repeatEntity: { ...field.repeatEntity!, entityType: event.target.value },
                                              }),
                                            )
                                          }
                                          placeholder="e.g. Household Member"
                                          value={field.repeatEntity.entityType}
                                        />
                                      </label>
                                      <label className="text-sm font-medium">
                                        <span className="inline-flex items-center gap-1.5">
                                          Name each entity from
                                          <HelpHint label="About the name field" title="Name each entity from">
                                            Which question inside the repeat group provides each
                                            entity’s name (e.g. the member’s name). Defaults to the
                                            first text answer if left blank.
                                          </HelpHint>
                                        </span>
                                        <Select
                                          className="mt-2"
                                          onChange={(event) =>
                                            onUpdateForm(
                                              updateField(form, field.id, {
                                                repeatEntity: { ...field.repeatEntity!, nameVariable: event.target.value || undefined },
                                              }),
                                            )
                                          }
                                          value={field.repeatEntity.nameVariable ?? ""}
                                        >
                                          <option value="">First text answer</option>
                                          {(field.children ?? [])
                                            .filter((child) => child.variableName)
                                            .map((child) => (
                                              <option key={child.id} value={child.variableName}>
                                                {child.label}
                                              </option>
                                            ))}
                                        </Select>
                                      </label>
                                      <label className="text-sm font-medium">
                                        <span className="inline-flex items-center gap-1.5">
                                          Relationship to parent
                                          <HelpHint label="About the relationship" title="Relationship to parent">
                                            How each row relates to the main entity — stored on the link
                                            (e.g. <code>member_of</code>, <code>child_of</code>,
                                            <code>belongs_to</code>).
                                          </HelpHint>
                                        </span>
                                        <Input
                                          className="mt-2"
                                          onChange={(event) =>
                                            onUpdateForm(
                                              updateField(form, field.id, {
                                                repeatEntity: { ...field.repeatEntity!, relationship: event.target.value },
                                              }),
                                            )
                                          }
                                          placeholder="member_of"
                                          value={field.repeatEntity.relationship ?? ""}
                                        />
                                      </label>
                                    </>
                                  ) : null}
                                </div>
                              ) : null}

                              {[
                                "gps",
                                "geolocation",
                                "map",
                                "geofence",
                              ].includes(field.type) ? (
                                <div className="grid gap-3 rounded-md border bg-background p-3 lg:grid-cols-4">
                                  {[
                                    ["latitude", "Latitude"],
                                    ["longitude", "Longitude"],
                                    ["accuracy", "Accuracy"],
                                    ["timestamp", "Timestamp"],
                                  ].map(([key, label]) => (
                                    <label
                                      className="flex items-center gap-2 text-sm font-semibold"
                                      key={key}
                                    >
                                      <input
                                        checked={Boolean(
                                          field.gps?.[
                                            key as keyof NonNullable<
                                              FormField["gps"]
                                            >
                                          ] ?? true,
                                        )}
                                        className="h-4 w-4"
                                        onChange={(event) =>
                                          onUpdateForm(
                                            updateField(
                                              form,
                                              field.id,
                                              {
                                                gps: {
                                                  ...field.gps,
                                                  [key]: event.target.checked,
                                                },
                                              },
                                            ),
                                          )
                                        }
                                        type="checkbox"
                                      />
                                      {label}
                                    </label>
                                  ))}
                                  <label className="text-sm font-semibold lg:col-span-2">
                                    Geofence radius meters
                                    <Input
                                      className="mt-2"
                                      min={0}
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(
                                            form,
                                            field.id,
                                            {
                                              gps: {
                                                ...field.gps,
                                                geofenceRadius:
                                                  event.target.value === ""
                                                    ? undefined
                                                    : Number(
                                                        event.target.value,
                                                      ),
                                              },
                                            },
                                          ),
                                        )
                                      }
                                      type="number"
                                      value={
                                        field.gps?.geofenceRadius ?? ""
                                      }
                                    />
                                  </label>
                                  <label className="text-sm font-semibold lg:col-span-2">
                                    Max GPS accuracy meters
                                    <Input
                                      className="mt-2"
                                      min={0}
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(
                                            form,
                                            field.id,
                                            {
                                              validation: {
                                                ...field.validation,
                                                accuracyMax:
                                                  event.target.value === ""
                                                    ? undefined
                                                    : Number(
                                                        event.target.value,
                                                      ),
                                              },
                                            },
                                          ),
                                        )
                                      }
                                      type="number"
                                      value={
                                        field.validation?.accuracyMax ??
                                        ""
                                      }
                                    />
                                  </label>
                                </div>
                              ) : null}

                              {[
                                "photo",
                                "image",
                                "audio",
                                "video",
                                "file",
                                "signature",
                              ].includes(field.type) ? (
                                <div className="grid gap-3 rounded-md border bg-background p-3 lg:grid-cols-2">
                                  <label className="text-sm font-semibold">
                                    Media compression
                                    <Select
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(
                                            form,
                                            field.id,
                                            {
                                              media: {
                                                ...field.media,
                                                compression: event.target
                                                  .value as "standard" | "high",
                                              },
                                            },
                                          ),
                                        )
                                      }
                                      value={
                                        field.media?.compression ??
                                        "standard"
                                      }
                                    >
                                      <option value="standard">Standard</option>
                                      <option value="high">
                                        High compression
                                      </option>
                                    </Select>
                                  </label>
                                  <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
                                    <input
                                      checked={Boolean(
                                        field.media?.metadata,
                                      )}
                                      className="h-4 w-4"
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(
                                            form,
                                            field.id,
                                            {
                                              media: {
                                                ...field.media,
                                                metadata: event.target.checked,
                                              },
                                            },
                                          ),
                                        )
                                      }
                                      type="checkbox"
                                    />
                                    Capture metadata
                                  </label>
                                </div>
                              ) : null}

                              {field.type === "calculated" ? (
                                <CalculationBuilder
                                  compact
                                  field={field}
                                  form={form}
                                  onApplyPatch={(patch) =>
                                    onUpdateForm(updateField(form, field.id, patch))
                                  }
                                />
                              ) : null}
                            </section>
  );
}
