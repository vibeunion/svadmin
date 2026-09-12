import { QueryClient } from '@tanstack/svelte-query';
import { dataQueryMatches, parseQueryKey, type DataQueryMatcher, type QueryDescriptorData } from './query-keys';
import { snapshotPlainData } from './plain-data';
import { snapshotInvalidationParams } from './invalidation-contract';
import { definedOptions } from './defined-options';
import { HttpError } from './types';
import { Type } from '@sinclair/typebox';
import { checkExact } from './schema-validation';

export interface QueryCacheOwner {
  readonly source: string;
  readonly authSession: string;
}
export type RefreshScope = Exclude<NonNullable<ReturnType<typeof snapshotInvalidationParams>['invalidates']>, false | 'all'>[number];
const ownerSchema = Type.Object({
  source: Type.String({ minLength: 1 }), authSession: Type.String({ minLength: 1 }),
}, { additionalProperties: false });
const matcherSchema = Type.Object({
  resource: Type.String({ minLength: 1 }),
  provider: Type.Optional(Type.String({ minLength: 1 })),
  contract: Type.Optional(Type.String({ minLength: 1 })),
  tenant: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  id: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  action: Type.Optional(Type.Union([
    Type.Literal('list'), Type.Literal('infiniteList'), Type.Literal('select'),
    Type.Literal('selectDefaults'), Type.Literal('many'), Type.Literal('one'),
  ])),
  method: Type.Optional(Type.String()),
}, { additionalProperties: false });

function invalidRefresh(): never {
  throw new HttpError('Invalid refresh request', 422, undefined, { code: 'INVALID_REFRESH_REQUEST' });
}

/** Copy own data properties while leaving executable capabilities opaque. */
function properties(value: unknown, allowed: readonly string[]): Map<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return invalidRefresh();
  const prototype: unknown = Object.getPrototypeOf(value);
  if ((prototype !== Object.prototype && prototype !== null) || Object.getOwnPropertySymbols(value).length) return invalidRefresh();
  const result = new Map<string, unknown>();
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!allowed.includes(key) || !descriptor.enumerable || !('value' in descriptor)) return invalidRefresh();
    const field: unknown = descriptor.value;
    result.set(key, field);
  }
  return result;
}

function snapshotMatcher(value: unknown): DataQueryMatcher {
  const fields = properties(value, ['resource', 'provider', 'contract', 'tenant', 'id', 'action', 'method']);
  const candidate = snapshotPlainData(Object.fromEntries([...fields].filter(([, value]) => value !== undefined)));
  if (!checkExact(matcherSchema, candidate)) return invalidRefresh();
  // Missing tenancy selects an unset tenant; it is not permission to cross tenants.
  return Object.freeze({
    ...candidate, provider: candidate.provider ?? 'default', tenant: candidate.tenant, contract: candidate.contract,
    ...(fields.has('id') ? { id: candidate.id } : {}),
    ...(fields.has('action') ? { action: candidate.action } : {}),
    ...(fields.has('method') ? { method: candidate.method } : {}),
  });
}

function snapshotOwner(value: unknown): QueryCacheOwner {
  const owner = snapshotPlainData(value);
  if (!checkExact(ownerSchema, owner)) return invalidRefresh();
  return Object.freeze(owner);
}

function readCapturedQuery(
  key: readonly unknown[], matcher: DataQueryMatcher, owner: QueryCacheOwner,
): QueryDescriptorData | undefined {
  try {
    const descriptor = parseQueryKey(snapshotPlainData(key));
    if (!descriptor || descriptor.kind !== 'data' || !dataQueryMatches([descriptor], matcher)) return undefined;
    const params = descriptor.params;
    if (typeof params !== 'object' || params === null || Array.isArray(params)) return undefined;
    const source: unknown = Object.getOwnPropertyDescriptor(params, 'source')?.value;
    const session: unknown = Object.getOwnPropertyDescriptor(params, 'authSession')?.value;
    return source === owner.source && session === owner.authSession ? descriptor : undefined;
  } catch { return undefined; }
}

/** Untagged, malformed and accessor-backed keys never acquire an inferred owner. */
export function readOwnedDataQuery(
  key: readonly unknown[], matcher: DataQueryMatcher, owner: QueryCacheOwner,
): QueryDescriptorData | undefined {
  try {
    return readCapturedQuery(key, snapshotMatcher(matcher), snapshotOwner(owner));
  } catch {
    return undefined;
  }
}

export function refreshSuperseded(): HttpError {
  return new HttpError('Refresh is no longer current', 409, undefined, { code: 'REFRESH_SUPERSEDED' });
}
function refreshFailed(): HttpError {
  return new HttpError('Refresh failed', 500, undefined, { code: 'REFRESH_FAILED' });
}

function captureRequest(value: unknown) {
  try {
    const fields = properties(value, ['client', 'matcher', 'owner', 'scopes', 'id', 'current']);
    const client = fields.get('client');
    const callback = fields.get('current');
    if (!(client instanceof QueryClient) || typeof callback !== 'function') return invalidRefresh();
    const matcher = snapshotMatcher(fields.get('matcher'));
    const owner = snapshotOwner(fields.get('owner'));
    const params = snapshotInvalidationParams({
      invalidates: fields.get('scopes'), ...(fields.has('id') ? { id: fields.get('id') } : {}),
    });
    if (!Array.isArray(params.invalidates)) return invalidRefresh();
    let retired = false;
    return {
      client, matcher, owner, scopes: params.invalidates, ...definedOptions({ id: params.id }),
      current(): boolean {
        if (retired) return false;
        try {
          const result: unknown = Reflect.apply(callback, undefined, []);
          if (result !== true) {
            retired = true;
            if (typeof result !== 'boolean') void Promise.resolve(result).catch(() => {});
            return false;
          }
          return true;
        } catch {
          retired = true;
          return false;
        }
      },
    };
  } catch { return invalidRefresh(); }
}

/** Recheck ownership for each dispatch and await every started request, including failures. */
export async function invalidateOwnedQueries(request: {
  client: QueryClient;
  matcher: DataQueryMatcher;
  owner: QueryCacheOwner;
  scopes: readonly RefreshScope[];
  id?: string | number;
  current: () => boolean;
}): Promise<void> {
  const { client, matcher, owner, scopes, id, current } = captureRequest(request);
  if (!current()) throw refreshSuperseded();
  const matches = (key: readonly unknown[]) => {
    if (!current()) return false;
    const descriptor = readCapturedQuery(key, matcher, owner);
    if (!descriptor) return false;
    return scopes.some(scope => {
      if (scope === 'resourceAll') return true;
      if (scope === 'list') return ['list', 'infiniteList', 'select', 'selectDefaults'].includes(descriptor.action);
      if (scope === 'many') return descriptor.action === 'many';
      return scope === 'detail' && descriptor.action === 'one' && (id === undefined || descriptor.id === id);
    });
  };
  const selected = (() => {
    try {
      return client.getQueryCache().findAll({ predicate: query => matches(query.queryKey) });
    } catch {
      throw current() ? refreshFailed() : refreshSuperseded();
    }
  })();
  const tasks = selected.map(async query => {
    if (!current()) return;
    await client.invalidateQueries({
      predicate: candidate => candidate === query && matches(candidate.queryKey),
    }, { throwOnError: true });
  });
  const settled = await Promise.allSettled(tasks);
  if (!current()) throw refreshSuperseded();
  if (settled.some(result => result.status === 'rejected')) throw refreshFailed();
}
