// Pure native mathematical & logical formula evaluation engine without eval()

export type FormulaScope = Record<string, unknown>;

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in cur) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function evaluateFormula(formula: string, scope: FormulaScope = {}): number | null {
  const clean = formula.trim();
  if (!clean) return null;

  try {
    const tokens = tokenize(clean);
    const parsed = parseExpression(tokens, scope);
    if (typeof parsed === 'number' && Number.isFinite(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

type Token =
  | { type: 'num'; val: number }
  | { type: 'id'; val: string }
  | { type: 'op'; val: string }
  | { type: 'paren'; val: '(' | ')' }
  | { type: 'comma' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i] ?? '';

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', val: char });
      i++;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }

    if (char === '+' || char === '-' || char === '*' || char === '/' || char === '^' || char === '%') {
      tokens.push({ type: 'op', val: char });
      i++;
      continue;
    }

    // Number literal
    if (/\d/.test(char) || (char === '.' && /\d/.test(input[i + 1] ?? ''))) {
      let numStr = '';
      while (i < input.length && (/[0-9.]/.test(input[i] ?? '') || (input[i] === 'e' || input[i] === 'E'))) {
        numStr += input[i];
        i++;
      }
      tokens.push({ type: 'num', val: parseFloat(numStr) });
      continue;
    }

    // Identifier / Field Path
    if (/[a-zA-Z_$]/.test(char)) {
      let idStr = '';
      while (i < input.length && /[a-zA-Z0-9_$.]/.test(input[i] ?? '')) {
        idStr += input[i];
        i++;
      }
      tokens.push({ type: 'id', val: idStr });
      continue;
    }

    i++;
  }

  return tokens;
}

function parseExpression(tokens: Token[], scope: FormulaScope): number {
  let pos = 0;

  function parsePrimary(): number {
    const token = tokens[pos++];
    if (!token) return 0;

    if (token.type === 'num') {
      return token.val;
    }

    if (token.type === 'paren' && token.val === '(') {
      const expr = parseAddSub();
      const closing = tokens[pos++];
      if (!closing || closing.type !== 'paren' || closing.val !== ')') {
        throw new Error('Unbalanced parenthesis');
      }
      return expr;
    }

    if (token.type === 'id') {
      const nextToken = tokens[pos];
      // Function call e.g. ROUND(val, 2), SUM(a, b, c)
      if (nextToken && nextToken.type === 'paren' && nextToken.val === '(') {
        pos++; // consume '('
        const args: number[] = [];
        const current = tokens[pos];
        if (current && !(current.type === 'paren' && current.val === ')')) {
          args.push(parseAddSub());
          while (tokens[pos]?.type === 'comma') {
            pos++; // consume comma
            args.push(parseAddSub());
          }
        }
        pos++; // consume ')'

        const fnName = token.val.toUpperCase();
        switch (fnName) {
          case 'ROUND': {
            const val = args[0] ?? 0;
            const decimals = args[1] ?? 0;
            const factor = Math.pow(10, decimals);
            return Math.round(val * factor) / factor;
          }
          case 'SUM':
            return args.reduce((a, b) => a + b, 0);
          case 'AVG':
            return args.length > 0 ? args.reduce((a, b) => a + b, 0) / args.length : 0;
          case 'MAX':
            return args.length > 0 ? Math.max(...args) : 0;
          case 'MIN':
            return args.length > 0 ? Math.min(...args) : 0;
          case 'IF': {
            const cond = args[0] ?? 0;
            const thenVal = args[1] ?? 0;
            const elseVal = args[2] ?? 0;
            return cond > 0 ? thenVal : elseVal;
          }
          default:
            return 0;
        }
      }

      // Variable lookup in scope
      const val = getNestedValue(scope, token.val);
      if (typeof val === 'number') return val;
      if (typeof val === 'string' && !isNaN(Number(val))) return Number(val);
      if (typeof val === 'boolean') return val ? 1 : 0;
      return 0;
    }

    if (token.type === 'op' && token.val === '-') {
      return -parsePrimary();
    }

    return 0;
  }

  function parseMulDiv(): number {
    let left = parsePrimary();
    while (pos < tokens.length) {
      const token = tokens[pos];
      if (!token || token.type !== 'op' || (token.val !== '*' && token.val !== '/' && token.val !== '%' && token.val !== '^')) {
        break;
      }
      pos++;
      const right = parsePrimary();
      if (token.val === '*') left *= right;
      else if (token.val === '/') left = right === 0 ? 0 : left / right;
      else if (token.val === '%') left = left % right;
      else if (token.val === '^') left = Math.pow(left, right);
    }
    return left;
  }

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (pos < tokens.length) {
      const token = tokens[pos];
      if (!token || token.type !== 'op' || (token.val !== '+' && token.val !== '-')) {
        break;
      }
      pos++;
      const right = parseMulDiv();
      if (token.val === '+') left += right;
      else if (token.val === '-') left -= right;
    }
    return left;
  }

  return parseAddSub();
}

export function useFormulaEngine(formula: () => string, scope: () => FormulaScope, options: { precision?: number; defaultValue?: number } = {}) {
  const result = $derived.by(() => {
    const raw = evaluateFormula(formula(), scope());
    if (raw === null) return options.defaultValue ?? null;
    if (options.precision !== undefined && Number.isFinite(options.precision)) {
      const factor = Math.pow(10, options.precision);
      return Math.round(raw * factor) / factor;
    }
    return raw;
  });

  return {
    get value() {
      return result;
    },
    evaluate: (customFormula?: string, customScope?: FormulaScope) => {
      return evaluateFormula(customFormula ?? formula(), customScope ?? scope());
    },
  };
}
