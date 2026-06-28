// Mirrors mobile/src/forms/pipeText.ts so the in-builder simulator pipes answers like the app.
/**
 * Answer piping: replaces `${variableName}` tokens in question text (labels, hints, repeat-row
 * labels) with the respondent's current answers, so a form can say "How old is ${child_name}?" and
 * show the actual name. Tokens with no answer yet collapse to an empty string; `${repeat.field}`
 * style dotted paths fall back to the head variable. Text without any token is returned unchanged.
 */
export function pipeText(text: string | null | undefined, values: Map<string, unknown>): string {
  if (!text) return text ?? "";
  if (!text.includes("${")) return text;
  return text.replace(/\$\{([^}]+)\}/g, (_match, raw: string) => {
    const key = String(raw).trim();
    const value = values.has(key) ? values.get(key) : values.get(key.split(".")[0] ?? key);
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
    if (typeof value === "object") return "";
    return String(value);
  });
}
