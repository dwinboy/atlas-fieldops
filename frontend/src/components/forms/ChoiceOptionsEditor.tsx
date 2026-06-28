import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/** Drops blank rows and trims whitespace — the clean option list that is actually saved. */
export function cleanChoiceOptions(options: string[]): string[] {
  return options.map((option) => option.trim()).filter(Boolean);
}

/** Guarantees the editor always shows at least one (possibly empty) row to type into. */
export function normalizeChoiceDraftOptions(options: string[]): string[] {
  return options.length ? options : [""];
}

export function insertChoiceOptionDraft(options: string[], afterIndex: number, value = ""): string[] {
  const nextOptions = [...options];
  nextOptions.splice(afterIndex + 1, 0, value);
  return nextOptions;
}

export function removeChoiceOptionDraft(options: string[], index: number): string[] {
  return normalizeChoiceDraftOptions(options.filter((_, optionIndex) => optionIndex !== index));
}

/** Turns a multi-line paste into separate options; returns null when there's nothing to split. */
export function pasteChoiceOptionLines(options: string[], index: number, pastedText: string): string[] | null {
  const pastedLines = pastedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (pastedLines.length <= 1) return null;
  const nextOptions = [...options];
  nextOptions.splice(index, 1, ...pastedLines);
  return nextOptions;
}

/** Pads/truncates a parallel array so it stays index-aligned with the labels. */
function alignValues(values: string[], length: number): string[] {
  const next = values.slice(0, length);
  while (next.length < length) next.push("");
  return next;
}

/** Keyboard-first editor for a choice question's option list: Enter adds the next row, Backspace on
 * an empty row removes it, and pasting multiple lines creates many options at once. When `values` /
 * `onValuesChange` are supplied, authors can also set a stored answer code per option (for analysis
 * and integrations) and reorder options; codes stay aligned to their labels through every edit. */
export function ChoiceOptionsEditor({
  onChange,
  options,
  values,
  onValuesChange,
}: {
  onChange: (options: string[]) => void;
  options: string[];
  values?: string[];
  onValuesChange?: (values: string[]) => void;
}) {
  const optionsSignature = options.join("\u0000");
  const lastCommittedSignatureRef = useRef(optionsSignature);
  const [draftOptions, setDraftOptions] = useState<string[]>(normalizeChoiceDraftOptions(options));
  const [draftValues, setDraftValues] = useState<string[]>(
    alignValues(values ?? [], normalizeChoiceDraftOptions(options).length),
  );
  const [showCodes, setShowCodes] = useState<boolean>(Boolean(values?.some((value) => value?.trim())));
  const optionRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (lastCommittedSignatureRef.current === optionsSignature) return;
    lastCommittedSignatureRef.current = optionsSignature;
    const normalized = normalizeChoiceDraftOptions(options);
    setDraftOptions(normalized);
    setDraftValues(alignValues(values ?? [], normalized.length));
  }, [options, optionsSignature, values]);

  const codesEnabled = Boolean(onValuesChange);

  function commit(nextOptions: string[], nextValues: string[]): void {
    const aligned = alignValues(nextValues, nextOptions.length);
    // Keep codes only for rows whose label survives the trim/drop-blank cleaning.
    const keptValues: string[] = [];
    const cleaned: string[] = [];
    nextOptions.forEach((option, index) => {
      const label = option.trim();
      if (!label) return;
      cleaned.push(label);
      keptValues.push((aligned[index] ?? "").trim());
    });
    lastCommittedSignatureRef.current = cleaned.join("\u0000");
    const normalized = normalizeChoiceDraftOptions(nextOptions);
    setDraftOptions(normalized);
    setDraftValues(alignValues(nextValues, normalized.length));
    onChange(cleaned);
    onValuesChange?.(keptValues.some((value) => value) ? keptValues : []);
  }

  function focusOption(index: number): void {
    window.setTimeout(() => optionRefs.current[index]?.focus(), 0);
  }

  function updateOption(index: number, value: string): void {
    const nextOptions = [...draftOptions];
    nextOptions[index] = value;
    commit(nextOptions, draftValues);
  }

  function updateValue(index: number, value: string): void {
    const nextValues = alignValues(draftValues, draftOptions.length);
    nextValues[index] = value;
    commit(draftOptions, nextValues);
  }

  function insertOption(afterIndex: number, value = ""): void {
    commit(insertChoiceOptionDraft(draftOptions, afterIndex, value), insertChoiceOptionDraft(alignValues(draftValues, draftOptions.length), afterIndex, ""));
    focusOption(afterIndex + 1);
  }

  function removeOption(index: number): void {
    const nextValues = alignValues(draftValues, draftOptions.length).filter((_, valueIndex) => valueIndex !== index);
    commit(removeChoiceOptionDraft(draftOptions, index), nextValues);
    focusOption(Math.max(0, index - 1));
  }

  function moveOption(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= draftOptions.length) return;
    const nextOptions = [...draftOptions];
    const nextValues = alignValues(draftValues, draftOptions.length);
    [nextOptions[index], nextOptions[target]] = [nextOptions[target], nextOptions[index]];
    [nextValues[index], nextValues[target]] = [nextValues[target], nextValues[index]];
    commit(nextOptions, nextValues);
  }

  return (
    <div className="mt-2 space-y-2">
      {draftOptions.map((option, index) => (
        <div className="flex items-center gap-2" key={`choice-${index}`}>
          {draftOptions.length > 1 ? (
            <div className="flex flex-col">
              <button
                aria-label={`Move option ${index + 1} up`}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                disabled={index === 0}
                onClick={() => moveOption(index, -1)}
                type="button"
              >
                <ChevronUp aria-hidden="true" size={13} />
              </button>
              <button
                aria-label={`Move option ${index + 1} down`}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                disabled={index === draftOptions.length - 1}
                onClick={() => moveOption(index, 1)}
                type="button"
              >
                <ChevronDown aria-hidden="true" size={13} />
              </button>
            </div>
          ) : null}
          <input
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            aria-label={`Option ${index + 1}`}
            className="h-9 w-full rounded-lg border border-input bg-panel/95 px-2.5 text-sm text-foreground shadow-line transition-all duration-150 ease-product placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/15"
            onChange={(event) => updateOption(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                insertOption(index);
              }
              if (event.key === "Backspace" && !option && draftOptions.length > 1) {
                event.preventDefault();
                removeOption(index);
              }
            }}
            onPaste={(event) => {
              const nextOptions = pasteChoiceOptionLines(
                draftOptions,
                index,
                event.clipboardData.getData("text"),
              );
              if (!nextOptions) return;
              event.preventDefault();
              commit(nextOptions, draftValues);
              focusOption(index + nextOptions.length - draftOptions.length);
            }}
            placeholder={`Option ${index + 1}`}
            value={option}
          />
          {codesEnabled && showCodes ? (
            <input
              aria-label={`Answer code for option ${index + 1}`}
              className="h-9 w-32 rounded-lg border border-input bg-panel/95 px-2.5 text-sm text-foreground shadow-line placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/15"
              onChange={(event) => updateValue(index, event.target.value)}
              placeholder="code (auto)"
              value={draftValues[index] ?? ""}
            />
          ) : null}
          <Button
            aria-label={`Remove option ${index + 1}`}
            disabled={draftOptions.length === 1 && !option.trim()}
            onClick={() => removeOption(index)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" size={14} />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => insertOption(draftOptions.length - 1)}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Plus aria-hidden="true" />
          Add option
        </Button>
        {codesEnabled ? (
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <input
              checked={showCodes}
              className="h-3.5 w-3.5"
              onChange={(event) => {
                setShowCodes(event.target.checked);
                if (!event.target.checked) {
                  // Hiding codes clears any custom values (answers fall back to auto-derived codes).
                  setDraftValues(alignValues([], draftOptions.length));
                  onValuesChange?.([]);
                }
              }}
              type="checkbox"
            />
            Set answer codes
          </label>
        ) : null}
      </div>
    </div>
  );
}
