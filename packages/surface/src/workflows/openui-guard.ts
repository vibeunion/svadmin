/** Strict, bounded framing for the static OpenUI subset consumed by Surface.
 * This is NOT a replacement for the upstream parser. It prevents unsupported
 * expressions from reaching that parser and only releases complete statements.
 */
export const OPENUI_LIMITS = Object.freeze({ characters: 131_072, statementCharacters: 32_768, statements: 128, depth: 32, tokens: 12_000 });

export class SurfaceOpenUIError extends Error {
  constructor(readonly code: 'syntax' | 'limit' | 'unsupported' | 'invalid_surface', message: string) {
    super(message);
    this.name = 'SurfaceOpenUIError';
  }
}

const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);

function checkStatement(text: string, calls: ReadonlySet<string>): string {
  const tokens: string[] = [];
  // JSON.parse rejects unescaped control characters in string tokens below.
  const lexer = /\s+|"(?:[^"\\]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|[A-Za-z_][A-Za-z0-9_]*|[=(),[\]{}:]/uy;
  let offset = 0;
  while (offset < text.length) {
    lexer.lastIndex = offset;
    const token = lexer.exec(text);
    if (!token) throw new SurfaceOpenUIError('syntax', 'Only static OpenUI declarations and JSON literals are supported');
    offset = lexer.lastIndex;
    if (token[0].trim()) tokens.push(token[0]);
    if (tokens.length > OPENUI_LIMITS.tokens) throw new SurfaceOpenUIError('limit', 'Too many tokens in a declaration');
  }
  const topCall = tokens[2];
  if (!topCall || !calls.has(topCall) || tokens[3] !== '(') throw new SurfaceOpenUIError('unsupported', 'Declarations must be registered component calls');
  if ((tokens[0] === 'root') !== (topCall === 'Surface')) throw new SurfaceOpenUIError('unsupported', 'Only root may declare Surface');
  const references = new Set<string>();
  let at = 0;
  function take(value: string): void {
    if (tokens[at++] !== value) throw new SurfaceOpenUIError('syntax', `Expected ${value}`);
  }
  function value(depth: number): void {
    if (depth > OPENUI_LIMITS.depth) throw new SurfaceOpenUIError('limit', 'OpenUI nesting limit exceeded');
    const token = tokens[at++];
    if (token === undefined) throw new SurfaceOpenUIError('syntax', 'Missing expression');
    if (token.startsWith('"') || /^(?:-?[0-9]|true$|false$|null$)/u.test(token)) {
      const literal: unknown = JSON.parse(token);
      if (typeof literal === 'number' && !Number.isFinite(literal)) throw new SurfaceOpenUIError('syntax', 'Numbers must be finite');
      return;
    }
    if (token === '[' || token === '{') {
      const end = token === '[' ? ']' : '}';
      const keys = new Set<string>();
      if (tokens[at] !== end) {
        for (;;) {
          if (token === '{') {
            const keyToken = tokens[at++];
            if (!keyToken?.startsWith('"')) throw new SurfaceOpenUIError('syntax', 'Object keys must be quoted JSON strings');
            const key: string = JSON.parse(keyToken);
            if (forbidden.has(key) || keys.has(key)) throw new SurfaceOpenUIError('syntax', 'Duplicate or unsafe object key');
            keys.add(key);
            take(':');
          }
          value(depth + 1);
          if (tokens[at] !== ',') break;
          at += 1;
        }
      }
      take(end);
      return;
    }
    if (!identifier.test(token) || forbidden.has(token)) throw new SurfaceOpenUIError('syntax', 'Invalid reference');
    if (tokens[at] === '(') {
      if (depth !== 0) throw new SurfaceOpenUIError('unsupported', 'Use named declarations, not nested calls');
      if (!calls.has(token)) throw new SurfaceOpenUIError('unsupported', `Unregistered OpenUI call: ${token}`);
      at += 1;
      if (tokens[at] !== ')') {
        for (;;) {
          value(depth + 1);
          if (tokens[at] !== ',') break;
          at += 1;
        }
      }
      take(')');
    } else {
      if (topCall !== 'Surface' || token === 'root' || references.has(token)) throw new SurfaceOpenUIError('unsupported', 'References are only allowed once in the Surface root');
      references.add(token);
      if (references.size > 32) throw new SurfaceOpenUIError('limit', 'Too many root references');
    }
  }
  const name = tokens[at++];
  if (!name || !identifier.test(name) || forbidden.has(name) || name.length > 64) throw new SurfaceOpenUIError('syntax', 'Invalid declaration name');
  take('=');
  value(0);
  if (at !== tokens.length) throw new SurfaceOpenUIError('syntax', 'Unexpected tokens after declaration');
  return name;
}

export function createOpenUIStatementGuard(callNames: readonly string[]) {
  const calls = new Set(callNames);
  const names = new Set<string>();
  let pending = '';
  let characters = 0;
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let closed = false;
  let failure: SurfaceOpenUIError | undefined;
  function release(): string | undefined {
    const statement = pending.trim();
    pending = '';
    if (!statement) return undefined;
    const name = checkStatement(statement, calls);
    if (names.has(name)) throw new SurfaceOpenUIError('syntax', `Duplicate declaration: ${name}`);
    names.add(name);
    if (names.size > OPENUI_LIMITS.statements) throw new SurfaceOpenUIError('limit', 'Too many declarations');
    return statement + '\n';
  }
  return {
    push(chunk: string): readonly string[] {
      if (failure) throw failure;
      if (closed) throw new SurfaceOpenUIError('syntax', 'Stream is closed');
      try {
        if (typeof chunk !== 'string') throw new SurfaceOpenUIError('syntax', 'Chunks must be text');
        characters += chunk.length;
        if (characters > OPENUI_LIMITS.characters) throw new SurfaceOpenUIError('limit', 'OpenUI input is too large');
        const result: string[] = [];
        for (const char of chunk) {
          if (!inString && stack.length === 0 && (char === '\n' || char === ';')) {
            const statement = release();
            if (statement) result.push(statement);
            continue;
          }
          pending += char;
          if (pending.length > OPENUI_LIMITS.statementCharacters) throw new SurfaceOpenUIError('limit', 'Declaration is too large');
          if (inString) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === '"') inString = false;
          } else if (char === '"') inString = true;
          else if ('([{'.includes(char)) {
            stack.push(char);
            if (stack.length > OPENUI_LIMITS.depth) throw new SurfaceOpenUIError('limit', 'OpenUI nesting limit exceeded');
          } else if (')]}'.includes(char)) {
            const expected = ({ ')': '(', ']': '[', '}': '{' } as Record<string, string>)[char];
            if (stack.pop() !== expected) throw new SurfaceOpenUIError('syntax', 'Unbalanced delimiter');
          }
        }
        return result;
      } catch (error) {
        failure = error instanceof SurfaceOpenUIError ? error : new SurfaceOpenUIError('syntax', 'Invalid OpenUI input');
        pending = '';
        throw failure;
      }
    },
    finish(): readonly string[] {
      if (failure) throw failure;
      if (closed) return [];
      closed = true;
      if (inString || stack.length) {
        failure = new SurfaceOpenUIError('syntax', 'Truncated OpenUI declaration');
        throw failure;
      }
      try {
        const statement = release();
        return statement ? [statement] : [];
      } catch (error) {
        failure = error instanceof SurfaceOpenUIError ? error : new SurfaceOpenUIError('syntax', 'Invalid OpenUI input');
        throw failure;
      }
    },
  };
}
