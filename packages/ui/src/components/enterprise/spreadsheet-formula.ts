/** 有界、无动态代码执行的轻量公式解析器；不是完整 Excel 公式引擎。 */
export const FORMULA_LIMITS = Object.freeze({ length: 2048, tokens: 1024, depth: 64, work: 10000, range: 10000 });
export type FormulaErrorCode = '#VALUE!' | '#REF!' | '#NAME?' | '#DIV/0!' | '#NUM!' | '#CYCLE!' | '#LIMIT!';
type CellValue = number | string | null;
type Token = { kind: 'number' | 'cell' | 'name' | 'symbol' | 'end'; text: string };

class FormulaError extends Error {
  readonly code: FormulaErrorCode;
  constructor(code: FormulaErrorCode) { super(code); this.code = code; }
}
function fail(code: FormulaErrorCode): never { throw new FormulaError(code); }
function finite(value: number): number { return Number.isFinite(value) ? value : fail('#NUM!'); }
function numeric(value: CellValue): number {
  if (value === null) return 0;
  return typeof value === 'number' ? value : fail('#VALUE!');
}
const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

function address(key: string): { column: number; row: number } {
  const match = /^\$?([A-Z]+)\$?(\d+)$/i.exec(key);
  if (!match?.[1] || !match[2]) return fail('#REF!');
  let column = 0;
  for (const char of match[1].toUpperCase()) {
    column = column * 26 + char.charCodeAt(0) - 64;
    if (column > 16384) return fail('#REF!');
  }
  const row = Number(match[2]);
  if (row < 1 || row > 1048576 || !Number.isSafeInteger(row)) return fail('#REF!');
  return { column, row };
}
function columnName(column: number): string {
  let name = '';
  while (column > 0) {
    column--;
    name = String.fromCharCode(65 + column % 26) + name;
    column = Math.floor(column / 26);
  }
  return name;
}

class Evaluation {
  private work = 0;
  private depth = 0;
  private active = new Set<string>();
  private cache = new Map<string, CellValue>();
  private cells: Readonly<Record<string, string>>;
  constructor(cells: Readonly<Record<string, string>>) { this.cells = cells; }

  tick(): void { if (++this.work > FORMULA_LIMITS.work) fail('#LIMIT!'); }
  bounded<T>(fn: () => T): T {
    if (++this.depth > FORMULA_LIMITS.depth) { this.depth--; return fail('#LIMIT!'); }
    try { return fn(); } finally { this.depth--; }
  }
  cell(key: string): CellValue {
    this.tick();
    const parsed = address(key);
    const normalized = `${columnName(parsed.column)}${parsed.row}`;
    if (this.active.has(normalized)) return fail('#CYCLE!');
    if (this.cache.has(normalized)) return this.cache.get(normalized) ?? null;
    const raw = Object.hasOwn(this.cells, normalized) ? this.cells[normalized] : '';
    if (typeof raw !== 'string') return fail('#VALUE!');
    this.active.add(normalized);
    try {
      const trimmed = raw.trim();
      const value = raw.startsWith('=')
        ? new Parser(raw.slice(1), this).parse()
        : trimmed === '' ? null : decimal.test(trimmed) ? finite(Number(trimmed)) : raw;
      this.cache.set(normalized, value);
      return value;
    } finally { this.active.delete(normalized); }
  }
  range(start: string, end: string): CellValue[] {
    const a = address(start);
    const b = address(end);
    const left = Math.min(a.column, b.column), right = Math.max(a.column, b.column);
    const top = Math.min(a.row, b.row), bottom = Math.max(a.row, b.row);
    if ((right - left + 1) * (bottom - top + 1) > FORMULA_LIMITS.range) return fail('#LIMIT!');
    const values: CellValue[] = [];
    for (let row = top; row <= bottom; row++) {
      for (let column = left; column <= right; column++) values.push(this.cell(`${columnName(column)}${row}`));
    }
    return values;
  }
}

class Parser {
  private tokens: Token[] = [];
  private position = 0;
  private context: Evaluation;
  constructor(source: string, context: Evaluation) {
    this.context = context;
    if (source.length + 1 > FORMULA_LIMITS.length) fail('#LIMIT!');
    let rest = source;
    while (rest.length) {
      rest = rest.trimStart();
      if (!rest) break;
      context.tick();
      if (this.tokens.length >= FORMULA_LIMITS.tokens) fail('#LIMIT!');
      const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i.exec(rest)?.[0];
      const cell = /^\$?[A-Z]+\$?\d+/i.exec(rest)?.[0];
      const name = /^[A-Z_][A-Z_0-9]*/i.exec(rest)?.[0];
      let token: Token;
      if (number) token = { kind: 'number', text: number };
      else if (cell) token = { kind: 'cell', text: cell.toUpperCase() };
      else if (name) token = { kind: 'name', text: name.toUpperCase() };
      else if (/^[+\-*/(),:]/.test(rest)) token = { kind: 'symbol', text: rest[0] ?? '' };
      else return fail('#VALUE!');
      this.tokens.push(token);
      rest = rest.slice(token.text.length);
    }
    this.tokens.push({ kind: 'end', text: '' });
  }
  private peek(): Token { return this.tokens[this.position] ?? { kind: 'end', text: '' }; }
  private take(): Token { this.context.tick(); const token = this.peek(); this.position++; return token; }
  private expect(text: string): void { if (this.take().text !== text) fail('#VALUE!'); }
  parse(): CellValue {
    return this.context.bounded(() => {
      const result = this.expression();
      if (this.peek().kind !== 'end') return fail('#VALUE!');
      return result;
    });
  }
  private expression(): CellValue {
    let value = this.product();
    while (this.peek().text === '+' || this.peek().text === '-') {
      const op = this.take().text;
      const right = numeric(this.product()), left = numeric(value);
      value = finite(op === '+' ? left + right : left - right);
    }
    return value;
  }
  private product(): CellValue {
    let value = this.unary();
    while (this.peek().text === '*' || this.peek().text === '/') {
      const op = this.take().text;
      const right = numeric(this.unary()), left = numeric(value);
      if (op === '/' && right === 0) return fail('#DIV/0!');
      value = finite(op === '*' ? left * right : left / right);
    }
    return value;
  }
  private unary(): CellValue {
    if (this.peek().text === '+' || this.peek().text === '-') {
      const negative = this.take().text === '-';
      return this.context.bounded(() => finite(numeric(this.unary()) * (negative ? -1 : 1)));
    }
    return this.primary();
  }
  private primary(): CellValue {
    const token = this.take();
    if (token.kind === 'number') return finite(Number(token.text));
    if (token.kind === 'cell') return this.context.cell(token.text);
    if (token.text === '(') return this.context.bounded(() => {
      const value = this.expression(); this.expect(')'); return value;
    });
    if (token.kind === 'name') return this.context.bounded(() => this.aggregate(token.text));
    return fail('#VALUE!');
  }
  private aggregate(name: string): number {
    if (!['SUM', 'AVG', 'AVERAGE', 'COUNT', 'MIN', 'MAX'].includes(name)) return fail('#NAME?');
    this.expect('(');
    const values: number[] = [];
    if (this.peek().text !== ')') {
      while (true) {
        if (this.peek().kind === 'cell' && this.tokens[this.position + 1]?.text === ':') {
          const start = this.take().text; this.expect(':');
          const end = this.take();
          if (end.kind !== 'cell') return fail('#REF!');
          for (const value of this.context.range(start, end.text)) if (typeof value === 'number') values.push(value);
        } else {
          const value = this.expression();
          if (typeof value === 'number') values.push(value);
        }
        if (this.peek().text !== ',') break;
        this.take();
      }
    }
    this.expect(')');
    if (name === 'COUNT') return values.length;
    if (name === 'MIN' || name === 'MAX') {
      if (!values.length) return 0;
      return values.reduce((a, b) => name === 'MIN' ? Math.min(a, b) : Math.max(a, b));
    }
    const sum = finite(values.reduce((a, b) => finite(a + b), 0));
    if (name === 'SUM') return sum;
    return values.length ? finite(sum / values.length) : fail('#DIV/0!');
  }
}

export function evaluateFormula(raw: string, cells: Readonly<Record<string, string>>): number | string {
  if (!raw.startsWith('=')) return raw;
  try { return new Parser(raw.slice(1), new Evaluation(cells)).parse() ?? 0; }
  catch (error) { if (error instanceof FormulaError) return error.code; throw error; }
}

/** 文本导出不能把危险前缀当成外部电子表格公式；调用者仍需完成 CSV 引号转义。 */
export function safeSpreadsheetCsvText(value: string): string {
  return /^[\s\uFEFF]*[=+\-@]/u.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
}
