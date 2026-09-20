/** 嵌套表单的草稿与传输语义；不是替代服务端的 JSON Schema 校验器。 */
export interface JsonSchemaFormSchema {
  type?: string | string[];
  const?: string | number | boolean | null;
  readOnly?: boolean;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  additionalProperties?: boolean;
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchemaFormSchema>;
  items?: JsonSchemaFormSchema;
  enum?: Array<string | number | boolean | null>;
  default?: unknown;
  required?: string[];
}

export const SCHEMA_FORM_LIMITS = Object.freeze({ depth: 32, nodes: 10_000, characters: 1_048_576 });
const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
const record = (value: unknown): value is Record<string, unknown> => value !== null
  && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
function safeKey(key: string): void {
  if (unsafe.has(key)) throw new Error('Unsafe form field');
}

/** wire 模式仅省略对象的 undefined；数组的空洞/undefined 不能偷偷转成 null。 */
function copy(value: unknown, wire: boolean): unknown {
  const active = new Set<object>();
  let nodes = 0, characters = 0;
  function visit(current: unknown, depth: number): unknown {
    if (++nodes > SCHEMA_FORM_LIMITS.nodes || depth > SCHEMA_FORM_LIMITS.depth) throw new Error('Form value exceeds limits');
    if (current === undefined && !wire) return undefined;
    if (current === null || typeof current === 'boolean') return current;
    if (typeof current === 'number' && Number.isFinite(current)) return current;
    if (typeof current === 'string') {
      characters += current.length;
      if (characters > SCHEMA_FORM_LIMITS.characters) throw new Error('Form text exceeds limits');
      return current;
    }
    if ((!record(current) && !Array.isArray(current)) || active.has(current)) throw new Error('Expected acyclic plain form data');
    active.add(current);
    try {
      if (Reflect.ownKeys(current).some(key => typeof key === 'symbol')) throw new Error('Symbol values are not JSON fields');
      if (Array.isArray(current)) {
        if (current.length > SCHEMA_FORM_LIMITS.nodes) throw new Error('Form array exceeds limits');
        const result: unknown[] = [];
        for (let index = 0; index < current.length; index++) {
          const descriptor = Object.getOwnPropertyDescriptor(current, String(index));
          if (!descriptor || !('value' in descriptor)) throw new Error('Sparse arrays and accessors are not form data');
          result.push(visit(descriptor.value, depth + 1));
        }
        if (Object.keys(current).some(key => !/^(0|[1-9][0-9]*)$/u.test(key) || Number(key) >= current.length)) {
          throw new Error('Array properties are not JSON fields');
        }
        return result;
      }
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(current)) {
        safeKey(key);
        characters += key.length;
        if (characters > SCHEMA_FORM_LIMITS.characters) throw new Error('Form text exceeds limits');
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor || !('value' in descriptor)) throw new Error('Accessors are not form data');
        if (!wire || descriptor.value !== undefined) result[key] = visit(descriptor.value, depth + 1);
      }
      return result;
    } finally { active.delete(current); }
  }
  return visit(value, 0);
}

/** Svelte 代理也通过普通数据属性读取；回调永远收不到活跃草稿的引用。 */
export function schemaFormSnapshot(value: unknown): Record<string, unknown> {
  if (!record(value)) throw new Error('Form root must be an object');
  return copy(value, true) as Record<string, unknown>;
}

/** 默认值只填“缺失的键”；显式 undefined/null/false/0/空串都表示调用方的决定。 */
export function initializeSchemaForm(schema: JsonSchemaFormSchema, value: Record<string, unknown>): Record<string, unknown> {
  if (!record(value)) throw new Error('Form root must be an object');
  const active = new Set<object>();
  let nodes = 0;
  function visit(node: JsonSchemaFormSchema, current: unknown, present: boolean, required: boolean, depth: number): unknown {
    if (++nodes > SCHEMA_FORM_LIMITS.nodes || depth > SCHEMA_FORM_LIMITS.depth || !record(node as unknown) || active.has(node)) {
      throw new Error('Form schema exceeds supported traversal limits');
    }
    active.add(node);
    try {
      if (!present) {
        if (Object.hasOwn(node, 'default')) current = copy(node.default, false);
        else if (node.type === 'object' || node.properties) current = {};
        else if (node.type === 'array') current = [];
        else if (node.type === 'boolean' && required) current = false;
      }
      if (record(current) && (node.type === 'object' || node.properties)) {
        let result = current;
        for (const [key, child] of Object.entries(node.properties ?? {})) {
          safeKey(key);
          const exists = Object.hasOwn(current, key);
          const next = visit(child, exists ? current[key] : undefined, exists, node.required?.includes(key) ?? false, depth + 1);
          if ((!exists && next !== undefined) || (exists && next !== current[key])) {
            if (result === current) result = { ...current };
            result[key] = next;
          }
        }
        return result;
      }
      if (Array.isArray(current) && node.type === 'array' && node.items) {
        if (current.length > SCHEMA_FORM_LIMITS.nodes) throw new Error('Form array exceeds limits');
        const array = current;
        const items = array.map(item => visit(node.items as JsonSchemaFormSchema, item, true, true, depth + 1));
        return items.some((item, index) => item !== array[index]) ? items : array;
      }
      return current;
    } finally { active.delete(node); }
  }
  return visit(schema, value, true, true, 0) as Record<string, unknown>;
}

export function schemaFormArrayItem(schema: JsonSchemaFormSchema): unknown {
  // 新增对象项也初始化其嵌套默认值及必填 false；数字留空，不猜测为 0。
  const seed = Object.hasOwn(schema, 'default') ? copy(schema.default, false)
    : schema.type === 'object' || schema.properties ? {}
    : schema.type === 'array' ? [] : schema.type === 'boolean' ? false : schema.type === 'number' || schema.type === 'integer' ? undefined : '';
  return initializeSchemaForm({ properties: { item: schema }, required: ['item'] }, { item: seed })['item'];
}

export function writeSchemaFormPath(value: Record<string, unknown>, path: readonly string[], nextValue: unknown): Record<string, unknown> {
  if (!path.length || path.length > SCHEMA_FORM_LIMITS.depth) throw new Error('Invalid form path');
  const next = copy(value, false) as Record<string, unknown>;
  let target: Record<string, unknown> | unknown[] = next;
  for (const [index, key] of path.entries()) {
    safeKey(key);
    if (Array.isArray(target) && (!/^(0|[1-9][0-9]*)$/u.test(key) || Number(key) >= target.length)) throw new Error('Invalid array field');
    if (index === path.length - 1) {
      Reflect.set(target, key, copy(nextValue, false));
    } else {
      let child: unknown = Object.hasOwn(target, key) ? Reflect.get(target, key) : undefined;
      if (!record(child) && !Array.isArray(child)) {
        child = {};
        Reflect.set(target, key, child);
      }
      target = child as Record<string, unknown> | unknown[];
    }
  }
  return next;
}

/** option.value 是索引，不是 String(value)：1 与 "1"、null 与 "null" 必须可区分。 */
export function schemaFormEnumIndex(choices: readonly unknown[], value: unknown): string {
  const index = choices.findIndex(choice => choice === value);
  return index === -1 ? '' : String(index);
}
export function schemaFormEnumValue(choices: readonly unknown[], index: string): unknown {
  if (index === '') return undefined;
  if (!/^(0|[1-9][0-9]*)$/u.test(index) || !Object.hasOwn(choices, Number(index))) throw new Error('Invalid form choice');
  return choices[Number(index)];
}
