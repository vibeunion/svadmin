import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient, QueryObserver } from '@tanstack/svelte-query';
import { defineResource, keys, parseQueryKey, resetContext, captureAuthSession, HttpError, type DataProvider,
  type GetListResult, type GetOneResult, type GetManyResult, type ResourceDefinition, type ImportResult, type ContractSchemas,
  type AuthProvider, type RouterProvider, type UseImportOptions } from '@svadmin/core';
import { resetToast } from '@svadmin/core/toast';
import { definedOptions } from '@svadmin/core/options';
import { snapshotImportFile, parseImportRows, snapshotImportProgress, newImportProgress } from '../../../core/src/import-contract';
import { contractKey } from '../../../core/src/resource-contract';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ImportState, ImportAuthActions } from './import-contract.test.types';
import Host from './import-contract.test-host.svelte';
import * as unsafe from '@svadmin/core/unsafe';
import * as legacyTransfer from '../../../core/src/data-transfer.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String(), quantity: Type.Number() });
const create = Type.Object({ title: Type.String(), quantity: Type.Number() });
const posts = defineResource('posts', { record, create });
const other = defineResource('other', { record, create });
const postDefinition: ResourceDefinition = { name: 'posts', label: 'Posts', fields: [], contract: posts };
const resources: ResourceDefinition[] = [postDefinition, { name: 'other', label: 'Other', fields: [], contract: other }];
const row = { id: 1, title: 'First', quantity: 1 };
const clients: QueryClient[] = [];
const inputRows = [{ title: 'First', quantity: 1 }, { title: 'Second', quantity: 2 }];

function provider(): DataProvider {
  let nextId = 1;
  return {
    getApiUrl: () => '/api',
    getList: vi.fn(async () => ({ data: [row], total: 1 })),
    getOne: vi.fn(async ({ id }) => ({ data: { ...row, id } })),
    create: vi.fn(async ({ variables }) => ({
      data: { id: nextId++, ...(typeof variables === 'object' && variables !== null ? variables : {}) },
    })),
    update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
  };
}
function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Request not initialized'); };
  let reject: (cause: unknown) => void = () => { throw new Error('Request not initialized'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function jsonFile(value: unknown = inputRows): File {
  return new File([JSON.stringify(value)], 'posts.json', { type: 'application/json' });
}
function authProvider(): AuthProvider {
  return { login: vi.fn(async () => ({ success: true })), logout: vi.fn(async () => ({ success: true })),
    check: vi.fn(async () => ({ authenticated: true })), getIdentity: async () => ({ id: 'user' }) };
}
function mount(source: DataProvider | Record<string, DataProvider> = provider(), options: {
  session?: AuthProvider; client?: QueryClient; showButton?: boolean;
} = {}) {
  const client = options.client ?? new QueryClient({ defaultOptions: {
    queries: { retry: false, staleTime: Infinity }, mutations: { retry: 3, retryDelay: 0 },
  } });
  clients.push(client);
  let state: ImportState | undefined;
  let actions: ImportAuthActions | undefined;
  const router: RouterProvider = { go: vi.fn(), back: vi.fn(), parse: () => ({ pathname: '/', params: {} }) };
  const view = render(Host, { provider: source, resources, queryClient: client, router, onReady: value => { state = value; },
    ...definedOptions({ auth: options.session, showButton: options.showButton,
      onAuthReady: options.session === undefined ? undefined : (value: ImportAuthActions) => { actions = value; } }),
  });
  return { client, view, router, actions() {
    if (!actions) throw new Error('Expected mounted auth controls');
    return actions;
  }, read() {
    if (!state) throw new Error('Expected an import hook');
    return state;
  } };
}
async function ready(app: ReturnType<typeof mount>) {
  await waitFor(() => expect(app.read().list.isSuccess).toBe(true));
}
async function mountSession(source = provider(), session = authProvider(), settings: Omit<UseImportOptions<ContractSchemas>, 'resource'> = {}) {
  const app = mount(source, { session, showButton: false });
  await app.view.rerender({ settings });
  await waitFor(() => expect(app.actions().check.isLoading).toBe(false));
  await ready(app);
  return { ...app, source, session };
}
async function choose(app: ReturnType<typeof mount>, file = jsonFile()) {
  const scope = within(app.view.container);
  await fireEvent.click(await scope.findByRole('button', { name: /^import$/i }));
  const input = app.view.container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected a file picker');
  await fireEvent.change(input, { target: { files: [file] } });
  return input;
}
function scopedKeys(app: ReturnType<typeof mount>) {
  const descriptor = app.client.getQueryCache().getAll().map(q => parseQueryKey(q.queryKey))
    .find(q => q?.kind === 'data' && q.action === 'list' && q.resource === 'posts');
  if (!descriptor) throw new Error('Expected a checked list key');
  const params = descriptor.params;
  const source: unknown = typeof params === 'object' && params !== null
    ? Object.getOwnPropertyDescriptor(params, 'source')?.value : undefined;
  if (typeof source !== 'string') throw new Error('Expected a source tag');
  const authSession: unknown = typeof params === 'object' && params !== null
    ? Object.getOwnPropertyDescriptor(params, 'authSession')?.value : undefined;
  if (typeof authSession !== 'string') throw new Error('Expected a session tag');
  const scope = definedOptions({ provider: descriptor.provider, tenant: descriptor.tenant, contract: descriptor.contract });
  return { builder: keys(scope), scope, source, authSession };
}
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  resetToast();
  vi.restoreAllMocks();
});

describe('contract-bound import', () => {
  it('validates detached progress counters and rejects impossible completion claims', () => {
    const initial = newImportProgress();
    expect(snapshotImportProgress(initial)).toEqual({ totalAmount: 0, attemptedAmount: 0, processedAmount: 0 });
    expect(snapshotImportProgress(initial)).not.toBe(initial);
    for (const value of [
      { totalAmount: 1, attemptedAmount: 2, processedAmount: 0 },
      { totalAmount: 2, attemptedAmount: 1, processedAmount: 2 },
      { totalAmount: -1, attemptedAmount: 0, processedAmount: 0 },
      { totalAmount: 2, attemptedAmount: 0.5, processedAmount: 0 },
      { totalAmount: Number.MAX_SAFE_INTEGER + 1, attemptedAmount: 0, processedAmount: 0 },
      { ...initial, succeeded: ['untrusted'] },
    ]) expect(() => snapshotImportProgress(value)).toThrow();
  });

  it('rejects input IDs outside the record identity schema before importing any row', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ resources: [{ ...postDefinition, contract: defineResource('posts', {
      record, create: Type.Object({ ...create.properties, id: Type.String() }),
    }) }] });
    await expect(app.read().importer.handleChange({ file: jsonFile([{ id: '1', title: 'First', quantity: 1 }]) }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false } });
    expect(source.create).not.toHaveBeenCalled();
  });

  it('removes the unchecked importer and its consumer exception', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const inventory: unknown = JSON.parse(readFileSync(resolve(directory, '../../../../scripts/unsafe-boundaries.json'), 'utf8'));
    expect(Object.prototype.hasOwnProperty.call(inventory, 'packages/ui/src/components/buttons/ImportButton.svelte')).toBe(false);
    expect('useImport' in unsafe).toBe(false);
    expect('useImport' in legacyTransfer).toBe(false);
    expect(readFileSync(resolve(directory, 'buttons/ImportButton.svelte'), 'utf8')).not.toContain('@svadmin/core/unsafe');
  });

  it('strictly compiles the boundary, runtime tests, button and API rejection fixtures', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = [
      '../../../core/src/import-hooks.svelte.ts', '../../../core/src/import-contract.ts',
      '../../../core/src/resource-contract.ts', '../../../core/src/data-transfer.svelte.ts',
      '../../../core/src/query-invalidation.ts', '../../../core/src/auth-hooks.svelte.ts',
      '../../../core/src/unsafe.ts', 'import-contract.test.svelte.ts',
      'import-contract.test.types.ts', 'import-contract.test.type-fixture.ts',
    ].map(path => resolve(directory, path));
    const virtual = new Map(['buttons/ImportButton.svelte', 'import-contract.test-probe.svelte', 'import-contract.test-host.svelte'].map(name => {
      const filename = resolve(directory, name);
      return [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code];
    }));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false, types: ['svelte', 'node'],
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.Preserve,
      allowImportingTsExtensions: true,
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
      if (!source) throw new Error(`Missing compiler input ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(diagnostics.map(diagnostic => {
      const line = diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1 : 0;
      return `${diagnostic.file?.fileName ?? ''}:${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
    })).toEqual([]);
  }, 30_000);

  it.each(['[null]', '[1]', '["record"]', '[[]]', '{"id":1}', '{broken'])(
    'rejects non-record JSON %s before mapping or writing', async payload => {
      const source = provider();
      const app = mount(source);
      const mapData = vi.fn((row: Record<string, unknown>) => row);
      await app.view.rerender({ settings: { mapData } });
      await expect(app.read().importer.handleChange({ file: new File([payload], 'posts.json') }))
        .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false } });
      expect(mapData).not.toHaveBeenCalled();
      expect(source.create).not.toHaveBeenCalled();
    },
  );

  it.each([0, -1, 0.5, NaN, Infinity])('rejects invalid batchSize %s before file reading', async batchSize => {
    const source = provider();
    const read = vi.spyOn(Blob.prototype, 'text');
    const app = mount(source);
    await app.view.rerender({ settings: { batchSize } });
    await expect(app.read().importer.handleChange({ file: jsonFile() })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(read).not.toHaveBeenCalled();
    expect(source.create).not.toHaveBeenCalled();
  });

  it('requires a create schema even for an empty file', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ resources: [{ ...postDefinition, contract: defineResource('posts', { record }) }] });
    await expect(app.read().importer.handleChange({ file: jsonFile([]) })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_CONTRACT' });
    expect(source.create).not.toHaveBeenCalled();
  });

  it('preflights every row before writing the first one', async () => {
    const source = provider();
    const app = mount(source);
    for (const last of [{ title: 'Missing quantity' }, { title: false, quantity: 2 }, { title: 'Extra', quantity: 2, extra: true }]) {
      await expect(app.read().importer.handleChange({ file: jsonFile([inputRows[0], last]) }))
        .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    }
    expect(source.create).not.toHaveBeenCalled();
  });

  it('validates mapped values and rejects accessors without executing them', async () => {
    const source = provider();
    const app = mount(source);
    const getter = vi.fn(() => 'PRIVATE');
    const value = Object.defineProperty({ quantity: 1 }, 'title', { enumerable: true, get: getter });
    await app.view.rerender({ settings: { mapData: () => value } });
    await expect(app.read().importer.handleChange({ file: jsonFile() })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(getter).not.toHaveBeenCalled();
    expect(source.create).not.toHaveBeenCalled();
    const envelope = Object.defineProperty({}, 'file', { enumerable: true, get: getter });
    expect(() => snapshotImportFile(envelope)).toThrow();
    expect(() => snapshotImportFile({ file: jsonFile(), resource: 'other' })).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });

  it('does not trust overridden file text or filename accessors', async () => {
    const source = provider();
    const app = mount(source);
    const file = jsonFile();
    const getter = vi.fn(() => 'PRIVATE');
    const text = vi.fn(async () => '[null]');
    Object.defineProperty(file, 'text', { value: text });
    const result = await app.read().importer.handleChange({ file });
    expect(result.succeeded).toHaveLength(2);
    Object.defineProperty(file, 'name', { get: getter });
    await expect(app.read().importer.handleChange({ file })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(text).not.toHaveBeenCalled();
    expect(getter).not.toHaveBeenCalled();
  });

  it('parses quoted CSV and BOM with explicit business conversions', async () => {
    const source = provider();
    const app = mount(source);
    const mapData = vi.fn((row: Record<string, unknown>) => ({ title: row['title'], quantity: Number(row['quantity']) }));
    await app.view.rerender({ settings: { mapData } });
    const file = new File(['\uFEFFtitle,quantity\r\n"First,\nquoted",2\r\n"Second ""quoted""",3\r\n'], 'posts.csv');
    const result = await app.read().importer.handleChange({ file });
    expect(mapData).toHaveBeenNthCalledWith(1, { title: 'First,\nquoted', quantity: '2' });
    expect(result.succeeded).toEqual([
      { id: 1, title: 'First,\nquoted', quantity: 2 }, { id: 2, title: 'Second "quoted"', quantity: 3 },
    ]);
    expect(app.read().importer.progress).toEqual({ totalAmount: 2, processedAmount: 2 });
  });

  it.each(['title,title\none,two', 'title,quantity\none,2,extra', 'title,quantity\none', ',quantity\none,1',
    'title,quantity\n"unterminated,1'])('rejects ambiguous or malformed CSV %j', async text => {
    const source = provider();
    const app = mount(source);
    await expect(app.read().importer.handleChange({ file: new File([text], 'posts.csv') }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.create).not.toHaveBeenCalled();
  });

  it('does not coerce CSV numbers or accept unsupported extensions automatically', async () => {
    const source = provider();
    const app = mount(source);
    await expect(app.read().importer.handleChange({ file: new File(['title,quantity\none,1'], 'posts.csv') }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    await expect(app.read().importer.handleChange({ file: new File(['[]'], 'posts.xlsx') }))
      .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(source.create).not.toHaveBeenCalled();
    await app.view.rerender({ settings: { format: 'json' } });
    expect(await app.read().importer.handleChange({ file: new File(['[]'], 'posts.txt') }))
      .toEqual({ succeeded: [], errored: [] });
    expect(parseImportRows('\uFEFF[]', 'posts.json', 'auto')).toEqual([]);
  });

  it('snapshots mapper results and metadata before asynchronous writes', async () => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.create = vi.fn(async function(this: DataProvider, params) {
      expect(this).toBe(source);
      if (vi.mocked(source.create).mock.calls.length === 1) {
        const nested: unknown = params.meta?.['nested'];
        if (typeof nested === 'object' && nested !== null) Reflect.set(nested, 'value', 'provider mutation');
        return gate.promise;
      }
      return { data: { id: 2, title: 'Second', quantity: 2 } };
    });
    const values = [{ title: 'Mapped', quantity: 1 }, { title: 'Second', quantity: 2 }];
    let index = 0;
    const metadata = { nested: { value: 'original' } };
    const app = mount(source);
    await app.view.rerender({ settings: { mapData: () => values[index++], meta: metadata } });
    const pending = app.read().importer.handleChange({ file: jsonFile() });
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    if (values[1]) values[1].title = 'CHANGED';
    gate.resolve({ data: { id: 1, title: 'Mapped', quantity: 1 } });
    await pending;
    expect(source.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      variables: { title: 'Second', quantity: 2 }, meta: expect.objectContaining({ nested: { value: 'original' } }),
    }));
  });

  it('routes named providers and refuses missing routes', async () => {
    const first = provider();
    const cms = provider();
    const app = mount({ default: first, cms });
    await app.view.rerender({ resources: [{ ...postDefinition, provider: { dataProviderName: 'cms', meta: { channel: 'cms' } } }] });
    await app.read().importer.handleChange({ file: jsonFile() });
    expect(cms.create).toHaveBeenCalledWith(expect.objectContaining({ meta: expect.objectContaining({ channel: 'cms' }) }));
    expect(first.create).not.toHaveBeenCalled();
    await app.view.rerender({ settings: { dataProviderName: 'missing' } });
    await expect(app.read().importer.handleChange({ file: jsonFile() })).rejects.toMatchObject({ code: 'IMPORT_FAILED' });
    expect(first.create).not.toHaveBeenCalled();
  });

  it('validates batch receipts and binds the provider receiver', async () => {
    const source = provider();
    source.createMany = vi.fn(async function(this: DataProvider) {
      expect(this).toBe(source);
      return { data: [{ ...row, title: 'Normalized' }, { id: 2, title: 'Second', quantity: 2 }] };
    });
    const app = mount(source);
    await app.view.rerender({ settings: { batchSize: 2 } });
    const result = await app.read().importer.handleChange({ file: jsonFile() });
    expect(source.createMany).toHaveBeenCalledTimes(1);
    expect(source.create).not.toHaveBeenCalled();
    expect(result.succeeded[0]?.['title']).toBe('Normalized');
    expect(result.errored).toEqual([]);
  });

  it.each([
    { data: [row] }, { data: [row, row] }, { data: [row, { ...row, id: 2, title: false }] },
  ])('rejects incomplete or invalid batch receipts %j without retry', async receipt => {
    const source = provider();
    source.createMany = vi.fn(async () => receipt);
    const app = mount(source);
    await app.view.rerender({ settings: { batchSize: 2 } });
    const result = await app.read().importer.handleChange({ file: jsonFile() });
    expect(source.createMany).toHaveBeenCalledTimes(1);
    expect(result.succeeded).toEqual([]);
    expect(result.errored.map(item => item.row)).toEqual([1, 2]);
    expect(result.errored[0]?.error).toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true } });
  });

  it('checks explicit IDs and rejects accessor-backed receipts', async () => {
    const source = provider();
    const app = mount(source);
    await app.view.rerender({ resources: [{ ...postDefinition, contract: defineResource('posts', {
      record, create: Type.Object({ ...create.properties, id: Type.Number() }),
    }) }] });
    source.create = vi.fn(async () => ({ data: { ...row, id: 2 } }));
    const result = await app.read().importer.handleChange({ file: jsonFile([{ ...inputRows[0], id: 1 }]) });
    expect(result.succeeded).toEqual([]);
    expect(result.errored[0]?.error.code).toBe('INVALID_PROVIDER_RESPONSE');
    const getter = vi.fn(() => row);
    source.create = vi.fn(async () => Object.defineProperty({ data: row }, 'data', { get: getter }));
    const next = await app.read().importer.handleChange({ file: jsonFile([{ ...inputRows[0], id: 1 }]) });
    expect(next.errored[0]?.error.code).toBe('INVALID_PROVIDER_RESPONSE');
    expect(getter).not.toHaveBeenCalled();
  });

  it('reports fallback row failures without retrying and preserves checked successes', async () => {
    const source = provider();
    source.create = vi.fn(async ({ variables }) => {
      if (typeof variables === 'object' && variables !== null && Object.getOwnPropertyDescriptor(variables, 'title')?.value === 'First') {
        throw new Error('PRIVATE_PROVIDER_DETAIL');
      }
      return { data: { id: 2, title: 'Second', quantity: 2 } };
    });
    const app = mount(source);
    const onProgress = vi.fn();
    await app.view.rerender({ settings: { batchSize: 2, onProgress } });
    const result = await app.read().importer.handleChange({ file: jsonFile() });
    expect(source.create).toHaveBeenCalledTimes(2);
    expect(result.succeeded).toEqual([{ id: 2, title: 'Second', quantity: 2 }]);
    expect(result.errored[0]).toMatchObject({ row: 1, request: inputRows[0], error: {
      code: 'IMPORT_FAILED', details: { writeMayHaveSucceeded: true },
    } });
    expect(result.errored[0]?.error.message).not.toContain('PRIVATE_PROVIDER_DETAIL');
    expect(onProgress).toHaveBeenLastCalledWith({ totalAmount: 2, processedAmount: 2 });
  });

  it('rejects duplicate IDs across separately created rows', async () => {
    const source = provider();
    source.create = vi.fn(async () => ({ data: row }));
    const app = mount(source);
    const result = await app.read().importer.handleChange({ file: jsonFile() });
    expect(result.succeeded).toHaveLength(1);
    expect(result.errored[0]).toMatchObject({ row: 2, error: { code: 'INVALID_PROVIDER_RESPONSE' } });
  });

  it('rejects malformed settings and metadata before reading a file', async () => {
    const source = provider();
    const app = mount(source);
    const read = vi.spyOn(Blob.prototype, 'text');
    const getter = vi.fn(() => 'PRIVATE');
    await app.view.rerender({ settings: { meta: Object.defineProperty({}, 'secret', { enumerable: true, get: getter }) } });
    await expect(app.read().importer.handleChange({ file: jsonFile() })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    for (const [key, value] of [['format', 'xlsx'], ['enabled', 'yes'], ['mapData', false], ['onFinish', 1]]) {
      const settings = {};
      Reflect.set(settings, String(key), value);
      await app.view.rerender({ settings });
      await expect(app.read().importer.handleChange({ file: jsonFile() })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    }
    expect(read).not.toHaveBeenCalled();
    expect(getter).not.toHaveBeenCalled();
    expect(source.create).not.toHaveBeenCalled();
  });

  it('sanitizes accessor-backed transport failures and refreshes potentially committed writes', async () => {
    const source = provider();
    const getter = vi.fn(() => 'PRIVATE');
    source.create = vi.fn(async () => { throw Object.defineProperty({}, 'code', { get: getter }); });
    const app = mount(source);
    await ready(app);
    const result = await app.read().importer.handleChange({ file: jsonFile() });
    expect(result.errored).toHaveLength(2);
    expect(result.errored[0]?.error).toMatchObject({ code: 'IMPORT_FAILED', details: { writeMayHaveSucceeded: true } });
    expect(source.getList).toHaveBeenCalledTimes(2);
    expect(getter).not.toHaveBeenCalled();
  });

  it('coalesces repeated file events and rejects a different concurrent file', async () => {
    const read = deferred<string>();
    vi.spyOn(Blob.prototype, 'text').mockImplementation(() => read.promise);
    const source = provider();
    const app = mount(source);
    const file = jsonFile();
    const first = app.read().importer.handleChange({ file });
    const second = app.read().importer.handleChange({ file });
    expect(second).not.toBe(first);
    await expect(app.read().importer.handleChange({ file: jsonFile() })).rejects.toMatchObject({ code: 'IMPORT_BUSY' });
    read.resolve(JSON.stringify(inputRows));
    const [left, right] = await Promise.all([first, second]);
    expect(left).toEqual(right);
    expect(left).not.toBe(right);
    expect(source.create).toHaveBeenCalledTimes(2);
  });

  it('isolates callback mutation and failures from the stored and returned result', async () => {
    const app = mount();
    const onFinish = vi.fn((result: ImportResult<ContractSchemas>) => {
      if (result.succeeded[0]) Reflect.set(result.succeeded[0], 'title', false);
      throw new Error('observer failed');
    });
    await app.view.rerender({ settings: { onFinish, onProgress: async () => { throw new Error('observer failed'); } } });
    const result = await app.read().importer.handleChange({ file: jsonFile() });
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(result.succeeded[0]?.['title']).toBe('First');
    expect(app.read().importer.mutationResult?.succeeded[0]?.['title']).toBe('First');
    if (result.succeeded[0]) Reflect.set(result.succeeded[0], 'title', 'mutated');
    expect(app.read().importer.mutationResult?.succeeded[0]?.['title']).toBe('First');
    expect(app.read().importer.error).toBeNull();
  });

  it('refreshes owned families but excludes other scopes and details', async () => {
    const app = mount();
    await ready(app);
    const { builder, scope, source, authSession } = scopedKeys(app);
    const selected = [builder.data.list('posts', { source, authSession, extra: true }), builder.data.infiniteList('posts', { source, authSession }),
      builder.data.select('posts', { source, authSession }), builder.data.selectDefaults('posts', { source, authSession }),
      builder.data.many('posts', { ids: [1], source, authSession })];
    const excluded = [builder.data.list('posts'), builder.data.list('posts', { source: 'foreign' }),
      builder.data.list('posts', { source }), builder.data.list('posts', { source, authSession: 'foreign' }),
      builder.data.one('posts', 1, { source, authSession }), builder.data.list('other', { source, authSession }),
      keys({ ...scope, tenant: 'foreign' }).data.list('posts', { source, authSession }),
      keys({ ...scope, contract: contractKey(other) }).data.list('posts', { source, authSession }), builder.access.can('posts')];
    for (const key of [...selected, ...excluded]) app.client.setQueryData(key, { fixture: true });
    await app.read().importer.handleChange({ file: jsonFile() });
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of excluded) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it('keeps providers with the same route isolated on a shared client', async () => {
    const first = provider();
    const second = provider();
    const app = mount(first);
    await ready(app);
    let next: ImportState | undefined;
    render(Host, { provider: second, resources, queryClient: app.client, onReady: value => { next = value; } });
    await waitFor(() => expect(next?.list.isSuccess).toBe(true));
    await app.read().importer.handleChange({ file: jsonFile() });
    expect(first.getList).toHaveBeenCalledTimes(2);
    expect(second.getList).toHaveBeenCalledTimes(1);
    expect(second.create).not.toHaveBeenCalled();
  });

  it('waits for every owned refresh before reporting completion', async () => {
    const app = mount();
    await ready(app);
    const { builder, source, authSession } = scopedKeys(app);
    const failed = deferred<GetListResult>();
    const slow = deferred<GetListResult>();
    const first = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { source, authSession, filter: 'failed' }),
      initialData: { data: [row], total: 1 }, queryFn: () => failed.promise, staleTime: Infinity });
    const second = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { source, authSession, filter: 'slow' }),
      initialData: { data: [row], total: 1 }, queryFn: () => slow.promise, staleTime: Infinity });
    const offFirst = first.subscribe(() => {});
    const offSecond = second.subscribe(() => {});
    const onFinish = vi.fn();
    await app.view.rerender({ settings: { onFinish } });
    try {
      const operation = app.read().importer.handleChange({ file: jsonFile() });
      await waitFor(() => expect(first.getCurrentResult().isFetching).toBe(true));
      failed.reject(new Error('refresh failed'));
      await waitFor(() => expect(first.getCurrentResult().isError).toBe(true));
      expect(app.read().importer.isLoading).toBe(true);
      expect(onFinish).not.toHaveBeenCalled();
      slow.resolve({ data: [], total: 0 });
      await operation;
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(app.read().importer.isLoading).toBe(false);
    } finally { offFirst(); offSecond(); }
  });

  it.each(['resource', 'provider', 'tenant', 'disabled', 'unmount'])(
    'stops before writing when %s changes during file reading', async change => {
      const read = deferred<string>();
      vi.spyOn(Blob.prototype, 'text').mockImplementation(() => read.promise);
      const source = provider();
      const app = mount(source);
      const onFinish = vi.fn();
      await app.view.rerender({ settings: { onFinish } });
      const operation = app.read().importer.handleChange({ file: jsonFile() }).catch((cause: unknown) => cause);
      if (change === 'resource') await app.view.rerender({ resource: 'other' });
      if (change === 'provider') await app.view.rerender({ provider: provider() });
      if (change === 'tenant') await app.view.rerender({ tenant: 'next' });
      if (change === 'disabled') await app.view.rerender({ settings: { enabled: false, onFinish } });
      if (change === 'unmount') app.view.unmount();
      read.resolve(JSON.stringify(inputRows));
      expect(await operation).toMatchObject({ code: 'IMPORT_CANCELLED', details: { writeMayHaveSucceeded: false } });
      expect(source.create).not.toHaveBeenCalled();
      expect(onFinish).not.toHaveBeenCalled();
    },
  );

  it('stops subsequent writes after a scope change but still refreshes the captured cache', async () => {
    const gate = deferred<GetOneResult>();
    const source = provider();
    source.create = vi.fn(() => gate.promise);
    const app = mount(source);
    const onFinish = vi.fn();
    await app.view.rerender({ settings: { onFinish } });
    await ready(app);
    const { builder, source: tag, authSession } = scopedKeys(app);
    const cached = builder.data.list('posts', { source: tag, authSession, extra: true });
    app.client.setQueryData(cached, { fixture: true });
    const operation = app.read().importer.handleChange({ file: jsonFile() }).catch((cause: unknown) => cause);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.view.rerender({ tenant: 'next' });
    gate.resolve({ data: row });
    expect(await operation).toMatchObject({ code: 'IMPORT_CANCELLED', details: { writeMayHaveSucceeded: true } });
    expect(source.create).toHaveBeenCalledTimes(1);
    expect(app.client.getQueryState(cached)?.isInvalidated).toBe(true);
    expect(onFinish).not.toHaveBeenCalled();
    expect(app.read().importer.mutationResult).toBeNull();
  });

  it('keeps a new import pending when an obsolete import settles', async () => {
    const first = deferred<GetOneResult>();
    const second = deferred<GetOneResult>();
    const source = provider();
    source.create = vi.fn(() => first.promise);
    const replacement = provider();
    replacement.create = vi.fn(() => second.promise);
    const app = mount(source);
    const oldFinish = vi.fn();
    const newFinish = vi.fn();
    await app.view.rerender({ settings: { onFinish: oldFinish } });
    const old = app.read().importer.handleChange({ file: jsonFile([inputRows[0]]) }).catch((cause: unknown) => cause);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.view.rerender({ provider: replacement, settings: { onFinish: newFinish } });
    const current = app.read().importer.handleChange({ file: jsonFile([inputRows[0]]) });
    await waitFor(() => expect(replacement.create).toHaveBeenCalledTimes(1));
    first.resolve({ data: row });
    expect(await old).toMatchObject({ code: 'IMPORT_CANCELLED' });
    expect(app.read().importer.isLoading).toBe(true);
    expect(oldFinish).not.toHaveBeenCalled();
    second.resolve({ data: { ...row, title: 'Current' } });
    await current;
    expect(newFinish).toHaveBeenCalledTimes(1);
    expect(app.read().importer.mutationResult?.succeeded[0]?.['title']).toBe('Current');
    expect(app.read().importer.isLoading).toBe(false);
  });
});

describe('import authentication ownership', () => {
  it.each(['login', 'logout'] as const)('retires queued file work immediately on %s', async action => {
    const app = await mountSession();
    const read = vi.spyOn(Blob.prototype, 'text');
    const progress = vi.fn();
    const finish = vi.fn();
    await app.view.rerender({ settings: { onProgress: progress, onFinish: finish } });
    const operation = app.read().importer.handleChange({ file: jsonFile() }).catch((cause: unknown) => cause);
    if (action === 'login') await app.actions().login.mutate({});
    else await app.actions().logout.mutate();
    expect(await operation).toMatchObject({ code: 'IMPORT_CANCELLED', details: {
      writeMayHaveSucceeded: false, totalAmount: 0, attemptedAmount: 0, processedAmount: 0,
    } });
    expect(read).not.toHaveBeenCalled();
    expect(app.source.create).not.toHaveBeenCalled();
    expect(progress).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
  });

  it.each(['login', 'logout', 'reset'] as const)('retires delayed file reads after %s without mapping or writing', async change => {
    const app = await mountSession();
    const read = deferred<string>();
    const reader = vi.spyOn(Blob.prototype, 'text').mockImplementation(() => read.promise);
    const mapData = vi.fn((row: Record<string, unknown>) => row);
    await app.view.rerender({ settings: { mapData } });
    const operation = app.read().importer.handleChange({ file: jsonFile() }).catch((cause: unknown) => cause);
    await waitFor(() => expect(reader).toHaveBeenCalledTimes(1));
    if (change === 'reset') app.read().importer.reset();
    else if (change === 'login') await app.actions().login.mutate({});
    else await app.actions().logout.mutate();
    read.resolve(JSON.stringify(inputRows));
    expect(await operation).toMatchObject({ code: 'IMPORT_CANCELLED', details: { writeMayHaveSucceeded: false } });
    expect(mapData).not.toHaveBeenCalled();
    expect(app.source.create).not.toHaveBeenCalled();
    expect(app.read().importer.isLoading).toBe(false);
  });

  it.each(['login', 'reset'] as const)('rechecks ownership after a custom row mapper starts %s', async change => {
    const app = await mountSession();
    let login: Promise<unknown> | undefined;
    const mapData = vi.fn((row: Record<string, unknown>) => {
      if (change === 'reset') app.read().importer.reset();
      else login = app.actions().login.mutate({});
      return row;
    });
    await app.view.rerender({ settings: { mapData } });
    await expect(app.read().importer.handleChange({ file: jsonFile() })).rejects.toMatchObject({
      code: 'IMPORT_CANCELLED', details: { writeMayHaveSucceeded: false },
    });
    await login;
    expect(mapData).toHaveBeenCalledTimes(1);
    expect(app.source.create).not.toHaveBeenCalled();
    expect(app.read().importer.error).toBeNull();
  });

  it('blocks unavailable sessions while a saved method supports fresh imports after checked login', async () => {
    const app = await mountSession();
    const handleChange = app.read().importer.handleChange;
    await app.actions().logout.mutate();
    await expect(handleChange({ file: jsonFile() })).rejects.toMatchObject({ code: 'IMPORT_CANCELLED' });
    const gate = deferred<{ success: boolean }>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    const login = app.actions().login.mutate({});
    await expect(handleChange({ file: jsonFile() })).rejects.toMatchObject({ code: 'IMPORT_CANCELLED' });
    expect(app.source.create).not.toHaveBeenCalled();
    gate.resolve({ success: true });
    await login;
    await ready(app);
    await expect(handleChange({ file: jsonFile() })).resolves.toMatchObject({ succeeded: [{ id: 1 }, { id: 2 }], errored: [] });
  });

  it.each(['receipt', 'failure'] as const)('does not count a retired in-flight %s as processed or return earlier private rows', async outcome => {
    const source = provider();
    const gate = deferred<GetOneResult>();
    source.create = vi.fn().mockResolvedValueOnce({ data: row }).mockReturnValue(gate.promise);
    const progress = vi.fn();
    const finish = vi.fn();
    const app = await mountSession(source, authProvider(), { onProgress: progress, onFinish: finish });
    const file = jsonFile([...inputRows, { title: 'Third', quantity: 3 }]);
    const first = app.read().importer.handleChange({ file }).catch((cause: unknown) => cause);
    const second = app.read().importer.handleChange({ file }).catch((cause: unknown) => cause);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(2));
    expect(app.read().importer.progress).toEqual({ totalAmount: 3, processedAmount: 1 });
    await app.actions().login.mutate({});
    await ready(app);
    const invalidate = vi.spyOn(app.client, 'invalidateQueries');
    if (outcome === 'receipt') gate.resolve({ data: { id: 2, title: 'Private receipt', quantity: 2 } });
    else gate.reject(new HttpError('Private error', 401));
    const errors: unknown[] = await Promise.all([first, second]);
    for (const error of errors) {
      expect(error).toMatchObject({ code: 'IMPORT_CANCELLED', details: {
        writeMayHaveSucceeded: true, totalAmount: 3, attemptedAmount: 2, processedAmount: 1,
      } });
      expect(error).not.toHaveProperty('succeeded');
      expect(error).not.toHaveProperty('errored');
      expect(JSON.stringify(error)).not.toContain('Private');
    }
    expect(errors[0]).not.toBe(errors[1]);
    expect(source.create).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenCalledTimes(1);
    expect(finish).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(app.read().importer.mutationResult).toBeNull();
    expect(app.read().importer.error).toBeNull();
    expect(app.read().importer.progress).toEqual({ totalAmount: 0, processedAmount: 0 });
  });

  it('retires native batches with actual attempted rows and stops later batches', async () => {
    const source = provider();
    const gate = deferred<GetManyResult>();
    source.createMany = vi.fn(() => gate.promise);
    const app = await mountSession(source, authProvider(), { batchSize: 2 });
    const operation = app.read().importer.handleChange({ file: jsonFile([...inputRows, { title: 'Third', quantity: 3 }]) })
      .catch((cause: unknown) => cause);
    await waitFor(() => expect(source.createMany).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    gate.resolve({ data: [row, { ...row, id: 2 }] });
    expect(await operation).toMatchObject({ code: 'IMPORT_CANCELLED', details: {
      writeMayHaveSucceeded: true, totalAmount: 3, attemptedAmount: 2, processedAmount: 0,
    } });
    expect(source.createMany).toHaveBeenCalledTimes(1);
    expect(source.create).not.toHaveBeenCalled();
  });

  it('stops later native batches after the progress observer resets the import', async () => {
    const source = provider();
    source.createMany = vi.fn(async () => ({ data: [row, { ...row, id: 2 }] }));
    const app = await mountSession(source);
    const finish = vi.fn();
    await app.view.rerender({ settings: { batchSize: 2, onFinish: finish, onProgress: () => app.read().importer.reset() } });
    const invalidate = vi.spyOn(app.client, 'invalidateQueries');
    await expect(app.read().importer.handleChange({ file: jsonFile([...inputRows, ...inputRows]) }))
      .rejects.toMatchObject({ code: 'IMPORT_CANCELLED', details: {
        writeMayHaveSucceeded: true, totalAmount: 4, attemptedAmount: 2, processedAmount: 2,
      } });
    expect(source.createMany).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
    expect(app.read().importer.progress).toEqual({ totalAmount: 0, processedAmount: 0 });
  });

  it('retires joined native failures without exposing old row requests', async () => {
    const source = provider();
    const gate = deferred<GetManyResult>();
    source.createMany = vi.fn(() => gate.promise);
    const app = await mountSession(source, authProvider(), { batchSize: 2 });
    const file = jsonFile();
    const first = app.read().importer.handleChange({ file }).catch((cause: unknown) => cause);
    const joined = app.read().importer.handleChange({ file }).catch((cause: unknown) => cause);
    await waitFor(() => expect(source.createMany).toHaveBeenCalledTimes(1));
    await app.actions().logout.mutate();
    gate.reject(new Error('Private batch failure'));
    for (const error of await Promise.all([first, joined])) {
      expect(error).toMatchObject({ code: 'IMPORT_CANCELLED', details: {
        writeMayHaveSucceeded: true, totalAmount: 2, attemptedAmount: 2, processedAmount: 0,
      } });
      expect(JSON.stringify(error)).not.toContain('First');
      expect(error).not.toHaveProperty('errored');
    }
  });

  it.each(['progress', 'finish', 'finishMicrotask'] as const)('rechecks final delivery and remaining dispatch after %s starts login', async sink => {
    const app = await mountSession();
    let login: Promise<unknown> | undefined;
    const start = () => { login ??= app.actions().login.mutate({}); };
    const onProgress = vi.fn(() => { if (sink === 'progress') start(); });
    const onFinish = vi.fn(() => {
      if (sink === 'finish') start();
      if (sink === 'finishMicrotask') queueMicrotask(start);
    });
    await app.view.rerender({ settings: { onProgress, onFinish } });
    const file = jsonFile();
    const first = app.read().importer.handleChange({ file }).catch((cause: unknown) => cause);
    const second = app.read().importer.handleChange({ file }).catch((cause: unknown) => cause);
    for (const error of await Promise.all([first, second])) {
      expect(error).toMatchObject({ code: 'IMPORT_CANCELLED', details: {
        writeMayHaveSucceeded: true, processedAmount: sink === 'progress' ? 1 : 2,
      } });
      expect(error).not.toHaveProperty('succeeded');
    }
    expect(login).toBeDefined();
    await login;
    expect(app.source.create).toHaveBeenCalledTimes(sink === 'progress' ? 1 : 2);
    expect(onFinish).toHaveBeenCalledTimes(sink === 'progress' ? 0 : 1);
  });

  it('detaches joined results, nested failures, progress and reflective public reads', async () => {
    const source = provider();
    source.create = vi.fn(async () => { throw new HttpError('Private error', 403); });
    const app = await mountSession(source);
    const onProgress = vi.fn(info => { Reflect.set(info, 'processedAmount', 999); });
    await app.view.rerender({ settings: { onProgress } });
    const file = jsonFile();
    const first = app.read().importer.handleChange({ file });
    const second = app.read().importer.handleChange({ file });
    const [left, right] = await Promise.all([first, second]);
    expect(left).not.toBe(right);
    Reflect.set(left.errored[0]?.request ?? {}, 'title', 'Changed');
    Reflect.set(left.errored[0]?.error.details ?? {}, 'writeMayHaveSucceeded', false);
    Reflect.set(app.read().importer.mutationResult?.errored[0]?.error ?? {}, 'message', 'Changed');
    Reflect.set(app.read().importer.progress, 'processedAmount', 999);
    Reflect.set(app.read().importer.error ?? {}, 'message', 'Changed');
    expect(right.errored[0]?.request).toEqual(inputRows[0]);
    expect(right.errored[0]?.error.details).toHaveProperty('writeMayHaveSucceeded', true);
    expect(app.read().importer.mutationResult?.errored[0]?.error.message).toBe('Import failed');
    expect(app.read().importer.progress).toEqual({ totalAmount: 2, processedAmount: 2 });
    expect(app.read().importer.error?.message).toBe('Import failed');
    const gate = deferred<{ success: boolean }>();
    vi.mocked(app.session.login).mockReturnValueOnce(gate.promise);
    const login = app.actions().login.mutate({});
    const reflected: unknown = Object.getOwnPropertyDescriptor(app.read().importer, 'mutationResult')?.get?.call(app.read().importer);
    expect(reflected).toBeNull();
    expect(app.read().importer.error).toBeNull();
    expect(app.read().importer.progress).toEqual({ totalAmount: 0, processedAmount: 0 });
    expect(app.read().importer.isLoading).toBe(false);
    gate.resolve({ success: true });
    await login;
  });

  it('rechecks preflight failure delivery when login starts before the rejection reaches the caller', async () => {
    const app = await mountSession();
    const operation = Reflect.apply(app.read().importer.handleChange, undefined, [{ file: 'invalid' }]);
    const login = app.actions().login.mutate({});
    await expect(operation).rejects.toMatchObject({ code: 'IMPORT_CANCELLED', details: { writeMayHaveSucceeded: false } });
    await login;
    expect(app.read().importer.error).toBeNull();
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it('preserves the next import while an old-session request finishes', async () => {
    const source = provider();
    const oldWrite = deferred<GetOneResult>();
    const newWrite = deferred<GetOneResult>();
    source.create = vi.fn().mockReturnValueOnce(oldWrite.promise).mockReturnValue(newWrite.promise);
    const app = await mountSession(source);
    const oldOperation = app.read().importer.handleChange({ file: jsonFile([inputRows[0]]) }).catch((cause: unknown) => cause);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await ready(app);
    const newOperation = app.read().importer.handleChange({ file: jsonFile([inputRows[1]]) });
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(2));
    oldWrite.resolve({ data: row });
    expect(await oldOperation).toMatchObject({ code: 'IMPORT_CANCELLED' });
    expect(app.read().importer.isLoading).toBe(true);
    newWrite.resolve({ data: { ...row, title: 'Current' } });
    await newOperation;
    expect(app.read().importer.mutationResult?.succeeded[0]?.['title']).toBe('Current');
    expect(app.read().importer.isLoading).toBe(false);
  });

  it('leaves independent auth trees untouched when they share a client and data source', async () => {
    const app = await mountSession();
    const foreignSession = authProvider();
    const second = mount(app.source, { session: foreignSession, client: app.client, showButton: false });
    await waitFor(() => expect(second.actions().check.isLoading).toBe(false));
    await ready(second);
    const foreignKey = captureAuthSession(foreignSession).cacheKey;
    const foreignQueries = app.client.getQueryCache().getAll().filter(query => {
      const key = parseQueryKey(query.queryKey);
      return key?.kind === 'data' && typeof key.params === 'object' && key.params !== null &&
        Object.getOwnPropertyDescriptor(key.params, 'authSession')?.value === foreignKey;
    }).map(query => ({ key: query.queryKey, count: query.state.dataUpdateCount, invalidated: query.state.isInvalidated }));
    expect(foreignQueries.length).toBeGreaterThan(0);
    await app.read().importer.handleChange({ file: jsonFile() });
    for (const query of foreignQueries) {
      expect(app.client.getQueryState(query.key)?.dataUpdateCount).toBe(query.count);
      expect(app.client.getQueryState(query.key)?.isInvalidated).toBe(query.invalidated);
    }
  });

  it('settles every started refresh even when a sibling fails after login', async () => {
    const app = await mountSession();
    const { builder, source } = scopedKeys(app);
    const authSession = captureAuthSession(app.session).cacheKey;
    const failed = deferred<GetListResult>();
    const slow = deferred<GetListResult>();
    const first = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { source, authSession, fixture: 'failed' }),
      initialData: { data: [row], total: 1 }, queryFn: () => failed.promise, staleTime: Infinity });
    const second = new QueryObserver(app.client, { queryKey: builder.data.list('posts', { source, authSession, fixture: 'slow' }),
      initialData: { data: [row], total: 1 }, queryFn: () => slow.promise, staleTime: Infinity });
    const offFirst = first.subscribe(() => {});
    const offSecond = second.subscribe(() => {});
    try {
      let settled = false;
      const operation = app.read().importer.handleChange({ file: jsonFile() })
        .catch((cause: unknown) => cause).finally(() => { settled = true; });
      await waitFor(() => expect(first.getCurrentResult().isFetching && second.getCurrentResult().isFetching).toBe(true));
      await app.actions().login.mutate({});
      failed.reject(new Error('Private refresh error'));
      await waitFor(() => expect(first.getCurrentResult().isError).toBe(true));
      expect(settled).toBe(false);
      slow.resolve({ data: [], total: 0 });
      expect(await operation).toMatchObject({ code: 'IMPORT_CANCELLED', details: {
        writeMayHaveSucceeded: true, totalAmount: 2, attemptedAmount: 2, processedAmount: 2,
      } });
    } finally { offFirst(); offSecond(); }
  });

  it('does not falsify successful imports when cache invalidation throws synchronously', async () => {
    const app = await mountSession();
    vi.spyOn(app.client, 'invalidateQueries').mockImplementation(() => { throw new Error('Private cache error'); });
    const result = await app.read().importer.handleChange({ file: jsonFile() });
    expect(result.succeeded).toHaveLength(2);
    expect(result.errored).toEqual([]);
    expect(app.read().importer.error).toBeNull();
  });

  it('chooses a sanitized authentication cause and lets its own checked logout finish', async () => {
    const source = provider();
    source.create = vi.fn().mockRejectedValueOnce(new HttpError('Private first error', 500))
      .mockRejectedValue(new HttpError('Private auth error', 401));
    const session = authProvider();
    const logout = deferred<{ success: boolean }>();
    session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/expired' }));
    vi.mocked(session.logout).mockReturnValue(logout.promise);
    const app = await mountSession(source, session);
    const oldKeys = app.client.getQueryCache().getAll().filter(query => parseQueryKey(query.queryKey)?.kind === 'data').map(query => query.queryKey);
    await app.read().importer.handleChange({ file: jsonFile() }).catch(() => {});
    await waitFor(() => expect(session.logout).toHaveBeenCalledTimes(1));
    const cause: unknown = vi.mocked(session.onError).mock.calls[0]?.[0];
    expect(cause).toMatchObject({ statusCode: 401, message: 'Import failed' });
    expect(JSON.stringify(cause)).not.toContain('Private');
    expect(app.read().importer.mutationResult).toBeNull();
    expect(app.read().importer.isLoading).toBe(false);
    logout.resolve({ success: true });
    await waitFor(() => expect(app.router.go).toHaveBeenCalledWith(expect.objectContaining({ to: '/expired' })));
    for (const key of oldKeys) expect(app.client.getQueryState(key)).toBeUndefined();
  });

  it.each(['login', 'reset', 'new', 'invalid'] as const)('suppresses delayed auth instructions after %s', async change => {
    const source = provider();
    source.create = vi.fn(async () => { throw new HttpError('Private auth error', 401); });
    const session = authProvider();
    const instruction = deferred<{ logout: boolean; redirectTo: string }>();
    session.onError = vi.fn(() => instruction.promise);
    const app = await mountSession(source, session);
    await app.read().importer.handleChange({ file: jsonFile() });
    expect(session.onError).toHaveBeenCalledTimes(1);
    if (change === 'login') await app.actions().login.mutate({});
    if (change === 'reset') app.read().importer.reset();
    if (change === 'new') await app.read().importer.handleChange({ file: jsonFile([]) });
    if (change === 'invalid') await app.read().importer.handleChange({ file: jsonFile([null]) }).catch(() => {});
    instruction.resolve({ logout: true, redirectTo: '/obsolete' });
    await instruction.promise;
    await Promise.resolve();
    expect(session.logout).not.toHaveBeenCalled();
    expect(app.router.go).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/obsolete' }));
  });

  it.each(['reset', 'new'] as const)('retires its pending logout delegate after an explicit %s invocation', async action => {
    const source = provider();
    source.create = vi.fn(async () => { throw new HttpError('Private auth error', 401); });
    const session = authProvider();
    const logout = deferred<{ success: boolean }>();
    session.onError = vi.fn(async () => ({ logout: true, redirectTo: '/obsolete' }));
    vi.mocked(session.logout).mockReturnValue(logout.promise);
    const app = await mountSession(source, session);
    await app.read().importer.handleChange({ file: jsonFile([inputRows[0]]) }).catch(() => {});
    await waitFor(() => expect(session.logout).toHaveBeenCalledTimes(1));
    if (action === 'reset') app.read().importer.reset();
    else await expect(app.read().importer.handleChange({ file: jsonFile() })).rejects.toMatchObject({ code: 'IMPORT_CANCELLED' });
    logout.resolve({ success: true });
    await logout.promise;
    await Promise.resolve();
    expect(app.router.go).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/obsolete' }));
    expect(app.read().importer.mutationResult).toBeNull();
    expect(source.create).toHaveBeenCalledTimes(1);
  });
});

describe('ImportButton contract consumer', () => {
  it('retires an open picker after same-provider login and allows a fresh selection', async () => {
    const app = await mountSession();
    await app.view.rerender({ showButton: true, accessControl: { enabled: false, hideIfUnauthorized: false } });
    await fireEvent.click(await app.view.findByRole('button', { name: /^import$/i }));
    const oldInput = app.view.container.querySelector('input[type="file"]');
    if (!(oldInput instanceof HTMLInputElement)) throw new Error('Expected a file picker');
    await app.actions().login.mutate({});
    await ready(app);
    await fireEvent.change(oldInput, { target: { files: [jsonFile()] } });
    expect(app.source.create).not.toHaveBeenCalled();
    expect(app.view.container.querySelector('input[type="file"]')).not.toBe(oldInput);
    await choose(app);
    await waitFor(() => expect(app.source.create).toHaveBeenCalledTimes(2));
  });

  it('disables import while logged out even when permission checks are explicitly disabled', async () => {
    const app = await mountSession();
    await app.view.rerender({ showButton: true, accessControl: { enabled: false, hideIfUnauthorized: false } });
    await app.actions().logout.mutate();
    const button = await app.view.findByRole('button', { name: /^import$/i });
    expect(button.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(button);
    const input = app.view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected a file picker');
    await fireEvent.change(input, { target: { files: [jsonFile()] } });
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it('does not clear a current file selection when an old-session import settles', async () => {
    const source = provider();
    const oldWrite = deferred<GetOneResult>();
    const newWrite = deferred<GetOneResult>();
    source.create = vi.fn().mockReturnValueOnce(oldWrite.promise).mockReturnValue(newWrite.promise);
    const finish = vi.fn();
    const app = await mountSession(source);
    await app.view.rerender({ showButton: true, onFinish: finish });
    await choose(app, jsonFile([inputRows[0]]));
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.actions().login.mutate({});
    await ready(app);
    const currentInput = await choose(app, jsonFile([inputRows[1]]));
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(2));
    const clear = vi.fn();
    Object.defineProperty(currentInput, 'value', { configurable: true, get: () => '', set: clear });
    oldWrite.resolve({ data: row });
    await oldWrite.promise;
    await Promise.resolve();
    expect(clear).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
    newWrite.resolve({ data: { ...row, title: 'Current' } });
    await waitFor(() => expect(finish).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(clear).toHaveBeenCalledWith(''));
  });

  it('imports once, reports checked records and resets the input for re-selection', async () => {
    const source = provider();
    const app = mount(source);
    const onFinish = vi.fn();
    await app.view.rerender({ onFinish });
    const input = await choose(app);
    await fireEvent.change(input, { target: { files: [jsonFile()] } });
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(source.create).toHaveBeenCalledTimes(2);
    expect(onFinish.mock.calls[0]?.[0]).toMatchObject({ succeeded: [{ id: 1 }, { id: 2 }], errored: [] });
    expect(input.value).toBe('');
    await choose(app);
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(2));
    expect(source.create).toHaveBeenCalledTimes(4);
  });

  it('shows sanitized failures and permits an explicitly selected replacement file', async () => {
    const source = provider();
    const app = mount(source);
    await choose(app, jsonFile([{ PRIVATE: true }]));
    await waitFor(() => expect(app.view.getByRole('alert')).toBeDefined());
    expect(app.view.container.textContent).not.toContain('PRIVATE');
    expect(source.create).not.toHaveBeenCalled();
    await choose(app);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(app.view.queryByRole('alert')).toBeNull());
  });

  it('waits for permission, respects disabled checks and resource creation limits', async () => {
    const permission = deferred<{ can: boolean }>();
    const app = mount();
    await app.view.rerender({ permission: { can: () => permission.promise },
      accessControl: { enabled: true, hideIfUnauthorized: false } });
    expect(app.view.getByRole('button', { name: /^import$/i }).hasAttribute('disabled')).toBe(true);
    permission.resolve({ can: false });
    await waitFor(() => expect(app.view.getByRole('button', { name: /^import$/i }).hasAttribute('disabled')).toBe(true));
    await app.view.rerender({ accessControl: { enabled: false, hideIfUnauthorized: true } });
    expect(app.view.getByRole('button', { name: /^import$/i }).hasAttribute('disabled')).toBe(false);
    await app.view.rerender({ resources: [{ ...postDefinition, canCreate: false }] });
    expect(app.view.queryByRole('button', { name: /^import$/i })).toBeNull();
  });

  it('rejects a picker selection made for an obsolete resource', async () => {
    const source = provider();
    const app = mount(source);
    await fireEvent.click(await app.view.findByRole('button', { name: /^import$/i }));
    const input = app.view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
    await app.view.rerender({ resource: 'other' });
    await fireEvent.change(input, { target: { files: [jsonFile()] } });
    expect(source.create).not.toHaveBeenCalled();
  });

  it('stops subsequent rows and suppresses completion when permission is revoked mid-import', async () => {
    const gate = deferred<GetOneResult>();
    const source = provider();
    source.create = vi.fn(() => gate.promise);
    const app = mount(source);
    const onFinish = vi.fn();
    await app.view.rerender({ onFinish });
    await choose(app);
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await app.view.rerender({ permission: { can: async () => ({ can: false }) } });
    gate.resolve({ data: row });
    await waitFor(() => expect(app.view.queryByRole('button', { name: /^import$/i })).toBeNull());
    await Promise.resolve();
    expect(source.create).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
  });
});
