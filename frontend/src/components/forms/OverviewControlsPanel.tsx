import { Check, Database, Workflow } from "lucide-react";

import { type FormControlsTab } from "@/components/forms/formControls";
import { HelpHint } from "@/components/ui/help-hint";
import { type FormControlsSettings } from "@/lib/api";

/** Form-controls overview tab (summary + quick links to other control tabs). */
export function OverviewControlsPanel({
  controls,
  onTabChange,
}: {
  controls: FormControlsSettings;
  onTabChange: (tab: FormControlsTab) => void;
}) {
  return (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold">Form controls</h3>
                <HelpHint label="About form controls" title="Form controls">
                  These settings govern the form as a whole — separate from individual questions.
                  They control which official lists feed it, who can see and edit it, how submitted
                  records are reviewed and approved, the data-quality rules that run, and the audit
                  and versioning policy. The cards below summarise each area; click one to configure it.
                </HelpHint>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  [
                    "Reference lists",
                    controls.reference_bindings.length,
                    "Controlled values attached",
                  ],
                  [
                    "Access rules",
                    controls.permission_rules.length,
                    "Roles, users, or teams",
                  ],
                  [
                    "Workflow stages",
                    controls.workflow_stages.length,
                    controls.governance.approval_workflow,
                  ],
                  [
                    "Quality checks",
                    controls.data_quality_rules.filter(
                      (rule) => rule.enabled,
                    ).length,
                    "Active controls",
                  ],
                ].map(([label, value, helper]) => (
                  <div
                    className="rounded-lg border bg-background p-3"
                    key={label}
                  >
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {helper}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <button
                  className="rounded-lg border bg-emerald-500/5 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => onTabChange("reference")}
                  type="button"
                >
                  <Database
                    aria-hidden="true"
                    className="text-emerald-700 dark:text-emerald-300"
                  />
                  <p className="mt-3 text-sm font-semibold">
                    Bind official lists
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Attach districts, schools, facilities, communities,
                    entities, donor codes, or custom master data to form
                    questions.
                  </p>
                </button>
                <button
                  className="rounded-lg border bg-sky-500/5 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => onTabChange("workflow")}
                  type="button"
                >
                  <Workflow
                    aria-hidden="true"
                    className="text-sky-700 dark:text-sky-300"
                  />
                  <p className="mt-3 text-sm font-semibold">
                    Choose the review path
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Use simple approval, supervisor review, data manager review,
                    or correction workflows before records become approved data.
                  </p>
                </button>
                <button
                  className="rounded-lg border bg-amber-500/5 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => onTabChange("quality")}
                  type="button"
                >
                  <Check
                    aria-hidden="true"
                    className="text-amber-700 dark:text-amber-300"
                  />
                  <p className="mt-3 text-sm font-semibold">
                    Protect data quality
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Set blocking rules for required fields, GPS, duplicate
                    records, consent, duration, and logical consistency.
                  </p>
                </button>
              </div>
            </div>
  );
}
