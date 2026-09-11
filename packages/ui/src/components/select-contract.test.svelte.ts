import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient } from '@tanstack/svelte-query';
import { flushSync, type ComponentProps } from 'svelte';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineResource, resetContext, parseQueryKey, type DataProvider, type ResourceDefinition,
  type GetListResult, type GetManyResult, type GetListParams, type GetManyParams, type AuthProvider, type AuthActionResult } from '@svadmin/core';
import { captureAuthLiveScope, resetLogoutVersion } from '../../../core/src/auth-hooks.svelte';
import { createSelectProjection } from '../../../core/src/select-options';
import { decodeListResult } from '../../../core/src/record-decoder';
import { parseContractRecord } from '../../../core/src/resource-contract';
import * as unsafe from '../../../core/src/unsafe';
import type { SelectSettings, SelectState } from './select-contract.test.types';
import Host from './select-contract.test-host.svelte';

const posts = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const other = defineResource('other', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const postDefinition: ResourceDefinition = { name: 'posts', label: 'Posts', fields: [], contract: posts };
const resources: ResourceDefinition[] = [postDefinition, { name: 'other', label: 'Other', fields: [], contract: other }];
const clients: QueryClient[] = [];
const row = { id: 1, title: 'First' };

function provider(getList: DataProvider['getList'] = async () => ({ data: [row], total: 1 })): DataProvider {
  return {
    getList, getApiUrl: () => '/api',
    getOne: async ({ id }) => ({ data: { id, title: `Selected ${id}` } }),
    create: async () => ({ data: {} }), update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
  };
}
function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Request not initialized'); };
  let reject: (cause: unknown) => void = () => { throw new Error('Request not initialized'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function mount(source: DataProvider | Record<string, DataProvider> = provider(), settings: SelectSettings = {},
  context: Pick<ComponentProps<typeof Host>, 'authProvider' | 'notificationProvider' | 'routerProvider'> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(client);
  let state: SelectState | undefined;
  const view = render(Host, { provider: source, resources, queryClient: client, settings, ...context,
    onReady: value => { state = value; } });
  return { client, view, read() {
    if (!state) throw new Error('Expected a mounted selector');
    return state;
  } };
}
function auth(): AuthProvider {
  return {
    login: vi.fn(async () => ({ success: true })), logout: vi.fn(async () => ({ success: true })),
    check: vi.fn(async () => ({ authenticated: true })), getIdentity: vi.fn(async () => null),
    onError: vi.fn(async () => ({})),
  };
}
async function ready(app: ReturnType<typeof mount>) {
  await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
}
function selectCache(app: ReturnType<typeof mount>, action: 'select' | 'selectDefaults') {
  const query = app.client.getQueryCache().getAll().find(query =>
    query.getObserversCount() > 0 && parseQueryKey(query.queryKey)?.action === action);
  if (!query) throw new Error(`Expected an active ${action} cache`);
  return query;
}
const search = (text: string): NonNullable<SelectSettings['filters']> =>
  [{ field: 'title', operator: 'contains', value: text }];

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  resetLogoutVersion();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('contract-bound selection', () => {
  it('type-checks the select boundary, consumer and negative API fixtures with strict flags', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sourceFiles = [
      resolve(directory, '../../../core/src/select-query.svelte.ts'),
      resolve(directory, '../../../core/src/select-options.ts'),
      resolve(directory, '../../../core/src/session-query.svelte.ts'),
      resolve(directory, '../../../core/src/query-hooks.svelte.ts'),
      resolve(directory, '../../../core/src/query-source.test.type-fixture.ts'),
      resolve(directory, 'select-contract.test.svelte.ts'),
      resolve(directory, 'select-contract.test.types.ts'),
      resolve(directory, 'select-contract.test.type-fixture.ts'),
    ];
    const components = ['ComboboxField.svelte', 'select-contract.test-probe.svelte', 'select-contract.test-host.svelte'];
    const virtual = new Map(components.map(name => {
      const filename = resolve(directory, name);
      return [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), {
        filename, isTsFile: true, mode: 'ts',
      }).code];
    }));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false, types: ['svelte', 'node'],
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.Preserve,
      allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const originalRead = host.readFile;
    const originalExists = host.fileExists;
    host.readFile = filename => virtual.get(filename) ?? originalRead(filename);
    host.fileExists = filename => virtual.has(filename) || originalExists(filename);
    host.resolveModuleNames = (names, from) => names.map(name => {
      const filename = resolve(dirname(from), `${name}.tsx`);
      return virtual.has(filename) ? { resolvedFileName: filename, extension: ts.Extension.Tsx }
        : ts.resolveModuleName(name, from, options, host).resolvedModule;
    });
    const targets = [...sourceFiles, ...virtual.keys()];
    const program = ts.createProgram({
      rootNames: [...targets,
        resolve(directory, '../../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
        resolve(directory, '../../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
      ],
      options, host,
    });
    // Check only the changed boundary; this is not a workspace-wide compiler gate.
    const diagnostics = targets.flatMap(filename => {
      const source = program.getSourceFile(filename);
      if (!source) throw new Error(`Compiler did not load ${filename}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(diagnostics.map(diagnostic => {
      const line = diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1 : 0;
      return `${diagnostic.file?.fileName ?? ''}:${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
    })).toEqual([]);
  }, 30_000);

  it('removes the unchecked useSelect entry point', () => {
    expect('useSelect' in unsafe).toBe(false);
  });

  it('loads default IDs that first appear after mount and clears them reactively', async () => {
    const getOne = vi.fn<DataProvider['getOne']>(async ({ id }) => ({ data: { id, title: `Selected ${id}` } }));
    const app = mount({ ...provider(), getOne });
    await ready(app);
    expect(getOne).not.toHaveBeenCalled();
    await app.view.rerender({ settings: { defaultValue: [2] } });
    await waitFor(() => expect(app.read().options).toEqual([
      { label: 'First', value: 1 }, { label: 'Selected 2', value: 2 },
    ]));
    await app.view.rerender({ settings: { defaultValue: [3] } });
    await waitFor(() => expect(app.read().options.map(option => option.value)).toEqual([1, 3]));
    await app.view.rerender({ settings: { defaultValue: [] } });
    await waitFor(() => expect(app.read().options).toEqual([{ label: 'First', value: 1 }]));
  });

  it('isolates both query families by raw provider instance and deduplicates the same instance', async () => {
    const first = provider();
    const second = provider(async () => ({ data: [{ id: 1, title: 'Second' }], total: 1 }));
    first.getList = vi.fn(first.getList);
    first.getOne = vi.fn(first.getOne);
    second.getOne = vi.fn(async ({ id }) => ({ data: { id, title: 'Second default' } }));
    const app = mount(first, { defaultValue: [2] });
    await ready(app);
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    let next: SelectState | undefined;
    render(Host, { provider: second, resources, queryClient: app.client, settings: { defaultValue: [2] },
      onReady: value => { next = value; } });
    await waitFor(() => expect(next?.options).toEqual([
      { label: 'Second', value: 1 }, { label: 'Second default', value: 2 },
    ]));
    render(Host, { provider: first, resources, queryClient: app.client, settings: { defaultValue: [2] } });
    await waitFor(() => expect(first.getList).toHaveBeenCalledTimes(1));
    expect(first.getOne).toHaveBeenCalledTimes(1);
    expect(app.read().options).toEqual([{ label: 'First', value: 1 }, { label: 'Selected 2', value: 2 }]);
  });

  it.each(['resource', 'tenant', 'provider', 'contract', 'metadata'] as const)(
    'does not accept old list/default responses after a %s change', async change => {
      const oldList = deferred<GetListResult>();
      const oldMany = deferred<GetManyResult>();
      const getList = vi.fn<DataProvider['getList']>().mockImplementationOnce(() => oldList.promise)
        .mockResolvedValue({ data: [{ id: 1, title: 'Current' }], total: 1 });
      const getMany = vi.fn<NonNullable<DataProvider['getMany']>>().mockImplementationOnce(() => oldMany.promise)
        .mockResolvedValue({ data: [{ id: 2, title: 'Current default' }] });
      const source = { ...provider(getList), getMany };
      const app = mount(source, { defaultValue: [2] });
      await waitFor(() => expect(getMany).toHaveBeenCalledTimes(1));
      switch (change) {
        case 'resource': await app.view.rerender({ resource: 'other' }); break;
        case 'tenant': await app.view.rerender({ tenant: 'second' }); break;
        case 'provider': await app.view.rerender({ provider: { ...source } }); break;
        case 'contract': await app.view.rerender({ resources: [{
          ...postDefinition, contract: defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) }),
        }] }); break;
        case 'metadata': await app.view.rerender({ resources: [{ ...postDefinition, provider: { meta: { region: 'new' } } }] }); break;
      }
      await waitFor(() => expect(app.read().options).toEqual([
        { label: 'Current', value: 1 }, { label: 'Current default', value: 2 },
      ]));
      oldList.resolve({ data: [{ id: 1, title: 'Old' }], total: 1 });
      oldMany.resolve({ data: [{ id: 2, title: 'Old default' }] });
      await oldList.promise;
      await oldMany.promise;
      flushSync();
      expect(app.read().options).toEqual([{ label: 'Current', value: 1 }, { label: 'Current default', value: 2 }]);
    },
  );

  it('rejects invalid default IDs before dispatching any fallback request', async () => {
    const getOne = vi.fn(provider().getOne);
    const app = mount({ ...provider(), getOne }, { defaultValue: [2, 'wrong'] });
    await waitFor(() => expect(app.read().defaultValueQuery.isError).toBe(true));
    expect(getOne).not.toHaveBeenCalled();
    expect(app.read().isError).toBe(true);
  });

  it('retains the receiver and snapshots each dispatch and fallback metadata independently', async () => {
    const seen: GetListParams[] = [];
    const seenMany: GetManyParams[] = [];
    const settings: SelectSettings = { queryOptions: { enabled: false }, defaultValue: [2],
      meta: { extra: { marker: 'initial' } }, filters: search('original'),
      pagination: { current: 2, pageSize: 4, mode: 'server' }, fetchSize: 6 };
    const source = provider();
    source.getList = async function(params) {
      expect(this).toBe(source);
      seen.push(structuredClone(params));
      Reflect.set(params.meta ?? {}, 'changed', true);
      params.filters?.splice(0);
      return { data: [row], total: 1 };
    };
    source.getMany = async function(params) {
      expect(this).toBe(source);
      seenMany.push(structuredClone(params));
      params.ids.push(99);
      return { data: [{ id: 2, title: 'Default' }] };
    };
    const app = mount(source, settings);
    flushSync();
    settings.filters?.splice(0);
    settings.defaultValue?.push(3);
    Reflect.set(settings.meta ?? {}, 'late', true);
    await app.read().refetch();
    await app.read().refetch();
    expect(seen).toHaveLength(2);
    expect(seen[0]).toEqual(seen[1]);
    expect(seen[0]?.filters).toEqual(search('original'));
    expect(seen[0]?.pagination).toEqual({ current: 2, pageSize: 6, mode: 'server' });
    expect(seen[0]?.meta).toMatchObject({ extra: { marker: 'initial' } });
    expect(seen[0]?.meta).not.toHaveProperty('late');
    expect(seenMany.map(params => params.ids)).toEqual([[2], [2]]);
  });

  it('isolates metadata between getOne fallback calls', async () => {
    const seen: unknown[] = [];
    const source = provider();
    source.getOne = async params => {
      seen.push(structuredClone(params.meta));
      Reflect.set(params.meta ?? {}, 'changed', true);
      return { data: { id: params.id, title: 'Selected' } };
    };
    const app = mount(source, { defaultValue: [2, 3], meta: { region: 'initial' } });
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    expect(seen).toHaveLength(2);
    expect(seen[0]).toEqual(seen[1]);
    expect(seen[1]).not.toHaveProperty('changed');
  });

  it('snapshots merged admin, resource and explicit metadata into both query keys', async () => {
    const app = mount(provider(), { defaultValue: [2], meta: { explicit: true } });
    await app.view.rerender({ resources: [{ ...postDefinition, provider: {
      dataProviderName: 'cms', meta: { region: 'west' },
    } }], provider: { cms: provider() } });
    await ready(app);
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    const descriptors = app.client.getQueryCache().getAll().map(q => parseQueryKey(q.queryKey))
      .filter(q => q?.provider === 'cms');
    expect(descriptors).toHaveLength(2);
    for (const descriptor of descriptors) {
      expect(descriptor).toMatchObject({ provider: 'cms', params: {
        source: expect.any(String), meta: { explicit: true, region: 'west' },
      } });
    }
  });

  it('rejects malformed list and default responses without executing record getters', async () => {
    const getter = vi.fn(() => 'secret');
    const malicious = Object.defineProperty({ id: 2 }, 'title', { enumerable: true, get: getter });
    const app = mount({ ...provider(async () => ({ data: [{ id: 1, title: false }], total: 1 })),
      getMany: async () => ({ data: [malicious] }) }, { defaultValue: [2] });
    await waitFor(() => expect(app.read().query.isError && app.read().defaultValueQuery.isError).toBe(true));
    expect(app.read().options).toEqual([]);
    expect(getter).not.toHaveBeenCalled();
  });

  it('sanitizes arbitrary transport failures for both unknown-typed query errors', async () => {
    const app = mount({ ...provider(async () => { throw 'list failure'; }),
      getMany: async () => { throw { reason: 'default failure' }; } }, { defaultValue: [2] });
    await waitFor(() => expect(app.read().query.isError && app.read().defaultValueQuery.isError).toBe(true));
    expect(app.read().query.error).toMatchObject({ code: 'QUERY_FAILED', message: 'Resource query failed' });
    expect(app.read().defaultValueQuery.error).toMatchObject({ code: 'QUERY_FAILED', message: 'Resource query failed' });
    expect(app.read().options).toEqual([]);
  });

  it('does not let option mappers mutate records or one another', async () => {
    const app = mount(provider(), {
      optionLabel: record => { Reflect.set(record, 'id', 'wrong'); return 'Mapped'; },
      optionValue: record => { Reflect.set(record, 'title', false); return typeof record['id'] === 'number' ? record['id'] : 99; },
    });
    await ready(app);
    expect(app.read().options).toEqual([{ label: 'Mapped', value: 1 }]);
    expect(app.read().query.data?.data).toEqual([row]);
  });

  it('reports mapper exceptions as a query error and retries after correction', async () => {
    const app = mount(provider(), { optionValue: () => { throw new Error('private mapper value'); } });
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    expect(app.read().options).toEqual([]);
    expect(app.read().query.error).toMatchObject({ code: 'INVALID_SELECT_OPTION', message: 'Resource query failed' });
    await app.view.rerender({ settings: { optionLabel: record => `Changed ${record['title']}` } });
    await ready(app);
    expect(app.read().options).toEqual([{ label: 'Changed First', value: 1 }]);
  });

  it.each([NaN, Infinity, -Infinity])('rejects non-finite mapped ID %s', async invalid => {
    const app = mount(provider(), { optionValue: () => invalid });
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    expect(app.read().options).toEqual([]);
  });

  it('keeps number and string values distinct and deduplicates valid overlap between result sets', async () => {
    const mixed = defineResource('posts', { record: Type.Object({
      id: Type.Union([Type.Number(), Type.String()]), title: Type.String(),
    }) });
    const app = mount(provider(), { queryOptions: { enabled: false } });
    await app.view.rerender({ resources: [{ ...postDefinition, contract: mixed }], provider: {
      ...provider(async () => ({ data: [row, { id: '1', title: 'Same' }], total: 2 })),
      getMany: async () => ({ data: [row, { id: 2, title: 'Same' }] }),
    }, settings: { defaultValue: [1, 2] } });
    await ready(app);
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    expect(app.read().options.map(option => option.value)).toEqual([1, '1', 2]);
  });

  it.each([
    { name: 'empty', ids: [] },
    { name: 'missing', ids: [2] },
    { name: 'extra', ids: [2, 3, 4] },
    { name: 'duplicate', ids: [2, 2] },
    { name: 'wrong', ids: [2, 4] },
    { name: 'wrong-type', ids: ['2', 3] },
  ])('rejects $name cached defaults before mapping and accepts a complete reordered repair', async ({ ids }) => {
    const label = vi.fn((record: Record<string, unknown>) => String(record['title']));
    const getMany = vi.fn<NonNullable<DataProvider['getMany']>>(async () => ({
      data: [{ id: 2, title: 'Second' }, { id: 3, title: 'Third' }],
    }));
    const app = mount({ ...provider(), getMany }, { defaultValue: [2, 3], optionLabel: label });
    await ready(app);
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    const cached = selectCache(app, 'selectDefaults');
    const calls = label.mock.calls.length;
    app.client.setQueryData(cached.queryKey, { data: ids.map(id => ({ id, title: 'Invalid default' })) });
    await waitFor(() => expect(app.read().defaultValueQuery.isError).toBe(true));
    expect(app.read().defaultValueQuery.data).toBeUndefined();
    expect(app.read().defaultValueQuery.error).toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(app.read().query.isSuccess).toBe(true);
    expect(app.read().options).toEqual([{ label: 'First', value: 1 }]);
    expect(label).toHaveBeenCalledTimes(calls);

    app.client.setQueryData(cached.queryKey, { data: [{ id: 3, title: 'Third' }, { id: 2, title: 'Second' }] });
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    expect(app.read().options).toEqual([
      { label: 'First', value: 1 }, { label: 'Third', value: 3 }, { label: 'Second', value: 2 },
    ]);
    expect(label).toHaveBeenCalledTimes(calls + 2);
    expect(getMany).toHaveBeenCalledOnce();
  });

  it('checks cached default ID types even when both types satisfy the record schema', async () => {
    const mixed = defineResource('posts', { record: Type.Object({
      id: Type.Union([Type.Number(), Type.String()]), title: Type.String(),
    }) });
    const app = mount(provider(), { queryOptions: { enabled: false } });
    await app.view.rerender({ resources: [{ ...postDefinition, contract: mixed }],
      settings: { defaultValue: [2] } });
    await ready(app);
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    const cached = selectCache(app, 'selectDefaults');
    app.client.setQueryData(cached.queryKey, { data: [{ id: '2', title: 'String ID' }] });
    await waitFor(() => expect(app.read().defaultValueQuery.isError).toBe(true));
    expect(app.read().defaultValueQuery.error).toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(app.read().options).toEqual([{ label: 'First', value: 1 }]);
  });

  it('rejects duplicate cached list IDs while retaining healthy defaults', async () => {
    const label = vi.fn((record: Record<string, unknown>) => String(record['title']));
    const app = mount(provider(), { defaultValue: [2], optionLabel: label });
    await ready(app);
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    const cached = selectCache(app, 'select');
    const calls = label.mock.calls.length;
    app.client.setQueryData(cached.queryKey, { data: [row, { ...row, title: 'Duplicate' }], total: 2 });
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    expect(app.read().query.data).toBeUndefined();
    expect(app.read().query.error).toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(app.read().defaultValueQuery.isSuccess).toBe(true);
    expect(app.read().options).toEqual([{ label: 'Selected 2', value: 2 }]);
    expect(label).toHaveBeenCalledTimes(calls);
    app.client.setQueryData(cached.queryKey, { data: [row], total: 1 });
    await ready(app);
    expect(app.read().options).toEqual([{ label: 'First', value: 1 }, { label: 'Selected 2', value: 2 }]);
  });

  it.each(['select', 'selectDefaults'] as const)('remaps in-place %s edits without advancing the cache revision', async action => {
    const label = vi.fn((record: Record<string, unknown>) => String(record['title']));
    const app = mount(provider(), { defaultValue: [2], optionLabel: label });
    await ready(app);
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    const cached = selectCache(app, action);
    const record = { id: action === 'select' ? 1 : 2, title: 'Before' };
    const receipt = { data: [record], total: 1 };
    cached.setState({ data: receipt });
    const result = action === 'select' ? app.read().query : app.read().defaultValueQuery;
    await waitFor(() => expect(result.data?.options).toEqual([{ label: 'Before', value: record.id }]));
    const revision = cached.state.dataUpdateCount;
    const calls = label.mock.calls.length;
    record.title = 'After';
    expect(result.data?.options).toEqual([{ label: 'After', value: record.id }]);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data).toEqual([{ id: record.id, title: 'After' }]);
    expect(label).toHaveBeenCalledTimes(calls + 1);
    expect(cached.state.data).toBe(receipt);
    expect(cached.state.dataUpdateCount).toBe(revision);

    const detached = result.data;
    if (!detached || !detached.data[0] || !detached.options[0]) throw new Error('Expected mapped records');
    detached.data[0]['title'] = 'Caller mutation';
    detached.options[0].label = 'Caller mutation';
    expect(result.data?.options).toEqual([{ label: 'After', value: record.id }]);
    expect(record.title).toBe('After');
    expect(label).toHaveBeenCalledTimes(calls + 1);
  });

  it('recovers from a mapper failure after in-place content repair without refetching', async () => {
    const label = vi.fn((record: Record<string, unknown>) => {
      if (record['title'] === 'Broken') throw new Error('Private mapper failure');
      return String(record['title']);
    });
    const getList = vi.fn(provider().getList);
    const app = mount(provider(getList), { optionLabel: label });
    await ready(app);
    const cached = selectCache(app, 'select');
    const record = { id: 1, title: 'Broken' };
    const receipt = { data: [record], total: 1 };
    cached.setState({ data: receipt });
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    const calls = label.mock.calls.length;
    const revision = cached.state.dataUpdateCount;
    expect(app.read().query.error).toMatchObject({ code: 'INVALID_SELECT_OPTION' });
    expect(app.read().options).toEqual([]);
    expect(label).toHaveBeenCalledTimes(calls);
    record.title = 'Repaired';
    expect(app.read().options).toEqual([{ label: 'Repaired', value: 1 }]);
    expect(app.read().query.isSuccess).toBe(true);
    expect(label).toHaveBeenCalledTimes(calls + 1);
    expect(cached.state.dataUpdateCount).toBe(revision);
    expect(getList).toHaveBeenCalledOnce();
  });

  it.each(['select', 'selectDefaults'] as const)('rejects %s cache getters without executing them or the mapper', async action => {
    const label = vi.fn((record: Record<string, unknown>) => String(record['title']));
    const app = mount(provider(), { defaultValue: [2], optionLabel: label });
    await ready(app);
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    const cached = selectCache(app, action);
    const getter = vi.fn(() => 'Private getter');
    const record = { id: action === 'select' ? 1 : 2, title: 'Valid' };
    Object.defineProperty(record, 'title', { enumerable: true, configurable: true, get: getter });
    const calls = label.mock.calls.length;
    // Avoid QueryClient structural sharing inspecting the getter before the framework boundary.
    cached.setState({ data: { data: [record], total: 1 } });
    const result = action === 'select' ? app.read().query : app.read().defaultValueQuery;
    await waitFor(() => expect(result.isError).toBe(true));
    expect(result.data).toBeUndefined();
    expect(result.error).toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(label).toHaveBeenCalledTimes(calls);
    expect(getter).not.toHaveBeenCalled();
    Object.defineProperty(record, 'title', { enumerable: true, configurable: true, writable: true, value: 'Repaired' });
    expect(result.data?.options).toEqual([{ label: 'Repaired', value: record.id }]);
    expect(result.isSuccess).toBe(true);
    expect(getter).not.toHaveBeenCalled();
  });

  it('reports malformed search results and callback exceptions without dispatching them', async () => {
    const getList = vi.fn(provider().getList);
    const settings: SelectSettings = { onSearch: () => { throw new Error('private search'); } };
    const app = mount(provider(getList), settings);
    await ready(app);
    app.read().onSearchChange('broken');
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    expect(getList).toHaveBeenCalledTimes(1);
    await app.view.rerender({ settings: { onSearch: () => [{ field: 'absent', operator: 'eq', value: 1 }] } });
    app.read().onSearchChange('bad field');
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    expect(getList).toHaveBeenCalledTimes(1);
    app.read().onSearchChange('');
    await ready(app);
  });

  it.each(['resource', 'tenant', 'provider', 'metadata'] as const)(
    'discards a debounced search across a %s change', async change => {
      const getList = vi.fn(provider().getList);
      const app = mount(provider(getList), { onSearch: search, debounce: 20 });
      await ready(app);
      app.read().onSearchChange('obsolete');
      switch (change) {
        case 'resource': await app.view.rerender({ resource: 'other' }); break;
        case 'tenant': await app.view.rerender({ tenant: 'second' }); break;
        case 'provider': await app.view.rerender({ provider: provider(getList) }); break;
        case 'metadata': await app.view.rerender({ settings: { onSearch: search, debounce: 20, meta: { changed: true } } }); break;
      }
      await new Promise(resolve => setTimeout(resolve, 40));
      expect(getList.mock.calls.every(([params]) => !params.filters?.length)).toBe(true);
      app.read().onSearchChange('current');
      await waitFor(() => expect(getList.mock.calls.at(-1)?.[0].filters).toEqual(search('current')));
    },
  );

  it('cancels a pending search when cleared or unmounted', async () => {
    const getList = vi.fn(provider().getList);
    const app = mount(provider(getList), { onSearch: search, debounce: 20 });
    await ready(app);
    app.read().onSearchChange('discard');
    app.read().onSearchChange('');
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(getList).toHaveBeenCalledTimes(1);
    app.read().onSearchChange('unmounted');
    app.view.unmount();
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(getList).toHaveBeenCalledTimes(1);
  });

  it('shows both loading and error state for defaults and waits for retry to finish', async () => {
    const pending = deferred<GetManyResult>();
    const getMany = vi.fn<NonNullable<DataProvider['getMany']>>()
      .mockRejectedValueOnce(new Error('private failure')).mockImplementationOnce(() => pending.promise);
    const app = mount({ ...provider(), getMany }, { defaultValue: [2] });
    await ready(app);
    await waitFor(() => expect(app.read().isError).toBe(true));
    let finished = false;
    const retry = app.read().refetch().then(() => { finished = true; });
    await waitFor(() => expect(app.read().isFetching).toBe(true));
    expect(finished).toBe(false);
    pending.resolve({ data: [{ id: 2, title: 'Recovered' }] });
    await retry;
    await waitFor(() => expect(app.read().isError).toBe(false));
    expect(app.read().options.at(-1)).toEqual({ label: 'Recovered', value: 2 });
  });
});

describe('select projection content ownership', () => {
  it('compares nested fields, arrays and signed zero without sharing snapshots with callers', () => {
    const contract = defineResource('nested', { record: Type.Object({
      id: Type.Number(), title: Type.String(),
      details: Type.Object({ amount: Type.Number(), tags: Type.Array(Type.String()) }),
    }) });
    const decode = (input: unknown) => parseContractRecord(contract, input);
    const label = vi.fn((record: ReturnType<typeof decode>) =>
      `${record.details.tags.join(',')}:${Object.is(record.details.amount, -0) ? '-0' : record.details.amount}`);
    const project = createSelectProjection(input => decodeListResult(input, decode), label, 'id', decode, () => true);
    const record = { id: 1, title: 'First', details: { amount: -0, tags: ['a'] } };
    const receipt = { data: [record], total: 1 };
    const first = project(receipt, 0);
    expect(first.options).toEqual([{ label: 'a:-0', value: 1 }]);
    const detached = first.data[0];
    if (!detached) throw new Error('Expected a nested record');
    detached.details.tags.push('Caller');
    detached.details.amount = 99;
    first.options.splice(0);
    expect(project(receipt, 0).options).toEqual([{ label: 'a:-0', value: 1 }]);
    expect(label).toHaveBeenCalledOnce();
    record.details.amount = 0;
    expect(project(receipt, 0).options).toEqual([{ label: 'a:0', value: 1 }]);
    record.details.tags[0] = 'b';
    expect(project(receipt, 0).options).toEqual([{ label: 'b:0', value: 1 }]);
    record.details.tags.push('c');
    expect(project(receipt, 0).options).toEqual([{ label: 'b,c:0', value: 1 }]);
    expect(project(receipt, 0).data[0]?.details).toEqual({ amount: 0, tags: ['b', 'c'] });
    expect(label).toHaveBeenCalledTimes(4);
  });

  it('remaps when object key order observed by the mapper changes', () => {
    const contract = defineResource('ordered', { record: Type.Object({
      id: Type.Number(), entries: Type.Record(Type.String(), Type.Number()),
    }) });
    const decode = (input: unknown) => parseContractRecord(contract, input);
    const label = vi.fn((record: ReturnType<typeof decode>) => Object.keys(record.entries).join(','));
    const project = createSelectProjection(input => decodeListResult(input, decode), label, 'id', decode, () => true);
    const record = { id: 1, entries: { first: 1, second: 2 } };
    const receipt = { data: [record], total: 1 };
    expect(project(receipt, 0).options).toEqual([{ label: 'first,second', value: 1 }]);
    record.entries = { second: 2, first: 1 };
    expect(project(receipt, 0).options).toEqual([{ label: 'second,first', value: 1 }]);
    expect(project(receipt, 0).options).toEqual([{ label: 'second,first', value: 1 }]);
    expect(label).toHaveBeenCalledTimes(2);
  });

  it('memoizes same-input recursive failures and recovers after a content change', () => {
    const decode = (input: unknown) => parseContractRecord(posts, input);
    const record = { id: 1, title: 'Recursive' };
    const receipt = { data: [record], total: 1 };
    let reenter = () => { throw new Error('Projection not initialized'); };
    const label = vi.fn((record: ReturnType<typeof decode>) => {
      if (record.title === 'Recursive') reenter();
      return record.title;
    });
    const project = createSelectProjection(input => decodeListResult(input, decode), label, 'id', decode, () => true);
    reenter = () => { project(receipt, 0); };
    expect(() => project(receipt, 0)).toThrowError(expect.objectContaining({ code: 'INVALID_SELECT_OPTION' }));
    expect(() => project(receipt, 0)).toThrowError(expect.objectContaining({ code: 'INVALID_SELECT_OPTION' }));
    expect(label).toHaveBeenCalledOnce();
    record.title = 'Repaired';
    expect(project(receipt, 0).options).toEqual([{ label: 'Repaired', value: 1 }]);
    expect(label).toHaveBeenCalledTimes(2);
  });

  it('does not mix options when a mapper projects another input reentrantly', () => {
    const decode = (input: unknown) => parseContractRecord(posts, input);
    const first = { data: [{ id: 1, title: 'Outer' }], total: 1 };
    const second = { data: [{ id: 2, title: 'Inner' }], total: 1 };
    let readInner: () => string = () => { throw new Error('Projection not initialized'); };
    const label = vi.fn((record: ReturnType<typeof decode>) =>
      record.id === 1 ? `${record.title} ${readInner()}` : record.title);
    const project = createSelectProjection(input => decodeListResult(input, decode), label, 'id', decode, () => true);
    readInner = () => project(second, 0).options[0]?.label ?? '';
    expect(project(first, 0).options).toEqual([{ label: 'Outer Inner', value: 1 }]);
    expect(project(second, 0).options).toEqual([{ label: 'Inner', value: 2 }]);
    expect(label).toHaveBeenCalledTimes(2);
  });
});

describe('selection authentication ownership', () => {
  it('isolates both query families by auth provider and still deduplicates one shared session', async () => {
    const source = provider(vi.fn(provider().getList));
    source.getOne = vi.fn(source.getOne);
    const session = auth();
    const app = mount(source, { defaultValue: [2] }, { authProvider: session });
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    let same: SelectState | undefined;
    render(Host, { provider: source, resources, queryClient: app.client, authProvider: session,
      settings: { defaultValue: [2] }, onReady: value => { same = value; } });
    await waitFor(() => expect(same?.defaultValueQuery.isSuccess).toBe(true));
    expect(source.getList).toHaveBeenCalledOnce();
    expect(source.getOne).toHaveBeenCalledOnce();
    let other: SelectState | undefined;
    render(Host, { provider: source, resources, queryClient: app.client, authProvider: auth(),
      settings: { defaultValue: [2] }, onReady: value => { other = value; } });
    await waitFor(() => expect(other?.defaultValueQuery.isSuccess).toBe(true));
    expect(source.getList).toHaveBeenCalledTimes(2);
    expect(source.getOne).toHaveBeenCalledTimes(2);
    await app.read().login.mutate({});
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess && same?.defaultValueQuery.isSuccess).toBe(true));
    expect(source.getList).toHaveBeenCalledTimes(3);
    expect(source.getOne).toHaveBeenCalledTimes(3);
    expect(other?.defaultValueQuery.isSuccess).toBe(true);
  });

  it('masks both cached result families immediately and permanently retires saved refetches', async () => {
    const source = provider(vi.fn(provider().getList));
    source.getOne = vi.fn(source.getOne);
    const session = auth();
    const login = deferred<AuthActionResult>();
    session.login = () => login.promise;
    const app = mount(source, { defaultValue: [2] }, { authProvider: session });
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    const refetchList = app.read().query.refetch;
    const refetchDefault = app.read().defaultValueQuery.refetch;
    const changing = app.read().login.mutate({});
    expect(app.read().options).toEqual([]);
    expect(app.read().query).toMatchObject({ data: undefined, isSuccess: false, status: 'pending' });
    expect(app.read().defaultValueQuery).toMatchObject({ data: undefined, isSuccess: false, status: 'pending' });
    expect(await refetchList()).toMatchObject({ data: undefined, status: 'pending' });
    expect(await refetchDefault()).toMatchObject({ data: undefined, status: 'pending' });
    expect(source.getList).toHaveBeenCalledOnce();
    expect(source.getOne).toHaveBeenCalledOnce();
    login.resolve({ success: true });
    await changing;
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    expect(source.getList).toHaveBeenCalledTimes(2);
    expect(source.getOne).toHaveBeenCalledTimes(2);
    expect(await refetchList()).toMatchObject({ data: undefined, status: 'pending' });
    expect(await refetchDefault()).toMatchObject({ data: undefined, status: 'pending' });
    expect(source.getList).toHaveBeenCalledTimes(2);
    expect(source.getOne).toHaveBeenCalledTimes(2);
  });

  it.each(['success', 'failure'] as const)('quarantines late %s from both request families after same-provider login', async outcome => {
    const list = deferred<GetListResult>();
    const defaults = deferred<GetManyResult>();
    const getList = vi.fn<DataProvider['getList']>().mockImplementationOnce(() => list.promise)
      .mockResolvedValue({ data: [{ id: 1, title: 'Current' }], total: 1 });
    const getMany = vi.fn<NonNullable<DataProvider['getMany']>>().mockImplementationOnce(() => defaults.promise)
      .mockResolvedValue({ data: [{ id: 2, title: 'Current default' }] });
    const session = auth();
    const observed = vi.fn(() => ({ message: 'Loaded' }));
    const app = mount({ ...provider(getList), getMany }, {
      defaultValue: [2], successNotification: observed, errorNotification: observed,
    }, { authProvider: session });
    await waitFor(() => expect(getMany).toHaveBeenCalledOnce());
    const original = app.client.getQueryCache().getAll();
    expect(original).toHaveLength(2);
    await app.read().login.mutate({});
    await waitFor(() => expect(app.read().options).toEqual([
      { label: 'Current', value: 1 }, { label: 'Current default', value: 2 },
    ]));
    expect(observed).toHaveBeenCalledOnce();
    if (outcome === 'success') {
      list.resolve({ data: [{ id: 1, title: 'Private old list' }], total: 1 });
      defaults.resolve({ data: [{ id: 2, title: 'Private old default' }] });
    } else {
      list.reject({ statusCode: 401, message: 'Private old list' });
      defaults.reject({ statusCode: 401, message: 'Private old default' });
    }
    await waitFor(() => expect(original.every(query => query.state.status === 'error')).toBe(true));
    for (const query of original) {
      expect(query.state.data).toBeUndefined();
      expect(query.state.error).toMatchObject({ code: 'QUERY_SESSION_SUPERSEDED' });
    }
    expect(session.onError).not.toHaveBeenCalled();
    expect(observed).toHaveBeenCalledOnce();
    expect(app.read().options.map(option => option.label)).toEqual(['Current', 'Current default']);
  });

  it.each(['list', 'defaults'] as const)('does not return %s data to a pending refetch from an older session', async family => {
    const list = deferred<GetListResult>();
    const defaults = deferred<GetManyResult>();
    const getList = vi.fn<DataProvider['getList']>(() => list.promise);
    const getMany = vi.fn<NonNullable<DataProvider['getMany']>>(() => defaults.promise);
    const app = mount({ ...provider(getList), getMany }, {
      defaultValue: [2], queryOptions: { enabled: false },
    }, { authProvider: auth() });
    const query = family === 'list' ? app.read().query : app.read().defaultValueQuery;
    const refresh = query.refetch();
    await waitFor(() => expect(family === 'list' ? getList : getMany).toHaveBeenCalledOnce());
    await app.read().login.mutate({});
    list.resolve({ data: [row], total: 1 });
    defaults.resolve({ data: [{ id: 2, title: 'Old' }] });
    expect(await refresh).toMatchObject({ status: 'pending', data: undefined, isSuccess: false });
    expect(app.read().options).toEqual([]);
  });

  it.each(['login', 'logout'] as const)('discards a debounced search across %s', async action => {
    const getList = vi.fn(provider().getList);
    const onSearch = vi.fn(search);
    const session = auth();
    const app = mount(provider(getList), { onSearch, debounce: 20 }, { authProvider: session });
    await ready(app);
    app.read().onSearchChange('old');
    if (action === 'login') await app.read().login.mutate({});
    else await app.read().logout.mutate();
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(onSearch).not.toHaveBeenCalled();
    expect(getList.mock.calls.every(([params]) => !params.filters?.length)).toBe(true);
    if (action === 'logout') {
      app.read().onSearchChange('signed-out');
      await new Promise(resolve => setTimeout(resolve, 40));
      expect(onSearch).not.toHaveBeenCalled();
      expect(app.read().options).toEqual([]);
      await app.read().login.mutate({});
    }
    app.read().onSearchChange('current');
    await waitFor(() => expect(getList.mock.calls.at(-1)?.[0].filters).toEqual(search('current')));
  });

  it('stops later label and value mappers when the first mapper begins login', async () => {
    const session = auth();
    const login = deferred<AuthActionResult>();
    session.login = () => login.promise;
    let changing: Promise<AuthActionResult> | undefined;
    const label = vi.fn(() => {
      changing = app.read().login.mutate({});
      return 'Old option';
    });
    const value = vi.fn(() => 1);
    const app = mount(provider(async () => ({ data: [row, { id: 2, title: 'Second' }], total: 2 })), {
      queryOptions: { enabled: false }, optionLabel: label, optionValue: value,
    }, { authProvider: session });
    const result = await app.read().query.refetch();
    expect(result).toMatchObject({ status: 'pending', data: undefined, isSuccess: false });
    expect(label).toHaveBeenCalledOnce();
    expect(value).not.toHaveBeenCalled();
    expect(app.read().options).toEqual([]);
    login.resolve({ success: true });
    await changing;
  });

  it('does not dispatch search filters when their callback starts login', async () => {
    const session = auth();
    const login = deferred<AuthActionResult>();
    session.login = () => login.promise;
    let changing: Promise<AuthActionResult> | undefined;
    const getList = vi.fn(provider().getList);
    const onSearch = vi.fn((value: string) => {
      changing = app.read().login.mutate({});
      return search(value);
    });
    const app = mount(provider(getList), { onSearch }, { authProvider: session });
    await ready(app);
    app.read().onSearchChange('private filter');
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
    expect(getList).toHaveBeenCalledOnce();
    expect(app.read().options).toEqual([]);
    login.resolve({ success: true });
    await changing;
    await ready(app);
    expect(getList.mock.calls.every(([params]) => !params.filters?.length)).toBe(true);
  });

  it('returns detached records/options and memoizes mappers across result and state reads', async () => {
    const label = vi.fn((record: Record<string, unknown>) => String(record['title']));
    const notice = vi.fn((value: unknown) => {
      if (typeof value === 'object' && value !== null) {
        Reflect.set(value, 'options', [{ label: 'Notification mutation', value: 99 }]);
        Reflect.set(value, 'data', []);
      }
      return { message: 'Loaded' };
    });
    const app = mount(provider(), { optionLabel: label, defaultValue: [2], successNotification: notice });
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    await waitFor(() => expect(notice).toHaveBeenCalledOnce());
    const baseline = label.mock.calls.length;
    const selected = app.read().options[0];
    if (!selected) throw new Error('Expected an option');
    selected.label = 'Caller mutation';
    const projected = app.read().query.data;
    if (!projected) throw new Error('Expected a list result');
    projected.data.splice(0);
    projected.options.splice(0);
    const backfilled = app.read().defaultValueQuery.data;
    if (!backfilled) throw new Error('Expected a default result');
    backfilled.data.splice(0);
    backfilled.options.splice(0);
    expect(app.read().options).toEqual([{ label: 'First', value: 1 }, { label: 'Selected 2', value: 2 }]);
    expect(app.read().query.isSuccess && app.read().defaultValueQuery.isSuccess).toBe(true);
    expect(app.read().query.data?.data).toEqual([row]);
    expect(label).toHaveBeenCalledTimes(baseline);
    const result = await app.read().query.refetch();
    if (!result.isSuccess) throw new Error('Expected refreshed options');
    result.data.options.splice(0);
    expect(app.read().options).toHaveLength(2);
  });

  it('retries a failed mapper after a new cache write even when structural sharing retains the raw data', async () => {
    let broken = true;
    const mapper = vi.fn(() => {
      if (broken) throw new Error('Temporary mapping failure');
      return 1;
    });
    const app = mount(provider(), { optionValue: mapper });
    await waitFor(() => expect(app.read().query.isError).toBe(true));
    const original = app.client.getQueryCache().getAll().find(query => parseQueryKey(query.queryKey)?.action === 'select');
    if (!original) throw new Error('Expected the list cache');
    const raw = original.state.data;
    const calls = mapper.mock.calls.length;
    expect(app.read().query.isSuccess).toBe(false);
    expect(app.read().query.data).toBeUndefined();
    expect(mapper).toHaveBeenCalledTimes(calls);
    broken = false;
    expect(await app.read().query.refetch()).toMatchObject({ isSuccess: true, data: { options: [{ label: 'First', value: 1 }] } });
    expect(original.state.data).toBe(raw);
    expect(mapper).toHaveBeenCalledTimes(calls + 1);
  });

  it('rejects saved query functions before dispatch after the auth registry is reset', async () => {
    const getList = vi.fn(provider().getList);
    const app = mount(provider(getList), {}, { authProvider: auth() });
    await ready(app);
    const original = app.client.getQueryCache().getAll().find(query => parseQueryKey(query.queryKey)?.action === 'select');
    const fn = original?.options.queryFn;
    if (!original || typeof fn !== 'function') throw new Error('Expected a list query');
    resetLogoutVersion();
    await expect(fn({ client: app.client, queryKey: original.queryKey, signal: new AbortController().signal, meta: undefined }))
      .rejects.toMatchObject({ code: 'QUERY_SESSION_SUPERSEDED' });
  });
});

describe('Combobox contract consumer', () => {
  it('removes selected labels and dropdown options after another tree logs out of the shared session', async () => {
    const session = auth();
    const source = provider();
    const app = mount(source, { defaultValue: [2] }, { authProvider: session });
    await waitFor(() => expect(app.read().defaultValueQuery.isSuccess).toBe(true));
    const field = render(Host, { provider: source, resources, queryClient: app.client, authProvider: session, field: true, value: 2 });
    const trigger = field.getByRole('button', { name: 'Record' });
    await waitFor(() => expect(trigger.textContent).toContain('Selected 2'));
    await fireEvent.click(trigger);
    await waitFor(() => expect(field.getAllByRole('option').length).toBeGreaterThan(0));
    await app.read().logout.mutate();
    await waitFor(() => expect(trigger.textContent).toContain('Select...'));
    expect(field.queryAllByRole('option')).toHaveLength(0);
    expect(captureAuthLiveScope(session).available).toBe(false);
  });

  it('reactively renders selected defaults with separate clear and trigger buttons', async () => {
    const app = mount();
    await app.view.rerender({ field: true, value: 2 });
    const trigger = app.view.getByRole('button', { name: 'Record' });
    await waitFor(() => expect(trigger.textContent).toContain('Selected 2'));
    expect(trigger.querySelector('button')).toBeNull();
    await app.view.rerender({ value: 3 });
    await waitFor(() => expect(trigger.textContent).toContain('Selected 3'));
    const clear = app.view.getByRole('button', { name: /clear/i });
    await fireEvent.click(clear);
    await waitFor(() => expect(trigger.textContent).toContain('Select...'));
  });

  it('renders a sanitized default-query error and recovers through the retry control', async () => {
    const source = provider();
    source.getOne = vi.fn<DataProvider['getOne']>()
      .mockRejectedValueOnce(new Error('private tenant credentials'))
      .mockResolvedValue({ data: { id: 2, title: 'Recovered' } });
    const app = mount(source);
    await app.view.rerender({ field: true, value: 2 });
    await waitFor(() => expect(app.view.getByRole('alert').textContent).toContain('Unable to load options'));
    expect(app.view.container.textContent).not.toContain('private tenant');
    await fireEvent.click(app.view.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(app.view.getByRole('button', { name: 'Record' }).textContent).toContain('Recovered'));
    expect(app.view.queryByRole('alert')).toBeNull();
  });

  it('preserves duplicate labels, searches remotely and resets search when selecting', async () => {
    const getList = vi.fn<DataProvider['getList']>(async () => ({
      data: [{ id: 1, title: 'Same' }, { id: 2, title: 'Same' }], total: 2,
    }));
    const onchange = vi.fn();
    const app = mount(provider(getList));
    await app.view.rerender({ field: true, onchange });
    await fireEvent.click(app.view.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(app.view.getAllByRole('option')).toHaveLength(2));
    const input = app.view.getByPlaceholderText('Search...');
    await fireEvent.input(input, { target: { value: 'remote' } });
    await waitFor(() => expect(getList.mock.calls.at(-1)?.[0].filters).toEqual(search('remote')));
    await waitFor(() => expect(app.view.getAllByRole('option')).toHaveLength(2));
    const options = app.view.getAllByRole('option');
    const second = options[1];
    if (!second) throw new Error('Expected second option');
    await fireEvent.click(second);
    expect(onchange).toHaveBeenCalledWith(2);
    await fireEvent.click(app.view.getByRole('button', { name: 'Record' }));
    const reopened = app.view.getByPlaceholderText('Search...');
    if (!(reopened instanceof HTMLInputElement)) throw new Error('Expected a search input');
    expect(reopened.value).toBe('');
    await waitFor(() => {
      const current = app.client.getQueryCache().getAll().filter(q => q.getObserversCount() > 0)
        .map(q => parseQueryKey(q.queryKey)).find(q => q?.action === 'select');
      expect(current?.params).toMatchObject({ search: '' });
    });
  });

  it('exposes malformed dynamic field mappings as an error without asserting their type', async () => {
    const app = mount();
    await app.view.rerender({ field: true, optionValue: 'missing' });
    await waitFor(() => expect(app.view.getByRole('alert')).toBeTruthy());
    await app.view.rerender({ optionValue: 'id' });
    await waitFor(() => expect(app.view.queryByRole('alert')).toBeNull());
  });

  it('prevents selecting or clearing while disabled', async () => {
    const app = mount();
    await app.view.rerender({ field: true, value: 1, disabled: true });
    await waitFor(() => expect(app.view.getByRole('button', { name: 'Record' }).textContent).toContain('First'));
    const controls = within(app.view.container).getAllByRole('button');
    expect(controls.every(button => button.hasAttribute('disabled'))).toBe(true);
  });
});
