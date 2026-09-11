import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient } from '@tanstack/svelte-query';
import { defineResource, resetContext, setAdminOptions, type DataProvider, type ResourceDefinition, type AccessControlProvider } from '@svadmin/core';
import { resetToast } from '@svadmin/core/toast';
import { formatContractRouteId, parseContractRouteId } from '@svadmin/core/schema';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkedTableRows, copyTableRecord, tableExportRows, tableRowKey } from './table-contract';
import Host from './table-contract.test-host.svelte';
import { activeSavedListViewStorageKey, savedListViewsStorageKey, columnOrderStorageKey } from './saved-list-views';

const record = Type.Object({ id: Type.Union([Type.String(), Type.Number()]), title: Type.String() });
const posts = defineResource('posts', { record, update: Type.Object({ title: Type.Optional(Type.String()) }) });
const other = defineResource('other', { record });
const fields: ResourceDefinition['fields'] = [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'title', label: 'Title', type: 'text', searchable: true, filterable: true },
];
const definitions: ResourceDefinition[] = [
  { name: 'posts', label: 'Posts', fields, contract: posts, canCreate: false, canEdit: false, canShow: false },
  { name: 'other', label: 'Other', fields, contract: other, canCreate: false, canEdit: false, canShow: false },
];
const rows: [{ id: number; title: string }, { id: string; title: string }] =
  [{ id: 1, title: 'First' }, { id: '1', title: 'Second' }];
const clients: QueryClient[] = [];
function provider(): DataProvider {
  return {
    getApiUrl: () => '/api',
    getList: vi.fn(async () => ({ data: rows, total: rows.length })),
    getOne: vi.fn(async ({ id }) => ({ data: { id, title: 'First' } })),
    create: async () => ({ data: {} }), update: async () => ({ data: {} }),
    deleteOne: vi.fn(async ({ id }) => ({ data: { id, title: 'Deleted' } })),
    deleteMany: vi.fn<NonNullable<DataProvider['deleteMany']>>(async ({ ids }) => ({
      data: ids.map(id => ({ id, title: 'Deleted' })),
    })),
  };
}
function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Not initialized'); };
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function access(allowed: boolean): AccessControlProvider {
  return { can: async input => Array.isArray(input) ? input.map(() => ({ can: allowed })) : { can: allowed } };
}
function mount(source: DataProvider = provider(), permission?: AccessControlProvider) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  clients.push(client);
  const view = render(Host, { provider: source, resources: definitions, queryClient: client,
    ...(permission ? { access: permission } : {}),
  });
  return { view, client, source };
}
async function ready(app: ReturnType<typeof mount>) {
  await app.view.findAllByText('First');
}
async function selectAll(app: ReturnType<typeof mount>) {
  await ready(app);
  await fireEvent.click(app.view.getByRole('checkbox', { name: /全选|Select all/i }));
}
async function openBatch(app: ReturnType<typeof mount>) {
  await selectAll(app);
  await fireEvent.click(await app.view.findByRole('button', { name: /批量删除|Batch Delete/i }));
  return within(await app.view.findByRole('alertdialog'));
}
async function confirm(app: ReturnType<typeof mount>) {
  const dialog = within(await app.view.findByRole('alertdialog'));
  const button = dialog.getByRole('button', { name: /^(删除|Delete)$/ });
  await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
  await fireEvent.click(button);
}
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true, value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  resetToast();
  setAdminOptions({ mutationMode: 'pessimistic' });
  vi.restoreAllMocks();
});

describe('contract-bound AutoTable', () => {
  it('strictly compiles the table, generic header, adapters and fixture', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ['table-contract.ts', 'table-contract.test.svelte.ts', 'table-contract.test.type-fixture.ts', '../../../core/src/resource-contract.ts']
      .map(file => resolve(directory, file));
    const virtual = new Map(['AutoTable.svelte', 'DraggableHeader.svelte', 'table-contract.test-host.svelte',
      '../../test/fixtures/AutoTableInteractionsHarness.svelte'].map(file => {
      const filename = resolve(directory, file);
      return [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code];
    }));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, skipLibCheck: false, types: ['svelte', 'node'],
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

  it('preserves typed identity and detaches nested record data', () => {
    const input = { id: 1, title: 'First', nested: { value: 1 } };
    const output = copyTableRecord(input);
    expect(output).toEqual(input);
    expect(output['nested']).not.toBe(input.nested);
    expect(checkedTableRows(rows)).toEqual(rows);
    expect(tableRowKey(1)).not.toBe(tableRowKey('1'));
  });
  it.each([{}, { id: null }, { id: NaN }, { id: Infinity }, { id: true }])('rejects invalid table identity %j', value => {
    expect(() => checkedTableRows([value])).toThrow();
  });
  it('rejects duplicate typed identities and never executes record accessors', () => {
    expect(() => checkedTableRows([rows[0], rows[0]])).toThrow();
    const getter = vi.fn(() => 1);
    expect(() => copyTableRecord(Object.defineProperty({}, 'id', { get: getter }))).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
  it('parses only canonical numeric routes and preserves string-first union IDs', () => {
    const numeric = defineResource('numbers', { record: Type.Object({ id: Type.Number() }) });
    expect(parseContractRouteId(numeric, '1')).toBe(1);
    expect(parseContractRouteId(posts, '1')).toBe('1');
    for (const value of ['01', ' 1', '', 'NaN', 'Infinity']) expect(() => parseContractRouteId(numeric, value)).toThrow();
  });
  it.each([1, '1', '~svadmin-id:["number",1]'])('roundtrips typed detail links %j', id => {
    expect(parseContractRouteId(posts, formatContractRouteId(posts, id))).toBe(id);
  });
  it.each(['~svadmin-id:invalid', '~svadmin-id:["number","1"]', '~svadmin-id:["boolean",true]'])('rejects malformed tagged links %j', id => {
    expect(() => parseContractRouteId(posts, id)).toThrow();
  });
  it('preserves duplicate export labels and neutralizes formula-like text', () => {
    const input = copyTableRecord({ id: 1, title: '-cmd', other: ' \t=cmd', nested: { key: 'value' } });
    const exported = tableExportRows([input], [
      { key: 'id', label: 'Same' }, { key: 'title', label: 'Same' },
      { key: 'other', label: '=header' }, { key: 'nested', label: 'Nested' },
    ]);
    expect(exported).toEqual([{ Same: 1, 'Same (1)': "'-cmd", "'=header": "' \t=cmd", Nested: { key: 'value' } }]);
    expect(exported[0]?.['Nested']).not.toBe(input['nested']);
  });
  it('renders checked rows and deletes distinct string and numeric IDs together', async () => {
    const app = mount();
    await openBatch(app);
    await confirm(app);
    await waitFor(() => expect(app.source.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ ids: [1, '1'] })));
    await waitFor(() => expect(app.view.queryByRole('alertdialog')).toBeNull());
    expect(app.source.deleteOne).not.toHaveBeenCalled();
  });
  it.each([
    [{ id: 1, title: false }],
    [rows[0], rows[0]],
  ].map(data => ({ data })))('shows a retryable error for invalid rows %j', async ({ data }) => {
    const source = provider();
    source.getList = vi.fn(async () => ({ data, total: data.length }));
    const app = mount(source);
    await app.view.findByRole('button', { name: /重试|Retry/ });
    expect(app.view.queryByText('First')).toBeNull();
    source.getList = vi.fn(async () => ({ data: rows, total: 2 }));
    await fireEvent.click(app.view.getByRole('button', { name: /重试|Retry/ }));
    await ready(app);
  });
  it('blocks reads and refresh while list permission is denied', async () => {
    const app = mount(provider(), access(false));
    await app.view.findByRole('alert');
    await fireEvent.click(app.view.getByRole('button', { name: /^(刷新|Refresh)$/ }));
    expect(app.source.getList).not.toHaveBeenCalled();
    expect(app.view.queryByText('First')).toBeNull();
  });
  it('discards selection and a confirmation when the tenant changes', async () => {
    const app = mount();
    await openBatch(app);
    await app.view.rerender({ tenant: 'second' });
    await waitFor(() => expect(app.view.queryByRole('alertdialog')).toBeNull());
    expect(app.source.deleteMany).not.toHaveBeenCalled();
    expect(app.view.queryByRole('button', { name: /批量删除|Batch Delete/i })).toBeNull();
  });
  it('blocks a confirmation when read permission is revoked', async () => {
    const app = mount(provider(), access(true));
    await openBatch(app);
    await app.view.rerender({ access: access(false) });
    await waitFor(() => expect(app.view.queryByRole('alertdialog')).toBeNull());
    expect(app.source.deleteMany).not.toHaveBeenCalled();
    expect(app.view.queryByText('First')).toBeNull();
  });
  it('retains only failed identities after sequential fallback partially fails', async () => {
    const source = provider();
    delete source.deleteMany;
    source.deleteOne = vi.fn(async ({ id }) => {
      if (typeof id === 'string') throw new Error('private upstream error');
      return { data: { id, title: 'Deleted' } };
    });
    const app = mount(source);
    await openBatch(app);
    await confirm(app);
    await app.view.findByRole('alert');
    expect(app.view.queryByText(/private upstream/)).toBeNull();
    const checkboxes = within(app.view.getByRole('table')).getAllByRole('checkbox').slice(1);
    expect(checkboxes.map(item => item.getAttribute('aria-checked'))).toEqual(['false', 'true']);
  });
  it('does not let a late deletion change selection in a replacement scope', async () => {
    const source = provider();
    const pending = deferred<{ data: typeof rows }>();
    source.deleteMany = vi.fn(() => pending.promise);
    const app = mount(source);
    await openBatch(app);
    await confirm(app);
    await waitFor(() => expect(source.deleteMany).toHaveBeenCalledTimes(1));
    await app.view.rerender({ tenant: 'second' });
    await selectAll(app);
    pending.resolve({ data: rows });
    await waitFor(() => expect(app.client.getMutationCache().getAll().every(mutation => mutation.state.status !== 'pending')).toBe(true));
    await waitFor(() => expect(app.view.getByRole('checkbox', { name: /全选|Select all/i }).getAttribute('aria-checked')).toBe('true'));
  });
  it('keeps custom renderer writes away from the query cache', async () => {
    const app = mount();
    await app.view.rerender({ inspect: value => { value['title'] = 'Changed'; } });
    await ready(app);
    const cached: unknown = app.client.getQueryCache().getAll().find(query => query.state.data && JSON.stringify(query.state.data).includes('First'))?.state.data;
    expect(JSON.stringify(cached)).toContain('First');
    expect(JSON.stringify(cached)).not.toContain('Changed');
    expect(rows[0]?.title).toBe('First');
  });
  it('debounces search and dispatches the current checked filter', async () => {
    const app = mount();
    await ready(app);
    await fireEvent.input(app.view.getByPlaceholderText(/搜索|Search/), { target: { value: 'needle' } });
    await waitFor(() => expect(app.source.getList).toHaveBeenCalledWith(expect.objectContaining({
      filters: [{ field: 'title', operator: 'contains', value: 'needle' }],
    })));
  });
  it('confirms a single record using its original numeric ID and suppresses double dispatch', async () => {
    const app = mount();
    await ready(app);
    const firstRow = within(app.view.getByRole('row', { name: /First/ }));
    await fireEvent.click(firstRow.getByRole('button', { name: /^(Delete|删除)$/ }));
    const dialog = within(await app.view.findByRole('alertdialog'));
    const button = dialog.getByRole('button', { name: /^(Delete|删除)$/ });
    await fireEvent.click(button);
    await fireEvent.click(button);
    await waitFor(() => expect(app.source.deleteMany).toHaveBeenCalledTimes(1));
    expect(app.source.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ ids: [1] }));
    await waitFor(() => expect(app.client.getMutationCache().getAll().every(mutation => mutation.state.status !== 'pending')).toBe(true));
  });
  it('preflights required delete variables before any transport write', async () => {
    const protectedPosts = defineResource('posts', { record, delete: Type.Object({ reason: Type.String() }) });
    const app = mount();
    await app.view.rerender({ resources: definitions.map(definition => definition.name === 'posts'
      ? { ...definition, contract: protectedPosts } : definition) });
    await openBatch(app);
    await confirm(app);
    await app.view.findByRole('alert');
    expect(app.source.deleteMany).not.toHaveBeenCalled();
    await app.view.rerender({ deleteVariables: { reason: 'Requested' } });
    await openBatch(app);
    await confirm(app);
    await waitFor(() => expect(app.source.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ variables: { reason: 'Requested' } })));
    await waitFor(() => expect(app.client.getMutationCache().getAll().every(mutation => mutation.state.status !== 'pending')).toBe(true));
  });
  it('waits for permission before fetching and hides cached rows after revocation', async () => {
    const pending = deferred<{ can: boolean }>();
    const permission: AccessControlProvider = { can: input => Array.isArray(input)
      ? Promise.all(input.map(() => pending.promise)) : pending.promise };
    const app = mount(provider(), permission);
    expect(app.source.getList).not.toHaveBeenCalled();
    pending.resolve({ can: true });
    await ready(app);
    await app.view.rerender({ access: access(false) });
    await app.view.findByRole('alert');
    expect(app.view.queryByText('First')).toBeNull();
    expect(app.view.queryByText('2 records')).toBeNull();
  });
  it('routes a replacement resource to its declared provider and resets filters', async () => {
    const source = provider();
    const replacement = provider();
    const app = mount(source);
    await ready(app);
    await fireEvent.input(app.view.getByPlaceholderText(/搜索|Search/), { target: { value: 'old-search' } });
    await app.view.rerender({
      resource: 'other', provider: { default: source, reporting: replacement },
      resources: definitions.map(definition => definition.name === 'other'
        ? { ...definition, provider: { dataProviderName: 'reporting' } } : definition),
    });
    await waitFor(() => expect(replacement.getList).toHaveBeenCalledWith(expect.objectContaining({ resource: 'other', filters: [] })));
    expect(app.view.getByPlaceholderText(/搜索|Search/)).toHaveProperty('value', '');
  });
  it('uses schema-owned fields for inline editors and rejects mismatched display metadata', async () => {
    const app = mount();
    await app.view.rerender({ resources: definitions.map(definition => ({
      ...definition, canEdit: true, fields: ([
        ...fields, { key: 'serverOnly', label: 'Server only', type: 'text' },
        { key: 'title', label: 'Boolean title', type: 'boolean' },
      ] satisfies ResourceDefinition['fields']).filter(field => field.label !== 'Title'),
    })) });
    await waitFor(() => expect(app.source.getList).toHaveBeenCalled());
    await waitFor(() => expect(app.view.container.querySelector('[data-svadmin-invalid-field]')).not.toBeNull());
    expect(app.view.queryByRole('button', { name: 'Edit Server only' })).toBeNull();
  });
  it('updates controlled sorting and pagination without reverting the new state', async () => {
    const app = mount();
    await ready(app);
    await app.view.rerender({ pagination: { current: 2, pageSize: 20 }, sorters: [{ field: 'title', order: 'desc' }] });
    await waitFor(() => expect(app.source.getList).toHaveBeenLastCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({ current: 2, pageSize: 20 }), sorters: [{ field: 'title', order: 'desc' }],
    })));
  });
  it('persists header order and exports only currently visible columns', async () => {
    const app = mount();
    await ready(app);
    const id = app.view.getByRole('columnheader', { name: /ID/ });
    const title = app.view.getByRole('columnheader', { name: /Title/ });
    await fireEvent.dragStart(title);
    await fireEvent.drop(id);
    const scope = { resourceName: 'posts', providerName: 'default', tenantIdentity: 'first' };
    await waitFor(() => expect(localStorage.getItem(columnOrderStorageKey(scope))).toBe(JSON.stringify(['_select', 'title', 'id', '_actions'])));
    await fireEvent.click(app.view.getByRole('button', { name: /^(Columns|列)$/ }));
    await fireEvent.click(app.view.getByRole('menuitemcheckbox', { name: 'ID' }));
    expect(app.view.queryByRole('columnheader', { name: /ID/ })).toBeNull();
    const createURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:table-export');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await fireEvent.click(app.view.getByRole('button', { name: /^(Export|导出)$/ }));
    expect(createURL).toHaveBeenCalledTimes(1);
    const blob = createURL.mock.calls[0]?.[0];
    if (!(blob instanceof Blob)) throw new Error('Expected an export Blob');
    expect(await blob.text()).toContain('Title\nFirst\nSecond');
    await app.view.rerender({ access: access(false) });
    expect(app.view.queryByRole('button', { name: /^(Export|导出)$/ })).toBeNull();
  });
  it('restores scoped saved views and clears old search and selection on tenant change', async () => {
    const scope = { resourceName: 'posts', providerName: 'default', tenantIdentity: 'first' };
    localStorage.setItem(savedListViewsStorageKey(scope), JSON.stringify({ version: 1, views: [{
      id: 'saved', name: 'Saved', state: {
        search: 'saved-search', filters: [], sorters: [{ field: 'title', order: 'desc' }],
        pagination: { current: 2, pageSize: 20 }, columnVisibility: {}, columnOrder: [],
      },
    }] }));
    localStorage.setItem(activeSavedListViewStorageKey(scope), 'saved');
    const app = mount();
    await ready(app);
    expect(app.view.getByPlaceholderText(/搜索|Search/)).toHaveProperty('value', 'saved-search');
    await selectAll(app);
    await app.view.rerender({ tenant: 'second' });
    await waitFor(() => expect(app.source.getList).toHaveBeenLastCalledWith(expect.objectContaining({
      filters: [], sorters: [], pagination: expect.objectContaining({ current: 1, pageSize: 10 }),
    })));
    expect(app.view.queryByRole('button', { name: /Batch Delete/ })).toBeNull();
    expect(localStorage.getItem(savedListViewsStorageKey(scope))).toContain('saved-search');
  });
  it('opens and reloads the same typed record through a detail link', async () => {
    const app = mount();
    const onNavigate = vi.fn();
    await app.view.rerender({ resources: definitions.map(definition => ({ ...definition, canShow: true })), onNavigate });
    await ready(app);
    const row = within(app.view.getByRole('row', { name: /First/ }));
    await fireEvent.click(row.getByRole('button', { name: /^(Detail|详情)$/ }));
    await waitFor(() => expect(app.source.getOne).toHaveBeenCalledWith(expect.objectContaining({ id: 1 })));
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({
      query: expect.objectContaining({ detail: formatContractRouteId(posts, 1) }), type: 'push',
    }));
    const source = provider();
    const next = mount(source);
    await next.view.rerender({ resources: definitions.map(definition => ({ ...definition, canShow: true })), router: {
      parse: () => ({ pathname: '/posts', params: { detail: formatContractRouteId(posts, 1) } }),
      go: () => {}, back: () => {},
    } });
    await waitFor(() => expect(source.getOne).toHaveBeenCalledWith(expect.objectContaining({ id: 1 })));
  });
  it('rejects invalid numeric detail links without dispatching a detail request', async () => {
    const contract = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
    const source = provider();
    source.getList = vi.fn(async () => ({ data: [rows[0]], total: 1 }));
    const app = mount(source);
    await app.view.rerender({
      resources: definitions.map(definition => definition.name === 'posts' ? { ...definition, contract } : definition),
      router: { parse: () => ({ pathname: '/posts', params: { detail: '01' } }), go: () => {}, back: () => {} },
    });
    await ready(app);
    await app.view.findByRole('alert');
    expect(source.getOne).not.toHaveBeenCalled();
  });
  it('allows reading but denies destructive actions with delete-only denial', async () => {
    const permission: AccessControlProvider = {
      can: async input => Array.isArray(input)
        ? input.map(entry => ({ can: entry.action !== 'delete' })) : { can: input.action !== 'delete' },
    };
    const app = mount(provider(), permission);
    await ready(app);
    expect(app.view.queryByRole('button', { name: /^(Delete|删除)$/ })).toBeNull();
    expect(app.source.deleteMany).not.toHaveBeenCalled();
  });
  it('does not export previously cached rows after a malformed refresh', async () => {
    const app = mount();
    await ready(app);
    app.source.getList = vi.fn(async () => ({ data: [{ id: 1, title: false }], total: 1 }));
    await fireEvent.click(app.view.getByRole('button', { name: /^(Refresh|刷新)$/ }));
    await app.view.findByRole('button', { name: /Retry|重试/ });
    const createURL = vi.spyOn(URL, 'createObjectURL');
    await fireEvent.click(app.view.getByRole('button', { name: /^(Export|导出)$/ }));
    expect(createURL).not.toHaveBeenCalled();
  });
  it.each(['undoable', 'optimistic'] as const)('ignores the removed %s deletion mode and retains rows until a checked receipt', async mutationMode => {
    setAdminOptions({ mutationMode, undoableTimeout: 60_000 });
    const source = provider();
    const pending = deferred<{ data: typeof rows }>();
    source.deleteMany = vi.fn(() => pending.promise);
    const app = mount(source);
    await openBatch(app);
    await confirm(app);
    await waitFor(() => expect(source.deleteMany).toHaveBeenCalledTimes(1));
    expect(app.view.getAllByText('First').length).toBeGreaterThan(0);
    expect(app.view.queryByRole('button', { name: /^(Undo|撤销)$/ })).toBeNull();
    pending.resolve({ data: rows });
    await waitFor(() => expect(app.client.getMutationCache().getAll().every(mutation => mutation.state.status !== 'pending')).toBe(true));
    await waitFor(() => expect(app.view.queryByRole('button', { name: /Batch Delete/ })).toBeNull());
  });
  it('keeps the table off the unsafe API and its exception list', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(directory, 'AutoTable.svelte'), 'utf8');
    expect(source).not.toContain('@svadmin/core/unsafe');
    expect(source).not.toMatch(/\bas (?:any|never|BaseRecord)\b|@ts-ignore|@ts-nocheck/);
    expect(readFileSync(resolve(directory, '../../../../scripts/unsafe-boundaries.json'), 'utf8')).not.toContain('AutoTable.svelte');
  });
});
