import { assertSchemaFormSchema, isSchemaFormNodeVisible, prepareSchemaFormValue, validateSchemaFormValue } from '@svadmin/core/schema-form';
import type { SchemaFormSchema } from '@svadmin/core/schema-form';

export type { SchemaFormSchema } from '@svadmin/core/schema-form';

export function schemaFormFieldName(path: readonly string[]): string {
  return `data:${JSON.stringify(path)}`;
}

export const schemaFormActionName = 'schemaFormAction';

export type SchemaFormArrayAction = {
  type: 'add' | 'remove';
  path: string[];
  index?: number;
};

export function encodeSchemaFormArrayAction(action: SchemaFormArrayAction): string {
  if (!['add', 'remove'].includes(action.type) ||
      !Array.isArray(action.path) || action.path.length === 0 || action.path.length > 32 ||
      !action.path.every(segment => typeof segment === 'string' && segment.length > 0 && segment.length <= 200)) {
    throw new Error('Invalid schema form action.');
  }
  if (action['type'] === 'remove' &&
      (!Number.isSafeInteger(action.index) || (action.index as number) < 0 || (action.index as number) > 1000)) {
    throw new Error('Invalid schema form action.');
  }
  if (action['type'] === 'add' && action['index'] !== undefined) throw new Error('Invalid schema form action.');
  return JSON.stringify(action);
}

export function decodeSchemaFormArrayAction(form: FormData): SchemaFormArrayAction | undefined {
  const values = form.getAll(schemaFormActionName);
  if (values.length === 0) return;
  if (values.length !== 1 || typeof values[0] !== 'string' || values[0].length > 10000) throw new Error('Invalid schema form action.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(values[0]);
  } catch {
    throw new Error('Invalid schema form action.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Invalid schema form action.');
  const candidate = parsed as Record<string, unknown>;
  if ((candidate['type'] !== 'add' && candidate['type'] !== 'remove') ||
      !Array.isArray(candidate['path']) ||
      !candidate['path'].every(segment => typeof segment === 'string' && segment.length > 0 && segment.length <= 200) ||
      candidate['path'].length === 0 || candidate['path'].length > 32 ||
      Object.keys(candidate).some(key => !['type', 'path', 'index'].includes(key))) {
    throw new Error('Invalid schema form action.');
  }
  if (candidate['type'] === 'add' && Object.hasOwn(candidate, 'index')) throw new Error('Invalid schema form action.');
  if (candidate['type'] === 'remove' &&
      (!Number.isSafeInteger(candidate['index']) || (candidate['index'] as number) < 0 || (candidate['index'] as number) > 1000)) {
    throw new Error('Invalid schema form action.');
  }
  return candidate as SchemaFormArrayAction;
}

/** 按可信 Schema 解码并验证支持的约束；不替代资源授权和业务命令校验。 */
export function decodeSchemaFormData(schema: SchemaFormSchema, form: FormData): Record<string, unknown> {
  if (decodeSchemaFormArrayAction(form)) throw new Error('Array actions require decodeSchemaFormSubmission.');
  return decodeFields(schema, form, true);
}

function decodeFields(schema: SchemaFormSchema, form: FormData, validate: boolean): Record<string, unknown> {
  assertSchemaFormSchema(schema);
  decodeSchemaFormArrayAction(form);
  const allowed = new Set<string>();
  const controllers: Record<string, unknown> = {};
  const controllerValues = new Map<string, unknown>();
  let nodes = 0;
  let textLength = 0;
  const fail = (): never => { throw new Error('Invalid schema form data.'); };
  function values(name: string): string[] {
    allowed.add(name);
    return form.getAll(name).map(value => {
      if (typeof value !== 'string') return fail();
      textLength += value.length;
      if (textLength > 1_000_000) return fail();
      return value;
    });
  }
  function visit(node: SchemaFormSchema, path: string[], depth: number): unknown {
    const cacheKey = JSON.stringify(path);
    if (controllerValues.has(cacheKey)) return controllerValues.get(cacheKey);
    if (++nodes > 1000 || depth > 32) return fail();
    if (node.type === 'object' || node.properties) {
      const result: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(node.properties ?? {})) {
        if (!isSchemaFormNodeVisible(child, controllers)) continue;
        Object.defineProperty(result, key, {
          value: visit(child, [...path, key], depth + 1),
          enumerable: true, configurable: true, writable: true,
        });
      }
      return result;
    }
    if (node.type === 'array') {
      const counts = values(`length:${JSON.stringify(path)}`);
      if (counts.length !== 1 || !/^(0|[1-9]\d*)$/.test(counts[0] ?? '')) return fail();
      const count = Number(counts[0]);
      if (!Number.isSafeInteger(count) || count > 1000 - nodes) return fail();
      return Array.from({ length: count }, (_, index) =>
        visit(node.items ?? { type: 'string' }, [...path, String(index)], depth + 1));
    }
    const entries = values(schemaFormFieldName(path));
    if (node.type === 'boolean' && !node.enum) {
      if (entries.length === 1 && entries[0] === 'false') return false;
      if (entries.length === 2 && entries[0] === 'false' && entries[1] === 'true') return true;
      return fail();
    }
    if (entries.length !== 1) return fail();
    const raw = entries[0] ?? '';
    if (node.enum) {
      if (raw === '') return undefined;
      if (!/^__json_enum_(0|[1-9]\d*)$/.test(raw)) return fail();
      const index = Number(raw.slice('__json_enum_'.length));
      if (!Number.isSafeInteger(index) || index >= node.enum.length) return fail();
      return node.enum[index];
    }
    if (node.type === 'null') return raw === 'null' ? null : fail();
    if (node.type === 'number' || node.type === 'integer') {
      if (raw === '') return undefined;
      if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) return fail();
      const number = Number(raw);
      if (!Number.isFinite(number) || (node.type === 'integer' && !Number.isSafeInteger(number))) return fail();
      return number;
    }
    if (node.type !== undefined && node.type !== 'string') return fail();
    return raw;
  }
  if (schema.type !== 'object' && !schema.properties) return fail();
  // 控制字段只允许无条件标量，因此可先解码，不依赖属性声明顺序。
  function collectControllers(node: SchemaFormSchema): void {
    const path = node.visibleWhen?.path;
    if (path && !controllerValues.has(JSON.stringify(path))) {
      let definition = schema;
      for (const key of path) definition = definition.properties![key]!;
      const decoded = visit(definition, [...path], path.length);
      controllerValues.set(JSON.stringify(path), decoded);
      let target = controllers;
      path.forEach((key, index) => {
        if (index === path.length - 1) {
          Object.defineProperty(target, key, { value: decoded, enumerable: true, configurable: true });
        } else {
          if (!Object.hasOwn(target, key)) Object.defineProperty(target, key, {
            value: {}, enumerable: true, configurable: true,
          });
          target = target[key] as Record<string, unknown>;
        }
      });
    }
    for (const child of Object.values(node.properties ?? {})) collectControllers(child);
    if (node.items) collectControllers(node.items);
  }
  collectControllers(schema);
  const result = visit(schema, [], 0) as Record<string, unknown>;
  if (validate && validateSchemaFormValue(schema, result).length > 0) return fail();
  for (const key of form.keys()) {
    if ((key.startsWith('data:') || key.startsWith('length:')) && !allowed.has(key)) return fail();
  }
  return result;
}

/** 数组动作只生成下一份草稿；只有 submit 分支才可进入业务写入。 */
export function decodeSchemaFormSubmission(
  schema: SchemaFormSchema, form: FormData,
): { kind: 'draft' | 'submit'; data: Record<string, unknown> } {
  const action = decodeSchemaFormArrayAction(form);
  if (!action) return { kind: 'submit', data: decodeSchemaFormData(schema, form) };
  const data = decodeFields(schema, form, false);
  const fail = (): never => { throw new Error('Invalid schema form action.'); };
  let node = schema;
  let current: unknown = data;
  for (const segment of action.path) {
    if (node.type === 'array') {
      if (!/^(0|[1-9]\d*)$/.test(segment) || !Array.isArray(current) ||
          Number(segment) >= current.length) return fail();
      node = node.items ?? { type: 'string' };
      current = current[Number(segment)];
    } else {
      if (!node.properties || !Object.hasOwn(node.properties, segment) ||
          current === null || typeof current !== 'object' || !Object.hasOwn(current, segment)) return fail();
      node = node.properties[segment]!;
      current = (current as Record<string, unknown>)[segment];
    }
    if (!isSchemaFormNodeVisible(node, data)) return fail();
  }
  if (node.type !== 'array' || !Array.isArray(current)) return fail();
  // 默认值也受结构预算约束，防止嵌套默认数组放大草稿。
  let nodes = 0;
  let length = 0;
  function defaultValue(definition: SchemaFormSchema, depth: number): unknown {
    if (++nodes > 1000 || depth > 32) return fail();
    if (definition.default !== undefined) return structuredClone(definition.default);
    if (definition.type === 'object' || definition.properties) {
      return Object.fromEntries(Object.entries(definition.properties ?? {})
        .map(([key, child]) => [key, defaultValue(child, depth + 1)]));
    }
    if (definition.type === 'array') return [];
    if (definition.type === 'null') return null;
    if (definition.enum || definition.type === 'number' || definition.type === 'integer') return undefined;
    return definition.type === 'boolean' ? false : '';
  }
  if (action.type === 'add') {
    if (current.length >= Math.min(node.maxItems ?? 1000, 1000)) return fail();
    current.push(defaultValue(node.items ?? { type: 'string' }, action.path.length + 1));
  } else {
    if (action.index === undefined || action.index >= current.length ||
        current.length <= (node.minItems ?? 0)) return fail();
    current.splice(action.index, 1);
  }
  nodes = 0;
  function checkBudget(value: unknown, depth: number): void {
    if (++nodes > 1000 || depth > 32) return fail();
    if (typeof value === 'string') length += value.length;
    if (length > 1_000_000) return fail();
    if (value && typeof value === 'object') {
      for (const child of Object.values(value)) checkBudget(child, depth + 1);
    }
  }
  checkBudget(data, 0);
  // 草稿允许尚未填写的必填项，但仍投影掉条件隐藏字段。
  return { kind: 'draft', data: prepareSchemaFormValue(schema, data).data };
}
