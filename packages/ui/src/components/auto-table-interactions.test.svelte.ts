import { requireValue } from "../../../../scripts/test-assertions";
import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { resetToast, setAdminOptions, type AuthProvider, type DataProvider } from '@svadmin/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import AutoTableInteractionsHarness from '../../test/fixtures/AutoTableInteractionsHarness.svelte';
import AutoTableIdentityHydrationHost from '../../test/fixtures/AutoTableIdentityHydrationHost.svelte';
import {
  activeSavedListViewStorageKey,
  columnOrderStorageKey,
  columnVisibilityStorageKey,
  legacyActiveSavedListViewStorageKey,
  legacyColumnOrderStorageKey,
  legacySavedListViewsStorageKey,
  savedListViewsStorageKey,
  type ListPreferenceScope,
} from './saved-list-views.js';

const defaultScope = { resourceName: 'users', providerName: 'default' } as const;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => { resolve = complete; });
  return { promise, resolve };
}

function listProvider(): DataProvider {
  return {
    getApiUrl: () => 'https://example.test',
    getList: async () => ({ data: [{ id: 'user-1', email: 'user@example.com' }], total: 1 }),
    getOne: async ({ id }) => ({ data: { id, email: 'user@example.com' } }),
    create: async () => ({ data: { id: 'user-1', email: 'user@example.com' } }),
    update: async () => ({ data: { id: 'user-1', email: 'user@example.com' } }),
    deleteOne: async ({ id }) => ({ data: { id, email: 'user@example.com' } }),
  };
}

function strictSvelteDiagnostics(directory: string, sources: string[], components: string[]): string[] {
  const virtual = new Map(components.map(name => {
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
  const targets = [
    ...sources.map(path => resolve(directory, path)),
    ...components.map(name => `${resolve(directory, name)}.tsx`),
  ];
  const program = ts.createProgram({ rootNames: [...targets,
    resolve(directory, '../../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
    resolve(directory, '../../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
  ], options, host });
  return targets.flatMap(file => {
    const source = program.getSourceFile(file);
    if (!source) throw new Error(`Missing compiler input ${file}`);
    return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
  }).map(diagnostic => {
    const line = diagnostic.file && diagnostic.start !== undefined
      ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1 : 0;
    return `${diagnostic.file?.fileName ?? ''}:${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
  });
}

beforeEach(() => {
  setAdminOptions({ mutationMode: 'pessimistic' });
  resetToast();
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    } satisfies Partial<Storage>,
  });
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

afterEach(() => {
  setAdminOptions({ mutationMode: 'pessimistic' });
  resetToast();
  vi.restoreAllMocks();
});

describe('AutoTable interactions', () => {
  it('synchronizes changed controlled pagination and sorting with queries and the router', async () => {
    const onNavigate = vi.fn();
    const onGetList = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate, onGetList,
      pagination: { current: 2, pageSize: 20 },
      sorters: [{ field: 'email', order: 'asc' }],
    });
    await waitFor(() => expect(onGetList).toHaveBeenLastCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({ current: 2, pageSize: 20 }),
      sorters: [{ field: 'email', order: 'asc' }],
    })));
    await view.rerender({
      pagination: { current: 3, pageSize: 50 },
      sorters: [{ field: 'email', order: 'desc' }],
    });
    await waitFor(() => expect(onGetList).toHaveBeenLastCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({ current: 3, pageSize: 50 }),
      sorters: [{ field: 'email', order: 'desc' }],
    })));
    await waitFor(() => expect(onNavigate).toHaveBeenLastCalledWith(expect.objectContaining({
      query: expect.objectContaining({ page: '3', pageSize: '50', sort: 'email', order: 'desc' }),
    })));
    await view.rerender({ sorters: [] });
    await waitFor(() => expect(onGetList).toHaveBeenLastCalledWith(expect.objectContaining({ sorters: [] })));
    await waitFor(() => expect(onNavigate).toHaveBeenLastCalledWith(expect.objectContaining({
      query: { page: '3', pageSize: '50' },
    })));
  });

  it('opens and closes embedded detail drawers without changing router history', async () => {
    const onNavigate = vi.fn();
    const onBack = vi.fn();
    const view = render(AutoTableInteractionsHarness, { onNavigate, onBack, syncWithLocation: false });
    await fireEvent.click(requireValue((await view.findAllByRole('button', { name: '详情' }))[0]));
    const dialog = await view.findByRole('dialog', { name: 'Users 详情' });
    expect(await within(dialog).findByText('user@example.com')).toBeTruthy();
    await fireEvent.click(within(dialog).getByRole('button', { name: '关闭' }));
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onBack).not.toHaveBeenCalled();
  });

  it('keeps embedded tables independent of route query state', async () => {
    const onNavigate = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate,
      locale: 'en',
      syncWithLocation: false,
      initialParams: { q: 'unrelated', page: '9', detail: 'unrelated' },
    });
    const search = await view.findByPlaceholderText(/search/i);
    expect((search as HTMLInputElement).value).toBe('');
    expect(view.queryByRole('dialog')).toBeNull();
    await fireEvent.input(search, { target: { value: 'Ada' } });
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(onNavigate).not.toHaveBeenCalled();
  });
  it('uses the active locale for built-in table labels', async () => {
    const view = render(AutoTableInteractionsHarness, {
      locale: 'en',
      onNavigate: vi.fn(),
    });

    expect(await view.findByRole('button', { name: 'Columns' })).toBeTruthy();
    expect(await view.findByPlaceholderText('Search...')).toBeTruthy();
  });

  it('uses the neutral Chinese empty description without create permission', async () => {
    const view = render(AutoTableInteractionsHarness, {
      locale: 'zh-CN',
      emptyData: true,
      canCreate: false,
      onNavigate: vi.fn(),
    });

    await waitFor(() => {
      expect(view.container.querySelector('[data-svadmin-data-state="empty"]')).toBeTruthy();
    });
    const empty = view.container.querySelector('[data-svadmin-data-state="empty"]');
    expect(empty?.textContent).toContain('暂无数据');
    expect(empty?.textContent).not.toContain('创建第一条记录');
  });

  it('uses the neutral English empty description without create permission', async () => {
    const view = render(AutoTableInteractionsHarness, {
      locale: 'en',
      emptyData: true,
      canCreate: false,
      onNavigate: vi.fn(),
    });

    await waitFor(() => {
      expect(view.container.querySelector('[data-svadmin-data-state="empty"]')).toBeTruthy();
    });
    const empty = view.container.querySelector('[data-svadmin-data-state="empty"]');
    expect(empty?.textContent).toContain('No data');
    expect(empty?.textContent).not.toMatch(/create your first record/i);
  });

  it('keeps the Chinese create guidance when create permission exists', async () => {
    const view = render(AutoTableInteractionsHarness, {
      locale: 'zh-CN',
      emptyData: true,
      canCreate: true,
      onNavigate: vi.fn(),
    });

    await waitFor(() => {
      expect(view.container.querySelector('[data-svadmin-data-state="empty"]')).toBeTruthy();
    });
    expect(view.container.querySelector('[data-svadmin-data-state="empty"]')?.textContent)
      .toContain('创建第一条记录');
  });

  it('keeps the English create guidance when create permission exists', async () => {
    const view = render(AutoTableInteractionsHarness, {
      locale: 'en',
      emptyData: true,
      canCreate: true,
      onNavigate: vi.fn(),
    });

    await waitFor(() => {
      expect(view.container.querySelector('[data-svadmin-data-state="empty"]')).toBeTruthy();
    });
    expect(view.container.querySelector('[data-svadmin-data-state="empty"]')?.textContent)
      .toMatch(/create your first record/i);
  });

  it('renders the base table primitives', async () => {
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
    });

    await view.findAllByText('user@example.com');
    const tableContainer = view.container.querySelector<HTMLElement>('[data-slot="table-container"]');
    expect(tableContainer).toBeTruthy();
    expect(tableContainer?.querySelector('[data-slot="table-head"]')).toBeTruthy();
    expect(tableContainer?.querySelector('[data-slot="table-cell"]')).toBeTruthy();
  });

  it('updates external column visibility state after a picker click', async () => {
    const view = render(AutoTableInteractionsHarness, { onNavigate: vi.fn() });

    await fireEvent.click(await view.findByRole('button', { name: '列' }));
    const emailColumn = await view.findByRole('menuitemcheckbox', { name: 'Email' });
    expect(emailColumn.getAttribute('aria-checked')).toBe('true');
    expect(view.getAllByText('user@example.com')).toHaveLength(2);

    await fireEvent.click(emailColumn);

    await waitFor(() => {
      expect(view.getByRole('menuitemcheckbox', { name: 'Email' }).getAttribute('aria-checked')).toBe('false');
      expect(view.queryByRole('columnheader', { name: 'Email' })).toBeNull();
      expect(view.queryByText('user@example.com')).toBeNull();
    });
  });

  it('waits for a pause before synchronizing a search with the router', async () => {
    const onNavigate = vi.fn();
    const view = render(AutoTableInteractionsHarness, { onNavigate });
    const searchInput = await view.findByPlaceholderText('搜索...');

    searchInput.focus();
    await fireEvent.input(searchInput, { target: { value: 'u' } });
    await fireEvent.input(searchInput, { target: { value: 'user' } });
    expect(onNavigate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith({
        to: '/',
        query: { q: 'user' },
        type: 'replace',
      });
    });
    expect(document.activeElement).toBe(searchInput);
  });

  it('applies an initial list snapshot and reports debounced state without repeated callbacks', async () => {
    const onGetList = vi.fn();
    const onListStateChange = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      onGetList,
      onListStateChange,
      locale: 'en',
      syncWithLocation: false,
      initialListState: {
        search: 'Ada',
        filters: [{ field: 'email', operator: 'contains', value: 'user' }],
        sorters: [{ field: 'email', order: 'desc' }],
        pagination: { current: 2, pageSize: 20 },
      },
    });

    await waitFor(() => expect(onGetList).toHaveBeenLastCalledWith(expect.objectContaining({
      filters: [
        { field: 'email', operator: 'contains', value: 'user' },
        { field: 'email', operator: 'contains', value: 'Ada' },
      ],
      sorters: [{ field: 'email', order: 'desc' }],
      pagination: expect.objectContaining({ current: 2, pageSize: 20 }),
    })));
    const search = await view.findByPlaceholderText('Search...') as HTMLInputElement;
    expect(search.value).toBe('Ada');
    expect(view.getByText('Email: user')).toBeTruthy();
    expect(onListStateChange).not.toHaveBeenCalled();

    onListStateChange.mockClear();
    await fireEvent.input(search, { target: { value: 'Bob' } });
    await waitFor(() => expect(onListStateChange).toHaveBeenLastCalledWith(expect.objectContaining({
      search: 'Bob',
      pagination: { current: 1, pageSize: 20 },
    })), { timeout: 1_500 });
    const calls = onListStateChange.mock.calls.length;
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(onListStateChange).toHaveBeenCalledTimes(calls);
  });

  it('retires a mounted initial snapshot after a scope switch and does not revive it', async () => {
    const initialListState = {
      search: 'Ada',
      filters: [{ field: 'email', operator: 'contains' as const, value: 'user' }],
      sorters: [{ field: 'email', order: 'desc' as const }],
      pagination: { current: 2, pageSize: 20 },
    };
    const onGetList = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      onGetList,
      locale: 'en',
      syncWithLocation: false,
      providerName: 'analytics',
      tenantIdentity: 'acme',
      initialListState,
    });

    const search = await view.findByPlaceholderText('Search...') as HTMLInputElement;
    expect(search.value).toBe('Ada');
    expect(await view.findByText('Email: user')).toBeTruthy();
    await waitFor(() => expect(onGetList).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.arrayContaining([expect.objectContaining({ value: 'user' })]),
      sorters: [{ field: 'email', order: 'desc' }],
      pagination: expect.objectContaining({ current: 2, pageSize: 20 }),
    })));
    const beforeSwitch = onGetList.mock.calls.length;

    initialListState.search = 'mutated-after-mount';
    initialListState.filters.push({ field: 'email', operator: 'contains', value: 'late' });
    initialListState.pagination.current = 5;

    await view.rerender({
      onNavigate: vi.fn(),
      onGetList,
      locale: 'en',
      syncWithLocation: false,
      providerName: 'reporting',
      tenantIdentity: 'omega',
    });

    await waitFor(() => expect(search.value).toBe(''));
    expect(view.queryByText('Email: user')).toBeNull();
    expect(view.queryByText('Email: late')).toBeNull();
    // 新作用域不能先以旧快照发出首帧请求；每条新请求都必须是已清空的默认查询。
    await waitFor(() => {
      const calls = onGetList.mock.calls.slice(beforeSwitch);
      expect(calls.length).toBeGreaterThan(0);
      expect(calls.every(([params]) => JSON.stringify(params.filters ?? []).match(/user|mutated-after-mount/) === null))
        .toBe(true);
      expect(calls.every(([params]) => params.sorters?.length === 0)).toBe(true);
      expect(calls.every(([params]) => params.pagination?.current === 1
        && params.pagination?.pageSize === 10)).toBe(true);
    });

    await view.rerender({
      onNavigate: vi.fn(),
      onGetList,
      locale: 'en',
      syncWithLocation: false,
      providerName: 'analytics',
      tenantIdentity: 'acme',
    });

    await waitFor(() => expect(search.value).toBe(''));
    expect(view.queryByText('Email: user')).toBeNull();
    expect(view.queryByText('Email: late')).toBeNull();
  });

  it('keeps initial state ahead of a delayed remote default while allowing an explicit saved view', async () => {
    const remote = deferred<unknown>();
    const list = vi.fn(() => remote.promise);
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      locale: 'en',
      syncWithLocation: false,
      applyRemoteDefaultView: true,
      savedViewProvider: { list },
      initialListState: {
        search: 'Initial',
        filters: [],
        sorters: [],
        pagination: { current: 2, pageSize: 20 },
      },
    });

    const search = await view.findByPlaceholderText('Search...') as HTMLInputElement;
    expect(search.value).toBe('Initial');
    remote.resolve([{
      id: 'team-default',
      name: 'Team default',
      source: 'team',
      version: 1,
      default: true,
      state: {
        search: 'Remote',
        filters: [],
        sorters: [],
        pagination: { current: 3, pageSize: 10 },
        columnVisibility: {},
        columnOrder: ['id', 'email'],
      },
    }]);

    await fireEvent.click(await view.findByRole('button', { name: 'Views' }));
    expect(await view.findByRole('option', { name: 'Team default' })).toBeTruthy();
    expect(search.value).toBe('Initial');

    await fireEvent.change(view.getByLabelText('Current unsaved view'), { target: { value: 'team-default' } });
    await waitFor(() => expect(search.value).toBe('Remote'));
  });

  it('prefers initial list state over an existing personal saved view until the user selects it', async () => {
    localStorage.setItem(savedListViewsStorageKey(defaultScope), JSON.stringify({
      version: 1,
      views: [{
        id: 'personal',
        name: 'Personal',
        state: {
          search: 'saved',
          filters: [],
          sorters: [],
          pagination: { current: 4, pageSize: 10 },
          columnVisibility: {},
          columnOrder: ['id', 'email'],
        },
      }],
    }));
    localStorage.setItem(activeSavedListViewStorageKey(defaultScope), 'personal');
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      locale: 'en',
      syncWithLocation: false,
      initialListState: {
        search: 'Initial',
        filters: [],
        sorters: [],
        pagination: { current: 2, pageSize: 20 },
      },
    });

    const search = await view.findByPlaceholderText('Search...') as HTMLInputElement;
    expect(search.value).toBe('Initial');
    await fireEvent.click(await view.findByRole('button', { name: 'Views' }));
    // 初始快照优先时不能把持久化活动视图误标为当前视图，但保存视图本身必须仍可手动应用。
    expect((view.getByLabelText('Current unsaved view') as HTMLSelectElement).value).toBe('');
    await fireEvent.change(view.getByLabelText('Current unsaved view'), { target: { value: 'personal' } });
    await waitFor(() => expect(search.value).toBe('saved'));
    expect((view.getByLabelText('Current unsaved view') as HTMLSelectElement).value).toBe('personal');
    expect(JSON.parse(localStorage.getItem(savedListViewsStorageKey(defaultScope)) ?? '{}').views)
      .toHaveLength(1);
  });

  it('strictly types the saved view pagination captured from list state', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const diagnostics = strictSvelteDiagnostics(directory,
      ['list-state.svelte.ts', 'saved-list-views.svelte.ts', 'saved-list-views.ts'],
      [
        'AutoTable.svelte',
        'DraggableHeader.svelte',
        '../../test/fixtures/AutoTableIdentityHydrationHost.svelte',
      ]);
    // 完整纳入虚拟源与真实 TS 源后，目标集合上不允许存在任何诊断。
    expect(diagnostics).toEqual([]);
  }, 90_000);

  it('allows a new scope to apply its own remote default after the old initial snapshot is retired', async () => {
    const list = vi.fn(async (scope: ListPreferenceScope) => scope.tenantIdentity === 'omega'
      ? [{
        id: 'new-scope-default',
        name: 'New scope default',
        source: 'team',
        version: 1,
        default: true,
        state: {
          search: 'New scope default',
          filters: [],
          sorters: [],
          pagination: { current: 2, pageSize: 10 },
          columnVisibility: {},
          columnOrder: ['id', 'email'],
        },
      }]
      : []);
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      locale: 'en',
      syncWithLocation: false,
      providerName: 'analytics',
      tenantIdentity: 'acme',
      applyRemoteDefaultView: true,
      savedViewProvider: { list },
      initialListState: {
        search: 'Initial',
        filters: [],
        sorters: [],
        pagination: { current: 2, pageSize: 20 },
      },
    });

    const search = await view.findByPlaceholderText('Search...') as HTMLInputElement;
    expect(search.value).toBe('Initial');
    await waitFor(() => expect(list).toHaveBeenCalledWith(expect.objectContaining({ tenantIdentity: 'acme' })));

    await view.rerender({
      onNavigate: vi.fn(),
      locale: 'en',
      syncWithLocation: false,
      providerName: 'reporting',
      tenantIdentity: 'omega',
      applyRemoteDefaultView: true,
      savedViewProvider: { list },
      initialListState: {
        search: 'Initial',
        filters: [],
        sorters: [],
        pagination: { current: 2, pageSize: 20 },
      },
    });

    await waitFor(() => expect(search.value).toBe('New scope default'));
  });

  it('does not let a tenant-scoped identity hydration replay an initial snapshot', async () => {
    let identityId = 'alice';
    const authProvider: AuthProvider = {
      login: async () => ({ success: true }),
      logout: async () => ({ success: true }),
      check: async () => ({ authenticated: true }),
      getIdentity: async () => ({ id: identityId }),
    };
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      locale: 'en',
      syncWithLocation: false,
      tenantIdentity: 'acme',
      authProvider,
      initialListState: {
        search: 'Initial',
        filters: [],
        sorters: [],
        pagination: { current: 2, pageSize: 20 },
      },
    });

    const search = await view.findByPlaceholderText('Search...') as HTMLInputElement;
    expect(search.value).toBe('Initial');
    await fireEvent.input(search, { target: { value: 'user-change' } });
    await waitFor(() => expect(search.value).toBe('user-change'), { timeout: 1_500 });

    identityId = 'bob';
    await view.rerender({
      onNavigate: vi.fn(),
      locale: 'en',
      syncWithLocation: false,
      tenantIdentity: 'omega',
      authProvider,
      initialListState: {
        search: 'Initial',
        filters: [],
        sorters: [],
        pagination: { current: 2, pageSize: 20 },
      },
    });

    await waitFor(() => expect(search.value).toBe(''), { timeout: 1_500 });
  });

  it('preserves debounced and controlled list state across the first identity hydration', async () => {
    const pendingIdentity = deferred<{ id: string }>();
    const getIdentity = vi.fn(() => pendingIdentity.promise);
    const authProvider: AuthProvider = {
      login: async () => ({ success: true }),
      logout: async () => ({ success: true }),
      check: async () => ({ authenticated: true }),
      getIdentity,
    };
    const savedScope: ListPreferenceScope = {
      resourceName: 'users', providerName: 'default', identityKey: 'id:alice',
    };
    localStorage.setItem(savedListViewsStorageKey(savedScope), JSON.stringify({
      version: 1,
      views: [{
        id: 'personal',
        name: 'Personal',
        state: {
          search: 'Saved',
          filters: [],
          sorters: [{ field: 'email', order: 'asc' }],
          pagination: { current: 4, pageSize: 10 },
          columnVisibility: {},
          columnOrder: ['id', 'email'],
        },
      }],
    }));
    const onGetList = vi.fn();
    const onListStateChange = vi.fn();
    const initialListState = {
      search: 'Initial',
      filters: [],
      sorters: [],
      pagination: { current: 2, pageSize: 20 },
    };
    const dataProvider = listProvider();
    const view = render(AutoTableIdentityHydrationHost, {
      authProvider,
      dataProvider,
      initialListState,
      pagination: { current: 2, pageSize: 20 },
      sorters: [{ field: 'email', order: 'asc' as const }],
      onGetList,
      onListStateChange,
    });

    const search = await view.findByPlaceholderText(/Search|搜索/) as HTMLInputElement;
    expect(search.value).toBe('Initial');
    await fireEvent.input(search, { target: { value: 'user-change' } });
    await waitFor(() => expect(onListStateChange).toHaveBeenLastCalledWith(expect.objectContaining({
      search: 'user-change',
    })), { timeout: 1_500 });

    await view.rerender({
      authProvider,
      dataProvider,
      initialListState,
      pagination: { current: 3, pageSize: 20 },
      sorters: [{ field: 'email', order: 'desc' as const }],
      onGetList,
      onListStateChange,
    });
    await waitFor(() => expect(onGetList).toHaveBeenLastCalledWith(expect.objectContaining({
      filters: [expect.objectContaining({ value: 'user-change' })],
      sorters: [{ field: 'email', order: 'desc' }],
      pagination: expect.objectContaining({ current: 3, pageSize: 20 }),
    })));
    const beforeHydration = onGetList.mock.calls.length;

    pendingIdentity.resolve({ id: 'alice' });
    await new Promise(resolve => setTimeout(resolve, 50));
    const hydrationCalls = onGetList.mock.calls.slice(beforeHydration);
    expect(hydrationCalls.every(([params]) => JSON.stringify(params).includes('user-change'))).toBe(true);
    expect(hydrationCalls.every(([params]) => !JSON.stringify(params).includes('Initial'))).toBe(true);
    // 身份从不透明 pending 解析为同一 auth session 时复用了同一个 DOM 实例。
    expect(view.getByPlaceholderText(/Search|搜索/)).toBe(search);
    expect(search.value).toBe('user-change');

    await fireEvent.click(await view.findByRole('button', { name: /Views|视图/ }));
    const picker = await view.findByLabelText(/Current unsaved view|当前未保存视图/) as HTMLSelectElement;
    expect(picker.value).toBe('');
    await fireEvent.change(picker, { target: { value: 'personal' } });
    await waitFor(() => expect(search.value).toBe('Saved'));
    expect(onListStateChange).toHaveBeenLastCalledWith(expect.objectContaining({
      search: 'Saved',
      sorters: [{ field: 'email', order: 'desc' }],
      pagination: expect.objectContaining({ current: 3, pageSize: 20 }),
    }));
    await waitFor(() => expect(onGetList).toHaveBeenLastCalledWith(expect.objectContaining({
      filters: [expect.objectContaining({ value: 'Saved' })],
      sorters: [{ field: 'email', order: 'desc' }],
      pagination: expect.objectContaining({ current: 3, pageSize: 20 }),
    })));
  });

  it('does not treat a new auth session as the first hydration of the old pending identity', async () => {
    const pendingIdentity = deferred<{ id: string }>();
    let identityRequest = 0;
    const getIdentity = vi.fn(() => {
      identityRequest += 1;
      return identityRequest === 1 ? pendingIdentity.promise : Promise.resolve({ id: 'bob' });
    });
    const authProvider: AuthProvider = {
      login: async () => ({ success: true }),
      logout: async () => ({ success: true }),
      check: async () => ({ authenticated: true }),
      getIdentity,
    };
    let controls!: { login: () => Promise<unknown> };
    const onGetList = vi.fn();
    const onListStateChange = vi.fn();
    const view = render(AutoTableIdentityHydrationHost, {
      authProvider,
      dataProvider: listProvider(),
      initialListState: {
        search: 'Initial',
        filters: [],
        sorters: [],
        pagination: { current: 2, pageSize: 20 },
      },
      onGetList,
      onListStateChange,
      onReady: value => { controls = value; },
    });

    const search = await view.findByPlaceholderText(/Search|搜索/) as HTMLInputElement;
    expect(search.value).toBe('Initial');
    await fireEvent.input(search, { target: { value: 'old-session' } });
    await waitFor(() => expect(onListStateChange).toHaveBeenLastCalledWith(expect.objectContaining({
      search: 'old-session',
    })), { timeout: 1_500 });
    const beforeSessionChange = onGetList.mock.calls.length;
    const beforeLoginRequests = getIdentity.mock.calls.length;

    await controls.login();
    await waitFor(() => expect(getIdentity.mock.calls.length).toBeGreaterThan(beforeLoginRequests));
    await waitFor(() => expect(search.value).toBe(''));
    await waitFor(() => {
      const calls = onGetList.mock.calls.slice(beforeSessionChange);
      expect(calls.length).toBeGreaterThan(0);
      expect(calls.every(([params]) => !JSON.stringify(params).includes('old-session'))).toBe(true);
    });

    pendingIdentity.resolve({ id: 'alice' });
    await pendingIdentity.promise;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(view.getByPlaceholderText(/Search|搜索/)).toBe(search);
    expect(search.value).toBe('');
  });

  it('restores URL filters, exposes them in the toolbar, and clears them together', async () => {
    const onNavigate = vi.fn();
    const initialParams = {
      filters: JSON.stringify([{ field: 'email', operator: 'contains', value: 'user' }]),
    };
    const view = render(AutoTableInteractionsHarness, { onNavigate, initialParams });

    expect(await view.findByText('Email: user')).toBeTruthy();
    expect(onNavigate).not.toHaveBeenCalled();

    await fireEvent.click(view.getByRole('button', { name: /^筛选/ }));
    const emailFilter = await view.findByLabelText('Email') as HTMLInputElement;
    expect(emailFilter.value).toBe('user');
    expect(view.queryByRole('button', { name: '确认' })).toBeNull();
    await fireEvent.input(emailFilter, { target: { value: 'admin' } });
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({
      to: '/',
      query: {
        filters: JSON.stringify([{ field: 'email', operator: 'contains', value: 'admin' }]),
      },
      type: 'replace',
    }));

    await fireEvent.click(view.getByRole('button', { name: '清除全部' }));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({
      to: '/',
      query: {},
      type: 'replace',
    }));
    expect(view.queryByText('Email: user')).toBeNull();
  });

  it('removes one restored filter without discarding the remaining URL state', async () => {
    const onNavigate = vi.fn();
    const remainingFilter = { field: 'id', operator: 'eq' as const, value: 'user-1' };
    const initialParams = {
      filters: JSON.stringify([
        remainingFilter,
        { field: 'email', operator: 'contains', value: 'user' },
      ]),
    };
    const view = render(AutoTableInteractionsHarness, { onNavigate, initialParams });

    expect(await view.findByText('ID: user-1')).toBeTruthy();
    expect(await view.findByText('Email: user')).toBeTruthy();
    await fireEvent.click(view.getByRole('button', { name: '清除: Email: user' }));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({
      to: '/',
      query: { filters: JSON.stringify([remainingFilter]) },
      type: 'replace',
    }));
    expect(view.queryByText('Email: user')).toBeNull();
    expect(view.getByText('ID: user-1')).toBeTruthy();
  });

  it('preserves logical URL filters while editing a simple field filter', async () => {
    const onNavigate = vi.fn();
    const logicalFilter = {
      operator: 'or' as const,
      value: [
        { field: 'id', operator: 'eq' as const, value: 'user-1' },
        { field: 'id', operator: 'eq' as const, value: 'user-2' },
      ],
    };
    const initialParams = {
      filters: JSON.stringify([
        logicalFilter,
        { field: 'email', operator: 'contains', value: 'user' },
      ]),
    };
    const view = render(AutoTableInteractionsHarness, { onNavigate, initialParams });

    await fireEvent.click(await view.findByRole('button', { name: /^筛选/ }));
    await fireEvent.input(await view.findByLabelText('Email'), { target: { value: 'admin' } });

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({
      to: '/',
      query: {
        filters: JSON.stringify([
          logicalFilter,
          { field: 'email', operator: 'contains', value: 'admin' },
        ]),
      },
      type: 'replace',
    }));
  });

  it('applies a persisted column order after the table mounts', async () => {
    localStorage.setItem(columnOrderStorageKey(defaultScope), JSON.stringify(['email', 'id']));
    const view = render(AutoTableInteractionsHarness, { onNavigate: vi.fn() });

    await waitFor(() => {
      const headings = view.getAllByRole('columnheader').map((heading) => heading.textContent?.trim());
      expect(headings.findIndex((heading) => heading?.startsWith('Email')))
        .toBeLessThan(headings.findIndex((heading) => heading?.startsWith('ID')));
    });
  });

  it('saves the current query and column state as a named resource view', async () => {
    const initialFilter = { field: 'email', operator: 'contains' as const, value: 'user' };
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      initialParams: {
        page: '2',
        pageSize: '20',
        sort: 'email',
        order: 'desc',
        q: 'user',
        filters: JSON.stringify([initialFilter]),
      },
    });

    await fireEvent.click(await view.findByRole('button', { name: '列' }));
    await fireEvent.click(await view.findByRole('menuitemcheckbox', { name: 'ID' }));
    await fireEvent.click(view.getByRole('button', { name: '视图' }));
    await fireEvent.input(await view.findByLabelText('视图名称'), { target: { value: '待审核用户' } });
    await fireEvent.click(view.getByRole('button', { name: '保存' }));

    const stored = JSON.parse(localStorage.getItem(savedListViewsStorageKey(defaultScope)) ?? '{}');
    expect(stored.version).toBe(1);
    expect(stored.views).toHaveLength(1);
    expect(stored.views[0]).toMatchObject({
      name: '待审核用户',
      state: {
        search: 'user',
        filters: [initialFilter],
        sorters: [{ field: 'email', order: 'desc' }],
        pagination: { current: 2, pageSize: 20 },
        columnVisibility: { id: false },
      },
    });
    expect(localStorage.getItem(activeSavedListViewStorageKey(defaultScope))).toBe(stored.views[0].id);
  });

  it('restores the active saved view and synchronizes it into the URL', async () => {
    const savedFilter = { field: 'email', operator: 'contains' as const, value: 'review' };
    localStorage.setItem(savedListViewsStorageKey(defaultScope), JSON.stringify({
      version: 1,
      views: [{
        id: 'review-queue',
        name: '审核队列',
        state: {
          search: 'pending',
          filters: [savedFilter],
          sorters: [{ field: 'email', order: 'desc' }],
          pagination: { current: 3, pageSize: 20 },
          columnVisibility: { id: false },
          columnOrder: ['email', 'id'],
        },
      }],
    }));
    localStorage.setItem(activeSavedListViewStorageKey(defaultScope), 'review-queue');
    const onNavigate = vi.fn();
    const view = render(AutoTableInteractionsHarness, { onNavigate });

    expect((await view.findByPlaceholderText('搜索...') as HTMLInputElement).value).toBe('pending');
    expect(await view.findByText('Email: review')).toBeTruthy();
    expect(view.queryByRole('columnheader', { name: /^ID/ })).toBeNull();
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({
      to: '/',
      query: {
        page: '3',
        pageSize: '20',
        sort: 'email',
        order: 'desc',
        q: 'pending',
        filters: JSON.stringify([savedFilter]),
      },
      type: 'replace',
    }));
  });

  it('lets explicit URL state override the previously active saved view', async () => {
    localStorage.setItem(savedListViewsStorageKey(defaultScope), JSON.stringify({
      version: 1,
      views: [{
        id: 'saved',
        name: 'Saved',
        state: {
          search: 'saved-search',
          filters: [],
          sorters: [],
          pagination: { current: 2, pageSize: 20 },
          columnVisibility: { id: false },
          columnOrder: ['email', 'id'],
        },
      }],
    }));
    localStorage.setItem(activeSavedListViewStorageKey(defaultScope), 'saved');
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      initialParams: { q: 'deep-link' },
    });

    expect((await view.findByPlaceholderText('搜索...') as HTMLInputElement).value).toBe('deep-link');
    expect(await view.findByRole('columnheader', { name: /^ID/ })).toBeTruthy();
    await fireEvent.click(view.getByRole('button', { name: '视图' }));
    expect((await view.findByLabelText('当前未保存视图') as HTMLSelectElement).value).toBe('');
  });

  it('keeps the in-memory saved view usable when local persistence fails', async () => {
    const view = render(AutoTableInteractionsHarness, { onNavigate: vi.fn() });
    await fireEvent.click(await view.findByRole('button', { name: '视图' }));
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'QuotaExceededError');
    });
    await fireEvent.input(await view.findByLabelText('视图名称'), { target: { value: 'Offline view' } });
    await fireEvent.click(view.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(view.getByRole('option', { name: 'Offline view' })).toBeTruthy());
    expect(localStorage.getItem(savedListViewsStorageKey(defaultScope))).toBeNull();
    expect(write).toHaveBeenCalledWith(savedListViewsStorageKey(defaultScope), expect.any(String));
    await fireEvent.click(view.getByRole('button', { name: '删除 Offline view' }));
    expect(view.queryByRole('option', { name: 'Offline view' })).toBeNull();
  });

  it('applies and deletes a saved view from the view picker', async () => {
    const savedFilter = { field: 'email', operator: 'contains' as const, value: 'admin' };
    localStorage.setItem(savedListViewsStorageKey(defaultScope), JSON.stringify({
      version: 1,
      views: [{
        id: 'admins',
        name: '管理员',
        state: {
          search: 'admin',
          filters: [savedFilter],
          sorters: [{ field: 'email', order: 'asc' }],
          pagination: { current: 1, pageSize: 20 },
          columnVisibility: { id: false },
          columnOrder: ['email', 'id'],
        },
      }],
    }));
    const onNavigate = vi.fn();
    const view = render(AutoTableInteractionsHarness, { onNavigate });

    await fireEvent.click(await view.findByRole('button', { name: '视图' }));
    await fireEvent.change(await view.findByLabelText('当前未保存视图'), { target: { value: 'admins' } });

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({
      to: '/',
      query: {
        pageSize: '20',
        sort: 'email',
        order: 'asc',
        q: 'admin',
        filters: JSON.stringify([savedFilter]),
      },
      type: 'replace',
    }));
    expect(await view.findByText('Email: admin')).toBeTruthy();
    expect(view.queryByRole('columnheader', { name: /^ID/ })).toBeNull();

    await fireEvent.click(view.getByRole('button', { name: '删除 管理员' }));
    expect(JSON.parse(localStorage.getItem(savedListViewsStorageKey(defaultScope)) ?? '{}').views).toEqual([]);
    expect(localStorage.getItem(activeSavedListViewStorageKey(defaultScope))).toBeNull();
  });

  it('migrates legacy list preferences only for the default provider without a tenant', async () => {
    localStorage.setItem(legacyColumnOrderStorageKey('users'), JSON.stringify(['email', 'id']));
    localStorage.setItem(legacyActiveSavedListViewStorageKey('users'), 'legacy');
    const viewState = {
      search: 'legacy',
      filters: [],
      sorters: [],
      pagination: { current: 1, pageSize: 10 },
      columnVisibility: {},
      columnOrder: [],
    };
    localStorage.setItem(legacySavedListViewsStorageKey('users'), JSON.stringify({
      version: 1,
      views: [{ id: 'legacy', name: 'Legacy', state: viewState }],
    }));

    render(AutoTableInteractionsHarness, { onNavigate: vi.fn() });

    await waitFor(() => expect(localStorage.getItem(columnOrderStorageKey(defaultScope))).toBe(JSON.stringify(['email', 'id'])));
    expect(localStorage.getItem(legacyColumnOrderStorageKey('users'))).toBeNull();
    expect(localStorage.getItem(activeSavedListViewStorageKey(defaultScope))).toBe('legacy');
    expect(localStorage.getItem(legacyActiveSavedListViewStorageKey('users'))).toBeNull();
    expect(localStorage.getItem(savedListViewsStorageKey(defaultScope))).toBeTruthy();
    expect(localStorage.getItem(legacySavedListViewsStorageKey('users'))).toBeNull();
  });

  it('isolates saved views by provider and tenant scope', async () => {
    const analyticsScope = { resourceName: 'users', providerName: 'analytics', tenantIdentity: 'acme' } as const;
    localStorage.setItem(savedListViewsStorageKey(analyticsScope), JSON.stringify({
      version: 1,
      views: [{ id: 'analytics', name: 'Analytics', state: {
        search: 'analytics',
        filters: [],
        sorters: [],
        pagination: { current: 1, pageSize: 10 },
        columnVisibility: {},
        columnOrder: ['id', 'email'],
      } }],
    }));
    localStorage.setItem(activeSavedListViewStorageKey(analyticsScope), 'analytics');

    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      providerName: 'analytics',
      tenantIdentity: 'acme',
    });

    expect((await view.findByPlaceholderText('搜索...') as HTMLInputElement).value).toBe('analytics');
    expect(localStorage.getItem(savedListViewsStorageKey(defaultScope))).toBeNull();
    expect(savedListViewsStorageKey({ ...analyticsScope, tenantIdentity: 'other' })).not.toBe(savedListViewsStorageKey(analyticsScope));
    expect(savedListViewsStorageKey({ ...analyticsScope, tenantIdentity: 1 })).not.toBe(savedListViewsStorageKey({ ...analyticsScope, tenantIdentity: '1' }));
  });

  it('reloads saved views and column preferences when provider and tenant change without remounting', async () => {
    const analyticsScope = { resourceName: 'users', providerName: 'analytics', tenantIdentity: 'acme' } as const;
    const reportingScope = { resourceName: 'users', providerName: 'reporting', tenantIdentity: 'omega' } as const;
    const savedView = (id: string, name: string, search: string, columnVisibility: Record<string, boolean>) => ({
      version: 1,
      views: [{ id, name, state: {
        search,
        filters: [],
        sorters: [],
        pagination: { current: 1, pageSize: 10 },
        columnVisibility,
        columnOrder: search === 'analytics' ? ['email', 'id'] : ['id', 'email'],
      } }],
    });
    localStorage.setItem(savedListViewsStorageKey(analyticsScope), JSON.stringify(
      savedView('analytics-view', 'Analytics', 'analytics', { id: false }),
    ));
    localStorage.setItem(activeSavedListViewStorageKey(analyticsScope), 'analytics-view');
    localStorage.setItem(columnVisibilityStorageKey(analyticsScope), JSON.stringify({ id: false }));
    localStorage.setItem(columnOrderStorageKey(analyticsScope), JSON.stringify(['email', 'id']));
    localStorage.setItem(savedListViewsStorageKey(reportingScope), JSON.stringify(
      savedView('reporting-view', 'Reporting', 'reporting', { email: false }),
    ));
    localStorage.setItem(activeSavedListViewStorageKey(reportingScope), 'reporting-view');
    localStorage.setItem(columnVisibilityStorageKey(reportingScope), JSON.stringify({ email: false }));
    localStorage.setItem(columnOrderStorageKey(reportingScope), JSON.stringify(['id', 'email']));

    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      providerName: 'analytics',
      tenantIdentity: 'acme',
    });

    expect((await view.findByPlaceholderText('搜索...') as HTMLInputElement).value).toBe('analytics');
    expect(view.queryByRole('columnheader', { name: /^ID/ })).toBeNull();

    await view.rerender({
      onNavigate: vi.fn(),
      providerName: 'reporting',
      tenantIdentity: 'omega',
    });

    await waitFor(() => expect((view.getByPlaceholderText('搜索...') as HTMLInputElement).value).toBe('reporting'));
    expect(view.getByRole('columnheader', { name: /^ID/ })).toBeTruthy();
    expect(view.queryByRole('columnheader', { name: 'Email' })).toBeNull();
    expect(localStorage.getItem(columnVisibilityStorageKey(analyticsScope))).toBe(JSON.stringify({ id: false }));
    expect(localStorage.getItem(columnVisibilityStorageKey(reportingScope))).toBe(JSON.stringify({ email: false }));
    expect(localStorage.getItem(columnOrderStorageKey(reportingScope))).toBe(JSON.stringify(['id', 'email']));
  });

  it('clears the previous scope query state when the next scope has no active saved view', async () => {
    const analyticsScope = { resourceName: 'users', providerName: 'analytics', tenantIdentity: 'acme' } as const;
    localStorage.setItem(savedListViewsStorageKey(analyticsScope), JSON.stringify({
      version: 1,
      views: [{ id: 'analytics-view', name: 'Analytics', state: {
        search: 'analytics',
        filters: [{ field: 'email', operator: 'contains', value: 'acme' }],
        sorters: [{ field: 'email', order: 'desc' }],
        pagination: { current: 3, pageSize: 20 },
        columnVisibility: { id: false },
        columnOrder: ['email', 'id'],
      } }],
    }));
    localStorage.setItem(activeSavedListViewStorageKey(analyticsScope), 'analytics-view');

    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      providerName: 'analytics',
      tenantIdentity: 'acme',
    });

    expect((await view.findByPlaceholderText('搜索...') as HTMLInputElement).value).toBe('analytics');
    expect(await view.findByText('Email: acme')).toBeTruthy();

    await view.rerender({
      onNavigate: vi.fn(),
      providerName: 'reporting',
      tenantIdentity: 'omega',
    });

    await waitFor(() => expect((view.getByPlaceholderText('搜索...') as HTMLInputElement).value).toBe(''));
    expect(view.queryByText('Email: acme')).toBeNull();
    expect(view.getByRole('columnheader', { name: /^ID/ })).toBeTruthy();
    expect(view.getByRole('columnheader', { name: /^Email/ })).toBeTruthy();
    expect(view.getByRole('button', { name: /^Email.*⇅$/ })).toBeTruthy();
    expect(localStorage.getItem(savedListViewsStorageKey(analyticsScope))).toContain('analytics');
  });

  it('renders expanded-row content after toggling the localized action', async () => {
    const view = render(AutoTableInteractionsHarness, { onNavigate: vi.fn() });

    const expandButton = await view.findByRole('button', { name: '展开' });
    await fireEvent.click(expandButton);
    expect(await view.findByRole('button', { name: '收起' })).toBeTruthy();
    expect(await view.findByText('已展开：user@example.com')).toBeTruthy();

    await fireEvent.click(await view.findByRole('button', { name: '收起' }));
    await waitFor(() => {
      expect(view.queryByText('已展开：user@example.com')).toBeNull();
    });
  });

  it('supports controlled expanded rows and reports changes', async () => {
    const onExpandedRowsChange = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      expandedRowKeys: ['user-1'],
      onExpandedRowsChange,
    });

    expect(await view.findByText('已展开：user@example.com')).toBeTruthy();
    await fireEvent.click(await view.findByRole('button', { name: '收起' }));
    expect(onExpandedRowsChange).toHaveBeenCalledWith([]);
    // 受控模式不自行改变展开状态，等待宿主回传新的 keys。
    expect(view.getByText('已展开：user@example.com')).toBeTruthy();

    await view.rerender({ onNavigate: vi.fn(), expandedRowKeys: [], onExpandedRowsChange });
    await waitFor(() => {
      expect(view.queryByText('已展开：user@example.com')).toBeNull();
    });
  });

  it('does not expose detail navigation for a resource that disables show actions', async () => {
    const onNavigate = vi.fn();
    const view = render(AutoTableInteractionsHarness, { onNavigate, canShow: false });

    const [email] = await view.findAllByText('user@example.com');
    if (!email) throw new Error('Expected the desktop row email cell');
    await fireEvent.contextMenu(email);

    expect(await view.findByText('复制 ID')).not.toBeNull();
    await waitFor(() => {
      expect(view.queryByText('详情')).toBeNull();
      expect(view.queryByRole('button', { name: '详情' })).toBeNull();
    });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('fails closed when access control rejects the show action', async () => {
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canShow: true,
      showAllowed: false,
    });

    const [email] = await view.findAllByText('user@example.com');
    if (!email) throw new Error('Expected the desktop row email cell');
    await fireEvent.contextMenu(email);

    expect(await view.findByText('复制 ID')).not.toBeNull();
    expect(view.queryByText('详情')).toBeNull();
    expect(view.queryByRole('button', { name: '详情' })).toBeNull();
  });

  it('opens record details in a drawer before navigating to the full detail page', async () => {
    const onNavigate = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate,
      canShow: true,
      showAllowed: true,
    });

    const detailButtons = await view.findAllByRole('button', { name: '详情' });
    await fireEvent.click(requireValue(detailButtons[0]));

    const dialog = await view.findByRole('dialog', { name: 'Users 详情' });
    expect(within(dialog).getByText('user@example.com')).toBeTruthy();
    expect(onNavigate).toHaveBeenCalledWith({
      to: '/',
      query: { detail: '~svadmin-id:["string","user-1"]' },
      type: 'push',
    });

    await fireEvent.click(within(dialog).getByRole('button', { name: '完整详情' }));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({
      to: '/users/show/user-1',
      type: 'push',
    }));
  });

  it('preserves validated list state when opening full details', async () => {
    const onNavigate = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate,
      canShow: true,
      showAllowed: true,
      initialParams: {
        q: 'user',
        page: '2',
        pageSize: '20',
        sort: 'email',
        order: 'desc',
        filters: JSON.stringify([{ field: 'email', operator: 'contains', value: 'user' }]),
        detail: 'ignored',
        tenantId: 'must-not-leak',
      },
    });

    const detailButtons = await view.findAllByRole('button', { name: '详情' });
    await fireEvent.click(requireValue(detailButtons[0]));
    const dialog = await view.findByRole('dialog', { name: 'Users 详情' });
    await fireEvent.click(within(dialog).getByRole('button', { name: '完整详情' }));

    await waitFor(() => {
      const navigation = onNavigate.mock.calls.at(-1)?.[0];
      expect(navigation).toEqual({
        to: `/users/show/user-1?page=2&pageSize=20&sort=email&order=desc&q=user&filters=${encodeURIComponent(JSON.stringify([{ field: 'email', operator: 'contains', value: 'user' }]))}`,
        type: 'push',
      });
      expect(navigation.to).not.toContain('detail');
      expect(navigation.to).not.toContain('tenantId');
    });
  });

  it('preserves only validated list state when creating from the table toolbar', async () => {
    const onNavigate = vi.fn();
    const filters = JSON.stringify([{ field: 'email', operator: 'contains', value: 'user' }]);
    const view = render(AutoTableInteractionsHarness, {
      onNavigate,
      canCreate: true,
      initialParams: {
        q: 'user',
        page: '2',
        pageSize: '20',
        sort: 'email',
        order: 'desc',
        filters,
        records: '1',
        detail: 'ignored',
        tenantId: 'must-not-leak',
        token: 'must-not-leak',
      },
    });

    await fireEvent.click(await view.findByRole('button', { name: '新建' }));

    await waitFor(() => {
      const navigation = onNavigate.mock.calls.at(-1)?.[0];
      expect(navigation).toEqual({
        to: `/users/create?page=2&pageSize=20&sort=email&order=desc&q=user&filters=${encodeURIComponent(filters)}&records=1`,
        type: 'push',
      });
      expect(navigation.to).not.toContain('detail');
      expect(navigation.to).not.toContain('tenantId');
      expect(navigation.to).not.toContain('token');
    });
  });

  it('uses the same safe list query for empty-state create and every built-in edit entry', async () => {
    const initialParams = {
      q: 'user',
      records: '1',
      token: 'must-not-leak',
    };
    const createNavigate = vi.fn();
    const emptyView = render(AutoTableInteractionsHarness, {
      onNavigate: createNavigate,
      canCreate: true,
      emptyData: true,
      initialParams,
    });

    const emptyCreateButtons = await emptyView.findAllByRole('button', { name: '新建' });
    const targetCreateButton = emptyCreateButtons.at(-1);
    if (!targetCreateButton) throw new Error('Expected create button');
    await fireEvent.click(targetCreateButton);
    expect(createNavigate).toHaveBeenLastCalledWith({
      to: '/users/create?q=user&records=1',
      type: 'push',
    });
    emptyView.unmount();

    const editNavigate = vi.fn();
    const editView = render(AutoTableInteractionsHarness, {
      onNavigate: editNavigate,
      canEdit: true,
      editAllowed: true,
      initialParams,
    });
    const editButtons = await editView.findAllByRole('button', { name: '编辑' });
    expect(editButtons.length).toBeGreaterThan(0);
    await fireEvent.click(requireValue(editButtons[0]));
    expect(editNavigate).toHaveBeenLastCalledWith({
      to: '/users/edit/user-1?q=user&records=1',
      type: 'push',
    });
    editView.unmount();

  });

  it('closes a detail opened from the list through router history', async () => {
    const onNavigate = vi.fn();
    const onBack = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate,
      onBack,
      canShow: true,
      showAllowed: true,
    });

    const detailButtons = await view.findAllByRole('button', { name: '详情' });
    await fireEvent.click(requireValue(detailButtons[0]));
    const dialog = await view.findByRole('dialog', { name: 'Users 详情' });

    await fireEvent.click(within(dialog).getByRole('button', { name: '关闭' }));

    await waitFor(() => expect(view.queryByRole('dialog', { name: 'Users 详情' })).toBeNull());
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith({
      to: '/',
      query: { detail: '~svadmin-id:["string","user-1"]' },
      type: 'push',
    });
  });

  it('restores a detail drawer from the URL and closes it without losing list state', async () => {
    const onNavigate = vi.fn();
    const initialParams = {
      detail: 'user-1',
      q: 'user',
      records: '1',
    };
    const view = render(AutoTableInteractionsHarness, {
      onNavigate,
      initialParams,
      canShow: true,
      showAllowed: true,
    });

    const dialog = await view.findByRole('dialog', { name: 'Users 详情' });
    expect(await within(dialog).findByText('user@example.com')).toBeTruthy();
    expect(onNavigate).not.toHaveBeenCalled();

    await fireEvent.click(within(dialog).getByRole('button', { name: '关闭' }));

    await waitFor(() => expect(view.queryByRole('dialog', { name: 'Users 详情' })).toBeNull());
    expect(onNavigate).toHaveBeenCalledWith({
      to: '/',
      query: { q: 'user', records: '1' },
      type: 'replace',
    });
  });

  it('applies record-level permissions to row actions, context menus, and inline editing', async () => {
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canShow: true,
      canEdit: true,
      canDelete: true,
      showAllowed: true,
      editAllowed: true,
      deleteAllowed: true,
      recordPermissions: {
        'user-1': { show: false, edit: false, delete: false },
      },
    });

    const [email] = await view.findAllByText('user@example.com');
    if (!email) throw new Error('Expected the desktop row email cell');
    expect(view.queryByRole('button', { name: '详情' })).toBeNull();
    expect(view.queryByRole('button', { name: '编辑' })).toBeNull();
    expect(view.queryByRole('button', { name: '删除' })).toBeNull();
    expect(email.closest('button')).toBeNull();

    await fireEvent.contextMenu(email);
    expect(view.queryByText('详情')).toBeNull();
    expect(view.queryByText('编辑')).toBeNull();
    expect(view.queryByText('删除')).toBeNull();
  });

  it('hides unauthorized drawer actions while retaining allowed full detail access', async () => {
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canShow: true,
      canEdit: true,
      showAllowed: true,
      editAllowed: true,
      recordPermissions: {
        'user-1': { show: true, edit: false },
      },
    });

    const detailButtons = await view.findAllByRole('button', { name: '详情' });
    await fireEvent.click(requireValue(detailButtons[0]));
    const dialog = await view.findByRole('dialog', { name: 'Users 详情' });
    expect(within(dialog).getByRole('button', { name: '完整详情' })).toBeTruthy();
    expect(within(dialog).queryByRole('button', { name: '编辑' })).toBeNull();
  });

  it('allows a record-scoped show grant even when the resource-level check is denied', async () => {
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canShow: true,
      showAllowed: false,
      recordPermissions: { 'user-1': { show: true } },
    });

    const detailButtons = await view.findAllByRole('button', { name: '详情' });
    expect(detailButtons.length).toBeGreaterThan(0);
    await fireEvent.click(requireValue(detailButtons[0]));
    expect(await view.findByRole('dialog', { name: 'Users 详情' })).toBeTruthy();
  });

  it('does not fetch a denied standalone detail record', async () => {
    const onGetOne = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canShow: true,
      showAllowed: false,
      standaloneDetailId: 'user-1',
      onGetOne,
    });

    expect(await view.findByText('无权查看此记录')).toBeTruthy();
    expect(onGetOne).not.toHaveBeenCalled();
  });

  it('does not fetch a standalone detail record disabled by resource configuration', async () => {
    const onGetOne = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canShow: false,
      standaloneDetailId: 'user-1',
      onGetOne,
    });

    expect(await view.findByText('无权查看此记录')).toBeTruthy();
    expect(onGetOne).not.toHaveBeenCalled();
  });

  it('shows an explicit denied state for a resource-level detail deep link', async () => {
    const onGetOne = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      initialParams: { detail: 'user-1' },
      canShow: false,
      onGetOne,
    });

    expect(await view.findByText('无权查看此记录')).toBeTruthy();
    expect(onGetOne).not.toHaveBeenCalled();
  });

  it('shows a stable batch toolbar, clears selection, and reports successful deletion', async () => {
    let finishDelete: (() => void) | undefined;
    const deletePromise = new Promise<void>((resolve) => { finishDelete = resolve; });
    const onDeleteMany = vi.fn(() => deletePromise);
    const onNotify = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canDelete: true,
      deleteAllowed: true,
      batchDeleteAllowed: true,
      selectable: true,
      onDeleteMany,
      onNotify,
      customBatchAction: true,
    });

    const rowCheckboxes = await view.findAllByRole('checkbox', { name: '选择记录 user-1' });
    await fireEvent.click(requireValue(rowCheckboxes[0]));
    expect(await view.findByText('已选择 1 条记录')).toBeTruthy();
    const toolbar = view.getByRole('region', { name: '已选择 1 条记录' });
    const status = requireValue(view.container.querySelector('[data-svadmin-batch-toolbar] [role="status"]'));
    expect(status.textContent).toBe('');

    await fireEvent.click(view.getByRole('button', { name: '批量删除 (1)' }));
    const confirm = await view.findByRole('alertdialog');
    await fireEvent.click(within(confirm).getByRole('button', { name: '删除' }));

    await waitFor(() => expect(status.textContent).toBe('处理中...'));
    expect(toolbar.getAttribute('aria-busy')).toBe('true');
    expect(within(toolbar).getByText('处理中...')).toBeTruthy();
    expect(status.closest('[aria-busy="true"]')).toBeNull();
    expect(toolbar.querySelector('.svadmin-batch-action-bar__actions')?.hasAttribute('inert')).toBe(true);
    expect(view.getByRole('button', { name: '清除选择' }).hasAttribute('disabled')).toBe(true);
    finishDelete?.();

    await waitFor(() => expect(view.queryByText('已选择 1 条记录')).toBeNull());
    expect(onDeleteMany).toHaveBeenCalledWith(['user-1']);
    expect(onNotify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      message: '成功删除 1 条记录',
    }));
    expect(onNotify).toHaveBeenCalledTimes(1);
  });

  it.each(['tenant', 'provider'] as const)('keeps a new confirmation intact after a previous-%s deletion fails late', async change => {
    let rejectDelete!: (error: Error) => void;
    const pending = new Promise<void>((_resolve, reject) => { rejectDelete = reject; });
    const onDeleteMany = vi.fn(() => pending);
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(), canDelete: true, deleteAllowed: true, batchDeleteAllowed: true,
      selectable: true, onDeleteMany,
    });
    await fireEvent.click(requireValue((await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))[0]));
    await fireEvent.click(view.getByRole('button', { name: '批量删除 (1)' }));
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));
    await waitFor(() => expect(onDeleteMany).toHaveBeenCalledOnce());

    await view.rerender(change === 'tenant' ? { tenantIdentity: 'new-tenant' } : { providerName: 'reporting' });
    await waitFor(() => expect(view.queryByText('已选择 1 条记录')).toBeNull());
    await fireEvent.click(requireValue((await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))[0]));
    await fireEvent.click(await view.findByRole('button', { name: '批量删除 (1)' }));
    const currentDialog = await view.findByRole('alertdialog');
    rejectDelete(new Error('previous scope failed'));
    await waitFor(() => expect(view.container.querySelector('[data-svadmin-batch-toolbar] [role="status"]')?.textContent ?? '').toBe(''));
    expect(view.getByRole('alertdialog')).toBe(currentDialog);
    expect(view.getByText('已选择 1 条记录')).toBeTruthy();
    expect(onDeleteMany).toHaveBeenCalledOnce();
  });

  it('preserves numeric primary keys across batch actions, permissions, and the data provider', async () => {
    const onDeleteMany = vi.fn(async () => {});
    const onCan = vi.fn();
    const onCustomBatchAction = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canDelete: true,
      deleteAllowed: true,
      batchDeleteAllowed: true,
      selectable: true,
      numericIds: true,
      customBatchAction: true,
      onDeleteMany,
      onCan,
      onCustomBatchAction,
    });

    await fireEvent.click(requireValue((await view.findAllByRole('checkbox', { name: '选择记录 1' }))[0]));
    await fireEvent.click(view.getByRole('button', { name: '自定义批量 (1)' }));
    expect(onCustomBatchAction).toHaveBeenCalledWith([1]);

    const batchPermission = onCan.mock.calls
      .map(([params]) => params as { action: string; params?: { ids?: unknown[] } })
      .find((params) => params.action === 'delete' && Array.isArray(params.params?.ids));
    expect(batchPermission?.params?.ids).toEqual([1]);

    await fireEvent.click(view.getByRole('button', { name: '批量删除 (1)' }));
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));
    await waitFor(() => expect(onDeleteMany).toHaveBeenCalledWith([1]));
  });

  it('keeps all selected records after a failed batch delete and reports one accurate error', async () => {
    const onDeleteMany = vi.fn(async () => { throw new Error('delete failed'); });
    const onNotify = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canDelete: true,
      deleteAllowed: true,
      batchDeleteAllowed: true,
      selectable: true,
      includeSecondRecord: true,
      onDeleteMany,
      onNotify,
    });

    const first = (await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))[0];
    const second = (await view.findAllByRole('checkbox', { name: '选择记录 user-2' }))[0];
    await fireEvent.click(requireValue(first));
    await fireEvent.click(requireValue(second));
    expect(await view.findByText('已选择 2 条记录')).toBeTruthy();

    await fireEvent.click(view.getByRole('button', { name: '批量删除 (2)' }));
    const confirm = await view.findByRole('alertdialog');
    await fireEvent.click(within(confirm).getByRole('button', { name: '删除' }));

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      message: '批量删除失败，未删除 2 条记录',
    })));
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(view.getByText('已选择 2 条记录')).toBeTruthy();
    const toolbar = view.getByRole('region', { name: '已选择 2 条记录' });
    expect(toolbar.hasAttribute('aria-busy')).toBe(false);
    expect(toolbar.querySelector('.svadmin-batch-action-bar__actions')?.hasAttribute('inert')).toBe(false);
    expect(view.getByRole('button', { name: '清除选择' }).hasAttribute('disabled')).toBe(false);
  });

  it('keeps only failed records selected when the delete-one fallback partially succeeds', async () => {
    const onDeleteOne = vi.fn(async (id: string | number) => {
      if (id === 'user-2') throw new Error('second delete failed');
    });
    const onNotify = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canDelete: true,
      deleteAllowed: true,
      batchDeleteAllowed: true,
      selectable: true,
      includeSecondRecord: true,
      disableDeleteMany: true,
      onDeleteOne,
      onNotify,
    });

    await fireEvent.click(requireValue((await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))[0]));
    await fireEvent.click(requireValue((await view.findAllByRole('checkbox', { name: '选择记录 user-2' }))[0]));
    await fireEvent.click(view.getByRole('button', { name: '批量删除 (2)' }));
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      message: '批量删除部分失败：1/2 条未成功',
    })));
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(onDeleteOne).toHaveBeenCalledTimes(2);
    expect(view.queryAllByText('user@example.com')).toHaveLength(0);
    expect((await view.findAllByText('second@example.com')).length).toBeGreaterThan(0);
    expect(view.getByText('已选择 1 条记录')).toBeTruthy();
    expect(view.getByRole('button', { name: '批量删除 (1)' })).toBeTruthy();
  });

  it('preserves numeric IDs when a delete-one fallback partially succeeds', async () => {
    const onDeleteOne = vi.fn(async (id: string | number) => {
      if (id === 2) throw new Error('second delete failed');
    });
    const onNotify = vi.fn();
    const onCustomBatchAction = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canDelete: true,
      deleteAllowed: true,
      batchDeleteAllowed: true,
      selectable: true,
      customBatchAction: true,
      numericIds: true,
      includeSecondRecord: true,
      disableDeleteMany: true,
      onDeleteOne,
      onNotify,
      onCustomBatchAction,
    });

    await fireEvent.click(requireValue((await view.findAllByRole('checkbox', { name: '选择记录 1' }))[0]));
    await fireEvent.click(requireValue((await view.findAllByRole('checkbox', { name: '选择记录 2' }))[0]));
    await fireEvent.click(view.getByRole('button', { name: '批量删除 (2)' }));
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      message: '批量删除部分失败：1/2 条未成功',
    })));
    expect(onDeleteOne.mock.calls.map(([id]) => id)).toEqual([1, 2]);
    expect(onDeleteOne.mock.calls.every(([id]) => typeof id === 'number')).toBe(true);
    expect(view.queryAllByText('user@example.com')).toHaveLength(0);
    expect((await view.findAllByText('second@example.com')).length).toBeGreaterThan(0);
    expect(view.getByText('已选择 1 条记录')).toBeTruthy();

    await fireEvent.click(view.getByRole('button', { name: '自定义批量 (1)' }));
    expect(onCustomBatchAction).toHaveBeenCalledWith([2]);
  });

  it('retries only the failed ids after a partially successful delete-one fallback', async () => {
    let failedOnce = false;
    const onDeleteOne = vi.fn(async (id: string | number) => {
      if (id === 'user-2' && !failedOnce) {
        failedOnce = true;
        throw new Error('second delete failed');
      }
    });
    const onNotify = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canDelete: true,
      deleteAllowed: true,
      batchDeleteAllowed: true,
      selectable: true,
      includeSecondRecord: true,
      disableDeleteMany: true,
      onDeleteOne,
      onNotify,
    });

    await fireEvent.click(requireValue((await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))[0]));
    await fireEvent.click(requireValue((await view.findAllByRole('checkbox', { name: '选择记录 user-2' }))[0]));
    await fireEvent.click(view.getByRole('button', { name: '批量删除 (2)' }));
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      message: '批量删除部分失败：1/2 条未成功',
    })));
    expect(onDeleteOne.mock.calls.map(([id]) => id)).toEqual(['user-1', 'user-2']);
    expect(view.getByText('已选择 1 条记录')).toBeTruthy();

    await fireEvent.click(view.getByRole('button', { name: '批量删除 (1)' }));
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));

    await waitFor(() => expect(view.queryAllByText('second@example.com')).toHaveLength(0));
    expect(onDeleteOne.mock.calls.map(([id]) => id)).toEqual(['user-1', 'user-2', 'user-2']);
    expect(onDeleteOne.mock.calls.filter(([id]) => id === 'user-1')).toHaveLength(1);
    await waitFor(() => expect(onNotify).toHaveBeenCalledTimes(2));
    expect(view.queryByText(/已选择/)).toBeNull();
    expect(view.queryByRole('button', { name: /批量删除/ })).toBeNull();
  });

  it('does not append a second batch delete request while deletion is pending', async () => {
    let finishDelete!: () => void;
    const pending = new Promise<void>((resolve) => { finishDelete = resolve; });
    const onDeleteMany = vi.fn(() => pending);
    const onNotify = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canDelete: true,
      deleteAllowed: true,
      batchDeleteAllowed: true,
      selectable: true,
      onDeleteMany,
      onNotify,
    });

    await fireEvent.click(requireValue((await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))[0]));
    await fireEvent.click(view.getByRole('button', { name: '批量删除 (1)' }));
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));
    const pendingToolbar = view.getByRole('region', { name: '已选择 1 条记录' });
    await waitFor(() => expect(pendingToolbar.getAttribute('aria-busy')).toBe('true'));
    expect(onDeleteMany).toHaveBeenCalledOnce();

    await fireEvent.click(view.getByRole('button', { name: '批量删除 (1)' }));
    await fireEvent.click(view.getByRole('button', { name: '清除选择' }));
    expect(onDeleteMany).toHaveBeenCalledOnce();
    expect(view.queryByRole('alertdialog')).toBeNull();
    expect(view.getByText('已选择 1 条记录')).toBeTruthy();

    finishDelete();
    await waitFor(() => expect(view.queryByText('已选择 1 条记录')).toBeNull());
    expect(onDeleteMany).toHaveBeenCalledOnce();
    expect(onDeleteMany).toHaveBeenCalledWith(['user-1']);
    expect(onNotify).toHaveBeenCalledOnce();
  });

  it('uses checked deletion even when global undoable mode is configured', async () => {
    setAdminOptions({ mutationMode: 'undoable', undoableTimeout: 60_000 });
    const onDeleteMany = vi.fn(async () => {});
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canDelete: true,
      deleteAllowed: true,
      batchDeleteAllowed: true,
      selectable: true,
      onDeleteMany,
    });

    const rowCheckbox = (await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))[0];
    await fireEvent.click(requireValue(rowCheckbox));
    expect((await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))
      .every((checkbox) => checkbox.getAttribute('aria-checked') === 'true')).toBe(true);
    await fireEvent.click(view.getByRole('button', { name: '批量删除 (1)' }));
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));

    await waitFor(() => expect(view.queryAllByText('user@example.com')).toHaveLength(0));
    expect(onDeleteMany).toHaveBeenCalledWith(['user-1']);
    expect(view.queryByRole('button', { name: '撤销' })).toBeNull();
    expect(view.queryByRole('alertdialog')).toBeNull();
    expect(view.queryByText('已选择 1 条记录')).toBeNull();
  });

  it('uses the checked batch boundary for a single confirmed record', async () => {
    setAdminOptions({ mutationMode: 'undoable', undoableTimeout: 60_000 });
    let finishDelete!: () => void;
    const pending = new Promise<void>(resolve => { finishDelete = resolve; });
    const onDeleteMany = vi.fn(() => pending);
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canDelete: true,
      deleteAllowed: true,
      onDeleteMany,
    });

    const row = within(await view.findByRole('row', { name: /user@example\.com/ }));
    await fireEvent.click(await row.findByRole('button', { name: '更多操作' }));
    await fireEvent.click(await view.findByRole('menuitem', { name: '删除' }));
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));

    await waitFor(() => expect(onDeleteMany).toHaveBeenCalledWith(['user-1']));
    expect(view.container.querySelector('[data-svadmin-batch-toolbar]')).toBeNull();
    finishDelete();
    await waitFor(() => expect(view.queryByRole('alertdialog')).toBeNull());
    await waitFor(() => expect(view.queryAllByText('user@example.com')).toHaveLength(0));
    expect(onDeleteMany).toHaveBeenCalledWith(['user-1']);
    expect(view.queryByRole('button', { name: '撤销' })).toBeNull();
  });

  it('keeps checked rows visible while deletion is pending even in global optimistic mode', async () => {
    setAdminOptions({ mutationMode: 'optimistic' });
    let rejectDelete: ((reason?: unknown) => void) | undefined;
    const deletePromise = new Promise<void>((_resolve, reject) => { rejectDelete = reject; });
    const onDeleteMany = vi.fn(() => deletePromise);
    const onNotify = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canDelete: true,
      deleteAllowed: true,
      batchDeleteAllowed: true,
      selectable: true,
      includeSecondRecord: true,
      onDeleteMany,
      onNotify,
    });

    const first = (await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))[0];
    const second = (await view.findAllByRole('checkbox', { name: '选择记录 user-2' }))[0];
    await fireEvent.click(requireValue(first));
    await fireEvent.click(requireValue(second));
    await fireEvent.click(view.getByRole('button', { name: '批量删除 (2)' }));
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));

    await waitFor(() => {
      expect(onDeleteMany).toHaveBeenCalledTimes(1);
      expect(view.queryAllByText('user@example.com').length).toBeGreaterThan(0);
      expect(view.queryAllByText('second@example.com').length).toBeGreaterThan(0);
    });

    rejectDelete?.(new Error('delete failed'));

    expect((await view.findAllByText('user@example.com')).length).toBeGreaterThan(0);
    expect((await view.findAllByText('second@example.com')).length).toBeGreaterThan(0);
    expect(view.getByText('已选择 2 条记录')).toBeTruthy();
    await waitFor(() => expect(onNotify).toHaveBeenCalledTimes(1));
  });

  it('does not restore an old selection after search changes during batch deletion', async () => {
    setAdminOptions({ mutationMode: 'undoable', undoableTimeout: 60_000 });
    let rejectDelete!: (reason?: unknown) => void;
    const pending = new Promise<void>((_resolve, reject) => { rejectDelete = reject; });
    const onDeleteMany = vi.fn(() => pending);
    const onGetList = vi.fn();
    const onNotify = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      onGetList,
      canDelete: true,
      deleteAllowed: true,
      batchDeleteAllowed: true,
      selectable: true,
      onDeleteMany,
      onNotify,
    });

    await fireEvent.click(requireValue((await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))[0]));
    await fireEvent.click(view.getByRole('button', { name: '批量删除 (1)' }));
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));
    await waitFor(() => expect(onDeleteMany).toHaveBeenCalledOnce());

    const search = await view.findByPlaceholderText('搜索...');
    await fireEvent.input(search, { target: { value: 'second' } });
    await waitFor(() => expect(onGetList).toHaveBeenLastCalledWith(expect.objectContaining({
      filters: expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
    })));
    expect(view.queryByText('已选择 1 条记录')).toBeNull();

    rejectDelete(new Error('old selection failed'));
    await waitFor(() => expect(view.queryByText('处理中...')).toBeNull());
    expect(view.queryByText('已选择 1 条记录')).toBeNull();
    expect(view.queryByText('操作失败')).toBeNull();
    expect(onNotify).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      type: 'error',
      message: '批量删除失败，未删除 1 条记录',
    }));
  });

  it('keeps custom batch actions visible when batch delete permission is denied', async () => {
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canDelete: true,
      deleteAllowed: true,
      batchDeleteAllowed: false,
      selectable: true,
      customBatchAction: true,
    });

    const rowCheckboxes = await view.findAllByRole('checkbox', { name: '选择记录 user-1' });
    await fireEvent.click(requireValue(rowCheckboxes[0]));
    expect(await view.findByRole('button', { name: '自定义批量 (1)' })).toBeTruthy();
    expect(view.queryByRole('button', { name: '批量删除 (1)' })).toBeNull();

    await fireEvent.click(view.getByRole('button', { name: '清除选择' }));
    await waitFor(() => expect(view.queryByText('已选择 1 条记录')).toBeNull());
    expect(view.container.querySelector('[data-svadmin-batch-toolbar]')).toBeNull();
  });

  it('keeps the all-matching toolbar clearable after every matching record is excluded', async () => {
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      selectable: true,
      customBatchAction: true,
      includeSecondRecord: true,
      allowSelectAllMatching: true,
    });
    await fireEvent.click(requireValue((await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))[0]));
    await fireEvent.click(view.getByRole('button', { name: '选择全部匹配记录 (2)' }));
    expect(await view.findByRole('region', { name: '已选择全部匹配记录 (2)' })).toBeTruthy();
    for (const id of ['user-1', 'user-2']) {
      await fireEvent.click(requireValue(view.getAllByRole('checkbox', { name: `选择记录 ${id}` })[0]));
    }
    const toolbar = await view.findByRole('region', { name: '已选择全部匹配记录 (0)' });
    expect(within(toolbar).queryByRole('button', { name: /自定义批量/ })).toBeNull();
    await fireEvent.click(within(toolbar).getByRole('button', { name: '清除选择' }));
    expect(view.container.querySelector('[data-svadmin-batch-toolbar]')).toBeNull();
  });
});
