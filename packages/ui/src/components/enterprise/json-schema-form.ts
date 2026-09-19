/** JsonSchemaForm 当前支持的标量子集。未知断言必须显式拒绝，不能假装已校验。 */
export type JsonScalar = string | number | boolean | null;
export type SchemaIssueCode = 'unsupported-schema' | 'invalid-schema' | 'required' | 'type' | 'enum' | 'minimum' | 'maximum' | 'multipleOf' | 'minLength' | 'maxLength' | 'additionalProperties' | 'invalid-value';
export interface SchemaFormIssue { path: string; code: SchemaIssueCode }
export interface SchemaFormField {
  key: string;
  title: string;
  description: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'enum';
  nullable: boolean;
  required: boolean;
  readonly: boolean;
  choices: JsonScalar[] | undefined;
  hasDefault: boolean;
  defaultValue: JsonScalar | undefined;
  minimum: number | undefined;
  maximum: number | undefined;
  exclusiveMinimum: number | undefined;
  exclusiveMaximum: number | undefined;
  multipleOf: number | undefined;
  minLength: number | undefined;
  maxLength: number | undefined;
}
export interface SchemaFormModel { fields: SchemaFormField[]; issues: SchemaFormIssue[]; additionalProperties: boolean }
const rootKeys = new Set(['$schema', '$id', '$comment', 'title', 'description', 'type', 'properties', 'required', 'additionalProperties']);
const fieldKeys = new Set(['$id', '$comment', 'title', 'description', 'type', 'enum', 'const', 'default', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minLength', 'maxLength', 'readOnly', 'writeOnly', 'deprecated', 'examples']);
const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);
const pointer = (key: string): string => `/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const scalar = (value: unknown): value is JsonScalar => value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value));
const same = (a: unknown, b: unknown): boolean => a === b;
function matches(field: SchemaFormField, value: unknown): boolean {
  if (value === null) return field.nullable;
  if (field.type === 'enum') return scalar(value);
  if (field.type === 'integer') return typeof value === 'number' && Number.isSafeInteger(value);
  if (field.type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === field.type;
}

export function readSchemaForm(schema: Record<string, unknown>): SchemaFormModel {
  const model: SchemaFormModel = { fields: [], issues: [], additionalProperties: true };
  const issue = (path: string, code: SchemaIssueCode): void => { model.issues.push({ path, code }); };
  if (!record(schema)) { issue('', 'invalid-schema'); return model; }
  for (const key of Object.keys(schema)) if (!rootKeys.has(key)) issue(pointer(key), 'unsupported-schema');
  if (schema['type'] !== undefined && schema['type'] !== 'object') issue('/type', 'unsupported-schema');
  if (schema['additionalProperties'] !== undefined && typeof schema['additionalProperties'] !== 'boolean') issue('/additionalProperties', 'unsupported-schema');
  model.additionalProperties = schema['additionalProperties'] !== false;
  const properties = schema['properties'] === undefined ? {} : schema['properties'];
  if (!record(properties) || Object.keys(properties).length > 256) { issue('/properties', 'invalid-schema'); return model; }
  const required = schema['required'] === undefined ? [] : schema['required'];
  if (!Array.isArray(required) || required.length > 256 || required.some((key) => typeof key !== 'string' || !Object.hasOwn(properties, key))) issue('/required', 'invalid-schema');
  const requiredKeys = new Set(Array.isArray(required) ? required : []);
  for (const [key, raw] of Object.entries(properties)) {
    const path = pointer(key);
    if (unsafeKeys.has(key) || !record(raw)) { issue(path, 'invalid-schema'); continue; }
    for (const keyword of Object.keys(raw)) if (!fieldKeys.has(keyword)) issue(`${path}${pointer(keyword)}`, 'unsupported-schema');
    let type: unknown = raw['type'];
    let nullable = false;
    if (Array.isArray(type)) {
      nullable = type.includes('null');
      const nonNull = type.filter((item) => item !== 'null');
      if (type.length !== 2 || nonNull.length !== 1) issue(path, 'unsupported-schema');
      type = nonNull[0];
    }
    const hasEnum = Object.hasOwn(raw, 'enum');
    const hasConst = Object.hasOwn(raw, 'const');
    const rawChoices = hasEnum ? raw['enum'] : hasConst ? [raw['const']] : undefined;
    let choices: JsonScalar[] | undefined;
    if (rawChoices !== undefined) {
      if (!Array.isArray(rawChoices) || rawChoices.length === 0 || rawChoices.length > 1000 || !rawChoices.every(scalar)) issue(path, 'invalid-schema');
      else {
        choices = [...rawChoices];
        if (hasConst) choices = choices.filter((item) => same(item, raw['const']));
        if (!choices.length) issue(path, 'invalid-schema');
      }
    } else if (hasEnum) issue(path, 'invalid-schema');
    if (type === undefined) type = choices ? 'enum' : 'string';
    else if (type === 'enum') { issue(path, 'invalid-schema'); continue; }
    if (!['string', 'number', 'integer', 'boolean', 'enum'].includes(String(type))) { issue(path, 'unsupported-schema'); continue; }
    if (type === 'enum') nullable = choices?.includes(null) ?? false;
    const field: SchemaFormField = {
      key, title: String(raw['title'] ?? key), description: String(raw['description'] ?? ''),
      type: type as SchemaFormField['type'], nullable, required: requiredKeys.has(key), readonly: raw['readOnly'] === true,
      choices, hasDefault: Object.hasOwn(raw, 'default'), defaultValue: scalar(raw['default']) ? raw['default'] : undefined,
      minimum: undefined, maximum: undefined, exclusiveMinimum: undefined, exclusiveMaximum: undefined,
      multipleOf: undefined, minLength: undefined, maxLength: undefined,
    };
    for (const constraint of ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minLength', 'maxLength'] as const) {
      const value = raw[constraint];
      if (value === undefined) continue;
      if (typeof value !== 'number' || !Number.isFinite(value)
        || (constraint === 'multipleOf' && value <= 0)
        || ((constraint === 'minLength' || constraint === 'maxLength') && (!Number.isSafeInteger(value) || value < 0))) issue(`${path}/${constraint}`, 'invalid-schema');
      else field[constraint] = value;
    }
    if (choices?.some((choice) => !matches(field, choice))) issue(path, 'invalid-schema');
    if (field.hasDefault && (!scalar(raw['default']) || !matches(field, raw['default']) || (choices && !choices.some((choice) => same(choice, raw['default']))))) issue(path, 'invalid-schema');
    model.fields.push(field);
  }
  return model;
}

/** 只为不存在的键补默认值；显式 undefined 表示用户已清空，不重新灌回默认值。 */
export function schemaFormValues(model: SchemaFormModel, value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...value };
  for (const field of model.fields) if (!Object.hasOwn(value, field.key) && field.hasDefault) result[field.key] = field.defaultValue;
  return result;
}

export function parseSchemaNumber(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim())) throw new Error('invalid-value');
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error('invalid-value');
  return value;
}
export function enumIndex(choices: readonly JsonScalar[], value: unknown): string {
  const index = choices.findIndex((choice) => same(choice, value));
  return index < 0 ? '' : String(index);
}
export function enumValue(choices: readonly JsonScalar[], index: string): JsonScalar | undefined {
  if (index === '') return undefined;
  if (!/^(0|[1-9]\d*)$/.test(index)) throw new Error('invalid-value');
  const value = choices[Number(index)];
  if (value === undefined) throw new Error('invalid-value');
  return value;
}

export function validateSchemaForm(model: SchemaFormModel, value: Record<string, unknown>): SchemaFormIssue[] {
  const issues = [...model.issues];
  if (!record(value)) return [...issues, { path: '', code: 'invalid-value' }];
  for (const field of model.fields) {
    const path = pointer(field.key), current = Object.hasOwn(value, field.key) ? value[field.key] : undefined;
    const issue = (code: SchemaIssueCode): void => { issues.push({ path, code }); };
    if (current === undefined) { if (field.required) issue('required'); continue; }
    if (!matches(field, current)) { issue('type'); continue; }
    if (field.choices && !field.choices.some((choice) => same(choice, current))) issue('enum');
    if (typeof current === 'number') {
      if ((field.minimum !== undefined && current < field.minimum) || (field.exclusiveMinimum !== undefined && current <= field.exclusiveMinimum)) issue('minimum');
      if ((field.maximum !== undefined && current > field.maximum) || (field.exclusiveMaximum !== undefined && current >= field.exclusiveMaximum)) issue('maximum');
      if (field.multipleOf !== undefined) {
        const quotient = current / field.multipleOf;
        if (!Number.isFinite(quotient) || Math.abs(quotient - Math.round(quotient)) > Math.min(1e-8, Number.EPSILON * Math.max(1, Math.abs(quotient)) * 4)) issue('multipleOf');
      }
    }
    if (typeof current === 'string') {
      const length = Array.from(current).length;
      if (field.minLength !== undefined && length < field.minLength) issue('minLength');
      if (field.maxLength !== undefined && length > field.maxLength) issue('maxLength');
    }
  }
  const keys = new Set(model.fields.map((field) => field.key));
  for (const [key, current] of Object.entries(value)) {
    if (unsafeKeys.has(key)) issues.push({ path: pointer(key), code: 'invalid-value' });
    if (!model.additionalProperties && !keys.has(key) && current !== undefined) issues.push({ path: pointer(key), code: 'additionalProperties' });
  }
  return issues;
}

/** 提交使用独立 JSON 快照；拒绝循环/非 JSON 值，不把 undefined 偷换成 null。 */
export function schemaFormSnapshot(value: Record<string, unknown>): Record<string, unknown> {
  let visited = 0;
  const active = new Set<object>();
  function clone(current: unknown, depth: number): unknown {
    if (++visited > 10000 || depth > 32) throw new Error('invalid-value');
    if (scalar(current)) return current;
    if ((!record(current) && !Array.isArray(current)) || active.has(current)) throw new Error('invalid-value');
    active.add(current);
    try {
      if (Array.isArray(current)) {
        if (current.length > 10000) throw new Error('invalid-value');
        const result: unknown[] = [];
        for (let index = 0; index < current.length; index++) {
          if (!Object.hasOwn(current, index)) throw new Error('invalid-value');
          result.push(clone(current[index], depth + 1));
        }
        return result;
      }
      const result: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(current)) {
        if (unsafeKeys.has(key)) throw new Error('invalid-value');
        if (item !== undefined) result[key] = clone(item, depth + 1);
      }
      return result;
    } finally { active.delete(current); }
  }
  if (!record(value)) throw new Error('invalid-value');
  return clone(value, 0) as Record<string, unknown>;
}
