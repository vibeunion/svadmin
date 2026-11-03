import { Type, type TSchema } from 'typebox';
import { Value } from 'typebox/value';

export type SchemaFormScalar = string | number | boolean | null;

/**
 * 条件路径从表单根开始，只能引用无条件的标量字段。
 * 组合器（all/any/not）与跨字段比较（equalsField）让联动表达力接近
 * schema 驱动的表单方案，但仍不引入表达式求值。
 */
export interface SchemaFormCondition {
  path?: readonly string[];
  equals?: SchemaFormScalar;
  notEquals?: SchemaFormScalar;
  exists?: boolean;
  /** 与另一字段的当前值比较（路径从表单根开始）。 */
  equalsField?: readonly string[];
  all?: readonly SchemaFormCondition[];
  any?: readonly SchemaFormCondition[];
  not?: SchemaFormCondition;
}

/** 声明式排版：只描述呈现分组，不参与校验与提交投影。 */
export type SchemaFormLayoutType='grid'|'section'|'steps';

export interface SchemaFormLayout {
  type: SchemaFormLayoutType;
  title?: string;
  description?: string;
  /** 仅 grid：1-4 列。 */
  columns?: 1|2|3|4;
  /** 仅 grid：字段跨列数。 */
  span?: 1|2|3|4;
  /** 仅 steps：有序分组序号。 */
  step?: number;
}

/** 封闭集合的派生规则；不编译表达式，避免把 schema 变成代码执行入口。 */
export type SchemaFormComputedOp='sum'|'count'|'first'|'concat';

export interface SchemaFormComputed {
  from: readonly string[];
  op: SchemaFormComputedOp;
  /** 仅 `concat` 使用，最多 8 个字符。 */
  separator?: string;
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
  computed?: SchemaFormComputed;
  layout?: SchemaFormLayout;
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
  'visibleWhen', 'computed', 'layout', 'minLength', 'maxLength', 'pattern', 'minimum', 'maximum', 'minItems', 'maxItems',
]);
const COMPUTED_OPS=new Set<SchemaFormComputedOp>(['sum','count','first','concat']);
const LAYOUT_TYPES=new Set<SchemaFormLayoutType>(['grid','section','steps']);
const scalar = (value: unknown): value is SchemaFormScalar => value === null ||
  typeof value === 'string' || typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));
const fail: () => never = () => { throw new TypeError('Invalid schema form configuration.'); };

/** 解析条件路径并断言它指向一个无条件标量字段。 */
function assertFieldPath(schema: SchemaFormSchema, parts: readonly string[]): void {
  if (parts.length === 0 || parts.length > 32 || parts.some(part => part === '')) fail();
  let controller: SchemaFormSchema=schema;
  for (const part of parts) {
    const properties=controller.properties;
    if (!properties || controller.visibleWhen || !Object.hasOwn(properties, part)) fail();
    const next=properties[part];
    if (!next) fail();
    controller=next;
  }
  if (controller.visibleWhen || controller.properties || controller.type === 'object' || controller.type === 'array') fail();
}

/** 条件结构自校验：组合器与路径二选一，并限制递归深度。 */
function assertCondition(condition: SchemaFormCondition, root: SchemaFormSchema, depth: number): void {
  if (!condition || typeof condition !== 'object' || Array.isArray(condition) || depth > 8) fail();
  const allowed=['path','equals','notEquals','exists','equalsField','all','any','not'];
  if (Object.keys(condition).some(key => !allowed.includes(key))) fail();
  const combinators=['all','any','not'].filter(key => Object.hasOwn(condition, key));
  const comparators=['equals','notEquals','exists','equalsField'].filter(key => Object.hasOwn(condition, key));
  const hasPath=condition.path !== undefined;
  if (combinators.length === 0 && !hasPath) fail();
  if (combinators.length > 0 && (hasPath || comparators.length > 0)) fail();
  if (combinators.length > 1) fail();
  if (condition.path !== undefined &&
      (!Array.isArray(condition.path) || condition.path.length === 0 || condition.path.length > 32 ||
       condition.path.some(part => typeof part !== 'string' || part === ''))) fail();
  if (condition.equalsField !== undefined &&
      (!Array.isArray(condition.equalsField) || condition.equalsField.length === 0 ||
       condition.equalsField.length > 32 || condition.equalsField.some(part => typeof part !== 'string' || part === ''))) fail();
  if ((Object.hasOwn(condition, 'equals') && !scalar(condition.equals)) ||
      (Object.hasOwn(condition, 'notEquals') && !scalar(condition.notEquals)) ||
      (Object.hasOwn(condition, 'exists') && typeof condition.exists !== 'boolean')) fail();
  if (condition.all !== undefined &&
      (!Array.isArray(condition.all) || condition.all.length === 0 || condition.all.length > 16)) fail();
  if (condition.any !== undefined &&
      (!Array.isArray(condition.any) || condition.any.length === 0 || condition.any.length > 16)) fail();
  if (condition.not !== undefined && (typeof condition.not !== 'object' || Array.isArray(condition.not))) fail();
  for (const child of condition.all ?? []) assertCondition(child, root, depth + 1);
  for (const child of condition.any ?? []) assertCondition(child, root, depth + 1);
  if (condition.not !== undefined) assertCondition(condition.not, root, depth + 1);
}

/** 条件路径必须指向无条件的标量字段（与 visibleWhen 的既有约束一致）。 */
function assertConditionPaths(condition: SchemaFormCondition, root: SchemaFormSchema): void {
  if (condition.path !== undefined) assertFieldPath(root, condition.path);
  if (condition.equalsField !== undefined) assertFieldPath(root, condition.equalsField);
  for (const child of condition.all ?? []) assertConditionPaths(child, root);
  for (const child of condition.any ?? []) assertConditionPaths(child, root);
  if (condition.not !== undefined) assertConditionPaths(condition.not, root);
}

/**
 * Schema 来自可信宿主，但仍拒绝未知关键字、循环、错误约束和超限结构。
 */
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
      const structural = new Set<string>();
      for (const child of Object.values(node.properties)) {
        visit(child, depth + 1);
        const layoutType = child.layout?.type;
        if (layoutType === 'section' || layoutType === 'steps') structural.add(layoutType);
      }
      if (structural.size > 1) fail();
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
      assertCondition(condition, schema, 0);
      assertConditionPaths(condition, schema);
    }
    const layout = node.layout;
    if (layout !== undefined) {
      if (!layout || typeof layout !== 'object' || Array.isArray(layout) ||
          Object.keys(layout).some(key => !['type', 'title', 'description', 'columns', 'span', 'step'].includes(key)) ||
          !LAYOUT_TYPES.has(layout.type)) fail();
      if (layout.title !== undefined && (typeof layout.title !== 'string' || layout.title.trim() === '' || layout.title.length > 120)) fail();
      if (layout.description !== undefined && (typeof layout.description !== 'string' || layout.description.length > 400)) fail();
      if (layout.columns !== undefined &&
          (layout.type !== 'grid' || ![1, 2, 3, 4].includes(layout.columns))) fail();
      if (layout.span !== undefined &&
          (layout.type !== 'grid' || ![1, 2, 3, 4].includes(layout.span))) fail();
      if (layout.step !== undefined &&
          (layout.type !== 'steps' || !Number.isSafeInteger(layout.step) || layout.step < 1 || layout.step > 12)) fail();
      if (layout.type === 'section' || layout.type === 'steps') {
        if (layout.title === undefined) fail();
      }
      if (layout.type === 'grid' && layout.step !== undefined) fail();
    }
    const computed = node.computed;
    if (computed !== undefined) {
      if (!computed || typeof computed !== 'object' || Array.isArray(computed) ||
          Object.keys(computed).some(key => !['from', 'op', 'separator'].includes(key)) ||
          !Array.isArray(computed.from) || computed.from.length === 0 || computed.from.length > 32 ||
          computed.from.some(part => typeof part !== 'string') ||
          !COMPUTED_OPS.has(computed.op)) fail();
      if (computed.separator !== undefined &&
          (computed.op !== 'concat' || typeof computed.separator !== 'string' || computed.separator.length > 8)) fail();
      // 派生字段是只读标量，写回对象/数组会让投影与校验产生二义性。
      if (kind === 'object' || kind === 'array') fail();
      for (const path of computed.from) assertFieldPath(schema, path.split('.'));
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
  if (condition.all !== undefined) return condition.all.every((child) => matchesSchemaFormCondition(child, value));
  if (condition.any !== undefined) return condition.any.some((child) => matchesSchemaFormCondition(child, value));
  if (condition.not !== undefined) return !matchesSchemaFormCondition(condition.not, value);
  if (condition.path === undefined) return false;
  const current = readSchemaFormPath(value, condition.path);
  if (condition.exists !== undefined && (current !== undefined) !== condition.exists) return false;
  if (Object.hasOwn(condition, 'equals') && !Object.is(current, condition.equals)) return false;
  if (Object.hasOwn(condition, 'notEquals') && Object.is(current, condition.notEquals)) return false;
  if (condition.equalsField !== undefined &&
      !Object.is(current, readSchemaFormPath(value, condition.equalsField))) return false;
  return true;
}

export function isSchemaFormNodeVisible(schema: SchemaFormSchema, rootValue: unknown): boolean {
  return matchesSchemaFormCondition(schema.visibleWhen, rootValue);
}

export interface SchemaFormLayoutField {
  key: string;
  /** 1-4；仅 grid 分组会大于 1。 */
  span: number;
}

export interface SchemaFormLayoutGroup {
  /** 稳定的渲染 key；默认分组为空字符串。 */
  key: string;
  title?: string;
  description?: string;
  step?: number;
  columns: 1|2|3|4;
  fields: readonly SchemaFormLayoutField[];
}

export interface SchemaFormLayoutPlan {
  kind: 'flat'|'sections'|'steps';
  columns: 1|2|3|4;
  groups: readonly SchemaFormLayoutGroup[];
}

/**
 * 把 `layout` 关键字折叠成渲染器可直接消费的分组计划。
 * 纯函数：不读取表单值，因此隐藏字段仍由 `visibleWhen` 在渲染时过滤。
 */
export function resolveSchemaFormLayout(schema: SchemaFormSchema): SchemaFormLayoutPlan {
  assertSchemaFormSchema(schema);
  const entries=Object.entries(schema.properties ?? {});
  let columns: 1|2|3|4=1;
  let sawSection=false;
  let sawSteps=false;
  for (const [, child] of entries) {
    const layout=child.layout;
    if (!layout) continue;
    if (layout.type === 'grid') columns=Math.max(columns, layout.columns ?? 1) as 1|2|3|4;
    if (layout.type === 'section') sawSection=true;
    if (layout.type === 'steps') sawSteps=true;
  }
  const kind: SchemaFormLayoutPlan['kind']=sawSteps ? 'steps' : sawSection ? 'sections' : 'flat';

  const groups: Array<{ key: string; title?: string; description?: string; step?: number; columns: 1|2|3|4; fields: Array<SchemaFormLayoutField> }>=[];
  let currentKey: string|undefined;
  for (const [key, child] of entries) {
    const layout=child.layout;
    const grouped=layout !== undefined && (layout.type === 'section' || layout.type === 'steps');
    const groupKey=grouped ? `${layout.type}:${layout.step ?? ''}:${layout.title ?? ''}` : '';
    if (currentKey !== groupKey) {
      currentKey=groupKey;
      groups.push({
        key: groupKey,
        columns: grouped ? 1 : columns,
        fields: [],
        ...(grouped && layout.title !== undefined ? { title: layout.title } : {}),
        ...(grouped && layout.description !== undefined ? { description: layout.description } : {}),
        ...(grouped && layout.type === 'steps' && layout.step !== undefined ? { step: layout.step } : {}),
      });
    }
    groups.at(-1)?.fields.push({
      key,
      span: layout?.type === 'grid' ? Math.min(layout.span ?? 1, columns) : 1,
    });
    if (layout?.type === 'grid' && layout.columns !== undefined) {
      const group=groups.at(-1);
      if (group) group.columns=Math.max(group.columns, layout.columns) as 1|2|3|4;
    }
  }

  return {
    kind,
    columns,
    groups: groups.map((group) => ({
      key: group.key,
      columns: group.columns,
      fields: group.fields,
      ...(group.title === undefined ? {} : { title: group.title }),
      ...(group.description === undefined ? {} : { description: group.description }),
      ...(group.step === undefined ? {} : { step: group.step }),
    })),
  };
}


/**
 * AutoForm 字段上的 `layout` 与 schema 关键字走同一投影。
 * 没有声明时返回 undefined，调用方保持原有 `group` / `columns` 行为。
 */
export function resolveDeclaredFieldLayout(
  fields: readonly { key: string; layout?: SchemaFormLayout }[],
): SchemaFormLayoutPlan | undefined {
  if (!fields.some((field) => field.layout !== undefined)) return undefined;
  const properties: Record<string, SchemaFormSchema> = {};
  for (const field of fields) {
    properties[field.key] = field.layout === undefined
      ? { type: 'string' }
      : { type: 'string', layout: field.layout };
  }
  return resolveSchemaFormLayout({ type: 'object', properties });
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

function readComputedSource(value: unknown, path: string): unknown {
  return readSchemaFormPath(value, path.split('.'));
}

function computeSchemaFormNode(node: SchemaFormComputed, value: unknown): SchemaFormScalar {
  const sources=node.from.map((path) => readComputedSource(value, path));
  switch (node.op) {
    case 'count': return sources.filter((entry) => entry !== undefined && entry !== null && entry !== '').length;
    case 'sum': return sources.reduce<number>((total, entry) => {
      const numeric=typeof entry === 'number' ? entry : typeof entry === 'string' ? Number(entry) : Number.NaN;
      return Number.isFinite(numeric) ? total + numeric : total;
    }, 0);
    case 'first': {
      const first=sources.find((entry) => scalar(entry));
      return scalar(first) ? first : null;
    }
    case 'concat': {
      const parts=sources.filter((entry): entry is string|number|boolean =>
        typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean');
      return parts.join(node.separator ?? '');
    }
    default: return null;
  }
}

/**
 * 计算 `computed` 字段并返回新的表单值；不修改入参，也不参与写回校验。
 * 派生值只用于展示与只读提交，宿主仍可覆盖。
 */
export function applySchemaFormComputed(schema: SchemaFormSchema, value: unknown): unknown {
  assertSchemaFormSchema(schema);
  let visited=0;
  function visit(node: SchemaFormSchema, current: unknown): unknown {
    if (++visited > 1000) throw new TypeError('Schema form data limit exceeded.');
    if (node.properties && current !== null && typeof current === 'object' && !Array.isArray(current)) {
      const source=current as Record<string, unknown>;
      const result: Record<string, unknown>={ ...source };
      for (const [key, child] of Object.entries(node.properties)) {
        if (child.computed !== undefined) {
          Object.defineProperty(result, key, {
            value: computeSchemaFormNode(child.computed, value),
            enumerable: true,
            writable: true,
            configurable: true,
          });
        }
        if (Object.hasOwn(source, key)) {
          Object.defineProperty(result, key, { value: visit(child, source[key]), enumerable: true, writable: true, configurable: true });
        }
      }
      return result;
    }
    if (Array.isArray(current) && node.items) return current.map((item) => visit(node.items as SchemaFormSchema, item));
    return current;
  }
  return visit(schema, value);
}

export function validateSchemaFormValue(schema: SchemaFormSchema, value: unknown): SchemaFormValidationError[] {
  return prepareSchemaFormValue(schema, value).errors;
}
