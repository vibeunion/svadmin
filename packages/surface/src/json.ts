import { SURFACE_LIMITS } from './types.js';
import type { JsonValue } from './types.js';

export interface JsonValueIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

const dangerousObjectKeys = new Set(['__proto__', 'constructor', 'prototype']);

export function escapedJsonPointerToken(token: string): string {
  return token.replaceAll('~', '~0').replaceAll('/', '~1');
}

export function jsonPointer(pathSegments: readonly (string | number)[]): string {
  return pathSegments.length === 0
    ? ''
    : `/${pathSegments.map((segment) => escapedJsonPointerToken(String(segment))).join('/')}`;
}

export function decodedJsonPointerToken(token: string): string | null {
  if (/~(?:[^01]|$)/u.test(token)) return null;
  const decoded = token.replaceAll('~1', '/').replaceAll('~0', '~');
  return dangerousObjectKeys.has(decoded) ? null : decoded;
}

function primitiveIssue(candidate: unknown, path: readonly (string | number)[]): JsonValueIssue | null {
  if (candidate === null || typeof candidate === 'string' || typeof candidate === 'boolean') return null;
  if (typeof candidate === 'number') return Number.isFinite(candidate) ? null : { path, message: 'Numbers must be finite' };
  return { path, message: 'Value must be JSON serializable' };
}

export function jsonValueIssue(input: unknown): JsonValueIssue | null {
  const ancestors = new WeakSet<object>();
  type VisitFrame = {
    readonly kind: 'visit';
    readonly candidate: unknown;
    readonly path: readonly (string | number)[];
    readonly depth: number;
  };
  type LeaveFrame = { readonly kind: 'leave'; readonly candidate: object };
  const pending: Array<VisitFrame | LeaveFrame> = [{ kind: 'visit', candidate: input, path: [], depth: 0 }];
  let visitedNodes = 0;

  try {
    while (pending.length > 0) {
      const frame = pending.pop();
      if (!frame) break;
      if (frame.kind === 'leave') {
        ancestors.delete(frame.candidate);
        continue;
      }

      const { candidate, path, depth } = frame;
      visitedNodes += 1;
      if (visitedNodes > SURFACE_LIMITS.maxJsonNodes) {
        return { path, message: 'JSON value exceeds the supported node count' };
      }
      if (depth > SURFACE_LIMITS.maxJsonDepth) {
        return { path, message: 'JSON nesting exceeds the supported depth' };
      }
      if (typeof candidate !== 'object' || candidate === null) {
        const issue = primitiveIssue(candidate, path);
        if (issue) return issue;
        continue;
      }
      if (ancestors.has(candidate)) return { path, message: 'Cyclic values are not allowed' };

      const prototype = Object.getPrototypeOf(candidate);
      if (!Array.isArray(candidate) && prototype !== Object.prototype && prototype !== null) {
        return { path, message: 'Only plain JSON objects are allowed' };
      }

      ancestors.add(candidate);
      pending.push({ kind: 'leave', candidate });

      if (Array.isArray(candidate)) {
        if (candidate.length + visitedNodes > SURFACE_LIMITS.maxJsonNodes) {
          return { path, message: 'JSON value exceeds the supported node count' };
        }
        for (const key of Reflect.ownKeys(candidate)) {
          if (key === 'length') continue;
          if (typeof key !== 'string') return { path, message: 'Symbol properties are not allowed' };
          if (!/^(?:0|[1-9][0-9]*)$/u.test(key) || Number(key) >= candidate.length) {
            return { path: [...path, key], message: 'Only JSON array indexes are allowed' };
          }
        }
        for (let index = candidate.length - 1; index >= 0; index -= 1) {
          const descriptor = Object.getOwnPropertyDescriptor(candidate, String(index));
          if (!descriptor) return { path: [...path, index], message: 'Sparse arrays are not allowed' };
          if (!descriptor.enumerable) {
            return { path: [...path, index], message: 'Non-enumerable properties are not allowed' };
          }
          if (!('value' in descriptor)) {
            return { path: [...path, index], message: 'Accessor properties are not allowed' };
          }
          pending.push({ kind: 'visit', candidate: descriptor.value, path: [...path, index], depth: depth + 1 });
        }
        continue;
      }

      const entries: Array<readonly [string, unknown]> = [];
      for (const key of Reflect.ownKeys(candidate)) {
        if (typeof key !== 'string') return { path, message: 'Symbol properties are not allowed' };
        if (dangerousObjectKeys.has(key)) {
          return { path: [...path, key], message: `Property "${key}" is not allowed` };
        }
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
        if (!descriptor || !descriptor.enumerable) {
          return { path: [...path, key], message: 'Non-enumerable properties are not allowed' };
        }
        if (!('value' in descriptor)) {
          return { path: [...path, key], message: 'Accessor properties are not allowed' };
        }
        entries.push([key, descriptor.value]);
      }
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const [key, entry] = entries[index];
        pending.push({ kind: 'visit', candidate: entry, path: [...path, key], depth: depth + 1 });
      }
    }
  } catch {
    return { path: [], message: 'Value could not be inspected safely' };
  }

  return null;
}

export function isJsonValue(input: unknown): input is JsonValue {
  return jsonValueIssue(input) === null;
}
