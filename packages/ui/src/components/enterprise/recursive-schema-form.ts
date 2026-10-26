import { readSchemaForm, validateSchemaForm, type JsonScalar, type SchemaFormModel, type SchemaFormIssue } from './json-schema-form.js';
import { SCHEMA_FORM_LIMITS, schemaFormSnapshot } from '../json-schema-form-state.js';

type Node =
  | { kind: 'object'; properties: Record<string, Node>; required: Set<string>; additional: boolean; nullable: boolean }
  | { kind: 'array'; item: Node; min: number | undefined; max: number | undefined; nullable: boolean }
  | { kind: 'oneOf'; branches: Node[]; propertyName: string; values: JsonScalar[][]; nullable: boolean }
  | { kind: 'scalar'; model: SchemaFormModel };
export type RecursiveSchemaFormNode = Node;
export type OneOfSelection = number | 'oneOf-unselected' | 'oneOf-ambiguous';
export interface RecursiveSchemaFormModel { node: Node | undefined; issues: SchemaFormIssue[] }
const annotationKeys = ['$schema', '$id', '$comment', 'title', 'description', 'type', 'default', 'readOnly', 'writeOnly', 'deprecated', 'examples'];
const objectKeys = new Set([...annotationKeys, 'properties', 'required', 'additionalProperties']);
const rootKeys = new Set([...objectKeys, '$defs']);
const arrayKeys = new Set([...annotationKeys, 'items', 'minItems', 'maxItems']);
const oneOfKeys = new Set([...annotationKeys, 'oneOf', 'discriminator']);
const rootOneOfKeys = new Set([...rootKeys, 'oneOf', 'discriminator']);
const MAX_ONEOF_BRANCHES = 256;
const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
const internalRef = /^#\/\$defs\/([^/]+)$/u;
const sameScalar = (left: unknown, right: unknown): boolean => Object.is(left, right);
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
/** Decode one RFC6901 reference token; a bare or malformed `~` escape is rejected. */
function decodePointerSegment(segment: string): string | undefined {
  if (!segment) return undefined;
  let result = '';
  for (let index = 0; index < segment.length; index++) {
    const character = segment[index];
    if (character !== '~') { result += character; continue; }
    const escape = segment[++index];
    if (escape === '0') result += '~';
    else if (escape === '1') result += '/';
    else return undefined;
  }
  return result;
}

/** Compile bounded objects/arrays, delegating scalar assertions to the reviewed leaf validator.
 * Unsupported assertions fail closed; this is deliberately not a complete JSON Schema engine.
 * TypeBox's symbol annotations are not JSON assertion keywords and are not executed.
 */
export function readRecursiveSchemaForm(schema: unknown): RecursiveSchemaFormModel {
  const issues: SchemaFormIssue[] = [];
  const active = new Set<object>();
  let definitions: Record<string, unknown> | undefined;
  let visited = 0;
  let references = 0;
  const issue = (path: string, code: SchemaFormIssue['code']): void => {
    if (issues.length < 128) issues.push({ path, code });
  };
  /** `oneOf` 只接受显式 discriminator；分支 selector 值必须唯一，绝不尝试首个匹配分支。 */
  function readOneOf(raw: Record<string, unknown>, path: string, depth: number, root: boolean): Node | undefined {
    // 根级 oneOf 与字段级共享同一显式 discriminator 契约，由表单根部渲染选择器。
    const allowed = root ? rootOneOfKeys : oneOfKeys;
    for (const key of Object.keys(raw)) if (!allowed.has(key)) issue(path + schemaFormPointer([key]), 'unsupported-schema');
    if (raw['type'] !== undefined && raw['type'] !== 'object') { issue(path + '/type', 'oneOf-invalid'); return; }
    const branchesRaw = raw['oneOf'];
    if (!Array.isArray(branchesRaw) || branchesRaw.length === 0 || branchesRaw.length > MAX_ONEOF_BRANCHES
      || Reflect.ownKeys(branchesRaw).some(key => typeof key === 'symbol')
      || Object.keys(branchesRaw).some(key => !/^(0|[1-9]\d*)$/u.test(key) || Number(key) >= branchesRaw.length)) {
      issue(path + '/oneOf', 'oneOf-invalid'); return;
    }
    const discriminator = raw['discriminator'];
    if (discriminator === undefined) { issue(path + '/oneOf', 'oneOf-unsupported'); return; }
    // discriminator 与根 Schema 一样按数据属性读取；accessor 在编译期拒绝且不执行。
    if (!dataRecord(discriminator)) { issue(path + '/discriminator', 'oneOf-invalid'); return; }
    const discriminatorKeys = Object.keys(discriminator);
    if (discriminatorKeys.length !== 1 || discriminatorKeys[0] !== 'propertyName') {
      issue(path + '/discriminator', 'oneOf-unsupported'); return;
    }
    const propertyNameDescriptor = Object.getOwnPropertyDescriptor(discriminator, 'propertyName');
    const propertyName = propertyNameDescriptor && 'value' in propertyNameDescriptor ? propertyNameDescriptor.value : undefined;
    if (typeof propertyName !== 'string' || !propertyName || unsafe.has(propertyName)) {
      issue(path + '/discriminator' + schemaFormPointer(['propertyName']), 'oneOf-invalid'); return;
    }
    const branches: Node[] = [];
    const values: JsonScalar[][] = [];
    const seen = new Map<string, number>();
    let ambiguous = false;
    for (let index = 0; index < branchesRaw.length; index++) {
      const branchPath = path + '/oneOf/' + index;
      const descriptor = Object.getOwnPropertyDescriptor(branchesRaw, String(index));
      if (!descriptor || !('value' in descriptor)) { issue(branchPath, 'oneOf-invalid'); continue; }
      const branch = read(descriptor.value, branchPath, depth + 1);
      if (!branch) continue;
      if (branch.kind !== 'object') { issue(branchPath, 'oneOf-invalid'); continue; }
      const selector = branch.properties[propertyName];
      const field = selector?.kind === 'scalar' ? selector.model.fields[0] : undefined;
      const choices = field?.choices;
      if (selector?.kind !== 'scalar' || !field || !choices?.length) {
        issue(branchPath + schemaFormPointer([propertyName]), 'oneOf-invalid'); continue;
      }
      for (const value of choices) {
        const key = value === null ? 'null' : `${typeof value}:${String(value)}`;
        const existing = seen.get(key);
        if (existing !== undefined && existing !== index) ambiguous = true;
        else seen.set(key, index);
      }
      branches.push(branch);
      values.push([...choices]);
    }
    if (ambiguous) issue(path + '/oneOf', 'oneOf-ambiguous');
    if (!branches.length || branches.length !== branchesRaw.length) return;
    return { kind: 'oneOf', branches, propertyName, values, nullable: false };
  }
  function read(raw: unknown, path: string, depth: number, root = false, refDepth = 0): Node | undefined {
    if (++visited > SCHEMA_FORM_LIMITS.nodes || depth > SCHEMA_FORM_LIMITS.depth || !dataRecord(raw) || active.has(raw)) {
      issue(path, 'invalid-schema'); return;
    }
    active.add(raw);
    try {
      if (Object.hasOwn(raw, '$ref')) {
        if (Reflect.ownKeys(raw).length !== 1) { issue(path, 'unsupported-schema'); return; }
        const reference = raw['$ref'];
        if (typeof reference !== 'string') { issue(path, 'ref-invalid'); return; }
        const targetMatch = internalRef.exec(reference);
        const targetName = targetMatch?.[1];
        const name = typeof targetName === 'string' ? decodePointerSegment(targetName) : undefined;
        if (name === undefined || unsafe.has(name) || !definitions || !Object.hasOwn(definitions, name)) {
          issue(path, 'ref-invalid'); return;
        }
        if (++references > 256 || refDepth + 1 > SCHEMA_FORM_LIMITS.depth) { issue(path, 'ref-limit'); return; }
        const target = definitions[name];
        if (target !== null && typeof target === 'object' && active.has(target)) {
          issue(path, 'ref-cycle'); return;
        }
        // A reference is transparent: the target occupies the referencing node's depth.
        return read(target, path, depth, false, refDepth + 1);
      }
      if (root && Object.hasOwn(raw, '$defs')) {
        const candidates = raw['$defs'];
        if (!dataRecord(candidates) || Object.keys(candidates).length > 256) issue(path + '/$defs', 'invalid-schema');
        else definitions = candidates;
      }
      for (const key of ['readOnly', 'writeOnly', 'deprecated']) {
        if (raw[key] !== undefined && typeof raw[key] !== 'boolean') issue(path + '/' + key, 'invalid-schema');
      }
      if (Object.hasOwn(raw, 'default')) {
        try { schemaFormSnapshot({ value: raw['default'] }); }
        catch { issue(path + '/default', 'invalid-schema'); }
      }
      if (Object.hasOwn(raw, 'oneOf')) return readOneOf(raw, path, depth, root);
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
      if (type !== 'object' && type !== 'array') {
        const model = readSchemaForm({ type: 'object', properties: { value: raw } });
        for (const failure of model.issues) issue(path + failure.path.replace(/^\/value(?=\/|$)/u, ''), failure.code);
        return { kind: 'scalar', model };
      }
      const allowed = type === 'object' ? (root ? rootKeys : objectKeys) : arrayKeys;
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

function dataValue(current: unknown, key: string): unknown {
  if (!record(current)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(current, key);
  return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
}

/** Return the unique branch selected by data; missing or overlapping values never fall back to first match. */
export function selectRecursiveOneOfBranch(node: RecursiveSchemaFormNode, current: unknown): OneOfSelection {
  if (node.kind !== 'oneOf') return 'oneOf-unselected';
  const value = dataValue(current, node.propertyName);
  let found = -1;
  for (const [index, choices] of node.values.entries()) {
    if (!choices.some(choice => sameScalar(choice, value))) continue;
    if (found >= 0) return 'oneOf-ambiguous';
    found = index;
  }
  return found >= 0 ? found : 'oneOf-unselected';
}

/** Switch the explicit discriminator and drop keys that exist only on unselected branches. */
export function switchRecursiveOneOfBranch(
  node: RecursiveSchemaFormNode,
  current: unknown,
  index: number,
  preferred?: JsonScalar,
): Record<string, unknown> | undefined {
  if (node.kind !== 'oneOf' || !Number.isSafeInteger(index) || index < 0 || index >= node.branches.length) return undefined;
  if (!record(current)) return undefined;
  const choices = node.values[index];
  const branch = node.branches[index];
  if (!choices?.length || !branch || branch.kind !== 'object') return undefined;
  const selectedValue = preferred !== undefined && choices.some(choice => sameScalar(choice, preferred)) ? preferred : choices[0];
  if (selectedValue === undefined) return undefined;
  const selectedKeys = new Set(Object.keys(branch.properties));
  const stale = new Set<string>();
  for (const [otherIndex, other] of node.branches.entries()) {
    if (otherIndex === index || other.kind !== 'object') continue;
    for (const key of Object.keys(other.properties)) if (!selectedKeys.has(key)) stale.add(key);
  }
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(current)) {
    if (stale.has(key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor !== undefined && 'value' in descriptor) result[key] = descriptor.value;
  }
  result[node.propertyName] = selectedValue;
  return result;
}

function pruneNodeValue(node: Node, payload: Record<string, unknown>): Record<string, unknown> {
  let nodes = 0;
  function prune(currentNode: Node, current: unknown, depth: number): unknown {
    if (++nodes > SCHEMA_FORM_LIMITS.nodes || depth > SCHEMA_FORM_LIMITS.depth) throw new Error('Form value exceeds limits');
    if (currentNode.kind === 'scalar') return current;
    if (currentNode.kind === 'array') {
      return Array.isArray(current) ? current.map(item => prune(currentNode.item, item, depth + 1)) : current;
    }
    if (currentNode.kind === 'object') {
      if (!record(current)) return current;
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(current)) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor || !('value' in descriptor)) continue;
        const child = currentNode.properties[key];
        result[key] = child ? prune(child, descriptor.value, depth + 1) : descriptor.value;
      }
      return result;
    }
    const selected = selectRecursiveOneOfBranch(currentNode, current);
    if (typeof selected !== 'number') return current;
    const branch = currentNode.branches[selected];
    if (!branch || branch.kind !== 'object' || !record(current)) return current;
    const selectedKeys = new Set(Object.keys(branch.properties));
    const stale = new Set<string>();
    for (const [index, other] of currentNode.branches.entries()) {
      if (index === selected || other.kind !== 'object') continue;
      for (const key of Object.keys(other.properties)) if (!selectedKeys.has(key)) stale.add(key);
    }
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(current)) {
      if (stale.has(key)) continue;
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (!descriptor || !('value' in descriptor)) continue;
      const child = branch.properties[key];
      result[key] = child ? prune(child, descriptor.value, depth + 1) : descriptor.value;
    }
    return result;
  }
  return prune(node, payload, 0) as Record<string, unknown>;
}

/** Return a detached payload with stale unselected `oneOf` branch keys removed. */
export function pruneRecursiveSchemaFormValue(model: RecursiveSchemaFormModel, value: unknown): Record<string, unknown> {
  const payload = schemaFormSnapshot(value);
  return model.node ? pruneNodeValue(model.node, payload) : payload;
}

/** Validate a detached JSON payload without defaults, coercion, cleaning or partial acceptance. */
export function validateRecursiveSchemaForm(model: RecursiveSchemaFormModel, value: unknown): SchemaFormIssue[] {
  if (model.issues.length || !model.node) return model.issues.length ? [...model.issues] : [{ path: '', code: 'invalid-schema' }];
  const issues: SchemaFormIssue[] = [];
  const issue = (path: string, code: SchemaFormIssue['code']): void => {
    if (issues.length < 128) issues.push({ path, code });
  };
  let payload: Record<string, unknown>;
  try {
    payload = schemaFormSnapshot(value);
    if (model.node) payload = pruneNodeValue(model.node, payload);
  } catch { return [{ path: '', code: 'invalid-value' }]; }
  let visited = 0;
  function visit(node: Node, current: unknown, path: string, required: boolean, depth: number): void {
    if (++visited > SCHEMA_FORM_LIMITS.nodes || depth > SCHEMA_FORM_LIMITS.depth) { issue(path, 'invalid-value'); return; }
    if (current === undefined) { if (required) issue(path, 'required'); return; }
    if (node.kind === 'oneOf') {
      const selected = selectRecursiveOneOfBranch(node, current);
      if (selected === 'oneOf-ambiguous') { issue(path + '/oneOf', 'oneOf-ambiguous'); return; }
      if (selected === 'oneOf-unselected') { issue(path + schemaFormPointer([node.propertyName]), 'oneOf-unselected'); return; }
      visit(node.branches[selected] as Node, current, path, true, depth + 1);
      return;
    }
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
