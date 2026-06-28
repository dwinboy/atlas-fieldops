// Mirrors mobile/src/forms/expressionEngine.ts so the in-builder simulator computes calculations
// exactly as the mobile app does. Keep the two in sync when changing the formula grammar.
type EvalResult = number | number[] | string | boolean;

type OpValue =
  | "+"
  | "-"
  | "*"
  | "/"
  | "("
  | ")"
  | ","
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "&&"
  | "||"
  | "!";

type Token =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "placeholder"; path: string }
  | { type: "ident"; value: string }
  | { type: "op"; value: OpValue };

const MS_PER_DAY = 86_400_000;

// ── Coercion helpers ───────────────────────────────────────────────────────
function flattenArgs(args: EvalResult[]): number[] {
  return args.flatMap((arg) => (Array.isArray(arg) ? arg : [toNum(arg)]));
}

function toNum(value: EvalResult): number {
  if (Array.isArray(value)) return value.reduce((total, item) => total + item, 0);
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value;
  if (value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
}

function toBool(value: EvalResult): boolean {
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return value !== 0;
  const lowered = String(value).trim().toLowerCase();
  return lowered !== "" && lowered !== "false" && lowered !== "0" && lowered !== "no";
}

function toStr(value: EvalResult): string {
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/** Parses a date-ish value (ISO string or a day serial) to a whole-day serial, or null. */
function toDateSerial(value: EvalResult): number | null {
  if (typeof value === "number") return Math.floor(value);
  const text = String(value).trim();
  if (!text) return null;
  const ms = Date.parse(text);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / MS_PER_DAY);
}

function todaySerial(): number {
  return Math.floor(Date.now() / MS_PER_DAY);
}

// ── Functions ──────────────────────────────────────────────────────────────
const FUNCTIONS: Record<string, (args: EvalResult[]) => EvalResult> = {
  sum: (args) => flattenArgs(args).reduce((total, value) => total + value, 0),
  count: (args) => flattenArgs(args).length,
  avg: (args) => {
    const values = flattenArgs(args);
    return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
  },
  min: (args) => {
    const values = flattenArgs(args);
    return values.length ? Math.min(...values) : 0;
  },
  max: (args) => {
    const values = flattenArgs(args);
    return values.length ? Math.max(...values) : 0;
  },
  abs: (args) => Math.abs(toNum(args[0] ?? 0)),
  floor: (args) => Math.floor(toNum(args[0] ?? 0)),
  ceil: (args) => Math.ceil(toNum(args[0] ?? 0)),
  round: (args) => {
    const places = args.length > 1 ? Math.max(0, Math.trunc(toNum(args[1]))) : 0;
    const factor = 10 ** places;
    return Math.round(toNum(args[0] ?? 0) * factor) / factor;
  },
  // Conditional: if(condition, whenTrue, whenFalse). Lets builders branch a calculation.
  if: (args) => (toBool(args[0] ?? false) ? args[1] ?? 0 : args[2] ?? 0),
  // First non-empty argument — handy for fallbacks (coalesce(${a}, ${b}, "N/A")).
  coalesce: (args) => args.find((arg) => !isEmpty(arg)) ?? "",
  // Joins all arguments into one string (numbers and text alike).
  concat: (args) => args.map(toStr).join(""),
  // Today as a day serial; basis for age()/datediff().
  today: () => todaySerial(),
  // Whole years between a date of birth and today.
  age: (args) => {
    const dob = toDateSerial(args[0] ?? "");
    if (dob === null) return 0;
    return Math.floor((todaySerial() - dob) / 365.25);
  },
  // Whole days from the second date to the first (datediff(end, start)).
  datediff: (args) => {
    const end = toDateSerial(args[0] ?? "");
    const start = toDateSerial(args[1] ?? "");
    if (end === null || start === null) return 0;
    return end - start;
  },
};

function isEmpty(value: EvalResult): boolean {
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "number") return false;
  if (typeof value === "boolean") return false;
  return String(value).trim() === "";
}

/**
 * Evaluates a calculation/condition expression against the form's current responses (keyed by
 * question variable name). Supports arithmetic (`+ - * / ()`), comparisons (`== != > < >= <=`),
 * logical operators (`&& || !`), string and number literals, `${variable}` placeholders, and the
 * function library (sum, count, avg, min, max, round, abs, floor, ceil, if, coalesce, concat,
 * today, age, datediff). `${repeatVariable.fieldId}` resolves to that column across all repeat rows.
 *
 * Returns the typed result (number | string | boolean) or null when the expression is empty or
 * cannot be parsed/evaluated.
 */
export function evaluateExpressionValue(
  expression: string,
  variables: Map<string, unknown>,
): number | string | boolean | null {
  if (!expression || !expression.trim()) return null;
  try {
    const tokens = tokenize(expression);
    if (tokens.length === 0) return null;
    const result = new Parser(tokens, variables).parse();
    const value = Array.isArray(result) ? result.reduce((total, item) => total + item, 0) : result;
    if (typeof value === "number" && !Number.isFinite(value)) return null;
    return value;
  } catch {
    return null;
  }
}

/**
 * Numeric-only convenience wrapper around {@link evaluateExpressionValue} for callers that store a
 * number (e.g. scoring fields). Booleans coerce to 1/0, numeric strings parse, anything else → null.
 */
export function evaluateExpression(expression: string, variables: Map<string, unknown>): number | null {
  const value = evaluateExpressionValue(expression, variables);
  if (value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? 1 : 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expression.length) {
    const ch = expression[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "$" && expression[i + 1] === "{") {
      const end = expression.indexOf("}", i + 2);
      if (end === -1) throw new Error("Unterminated placeholder in expression");
      tokens.push({ type: "placeholder", path: expression.slice(i + 2, end).trim() });
      i = end + 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      let literal = "";
      while (j < expression.length && expression[j] !== ch) {
        if (expression[j] === "\\" && j + 1 < expression.length) {
          literal += expression[j + 1];
          j += 2;
          continue;
        }
        literal += expression[j];
        j++;
      }
      if (j >= expression.length) throw new Error("Unterminated string in expression");
      tokens.push({ type: "string", value: literal });
      i = j + 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < expression.length && /[0-9.]/.test(expression[j])) j++;
      tokens.push({ type: "number", value: Number(expression.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < expression.length && /[A-Za-z0-9_]/.test(expression[j])) j++;
      tokens.push({ type: "ident", value: expression.slice(i, j) });
      i = j;
      continue;
    }
    // Two-character operators first.
    const two = expression.slice(i, i + 2);
    if (two === "==" || two === "!=" || two === ">=" || two === "<=" || two === "&&" || two === "||") {
      tokens.push({ type: "op", value: two });
      i += 2;
      continue;
    }
    // A lone "=" is treated as equality, so builders can write `if(${x} = 'Yes', …)` the same way
    // they write logic conditions (>=, <=, != are already handled by the two-character check above).
    if (ch === "=") {
      tokens.push({ type: "op", value: "==" });
      i++;
      continue;
    }
    if ("+-*/(),<>!".includes(ch)) {
      tokens.push({ type: "op", value: ch as OpValue });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${ch}" in expression`);
  }
  return tokens;
}

class Parser {
  private pos = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly variables: Map<string, unknown>,
  ) {}

  parse(): EvalResult {
    const result = this.parseOr();
    if (this.pos < this.tokens.length) {
      throw new Error("Unexpected trailing tokens in expression");
    }
    return result;
  }

  private parseOr(): EvalResult {
    let value = this.parseAnd();
    while (this.peekOp("||")) {
      this.pos++;
      const rhs = this.parseAnd();
      value = toBool(value) || toBool(rhs);
    }
    return value;
  }

  private parseAnd(): EvalResult {
    let value = this.parseComparison();
    while (this.peekOp("&&")) {
      this.pos++;
      const rhs = this.parseComparison();
      value = toBool(value) && toBool(rhs);
    }
    return value;
  }

  private parseComparison(): EvalResult {
    const left = this.parseAdditive();
    for (const op of ["==", "!=", ">=", "<=", ">", "<"] as const) {
      if (this.peekOp(op)) {
        this.pos++;
        const right = this.parseAdditive();
        return compare(op, left, right);
      }
    }
    return left;
  }

  private parseAdditive(): EvalResult {
    let value = this.parseTerm();
    while (this.peekOp("+") || this.peekOp("-")) {
      const op = this.nextOp();
      const rhs = this.parseTerm();
      value = op === "+" ? toNum(value) + toNum(rhs) : toNum(value) - toNum(rhs);
    }
    return value;
  }

  private parseTerm(): EvalResult {
    let value = this.parseFactor();
    while (this.peekOp("*") || this.peekOp("/")) {
      const op = this.nextOp();
      const rhs = this.parseFactor();
      value = op === "*" ? toNum(value) * toNum(rhs) : toNum(value) / toNum(rhs);
    }
    return value;
  }

  private parseFactor(): EvalResult {
    const token = this.tokens[this.pos];
    if (!token) throw new Error("Unexpected end of expression");

    if (token.type === "op" && token.value === "-") {
      this.pos++;
      return -toNum(this.parseFactor());
    }
    if (token.type === "op" && token.value === "!") {
      this.pos++;
      return !toBool(this.parseFactor());
    }
    if (token.type === "op" && token.value === "(") {
      this.pos++;
      const value = this.parseOr();
      this.expectOp(")");
      return value;
    }
    if (token.type === "number") {
      this.pos++;
      return token.value;
    }
    if (token.type === "string") {
      this.pos++;
      return token.value;
    }
    if (token.type === "placeholder") {
      this.pos++;
      return resolveValue(token.path, this.variables);
    }
    if (token.type === "ident") {
      this.pos++;
      // Bare identifiers (true/false) double as boolean literals.
      if (!this.peekOp("(")) {
        const lowered = token.value.toLowerCase();
        if (lowered === "true") return true;
        if (lowered === "false") return false;
        return token.value;
      }
      this.expectOp("(");
      const args: EvalResult[] = [];
      if (!this.peekOp(")")) {
        args.push(this.parseOr());
        while (this.peekOp(",")) {
          this.pos++;
          args.push(this.parseOr());
        }
      }
      this.expectOp(")");
      return callFunction(token.value, args);
    }
    throw new Error("Unexpected token in expression");
  }

  private peekOp(value: OpValue): boolean {
    const token = this.tokens[this.pos];
    return token?.type === "op" && token.value === value;
  }

  private nextOp(): OpValue {
    const token = this.tokens[this.pos];
    if (!token || token.type !== "op") throw new Error("Expected operator in expression");
    this.pos++;
    return token.value;
  }

  private expectOp(value: OpValue): void {
    if (!this.peekOp(value)) {
      throw new Error(`Expected "${value}" in expression`);
    }
    this.pos++;
  }
}

function compare(op: "==" | "!=" | ">=" | "<=" | ">" | "<", left: EvalResult, right: EvalResult): boolean {
  if (op === "==" || op === "!=") {
    const ln = toNum(left);
    const rn = toNum(right);
    const equal =
      Number.isFinite(ln) && Number.isFinite(rn) ? ln === rn : toStr(left) === toStr(right);
    return op === "==" ? equal : !equal;
  }
  const ln = toNum(left);
  const rn = toNum(right);
  if (!Number.isFinite(ln) || !Number.isFinite(rn)) return false;
  if (op === ">=") return ln >= rn;
  if (op === "<=") return ln <= rn;
  return op === ">" ? ln > rn : ln < rn;
}

function callFunction(name: string, args: EvalResult[]): EvalResult {
  const fn = FUNCTIONS[name.toLowerCase()];
  if (!fn) throw new Error(`Unknown function "${name}" in expression`);
  return fn(args);
}

function resolveValue(path: string, variables: Map<string, unknown>): EvalResult {
  const [head, ...rest] = path.split(".");
  const raw = variables.get(head);

  if (rest.length > 0) {
    if (!Array.isArray(raw)) return 0;
    const key = rest.join(".");
    return raw
      .map((row) => (isRecord(row) ? toNumber(row[key]) : Number.NaN))
      .filter((n) => !Number.isNaN(n));
  }

  if (Array.isArray(raw)) {
    const numbers: number[] = [];
    for (const row of raw) {
      if (isRecord(row)) {
        for (const cell of Object.values(row)) {
          const n = toNumber(cell);
          if (!Number.isNaN(n)) numbers.push(n);
        }
      } else {
        const n = toNumber(row);
        if (!Number.isNaN(n)) numbers.push(n);
      }
    }
    return numbers;
  }

  // Return the raw scalar so date/text functions see strings; arithmetic coerces via toNum.
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "number" || typeof raw === "boolean") return raw;
  return String(raw);
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
