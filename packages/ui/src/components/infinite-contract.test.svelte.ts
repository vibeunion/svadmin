import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient } from '@tanstack/svelte-query';
import { flushSync, type ComponentProps } from 'svelte';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineResource, resetContext, type DataProvider, type Filter, type GetListParams, type GetListResult, type ResourceDefinition, type useInfiniteList } from '@svadmin/core';
import { resolveResourceContract, parseContractRecord } from '../../../core/src/resource-contract';
import { snapshotListParams } from '../../../core/src/query-snapshot';
import { captureAuthLiveScope, resetLogoutVersion } from '../../../core/src/auth-hooks.svelte';
import { decodeInfiniteResult } from '../../../core/src/infinite-query.svelte';
import { decodeBaseRecord } from '../../../core/src/record-decoder';
import type { AuthProvider, AuthActionResult } from '@svadmin/core';
import type { InfiniteState } from './infinite-contract.test.types';
import type { ReadState } from '../../../core/src/query-source.test.types';
import type { SelectState } from './select-contract.test.types';
import QueryHost from '../../../core/src/query-source.test-host.svelte';
import SelectHost from './select-contract.test-host.svelte';
import Host from './infinite-contract.test-host.svelte';

const posts = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const other = defineResource('other', { record: Type.Object({ id: Type.String(), title: Type.String() }) });
const postDefinition: ResourceDefinition = { name: 'posts', label: 'Posts', fields: [], contract: posts };
const resources: ResourceDefinition[] = [postDefinition, { name: 'other', label: 'Other', fields: [], contract: other }];

function provider(getList: DataProvider['getList'] = async () => ({ data: [{ id: 1, title: 'First' }], total: 1 })): DataProvider {
  return {
    getList, getApiUrl: () => '/api',
    getOne: async () => ({ data: {} }), create: async () => ({ data: {} }),
    update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
  };
}

function deferred<T = GetListResult>() {
  let resolve: (value: T) => void = () => { throw new Error('Request not initialized'); };
  let reject: (error: unknown) => void = () => { throw new Error('Request not initialized'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

const clients: QueryClient[] = [];
function mount(source = provider(), context: Partial<Omit<ComponentProps<typeof Host>, 'provider' | 'resources' | 'queryClient' | 'onReady'>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(client);
  let result: InfiniteState | undefined;
  const view = render(Host, { provider: source, resources, queryClient: client, ...context, onReady: value => { result = value; } });
  return { client, view, read() {
    if (!result) throw new Error('Expected a mounted infinite list');
    return result;
  } };
}
function auth(): AuthProvider {
  return {
    login: vi.fn(async () => ({ success: true })), logout: vi.fn(async () => ({ success: true })),
    check: vi.fn(async () => ({ authenticated: true })), getIdentity: vi.fn(async () => null),
    onError: vi.fn(async () => ({})),
  };
}
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  resetLogoutVersion();
  vi.restoreAllMocks();
});

describe('checked pagination states and authentication', () => {
  it.each(['transport', 'schema'] as const)('retains checked pages and honest paging-error flags after a %s failure', async failure => {
    const getList = vi.fn<DataProvider['getList']>()
      .mockResolvedValueOnce({ data: [{ id: 1, title: 'First' }], total: 2 });
    if (failure === 'transport') getList.mockRejectedValueOnce({ message: 'Private transport diagnostic', statusCode: 503 });
    else getList.mockResolvedValueOnce({ data: [{ id: 'wrong', title: 'Private record' }], total: 2 });
    getList.mockResolvedValue({ data: [{ id: 2, title: 'Second' }], total: 2 });
    const app = mount(provider(getList));
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const failed = await app.read().query.fetchNextPage();
    expect(failed).toMatchObject({
      status: 'error', isError: true, isLoadingError: false, isRefetchError: false,
      isFetchNextPageError: true, isFetchPreviousPageError: false,
      data: { pages: [{ data: [{ id: 1, title: 'First' }], total: 2 }], pageParams: [1] },
      error: { message: 'Resource query failed' },
    });
    expect(app.read().query.isFetchNextPageError).toBe(true);
    const recovered = await app.read().query.fetchNextPage();
    expect(recovered.isSuccess).toBe(true);
    expect(recovered.data?.pageParams).toEqual([1, 2]);
    expect(recovered.hasNextPage).toBe(false);
  });

  it('distinguishes first-page paging failure from a cached-data paging failure', async () => {
    const app = mount(provider(async () => { throw new Error('Private'); }), { enabled: false });
    const result = await app.read().query.fetchNextPage();
    expect(result).toMatchObject({
      status: 'error', isLoadingError: true, isFetchNextPageError: true,
      isRefetchError: false, data: undefined, error: { code: 'QUERY_FAILED' },
    });
  });

  it('preserves cached-data refetch errors and sanitizes throwing imperative operations', async () => {
    const getList = vi.fn<DataProvider['getList']>().mockResolvedValueOnce({ data: [{ id: 1, title: 'First' }], total: 2 })
      .mockRejectedValue({ message: 'Private', statusCode: 503 });
    const app = mount(provider(getList));
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const result = await app.read().query.refetch();
    expect(result).toMatchObject({
      isRefetchError: true, isFetchNextPageError: false, isLoadingError: false,
      data: { pageParams: [1] }, error: { message: 'Resource query failed', statusCode: 503 },
    });
    await expect(app.read().query.refetch({ throwOnError: true })).rejects.toMatchObject({ message: 'Resource query failed', statusCode: 503 });
  });

  it('stops on an empty page despite a stale positive total and does not invent previous pages', async () => {
    const getList = vi.fn<DataProvider['getList']>().mockResolvedValueOnce({ data: [{ id: 1, title: 'First' }], total: 100 })
      .mockResolvedValue({ data: [], total: 100 });
    const app = mount(provider(getList));
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    expect((await app.read().query.fetchPreviousPage()).data?.pageParams).toEqual([1]);
    expect(getList).toHaveBeenCalledOnce();
    await app.read().query.fetchNextPage();
    expect(app.read().query.hasNextPage).toBe(false);
    await app.read().query.fetchNextPage();
    expect(getList).toHaveBeenCalledTimes(2);
  });

  it('deduplicates one shared auth session without sharing the cache with another auth provider', async () => {
    const getList = vi.fn(provider().getList);
    const source = provider(getList);
    const session = auth();
    const app = mount(source, { authProvider: session });
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    let same: InfiniteState | undefined;
    render(Host, { provider: source, resources, queryClient: app.client, authProvider: session, onReady: value => { same = value; } });
    await waitFor(() => expect(same?.query.isSuccess).toBe(true));
    expect(getList).toHaveBeenCalledOnce();
    let independent: InfiniteState | undefined;
    render(Host, { provider: source, resources, queryClient: app.client, authProvider: auth(), onReady: value => { independent = value; } });
    await waitFor(() => expect(independent?.query.isSuccess).toBe(true));
    expect(getList).toHaveBeenCalledTimes(2);
    await app.read().login.mutate({});
    await waitFor(() => expect(app.read().query.isSuccess && same?.query.isSuccess).toBe(true));
    expect(getList).toHaveBeenCalledTimes(3);
    expect(independent?.query.isSuccess).toBe(true);
  });

  it.each(['refetch', 'fetchNextPage', 'fetchPreviousPage'] as const)('masks all page state immediately and retires a saved %s', async operation => {
    const getList = vi.fn<DataProvider['getList']>(async params => ({
      data: [{ id: params.pagination?.current ?? 1, title: 'Page' }], total: 5,
    }));
    const session = auth();
    const login = deferred<AuthActionResult>();
    session.login = () => login.promise;
    const app = mount(provider(getList), { authProvider: session });
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const saved = app.read().query[operation];
    const changing = app.read().login.mutate({});
    expect(app.read().query).toMatchObject({
      data: undefined, status: 'pending', isSuccess: false, isFetching: false,
      hasNextPage: false, hasPreviousPage: false, isFetchingNextPage: false, isFetchingPreviousPage: false,
      isFetchNextPageError: false, isFetchPreviousPageError: false,
    });
    expect(Object.getOwnPropertyDescriptor(app.read().query, 'data')?.get?.()).toBeUndefined();
    expect(await saved()).toMatchObject({ data: undefined, status: 'pending' });
    expect(getList).toHaveBeenCalledOnce();
    login.resolve({ success: true });
    await changing;
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    expect(getList).toHaveBeenCalledTimes(2);
    expect(await saved()).toMatchObject({ data: undefined, status: 'pending' });
    expect(getList).toHaveBeenCalledTimes(2);
  });

  describe.each(['initial', 'next', 'refetch'] as const)('%s request ownership', stage => {
    it.each(['success', 'failure'] as const)('quarantines a late %s after same-provider login', async outcome => {
      const old = deferred();
      const getList = vi.fn<DataProvider['getList']>();
      if (stage !== 'initial') getList.mockResolvedValueOnce({ data: [{ id: 1, title: 'Old first' }], total: 2 });
      getList.mockImplementationOnce(() => old.promise).mockResolvedValue({ data: [{ id: 1, title: 'Current' }], total: 1 });
      const session = auth();
      const observed = vi.fn(() => ({ message: 'Loaded' }));
      const app = mount(provider(getList), { authProvider: session, successNotification: observed, errorNotification: observed });
      let pending: Promise<unknown> | undefined;
      if (stage !== 'initial') {
        await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
        pending = stage === 'next' ? app.read().query.fetchNextPage() : app.read().query.refetch();
      }
      await waitFor(() => expect(getList).toHaveBeenCalledTimes(stage === 'initial' ? 1 : 2));
      const cached = app.client.getQueryCache().getAll()[0];
      if (!cached) throw new Error('Expected the old cache');
      await app.read().login.mutate({});
      await waitFor(() => expect(app.read().query.data?.pages[0]?.data[0]?.['title']).toBe('Current'));
      const notifications = observed.mock.calls.length;
      if (outcome === 'success') old.resolve({ data: [{ id: stage === 'next' ? 2 : 1, title: 'Private late page' }], total: 2 });
      else old.reject({ statusCode: 401, message: 'Private old session' });
      if (pending) expect(await pending).toMatchObject({ status: 'pending', data: undefined });
      await waitFor(() => expect(cached.state.status).toBe('error'));
      if (stage === 'initial') expect(cached.state.data).toBeUndefined();
      else expect(cached.state.data).toEqual({
        pages: [{ data: [{ id: 1, title: 'Old first' }], total: 2 }], pageParams: [1],
      });
      expect(session.onError).not.toHaveBeenCalled();
      expect(observed).toHaveBeenCalledTimes(notifications);
      expect(app.read().query.data?.pageParams).toEqual([1]);
      expect(app.read().query.data?.pages[0]?.data[0]?.['title']).toBe('Current');
    });
  });

  it('keeps signed-out pages unavailable and restarts from page one only after a confirmed login', async () => {
    const getList = vi.fn<DataProvider['getList']>(async params => ({
      data: [{ id: params.pagination?.current ?? 1, title: 'Page' }], total: 3,
    }));
    const app = mount(provider(getList), { authProvider: auth() });
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    await app.read().query.fetchNextPage();
    expect(app.read().query.data?.pageParams).toEqual([1, 2]);
    await app.read().logout.mutate();
    expect((await app.read().query.fetchNextPage()).data).toBeUndefined();
    expect((await app.read().query.refetch()).data).toBeUndefined();
    expect(getList).toHaveBeenCalledTimes(2);
    await app.read().login.mutate({});
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    expect(app.read().query.data?.pageParams).toEqual([1]);
    expect(getList.mock.calls.at(-1)?.[0].pagination?.current).toBe(1);
  });

  it('sanitizes a throwing page request that becomes obsolete while pending', async () => {
    const old = deferred();
    const getList = vi.fn<DataProvider['getList']>().mockResolvedValueOnce({ data: [{ id: 1, title: 'First' }], total: 2 })
      .mockImplementationOnce(() => old.promise).mockResolvedValue({ data: [{ id: 1, title: 'New' }], total: 1 });
    const app = mount(provider(getList), { authProvider: auth() });
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const next = app.read().query.fetchNextPage({ throwOnError: true });
    const rejected = expect(next).rejects.toMatchObject({ code: 'QUERY_SESSION_SUPERSEDED' });
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(2));
    await app.read().login.mutate({});
    old.reject({ message: 'Private late error', statusCode: 401 });
    await rejected;
    await waitFor(() => expect(app.read().query.data?.pages[0]?.data[0]?.['title']).toBe('New'));
  });

  it('suppresses a delayed auth-error instruction after login replaces its originating session', async () => {
    const instruction = deferred<{ logout: boolean; redirectTo: string }>();
    const session = auth();
    session.onError = vi.fn(() => instruction.promise);
    const getList = vi.fn<DataProvider['getList']>().mockRejectedValueOnce({ statusCode: 401, message: 'Private' })
      .mockResolvedValue({ data: [{ id: 1, title: 'Current' }], total: 1 });
    const go = vi.fn();
    const app = mount(provider(getList), { authProvider: session,
      routerProvider: { go, back: () => {}, parse: () => ({ pathname: '/', params: {} }) } });
    await waitFor(() => expect(session.onError).toHaveBeenCalledOnce());
    await app.read().login.mutate({});
    expect(go).toHaveBeenCalledExactlyOnceWith({ to: '/', type: 'push' });
    instruction.resolve({ logout: true, redirectTo: '/login' });
    await instruction.promise;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(session.logout).not.toHaveBeenCalled();
    expect(go).toHaveBeenCalledOnce();
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
  });

  it.each(['success', 'rejected'] as const)('lets current auth-error logout settle as %s without an automatic read loop', async outcome => {
    const session = auth();
    session.onError = vi.fn(async () => ({ logout: true }));
    session.logout = vi.fn(async () => ({ success: outcome === 'success' }));
    const getList = vi.fn<DataProvider['getList']>(async () => { throw { statusCode: 401, message: 'Private' }; });
    const app = mount(provider(getList), { authProvider: session });
    await waitFor(() => expect(session.logout).toHaveBeenCalledOnce());
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(captureAuthLiveScope(session).available).toBe(false);
    expect(app.read().query.data).toBeUndefined();
    expect((await app.read().query.refetch()).status).toBe('pending');
    expect(getList).toHaveBeenCalledOnce();
  });

  it('does not execute saved paging operations after the originating reader unmounts', async () => {
    const getList = vi.fn<DataProvider['getList']>(async () => ({ data: [{ id: 1, title: 'First' }], total: 2 }));
    const app = mount(provider(getList));
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const next = app.read().query.fetchNextPage;
    const refetch = app.read().query.refetch;
    app.view.unmount();
    expect(await next()).toMatchObject({ data: undefined, status: 'pending' });
    expect(await refetch()).toMatchObject({ data: undefined, status: 'pending' });
    expect(getList).toHaveBeenCalledOnce();
  });

  it.each([undefined, 0, -1, NaN, Infinity, 1.5, '2'])('rejects invalid page parameter %s before dispatch', async pageParam => {
    const getList = vi.fn(provider().getList);
    const app = mount(provider(getList));
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const cached = app.client.getQueryCache().getAll()[0];
    const fn = cached?.options.queryFn;
    if (!cached || typeof fn !== 'function') throw new Error('Expected query function');
    await expect(fn({ client: app.client, queryKey: cached.queryKey, signal: new AbortController().signal, meta: undefined,
      pageParam, direction: 'forward' })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(getList).toHaveBeenCalledOnce();
  });

  it('rejects malformed page collections without executing getters', () => {
    const page = { data: [{ id: 1, title: 'First' }], total: 1 };
    for (const value of [
      { pages: [], pageParams: [] }, { pages: [page], pageParams: [] }, { pages: [page], pageParams: [2] },
      { pages: [page, page], pageParams: [1, 3] }, { pages: [page], pageParams: [1], extra: true },
      { pages: [page], pageParams: [Infinity] },
    ]) expect(() => decodeInfiniteResult(value, decodeBaseRecord)).toThrowError(expect.objectContaining({ code: 'INVALID_PROVIDER_RESPONSE' }));
    const getter = vi.fn(() => [page]);
    const candidate = Object.defineProperty({ pageParams: [1] }, 'pages', { get: getter, enumerable: true });
    expect(() => decodeInfiniteResult(candidate, decodeBaseRecord)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });

  it('detaches pages and page parameters from consumer, imperative and notification mutations', async () => {
    const observed = vi.fn((value: unknown) => {
      if (typeof value === 'object' && value !== null) {
        Reflect.set(value, 'pages', []); Reflect.set(value, 'pageParams', [999]);
      }
      return { message: 'Loaded' };
    });
    const app = mount(provider(), { successNotification: observed });
    await waitFor(() => expect(observed).toHaveBeenCalledOnce());
    const first = app.read().query.data;
    if (!first) throw new Error('Expected pages');
    first.pages.splice(0);
    first.pageParams[0] = 999;
    expect(app.read().query.data?.pageParams).toEqual([1]);
    expect(app.read().query.data?.pages).toHaveLength(1);
    const refreshed = await app.read().query.refetch();
    if (!refreshed.isSuccess) throw new Error('Expected checked refresh');
    refreshed.data.pages[0]?.data.splice(0);
    refreshed.data.pageParams.splice(0);
    expect(app.read().query.data?.pages[0]?.data).toEqual([{ id: 1, title: 'First' }]);
    expect(app.read().query.data?.pageParams).toEqual([1]);
  });

  it('suppresses a notification that starts login and keeps its remaining page state hidden', async () => {
    const session = auth();
    const login = deferred<AuthActionResult>();
    session.login = () => login.promise;
    const notification = { open: vi.fn(), close: vi.fn() };
    let changing: Promise<AuthActionResult> | undefined;
    const app = mount(provider(), { authProvider: session, enabled: false, notificationProvider: notification,
      successNotification: () => { changing = app.read().login.mutate({}); return { message: 'Old session' }; } });
    await app.read().query.refetch();
    await waitFor(() => expect(changing).toBeDefined());
    expect(notification.open).not.toHaveBeenCalled();
    expect(app.read().query.data).toBeUndefined();
    login.resolve({ success: true });
    await changing;
  });

  it('keeps extracted lifecycle behavior for ordinary and selected readers sharing the same auth session', async () => {
    const getList = vi.fn(provider().getList);
    const source = provider(getList);
    const session = auth();
    const app = mount(source, { authProvider: session });
    let list: ReadState | undefined;
    let selected: SelectState | undefined;
    render(QueryHost, { provider: source, resources, queryClient: app.client, kind: 'list', authProvider: session,
      onReady: value => { list = value; } });
    render(SelectHost, { provider: source, resources, queryClient: app.client, authProvider: session,
      onReady: value => { selected = value; } });
    await waitFor(() => expect(app.read().query.isSuccess && list?.query.isSuccess && selected?.query.isSuccess).toBe(true));
    expect(getList).toHaveBeenCalledTimes(3);
    const changing = app.read().login.mutate({});
    expect(list?.query.data).toBeUndefined();
    expect(selected?.options).toEqual([]);
    await changing;
    await waitFor(() => expect(app.read().query.isSuccess && list?.query.isSuccess && selected?.query.isSuccess).toBe(true));
    expect(getList).toHaveBeenCalledTimes(6);
    expect(selected?.options).toEqual([{ label: 'First', value: 1 }]);
  });

  it('removes rendered pages when another tree logs out of the shared session', async () => {
    const session = auth();
    const source = provider();
    const app = mount(source, { authProvider: session });
    const ui = render(Host, { provider: source, resources, queryClient: app.client, authProvider: session });
    await waitFor(() => expect(ui.getByTestId('row').textContent).toBe('First'));
    await app.read().logout.mutate();
    flushSync();
    expect(ui.queryByTestId('row')).toBeNull();
    expect(captureAuthLiveScope(session).available).toBe(false);
  });
});

describe('contract-bound infinite lists', () => {
  it('strictly compiles the paginated result states, shared lifecycle and mounted consumers', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const core = resolve(directory, '../../../core/src');
    const sources = [
      ...['infinite-query.svelte.ts', 'query-session.svelte.ts', 'session-query.svelte.ts', 'hooks.svelte.ts',
        'query-hooks.svelte.ts', 'select-query.svelte.ts', 'query-source.test.type-fixture.ts'].map(file => resolve(core, file)),
      ...['infinite-contract.test.svelte.ts', 'infinite-contract.test.types.ts', 'infinite-contract.test.type-fixture.ts',
        'select-contract.test.type-fixture.ts'].map(file => resolve(directory, file)),
    ];
    const components = [
      ...['InfiniteList.svelte', 'infinite-contract.test-host.svelte', 'infinite-contract.test-probe.svelte',
        'select-contract.test-host.svelte', 'select-contract.test-probe.svelte', 'ComboboxField.svelte'].map(file => resolve(directory, file)),
      ...['query-source.test-host.svelte', 'query-source.test-probe.svelte'].map(file => resolve(core, file)),
    ];
    const virtual = new Map(components.map(filename =>
      [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code]));
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
    const program = ts.createProgram([...targets, resolve(directory, '../../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts')], options, host);
    const diagnostics = targets.flatMap(file => {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Missing ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(diagnostics.map(diagnostic => `${diagnostic.file?.fileName}:${diagnostic.start}: ${
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`)).toEqual([]);
  });
  it('renders only validated records using the registered contract and preserves the provider receiver', async () => {
    const source = provider();
    source.getList = vi.fn(async function(this: DataProvider, params: GetListParams) {
      expect(this).toBe(source);
      expect(params).toMatchObject({ resource: 'posts', pagination: { current: 1, pageSize: 1 } });
      return { data: [{ id: 1, title: 'First' }], total: 1 };
    });
    const view = render(Host, { provider: source, resources });
    await waitFor(() => expect(view.getByTestId('row').textContent).toBe('First'));
    expect(source.getList).toHaveBeenCalledTimes(1);
  });

  it.each([
    { data: [{ id: 'invalid', title: 'private-payload' }], total: 1 },
    { data: [{ id: 1, title: 17 }], total: 1 },
    { data: [{ title: 'private-payload' }], total: 1 },
    { data: [{ id: 1, title: 'private-payload', extra: true }], total: 1 },
    { data: [{ id: 1, title: 'private-payload' }], total: -1 },
  ])('rejects malformed response %# without rendering its contents', async reply => {
    const view = render(Host, { provider: provider(async () => reply), resources });
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(view.queryByTestId('row')).toBeNull();
    expect(view.container.textContent).not.toContain('private-payload');
  });

  it('rejects accessors without executing them and allows an explicit retry', async () => {
    const getter = vi.fn(() => 'private-payload');
    const row = Object.defineProperty({ id: 1 }, 'title', { enumerable: true, get: getter });
    const getList = vi.fn<DataProvider['getList']>()
      .mockResolvedValueOnce({ data: [row], total: 1 })
      .mockResolvedValue({ data: [{ id: 1, title: 'Recovered' }], total: 1 });
    const view = render(Host, { provider: provider(getList), resources });
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(getter).not.toHaveBeenCalled();
    await fireEvent.click(view.getByRole('button'));
    await waitFor(() => expect(view.getByTestId('row').textContent).toBe('Recovered'));
  });

  it('requires a genuine matching id-based contract before fetching', () => {
    const getList = vi.fn<DataProvider['getList']>();
    expect(() => render(Host, { provider: provider(getList), resources: [{ name: 'posts', label: 'Posts', fields: [] }] }))
      .toThrowError(expect.objectContaining({ code: 'RESOURCE_CONTRACT_REQUIRED' }));
    expect(getList).not.toHaveBeenCalled();
    for (const definition of [
      { name: 'posts', contract: other },
      { name: 'posts', contract: posts, primaryKey: 'key' },
      { name: 'posts', contract: { ...posts } },
    ]) expect(() => resolveResourceContract(definition)).toThrow();
    expect(resolveResourceContract({ name: 'display-name', identifier: 'posts', contract: posts })).toBe(posts);
  });

  it('refuses a missing named provider instead of falling back to default', () => {
    const getList = vi.fn<DataProvider['getList']>();
    expect(() => render(Host, {
      provider: provider(getList),
      resources: [{ ...postDefinition, provider: { dataProviderName: 'missing' } }],
    })).toThrow();
    expect(getList).not.toHaveBeenCalled();
  });

  it('reacts to resource changes without decoding late data against the new contract', async () => {
    const old = deferred();
    const getList = vi.fn<DataProvider['getList']>(async params => params.resource === 'posts'
      ? old.promise : { data: [{ id: 'second', title: 'Other resource' }], total: 1 });
    const view = render(Host, { provider: provider(getList), resources });
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));
    await view.rerender({ resource: 'other' });
    await waitFor(() => expect(view.getByTestId('row').textContent).toBe('Other resource'));
    old.resolve({ data: [{ id: 1, title: 'Late first' }], total: 1 });
    await old.promise;
    await waitFor(() => expect(view.getByTestId('row').textContent).toBe('Other resource'));
  });

  it.each(['tenant', 'provider'] as const)('isolates late replies after a %s change', async kind => {
    const old = deferred();
    const getList = vi.fn<DataProvider['getList']>()
      .mockImplementationOnce(() => old.promise)
      .mockResolvedValue({ data: [{ id: 2, title: 'New scope' }], total: 1 });
    const view = render(Host, { provider: provider(getList), resources });
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));
    await view.rerender(kind === 'tenant' ? { tenant: 'second' } : { provider: provider(getList) });
    await waitFor(() => expect(view.getByTestId('row').textContent).toBe('New scope'));
    old.resolve({ data: [{ id: 1, title: 'Old scope' }], total: 1 });
    await old.promise;
    await waitFor(() => expect(view.getByTestId('row').textContent).toBe('New scope'));
    expect(getList).toHaveBeenCalledTimes(2);
  });

  it('does not reuse a successful cache when the same provider name or schema is replaced', async () => {
    const view = render(Host, { provider: provider(), resources });
    await waitFor(() => expect(view.getByTestId('row').textContent).toBe('First'));
    const replacement = vi.fn<DataProvider['getList']>(async () => ({ data: [{ id: 2, title: 'Replacement' }], total: 1 }));
    await view.rerender({ provider: provider(replacement) });
    await waitFor(() => expect(view.getByTestId('row').textContent).toBe('Replacement'));
    const revised = defineResource('posts', { record: Type.Object({ id: Type.String(), title: Type.String() }) });
    await view.rerender({ resources: [{ ...postDefinition, contract: revised }] });
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(view.queryByTestId('row')).toBeNull();
  });

  it('reacts to new filters and pagination without losing the registered contract', async () => {
    const getList = vi.fn<DataProvider['getList']>(async params => ({
      data: [{ id: 1, title: params.filters?.length ? 'Filtered' : 'First' }], total: 1,
    }));
    const view = render(Host, { provider: provider(getList), resources });
    await waitFor(() => expect(view.getByTestId('row').textContent).toBe('First'));
    await view.rerender({ pageSize: 3, filters: [{ field: 'title', operator: 'eq', value: 'Filtered' }] });
    await waitFor(() => expect(view.getByTestId('row').textContent).toBe('Filtered'));
    expect(getList.mock.calls[1]?.[0]).toMatchObject({
      pagination: { current: 1, pageSize: 3 },
      filters: [{ field: 'title', operator: 'eq', value: 'Filtered' }],
    });
  });

  it('captures pagination, filters and metadata before deferred page execution', async () => {
    const filters: Filter[] = [{ field: 'title', operator: 'eq', value: 'First' }];
    const metadata = { nested: { tag: 'original' } };
    const getList = vi.fn<DataProvider['getList']>(async () => ({ data: [{ id: 1, title: 'First' }], total: 1 }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(Host, {
      provider: provider(getList), queryClient: client, filters, pageSize: 2,
      resources: [{ ...postDefinition, provider: { meta: metadata } }],
    });
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));
    const cached = client.getQueryCache().getAll()[0];
    const fn = cached?.options.queryFn;
    if (!cached || typeof fn !== 'function') throw new Error('Expected a captured query');
    filters.splice(0, 1, { field: 'title', operator: 'eq', value: 'Changed' });
    metadata.nested.tag = 'changed';
    getList.mock.calls[0]?.[0].filters?.splice(0, 1, { field: 'title', operator: 'eq', value: 'Provider mutation' });
    await fn({ client, queryKey: cached.queryKey, signal: new AbortController().signal, meta: undefined, pageParam: 2, direction: 'forward' });
    expect(getList.mock.calls[1]?.[0]).toMatchObject({
      pagination: { current: 2, pageSize: 2 },
      filters: [{ field: 'title', operator: 'eq', value: 'First' }],
      meta: { nested: { tag: 'original' } },
    });
  });

  it('validates filter fields against the actual schema before dispatch', async () => {
    const getList = vi.fn<DataProvider['getList']>();
    const view = render(Host, {
      provider: provider(getList), resources,
      filters: [{ field: 'missing', operator: 'eq', value: 'private-payload' }],
    });
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(getList).not.toHaveBeenCalled();
    expect(view.container.textContent).not.toContain('private-payload');
  });

  it('fetches subsequent pages with checked records and the requested page size', async () => {
    const getList = vi.fn<DataProvider['getList']>(async params => ({
      data: [{ id: params.pagination?.current ?? 1, title: 'Page' }], total: 2,
    }));
    let result: ReturnType<typeof useInfiniteList> | undefined;
    render(Host, { provider: provider(getList), resources, onReady: value => { result = value; } });
    await waitFor(() => expect(result?.query.isSuccess).toBe(true));
    if (!result) throw new Error('Expected a mounted infinite query');
    await result.query.fetchNextPage();
    await waitFor(() => expect(result?.query.data?.pages).toHaveLength(2));
    expect(getList.mock.calls[1]?.[0].pagination).toEqual({ current: 2, pageSize: 1 });
    expect(result.query.hasNextPage).toBe(false);
  });

  it('sanitizes non-plain query and record values', () => {
    const getter = vi.fn(() => 'secret');
    const meta = Object.defineProperty({}, 'token', { enumerable: true, get: getter });
    for (const input of [
      { resource: 'posts', meta },
      { resource: 'posts', pagination: { pageSize: 0 } },
      { resource: 'posts', filters: [{ field: 'title', operator: 'invalid', value: 1 }] },
    ]) expect(() => snapshotListParams(input)).toThrowError(expect.objectContaining({ code: 'INVALID_RESOURCE_INPUT' }));
    expect(getter).not.toHaveBeenCalled();
    expect(() => parseContractRecord(posts, meta)).toThrowError(expect.objectContaining({ code: 'INVALID_PROVIDER_RESPONSE' }));
    expect(getter).not.toHaveBeenCalled();
  });
});
