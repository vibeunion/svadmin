import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient, QueryObserver } from '@tanstack/svelte-query';
import { defineResource, keys, parseQueryKey, resetContext, setAdminOptions, setAuditHandler, DeleteManyPartialError, captureAuthSession,
  type DataProvider, type GetManyResult, type GetOneResult, type GetListResult, type ResourceDefinition, type ResourceContract, type AuthProvider,
  type AuthActionResult, type AuditLogProvider, type LiveProvider } from '@svadmin/core';
import { flushSync } from 'svelte';
import { resetLogoutVersion } from '../../../core/src/auth-hooks.svelte';
import { resetToast } from '@svadmin/core/toast';
import { definedOptions } from '@svadmin/core/options';
import { contractKey } from '../../../core/src/resource-contract';
import * as legacy from '../../../core/src/hooks.svelte';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DeleteManyState, DeleteManyAuthActions } from './delete-many-contract.test.types';
import Host from './delete-many-contract.test-host.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String() });
const posts = defineResource('posts', { record });
const other = defineResource('other', { record });
const definitions: ResourceDefinition[] = [
  { name: 'posts', label: 'Posts', fields: [], contract: posts },
  { name: 'other', label: 'Other', fields: [], contract: other },
];
const rows: [{ id: number; title: string }, { id: number; title: string }] =
  [{ id: 1, title: 'First' }, { id: 2, title: 'Second' }];
const clients: QueryClient[] = [];
function provider(): DataProvider {
  return {
    getApiUrl: () => '/api', getList: vi.fn(async () => ({ data: rows, total: rows.length })),
    getOne: async ({ id }) => ({ data: { id, title: 'First' } }),
    create: async () => ({ data: {} }), update: async () => ({ data: {} }),
    deleteMany: vi.fn<NonNullable<DataProvider['deleteMany']>>(async ({ ids }) => ({ data: ids.map(id => ({ id, title: 'Deleted' })) })),
    deleteOne: vi.fn(async ({ id }) => ({ data: { id, title: 'Deleted' } })),
  };
}
function nativeDelete(source: DataProvider) {
  if (!source.deleteMany) throw new Error('Expected a native batch provider');
  return vi.mocked(source.deleteMany);
}
function deferred<T>() {
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
  let state: DeleteManyState | undefined;
  let actions: DeleteManyAuthActions | undefined;
  const view = render(Host, { provider: source, resources: definitions, queryClient: client, onReady: value => { state = value; },
    ...definedOptions({
      auth: options.session,
      onAuthReady: options.session === undefined ? undefined : (value: DeleteManyAuthActions) => { actions = value; },
    }),
  });
  return { view, client, actions() {
    if (!actions) throw new Error('Expected mounted auth controls');
    return actions;
  }, read() {
    if (!state) throw new Error('Expected a batch delete hook');
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
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  resetLogoutVersion();
  resetToast();
  setAdminOptions({ mutationMode: 'pessimistic' });
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

describe.each(['native', 'fallback'] as const)('%s batch-delete auth ownership', mode => {
  it.each(['login', 'logout'] as const)('retires queued deletion on %s without inventing attempts', async action => {
    const source = provider();
    if (mode === 'fallback') delete source.deleteMany;
    const app = await mountSession(source);
    const callback = vi.fn();
    const operation = app.read().remove.mutation.mutateAsync({ ids: [1, 2] }, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    if (action === 'login') await app.actions().login.mutate({});
    else await app.actions().logout.mutate();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: false, requestedIds: [1, 2], attemptedIds: [], failedIds: [], unattemptedIds: [1, 2],
    } });
    expect(error).not.toHaveProperty('details.succeededIds');
    expect(callback).not.toHaveBeenCalled();
    expect(source.deleteOne).not.toHaveBeenCalled();
    if (source.deleteMany) expect(source.deleteMany).not.toHaveBeenCalled();
  });

  it('rechecks dispatch after native mutation callbacks delay the queue', async () => {
    const source = provider();
    if (mode === 'fallback') delete source.deleteMany;
    const app = await mountSession(source);
    const gate = deferred<void>();
    const observer = vi.fn(() => gate.promise);
    app.client.getMutationCache().config.onMutate = observer;
    const operation = app.read().remove.mutation.mutateAsync({ ids: [1, 2] }).catch((error: unknown) => error);
    await waitFor(() => expect(observer).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    gate.resolve();
    expect(await operation).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: false, attemptedIds: [], unattemptedIds: [1, 2],
    } });
    expect(source.deleteOne).not.toHaveBeenCalled();
    if (source.deleteMany) expect(source.deleteMany).not.toHaveBeenCalled();
  });

  it('blocks unavailable sessions while a saved method supports fresh calls after recovery', async () => {
    const source = provider();
    if (mode === 'fallback') delete source.deleteMany;
    const app = await mountSession(source);
    const saved = app.read().remove.mutation.mutateAsync;
    await app.actions().logout.mutate();
    await expect(saved({ ids: [1, 2] })).rejects.toMatchObject({ code: 'DELETE_MANY_CANCELLED' });
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    const login = app.actions().login.mutate({});
    await expect(saved({ ids: [1, 2] })).rejects.toMatchObject({ code: 'DELETE_MANY_CANCELLED' });
    expect(source.deleteOne).not.toHaveBeenCalled();
    if (source.deleteMany) expect(source.deleteMany).not.toHaveBeenCalled();
    gate.resolve({ success: true });
    await login;
    await expect(saved({ ids: [1, 2] })).resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
  });

  it.each(['login', 'logout', 'check', 'provider'] as const)('withholds dispatched receipts when %s retires the session', async change => {
    const source = provider();
    const gate = deferred<void>();
    source.deleteMany = vi.fn(async () => { await gate.promise; return { data: rows }; });
    source.deleteOne = vi.fn(async () => { await gate.promise; return { data: rows[0] }; });
    if (mode === 'fallback') delete source.deleteMany;
    const app = await mountSession(source);
    const effects = await observeEffects(app);
    const callback = vi.fn();
    const operation = app.read().remove.mutation.mutateAsync({ ids: [1, 2] }, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    await waitFor(() => expect(mode === 'native' ? source.deleteMany : source.deleteOne).toHaveBeenCalledTimes(1));
    if (change === 'login') await app.actions().login.mutate({});
    else if (change === 'logout') await app.actions().logout.mutate();
    else if (change === 'check') await app.actions().check.refetch();
    else await app.view.rerender({ auth: auth() });
    const invalidate = vi.spyOn(app.client, 'invalidateQueries');
    const remove = vi.spyOn(app.client, 'removeQueries');
    gate.resolve();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: true, requestedIds: [1, 2], attemptedIds: mode === 'native' ? [1, 2] : [1],
      failedIds: [], unattemptedIds: mode === 'native' ? [] : [2],
    } });
    expect(error).not.toHaveProperty('details.succeededIds');
    expect(error).not.toHaveProperty('data');
    expect(error).not.toBeInstanceOf(DeleteManyPartialError);
    expect(callback).not.toHaveBeenCalled();
    expect(effects.auditHandler).not.toHaveBeenCalled();
    expect(effects.audit.create).not.toHaveBeenCalled();
    expect(effects.live.publish).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(mode === 'native' ? source.deleteMany : source.deleteOne).toHaveBeenCalledTimes(1);
    expect(app.read().remove.mutation.isIdle).toBe(true);
  });
});

describe('batch-delete progress and completion', () => {
  it.each(['success', 'failure'] as const)('stops remaining deletions after a late %s without exposing earlier results', async outcome => {
    const source = provider();
    delete source.deleteMany;
    const gate = deferred<GetOneResult>();
    vi.mocked(source.deleteOne).mockResolvedValueOnce({ data: rows[0] }).mockReturnValueOnce(gate.promise);
    const app = await mountSession(source);
    const effects = await observeEffects(app);
    const handler = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    app.session.onError = handler;
    const { builder, owner } = scopedKeys(app, posts, captureAuthSession(app.session).cacheKey);
    const oldKey = builder.data.one('posts', 1, { ...owner, fixture: true });
    app.client.setQueryData(oldKey, { data: rows[0] });
    const operation = app.read().remove.mutation.mutateAsync({ ids: [1, 2, 3] }).catch((error: unknown) => error);
    await waitFor(() => expect(source.deleteOne).toHaveBeenCalledTimes(2));
    await app.actions().login.mutate({});
    const freshKey = builder.data.one('posts', 1, { ...owner, authSession: captureAuthSession(app.session).cacheKey, fixture: true });
    app.client.setQueryData(freshKey, { data: { ...rows[0], title: 'New' } });
    const refresh = vi.spyOn(app.client, 'invalidateQueries');
    const remove = vi.spyOn(app.client, 'removeQueries');
    if (outcome === 'success') gate.resolve({ data: rows[1] });
    else gate.reject({ statusCode: 401, message: 'PRIVATE' });
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: true, requestedIds: [1, 2, 3], attemptedIds: [1, 2], failedIds: [], unattemptedIds: [3],
    } });
    expect(error).not.toHaveProperty('details.succeededIds');
    expect(error).not.toHaveProperty('succeededIds');
    expect(JSON.stringify(error)).not.toContain('First');
    expect(source.deleteOne).toHaveBeenCalledTimes(2);
    expect(handler).not.toHaveBeenCalled();
    expect(app.session.logout).not.toHaveBeenCalled();
    expect(effects.auditHandler).not.toHaveBeenCalled();
    expect(effects.live.publish).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(app.client.getQueryData(oldKey)).toEqual({ data: rows[0] });
    expect(app.client.getQueryData(freshKey)).toEqual({ data: { ...rows[0], title: 'New' } });
  });

  it('retains failed IDs without declaring an obsolete in-flight result a failure', async () => {
    const source = provider();
    delete source.deleteMany;
    const gate = deferred<GetOneResult>();
    vi.mocked(source.deleteOne).mockRejectedValueOnce(new Error('PRIVATE')).mockReturnValueOnce(gate.promise);
    const app = await mountSession(source);
    const operation = app.read().remove.mutation.mutateAsync({ ids: [1, 2, 3] }).catch((error: unknown) => error);
    await waitFor(() => expect(source.deleteOne).toHaveBeenCalledTimes(2));
    await app.actions().login.mutate({});
    gate.reject(new Error('PRIVATE old result'));
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: {
      attemptedIds: [1, 2], failedIds: [1], unattemptedIds: [3],
    } });
    expect(error).not.toHaveProperty('causes');
    expect(JSON.stringify(error)).not.toContain('PRIVATE');
    expect(source.deleteOne).toHaveBeenCalledTimes(2);
  });

  it('does not coalesce a new-session deletion with an old unresolved batch for the same IDs', async () => {
    const app = await mountSession();
    const gate = deferred<GetManyResult>();
    const currentRows = rows.map(row => ({ ...row, title: 'Latest' }));
    nativeDelete(app.source).mockReturnValueOnce(gate.promise).mockResolvedValueOnce({ data: currentRows });
    const saved = app.read().remove.mutation.mutateAsync;
    const old = saved({ ids: [1, 2] }).catch((error: unknown) => error);
    await waitFor(() => expect(app.source.deleteMany).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await expect(saved({ ids: [1, 2] })).resolves.toEqual({ data: currentRows });
    gate.resolve({ data: rows });
    expect(await old).toMatchObject({ code: 'DELETE_MANY_CANCELLED' });
    expect(app.source.deleteMany).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(app.read().remove.mutation.isSuccess).toBe(true));
    expect(app.read().remove.mutation.data).toEqual({ data: currentRows });
  });

  it('ignores late native auth failures without removing caches or logging out the newer session', async () => {
    const app = await mountSession();
    const effects = await observeEffects(app);
    const handler = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    app.session.onError = handler;
    const gate = deferred<GetManyResult>();
    nativeDelete(app.source).mockReturnValueOnce(gate.promise);
    const callback = vi.fn();
    const operation = app.read().remove.mutation.mutateAsync({ ids: [1, 2] }, { onError: callback, onSettled: callback })
      .catch((error: unknown) => error);
    await waitFor(() => expect(app.source.deleteMany).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    const refresh = vi.spyOn(app.client, 'invalidateQueries');
    const remove = vi.spyOn(app.client, 'removeQueries');
    gate.reject({ statusCode: 401, message: 'PRIVATE' });
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: {
      attemptedIds: [1, 2], failedIds: [], unattemptedIds: [], writeMayHaveSucceeded: true,
    } });
    expect(error).not.toHaveProperty('details.succeededIds');
    expect(handler).not.toHaveBeenCalled();
    expect(app.session.logout).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it.each(['success', 'partial', 'failure', 'preflight', 'pending'] as const)('immediately hides %s state when login starts', async outcome => {
    const source = provider();
    const gate = deferred<GetManyResult>();
    if (outcome === 'partial') {
      delete source.deleteMany;
      vi.mocked(source.deleteOne).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce(new Error('PRIVATE'));
    } else if (outcome === 'failure') nativeDelete(source).mockRejectedValueOnce(new Error('PRIVATE'));
    else if (outcome === 'pending') nativeDelete(source).mockReturnValueOnce(gate.promise);
    const app = await mountSession(source);
    const operation = app.read().remove.mutation.mutateAsync({ ids: outcome === 'preflight' ? [] : [1, 2] })
      .catch((error: unknown) => error);
    if (outcome !== 'pending') await operation;
    await waitFor(() => expect(app.read().remove.mutation.status).toBe(
      outcome === 'pending' ? 'pending' : outcome === 'success' ? 'success' : 'error',
    ));
    const state = app.read().remove.mutation;
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

  it('retires invalid-input observers before queued delivery', async () => {
    const app = await mountSession();
    const callback = vi.fn();
    const operation = app.read().remove.mutation.mutateAsync({ ids: [] }, { onError: callback, onSettled: callback })
      .catch((error: unknown) => error);
    await app.actions().login.mutate({});
    expect(await operation).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(callback).not.toHaveBeenCalled();
    expect(app.source.deleteMany).not.toHaveBeenCalled();
  });

  it.each(['success', 'partial', 'cancelled', 'preflight'] as const)('withholds old %s data after delayed native completion', async outcome => {
    const source = provider();
    const receipt = deferred<GetManyResult>();
    if (outcome === 'partial') {
      delete source.deleteMany;
      vi.mocked(source.deleteOne).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce(new Error('PRIVATE'));
    } else nativeDelete(source).mockReturnValueOnce(receipt.promise);
    const app = await mountSession(source);
    const gate = deferred<void>();
    const observer = vi.fn(() => gate.promise);
    if (outcome === 'success') app.client.getMutationCache().config.onSuccess = observer;
    else app.client.getMutationCache().config.onError = observer;
    const operation = app.read().remove.mutation.mutateAsync({ ids: outcome === 'preflight' ? [] : [1, 2] })
      .catch((error: unknown) => error);
    if (outcome === 'success' || outcome === 'cancelled') {
      await waitFor(() => expect(source.deleteMany).toHaveBeenCalledTimes(1));
      if (outcome === 'cancelled') await app.view.rerender({ tenant: 'second' });
      receipt.resolve({ data: rows });
    }
    await waitFor(() => expect(observer).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    gate.resolve();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: outcome !== 'preflight', attemptedIds: outcome === 'preflight' ? [] : [1, 2],
    } });
    expect(error).not.toHaveProperty('succeededIds');
    expect(error).not.toHaveProperty('details.succeededIds');
    expect(error).not.toHaveProperty('causes');
    expect(error).not.toHaveProperty('data');
    expect(app.read().remove.mutation.isIdle).toBe(true);
  });

  it.each(['audit', 'audit-provider', 'live', 'remove', 'refresh', 'notification', 'onSuccess', 'onSettled'] as const)(
    'stops later effects when %s starts another login', async stage => {
      const app = await mountSession();
      const effects = await observeEffects(app);
      const { builder, owner } = scopedKeys(app, posts, captureAuthSession(app.session).cacheKey);
      const collection = builder.data.select('posts', owner);
      const firstDetail = builder.data.one('posts', 1, { ...owner, fixture: 1 });
      const laterDetails = [builder.data.one('posts', 1, { ...owner, fixture: 2 }), builder.data.one('posts', 2, owner)];
      for (const key of [collection, firstDetail, ...laterDetails]) app.client.setQueryData(key, {});
      const firstQuery = app.client.getQueryCache().find({ queryKey: firstDetail, exact: true });
      if (!firstQuery) throw new Error('Expected the first confirmed detail');
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
        if (stage === 'remove' && event.type === 'removed' && event.query === firstQuery) start();
        if (stage === 'refresh' && event.type === 'updated' && event.action.type === 'invalidate') start();
      });
      const onSuccess = vi.fn(() => { if (stage === 'onSuccess') start(); });
      const onSettled = vi.fn(() => { if (stage === 'onSettled') start(); });
      const invalidate = vi.spyOn(app.client, 'invalidateQueries');
      const remove = vi.spyOn(app.client, 'removeQueries');
      const error: unknown = await app.read().remove.mutation.mutateAsync({ ids: [1, 2] }, { onSuccess, onSettled })
        .catch((error: unknown) => error);
      expect(login).toBeDefined();
      expect(error).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: { writeMayHaveSucceeded: true, attemptedIds: [1, 2] } });
      expect(error).not.toHaveProperty('details.succeededIds');
      if (stage === 'audit' || stage === 'audit-provider') {
        expect(effects.auditHandler).toHaveBeenCalledTimes(1);
        expect(effects.audit.create).toHaveBeenCalledTimes(stage === 'audit' ? 0 : 1);
        expect(effects.live.publish).not.toHaveBeenCalled();
      }
      if (stage === 'audit' || stage === 'audit-provider' || stage === 'live') expect(remove).not.toHaveBeenCalled();
      if (stage === 'audit' || stage === 'audit-provider' || stage === 'live' || stage === 'remove') expect(invalidate).not.toHaveBeenCalled();
      if (stage === 'remove') {
        expect(remove).toHaveBeenCalledTimes(1);
        expect(app.client.getQueryState(firstDetail)).toBeUndefined();
        for (const key of laterDetails) expect(app.client.getQueryData(key)).toEqual({});
      }
      if (stage === 'refresh') {
        expect(invalidate).toHaveBeenCalledTimes(1);
        expect(app.client.getQueryState(collection)?.isInvalidated).toBe(false);
      }
      if (stage !== 'onSuccess' && stage !== 'onSettled') expect(onSuccess).not.toHaveBeenCalled();
      if (stage !== 'onSettled') expect(onSettled).not.toHaveBeenCalled();
      release();
      gate.resolve({ success: true });
      await login;
    });

  it('stops remaining uncertain-detail refreshes after reentrant login without undoing confirmed removal', async () => {
    const source = provider();
    delete source.deleteMany;
    vi.mocked(source.deleteOne).mockResolvedValueOnce({ data: rows[0] })
      .mockRejectedValueOnce(new Error('PRIVATE')).mockRejectedValueOnce(new Error('PRIVATE'));
    const app = await mountSession(source);
    const { builder, owner } = scopedKeys(app, posts, captureAuthSession(app.session).cacheKey);
    const confirmed = builder.data.one('posts', 1, owner);
    const failed = builder.data.one('posts', 2, owner);
    const later = builder.data.one('posts', 3, owner);
    for (const key of [confirmed, failed, later]) app.client.setQueryData(key, {});
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    let login: Promise<AuthActionResult> | undefined;
    const release = app.client.getQueryCache().subscribe(event => {
      if (event.type === 'updated' && event.action.type === 'invalidate' && parseQueryKey(event.query.queryKey)?.id === 2) {
        login ??= app.actions().login.mutate({});
      }
    });
    const error: unknown = await app.read().remove.mutation.mutateAsync({ ids: [1, 2, 3] }).catch((error: unknown) => error);
    expect(error).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: { attemptedIds: [1, 2, 3], failedIds: [2, 3] } });
    expect(login).toBeDefined();
    expect(app.client.getQueryState(confirmed)).toBeUndefined();
    expect(app.client.getQueryData(failed)).toEqual({});
    expect(app.client.getQueryState(later)?.isInvalidated).toBe(false);
    release();
    gate.resolve({ success: true });
    await login;
  });

  it.each(['preflight', 'partial', 'joined-partial', 'joined-success'] as const)('rechecks every observer and caller during reentrant %s delivery', async kind => {
    const source = provider();
    if (kind === 'partial' || kind === 'joined-partial') {
      delete source.deleteMany;
      vi.mocked(source.deleteOne).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce(new Error('PRIVATE'));
    }
    const app = await mountSession(source);
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    let login: Promise<AuthActionResult> | undefined;
    const observer = vi.fn(() => { login = app.actions().login.mutate({}); });
    const onSettled = vi.fn();
    const input = { ids: kind === 'preflight' ? [] : [1, 2] };
    const joined = kind === 'joined-partial' || kind === 'joined-success';
    const first = app.read().remove.mutation.mutateAsync(input, joined ? {} : { onError: observer, onSettled })
      .catch((error: unknown) => error);
    const second = joined ? app.read().remove.mutation.mutateAsync(input,
      kind === 'joined-success' ? { onSuccess: observer, onSettled } : { onError: observer, onSettled },
    ).catch((error: unknown) => error) : first;
    await first;
    const error: unknown = await second;
    expect(observer).toHaveBeenCalledTimes(1);
    expect(onSettled).not.toHaveBeenCalled();
    expect(error).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: { writeMayHaveSucceeded: kind !== 'preflight' } });
    expect(error).not.toHaveProperty('succeededIds');
    expect(error).not.toHaveProperty('details.succeededIds');
    expect(app.read().remove.mutation.isIdle).toBe(true);
    gate.resolve({ success: true });
    await login;
  });

  it.each(['success', 'partial', 'failure'] as const)('delivers detached %s to each coalesced caller and observer', async outcome => {
    const source = provider();
    const gate = deferred<void>();
    source.deleteMany = vi.fn(async () => {
      await gate.promise;
      if (outcome === 'failure') throw new Error('PRIVATE');
      return { data: rows };
    });
    if (outcome === 'partial') {
      delete source.deleteMany;
      source.deleteOne = vi.fn(async ({ id }) => {
        await gate.promise;
        if (id === 2) throw new Error('PRIVATE');
        return { data: rows[0] };
      });
    }
    const app = await mountSession(source);
    const success = vi.fn((result: { data: Record<string, unknown>[] }) => {
      if (result.data[0]) result.data[0]['title'] = 'Changed';
    });
    const error = vi.fn((cause: Error) => {
      cause.message = 'Changed';
      if (cause instanceof DeleteManyPartialError) cause.failedIds.push(99);
    });
    const settled = vi.fn();
    const callbacks = { onSuccess: success, onError: error, onSettled: settled };
    const first = app.read().remove.mutation.mutateAsync({ ids: [1, 2] }, callbacks).catch((error: unknown) => error);
    const second = app.read().remove.mutation.mutateAsync({ ids: [1, 2] }, callbacks).catch((error: unknown) => error);
    gate.resolve();
    const [left, right] = await Promise.all([first, second]);
    expect(left).toEqual(right);
    expect(left).not.toBe(right);
    expect(settled).toHaveBeenCalledTimes(2);
    if (outcome === 'success') {
      expect(success).toHaveBeenCalledTimes(2);
      expect(left).toEqual({ data: rows });
      expect(error).not.toHaveBeenCalled();
      expect(settled).toHaveBeenNthCalledWith(2, { data: rows }, null);
    } else {
      expect(error).toHaveBeenCalledTimes(2);
      expect(success).not.toHaveBeenCalled();
      expect(JSON.stringify(left)).not.toContain('Changed');
      if (outcome === 'partial') expect(left).toMatchObject({ succeededIds: [1], failedIds: [2] });
      else expect(left).toMatchObject({ code: 'DELETE_MANY_FAILED' });
    }
    expect(outcome === 'partial' ? source.deleteOne : source.deleteMany).toHaveBeenCalledTimes(outcome === 'partial' ? 2 : 1);
  });

  it('awaits every started collection and uncertain-detail refresh after failure and session retirement', async () => {
    const source = provider();
    nativeDelete(source).mockRejectedValueOnce(new Error('PRIVATE'));
    const app = await mountSession(source);
    const { builder, owner } = scopedKeys(app, posts, captureAuthSession(app.session).cacheKey);
    app.client.setQueryData(builder.data.select('posts', owner), {});
    app.client.setQueryData(builder.data.one('posts', 1, owner), {});
    const collectionGate = deferred<void>();
    const detailGate = deferred<void>();
    const refresh = vi.spyOn(app.client, 'invalidateQueries').mockRejectedValueOnce(new Error('PRIVATE'))
      .mockReturnValueOnce(collectionGate.promise).mockReturnValue(detailGate.promise);
    let settled = false;
    const operation = app.read().remove.mutation.mutateAsync({ ids: [1, 2] }).catch((error: unknown) => error)
      .finally(() => { settled = true; });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(3));
    await app.actions().login.mutate({});
    expect(settled).toBe(false);
    collectionGate.resolve();
    await collectionGate.promise;
    await Promise.resolve();
    expect(settled).toBe(false);
    detailGate.resolve();
    expect(await operation).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: { writeMayHaveSucceeded: true } });
  });

  it('contains removal exceptions without changing the provider write outcome', async () => {
    const app = await mountSession();
    const { builder, owner } = scopedKeys(app, posts, captureAuthSession(app.session).cacheKey);
    app.client.setQueryData(builder.data.one('posts', 1, owner), {});
    const remove = vi.spyOn(app.client, 'removeQueries').mockImplementation(() => { throw new Error('PRIVATE cache'); });
    const callback = vi.fn();
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1, 2] }, { onSuccess: callback }))
      .resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('isolates confirmed removal and refreshes across independent auth trees sharing one provider and client', async () => {
    const source = provider();
    const first = await mountSession(source);
    const second = await mountSession(source, auth(), first.client);
    const left = scopedKeys(first, posts, captureAuthSession(first.session).cacheKey);
    const right = scopedKeys(second, posts, captureAuthSession(second.session).cacheKey);
    expect(left.source).toBe(right.source);
    expect(left.owner.authSession).not.toBe(right.owner.authSession);
    const ownedList = left.builder.data.select('posts', left.owner);
    const ownedDetail = left.builder.data.one('posts', 1, left.owner);
    const foreign = [right.builder.data.select('posts', right.owner), right.builder.data.one('posts', 1, right.owner)];
    for (const key of [ownedList, ownedDetail, ...foreign]) first.client.setQueryData(key, {});
    await first.read().remove.mutation.mutateAsync({ ids: [1, 2] });
    expect(first.client.getQueryState(ownedList)?.isInvalidated).toBe(true);
    expect(first.client.getQueryState(ownedDetail)).toBeUndefined();
    for (const key of foreign) {
      expect(first.client.getQueryState(key)?.isInvalidated).toBe(false);
      expect(first.client.getQueryData(key)).toEqual({});
    }
    await first.actions().logout.mutate();
    await expect(second.read().remove.mutation.mutateAsync({ ids: [1, 2] })).resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
    expect(captureAuthSession(second.session).available).toBe(true);
  });

  it.each(['same', 'independent'] as const)('handles logout from another mounted %s auth tree during sequential deletion', async ownership => {
    const source = provider();
    delete source.deleteMany;
    const first = await mountSession(source);
    const second = await mountSession(source, ownership === 'same' ? first.session : auth(), first.client);
    const gate = deferred<GetOneResult>();
    vi.mocked(source.deleteOne).mockReturnValueOnce(gate.promise).mockResolvedValueOnce({ data: rows[1] });
    const operation = first.read().remove.mutation.mutateAsync({ ids: [1, 2] }).catch((error: unknown) => error);
    await waitFor(() => expect(source.deleteOne).toHaveBeenCalledTimes(1));
    await second.actions().logout.mutate();
    gate.resolve({ data: rows[0] });
    const result: unknown = await operation;
    if (ownership === 'same') {
      expect(result).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: { attemptedIds: [1], unattemptedIds: [2] } });
      expect(result).not.toHaveProperty('details.succeededIds');
      expect(source.deleteOne).toHaveBeenCalledTimes(1);
    } else {
      expect(result).toEqual({ data: rows });
      expect(source.deleteOne).toHaveBeenCalledTimes(2);
    }
  });

  it('delegates a later auth error even when all fallback deletions failed differently', async () => {
    const source = provider();
    delete source.deleteMany;
    vi.mocked(source.deleteOne).mockRejectedValueOnce(new Error('PRIVATE'))
      .mockRejectedValueOnce({ statusCode: 401, message: 'PRIVATE auth' });
    const app = await mountSession(source);
    const handler = vi.fn<NonNullable<AuthProvider['onError']>>(async error => {
      if (typeof error === 'object' && error !== null) Object.assign(error, { message: 'Changed' });
      return { logout: false };
    });
    app.session.onError = handler;
    const result: unknown = await app.read().remove.mutation.mutateAsync({ ids: [1, 2] }).catch((error: unknown) => error);
    expect(handler).toHaveBeenCalledTimes(1);
    const delivered = handler.mock.calls[0]?.[0];
    expect(delivered).toMatchObject({ statusCode: 401, message: 'Changed' });
    expect(delivered).not.toHaveProperty('failedIds');
    expect(delivered).not.toHaveProperty('causes');
    expect(result).toMatchObject({ code: 'DELETE_MANY_FAILED', message: 'Batch deletion failed' });
    expect(app.session.logout).not.toHaveBeenCalled();
  });

  it.each(['resolved', 'rejected'] as const)('lets the current partial-error delegate finish its own %s logout', async outcome => {
    const source = provider();
    delete source.deleteMany;
    vi.mocked(source.deleteOne).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce({ statusCode: 401, message: 'PRIVATE' });
    const app = await mountSession(source);
    app.session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    vi.mocked(app.session.logout).mockResolvedValueOnce({ success: outcome === 'resolved' });
    const error: unknown = await app.read().remove.mutation.mutateAsync({ ids: [1, 2] }).catch((error: unknown) => error);
    expect(error).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: true, attemptedIds: [1, 2], failedIds: [2],
    } });
    expect(error).not.toHaveProperty('succeededIds');
    expect(error).not.toHaveProperty('details.succeededIds');
    await waitFor(() => expect(app.session.logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(captureAuthSession(app.session).available).toBe(false));
    if (outcome === 'resolved') await waitFor(() => expect(app.go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
    else expect(app.go).not.toHaveBeenCalled();
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1, 2] })).rejects.toMatchObject({ code: 'DELETE_MANY_CANCELLED' });
    expect(source.deleteOne).toHaveBeenCalledTimes(2);
  });

  it.each(['unchanged', 'login', 'reset', 'new-call'] as const)('guards delayed auth instructions after %s', async change => {
    const app = await mountSession();
    const gate = deferred<{ logout: boolean; redirectTo: string }>();
    const handler = vi.fn(() => gate.promise);
    app.session.onError = handler;
    nativeDelete(app.source).mockRejectedValueOnce({ statusCode: 401 });
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1, 2] })).rejects.toMatchObject({ code: 'DELETE_MANY_FAILED' });
    await waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    if (change === 'login') await app.actions().login.mutate({});
    else if (change === 'reset') app.read().remove.mutation.reset();
    else if (change === 'new-call') await expect(app.read().remove.mutation.mutateAsync({ ids: [] })).rejects.toBeDefined();
    app.go.mockClear();
    gate.resolve({ logout: true, redirectTo: '/login' });
    if (change === 'unchanged') {
      await waitFor(() => expect(app.go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
      expect(app.session.logout).toHaveBeenCalledTimes(1);
    } else {
      await gate.promise;
      await Promise.resolve();
      expect(app.session.logout).not.toHaveBeenCalled();
      expect(app.go).not.toHaveBeenCalled();
    }
  });

  it.each(['unchanged', 'login', 'reset'] as const)('rechecks a delegate-owned logout already in flight after %s', async change => {
    const app = await mountSession();
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.logout).mockReturnValueOnce(gate.promise);
    app.session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    nativeDelete(app.source).mockRejectedValueOnce({ statusCode: 401 });
    const operation = app.read().remove.mutation.mutateAsync({ ids: [1, 2] }).catch((error: unknown) => error);
    await waitFor(() => expect(app.session.logout).toHaveBeenCalledTimes(1));
    expect(await operation).toMatchObject({ code: 'DELETE_MANY_CANCELLED' });
    expect(app.read().remove.mutation.isIdle).toBe(true);
    if (change === 'login') await app.actions().login.mutate({});
    else if (change === 'reset') app.read().remove.mutation.reset();
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
        // A late remote logout leaves the effective principal uncertain until checked again.
        await waitFor(() => expect(captureAuthSession(app.session).cacheKey).not.toBe(beforeCompletion));
        expect(captureAuthSession(app.session).available).toBe(false);
        await expect(app.read().remove.mutation.mutateAsync({ ids: [1, 2] })).rejects.toMatchObject({ code: 'DELETE_MANY_CANCELLED' });
        expect(app.source.deleteMany).toHaveBeenCalledTimes(1);
        await app.actions().check.refetch();
        expect(captureAuthSession(app.session).available).toBe(true);
        await expect(app.read().remove.mutation.mutateAsync({ ids: [1, 2] })).resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
        expect(remove).not.toHaveBeenCalled();
        expect(app.go).not.toHaveBeenCalled();
      }
    }
  });

  it.each([false, true])('handles confirmed old-source cleanup after provider replacement with auth recheck=%s', async withCheck => {
    const source = provider();
    const session = auth();
    const app = withCheck ? await mountSession(source, session) : mount(source);
    if (!withCheck) await app.view.rerender({ auth: session });
    await ready(app);
    const capability = captureAuthSession(session);
    const checks = vi.mocked(session.check).mock.calls.length;
    const gate = deferred<GetManyResult>();
    nativeDelete(source).mockReturnValueOnce(gate.promise);
    const { builder, owner } = scopedKeys(app, posts, capability.cacheKey);
    const oldList = builder.data.list('posts', { ...owner, fixture: true });
    const oldDetail = builder.data.one('posts', 1, owner);
    const untouchedDetail = builder.data.one('posts', 3, owner);
    for (const key of [oldList, oldDetail, untouchedDetail]) app.client.setQueryData(key, {});
    const callback = vi.fn();
    const operation = app.read().remove.mutation.mutateAsync({ ids: [1, 2] }, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    await waitFor(() => expect(source.deleteMany).toHaveBeenCalledTimes(1));
    const replacement = provider();
    await app.view.rerender({ provider: replacement });
    await ready(app);
    if (withCheck) await waitFor(() => expect(vi.mocked(session.check).mock.calls.length).toBeGreaterThan(checks));
    expect(capability.isCurrent()).toBe(!withCheck);
    const reads = vi.mocked(replacement.getList).mock.calls.length;
    gate.resolve({ data: rows });
    const result: unknown = await operation;
    expect(result).toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: {
      requestedIds: [1, 2], attemptedIds: [1, 2], failedIds: [], unattemptedIds: [], writeMayHaveSucceeded: true,
    } });
    if (withCheck) {
      expect(result).not.toHaveProperty('details.succeededIds');
      expect(app.client.getQueryData(oldDetail)).toEqual({});
    } else {
      expect(result).toHaveProperty('details.succeededIds', [1, 2]);
      expect(app.client.getQueryState(oldDetail)).toBeUndefined();
    }
    expect(app.client.getQueryState(oldList)?.isInvalidated).toBe(!withCheck);
    expect(app.client.getQueryState(untouchedDetail)?.isInvalidated).toBe(false);
    expect(replacement.getList).toHaveBeenCalledTimes(reads);
    expect(callback).not.toHaveBeenCalled();
  });

  it('preserves independently tagged caches when its partial-error delegate clears owned auth queries', async () => {
    const source = provider();
    delete source.deleteMany;
    const first = await mountSession(source);
    const second = await mountSession(source, auth(), first.client);
    const left = scopedKeys(first, posts, captureAuthSession(first.session).cacheKey);
    const right = scopedKeys(second, posts, captureAuthSession(second.session).cacheKey);
    const owned = left.builder.data.one('posts', 3, { ...left.owner, fixture: true });
    const foreign = right.builder.data.one('posts', 3, { ...right.owner, fixture: true });
    first.client.setQueryData(owned, {});
    first.client.setQueryData(foreign, {});
    first.session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    vi.mocked(source.deleteOne).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce({ statusCode: 401 });
    await expect(first.read().remove.mutation.mutateAsync({ ids: [1, 2] })).rejects.toMatchObject({ code: 'DELETE_MANY_CANCELLED' });
    await waitFor(() => expect(first.go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
    expect(first.client.getQueryState(owned)).toBeUndefined();
    expect(first.client.getQueryData(foreign)).toEqual({});
    expect(first.client.getQueryState(foreign)?.isInvalidated).toBe(false);
    expect(captureAuthSession(second.session).available).toBe(true);
  });
});

describe('contract-bound batch delete', () => {
  it('strictly compiles the boundary, hook and positive/negative fixtures', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ['../../../core/src/delete-many-contract.ts', '../../../core/src/delete-many-hooks.svelte.ts',
      '../../../core/src/auth-hooks.svelte.ts', '../../../core/src/query-invalidation.ts', '../../../core/src/query-session.svelte.ts',
      '../../../core/src/hooks.svelte.ts', '../../../../scripts/fixtures/core-resource-types/unregistered.ts',
      '../../../core/src/strict-hooks.svelte.ts', 'delete-many-contract.test.svelte.ts',
      'delete-many-contract.test.types.ts', 'delete-many-contract.test.type-fixture.ts',
    ].map(file => resolve(directory, file));
    const virtual = new Map(['delete-many-contract.test-probe.svelte', 'delete-many-contract.test-host.svelte'].map(file => {
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

  it('does not delegate public batches to legacy broad cache mutations', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const hooks = readFileSync(resolve(directory, '../../../core/src/strict-hooks.svelte.ts'), 'utf8');
    expect(hooks).not.toContain('bulk.createDeleteManyMutation');
    expect('useDeleteMany' in legacy).toBe(false);
    expect('createDeleteManyMutation' in legacy).toBe(false);
  });

  it.each([[], [1, 1], ['1'], [NaN], [Infinity]].map(ids => ({ ids })))('preflights the complete identity list %j', async input => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    await expect(app.read().remove.mutation.mutateAsync(input)).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.deleteMany).not.toHaveBeenCalled();
    expect(source.deleteOne).not.toHaveBeenCalled();
  });

  it('rejects unknown envelope keys and getters before executing transport methods', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    const getter = vi.fn(() => [1]);
    await expect(app.read().remove.mutation.mutateAsync(Object.defineProperty({ ids: [1] }, 'ids', { get: getter }))).rejects.toBeDefined();
    await expect(app.read().remove.mutation.mutateAsync(Object.assign({ ids: [1] }, { resource: 'other' }))).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(getter).not.toHaveBeenCalled();
    expect(source.deleteMany).not.toHaveBeenCalled();
  });

  it('captures IDs, metadata and provider receiver before queued mutation work', async () => {
    const source = provider();
    source.deleteMany = vi.fn<NonNullable<DataProvider['deleteMany']>>(async function(this: DataProvider, { ids }) {
      expect(this).toBe(source);
      return { data: ids.map(id => ({ id, title: 'Deleted' })) };
    });
    const app = mount(source);
    await ready(app);
    const params = { ids: [1, 2], meta: { region: 'original' } };
    const operation = app.read().remove.mutation.mutateAsync(params);
    params.ids[0] = 99;
    params.meta.region = 'changed';
    source.deleteMany = vi.fn(async () => ({ data: [] }));
    expect(await operation).toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
    expect(source.deleteMany).not.toHaveBeenCalled();
  });

  it('requires delete variables and keeps the validated payload detached', async () => {
    const source = provider();
    const app = mount(source);
    const protectedPosts = defineResource('posts', { record, delete: Type.Object({ reason: Type.String({ minLength: 1 }) }) });
    await app.view.rerender({ resources: [{ name: 'posts', label: 'Posts', fields: [], contract: protectedPosts }] });
    await ready(app);
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1] })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    const input = { ids: [1], variables: { reason: 'Requested' } };
    const operation = app.read().remove.mutation.mutateAsync(input);
    input.variables.reason = 'Changed';
    await operation;
    expect(source.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ variables: { reason: 'Requested' } }));
  });

  it.each([
    [], [rows[0]], [rows[0], rows[0]], [{ id: 1, title: false }, rows[1]],
    [{ id: '1', title: 'Wrong type' }, rows[1]], [{ id: 99, title: 'Wrong ID' }, rows[1]],
    [...rows, { id: 3, title: 'Extra' }],
  ].map(data => ({ data })))('rejects malformed batch receipts %j', async receipt => {
    const source = provider();
    source.deleteMany = vi.fn(async () => receipt);
    const app = mount(source);
    await ready(app);
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1, 2] })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
    });
    expect(source.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('accepts reordered checked batch receipts without requiring provider order', async () => {
    const source = provider();
    source.deleteMany = vi.fn(async () => ({ data: [...rows].reverse() }));
    const app = mount(source);
    await ready(app);
    expect((await app.read().remove.mutation.mutateAsync({ ids: [1, 2] })).data.map(row => row['id'])).toEqual([2, 1]);
  });

  it('checks every fallback receipt and reports only proven partial success', async () => {
    const source = provider();
    delete source.deleteMany;
    source.deleteOne = vi.fn(async ({ id }) => ({ data: { id: id === 2 ? 99 : id, title: 'Deleted' } }));
    const app = mount(source);
    await ready(app);
    let rejected: unknown;
    try { await app.read().remove.mutation.mutateAsync({ ids: [1, 2] }); }
    catch (cause) { rejected = cause; }
    expect(rejected).toBeInstanceOf(DeleteManyPartialError);
    expect(rejected).toMatchObject({ succeededIds: [1], failedIds: [2], causes: [{ code: 'INVALID_PROVIDER_RESPONSE' }] });
    expect(source.deleteOne).toHaveBeenCalledTimes(2);
  });

  it('does not retry total transport failure or expose provider messages', async () => {
    const source = provider();
    source.deleteMany = vi.fn(async () => { throw new Error('PRIVATE_PROVIDER_MESSAGE'); });
    const app = mount(source);
    await ready(app);
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1] })).rejects.toMatchObject({
      code: 'DELETE_MANY_FAILED', message: 'Batch deletion failed',
    });
    expect(source.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('coalesces identical active batches and rejects conflicting ones without disturbing pending state', async () => {
    const source = provider();
    const gate = deferred<GetManyResult>();
    source.deleteMany = vi.fn(() => gate.promise);
    const app = mount(source);
    await ready(app);
    const operation = app.read().remove.mutation.mutateAsync({ ids: [1, 2] });
    const joined = app.read().remove.mutation.mutateAsync({ ids: [1, 2] });
    await expect(app.read().remove.mutation.mutateAsync({ ids: [2] })).rejects.toMatchObject({ code: 'DELETE_MANY_BUSY' });
    await expect(app.read().remove.mutation.mutateAsync({ ids: [] })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    await waitFor(() => expect(app.read().remove.mutation.isPending).toBe(true));
    gate.resolve({ data: rows });
    const result = await operation;
    if (result.data[0]) result.data[0]['title'] = 'Changed';
    expect((await joined).data[0]?.['title']).toBe('First');
    expect(source.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('invalidates only the captured source families and removes only checked deleted details', async () => {
    const app = mount();
    await ready(app);
    const { builder, source, scope, owner } = scopedKeys(app);
    const selected = [builder.data.list('posts', { ...owner, extra: true }), builder.data.infiniteList('posts', owner),
      builder.data.select('posts', owner), builder.data.selectDefaults('posts', owner), builder.data.many('posts', { ...owner, ids: [1] })];
    const detail = builder.data.one('posts', 1, owner);
    const excluded = [builder.data.one('posts', 99, owner), builder.data.list('posts'),
      builder.data.list('posts', { source }), builder.data.list('posts', { ...owner, authSession: 'foreign' }),
      builder.data.one('posts', 1, { source }), builder.data.one('posts', 1, { ...owner, authSession: 'foreign' }),
      builder.data.list('posts', { ...owner, source: 'other' }), builder.data.list('other', owner),
      keys({ ...scope, contract: contractKey(other) }).data.list('posts', owner),
      keys({ ...scope, tenant: 'other' }).data.list('posts', owner),
      keys({ ...scope, provider: 'other' }).data.list('posts', owner)];
    for (const key of [...selected, ...excluded, detail]) app.client.setQueryData(key, { fixture: true });
    await app.read().remove.mutation.mutateAsync({ ids: [1, 2] });
    expect(app.client.getQueryState(detail)).toBeUndefined();
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of excluded) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it('refreshes requested identities after an invalid native receipt without removing unrelated details', async () => {
    const source = provider();
    source.deleteMany = vi.fn(async () => ({ data: [{ id: 99, title: 'Wrong' }] }));
    const app = mount(source);
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const target = builder.data.one('posts', 1, owner);
    const foreign = builder.data.one('posts', 99, owner);
    app.client.setQueryData(target, { data: rows[0] });
    app.client.setQueryData(foreign, { data: { id: 99 } });
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1] })).rejects.toBeDefined();
    expect(app.client.getQueryState(target)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(foreign)?.isInvalidated).toBe(false);
  });

  it('waits for slow refreshes even when another refresh fails early', async () => {
    const app = mount();
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const failed = deferred<GetListResult>();
    const slow = deferred<GetListResult>();
    const first = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { ...owner, filter: 'failed' }),
      initialData: { data: rows, total: 2 }, queryFn: () => failed.promise, staleTime: Infinity });
    const second = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { ...owner, filter: 'slow' }),
      initialData: { data: rows, total: 2 }, queryFn: () => slow.promise, staleTime: Infinity });
    const offFirst = first.subscribe(() => {});
    const offSecond = second.subscribe(() => {});
    const success = vi.fn();
    try {
      const operation = app.read().remove.mutation.mutateAsync({ ids: [1] }, { onSuccess: success });
      await waitFor(() => expect(first.getCurrentResult().isFetching).toBe(true));
      failed.reject(new Error('Refresh failed'));
      await waitFor(() => expect(first.getCurrentResult().isError).toBe(true));
      expect(app.read().remove.mutation.isPending).toBe(true);
      expect(success).not.toHaveBeenCalled();
      slow.resolve({ data: [], total: 0 });
      await operation;
      expect(success).toHaveBeenCalledTimes(1);
    } finally { offFirst(); offSecond(); }
  });

  it('keeps failures pending until refreshes settle and isolates error callbacks', async () => {
    const source = provider();
    source.deleteMany = vi.fn(async () => { throw new Error('PRIVATE'); });
    const app = mount(source);
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const slow = deferred<GetListResult>();
    const observer = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { ...owner, filter: 'slow' }),
      initialData: { data: rows, total: 2 }, queryFn: () => slow.promise, staleTime: Infinity });
    const off = observer.subscribe(() => {});
    const error = vi.fn(async () => { throw new Error('Observer failed'); });
    const settled = vi.fn();
    try {
      const operation = app.read().remove.mutation.mutateAsync({ ids: [1] }, { onError: error, onSettled: settled })
        .catch((cause: unknown) => cause);
      await waitFor(() => expect(observer.getCurrentResult().isFetching).toBe(true));
      expect(app.read().remove.mutation.isPending).toBe(true);
      expect(error).not.toHaveBeenCalled();
      slow.resolve({ data: rows, total: 2 });
      expect(await operation).toMatchObject({ code: 'DELETE_MANY_FAILED' });
      expect(error).toHaveBeenCalledTimes(1);
      expect(settled).toHaveBeenCalledTimes(1);
    } finally { off(); }
  });

  it('does not inherit unsafe mutation observers or retries from client defaults', async () => {
    const source = provider();
    const app = mount(source);
    const inherited = vi.fn(() => { throw new Error('Unsafe default observer'); });
    app.client.setDefaultOptions({ mutations: { retry: 3, onMutate: inherited, onSuccess: inherited, onSettled: inherited } });
    await ready(app);
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1] })).resolves.toMatchObject({ data: [{ id: 1 }] });
    expect(inherited).not.toHaveBeenCalled();
    expect(source.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('suppresses a late auth-error redirect after switching resource', async () => {
    const source = provider();
    source.deleteMany = vi.fn(async () => { throw { statusCode: 401 }; });
    const gate = deferred<{ redirectTo: string }>();
    const authProvider = { ...auth(), onError: vi.fn(() => gate.promise) };
    const router = { go: vi.fn(), back: () => {}, parse: () => ({ pathname: '/posts', params: {} }) };
    const app = mount(source);
    await app.view.rerender({ auth: authProvider, router });
    await ready(app);
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1] })).rejects.toBeDefined();
    await waitFor(() => expect(authProvider.onError).toHaveBeenCalledTimes(1));
    await app.view.rerender({ resource: 'other' });
    gate.resolve({ redirectTo: '/login' });
    await gate.promise;
    expect(router.go).not.toHaveBeenCalled();
  });

  it('uses the current contract and named provider after a reactive resource change', async () => {
    const first = provider();
    const cms = provider();
    const app = mount({ default: first, cms });
    await ready(app);
    await app.view.rerender({ resource: 'other', resources: [definitions[0] ?? { name: 'posts', label: 'Posts', fields: [], contract: posts },
      { name: 'other', label: 'Other', fields: [], contract: other, provider: { dataProviderName: 'cms' } }] });
    await ready(app);
    await app.read().remove.mutation.mutateAsync({ ids: [1] });
    expect(cms.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ resource: 'other' }));
    expect(first.deleteMany).not.toHaveBeenCalled();
  });

  it.each(['resource', 'provider', 'tenant', 'auth', 'disabled', 'unmount'])('stops fallback dispatch after %s changes', async change => {
    const source = provider();
    delete source.deleteMany;
    const gate = deferred<GetOneResult>();
    source.deleteOne = vi.fn(() => gate.promise);
    const app = mount(source);
    await ready(app);
    const success = vi.fn();
    const error = vi.fn();
    const operation = app.read().remove.mutation.mutateAsync({ ids: [1, 2] }, { onSuccess: success, onError: error })
      .catch((cause: unknown) => cause);
    await waitFor(() => expect(source.deleteOne).toHaveBeenCalledTimes(1));
    if (change === 'resource') await app.view.rerender({ resource: 'other' });
    if (change === 'provider') await app.view.rerender({ provider: provider() });
    if (change === 'tenant') await app.view.rerender({ tenant: 'next' });
    if (change === 'auth') await app.view.rerender({ auth: auth() });
    if (change === 'disabled') await app.view.rerender({ enabled: false });
    if (change === 'unmount') app.view.unmount();
    gate.resolve({ data: { id: 1, title: 'Deleted' } });
    const outcome: unknown = await operation;
    expect(outcome).toMatchObject({ code: 'DELETE_MANY_CANCELLED',
      details: { attemptedIds: [1], writeMayHaveSucceeded: true, ...(change === 'auth' ? {} : { succeededIds: [1] }) } });
    if (change === 'auth') expect(outcome).not.toHaveProperty('details.succeededIds');
    expect(source.deleteOne).toHaveBeenCalledTimes(1);
    expect(success).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('prevents queued writes after unmounting', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    const operation = app.read().remove.mutation.mutateAsync({ ids: [1] });
    app.view.unmount();
    await expect(operation).rejects.toMatchObject({ code: 'DELETE_MANY_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(source.deleteMany).not.toHaveBeenCalled();
  });

  it('preserves a new batch state when an old scope settles first', async () => {
    const source = provider();
    const oldGate = deferred<GetManyResult>();
    const newGate = deferred<GetManyResult>();
    source.deleteMany = vi.fn(() => newGate.promise).mockImplementationOnce(() => oldGate.promise);
    const app = mount(source);
    await ready(app);
    const oldSuccess = vi.fn();
    const previous = app.read().remove.mutation.mutateAsync({ ids: [1] }, { onSuccess: oldSuccess }).catch((cause: unknown) => cause);
    await waitFor(() => expect(source.deleteMany).toHaveBeenCalledTimes(1));
    await app.view.rerender({ resource: 'other' });
    await ready(app);
    const current = app.read().remove.mutation.mutateAsync({ ids: [2] });
    await waitFor(() => expect(source.deleteMany).toHaveBeenCalledTimes(2));
    oldGate.resolve({ data: [rows[0]] });
    expect(await previous).toMatchObject({ code: 'DELETE_MANY_CANCELLED' });
    expect(app.read().remove.mutation.isPending).toBe(true);
    expect(app.read().remove.mutation.variables?.ids).toEqual([2]);
    expect(oldSuccess).not.toHaveBeenCalled();
    newGate.resolve({ data: [rows[1]] });
    await current;
    await waitFor(() => expect(app.read().remove.mutation.isSuccess).toBe(true));
    expect(app.read().remove.mutation.data?.data).toEqual([rows[1]]);
  });

  it('isolates variable snapshots and repeated data reads from callers', async () => {
    const app = mount();
    await ready(app);
    await app.read().remove.mutation.mutateAsync({ ids: [1], meta: { region: 'Original' } });
    await waitFor(() => expect(app.read().remove.mutation.isSuccess).toBe(true));
    const params = app.read().remove.mutation.variables;
    if (params) { params.ids[0] = 99; if (params.meta) params.meta['region'] = 'Changed'; }
    const data = app.read().remove.mutation.data;
    if (data?.data[0]) data.data[0]['title'] = false;
    expect(app.read().remove.mutation.variables?.ids).toEqual([1]);
    expect(app.read().remove.mutation.variables?.meta?.['region']).toBe('Original');
    expect(app.read().remove.mutation.data?.data[0]?.['title']).toBe('Deleted');
  });

  it('isolates partial-error callback, rejection and state objects', async () => {
    const source = provider();
    delete source.deleteMany;
    source.deleteOne = vi.fn(async ({ id }) => {
      if (id === 2) throw new Error('PRIVATE');
      return { data: { id, title: 'Deleted' } };
    });
    const app = mount(source);
    await ready(app);
    const callback = vi.fn((error: unknown) => {
      if (error instanceof DeleteManyPartialError) error.failedIds.push(99);
    });
    let error: unknown;
    try { await app.read().remove.mutation.mutateAsync({ ids: [1, 2] }, { onError: callback }); }
    catch (cause) { error = cause; }
    expect(error).toMatchObject({ succeededIds: [1], failedIds: [2] });
    if (error instanceof DeleteManyPartialError) error.failedIds.push(98);
    await waitFor(() => expect(app.read().remove.mutation.isError).toBe(true));
    const stored = app.read().remove.mutation.error;
    if (stored instanceof DeleteManyPartialError) stored.failedIds.push(97);
    expect(app.read().remove.mutation.error).toMatchObject({ succeededIds: [1], failedIds: [2] });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not refetch another admin instance sharing the same query client', async () => {
    const first = provider();
    const second = provider();
    const app = mount(first);
    let otherState: DeleteManyState | undefined;
    render(Host, { provider: second, resources: definitions, queryClient: app.client, onReady: value => { otherState = value; } });
    await ready(app);
    await waitFor(() => expect(otherState?.list.isSuccess).toBe(true));
    const otherReads = vi.mocked(second.getList).mock.calls.length;
    await app.read().remove.mutation.mutateAsync({ ids: [1] });
    expect(second.getList).toHaveBeenCalledTimes(otherReads);
    expect(second.deleteMany).not.toHaveBeenCalled();
  });

  it('invalidates failed fallback details but removes only confirmed successes', async () => {
    const source = provider();
    delete source.deleteMany;
    source.deleteOne = vi.fn(async ({ id }) => {
      if (id === 2) throw new Error('Uncertain deletion');
      return { data: { id, title: 'Deleted' } };
    });
    const app = mount(source);
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const first = builder.data.one('posts', 1, owner);
    const second = builder.data.one('posts', 2, owner);
    const unrelated = builder.data.one('posts', 3, owner);
    for (const key of [first, second, unrelated]) app.client.setQueryData(key, { data: {} });
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1, 2] })).rejects.toBeInstanceOf(DeleteManyPartialError);
    expect(app.client.getQueryState(first)).toBeUndefined();
    expect(app.client.getQueryState(second)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(unrelated)?.isInvalidated).toBe(false);
  });

  it('rejects accessor-backed receipts without executing their getters', async () => {
    const source = provider();
    const getter = vi.fn(() => rows);
    source.deleteMany = vi.fn(async () => Object.defineProperty({ data: rows }, 'data', { get: getter }));
    const app = mount(source);
    await ready(app);
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1, 2] })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(getter).not.toHaveBeenCalled();
  });

  it('rejects malicious error reflection without invoking accessors', async () => {
    const source = provider();
    const getter = vi.fn(() => { throw new Error('PRIVATE'); });
    const cause = Object.defineProperties({}, { code: { get: getter }, message: { get: getter }, statusCode: { get: getter } });
    source.deleteMany = vi.fn(async () => { throw cause; });
    const app = mount(source);
    await ready(app);
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1] })).rejects.toMatchObject({ code: 'DELETE_MANY_FAILED' });
    expect(getter).not.toHaveBeenCalled();
  });

  it('rejects asynchronous observers without producing an unhandled rejection', async () => {
    const app = mount();
    const open = vi.fn(async () => { throw new Error('Notification failed'); });
    await app.view.rerender({ notification: { open, close: () => {} } });
    await ready(app);
    const success = vi.fn(async () => { throw new Error('Callback failed'); });
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1] }, { onSuccess: success })).resolves.toMatchObject({ data: [{ id: 1 }] });
    expect(success).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('isolates notification and callback failures and detached return records', async () => {
    const app = mount();
    const notification = { open: vi.fn(() => { throw new Error('Notification failed'); }), close: () => {} };
    await app.view.rerender({ notification });
    await ready(app);
    const callback = vi.fn((result: { data: Record<string, unknown>[] }) => {
      if (result.data[0]) result.data[0]['title'] = false;
      throw new Error('Callback failed');
    });
    const result = await app.read().remove.mutation.mutateAsync({ ids: [1] }, { onSuccess: callback });
    expect(result.data[0]?.['title']).toBe('Deleted');
    await waitFor(() => expect(app.read().remove.mutation.isSuccess).toBe(true));
    if (result.data[0]) result.data[0]['title'] = false;
    expect(app.read().remove.mutation.data?.data[0]?.['title']).toBe('Deleted');
    expect(notification.open).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it('separates preflight rejections from stored errors', async () => {
    const app = mount();
    await ready(app);
    const error: unknown = await app.read().remove.mutation.mutateAsync({ ids: [] }).catch((cause: unknown) => cause);
    if (error instanceof Error) error.message = 'Changed';
    await waitFor(() => expect(app.read().remove.mutation.isError).toBe(true));
    expect(app.read().remove.mutation.error?.message).toBe('Invalid batch deletion input');
    expect(app.read().remove.mutation.failureReason?.message).toBe('Invalid batch deletion input');
  });
  it('gives coalesced failures independent rejection objects', async () => {
    const source = provider();
    const gate = deferred<GetManyResult>();
    source.deleteMany = vi.fn(() => gate.promise);
    const app = mount(source);
    await ready(app);
    const first = app.read().remove.mutation.mutateAsync({ ids: [1] }).catch((cause: unknown) => cause);
    const second = app.read().remove.mutation.mutateAsync({ ids: [1] }).catch((cause: unknown) => cause);
    gate.reject(new Error('PRIVATE'));
    const error = await first;
    if (error instanceof Error) error.message = 'Changed';
    expect(await second).toMatchObject({ message: 'Batch deletion failed' });
    expect(source.deleteMany).toHaveBeenCalledTimes(1);
  });
  it.each(['optimistic', 'undoable'] as const)('keeps all caches intact before checked success despite global %s mode', async mutationMode => {
    setAdminOptions({ mutationMode, undoableTimeout: 60_000 });
    const source = provider();
    const gate = deferred<GetManyResult>();
    source.deleteMany = vi.fn(() => gate.promise);
    const app = mount(source);
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const collection = { data: rows, total: 2 };
    const collections = [
      builder.data.list('posts', { ...owner, filter: 'cached' }),
      builder.data.select('posts', owner),
      builder.data.selectDefaults('posts', owner),
      builder.data.many('posts', { ...owner, ids: [1, 2] }),
    ];
    const infinite = builder.data.infiniteList('posts', owner);
    const detail = builder.data.one('posts', 1, owner);
    for (const key of collections) app.client.setQueryData(key, collection);
    app.client.setQueryData(infinite, { pages: [collection], pageParams: [1] });
    app.client.setQueryData(detail, { data: rows[0] });
    const operation = app.read().remove.mutation.mutateAsync({ ids: [1] });
    await waitFor(() => expect(source.deleteMany).toHaveBeenCalledTimes(1));
    for (const key of collections) expect(app.client.getQueryData(key)).toEqual(collection);
    expect(app.client.getQueryData(infinite)).toEqual({ pages: [collection], pageParams: [1] });
    expect(app.client.getQueryData(detail)).toEqual({ data: rows[0] });
    gate.resolve({ data: [rows[0]] });
    await operation;
    expect(app.client.getQueryState(detail)).toBeUndefined();
    for (const key of [...collections, infinite]) expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
  });
  it('does not remove a string-ID detail when deleting the same numeric ID', async () => {
    const contract = defineResource('posts', { record: Type.Object({ id: Type.Union([Type.Number(), Type.String()]), title: Type.String() }) });
    const app = mount();
    await app.view.rerender({ resources: [{ name: 'posts', label: 'Posts', fields: [], contract }] });
    await ready(app);
    const { builder, owner } = scopedKeys(app, contract);
    const numeric = builder.data.one('posts', 1, owner);
    const text = builder.data.one('posts', '1', owner);
    app.client.setQueryData(numeric, { data: { id: 1, title: 'Number' } });
    app.client.setQueryData(text, { data: { id: '1', title: 'Text' } });
    const audit = vi.fn();
    setAuditHandler(audit);
    await app.read().remove.mutation.mutateAsync({ ids: [1] });
    expect(app.client.getQueryState(numeric)).toBeUndefined();
    expect(app.client.getQueryData(text)).toEqual({ data: { id: '1', title: 'Text' } });
    expect(app.client.getQueryState(text)?.isInvalidated).toBe(false);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ recordId: 1, action: 'delete' }));
  });
  it('forwards detached delete payloads and metadata to each fallback', async () => {
    const source = provider();
    delete source.deleteMany;
    const received: unknown[] = [];
    source.deleteOne = vi.fn(async ({ id, variables, meta }) => {
      received.push({ variables: structuredClone(variables), meta: structuredClone(meta) });
      if (typeof variables === 'object' && variables !== null) Object.assign(variables, { reason: 'Changed' });
      if (meta) meta['region'] = 'Changed';
      return { data: { id, title: 'Deleted' } };
    });
    const contract = defineResource('posts', { record, delete: Type.Object({ reason: Type.String() }) });
    const app = mount(source);
    await app.view.rerender({ resources: [{ name: 'posts', label: 'Posts', fields: [], contract }] });
    await ready(app);
    await app.read().remove.mutation.mutateAsync({ ids: [1, 2], variables: { reason: 'Requested' }, meta: { region: 'Original' } });
    expect(received).toHaveLength(2);
    for (const request of received) expect(request).toMatchObject({
      variables: { reason: 'Requested' }, meta: { region: 'Original' },
    });
  });
  it('delegates a sanitized auth cause from a partial failure even after a non-auth failure', async () => {
    const source = provider();
    delete source.deleteMany;
    source.deleteOne = vi.fn(async ({ id }) => {
      if (id === 2) throw new Error('PRIVATE');
      if (id === 3) throw { statusCode: 401, message: 'PRIVATE TOKEN' };
      return { data: { id, title: 'Deleted' } };
    });
    const onError = vi.fn(async (cause: unknown) => {
      if (cause instanceof Error) cause.message = 'Changed by auth';
      return {};
    });
    const app = mount(source);
    await app.view.rerender({ auth: { ...auth(), onError } });
    await ready(app);
    const error: unknown = await app.read().remove.mutation.mutateAsync({ ids: [1, 2, 3] }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(DeleteManyPartialError);
    expect(error).toMatchObject({ succeededIds: [1], failedIds: [2, 3], causes: [
      { message: 'Batch deletion failed' }, { statusCode: 401, message: 'Batch deletion failed' },
    ] });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ statusCode: 401, message: 'Changed by auth' });
  });
  it('prevents a late partial-auth response from navigating a replacement resource', async () => {
    const source = provider();
    delete source.deleteMany;
    source.deleteOne = vi.fn(async ({ id }) => {
      if (id === 2) throw { statusCode: 401 };
      return { data: { id, title: 'Deleted' } };
    });
    const gate = deferred<{ redirectTo: string }>();
    const onError = vi.fn(() => gate.promise);
    const router = { go: vi.fn(), back: () => {}, parse: () => ({ pathname: '/posts', params: {} }) };
    const app = mount(source);
    await app.view.rerender({ auth: { ...auth(), onError }, router });
    await ready(app);
    await expect(app.read().remove.mutation.mutateAsync({ ids: [1, 2] })).rejects.toBeInstanceOf(DeleteManyPartialError);
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    await app.view.rerender({ resource: 'other' });
    gate.resolve({ redirectTo: '/login' });
    await gate.promise;
    expect(router.go).not.toHaveBeenCalled();
  });
  it.each([
    { mutationMode: 'optimistic' }, { mutationMode: 'undoable' }, { invalidates: false },
    { undoableTimeout: 1 }, { successNotification: false }, { errorNotification: false },
  ])('rejects removed per-call mutation policies %j', async policy => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    await expect(app.read().remove.mutation.mutateAsync(Object.assign({ ids: [1] }, policy))).rejects.toMatchObject({
      code: 'INVALID_RESOURCE_INPUT',
    });
    expect(source.deleteMany).not.toHaveBeenCalled();
  });
});
