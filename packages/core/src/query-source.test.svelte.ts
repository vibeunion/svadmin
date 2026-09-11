import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { Type } from '@sinclair/typebox';
import type { ComponentProps } from 'svelte';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { svelte2tsx } from 'svelte2tsx';
import ts from 'typescript';
import { defineResource, parseContractRecord } from './resource-contract';
import { decodeListResult, decodeOneResult, decodeManyResult } from './record-decoder';
import { createSelectProjection } from './select-options';
import { resetContext } from './context.svelte';
import { captureAuthLiveScope, resetLogoutVersion } from './auth-hooks.svelte';
import type { AuthErrorResult } from './auth-query-contract';
import { HttpError, type AuthProvider, type AuthActionResult, type BaseRecord, type DataProvider,
  type ResourceDefinition, type GetOneParams, type GetManyParams, type Filter, type Sort } from './types';
import { snapshotOneParams, snapshotManyParams } from './query-snapshot';
import type { ReadKind, ReadState } from './query-source.test.types';
import Host from './query-source.test-host.svelte';

const kinds: ReadKind[] = ['list', 'one', 'many', 'show', 'table'];
const posts = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const other = defineResource('other', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const postDefinition: ResourceDefinition = { name: 'posts', label: 'Posts', fields: [], contract: posts };
const resources: ResourceDefinition[] = [postDefinition, { name: 'other', label: 'Other', fields: [], contract: other }];
const clients: QueryClient[] = [];

function client() {
  const value = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(value);
  return value;
}

function provider(title = 'First'): DataProvider {
  return {
    getApiUrl: () => '/api',
    getList: vi.fn(async () => ({ data: [{ id: 1, title }], total: 1 })),
    getOne: vi.fn(async ({ id }: GetOneParams) => ({ data: { id, title } })),
    getMany: vi.fn(async ({ ids }: GetManyParams) => ({ data: ids.map(id => ({ id, title })) })),
    create: async () => ({ data: {} }), update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
  };
}

function mount(
  kind: ReadKind, source = provider(), queryClient = client(),
  options: Partial<Omit<ComponentProps<typeof Host>, 'provider' | 'resources' | 'kind' | 'queryClient' | 'onReady'>> = {},
) {
  let state: ReadState | undefined;
  const view = render(Host, { provider: source, resources, kind, queryClient, ...options, onReady: (value: ReadState) => { state = value; } });
  return {
    view, queryClient,
    read() {
      if (!state) throw new Error('Expected a mounted read hook');
      return state;
    },
  };
}

function replaceCache(app: ReturnType<typeof mount>, data: unknown) {
  const cached = app.queryClient.getQueryCache().getAll()[0];
  if (!cached) throw new Error('Expected a populated query cache');
  // setQueryData may inspect values during structural sharing; this injects raw cache state.
  cached.setState({
    data, status: 'success', error: null,
    dataUpdatedAt: Math.max(Date.now(), cached.state.dataUpdatedAt + 1),
    dataUpdateCount: cached.state.dataUpdateCount + 1,
  });
  return cached;
}

function cacheReceipt(kind: ReadKind, data: unknown) {
  return kind === 'one' || kind === 'show' ? { data }
    : kind === 'many' ? { data: [data] } : { data: [data], total: 1 };
}

function readMethod(source: DataProvider, kind: ReadKind) {
  if (kind === 'many') {
    if (!source.getMany) throw new Error('Expected getMany in this fixture');
    return source.getMany;
  }
  return kind === 'one' || kind === 'show' ? source.getOne : source.getList;
}

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Request not initialized'); };
  let reject: (reason: unknown) => void = () => { throw new Error('Request not initialized'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function auth(): AuthProvider {
  return {
    login: vi.fn(async () => ({ success: true })),
    logout: vi.fn(async () => ({ success: true })),
    check: vi.fn(async () => ({ authenticated: true })),
    getIdentity: vi.fn(async () => null),
    onError: vi.fn(async () => ({})),
  };
}

function pendingProvider(pending: Promise<BaseRecord>): DataProvider {
  return {
    ...provider('New'),
    getList: vi.fn<DataProvider['getList']>()
      .mockImplementationOnce(async () => ({ data: [await pending], total: 1 }))
      .mockResolvedValue({ data: [{ id: 1, title: 'New' }], total: 1 }),
    getOne: vi.fn<DataProvider['getOne']>()
      .mockImplementationOnce(async () => ({ data: await pending }))
      .mockResolvedValue({ data: { id: 1, title: 'New' } }),
    getMany: vi.fn<NonNullable<DataProvider['getMany']>>()
      .mockImplementationOnce(async () => ({ data: [await pending] }))
      .mockResolvedValue({ data: [{ id: 1, title: 'New' }] }),
  };
}

afterEach(() => {
  cleanup();
  for (const value of clients.splice(0)) value.clear();
  resetContext();
  resetLogoutVersion();
  vi.restoreAllMocks();
});

describe('standard query provider sources', () => {
  it('preserves actual query-result discriminants under the strict TypeScript compiler', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ['query-source.test.type-fixture.ts', 'query-source.test.types.ts', 'query-source.test.svelte.ts',
      'session-query.svelte.ts', 'query-hooks.svelte.ts', 'auth-hooks.svelte.ts', 'record-decoder.ts',
      'query-snapshot.ts', 'select-options.ts'].map(file => resolve(directory, file));
    const virtual = new Map(['query-source.test-host.svelte', 'query-source.test-probe.svelte'].map(file => {
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
    expect(diagnostics.map(diagnostic =>
      `${diagnostic.file?.fileName ?? ''}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
    )).toEqual([]);
  });

  it('derives detached receipt types from decoders without admitting caller-selected result types', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const virtualPath = resolve(directory, 'query-source.test.decoder.virtual.ts');
    const accepted = [
      "import { Type } from '@sinclair/typebox';",
      "import { defineResource, parseContractRecord } from './resource-contract';",
      "import { decodeOneResult, decodeManyResult, decodeListResult } from './record-decoder';",
      'declare const untrusted: unknown;',
      'const resource = defineResource("posts", { record: Type.Object({ id: Type.Number(), title: Type.String() }) });',
      'const decode = (input: unknown) => parseContractRecord(resource, input);',
      'const one = decodeOneResult(untrusted, decode);',
      'const title: string = one.data.title;',
      'const many = decodeManyResult(untrusted, decode);',
      'const id: number | undefined = many.data[0]?.id;',
      'const list = decodeListResult(untrusted, decode);',
      'const extension: unknown = list["cursor"];',
    ];
    const rejected = [
      'const wrongId: string = one.data.id;',
      'one.data.missing;',
      'const wrongRows: { title: number }[] = many.data;',
      'const guessedExtension: string = list["cursor"];',
      'decodeOneResult<{ id: boolean }>(untrusted, decode);',
      'const uncheckedFirst: number = many.data[0].id;',
    ];
    const options: ts.CompilerOptions = {
      strict: true, noEmit: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false,
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: ['svelte', 'node'], allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = file => file === virtualPath ? [...accepted, ...rejected].join('\n') : read(file);
    host.fileExists = file => file === virtualPath || exists(file);
    const program = ts.createProgram([virtualPath], options, host);
    const source = program.getSourceFile(virtualPath);
    if (!source) throw new Error('Expected virtual receipt types');
    const diagnostics = [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    expect(diagnostics.map(item => item.start === undefined ? -1 : source.getLineAndCharacterOfPosition(item.start).line))
      .toEqual(rejected.map((_, index) => accepted.length + index));
  });

  it.each(kinds)('isolates %s reads sharing a client and identical resource, tenant and provider name', async kind => {
    const shared = client();
    const first = mount(kind, provider('First'), shared);
    await waitFor(() => expect(first.read().query.isSuccess).toBe(true));
    const source = provider('Second');
    const second = mount(kind, source, shared);
    await waitFor(() => expect(second.read().query.isSuccess).toBe(true));
    expect(JSON.stringify(first.read().query.data)).toContain('First');
    expect(JSON.stringify(second.read().query.data)).toContain('Second');
    const method = kind === 'many' ? source.getMany : kind === 'one' || kind === 'show' ? source.getOne : source.getList;
    expect(method).toHaveBeenCalledOnce();
  });

  it.each(kinds)('still deduplicates %s reads of the same raw provider instance', async kind => {
    const shared = client();
    const source = provider();
    const first = mount(kind, source, shared);
    await waitFor(() => expect(first.read().query.isSuccess).toBe(true));
    const second = mount(kind, source, shared);
    await waitFor(() => expect(second.read().query.isSuccess).toBe(true));
    expect(readMethod(source, kind)).toHaveBeenCalledOnce();
  });

  it.each(kinds)('isolates explicit %s refresh from another same-name provider instance', async kind => {
    const shared = client();
    const firstSource = provider('First');
    const secondSource = provider('Second');
    const first = mount(kind, firstSource, shared);
    const second = mount(kind, secondSource, shared);
    await waitFor(() => expect(first.read().query.isSuccess && second.read().query.isSuccess).toBe(true));
    await first.read().invalidate();
    expect(readMethod(firstSource, kind)).toHaveBeenCalledTimes(2);
    expect(readMethod(secondSource, kind)).toHaveBeenCalledOnce();
  });

  it.each(kinds)('rekeys %s when the provider instance changes despite an indefinitely fresh old cache', async kind => {
    const app = mount(kind);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const next = provider('Replacement');
    await app.view.rerender({ provider: next });
    await waitFor(() => expect(JSON.stringify(app.read().query.data)).toContain('Replacement'));
    expect(readMethod(next, kind)).toHaveBeenCalledOnce();
  });

  describe.each(['list', 'one', 'many'] as const)('%s deferred reads', kind => {
    it.each(['resource', 'tenant', 'provider', 'schema', 'metadata'] as const)(
      'keeps late responses bound to the old request after a %s change', async change => {
        const pending = deferred<BaseRecord>();
        const source = pendingProvider(pending.promise);
        const app = mount(kind, source);
        await waitFor(() => expect(readMethod(source, kind)).toHaveBeenCalledOnce());
        const original = app.queryClient.getQueryCache().getAll()[0];
        if (!original) throw new Error('Expected the original query');
        switch (change) {
          case 'resource': await app.view.rerender({ resource: 'other' }); break;
          case 'tenant': await app.view.rerender({ tenant: 'second' }); break;
          case 'provider': await app.view.rerender({ provider: provider('New') }); break;
          case 'schema': await app.view.rerender({ resources: [{
            ...postDefinition, contract: defineResource('posts', {
              record: Type.Object({ id: Type.Number(), title: Type.Literal('New') }),
            }),
          }] }); break;
          case 'metadata': await app.view.rerender({ meta: { region: 'second' } }); break;
        }
        await waitFor(() => expect(JSON.stringify(app.read().query.data)).toContain('New'));
        pending.resolve({ id: 1, title: 'Old' });
        await waitFor(() => expect(original.state.status).toBe('success'));
        expect(JSON.stringify(original.state.data)).toContain('Old');
        expect(JSON.stringify(app.read().query.data)).toContain('New');
      },
    );

    it('rejects accessor-backed records before the business schema can execute the getter', async () => {
      const getter = vi.fn(() => 'private');
      const record = Object.defineProperty({ id: 1 }, 'title', { enumerable: true, get: getter });
      const source: DataProvider = {
        ...provider(),
        getList: async () => ({ data: [record], total: 1 }),
        getOne: async () => ({ data: record }),
        getMany: async () => ({ data: [record] }),
      };
      const app = mount(kind, source);
      await waitFor(() => expect(app.read().query.isError).toBe(true));
      expect(app.read().query.error).toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
      expect(getter).not.toHaveBeenCalled();
      expect(app.read().query.data).toBeUndefined();
    });

    it('returns detached records that later provider mutations cannot corrupt', async () => {
      const record = { id: 1, title: 'Before' };
      const source: DataProvider = {
        ...provider(),
        getList: async () => ({ data: [record], total: 1 }),
        getOne: async () => ({ data: record }),
        getMany: async () => ({ data: [record] }),
      };
      const app = mount(kind, source);
      await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
      record.title = 'After';
      expect(JSON.stringify(app.read().query.data)).toContain('Before');
    });

    it('rejects explicit metadata accessors before the context merge executes them', () => {
      const getter = vi.fn(() => 'private');
      const meta = Object.defineProperty({}, 'token', { enumerable: true, get: getter });
      const source = provider();
      expect(() => mount(kind, source, client(), { meta })).toThrowError(expect.objectContaining({ code: 'INVALID_RESOURCE_INPUT' }));
      expect(getter).not.toHaveBeenCalled();
      expect(readMethod(source, kind)).not.toHaveBeenCalled();
    });
  });

  it.each(kinds)('uses captured parameters for deferred %s execution and never shares the request object with its cache key', async kind => {
    const ids = [1, 2];
    const meta = { nested: { tag: 'original' } };
    const filters: Filter[] = [{ field: 'title', operator: 'eq', value: 'Original' }];
    const sorters: Sort[] = [{ field: 'title', order: 'asc' }];
    const pagination = { current: 1, pageSize: 3 };
    const source = provider();
    const app = mount(kind, source, client(), { ids, meta, filters, sorters, pagination });
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const original = app.queryClient.getQueryCache().getAll()[0];
    const fn = original?.options.queryFn;
    if (!original || typeof fn !== 'function') throw new Error('Expected a captured query function');
    const keyBefore = JSON.stringify(original.queryKey);
    const firstInput = vi.mocked(readMethod(source, kind)).mock.calls[0]?.[0];
    if (!firstInput) throw new Error('Expected a dispatched read');
    Reflect.set(firstInput, 'meta', { changedByProvider: true });
    Reflect.set(firstInput, 'ids', [99]);
    ids.splice(0, 2, 3);
    meta.nested.tag = 'changed';
    filters.splice(0);
    sorters.splice(0);
    pagination.pageSize = 99;
    await fn({ client: app.queryClient, queryKey: original.queryKey, signal: new AbortController().signal, meta: undefined });
    const actual = vi.mocked(readMethod(source, kind)).mock.calls.at(-1)?.[0];
    expect(actual).toMatchObject({ resource: 'posts', meta: { nested: { tag: 'original' } } });
    if (kind === 'many') expect(actual).toMatchObject({ ids: [1, 2] });
    if (kind === 'one' || kind === 'show') expect(actual).toMatchObject({ id: 1 });
    if (kind === 'list' || kind === 'table') expect(actual).toMatchObject({
      pagination: { current: 1, pageSize: 3 },
      filters: [{ field: 'title', operator: 'eq', value: 'Original' }],
      sorters: [{ field: 'title', order: 'asc' }],
    });
    expect(JSON.stringify(original.queryKey)).toBe(keyBefore);
  });

  it('validates all many IDs before invoking the getOne fallback', async () => {
    const source = provider();
    delete source.getMany;
    const app = mount('many', source, client(), { ids: [1, 'invalid'] });
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    expect(app.read().query.error).toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.getOne).not.toHaveBeenCalled();
  });

  it('provides detached metadata to each getOne fallback request', async () => {
    const source = provider();
    delete source.getMany;
    source.getOne = vi.fn(async function(this: DataProvider, input: GetOneParams) {
      expect(this).toBe(source);
      expect(input.meta).toMatchObject({ tag: 'original' });
      Reflect.set(input, 'meta', { tag: 'mutated' });
      return { data: { id: input.id, title: 'Fallback' } };
    });
    const app = mount('many', source, client(), { ids: [1, 2], meta: { tag: 'original' } });
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    expect(source.getOne).toHaveBeenCalledTimes(2);
    expect(app.read().query.data).toEqual({ data: [{ id: 1, title: 'Fallback' }, { id: 2, title: 'Fallback' }] });
  });

  it.each(['one', 'many'] as const)('moves %s reads to the changed ID set', async kind => {
    const app = mount(kind);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    await app.view.rerender({ id: 2, ids: [2] });
    await waitFor(() => expect(JSON.stringify(app.read().query.data)).toContain('"id":2'));
  });

  it('keeps an empty many query disabled and returns an empty checked collection on explicit refetch', async () => {
    const source = provider();
    const app = mount('many', source, client(), { ids: [] });
    expect(app.read().query.fetchStatus).toBe('idle');
    await app.read().query.refetch();
    expect(app.read().query.data).toEqual({ data: [] });
    expect(source.getMany).not.toHaveBeenCalled();
    expect(source.getOne).not.toHaveBeenCalled();
  });

  it('rejects malformed one and many protocol snapshots', () => {
    for (const input of [{ resource: 'posts', id: NaN }, { resource: 'posts', id: null }, { resource: 'posts' }]) {
      expect(() => snapshotOneParams(input)).toThrowError(expect.objectContaining({ code: 'INVALID_RESOURCE_INPUT' }));
    }
    for (const input of [{ resource: 'posts', ids: [undefined] }, { resource: 'posts', ids: '1' }, { resource: 'posts', ids: [Infinity] }]) {
      expect(() => snapshotManyParams(input)).toThrowError(expect.objectContaining({ code: 'INVALID_RESOURCE_INPUT' }));
    }
  });
});

describe('ordinary query cache receipt boundary', () => {
  it.each(kinds.flatMap(kind => (['envelope', 'record'] as const).map(location => ({ kind, location }))))(
    'rejects cached $kind $location accessors without executing them', async ({ kind, location }) => {
      const source = provider();
      const notice = vi.fn(() => ({ message: 'Loaded' }));
      const app = mount(kind, source, client(), { successNotification: notice, errorNotification: false });
      await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
      await waitFor(() => expect(notice).toHaveBeenCalledOnce());
      notice.mockClear();
      const getter = vi.fn(() => 'Private cached title');
      const record = { id: 1, title: 'Cached' };
      const value = cacheReceipt(kind, record);
      if (location === 'record') Object.defineProperty(record, 'title', { enumerable: true, get: getter });
      else Object.defineProperty(value, 'data', { enumerable: true, get: getter });
      replaceCache(app, value);
      await waitFor(() => expect(app.read().query.isError).toBe(true));
      expect(app.read().query).toMatchObject({
        status: 'error', data: undefined, isSuccess: false, isLoadingError: true, isRefetchError: false,
        error: { code: 'INVALID_PROVIDER_RESPONSE', statusCode: 502 },
      });
      expect(getter).not.toHaveBeenCalled();
      expect(notice).not.toHaveBeenCalled();
      expect(readMethod(source, kind)).toHaveBeenCalledOnce();
    },
  );

  it.each(kinds)('revalidates %s data written by the shared QueryClient and recovers after repair', async kind => {
    const source = provider();
    const app = mount(kind, source);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const cached = app.queryClient.getQueryCache().getAll()[0];
    if (!cached) throw new Error('Expected cached read');
    app.queryClient.setQueryData(cached.queryKey, cacheReceipt(kind, { id: 1, title: 42 }));
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    expect(app.read().query.data).toBeUndefined();
    expect(app.read().query.error).toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    app.queryClient.setQueryData(cached.queryKey, cacheReceipt(kind, { id: 1, title: 'Repaired' }));
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    expect(JSON.stringify(app.read().query.data)).toContain('Repaired');
    expect(readMethod(source, kind)).toHaveBeenCalledOnce();
  });

  it.each(kinds)('rechecks in-place %s cache mutations even when no cache revision changes', async kind => {
    const app = mount(kind);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const cached = app.queryClient.getQueryCache().getAll()[0];
    const envelope: unknown = cached?.state.data;
    if (!cached || typeof envelope !== 'object' || envelope === null) throw new Error('Expected cached receipt');
    const data: unknown = Reflect.get(envelope, 'data');
    const record: unknown = Array.isArray(data) ? data[0] : data;
    if (typeof record !== 'object' || record === null) throw new Error('Expected cached record');
    const revision = cached.state.dataUpdateCount;
    Reflect.set(record, 'title', false);
    expect(app.read().query.isError).toBe(true);
    expect(app.read().query.data).toBeUndefined();
    expect(cached.state.dataUpdateCount).toBe(revision);
    Reflect.set(record, 'title', 'Repaired in place');
    expect(app.read().query.isSuccess).toBe(true);
    expect(JSON.stringify(app.read().query.data)).toContain('Repaired in place');
    expect(cached.state.dataUpdateCount).toBe(revision);
  });

  it.each(['list', 'table'] as const)('rejects cached %s extension accessors and detaches valid extensions', async kind => {
    const app = mount(kind);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const getter = vi.fn(() => ({ next: 'private-cursor' }));
    const invalid = Object.defineProperty({ data: [{ id: 1, title: 'Cached' }], total: 1 }, 'cursor',
      { enumerable: true, get: getter });
    replaceCache(app, invalid);
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    expect(getter).not.toHaveBeenCalled();
    const response = { data: [{ id: 1, title: 'Cached' }], total: 1, cursor: { next: 'original' } };
    replaceCache(app, response);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const result = app.read().query.data;
    if (!result) throw new Error('Expected checked list');
    const cursor: unknown = Reflect.get(result, 'cursor');
    if (typeof cursor !== 'object' || cursor === null) throw new Error('Expected detached cursor');
    Reflect.set(cursor, 'next', 'caller mutation');
    expect(response.cursor.next).toBe('original');
    expect(app.read().query.data).toMatchObject({ cursor: { next: 'original' } });
  });

  it.each(['many', 'list', 'table'] as const)('uses descriptor-backed array length for cached %s receipts', async kind => {
    const app = mount(kind, provider(), client(), { ids: [1, 2] });
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const rows = [{ id: 1, title: 'First' }, { id: 2, title: 'Second' }];
    let lengthReads = 0;
    const data = new Proxy(rows, { get(target, key, receiver): unknown {
      if (key === 'length') { lengthReads++; return 0; }
      return Reflect.get(target, key, receiver);
    } });
    replaceCache(app, kind === 'many' ? { data } : { data, total: 2 });
    await waitFor(() => expect(app.read().query.data).toMatchObject({ data: rows }));
    expect(lengthReads).toBe(0);
  });

  it.each(kinds)('contains hostile cached %s reflection failures without exposing their errors', async kind => {
    const app = mount(kind);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const value = new Proxy({}, { ownKeys() { throw new Error('private-reflection'); } });
    replaceCache(app, value);
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    expect(app.read().query.error).toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE', statusCode: 502 });
    expect(JSON.stringify(app.read().query.error)).not.toContain('private-reflection');
    expect(app.read().query.data).toBeUndefined();
  });

  it.each(['one', 'show'] as const)('rejects wrong cached %s identities', async kind => {
    const app = mount(kind);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    replaceCache(app, { data: { id: 2, title: 'Another record' } });
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    expect(app.read().query.error).toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(app.read().query.data).toBeUndefined();
  });

  it.each([
    { label: 'missing', ids: [1] }, { label: 'duplicate', ids: [1, 1] },
    { label: 'extra', ids: [1, 2, 3] }, { label: 'unrequested', ids: [1, 3] },
    { label: 'empty', ids: [] },
  ])('rejects $label cached many identities and accepts complete reordered results', async ({ ids }) => {
    const app = mount('many', provider(), client(), { ids: [1, 2] });
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    replaceCache(app, { data: ids.map(id => ({ id, title: 'Invalid batch' })) });
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    expect(app.read().query.data).toBeUndefined();
    expect(app.read().query.error).toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    const data = [{ id: 2, title: 'Second' }, { id: 1, title: 'First' }];
    replaceCache(app, { data });
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    expect(app.read().query.data).toEqual({ data });
  });

  it.each(['list', 'table'] as const)('rejects duplicate cached %s identities', async kind => {
    const app = mount(kind);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    replaceCache(app, { data: [{ id: 1, title: 'First' }, { id: 1, title: 'Repeated' }], total: 2 });
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    expect(app.read().query.data).toBeUndefined();
    expect(app.read().query.error).toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
  });

  it('does not allow an injected nonempty result to bypass an empty many request', async () => {
    const source = provider();
    const app = mount('many', source, client(), { ids: [] });
    replaceCache(app, { data: [{ id: 1, title: 'Unexpected' }] });
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    expect(app.read().query.data).toBeUndefined();
    expect(source.getMany).not.toHaveBeenCalled();
    expect(source.getOne).not.toHaveBeenCalled();
  });

  it('does not let a cached getter supply authentication instructions or reach success observers', async () => {
    const session = auth();
    session.onError = vi.fn(async (error: unknown) => {
      const status: unknown = typeof error === 'object' && error !== null
        ? Object.getOwnPropertyDescriptor(error, 'statusCode')?.value : undefined;
      return status === 401 ? { logout: true } : {};
    });
    const success = vi.fn(() => ({ message: 'Loaded' }));
    const app = mount('one', provider(), client(), { authProvider: session, successNotification: success, errorNotification: false });
    await waitFor(() => expect(success).toHaveBeenCalledOnce());
    success.mockClear();
    const getter = vi.fn(() => { throw new HttpError('private-cache-instruction', 401); });
    replaceCache(app, Object.defineProperty({}, 'data', { enumerable: true, get: getter }));
    await waitFor(() => expect(session.onError).toHaveBeenCalledOnce());
    expect(session.onError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 502 }));
    expect(session.logout).not.toHaveBeenCalled();
    expect(getter).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
    expect(app.read().query.data).toBeUndefined();
  });

  it('withholds corrupted retained data when a refetch also fails', async () => {
    const source = provider();
    source.getOne = vi.fn<DataProvider['getOne']>()
      .mockResolvedValueOnce({ data: { id: 1, title: 'First' } })
      .mockRejectedValue(new HttpError('private-refetch-failure', 503));
    const app = mount('one', source);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    replaceCache(app, { data: { id: 1, title: 42 } });
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    const result = await app.read().query.refetch();
    expect(result).toMatchObject({
      status: 'error', data: undefined, isSuccess: false, isLoadingError: true, isRefetchError: false,
      error: { code: 'INVALID_PROVIDER_RESPONSE' },
    });
  });

  it.each(['one', 'many'] as const)('retains uncertain-write flags when shared %s receipt snapshots fail', kind => {
    const getter = vi.fn(() => ({ id: 1, title: 'Untrusted' }));
    const response = Object.defineProperty({}, 'data', { enumerable: true, get: getter });
    const decode = (value: unknown) => parseContractRecord(posts, value);
    expect(() => kind === 'one' ? decodeOneResult(response, decode, true) : decodeManyResult(response, decode, true))
      .toThrowError(expect.objectContaining({
        code: 'INVALID_PROVIDER_RESPONSE', details: { phase: 'response', writeMayHaveSucceeded: true },
      }));
    expect(getter).not.toHaveBeenCalled();
  });

  it('keeps select mapper memoization stable while returning detached decoded receipts', () => {
    const decode = (value: unknown) => parseContractRecord(posts, value);
    const label = vi.fn((record: { title: string }) => record.title);
    const value = vi.fn((record: { id: number }) => record.id);
    const project = createSelectProjection(input => decodeListResult(input, decode), label, value, decode, () => true);
    const input = { data: [{ id: 1, title: 'First' }], total: 1, cursor: { next: 'original' } };
    const first = project(input, 1);
    Reflect.set(first.data[0] ?? {}, 'title', 'Caller mutation');
    Reflect.set(first.options[0] ?? {}, 'label', 'Caller mutation');
    const second = project(input, 1);
    expect(second).toMatchObject({ data: input.data, options: [{ label: 'First', value: 1 }] });
    expect(label).toHaveBeenCalledOnce();
    expect(value).toHaveBeenCalledOnce();
    expect(input.data[0]?.title).toBe('First');
  });

  it('uses captured contract read methods without evaluating later replacements', async () => {
    const source = provider();
    const original = source.getOne;
    const app = mount('one', source);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const replacement = vi.fn(() => { throw new Error('Replacement must not be read'); });
    Object.defineProperty(source, 'getOne', { get: replacement });
    await expect(app.read().query.refetch()).resolves.toMatchObject({ status: 'success', data: { data: { id: 1, title: 'First' } } });
    expect(original).toHaveBeenCalledTimes(2);
    expect(replacement).not.toHaveBeenCalled();
  });
});

describe('ordinary query authentication ownership', () => {
  it.each(kinds)('isolates %s caches for distinct auth providers while deduplicating the same session', async kind => {
    const shared = client();
    const source = provider();
    const firstAuth = auth();
    const first = mount(kind, source, shared, { authProvider: firstAuth });
    await waitFor(() => expect(first.read().query.isSuccess).toBe(true));
    const same = mount(kind, source, shared, { authProvider: firstAuth });
    await waitFor(() => expect(same.read().query.isSuccess).toBe(true));
    expect(readMethod(source, kind)).toHaveBeenCalledOnce();
    const other = mount(kind, source, shared, { authProvider: auth() });
    await waitFor(() => expect(other.read().query.isSuccess).toBe(true));
    expect(readMethod(source, kind)).toHaveBeenCalledTimes(2);
  });

  it.each(kinds)('immediately masks cached %s data and saved refetch during a same-provider login', async kind => {
    const session = auth();
    const login = deferred<AuthActionResult>();
    session.login = vi.fn(() => login.promise);
    const source = provider();
    const app = mount(kind, source, client(), { authProvider: session });
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const saved = app.read().query.refetch;
    const changing = app.read().login.mutate({});
    expect(app.read().query.data).toBeUndefined();
    expect(app.read().query.status).toBe('pending');
    expect(app.read().query.isSuccess).toBe(false);
    expect(Object.getOwnPropertyDescriptor(app.read().query, 'data')?.get?.()).toBeUndefined();
    expect(await saved()).toMatchObject({ data: undefined, status: 'pending', isSuccess: false });
    expect(readMethod(source, kind)).toHaveBeenCalledOnce();
    login.resolve({ success: true });
    await changing;
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    expect(readMethod(source, kind)).toHaveBeenCalledTimes(2);
    expect(await saved()).toMatchObject({ status: 'pending', data: undefined });
    expect(readMethod(source, kind)).toHaveBeenCalledTimes(2);
  });

  describe.each(['list', 'one', 'many'] as const)('%s pending session responses', kind => {
    it.each(['data', 'error'] as const)('quarantines old %s after login on the same auth provider', async outcome => {
      const pending = deferred<BaseRecord>();
      const source = pendingProvider(pending.promise);
      const session = auth();
      const notice = vi.fn(() => ({ message: 'Read completed' }));
      const app = mount(kind, source, client(), { authProvider: session, successNotification: notice, errorNotification: notice });
      await waitFor(() => expect(readMethod(source, kind)).toHaveBeenCalledOnce());
      const original = app.queryClient.getQueryCache().getAll()[0];
      if (!original) throw new Error('Expected an original query');
      await app.read().login.mutate({});
      await waitFor(() => expect(JSON.stringify(app.read().query.data)).toContain('New'));
      expect(notice).toHaveBeenCalledOnce();
      if (outcome === 'data') pending.resolve({ id: 1, title: 'Old private record' });
      else pending.reject(new HttpError('Private diagnostic', 401));
      await waitFor(() => expect(original.state.status).toBe('error'));
      expect(original.state.data).toBeUndefined();
      expect(original.state.error).toMatchObject({ code: 'QUERY_SESSION_SUPERSEDED' });
      expect(session.onError).not.toHaveBeenCalled();
      expect(notice).toHaveBeenCalledOnce();
      expect(JSON.stringify(app.read().query.data)).toContain('New');
    });

    it('blocks obsolete query functions before dispatch, even after the same auth provider recovers', async () => {
      const source = provider();
      const app = mount(kind, source, client(), { authProvider: auth() });
      await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
      const original = app.queryClient.getQueryCache().getAll()[0];
      const fn = original?.options.queryFn;
      if (!original || typeof fn !== 'function') throw new Error('Expected a query function');
      await app.read().login.mutate({});
      await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
      expect(readMethod(source, kind)).toHaveBeenCalledTimes(2);
      await expect(fn({
        client: app.queryClient, queryKey: original.queryKey, signal: new AbortController().signal, meta: undefined,
      })).rejects.toMatchObject({ code: 'QUERY_SESSION_SUPERSEDED' });
      expect(readMethod(source, kind)).toHaveBeenCalledTimes(2);
    });

    it('does not return pending refetch data to a caller from an earlier session', async () => {
      const pending = deferred<BaseRecord>();
      const source = pendingProvider(pending.promise);
      const app = mount(kind, source, client(), { authProvider: auth(), enabled: false });
      const refreshing = app.read().query.refetch();
      await waitFor(() => expect(readMethod(source, kind)).toHaveBeenCalledOnce());
      await app.read().login.mutate({});
      pending.resolve({ id: 1, title: 'Old' });
      expect(await refreshing).toMatchObject({ data: undefined, status: 'pending', isSuccess: false });
    });
  });

  it.each(kinds)('keeps signed-out %s reads disabled until a confirmed login', async kind => {
    const source = provider();
    const app = mount(kind, source, client(), { authProvider: auth() });
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    await app.read().logout.mutate();
    expect(app.read().query.data).toBeUndefined();
    expect(await app.read().query.refetch()).toMatchObject({ status: 'pending', isEnabled: false });
    expect(readMethod(source, kind)).toHaveBeenCalledOnce();
    await app.read().login.mutate({});
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    expect(readMethod(source, kind)).toHaveBeenCalledTimes(2);
  });

  it('does not suspend a different auth provider using the same data source', async () => {
    const shared = client();
    const source = provider();
    const first = mount('one', source, shared, { authProvider: auth() });
    const second = mount('one', source, shared, { authProvider: auth() });
    await waitFor(() => expect(first.read().query.isSuccess && second.read().query.isSuccess).toBe(true));
    await first.read().logout.mutate();
    expect(first.read().query.data).toBeUndefined();
    expect(second.read().query.isSuccess).toBe(true);
    expect(await second.read().query.refetch()).toMatchObject({ status: 'success' });
  });

  it('rekeys an auth provider replacement instead of reusing indefinitely fresh data', async () => {
    const source = provider();
    const app = mount('one', source, client(), { authProvider: auth() });
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    await app.view.rerender({ authProvider: auth() });
    await waitFor(() => expect(readMethod(source, 'one')).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
  });

  it('uses immutable cache discriminators that do not collide after registry reset', () => {
    const session = auth();
    const original = captureAuthLiveScope(session);
    expect(Object.isFrozen(original)).toBe(true);
    expect(captureAuthLiveScope(session).cacheKey).toBe(original.cacheKey);
    resetLogoutVersion();
    expect(original.isCurrent()).toBe(false);
    expect(captureAuthLiveScope(session).cacheKey).not.toBe(original.cacheKey);
    expect(captureAuthLiveScope(auth()).cacheKey).not.toBe(captureAuthLiveScope(session).cacheKey);
  });

  it('isolates returned records, refetch results and notification input from the cache', async () => {
    const notice = vi.fn((value: unknown) => {
      if (typeof value === 'object' && value !== null) Reflect.set(value, 'data', { id: 999, title: 'Observer mutation' });
      return { message: 'Loaded' };
    });
    const app = mount('one', provider(), client(), { successNotification: notice });
    await waitFor(() => expect(notice).toHaveBeenCalledOnce());
    const value = app.read().query.data;
    if (!value) throw new Error('Expected data');
    Reflect.set(value, 'data', { id: 999, title: 'Caller mutation' });
    expect(app.read().query.data).toEqual({ data: { id: 1, title: 'First' } });
    const refreshed = await app.read().query.refetch();
    if (!refreshed.isSuccess) throw new Error('Expected a refetch success');
    Reflect.set(refreshed.data, 'data', { id: 999, title: 'Refetch mutation' });
    expect(app.read().query.data).toEqual({ data: { id: 1, title: 'First' } });
    expect(app.queryClient.getQueryCache().getAll()[0]?.state.data).toEqual({ data: { id: 1, title: 'First' } });
  });

  it('suppresses a notification when its observer starts login and isolates observer exceptions', async () => {
    const session = auth();
    const pending = deferred<AuthActionResult>();
    session.login = () => pending.promise;
    let changing: Promise<AuthActionResult> | undefined;
    const notificationProvider = { open: vi.fn(), close: vi.fn() };
    const app = mount('one', provider(), client(), {
      authProvider: session, enabled: false, notificationProvider,
      successNotification: () => {
        changing = app.read().login.mutate({});
        return { message: 'Old session' };
      },
    });
    await app.read().query.refetch();
    await waitFor(() => expect(changing).toBeDefined());
    expect(notificationProvider.open).not.toHaveBeenCalled();
    expect(app.read().query.data).toBeUndefined();
    pending.resolve({ success: true });
    await changing;
    await app.view.rerender({ successNotification: () => { throw new Error('Observer failure'); } });
    expect(await app.read().query.refetch()).toMatchObject({ status: 'success' });
  });

  it('sanitizes hostile errors without invoking getters or sharing errors with auth observers', async () => {
    const getter = vi.fn(() => 'private');
    const failure = Object.defineProperties({}, {
      message: { get: getter }, statusCode: { get: getter }, code: { get: getter },
    });
    const session = auth();
    session.onError = vi.fn(async (error: unknown) => {
      if (typeof error === 'object' && error !== null) Reflect.set(error, 'message', 'Observer mutation');
      return {};
    });
    const source = provider();
    source.getOne = async () => { throw failure; };
    const app = mount('one', source, client(), { authProvider: session });
    await waitFor(() => expect(session.onError).toHaveBeenCalledOnce());
    expect(app.read().query.error).toMatchObject({ message: 'Resource query failed', statusCode: 502, code: 'QUERY_FAILED' });
    expect(getter).not.toHaveBeenCalled();
    const error = app.read().query.error;
    if (typeof error === 'object' && error !== null) Reflect.set(error, 'message', 'Caller mutation');
    expect(app.read().query.error).toMatchObject({ message: 'Resource query failed' });
  });

  it('suppresses a pending auth-error instruction after another login', async () => {
    const instruction = deferred<AuthErrorResult>();
    const session = auth();
    session.onError = vi.fn(() => instruction.promise);
    const source = provider();
    source.getOne = vi.fn<DataProvider['getOne']>()
      .mockRejectedValueOnce(new HttpError('Unauthorized', 401))
      .mockResolvedValue({ data: { id: 1, title: 'New' } });
    const go = vi.fn();
    const app = mount('one', source, client(), {
      authProvider: session, routerProvider: { go, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
    });
    await waitFor(() => expect(session.onError).toHaveBeenCalledOnce());
    await app.read().login.mutate({});
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    expect(go).toHaveBeenCalledExactlyOnceWith({ to: '/', type: 'push' });
    instruction.resolve({ logout: true, redirectTo: '/login' });
    await instruction.promise;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(session.logout).not.toHaveBeenCalled();
    expect(go).toHaveBeenCalledOnce();
    expect(app.read().query.isSuccess).toBe(true);
  });

  it('allows a current checked auth-error delegate to complete its own logout', async () => {
    const session = auth();
    session.onError = vi.fn(async () => ({ logout: true }));
    const source = provider();
    source.getOne = async () => { throw new HttpError('Unauthorized private diagnostic', 401); };
    const go = vi.fn();
    const app = mount('one', source, client(), {
      authProvider: session, routerProvider: { go, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
    });
    await waitFor(() => expect(go).toHaveBeenCalledOnce());
    expect(session.logout).toHaveBeenCalledOnce();
    expect(captureAuthLiveScope(session).available).toBe(false);
    expect(app.read().query.data).toBeUndefined();
    expect(app.read().query.isSuccess).toBe(false);
  });

  it('does not loop unauthorized reads when the checked auth-error logout is rejected', async () => {
    const session = auth();
    session.onError = vi.fn(async () => ({ logout: true }));
    session.logout = vi.fn(async () => ({ success: false }));
    const source = provider();
    source.getOne = vi.fn(async () => { throw new HttpError('Unauthorized', 401); });
    const app = mount('one', source, client(), { authProvider: session });
    await waitFor(() => expect(session.logout).toHaveBeenCalledOnce());
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(captureAuthLiveScope(session).available).toBe(false);
    expect(source.getOne).toHaveBeenCalledOnce();
    expect(app.read().query.data).toBeUndefined();
    expect(await app.read().query.refetch()).toMatchObject({ status: 'pending' });
    expect(source.getOne).toHaveBeenCalledOnce();
  });

  it('moves all mounted readers sharing an auth provider to one deduplicated new session', async () => {
    const shared = client();
    const source = provider();
    const session = auth();
    const first = mount('one', source, shared, { authProvider: session });
    const second = mount('one', source, shared, { authProvider: session });
    await waitFor(() => expect(first.read().query.isSuccess && second.read().query.isSuccess).toBe(true));
    expect(source.getOne).toHaveBeenCalledOnce();
    await first.read().login.mutate({});
    await waitFor(() => expect(first.read().query.isSuccess && second.read().query.isSuccess).toBe(true));
    expect(source.getOne).toHaveBeenCalledTimes(2);
  });

  it('retains a checked record and the refetch-error discriminant after a same-session failure', async () => {
    const source = provider();
    source.getOne = vi.fn<DataProvider['getOne']>().mockResolvedValueOnce({ data: { id: 1, title: 'First' } })
      .mockRejectedValue(new HttpError('Private diagnostic', 503));
    const app = mount('one', source);
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const refreshed = await app.read().query.refetch();
    expect(refreshed).toMatchObject({
      status: 'error', isRefetchError: true, isLoadingError: false,
      data: { data: { id: 1, title: 'First' } }, error: { message: 'Resource query failed', statusCode: 503 },
      failureReason: { message: 'Resource query failed', statusCode: 503 },
    });
    expect(app.read().query.isRefetchError).toBe(true);
    await expect(app.read().query.refetch({ throwOnError: true })).rejects.toMatchObject({
      message: 'Resource query failed', statusCode: 503,
    });
  });

  it('sanitizes rejection of a throwing refetch whose session changed while pending', async () => {
    const pending = deferred<BaseRecord>();
    const app = mount('one', pendingProvider(pending.promise), client(), { authProvider: auth(), enabled: false });
    const refreshing = app.read().query.refetch({ throwOnError: true });
    const checked = expect(refreshing).rejects.toMatchObject({ code: 'QUERY_SESSION_SUPERSEDED' });
    await waitFor(() => expect(app.queryClient.isFetching()).toBe(1));
    await app.read().login.mutate({});
    pending.reject(new HttpError('Private diagnostic', 401));
    await checked;
  });

  it.each(['getter', 'wrong-type', 'extra-field'] as const)('quarantines %s notification receipts without invoking getters', async invalid => {
    const getter = vi.fn(() => 'Private');
    const notification = { open: vi.fn(), close: vi.fn() };
    const observe = vi.fn(() => {
      const result = { message: 'Loaded' };
      if (invalid === 'getter') Object.defineProperty(result, 'message', { get: getter, enumerable: true });
      else if (invalid === 'wrong-type') Reflect.set(result, 'message', 42);
      else Reflect.set(result, 'unexpected', 'Private');
      return result;
    });
    const app = mount('one', provider(), client(), { notificationProvider: notification, successNotification: observe });
    await waitFor(() => expect(observe).toHaveBeenCalledOnce());
    expect(app.read().query.isSuccess).toBe(true);
    expect(getter).not.toHaveBeenCalled();
    expect(notification.open).not.toHaveBeenCalled();
  });

  it('suppresses pending auth-error effects after the originating reader unmounts', async () => {
    const instruction = deferred<AuthErrorResult>();
    const session = auth();
    session.onError = vi.fn(() => instruction.promise);
    const source = provider();
    source.getOne = async () => { throw new HttpError('Unauthorized', 401); };
    const go = vi.fn();
    const app = mount('one', source, client(), {
      authProvider: session, routerProvider: { go, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
    });
    await waitFor(() => expect(session.onError).toHaveBeenCalledOnce());
    app.view.unmount();
    instruction.resolve({ logout: true, redirectTo: '/login' });
    await instruction.promise;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(session.logout).not.toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
  });
});
