import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { resetToast, setAdminOptions } from '@svadmin/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AutoTableInteractionsHarness from '../../test/fixtures/AutoTableInteractionsHarness.svelte';
import {
  activeSavedListViewStorageKey,
  columnOrderStorageKey,
  columnVisibilityStorageKey,
  legacyActiveSavedListViewStorageKey,
  legacyColumnOrderStorageKey,
  legacySavedListViewsStorageKey,
  savedListViewsStorageKey,
} from './saved-list-views.js';

const defaultScope = { resourceName: 'users', providerName: 'default' } as const;

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
  it('uses the active locale for built-in table labels', async () => {
    const view = render(AutoTableInteractionsHarness, {
      locale: 'en',
      onNavigate: vi.fn(),
    });

    expect(await view.findByRole('button', { name: 'Columns' })).toBeTruthy();
    expect(await view.findByPlaceholderText('Search...')).toBeTruthy();
  });

  it('propagates compact density to the base table primitives', async () => {
    const view = render(AutoTableInteractionsHarness, {
      density: 'compact',
      onNavigate: vi.fn(),
    });

    await view.findAllByText('user@example.com');
    const tableContainer = [...view.container.querySelectorAll<HTMLElement>('[data-slot="table-container"]')]
      .find((candidate) => candidate.getAttribute('data-table-density') === 'compact');
    expect(tableContainer).toBeTruthy();
    const heading = tableContainer?.querySelector('[data-slot="table-head"]');
    const cell = tableContainer?.querySelector('[data-slot="table-cell"]');
    expect(heading?.className).toContain('h-8');
    expect(cell?.className).toContain('text-xs');
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
    await fireEvent.click(detailButtons[0]);

    const dialog = await view.findByRole('dialog', { name: 'Users 详情' });
    expect(within(dialog).getByText('user@example.com')).toBeTruthy();
    expect(onNavigate).toHaveBeenCalledWith({
      to: '/',
      query: { detail: 'user-1' },
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
    await fireEvent.click(detailButtons[0]);
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
    await fireEvent.click(emptyCreateButtons.at(-1)!);
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
    await fireEvent.click(editButtons[0]);
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
    await fireEvent.click(detailButtons[0]);
    const dialog = await view.findByRole('dialog', { name: 'Users 详情' });

    await fireEvent.click(within(dialog).getByRole('button', { name: '关闭' }));

    await waitFor(() => expect(view.queryByRole('dialog', { name: 'Users 详情' })).toBeNull());
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith({
      to: '/',
      query: { detail: 'user-1' },
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
    await fireEvent.click(detailButtons[0]);
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
    await fireEvent.click(detailButtons[0]);
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
    });

    const rowCheckboxes = await view.findAllByRole('checkbox', { name: '选择记录 user-1' });
    await fireEvent.click(rowCheckboxes[0]);
    expect(await view.findByText('已选择 1 条记录')).toBeTruthy();

    await fireEvent.click(view.getByRole('button', { name: '批量删除 (1)' }));
    const confirm = await view.findByRole('alertdialog');
    await fireEvent.click(within(confirm).getByRole('button', { name: '删除' }));

    expect((await view.findByRole('status')).textContent).toContain('处理中...');
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

    await fireEvent.click((await view.findAllByRole('checkbox', { name: '选择记录 1' }))[0]);
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
    await fireEvent.click(first);
    await fireEvent.click(second);
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

    await fireEvent.click((await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))[0]);
    await fireEvent.click((await view.findAllByRole('checkbox', { name: '选择记录 user-2' }))[0]);
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

    await fireEvent.click((await view.findAllByRole('checkbox', { name: '选择记录 1' }))[0]);
    await fireEvent.click((await view.findAllByRole('checkbox', { name: '选择记录 2' }))[0]);
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

  it('lets users undo a batch delete before the provider is called', async () => {
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
    await fireEvent.click(rowCheckbox);
    expect((await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))
      .every((checkbox) => checkbox.getAttribute('aria-checked') === 'true')).toBe(true);
    await fireEvent.click(view.getByRole('button', { name: '批量删除 (1)' }));
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));

    await waitFor(() => expect(view.queryAllByText('user@example.com')).toHaveLength(0));
    expect(onDeleteMany).not.toHaveBeenCalled();

    await fireEvent.click(await view.findByRole('button', { name: '撤销' }));

    expect((await view.findAllByText('user@example.com')).length).toBeGreaterThan(0);
    expect(view.queryByRole('alertdialog')).toBeNull();
    expect(view.getByText('已选择 1 条记录')).toBeTruthy();
    expect((await view.findAllByRole('checkbox', { name: '选择记录 user-1' }))
      .every((checkbox) => checkbox.getAttribute('aria-checked') === 'true')).toBe(true);
    expect(onDeleteMany).not.toHaveBeenCalled();
  });

  it('closes the confirmation immediately when a record delete is undoable', async () => {
    setAdminOptions({ mutationMode: 'undoable', undoableTimeout: 60_000 });
    const onDeleteOne = vi.fn(async () => {});
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canDelete: true,
      deleteAllowed: true,
      onDeleteOne,
    });

    const deleteButtons = await view.findAllByRole('button', { name: '删除' });
    await fireEvent.click(deleteButtons[0]);
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));

    await waitFor(() => expect(view.queryByRole('alertdialog')).toBeNull());
    await waitFor(() => expect(view.queryAllByText('user@example.com')).toHaveLength(0));
    expect(onDeleteOne).not.toHaveBeenCalled();

    await fireEvent.click(await view.findByRole('button', { name: '撤销' }));

    expect((await view.findAllByText('user@example.com')).length).toBeGreaterThan(0);
    expect(onDeleteOne).not.toHaveBeenCalled();
  });

  it('restores optimistic batch deletion after the provider rejects it', async () => {
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
    await fireEvent.click(first);
    await fireEvent.click(second);
    await fireEvent.click(view.getByRole('button', { name: '批量删除 (2)' }));
    await fireEvent.click(within(await view.findByRole('alertdialog')).getByRole('button', { name: '删除' }));

    await waitFor(() => {
      expect(view.queryAllByText('user@example.com')).toHaveLength(0);
      expect(view.queryAllByText('second@example.com')).toHaveLength(0);
    });

    rejectDelete?.(new Error('delete failed'));

    expect((await view.findAllByText('user@example.com')).length).toBeGreaterThan(0);
    expect((await view.findAllByText('second@example.com')).length).toBeGreaterThan(0);
    expect(view.getByText('已选择 2 条记录')).toBeTruthy();
    expect(onNotify).toHaveBeenCalledTimes(1);
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
    await fireEvent.click(rowCheckboxes[0]);
    expect(await view.findByRole('button', { name: '自定义批量 (1)' })).toBeTruthy();
    expect(view.queryByRole('button', { name: '批量删除 (1)' })).toBeNull();

    await fireEvent.click(view.getByRole('button', { name: '清除选择' }));
    await waitFor(() => expect(view.queryByText('已选择 1 条记录')).toBeNull());
  });
});
