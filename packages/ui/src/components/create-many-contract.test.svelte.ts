import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient, QueryObserver } from '@tanstack/svelte-query';
import { defineResource, keys, parseQueryKey, resetContext, setAuditHandler, CreateManyPartialError, captureAuthSession,
  type DataProvider, type GetManyResult, type GetOneResult, type GetListResult, type ResourceDefinition,
  type ResourceContract, type AuthProvider, type AuthActionResult, type AuditLogProvider, type LiveProvider } from '@svadmin/core';
import { flushSync } from 'svelte';
import { resetLogoutVersion } from '../../../core/src/auth-hooks.svelte';
import { resetToast } from '@svadmin/core/toast';
import { definedOptions } from '@svadmin/core/options';
import { contractKey } from '../../../core/src/resource-contract';
import { parseCreateManyParams } from '../../../core/src/create-many-contract';
import * as legacy from '../../../core/src/hooks.svelte';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CreateManyState, CreateManyAuthActions } from './create-many-contract.test.types';
import Host from './create-many-contract.test-host.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String() });
const createSchema = Type.Object({ title: Type.String() });
const posts = defineResource('posts', { record, create: createSchema });
const other = defineResource('other', { record, create: createSchema });
const definitions: ResourceDefinition[] = [
  { name: 'posts', label: 'Posts', fields: [], contract: posts },
  { name: 'other', label: 'Other', fields: [], contract: other },
];
const rows: [{ id: number; title: string }, { id: number; title: string }] =
  [{ id: 1, title: 'First' }, { id: 2, title: 'Second' }];
const variables = [{ title: 'First' }, { title: 'Second' }];
const clients: QueryClient[] = [];
function provider(): DataProvider {
  let id = 0;
  return {
    getApiUrl: () => '/api', getList: vi.fn(async () => ({ data: rows, total: rows.length })),
    getOne: async ({ id }) => ({ data: { id, title: 'First' } }),
    update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
    createMany: vi.fn<NonNullable<DataProvider['createMany']>>(async ({ variables }) => ({
      data: variables.map(() => ({ id: ++id, title: 'Created' })),
    })),
    create: vi.fn(async () => ({ data: { id: ++id, title: 'Created' } })),
  };
}
function nativeCreate(source: DataProvider) {
  if (!source.createMany) throw new Error('Expected a native batch provider');
  return vi.mocked(source.createMany);
}
function deferred<T = void>() {
  let resolve: (value: T) => void = () => { throw new Error('Not initialized'); };
  let reject: (cause: unknown) => void = () => { throw new Error('Not initialized'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function auth(): AuthProvider {
  return { login: vi.fn(async () => ({ success: true })), logout: vi.fn(async () => ({ success: true })),
    check: vi.fn(async () => ({ authenticated: true })), getIdentity: async () => ({ id: 'user' }) };
}
function mount(source: DataProvider | Record<string, DataProvider> = provider(), options: {
  session?: AuthProvider; client?: QueryClient;
} = {}) {
  const client = options.client ?? new QueryClient({ defaultOptions: {
    queries: { staleTime: Infinity, retry: false }, mutations: { retry: 3, retryDelay: 0 },
  } });
  clients.push(client);
  let state: CreateManyState | undefined;
  let actions: CreateManyAuthActions | undefined;
  const view = render(Host, { provider: source, resources: definitions, queryClient: client, onReady: value => { state = value; },
    ...definedOptions({
      auth: options.session,
      onAuthReady: options.session === undefined ? undefined : (value: CreateManyAuthActions) => { actions = value; },
    }),
  });
  return { view, client, actions() {
    if (!actions) throw new Error('Expected mounted auth controls');
    return actions;
  }, read() {
    if (!state) throw new Error('Expected a batch create hook');
    return state;
  } };
}
async function ready(app: ReturnType<typeof mount>) {
  await waitFor(() => expect(app.read().list.isSuccess).toBe(true));
}
function scopedKeys(app: ReturnType<typeof mount>, contract: ResourceContract = posts, authSession?: string) {
  const descriptor = app.client.getQueryCache().getAll().map(query => parseQueryKey(query.queryKey))
    .find(key => key?.kind === 'data' && key.action === 'list' && key.resource === 'posts' && key.contract === contractKey(contract) &&
      (authSession === undefined || (typeof key.params === 'object' && key.params !== null &&
        Object.getOwnPropertyDescriptor(key.params, 'authSession')?.value === authSession)));
  if (!descriptor) throw new Error('Expected a list key');
  const params = descriptor.params;
  const source: unknown = typeof params === 'object' && params !== null ? Object.getOwnPropertyDescriptor(params, 'source')?.value : undefined;
  if (typeof source !== 'string') throw new Error('Expected source identity');
  const session: unknown = typeof params === 'object' && params !== null ? Object.getOwnPropertyDescriptor(params, 'authSession')?.value : undefined;
  if (typeof session !== 'string') throw new Error('Expected session identity');
  const scope = definedOptions({ provider: descriptor.provider, tenant: descriptor.tenant, contract: descriptor.contract });
  return { builder: keys(scope), source, scope, owner: { source, authSession: session } };
}
function withIds() {
  return defineResource('posts', { record, create: Type.Object({ id: Type.Optional(Type.Number()), title: Type.String() }) });
}
async function rebind(app: ReturnType<typeof mount>, contract: ResourceContract) {
  await app.view.rerender({ resources: [{ name: 'posts', label: 'Posts', fields: [], contract }] });
  await ready(app);
}
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  resetLogoutVersion();
  resetToast();
  vi.restoreAllMocks();
});

async function mountSession(source = provider(), session = auth(), client?: QueryClient) {
  const app = mount(source, { session, ...definedOptions({ client }) });
  const go = vi.fn();
  await app.view.rerender({ router: { go, back: vi.fn(), parse: () => ({ pathname: '/', params: {} }) } });
  await waitFor(() => expect(app.actions().check.isLoading).toBe(false));
  await ready(app);
  return { ...app, source, session, go };
}
async function observeEffects(app: ReturnType<typeof mount>) {
  const auditHandler = vi.fn();
  setAuditHandler(auditHandler);
  const audit: AuditLogProvider = { create: vi.fn(async input => ({ ...input, id: 'audit' })), get: async () => [] };
  const live = { subscribe: () => () => {}, publish: vi.fn<NonNullable<LiveProvider['publish']>>() } satisfies LiveProvider;
  const notification = { open: vi.fn(), close: vi.fn() };
  await app.view.rerender({ audit, live, notification });
  return { auditHandler, audit, live, notification };
}

describe.each(['native', 'fallback'] as const)('%s batch authentication ownership', mode => {
  it.each(['login', 'logout'] as const)('stops queued dispatch on %s without inventing attempted items', async action => {
    const source = provider();
    if (mode === 'fallback') delete source.createMany;
    const app = await mountSession(source);
    const callback = vi.fn();
    const operation = app.read().create.mutation.mutateAsync({ variables }, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    if (action === 'login') await app.actions().login.mutate({});
    else await app.actions().logout.mutate();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'CREATE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: false, attemptedIndexes: [], failedIndexes: [], unattemptedIndexes: [0, 1],
    } });
    expect(error).not.toHaveProperty('details.succeeded');
    expect(callback).not.toHaveBeenCalled();
    expect(source.create).not.toHaveBeenCalled();
    if (source.createMany) expect(source.createMany).not.toHaveBeenCalled();
  });

  it('rechecks ownership after a native mutation queue delay', async () => {
    const source = provider();
    if (mode === 'fallback') delete source.createMany;
    const app = await mountSession(source);
    const gate = deferred();
    const observer = vi.fn(() => gate.promise);
    app.client.getMutationCache().config.onMutate = observer;
    const operation = app.read().create.mutation.mutateAsync({ variables }).catch((error: unknown) => error);
    await waitFor(() => expect(observer).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    gate.resolve();
    expect(await operation).toMatchObject({ code: 'CREATE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: false, attemptedIndexes: [], unattemptedIndexes: [0, 1],
    } });
    expect(source.create).not.toHaveBeenCalled();
    if (source.createMany) expect(source.createMany).not.toHaveBeenCalled();
  });

  it('blocks unavailable sessions while allowing a later invocation through the same saved method', async () => {
    const source = provider();
    if (mode === 'fallback') delete source.createMany;
    const app = await mountSession(source);
    const saved = app.read().create.mutation.mutateAsync;
    await app.actions().logout.mutate();
    await expect(saved({ variables })).rejects.toMatchObject({ code: 'CREATE_MANY_CANCELLED' });
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    const login = app.actions().login.mutate({});
    await expect(saved({ variables })).rejects.toMatchObject({ code: 'CREATE_MANY_CANCELLED' });
    expect(source.create).not.toHaveBeenCalled();
    if (source.createMany) expect(source.createMany).not.toHaveBeenCalled();
    gate.resolve({ success: true });
    await login;
    await expect(saved({ variables })).resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
  });

  it.each(['login', 'logout', 'check', 'provider'] as const)('withholds dispatched receipts when %s retires the session', async change => {
    const source = provider();
    const gate = deferred();
    source.createMany = vi.fn(async () => { await gate.promise; return { data: rows }; });
    source.create = vi.fn(async () => { await gate.promise; return { data: rows[0] }; });
    if (mode === 'fallback') delete source.createMany;
    const app = await mountSession(source);
    const effects = await observeEffects(app);
    const callback = vi.fn();
    const operation = app.read().create.mutation.mutateAsync({ variables }, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    await waitFor(() => expect(mode === 'native' ? source.createMany : source.create).toHaveBeenCalledTimes(1));
    if (change === 'login') await app.actions().login.mutate({});
    else if (change === 'logout') await app.actions().logout.mutate();
    else if (change === 'check') await app.actions().check.refetch();
    else await app.view.rerender({ auth: auth() });
    const invalidate = vi.spyOn(app.client, 'invalidateQueries');
    gate.resolve();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'CREATE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: true, attemptedIndexes: mode === 'native' ? [0, 1] : [0],
      failedIndexes: [], unattemptedIndexes: mode === 'native' ? [] : [1],
    } });
    expect(error).not.toHaveProperty('details.succeeded');
    expect(error).not.toBeInstanceOf(CreateManyPartialError);
    expect(callback).not.toHaveBeenCalled();
    expect(effects.auditHandler).not.toHaveBeenCalled();
    expect(effects.audit.create).not.toHaveBeenCalled();
    expect(effects.live.publish).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(mode === 'native' ? source.createMany : source.create).toHaveBeenCalledTimes(1);
    expect(app.read().create.mutation.isIdle).toBe(true);
  });
});

describe('batch progress and completion ownership', () => {
  it.each(['success', 'failure'] as const)('stops remaining fallback items after a late %s and removes earlier successful records', async outcome => {
    const source = provider();
    delete source.createMany;
    const gate = deferred<GetOneResult>();
    vi.mocked(source.create).mockResolvedValueOnce({ data: rows[0] }).mockReturnValueOnce(gate.promise);
    const app = await mountSession(source);
    const effects = await observeEffects(app);
    const onError = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    app.session.onError = onError;
    const { builder, owner } = scopedKeys(app, posts, captureAuthSession(app.session).cacheKey);
    const oldKey = builder.data.list('posts', { ...owner, fixture: true });
    app.client.setQueryData(oldKey, {});
    const operation = app.read().create.mutation.mutateAsync({ variables: [...variables, { title: 'Third' }] })
      .catch((error: unknown) => error);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(2));
    await app.actions().login.mutate({});
    const freshKey = builder.data.list('posts', { ...owner, authSession: captureAuthSession(app.session).cacheKey, fixture: true });
    app.client.setQueryData(freshKey, {});
    const refresh = vi.spyOn(app.client, 'invalidateQueries');
    if (outcome === 'success') gate.resolve({ data: rows[1] });
    else gate.reject({ statusCode: 401, message: 'PRIVATE' });
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'CREATE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: true, attemptedIndexes: [0, 1], failedIndexes: [], unattemptedIndexes: [2],
    } });
    expect(error).not.toHaveProperty('details.succeeded');
    expect(error).not.toHaveProperty('succeeded');
    expect(JSON.stringify(error)).not.toContain('First');
    expect(source.create).toHaveBeenCalledTimes(2);
    expect(onError).not.toHaveBeenCalled();
    expect(app.session.logout).not.toHaveBeenCalled();
    expect(effects.auditHandler).not.toHaveBeenCalled();
    expect(effects.live.publish).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(app.client.getQueryState(oldKey)?.isInvalidated).toBe(false);
    expect(app.client.getQueryState(freshKey)?.isInvalidated).toBe(false);
  });

  it('does not mark an in-flight fallback as failed merely because its session retired', async () => {
    const source = provider();
    delete source.createMany;
    const gate = deferred<GetOneResult>();
    vi.mocked(source.create).mockRejectedValueOnce(new Error('PRIVATE failure')).mockReturnValueOnce(gate.promise);
    const app = await mountSession(source);
    const operation = app.read().create.mutation.mutateAsync({ variables: [...variables, { title: 'Third' }] })
      .catch((error: unknown) => error);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(2));
    await app.actions().login.mutate({});
    gate.reject(new Error('PRIVATE old result'));
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'CREATE_MANY_CANCELLED', details: {
      attemptedIndexes: [0, 1], failedIndexes: [0], unattemptedIndexes: [2],
    } });
    expect(error).not.toHaveProperty('causes');
    expect(JSON.stringify(error)).not.toContain('PRIVATE');
    expect(source.create).toHaveBeenCalledTimes(2);
  });

  it('does not let a new-session batch join an unresolved old invocation', async () => {
    const app = await mountSession();
    const gate = deferred<GetManyResult>();
    nativeCreate(app.source).mockReturnValueOnce(gate.promise).mockResolvedValueOnce({ data: [rows[1]] });
    const saved = app.read().create.mutation.mutateAsync;
    const old = saved({ variables: [variables[0]] }).catch((error: unknown) => error);
    await waitFor(() => expect(app.source.createMany).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await expect(saved({ variables: [variables[0]] })).resolves.toEqual({ data: [rows[1]] });
    gate.resolve({ data: [rows[0]] });
    expect(await old).toMatchObject({ code: 'CREATE_MANY_CANCELLED' });
    expect(app.source.createMany).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(app.read().create.mutation.isSuccess).toBe(true));
    expect(app.read().create.mutation.data).toEqual({ data: [rows[1]] });
  });

  it('discards late native auth failure without refreshing or logging out the newer session', async () => {
    const app = await mountSession();
    const effects = await observeEffects(app);
    const handler = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    app.session.onError = handler;
    const gate = deferred<GetManyResult>();
    nativeCreate(app.source).mockReturnValueOnce(gate.promise);
    const observer = vi.fn();
    const operation = app.read().create.mutation.mutateAsync({ variables }, { onError: observer, onSettled: observer })
      .catch((error: unknown) => error);
    await waitFor(() => expect(app.source.createMany).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    const refresh = vi.spyOn(app.client, 'invalidateQueries');
    gate.reject({ statusCode: 401, message: 'PRIVATE' });
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'CREATE_MANY_CANCELLED', details: {
      attemptedIndexes: [0, 1], failedIndexes: [], unattemptedIndexes: [], writeMayHaveSucceeded: true,
    } });
    expect(error).not.toHaveProperty('details.succeeded');
    expect(handler).not.toHaveBeenCalled();
    expect(app.session.logout).not.toHaveBeenCalled();
    expect(observer).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each(['success', 'partial', 'failure', 'preflight', 'pending'] as const)('hides %s state immediately on login', async outcome => {
    const source = provider();
    const gate = deferred<GetManyResult>();
    if (outcome === 'partial') {
      delete source.createMany;
      vi.mocked(source.create).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce(new Error('PRIVATE'));
    } else if (outcome === 'failure') nativeCreate(source).mockRejectedValueOnce(new Error('PRIVATE'));
    else if (outcome === 'pending') nativeCreate(source).mockReturnValueOnce(gate.promise);
    const app = await mountSession(source);
    const operation = app.read().create.mutation.mutateAsync({ variables: outcome === 'preflight' ? [{}] : variables })
      .catch((error: unknown) => error);
    if (outcome !== 'pending') await operation;
    await waitFor(() => expect(app.read().create.mutation.status).toBe(
      outcome === 'pending' ? 'pending' : outcome === 'success' ? 'success' : 'error',
    ));
    const state = app.read().create.mutation;
    const loginGate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(loginGate.promise);
    const login = app.actions().login.mutate({});
    expect(state.status).toBe('idle');
    expect(state.isIdle).toBe(true);
    expect(state.isPending).toBe(false);
    expect(state.isSuccess).toBe(false);
    expect(state.data).toBeUndefined();
    expect(state.variables).toBeUndefined();
    expect(state.error).toBeNull();
    expect(state.failureReason).toBeNull();
    expect({ ...state }).toMatchObject({ status: 'idle', data: undefined, variables: undefined, error: null });
    const reflected: unknown = Object.getOwnPropertyDescriptor(state, 'data')?.get?.();
    expect(reflected).toBeUndefined();
    expect(Reflect.set(state, 'data', { data: rows })).toBe(false);
    gate.resolve({ data: rows });
    await operation;
    loginGate.resolve({ success: true });
    await login;
    flushSync();
    expect(state.isIdle).toBe(true);
  });

  it('retires preflight observers before queued delivery', async () => {
    const app = await mountSession();
    const callback = vi.fn();
    const operation = app.read().create.mutation.mutateAsync({ variables: [{}] }, { onError: callback, onSettled: callback })
      .catch((error: unknown) => error);
    await app.actions().login.mutate({});
    expect(await operation).toMatchObject({ code: 'CREATE_MANY_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(callback).not.toHaveBeenCalled();
    expect(app.source.createMany).not.toHaveBeenCalled();
  });

  it.each(['success', 'partial', 'cancelled', 'preflight'] as const)('withholds old %s data after delayed native completion', async outcome => {
    const source = provider();
    const receipt = deferred<GetManyResult>();
    if (outcome === 'partial') {
      delete source.createMany;
      vi.mocked(source.create).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce(new Error('PRIVATE'));
    } else nativeCreate(source).mockReturnValueOnce(receipt.promise);
    const app = await mountSession(source);
    const gate = deferred();
    const observer = vi.fn(() => gate.promise);
    if (outcome === 'success') app.client.getMutationCache().config.onSuccess = observer;
    else app.client.getMutationCache().config.onError = observer;
    const operation = app.read().create.mutation.mutateAsync({ variables: outcome === 'preflight' ? [{}] : variables })
      .catch((error: unknown) => error);
    if (outcome === 'success' || outcome === 'cancelled') {
      await waitFor(() => expect(source.createMany).toHaveBeenCalledTimes(1));
      if (outcome === 'cancelled') await app.view.rerender({ tenant: 'second' });
      receipt.resolve({ data: rows });
    }
    await waitFor(() => expect(observer).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    gate.resolve();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'CREATE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: outcome !== 'preflight', attemptedIndexes: outcome === 'preflight' ? [] : [0, 1],
    } });
    expect(error).not.toHaveProperty('succeeded');
    expect(error).not.toHaveProperty('details.succeeded');
    expect(error).not.toHaveProperty('causes');
    expect(app.read().create.mutation.isIdle).toBe(true);
  });

  it.each(['audit', 'audit-provider', 'live', 'collection-refresh', 'detail-refresh', 'notification', 'onSuccess', 'onSettled'] as const)(
    'stops later completion effects when %s starts another login', async stage => {
      const app = await mountSession();
      const effects = await observeEffects(app);
      const { builder, owner } = scopedKeys(app, posts, captureAuthSession(app.session).cacheKey);
      const collection = builder.data.select('posts', owner);
      const secondDetail = builder.data.one('posts', 2, owner);
      const details = [builder.data.one('posts', 1, owner), secondDetail];
      for (const key of [collection, ...details]) app.client.setQueryData(key, {});
      const gate = deferred<AuthActionResult>();
      vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
      let login: Promise<AuthActionResult> | undefined;
      const start = () => { login ??= app.actions().login.mutate({}); };
      if (stage === 'audit') effects.auditHandler.mockImplementation(start);
      if (stage === 'audit-provider') vi.mocked(effects.audit.create).mockImplementation(async input => {
        start();
        return { ...input, id: 'audit' };
      });
      if (stage === 'live') effects.live.publish.mockImplementation(start);
      if (stage === 'notification') effects.notification.open.mockImplementation(start);
      const release = app.client.getQueryCache().subscribe(event => {
        if (event.type !== 'updated' || event.action.type !== 'invalidate') return;
        const descriptor = parseQueryKey(event.query.queryKey);
        if (stage === 'collection-refresh' || (stage === 'detail-refresh' && descriptor?.action === 'one')) start();
      });
      const onSuccess = vi.fn(() => { if (stage === 'onSuccess') start(); });
      const onSettled = vi.fn(() => { if (stage === 'onSettled') start(); });
      const invalidate = vi.spyOn(app.client, 'invalidateQueries');
      const error: unknown = await app.read().create.mutation.mutateAsync({ variables }, { onSuccess, onSettled })
        .catch((error: unknown) => error);
      expect(login).toBeDefined();
      expect(error).toMatchObject({ code: 'CREATE_MANY_CANCELLED', details: {
        writeMayHaveSucceeded: true, attemptedIndexes: [0, 1],
      } });
      expect(error).not.toHaveProperty('details.succeeded');
      if (stage === 'audit' || stage === 'audit-provider') {
        expect(effects.auditHandler).toHaveBeenCalledTimes(1);
        expect(effects.audit.create).toHaveBeenCalledTimes(stage === 'audit' ? 0 : 1);
        expect(effects.live.publish).not.toHaveBeenCalled();
      }
      if (stage === 'audit' || stage === 'audit-provider' || stage === 'live') expect(invalidate).not.toHaveBeenCalled();
      if (stage === 'collection-refresh') {
        expect(invalidate).toHaveBeenCalledTimes(1);
        expect(app.client.getQueryState(collection)?.isInvalidated).toBe(false);
        for (const key of details) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
      }
      if (stage === 'detail-refresh') expect(app.client.getQueryState(secondDetail)?.isInvalidated).toBe(false);
      if (stage !== 'onSuccess' && stage !== 'onSettled') expect(onSuccess).not.toHaveBeenCalled();
      if (stage !== 'onSettled') expect(onSettled).not.toHaveBeenCalled();
      release();
      gate.resolve({ success: true });
      await login;
    });

  it.each(['preflight', 'partial', 'joined-partial', 'joined-success'] as const)('rechecks each observer and final caller on reentrant %s delivery', async kind => {
    const source = provider();
    if (kind === 'partial' || kind === 'joined-partial') {
      delete source.createMany;
      vi.mocked(source.create).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce(new Error('PRIVATE'));
    }
    const app = await mountSession(source);
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    let login: Promise<AuthActionResult> | undefined;
    const observer = vi.fn(() => { login = app.actions().login.mutate({}); });
    const onSettled = vi.fn();
    const input = { variables: kind === 'preflight' ? [{}] : variables };
    const joined = kind === 'joined-partial' || kind === 'joined-success';
    const first = app.read().create.mutation.mutateAsync(input, joined ? {} : { onError: observer, onSettled })
      .catch((error: unknown) => error);
    const second = joined ? app.read().create.mutation.mutateAsync(input,
      kind === 'joined-success' ? { onSuccess: observer, onSettled } : { onError: observer, onSettled },
    ).catch((error: unknown) => error) : first;
    await first;
    const error: unknown = await second;
    expect(observer).toHaveBeenCalledTimes(1);
    expect(onSettled).not.toHaveBeenCalled();
    expect(error).toMatchObject({ code: 'CREATE_MANY_CANCELLED', details: { writeMayHaveSucceeded: kind !== 'preflight' } });
    expect(error).not.toHaveProperty('succeeded');
    expect(error).not.toHaveProperty('details.succeeded');
    expect(app.read().create.mutation.isIdle).toBe(true);
    gate.resolve({ success: true });
    await login;
  });

  it('awaits started collection and detail refreshes after an early failure and a session change', async () => {
    const app = await mountSession();
    const { builder, owner } = scopedKeys(app, posts, captureAuthSession(app.session).cacheKey);
    app.client.setQueryData(builder.data.select('posts', owner), {});
    app.client.setQueryData(builder.data.one('posts', 1, owner), {});
    const collectionGate = deferred();
    const detailGate = deferred();
    const refresh = vi.spyOn(app.client, 'invalidateQueries').mockRejectedValueOnce(new Error('PRIVATE'))
      .mockReturnValueOnce(collectionGate.promise).mockReturnValue(detailGate.promise);
    let settled = false;
    const operation = app.read().create.mutation.mutateAsync({ variables }).catch((error: unknown) => error)
      .finally(() => { settled = true; });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(3));
    await app.actions().login.mutate({});
    expect(settled).toBe(false);
    collectionGate.resolve();
    await collectionGate.promise;
    await Promise.resolve();
    expect(settled).toBe(false);
    detailGate.resolve();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'CREATE_MANY_CANCELLED' });
    expect(error).not.toHaveProperty('details.succeeded');
  });

  it('isolates collections and details across independent auth trees sharing one raw provider and client', async () => {
    const source = provider();
    const first = await mountSession(source);
    const second = await mountSession(source, auth(), first.client);
    const left = scopedKeys(first, posts, captureAuthSession(first.session).cacheKey);
    const right = scopedKeys(second, posts, captureAuthSession(second.session).cacheKey);
    expect(left.source).toBe(right.source);
    expect(left.owner.authSession).not.toBe(right.owner.authSession);
    const owned = [left.builder.data.select('posts', left.owner), left.builder.data.one('posts', 1, left.owner)];
    const foreign = [right.builder.data.select('posts', right.owner), right.builder.data.one('posts', 1, right.owner)];
    for (const key of [...owned, ...foreign]) first.client.setQueryData(key, {});
    await first.read().create.mutation.mutateAsync({ variables });
    for (const key of owned) expect(first.client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of foreign) expect(first.client.getQueryState(key)?.isInvalidated).toBe(false);
    await first.actions().logout.mutate();
    await expect(second.read().create.mutation.mutateAsync({ variables })).resolves.toMatchObject({ data: [{ id: 3 }, { id: 4 }] });
    expect(captureAuthSession(second.session).available).toBe(true);
  });

  it.each(['same', 'independent'] as const)('handles another mounted %s auth tree logging out during a sequential batch', async ownership => {
    const source = provider();
    delete source.createMany;
    const first = await mountSession(source);
    const second = await mountSession(source, ownership === 'same' ? first.session : auth(), first.client);
    const gate = deferred<GetOneResult>();
    vi.mocked(source.create).mockReturnValueOnce(gate.promise).mockResolvedValueOnce({ data: rows[1] });
    const operation = first.read().create.mutation.mutateAsync({ variables }).catch((error: unknown) => error);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await second.actions().logout.mutate();
    gate.resolve({ data: rows[0] });
    const result: unknown = await operation;
    if (ownership === 'same') {
      expect(result).toMatchObject({ code: 'CREATE_MANY_CANCELLED', details: { attemptedIndexes: [0], unattemptedIndexes: [1] } });
      expect(result).not.toHaveProperty('details.succeeded');
      expect(source.create).toHaveBeenCalledTimes(1);
    } else {
      expect(result).toEqual({ data: rows });
      expect(source.create).toHaveBeenCalledTimes(2);
    }
  });

  it.each(['resolved', 'rejected'] as const)('lets the current partial-error delegate finish its own %s logout', async outcome => {
    const source = provider();
    delete source.createMany;
    vi.mocked(source.create).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce({ statusCode: 401, message: 'PRIVATE' });
    const app = await mountSession(source);
    app.session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    vi.mocked(app.session.logout).mockResolvedValueOnce({ success: outcome === 'resolved' });
    const error: unknown = await app.read().create.mutation.mutateAsync({ variables }).catch((error: unknown) => error);
    expect(error).toMatchObject({ code: 'CREATE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: true, attemptedIndexes: [0, 1], failedIndexes: [1],
    } });
    expect(error).not.toHaveProperty('succeeded');
    expect(error).not.toHaveProperty('details.succeeded');
    await waitFor(() => expect(app.session.logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(captureAuthSession(app.session).available).toBe(false));
    if (outcome === 'resolved') await waitFor(() => expect(app.go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
    else expect(app.go).not.toHaveBeenCalled();
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({ code: 'CREATE_MANY_CANCELLED' });
    expect(source.create).toHaveBeenCalledTimes(2);
  });

  it.each(['unchanged', 'login', 'reset'] as const)('rechecks its delayed logout delegate after %s', async change => {
    const app = await mountSession();
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.logout).mockReturnValueOnce(gate.promise);
    app.session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    nativeCreate(app.source).mockRejectedValueOnce({ statusCode: 401 });
    const operation = app.read().create.mutation.mutateAsync({ variables }).catch((error: unknown) => error);
    await waitFor(() => expect(app.session.logout).toHaveBeenCalledTimes(1));
    expect(await operation).toMatchObject({ code: 'CREATE_MANY_CANCELLED' });
    expect(app.read().create.mutation.isIdle).toBe(true);
    if (change === 'login') await app.actions().login.mutate({});
    else if (change === 'reset') app.read().create.mutation.reset();
    app.go.mockClear();
    const remove = vi.spyOn(app.client, 'removeQueries');
    const beforeCompletion = captureAuthSession(app.session).cacheKey;
    gate.resolve({ success: true });
    if (change === 'unchanged') {
      await waitFor(() => expect(app.go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
      expect(remove).toHaveBeenCalledTimes(1);
      expect(captureAuthSession(app.session).available).toBe(false);
    } else {
      await gate.promise;
      await Promise.resolve();
      expect(remove).not.toHaveBeenCalled();
      expect(app.go).not.toHaveBeenCalled();
      if (change === 'login') {
        // An older remote logout finishing last leaves the effective principal uncertain.
        await waitFor(() => expect(captureAuthSession(app.session).cacheKey).not.toBe(beforeCompletion));
        expect(captureAuthSession(app.session).available).toBe(false);
        await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({ code: 'CREATE_MANY_CANCELLED' });
        expect(app.source.createMany).toHaveBeenCalledTimes(1);
        await app.actions().check.refetch();
        expect(captureAuthSession(app.session).available).toBe(true);
        await expect(app.read().create.mutation.mutateAsync({ variables })).resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
        expect(remove).not.toHaveBeenCalled();
        expect(app.go).not.toHaveBeenCalled();
      }
    }
  });

  it('clears only its owned tagged queries when a partial-error delegate confirms logout', async () => {
    const source = provider();
    delete source.createMany;
    const first = await mountSession(source);
    const second = await mountSession(source, auth(), first.client);
    const left = scopedKeys(first, posts, captureAuthSession(first.session).cacheKey);
    const right = scopedKeys(second, posts, captureAuthSession(second.session).cacheKey);
    const owned = left.builder.data.one('posts', 1, { ...left.owner, fixture: true });
    const foreign = right.builder.data.one('posts', 1, { ...right.owner, fixture: true });
    first.client.setQueryData(owned, { data: rows[0] });
    first.client.setQueryData(foreign, { data: rows[1] });
    first.session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    vi.mocked(source.create).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce({ statusCode: 401 });
    await expect(first.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({ code: 'CREATE_MANY_CANCELLED' });
    await waitFor(() => expect(first.go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
    expect(first.client.getQueryState(owned)).toBeUndefined();
    expect(first.client.getQueryData(foreign)).toEqual({ data: rows[1] });
    expect(first.client.getQueryState(foreign)?.isInvalidated).toBe(false);
    expect(captureAuthSession(second.session).available).toBe(true);
  });

  it('drops delayed auth instructions after a newer login on the same provider', async () => {
    const app = await mountSession();
    const gate = deferred<{ logout: boolean; redirectTo: string }>();
    const handler = vi.fn(() => gate.promise);
    app.session.onError = handler;
    nativeCreate(app.source).mockRejectedValueOnce({ statusCode: 401 });
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({ code: 'CREATE_MANY_FAILED' });
    await waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    app.go.mockClear();
    gate.resolve({ logout: true, redirectTo: '/login' });
    await gate.promise;
    await Promise.resolve();
    expect(app.session.logout).not.toHaveBeenCalled();
    expect(app.go).not.toHaveBeenCalled();
  });
});

describe('contract-bound batch create', () => {
  it('strictly compiles the hook, adapter, public aliases and positive/negative fixtures', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ['../../../core/src/create-many-contract.ts', '../../../core/src/create-many-hooks.svelte.ts',
      '../../../core/src/auth-hooks.svelte.ts', '../../../core/src/query-invalidation.ts', '../../../core/src/query-session.svelte.ts',
      '../../../core/src/hooks.svelte.ts', '../../../../scripts/fixtures/core-resource-types/unregistered.ts',
      '../../../core/src/strict-hooks.svelte.ts', 'create-many-contract.test.svelte.ts',
      'create-many-contract.test.types.ts', 'create-many-contract.test.type-fixture.ts',
    ].map(file => resolve(directory, file));
    const virtual = new Map(['create-many-contract.test-probe.svelte', 'create-many-contract.test-host.svelte'].map(file => {
      const filename = resolve(directory, file);
      return [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code];
    }));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false, types: ['svelte', 'node'],
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.Preserve, allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = file => virtual.get(file) ?? read(file);
    host.fileExists = file => virtual.has(file) || exists(file);
    host.resolveModuleNames = (names, containingFile) => names.map(name => {
      const candidate = resolve(dirname(containingFile), `${name}.tsx`);
      if (virtual.has(candidate)) return { resolvedFileName: candidate, extension: ts.Extension.Tsx };
      return ts.resolveModuleName(name, containingFile, options, host).resolvedModule;
    });
    const targets = [...sources, ...virtual.keys()];
    const program = ts.createProgram({ rootNames: [...targets,
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
    ], options, host });
    const diagnostics = targets.flatMap(file => {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Missing input ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(diagnostics.map(diagnostic => {
      const line = diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1 : 0;
      return `${diagnostic.file?.fileName ?? ''}:${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
    })).toEqual([]);
  }, 30_000);

  it('removes unchecked batch-create exports', () => {
    expect('useCreateMany' in legacy).toBe(false);
    expect('createCreateManyMutation' in legacy).toBe(false);
  });
  it.each([[], [undefined], [{}], [{ title: false }], [{ title: 'Valid' }, { title: 2 }],
    [{ title: 'Extra', extra: 1 }], [{ title: 'Valid' }, NaN],
  ].map(variables => ({ variables })))('preflights the entire batch %j', async input => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync(input)).rejects.toMatchObject({
      code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false },
    });
    expect(source.createMany).not.toHaveBeenCalled();
    expect(source.create).not.toHaveBeenCalled();
  });
  it('requires a create schema for dynamic contracts before dispatch', async () => {
    const source = provider();
    const app = mount(source);
    await rebind(app, defineResource('posts', { record }));
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({
      code: 'INVALID_RESOURCE_CONTRACT', details: { writeMayHaveSucceeded: false },
    });
    expect(source.createMany).not.toHaveBeenCalled();
  });
  it.each([
    { resource: 'other' }, { invalidates: false }, { retry: 1 }, { mutationMode: 'optimistic' },
    { successNotification: false }, { errorNotification: false }, { dataProviderName: '' },
  ])('rejects per-call overrides %j', async policy => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync(Object.assign({ variables }, policy)))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.createMany).not.toHaveBeenCalled();
  });
  it('does not execute accessors and snapshots provider methods, inputs and metadata', async () => {
    const source = provider();
    const getter = vi.fn(() => variables);
    const original = vi.fn<NonNullable<DataProvider['createMany']>>(async function(this: DataProvider) {
      expect(this).toBe(source);
      return { data: [rows[0]] };
    });
    source.createMany = original;
    const app = mount(source);
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync(Object.defineProperty({ variables }, 'variables', { get: getter }))).rejects.toBeDefined();
    expect(getter).not.toHaveBeenCalled();
    const input = { variables: [{ title: 'Original' }], meta: { region: 'Original' } };
    const operation = app.read().create.mutation.mutateAsync(input);
    input.variables[0] = { title: 'Changed' };
    input.meta.region = 'Changed';
    source.createMany = vi.fn(async () => ({ data: [] }));
    await operation;
    expect(original).toHaveBeenCalledWith(expect.objectContaining({
      variables: [{ title: 'Original' }], meta: expect.objectContaining({ region: 'Original' }),
    }));
    expect(source.createMany).not.toHaveBeenCalled();
  });
  it('checks supplied IDs and duplicates before any fallback dispatch', async () => {
    const source = provider();
    delete source.createMany;
    const app = mount(source);
    await rebind(app, withIds());
    await expect(app.read().create.mutation.mutateAsync({ variables: rows.map(() => rows[0]) })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    await expect(app.read().create.mutation.mutateAsync({ variables: [{ id: '1', title: 'Wrong ID' }] })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.create).not.toHaveBeenCalled();
    const loose = defineResource('loose', { record, create: Type.Object({ id: Type.Boolean(), title: Type.String() }) });
    expect(() => parseCreateManyParams(loose, { variables: [{ id: false, title: 'Wrong' }] })).toThrow();
  });
  it.each([
    [], [rows[0]], [rows[0], rows[0]], [{ id: 1, title: false }, rows[1]],
    [{ id: '1', title: 'Wrong type' }, rows[1]], [...rows, { id: 3, title: 'Extra' }],
  ].map(data => ({ data })))('rejects malformed native receipts without retry %j', async receipt => {
    const source = provider();
    source.createMany = vi.fn(async () => receipt);
    const app = mount(source);
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
    });
    expect(source.createMany).toHaveBeenCalledTimes(1);
  });
  it('requires positional correspondence when the caller supplied IDs', async () => {
    const source = provider();
    source.createMany = vi.fn(async () => ({ data: [...rows].reverse() }));
    const app = mount(source);
    await rebind(app, withIds());
    await expect(app.read().create.mutation.mutateAsync({ variables: rows })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    source.createMany = vi.fn(async () => ({ data: rows }));
    await expect(app.read().create.mutation.mutateAsync({ variables: rows })).resolves.toEqual({ data: rows });
  });
  it('accepts generated IDs without pretending to verify business correspondence', async () => {
    const source = provider();
    source.createMany = vi.fn(async () => ({ data: [...rows].reverse() }));
    const app = mount(source);
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync({ variables })).resolves.toEqual({ data: [...rows].reverse() });
  });
  it('keeps numeric and string identity distinct in receipts, refreshes and audit', async () => {
    const contract = defineResource('posts', {
      record: Type.Object({ id: Type.Union([Type.Number(), Type.String()]), title: Type.String() }),
      create: Type.Object({ id: Type.Union([Type.Number(), Type.String()]), title: Type.String() }),
    });
    const source = provider();
    source.createMany = vi.fn(async () => ({ data: [{ id: 1, title: 'Numeric' }, { id: '1', title: 'String' }] }));
    const app = mount(source);
    await rebind(app, contract);
    const audit = vi.fn();
    setAuditHandler(audit);
    const { builder, owner } = scopedKeys(app, contract);
    const numeric = builder.data.one('posts', 1, owner);
    const string = builder.data.one('posts', '1', owner);
    const unrelated = builder.data.one('posts', '2', owner);
    for (const key of [numeric, string, unrelated]) app.client.setQueryData(key, {});
    await expect(app.read().create.mutation.mutateAsync({ variables: [{ id: 1, title: 'Numeric' }, { id: '1', title: 'String' }] }))
      .resolves.toMatchObject({ data: [{ id: 1 }, { id: '1' }] });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', recordId: 1 }));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', recordId: '1' }));
    expect(app.client.getQueryState(numeric)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(string)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(unrelated)?.isInvalidated).toBe(false);
  });
  it('records sequential successes and failed indexes including duplicate generated IDs', async () => {
    const source = provider();
    delete source.createMany;
    source.create = vi.fn(async () => ({ data: rows[0] }));
    const app = mount(source);
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({
      code: 'CREATE_MANY_PARTIAL', succeeded: [{ index: 0, record: rows[0] }],
      failedIndexes: [1], causes: [{ code: 'INVALID_PROVIDER_RESPONSE' }],
    });
    expect(source.create).toHaveBeenCalledTimes(2);
  });
  it('preserves failure indexes even when every fallback fails', async () => {
    const source = provider();
    delete source.createMany;
    source.create = vi.fn(async () => { throw new Error('secret'); });
    const app = mount(source);
    await ready(app);
    const outcome: unknown = await app.read().create.mutation.mutateAsync({ variables }).catch((error: unknown) => error);
    expect(outcome).toMatchObject({ code: 'CREATE_MANY_PARTIAL', succeeded: [], failedIndexes: [0, 1] });
    expect(JSON.stringify(outcome)).not.toContain('secret');
    expect(source.create).toHaveBeenCalledTimes(2);
  });
  it('gives each fallback fresh payload and metadata snapshots', async () => {
    const source = provider();
    delete source.createMany;
    let count = 0;
    source.create = vi.fn(async input => {
      expect(input.meta?.['region']).toBe('Original');
      expect(input.variables).toEqual({ title: 'Original' });
      if (input.meta) input.meta['region'] = 'Changed';
      if (typeof input.variables === 'object' && input.variables !== null) Object.assign(input.variables, { title: 'Changed' });
      return { data: { id: ++count, title: 'Created' } };
    });
    const app = mount(source);
    await ready(app);
    const shared = { title: 'Original' };
    await app.read().create.mutation.mutateAsync({ variables: [shared, shared], meta: { region: 'Original' } });
    expect(shared.title).toBe('Original');
    expect(source.create).toHaveBeenCalledTimes(2);
  });
  it('refreshes only captured collections and known details without removing cache data', async () => {
    const app = mount();
    await ready(app);
    const { builder, source, scope, owner } = scopedKeys(app);
    const selected = [builder.data.list('posts', { ...owner, extra: true }), builder.data.infiniteList('posts', owner),
      builder.data.select('posts', owner), builder.data.selectDefaults('posts', owner), builder.data.many('posts', { ...owner, ids: [1] }),
      builder.data.one('posts', 1, owner), builder.data.one('posts', 2, owner)];
    const excluded = [builder.data.one('posts', 99, owner), builder.data.list('posts'),
      builder.data.list('posts', { source }), builder.data.list('posts', { ...owner, authSession: 'foreign' }),
      builder.data.list('posts', { ...owner, source: 'other' }), builder.data.list('other', owner),
      keys({ ...scope, contract: contractKey(other) }).data.list('posts', owner),
      keys({ ...scope, tenant: 'other' }).data.list('posts', owner),
      keys({ ...scope, provider: 'other' }).data.list('posts', owner)];
    for (const key of [...selected, ...excluded]) app.client.setQueryData(key, { fixture: true });
    await app.read().create.mutation.mutateAsync({ variables });
    for (const key of selected) {
      expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
      expect(app.client.getQueryData(key)).toEqual({ fixture: true });
    }
    for (const key of excluded) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
  });
  it('refreshes supplied IDs after uncertain receipts without trusting foreign IDs', async () => {
    const source = provider();
    source.createMany = vi.fn(async () => ({ data: [{ id: 99, title: 'Foreign' }] }));
    const app = mount(source);
    const contract = withIds();
    await rebind(app, contract);
    const { builder, owner } = scopedKeys(app, contract);
    const selected = builder.data.one('posts', 1, owner);
    const excluded = builder.data.one('posts', 99, owner);
    for (const key of [selected, excluded]) app.client.setQueryData(key, {});
    await expect(app.read().create.mutation.mutateAsync({ variables: [rows[0]] })).rejects.toBeDefined();
    expect(app.client.getQueryState(selected)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(excluded)?.isInvalidated).toBe(false);
  });
  it('refreshes collections on an uncertain server-generated create without inventing IDs', async () => {
    const source = provider();
    source.createMany = vi.fn(async () => { throw new Error('secret'); });
    const app = mount(source);
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const list = builder.data.list('posts', { ...owner, fixture: true });
    const detail = builder.data.one('posts', 99, owner);
    for (const key of [list, detail]) app.client.setQueryData(key, {});
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({
      code: 'CREATE_MANY_FAILED', details: { writeMayHaveSucceeded: true },
    });
    expect(app.client.getQueryState(list)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(detail)?.isInvalidated).toBe(false);
  });
  it.each(['success', 'failure'])('waits for all refreshes before %s settlement', async outcome => {
    const source = provider();
    if (outcome === 'failure') source.createMany = vi.fn(async () => { throw new Error('failed'); });
    const app = mount(source);
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const hold = deferred<GetListResult>();
    const observer = new QueryObserver(app.client, {
      queryKey: builder.data.list('posts', { ...owner, observed: true }),
      initialData: { data: rows, total: 2 }, queryFn: () => hold.promise, staleTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => {});
    let settled = false;
    const operation = app.read().create.mutation.mutateAsync({ variables }).catch(() => undefined).finally(() => { settled = true; });
    await waitFor(() => expect(observer.getCurrentResult().isFetching).toBe(true));
    expect(settled).toBe(false);
    hold.resolve({ data: rows, total: 2 });
    await operation;
    expect(settled).toBe(true);
    unsubscribe();
  });
  it.each(['resource', 'tenant', 'provider', 'contract', 'disabled', 'reset', 'unmount'])(
    'stops fallback writes and preserves recovery evidence after %s changes', async change => {
      const source = provider();
      delete source.createMany;
      const hold = deferred<GetOneResult>();
      source.create = vi.fn(() => hold.promise);
      const app = mount(source);
      await ready(app);
      const callback = vi.fn();
      const original = app.read().create;
      const outcome = original.mutation.mutateAsync({ variables }, { onSuccess: callback, onError: callback }).catch((error: unknown) => error);
      await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
      if (change === 'resource') await app.view.rerender({ resource: 'other' });
      else if (change === 'tenant') await app.view.rerender({ tenant: 'replacement' });
      else if (change === 'provider') await app.view.rerender({ provider: provider() });
      else if (change === 'contract') await rebind(app, defineResource('posts', { record, create: createSchema }));
      else if (change === 'disabled') await app.view.rerender({ enabled: false });
      else if (change === 'reset') original.mutation.reset();
      else app.view.unmount();
      hold.resolve({ data: rows[0] });
      expect(await outcome).toMatchObject({
        code: 'CREATE_MANY_CANCELLED', details: {
          writeMayHaveSucceeded: true, attemptedIndexes: [0], succeeded: [{ index: 0, record: rows[0] }], unattemptedIndexes: [1],
        },
      });
      expect(source.create).toHaveBeenCalledTimes(1);
      expect(callback).not.toHaveBeenCalled();
      if (change !== 'unmount') await waitFor(() => expect(app.read().create.mutation.isIdle).toBe(true));
    },
  );
  it('does not let a stale batch replace a newly completed mutation', async () => {
    const source = provider();
    const hold = deferred<GetManyResult>();
    source.createMany = vi.fn(({ resource }) => resource === 'posts' ? hold.promise : Promise.resolve({ data: [rows[1]] }));
    const app = mount(source);
    await ready(app);
    const old = app.read().create.mutation.mutateAsync({ variables: [variables[0]] }).catch((error: unknown) => error);
    await waitFor(() => expect(source.createMany).toHaveBeenCalledTimes(1));
    await app.view.rerender({ resource: 'other' });
    await app.read().create.mutation.mutateAsync({ variables: [variables[1]] });
    hold.resolve({ data: [rows[0]] });
    expect(await old).toMatchObject({ code: 'CREATE_MANY_CANCELLED' });
    await waitFor(() => expect(app.read().create.mutation.isSuccess).toBe(true));
    expect(app.read().create.mutation.data).toEqual({ data: [rows[1]] });
  });
  it('does not dispatch when disabled', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    await app.view.rerender({ enabled: false });
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({
      code: 'CREATE_MANY_CANCELLED', details: { writeMayHaveSucceeded: false },
    });
    expect(source.createMany).not.toHaveBeenCalled();
  });
  it('coalesces identical active batches and detaches returned data, callbacks and state', async () => {
    const source = provider();
    const hold = deferred<GetManyResult>();
    source.createMany = vi.fn(() => hold.promise);
    const app = mount(source);
    await ready(app);
    const callback = vi.fn((result: { data: Record<string, unknown>[] } | undefined) => {
      if (result?.data[0]) result.data[0]['title'] = 'callback';
    });
    const first = app.read().create.mutation.mutateAsync({ variables }, { onSuccess: callback, onSettled: callback });
    const second = app.read().create.mutation.mutateAsync({ variables }, { onSuccess: callback, onSettled: callback });
    await expect(app.read().create.mutation.mutateAsync({ variables: [{ title: 'Conflict' }] })).rejects.toMatchObject({ code: 'CREATE_MANY_BUSY' });
    await waitFor(() => expect(source.createMany).toHaveBeenCalledTimes(1));
    const receipt = { data: rows.map(row => ({ ...row })) };
    hold.resolve(receipt);
    const [left, right] = await Promise.all([first, second]);
    await waitFor(() => expect(app.read().create.mutation.isSuccess).toBe(true));
    if (left.data[0]) left.data[0]['title'] = 'caller';
    if (receipt.data[0]) receipt.data[0].title = 'provider';
    const state = app.read().create.mutation.data;
    if (state?.data[0]) state.data[0]['title'] = 'state';
    expect(right).toEqual({ data: rows });
    expect(app.read().create.mutation.data).toEqual({ data: rows });
    expect(callback).toHaveBeenCalledTimes(4);
    const input = app.read().create.mutation.variables;
    if (input) input.variables[0] = { title: 'Changed' };
    expect(app.read().create.mutation.variables).toEqual({ variables });
  });
  it('detaches partial errors between joined promises, observers and state', async () => {
    const source = provider();
    delete source.createMany;
    const hold = deferred<GetOneResult>();
    source.create = vi.fn(() => hold.promise);
    const app = mount(source);
    await ready(app);
    const onError = vi.fn((error: unknown) => {
      if (error instanceof CreateManyPartialError) error.failedIndexes.push(999);
    });
    const first = app.read().create.mutation.mutateAsync({ variables }, { onError }).catch((error: unknown) => error);
    const second = app.read().create.mutation.mutateAsync({ variables }, { onError }).catch((error: unknown) => error);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    hold.resolve({ data: rows[0] });
    const [left, right] = await Promise.all([first, second]);
    if (!(left instanceof CreateManyPartialError)) throw new Error('Expected a partial error');
    left.failedIndexes.push(99);
    if (left.succeeded[0]) left.succeeded[0].record['title'] = 'caller';
    await waitFor(() => expect(app.read().create.mutation.isError).toBe(true));
    expect(right).toMatchObject({ failedIndexes: [1], succeeded: [{ index: 0, record: rows[0] }] });
    expect(app.read().create.mutation.error).toMatchObject({ failedIndexes: [1], succeeded: [{ index: 0, record: rows[0] }] });
    expect(onError).toHaveBeenCalledTimes(2);
  });
  it('detaches preflight failure objects from state', async () => {
    const app = mount();
    await ready(app);
    const error: unknown = await app.read().create.mutation.mutateAsync({ variables: [{}] }).catch((error: unknown) => error);
    if (typeof error === 'object' && error !== null) Object.assign(error, { message: 'changed' });
    await waitFor(() => expect(app.read().create.mutation.isError).toBe(true));
    expect(app.read().create.mutation.error?.message).toBe('Invalid batch create input');
  });
  it('ignores inherited retries and lifecycle overrides even when observers throw', async () => {
    const source = provider();
    source.createMany = vi.fn(async () => { throw new Error('failed'); });
    const app = mount(source);
    await ready(app);
    const inherited = vi.fn();
    app.client.setDefaultOptions({ mutations: { retry: 4, retryDelay: 0, onMutate: inherited, onError: inherited, onSettled: inherited } });
    await expect(app.read().create.mutation.mutateAsync({ variables }, {
      onError() { throw new Error('observer'); }, onSettled() { throw new Error('observer'); },
    })).rejects.toMatchObject({ code: 'CREATE_MANY_FAILED' });
    expect(inherited).not.toHaveBeenCalled();
    expect(source.createMany).toHaveBeenCalledTimes(1);
  });
  it('handles sanitized auth causes in partial failures without sharing stored errors', async () => {
    const source = provider();
    delete source.createMany;
    let count = 0;
    source.create = vi.fn(async () => {
      if (++count === 1) throw new Error('secret');
      throw { statusCode: 401, message: 'secret' };
    });
    const app = mount(source);
    const onError = vi.fn<NonNullable<AuthProvider['onError']>>(async error => {
      expect(error).toMatchObject({ statusCode: 401 });
      if (typeof error === 'object' && error !== null) Object.assign(error, { message: 'modified' });
      return { logout: false };
    });
    await app.view.rerender({ auth: { ...auth(), onError } });
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({
      code: 'CREATE_MANY_PARTIAL', causes: [{ message: 'Batch create failed' }, { statusCode: 401, message: 'Batch create failed' }],
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });
  it('ignores late auth redirects after scope replacement', async () => {
    const source = provider();
    source.createMany = vi.fn(async () => { throw { statusCode: 401 }; });
    const app = mount(source);
    const held = deferred<{ logout: boolean; redirectTo: string }>();
    const onError = vi.fn(() => held.promise);
    const go = vi.fn();
    await app.view.rerender({ auth: { ...auth(), onError }, router: { go, back: vi.fn(), parse: () => ({ params: {}, pathname: '/' }) } });
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toBeDefined();
    expect(onError).toHaveBeenCalledTimes(1);
    await app.view.rerender({ resource: 'other' });
    held.resolve({ logout: false, redirectTo: '/login' });
    await held.promise;
    await Promise.resolve();
    expect(go).not.toHaveBeenCalled();
  });
  it('allows a valid auth redirect after promise settlement in the same scope', async () => {
    const source = provider();
    source.createMany = vi.fn(async () => { throw { statusCode: 401 }; });
    const app = mount(source);
    const held = deferred<{ logout: boolean; redirectTo: string }>();
    const go = vi.fn();
    await app.view.rerender({
      auth: { ...auth(), onError: () => held.promise },
      router: { go, back: vi.fn(), parse: () => ({ params: {}, pathname: '/' }) },
    });
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toBeDefined();
    held.resolve({ logout: false, redirectTo: '/login' });
    await waitFor(() => expect(go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
  });
  it('suppresses late auth redirects after an explicit reset', async () => {
    const source = provider();
    source.createMany = vi.fn(async () => { throw { statusCode: 401 }; });
    const app = mount(source);
    const held = deferred<{ logout: boolean; redirectTo: string }>();
    const go = vi.fn();
    await app.view.rerender({
      auth: { ...auth(), onError: () => held.promise },
      router: { go, back: vi.fn(), parse: () => ({ params: {}, pathname: '/' }) },
    });
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toBeDefined();
    app.read().create.mutation.reset();
    held.resolve({ logout: false, redirectTo: '/login' });
    await held.promise;
    await Promise.resolve();
    expect(go).not.toHaveBeenCalled();
  });
  it('rejects a response accessor without executing provider code', async () => {
    const source = provider();
    const getter = vi.fn(() => rows);
    source.createMany = vi.fn(async () => Object.defineProperty({ data: rows }, 'data', { get: getter }));
    const app = mount(source);
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(getter).not.toHaveBeenCalled();
  });
  it('preflights every fallback member before dispatching the first one', async () => {
    const source = provider();
    delete source.createMany;
    const app = mount(source);
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync({ variables: [{ title: 'Valid' }, { title: false }] }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.create).not.toHaveBeenCalled();
  });
  it('uses the requested named provider and rejects an unknown provider before dispatch', async () => {
    const primary = provider();
    const named = provider();
    const app = mount({ default: primary, named });
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync({ variables, dataProviderName: 'missing' })).rejects.toBeDefined();
    expect(primary.createMany).not.toHaveBeenCalled();
    expect(named.createMany).not.toHaveBeenCalled();
    await app.read().create.mutation.mutateAsync({ variables, dataProviderName: 'named' });
    expect(named.createMany).toHaveBeenCalledTimes(1);
    expect(primary.createMany).not.toHaveBeenCalled();
  });
  it('refreshes only the old captured cache when a native request completes after replacement', async () => {
    const source = provider();
    const hold = deferred<GetManyResult>();
    source.createMany = vi.fn(() => hold.promise);
    const app = mount(source);
    await ready(app);
    const { builder, source: tag, owner } = scopedKeys(app);
    const oldList = builder.data.list('posts', { ...owner, fixture: true });
    const oldDetail = builder.data.one('posts', 1, owner);
    for (const key of [oldList, oldDetail]) app.client.setQueryData(key, {});
    const old = app.read().create.mutation.mutateAsync({ variables: [variables[0]] }).catch((error: unknown) => error);
    await waitFor(() => expect(source.createMany).toHaveBeenCalledTimes(1));
    await app.view.rerender({ provider: provider() });
    await ready(app);
    const replacements = app.client.getQueryCache().getAll().filter(query => {
      const key = parseQueryKey(query.queryKey);
      const params = key?.params;
      return key?.kind === 'data' && key.action === 'list' && key.resource === 'posts' &&
        typeof params === 'object' && params !== null && Object.getOwnPropertyDescriptor(params, 'source')?.value !== tag;
    });
    expect(replacements.length).toBeGreaterThan(0);
    const invalidate = vi.spyOn(app.client, 'invalidateQueries');
    hold.resolve({ data: [rows[0]] });
    expect(await old).toMatchObject({ code: 'CREATE_MANY_CANCELLED' });
    expect(app.client.getQueryState(oldList)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(oldDetail)?.isInvalidated).toBe(true);
    for (const query of replacements) {
      for (const [filters] of invalidate.mock.calls) expect(filters?.predicate?.(query)).not.toBe(true);
    }
  });
  it('waits for remaining refreshes even if another refresh rejects immediately', async () => {
    const app = mount();
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    app.client.setQueryData(builder.data.list('posts', { ...owner, extra: true }), {});
    const hold = deferred();
    const invalidate = vi.spyOn(app.client, 'invalidateQueries')
      .mockRejectedValueOnce(new Error('refresh'))
      .mockImplementation(() => hold.promise);
    let settled = false;
    const operation = app.read().create.mutation.mutateAsync({ variables }).finally(() => { settled = true; });
    await waitFor(() => expect(invalidate.mock.calls.length).toBeGreaterThan(1));
    expect(settled).toBe(false);
    hold.resolve();
    await expect(operation).resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
  });
});
