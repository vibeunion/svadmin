import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient, QueryObserver } from '@tanstack/svelte-query';
import { defineResource, keys, parseQueryKey, resetContext, setAuditHandler, UpdateManyPartialError, captureAuthSession,
  type DataProvider, type GetManyResult, type GetOneResult, type GetListResult, type ResourceDefinition, type AuthProvider,
  type AuthActionResult, type AuditLogProvider, type LiveProvider } from '@svadmin/core';
import { flushSync } from 'svelte';
import { resetLogoutVersion } from '../../../core/src/auth-hooks.svelte';
import { resetToast } from '@svadmin/core/toast';
import { definedOptions } from '@svadmin/core/options';
import { contractKey } from '../../../core/src/resource-contract';
import { parseUpdateManyParams } from '../../../core/src/update-many-contract';
import * as legacy from '../../../core/src/hooks.svelte';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UpdateManyState, UpdateManyAuthActions } from './update-many-contract.test.types';
import Host from './update-many-contract.test-host.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String() });
const updateSchema = Type.Object({ title: Type.String() });
const posts = defineResource('posts', { record, update: updateSchema });
const other = defineResource('other', { record, update: updateSchema });
const definitions: ResourceDefinition[] = [
  { name: 'posts', label: 'Posts', fields: [], contract: posts },
  { name: 'other', label: 'Other', fields: [], contract: other },
];
const rows: [{ id: number; title: string }, { id: number; title: string }] =
  [{ id: 1, title: 'First' }, { id: 2, title: 'Second' }];
const variables = { title: 'Edited' };
const clients: QueryClient[] = [];
function provider(): DataProvider {
  return {
    getApiUrl: () => '/api', getList: vi.fn(async () => ({ data: rows, total: rows.length })),
    getOne: async ({ id }) => ({ data: { id, title: 'First' } }),
    create: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
    updateMany: vi.fn<NonNullable<DataProvider['updateMany']>>(async ({ ids }) => ({ data: ids.map(id => ({ id, title: 'Edited' })) })),
    update: vi.fn(async ({ id }) => ({ data: { id, title: 'Edited' } })),
  };
}
function nativeUpdate(source: DataProvider) {
  if (!source.updateMany) throw new Error('Expected a native batch provider');
  return vi.mocked(source.updateMany);
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
  let state: UpdateManyState | undefined;
  let actions: UpdateManyAuthActions | undefined;
  const view = render(Host, { provider: source, resources: definitions, queryClient: client, onReady: value => { state = value; },
    ...definedOptions({
      auth: options.session,
      onAuthReady: options.session === undefined ? undefined : (value: UpdateManyAuthActions) => { actions = value; },
    }),
  });
  return { view, client, actions() {
    if (!actions) throw new Error('Expected mounted auth controls');
    return actions;
  }, read() {
    if (!state) throw new Error('Expected a batch update hook');
    return state;
  } };
}
async function ready(app: ReturnType<typeof mount>) {
  await waitFor(() => expect(app.read().list.isSuccess).toBe(true));
}
function scopedKeys(app: ReturnType<typeof mount>, authSession?: string) {
  const descriptor = app.client.getQueryCache().getAll().map(query => parseQueryKey(query.queryKey))
    .find(key => key?.kind === 'data' && key.action === 'list' && key.resource === 'posts' &&
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

describe.each(['native', 'fallback'] as const)('%s batch-update auth ownership', mode => {
  it.each(['login', 'logout'] as const)('retires queued updates on %s without inventing attempts', async action => {
    const source = provider();
    if (mode === 'fallback') delete source.updateMany;
    const app = await mountSession(source);
    const callback = vi.fn();
    const operation = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    if (action === 'login') await app.actions().login.mutate({});
    else await app.actions().logout.mutate();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: false, attemptedIds: [], failedIds: [], unattemptedIds: [1, 2],
    } });
    expect(error).not.toHaveProperty('details.succeededIds');
    expect(callback).not.toHaveBeenCalled();
    expect(source.update).not.toHaveBeenCalled();
    if (source.updateMany) expect(source.updateMany).not.toHaveBeenCalled();
  });

  it('rechecks queued dispatch after native mutation callbacks wait', async () => {
    const source = provider();
    if (mode === 'fallback') delete source.updateMany;
    const app = await mountSession(source);
    const gate = deferred();
    const observer = vi.fn(() => gate.promise);
    app.client.getMutationCache().config.onMutate = observer;
    const operation = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }).catch((error: unknown) => error);
    await waitFor(() => expect(observer).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    gate.resolve();
    expect(await operation).toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: false, attemptedIds: [], unattemptedIds: [1, 2],
    } });
    expect(source.update).not.toHaveBeenCalled();
    if (source.updateMany) expect(source.updateMany).not.toHaveBeenCalled();
  });

  it('blocks unavailable auth while saved mutation methods remain usable after checked recovery', async () => {
    const source = provider();
    if (mode === 'fallback') delete source.updateMany;
    const app = await mountSession(source);
    const saved = app.read().update.mutation.mutateAsync;
    await app.actions().logout.mutate();
    await expect(saved({ ids: [1, 2], variables })).rejects.toMatchObject({ code: 'UPDATE_MANY_CANCELLED' });
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    const login = app.actions().login.mutate({});
    await expect(saved({ ids: [1, 2], variables })).rejects.toMatchObject({ code: 'UPDATE_MANY_CANCELLED' });
    expect(source.update).not.toHaveBeenCalled();
    if (source.updateMany) expect(source.updateMany).not.toHaveBeenCalled();
    gate.resolve({ success: true });
    await login;
    await expect(saved({ ids: [1, 2], variables })).resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
  });

  it.each(['login', 'logout', 'check', 'provider'] as const)('withholds dispatched receipts when %s retires the session', async change => {
    const source = provider();
    const gate = deferred();
    source.updateMany = vi.fn(async () => { await gate.promise; return { data: rows }; });
    source.update = vi.fn(async () => { await gate.promise; return { data: rows[0] }; });
    if (mode === 'fallback') delete source.updateMany;
    const app = await mountSession(source);
    const effects = await observeEffects(app);
    const callback = vi.fn();
    const operation = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    await waitFor(() => expect(mode === 'native' ? source.updateMany : source.update).toHaveBeenCalledTimes(1));
    if (change === 'login') await app.actions().login.mutate({});
    else if (change === 'logout') await app.actions().logout.mutate();
    else if (change === 'check') await app.actions().check.refetch();
    else await app.view.rerender({ auth: auth() });
    const invalidate = vi.spyOn(app.client, 'invalidateQueries');
    gate.resolve();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: true, attemptedIds: mode === 'native' ? [1, 2] : [1],
      failedIds: [], unattemptedIds: mode === 'native' ? [] : [2],
    } });
    expect(error).not.toHaveProperty('details.succeededIds');
    expect(error).not.toHaveProperty('data');
    expect(error).not.toBeInstanceOf(UpdateManyPartialError);
    expect(callback).not.toHaveBeenCalled();
    expect(effects.auditHandler).not.toHaveBeenCalled();
    expect(effects.audit.create).not.toHaveBeenCalled();
    expect(effects.live.publish).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(mode === 'native' ? source.updateMany : source.update).toHaveBeenCalledTimes(1);
    expect(app.read().update.mutation.isIdle).toBe(true);
  });
});

describe('batch-update progress and completion', () => {
  it.each(['success', 'failure'] as const)('stops remaining updates after a late %s without publishing earlier results', async outcome => {
    const source = provider();
    delete source.updateMany;
    const gate = deferred<GetOneResult>();
    vi.mocked(source.update).mockResolvedValueOnce({ data: rows[0] }).mockReturnValueOnce(gate.promise);
    const app = await mountSession(source);
    const effects = await observeEffects(app);
    const handler = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    app.session.onError = handler;
    const { builder, owner } = scopedKeys(app, captureAuthSession(app.session).cacheKey);
    const oldKey = builder.data.list('posts', { ...owner, fixture: true });
    app.client.setQueryData(oldKey, {});
    const operation = app.read().update.mutation.mutateAsync({ ids: [1, 2, 3], variables }).catch((error: unknown) => error);
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(2));
    await app.actions().login.mutate({});
    const freshKey = builder.data.list('posts', { ...owner, authSession: captureAuthSession(app.session).cacheKey, fixture: true });
    app.client.setQueryData(freshKey, {});
    const refresh = vi.spyOn(app.client, 'invalidateQueries');
    if (outcome === 'success') gate.resolve({ data: rows[1] });
    else gate.reject({ statusCode: 401, message: 'PRIVATE' });
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: true, attemptedIds: [1, 2], failedIds: [], unattemptedIds: [3],
    } });
    expect(error).not.toHaveProperty('details.succeededIds');
    expect(error).not.toHaveProperty('succeededIds');
    expect(JSON.stringify(error)).not.toContain('First');
    expect(source.update).toHaveBeenCalledTimes(2);
    expect(handler).not.toHaveBeenCalled();
    expect(app.session.logout).not.toHaveBeenCalled();
    expect(effects.auditHandler).not.toHaveBeenCalled();
    expect(effects.live.publish).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(app.client.getQueryState(oldKey)?.isInvalidated).toBe(false);
    expect(app.client.getQueryState(freshKey)?.isInvalidated).toBe(false);
  });

  it('retains completed failure IDs but does not classify an obsolete in-flight receipt as a failure', async () => {
    const source = provider();
    delete source.updateMany;
    const gate = deferred<GetOneResult>();
    vi.mocked(source.update).mockRejectedValueOnce(new Error('PRIVATE failure')).mockReturnValueOnce(gate.promise);
    const app = await mountSession(source);
    const operation = app.read().update.mutation.mutateAsync({ ids: [1, 2, 3], variables }).catch((error: unknown) => error);
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(2));
    await app.actions().login.mutate({});
    gate.reject(new Error('PRIVATE old result'));
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: {
      attemptedIds: [1, 2], failedIds: [1], unattemptedIds: [3],
    } });
    expect(error).not.toHaveProperty('causes');
    expect(JSON.stringify(error)).not.toContain('PRIVATE');
    expect(source.update).toHaveBeenCalledTimes(2);
  });

  it('does not let new-session updates join an unresolved old batch for the same IDs', async () => {
    const app = await mountSession();
    const gate = deferred<GetManyResult>();
    const currentRows = rows.map(row => ({ ...row, title: 'Latest' }));
    nativeUpdate(app.source).mockReturnValueOnce(gate.promise).mockResolvedValueOnce({ data: currentRows });
    const saved = app.read().update.mutation.mutateAsync;
    const old = saved({ ids: [1, 2], variables }).catch((error: unknown) => error);
    await waitFor(() => expect(app.source.updateMany).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await expect(saved({ ids: [1, 2], variables })).resolves.toEqual({ data: currentRows });
    gate.resolve({ data: rows });
    expect(await old).toMatchObject({ code: 'UPDATE_MANY_CANCELLED' });
    expect(app.source.updateMany).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(app.read().update.mutation.isSuccess).toBe(true));
    expect(app.read().update.mutation.data).toEqual({ data: currentRows });
  });

  it('does not delegate late native auth failures into the newer login', async () => {
    const app = await mountSession();
    const effects = await observeEffects(app);
    const handler = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    app.session.onError = handler;
    const gate = deferred<GetManyResult>();
    nativeUpdate(app.source).mockReturnValueOnce(gate.promise);
    const callback = vi.fn();
    const operation = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }, { onError: callback, onSettled: callback })
      .catch((error: unknown) => error);
    await waitFor(() => expect(app.source.updateMany).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    const refresh = vi.spyOn(app.client, 'invalidateQueries');
    gate.reject({ statusCode: 401, message: 'PRIVATE' });
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: {
      attemptedIds: [1, 2], failedIds: [], unattemptedIds: [], writeMayHaveSucceeded: true,
    } });
    expect(error).not.toHaveProperty('details.succeededIds');
    expect(handler).not.toHaveBeenCalled();
    expect(app.session.logout).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each(['success', 'partial', 'failure', 'preflight', 'pending'] as const)('immediately hides %s state when login starts', async outcome => {
    const source = provider();
    const gate = deferred<GetManyResult>();
    if (outcome === 'partial') {
      delete source.updateMany;
      vi.mocked(source.update).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce(new Error('PRIVATE'));
    } else if (outcome === 'failure') nativeUpdate(source).mockRejectedValueOnce(new Error('PRIVATE'));
    else if (outcome === 'pending') nativeUpdate(source).mockReturnValueOnce(gate.promise);
    const app = await mountSession(source);
    const operation = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables: outcome === 'preflight' ? {} : variables })
      .catch((error: unknown) => error);
    if (outcome !== 'pending') await operation;
    await waitFor(() => expect(app.read().update.mutation.status).toBe(
      outcome === 'pending' ? 'pending' : outcome === 'success' ? 'success' : 'error',
    ));
    const state = app.read().update.mutation;
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
    const operation = app.read().update.mutation.mutateAsync({ ids: [1], variables: {} }, { onError: callback, onSettled: callback })
      .catch((error: unknown) => error);
    await app.actions().login.mutate({});
    expect(await operation).toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(callback).not.toHaveBeenCalled();
    expect(app.source.updateMany).not.toHaveBeenCalled();
  });

  it.each(['success', 'partial', 'cancelled', 'preflight'] as const)('withholds old %s data across delayed native completion', async outcome => {
    const source = provider();
    const receipt = deferred<GetManyResult>();
    if (outcome === 'partial') {
      delete source.updateMany;
      vi.mocked(source.update).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce(new Error('PRIVATE'));
    } else nativeUpdate(source).mockReturnValueOnce(receipt.promise);
    const app = await mountSession(source);
    const gate = deferred();
    const observer = vi.fn(() => gate.promise);
    if (outcome === 'success') app.client.getMutationCache().config.onSuccess = observer;
    else app.client.getMutationCache().config.onError = observer;
    const operation = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables: outcome === 'preflight' ? {} : variables })
      .catch((error: unknown) => error);
    if (outcome === 'success' || outcome === 'cancelled') {
      await waitFor(() => expect(source.updateMany).toHaveBeenCalledTimes(1));
      if (outcome === 'cancelled') await app.view.rerender({ tenant: 'second' });
      receipt.resolve({ data: rows });
    }
    await waitFor(() => expect(observer).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    gate.resolve();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: outcome !== 'preflight', attemptedIds: outcome === 'preflight' ? [] : [1, 2],
    } });
    expect(error).not.toHaveProperty('succeededIds');
    expect(error).not.toHaveProperty('details.succeededIds');
    expect(error).not.toHaveProperty('causes');
    expect(error).not.toHaveProperty('data');
    expect(app.read().update.mutation.isIdle).toBe(true);
  });

  it.each(['audit', 'audit-provider', 'live', 'collection-refresh', 'detail-refresh', 'notification', 'onSuccess', 'onSettled'] as const)(
    'stops later effects when %s starts another login', async stage => {
      const app = await mountSession();
      const effects = await observeEffects(app);
      const { builder, owner } = scopedKeys(app, captureAuthSession(app.session).cacheKey);
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
      const error: unknown = await app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }, { onSuccess, onSettled })
        .catch((error: unknown) => error);
      expect(login).toBeDefined();
      expect(error).toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: {
        writeMayHaveSucceeded: true, attemptedIds: [1, 2],
      } });
      expect(error).not.toHaveProperty('details.succeededIds');
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

  it.each(['preflight', 'partial', 'joined-partial', 'joined-success'] as const)('rechecks every observer and caller during reentrant %s delivery', async kind => {
    const source = provider();
    if (kind === 'partial' || kind === 'joined-partial') {
      delete source.updateMany;
      vi.mocked(source.update).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce(new Error('PRIVATE'));
    }
    const app = await mountSession(source);
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    let login: Promise<AuthActionResult> | undefined;
    const observer = vi.fn(() => { login = app.actions().login.mutate({}); });
    const onSettled = vi.fn();
    const input = { ids: [1, 2], variables: kind === 'preflight' ? {} : variables };
    const joined = kind === 'joined-partial' || kind === 'joined-success';
    const first = app.read().update.mutation.mutateAsync(input, joined ? {} : { onError: observer, onSettled })
      .catch((error: unknown) => error);
    const second = joined ? app.read().update.mutation.mutateAsync(input,
      kind === 'joined-success' ? { onSuccess: observer, onSettled } : { onError: observer, onSettled },
    ).catch((error: unknown) => error) : first;
    await first;
    const error: unknown = await second;
    expect(observer).toHaveBeenCalledTimes(1);
    expect(onSettled).not.toHaveBeenCalled();
    expect(error).toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: { writeMayHaveSucceeded: kind !== 'preflight' } });
    expect(error).not.toHaveProperty('succeededIds');
    expect(error).not.toHaveProperty('details.succeededIds');
    expect(app.read().update.mutation.isIdle).toBe(true);
    gate.resolve({ success: true });
    await login;
  });

  it.each(['success', 'partial', 'failure'] as const)('delivers detached %s to each coalesced caller and observer', async outcome => {
    const source = provider();
    const gate = deferred();
    source.updateMany = vi.fn(async () => {
      await gate.promise;
      if (outcome === 'failure') throw new Error('PRIVATE');
      return { data: rows };
    });
    if (outcome === 'partial') {
      delete source.updateMany;
      source.update = vi.fn(async ({ id }) => {
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
      if (cause instanceof UpdateManyPartialError) cause.failedIds.push(99);
    });
    const settled = vi.fn();
    const first = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }, {
      onSuccess: success, onError: error, onSettled: settled,
    }).catch((error: unknown) => error);
    const second = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }, {
      onSuccess: success, onError: error, onSettled: settled,
    }).catch((error: unknown) => error);
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
      else expect(left).toMatchObject({ code: 'UPDATE_MANY_FAILED' });
    }
    expect(outcome === 'partial' ? source.update : source.updateMany).toHaveBeenCalledTimes(outcome === 'partial' ? 2 : 1);
  });

  it('awaits all started collection and detail refreshes after failure and auth retirement', async () => {
    const app = await mountSession();
    const { builder, owner } = scopedKeys(app, captureAuthSession(app.session).cacheKey);
    app.client.setQueryData(builder.data.select('posts', owner), {});
    app.client.setQueryData(builder.data.one('posts', 1, owner), {});
    const collectionGate = deferred();
    const detailGate = deferred();
    const refresh = vi.spyOn(app.client, 'invalidateQueries').mockRejectedValueOnce(new Error('PRIVATE'))
      .mockReturnValueOnce(collectionGate.promise).mockReturnValue(detailGate.promise);
    let settled = false;
    const operation = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }).catch((error: unknown) => error)
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
    expect(error).toMatchObject({ code: 'UPDATE_MANY_CANCELLED' });
    expect(error).not.toHaveProperty('details.succeededIds');
  });

  it('isolates collections and details across independent sessions sharing a provider and query client', async () => {
    const source = provider();
    const first = await mountSession(source);
    const second = await mountSession(source, auth(), first.client);
    const left = scopedKeys(first, captureAuthSession(first.session).cacheKey);
    const right = scopedKeys(second, captureAuthSession(second.session).cacheKey);
    expect(left.source).toBe(right.source);
    expect(left.owner.authSession).not.toBe(right.owner.authSession);
    const owned = [left.builder.data.select('posts', left.owner), left.builder.data.one('posts', 1, left.owner)];
    const foreign = [right.builder.data.select('posts', right.owner), right.builder.data.one('posts', 1, right.owner)];
    for (const key of [...owned, ...foreign]) first.client.setQueryData(key, {});
    await first.read().update.mutation.mutateAsync({ ids: [1, 2], variables });
    for (const key of owned) expect(first.client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of foreign) expect(first.client.getQueryState(key)?.isInvalidated).toBe(false);
    await first.actions().logout.mutate();
    await expect(second.read().update.mutation.mutateAsync({ ids: [1, 2], variables })).resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
    expect(captureAuthSession(second.session).available).toBe(true);
  });

  it.each(['same', 'independent'] as const)('handles another mounted %s auth tree logging out during sequential updates', async ownership => {
    const source = provider();
    delete source.updateMany;
    const first = await mountSession(source);
    const second = await mountSession(source, ownership === 'same' ? first.session : auth(), first.client);
    const gate = deferred<GetOneResult>();
    vi.mocked(source.update).mockReturnValueOnce(gate.promise).mockResolvedValueOnce({ data: rows[1] });
    const operation = first.read().update.mutation.mutateAsync({ ids: [1, 2], variables }).catch((error: unknown) => error);
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
    await second.actions().logout.mutate();
    gate.resolve({ data: rows[0] });
    const result: unknown = await operation;
    if (ownership === 'same') {
      expect(result).toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: { attemptedIds: [1], unattemptedIds: [2] } });
      expect(result).not.toHaveProperty('details.succeededIds');
      expect(source.update).toHaveBeenCalledTimes(1);
    } else {
      expect(result).toEqual({ data: rows });
      expect(source.update).toHaveBeenCalledTimes(2);
    }
  });

  it.each(['partial', 'all-failed'] as const)('delegates a sanitized auth cause from %s fallback without sharing mutation errors', async outcome => {
    const source = provider();
    delete source.updateMany;
    if (outcome === 'partial') vi.mocked(source.update).mockResolvedValueOnce({ data: rows[0] });
    else vi.mocked(source.update).mockRejectedValueOnce(new Error('PRIVATE'));
    vi.mocked(source.update).mockRejectedValueOnce({ statusCode: 401, message: 'PRIVATE auth' });
    const app = await mountSession(source);
    const handler = vi.fn<NonNullable<AuthProvider['onError']>>(async error => {
      if (typeof error === 'object' && error !== null) Object.assign(error, { message: 'Changed' });
      return { logout: false };
    });
    app.session.onError = handler;
    const result: unknown = await app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }).catch((error: unknown) => error);
    expect(handler).toHaveBeenCalledTimes(1);
    const delivered = handler.mock.calls[0]?.[0];
    expect(delivered).toMatchObject({ statusCode: 401, message: 'Changed' });
    expect(delivered).not.toHaveProperty('failedIds');
    expect(delivered).not.toHaveProperty('causes');
    if (outcome === 'partial') expect(result).toMatchObject({
      code: 'UPDATE_MANY_PARTIAL', succeededIds: [1], failedIds: [2], causes: [{ statusCode: 401, message: 'Batch update failed' }],
    });
    else expect(result).toMatchObject({ code: 'UPDATE_MANY_FAILED', message: 'Batch update failed' });
    expect(JSON.stringify(result)).not.toContain('Changed');
    expect(app.session.logout).not.toHaveBeenCalled();
  });

  it.each(['resolved', 'rejected'] as const)('lets the current partial-error delegate finish its own %s logout', async outcome => {
    const source = provider();
    delete source.updateMany;
    vi.mocked(source.update).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce({ statusCode: 401, message: 'PRIVATE' });
    const app = await mountSession(source);
    app.session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    vi.mocked(app.session.logout).mockResolvedValueOnce({ success: outcome === 'resolved' });
    const error: unknown = await app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }).catch((error: unknown) => error);
    expect(error).toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: {
      writeMayHaveSucceeded: true, attemptedIds: [1, 2], failedIds: [2],
    } });
    expect(error).not.toHaveProperty('succeededIds');
    expect(error).not.toHaveProperty('details.succeededIds');
    await waitFor(() => expect(app.session.logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(captureAuthSession(app.session).available).toBe(false));
    if (outcome === 'resolved') await waitFor(() => expect(app.go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
    else expect(app.go).not.toHaveBeenCalled();
    await expect(app.read().update.mutation.mutateAsync({ ids: [1, 2], variables })).rejects.toMatchObject({ code: 'UPDATE_MANY_CANCELLED' });
    expect(source.update).toHaveBeenCalledTimes(2);
  });

  it.each(['unchanged', 'login', 'reset', 'new-call'] as const)('guards delayed auth instructions after %s', async change => {
    const app = await mountSession();
    const gate = deferred<{ logout: boolean; redirectTo: string }>();
    const handler = vi.fn(() => gate.promise);
    app.session.onError = handler;
    nativeUpdate(app.source).mockRejectedValueOnce({ statusCode: 401 });
    await expect(app.read().update.mutation.mutateAsync({ ids: [1, 2], variables })).rejects.toMatchObject({ code: 'UPDATE_MANY_FAILED' });
    await waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    if (change === 'login') await app.actions().login.mutate({});
    else if (change === 'reset') app.read().update.mutation.reset();
    else if (change === 'new-call') await expect(app.read().update.mutation.mutateAsync({ ids: [1], variables: {} })).rejects.toBeDefined();
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
    nativeUpdate(app.source).mockRejectedValueOnce({ statusCode: 401 });
    const operation = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }).catch((error: unknown) => error);
    await waitFor(() => expect(app.session.logout).toHaveBeenCalledTimes(1));
    expect(await operation).toMatchObject({ code: 'UPDATE_MANY_CANCELLED' });
    expect(app.read().update.mutation.isIdle).toBe(true);
    if (change === 'login') await app.actions().login.mutate({});
    else if (change === 'reset') app.read().update.mutation.reset();
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
        // A late remote logout leaves the actual principal uncertain until checked again.
        await waitFor(() => expect(captureAuthSession(app.session).cacheKey).not.toBe(beforeCompletion));
        expect(captureAuthSession(app.session).available).toBe(false);
        await expect(app.read().update.mutation.mutateAsync({ ids: [1, 2], variables })).rejects.toMatchObject({ code: 'UPDATE_MANY_CANCELLED' });
        expect(app.source.updateMany).toHaveBeenCalledTimes(1);
        await app.actions().check.refetch();
        expect(captureAuthSession(app.session).available).toBe(true);
        await expect(app.read().update.mutation.mutateAsync({ ids: [1, 2], variables })).resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
        expect(remove).not.toHaveBeenCalled();
        expect(app.go).not.toHaveBeenCalled();
      }
    }
  });

  it.each([false, true])('handles old-source refresh after provider replacement with auth recheck=%s', async withCheck => {
    const source = provider();
    const session = auth();
    const app = withCheck ? await mountSession(source, session) : mount(source);
    if (!withCheck) await app.view.rerender({ auth: session });
    await ready(app);
    const capability = captureAuthSession(session);
    const checks = vi.mocked(session.check).mock.calls.length;
    const gate = deferred<GetManyResult>();
    nativeUpdate(source).mockReturnValueOnce(gate.promise);
    const { builder, owner } = scopedKeys(app, capability.cacheKey);
    const oldList = builder.data.list('posts', { ...owner, fixture: true });
    const oldDetail = builder.data.one('posts', 1, owner);
    const untouchedDetail = builder.data.one('posts', 3, owner);
    for (const key of [oldList, oldDetail, untouchedDetail]) app.client.setQueryData(key, {});
    const callback = vi.fn();
    const operation = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    await waitFor(() => expect(source.updateMany).toHaveBeenCalledTimes(1));
    const replacement = provider();
    await app.view.rerender({ provider: replacement });
    await ready(app);
    if (withCheck) await waitFor(() => expect(vi.mocked(session.check).mock.calls.length).toBeGreaterThan(checks));
    expect(capability.isCurrent()).toBe(!withCheck);
    const reads = vi.mocked(replacement.getList).mock.calls.length;
    gate.resolve({ data: rows });
    const result: unknown = await operation;
    expect(result).toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: {
      attemptedIds: [1, 2], failedIds: [], unattemptedIds: [], writeMayHaveSucceeded: true,
    } });
    if (withCheck) expect(result).not.toHaveProperty('details.succeededIds');
    else expect(result).toHaveProperty('details.succeededIds', [1, 2]);
    expect(app.client.getQueryState(oldList)?.isInvalidated).toBe(!withCheck);
    expect(app.client.getQueryState(oldDetail)?.isInvalidated).toBe(!withCheck);
    expect(app.client.getQueryState(untouchedDetail)?.isInvalidated).toBe(false);
    expect(replacement.getList).toHaveBeenCalledTimes(reads);
    expect(callback).not.toHaveBeenCalled();
  });

  it('preserves foreign tagged caches when its partial-error delegate logs out', async () => {
    const source = provider();
    delete source.updateMany;
    const first = await mountSession(source);
    const second = await mountSession(source, auth(), first.client);
    const left = scopedKeys(first, captureAuthSession(first.session).cacheKey);
    const right = scopedKeys(second, captureAuthSession(second.session).cacheKey);
    const owned = left.builder.data.one('posts', 1, { ...left.owner, fixture: true });
    const foreign = right.builder.data.one('posts', 1, { ...right.owner, fixture: true });
    first.client.setQueryData(owned, { data: rows[0] });
    first.client.setQueryData(foreign, { data: rows[1] });
    first.session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    vi.mocked(source.update).mockResolvedValueOnce({ data: rows[0] }).mockRejectedValueOnce({ statusCode: 401 });
    await expect(first.read().update.mutation.mutateAsync({ ids: [1, 2], variables })).rejects.toMatchObject({ code: 'UPDATE_MANY_CANCELLED' });
    await waitFor(() => expect(first.go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
    expect(first.client.getQueryState(owned)).toBeUndefined();
    expect(first.client.getQueryData(foreign)).toEqual({ data: rows[1] });
    expect(first.client.getQueryState(foreign)?.isInvalidated).toBe(false);
    expect(captureAuthSession(second.session).available).toBe(true);
  });
});

describe('contract-bound batch update', () => {
  it('strictly compiles the hook, adapter, public aliases and positive/negative fixtures', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ['../../../core/src/update-many-contract.ts', '../../../core/src/update-many-hooks.svelte.ts',
      '../../../core/src/auth-hooks.svelte.ts', '../../../core/src/query-invalidation.ts', '../../../core/src/query-session.svelte.ts',
      '../../../core/src/hooks.svelte.ts', '../../../../scripts/fixtures/core-resource-types/unregistered.ts',
      '../../../core/src/strict-hooks.svelte.ts', 'update-many-contract.test.svelte.ts',
      'update-many-contract.test.types.ts', 'update-many-contract.test.type-fixture.ts',
    ].map(file => resolve(directory, file));
    const virtual = new Map(['update-many-contract.test-probe.svelte', 'update-many-contract.test-host.svelte'].map(file => {
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

  it('does not delegate public updates to legacy bulk cache mutations', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    expect(readFileSync(resolve(directory, '../../../core/src/strict-hooks.svelte.ts'), 'utf8')).not.toContain('bulk.createUpdateManyMutation');
    expect('useUpdateMany' in legacy).toBe(false);
    expect('createUpdateManyMutation' in legacy).toBe(false);
  });
  it.each([[], [1, 1], ['1'], [NaN], [Infinity]].map(ids => ({ ids })))('preflights the complete ID list %j', async input => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    await expect(app.read().update.mutation.mutateAsync({ ...input, variables })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.updateMany).not.toHaveBeenCalled();
    expect(source.update).not.toHaveBeenCalled();
  });
  it.each([undefined, {}, { title: false }, { title: 'Edited', extra: true }])('rejects invalid payloads %j', async value => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    await expect(app.read().update.mutation.mutateAsync({ ids: [1], variables: value })).rejects.toMatchObject({
      code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false },
    });
    expect(source.updateMany).not.toHaveBeenCalled();
  });
  it('rejects identity changes against every ID before a fallback dispatch', async () => {
    const editableId = defineResource('posts', { record, update: Type.Object({ id: Type.Number(), title: Type.String() }) });
    expect(() => parseUpdateManyParams(editableId, { ids: [1, 2], variables: { id: 1, title: 'Edited' } })).toThrow();
    const source = provider();
    delete source.updateMany;
    const app = mount(source);
    await app.view.rerender({ resources: [{ name: 'posts', label: 'Posts', fields: [], contract: editableId }] });
    await ready(app);
    await expect(app.read().update.mutation.mutateAsync({ ids: [1, 2], variables: { id: 1, title: 'Edited' } })).rejects.toBeDefined();
    expect(source.update).not.toHaveBeenCalled();
    await expect(app.read().update.mutation.mutateAsync({ ids: [1], variables: { id: 1, title: 'Edited' } })).resolves.toMatchObject({ data: [{ id: 1 }] });
  });
  it('rejects accessors and unknown envelope keys without executing submitted code', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    const getter = vi.fn(() => variables);
    await expect(app.read().update.mutation.mutateAsync(Object.defineProperty({ ids: [1], variables }, 'variables', { get: getter }))).rejects.toBeDefined();
    await expect(app.read().update.mutation.mutateAsync(Object.assign({ ids: [1], variables }, { resource: 'other' }))).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(getter).not.toHaveBeenCalled();
    expect(source.updateMany).not.toHaveBeenCalled();
  });
  it('captures IDs, variables, metadata and the provider method before queued mutation work', async () => {
    const source = provider();
    const original = vi.fn<NonNullable<DataProvider['updateMany']>>(async function(this: DataProvider, { ids }) {
      expect(this).toBe(source);
      return { data: ids.map(id => ({ id, title: 'Edited' })) };
    });
    source.updateMany = original;
    const app = mount(source);
    await ready(app);
    const input = { ids: [1], variables: { title: 'Original' }, meta: { region: 'Original' } };
    const operation = app.read().update.mutation.mutateAsync(input);
    input.ids[0] = 99;
    input.variables.title = 'Changed';
    input.meta.region = 'Changed';
    source.updateMany = vi.fn(async () => ({ data: [] }));
    await operation;
    expect(original).toHaveBeenCalledWith(expect.objectContaining({
      ids: [1], variables: { title: 'Original' }, meta: expect.objectContaining({ region: 'Original' }),
    }));
    expect(source.updateMany).not.toHaveBeenCalled();
  });
  it.each([
    [], [rows[0]], [rows[0], rows[0]], [{ id: 1, title: false }, rows[1]],
    [{ id: '1', title: 'Wrong type' }, rows[1]], [{ id: 99, title: 'Wrong ID' }, rows[1]],
    [...rows, { id: 3, title: 'Extra' }],
  ].map(data => ({ data })))('rejects malformed batch receipts %j', async receipt => {
    const source = provider();
    source.updateMany = vi.fn(async () => receipt);
    const app = mount(source);
    await ready(app);
    await expect(app.read().update.mutation.mutateAsync({ ids: [1, 2], variables })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
    });
    expect(source.updateMany).toHaveBeenCalledTimes(1);
  });
  it('accepts checked native receipts in a different order', async () => {
    const source = provider();
    source.updateMany = vi.fn(async () => ({ data: [...rows].reverse() }));
    const app = mount(source);
    await ready(app);
    expect((await app.read().update.mutation.mutateAsync({ ids: [1, 2], variables })).data.map(row => row['id'])).toEqual([2, 1]);
  });
  it('retains separate string and numeric identities when both are declared', async () => {
    const union = defineResource('posts', { record: Type.Object({ id: Type.Union([Type.Number(), Type.String()]), title: Type.String() }), update: updateSchema });
    const app = mount();
    await app.view.rerender({ resources: [{ name: 'posts', label: 'Posts', fields: [], contract: union }] });
    await ready(app);
    expect((await app.read().update.mutation.mutateAsync({ ids: [1, '1'], variables })).data.map(row => row['id'])).toEqual([1, '1']);
  });
  it('checks each fallback receipt and reports only proven partial success', async () => {
    const source = provider();
    delete source.updateMany;
    source.update = vi.fn(async ({ id }) => ({ data: { id: id === 2 ? 99 : id, title: 'Edited' } }));
    const app = mount(source);
    await ready(app);
    await expect(app.read().update.mutation.mutateAsync({ ids: [1, 2], variables })).rejects.toMatchObject({
      code: 'UPDATE_MANY_PARTIAL', succeededIds: [1], failedIds: [2], causes: [{ code: 'INVALID_PROVIDER_RESPONSE' }],
    });
    expect(source.update).toHaveBeenCalledTimes(2);
  });
  it('refreshes only captured families and attempted details without deleting cached records', async () => {
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
    await app.read().update.mutation.mutateAsync({ ids: [1, 2], variables });
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of excluded) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
  });
  it('refreshes requested IDs after an uncertain receipt but never trusts its foreign ID', async () => {
    const source = provider();
    source.updateMany = vi.fn(async () => ({ data: [{ id: 99, title: 'Wrong' }] }));
    const app = mount(source);
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const selected = builder.data.one('posts', 1, owner);
    const foreign = builder.data.one('posts', 99, owner);
    app.client.setQueryData(selected, { data: rows[0] });
    app.client.setQueryData(foreign, { data: { id: 99 } });
    await expect(app.read().update.mutation.mutateAsync({ ids: [1], variables })).rejects.toBeDefined();
    expect(app.client.getQueryState(selected)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(foreign)?.isInvalidated).toBe(false);
  });
  it('waits for every refresh even when a different refresh fails first', async () => {
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
      const operation = app.read().update.mutation.mutateAsync({ ids: [1], variables }, { onSuccess: success });
      await waitFor(() => expect(first.getCurrentResult().isFetching).toBe(true));
      failed.reject(new Error('Refresh failed'));
      await waitFor(() => expect(first.getCurrentResult().isError).toBe(true));
      expect(app.read().update.mutation.isPending).toBe(true);
      expect(success).not.toHaveBeenCalled();
      slow.resolve({ data: rows, total: 2 });
      await operation;
      expect(success).toHaveBeenCalledTimes(1);
    } finally { offFirst(); offSecond(); }
  });
  it('prevents inherited mutation callbacks and retries from overriding the checked lifecycle', async () => {
    const source = provider();
    const app = mount(source);
    const inherited = vi.fn(() => { throw new Error('Unsafe observer'); });
    app.client.setDefaultOptions({ mutations: { retry: 3, onMutate: inherited, onSuccess: inherited, onError: inherited, onSettled: inherited } });
    await ready(app);
    await app.read().update.mutation.mutateAsync({ ids: [1], variables });
    expect(inherited).not.toHaveBeenCalled();
    source.updateMany = vi.fn(async () => { throw new Error('PRIVATE'); });
    await expect(app.read().update.mutation.mutateAsync({ ids: [1], variables })).rejects.toBeDefined();
    expect(source.updateMany).toHaveBeenCalledTimes(1);
    expect(inherited).not.toHaveBeenCalled();
  });
  it.each(['resource', 'provider', 'tenant', 'auth', 'router', 'disabled', 'unmount'])('stops subsequent fallback writes after %s changes', async change => {
    const source = provider();
    delete source.updateMany;
    const gate = deferred<GetOneResult>();
    source.update = vi.fn(() => gate.promise);
    const app = mount(source);
    await ready(app);
    const success = vi.fn();
    const error = vi.fn();
    const operation = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }, { onSuccess: success, onError: error })
      .catch((cause: unknown) => cause);
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
    if (change === 'resource') await app.view.rerender({ resource: 'other' });
    if (change === 'provider') await app.view.rerender({ provider: provider() });
    if (change === 'tenant') await app.view.rerender({ tenant: 'next' });
    if (change === 'auth') await app.view.rerender({ auth: auth() });
    if (change === 'router') await app.view.rerender({ router: { go: () => {}, back: () => {}, parse: () => ({ pathname: '/other', params: {} }) } });
    if (change === 'disabled') await app.view.rerender({ enabled: false });
    if (change === 'unmount') app.view.unmount();
    gate.resolve({ data: { id: 1, title: 'Edited' } });
    const outcome: unknown = await operation;
    expect(outcome).toMatchObject({ code: 'UPDATE_MANY_CANCELLED',
      details: { attemptedIds: [1], writeMayHaveSucceeded: true, ...(change === 'auth' ? {} : { succeededIds: [1] }) } });
    if (change === 'auth') expect(outcome).not.toHaveProperty('details.succeededIds');
    expect(source.update).toHaveBeenCalledTimes(1);
    expect(success).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
  it('blocks queued writes after unmount', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    const operation = app.read().update.mutation.mutateAsync({ ids: [1], variables });
    app.view.unmount();
    await expect(operation).rejects.toMatchObject({ code: 'UPDATE_MANY_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(source.updateMany).not.toHaveBeenCalled();
  });
  it('retains new mutation state when an old scope completes first', async () => {
    const source = provider();
    const oldGate = deferred<GetManyResult>();
    const newGate = deferred<GetManyResult>();
    source.updateMany = vi.fn(() => newGate.promise).mockImplementationOnce(() => oldGate.promise);
    const app = mount(source);
    await ready(app);
    const previous = app.read().update.mutation.mutateAsync({ ids: [1], variables }).catch((cause: unknown) => cause);
    await waitFor(() => expect(source.updateMany).toHaveBeenCalledTimes(1));
    await app.view.rerender({ resource: 'other' });
    await ready(app);
    const current = app.read().update.mutation.mutateAsync({ ids: [2], variables });
    await waitFor(() => expect(source.updateMany).toHaveBeenCalledTimes(2));
    oldGate.resolve({ data: [rows[0]] });
    expect(await previous).toMatchObject({ code: 'UPDATE_MANY_CANCELLED' });
    expect(app.read().update.mutation.isPending).toBe(true);
    expect(app.read().update.mutation.variables?.ids).toEqual([2]);
    newGate.resolve({ data: [rows[1]] });
    await current;
    await waitFor(() => expect(app.read().update.mutation.isSuccess).toBe(true));
    expect(app.read().update.mutation.data?.data).toEqual([rows[1]]);
  });
  it('detaches inputs, repeated state reads, results and callback arguments', async () => {
    const app = mount();
    await ready(app);
    const callback = vi.fn((result: { data: Record<string, unknown>[] }) => {
      if (result.data[0]) result.data[0]['title'] = false;
    });
    const result = await app.read().update.mutation.mutateAsync({ ids: [1], variables, meta: { region: 'Original' } }, { onSuccess: callback });
    await waitFor(() => expect(app.read().update.mutation.isSuccess).toBe(true));
    const params = app.read().update.mutation.variables;
    if (params) { params.ids[0] = 99; if (params.meta) params.meta['region'] = 'Changed'; }
    const data = app.read().update.mutation.data;
    if (data?.data[0]) data.data[0]['title'] = false;
    if (result.data[0]) result.data[0]['title'] = false;
    expect(app.read().update.mutation.variables?.ids).toEqual([1]);
    expect(app.read().update.mutation.variables?.variables).toEqual(variables);
    expect(app.read().update.mutation.variables?.meta?.['region']).toBe('Original');
    expect(app.read().update.mutation.data?.data[0]?.['title']).toBe('Edited');
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it('detaches partial errors from rejection, callback and state reads', async () => {
    const source = provider();
    delete source.updateMany;
    source.update = vi.fn(async ({ id }) => {
      if (id === 2) throw new Error('PRIVATE');
      return { data: { id, title: 'Edited' } };
    });
    const app = mount(source);
    await ready(app);
    const callback = vi.fn((error: unknown) => {
      if (error instanceof UpdateManyPartialError) error.failedIds.push(99);
    });
    const error: unknown = await app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }, { onError: callback }).catch((cause: unknown) => cause);
    expect(error).toMatchObject({ succeededIds: [1], failedIds: [2] });
    if (error instanceof UpdateManyPartialError) error.failedIds.push(98);
    await waitFor(() => expect(app.read().update.mutation.isError).toBe(true));
    const stored = app.read().update.mutation.error;
    if (stored instanceof UpdateManyPartialError) {
      stored.failedIds.push(97);
      if (stored.causes[0]) stored.causes[0].message = 'Changed';
    }
    expect(app.read().update.mutation.error).toMatchObject({ succeededIds: [1], failedIds: [2] });
    expect(JSON.stringify(app.read().update.mutation.error)).not.toContain('PRIVATE');
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it('coalesces identical active writes with separate result copies and rejects conflicting writes', async () => {
    const source = provider();
    const gate = deferred<GetManyResult>();
    source.updateMany = vi.fn(() => gate.promise);
    const app = mount(source);
    await ready(app);
    const first = app.read().update.mutation.mutateAsync({ ids: [1], variables });
    const second = app.read().update.mutation.mutateAsync({ ids: [1], variables });
    await expect(app.read().update.mutation.mutateAsync({ ids: [2], variables })).rejects.toMatchObject({ code: 'UPDATE_MANY_BUSY' });
    gate.resolve({ data: [rows[0]] });
    const firstResult = await first;
    if (firstResult.data[0]) firstResult.data[0]['title'] = 'Changed';
    expect((await second).data[0]?.['title']).toBe('First');
    expect(source.updateMany).toHaveBeenCalledTimes(1);
  });
  it('does not refresh a different admin instance sharing the same query client', async () => {
    const first = provider();
    const second = provider();
    const app = mount(first);
    let otherState: UpdateManyState | undefined;
    render(Host, { provider: second, resources: definitions, queryClient: app.client, onReady: value => { otherState = value; } });
    await ready(app);
    await waitFor(() => expect(otherState?.list.isSuccess).toBe(true));
    const otherReads = vi.mocked(second.getList).mock.calls.length;
    await app.read().update.mutation.mutateAsync({ ids: [1], variables });
    expect(second.getList).toHaveBeenCalledTimes(otherReads);
    expect(second.updateMany).not.toHaveBeenCalled();
  });
  it('suppresses a late auth-error redirect after resource replacement', async () => {
    const source = provider();
    source.updateMany = vi.fn(async () => { throw { statusCode: 401 }; });
    const gate = deferred<{ redirectTo: string }>();
    const authProvider = { ...auth(), onError: vi.fn(() => gate.promise) };
    const router = { go: vi.fn(), back: () => {}, parse: () => ({ pathname: '/posts', params: {} }) };
    const app = mount(source);
    await app.view.rerender({ auth: authProvider, router });
    await ready(app);
    await expect(app.read().update.mutation.mutateAsync({ ids: [1], variables })).rejects.toBeDefined();
    await waitFor(() => expect(authProvider.onError).toHaveBeenCalledTimes(1));
    await app.view.rerender({ resource: 'other' });
    gate.resolve({ redirectTo: '/login' });
    await gate.promise;
    expect(router.go).not.toHaveBeenCalled();
  });
  it('rejects getter-backed receipts and hostile errors without executing getters', async () => {
    const source = provider();
    const getter = vi.fn(() => rows);
    source.updateMany = vi.fn(async () => Object.defineProperty({ data: rows }, 'data', { get: getter }));
    const app = mount(source);
    await ready(app);
    await expect(app.read().update.mutation.mutateAsync({ ids: [1, 2], variables })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    source.updateMany = vi.fn(async () => { throw Object.defineProperties({}, { message: { get: getter }, statusCode: { get: getter } }); });
    await expect(app.read().update.mutation.mutateAsync({ ids: [1], variables })).rejects.toMatchObject({ code: 'UPDATE_MANY_FAILED' });
    expect(getter).not.toHaveBeenCalled();
  });
  it('isolates synchronous and asynchronous observer failures from successful writes', async () => {
    const app = mount();
    const open = vi.fn(async () => { throw new Error('Notification failed'); });
    await app.view.rerender({ notification: { open, close: () => {} } });
    await ready(app);
    const success = vi.fn(() => { throw new Error('Callback failed'); });
    const settled = vi.fn(async () => { throw new Error('Observer failed'); });
    await expect(app.read().update.mutation.mutateAsync({ ids: [1], variables }, { onSuccess: success, onSettled: settled })).resolves.toMatchObject({ data: [{ id: 1 }] });
    expect(success).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledTimes(1);
  });
  it('blocks disabled writes and resumes only through a fresh enabled invocation', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ enabled: false });
    await ready(app);
    await expect(app.read().update.mutation.mutateAsync({ ids: [1], variables })).rejects.toMatchObject({
      code: 'UPDATE_MANY_CANCELLED', details: { writeMayHaveSucceeded: false },
    });
    expect(source.updateMany).not.toHaveBeenCalled();
    await app.view.rerender({ enabled: true });
    await app.read().update.mutation.mutateAsync({ ids: [1], variables });
    expect(source.updateMany).toHaveBeenCalledTimes(1);
  });
  it('requires an update schema even for metadata-erased resources', async () => {
    const source = provider();
    const app = mount(source);
    const readOnly = defineResource('posts', { record });
    await app.view.rerender({ resources: [{ name: 'posts', label: 'Posts', fields: [], contract: readOnly }] });
    await ready(app);
    await expect(app.read().update.mutation.mutateAsync({ ids: [1], variables })).rejects.toMatchObject({
      code: 'INVALID_RESOURCE_INPUT',
    });
    expect(source.updateMany).not.toHaveBeenCalled();
  });
  it('refreshes both successful and uncertain fallback identities', async () => {
    const source = provider();
    delete source.updateMany;
    source.update = vi.fn(async ({ id }) => {
      if (id === 2) throw new Error('Uncertain write');
      return { data: { id, title: 'Edited' } };
    });
    const app = mount(source);
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const selected = [1, 2].map(id => builder.data.one('posts', id, owner));
    const unrelated = builder.data.one('posts', 3, owner);
    for (const key of [...selected, unrelated]) app.client.setQueryData(key, { data: {} });
    await expect(app.read().update.mutation.mutateAsync({ ids: [1, 2], variables })).rejects.toBeInstanceOf(UpdateManyPartialError);
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(unrelated)?.isInvalidated).toBe(false);
  });
  it('waits for failed-write refreshes before reporting sanitized errors', async () => {
    const source = provider();
    source.updateMany = vi.fn(async () => { throw new Error('PRIVATE'); });
    const app = mount(source);
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const slow = deferred<GetListResult>();
    const observer = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { ...owner, filter: 'slow' }),
      initialData: { data: rows, total: 2 }, queryFn: () => slow.promise, staleTime: Infinity });
    const off = observer.subscribe(() => {});
    const onError = vi.fn(async () => { throw new Error('Observer failed'); });
    const settled = vi.fn();
    try {
      const operation = app.read().update.mutation.mutateAsync({ ids: [1], variables }, { onError, onSettled: settled })
        .catch((cause: unknown) => cause);
      await waitFor(() => expect(observer.getCurrentResult().isFetching).toBe(true));
      expect(app.read().update.mutation.isPending).toBe(true);
      expect(onError).not.toHaveBeenCalled();
      slow.resolve({ data: rows, total: 2 });
      expect(await operation).toMatchObject({ code: 'UPDATE_MANY_FAILED' });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(settled).toHaveBeenCalledTimes(1);
    } finally { off(); }
  });
  it('routes a reactive resource change to the captured named provider', async () => {
    const first = provider();
    const reporting = provider();
    const app = mount({ default: first, reporting });
    await ready(app);
    await app.view.rerender({
      resource: 'other',
      resources: definitions.map(definition => definition.name === 'other'
        ? { ...definition, provider: { dataProviderName: 'reporting', meta: { region: 'West' } } } : definition),
    });
    await ready(app);
    await app.read().update.mutation.mutateAsync({ ids: [1], variables });
    expect(reporting.updateMany).toHaveBeenCalledWith(expect.objectContaining({ resource: 'other' }));
    expect(first.updateMany).not.toHaveBeenCalled();
  });
  it('gives coalesced failed calls separate error objects', async () => {
    const source = provider();
    const gate = deferred<GetManyResult>();
    source.updateMany = vi.fn(() => gate.promise);
    const app = mount(source);
    await ready(app);
    const first = app.read().update.mutation.mutateAsync({ ids: [1], variables }).catch((cause: unknown) => cause);
    const second = app.read().update.mutation.mutateAsync({ ids: [1], variables }).catch((cause: unknown) => cause);
    gate.reject(new Error('PRIVATE'));
    const error = await first;
    if (error instanceof Error) error.message = 'Changed';
    expect(await second).toMatchObject({ message: 'Batch update failed' });
    expect(source.updateMany).toHaveBeenCalledTimes(1);
  });
  it('detaches preflight errors from internal failure state', async () => {
    const app = mount();
    await ready(app);
    const rejected: unknown = await app.read().update.mutation.mutateAsync({ ids: [], variables }).catch((cause: unknown) => cause);
    if (rejected instanceof Error) rejected.message = 'Changed';
    await waitFor(() => expect(app.read().update.mutation.isError).toBe(true));
    expect(app.read().update.mutation.error?.message).toBe('Invalid batch update input');
    expect(app.read().update.mutation.failureReason?.message).toBe('Invalid batch update input');
  });
  it('keeps typed IDs intact in captured audit events', async () => {
    const handler = vi.fn();
    setAuditHandler(handler);
    const union = defineResource('posts', { record: Type.Object({ id: Type.Union([Type.Number(), Type.String()]), title: Type.String() }), update: updateSchema });
    const app = mount();
    await app.view.rerender({ resources: [{ name: 'posts', label: 'Posts', fields: [], contract: union }] });
    await ready(app);
    await app.read().update.mutation.mutateAsync({ ids: [1, '1'], variables });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ recordId: 1, action: 'update' }));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ recordId: '1', action: 'update' }));
  });
  it('stops subsequent fallback writes after an explicit reset', async () => {
    const source = provider();
    delete source.updateMany;
    const gate = deferred<GetOneResult>();
    source.update = vi.fn(() => gate.promise);
    const app = mount(source);
    await ready(app);
    const previous = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }).catch((cause: unknown) => cause);
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
    app.read().update.mutation.reset();
    gate.resolve({ data: rows[0] });
    expect(await previous).toMatchObject({ code: 'UPDATE_MANY_CANCELLED' });
    expect(source.update).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(app.read().update.mutation.isIdle).toBe(true));
  });
  it('treats a contract revision as a new execution scope', async () => {
    const source = provider();
    delete source.updateMany;
    const gate = deferred<GetOneResult>();
    source.update = vi.fn(() => gate.promise);
    const app = mount(source);
    await ready(app);
    const previous = app.read().update.mutation.mutateAsync({ ids: [1, 2], variables }).catch((cause: unknown) => cause);
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));
    const contract = defineResource('posts', { record, update: updateSchema });
    await app.view.rerender({ resources: [{ name: 'posts', label: 'Posts', fields: [], contract }] });
    gate.resolve({ data: rows[0] });
    expect(await previous).toMatchObject({ code: 'UPDATE_MANY_CANCELLED' });
    expect(source.update).toHaveBeenCalledTimes(1);
  });
  it('snapshots each fallback payload independently from provider-side mutation', async () => {
    const source = provider();
    delete source.updateMany;
    const received: unknown[] = [];
    source.update = vi.fn(async ({ id, variables }) => {
      received.push(JSON.parse(JSON.stringify(variables)));
      if (typeof variables === 'object' && variables !== null) Object.assign(variables, { title: 'Corrupted' });
      return { data: { id, title: 'Edited' } };
    });
    const app = mount(source);
    await ready(app);
    await app.read().update.mutation.mutateAsync({ ids: [1, 2], variables });
    expect(received).toEqual([variables, variables]);
    expect(variables).toEqual({ title: 'Edited' });
  });
});
