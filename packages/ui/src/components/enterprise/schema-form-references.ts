import { SCHEMA_FORM_LIMITS } from '../json-schema-form-state.js';
import type { SchemaFormIssue } from './json-schema-form.js';

/** 宿主已经取得的普通 Schema 文档；解析器不会为其执行任何加载动作。 */
export type SchemaFormReferenceDocuments = Record<string, unknown>;

/** 展开后的 Schema。渲染、默认值和校验都必须使用同一份结果。 */
export interface ResolvedSchemaForm<T> {
  schema: T | undefined;
  issues: SchemaFormIssue[];
}

const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
const internalRef = /^#\/\$defs\/([^/]+)$/u;
const externalRef = /^([^#]+)(?:#(.*))?$/u;
const MAX_REFERENCES = 256;
const MAX_DEFINITIONS = 256;
const typeBoxSymbols = new Set([
  Symbol.for('TypeBox.Kind'), Symbol.for('TypeBox.Optional'), Symbol.for('TypeBox.Readonly'),
]);
const typeBoxMetadata = new Set(['~kind', '~optional', '~readonly']);
const pointer = (key: string): string => '/' + key.replaceAll('~', '~0').replaceAll('/', '~1');

/** 只接受由数据属性组成的普通对象，不执行 getter。 */
function dataRecord(value: unknown, schemaNode = false): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Reflect.ownKeys(value).every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key === 'symbol') {
      return schemaNode && typeBoxSymbols.has(key)
        && descriptor !== undefined && 'value' in descriptor
        && typeof descriptor.value === 'string';
    }
    if (schemaNode && descriptor?.enumerable === false) {
      return typeBoxMetadata.has(key) && 'value' in descriptor;
    }
    return descriptor !== undefined && 'value' in descriptor;
  });
}

function own(record: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
}

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

function validDocumentUri(uri: string): boolean {
  if (uri.length === 0 || uri.includes('#')) return false;
  for (const character of uri) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x20 || code === 0x7f) return false;
  }
  return true;
}

function referenceTarget(
  reference: string,
  localDefinitions: Record<string, unknown> | undefined,
  documents: Record<string, unknown>,
): { target: unknown; definitions: Record<string, unknown> | undefined; root: boolean } | undefined {
  const local = internalRef.exec(reference);
  if (local) {
    const name = decodePointerSegment(local[1] ?? '');
    if (name === undefined || unsafe.has(name) || !localDefinitions || !Object.hasOwn(localDefinitions, name)) return undefined;
    return { target: own(localDefinitions, name), definitions: localDefinitions, root: false };
  }
  const match = externalRef.exec(reference);
  if (!match) return undefined;
  const uri = match[1] ?? '';
  if (!validDocumentUri(uri) || !Object.hasOwn(documents, uri)) return undefined;
  const document = own(documents, uri);
  if (!dataRecord(document, true)) return undefined;
  const fragment = match[2];
  if (fragment !== undefined && fragment !== '' && !fragment.startsWith('/$defs/')) return undefined;
  let definitions: Record<string, unknown> | undefined;
  const candidates = own(document, '$defs');
  if (candidates !== undefined) {
    if (!dataRecord(candidates) || Object.keys(candidates).length > MAX_DEFINITIONS) return undefined;
    definitions = candidates;
  }
  if (fragment === undefined || fragment === '') return { target: document, definitions, root: true };
  const name = decodePointerSegment(fragment.slice('/$defs/'.length));
  if (name === undefined || unsafe.has(name) || !definitions || !Object.hasOwn(definitions, name)) return undefined;
  return { target: own(definitions, name), definitions, root: false };
}

/**
 * 解析受控的本地外部引用子集。
 * 外部引用必须命中宿主传入的精确 URI 映射，只允许根文档或 `/$defs/<name>`；
 * 不执行网络、fetch/XHR、动态 import、storage 或环境读取。
 */
export function resolveSchemaFormReferences<T>(
  schema: T,
  referenceDocuments: SchemaFormReferenceDocuments = {},
): ResolvedSchemaForm<T> {
  const issues: SchemaFormIssue[] = [];
  const active = new Set<object>();
  const activeData = new Set<object>();
  let localDefinitions: Record<string, unknown> | undefined;
  let expansions = 0;
  let nodes = 0;
  const issue = (path: string, code: SchemaFormIssue['code']): void => {
    if (issues.length < 128) issues.push({ path, code });
  };

  if (!dataRecord(referenceDocuments)) {
    issue('', 'ref-invalid');
    referenceDocuments = {};
  }

  function copyData(raw: unknown, path: string, depth: number): unknown {
    if (++nodes > SCHEMA_FORM_LIMITS.nodes || depth > SCHEMA_FORM_LIMITS.depth) {
      issue(path, 'invalid-schema'); return undefined;
    }
    if (raw === undefined || raw === null || typeof raw === 'boolean' || typeof raw === 'string') return raw;
    if (typeof raw === 'number') {
      if (Number.isFinite(raw)) return raw;
      issue(path, 'invalid-schema'); return undefined;
    }
    if (typeof raw !== 'object' || activeData.has(raw)) { issue(path, 'invalid-schema'); return undefined; }
    activeData.add(raw);
    try {
      if (Array.isArray(raw)) {
        if (Reflect.ownKeys(raw).some(key => typeof key === 'symbol') || raw.length > SCHEMA_FORM_LIMITS.nodes) {
          issue(path, 'invalid-schema'); return undefined;
        }
        for (let index = 0; index < raw.length; index++) {
          const descriptor = Object.getOwnPropertyDescriptor(raw, String(index));
          if (!descriptor || !('value' in descriptor)) { issue(path + '/' + index, 'invalid-schema'); return undefined; }
        }
        if (Object.keys(raw).some(key => !/^(0|[1-9]\d*)$/u.test(key) || Number(key) >= raw.length)) {
          issue(path, 'invalid-schema'); return undefined;
        }
        const result: unknown[] = [];
        for (let index = 0; index < raw.length; index++) {
          result.push(copyData(own(raw as unknown as Record<string, unknown>, String(index)), path + '/' + index, depth + 1));
        }
        return result;
      }
      if (!dataRecord(raw)) { issue(path, 'invalid-schema'); return undefined; }
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(raw)) {
        if (unsafe.has(key)) { issue(path + pointer(key), 'invalid-schema'); continue; }
        const source = own(raw, key);
        const value = copyData(source, path + pointer(key), depth + 1);
        if (value !== undefined || source === undefined) {
          Object.defineProperty(result, key, { value, enumerable: true, configurable: true, writable: true });
        }
      }
      return result;
    } finally { activeData.delete(raw); }
  }

  function collectDefinitions(raw: Record<string, unknown>, path: string): Record<string, unknown> | undefined {
    const candidates = own(raw, '$defs');
    if (candidates === undefined) return undefined;
    if (!dataRecord(candidates) || Object.keys(candidates).length > MAX_DEFINITIONS) {
      issue(path + '/$defs', 'invalid-schema'); return undefined;
    }
    const collected: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of Object.keys(candidates)) {
      if (unsafe.has(key)) { issue(path + '/$defs' + pointer(key), 'invalid-schema'); continue; }
      collected[key] = own(candidates, key);
    }
    return collected;
  }

  function expand(raw: unknown, path: string, depth: number, refDepth: number, root: boolean, definitions = localDefinitions): unknown {
    if (++nodes > SCHEMA_FORM_LIMITS.nodes || depth > SCHEMA_FORM_LIMITS.depth) {
      issue(path, 'invalid-schema'); return undefined;
    }
    if (!dataRecord(raw, true) || active.has(raw)) { issue(path, 'invalid-schema'); return undefined; }
    active.add(raw);
    try {
      if (Object.hasOwn(raw, '$ref')) {
        const schemaKeys = Object.getOwnPropertyNames(raw).filter(key =>
          !(['~kind', '~optional', '~readonly'].includes(key)
            && Object.getOwnPropertyDescriptor(raw, key)?.enumerable === false));
        if (schemaKeys.length !== 1) { issue(path, 'unsupported-schema'); return undefined; }
        const reference = own(raw, '$ref');
        if (typeof reference !== 'string') { issue(path, 'ref-invalid'); return undefined; }
        const resolved = referenceTarget(reference, definitions, referenceDocuments);
        if (!resolved) { issue(path, 'ref-invalid'); return undefined; }
        if (++expansions > MAX_REFERENCES || refDepth + 1 > SCHEMA_FORM_LIMITS.depth) {
          issue(path, 'ref-limit'); return undefined;
        }
        const target = resolved.target;
        if (target !== null && typeof target === 'object' && active.has(target)) { issue(path, 'ref-cycle'); return undefined; }
        return expand(target, path, depth, refDepth + 1, resolved.root, resolved.definitions);
      }

      const currentDefinitions = root ? collectDefinitions(raw, path) : definitions;
      if (root) localDefinitions = currentDefinitions;
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(raw)) {
        if (root && key === '$defs') continue;
        if (key === 'properties') {
          const properties = own(raw, key);
          if (!dataRecord(properties) || Object.keys(properties).length > MAX_DEFINITIONS) {
            issue(path + '/properties', 'invalid-schema'); continue;
          }
          const expanded: Record<string, unknown> = {};
          for (const name of Object.keys(properties)) {
            if (unsafe.has(name)) { issue(path + '/properties' + pointer(name), 'invalid-schema'); continue; }
            const child = expand(own(properties, name), path + pointer(name), depth + 1, 0, false, currentDefinitions);
            if (child !== undefined) Object.defineProperty(expanded, name, { value: child, enumerable: true, configurable: true, writable: true });
          }
          Object.defineProperty(result, key, { value: expanded, enumerable: true, configurable: true, writable: true });
          continue;
        }
        if (key === 'items') {
          const item = expand(own(raw, key), path + '/items', depth + 1, 0, false, currentDefinitions);
          if (item !== undefined) Object.defineProperty(result, key, { value: item, enumerable: true, configurable: true, writable: true });
          continue;
        }
        if (key === 'oneOf') {
          const branches = own(raw, key);
          if (!Array.isArray(branches) || branches.length === 0 || branches.length > MAX_DEFINITIONS
            || Reflect.ownKeys(branches).some(branchKey => typeof branchKey === 'symbol')
            || Object.keys(branches).some(branchKey => !/^(0|[1-9]\d*)$/u.test(branchKey) || Number(branchKey) >= branches.length)) {
            issue(path + '/oneOf', 'oneOf-invalid'); continue;
          }
          const expanded: unknown[] = [];
          for (let index = 0; index < branches.length; index++) {
            const descriptor = Object.getOwnPropertyDescriptor(branches, String(index));
            if (!descriptor || !('value' in descriptor)) { issue(path + '/oneOf/' + index, 'oneOf-invalid'); continue; }
            const branch = expand(descriptor.value, path + '/oneOf/' + index, depth + 1, 0, false, currentDefinitions);
            if (branch !== undefined) expanded.push(branch);
          }
          if (expanded.length === branches.length) Object.defineProperty(result, key, { value: expanded, enumerable: true, configurable: true, writable: true });
          continue;
        }
        const source = own(raw, key);
        const value = copyData(source, path + pointer(key), 0);
        if (value !== undefined || source === undefined) Object.defineProperty(result, key, { value, enumerable: true, configurable: true, writable: true });
      }
      return result;
    } finally { active.delete(raw); }
  }

  let resolved: T | undefined;
  try {
    const next = expand(schema, '', 0, 0, true);
    if (next !== undefined && dataRecord(next)) resolved = next as T;
  } catch { issue('', 'invalid-schema'); }
  return { schema: issues.length ? undefined : resolved, issues };
}
