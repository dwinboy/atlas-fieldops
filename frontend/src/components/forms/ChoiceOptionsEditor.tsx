import { Plus, Trash2 } from "lucide-react";
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

/** Keyboard-first editor for a choice question's option list: Enter adds the next row, Backspace on
 * an empty row removes it, and pasting multiple lines creates many options at once. */
export function ChoiceOptionsEditor({
  onChange,
  options,
}: {
  onChange: (options: string[]) => void;
  options: string[];
}) {
  const optionsSignature = options.join("\u0000");
  const lastCommittedSignatureRef = useRef(optionsSignature);
  const [draftOptions, setDraftOptions] = useState<string[]>(normalizeChoiceDraftOptions(options));
  const optionRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (lastCommittedSignatureRef.current === optionsSignature) return;
    lastCommittedSignatureRef.current = optionsSignature;
    setDraftOptions(normalizeChoiceDraftOptions(options));
  }, [options, optionsSignature]);

  function commit(nextOptions: string[]): void {
    const cleaned = cleanChoiceOptions(nextOptions);
    lastCommittedSignatureRef.current = cleaned.join("\u0000");
    setDraftOptions(normalizeChoiceDraftOptions(nextOptions));
    onChange(cleaned);
  }

  function focusOption(index: number): void {
    window.setTimeout(() => optionRefs.current[index]?.focus(), 0);
  }

  function updateOption(index: number, value: string): void {
    const nextOptions = [...draftOptions];
    nextOptions[index] = value;
    commit(nextOptions);
  }

  function insertOption(afterIndex: number, value = ""): void {
    commit(insertChoiceOptionDraft(draftOptions, afterIndex, value));
    focusOption(afterIndex + 1);
  }

  function removeOption(index: number): void {
    commit(removeChoiceOptionDraft(draftOptions, index));
    focusOption(Math.max(0, index - 1));
  }

  return (
    <div className="mt-2 space-y-2">
      {draftOptions.map((option, index) => (
        <div className="flex items-center gap-2" key={`choice-${index}`}>
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
              commit(nextOptions);
              focusOption(index + nextOptions.length - draftOptions.length);
            }}
            placeholder={`Option ${index + 1}`}
            value={option}
          />
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
      <Button
        onClick={() => insertOption(draftOptions.length - 1)}
        size="sm"
        type="button"
        variant="secondary"
      >
        <Plus aria-hidden="true" />
        Add option
      </Button>
    </div>
  );
}
