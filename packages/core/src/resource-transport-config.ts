import { Hint, Kind, OptionalKind, ReadonlyKind, type TSchema } from '@sinclair/typebox';
import { TypeGuard } from '@sinclair/typebox/type';
import { HttpError } from './types';
import type { DataProvider } from './types';
import type { ResourceSchemas } from './resource-schemas';

function invalidSchema(): never {
  throw new HttpError('Invalid resource schema configuration', 400, undefined, {
    code: 'RESOURCE_SCHEMA_INVALID', details: { phase: 'configuration', writeMayHaveSucceeded: false },
  });
}
function invalidProvider(): never {
  throw new HttpError('Invalid resource provider', 400, undefined, {
    code: 'INVALID_DATA_PROVIDER', details: { phase: 'configuration', writeMayHaveSucceeded: false },
  });
}

/** Configuration can carry TypeBox markers, but no getters, functions or foreign symbols. */
function copySchemaData(value: unknown, ancestors = new Set<object>(), depth = 0): unknown {
  if (depth > 128) return invalidSchema();
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || value === null || ancestors.has(value)) return invalidSchema();
  const array = Array.isArray(value);
  const prototype: unknown = Object.getPrototypeOf(value);
  if (!array && prototype !== Object.prototype && prototype !== null) return invalidSchema();
  ancestors.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const read = (key: PropertyKey): unknown => {
      const descriptor: PropertyDescriptor | undefined = Reflect.get(descriptors, key);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return invalidSchema();
      const field: unknown = descriptor.value;
      return copySchemaData(field, ancestors, depth + 1);
    };
    if (array) {
      const length: unknown = descriptors['length']?.value;
      if (typeof length !== 'number' || !Number.isInteger(length) || length < 0 ||
          Reflect.ownKeys(descriptors).length !== length + 1) return invalidSchema();
      return Array.from({ length }, (_, index) => read(String(index)));
    }
    const copy: Record<PropertyKey, unknown> = {};
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key === 'symbol' && key !== Kind && key !== OptionalKind && key !== ReadonlyKind && key !== Hint) {
        return invalidSchema();
      }
      const field = read(key);
      if (typeof key === 'symbol' && typeof field !== 'string') return invalidSchema();
      Object.defineProperty(copy, key, { value: field, enumerable: true, configurable: true, writable: true });
    }
    return copy;
  } finally {
    ancestors.delete(value);
  }
}

function schema(value: unknown): TSchema {
  const copy = copySchemaData(value);
  if (!TypeGuard.IsSchema(copy)) return invalidSchema();
  return copy;
}

function fields(value: unknown): Map<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return invalidSchema();
  const prototype: unknown = Object.getPrototypeOf(value);
  if ((prototype !== Object.prototype && prototype !== null) || Object.getOwnPropertySymbols(value).length) return invalidSchema();
  const result = new Map<string, unknown>();
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!descriptor.enumerable || !('value' in descriptor)) return invalidSchema();
    const field: unknown = descriptor.value;
    result.set(key, field);
  }
  return result;
}

/** Copy each schema before lazy validators or transport callbacks can observe source mutations. */
export function captureResourceSchemas(value: unknown): Map<string, ResourceSchemas> {
  try {
    const captured = new Map<string, ResourceSchemas>();
    for (const [resource, definition] of fields(value)) {
      if (!resource.trim()) return invalidSchema();
      const input = fields(definition);
      if ([...input.keys()].some(key => !['record', 'create', 'update', 'delete', 'references'].includes(key))) return invalidSchema();
      const record = schema(input.get('record'));
      const references: TSchema[] = [];
      if (input.has('references')) {
        const copied = copySchemaData(input.get('references'));
        if (!Array.isArray(copied)) return invalidSchema();
        const candidates: unknown[] = copied;
        for (const candidate of candidates) {
          if (!TypeGuard.IsSchema(candidate)) return invalidSchema();
          references.push(candidate);
        }
      }
      captured.set(resource, {
        record, references,
        ...(input.has('create') ? { create: schema(input.get('create')) } : {}),
        ...(input.has('update') ? { update: schema(input.get('update')) } : {}),
        ...(input.has('delete') ? { delete: schema(input.get('delete')) } : {}),
      });
    }
    return captured;
  } catch {
    return invalidSchema();
  }
}

/** Class prototype methods are supported without evaluating property accessors. */
function member(provider: object, name: string): { value: unknown } | undefined {
  let target: object | null = provider;
  const seen = new Set<object>();
  for (let depth = 0; target !== null && target !== Object.prototype && depth < 32; depth++) {
    if (seen.has(target)) return invalidProvider();
    seen.add(target);
    const descriptor = Object.getOwnPropertyDescriptor(target, name);
    if (descriptor) {
      if (!('value' in descriptor)) return invalidProvider();
      const value: unknown = descriptor.value;
      return { value };
    }
    const prototype: unknown = Object.getPrototypeOf(target);
    if (prototype !== null && typeof prototype !== 'object') return invalidProvider();
    target = prototype;
  }
  if (target !== null && target !== Object.prototype) return invalidProvider();
  return undefined;
}

type Invocation = (...args: unknown[]) => unknown;
export function captureResourceTransport(provider: unknown) {
  try {
    if (typeof provider !== 'object' || provider === null || Array.isArray(provider)) return invalidProvider();
    const owner = provider;
    function capture(name: keyof DataProvider, required: true): Invocation;
    function capture(name: keyof DataProvider, required: false): Invocation | undefined;
    function capture(name: keyof DataProvider, required: boolean): Invocation | undefined {
      const found = member(owner, name);
      if (!required && found === undefined) return undefined;
      const method = found?.value;
      if (typeof method !== 'function') return invalidProvider();
      return (...args: unknown[]): unknown => Reflect.apply(method, owner, args);
    }
    return Object.freeze({
      getApiUrl: capture('getApiUrl', true), getList: capture('getList', true),
      getOne: capture('getOne', true), create: capture('create', true),
      update: capture('update', true), deleteOne: capture('deleteOne', true),
      getMany: capture('getMany', false), createMany: capture('createMany', false),
      updateMany: capture('updateMany', false), deleteMany: capture('deleteMany', false),
      custom: capture('custom', false),
    });
  } catch {
    return invalidProvider();
  }
}
