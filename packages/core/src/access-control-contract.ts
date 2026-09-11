import { Type } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import { HttpError } from './types';
import type {
  CanParams, CanResult, AccessControlProvider, AccessControlOptions, RegisteredAccessControlProvider,
} from './permissions.svelte';

const request = Type.Object({
  resource: Type.String({ minLength: 1 }),
  action: Type.String({ minLength: 1 }),
  params: Type.Optional(Type.Object({
    id: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  }, { additionalProperties: Type.Unknown() })),
  meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
}, { additionalProperties: false });
const response = Type.Object({
  can: Type.Boolean(), reason: Type.Optional(Type.String()),
}, { additionalProperties: false });
const batchRequest = Type.Array(request);
const batchResponse = Type.Array(response);
const providerOptions = Type.Object({
  buttons: Type.Optional(Type.Object({
    enableAccessControl: Type.Optional(Type.Boolean()),
    hideIfUnauthorized: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false })),
}, { additionalProperties: false });
const registeredProviders = new WeakMap<object, RegisteredAccessControlProvider>();

export function snapshotAccessControlOptions(value: unknown): AccessControlOptions {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(providerOptions, candidate)) {
      if (candidate.buttons) Object.freeze(candidate.buttons);
      return Object.freeze(candidate);
    }
  } catch {
    // Options are plain data, never executable configuration.
  }
  throw new HttpError('Invalid access control options', 422, undefined, { code: 'INVALID_ACCESS_CONTROL_OPTIONS' });
}

function invalidAccessControlProvider(): HttpError {
  return new HttpError('Invalid access control provider', 502, undefined, { code: 'INVALID_ACCESS_CONTROL_PROVIDER' });
}

/** Class methods are supported, but property accessors and polluted Object.prototype are not. */
function providerMember(value: object, key: string): { readonly value: unknown } | undefined {
  const seen = new Set<object>();
  let target: object | null = value;
  for (let depth = 0; target !== null && target !== Object.prototype && depth < 32; depth++) {
    if (seen.has(target)) throw invalidAccessControlProvider();
    seen.add(target);
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor) {
      if (!('value' in descriptor)) throw invalidAccessControlProvider();
      const field: unknown = descriptor.value;
      return { value: field };
    }
    const parent: unknown = Object.getPrototypeOf(target);
    if (parent !== null && typeof parent !== 'object') throw invalidAccessControlProvider();
    target = parent;
  }
  if (target !== null && target !== Object.prototype) throw invalidAccessControlProvider();
  return undefined;
}

/** One input identity owns one captured configuration; raw provider objects never become the public projection. */
export function captureAccessControlProvider(value: unknown): RegisteredAccessControlProvider {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw invalidAccessControlProvider();
    const existing = registeredProviders.get(value);
    if (existing) return existing;
    const can = providerMember(value, 'can')?.value;
    const batch = providerMember(value, 'canMany');
    const canMany = batch?.value;
    const config = providerMember(value, 'options');
    if (typeof can !== 'function' || (batch !== undefined && typeof canMany !== 'function')) throw invalidAccessControlProvider();
    const options = snapshotAccessControlOptions(config ? config.value : {});
    const captured: RegisteredAccessControlProvider = Object.freeze({
      options,
      can: async (input: CanParams): Promise<CanResult> => {
        try {
          const request = snapshotCanParams(input);
          const result: unknown = await Reflect.apply(can, value, [request]);
          return decodeCanResult(result);
        } catch (error) {
          throw accessControlFailure(error);
        }
      },
      ...(typeof canMany === 'function' ? {
        canMany: async (input: readonly CanParams[]): Promise<CanResult[]> => {
          try {
            const requests = snapshotCanBatchParams(input);
            const count = requests.length;
            const result: unknown = await Reflect.apply(canMany, value, [requests]);
            return decodeCanResults(result, count);
          } catch (error) {
            throw accessControlFailure(error);
          }
        },
      } : {}),
    });
    registeredProviders.set(value, captured);
    registeredProviders.set(captured, captured);
    return captured;
  } catch (error) {
    throw accessControlFailure(error);
  }
}

export function snapshotCanParams(value: unknown): CanParams {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(request, candidate)) return candidate;
  } catch {
    // Do not invoke accessors or serialization hooks from permission inputs.
  }
  throw new HttpError('Invalid access control request', 422, undefined, { code: 'INVALID_ACCESS_CONTROL_INPUT' });
}

export function decodeCanResult(value: unknown): CanResult {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(response, candidate)) return candidate;
  } catch {
    // Malformed decisions must fail closed without exposing provider details.
  }
  throw new HttpError('Invalid access control response', 502, undefined, { code: 'INVALID_ACCESS_CONTROL_RESPONSE' });
}

export function snapshotCanBatchParams(value: unknown): CanParams[] {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(batchRequest, candidate)) return candidate;
  } catch {
    // Validate the complete batch before invoking even its first capability.
  }
  throw new HttpError('Invalid access control request', 422, undefined, { code: 'INVALID_ACCESS_CONTROL_INPUT' });
}

export function decodeCanResults(value: unknown, count: number): CanResult[] {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(batchResponse, candidate) && candidate.length === count) return candidate;
  } catch {
    // Never return partially validated batches.
  }
  throw new HttpError('Invalid access control response', 502, undefined, { code: 'INVALID_ACCESS_CONTROL_RESPONSE' });
}

export function supersededAccessControl(): HttpError {
  return new HttpError('Access control scope changed', 409, undefined, { code: 'ACCESS_CONTROL_SUPERSEDED' });
}

/** Preserve protocol status and checked codes, not provider diagnostics or getters. */
export function accessControlFailure(error: unknown): HttpError {
  let status = 502;
  let code = 'ACCESS_CONTROL_FAILED';
  try {
    if (typeof error === 'object' && error !== null) {
      const statusValue: unknown = Object.getOwnPropertyDescriptor(error, 'statusCode')?.value;
      const codeValue: unknown = Object.getOwnPropertyDescriptor(error, 'code')?.value;
      if (typeof statusValue === 'number' && Number.isInteger(statusValue) && statusValue >= 400 && statusValue <= 599) status = statusValue;
      if (codeValue === 'INVALID_ACCESS_CONTROL_INPUT' || codeValue === 'INVALID_ACCESS_CONTROL_RESPONSE' ||
          codeValue === 'INVALID_ACCESS_CONTROL_PROVIDER' || codeValue === 'INVALID_ACCESS_CONTROL_OPTIONS' ||
          codeValue === 'ACCESS_CONTROL_SUPERSEDED') code = codeValue;
    }
  } catch {
    // Reflection failures cannot disclose private provider errors.
  }
  return new HttpError('Access control request failed', status, undefined, { code });
}

/** Capture a single-decision capability before dispatch and isolate every request. */
export function prepareCanCheck(provider: AccessControlProvider | null, params: CanParams): () => Promise<CanResult> {
  const request = snapshotCanParams(params);
  if (provider === null) return async () => ({ can: true });
  try {
    const can = provider.can;
    if (typeof can === 'function') {
      return async () => decodeCanResult(await can.call(provider, snapshotCanParams(request)));
    }
  } catch {
    // Capability lookup failures become query errors, not render-time provider diagnostics.
  }
  return async () => {
    throw new HttpError('Invalid access control provider', 502, undefined, { code: 'INVALID_ACCESS_CONTROL_PROVIDER' });
  };
}

export function prepareCanBatchCheck(
  provider: AccessControlProvider | null, params: readonly CanParams[], current: () => boolean = () => true,
): () => Promise<CanResult[]> {
  const requests = snapshotCanBatchParams(params);
  if (provider === null || requests.length === 0) return async () => requests.map(() => ({ can: true }));
  try {
    const canMany = provider.canMany;
    if (typeof canMany === 'function') {
      return async () => {
        if (!current()) throw supersededAccessControl();
        return decodeCanResults(await canMany.call(provider, snapshotCanBatchParams(requests)), requests.length);
      };
    }
    const can = canMany === undefined ? provider.can : undefined;
    if (typeof can === 'function') {
      return async () => {
        const settled = await Promise.allSettled(requests.map(async request => {
          if (!current()) throw supersededAccessControl();
          return decodeCanResult(await can.call(provider, snapshotCanParams(request)));
        }));
        const results: CanResult[] = [];
        for (const result of settled) {
          if (result.status === 'rejected') {
            const error: unknown = result.reason;
            throw error;
          }
          results.push(result.value);
        }
        return results;
      };
    }
  } catch {
    // A malformed native batch capability must not silently fall back to single calls.
  }
  return async () => {
    throw new HttpError('Invalid access control provider', 502, undefined, { code: 'INVALID_ACCESS_CONTROL_PROVIDER' });
  };
}

const sources = new WeakMap<AccessControlProvider, string>();
const runtime = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
let next = 0;
export function accessControlSource(provider: AccessControlProvider | null): string {
  if (!provider) return 'no-access-control-provider';
  let source = sources.get(provider);
  if (source === undefined) {
    source = `${runtime}:${++next}`;
    sources.set(provider, source);
  }
  return source;
}
