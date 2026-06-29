import { useMemo, useState } from "react";
import { AlertTriangle, FlaskConical, RotateCcw, ShieldCheck, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  exportedOptions,
  fieldTypeHasCapability,
  type DynamicForm,
  type FormField,
} from "@/lib/forms";
import { simulateForm } from "@/lib/formSimulator";
import { checkFormHealth } from "@/lib/formHealth";

/** In-builder "Preview & test" simulator. Builders enter trial answers and watch relevance, section
 * visibility, calculations, piping, and required-field checks update live — catching broken logic
 * before the form is published. Runs entirely in the browser with the mobile engine's semantics. */
export function FormPreviewTester({ form, onClose }: { form: DynamicForm; onClose: () => void }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const values = useMemo(() => new Map<string, unknown>(Object.entries(answers)), [answers]);
  const simulated = useMemo(() => simulateForm(form, values), [form, values]);
  const health = useMemo(() => checkFormHealth(form), [form]);
  const healthErrors = health.filter((issue) => issue.severity === "error");

  const keyOf = (field: FormField) => field.variableName ?? field.id;
  const setAnswer = (field: FormField, value: unknown) =>
    setAnswers((current) => ({ ...current, [keyOf(field)]: value }));

  const issues = simulated
    .filter((section) => section.visible)
    .flatMap((section) => section.fields.filter((entry) => entry.visible && entry.issue));
  const visibleCount = simulated
    .filter((section) => section.visible)
    .reduce((total, section) => total + section.fields.filter((entry) => entry.visible).length, 0);

  function renderInput(field: FormField, value: unknown) {
    if (field.type === "calculated") {
      return (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          {value === null || value === undefined || value === "" ? "—" : String(value)}{" "}
          <span className="text-xs text-muted-foreground">(calculated)</span>
        </div>
      );
    }
    if (field.options?.length) {
      const options = exportedOptions(field.options, field.optionValues);
      if (fieldTypeHasCapability(field.type, "multiSelect")) {
        const selected = Array.isArray(value) ? value.map(String) : [];
        return (
          <div className="grid gap-1 sm:grid-cols-2">
            {options.map((option) => (
              <label className="flex items-center gap-2 text-sm" key={option.value}>
                <input
                  checked={selected.includes(option.value)}
                  className="h-4 w-4"
                  onChange={(event) =>
                    setAnswer(
                      field,
                      event.target.checked
                        ? [...selected, option.value]
                        : selected.filter((item) => item !== option.value),
                    )
                  }
                  type="checkbox"
                />
                {option.label}
              </label>
            ))}
          </div>
        );
      }
      return (
        <Select onChange={(event) => setAnswer(field, event.target.value)} value={String(value ?? "")}>
          <option value="">Choose…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    }
    if (field.type === "yes_no") {
      return (
        <Select onChange={(event) => setAnswer(field, event.target.value)} value={String(value ?? "")}>
          <option value="">Choose…</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </Select>
      );
    }
    if (["number", "decimal", "currency", "percentage", "counter", "slider", "rating", "nps"].includes(field.type)) {
      return (
        <Input
          onChange={(event) => setAnswer(field, event.target.value === "" ? undefined : Number(event.target.value))}
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
        />
      );
    }
    if (field.type === "date") {
      return <Input onChange={(event) => setAnswer(field, event.target.value)} type="date" value={String(value ?? "")} />;
    }
    if (field.type === "textarea") {
      return <Textarea onChange={(event) => setAnswer(field, event.target.value)} value={String(value ?? "")} />;
    }
    return <Input onChange={(event) => setAnswer(field, event.target.value)} value={String(value ?? "")} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40" role="dialog" aria-modal="true">
      <div className="flex h-full w-full max-w-xl flex-col bg-background shadow-xl">
        <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <FlaskConical aria-hidden="true" className="text-primary" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Preview &amp; test</h2>
              <p className="text-xs text-muted-foreground">
                Enter trial answers — logic, calculations, and required checks update live.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button onClick={() => setAnswers({})} size="sm" type="button" variant="ghost">
              <RotateCcw aria-hidden="true" />
              Reset
            </Button>
            <Button aria-label="Close preview" onClick={onClose} size="icon" type="button" variant="ghost">
              <X aria-hidden="true" />
            </Button>
          </div>
        </header>

        <div className="flex items-center gap-2 border-b bg-panel/50 px-4 py-2 text-xs">
          <Badge tone={issues.length ? "danger" : "success"}>
            {issues.length ? `${issues.length} required answer${issues.length === 1 ? "" : "s"} missing` : "No blocking issues"}
          </Badge>
          <span className="text-muted-foreground">{visibleCount} question(s) shown right now</span>
        </div>

        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            {health.length === 0 ? (
              <ShieldCheck aria-hidden="true" className="text-emerald-600" size={16} />
            ) : (
              <AlertTriangle aria-hidden="true" className={healthErrors.length ? "text-destructive" : "text-amber-500"} size={16} />
            )}
            <p className="text-sm font-semibold">
              Form health{" "}
              {health.length === 0 ? (
                <span className="font-normal text-muted-foreground">— no structural problems</span>
              ) : (
                <span className="font-normal text-muted-foreground">
                  — {healthErrors.length} error{healthErrors.length === 1 ? "" : "s"}, {health.length - healthErrors.length} warning
                  {health.length - healthErrors.length === 1 ? "" : "s"}
                </span>
              )}
            </p>
          </div>
          {health.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {health.map((issue, index) => (
                <li className="flex items-start gap-2 text-xs" key={index}>
                  <Badge tone={issue.severity === "error" ? "danger" : "warning"}>{issue.severity}</Badge>
                  <span className="text-muted-foreground">{issue.message}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {simulated.filter((section) => section.visible).length === 0 ? (
            <p className="text-sm text-muted-foreground">No sections are visible with the current answers.</p>
          ) : (
            simulated
              .filter((section) => section.visible)
              .map((section) => {
                const shownFields = section.fields.filter((entry) => entry.visible);
                if (shownFields.length === 0) return null;
                return (
                  <section className="rounded-lg border bg-panel p-3" key={section.id}>
                    <h3 className="text-sm font-semibold">{section.title}</h3>
                    <div className="mt-3 space-y-4">
                      {shownFields.map((entry) => (
                        <div className="space-y-1.5" key={entry.field.id}>
                          <label className="block text-sm font-semibold">
                            {entry.label || entry.field.label}
                            {entry.required ? <span className="ml-1 text-destructive">*</span> : null}
                          </label>
                          {entry.hint ? <p className="text-xs text-muted-foreground">{entry.hint}</p> : null}
                          {renderInput(entry.field, answers[keyOf(entry.field)])}
                          {entry.issue ? <p className="text-xs text-destructive">{entry.issue}</p> : null}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
