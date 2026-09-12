import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkError } from './hook-utils.svelte';
import { captureAdminContext, resetContext, setAuthProvider, setRouterProvider } from './context.svelte';
import type { AuthProvider, AuthActionResult } from './types';
import type { RouterProvider } from './router-provider';
import { flushSync } from 'svelte';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { Type } from '@sinclair/typebox';
import { defineResource, contractKey } from './resource-contract';
import { keys } from './query-keys';
import type { DataProvider } from './types';
import type { LiveEvent, LiveProvider } from './live.svelte';
import type { LiveSubscriptionParams } from './hook-utils.svelte';
import { setAdminOptions, resetAdminOptions } from './options.svelte';
import Host from './live-hooks.test-host.svelte';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureAuthLiveScope, resetLogoutVersion } from './auth-hooks.svelte';
import type { LiveAuthTestActions } from './live-auth.test.types';
import { definedOptions } from './defined-options';
import type { LiveHookTestState } from './live-hooks.test.types';
import { readOwnedDataQuery, invalidateOwnedQueries } from './query-invalidation';
import { useInvalidate } from './strict-hooks.svelte';
import * as legacyHooks from './hooks.svelte';

function setup(onError: AuthProvider['onError']) {
  const provider: AuthProvider = {
    login: async () => ({ success: true }),
    logout: vi.fn(async () => ({ success: true })),
    check: async () => ({ authenticated: false }),
    getIdentity: async () => null,
    ...(onError === undefined ? {} : { onError }),
  };
  const router: RouterProvider = {
    go: vi.fn(), back: vi.fn(), parse: () => ({ pathname: '/', params: {} }),
  };
  setAuthProvider(provider);
  setRouterProvider(router);
  return { provider, router, context: captureAdminContext() };
}

const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  resetLogoutVersion();
  resetAdminOptions();
  vi.restoreAllMocks();
});

describe('checkError', () => {
  it('does not navigate when logout cannot clear the session', async () => {
    const fixture = setup(async () => ({ logout: true, redirectTo: '/login' }));
    fixture.provider.logout = async () => { throw new Error('session could not be cleared'); };
    await checkError({ statusCode: 401 }, fixture.context);
    expect(fixture.router.go).not.toHaveBeenCalled();
  });

  it('rejects invalid JavaScript handler instructions through the shared data-hook entry', async () => {
    const fixture = setup(undefined);
    Reflect.set(fixture.provider, 'onError', async () => ({ logout: 'true', redirectTo: '//example.test' }));
    await checkError({ statusCode: 401 }, fixture.context);
    expect(fixture.provider.logout).not.toHaveBeenCalled();
    expect(fixture.router.go).not.toHaveBeenCalled();
  });

  it('drops a delayed response when the captured provider is replaced', async () => {
    let resolve = (_value: { logout: boolean }) => {};
    const fixture = setup(() => new Promise(done => { resolve = done; }));
    const pending = checkError({ statusCode: 401 }, fixture.context);
    setAuthProvider(null);
    resolve({ logout: true });
    await pending;
    expect(fixture.provider.logout).not.toHaveBeenCalled();
    expect(fixture.router.go).not.toHaveBeenCalled();
  });

  it('routes a numeric own 401 through the captured router without assertions', async () => {
    const fixture = setup(undefined);
    await checkError({ statusCode: 401 }, fixture.context);
    expect(fixture.router.go).toHaveBeenCalledWith({ to: '/login', type: 'push' });
  });

  it('does not subscribe a data-error effect to later auth session revisions', async () => {
    const handler = vi.fn(async (error: unknown) => error === 'expire' ? { logout: true } : {});
    const fixture = setup(handler);
    const dispose = $effect.root(() => {
      $effect(() => { void checkError('initial', fixture.context); });
    });
    try {
      await waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
      await checkError('expire', fixture.context);
      flushSync();
      expect(handler).toHaveBeenCalledTimes(2);
    } finally {
      dispose();
    }
  });
});

const record = Type.Object({ id: Type.Number(), title: Type.String() });
const posts = defineResource('posts', { record });
const replacement = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const resources = [{ name: 'posts', label: 'Posts', fields: [], contract: posts }];
const liveEvent: LiveEvent = { type: 'UPDATE', resource: 'posts', payload: { nested: { title: 'Original' } } };
type Settings = Omit<LiveSubscriptionParams, 'liveProvider'>;
type Mode = 'shared' | 'live' | 'subscription' | 'list' | 'one' | 'many' | 'infinite' | 'publish';
function dataProvider(): DataProvider {
  return {
    getApiUrl: () => '/api',
    getList: vi.fn(async () => ({ data: [{ id: 1, title: 'Post' }], total: 1 })),
    getOne: vi.fn(async ({ id }) => ({ data: { id, title: 'Post' } })),
    create: async () => ({ data: {} }), update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
  };
}
function thirdParty() {
  const subscriptions: Parameters<LiveProvider['subscribe']>[0][] = [];
  const cleanups: ReturnType<typeof vi.fn<() => void>>[] = [];
  const provider: LiveProvider = {
    subscribe: vi.fn(function(this: LiveProvider, params) {
      expect(this).toBe(provider);
      subscriptions.push(params);
      const release = vi.fn<() => void>(() => {});
      cleanups.push(release);
      return release;
    }),
    publish: vi.fn(),
  };
  return {
    provider, subscriptions, cleanups,
    emit(value: unknown, index = subscriptions.length - 1) {
      const params = subscriptions[index];
      if (!params) throw new Error('Expected a live subscription');
      Reflect.apply(params.callback, undefined, [value]);
    },
  };
}
function mountLive(mode: Mode = 'shared', settings: Settings = { resource: 'posts', liveMode: 'auto' }, live = thirdParty(),
  auth?: AuthProvider, onAuthReady?: (actions: LiveAuthTestActions) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(client);
  const data = dataProvider();
  let publish: (event: LiveEvent) => Promise<void> = async () => { throw new Error('Not mounted'); };
  let source: () => string = () => { throw new Error('Not mounted'); };
  let authScope: LiveHookTestState['authScope'] = () => { throw new Error('Not mounted'); };
  let invalidate: LiveHookTestState['invalidate'] = async () => { throw new Error('Not mounted'); };
  const view = render(Host, { mode, live: live.provider, data, resources, contract: posts, client, settings,
    ...definedOptions({ auth, onAuthReady }),
    onReady: (state: LiveHookTestState) => { publish = state.publish; source = state.source; authScope = state.authScope; invalidate = state.invalidate; } });
  return {
    view, client, live, data, source: () => source(), authScope: () => authScope(),
    publish: (event: LiveEvent) => publish(event),
    invalidate: (...args: Parameters<LiveHookTestState['invalidate']>) => invalidate(...args),
  };
}
function cacheFixture(app: ReturnType<typeof mountLive>, contract = posts, tenant = 'first', provider = 'default') {
  const source = app.source();
  const owned = { source, authSession: app.authScope().cacheKey };
  const base = { contract: contractKey(contract), tenant, provider };
  const builder = keys(base);
  const selected = [builder.data.list('posts', owned), builder.data.one('posts', 1, owned),
    builder.data.many('posts', { ...owned, ids: [1] }), builder.data.select('posts', owned),
    builder.data.infiniteList('posts', owned), builder.data.selectDefaults('posts', owned)];
  const excluded = [builder.data.list('posts'), builder.data.list('posts', { source }),
    builder.data.list('posts', { ...owned, source: 'foreign' }),
    builder.data.list('posts', { ...owned, authSession: 'foreign' }),
    builder.data.list('other', owned), keys({ ...base, tenant: 'foreign' }).data.list('posts', owned),
    keys({ ...base, provider: 'foreign' }).data.list('posts', owned),
    keys({ ...base, contract: contractKey(replacement) }).data.list('posts', owned),
    keys({ provider, tenant }).data.list('posts', owned), builder.task.list(owned)];
  for (const key of [...selected, ...excluded]) app.client.setQueryData(key, { data: [] });
  return { selected, excluded };
}
function pending<T = void>() {
  let resolve: (value: T) => void = () => { throw new Error('Not initialized'); };
  let reject: (reason: unknown) => void = () => { throw new Error('Not initialized'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

describe('checked live hooks', () => {
  it('strictly compiles changed hook boundaries, query consumers and mounted fixtures', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ['live-transport.ts', 'live-subscription.svelte.ts', 'live.svelte.ts', 'hook-utils.svelte.ts',
      'auth-hooks.svelte.ts', 'live-auth.test.types.ts', 'live-hooks.test.types.ts',
      'query-invalidation.ts', 'invalidation-contract.ts', 'strict-hooks.svelte.ts',
      'hooks.svelte.ts', 'query-hooks.svelte.ts', 'hook-utils.test.svelte.ts'].map(file => resolve(directory, file));
    const virtual = new Map(['live-hooks.test-host.svelte', 'live-hooks.test-probe.svelte'].map(file => {
      const filename = resolve(directory, file);
      return [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code];
    }));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false,
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: ['svelte', 'node'], jsx: ts.JsxEmit.Preserve, allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = file => virtual.get(file) ?? read(file);
    host.fileExists = file => virtual.has(file) || exists(file);
    host.resolveModuleNames = (names, from) => names.map(name => {
      const file = resolve(dirname(from), `${name}.tsx`);
      return virtual.has(file) ? { resolvedFileName: file, extension: ts.Extension.Tsx }
        : ts.resolveModuleName(name, from, options, host).resolvedModule;
    });
    const targets = [...sources, ...virtual.keys()];
    const program = ts.createProgram([...targets, resolve(directory, '../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
      resolve(directory, '../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts')], options, host);
    const diagnostics = targets.flatMap(file => {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Missing ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(diagnostics.map(diagnostic => `${diagnostic.file?.fileName}:${diagnostic.start}: ${
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`)).toEqual([]);
  });

  it.each(['shared', 'live', 'subscription'] as const)('%s rejects invalid events and mismatched resources', async mode => {
    const observed = vi.fn();
    const app = mountLive(mode, { resource: 'posts', liveMode: 'auto', onLiveEvent: observed });
    await waitFor(() => expect(app.live.subscriptions).toHaveLength(1));
    const { selected } = cacheFixture(app);
    const getter = vi.fn(() => 'UPDATE');
    for (const value of [null, {}, [], { ...liveEvent, type: 'OTHER' }, { ...liveEvent, resource: 'other' },
      { ...liveEvent, payload: null }, { ...liveEvent, payload: [] }, { ...liveEvent, extra: true },
      { ...liveEvent, payload: { bad: Infinity } },
      Object.defineProperty({ resource: 'posts', payload: {} }, 'type', { enumerable: true, get: getter })]) app.live.emit(value);
    expect(observed).not.toHaveBeenCalled();
    expect(getter).not.toHaveBeenCalled();
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
    app.live.emit(liveEvent);
    expect(observed).toHaveBeenCalledTimes(1);
  });

  it.each(['shared', 'live'] as const)('%s invalidates only the captured contract, tenant and source', async mode => {
    const observed = vi.fn((event: LiveEvent) => {
      event.resource = 'other';
      event.payload['nested'] = false;
      throw new Error('Observer failed');
    });
    const app = mountLive(mode, { resource: 'posts', liveMode: 'auto', onLiveEvent: observed });
    await waitFor(() => expect(app.live.subscriptions).toHaveLength(1));
    const { selected, excluded } = cacheFixture(app);
    app.live.emit(liveEvent);
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of excluded) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
    expect(liveEvent.resource).toBe('posts');
  });

  it('does not refresh another provider tree sharing the same query client', async () => {
    const app = mountLive();
    await waitFor(() => expect(app.live.subscriptions).toHaveLength(1));
    const first = cacheFixture(app);
    const live = thirdParty();
    let source: (() => string) | undefined;
    render(Host, { live: live.provider, data: dataProvider(), resources, contract: posts, client: app.client,
      settings: { resource: 'posts', liveMode: 'auto' }, onReady: (state: LiveHookTestState) => { source = state.source; } });
    await waitFor(() => expect(live.subscriptions).toHaveLength(1));
    if (!source) throw new Error('Expected the second source');
    const second = keys({ tenant: 'first', contract: contractKey(posts) }).data.list('posts', { source: source(), authSession: 'anonymous' });
    app.client.setQueryData(second, {});
    app.live.emit(liveEvent);
    expect(app.client.getQueryState(first.selected[0] ?? [])?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(second)?.isInvalidated).toBe(false);
    live.emit(liveEvent);
    expect(app.client.getQueryState(second)?.isInvalidated).toBe(true);
  });

  it('captures the named data-provider route without refreshing the default route', async () => {
    const app = mountLive();
    await app.view.rerender({ data: { default: app.data, cms: dataProvider() },
      resources: [{ name: 'posts', label: 'Posts', fields: [], contract: posts, provider: { dataProviderName: 'cms' } }] });
    const { selected } = cacheFixture(app, posts, 'first', 'cms');
    const excluded = keys({ provider: 'default', tenant: 'first', contract: contractKey(posts) })
      .data.list('posts', { source: app.source() });
    app.client.setQueryData(excluded, {});
    app.live.emit(liveEvent);
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(excluded)?.isInvalidated).toBe(false);
  });

  it('keeps local/global event copies independent and contains async failures', async () => {
    const local = vi.fn(async (event: LiveEvent) => { event.payload['nested'] = false; throw new Error('Observer failed'); });
    const global = vi.fn();
    const app = mountLive('shared', { resource: 'posts', liveMode: 'auto', onLiveEvent: local, onGlobalLiveEvent: global });
    await waitFor(() => expect(app.live.subscriptions).toHaveLength(1));
    app.live.emit(liveEvent);
    await Promise.resolve();
    expect(global).toHaveBeenCalledWith(liveEvent);
    expect(local.mock.calls[0]?.[0]).not.toBe(global.mock.calls[0]?.[0]);
  });

  it.each(['shared', 'live', 'subscription'] as const)('%s captures metadata without sharing it with the provider', async mode => {
    const live = thirdParty();
    const subscribe = live.provider.subscribe;
    live.provider.subscribe = function(params) {
      const result = subscribe.call(live.provider, params);
      Reflect.set(params.liveParams ?? {}, 'nested', 'provider mutation');
      return result;
    };
    const metadata = { nested: { filter: 'original' } };
    const app = mountLive(mode, { resource: 'posts', liveMode: 'manual', liveParams: metadata }, live);
    await waitFor(() => expect(live.subscriptions).toHaveLength(1));
    expect(metadata).toEqual({ nested: { filter: 'original' } });
    await app.view.rerender({ settings: { resource: 'posts', liveMode: 'manual', liveParams: { nested: { filter: 'next' } } } });
    await waitFor(() => expect(live.subscriptions).toHaveLength(2));
    expect(live.cleanups[0]).toHaveBeenCalledTimes(1);
  });

  it.each(['tenant', 'auth', 'router', 'data', 'live', 'contract', 'resource', 'disabled', 'unmount'] as const)(
    'ignores retired callbacks after %s changes', async change => {
      const observed = vi.fn();
      const settings: Settings = { resource: 'posts', liveMode: 'auto', onLiveEvent: observed };
      const app = mountLive('shared', settings);
      await waitFor(() => expect(app.live.subscriptions).toHaveLength(1));
      const { selected } = cacheFixture(app);
      if (change === 'tenant') await app.view.rerender({ tenant: 'next' });
      if (change === 'auth') await app.view.rerender({ auth: {
        login: async () => ({ success: true }), logout: async () => ({ success: true }),
        check: async () => ({ authenticated: true }), getIdentity: async () => null,
      } });
      if (change === 'router') await app.view.rerender({ router: { go: vi.fn(), back: vi.fn(), parse: () => ({ pathname: '/', params: {} }) } });
      if (change === 'data') await app.view.rerender({ data: dataProvider() });
      if (change === 'live') await app.view.rerender({ live: thirdParty().provider });
      if (change === 'contract') await app.view.rerender({ settings: { ...settings, contract: replacement } });
      if (change === 'resource') await app.view.rerender({ settings: { ...settings, resource: 'other' } });
      if (change === 'disabled') await app.view.rerender({ settings: { ...settings, enabled: false } });
      if (change === 'unmount') app.view.unmount();
      app.live.emit(liveEvent, 0);
      expect(observed).not.toHaveBeenCalled();
      for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
      expect(app.live.cleanups[0]).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['enabled', 'liveMode', 'onLiveEvent', 'liveParams', 'resource', 'dataProviderName'] as const)(
    'fails closed for invalid %s settings', async field => {
      const settings: Settings = { resource: 'posts', liveMode: 'auto' };
      Reflect.set(settings, field, field === 'enabled' ? 'true' : field === 'liveParams' ? new Date() : 1);
      const app = mountLive('shared', settings);
      await Promise.resolve();
      flushSync();
      expect(app.live.subscriptions).toHaveLength(0);
    },
  );

  it('does not fall back from an absent named data provider or refresh all resources for auto wildcard', async () => {
    const app = mountLive('shared', { resource: 'posts', liveMode: 'auto', dataProviderName: 'missing' });
    await Promise.resolve();
    expect(app.live.subscriptions).toHaveLength(0);
    await app.view.rerender({ settings: { resource: '*', liveMode: 'auto' } });
    expect(app.live.subscriptions).toHaveLength(0);
  });

  it.each(['shared', 'live', 'subscription'] as const)('%s supports manual wildcard without touching caches', async mode => {
    const observed = vi.fn();
    const app = mountLive(mode, { resource: '*', liveMode: 'manual', onLiveEvent: observed });
    await waitFor(() => expect(app.live.subscriptions).toHaveLength(1));
    const key = keys().data.list('posts');
    app.client.setQueryData(key, {});
    app.live.emit(liveEvent);
    expect(observed).toHaveBeenCalledWith(liveEvent);
    expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it('manual subscription does not require a configured data provider', async () => {
    const app = mountLive('subscription', { resource: 'channel', onLiveEvent: vi.fn() });
    await app.view.rerender({ data: {} });
    await waitFor(() => expect(app.live.subscriptions.length).toBeGreaterThan(0));
    app.live.emit({ type: 'INSERT', resource: 'channel', payload: {} });
  });

  it.each(['throw', 'invalid', 'async'] as const)('quarantines synchronous events from a subscription with %s cleanup', async outcome => {
    const observed = vi.fn();
    const live = thirdParty();
    const release = vi.fn();
    Reflect.set(live.provider, 'subscribe', (params: Parameters<LiveProvider['subscribe']>[0]) => {
      params.callback(liveEvent);
      if (outcome === 'throw') throw new Error('PRIVATE');
      return outcome === 'async' ? Promise.resolve(release) : false;
    });
    mountLive('shared', { resource: 'posts', liveMode: 'auto', onLiveEvent: observed }, live);
    await Promise.resolve();
    flushSync();
    expect(observed).not.toHaveBeenCalled();
    if (outcome === 'async') await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
  });

  it('delivers synchronous subscription events only after a valid cleanup is returned', async () => {
    const events: string[] = [];
    const observed = vi.fn(() => { events.push('event'); });
    const live = thirdParty();
    const release = vi.fn();
    live.provider.subscribe = params => {
      params.callback(liveEvent);
      events.push('subscribed');
      return release;
    };
    const app = mountLive('shared', { resource: 'posts', liveMode: 'auto', onLiveEvent: observed }, live);
    await waitFor(() => expect(observed).toHaveBeenCalledTimes(1));
    expect(events).toEqual(['subscribed', 'event']);
    app.view.unmount();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('contains a failed cache refresh without leaking an unhandled rejection', async () => {
    const app = mountLive();
    await waitFor(() => expect(app.live.subscriptions).toHaveLength(1));
    const { selected } = cacheFixture(app);
    vi.spyOn(app.client, 'invalidateQueries').mockRejectedValue(new Error('PRIVATE cache failure'));
    app.live.emit(liveEvent);
    await Promise.resolve();
    expect(app.client.invalidateQueries).toHaveBeenCalledTimes(selected.length);
  });

  it('contains synchronous and asynchronous cleanup failures after disabling', async () => {
    const live = thirdParty();
    const cleanup = vi.fn(async () => { throw new Error('PRIVATE cleanup'); });
    live.provider.subscribe = () => cleanup;
    const app = mountLive('shared');
    await app.view.rerender({ live: live.provider });
    await app.view.rerender({ settings: { resource: 'posts', liveMode: 'off' } });
    await waitFor(() => expect(cleanup).toHaveBeenCalledTimes(1));
  });

  it.each(['live', 'subscription'] as const)('%s retires its public wrapper callback after disabling', async mode => {
    const observed = vi.fn();
    const app = mountLive(mode, { resource: 'posts', liveMode: 'auto', onLiveEvent: observed });
    await waitFor(() => expect(app.live.subscriptions).toHaveLength(1));
    await app.view.rerender({ settings: { resource: 'posts', liveMode: 'off', enabled: false, onLiveEvent: observed } });
    app.live.emit(liveEvent, 0);
    expect(observed).not.toHaveBeenCalled();
    expect(app.live.cleanups[0]).toHaveBeenCalledTimes(1);
  });

  it.each(['list', 'one', 'many', 'infinite'] as const)('%s query subscriptions retain the bound contract and isolated observers', async mode => {
    const global = vi.fn();
    setAdminOptions({ onLiveEvent: global });
    const local = vi.fn((event: LiveEvent) => { event.resource = 'other'; throw new Error('Observer'); });
    const app = mountLive(mode, { resource: 'posts', liveMode: 'auto', onLiveEvent: local });
    await waitFor(() => expect(app.live.subscriptions).toHaveLength(1));
    await waitFor(() => expect(app.client.isFetching()).toBe(0));
    const source = app.source();
    const selected = keys({ provider: 'default', tenant: 'first', contract: contractKey(posts) })
      .data.list('posts', { source, authSession: app.authScope().cacheKey, fixture: true });
    const excluded = keys({ provider: 'default', tenant: 'first' }).data.list('posts', { source, authSession: app.authScope().cacheKey, fixture: true });
    app.client.setQueryData(selected, {});
    app.client.setQueryData(excluded, {});
    const reader = mode === 'list' || mode === 'infinite' ? app.data.getList : app.data.getOne;
    const before = vi.mocked(reader).mock.calls.length;
    app.live.emit(liveEvent);
    expect(global).toHaveBeenCalledWith(liveEvent);
    expect(app.client.getQueryState(selected)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(excluded)?.isInvalidated).toBe(false);
    await waitFor(() => expect(reader).toHaveBeenCalledTimes(before + 1));
    await waitFor(() => expect(app.client.isFetching()).toBe(0));
  });
});

function refreshContractTypes(client: QueryClient) {
  const refresh = useInvalidate({ resource: posts });
  void refresh({ id: 1, invalidates: ['detail'] });
  // @ts-expect-error The bound schema requires a numeric identifier.
  void refresh({ id: '1' });
  // @ts-expect-error Refresh scopes form a closed vocabulary.
  void refresh({ invalidates: ['custom'] });
  // @ts-expect-error An unbound resource cannot construct the public invalidator.
  useInvalidate({ resource: 'posts' });
  // @ts-expect-error Source identity alone does not identify a cache owner.
  readOwnedDataQuery([], { resource: 'posts' }, { source: 'provider' });
  void invalidateOwnedQueries({
    client, matcher: { resource: 'posts' }, owner: { source: 'provider', authSession: 'session' },
    // @ts-expect-error Internal dispatch also requires a closed refresh scope.
    scopes: ['custom'], current: () => true,
  });
}
void refreshContractTypes;

describe('session-owned refresh', () => {
  it('removes the legacy unscoped hook export', () => {
    expect(Object.hasOwn(legacyHooks, 'useInvalidate')).toBe(false);
  });

  it.each(['list', 'one', 'many', 'infinite'] as const)('explicitly refreshes the mounted %s reader', async mode => {
    const app = mountLive(mode);
    const reader = mode === 'list' || mode === 'infinite' ? app.data.getList : app.data.getOne;
    await waitFor(() => expect(reader).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(app.client.isFetching()).toBe(0));
    await app.invalidate();
    expect(reader).toHaveBeenCalledTimes(2);
    expect(app.client.isFetching()).toBe(0);
  });

  it.each([
    { invalidates: undefined, actions: ['list', 'one', 'many', 'select', 'infiniteList', 'selectDefaults'] },
    { invalidates: 'all', actions: ['list', 'one', 'many', 'select', 'infiniteList', 'selectDefaults'] },
    { invalidates: ['resourceAll'], actions: ['list', 'one', 'many', 'select', 'infiniteList', 'selectDefaults'] },
    { invalidates: ['list'], actions: ['list', 'select', 'infiniteList', 'selectDefaults'] },
    { invalidates: ['many'], actions: ['many'] },
    { invalidates: ['detail'], actions: ['one'] },
    { invalidates: [], actions: [] },
    { invalidates: false, actions: [] },
  ] satisfies { invalidates: NonNullable<Parameters<LiveHookTestState['invalidate']>[0]>['invalidates']; actions: string[] }[])(
    'honors scope $invalidates without inferring ownership', async ({ invalidates, actions }) => {
      const app = mountLive();
      const { selected, excluded } = cacheFixture(app);
      await app.invalidate(definedOptions({ invalidates }));
      for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(actions.some(action => action === key[0].action));
      for (const key of excluded) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
    });

  it('limits detail invalidation to the checked contract identifier', async () => {
    const app = mountLive();
    const { selected } = cacheFixture(app);
    const other = keys({ tenant: 'first', contract: contractKey(posts) }).data.one('posts', 2, {
      source: app.source(), authSession: app.authScope().cacheKey,
    });
    app.client.setQueryData(other, {});
    await app.invalidate({ id: 1, invalidates: ['detail'] });
    expect(app.client.getQueryState(other)?.isInvalidated).toBe(false);
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(key[0].action === 'one');
  });

  it('rejects invalid input and accessors before dispatch', async () => {
    const app = mountLive();
    cacheFixture(app);
    const dispatch = vi.spyOn(app.client, 'invalidateQueries');
    const getter = vi.fn(() => ['resourceAll']);
    for (const input of [null, [], { id: '1' }, { id: Infinity }, { invalidates: ['unknown'] }, { extra: true },
      Object.defineProperty({}, 'invalidates', { enumerable: true, get: getter })]) {
      await expect(Reflect.apply(app.invalidate, undefined, [input])).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    }
    expect(getter).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not execute key or owner getters and rejects malformed ownership', () => {
    const owner = { source: 'provider', authSession: 'session' };
    const matcher = { resource: 'posts' };
    const valid = keys().data.list('posts', owner);
    expect(readOwnedDataQuery(valid, matcher, owner)?.action).toBe('list');
    const getter = vi.fn(() => 'provider');
    const accessor = Object.defineProperty({ authSession: 'session' }, 'source', { enumerable: true, get: getter });
    const inherited: unknown = Object.create(owner);
    for (const params of [undefined, {}, { source: 'provider' }, { ...owner, authSession: '' },
      { ...owner, source: 1 }, accessor, inherited]) {
      expect(readOwnedDataQuery(keys().data.list('posts', params), matcher, owner)).toBeUndefined();
    }
    expect(readOwnedDataQuery(valid, matcher, Object.defineProperty({ ...owner }, 'source', { get: getter }))).toBeUndefined();
    expect(readOwnedDataQuery([Object.defineProperty({ ...valid[0] }, 'params', { get: getter })], matcher, owner)).toBeUndefined();
    expect(readOwnedDataQuery([{ ...valid[0], action: 'foreign' }], matcher, owner)).toBeUndefined();
    expect(getter).not.toHaveBeenCalled();
  });

  it('captures the current session at invocation and never refreshes prior revisions', async () => {
    const app = await mountSession();
    const saved = app.invalidate;
    const previous = cacheFixture(app);
    await app.actions.logout.mutate();
    const dispatch = vi.spyOn(app.client, 'invalidateQueries');
    await expect(saved()).rejects.toMatchObject({ code: 'REFRESH_SUPERSEDED' });
    expect(dispatch).not.toHaveBeenCalled();
    await app.actions.login.mutate({});
    for (const key of previous.selected) app.client.setQueryData(key, {});
    const current = cacheFixture(app);
    await saved();
    for (const key of previous.selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
    for (const key of current.selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
    await app.view.rerender({ visible: false });
    dispatch.mockClear();
    await expect(saved()).rejects.toMatchObject({ code: 'REFRESH_SUPERSEDED' });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each(['explicit', 'live'] as const)('%s stops remaining dispatches after reentrant session changes', async mode => {
    const app = await mountSession();
    const { selected } = cacheFixture(app);
    const gate = pending<AuthActionResult>();
    vi.mocked(app.auth.login).mockReturnValue(gate.promise);
    let login: Promise<AuthActionResult> | undefined;
    const release = app.client.getQueryCache().subscribe(event => {
      if (event.type === 'updated' && event.action.type === 'invalidate' && !login) login = app.actions.login.mutate({});
    });
    const dispatch = vi.spyOn(app.client, 'invalidateQueries');
    if (mode === 'explicit') await expect(app.invalidate()).rejects.toMatchObject({ code: 'REFRESH_SUPERSEDED' });
    else app.live.emit(liveEvent);
    expect(dispatch).toHaveBeenCalledTimes(1);
    for (const key of selected.slice(1)) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
    release();
    gate.resolve({ success: true });
    await login;
  });

  it.each(['tenant', 'contract', 'source', 'route', 'unmount'] as const)(
    'stops remaining dispatches after a reentrant %s change', async change => {
      const app = mountLive();
      cacheFixture(app);
      let changed = false;
      const release = app.client.getQueryCache().subscribe(event => {
        if (event.type !== 'updated' || event.action.type !== 'invalidate' || changed) return;
        changed = true;
        flushSync(() => {
          if (change === 'tenant') void app.view.rerender({ tenant: 'second' });
          if (change === 'contract') void app.view.rerender({ contract: replacement });
          if (change === 'source') void app.view.rerender({ data: dataProvider() });
          if (change === 'route') void app.view.rerender({
            data: { default: app.data, cms: app.data },
            resources: [{ name: 'posts', label: 'Posts', fields: [], contract: posts, provider: { dataProviderName: 'cms' } }],
          });
          if (change === 'unmount') app.view.unmount();
        });
      });
      const dispatch = vi.spyOn(app.client, 'invalidateQueries');
      await expect(app.invalidate()).rejects.toMatchObject({ code: 'REFRESH_SUPERSEDED' });
      expect(dispatch).toHaveBeenCalledTimes(1);
      release();
    });

  it.each(['failure', 'synchronous-failure', 'superseded'] as const)('awaits every started refresh before reporting %s', async outcome => {
    const app = mountLive();
    const { selected } = cacheFixture(app);
    const gate = pending();
    vi.spyOn(app.client, 'invalidateQueries')
      .mockImplementationOnce(() => {
        if (outcome === 'synchronous-failure') throw new Error('PRIVATE synchronous failure');
        return Promise.reject(new Error('PRIVATE early failure'));
      }).mockReturnValue(gate.promise);
    let settled = false;
    const result = app.invalidate().catch((cause: unknown) => cause).finally(() => { settled = true; });
    expect(app.client.invalidateQueries).toHaveBeenCalledTimes(selected.length);
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    if (outcome === 'superseded') await app.view.rerender({ tenant: 'second' });
    gate.resolve();
    expect(await result).toMatchObject(outcome === 'superseded'
      ? { message: 'Refresh is no longer current', code: 'REFRESH_SUPERSEDED' }
      : { message: 'Refresh failed', code: 'REFRESH_FAILED' });
  });

  it('contains synchronous cache selection failures', async () => {
    const app = mountLive();
    vi.spyOn(app.client.getQueryCache(), 'findAll').mockImplementationOnce(() => { throw new Error('PRIVATE cache failure'); });
    await expect(app.invalidate()).rejects.toMatchObject({ message: 'Refresh failed', code: 'REFRESH_FAILED' });
  });

  it('isolates independent auth trees sharing both the raw provider and cache client', async () => {
    const app = await mountSession();
    const first = cacheFixture(app);
    const auth = sessionProvider();
    const live = thirdParty();
    let state: LiveHookTestState | undefined;
    render(Host, {
      data: app.data, client: app.client, live: live.provider, auth, resources, contract: posts,
      settings: { resource: 'posts', liveMode: 'auto' }, onAuthReady: () => {},
      onReady: (value: LiveHookTestState) => { state = value; },
    });
    await waitFor(() => expect(live.subscriptions.length).toBeGreaterThan(0));
    if (!state) throw new Error('Expected the second mounted tree');
    const second = state;
    expect(second.source()).toBe(app.source());
    expect(second.authScope().cacheKey).not.toBe(app.authScope().cacheKey);
    const key = keys({ tenant: 'first', contract: contractKey(posts) }).data.list('posts', {
      source: second.source(), authSession: second.authScope().cacheKey,
    });
    app.client.setQueryData(key, {});
    await app.invalidate();
    app.live.emit(liveEvent);
    expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
    for (const old of first.selected) app.client.setQueryData(old, {});
    await second.invalidate();
    live.emit(liveEvent);
    expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const old of first.selected) expect(app.client.getQueryState(old)?.isInvalidated).toBe(false);
  });
});

describe('checked publication', () => {
  it('validates and detaches publication data while preserving the provider receiver', async () => {
    const live = thirdParty();
    live.provider.publish = vi.fn(function(this: LiveProvider, value) {
      expect(this).toBe(live.provider);
      value.payload['nested'] = false;
    });
    const app = mountLive('publish', { resource: 'posts' }, live);
    const getter = vi.fn(() => 'UPDATE');
    await expect(Reflect.apply(app.publish, undefined, [Object.defineProperty({ resource: 'posts', payload: {} }, 'type', { get: getter })]))
      .rejects.toMatchObject({ code: 'INVALID_LIVE_EVENT' });
    expect(getter).not.toHaveBeenCalled();
    expect(live.provider.publish).not.toHaveBeenCalled();
    await expect(app.publish(liveEvent)).resolves.toBeUndefined();
    expect(liveEvent.payload['nested']).toEqual({ title: 'Original' });
  });

  it('sanitizes provider errors and rejects absent publication methods', async () => {
    const live = thirdParty();
    live.provider.publish = () => { throw new Error('PRIVATE'); };
    const app = mountLive('publish', { resource: 'posts' }, live);
    await expect(app.publish(liveEvent)).rejects.toMatchObject({
      message: 'Live publication failed', code: 'LIVE_PUBLISH_FAILED', details: { writeMayHaveSucceeded: true },
    });
    await app.view.rerender({ live: { subscribe: () => () => {} } });
    await expect(app.publish(liveEvent)).rejects.toMatchObject({ details: { writeMayHaveSucceeded: false } });
  });

  it.each(['tenant', 'provider', 'unmount'] as const)('rejects an obsolete publication after %s changes', async change => {
    const gate = pending();
    const live = thirdParty();
    live.provider.publish = vi.fn(() => gate.promise);
    const app = mountLive('publish', { resource: 'posts' }, live);
    const result = app.publish(liveEvent).catch((cause: unknown) => cause);
    expect(live.provider.publish).toHaveBeenCalledTimes(1);
    if (change === 'tenant') await app.view.rerender({ tenant: 'next' });
    if (change === 'provider') await app.view.rerender({ live: thirdParty().provider });
    if (change === 'unmount') await app.view.rerender({ visible: false });
    gate.resolve();
    expect(await result).toMatchObject({ code: 'LIVE_PUBLISH_FAILED', details: { writeMayHaveSucceeded: true } });
  });
});

function sessionProvider(): AuthProvider {
  return {
    login: vi.fn(async () => ({ success: true })),
    logout: vi.fn(async () => ({ success: true })),
    register: vi.fn(async () => ({ success: true })),
    forgotPassword: vi.fn(async () => ({ success: true })),
    updatePassword: vi.fn(async () => ({ success: true })),
    updateIdentity: vi.fn(async () => ({ success: true })),
    updateProfile: vi.fn(async () => ({ success: true })),
    check: vi.fn(async () => ({ authenticated: true })),
    getIdentity: vi.fn(async () => ({ id: 'reader' })),
  };
}
async function mountSession(auth = sessionProvider(), mode: Mode = 'shared') {
  const observed = vi.fn();
  let controls: LiveAuthTestActions | undefined;
  const app = mountLive(mode, { resource: 'posts', liveMode: 'auto', onLiveEvent: observed },
    thirdParty(), auth, value => { controls = value; });
  await app.view.rerender({ router: { go: vi.fn(), back: vi.fn(), parse: () => ({ pathname: '/', params: {} }) } });
  await waitFor(() => expect(controls?.check.isLoading).toBe(false));
  if (!controls) throw new Error('Expected mounted authentication controls');
  const actions = controls;
  await waitFor(() => expect(captureAuthLiveScope(auth).available).toBe(true));
  if (mode !== 'publish') await waitFor(() => expect(app.live.subscriptions.length).toBeGreaterThan(0));
  return { ...app, auth, actions, observed };
}
type SessionAction = 'login' | 'logout' | 'register' | 'updatePassword' | 'updateIdentity' | 'updateProfile';
function invokeSessionAction(actions: LiveAuthTestActions, action: SessionAction): Promise<AuthActionResult> {
  switch (action) {
    case 'login': return actions.login.mutate({});
    case 'logout': return actions.logout.mutate();
    case 'register': return actions.register.mutate({});
    case 'updatePassword': return actions.updatePassword.mutate({});
    case 'updateIdentity': return actions.updateIdentity.mutate({ id: 'reader' });
    case 'updateProfile': return actions.updateProfile.mutate({ name: 'Updated' });
  }
}
function readonlyAuthScopeTypes(auth: AuthProvider) {
  const scope = captureAuthLiveScope(auth);
  // @ts-expect-error Consumers cannot edit the capability snapshot.
  scope.available = true;
  // @ts-expect-error Session state is private, not an exposed mutable handle.
  scope.liveRevision = 10;
}
void readonlyAuthScopeTypes;

describe('realtime authentication session revisions', () => {
  it('exposes a frozen capability snapshot instead of mutable session internals', async () => {
    const app = await mountSession();
    const scope = captureAuthLiveScope(app.auth);
    expect(Object.isFrozen(scope)).toBe(true);
    expect(Reflect.set(scope, 'available', false)).toBe(false);
    expect(scope.available && scope.isCurrent()).toBe(true);
    await app.actions.check.refetch();
    expect(scope.isCurrent()).toBe(false);
    expect(captureAuthLiveScope(app.auth).available).toBe(true);
  });

  it.each(['login', 'logout', 'register', 'updatePassword', 'updateIdentity', 'updateProfile'] as const)(
    '%s suspends events immediately and never revives saved callbacks', async action => {
      const app = await mountSession();
      const gate = pending<AuthActionResult>();
      Reflect.set(app.auth, action, vi.fn(() => gate.promise));
      const baseline = app.live.subscriptions.length;
      const captured = captureAuthLiveScope(app.auth);
      const { selected } = cacheFixture(app);
      const operation = invokeSessionAction(app.actions, action);
      expect(captured.isCurrent()).toBe(false);
      expect(captureAuthLiveScope(app.auth).available).toBe(false);
      app.live.emit(liveEvent, baseline - 1);
      expect(app.observed).not.toHaveBeenCalled();
      for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
      flushSync();
      expect(app.live.subscriptions).toHaveLength(baseline);
      await expect(app.publish(liveEvent)).rejects.toMatchObject({ details: { writeMayHaveSucceeded: false } });
      gate.resolve({ success: true });
      expect(await operation).toMatchObject({ success: true });
      if (action === 'logout') {
        flushSync();
        expect(captureAuthLiveScope(app.auth).available).toBe(false);
        expect(app.live.subscriptions).toHaveLength(baseline);
      } else {
        await waitFor(() => expect(app.live.subscriptions.length).toBeGreaterThan(baseline));
        app.live.emit(liveEvent);
        expect(app.observed).toHaveBeenCalledTimes(1);
      }
      app.live.emit(liveEvent, baseline - 1);
      expect(captured.isCurrent()).toBe(false);
      expect(app.observed).toHaveBeenCalledTimes(action === 'logout' ? 0 : 1);
    },
  );

  it.each(['shared', 'live', 'subscription', 'list', 'one', 'many', 'infinite'] as const)(
    '%s observes same-provider session replacement', async mode => {
      const app = await mountSession(sessionProvider(), mode);
      const baseline = app.live.subscriptions.length;
      expect(await app.actions.login.mutate({})).toMatchObject({ success: true });
      await waitFor(() => expect(app.live.subscriptions.length).toBeGreaterThan(baseline));
      app.live.emit(liveEvent, baseline - 1);
      expect(app.observed).not.toHaveBeenCalled();
      app.live.emit(liveEvent);
      expect(app.observed).toHaveBeenCalledTimes(1);
    },
  );

  it('preserves realtime access on invalid preflight and password-reset requests', async () => {
    const app = await mountSession();
    const scope = captureAuthLiveScope(app.auth);
    const baseline = app.live.subscriptions.length;
    await expect(Reflect.apply(app.actions.login.mutate, app.actions.login, [new Date()]))
      .resolves.toMatchObject({ success: false, error: { name: 'INVALID_AUTH_INPUT' } });
    expect(scope.isCurrent()).toBe(true);
    await expect(app.actions.forgotPassword.mutate({})).resolves.toMatchObject({ success: true });
    expect(scope.isCurrent()).toBe(true);
    flushSync();
    expect(app.live.subscriptions).toHaveLength(baseline);
    app.live.emit(liveEvent);
    expect(app.observed).toHaveBeenCalledTimes(1);
  });

  it.each(['reject', 'throw', 'invalid'] as const)('handles a %s result without assuming an unconfirmed session is usable', async outcome => {
    const app = await mountSession();
    Reflect.set(app.auth, 'login', async () => {
      if (outcome === 'throw') throw new Error('PRIVATE');
      return outcome === 'reject' ? { success: false } : { success: 'yes' };
    });
    const original = captureAuthLiveScope(app.auth);
    const baseline = app.live.subscriptions.length;
    expect(await app.actions.login.mutate({})).toMatchObject({ success: false });
    flushSync();
    expect(original.isCurrent()).toBe(false);
    expect(captureAuthLiveScope(app.auth).available).toBe(outcome === 'reject');
    app.live.emit(liveEvent, baseline - 1);
    expect(app.observed).not.toHaveBeenCalled();
    if (outcome !== 'reject') {
      expect(app.live.subscriptions).toHaveLength(baseline);
      await expect(app.publish(liveEvent)).rejects.toMatchObject({ details: { writeMayHaveSucceeded: false } });
      await app.actions.check.refetch();
      await waitFor(() => expect(captureAuthLiveScope(app.auth).available).toBe(true));
      expect(app.live.subscriptions.length).toBeGreaterThan(baseline);
    }
  });

  it('does not let rejected login or successful registration/profile update undo confirmed logout', async () => {
    const app = await mountSession();
    app.auth.check = vi.fn(async () => ({ authenticated: false }));
    await app.actions.logout.mutate();
    const count = app.live.subscriptions.length;
    app.auth.login = vi.fn(async () => ({ success: false }));
    await app.actions.login.mutate({});
    await app.actions.register.mutate({});
    await app.actions.updateProfile.mutate({ name: 'Updated' });
    flushSync();
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    expect(app.live.subscriptions).toHaveLength(count);
    app.auth.login = vi.fn(async () => ({ success: true }));
    app.auth.check = vi.fn(async () => ({ authenticated: true }));
    await app.actions.login.mutate({});
    await waitFor(() => expect(captureAuthLiveScope(app.auth).available).toBe(true));
    expect(app.live.subscriptions.length).toBeGreaterThan(count);
  });

  it('does not allow an older successful login to reopen a session after a newer logout', async () => {
    const app = await mountSession();
    const old = pending<AuthActionResult>();
    app.auth.login = vi.fn(() => old.promise);
    const login = app.actions.login.mutate({});
    await app.actions.logout.mutate();
    old.resolve({ success: true });
    expect(await login).toMatchObject({ success: false, error: { name: 'AUTH_RESULT_SUPERSEDED' } });
    flushSync();
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
  });

  it('does not restore a session when a newer rejection leaves an older operation unresolved', async () => {
    const app = await mountSession();
    const old = pending<AuthActionResult>();
    app.auth.login = vi.fn(() => old.promise);
    app.auth.logout = vi.fn(async () => ({ success: false }));
    const login = app.actions.login.mutate({});
    expect(await app.actions.logout.mutate()).toMatchObject({ success: false });
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    await app.actions.check.refetch();
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    old.resolve({ success: true });
    expect(await login).toMatchObject({ success: false, error: { name: 'AUTH_RESULT_SUPERSEDED' } });
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    await app.actions.check.refetch();
    expect(captureAuthLiveScope(app.auth).available).toBe(true);
  });

  it('does not grant access from a newer login while an older logout can still finish', async () => {
    const app = await mountSession();
    const old = pending<AuthActionResult>();
    app.auth.logout = vi.fn(() => old.promise);
    const logout = app.actions.logout.mutate();
    expect(await app.actions.login.mutate({})).toMatchObject({ success: true });
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    await app.actions.check.refetch();
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    old.resolve({ success: true });
    expect(await logout).toMatchObject({ success: false, error: { name: 'AUTH_RESULT_SUPERSEDED' } });
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    await app.actions.check.refetch();
    expect(captureAuthLiveScope(app.auth).available).toBe(true);
  });

  it('can resume when older requests settle before the latest confirmed login', async () => {
    const app = await mountSession();
    const old = pending<AuthActionResult>();
    const latest = pending<AuthActionResult>();
    app.auth.logout = vi.fn(() => old.promise);
    app.auth.login = vi.fn(() => latest.promise);
    const logout = app.actions.logout.mutate();
    const login = app.actions.login.mutate({});
    old.resolve({ success: true });
    expect(await logout).toMatchObject({ success: false });
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    latest.resolve({ success: true });
    expect(await login).toMatchObject({ success: true });
    expect(captureAuthLiveScope(app.auth).available).toBe(true);
  });

  it('tracks outstanding error-handler logout alongside ordinary login actions', async () => {
    const app = await mountSession();
    const old = pending<AuthActionResult>();
    app.auth.logout = vi.fn(() => old.promise);
    app.auth.onError = vi.fn(async () => ({ logout: true }));
    const expired = app.actions.onError.mutate({ statusCode: 401 });
    await waitFor(() => expect(app.auth.logout).toHaveBeenCalledTimes(1));
    await app.actions.login.mutate({});
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    old.resolve({ success: true });
    expect(await expired).toMatchObject({ status: 'superseded' });
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    await app.actions.check.refetch();
    expect(captureAuthLiveScope(app.auth).available).toBe(true);
  });

  it('does not let an old or in-flight auth check grant access during a session-changing action', async () => {
    const app = await mountSession();
    const oldCheck = pending<{ authenticated: boolean }>();
    const login = pending<AuthActionResult>();
    app.auth.check = vi.fn(() => oldCheck.promise);
    app.auth.login = vi.fn(() => login.promise);
    const checking = app.actions.check.refetch();
    const changing = app.actions.login.mutate({});
    oldCheck.resolve({ authenticated: true });
    await checking;
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    app.auth.check = vi.fn(async () => ({ authenticated: true }));
    await app.actions.check.refetch();
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    login.resolve({ success: true });
    await changing;
    expect(captureAuthLiveScope(app.auth).available).toBe(true);
  });

  it('uses checked auth refreshes to suspend and restore access without a reactive request loop', async () => {
    const app = await mountSession();
    app.auth.check = vi.fn(async () => ({ authenticated: false }));
    const scope = captureAuthLiveScope(app.auth);
    await app.actions.check.refetch();
    expect(scope.isCurrent()).toBe(false);
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    flushSync();
    expect(app.auth.check).toHaveBeenCalledTimes(1);
    app.auth.check = vi.fn(async () => ({ authenticated: true }));
    await app.actions.check.refetch();
    flushSync();
    expect(captureAuthLiveScope(app.auth).available).toBe(true);
    expect(app.auth.check).toHaveBeenCalledTimes(1);
  });

  it('does not restore suspended access from a malformed or failing check', async () => {
    const app = await mountSession();
    app.auth.login = vi.fn(async () => { throw new Error('PRIVATE'); });
    await app.actions.login.mutate({});
    Reflect.set(app.auth, 'check', async () => ({ authenticated: 'true' }));
    await app.actions.check.refetch();
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    app.auth.check = vi.fn(async () => { throw new Error('PRIVATE'); });
    await app.actions.check.refetch();
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
  });

  it.each(['success', 'reject', 'failure', 'invalid'] as const)('shares session suspension with auth-error-driven logout: %s', async outcome => {
    const app = await mountSession();
    const gate = pending<AuthActionResult>();
    app.auth.onError = vi.fn(async () => ({ logout: true }));
    Reflect.set(app.auth, 'logout', vi.fn(() => gate.promise));
    const before = captureAuthLiveScope(app.auth);
    const operation = app.actions.onError.mutate({ statusCode: 401 });
    await waitFor(() => expect(app.auth.logout).toHaveBeenCalledTimes(1));
    expect(before.isCurrent()).toBe(false);
    expect(captureAuthLiveScope(app.auth).available).toBe(false);
    if (outcome === 'invalid') {
      Reflect.apply(gate.resolve, undefined, [{ success: 'yes' }]);
    } else if (outcome === 'failure') {
      gate.reject(new Error('PRIVATE'));
    } else gate.resolve({ success: outcome === 'success' });
    await operation;
    expect(captureAuthLiveScope(app.auth).available).toBe(outcome === 'reject');
  });

  it('rejects pending publication even after authentication becomes usable again', async () => {
    const app = await mountSession(sessionProvider(), 'publish');
    const gate = pending();
    app.live.provider.publish = vi.fn(() => gate.promise);
    const published = app.publish(liveEvent).catch((cause: unknown) => cause);
    await app.actions.login.mutate({});
    expect(captureAuthLiveScope(app.auth).available).toBe(true);
    gate.resolve();
    expect(await published).toMatchObject({ code: 'LIVE_PUBLISH_FAILED', details: { writeMayHaveSucceeded: true } });
  });

  it('stops later observers and invalidation when a local event callback starts login', async () => {
    const app = await mountSession();
    const gate = pending<AuthActionResult>();
    app.auth.login = vi.fn(() => gate.promise);
    let login: Promise<AuthActionResult> | undefined;
    const global = vi.fn();
    await app.view.rerender({ settings: {
      resource: 'posts', liveMode: 'auto', onGlobalLiveEvent: global,
      onLiveEvent: () => { login = app.actions.login.mutate({}); },
    } });
    const { selected } = cacheFixture(app);
    app.live.emit(liveEvent);
    expect(global).not.toHaveBeenCalled();
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
    if (!login) throw new Error('Expected login from the local observer');
    gate.resolve({ success: true });
    await login;
  });

  it('suspends every mounted tree using the same auth instance', async () => {
    const auth = sessionProvider();
    const first = await mountSession(auth);
    const second = await mountSession(auth);
    await first.actions.logout.mutate();
    flushSync();
    first.live.emit(liveEvent);
    second.live.emit(liveEvent);
    expect(first.observed).not.toHaveBeenCalled();
    expect(second.observed).not.toHaveBeenCalled();
    expect(captureAuthLiveScope(auth).available).toBe(false);
    await first.actions.login.mutate({});
    await waitFor(() => expect(captureAuthLiveScope(auth).available).toBe(true));
    first.live.emit(liveEvent);
    second.live.emit(liveEvent);
    expect(first.observed).toHaveBeenCalledTimes(1);
    expect(second.observed).toHaveBeenCalledTimes(1);
  });

  it('keeps separate auth providers independent and invalidates old snapshots on registry reset', async () => {
    const first = await mountSession();
    const second = await mountSession();
    const scope = captureAuthLiveScope(second.auth);
    const count = second.live.subscriptions.length;
    await first.actions.logout.mutate();
    flushSync();
    expect(scope.isCurrent()).toBe(true);
    expect(second.live.subscriptions).toHaveLength(count);
    second.live.emit(liveEvent);
    expect(second.observed).toHaveBeenCalledTimes(1);
    resetLogoutVersion();
    expect(scope.isCurrent()).toBe(false);
  });
});
