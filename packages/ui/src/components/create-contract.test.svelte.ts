import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient } from '@tanstack/svelte-query';
import { defineResource, keys, parseQueryKey, resetContext, setAuditHandler,
  type DataProvider, type GetOneResult, type ResourceDefinition, type ResourceContract, type AuthProvider } from '@svadmin/core';
import { resetToast } from '@svadmin/core/toast';
import { definedOptions } from '@svadmin/core/options';
import { contractKey } from '../../../core/src/resource-contract';
import { parseCreateParams } from '../../../core/src/create-contract';
import * as legacy from '../../../core/src/hooks.svelte';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CreateState, CreateAuthActions } from './create-contract.test.types';
import { captureAuthLiveScope, resetLogoutVersion } from '../../../core/src/auth-hooks.svelte';
import type { AuthActionResult, NotificationProvider, LiveProvider, AuditLogProvider } from '@svadmin/core';
import { flushSync } from 'svelte';
import Host from './create-contract.test-host.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String() });
const createSchema = Type.Object({ title: Type.String() });
const posts = defineResource('posts', { record, create: createSchema });
const other = defineResource('other', { record, create: createSchema });
const definitions: ResourceDefinition[] = [
  { name: 'posts', label: 'Posts', fields: [], contract: posts },
  { name: 'other', label: 'Other', fields: [], contract: other },
];
const row = { id: 1, title: 'Created' };
const variables = { title: 'Created' };
const clients: QueryClient[] = [];
function provider(): DataProvider {
  return {
    getApiUrl: () => '/api', getList: vi.fn(async () => ({ data: [row], total: 1 })),
    getOne: async ({ id }) => ({ data: { id, title: 'Created' } }),
    update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
    create: vi.fn(async () => ({ data: { ...row } })),
    createMany: vi.fn(async () => ({ data: [] })),
  };
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
  let state: CreateState | undefined;
  let actions: CreateAuthActions | undefined;
  const view = render(Host, { provider: source, resources: definitions, queryClient: client, onReady: value => { state = value; },
    ...definedOptions({
      auth: options.session,
      onAuthReady: options.session === undefined ? undefined : (value: CreateAuthActions) => { actions = value; },
    }),
  });
  return { view, client, actions() {
    if (!actions) throw new Error('Expected mounted authentication actions');
    return actions;
  }, read() {
    if (!state) throw new Error('Expected a create hook');
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
  const session: unknown = typeof params === 'object' && params !== null ? Object.getOwnPropertyDescriptor(params, 'authSession')?.value : undefined;
  if (typeof source !== 'string') throw new Error('Expected source identity');
  if (typeof session !== 'string') throw new Error('Expected authentication ownership');
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
  const notification: NotificationProvider = { open: vi.fn(), close: vi.fn() };
  await app.view.rerender({ audit, live, notification });
  return { auditHandler, audit, live, notification };
}

describe('single-create authentication ownership', () => {
  it.each(['login', 'logout'] as const)('stops a queued create when %s changes the same auth provider', async action => {
    const app = await mountSession();
    const effects = await observeEffects(app);
    const completed = vi.fn();
    const operation = app.read().create.mutation.mutateAsync({ variables }, {
      onSuccess: completed, onError: completed, onSettled: completed,
    }).catch((error: unknown) => error);
    if (action === 'login') await app.actions().login.mutate({});
    if (action === 'logout') await app.actions().logout.mutate();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'CREATE_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(app.source.create).not.toHaveBeenCalled();
    expect(completed).not.toHaveBeenCalled();
    expect(effects.auditHandler).not.toHaveBeenCalled();
    expect(effects.live.publish).not.toHaveBeenCalled();
  });

  it('retires a dispatched create when an auth check confirms a new revision', async () => {
    const app = await mountSession();
    const effects = await observeEffects(app);
    const gate = deferred<GetOneResult>();
    vi.mocked(app.source.create).mockReturnValueOnce(gate.promise);
    const operation = app.read().create.mutation.mutateAsync({ variables }).catch((error: unknown) => error);
    await waitFor(() => expect(app.source.create).toHaveBeenCalledTimes(1));
    await app.actions().check.refetch();
    gate.resolve({ data: row });
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'CREATE_CANCELLED', details: { writeMayHaveSucceeded: true } });
    expect(error).not.toHaveProperty('details.created');
    expect(effects.auditHandler).not.toHaveBeenCalled();
    expect(effects.live.publish).not.toHaveBeenCalled();
  });

  it.each(['success', 'cancelled'] as const)('withholds %s recovery data if auth changes during native completion callbacks', async outcome => {
    const app = await mountSession();
    const receipt = deferred<GetOneResult>();
    vi.mocked(app.source.create).mockReturnValueOnce(receipt.promise);
    const gate = deferred<void>();
    const observer = vi.fn(() => gate.promise);
    if (outcome === 'success') app.client.getMutationCache().config.onSuccess = observer;
    else app.client.getMutationCache().config.onError = observer;
    const operation = app.read().create.mutation.mutateAsync({ variables }).catch((error: unknown) => error);
    await waitFor(() => expect(app.source.create).toHaveBeenCalledTimes(1));
    if (outcome === 'cancelled') await app.view.rerender({ tenant: 'second' });
    receipt.resolve({ data: row });
    await waitFor(() => expect(observer).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    gate.resolve();
    const error: unknown = await operation;
    expect(error).toMatchObject({ code: 'CREATE_CANCELLED', details: { writeMayHaveSucceeded: true } });
    expect(error).not.toHaveProperty('details.created');
    expect(app.read().create.mutation.isIdle).toBe(true);
  });

  it('keeps pre-dispatch cancellation accurate after a native queue delay', async () => {
    const app = await mountSession();
    const gate = deferred<void>();
    const observer = vi.fn(() => gate.promise);
    app.client.getMutationCache().config.onMutate = observer;
    const operation = app.read().create.mutation.mutateAsync({ variables }).catch((error: unknown) => error);
    await waitFor(() => expect(observer).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    gate.resolve();
    expect(await operation).toMatchObject({ code: 'CREATE_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it('blocks signed-out and changing sessions while later valid calls can use the same saved method', async () => {
    const app = await mountSession();
    const saved = app.read().create.mutation.mutateAsync;
    await app.actions().logout.mutate();
    await expect(saved({ variables })).rejects.toMatchObject({ code: 'CREATE_CANCELLED', details: { writeMayHaveSucceeded: false } });
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    const login = app.actions().login.mutate({});
    await expect(saved({ variables })).rejects.toMatchObject({ code: 'CREATE_CANCELLED' });
    expect(app.source.create).not.toHaveBeenCalled();
    gate.resolve({ success: true });
    await login;
    await expect(saved({ variables })).resolves.toEqual({ data: row });
    expect(app.source.create).toHaveBeenCalledTimes(1);
  });

  it.each(['success', 'failure'] as const)('discards late %s after the same provider completes another login', async outcome => {
    const app = await mountSession();
    const effects = await observeEffects(app);
    const handler = vi.fn(async () => ({ logout: true }));
    app.session.onError = handler;
    const gate = deferred<GetOneResult>();
    vi.mocked(app.source.create).mockReturnValueOnce(gate.promise);
    const { builder, owner } = scopedKeys(app, posts, captureAuthLiveScope(app.session).cacheKey);
    const oldKey = builder.data.list('posts', { ...owner, fixture: true });
    app.client.setQueryData(oldKey, {});
    const callback = vi.fn();
    const old = app.read().create.mutation.mutateAsync({ variables }, {
      onSuccess: callback, onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    await waitFor(() => expect(app.source.create).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await ready(app);
    const freshKey = builder.data.list('posts', { ...owner, authSession: captureAuthLiveScope(app.session).cacheKey, fixture: true });
    app.client.setQueryData(freshKey, {});
    const refresh = vi.spyOn(app.client, 'invalidateQueries');
    if (outcome === 'success') gate.resolve({ data: row });
    else gate.reject({ statusCode: 401, message: 'PRIVATE old session' });
    const error: unknown = await old;
    expect(error).toMatchObject({ code: 'CREATE_CANCELLED', details: { writeMayHaveSucceeded: true } });
    expect(error).not.toHaveProperty('details.created');
    expect(handler).not.toHaveBeenCalled();
    expect(app.session.logout).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
    expect(effects.auditHandler).not.toHaveBeenCalled();
    expect(effects.audit.create).not.toHaveBeenCalled();
    expect(effects.live.publish).not.toHaveBeenCalled();
    expect(effects.notification.open).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(app.client.getQueryState(oldKey)?.isInvalidated).toBe(false);
    expect(app.client.getQueryState(freshKey)?.isInvalidated).toBe(false);
    expect(app.read().create.mutation.isIdle).toBe(true);
  });

  it.each(['success', 'failure', 'preflight', 'pending'] as const)('hides %s state immediately when authentication changes', async outcome => {
    const app = await mountSession();
    const gate = deferred<GetOneResult>();
    if (outcome === 'failure') vi.mocked(app.source.create).mockRejectedValueOnce(new Error('PRIVATE'));
    if (outcome === 'pending') vi.mocked(app.source.create).mockReturnValueOnce(gate.promise);
    const operation = app.read().create.mutation.mutateAsync({ variables: outcome === 'preflight' ? {} : variables })
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
    expect({ ...state }).toMatchObject({ data: undefined, variables: undefined, status: 'idle', error: null });
    const reflected: unknown = Object.getOwnPropertyDescriptor(state, 'data')?.get?.();
    expect(reflected).toBeUndefined();
    expect(Reflect.set(state, 'data', { data: row })).toBe(false);
    gate.resolve({ data: row });
    await operation;
    loginGate.resolve({ success: true });
    await login;
    flushSync();
    expect(state.isIdle).toBe(true);
  });

  it('suppresses queued invalid-input observers after a session change', async () => {
    const app = await mountSession();
    const callback = vi.fn();
    const operation = app.read().create.mutation.mutateAsync({ variables: {} }, {
      onError: callback, onSettled: callback,
    }).catch((error: unknown) => error);
    await app.actions().login.mutate({});
    expect(await operation).toMatchObject({ code: 'CREATE_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(callback).not.toHaveBeenCalled();
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it('does not coalesce a new-session write with an unresolved old invocation', async () => {
    const app = await mountSession();
    const gate = deferred<GetOneResult>();
    vi.mocked(app.source.create).mockReturnValueOnce(gate.promise).mockResolvedValueOnce({ data: { ...row, id: 2 } });
    const saved = app.read().create.mutation.mutateAsync;
    const old = saved({ variables }).catch((error: unknown) => error);
    await waitFor(() => expect(app.source.create).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await expect(saved({ variables })).resolves.toEqual({ data: { ...row, id: 2 } });
    gate.resolve({ data: row });
    expect(await old).toMatchObject({ code: 'CREATE_CANCELLED' });
    expect(app.source.create).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(app.read().create.mutation.isSuccess).toBe(true));
    expect(app.read().create.mutation.data).toEqual({ data: { ...row, id: 2 } });
  });

  it.each(['audit', 'live', 'refresh', 'notification', 'onSuccess', 'onSettled'] as const)(
    'stops later effects when %s starts another login', async stage => {
      const app = await mountSession();
      const effects = await observeEffects(app);
      const { builder, owner } = scopedKeys(app, posts, captureAuthLiveScope(app.session).cacheKey);
      const keys = [builder.data.select('posts', owner), builder.data.many('posts', { ...owner, ids: [1] })];
      for (const key of keys) app.client.setQueryData(key, {});
      const gate = deferred<AuthActionResult>();
      vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
      let login: Promise<AuthActionResult> | undefined;
      const start = () => { login ??= app.actions().login.mutate({}); };
      if (stage === 'audit') effects.auditHandler.mockImplementation(start);
      if (stage === 'live') vi.mocked(effects.live.publish).mockImplementation(start);
      if (stage === 'notification') vi.mocked(effects.notification.open).mockImplementation(start);
      const release = app.client.getQueryCache().subscribe(event => {
        if (stage === 'refresh' && event.type === 'updated' && event.action.type === 'invalidate') start();
      });
      const onSuccess = vi.fn(() => { if (stage === 'onSuccess') start(); });
      const onSettled = vi.fn(() => { if (stage === 'onSettled') start(); });
      const invalidate = vi.spyOn(app.client, 'invalidateQueries');
      const error: unknown = await app.read().create.mutation.mutateAsync({ variables }, { onSuccess, onSettled })
        .catch((error: unknown) => error);
      expect(login).toBeDefined();
      expect(error).toMatchObject({ code: 'CREATE_CANCELLED', details: { writeMayHaveSucceeded: true } });
      expect(error).not.toHaveProperty('details.created');
      if (stage === 'audit') {
        expect(effects.audit.create).not.toHaveBeenCalled();
        expect(effects.live.publish).not.toHaveBeenCalled();
      }
      if (stage === 'audit' || stage === 'live') expect(invalidate).not.toHaveBeenCalled();
      if (stage === 'refresh') {
        expect(invalidate).toHaveBeenCalledTimes(1);
        for (const key of keys) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
      }
      if (stage !== 'onSuccess' && stage !== 'onSettled') expect(onSuccess).not.toHaveBeenCalled();
      if (stage !== 'onSettled') expect(onSettled).not.toHaveBeenCalled();
      release();
      gate.resolve({ success: true });
      await login;
    });

  it('rechecks joined observers individually and withholds the old receipt from a superseded joined caller', async () => {
    const app = await mountSession();
    const receipt = deferred<GetOneResult>();
    vi.mocked(app.source.create).mockReturnValueOnce(receipt.promise);
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    let login: Promise<AuthActionResult> | undefined;
    const first = app.read().create.mutation.mutateAsync({ variables });
    const onSettled = vi.fn();
    const second = app.read().create.mutation.mutateAsync({ variables }, {
      onSuccess: () => { login = app.actions().login.mutate({}); }, onSettled,
    }).catch((error: unknown) => error);
    receipt.resolve({ data: row });
    await first;
    const error: unknown = await second;
    expect(error).toMatchObject({ code: 'CREATE_CANCELLED' });
    expect(error).not.toHaveProperty('details.created');
    expect(onSettled).not.toHaveBeenCalled();
    gate.resolve({ success: true });
    await login;
  });

  it.each(['preflight', 'error', 'joined-error'] as const)('rechecks ownership after a reentrant %s observer', async kind => {
    const app = await mountSession();
    const receipt = deferred<GetOneResult>();
    vi.mocked(app.source.create).mockReturnValueOnce(receipt.promise);
    const gate = deferred<AuthActionResult>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    let login: Promise<AuthActionResult> | undefined;
    const onError = vi.fn(() => { login = app.actions().login.mutate({}); });
    const onSettled = vi.fn();
    const input = { variables: kind === 'preflight' ? {} : variables };
    const first = app.read().create.mutation.mutateAsync(input, kind === 'joined-error' ? {} : { onError, onSettled })
      .catch((error: unknown) => error);
    const observed = kind === 'joined-error'
      ? app.read().create.mutation.mutateAsync(input, { onError, onSettled }).catch((error: unknown) => error)
      : first;
    if (kind !== 'preflight') {
      await waitFor(() => expect(app.source.create).toHaveBeenCalledTimes(1));
      receipt.reject(new Error('PRIVATE failure'));
    }
    await Promise.all([first, observed]);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onSettled).not.toHaveBeenCalled();
    expect(app.read().create.mutation.isIdle).toBe(true);
    if (kind === 'preflight') expect(app.source.create).not.toHaveBeenCalled();
    gate.resolve({ success: true });
    await login;
  });

  it('awaits all started refreshes even when the session changes after an early refresh failure', async () => {
    const app = await mountSession();
    const { builder, owner } = scopedKeys(app, posts, captureAuthLiveScope(app.session).cacheKey);
    app.client.setQueryData(builder.data.select('posts', owner), {});
    const gate = deferred<void>();
    const refresh = vi.spyOn(app.client, 'invalidateQueries').mockRejectedValueOnce(new Error('PRIVATE')).mockReturnValue(gate.promise);
    let settled = false;
    const outcome = app.read().create.mutation.mutateAsync({ variables }).catch((error: unknown) => error)
      .finally(() => { settled = true; });
    await waitFor(() => expect(refresh.mock.calls.length).toBeGreaterThan(1));
    await app.actions().login.mutate({});
    expect(settled).toBe(false);
    gate.resolve();
    const error: unknown = await outcome;
    expect(error).toMatchObject({ code: 'CREATE_CANCELLED' });
    expect(error).not.toHaveProperty('details.created');
  });

  it('isolates refreshes and logout effects across independent auth trees sharing one source and client', async () => {
    const source = provider();
    const first = await mountSession(source);
    const second = await mountSession(source, auth(), first.client);
    const left = scopedKeys(first, posts, captureAuthLiveScope(first.session).cacheKey);
    const right = scopedKeys(second, posts, captureAuthLiveScope(second.session).cacheKey);
    expect(left.source).toBe(right.source);
    expect(left.owner.authSession).not.toBe(right.owner.authSession);
    const firstKey = left.builder.data.select('posts', left.owner);
    const secondKey = right.builder.data.select('posts', right.owner);
    first.client.setQueryData(firstKey, {});
    first.client.setQueryData(secondKey, {});
    await first.read().create.mutation.mutateAsync({ variables });
    expect(first.client.getQueryState(firstKey)?.isInvalidated).toBe(true);
    expect(first.client.getQueryState(secondKey)?.isInvalidated).toBe(false);
    await first.actions().logout.mutate();
    await second.read().create.mutation.mutateAsync({ variables });
    expect(first.client.getQueryState(secondKey)?.isInvalidated).toBe(true);
    await waitFor(() => expect(second.read().create.mutation.isSuccess).toBe(true));
    expect(second.read().create.mutation.data).toEqual({ data: row });
    expect(captureAuthLiveScope(second.session).available).toBe(true);
  });

  it.each(['same', 'independent'] as const)('handles logout from another mounted %s auth tree during a pending create', async ownership => {
    const source = provider();
    const first = await mountSession(source);
    const second = await mountSession(source, ownership === 'same' ? first.session : auth(), first.client);
    const gate = deferred<GetOneResult>();
    vi.mocked(source.create).mockReturnValueOnce(gate.promise);
    const operation = first.read().create.mutation.mutateAsync({ variables }).catch((error: unknown) => error);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await second.actions().logout.mutate();
    gate.resolve({ data: row });
    if (ownership === 'same') {
      const error: unknown = await operation;
      expect(error).toMatchObject({ code: 'CREATE_CANCELLED' });
      expect(error).not.toHaveProperty('details.created');
      expect(first.read().create.mutation.isIdle).toBe(true);
    } else {
      expect(await operation).toEqual({ data: row });
      await waitFor(() => expect(first.read().create.mutation.isSuccess).toBe(true));
      expect(first.read().create.mutation.data).toEqual({ data: row });
    }
  });

  it.each(['resolved', 'rejected'] as const)('allows a current auth delegate to finish its own %s logout', async outcome => {
    const app = await mountSession();
    app.session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/login' }));
    vi.mocked(app.session.logout).mockResolvedValueOnce({ success: outcome === 'resolved' });
    vi.mocked(app.source.create).mockRejectedValueOnce({ statusCode: 401, message: 'PRIVATE' });
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({
      code: 'CREATE_CANCELLED', details: { writeMayHaveSucceeded: true },
    });
    await waitFor(() => expect(app.session.logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(captureAuthLiveScope(app.session).available).toBe(false));
    if (outcome === 'resolved') await waitFor(() => expect(app.go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
    else expect(app.go).not.toHaveBeenCalled();
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({ code: 'CREATE_CANCELLED' });
    expect(app.source.create).toHaveBeenCalledTimes(1);
  });

  it('drops a delayed auth instruction after another login on the same provider', async () => {
    const app = await mountSession();
    const gate = deferred<{ logout: boolean; redirectTo: string }>();
    const handler = vi.fn(() => gate.promise);
    app.session.onError = handler;
    vi.mocked(app.source.create).mockRejectedValueOnce({ statusCode: 401 });
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({ code: 'CREATE_FAILED' });
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

describe('contract-bound single create', () => {
  it('strictly compiles the hook, adapter, public aliases and positive/negative fixtures', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ['../../../core/src/create-contract.ts', '../../../core/src/create-hooks.svelte.ts',
      '../../../../scripts/fixtures/core-resource-types/unregistered.ts',
      '../../../core/src/strict-hooks.svelte.ts', 'create-contract.test.svelte.ts',
      '../../../core/src/query-invalidation.ts', '../../../core/src/query-session.svelte.ts',
      '../../../core/src/auth-hooks.svelte.ts', '../../../core/src/audit.ts',
      'create-contract.test.types.ts', 'create-contract.test.type-fixture.ts',
    ].map(file => resolve(directory, file));
    const virtual = new Map(['create-contract.test-probe.svelte', 'create-contract.test-host.svelte',
      '../../../core/src/provider-bundle.query-test-probe.svelte',
    ].map(file => {
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

  it('removes unchecked create exports', () => {
    expect('useCreate' in legacy).toBe(false);
    expect('createCreateMutation' in legacy).toBe(false);
  });
  it.each([undefined, null, {}, { title: false }, { title: 'Extra', extra: 1 }, [], NaN, Infinity])(
    'preflights payload %j', async variables => {
      const source = provider();
      const app = mount(source);
      await ready(app);
      await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({
        code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false },
      });
      expect(source.create).not.toHaveBeenCalled();
      expect(source.createMany).not.toHaveBeenCalled();
    },
  );
  it('requires a create schema for erased contracts', async () => {
    const source = provider();
    const app = mount(source);
    await rebind(app, defineResource('posts', { record }));
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({
      code: 'INVALID_RESOURCE_CONTRACT', details: { writeMayHaveSucceeded: false },
    });
    expect(source.create).not.toHaveBeenCalled();
  });
  it.each([
    { resource: 'other' }, { id: 1 }, { invalidates: false }, { retry: 1 }, { mutationMode: 'optimistic' },
    { successNotification: false }, { errorNotification: false }, { dataProviderName: '' },
  ])('rejects per-call overrides %j', async policy => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync(Object.assign({ variables }, policy)))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.create).not.toHaveBeenCalled();
  });
  it('rejects accessors without executing submitted code', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    const getter = vi.fn(() => variables);
    await expect(app.read().create.mutation.mutateAsync(Object.defineProperty({ variables }, 'variables', { get: getter })))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(getter).not.toHaveBeenCalled();
    expect(source.create).not.toHaveBeenCalled();
  });
  it('captures the provider method, receiver, payload and metadata before queued dispatch', async () => {
    const source = provider();
    const original = vi.fn<DataProvider['create']>(async function(this: DataProvider) {
      expect(this).toBe(source);
      return { data: row };
    });
    source.create = original;
    const app = mount(source);
    await ready(app);
    const input = { variables: { title: 'Original' }, meta: { region: 'Original' } };
    const operation = app.read().create.mutation.mutateAsync(input);
    input.variables.title = 'Changed';
    input.meta.region = 'Changed';
    source.create = vi.fn(async () => ({ data: {} }));
    await operation;
    expect(original).toHaveBeenCalledWith(expect.objectContaining({
      variables: { title: 'Original' }, meta: expect.objectContaining({ region: 'Original' }),
    }));
    expect(source.create).not.toHaveBeenCalled();
    expect(source.createMany).not.toHaveBeenCalled();
  });
  it('checks supplied IDs against the record ID schema before dispatch', async () => {
    const source = provider();
    const app = mount(source);
    await rebind(app, withIds());
    await expect(app.read().create.mutation.mutateAsync({ variables: { id: '1', title: 'Wrong' } }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.create).not.toHaveBeenCalled();
    const loose = defineResource('loose', { record, create: Type.Object({ id: Type.Boolean(), title: Type.String() }) });
    expect(() => parseCreateParams(loose, { variables: { id: false, title: 'Wrong' } })).toThrow();
  });
  it.each([{}, { id: 1 }, { id: '1', title: 'Wrong' }, { id: 1, title: false }, { ...row, extra: true }])(
    'rejects malformed receipts %j before success, without automatic retry', async data => {
      const source = provider();
      source.create = vi.fn(async () => ({ data }));
      const app = mount(source);
      await ready(app);
      const onSuccess = vi.fn();
      await expect(app.read().create.mutation.mutateAsync({ variables }, { onSuccess })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE', details: { phase: 'response', writeMayHaveSucceeded: true },
      });
      expect(source.create).toHaveBeenCalledTimes(1);
      expect(onSuccess).not.toHaveBeenCalled();
    },
  );
  it('rejects receipt accessors without executing provider code', async () => {
    const source = provider();
    const getter = vi.fn(() => row);
    source.create = vi.fn(async () => Object.defineProperty({ data: row }, 'data', { get: getter }));
    const app = mount(source);
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(getter).not.toHaveBeenCalled();
  });
  it('requires a returned ID to match a caller-supplied ID', async () => {
    const source = provider();
    const app = mount(source);
    await rebind(app, withIds());
    await expect(app.read().create.mutation.mutateAsync({ variables: { ...row, id: 2 } }))
      .rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    await expect(app.read().create.mutation.mutateAsync({ variables: row })).resolves.toEqual({ data: row });
  });
  it('preserves numeric and string identity through audit and targeted refresh', async () => {
    const contract = defineResource('posts', {
      record: Type.Object({ id: Type.Union([Type.Number(), Type.String()]), title: Type.String() }),
      create: createSchema,
    });
    const app = mount();
    await rebind(app, contract);
    const audit = vi.fn();
    setAuditHandler(audit);
    const { builder, owner } = scopedKeys(app, contract);
    const numeric = builder.data.one('posts', 1, owner);
    const string = builder.data.one('posts', '1', owner);
    for (const key of [numeric, string]) app.client.setQueryData(key, {});
    await app.read().create.mutation.mutateAsync({ variables });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', recordId: 1 }));
    expect(app.client.getQueryState(numeric)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(string)?.isInvalidated).toBe(false);
  });
  it('refreshes only captured collections and checked detail IDs without deleting records', async () => {
    const app = mount();
    await ready(app);
    const { builder, source, scope, owner } = scopedKeys(app);
    const selected = [builder.data.list('posts', { ...owner, extra: true }), builder.data.infiniteList('posts', owner),
      builder.data.select('posts', owner), builder.data.selectDefaults('posts', owner),
      builder.data.many('posts', { ...owner, ids: [1] }), builder.data.one('posts', 1, owner)];
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
    source.create = vi.fn(async () => ({ data: { ...row, id: 99 } }));
    const app = mount(source);
    const contract = withIds();
    await rebind(app, contract);
    const { builder, owner } = scopedKeys(app, contract);
    const selected = builder.data.one('posts', 1, owner);
    const excluded = builder.data.one('posts', 99, owner);
    for (const key of [selected, excluded]) app.client.setQueryData(key, {});
    await expect(app.read().create.mutation.mutateAsync({ variables: row })).rejects.toBeDefined();
    expect(app.client.getQueryState(selected)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(excluded)?.isInvalidated).toBe(false);
  });
  it('refreshes collections after network failures without inventing generated IDs', async () => {
    const source = provider();
    source.create = vi.fn(async () => { throw new Error('secret'); });
    const app = mount(source);
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    const list = builder.data.list('posts', { ...owner, fixture: true });
    const detail = builder.data.one('posts', 99, owner);
    for (const key of [list, detail]) app.client.setQueryData(key, {});
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({
      code: 'CREATE_FAILED', message: 'Create failed', details: { writeMayHaveSucceeded: true },
    });
    expect(app.client.getQueryState(list)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(detail)?.isInvalidated).toBe(false);
  });
  it.each(['resource', 'tenant', 'provider', 'contract', 'disabled', 'reset', 'unmount', 'auth', 'router'])(
    'preserves recovery information without publishing stale completion after %s changes', async change => {
      const source = provider();
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
      else if (change === 'auth') await app.view.rerender({ auth: auth() });
      else if (change === 'router') await app.view.rerender({ router: { go: vi.fn(), back: vi.fn(), parse: () => ({ params: {}, pathname: '/' }) } });
      else app.view.unmount();
      hold.resolve({ data: row });
      const error: unknown = await outcome;
      expect(error).toMatchObject({ code: 'CREATE_CANCELLED', details: {
        writeMayHaveSucceeded: true, ...(change === 'auth' ? {} : { created: row }),
      } });
      if (change === 'auth') expect(error).not.toHaveProperty('details.created');
      expect(callback).not.toHaveBeenCalled();
      if (change !== 'unmount') await waitFor(() => expect(app.read().create.mutation.isIdle).toBe(true));
    },
  );
  it('isolates calls reusing the same params object across tenants and ignores stale state', async () => {
    const source = provider();
    const hold = deferred<GetOneResult>();
    let count = 0;
    source.create = vi.fn(() => ++count === 1 ? hold.promise : Promise.resolve({ data: { ...row, id: 2 } }));
    const app = mount(source);
    await ready(app);
    const input = { variables };
    const old = app.read().create.mutation.mutateAsync(input).catch((error: unknown) => error);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.view.rerender({ tenant: 'second' });
    await app.read().create.mutation.mutateAsync(input);
    hold.resolve({ data: row });
    expect(await old).toMatchObject({ code: 'CREATE_CANCELLED' });
    await waitFor(() => expect(app.read().create.mutation.isSuccess).toBe(true));
    expect(app.read().create.mutation.data).toEqual({ data: { ...row, id: 2 } });
    expect(source.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ meta: { tenantId: 'first' } }));
    expect(source.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ meta: { tenantId: 'second' } }));
  });
  it('does not dispatch when disabled and does not refresh before dispatch', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    await app.view.rerender({ enabled: false });
    const invalidate = vi.spyOn(app.client, 'invalidateQueries');
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({
      code: 'CREATE_CANCELLED', details: { writeMayHaveSucceeded: false },
    });
    expect(source.create).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
  it('cancels a queued create before any write when reset immediately', async () => {
    const source = provider();
    const app = mount(source);
    await ready(app);
    const operation = app.read().create.mutation.mutateAsync({ variables });
    app.read().create.mutation.reset();
    await expect(operation).rejects.toMatchObject({ code: 'CREATE_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(source.create).not.toHaveBeenCalled();
    await waitFor(() => expect(app.read().create.mutation.isIdle).toBe(true));
  });
  it('refreshes only the old source after a late create receipt', async () => {
    const source = provider();
    const hold = deferred<GetOneResult>();
    source.create = vi.fn(() => hold.promise);
    const app = mount(source);
    await ready(app);
    const { builder, source: tag, owner } = scopedKeys(app);
    const oldList = builder.data.list('posts', { ...owner, fixture: true });
    const oldDetail = builder.data.one('posts', 1, owner);
    for (const key of [oldList, oldDetail]) app.client.setQueryData(key, {});
    const old = app.read().create.mutation.mutateAsync({ variables }).catch((error: unknown) => error);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
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
    hold.resolve({ data: row });
    expect(await old).toMatchObject({ code: 'CREATE_CANCELLED' });
    expect(app.client.getQueryState(oldList)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(oldDetail)?.isInvalidated).toBe(true);
    for (const query of replacements) {
      for (const [filters] of invalidate.mock.calls) expect(filters?.predicate?.(query)).not.toBe(true);
    }
  });
  it('honors named providers and rejects unknown names without fallback', async () => {
    const primary = provider();
    const named = provider();
    const app = mount({ default: primary, named });
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync({ variables, dataProviderName: 'missing' })).rejects.toBeDefined();
    expect(primary.create).not.toHaveBeenCalled();
    expect(named.create).not.toHaveBeenCalled();
    await app.read().create.mutation.mutateAsync({ variables, dataProviderName: 'named' });
    expect(named.create).toHaveBeenCalledTimes(1);
    expect(primary.create).not.toHaveBeenCalled();
  });
  it('coalesces identical active calls and detaches results, callbacks and state', async () => {
    const source = provider();
    const hold = deferred<GetOneResult>();
    source.create = vi.fn(() => hold.promise);
    const app = mount(source);
    await ready(app);
    const callback = vi.fn((result: { data: Record<string, unknown> } | undefined) => {
      if (result) result.data['title'] = 'callback';
    });
    const first = app.read().create.mutation.mutateAsync({ variables }, { onSuccess: callback, onSettled: callback });
    const second = app.read().create.mutation.mutateAsync({ variables }, { onSuccess: callback, onSettled: callback });
    await expect(app.read().create.mutation.mutateAsync({ variables: { title: 'Conflict' } })).rejects.toMatchObject({ code: 'CREATE_BUSY' });
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    const receipt = { data: { ...row } };
    hold.resolve(receipt);
    const [left, right] = await Promise.all([first, second]);
    await waitFor(() => expect(app.read().create.mutation.isSuccess).toBe(true));
    left.data['title'] = 'caller';
    receipt.data.title = 'provider';
    const state = app.read().create.mutation.data;
    if (state) state.data['title'] = 'state';
    expect(right).toEqual({ data: row });
    expect(app.read().create.mutation.data).toEqual({ data: row });
    expect(callback).toHaveBeenCalledTimes(4);
    const input = app.read().create.mutation.variables;
    if (input) input.variables = { title: 'Changed' };
    expect(app.read().create.mutation.variables).toEqual({ variables });
  });
  it('detaches errors between joined callers, observers and state', async () => {
    const source = provider();
    const hold = deferred<GetOneResult>();
    source.create = vi.fn(() => hold.promise);
    const app = mount(source);
    await ready(app);
    const onError = vi.fn((error: Error) => { error.message = 'observer'; });
    const first = app.read().create.mutation.mutateAsync({ variables }, { onError }).catch((error: unknown) => error);
    const second = app.read().create.mutation.mutateAsync({ variables }, { onError }).catch((error: unknown) => error);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    hold.reject(new Error('secret'));
    const [left, right] = await Promise.all([first, second]);
    if (typeof left === 'object' && left !== null) Object.assign(left, { message: 'caller' });
    await waitFor(() => expect(app.read().create.mutation.isError).toBe(true));
    expect(right).toMatchObject({ message: 'Create failed' });
    expect(app.read().create.mutation.error).toMatchObject({ message: 'Create failed' });
    expect(app.read().create.mutation.failureReason).toMatchObject({ message: 'Create failed' });
    expect(onError).toHaveBeenCalledTimes(2);
  });
  it('detaches preflight errors from state', async () => {
    const app = mount();
    await ready(app);
    const error: unknown = await app.read().create.mutation.mutateAsync({ variables: {} }).catch((error: unknown) => error);
    if (typeof error === 'object' && error !== null) Object.assign(error, { message: 'changed' });
    await waitFor(() => expect(app.read().create.mutation.isError).toBe(true));
    expect(app.read().create.mutation.error?.message).toBe('Invalid create input');
  });
  it('gives each completion observer independent validated input snapshots', async () => {
    const app = mount();
    await ready(app);
    const onSuccess = vi.fn((_result: unknown, input: { variables: unknown }) => { input.variables = { title: 'Changed' }; });
    const onSettled = vi.fn();
    await app.read().create.mutation.mutateAsync({ variables }, { onSuccess, onSettled });
    await waitFor(() => expect(app.read().create.mutation.isSuccess).toBe(true));
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith({ data: row }, null, { variables });
    expect(app.read().create.mutation.variables).toEqual({ variables });
    const onError = vi.fn();
    const invalidSettled = vi.fn();
    await expect(app.read().create.mutation.mutateAsync({ variables: {} }, { onError, onSettled: invalidSettled })).rejects.toBeDefined();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_RESOURCE_INPUT' }), undefined);
    expect(invalidSettled).toHaveBeenCalledWith(undefined, expect.objectContaining({ code: 'INVALID_RESOURCE_INPUT' }), undefined);
  });
  it('does not inherit retry or lifecycle overrides and ignores observer exceptions', async () => {
    const source = provider();
    source.create = vi.fn(async () => { throw new Error('failed'); });
    const app = mount(source);
    await ready(app);
    const inherited = vi.fn();
    app.client.setDefaultOptions({ mutations: { retry: 4, retryDelay: 0, onMutate: inherited, onError: inherited, onSettled: inherited } });
    await expect(app.read().create.mutation.mutateAsync({ variables }, {
      onError() { throw new Error('observer'); }, onSettled() { throw new Error('observer'); },
    })).rejects.toMatchObject({ code: 'CREATE_FAILED' });
    expect(inherited).not.toHaveBeenCalled();
    expect(source.create).toHaveBeenCalledTimes(1);
  });
  it.each(['success', 'failure'])('waits for every selected refresh before %s', async outcome => {
    const source = provider();
    if (outcome === 'failure') source.create = vi.fn(async () => { throw new Error('failed'); });
    const app = mount(source);
    await ready(app);
    const { builder, owner } = scopedKeys(app);
    app.client.setQueryData(builder.data.list('posts', { ...owner, extra: true }), {});
    const hold = deferred<void>();
    const invalidate = vi.spyOn(app.client, 'invalidateQueries')
      .mockRejectedValueOnce(new Error('refresh'))
      .mockImplementation(() => hold.promise);
    let settled = false;
    const operation = app.read().create.mutation.mutateAsync({ variables }).catch(() => undefined).finally(() => { settled = true; });
    await waitFor(() => expect(invalidate.mock.calls.length).toBeGreaterThan(1));
    expect(settled).toBe(false);
    hold.resolve();
    await operation;
  });
  it.each(['unchanged', 'resource', 'reset', 'new-call'])('guards late auth completion after %s', async change => {
    const source = provider();
    source.create = vi.fn(async () => { throw { statusCode: 401, message: 'secret' }; });
    const app = mount(source);
    const held = deferred<{ logout: boolean; redirectTo: string }>();
    const onError = vi.fn<NonNullable<AuthProvider['onError']>>(async error => {
      expect(error).toMatchObject({ statusCode: 401, message: 'Create failed' });
      if (typeof error === 'object' && error !== null) Object.assign(error, { message: 'modified' });
      return held.promise;
    });
    const go = vi.fn();
    await app.view.rerender({
      auth: { ...auth(), onError },
      router: { go, back: vi.fn(), parse: () => ({ params: {}, pathname: '/' }) },
    });
    await ready(app);
    await expect(app.read().create.mutation.mutateAsync({ variables })).rejects.toMatchObject({ message: 'Create failed' });
    expect(onError).toHaveBeenCalledTimes(1);
    if (change === 'resource') await app.view.rerender({ resource: 'other' });
    else if (change === 'reset') app.read().create.mutation.reset();
    else if (change === 'new-call') await expect(app.read().create.mutation.mutateAsync({ variables: {} })).rejects.toBeDefined();
    held.resolve({ logout: false, redirectTo: '/login' });
    if (change === 'unchanged') await waitFor(() => expect(go).toHaveBeenCalledWith({ to: '/login', type: 'push' }));
    else {
      await held.promise;
      await Promise.resolve();
      expect(go).not.toHaveBeenCalled();
    }
  });
});
