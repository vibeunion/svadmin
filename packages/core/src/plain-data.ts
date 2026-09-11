export type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };

/** Copy validated JSON data without invoking getters or serialization hooks. */
export function snapshotPlainData(value: unknown): JsonValue {
  function snapshot(value: unknown, ancestors: Set<object>): JsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'object' || value === null || ancestors.has(value)) {
      throw new TypeError('Invalid plain data');
    }
    const array = Array.isArray(value);
    const prototype: unknown = Object.getPrototypeOf(value);
    if ((!array && prototype !== Object.prototype && prototype !== null) ||
        Object.getOwnPropertySymbols(value).length > 0) throw new TypeError('Invalid plain data');
    ancestors.add(value);
    try {
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const read = (key: string): JsonValue => {
        const descriptor = descriptors[key];
        if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) throw new TypeError('Invalid plain data');
        const field: unknown = descriptor.value;
        return snapshot(field, ancestors);
      };
      if (array) {
        const length: unknown = descriptors['length']?.value;
        if (typeof length !== 'number' || !Number.isInteger(length) || length < 0 ||
            Object.keys(descriptors).length !== length + 1) throw new TypeError('Invalid plain data');
        return Array.from({ length }, (_, index) => read(String(index)));
      }
      const entries: [string, JsonValue][] = Object.keys(descriptors).map(key => [key, read(key)]);
      return Object.fromEntries<JsonValue>(entries);
    } finally {
      ancestors.delete(value);
    }
  }
  try {
    return snapshot(value, new Set());
  } catch {
    // Reflection can throw for proxies; never retain the submitted value or error.
    throw new TypeError('Invalid plain data');
  }
}

/** Query cancellation is not JSON. Peel it before snapshots and reattach after. */
export function detachAbortSignal(value: unknown): { signal?: AbortSignal; rest: unknown } {
  if (typeof value !== 'object' || value === null) return { rest: value };
  const descriptor = Object.getOwnPropertyDescriptor(value, 'signal');
  const signal: unknown = descriptor && 'value' in descriptor ? descriptor.value : undefined;
  if (!(signal instanceof AbortSignal)) return { rest: value };
  const descriptors = Object.getOwnPropertyDescriptors(value);
  delete descriptors['signal'];
  const prototype: unknown = Object.getPrototypeOf(value);
  if (Array.isArray(value) || (prototype !== Object.prototype && prototype !== null)) return { rest: value };
  return { signal, rest: Object.defineProperties({}, descriptors) };
}

/** Reattach a query-owned signal after JSON snapshots. */
export function attachAbortSignal<T extends object>(value: T, signal?: AbortSignal): T {
  if (signal === undefined) return value;
  return Object.assign(Object.create(Object.getPrototypeOf(value)), value, { signal });
}
