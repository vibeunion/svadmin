import { readSchemaForm, validateSchemaForm, type SchemaFormModel, type SchemaFormIssue } from './json-schema-form.js';
import { SCHEMA_FORM_LIMITS, schemaFormSnapshot } from '../json-schema-form-state.js';

type Node =
  | { kind: 'object'; properties: Record<string, Node>; required: Set<string>; additional: boolean; nullable: boolean }
  | { kind: 'array'; item: Node; min: number | undefined; max: number | undefined; nullable: boolean }
  | { kind: 'scalar'; model: SchemaFormModel };
export interface RecursiveSchemaFormModel { node: Node | undefined; issues: SchemaFormIssue[] }
const annotationKeys = ['$schema', '$id', '$comment', 'title', 'description', 'type', 'default', 'readOnly', 'writeOnly', 'deprecated', 'examples'];
const objectKeys = new Set([...annotationKeys, 'properties', 'required', 'additionalProperties']);
const arrayKeys = new Set([...annotationKeys, 'items', 'minItems', 'maxItems']);
const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
export const schemaFormPointer = (path: readonly string[]): string => path.map(key => '/' + key.replaceAll('~', '~0').replaceAll('/', '~1')).join('');
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function dataRecord(value: unknown): value is Record<string, unknown> {
  return record(value) && Object.keys(value).every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && 'value' in descriptor;
  });
}

/** Compile bounded objects/arrays, delegating scalar assertions to the reviewed leaf validator.
 * Unsupported assertions fail closed; this is deliberately not a complete JSON Schema engine.
 * TypeBox's symbol annotations are not JSON assertion keywords and are not executed.
 */
export function readRecursiveSchemaForm(schema: unknown): RecursiveSchemaFormModel {
  const issues: SchemaFormIssue[] = [];
  const active = new Set<object>();
  let visited = 0;
  const issue = (path: string, code: SchemaFormIssue['code']): void => {
    if (issues.length < 128) issues.push({ path, code });
  };
  function read(raw: unknown, path: string, depth: number, root = false): Node | undefined {
    if (++visited > SCHEMA_FORM_LIMITS.nodes || depth > SCHEMA_FORM_LIMITS.depth || !dataRecord(raw) || active.has(raw)) {
      issue(path, 'invalid-schema'); return;
    }
    active.add(raw);
    try {
      let type = raw['type'];
      let nullable = false;
      if (Array.isArray(type)) {
        const concrete = type.filter(value => value !== 'null');
        if (type.length !== 2 || concrete.length !== 1 || !type.includes('null')) {
          issue(path, 'unsupported-schema'); return;
        }
        nullable = true;
        type = concrete[0];
      }
      if (type === undefined && (root || Object.hasOwn(raw, 'properties'))) type = 'object';
      if (root && type !== 'object') { issue(path, 'unsupported-schema'); return; }
      for (const key of ['readOnly', 'writeOnly', 'deprecated']) {
        if (raw[key] !== undefined && typeof raw[key] !== 'boolean') issue(path + '/' + key, 'invalid-schema');
      }
      if (Object.hasOwn(raw, 'default')) {
        try { schemaFormSnapshot({ value: raw['default'] }); }
        catch { issue(path + '/default', 'invalid-schema'); }
      }
      if (type !== 'object' && type !== 'array') {
        const model = readSchemaForm({ type: 'object', properties: { value: raw } });
        for (const failure of model.issues) issue(path + failure.path.replace(/^\/value(?=\/|$)/u, ''), failure.code);
        return { kind: 'scalar', model };
      }
      const allowed = type === 'object' ? objectKeys : arrayKeys;
      for (const key of Object.keys(raw)) if (!allowed.has(key)) issue(path + '/' + key, 'unsupported-schema');
      if (type === 'object') {
        const properties = raw['properties'] ?? {};
        if (!dataRecord(properties) || Object.keys(properties).length > 256 || raw['properties'] === null) {
          issue(path + '/properties', 'invalid-schema'); return;
        }
        const keys = raw['required'] ?? [];
        if (!Array.isArray(keys) || keys.length > 256 || raw['required'] === null
          || new Set(keys).size !== keys.length || keys.some(key => typeof key !== 'string' || !Object.hasOwn(properties, key))) {
          issue(path + '/required', 'invalid-schema'); return;
        }
        if (raw['additionalProperties'] !== undefined && typeof raw['additionalProperties'] !== 'boolean') {
          issue(path + '/additionalProperties', 'unsupported-schema');
        }
        const result: Record<string, Node> = Object.create(null) as Record<string, Node>;
        for (const [key, child] of Object.entries(properties)) {
          const childPath = path + schemaFormPointer([key]);
          if (unsafe.has(key)) { issue(childPath, 'invalid-schema'); continue; }
          const node = read(child, childPath, depth + 1);
          if (node) result[key] = node;
        }
        return { kind: 'object', properties: result, required: new Set(keys as string[]), additional: raw['additionalProperties'] !== false, nullable };
      }
      const item = read(raw['items'], path + '/items', depth + 1);
      const definition = raw;
      function bound(key: string): number | undefined {
        const value = definition[key];
        if (value === undefined) return;
        if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) { issue(path + '/' + key, 'invalid-schema'); return; }
        return value;
      }
      const min = bound('minItems'), max = bound('maxItems');
      if (min !== undefined && max !== undefined && min > max) issue(path, 'invalid-schema');
      return item ? { kind: 'array', item, min, max, nullable } : undefined;
    } finally { active.delete(raw); }
  }
  let node: Node | undefined;
  try { node = read(schema, '', 0, true); }
  catch { issue('', 'invalid-schema'); }
  return { node, issues };
}

/** Validate a detached JSON payload without defaults, coercion, cleaning or partial acceptance. */
export function validateRecursiveSchemaForm(model: RecursiveSchemaFormModel, value: unknown): SchemaFormIssue[] {
  if (model.issues.length || !model.node) return model.issues.length ? [...model.issues] : [{ path: '', code: 'invalid-schema' }];
  const issues: SchemaFormIssue[] = [];
  const issue = (path: string, code: SchemaFormIssue['code']): void => {
    if (issues.length < 128) issues.push({ path, code });
  };
  let payload: Record<string, unknown>;
  try { payload = schemaFormSnapshot(value); }
  catch { return [{ path: '', code: 'invalid-value' }]; }
  let visited = 0;
  function visit(node: Node, current: unknown, path: string, required: boolean, depth: number): void {
    if (++visited > SCHEMA_FORM_LIMITS.nodes || depth > SCHEMA_FORM_LIMITS.depth) { issue(path, 'invalid-value'); return; }
    if (current === undefined) { if (required) issue(path, 'required'); return; }
    if (node.kind === 'scalar') {
      for (const failure of validateSchemaForm(node.model, { value: current })) issue(path + failure.path.replace(/^\/value(?=\/|$)/u, ''), failure.code);
      return;
    }
    if (current === null && node.nullable) return;
    if (node.kind === 'object') {
      if (!record(current)) { issue(path, 'type'); return; }
      for (const [key, child] of Object.entries(node.properties)) {
        visit(child, Object.hasOwn(current, key) ? current[key] : undefined, path + schemaFormPointer([key]), node.required.has(key), depth + 1);
      }
      if (!node.additional) for (const key of Object.keys(current)) {
        if (!Object.hasOwn(node.properties, key)) issue(path + schemaFormPointer([key]), 'additionalProperties');
      }
      return;
    }
    if (!Array.isArray(current)) { issue(path, 'type'); return; }
    if (node.min !== undefined && current.length < node.min) issue(path, 'minItems');
    if (node.max !== undefined && current.length > node.max) issue(path, 'maxItems');
    for (const [index, item] of current.entries()) visit(node.item, item, path + '/' + index, true, depth + 1);
  }
  visit(model.node, payload, '', true, 0);
  return issues;
}
