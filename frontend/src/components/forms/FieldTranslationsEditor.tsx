import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input } from "@/components/ui/input";
import { type FormField } from "@/lib/forms";

/** Authors per-language label/hint for a question. Languages are shared across the form (the
 * union of every field's translations); adding one here makes it available on all questions. */
export function FieldTranslationsEditor({
  field,
  formLanguages,
  onChange,
  onAddLanguage,
}: {
  field: FormField;
  formLanguages: string[];
  onChange: (translations: NonNullable<FormField["translations"]>) => void;
  onAddLanguage: (language: string) => void;
}) {
  const translations = field.translations ?? {};
  const [newLanguage, setNewLanguage] = useState("");

  function patch(language: string, key: "label" | "hint", value: string) {
    onChange({
      ...translations,
      [language]: { ...translations[language], [key]: value || undefined },
    });
  }

  function patchOption(language: string, optionIndex: number, value: string) {
    const optionCount = field.options?.length ?? 0;
    const current = [...(translations[language]?.options ?? [])];
    while (current.length < optionCount) current.push("");
    current[optionIndex] = value;
    onChange({
      ...translations,
      [language]: { ...translations[language], options: current },
    });
  }

  function patchMatrix(language: string, kind: "matrixRows" | "matrixColumns", index: number, value: string, count: number) {
    const current = [...(translations[language]?.[kind] ?? [])];
    while (current.length < count) current.push("");
    current[index] = value;
    onChange({
      ...translations,
      [language]: { ...translations[language], [kind]: current },
    });
  }

  return (
    <section className="rounded-md border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Translations</p>
        <HelpHint label="About translations" title="Translations">
          The base label/help text is the form&apos;s default language. Add translated text per
          language; field officers switch language on the mobile app while collecting.
        </HelpHint>
      </div>
      {formLanguages.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No additional languages yet. Add one (e.g. French, Swahili) to translate this question.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {formLanguages.map((language) => (
            <div className="rounded-md border p-2" key={language}>
              <p className="text-xs font-semibold text-muted-foreground">{language}</p>
              <Input
                aria-label={`${language} label`}
                className="mt-2"
                onChange={(event) => patch(language, "label", event.target.value)}
                placeholder={`Label in ${language}`}
                value={translations[language]?.label ?? ""}
              />
              <Input
                aria-label={`${language} help text`}
                className="mt-2"
                onChange={(event) => patch(language, "hint", event.target.value)}
                placeholder={`Help text in ${language} (optional)`}
                value={translations[language]?.hint ?? ""}
              />
              {(field.options ?? []).length > 0 ? (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground">Option labels</p>
                  {(field.options ?? []).map((option, index) => (
                    <Input
                      aria-label={`${language} translation for option ${option}`}
                      className="text-xs"
                      key={`${language}-option-${index}`}
                      onChange={(event) => patchOption(language, index, event.target.value)}
                      placeholder={option}
                      value={translations[language]?.options?.[index] ?? ""}
                    />
                  ))}
                </div>
              ) : null}
              {field.matrix ? (
                <>
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground">Row labels</p>
                    {(field.matrix.rows ?? []).map((row, index) => (
                      <Input
                        className="text-xs"
                        key={`${language}-row-${index}`}
                        onChange={(event) => patchMatrix(language, "matrixRows", index, event.target.value, field.matrix?.rows?.length ?? 0)}
                        placeholder={row}
                        value={translations[language]?.matrixRows?.[index] ?? ""}
                      />
                    ))}
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground">Column labels</p>
                    {(field.matrix.columns ?? []).map((column, index) => (
                      <Input
                        className="text-xs"
                        key={`${language}-column-${index}`}
                        onChange={(event) => patchMatrix(language, "matrixColumns", index, event.target.value, field.matrix?.columns?.length ?? 0)}
                        placeholder={column}
                        value={translations[language]?.matrixColumns?.[index] ?? ""}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          aria-label="New language name"
          className="max-w-[200px]"
          onChange={(event) => setNewLanguage(event.target.value)}
          placeholder="Add a language (e.g. French)"
          value={newLanguage}
        />
        <Button
          disabled={!newLanguage.trim() || formLanguages.includes(newLanguage.trim())}
          onClick={() => {
            onAddLanguage(newLanguage.trim());
            setNewLanguage("");
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Plus aria-hidden="true" size={14} />
          Add language
        </Button>
      </div>
    </section>
  );
}
