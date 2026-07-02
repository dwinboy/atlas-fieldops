import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { HelpHint } from "@/components/ui/help-hint";
import { type FormControlsSettings } from "@/lib/api";

/** Form-level audit-trail view (recent change events). */
export function AuditControlsPanel({
  controls,
}: {
  controls: FormControlsSettings;
}) {
  return (
            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              <section className="rounded-lg border bg-background p-4">
                <ShieldCheck aria-hidden="true" className="text-primary" />
                <h3 className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
                  Immutable audit trail
                  <HelpHint label="About the audit trail" title="Immutable audit trail">
                    Every change to this form and its submissions is recorded and can never be edited
                    or deleted. This is what lets you prove to auditors and donors exactly who changed
                    what, and when. Exports of the log are limited to approved roles.
                  </HelpHint>
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Audit records cannot be deleted. High-risk events require a
                  reason and exports are restricted to approved roles.
                </p>
                <Badge
                  className="mt-3"
                  tone={
                    controls.audit.immutable ? "success" : "danger"
                  }
                >
                  {controls.audit.immutable
                    ? "Immutable"
                    : "Not immutable"}
                </Badge>
              </section>
              <section className="rounded-lg border bg-background p-4">
                <h3 className="text-sm font-semibold">Tracked events</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {controls.audit.tracked_events.map((event) => (
                    <span
                      className="rounded-md border bg-surface-container-lowest px-2 py-1 text-[11px] text-muted-foreground"
                      key={event}
                    >
                      {event.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
                <h3 className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
                  Reason required
                  <HelpHint label="About reason-required events" title="Reason required">
                    For these high-risk actions the person must type a short reason before the change
                    is saved (e.g. deleting a record or overriding a value). The reason is stored in
                    the audit trail.
                  </HelpHint>
                </h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {controls.audit.reason_required_events.map(
                    (event) => (
                      <span
                        className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px]"
                        key={event}
                      >
                        {event.replaceAll("_", " ")}
                      </span>
                    ),
                  )}
                </div>
              </section>
            </div>
  );
}
