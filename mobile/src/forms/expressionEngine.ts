type EvalResult = number | number[];

type OpValue = "+" | "-" | "*" | "/" | "(" | ")" | ",";

type Token =
  | { type: "number"; value: number }
  | { type: "placeholder"; path: string }
  | { type: "ident"; value: string }
  | { type: "op"; value: OpValue };

const FUNCTIONS: Record<string, (args: EvalResult[]) => number> = {
  sum: (args) => args.reduce((total: number, arg) => total + flattenSum(arg), 0),
};

/**
 * Evaluates a Calculate-logic expression using `${variableName}` placeholders
 * resolved against the form's current responses (keyed by question variable
 * name). Supports `+ - * / ()`, numeric literals, and `sum(...)`.
 *
 * `${repeatVariable}` placeholders that resolve to a RepeatGroup's rows are
 * flattened to the sum of every numeric cell; `${repeatVariable.fieldId}`
 * resolves to the sum of that column across all rows. Returns `null` if the
 * expression is empty or cannot be parsed/evaluated.
 */
export function evaluateExpression(expression: string, variables: Map<string, unknown>): number | null {
  if (!expression || !expression.trim()) return null;
  try {
    const tokens = tokenize(expression);
    if (tokens.length === 0) return null;
    const result = new Parser(tokens, variables).parse();
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
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
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "(" || ch === ")" || ch === ",") {
      tokens.push({ type: "op", value: ch });
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

  parse(): number {
    const result = this.parseExpression();
    if (this.pos < this.tokens.length) {
      throw new Error("Unexpected trailing tokens in expression");
    }
    return flattenSum(result);
  }

  private parseExpression(): EvalResult {
    let value = this.parseTerm();
    while (this.peekOp("+") || this.peekOp("-")) {
      const op = this.nextOp();
      const rhs = this.parseTerm();
      value = op === "+" ? flattenSum(value) + flattenSum(rhs) : flattenSum(value) - flattenSum(rhs);
    }
    return value;
  }

  private parseTerm(): EvalResult {
    let value = this.parseFactor();
    while (this.peekOp("*") || this.peekOp("/")) {
      const op = this.nextOp();
      const rhs = this.parseFactor();
      value = op === "*" ? flattenSum(value) * flattenSum(rhs) : flattenSum(value) / flattenSum(rhs);
    }
    return value;
  }

  private parseFactor(): EvalResult {
    const token = this.tokens[this.pos];
    if (!token) throw new Error("Unexpected end of expression");

    if (token.type === "op" && token.value === "-") {
      this.pos++;
      return -flattenSum(this.parseFactor());
    }
    if (token.type === "op" && token.value === "(") {
      this.pos++;
      const value = this.parseExpression();
      this.expectOp(")");
      return value;
    }
    if (token.type === "number") {
      this.pos++;
      return token.value;
    }
    if (token.type === "placeholder") {
      this.pos++;
      return resolveValue(token.path, this.variables);
    }
    if (token.type === "ident") {
      this.pos++;
      this.expectOp("(");
      const args: EvalResult[] = [];
      if (!this.peekOp(")")) {
        args.push(this.parseExpression());
        while (this.peekOp(",")) {
          this.pos++;
          args.push(this.parseExpression());
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

function callFunction(name: string, args: EvalResult[]): number {
  const fn = FUNCTIONS[name];
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
      .map((row) => (isRecord(row) ? toNumber(row[key]) : NaN))
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

  return toNumber(raw);
}

function flattenSum(value: EvalResult): number {
  return Array.isArray(value) ? value.reduce((total, item) => total + item, 0) : value;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
