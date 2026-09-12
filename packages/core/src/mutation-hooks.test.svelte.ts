import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { QueryClient, QueryObserver } from '@tanstack/svelte-query';
import { Type } from '@sinclair/typebox';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as core from './index';
import * as unsafe from './unsafe';
import * as queryKeys from './query-keys';
import { keys, type QueryKey } from './query-keys';
import { invalidateOwnedQueries, readOwnedDataQuery, type RefreshScope } from './query-invalidation';
import { defineResource } from './resource-contract';
import { resetContext } from './context.svelte';
import type { DataProvider, GetListResult } from './types';
import type { ReadState } from './query-source.test.types';
import Host from './query-source.test-host.svelte';

const clients: QueryClient[] = [];
const subscriptions: (() => void)[] = [];
const matcher = { provider: 'cms', tenant: 'first', contract: 'posts-v1', resource: 'posts' };
const owner = { source: 'source-A', authSession: 'auth-A' };
const builder = keys(matcher);
function client() {
  const value = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(value);
  return value;
}
function request(queryClient: QueryClient) {
  return { client: queryClient, matcher: { ...matcher }, owner: { ...owner },
    scopes: ['list'] satisfies RefreshScope[], current: () => true };
}
function seed(queryClient: QueryClient, values: readonly QueryKey[]) {
  for (const key of values) queryClient.setQueryData(key, { data: [], total: 0 });
}
function invalidated(queryClient: QueryClient, key: QueryKey) {
  return queryClient.getQueryState(key)?.isInvalidated;
}
function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Uninitialized deferred'); };
  let reject: (cause: unknown) => void = () => { throw new Error('Uninitialized deferred'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function watch(queryClient: QueryClient, key: QueryKey, queryFn: () => Promise<GetListResult>) {
  seed(queryClient, [key]);
  const observer = new QueryObserver(queryClient, { queryKey: key, queryFn, retry: false, staleTime: Infinity });
  subscriptions.push(observer.subscribe(() => {}));
}
afterEach(() => {
  cleanup();
  for (const unsubscribe of subscriptions.splice(0)) unsubscribe();
  for (const queryClient of clients.splice(0)) queryClient.clear();
  resetContext();
  vi.restoreAllMocks();
});

describe('owned cache boundaries after legacy retirement', () => {
  it('strictly compiles changed entry points, refresh logic, mounted fixtures and negative API cases', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const targets = ['query-invalidation.ts', 'query-keys.ts', 'index.ts', 'hooks.svelte.ts',
      'mutation-hooks.test.svelte.ts', 'query-source.test.types.ts'].map(name => resolve(directory, name));
    const virtual = new Map(['query-source.test-host.svelte', 'query-source.test-probe.svelte'].map(name => {
      const filename = resolve(directory, name);
      return [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code];
    }));
    const negativePath = resolve(directory, 'mutation-hooks.test.virtual.ts');
    const valid = [
      "import * as core from './index';",
      "import * as unsafe from './unsafe';",
      "import * as keys from './query-keys';",
      "import { invalidateOwnedQueries, readOwnedDataQuery } from './query-invalidation';",
      "import { QueryClient } from '@tanstack/svelte-query';",
      "import { Type } from '@sinclair/typebox';",
      "const contract = core.defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });",
      'const refresh = core.useInvalidate({ resource: contract });',
      'const completed: Promise<void> = refresh({ id: 1, invalidates: ["detail"] });',
      'const client = new QueryClient();',
      'const owner = { source: "source", authSession: "auth" };',
      'const matcher = { resource: "posts" };',
      'const pending: Promise<void> = invalidateOwnedQueries({ client, owner, matcher, scopes: ["list"], current: () => true });',
      'const descriptor = readOwnedDataQuery([], matcher, owner);',
    ];
    const invalid = [
      'core.publishLiveEvent("posts", "created", [1]);',
      'unsafe.publishLiveEvent("posts", "created", [1]);',
      'unsafe.invalidateByScopes({ client, resource: "posts" });',
      'unsafe.deepMerge({}, {});',
      'keys.dataQuerySourceMatches([], "source");',
      'readOwnedDataQuery([], matcher, { source: "source" });',
      'invalidateOwnedQueries({ client, matcher, owner, scopes: ["list"] });',
      'invalidateOwnedQueries({ client, matcher, owner, scopes: ["one"], current: () => true });',
      'invalidateOwnedQueries({ client, matcher, owner, scopes: ["list"], current: async () => true });',
      'refresh({ id: "1", invalidates: ["detail"] });',
      'refresh({ invalidates: ["one"] });',
      'refresh({ resource: "other" });',
      'core.useInvalidate();',
      'core.useInvalidate({ resource: "posts" });',
      'if (descriptor) descriptor.resource = "other";',
      "import { applyMutationCache } from './mutation-cache';",
      "import { invalidateByScopes } from './mutation-hooks.svelte';",
    ];
    virtual.set(negativePath, [...valid, ...invalid].join('\n'));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false, types: ['svelte', 'node'],
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.Preserve, allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = path => virtual.get(path) ?? read(path);
    host.fileExists = path => virtual.has(path) || exists(path);
    host.resolveModuleNames = (names, containingFile) => names.map(name => {
      const path = resolve(dirname(containingFile), `${name}.tsx`);
      if (virtual.has(path)) return { resolvedFileName: path, extension: ts.Extension.Tsx };
      return ts.resolveModuleName(name, containingFile, options, host).resolvedModule;
    });
    const program = ts.createProgram({ rootNames: [...targets, ...virtual.keys(),
      resolve(directory, '../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
      resolve(directory, '../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
    ], options, host });
    const diagnostics = (path: string) => {
      const source = program.getSourceFile(path);
      if (!source) throw new Error(`Missing source ${path}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    };
    expect([...targets, ...virtual.keys()].filter(path => path !== negativePath).flatMap(diagnostics)
      .map(item => `${item.file?.fileName}:${item.start}: ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`)).toEqual([]);
    expect(diagnostics(negativePath).map(item => item.file && item.start !== undefined
      ? item.file.getLineAndCharacterOfPosition(item.start).line : -1)).toEqual(invalid.map((_, index) => valid.length + index));
  }, 30_000);

  it('removes unused cache implementations while retaining the checked public entry points', () => {
    for (const name of ['publishLiveEvent', 'invalidateByScopes', 'deepMerge',
      'applyMutationCache', 'rollbackMutationCache', 'commitMutationCache']) {
      expect(name in core).toBe(false);
      expect(name in unsafe).toBe(false);
    }
    expect('dataQuerySourceMatches' in queryKeys).toBe(false);
    expect(core.useInvalidate).toBeTypeOf('function');
    expect(core.useCreate).toBeTypeOf('function');
    expect(core.useUpdate).toBeTypeOf('function');
    expect(core.useDelete).toBeTypeOf('function');
    expect(core.usePublish).toBeTypeOf('function');
    const directory = dirname(fileURLToPath(import.meta.url));
    for (const filename of ['mutation-cache.ts', 'mutation-hooks.svelte.ts',
      'mutation-cache.test.ts', 'mutation-runtime.test.svelte.ts']) {
      expect(existsSync(resolve(directory, filename))).toBe(false);
    }
    for (const name of ['create', 'update', 'delete']) {
      const filename = resolve(directory, `../../ui/src/components/${name}-contract.test.svelte.ts`);
      const source = readFileSync(filename, 'utf8');
      expect(source).not.toContain("'../../../core/src/mutation-hooks.svelte.ts'");
      expect(source).not.toContain("'../../../core/src/mutation-runtime.test.svelte.ts'");
      expect(source).toContain("'../../../core/src/query-invalidation.ts'");
    }
  });

  it('refreshes only matching provider, contract, resource, tenant, source and auth owners', async () => {
    const queryClient = client();
    const selected = [builder.data.list('posts', owner), builder.data.infiniteList('posts', owner),
      builder.data.select('posts', owner), builder.data.selectDefaults('posts', owner), builder.data.many('posts', owner)];
    const excluded = [
      builder.data.one('posts', 1, owner),
      builder.data.list('other', owner),
      keys({ ...matcher, provider: 'other' }).data.list('posts', owner),
      keys({ ...matcher, contract: 'other' }).data.list('posts', owner),
      keys({ ...matcher, tenant: 'other' }).data.list('posts', owner),
      builder.data.list('posts', { ...owner, source: 'other' }),
      builder.data.list('posts', { ...owner, authSession: 'other' }),
      builder.data.list('posts', {}), builder.data.list('posts', { source: owner.source }),
      builder.access.can('posts', owner), builder.task.list(owner), builder.custom.call('posts', 1, 'get', owner),
    ];
    seed(queryClient, [...selected, ...excluded]);
    await invalidateOwnedQueries({ ...request(queryClient), scopes: ['list', 'many'] });
    for (const key of selected) expect(invalidated(queryClient, key)).toBe(true);
    for (const key of excluded) expect(invalidated(queryClient, key)).toBe(false);
  });

  it('matches numeric and string detail identifiers separately', async () => {
    const queryClient = client();
    const numeric = builder.data.one('posts', 1, owner);
    const text = builder.data.one('posts', '1', owner);
    const other = builder.data.one('posts', 2, owner);
    seed(queryClient, [numeric, text, other]);
    await invalidateOwnedQueries({ ...request(queryClient), scopes: ['detail'], id: 1 });
    expect(invalidated(queryClient, numeric)).toBe(true);
    expect(invalidated(queryClient, text)).toBe(false);
    expect(invalidated(queryClient, other)).toBe(false);
  });

  it('pins an omitted tenant and provider to the unset tenant and default provider', async () => {
    const queryClient = client();
    const selected = keys({ contract: matcher.contract }).data.list('posts', owner);
    const tenant = keys({ contract: matcher.contract, tenant: 'first' }).data.list('posts', owner);
    const named = keys({ contract: matcher.contract, provider: 'cms' }).data.list('posts', owner);
    seed(queryClient, [selected, tenant, named]);
    await invalidateOwnedQueries({
      ...request(queryClient), matcher: { resource: 'posts', contract: matcher.contract },
    });
    expect(invalidated(queryClient, selected)).toBe(true);
    expect(invalidated(queryClient, tenant)).toBe(false);
    expect(invalidated(queryClient, named)).toBe(false);
  });

  it('preserves explicit undefined matcher fields instead of broadening them to wildcards', async () => {
    const queryClient = client();
    const list = builder.data.list('posts', owner);
    const detail = builder.data.one('posts', 1, owner);
    seed(queryClient, [list, detail]);
    await invalidateOwnedQueries({ ...request(queryClient), matcher: { ...matcher, id: undefined }, scopes: ['resourceAll'] });
    expect(invalidated(queryClient, list)).toBe(true);
    expect(invalidated(queryClient, detail)).toBe(false);
    expect(readOwnedDataQuery(list, { ...matcher, action: undefined }, owner)).toBeUndefined();
  });

  it('keeps explicit empty scopes empty and refreshes duplicate scopes only once', async () => {
    const queryClient = client();
    const key = builder.data.list('posts', owner);
    seed(queryClient, [key]);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await invalidateOwnedQueries({ ...request(queryClient), scopes: [] });
    expect(invalidate).not.toHaveBeenCalled();
    await invalidateOwnedQueries({ ...request(queryClient), scopes: ['list', 'list'] });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('snapshots selection before calling a reentrant currentness predicate', async () => {
    const queryClient = client();
    const selected = builder.data.list('posts', owner);
    const detail = builder.data.one('posts', 1, owner);
    const foreign = keys({ ...matcher, tenant: 'second' }).data.list('posts', { ...owner, source: 'source-B' });
    seed(queryClient, [selected, detail, foreign]);
    const input = request(queryClient);
    const scopes: RefreshScope[] = ['list'];
    await invalidateOwnedQueries({ ...input, scopes, current() {
      input.matcher.tenant = 'second';
      input.owner.source = 'source-B';
      scopes.splice(0, 1, 'resourceAll');
      return true;
    } });
    expect(invalidated(queryClient, selected)).toBe(true);
    expect(invalidated(queryClient, detail)).toBe(false);
    expect(invalidated(queryClient, foreign)).toBe(false);
  });

  it('keeps selection stable while cache callbacks mutate the original request', async () => {
    const queryClient = client();
    const one = builder.data.list('posts', { ...owner, page: 1 });
    const two = builder.data.list('posts', { ...owner, page: 2 });
    const foreign = builder.data.list('posts', { ...owner, source: 'source-B' });
    seed(queryClient, [one, two, foreign]);
    const input = request(queryClient);
    subscriptions.push(queryClient.getQueryCache().subscribe(event => {
      if (event.type === 'updated' && event.action.type === 'invalidate') {
        input.owner.source = 'source-B';
        input.matcher.resource = 'other';
        input.scopes.splice(0);
      }
    }));
    await invalidateOwnedQueries(input);
    expect(invalidated(queryClient, one)).toBe(true);
    expect(invalidated(queryClient, two)).toBe(true);
    expect(invalidated(queryClient, foreign)).toBe(false);
  });

  it.each([
    { owner: { source: 'source-A' } }, { owner: { ...owner, authSession: '' } },
    { matcher: { ...matcher, resource: '' } }, { matcher: { ...matcher, provider: '' } },
    { matcher: { ...matcher, tenant: NaN } }, { matcher: { ...matcher, action: 'foreign' } },
    { matcher: { ...matcher, other: true } }, { scopes: ['one'] }, { scopes: 'all' },
    { scopes: false }, { scopes: undefined }, { id: undefined }, { id: Infinity }, { current: true },
    { client: {} }, { extra: undefined },
  ])('rejects malformed refresh request before selection: %#', async patch => {
    const queryClient = client();
    const current = vi.fn(() => true);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const pending: unknown = Reflect.apply(invalidateOwnedQueries, undefined, [{ ...request(queryClient), current, ...patch }]);
    await expect(pending).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_REFRESH_REQUEST' });
    expect(current).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('rejects accessors and hostile metadata reflection without exposing raw errors', async () => {
    const queryClient = client();
    let reads = 0;
    const getter = () => { reads++; throw new Error('secret'); };
    const inputs = [
      Object.defineProperty(request(queryClient), 'owner', { get: getter }),
      { ...request(queryClient), matcher: Object.defineProperty({ ...matcher }, 'tenant', { get: getter }) },
      { ...request(queryClient), owner: Object.defineProperty({ ...owner }, 'source', { get: getter }) },
      { ...request(queryClient), scopes: new Proxy(['list'], { ownKeys() { throw new Error('secret'); } }) },
    ];
    for (const input of inputs) {
      const pending: unknown = Reflect.apply(invalidateOwnedQueries, undefined, [input]);
      await expect(pending).rejects.toMatchObject({ code: 'INVALID_REFRESH_REQUEST', cause: undefined, body: undefined });
    }
    expect(reads).toBe(0);
  });

  it('returns detached descriptors and rejects untagged, malformed or accessor-backed keys', () => {
    const key = builder.data.list('posts', { ...owner, filters: [{ value: 'original' }] });
    const descriptor = readOwnedDataQuery(key, matcher, owner);
    expect(descriptor).toMatchObject({ action: 'list', params: { ...owner, filters: [{ value: 'original' }] } });
    expect(descriptor).not.toBe(key[0]);
    const params = descriptor?.params;
    if (typeof params !== 'object' || params === null) throw new Error('Missing owned params');
    Reflect.set(params, 'source', 'changed');
    expect(readOwnedDataQuery(key, matcher, owner)).toBeDefined();
    let reads = 0;
    const getter = () => { reads++; return owner; };
    for (const value of [
      builder.data.list('posts', {}), builder.data.list('posts', { source: owner.source }),
      [Object.defineProperty({ ...key[0] }, 'params', { get: getter })],
      [{ ...key[0], action: 'foreign' }],
    ]) expect(readOwnedDataQuery(value, matcher, owner)).toBeUndefined();
    expect(reads).toBe(0);
  });

  it.each(['throws', 'truthy', 'async', 'rejected'] as const)('treats a %s currentness receipt as retired', async kind => {
    const queryClient = client();
    const key = builder.data.list('posts', owner);
    seed(queryClient, [key]);
    const current = () => {
      if (kind === 'throws') throw new Error('secret');
      if (kind === 'truthy') return 'yes';
      if (kind === 'async') return Promise.resolve(true);
      return Promise.reject(new Error('secret'));
    };
    const pending: unknown = Reflect.apply(invalidateOwnedQueries, undefined, [{ ...request(queryClient), current }]);
    await expect(pending).rejects.toMatchObject({ code: 'REFRESH_SUPERSEDED', cause: undefined, body: undefined });
    expect(invalidated(queryClient, key)).toBe(false);
  });

  it('stops subsequent dispatches when a cache observer retires the owner', async () => {
    const queryClient = client();
    const one = builder.data.list('posts', { ...owner, page: 1 });
    const two = builder.data.list('posts', { ...owner, page: 2 });
    seed(queryClient, [one, two]);
    let active = true;
    subscriptions.push(queryClient.getQueryCache().subscribe(event => {
      if (event.type === 'updated' && event.action.type === 'invalidate') active = false;
    }));
    await expect(invalidateOwnedQueries({ ...request(queryClient), current: () => active }))
      .rejects.toMatchObject({ code: 'REFRESH_SUPERSEDED' });
    expect(invalidated(queryClient, one)).toBe(true);
    expect(invalidated(queryClient, two)).toBe(false);
  });

  it('does not revive a refresh after any currentness check observes retirement', async () => {
    const queryClient = client();
    const one = builder.data.list('posts', { ...owner, page: 1 });
    const two = builder.data.list('posts', { ...owner, page: 2 });
    seed(queryClient, [one, two]);
    let checks = 0;
    await expect(invalidateOwnedQueries({ ...request(queryClient), current: () => ++checks !== 2 }))
      .rejects.toMatchObject({ code: 'REFRESH_SUPERSEDED' });
    expect(checks).toBe(2);
    expect(invalidated(queryClient, one)).toBe(false);
    expect(invalidated(queryClient, two)).toBe(false);
  });

  it.each([false, true])('waits for all started requests despite failure, retired=%s', async retire => {
    const queryClient = client();
    const one = deferred<GetListResult>();
    const two = deferred<GetListResult>();
    const fetchOne = vi.fn(() => one.promise);
    const fetchTwo = vi.fn(() => two.promise);
    watch(queryClient, builder.data.list('posts', { ...owner, page: 1 }), fetchOne);
    watch(queryClient, builder.data.list('posts', { ...owner, page: 2 }), fetchTwo);
    let active = true;
    let settled = false;
    const pending = invalidateOwnedQueries({ ...request(queryClient), current: () => active });
    void pending.then(() => { settled = true; }, () => { settled = true; });
    await waitFor(() => expect(fetchOne).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchTwo).toHaveBeenCalledTimes(1));
    one.reject(new Error('secret'));
    if (retire) active = false;
    await Promise.resolve();
    expect(settled).toBe(false);
    two.resolve({ data: [], total: 0 });
    await expect(pending).rejects.toMatchObject({
      code: retire ? 'REFRESH_SUPERSEDED' : 'REFRESH_FAILED', body: undefined, cause: undefined,
    });
  });

  it('sanitizes synchronous query-cache and dispatch failures', async () => {
    const queryClient = client();
    const key = builder.data.list('posts', owner);
    seed(queryClient, [key]);
    const find = vi.spyOn(queryClient.getQueryCache(), 'findAll').mockImplementation(() => { throw new Error('secret'); });
    await expect(invalidateOwnedQueries(request(queryClient))).rejects.toMatchObject({ code: 'REFRESH_FAILED', cause: undefined });
    find.mockRestore();
    vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(() => { throw new Error('secret'); });
    await expect(invalidateOwnedQueries(request(queryClient))).rejects.toMatchObject({ code: 'REFRESH_FAILED', cause: undefined });
  });

  it('keeps the actual mounted public refresh hook bound to its checked resource owner', async () => {
    const queryClient = client();
    const posts = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
    const getList = vi.fn<DataProvider['getList']>()
      .mockResolvedValueOnce({ data: [{ id: 1, title: 'Initial' }], total: 1 })
      .mockResolvedValue({ data: [{ id: 1, title: 'Refreshed' }], total: 1 });
    const provider: DataProvider = {
      getApiUrl: () => '/api', getList, getOne: async () => ({ data: {} }), create: async () => ({ data: {} }),
      update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
    };
    let state: ReadState | undefined;
    render(Host, { provider, queryClient, resources: [{ name: 'posts', label: 'Posts', fields: [], contract: posts }],
      kind: 'list', onReady: (value: ReadState) => { state = value; } });
    const read = () => { if (!state) throw new Error('Missing mounted refresh'); return state; };
    await waitFor(() => expect(read().query.isSuccess).toBe(true));
    const untagged = core.keys().data.list('posts');
    queryClient.setQueryData(untagged, { data: [], total: 0 });
    await read().invalidate({ invalidates: ['list'] });
    expect(getList).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(read().query.data).toEqual({ data: [{ id: 1, title: 'Refreshed' }], total: 1 }));
    expect(queryClient.getQueryState(untagged)?.isInvalidated).toBe(false);
  });
});
