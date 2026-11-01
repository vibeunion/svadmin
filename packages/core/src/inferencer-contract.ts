import type { FieldDefinition } from './types';

const contractExpressions = new WeakMap<FieldDefinition, string>();
const JSON_SCHEMA_DEPTH = 6;

export function propertyKey(key: string): string {
  // 对象字面量里的 __proto__ 会改原型，必须写成字符串键。
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') return JSON.stringify(key);
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

function unionExpressions(expressions: string[]): string | null {
  const unique = [...new Set(expressions)];
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0] ?? null;
  return `Type.Union([${unique.join(', ')}])`;
}

function valueKind(value: unknown): 'string' | 'boolean' | 'number' | 'array' | 'object' | 'other' {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'other';
}

/** 从样本值生成 closeContractSchema 接受的封闭 TypeBox 表达式。无法封闭时返回 null。 */
export function closedValueExpression(values: unknown[], depth: number, seen: WeakSet<object>): string | null {
  if (depth > JSON_SCHEMA_DEPTH) return null;
  const defined = values.filter((value) => value !== undefined);
  if (defined.length === 0) return null;
  const nonNull = defined.filter((value) => value !== null);
  const expression = nonNull.length === 0
    ? 'Type.Null()'
    : closedNonNullExpression(nonNull, depth, seen);
  if (!expression) return null;
  if (nonNull.length !== defined.length && expression !== 'Type.Null()') {
    return `Type.Union([${expression}, Type.Null()])`;
  }
  return expression;
}

function closedNonNullExpression(values: unknown[], depth: number, seen: WeakSet<object>): string | null {
  const kinds = [...new Set(values.map(valueKind))];
  if (kinds.length !== 1) {
    const parts: string[] = [];
    for (const kind of kinds) {
      const expression = closedNonNullExpression(values.filter((value) => valueKind(value) === kind), depth, seen);
      if (!expression) return null;
      parts.push(expression);
    }
    return unionExpressions(parts);
  }
  switch (kinds[0]) {
    case 'string':
      return 'Type.String()';
    case 'boolean':
      return 'Type.Boolean()';
    case 'number':
      return values.every((value) => typeof value === 'number' && Number.isFinite(value)) ? 'Type.Number()' : null;
    case 'array':
      return closedArrayExpression(values.filter(Array.isArray), depth, seen);
    case 'object':
      return closedObjectExpression(values.filter((value): value is Record<string, unknown> => valueKind(value) === 'object'), depth, seen);
    default:
      return null;
  }
}

function closedArrayExpression(values: unknown[][], depth: number, seen: WeakSet<object>): string | null {
  for (const value of values) {
    if (seen.has(value)) return null;
  }
  for (const value of values) seen.add(value);
  try {
    const items = values.flat();
    if (items.length === 0) return null;
    const item = closedValueExpression(items, depth + 1, seen);
    return item ? `Type.Array(${item})` : null;
  } finally {
    for (const value of values) seen.delete(value);
  }
}

function closedObjectExpression(objects: Record<string, unknown>[], depth: number, seen: WeakSet<object>): string | null {
  for (const value of objects) {
    if (seen.has(value)) return null;
  }
  for (const value of objects) seen.add(value);
  try {
    const keys = [...new Set(objects.flatMap((value) => Object.keys(value)))].sort();
    const properties: string[] = [];
    for (const key of keys) {
      const present = objects.filter((value) => Object.prototype.hasOwnProperty.call(value, key));
      const expression = closedValueExpression(present.map((value) => value[key]), depth + 1, seen);
      if (!expression) return null;
      const rendered = present.length === objects.length ? expression : `Type.Optional(${expression})`;
      properties.push(`${propertyKey(key)}: ${rendered}`);
    }
    const body = properties.length > 0 ? ` ${properties.join(', ')} ` : ' ';
    return `Type.Object({${body}}, { additionalProperties: false })`;
  } finally {
    for (const value of objects) seen.delete(value);
  }
}

export function rememberContractExpression(field: FieldDefinition, expression: string | null): void {
  if (expression) contractExpressions.set(field, expression);
}

export function getContractExpression(field: FieldDefinition): string | undefined {
  return contractExpressions.get(field);
}
