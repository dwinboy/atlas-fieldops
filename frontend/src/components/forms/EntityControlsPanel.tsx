import { describeEntityCollectionWorkflow } from "@/components/forms/describeEntityCollectionWorkflow";
import { Badge } from "@/components/ui/badge";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import { type FormControlsSettings } from "@/lib/api";

/** Form-level entity/registration controls (entity type, ID strategy, dedup). */
export function EntityControlsPanel({
  controls,
  onUpdateControls,
}: {
  controls: FormControlsSettings;
  onUpdateControls: (updater: (controls: FormControlsSettings) => FormControlsSettings) => void;
}) {
  const selectedEntityWorkflow = describeEntityCollectionWorkflow(controls);
  return (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-lg border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
                      Entity &amp; duplicate controls
                      <HelpHint label="About entity controls" title="Entity & duplicate controls">
                        Decides whether each submission is tied to a tracked record (a “beneficiary
                        /entity” such as a farmer, household, or facility). You choose what kind of
                        record it is, how often it can be collected, and what happens when the system
                        thinks two records are the same person — so you don’t end up with duplicates
                        or unlinked data.
                      </HelpHint>
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Set the exact collection rule for this form so field teams know whether they should register a new record, select an existing one, or work without entity linkage.
                    </p>
                  </div>
                  <Badge tone={selectedEntityWorkflow.tone}>
                    {selectedEntityWorkflow.badge}
                  </Badge>
                </div>
                <div className="mt-3 rounded-lg border bg-surface-container-lowest p-3 text-sm text-muted-foreground">
                  {selectedEntityWorkflow.description}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      Entity type
                      <HelpHint label="About entity type" title="Entity type">
                        What kind of record submissions attach to (farmer, household, facility, …).
                        This labels the record everywhere and groups data by that unit.
                      </HelpHint>
                    </span>
                  <Select
                    className="mt-1"
                    value={
                      controls.entity_controls?.entity_type ??
                      "Farmer"
                    }
                    onChange={(event) =>
                      onUpdateControls((controls) => ({
                        ...controls,
                        entity_controls: {
                          ...controls.entity_controls!,
                          entity_type: event.target.value,
                        },
                      }))
                    }
                  >
                    {[
                      "Farmer",
                      "Household",
                      "Entity",
                      "Facility",
                      "School",
                      "Village",
                      "Group",
                      "Training Participant",
                      "Health Worker",
                      "Custom Entity",
                    ].map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </Select>
                  </label>
                  <label className="text-xs font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      How often per entity
                      <HelpHint label="About submission frequency" title="How often per entity">
                        How many times this form may be collected for the same record — e.g. once
                        ever (registration), once per project, or unlimited (routine monitoring).
                        Extra attempts are blocked or flagged.
                      </HelpHint>
                    </span>
                  <Select
                    className="mt-1"
                    value={
                      controls.entity_controls
                        ?.submission_frequency ?? "once_per_project"
                    }
                    onChange={(event) =>
                      onUpdateControls((controls) => ({
                        ...controls,
                        entity_controls: {
                          ...controls.entity_controls!,
                          submission_frequency: event.target.value,
                        },
                      }))
                    }
                  >
                    <option value="once_ever">Once ever per entity</option>
                    <option value="once_per_project">
                      Once per project per entity
                    </option>
                    <option value="once_per_year">Once per year</option>
                    <option value="once_per_season">Once per season</option>
                    <option value="once_per_quarter">Once per quarter</option>
                    <option value="once_per_month">Once per month</option>
                    <option value="once_per_event">Once per event</option>
                    <option value="unlimited">Unlimited repeat submissions</option>
                  </Select>
                  </label>
                  <label className="text-xs font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      When a likely duplicate is found
                      <HelpHint label="About duplicate action" title="When a likely duplicate is found">
                        What to do when a new record scores above the match threshold against an
                        existing one: <strong>Block</strong> stops it, <strong>Warn</strong> lets the
                        officer proceed, <strong>Review</strong> sends it to a supervisor to decide.
                      </HelpHint>
                    </span>
                  <Select
                    className="mt-1"
                    value={
                      controls.entity_controls?.duplicate_action ??
                      "block"
                    }
                    onChange={(event) =>
                      onUpdateControls((controls) => ({
                        ...controls,
                        entity_controls: {
                          ...controls.entity_controls!,
                          duplicate_action: event.target
                            .value as NonNullable<
                            FormControlsSettings["entity_controls"]
                          >["duplicate_action"],
                        },
                      }))
                    }
                  >
                    <option value="block">Block likely duplicates</option>
                    <option value="warn">Warn only</option>
                    <option value="review">Send to supervisor review</option>
                  </Select>
                  </label>
                  <label className="text-xs font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      Duplicate match threshold
                      <HelpHint label="About the match threshold" title="Duplicate match threshold">
                        The match score (0–100) at or above which two records are treated as the same.
                        Scores come from the rules on the right (ID, phone, name+DOB, GPS…). Higher =
                        stricter (fewer flagged); lower = catches more possible duplicates.
                      </HelpHint>
                    </span>
                  <Input
                    className="mt-1"
                    max={100}
                    min={0}
                    type="number"
                    value={
                      controls.entity_controls
                        ?.duplicate_threshold ?? 90
                    }
                    onChange={(event) =>
                      onUpdateControls((controls) => ({
                        ...controls,
                        entity_controls: {
                          ...controls.entity_controls!,
                          duplicate_threshold: Number(event.target.value) || 0,
                        },
                      }))
                    }
                  />
                  </label>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {[
                    [
                      "linked_to_entity",
                      "Track this form against an entity record",
                      "Turn this on when submissions should link to a person, household, facility, customer, asset, case, product, or other tracked record.",
                    ],
                    [
                      "creates_new_entity",
                      `Allow this form to register new ${selectedEntityWorkflow.entityLabel.toLowerCase()} records`,
                      "Use this for registration, intake, onboarding, or any workflow that creates a first official record.",
                    ],
                    [
                      "requires_existing_entity",
                      `Require field teams to select an existing ${selectedEntityWorkflow.entityLabel.toLowerCase()}`,
                      "Use this for follow-up, monitoring, attendance, inspection, service, delivery, or update workflows.",
                    ],
                    [
                      "updates_existing_entity",
                      `Allow approved submissions to update the official ${selectedEntityWorkflow.entityLabel.toLowerCase()} profile`,
                      "Use this when the form should push reviewed changes back to the tracked record after approval.",
                    ],
                    [
                      "allows_anonymous",
                      "Allow anonymous submissions",
                      "Only use where no entity history is needed.",
                    ],
                    [
                      "prefill_profile",
                      "Pre-fill from profile",
                      "Load known name, phone, village, household ID, and GPS.",
                    ],
                    [
                      "lock_prefilled_fields",
                      "Lock pre-filled fields",
                      "Prevent field officers from changing trusted profile values.",
                    ],
                    [
                      "editable_with_reason",
                      "Edits require reason",
                      "Require a note when profile values are corrected.",
                    ],
                  ].map(([key, label, helper]) => (
                    <label
                      className="flex items-start gap-3 rounded-lg border bg-surface-container-lowest p-3 text-sm"
                      key={key}
                    >
                      <input
                        checked={Boolean(
                          controls.entity_controls?.[
                            key as keyof NonNullable<
                              FormControlsSettings["entity_controls"]
                            >
                          ],
                        )}
                        className="mt-1"
                        onChange={(event) =>
                          onUpdateControls((controls) => ({
                            ...controls,
                            entity_controls: {
                              ...controls.entity_controls!,
                              [key]: event.target.checked,
                            },
                          }))
                        }
                        type="checkbox"
                      />
                      <span>
                        <span className="block font-medium">{label}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {helper}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
              <aside className="space-y-3">
                <div className="rounded-lg border bg-background p-4">
                  <h3 className="text-sm font-semibold">Duplicate scoring</h3>
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    {[
                      "National ID match: 100",
                      "Phone match: 80",
                      "Household ID match: 90",
                      "Name + DOB match: 75",
                      "Name + village match: 60",
                      "GPS within 50m: 40",
                    ].map((line) => (
                      <p className="rounded-md border bg-surface-container-lowest px-3 py-2" key={line}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <h3 className="text-sm font-semibold">Mobile-ready sync</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Future mobile sync will receive assigned entities,
                    published form versions, duplicate rules, frequency rules,
                    prefill mappings, returned submissions, and sync conflict
                    placeholders.
                  </p>
                </div>
              </aside>
            </div>
  );
}
