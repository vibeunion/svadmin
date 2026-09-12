import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { QueryClient, hashKey } from '@tanstack/svelte-query';
import { Type } from '@sinclair/typebox';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isQueryKey, keys, parseQueryKey, queryKeys, queryKeyMatches, dataQueryMatches } from './query-keys';
import { defineResource } from './resource-contract';
import { resetContext, setDataProvider } from './context.svelte';
import { captureContractContext } from './contract-context.svelte';
import { HttpError, type DataProvider } from './types';
import type { ReadState } from './query-source.test.types';
import Host from './query-source.test-host.svelte';

const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  vi.restoreAllMocks();
});
function rejectedKey(action: () => unknown): HttpError {
  try { action(); } catch (cause) {
    if (cause instanceof HttpError) return cause;
    throw new Error('Expected a checked key error');
  }
  throw new Error('Expected an invalid key');
}

describe('query-keys v2', () => {
  it('strictly compiles key boundaries, mounted fixtures and negative type cases', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const roots = ['query-keys.ts', 'contract-context.svelte.ts', 'query-invalidation.ts',
      'query-keys.test.svelte.ts', 'query-source.test.types.ts'].map(name => resolve(directory, name));
    const virtual = new Map(['query-source.test-host.svelte', 'query-source.test-probe.svelte'].map(name => {
      const path = resolve(directory, name);
      return [`${path}.tsx`, svelte2tsx(readFileSync(path, 'utf8'), { filename: path, isTsFile: true, mode: 'ts' }).code];
    }));
    const negativePath = resolve(directory, 'query-keys.test.virtual.ts');
    const valid = [
      "import { keys, queryKeys, parseQueryKey, isQueryKey, queryKeyMatches, dataQueryMatches, type QueryKey } from './index';",
      'declare const raw: unknown;',
      'const validity: boolean = isQueryKey(raw);',
      'const descriptor = parseQueryKey(raw);',
      'if (descriptor) { const provider: string = descriptor.provider; }',
      'if (descriptor?.kind === "data") { const resource: string = descriptor.resource; }',
      'if (descriptor?.kind === "data" && descriptor.action === "one") { const id: string | number = descriptor.id; }',
      'if (descriptor?.kind === "task" && descriptor.action === "one") { const id: string | number = descriptor.id; }',
      'if (descriptor?.kind === "custom") { const id: string | number = descriptor.id; const resource: string = descriptor.resource; }',
      'const builder = keys({ provider: "cms", tenant: "first", contract: "posts-v1" });',
      'const list: QueryKey = builder.data.list("posts", { page: 1 });',
      'const match: boolean = queryKeyMatches(list, { provider: undefined, tenant: undefined });',
      'const data: boolean = dataQueryMatches(list, { resource: "posts", id: undefined });',
    ];
    const invalid = [
      'if (isQueryKey(raw)) { const key: QueryKey = raw; }',
      'if (isQueryKey(raw)) { const provider = raw[0].provider; }',
      'builder.data.list("posts")[0].provider = "other";',
      'builder.data.list = () => list;',
      'builder.data = queryKeys.data;',
      'queryKeys.custom.call = () => list;',
      'keys({ provider: 1 });',
      'keys({ namespace: "foreign" });',
      'keys({ action: "ignored" });',
      'keys({ provider: undefined });',
      'builder.data.one("posts", true);',
      'builder.data.list(1);',
      'queryKeyMatches(list, { unexpected: true });',
      'queryKeyMatches(list, { kind: "foreign" });',
      'dataQueryMatches(list, {});',
      'dataQueryMatches(list, { resource: "posts", kind: "data" });',
      'if (descriptor) descriptor.namespace = "other";',
      'if (descriptor) { const page: number = descriptor.params.page; }',
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
    const program = ts.createProgram({ rootNames: [...roots, ...virtual.keys(),
      resolve(directory, '../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
      resolve(directory, '../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
    ], options, host });
    const diagnostics = (path: string) => {
      const source = program.getSourceFile(path);
      if (!source) throw new Error(`Missing source ${path}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    };
    expect([...roots, ...virtual.keys()].filter(path => path !== negativePath).flatMap(diagnostics)
      .map(item => `${item.file?.fileName}:${item.start}: ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`)).toEqual([]);
    expect(diagnostics(negativePath).map(item => item.file && item.start !== undefined
      ? item.file.getLineAndCharacterOfPosition(item.start).line : -1)).toEqual(invalid.map((_, index) => valid.length + index));
  }, 30_000);

  it('builds data keys', () => {
    const k = keys({ provider: 'default', tenant: 'tenant-a', resource: 'posts', method: 'post' });

    expect(k.data.list('posts', { page: 2 })[0].kind).toBe('data');
    expect(k.data.list('posts', { page: 2 })[0].params).toEqual({ page: 2 });
    expect(k.data.infiniteList('posts')[0].action).toBe('infiniteList');
    expect(k.data.one('posts', 1, { locale: 'zh-CN' })[0]).toMatchObject({ id: 1, params: { locale: 'zh-CN' } });
    expect(k.data.many('posts', { perPage: 10 })[0].params).toMatchObject({ perPage: 10 });
    expect(k.data.select('posts')[0].action).toBe('select');
    expect(k.data.selectDefaults('posts')[0].action).toBe('selectDefaults');
  });

  it('builds task keys', () => {
    const k = keys({ provider: 'dp' });

    expect(k.task.list({ queue: 'default' })[0]).toMatchObject({ kind: 'task', params: { queue: 'default' } });
    expect(k.task.list()[0].action).toBe('list');
    expect(k.task.one('42')[0].action).toBe('one');
    expect(k.task.one('42')[0].id).toBe('42');
  });

  it('builds access and custom keys', () => {
    const k = keys({ provider: 'auth' });

    expect(k.access.can()[0].kind).toBe('access');
    expect(k.custom.call('users', 'u1', 'get', { include: 'meta' })[0].kind).toBe('custom');
    expect(k.custom.call('users', 'u1', 'get', { include: 'meta' })[0].resource).toBe('users');
    expect(k.custom.call('users', 'u1', 'get', { include: 'meta' })[0].method).toBe('get');
  });

  it('rejects legacy tuple shapes', () => {
    expect(parseQueryKey(['default', 'posts', 'list'])).toBeUndefined();
    expect(isQueryKey(['default', 'posts'])).toBe(false);
  });

  it('requires non-empty provider and defaults undefined to default', () => {
    expect(keys().data.list('posts')[0].provider).toBe('default');
    expect(rejectedKey(() => keys({ provider: '' }).data.list('posts'))).toMatchObject({ code: 'INVALID_QUERY_KEY' });
    expect(queryKeys.data.list('posts')[0]).toBeTruthy();
  });

  it('matches with wildcard and exact fields', () => {
    const key = keys({ provider: 'p1', tenant: 'tenant-a' }).data.one('posts', '12');

    expect(queryKeyMatches(key, {})).toBe(true);
    expect(queryKeyMatches(key, { provider: 'p1' })).toBe(true);
    expect(queryKeyMatches(key, { provider: 'default' })).toBe(false);
    expect(queryKeyMatches(key, { tenant: undefined })).toBe(false);
    expect(queryKeyMatches(key, { tenant: 'tenant-a' })).toBe(true);
    expect(queryKeyMatches(key, { resource: 'posts' })).toBe(true);
    expect(queryKeyMatches(key, { resource: undefined })).toBe(false);
    expect(queryKeyMatches(key, { action: 'one' })).toBe(true);
    expect(queryKeyMatches(key, { action: undefined })).toBe(false);
    expect(queryKeyMatches(key, { id: '12' })).toBe(true);
    expect(queryKeyMatches(key, { method: undefined })).toBe(true);
    expect(queryKeyMatches(key, { method: 'post' })).toBe(false);
  });

  it('parses only v2 descriptor tuple', () => {
    const descriptor = keys().task.list()[0];
    const parsed = parseQueryKey([descriptor]);
    const expected = parseQueryKey([descriptor]);

    expect(parsed).toEqual(expected);
    expect(parsed).not.toBe(expected);
    expect(parsed?.namespace).toBe('svadmin');
    expect(parsed?.version).toBe(2);
    expect(parseQueryKey(descriptor)).toBeUndefined();
    expect(queryKeys.task.one('42')[0].kind).toBe('task');
    expect(isQueryKey([descriptor])).toBe(true);
  });

  it('rejects malformed descriptor fields before diagnostics or matching', () => {
    const valid = keys().data.list('posts')[0];

    expect(parseQueryKey([{ ...valid, tenant: { secret: true } }])).toBeUndefined();
    expect(parseQueryKey([{ ...valid, resource: { secret: true } }])).toBeUndefined();
    expect(parseQueryKey([{ ...valid, id: { secret: true } }])).toBeUndefined();
    expect(parseQueryKey([{ ...valid, method: { secret: true } }])).toBeUndefined();
    expect(parseQueryKey([{ ...valid, action: 'unknown' }])).toBeUndefined();
    expect(parseQueryKey([{ ...keys().custom.call('health', 'request')[0], action: { secret: true } }])).toBeUndefined();
  });

  it('supports matcher exact kind constraints', () => {
    const key = keys({ provider: 'p1' }).custom.call('users', 'u1', 'post');

    expect(queryKeyMatches(key, { kind: 'custom' })).toBe(true);
    expect(queryKeyMatches(key, { kind: 'data' })).toBe(false);
    expect(queryKeyMatches(key, { kind: 'custom', provider: 'p1', resource: 'users' })).toBe(true);
    expect(queryKeyMatches(key, { kind: 'custom', provider: 'p1', resource: 'posts' })).toBe(false);
  });

  it('does not bypass tenant or resource constraints when selecting the default provider', () => {
    const key = keys({ tenant: 'tenant-a' }).data.one('posts', 1);
    expect(queryKeyMatches(key, { provider: undefined, tenant: 'tenant-b' })).toBe(false);
    expect(queryKeyMatches(key, { provider: undefined, resource: 'users' })).toBe(false);
    expect(queryKeyMatches(key, { provider: undefined, tenant: 'tenant-a', resource: 'posts' })).toBe(true);
  });

  it('validates contract identity and rejects added descriptor fields', () => {
    const valid = keys({ contract: 'schema-v1' }).data.list('posts')[0];
    expect(parseQueryKey([valid])).toEqual(valid);
    expect(parseQueryKey([valid])).not.toBe(valid);
    expect(parseQueryKey([{ ...valid, contract: 1 }])).toBeUndefined();
    expect(parseQueryKey([{ ...valid, contract: '' }])).toBeUndefined();
    expect(parseQueryKey([{ ...valid, unexpected: true }])).toBeUndefined();
    expect(parseQueryKey([{ ...valid, id: Number.NaN }])).toBeUndefined();
    expect(parseQueryKey([{ ...valid, tenant: Infinity }])).toBeUndefined();
    expect(parseQueryKey([{ ...valid, tenant: undefined }])).toBeUndefined();
    expect(parseQueryKey([{ ...keys().access.can()[0], action: undefined }])).toBeUndefined();
  });

  it('retains contract scope across every builder family without reflective dispatch', () => {
    const builder = keys({ contract: 'schema-v1', tenant: 'tenant-a' });
    for (const key of [
      builder.data.list('posts'), builder.data.infiniteList('posts'), builder.data.one('posts', 1),
      builder.data.many('posts', {}), builder.data.select('posts'), builder.data.selectDefaults('posts'),
      builder.task.list(), builder.task.one(1), builder.access.can('posts'), builder.custom.call('posts', 1),
    ]) {
      expect(parseQueryKey(key)).toMatchObject({ contract: 'schema-v1', tenant: 'tenant-a' });
      expect(queryKeyMatches(key, {})).toBe(false);
      expect(queryKeyMatches(key, { contract: 'schema-v1' })).toBe(true);
    }
  });

  it('snapshots builder context, default params and explicit key parameters', () => {
    const defaults = { nested: { value: 'default' } };
    const context = { provider: 'cms', tenant: 'first', params: defaults };
    const builder = keys(context);
    context.provider = 'other';
    context.tenant = 'second';
    defaults.nested.value = 'modified';
    const params = { filters: [{ field: 'title', value: 'original' }] };
    const key = builder.data.list('posts', params);
    const hash = hashKey(key);
    params.filters.push({ field: 'title', value: 'changed' });
    expect(hashKey(key)).toBe(hash);
    expect(key[0]).toMatchObject({ provider: 'cms', tenant: 'first', params: { filters: [{ field: 'title', value: 'original' }] } });
    expect(builder.data.list('posts')[0].params).toEqual({ nested: { value: 'default' } });
  });

  it('freezes generated tuples, descriptors, nested params and all builder controls', () => {
    const builder = keys({ params: { nested: { values: [1] } } });
    const key = builder.data.list('posts');
    const params = key[0].params;
    if (typeof params !== 'object' || params === null) throw new Error('Missing key params');
    const nested: unknown = Reflect.get(params, 'nested');
    if (typeof nested !== 'object' || nested === null) throw new Error('Missing nested params');
    expect(Object.isFrozen(key)).toBe(true);
    expect(Object.isFrozen(key[0])).toBe(true);
    expect(Object.isFrozen(params)).toBe(true);
    expect(Object.isFrozen(nested)).toBe(true);
    expect(Reflect.set(key, '0', {})).toBe(false);
    expect(Reflect.set(key[0], 'provider', 'other')).toBe(false);
    expect(Reflect.set(params, 'source', 'foreign')).toBe(false);
    expect(Reflect.set(nested, 'values', [])).toBe(false);
    expect(Reflect.set(builder, 'data', {})).toBe(false);
    for (const controls of [builder.data, builder.task, builder.access, builder.custom]) {
      expect(Object.isFrozen(controls)).toBe(true);
    }
    expect(Reflect.set(builder.data, 'list', () => [])).toBe(false);
    expect(Reflect.set(queryKeys.custom, 'call', () => [])).toBe(false);
  });

  it('creates independent parser snapshots without freezing or modifying caller objects', () => {
    const params = { source: 'source-A', nested: { value: 'original' } };
    const descriptor = { ...keys({ provider: 'cms' }).data.list('posts')[0], params };
    const first = parseQueryKey([descriptor]);
    const second = parseQueryKey([descriptor]);
    descriptor.provider = 'other';
    params.nested.value = 'changed';
    expect(Object.isFrozen(descriptor)).toBe(false);
    expect(Object.isFrozen(params)).toBe(false);
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ provider: 'cms', params: { source: 'source-A', nested: { value: 'original' } } });
    if (!first) throw new Error('Missing parsed key');
    expect(Reflect.set(first, 'provider', 'poison')).toBe(false);
  });

  it('returns a descriptor snapshot rather than a proxy whose reads contradict its descriptors', () => {
    const valid = { ...keys({ provider: 'cms' }).data.list('posts')[0] };
    const proxy = new Proxy(valid, { get(target, key) { return key === 'provider' ? 42 : Reflect.get(target, key); } });
    expect(parseQueryKey([proxy])?.provider).toBe('cms');
    expect(isQueryKey([proxy])).toBe(true);
    expect(proxy.provider).toBe(42);
  });

  it('omits absent params consistently without changing canonical query hashes', () => {
    for (const key of [
      queryKeys.data.list('posts'), queryKeys.data.infiniteList('posts'), queryKeys.data.one('posts', 1),
      queryKeys.data.many('posts', undefined), queryKeys.data.select('posts'), queryKeys.data.selectDefaults('posts'),
      queryKeys.task.list(), queryKeys.task.one(1), queryKeys.access.can(), queryKeys.custom.call('posts', 1),
    ]) {
      expect(Object.hasOwn(key[0], 'params')).toBe(false);
      expect(parseQueryKey(key)).toBeDefined();
      expect(hashKey(key)).toBe(hashKey([{ ...key[0], params: undefined }]));
      expect(parseQueryKey([{ ...key[0], params: undefined }])).toBeUndefined();
    }
    expect(keys({ params: undefined }).data.list('posts')[0].params).toBeUndefined();
  });

  it.each([
    null, [], { provider: 1 }, { provider: '' }, { tenant: Infinity }, { contract: '' },
    { namespace: 'foreign' }, { action: 'ignored' }, { unexpected: undefined }, { provider: undefined },
  ])('rejects invalid builder contexts without exposing submitted data: %#', context => {
    const error = rejectedKey(() => Reflect.apply(keys, undefined, [context]));
    expect(error).toMatchObject({ statusCode: 422, code: 'INVALID_QUERY_KEY', cause: undefined, body: undefined });
  });

  it.each([new Date(), () => {}, Symbol('secret'), NaN, Infinity, { value: undefined }, new Array(2)])(
    'rejects unstable or non-JSON key params: %#', params => {
      expect(rejectedKey(() => queryKeys.data.list('posts', params))).toMatchObject({ code: 'INVALID_QUERY_KEY' });
      expect(parseQueryKey([{ ...queryKeys.data.list('posts')[0], params }])).toBeUndefined();
    },
  );

  it('rejects accessors, serialization functions, cycles and hostile reflection', () => {
    let calls = 0;
    const getter = () => { calls++; throw new Error('secret'); };
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    const params: unknown[] = [
      { get source() { return getter(); } },
      { toJSON() { return getter(); } },
      cyclic,
      Object.defineProperty({}, 'secret', { value: 'secret' }),
      { [Symbol('secret')]: 'secret' },
      new Proxy({}, { ownKeys() { throw new Error('secret'); } }),
    ];
    for (const value of params) {
      expect(rejectedKey(() => keys({ params: value }))).toMatchObject({ code: 'INVALID_QUERY_KEY', cause: undefined });
      expect(parseQueryKey([{ ...queryKeys.data.list('posts')[0], params: value }])).toBeUndefined();
    }
    const context = Object.defineProperty({}, 'provider', { get: getter, enumerable: true });
    expect(rejectedKey(() => Reflect.apply(keys, undefined, [context])).code).toBe('INVALID_QUERY_KEY');
    const descriptor = Object.defineProperty({ ...queryKeys.data.list('posts')[0] }, 'provider', { get: getter });
    expect(parseQueryKey([descriptor])).toBeUndefined();
    expect(isQueryKey([descriptor])).toBe(false);
    expect(calls).toBe(0);
  });

  it.each([
    ['resource', undefined], ['resource', false], ['id', undefined], ['id', {}], ['id', NaN], ['id', Infinity], ['method', {}],
  ] as const)('validates %s passed by JavaScript callers', (field, value) => {
    const run = field === 'resource'
      ? () => Reflect.apply(queryKeys.data.list, undefined, [value])
      : field === 'id' ? () => Reflect.apply(queryKeys.data.one, undefined, ['posts', value])
        : () => Reflect.apply(queryKeys.custom.call, undefined, ['posts', 1, value]);
    expect(rejectedKey(run).code).toBe('INVALID_QUERY_KEY');
  });

  it('requires resource and identity fields consistently across builders and parsed keys', () => {
    const malformed = [
      { ...queryKeys.data.list('posts')[0] },
      { ...queryKeys.data.one('posts', 1)[0] },
      { ...queryKeys.task.one(1)[0] },
      { ...queryKeys.custom.call('posts', 1)[0] },
    ];
    for (const descriptor of malformed) {
      if (descriptor.kind === 'data' && descriptor.action === 'list') Reflect.deleteProperty(descriptor, 'resource');
      else Reflect.deleteProperty(descriptor, 'id');
      expect(parseQueryKey([descriptor])).toBeUndefined();
      expect(isQueryKey([descriptor])).toBe(false);
    }
    expect(rejectedKey(() => Reflect.apply(queryKeys.task.one, undefined, [undefined])).code).toBe('INVALID_QUERY_KEY');
    expect(rejectedKey(() => Reflect.apply(queryKeys.custom.call, undefined, ['posts', undefined])).code).toBe('INVALID_QUERY_KEY');
    expect(rejectedKey(() => Reflect.apply(queryKeys.custom.call, undefined, [undefined, 1])).code).toBe('INVALID_QUERY_KEY');
  });
  it.each([
    null, [], { provider: {} }, { tenant: Infinity }, { contract: '' }, { kind: 'foreign' },
    { kind: undefined }, { unexpected: true }, { unexpected: undefined }, { id: NaN },
  ])('rejects malformed matchers without broadening a match: %#', matcher => {
    const key = queryKeys.data.one('posts', 1);
    const result: unknown = Reflect.apply(queryKeyMatches, undefined, [key, matcher]);
    expect(result).toBe(false);
  });

  it('does not execute matcher accessors or let data matchers smuggle a different kind', () => {
    const key = queryKeys.data.one('posts', 1);
    let calls = 0;
    const matcher = { get resource() { calls++; return 'posts'; } };
    expect(queryKeyMatches(key, matcher)).toBe(false);
    expect(dataQueryMatches(key, matcher)).toBe(false);
    const extra: unknown = Reflect.apply(dataQueryMatches, undefined, [key, { resource: 'posts', kind: 'custom' }]);
    expect(extra).toBe(false);
    const absent: unknown = Reflect.apply(dataQueryMatches, undefined, [key, { resource: undefined }]);
    expect(absent).toBe(false);
    expect(calls).toBe(0);
  });

  it('captures matchers before key reflection can mutate caller-owned constraints', () => {
    const matcher = { tenant: 'first', resource: 'posts' };
    const descriptor = new Proxy({ ...keys({ tenant: 'first' }).data.list('posts')[0] }, {
      ownKeys(target) { matcher.tenant = 'second'; return Reflect.ownKeys(target); },
    });
    expect(queryKeyMatches([descriptor], matcher)).toBe(true);
    expect(matcher.tenant).toBe('second');
  });

  it('keeps numeric and textual identifiers and explicit undefined fields distinct', () => {
    const numeric = queryKeys.data.one('posts', 1);
    const textual = queryKeys.data.one('posts', '1');
    expect(queryKeyMatches(numeric, { id: '1' })).toBe(false);
    expect(queryKeyMatches(textual, { id: 1 })).toBe(false);
    expect(queryKeyMatches(numeric, { id: undefined })).toBe(false);
    expect(queryKeyMatches(queryKeys.data.list('posts'), { id: undefined })).toBe(true);
    expect(queryKeyMatches(numeric, { provider: undefined, resource: 'other' })).toBe(false);
  });

  it('preserves the default resource when projecting a contract key context', () => {
    const provider: DataProvider = {
      getApiUrl: () => '/api', getList: async () => ({ data: [], total: 0 }),
      getOne: async () => ({ data: {} }), create: async () => ({ data: {} }),
      update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
    };
    setDataProvider(provider);
    const posts = defineResource('posts', { record: Type.Object({ id: Type.Number() }) });
    const builder = captureContractContext({ contract: posts }).queryKeys('posts');
    expect(builder.access.can()[0]).toMatchObject({ provider: 'default', resource: 'posts' });
    expect(builder.task.list()[0]).toMatchObject({ provider: 'default', resource: 'posts' });
    expect(typeof builder.access.can()[0].contract).toBe('string');
  });

  it('keeps mounted contract key ownership and public refresh intact', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    clients.push(client);
    const posts = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
    const getList = vi.fn<DataProvider['getList']>()
      .mockResolvedValueOnce({ data: [{ id: 1, title: 'Initial' }], total: 1 })
      .mockResolvedValue({ data: [{ id: 1, title: 'Refreshed' }], total: 1 });
    const provider: DataProvider = {
      getApiUrl: () => '/api', getList, getOne: async () => ({ data: {} }), create: async () => ({ data: {} }),
      update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
    };
    let state: ReadState | undefined;
    render(Host, { provider: { cms: provider }, resources: [{ name: 'posts', label: 'Posts', fields: [], contract: posts }],
      queryClient: client, kind: 'list', providerOverride: 'cms', tenant: 'first',
      onReady: (value: ReadState) => { state = value; } });
    const read = () => { if (!state) throw new Error('Missing query'); return state; };
    await waitFor(() => expect(read().query.isSuccess).toBe(true));
    const descriptor = client.getQueryCache().getAll().map(query => parseQueryKey(query.queryKey)).find(key => key?.kind === 'data');
    expect(descriptor).toMatchObject({ provider: 'cms', tenant: 'first', resource: 'posts',
      params: { authSession: 'anonymous' } });
    expect(typeof descriptor?.contract).toBe('string');
    const params = descriptor?.params;
    if (typeof params !== 'object' || params === null) throw new Error('Missing key params');
    const source: unknown = Reflect.get(params, 'source');
    expect(typeof source).toBe('string');
    await read().invalidate({ invalidates: ['list'] });
    expect(getList).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(read().query.data).toEqual({ data: [{ id: 1, title: 'Refreshed' }], total: 1 }));
  });
});
