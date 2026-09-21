import { Type, type TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export type SchemaFormScalar = string | number | boolean | null;

/** 条件路径从表单根开始，只能引用无条件的标量字段。 */
export interface SchemaFormCondition {
  path: readonly string[];
  equals?: SchemaFormScalar;
  notEquals?: SchemaFormScalar;
  exists?: boolean;
}

export interface SchemaFormSchema {
  type?: string;
  title?: string;
  description?: string;
  properties?: Record<string, SchemaFormSchema>;
  items?: SchemaFormSchema;
  enum?: SchemaFormScalar[];
  default?: unknown;
  required?: string[];
  visibleWhen?: SchemaFormCondition;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
}

const keys = new Set([
  'type', 'title', 'description', 'properties', 'items', 'enum', 'default', 'required',
  'visibleWhen', 'minLength', 'maxLength', 'pattern', 'minimum', 'maximum', 'minItems', 'maxItems',
]);
const scalar = (value: unknown): value is SchemaFormScalar => value === null ||
  typeof value === 'string' || typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));
const fail = (): never => { throw new TypeError('Invalid schema form configuration.'); };

/** Schema 来自可信宿主，但仍拒绝未知关键字、循环、错误约束和超限结构。 */
export function assertSchemaFormSchema(schema: SchemaFormSchema): void {
  let visited = 0;
  const active = new Set<object>();
  function visit(node: SchemaFormSchema, depth: number): void {
    if (!node || typeof node !== 'object' || Array.isArray(node) ||
        ++visited > 1000 || depth > 32 || active.has(node)) fail();
    if (Object.keys(node).some(key => !keys.has(key))) fail();
    active.add(node);
    const kind = node.type ?? (node.properties ? 'object' : undefined);
    if (kind !== undefined && !['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(kind)) fail();
    if (node.properties !== undefined) {
      if (kind !== 'object' || !node.properties || typeof node.properties !== 'object' || Array.isArray(node.properties)) fail();
      for (const child of Object.values(node.properties)) visit(child, depth + 1);
    }
    if (node.items !== undefined) {
      if (kind !== 'array') fail();
      visit(node.items, depth + 1);
      if (node.items.visibleWhen !== undefined) fail();
    }
    if (node.required !== undefined && (kind !== 'object' || !Array.isArray(node.required) ||
        node.required.some(key => typeof key !== 'string' || !Object.hasOwn(node.properties ?? {}, key)))) fail();
    if (node.enum !== undefined && (!Array.isArray(node.enum) || node.enum.length === 0 ||
        node.enum.length > 1000 || !node.enum.every(scalar) || kind === 'object' || kind === 'array')) fail();
    for (const key of ['minLength', 'maxLength', 'minItems', 'maxItems'] as const) {
      const limit = node[key];
      if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 0 ||
          (key.endsWith('Length') ? kind !== 'string' : kind !== 'array'))) fail();
    }
    for (const key of ['minimum', 'maximum'] as const) {
      if (node[key] !== undefined && (!Number.isFinite(node[key]) || (kind !== 'number' && kind !== 'integer'))) fail();
    }
    if (node.pattern !== undefined) {
      if (kind !== 'string' || typeof node.pattern !== 'string' || node.pattern.length > 1000) fail();
      try { new RegExp(node.pattern); } catch { fail(); }
    }
    for (const [min, max] of [[node.minLength, node.maxLength], [node.minItems, node.maxItems], [node.minimum, node.maximum]]) {
      if (min !== undefined && max !== undefined && min > max) fail();
    }
    const condition = node.visibleWhen;
    if (condition !== undefined) {
      if (!condition || typeof condition !== 'object' || Array.isArray(condition) ||
          !Array.isArray(condition.path) || condition.path.length === 0 || condition.path.length > 32 ||
          condition.path.some(part => typeof part !== 'string') ||
          Object.keys(condition).some(key => !['path', 'equals', 'notEquals', 'exists'].includes(key)) ||
          !['equals', 'notEquals', 'exists'].some(key => Object.hasOwn(condition, key))) fail();
      if ((Object.hasOwn(condition, 'equals') && !scalar(condition.equals)) ||
          (Object.hasOwn(condition, 'notEquals') && !scalar(condition.notEquals)) ||
          (Object.hasOwn(condition, 'exists') && typeof condition.exists !== 'boolean')) fail();
      let controller = schema;
      for (const part of condition.path) {
        if (controller.visibleWhen || !controller.properties || !Object.hasOwn(controller.properties, part)) fail();
        const next = controller.properties?.[part];
        if (!next) return fail();
        controller = next;
      }
      if (controller.visibleWhen || controller.properties || controller.type === 'object' || controller.type === 'array') fail();
    }
    active.delete(node);
  }
  if (!schema || typeof schema !== 'object' || Array.isArray(schema) ||
      (schema.type !== 'object' && !schema.properties) || schema.visibleWhen) fail();
  visit(schema, 0);
}

export function readSchemaFormPath(value: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>((current, key) => (
    current !== null && typeof current === 'object' && Object.hasOwn(current, key)
      ? (current as Record<string, unknown>)[key] : undefined
  ), value);
}

export function matchesSchemaFormCondition(condition: SchemaFormCondition | undefined, value: unknown): boolean {
  if (!condition) return true;
  const current = readSchemaFormPath(value, condition.path);
  if (condition.exists !== undefined && (current !== undefined) !== condition.exists) return false;
  if (Object.hasOwn(condition, 'equals') && !Object.is(current, condition.equals)) return false;
  if (Object.hasOwn(condition, 'notEquals') && Object.is(current, condition.notEquals)) return false;
  return true;
}

export function isSchemaFormNodeVisible(schema: SchemaFormSchema, rootValue: unknown): boolean {
  return matchesSchemaFormCondition(schema.visibleWhen, rootValue);
}

export interface SchemaFormValidationError {
  /** JSON 数组路径，不混淆字段名中的点、斜杠和数组索引。 */
  path: string;
  code: 'invalid';
  message: string;
}

/** 不编译代码、不转换类型；值约束复用 TypeBox 的解释型校验。 */
export function prepareSchemaFormValue(schema: SchemaFormSchema, value: unknown): {
  data: Record<string, unknown>;
  errors: SchemaFormValidationError[];
} {
  assertSchemaFormSchema(schema);
  const errors: SchemaFormValidationError[] = [];
  let visited = 0;
  const invalid = (path: string[]) => {
    if (errors.length < 50) errors.push({ path: JSON.stringify(path), code: 'invalid', message: 'Invalid value.' });
  };
  function visit(node: SchemaFormSchema, current: unknown, path: string[], required: boolean): unknown {
    if (++visited > 1000 || path.length > 32) throw new TypeError('Schema form data limit exceeded.');
    if (current === undefined && !required) return undefined;
    const kind = node.type ?? (node.properties ? 'object' : node.enum ? undefined : 'string');
    let check: TSchema;
    switch (kind) {
      case 'object': check = Type.Object({}); break;
      case 'array': check = Type.Array(Type.Unknown(), {
        ...(node.minItems === undefined ? {} : { minItems: node.minItems }),
        ...(node.maxItems === undefined ? {} : { maxItems: node.maxItems }),
      }); break;
      case 'number': check = Type.Number({
        ...(node.minimum === undefined ? {} : { minimum: node.minimum }),
        ...(node.maximum === undefined ? {} : { maximum: node.maximum }),
      }); break;
      case 'integer': check = Type.Integer({
        minimum: Math.max(Number.MIN_SAFE_INTEGER, node.minimum ?? Number.MIN_SAFE_INTEGER),
        maximum: Math.min(Number.MAX_SAFE_INTEGER, node.maximum ?? Number.MAX_SAFE_INTEGER),
      }); break;
      case 'boolean': check = Type.Boolean(); break;
      case 'null': check = Type.Null(); break;
      case 'string': check = Type.String({
        ...(node.minLength === undefined ? {} : { minLength: node.minLength }),
        ...(node.maxLength === undefined ? {} : { maxLength: node.maxLength }),
        ...(node.pattern === undefined ? {} : { pattern: node.pattern }),
      }); break;
      default: check = Type.Unknown();
    }
    if (node.enum) check = Type.Intersect([check, Type.Union(node.enum.map(item => item === null ? Type.Null() : Type.Literal(item)))]);
    if (!Value.Check(check, current)) invalid(path);
    if (kind === 'array' && Array.isArray(current)) {
      if (current.length > 1000 - visited) throw new TypeError('Schema form data limit exceeded.');
      return current.map((item, index) => visit(node.items ?? { type: 'string' }, item, [...path, String(index)], true));
    }
    if (kind === 'object' && current !== null && typeof current === 'object' && !Array.isArray(current)) {
      const source = current as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(source)) {
        if (!Object.hasOwn(node.properties ?? {}, key)) invalid([...path, key]);
      }
      for (const [key, child] of Object.entries(node.properties ?? {})) {
        if (!isSchemaFormNodeVisible(child, value)) continue;
        const own = Object.hasOwn(source, key);
        const next = visit(child, own ? source[key] : undefined, [...path, key], node.required?.includes(key) ?? false);
        if (own || next !== undefined) Object.defineProperty(result, key, { value: next, enumerable: true, writable: true, configurable: true });
      }
      return result;
    }
    return current;
  }
  const projected = visit(schema, value, [], true);
  return {
    data: projected !== null && typeof projected === 'object' && !Array.isArray(projected) ? projected as Record<string, unknown> : {},
    errors,
  };
}

export function validateSchemaFormValue(schema: SchemaFormSchema, value: unknown): SchemaFormValidationError[] {
  return prepareSchemaFormValue(schema, value).errors;
}
