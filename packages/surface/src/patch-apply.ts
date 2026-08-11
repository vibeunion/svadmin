import { cloneJsonValue, jsonValuesEqual } from './json.js';
import { decodedPatchTokens } from './patch-validation.js';
import type {
  SurfacePatchError,
  SurfacePatchOperation,
} from './patch-types.js';
import type { JsonObject, JsonValue } from './types.js';

type JsonContainer = JsonValue[] | Record<string, JsonValue>;

interface PatchApplicationSuccess {
  readonly ok: true;
  readonly after: JsonValue;
  readonly changedPaths: readonly string[];
}

interface PatchApplicationFailure {
  readonly ok: false;
  readonly error: SurfacePatchError;
}

export type PatchApplicationResult = PatchApplicationSuccess | PatchApplicationFailure;

function patchFailure(
  code: SurfacePatchError['code'],
  message: string,
  path: string,
): PatchApplicationFailure {
  return { ok: false, error: { code, message, path } };
}

function isContainer(candidate: JsonValue): candidate is JsonContainer {
  return Array.isArray(candidate) || (candidate !== null && typeof candidate === 'object');
}

function arrayIndex(token: string, length: number, allowEnd: boolean): number | null {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(token)) return null;
  const index = Number(token);
  return Number.isSafeInteger(index) && (allowEnd ? index <= length : index < length) ? index : null;
}

function childValue(container: JsonContainer, token: string): JsonValue | undefined {
  if (Array.isArray(container)) {
    const index = arrayIndex(token, container.length, false);
    return index === null ? undefined : container[index];
  }
  return Object.hasOwn(container, token) ? container[token] : undefined;
}

function parentContainer(root: JsonValue, tokens: readonly string[]): JsonContainer | null {
  let current = root;
  for (const token of tokens.slice(0, -1)) {
    if (!isContainer(current)) return null;
    const child = childValue(current, token);
    if (child === undefined) return null;
    current = child;
  }
  return isContainer(current) ? current : null;
}

function testOperation(
  container: JsonContainer,
  token: string,
  operation: Extract<SurfacePatchOperation, { op: 'test' }>,
): PatchApplicationFailure | null {
  const current = childValue(container, token);
  return current !== undefined && jsonValuesEqual(current, operation.value)
    ? null
    : patchFailure('patch_test_failed', 'Surface Patch test failed', operation.path);
}

function mutateArray(
  container: JsonValue[],
  token: string,
  operation: Exclude<SurfacePatchOperation, { op: 'test' }>,
): PatchApplicationFailure | null {
  if (operation.op === 'add') {
    const index = token === '-' ? container.length : arrayIndex(token, container.length, true);
    if (index === null) return patchFailure('patch_path_not_found', 'Array path was not found', operation.path);
    container.splice(index, 0, cloneJsonValue(operation.value));
    return null;
  }
  const index = arrayIndex(token, container.length, false);
  if (index === null) return patchFailure('patch_path_not_found', 'Array path was not found', operation.path);
  if (operation.op === 'remove') container.splice(index, 1);
  else container[index] = cloneJsonValue(operation.value);
  return null;
}

function mutateObject(
  container: Record<string, JsonValue>,
  token: string,
  operation: Exclude<SurfacePatchOperation, { op: 'test' }>,
): PatchApplicationFailure | null {
  if (operation.op !== 'add' && !Object.hasOwn(container, token)) {
    return patchFailure('patch_path_not_found', 'Object path was not found', operation.path);
  }
  if (operation.op === 'remove') delete container[token];
  else container[token] = cloneJsonValue(operation.value);
  return null;
}

function applyOperation(root: JsonValue, operation: SurfacePatchOperation): PatchApplicationFailure | null {
  const tokens = decodedPatchTokens(operation);
  if (!tokens) return patchFailure('invalid_patch', 'Patch path is invalid', operation.path);
  const container = parentContainer(root, tokens);
  if (!container) return patchFailure('patch_path_not_found', 'Patch parent path was not found', operation.path);
  const token = tokens.at(-1);
  if (!token) return patchFailure('invalid_patch', 'Patch path is invalid', operation.path);
  if (operation.op === 'test') return testOperation(container, token, operation);
  return Array.isArray(container)
    ? mutateArray(container, token, operation)
    : mutateObject(container, token, operation);
}

export function applySurfacePatchOperations(
  before: JsonObject,
  operations: readonly SurfacePatchOperation[],
): PatchApplicationResult {
  const after = cloneJsonValue(before);
  const changedPaths: string[] = [];
  for (const operation of operations) {
    const failure = applyOperation(after, operation);
    if (failure) return failure;
    if (operation.op !== 'test' && !changedPaths.includes(operation.path)) changedPaths.push(operation.path);
  }
  return { ok: true, after, changedPaths };
}
