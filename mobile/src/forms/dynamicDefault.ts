import { evaluateExpressionValue } from "@/forms/expressionEngine";

const DATE_TYPES = new Set(["Date", "DateTime", "Time"]);

/**
 * Resolves a question's dynamic-default formula to a pre-fill value (used when the question first
 * opens and has no answer yet). Three shapes are handled specially so the result fits the answer:
 *
 * - `today()` on a date/time question → today's ISO date (`YYYY-MM-DD`), not a numeric serial.
 * - a bare `${variable}` → the prior answer copied verbatim (preserves arrays/multi-select).
 * - anything else → the calculation engine's typed result (number/string/boolean).
 *
 * Returns `undefined` when there is nothing to pre-fill.
 */
export function resolveDynamicDefault(
  expression: string | null | undefined,
  variableValues: Map<string, unknown>,
  questionType: string,
): unknown {
  const expr = (expression ?? "").trim();
  if (!expr) return undefined;

  // Bare ${var} copies the source answer as-is, so multi-select arrays and objects survive.
  const bare = expr.match(/^\$\{([^}]+)\}$/);
  if (bare) {
    const value = variableValues.get((bare[1] ?? "").trim());
    return value === undefined ? undefined : value;
  }

  // today() on a date-like question yields an ISO date rather than the engine's day serial.
  if (expr.replace(/\s/g, "").toLowerCase() === "today()" && DATE_TYPES.has(questionType)) {
    return new Date().toISOString().slice(0, 10);
  }

  const value = evaluateExpressionValue(expr, variableValues);
  return value === null ? undefined : value;
}
