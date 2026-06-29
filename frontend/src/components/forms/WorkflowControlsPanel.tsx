import { HelpHint } from "@/components/ui/help-hint";
import { Input } from "@/components/ui/input";
import { type FormControlsSettings } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Form-level workflow controls (review stages, presets). */
export function WorkflowControlsPanel({
  controls,
  onUpdateControls,
  onApplyWorkflowPreset,
}: {
  controls: FormControlsSettings;
  onUpdateControls: (updater: (controls: FormControlsSettings) => FormControlsSettings) => void;
  onApplyWorkflowPreset: (preset: "simple" | "standard" | "correction") => void;
}) {
  return (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold">Review &amp; approval workflow</h3>
                <HelpHint label="About the workflow" title="Review & approval workflow">
                  Decides what happens to a submission after a field officer sends it. Pick a preset,
                  then each <strong>stage</strong> lists who reviews and their <strong>SLA</strong>
                  {" "}(the target hours to act before it’s flagged as overdue). “Correction” lets
                  reviewers send a record back to the officer to fix and resubmit.
                </HelpHint>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {(
                  [
                    ["simple", "Simple", "Submitted to approved or rejected"],
                    [
                      "standard",
                      "Standard",
                      "Supervisor and data manager review",
                    ],
                    [
                      "correction",
                      "Correction",
                      "Return, resubmit, review, approve",
                    ],
                  ] satisfies [
                    "simple" | "standard" | "correction",
                    string,
                    string,
                  ][]
                ).map(([preset, label, helper]) => (
                  <button
                    className={cn(
                      "rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                      controls.governance.approval_workflow ===
                        preset && "border-primary/50 bg-primary/10",
                    )}
                    key={preset}
                    onClick={() => onApplyWorkflowPreset(preset)}
                    type="button"
                  >
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {helper}
                    </span>
                  </button>
                ))}
              </div>
              <div className="rounded-lg border bg-background p-4">
                <h3 className="text-sm font-semibold">Workflow stages</h3>
                <div className="mt-4 space-y-3">
                  {controls.workflow_stages.map((stage, index) => (
                    <div
                      className="grid gap-3 rounded-lg border bg-panel p-3 md:grid-cols-[40px_minmax(0,1fr)_160px]"
                      key={stage.id}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{stage.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {stage.reviewer_roles.join(", ")} ·{" "}
                          {stage.reviewer_location_scope}
                        </p>
                      </div>
                      <label className="text-xs font-medium">
                        SLA hours
                        <Input
                          className="mt-1"
                          min={1}
                          onChange={(event) =>
                            onUpdateControls((controls) => ({
                              ...controls,
                              workflow_stages: controls.workflow_stages.map(
                                (candidate) =>
                                  candidate.id === stage.id
                                    ? {
                                        ...candidate,
                                        sla_hours:
                                          Number(event.target.value) || 1,
                                      }
                                    : candidate,
                              ),
                            }))
                          }
                          type="number"
                          value={stage.sla_hours}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
  );
}
