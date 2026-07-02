import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { createDefaultFormControls } from "@/components/forms/formControls";
import { type FormControlsSettings } from "@/lib/api";
import { type DynamicForm } from "@/lib/forms";

/** Form-level permissions controls (role access, edit rules). */
export function PermissionsControlsPanel({
  form,
  controls,
  onUpdateControls,
}: {
  form: DynamicForm | undefined;
  controls: FormControlsSettings;
  onUpdateControls: (updater: (controls: FormControlsSettings) => FormControlsSettings) => void;
}) {
  return (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    Per-form access control
                    <HelpHint label="About access control" title="Per-form access control">
                      Who can see, fill, edit, or approve this form. Access starts from the project’s
                      roles and you can narrow it here. <strong>Read only</strong> roles can view but
                      not change. <strong>Location scope</strong> limits a role to their own area.
                      “Add reviewer” grants view-only access to an outside reviewer.
                    </HelpHint>
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Permissions inherit from the project, then M&E Managers can
                    narrow access for this form.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      onUpdateControls((controls) => ({
                        ...controls,
                        permission_rules:
                          createDefaultFormControls(form)
                            .permission_rules,
                      }))
                    }
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Standard roles
                  </Button>
                  <Button
                    onClick={() =>
                      onUpdateControls((controls) => ({
                        ...controls,
                        permission_rules: [
                          ...controls.permission_rules,
                          {
                            subject_type: "role",
                            subject_name: "External Reviewer",
                            permissions: ["view_form", "view_submissions"],
                            location_scope: "project",
                            can_approve_own_submission: false,
                            read_only: true,
                          },
                        ],
                      }))
                    }
                    size="sm"
                    type="button"
                    variant="primary"
                  >
                    Add reviewer
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {controls.permission_rules.map((rule) => (
                  <div
                    className="rounded-lg border bg-background p-4"
                    key={`${rule.subject_type}-${rule.subject_name}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {rule.subject_name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {rule.subject_type} · {rule.location_scope}
                        </p>
                      </div>
                      <Badge tone={rule.read_only ? "neutral" : "accent"}>
                        {rule.read_only ? "Read only" : "Active"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {rule.permissions.map((permission) => (
                        <span
                          className="rounded-md border bg-surface-container-lowest px-2 py-1 text-[11px] text-muted-foreground"
                          key={permission}
                        >
                          {permission.replaceAll("_", " ")}
                        </span>
                      ))}
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        checked={rule.can_approve_own_submission}
                        onChange={(event) =>
                          onUpdateControls((controls) => ({
                            ...controls,
                            permission_rules: controls.permission_rules.map(
                              (candidate) =>
                                candidate.subject_name === rule.subject_name
                                  ? {
                                      ...candidate,
                                      can_approve_own_submission:
                                        event.target.checked,
                                    }
                                  : candidate,
                            ),
                          }))
                        }
                        type="checkbox"
                      />
                      Allow own submission approval
                      <HelpHint label="About self-approval" title="Allow own submission approval">
                        When off (recommended), a person can’t approve a record they submitted
                        themselves — enforcing separation of duties. Turn on only for small teams
                        where the same person collects and approves.
                      </HelpHint>
                    </label>
                  </div>
                ))}
              </div>
            </div>
  );
}
