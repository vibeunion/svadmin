// @vitest-environment happy-dom
import { requireValue } from '../../scripts/test-assertions';
import { mount, tick, unmount } from 'svelte';
import { render as renderSvelte } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import Harness from './fixtures/BusinessPmHarness.svelte';
import { inMemoryDataProvider } from '../src/providers/inMemoryDb';
import { demoRenderers } from '../src/resource-rendering';
import { localDateKey, matchesTodoView, mondayOffset } from '../src/workspace/workspace-policy';
import { recordLink } from '../src/workspace/workspace-links';
import type { BaseRecord, ChatProvider, DataProvider, NotificationProvider } from '@svadmin/core';
import { parseQueryKey } from '@svadmin/core';
import { definedOptions } from '@svadmin/core/options';
import * as mailOperations from '../src/providers/mail-operations';
import * as workspaceSession from '../src/workspace/workspace-session';

let mounted: ReturnType<typeof mount> | undefined;
const waitFor = vi.waitFor;
const notificationProvider = {
  open: vi.fn<NotificationProvider['open']>(),
  close: vi.fn<NotificationProvider['close']>(),
};
let target: HTMLDivElement;
beforeEach(() => {
  notificationProvider.open.mockClear();
  notificationProvider.close.mockClear();
  localStorage.clear();
  sessionStorage.clear();
  window.location.hash = '#/';
  Object.defineProperty(window, 'confirm', { configurable: true, writable: true, value: () => true });
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: () => ({ cancel() {}, finished: Promise.resolve() }) });
  target = document.createElement('div');
  document.body.append(target);
});
afterEach(async () => { if (mounted) await unmount(mounted); mounted = undefined; target.remove(); vi.restoreAllMocks(); });
async function render(resourceName: string, hash = `#/${resourceName}`, failResource = '', page: 'workspace' | 'table' = 'workspace', chatProvider?: ChatProvider) {
  window.location.hash = hash;
  if (failResource) {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    vi.spyOn(inMemoryDataProvider, 'getList').mockImplementation(async <T extends BaseRecord = BaseRecord>(params: Parameters<DataProvider['getList']>[0]) => {
      if (params.resource === failResource) throw new Error('Expected test failure');
      return getList<T>(params);
    });
  }
  mounted = mount(Harness, { target, props: { resourceName, page, notificationProvider, ...definedOptions({ chatProvider }) } });
  await tick();
}
function button(name: string): HTMLButtonElement {
  const element = [...target.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === name);
  if (!element) throw new Error(`Missing button: ${name}`);
  return element;
}
function fill(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
async function rows(resource: string) { return (await inMemoryDataProvider.getList({ resource, pagination: { mode: 'off' } })).data; }

async function waitForDashboardSurface() {
  // Surface 异步挂载且独立读取两个资源，重试基线必须等这两次请求已经发起。
  await waitFor(() => {
    expect(target.querySelector('[data-declarative-surface-example]')).not.toBeNull();
    const calls = vi.mocked(inMemoryDataProvider.getList).mock.calls;
    for (const resource of ['products', 'sales_orders']) {
      expect(calls.some(([params]) => params.resource === resource && params.pagination?.pageSize === 10)).toBe(true);
    }
  });
}

describe('PM business acceptance', () => {
  it('uses a deterministic local day and Monday-based calendar offset', () => {
    expect(localDateKey(new Date(2026, 6, 1, 1))).toBe('2026-07-01');
    expect(mondayOffset(2026, 7)).toBe(2);
    expect(mondayOffset(2026, 6)).toBe(0);
    expect(mondayOffset(2026, 2)).toBe(6);
  });

  it('applies Todo view predicates to completion and date boundaries', () => {
    const todo = { dueDate: '2026-07-01', completed: false, priority: 'high' };
    expect(matchesTodoView(todo, 'today', '2026-07-01')).toBe(true);
    expect(matchesTodoView(todo, 'upcoming', '2026-07-01')).toBe(false);
    expect(matchesTodoView({ ...todo, completed: true }, 'priority', '2026-07-01')).toBe(false);
    expect(matchesTodoView({ ...todo, completed: true }, 'completed', '2026-07-01')).toBe(true);
  });

  it('encodes exact return context without permitting an external return target', () => {
    const route = '/todos?view=priority&filters=high%20risk';
    const href = recordLink('todos', 12, route);
    expect(new URLSearchParams(href.split('?')[1]).get('returnTo')).toBe(route);
    expect(new URLSearchParams(recordLink('todos', 12, '//evil.example').split('?')[1]).get('returnTo')).toBe('/');
  });

  it('persists Todo completion to the provider and survives remount', async () => {
    await render('todos');
    await waitFor(() => expect(target.querySelector('button[aria-label="Complete task"]')).not.toBeNull());
    const candidate = requireValue(target.querySelector<HTMLButtonElement>('button[aria-label="Complete task"]'));
    const article = requireValue(candidate.closest('article'));
    const href = requireValue(requireValue(article.querySelector('a')).getAttribute('href'));
    const id = Number(href.split('/').pop());
    candidate.click();
    await waitFor(async () => expect(demoRenderers.todos.records(await rows('todos')).find(item => item.id === id)?.completed).toBe(true));
    await unmount(requireValue(mounted)); mounted = undefined;
    await render('todos', '#/todos?view=completed');
    await waitFor(() => expect(target.querySelector(`article a[href="#/todos/show/${id}"]`)).not.toBeNull());
    expect(target.querySelector('button[aria-label="Complete task"]')).toBeNull();
  });

  it('keeps Todo query failures inline and retries without notifications or task updates', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    const update = vi.spyOn(inMemoryDataProvider, 'update');
    const updateMany = vi.spyOn(inMemoryDataProvider, 'updateMany');
    const expectFailure = () => {
      expect(target.textContent).toContain('Unable to load data');
      expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1);
      expect(target.querySelector('[data-svadmin-data-state="empty"]')).toBeNull();
      expect(target.querySelector('button[aria-label="Complete task"]')).toBeNull();
      expect(target.textContent).not.toContain('Expected test failure');
      expect(button('Retry')).toBeDefined();
      expect(notificationProvider.open).not.toHaveBeenCalled();
    };
    await render('todos', '#/todos', 'todos');
    await waitFor(expectFailure);

    const requests = vi.mocked(inMemoryDataProvider.getList);
    expect(requests).toHaveBeenCalledOnce();
    button('Retry').click();
    await tick();
    await waitFor(() => {
      expect(requests).toHaveBeenCalledTimes(2);
      expectFailure();
    });

    requests.mockImplementation(getList);
    button('Retry').click();
    await waitFor(() => {
      expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
      expect(target.querySelector('button[aria-label="Complete task"]')).not.toBeNull();
    });
    expect(requests).toHaveBeenCalledTimes(3);
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['todos', 'todos', 'todos']);
    expect(requests.mock.calls.every(([params]) => params.pagination?.mode === 'off')).toBe(true);
    expect(update).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('does not report Todo completion when storage rejects the update', async () => {
    await render('todos');
    await waitFor(() => expect(target.querySelector('button[aria-label="Complete task"]')).not.toBeNull());
    const before = demoRenderers.todos.records(await rows('todos')).filter(item => item.completed).length;
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    requireValue(target.querySelector<HTMLButtonElement>('button[aria-label="Complete task"]')).click();
    await waitFor(() => expect(target.querySelector('[role="alert"]')).not.toBeNull());
    expect(demoRenderers.todos.records(await rows('todos')).filter(item => item.completed)).toHaveLength(before);
  });

  it('opens the create route from the Todo primary action', async () => {
    await render('todos');
    await waitFor(() => expect(button('New task')).toBeDefined());
    button('New task').click();
    expect(window.location.hash).toBe('#/todos/create');
  });

  it.each([
    { resource: 'products', page: 'workspace' },
    { resource: 'purchase_orders', page: 'workspace' },
    { resource: 'products', page: 'table' },
    { resource: 'crm_accounts', page: 'workspace' },
    { resource: 'crm_contacts', page: 'workspace' },
    { resource: 'crm_deals', page: 'workspace' },
    { resource: 'crm_activities', page: 'workspace' },
    { resource: 'users', page: 'workspace' },
    { resource: 'roles', page: 'workspace' },
    { resource: 'permissions', page: 'workspace' },
    { resource: 'user_accounts', page: 'workspace' },
    { resource: 'user_logs', page: 'workspace' },
    { resource: 'user_settings', page: 'workspace' },
    { resource: 'properties', page: 'workspace' },
    { resource: 'property_agents', page: 'workspace' },
    { resource: 'property_leads', page: 'workspace' },
    { resource: 'property_showings', page: 'workspace' },
    { resource: 'ai_conversations', page: 'workspace' },
  ] as const)('owns $resource $page query failures inline and recovers without a toast', async ({ resource, page }) => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    await render(resource, `#/${resource}`, resource, page);
    await waitFor(() => expect(target.querySelector('[data-svadmin-data-state="error"]')).not.toBeNull());
    expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1);
    expect(notificationProvider.open).not.toHaveBeenCalled();
    expect(target.textContent).not.toContain('Expected test failure');

    const requests = vi.mocked(inMemoryDataProvider.getList);
    const attempts = () => requests.mock.calls.filter(([params]) => params.resource === resource).length;
    const before = attempts();
    button('Retry').click();
    await tick();
    await waitFor(() => {
      expect(attempts()).toBe(before + 1);
      expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1);
    });
    expect(notificationProvider.open).not.toHaveBeenCalled();

    requests.mockImplementation(getList);
    button('Retry').click();
    await waitFor(() => {
      expect(attempts()).toBe(before + 2);
      expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
      expect(target.querySelector(page === 'table'
        ? '[data-slot="table-cell"]'
        : `a[href^="#/${resource}/${resource === 'roles' ? 'edit' : 'show'}/"]`)).not.toBeNull();
    });
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it.each([
    'products', 'suppliers', 'warehouses', 'stock_movements', 'stock_transfers',
    'cycle_counts', 'inventory_adjustments', 'reorder_rules', 'purchase_orders',
    'sales_orders', 'todos', 'users', 'roles', 'calendar_events', 'ai_conversations',
    'notifications',
  ])('keeps Dashboard %s failures inline and retries only the failed query', async resource => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    await render('dashboard', '#/', resource);
    const expectFailure = () => {
      expect(target.textContent).toContain('Some data could not be updated');
      expect(target.querySelector('[data-svadmin-data-state="error"]')).not.toBeNull();
      if (resource === 'roles') {
        expect(target.querySelector('[data-dashboard-summary] a[href="#/users"] p:last-child')?.textContent).toBe('\u2014 roles');
      } else if (resource === 'stock_movements') {
        expect(target.querySelector('section[aria-label="Recent Stock Movements"]')?.getAttribute('data-state')).toBe('error');
      } else {
        expect([...target.querySelectorAll(`[data-dashboard-summary] a[href="#/${resource}"], [data-dashboard-queue] a[href="#/${resource}"]`)]
          .some(link => link.textContent?.includes('\u2014'))).toBe(true);
      }
      expect(target.textContent).not.toContain('Expected test failure');
      expect(notificationProvider.open).not.toHaveBeenCalled();
    };
    await waitFor(expectFailure);
    await waitForDashboardSurface();

    const requests = vi.mocked(inMemoryDataProvider.getList);
    const before = requests.mock.calls.length;
    const failedRequests = () => requests.mock.calls.filter(([params]) => params.resource === resource && params.pagination?.pageSize !== 10).length;
    expect(failedRequests()).toBe(1);

    requireValue(target.querySelector<HTMLButtonElement>('[data-svadmin-data-state="error"] button')).click();
    await waitFor(() => {
      expect(failedRequests()).toBe(2);
      expectFailure();
    });
    expect(requests.mock.calls.slice(before).map(([params]) => params.resource)).toEqual([resource]);

    requests.mockImplementation(getList);
    requireValue(target.querySelector<HTMLButtonElement>('[data-svadmin-data-state="error"] button')).click();
    await waitFor(() => {
      expect(failedRequests()).toBe(3);
      expect(target.textContent).not.toContain('Some data could not be updated');
    });
    expect(requests.mock.calls.slice(before).map(([params]) => params.resource)).toEqual([resource, resource]);
    if (resource === 'products' || resource === 'sales_orders') {
      const surface = requireValue(target.querySelector('[data-declarative-surface-example]'));
      expect(surface.querySelectorAll('[role="alert"]')).toHaveLength(2);
      const beforeSurfaceRefresh = requests.mock.calls.length;
      button('Refresh Surface').click();
      await waitFor(() => expect(surface.querySelector('[role="alert"]')).toBeNull());
      expect(requests.mock.calls.slice(beforeSurfaceRefresh).map(([params]) => params.resource).sort()).toEqual(['products', 'sales_orders']);
      expect(target.textContent).not.toContain('Expected test failure');
    }
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('retries only the failed Dashboard section query', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    await render('dashboard', '#/dashboard', 'calendar_events');
    await waitFor(() => {
      const calendarSection = target.querySelector('section[aria-label="Calendar"]');
      expect(calendarSection?.getAttribute('data-state')).toBe('error');
      expect(calendarSection?.querySelector('button')).not.toBeNull();
    });
    expect(notificationProvider.open).not.toHaveBeenCalled();

    const requests = vi.mocked(inMemoryDataProvider.getList);
    await waitForDashboardSurface();
    const before = requests.mock.calls.length;
    const calendarRequests = () => requests.mock.calls.filter(([params]) => params.resource === 'calendar_events').length;
    expect(calendarRequests()).toBe(1);

    const calendarRetry = requireValue(target.querySelector<HTMLButtonElement>('section[aria-label="Calendar"] button'));
    calendarRetry.click();
    await waitFor(() => expect(calendarRequests()).toBe(2));
    expect(requests.mock.calls.slice(before).map(([params]) => params.resource)).toEqual(['calendar_events']);
    expect(target.querySelector('section[aria-label="Calendar"]')?.getAttribute('data-state')).toBe('error');
    expect(notificationProvider.open).not.toHaveBeenCalled();

    requests.mockImplementation(getList);
    requireValue(target.querySelector<HTMLButtonElement>('section[aria-label="Calendar"] button')).click();
    await waitFor(() => expect(target.querySelector('section[aria-label="Calendar"]')?.getAttribute('data-state')).toBe('ready'));
    expect(requests.mock.calls.slice(before).map(([params]) => params.resource)).toEqual(['calendar_events', 'calendar_events']);
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('keeps Dashboard section data visible when a later refresh fails', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    let failCalendar = false;
    const requests = vi.spyOn(inMemoryDataProvider, 'getList').mockImplementation(async <T extends BaseRecord = BaseRecord>(params: Parameters<DataProvider['getList']>[0]) => {
      if (params.resource === 'calendar_events' && failCalendar) throw new Error('Expected refresh failure');
      return getList<T>(params);
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    try {
      mounted = mount(Harness, { target, props: { resourceName: 'dashboard', notificationProvider, queryClient } });
      const calendarSection = () => requireValue(target.querySelector('section[aria-label="Calendar"]'));
      await waitFor(() => {
        expect(calendarSection().getAttribute('data-state')).toBe('ready');
        expect(calendarSection().textContent).toContain('WH-MAIN cycle count');
      });
      const event = requireValue(calendarSection().querySelector('.divide-y > div'));
      await waitForDashboardSurface();
      const before = requests.mock.calls.length;
      failCalendar = true;
      await queryClient.refetchQueries({ predicate: query => parseQueryKey(query.queryKey)?.resource === 'calendar_events' });
      await waitFor(() => expect(calendarSection().getAttribute('data-state')).toBe('partial'));
      expect(calendarSection().querySelector('.divide-y > div')).toBe(event);
      expect(calendarSection().textContent).toContain('WH-MAIN cycle count');
      expect(calendarSection().textContent).toContain('Some data is unavailable');
      expect(calendarSection().textContent).not.toContain('Expected refresh failure');
      expect(target.textContent).toContain('Some data could not be updated');
      expect(target.querySelector('[data-dashboard-summary] a[href="#/calendar_events"]')?.textContent).toContain('\u2014');
      expect(requests.mock.calls.slice(before).map(([params]) => params.resource)).toEqual(['calendar_events']);
      expect(notificationProvider.open).not.toHaveBeenCalled();

      failCalendar = false;
      requireValue(calendarSection().querySelector<HTMLButtonElement>('button')).click();
      await waitFor(() => expect(calendarSection().getAttribute('data-state')).toBe('ready'));
      expect(calendarSection().querySelector('.divide-y > div')).toBe(event);
      expect(calendarSection().textContent).not.toContain('Some data is unavailable');
      expect(target.textContent).not.toContain('Some data could not be updated');
      expect(requests.mock.calls.slice(before).map(([params]) => params.resource)).toEqual(['calendar_events', 'calendar_events']);
      expect(notificationProvider.open).not.toHaveBeenCalled();
    } finally {
      if (mounted) await unmount(mounted);
      mounted = undefined;
      queryClient.clear();
    }
  });

  it('retries all failed Dashboard resources and leaves recovered resources untouched', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    const failed = new Set(['roles', 'notifications']);
    const requests = vi.spyOn(inMemoryDataProvider, 'getList').mockImplementation(async <T extends BaseRecord = BaseRecord>(params: Parameters<DataProvider['getList']>[0]) => {
      if (failed.has(params.resource)) throw new Error('Expected test failure');
      return getList<T>(params);
    });
    await render('dashboard', '#/');
    await waitForDashboardSurface();
    await waitFor(() => {
      expect(target.querySelector('section[aria-label="Notifications"]')?.getAttribute('data-state')).toBe('error');
      expect(target.querySelector('[data-dashboard-summary] a[href="#/users"] p:last-child')?.textContent).toBe('\u2014 roles');
    });
    const member = requireValue(target.querySelector('section[aria-label="Team members"] a[href^="#/users/show/"]'));
    const before = requests.mock.calls.length;
    failed.delete('notifications');
    requireValue(target.querySelector<HTMLButtonElement>('[data-svadmin-data-state="error"] button')).click();
    await waitFor(() => {
      expect(target.querySelector('section[aria-label="Notifications"]')?.getAttribute('data-state')).toBe('ready');
      expect(target.querySelector('[data-dashboard-summary] a[href="#/users"] p:last-child')?.textContent).toBe('\u2014 roles');
    });
    expect(requests.mock.calls.slice(before).map(([params]) => params.resource).sort()).toEqual(['notifications', 'roles']);
    const afterPartialRecovery = requests.mock.calls.length;
    failed.clear();
    requireValue(target.querySelector<HTMLButtonElement>('[data-svadmin-data-state="error"] button')).click();
    await waitFor(() => {
      expect(target.textContent).not.toContain('Some data could not be updated');
      expect(target.querySelector('[data-dashboard-summary] a[href="#/users"] p:last-child')?.textContent).toBe('10 roles');
    });
    expect(requests.mock.calls.slice(afterPartialRecovery).map(([params]) => params.resource)).toEqual(['roles']);
    expect(target.querySelector('section[aria-label="Team members"] a[href^="#/users/show/"]')).toBe(member);
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it.each([false, true])('keeps Dashboard role metadata unknown until loading resolves (empty: %s)', async empty => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    let release: () => void = () => { throw new Error('Role request not initialized'); };
    const pending = new Promise<void>(resolve => { release = resolve; });
    const requests = vi.spyOn(inMemoryDataProvider, 'getList').mockImplementation(async <T extends BaseRecord = BaseRecord>(params: Parameters<DataProvider['getList']>[0]) => {
      if (params.resource === 'roles') {
        await pending;
        if (empty) return { data: [], total: 0 };
      }
      return getList<T>(params);
    });
    try {
      await render('dashboard', '#/');
      await waitFor(() => {
        expect(target.querySelector('section[aria-label="Team members"]')?.getAttribute('data-state')).toBe('ready');
        expect(target.querySelector('[data-dashboard-summary] a[href="#/users"] p:last-child')?.textContent).toBe('\u2014 roles');
      });
      expect(target.textContent).not.toContain('Some data could not be updated');
      release();
      await waitFor(() => expect(target.querySelector('[data-dashboard-summary] a[href="#/users"] p:last-child')?.textContent).toBe(empty ? '0 roles' : '10 roles'));
      expect(requests.mock.calls.filter(([params]) => params.resource === 'roles')).toHaveLength(1);
      expect(notificationProvider.open).not.toHaveBeenCalled();
    } finally {
      release();
    }
  });

  it.each([
    ['skus', 'products'],
    ['products', 'categories'],
    ['products', 'suppliers'],
    ['project_planning', 'users'],
    ['billing_subscriptions', 'billing_plans'],
    ['reorder_rules', 'products'],
    ['reorder_rules', 'warehouses'],
    ['reorder_rules', 'suppliers'],
    ['purchase_orders', 'suppliers'],
  ])('keeps %s usable and retries only failed %s without a toast', async (resource, related) => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    await render(resource, `#/${resource}`, related);
    await waitFor(() => expect(target.textContent).toContain('Some related data is unavailable.'));
    expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
    expect(target.querySelector(`a[href^="#/${resource}/show/"]`)).not.toBeNull();
    expect(notificationProvider.open).not.toHaveBeenCalled();

    const requests = vi.mocked(inMemoryDataProvider.getList);
    const before = requests.mock.calls.length;
    requests.mockImplementation(getList);
    button('Retry related data').click();
    await waitFor(() => expect(target.textContent).not.toContain('Some related data is unavailable.'));
    expect(requests.mock.calls.slice(before).map(([params]) => params.resource)).toEqual([related]);
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('keeps warehouse records usable when an unrelated supplier query fails', async () => {
    await render('warehouses', '#/warehouses', 'suppliers');
    await waitFor(() => expect(target.textContent).toContain('Main Warehouse'));
    expect(target.textContent).not.toContain('Unable to load workspace data');
    expect(target.querySelector('a[href^="#/warehouses/show/"]')).not.toBeNull();
  });

  it('keeps the user directory usable when role data fails and retries only the relation', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    await render('users', '#/users', 'roles');
    await waitFor(() => {
      expect(target.querySelector('a[href^="#/users/show/"]')).not.toBeNull();
      expect(target.textContent).toContain('Some related data is unavailable.');
    });
    expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
    expect(notificationProvider.open).not.toHaveBeenCalled();
    const requests = vi.mocked(inMemoryDataProvider.getList);
    const before = requests.mock.calls.length;
    expect(requests.mock.calls.map(([params]) => params.resource).sort()).toEqual(['permissions', 'roles', 'user_logs', 'users']);

    requests.mockImplementation(getList);
    button('Retry related data').click();
    await waitFor(() => expect(target.textContent).not.toContain('Some related data is unavailable.'));
    expect(requests.mock.calls.slice(before).map(([params]) => params.resource)).toEqual(['roles']);
    expect(target.querySelector('a[href^="#/users/show/"]')).not.toBeNull();
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it.each(['users', 'permissions'] as const)('keeps the role list usable when %s data fails', async related => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    const writes = [
      vi.spyOn(inMemoryDataProvider, 'create'),
      vi.spyOn(inMemoryDataProvider, 'update'),
      vi.spyOn(inMemoryDataProvider, 'updateMany'),
    ];
    await render('roles', '#/roles', related);
    await waitFor(() => {
      expect(target.textContent).toContain('Inventory Admin');
      expect(target.textContent).toContain('Some related data is unavailable.');
    });
    const editLink = requireValue(target.querySelector('a[href^="#/roles/edit/"]'));
    expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
    expect(target.querySelector('input[placeholder="Search roles"]')).not.toBeNull();
    expect(target.textContent).toMatch(related === 'users' ? /\u2014\s+members/ : /Permissions unavailable/);
    expect(target.textContent).not.toContain('No permissions assigned.');
    expect(target.textContent).not.toContain('Expected test failure');
    expect(notificationProvider.open).not.toHaveBeenCalled();

    const requests = vi.mocked(inMemoryDataProvider.getList);
    const before = requests.mock.calls.length;
    expect(requests.mock.calls.map(([params]) => params.resource).sort()).toEqual(['permissions', 'roles', 'users']);
    button('Retry related data').click();
    await waitFor(() => {
      expect(requests).toHaveBeenCalledTimes(before + 1);
      expect(target.textContent).toContain('Some related data is unavailable.');
      expect(target.querySelector('a[href^="#/roles/edit/"]')).toBe(editLink);
    });
    expect(notificationProvider.open).not.toHaveBeenCalled();
    requests.mockImplementation(getList);
    button('Retry related data').click();
    await waitFor(() => expect(target.textContent).not.toContain('Some related data is unavailable.'));
    expect(requests.mock.calls.slice(before).map(([params]) => params.resource)).toEqual([related, related]);
    expect(target.querySelector('a[href^="#/roles/edit/"]')).toBe(editLink);
    expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
    expect(target.textContent).not.toContain('Permissions unavailable');
    expect(target.textContent).not.toMatch(/\u2014\s+members/);
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it.each(['users', 'permissions'] as const)('keeps roles available while related %s are loading', async related => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    let release: () => void = () => { throw new Error('Request not initialized'); };
    const pending = new Promise<void>(resolve => { release = resolve; });
    const requests = vi.spyOn(inMemoryDataProvider, 'getList').mockImplementation(async <T extends BaseRecord = BaseRecord>(params: Parameters<DataProvider['getList']>[0]) => {
      if (params.resource === related) await pending;
      return getList<T>(params);
    });
    try {
      await render('roles');
      await waitFor(() => expect(target.querySelector('a[href^="#/roles/edit/"]')).not.toBeNull());
      expect(target.querySelector('[data-svadmin-data-state="loading"]')).toBeNull();
      expect(target.textContent).toMatch(related === 'users' ? /\u2026\s+members/ : /Loading permission details/);
      expect(target.textContent).not.toContain('No permissions assigned.');
      release();
      await waitFor(() => {
        expect(target.textContent).not.toMatch(/\u2026\s+members|Loading permission details/);
        expect(target.querySelector('[data-role-details]')?.textContent).toMatch(/allow|Allow/);
      });
      expect(requests.mock.calls.map(([params]) => params.resource).sort()).toEqual(['permissions', 'roles', 'users']);
      expect(notificationProvider.open).not.toHaveBeenCalled();
    } finally {
      release();
    }
  });

  it.each([
    { resource: 'users', expected: ['permissions', 'roles', 'user_logs', 'users'] },
    { resource: 'roles', expected: ['permissions', 'roles', 'users'] },
    { resource: 'permissions', expected: ['permissions', 'roles', 'user_logs', 'users'] },
    { resource: 'user_accounts', expected: ['permissions', 'roles', 'user_accounts', 'users'] },
    { resource: 'user_logs', expected: ['permissions', 'roles', 'user_logs', 'users'] },
    { resource: 'user_settings', expected: ['permissions', 'roles', 'user_logs', 'user_settings', 'users'] },
  ])('requests only the $resource page dependencies', async ({ resource, expected }) => {
    const requests = vi.spyOn(inMemoryDataProvider, 'getList');
    await render(resource);
    await waitFor(() => expect(target.querySelector(`a[href^="#/${resource}/${resource === 'roles' ? 'edit' : 'show'}/"]`)).not.toBeNull());
    expect(requests.mock.calls.map(([params]) => params.resource).sort()).toEqual(expected);
    if (resource !== 'roles') {
      const summary = requireValue(target.querySelector('details'));
      for (const label of [
        ...(resource !== 'user_accounts' ? ['Accounts'] : ['Logs']),
        ...(resource !== 'user_settings' ? ['Settings'] : []),
      ]) {
        const heading = requireValue([...summary.querySelectorAll('p')].find(item => item.textContent === label));
        expect(heading.nextElementSibling?.textContent).toBe('\u2014');
      }
    }
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('does not show a risk metric when the account page does not load audit logs', async () => {
    await render('user_accounts', '#/user_accounts', 'user_logs');
    await waitFor(() => expect(target.querySelector('a[href^="#/user_accounts/show/"]')).not.toBeNull());
    const requests = vi.mocked(inMemoryDataProvider.getList);
    expect(requests.mock.calls.map(([params]) => params.resource)).not.toContain('user_logs');
    expect(target.querySelector('[aria-label="Risk events"]')).toBeNull();
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('ignores an inactive log failure when switching from users to accounts and restores logs on return', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    const requests = vi.spyOn(inMemoryDataProvider, 'getList').mockImplementation(async <T extends BaseRecord = BaseRecord>(params: Parameters<DataProvider['getList']>[0]) => {
      if (params.resource === 'user_logs') throw new Error('Expected test failure');
      return getList<T>(params);
    });
    const view = renderSvelte(Harness, { target, props: { resourceName: 'users', notificationProvider } });
    try {
      await waitFor(() => {
        expect(target.querySelector('a[href^="#/users/show/"]')).not.toBeNull();
        expect(target.textContent).toContain('Some related data is unavailable.');
      });
      const before = requests.mock.calls.length;
      await view.rerender({ resourceName: 'user_accounts' });
      await waitFor(() => expect(target.querySelector('a[href^="#/user_accounts/show/"]')).not.toBeNull());
      expect(target.textContent).not.toContain('Some related data is unavailable.');
      expect(target.querySelector('[aria-label="Risk events"]')).toBeNull();
      const accountSwitchResources = requests.mock.calls.slice(before).map(([params]) => params.resource);
      expect(accountSwitchResources).toContain('user_accounts');
      expect(accountSwitchResources.every(resource => ['users', 'roles', 'permissions', 'user_accounts'].includes(resource))).toBe(true);

      requests.mockImplementation(getList);
      const beforeUsersSwitch = requests.mock.calls.length;
      await view.rerender({ resourceName: 'users' });
      await waitFor(() => expect(target.querySelector('[aria-label="Risk events"] [data-svadmin-metric-value]')?.textContent).toMatch(/^\d+$/));
      expect(target.querySelector('a[href^="#/users/show/"]')).not.toBeNull();
      expect(target.textContent).not.toContain('Some related data is unavailable.');
      const userSwitchResources = requests.mock.calls.slice(beforeUsersSwitch).map(([params]) => params.resource);
      expect(userSwitchResources).toContain('user_logs');
      expect(userSwitchResources.every(resource => ['users', 'roles', 'permissions', 'user_logs'].includes(resource))).toBe(true);
      expect(notificationProvider.open).not.toHaveBeenCalled();
    } finally {
      await view.unmount();
    }
  });

  it.each(['mail_inbox', 'mail_draft', 'mail_sent', 'mail_archive', 'mail_snoozed', 'mail_spam', 'mail_trash'])(
    'keeps the %s failure inline and retries without changing mail', async resource => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    const writes = [
      vi.spyOn(inMemoryDataProvider, 'create'),
      vi.spyOn(inMemoryDataProvider, 'update'),
      vi.spyOn(inMemoryDataProvider, 'updateMany'),
      vi.spyOn(mailOperations, 'executeLocalMail'),
    ];
    const expectFailure = () => {
      expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1);
      expect(target.textContent).toContain('Unable to load data');
      expect(target.textContent).not.toContain('Expected test failure');
      expect(target.querySelector(`a[href^="#/${resource}/show/"]`)).toBeNull();
      expect(target.querySelector('[data-svadmin-data-state="empty"]')).toBeNull();
      expect(notificationProvider.open).not.toHaveBeenCalled();
    };
    await render(resource, `#/${resource}`, resource);
    await waitFor(expectFailure);
    const requests = vi.mocked(inMemoryDataProvider.getList);
    expect(requests.mock.calls.map(([params]) => params.resource).sort()).toEqual(
      resource === 'mail_inbox' ? ['mail_inbox'] : [resource, 'mail_inbox'].sort()
    );
    const before = requests.mock.calls.length;

    button('Retry').click();
    await tick();
    await waitFor(() => {
      expect(requests).toHaveBeenCalledTimes(before + 1);
      expectFailure();
    });

    requests.mockImplementation(getList);
    button('Retry').click();
    await waitFor(() => {
      expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
      expect(target.querySelector(`a[href^="#/${resource}/show/"]`)).not.toBeNull();
    });
    expect(requests.mock.calls.slice(before).map(([params]) => params.resource)).toEqual([resource, resource]);
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('keeps inbox statistic failures notified without blocking another mail folder', async () => {
    await render('mail_draft', '#/mail_draft', 'mail_inbox');
    await waitFor(() => {
      expect(target.querySelector('a[href^="#/mail_draft/show/"]')).not.toBeNull();
      expect(notificationProvider.open).toHaveBeenCalledOnce();
    });
    expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
    expect(target.querySelector('nav[aria-label="Mail folders"] a[href="#/mail_inbox"]')?.textContent).toContain('—');
    expect(target.textContent).not.toContain('Expected test failure');
    expect(notificationProvider.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('changes the inbox notification policy when the current folder changes without remounting', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    const requests = vi.spyOn(inMemoryDataProvider, 'getList').mockImplementation(async <T extends BaseRecord = BaseRecord>(params: Parameters<DataProvider['getList']>[0]) => {
      if (params.resource === 'mail_inbox') throw new Error('Expected test failure');
      return getList<T>(params);
    });
    const view = renderSvelte(Harness, { target, props: { resourceName: 'mail_draft', notificationProvider } });
    try {
      await waitFor(() => {
        expect(target.querySelector('a[href^="#/mail_draft/show/"]')).not.toBeNull();
        expect(notificationProvider.open).toHaveBeenCalledOnce();
      });
      await view.rerender({ resourceName: 'mail_inbox' });
      await waitFor(() => expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1));
      const before = requests.mock.calls.length;
      button('Retry').click();
      await tick();
      await waitFor(() => {
        expect(requests).toHaveBeenCalledTimes(before + 1);
        expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1);
      });
      expect(requests.mock.calls.slice(before).map(([params]) => params.resource)).toEqual(['mail_inbox']);
      expect(notificationProvider.open).toHaveBeenCalledOnce();
    } finally {
      await view.unmount();
    }
  });

  it('does not load an unrelated CRM query or notify when the current list is usable', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    await render('crm_accounts', '#/crm_accounts', 'crm_deals');
    await waitFor(() => expect(target.querySelector('a[href^="#/crm_accounts/show/"]')).not.toBeNull());
    const requests = vi.mocked(inMemoryDataProvider.getList);
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['crm_accounts']);
    expect(notificationProvider.open).not.toHaveBeenCalled();

    requests.mockImplementation(getList);
    const before = requests.mock.calls.length;
    await unmount(requireValue(mounted)); mounted = undefined;
    await render('crm_deals', '#/crm_deals');
    await waitFor(() => expect(target.querySelector('a[href^="#/crm_deals/show/"]')).not.toBeNull());
    expect(requests.mock.calls.slice(before).map(([params]) => params.resource)).toEqual(['crm_deals']);
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it.each([
    ['crm_accounts', 'default'],
    ['crm_contacts', 'default'],
    ['crm_deals', 'default'],
    ['crm_deals', 'reports'],
    ['crm_deals', 'dashboard'],
    ['crm_activities', 'default'],
    ['crm_activities', 'tasks'],
    ['crm_activities', 'notes'],
    ['crm_accounts', 'tasks'],
    ['crm_accounts', 'notes'],
  ])('requests only visible %s records in the %s CRM view', async (resource, view) => {
    await render(resource, `#/${resource}?view=${view}`, resource === 'crm_accounts' ? 'crm_activities' : 'crm_accounts');
    await waitFor(() => expect(target.querySelector(`a[href^="#/${resource}/show/"]`)).not.toBeNull());
    const requests = vi.mocked(inMemoryDataProvider.getList);
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual([resource]);
    expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it.each(['reports', 'dashboard'])('keeps CRM accounts usable while retrying failed %s statistics', async view => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    await render('crm_accounts', `#/crm_accounts?view=${view}`, 'crm_deals');
    await waitFor(() => {
      expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1);
      expect(target.querySelector('a[href^="#/crm_accounts/show/"]')).not.toBeNull();
    });
    const account = requireValue(target.querySelector('a[href^="#/crm_accounts/show/"]'));
    const requests = vi.mocked(inMemoryDataProvider.getList);
    expect(requests.mock.calls.map(([params]) => params.resource).sort()).toEqual(['crm_accounts', 'crm_deals']);
    expect(target.textContent).not.toContain('Open pipeline');
    expect(target.textContent).not.toContain('Expected test failure');
    expect(notificationProvider.open).not.toHaveBeenCalled();

    button('Retry').click();
    await tick();
    await waitFor(() => {
      expect(requests).toHaveBeenCalledTimes(3);
      expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1);
    });
    expect(target.querySelector('a[href^="#/crm_accounts/show/"]')).toBe(account);
    expect(notificationProvider.open).not.toHaveBeenCalled();

    requests.mockImplementation(getList);
    button('Retry').click();
    await waitFor(() => expect(target.textContent).toContain('Open pipeline'));
    expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
    expect(target.querySelector('a[href^="#/crm_accounts/show/"]')).toBe(account);
    expect(requests.mock.calls.slice(2).map(([params]) => params.resource)).toEqual(['crm_deals', 'crm_deals']);
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('shows one loading state instead of zero CRM statistics while the deals request is pending', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    let release: () => void = () => { throw new Error('Request not initialized'); };
    const pending = new Promise<void>(resolve => { release = resolve; });
    const requests = vi.spyOn(inMemoryDataProvider, 'getList').mockImplementation(async <T extends BaseRecord = BaseRecord>(params: Parameters<DataProvider['getList']>[0]) => {
      await pending;
      return getList<T>(params);
    });
    await render('crm_deals');
    await waitFor(() => expect(target.querySelectorAll('[data-svadmin-data-state="loading"]')).toHaveLength(1));
    expect(target.textContent).not.toContain('Open pipeline');
    expect(target.querySelector('a[href^="#/crm_deals/show/"]')).toBeNull();
    release();
    await waitFor(() => expect(target.querySelector('a[href^="#/crm_deals/show/"]')).not.toBeNull());
    expect(target.textContent).toContain('Open pipeline');
    expect(target.querySelector('[data-svadmin-data-state="loading"]')).toBeNull();
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['crm_deals']);
  });

  it('enables and hides CRM statistics with view changes without replacing the current accounts', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    await render('crm_accounts', '#/crm_accounts', 'crm_deals');
    await waitFor(() => expect(target.querySelector('a[href^="#/crm_accounts/show/"]')).not.toBeNull());
    const account = requireValue(target.querySelector('a[href^="#/crm_accounts/show/"]'));
    const requests = vi.mocked(inMemoryDataProvider.getList);
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['crm_accounts']);

    window.location.hash = '#/crm_accounts?view=reports';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1));
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['crm_accounts', 'crm_deals']);
    expect(target.querySelector('a[href^="#/crm_accounts/show/"]')).toBe(account);

    window.location.hash = '#/crm_accounts';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull());
    expect(requests).toHaveBeenCalledTimes(2);
    expect(target.querySelector('a[href^="#/crm_accounts/show/"]')).toBe(account);

    requests.mockImplementation(getList);
    window.location.hash = '#/crm_accounts?view=dashboard';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => expect(target.textContent).toContain('Open pipeline'));
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['crm_accounts', 'crm_deals', 'crm_deals']);
    expect(target.querySelector('a[href^="#/crm_accounts/show/"]')).toBe(account);
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it.each([
    ['properties', 'portfolio'],
    ['properties', 'buy'],
    ['properties', 'sell'],
    ['properties', 'rent'],
    ['properties', 'commercial'],
    ['properties', 'saved'],
    ['properties', 'map'],
    ['properties', 'filters'],
    ['property_agents', 'portfolio'],
    ['property_agents', 'saved'],
    ['property_leads', 'portfolio'],
    ['property_leads', 'saved'],
    ['property_showings', 'portfolio'],
    ['property_showings', 'saved'],
  ])('requests only %s in the %s property view', async (resource, view) => {
    sessionStorage.setItem('svadmin-example-property-favorites', '[1]');
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    const requests = vi.spyOn(inMemoryDataProvider, 'getList').mockImplementation(async <T extends BaseRecord = BaseRecord>(params: Parameters<DataProvider['getList']>[0]) => {
      if (params.resource !== resource) throw new Error('Unrelated property request');
      return getList<T>(params);
    });
    await render(resource, `#/${resource}?view=${view}`);
    await waitFor(() => expect(target.querySelector(`a[href^="#/${resource}/show/"]`)).not.toBeNull());
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual([resource]);
    expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it.each([
    ['properties', 'portfolio'],
    ['properties', 'map'],
    ['properties', 'filters'],
    ['properties', 'unknown'],
    ['property_agents', 'saved'],
  ])('uses initial empty for %s in the non-filtering %s view', async (resource, view) => {
    const requests = vi.spyOn(inMemoryDataProvider, 'getList').mockResolvedValue({ data: [], total: 0 });
    await render(resource, `#/${resource}?view=${view}`);
    await waitFor(() => expect(target.querySelector('[data-svadmin-data-state="empty"]')).not.toBeNull());
    expect(target.querySelector('[data-svadmin-data-state="filtered-empty"]')).toBeNull();
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual([resource]);
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it.each(['buy', 'sell', 'rent', 'commercial', 'saved'])('clears the %s property condition without losing favorites', async view => {
    sessionStorage.setItem('svadmin-example-property-favorites', '[1]');
    const requests = vi.spyOn(inMemoryDataProvider, 'getList');
    const writes = [
      vi.spyOn(inMemoryDataProvider, 'create'),
      vi.spyOn(inMemoryDataProvider, 'update'),
      vi.spyOn(inMemoryDataProvider, 'updateMany'),
    ];
    await render('properties', `#/properties?view=${view}&sort=name`);
    await waitFor(() => expect(target.querySelector('a[href^="#/properties/show/"]')).not.toBeNull());
    const search = requireValue(target.querySelector<HTMLInputElement>('input:not([type="number"])'));
    const price = requireValue(target.querySelector<HTMLInputElement>('input[type="number"]'));
    fill(search, 'No matching property');
    fill(price, '0');
    await waitFor(() => expect(target.querySelector('[data-svadmin-data-state="filtered-empty"]')).not.toBeNull());
    requireValue(target.querySelector<HTMLButtonElement>('[data-svadmin-data-state="filtered-empty"] button')).click();
    await waitFor(() => {
      expect(target.querySelector('[data-svadmin-data-state="filtered-empty"]')).toBeNull();
      expect(target.querySelectorAll('a[href^="#/properties/show/"]')).toHaveLength(3);
    });
    expect(search.value).toBe('');
    expect(price.value).toBe('');
    expect(window.location.hash).toBe('#/properties?sort=name');
    expect(sessionStorage.getItem('svadmin-example-property-favorites')).toBe('[1]');
    expect(target.querySelector('button[aria-label="Save property"][aria-pressed="true"]')).not.toBeNull();
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['properties']);
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it.each(['property_agents', 'property_leads', 'property_showings'])('recovers %s after a search has no matches', async resource => {
    const requests = vi.spyOn(inMemoryDataProvider, 'getList');
    await render(resource);
    await waitFor(() => expect(target.querySelector(`a[href^="#/${resource}/show/"]`)).not.toBeNull());
    const search = requireValue(target.querySelector<HTMLInputElement>('input'));
    fill(search, 'No matching property record');
    await waitFor(() => expect(target.querySelector('[data-svadmin-data-state="filtered-empty"]')).not.toBeNull());
    requireValue(target.querySelector<HTMLButtonElement>('[data-svadmin-data-state="filtered-empty"] button')).click();
    await waitFor(() => expect(target.querySelector(`a[href^="#/${resource}/show/"]`)).not.toBeNull());
    expect(search.value).toBe('');
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual([resource]);
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('does not treat unreadable saved properties as an empty collection', async () => {
    sessionStorage.setItem('svadmin-example-property-favorites', '{broken');
    const requests = vi.spyOn(inMemoryDataProvider, 'getList');
    const writes = [
      vi.spyOn(inMemoryDataProvider, 'create'),
      vi.spyOn(inMemoryDataProvider, 'update'),
      vi.spyOn(inMemoryDataProvider, 'updateMany'),
    ];
    await render('properties', '#/properties?view=saved');
    await waitFor(() => {
      expect(target.textContent).toContain('Saved properties are temporarily unavailable.');
      expect(target.querySelector('[data-svadmin-data-state="empty"]')).toBeNull();
      expect(target.querySelector('[data-svadmin-data-state="filtered-empty"]')).toBeNull();
    });
    expect(target.querySelector('button[aria-label="Save property"]')).toBeNull();
    expect(notificationProvider.open).not.toHaveBeenCalled();

    sessionStorage.setItem('svadmin-example-property-favorites', '[1]');
    button('Retry saved properties').click();
    await waitFor(() => expect(target.querySelector('a[href^="#/properties/show/1"]')).not.toBeNull());
    expect(target.textContent).not.toContain('Saved properties are temporarily unavailable.');
    expect(target.querySelector('button[aria-label="Save property"][aria-pressed="true"]')).not.toBeNull();
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['properties']);
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('keeps the showing-day metric independent from filtered results and refreshes on focus', async () => {
    vi.setSystemTime(new Date('2026-06-14T12:00:00'));
    try {
      await render('property_showings');
      await waitFor(() => expect(target.querySelector('[aria-label="Today’s showings"] [data-svadmin-metric-value]')).not.toBeNull());
      const metric = () => requireValue(target.querySelector('[aria-label="Today’s showings"] [data-svadmin-metric-value]')).textContent;
      expect(metric()).toBe('1');

      const search = requireValue(target.querySelector<HTMLInputElement>('input'));
      fill(search, 'TOUR-2026-002');
      await waitFor(() => expect(target.querySelector('a[href^="#/property_showings/show/2"]')).not.toBeNull());
      expect(metric()).toBe('1');
      fill(search, 'No matching showing');
      await waitFor(() => expect(target.querySelector('[data-svadmin-data-state="filtered-empty"]')).not.toBeNull());
      expect(metric()).toBe('1');

      vi.setSystemTime(new Date('2026-06-15T00:05:00'));
      window.dispatchEvent(new Event('focus'));
      await waitFor(() => expect(metric()).toBe('0'));
      expect(notificationProvider.open).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('retires the failed property resource when switching pages and retries only the current resource', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    const requests = vi.spyOn(inMemoryDataProvider, 'getList').mockImplementation(async <T extends BaseRecord = BaseRecord>(params: Parameters<DataProvider['getList']>[0]) => {
      if (params.resource === 'properties') throw new Error('Expected test failure');
      return getList<T>(params);
    });
    const writes = [
      vi.spyOn(inMemoryDataProvider, 'create'),
      vi.spyOn(inMemoryDataProvider, 'update'),
      vi.spyOn(inMemoryDataProvider, 'updateMany'),
    ];
    const view = renderSvelte(Harness, { target, props: { resourceName: 'properties', notificationProvider } });
    try {
      await waitFor(() => expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1));
      expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['properties']);
      await view.rerender({ resourceName: 'property_agents' });
      await waitFor(() => expect(target.querySelector('a[href^="#/property_agents/show/"]')).not.toBeNull());
      expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
      expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['properties', 'property_agents']);

      await view.rerender({ resourceName: 'properties' });
      await waitFor(() => expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1));
      expect(target.querySelector('a[href^="#/property_agents/show/"]')).toBeNull();
      expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['properties', 'property_agents', 'properties']);
      requests.mockImplementation(getList);
      button('Retry').click();
      await waitFor(() => expect(target.querySelector('a[href^="#/properties/show/"]')).not.toBeNull());
      expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
      expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['properties', 'property_agents', 'properties', 'properties']);
      for (const write of writes) expect(write).not.toHaveBeenCalled();
      expect(notificationProvider.open).not.toHaveBeenCalled();
    } finally {
      await view.unmount();
    }
  });

  it('keeps completed project milestones visible', async () => {
    await inMemoryDataProvider.create({ resource: 'project_planning', variables: { milestone: 'PM completed milestone', ownerId: 1, dueDate: '2026-07-01', status: 'completed', confidence: 100, notes: 'done' } });
    await render('project_planning');
    await waitFor(() => expect(target.querySelector('[data-project-plan-layout]')?.textContent).toContain('PM completed milestone'));
  });

  it('resolves reorder-rule warehouses without blocking sales on warehouse failures', async () => {
    await render('reorder_rules');
    await waitFor(() => expect(target.querySelector('[data-reorder-layout]')?.textContent).toContain('Main Warehouse'));
    await unmount(requireValue(mounted)); mounted = undefined;
    await render('sales_orders', '#/sales_orders', 'warehouses');
    await waitFor(() => expect(target.querySelector('[data-order-layout="sales_orders"]')).not.toBeNull());
    expect(target.textContent).not.toContain('Unknown warehouse');
  });

  it('saves a mail draft and records a local send without external delivery', async () => {
    await render('mail_inbox');
    await waitFor(() => expect(button('Compose')).toBeDefined());
    button('Compose').click();
    await tick();
    const form = requireValue(target.querySelector('form'));
    fill(requireValue(form.querySelector<HTMLInputElement>('input[type="email"]')), 'pm@example.com');
    fill(requireValue(form.querySelector<HTMLInputElement>('input:not([type="email"])')), 'PM workflow draft');
    fill(requireValue(form.querySelector<HTMLTextAreaElement>('textarea')), 'Local-only body.');
    await tick();
    button('Save draft').click();
    await waitFor(async () => expect(demoRenderers.mail_draft.records(await rows('mail_draft')).some(item => item.subject === 'PM workflow draft')).toBe(true));
    await waitFor(() => expect(button('Send locally').disabled).toBe(false));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(async () => expect(demoRenderers.mail_sent.records(await rows('mail_sent')).some(item => item.subject === 'PM workflow draft')).toBe(true));
    await waitFor(() => expect(target.textContent).toContain('No real email was delivered'));
    expect(demoRenderers.mail_draft.records(await rows('mail_draft')).some(item => item.subject === 'PM workflow draft')).toBe(false);
  });

  it('archives the selected inbox message rather than leaving an inert action', async () => {
    await render('mail_inbox');
    await waitFor(() => expect(button('Archive')).toBeDefined());
    const before = demoRenderers.mail_inbox.records(await rows('mail_inbox'));
    const subject = requireValue(target.querySelector('article h2')).textContent;
    button('Archive').click();
    await waitFor(async () => expect((await rows('mail_inbox')).length).toBe(before.length - 1));
    expect(demoRenderers.mail_archive.records(await rows('mail_archive')).some(item => item.subject === subject)).toBe(true);
  });

  it('keeps both folders unchanged on a failed atomic move and retries once', async () => {
    await render('mail_inbox');
    await waitFor(() => expect(button('Archive')).toBeDefined());
    const before = (await rows('mail_archive')).length;
    const sourceBefore = await rows('mail_inbox');
    const fail = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw new Error('Storage full'); });
    button('Archive').click();
    await waitFor(() => expect(target.textContent).toContain('Source and destination are unchanged'));
    expect(await rows('mail_archive')).toHaveLength(before);
    expect(await rows('mail_inbox')).toEqual(sourceBefore);
    button('Archive').click();
    await waitFor(() => expect(target.textContent).toContain('Message moved.'));
    expect(await rows('mail_archive')).toHaveLength(before + 1);
    expect(fail).toHaveBeenCalledTimes(2);
  });

  it('retains an unsent draft after storage failure and atomically sends it on retry', async () => {
    await render('mail_draft');
    await waitFor(() => expect(button('Continue draft')).toBeDefined());
    button('Continue draft').click();
    await tick();
    fill(requireValue(target.querySelector('input[type="email"]')), 'pm@example.com');
    await tick();
    const before = (await rows('mail_sent')).length;
    const draftsBefore = await rows('mail_draft');
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw new Error('Storage full'); });
    requireValue(target.querySelector('form')).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => expect(target.textContent).toContain('Operation incomplete'));
    expect(await rows('mail_sent')).toHaveLength(before);
    expect(await rows('mail_draft')).toEqual(draftsBefore);
    await waitFor(() => expect(button('Send locally').disabled).toBe(false));
    requireValue(target.querySelector('form')).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => expect(target.textContent).toContain('No real email was delivered'));
    expect(await rows('mail_sent')).toHaveLength(before + 1);
    expect(await rows('mail_draft')).toHaveLength(draftsBefore.length - 1);
  });

  it('resumes collapsed mail and protects unsaved content when changing folders', async () => {
    await render('mail_inbox');
    button('Compose').click();
    await tick();
    fill(requireValue(target.querySelector('textarea')), 'Keep this unsaved message');
    await tick();
    button('Collapse').click();
    await tick();
    button('Resume editing').click();
    await tick();
    expect(requireValue(target.querySelector('textarea')).value).toBe('Keep this unsaved message');
    button('Collapse').click();
    await tick();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    requireValue(target.querySelector('nav a[href="#/mail_draft"]')).dispatchEvent(event);
    expect(confirm).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    button('Resume editing').click();
    await tick();
    expect(requireValue(target.querySelector('textarea')).value).toBe('Keep this unsaved message');
  });

  it('retains unsaved mail when local persistence rejects', async () => {
    await render('mail_inbox');
    button('Compose').click();
    await tick();
    fill(requireValue(target.querySelector('input:not([type="email"])')), 'Storage failure');
    fill(requireValue(target.querySelector('textarea')), 'Retain the body');
    await tick();
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    button('Save draft').click();
    await waitFor(() => expect(target.textContent).toContain('Operation incomplete'));
    expect(requireValue(target.querySelector('textarea')).value).toBe('Retain the body');
    expect(target.textContent).not.toContain('Draft saved.');
  });

  it('runs the actual read-only chat provider and saves a new thread from an empty selection', async () => {
    await render('ai_conversations', '#/ai_conversations?view=new');
    await waitFor(() => expect(target.querySelector('textarea')).not.toBeNull());
    fill(requireValue(target.querySelector('textarea')), 'Which products have low stock?');
    await waitFor(() => expect(button('Send').disabled).toBe(false));
    requireValue(target.querySelector('form')).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(async () => expect(demoRenderers.ai_conversations.records(await rows('ai_conversations')).some(item => item.title === 'Which products have low stock?' && item.lastMessage.includes('Low-stock products:'))).toBe(true));
    expect(window.location.hash).not.toBe('#/ai_conversations?view=new');
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('keeps calendar failures inline and retries only the calendar without writes', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    const writes = [
      vi.spyOn(inMemoryDataProvider, 'create'),
      vi.spyOn(inMemoryDataProvider, 'updateMany'),
      vi.spyOn(inMemoryDataProvider, 'deleteMany'),
    ];
    await render('calendar_events', '#/calendar_events', 'calendar_events');
    const expectFailure = () => {
      expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1);
      expect(target.textContent).not.toContain('Total events');
      expect(target.textContent).not.toContain('No matching events');
      expect(target.textContent).not.toContain('Expected test failure');
      expect(notificationProvider.open).not.toHaveBeenCalled();
    };
    await waitFor(expectFailure);
    const requests = vi.mocked(inMemoryDataProvider.getList);
    button('Retry').click();
    await waitFor(() => {
      expect(requests).toHaveBeenCalledTimes(2);
      expectFailure();
    });
    requests.mockImplementation(getList);
    button('Retry').click();
    await waitFor(() => {
      expect(target.querySelector('[data-svadmin-data-state="error"]')).toBeNull();
      expect(target.textContent).toContain('Total events');
      expect(button('Agenda')).toBeDefined();
    });
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['calendar_events', 'calendar_events', 'calendar_events']);
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('retains an AI draft without invoking the assistant or a write until the failed list recovers', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    const writes = [
      vi.spyOn(inMemoryDataProvider, 'create'),
      vi.spyOn(inMemoryDataProvider, 'updateMany'),
      vi.spyOn(inMemoryDataProvider, 'deleteMany'),
    ];
    await render('ai_conversations', '#/ai_conversations?view=new', 'ai_conversations');
    await waitFor(() => expect(target.querySelector('[data-svadmin-data-state="error"]')).not.toBeNull());
    const textarea = requireValue(target.querySelector('textarea'));
    fill(textarea, 'Which products have low stock?');
    await tick();
    expect(button('Send').disabled).toBe(true);
    requireValue(target.querySelector('form')).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await tick();
    const requests = vi.mocked(inMemoryDataProvider.getList);
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['ai_conversations']);
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(textarea.value).toBe('Which products have low stock?');
    expect(notificationProvider.open).not.toHaveBeenCalled();
    requests.mockImplementation(getList);
    button('Retry').click();
    await waitFor(() => expect(button('Send').disabled).toBe(false));
    expect(textarea.value).toBe('Which products have low stock?');
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['ai_conversations', 'ai_conversations']);
    for (const write of writes) expect(write).not.toHaveBeenCalled();
  });

  it.each(['templates', 'settings'])('does not query hidden AI history in the %s view and resumes on return', async view => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    const requests = vi.spyOn(inMemoryDataProvider, 'getList').mockRejectedValue(new Error('Expected test failure'));
    await render('ai_conversations', `#/ai_conversations?view=${view}`);
    await waitFor(() => expect(target.textContent).toContain(view === 'templates' ? 'Use template' : 'Data source: current example data'));
    expect(requests).not.toHaveBeenCalled();
    expect(notificationProvider.open).not.toHaveBeenCalled();
    window.location.hash = '#/ai_conversations';
    window.dispatchEvent(new Event('hashchange'));
    await waitFor(() => expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1));
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['ai_conversations']);
    expect(notificationProvider.open).not.toHaveBeenCalled();
    requests.mockImplementation(getList);
    button('Retry').click();
    await waitFor(() => expect(target.querySelector('a[href^="#/ai_conversations/show/"]')).not.toBeNull());
    expect(requests.mock.calls.map(([params]) => params.resource)).toEqual(['ai_conversations', 'ai_conversations']);
  });

  it.each(['create', 'updateMany'] as const)('retains the AI draft and history when %s fails and saves once on retry', async operation => {
    const before = await rows('ai_conversations');
    const create = vi.spyOn(inMemoryDataProvider, 'create');
    const update = vi.spyOn(inMemoryDataProvider, 'updateMany');
    const remove = vi.spyOn(inMemoryDataProvider, 'deleteMany');
    const failure = operation === 'create' ? create : update;
    failure.mockRejectedValueOnce(new Error('Private mutation failure'));
    await render('ai_conversations', operation === 'create' ? '#/ai_conversations?view=new' : '#/ai_conversations?thread=1');
    await waitFor(() => expect(button('Clear local history').disabled).toBe(false));
    const textarea = requireValue(target.querySelector('textarea'));
    const question = 'Which products have low stock?';
    fill(textarea, question);
    await tick();
    button('Send').click();
    await waitFor(() => {
      expect(target.textContent).toContain('Analysis or save failed. Your question is retained.');
      expect(button('Send').disabled).toBe(false);
    });
    expect(textarea.value).toBe(question);
    expect(await rows('ai_conversations')).toEqual(before);
    expect(target.textContent).not.toContain('Private mutation failure');
    expect(target.querySelectorAll('[data-app-page="ai-workspace"] > div > [role="status"]')).toHaveLength(1);
    expect(notificationProvider.open).not.toHaveBeenCalled();
    button('Send').click();
    await waitFor(() => {
      expect(textarea.value).toBe('');
      expect(target.textContent).toContain('Low-stock products:');
      expect(target.textContent).not.toContain('Analysis or save failed.');
    });
    expect(failure).toHaveBeenCalledTimes(2);
    expect(operation === 'create' ? update : create).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    const after = demoRenderers.ai_conversations.records(await rows('ai_conversations'));
    expect(after).toHaveLength(before.length + (operation === 'create' ? 1 : 0));
    if (operation === 'create') {
      expect(after.filter(item => item.title === question)).toHaveLength(1);
    } else {
      expect(after.find(item => item.id === 1)?.lastMessage).toContain('Low-stock products:');
      expect(update.mock.calls.every(([params]) => params.resource === 'ai_conversations' && params.ids.length === 1 && params.ids[0] === 1)).toBe(true);
    }
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it.each(['rejection', 'empty'] as const)('retains the AI question without writing after an assistant %s', async failure => {
    const sendMessage = vi.fn<ChatProvider['sendMessage']>().mockResolvedValue('Local test answer');
    if (failure === 'rejection') sendMessage.mockRejectedValueOnce(new Error('Private assistant failure'));
    else sendMessage.mockResolvedValueOnce('');
    const before = await rows('ai_conversations');
    const create = vi.spyOn(inMemoryDataProvider, 'create');
    const update = vi.spyOn(inMemoryDataProvider, 'updateMany');
    const remove = vi.spyOn(inMemoryDataProvider, 'deleteMany');
    await render('ai_conversations', '#/ai_conversations?view=new', '', 'workspace', { sendMessage });
    await waitFor(() => expect(button('Clear local history').disabled).toBe(false));
    const textarea = requireValue(target.querySelector('textarea'));
    fill(textarea, 'Keep this question');
    await tick();
    button('Send').click();
    await waitFor(() => {
      expect(target.textContent).toContain('Analysis or save failed. Your question is retained.');
      expect(button('Send').disabled).toBe(false);
    });
    expect(textarea.value).toBe('Keep this question');
    expect(target.textContent).not.toContain('Private assistant failure');
    expect(await rows('ai_conversations')).toEqual(before);
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(notificationProvider.open).not.toHaveBeenCalled();
    button('Send').click();
    await waitFor(() => {
      expect(textarea.value).toBe('');
      expect(target.textContent).toContain('Local test answer');
    });
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledOnce();
    expect(await rows('ai_conversations')).toHaveLength(before.length + 1);
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('retains AI history and favorites after failed deletion and clears only after successful retry', async () => {
    sessionStorage.setItem('svadmin-example-ai-favorites', '[1]');
    const before = await rows('ai_conversations');
    const remove = vi.spyOn(inMemoryDataProvider, 'deleteMany').mockRejectedValueOnce(new Error('Private deletion failure'));
    await render('ai_conversations');
    await waitFor(() => expect(button('Clear local history').disabled).toBe(false));
    button('Clear local history').click();
    await waitFor(() => {
      expect(target.textContent).toContain('Unable to clear history. Retry.');
      expect(button('Clear local history').disabled).toBe(false);
    });
    expect(await rows('ai_conversations')).toEqual(before);
    expect(sessionStorage.getItem('svadmin-example-ai-favorites')).toBe('[1]');
    expect(target.querySelector('button[aria-label="Favorite thread"][aria-pressed="true"]')).not.toBeNull();
    expect(target.textContent).not.toContain('Private deletion failure');
    expect(notificationProvider.open).not.toHaveBeenCalled();
    button('Clear local history').click();
    await waitFor(() => expect(target.textContent).toContain('Local history cleared.'));
    expect(await rows('ai_conversations')).toHaveLength(0);
    expect(sessionStorage.getItem('svadmin-example-ai-favorites')).toBe('[]');
    expect(remove).toHaveBeenCalledTimes(2);
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('keeps a successful AI save distinct from a failed list refresh and retries only the read', async () => {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    const before = await rows('ai_conversations');
    const create = vi.spyOn(inMemoryDataProvider, 'create');
    const update = vi.spyOn(inMemoryDataProvider, 'updateMany');
    const requests = vi.spyOn(inMemoryDataProvider, 'getList').mockImplementation(async <T extends BaseRecord = BaseRecord>(params: Parameters<DataProvider['getList']>[0]) => {
      if (params.resource === 'ai_conversations' && create.mock.calls.length) throw new Error('Private refresh failure');
      return getList<T>(params);
    });
    await render('ai_conversations', '#/ai_conversations?view=new');
    await waitFor(() => expect(button('Clear local history').disabled).toBe(false));
    const textarea = requireValue(target.querySelector('textarea'));
    fill(textarea, 'Which products have low stock?');
    await tick();
    button('Send').click();
    await waitFor(() => {
      expect(target.querySelectorAll('[data-svadmin-data-state="error"]')).toHaveLength(1);
      expect(textarea.value).toBe('');
      expect(window.location.hash).toMatch(/^#\/ai_conversations\?thread=\d+$/);
    });
    expect(target.textContent).not.toContain('Analysis or save failed.');
    expect(target.textContent).not.toContain('Private refresh failure');
    expect(target.querySelector('a[href^="#/ai_conversations/show/"]')).toBeNull();
    expect(button('Send').disabled).toBe(true);
    const after = demoRenderers.ai_conversations.records((await getList({ resource: 'ai_conversations', pagination: { mode: 'off' } })).data);
    expect(after).toHaveLength(before.length + 1);
    const created = requireValue(after.find(item => item.title === 'Which products have low stock?'));
    expect(created.lastMessage).toContain('Low-stock products:');
    expect(create).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
    const readCount = requests.mock.calls.length;
    requests.mockImplementation(getList);
    button('Retry').click();
    await waitFor(() => expect(target.querySelector(`a[href^="#/ai_conversations/show/${created.id}"]`)).not.toBeNull());
    expect(target.textContent).toContain('Low-stock products:');
    expect(requests.mock.calls.slice(readCount).map(([params]) => params.resource)).toEqual(['ai_conversations']);
    expect(create).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('retries only favorite persistence if storage rejects after AI history was deleted', async () => {
    sessionStorage.setItem('svadmin-example-ai-favorites', '[1]');
    const remove = vi.spyOn(inMemoryDataProvider, 'deleteMany');
    const save = vi.spyOn(workspaceSession, 'saveIds')
      .mockReturnValueOnce(false)
      .mockImplementation((key, ids) => {
        sessionStorage.setItem(key, JSON.stringify(ids));
        return true;
      });
    await render('ai_conversations');
    await waitFor(() => expect(button('Clear local history').disabled).toBe(false));
    button('Clear local history').click();
    await waitFor(() => expect(target.textContent).toContain('Local history cleared, but favorites could not be cleared. Retry.'));
    expect(await rows('ai_conversations')).toHaveLength(0);
    expect(sessionStorage.getItem('svadmin-example-ai-favorites')).toBe('[1]');
    expect(save).toHaveBeenCalledOnce();
    expect(notificationProvider.open).not.toHaveBeenCalled();
    button('Retry clearing old favorites').click();
    await waitFor(() => expect(target.textContent).toContain('Favorites cleared.'));
    expect(sessionStorage.getItem('svadmin-example-ai-favorites')).toBe('[]');
    expect([...target.querySelectorAll('button')].some(item => item.textContent === 'Retry clearing old favorites')).toBe(false);
    expect(save).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledOnce();
    expect(notificationProvider.open).not.toHaveBeenCalled();
  });

  it('shows permission effects in the selected role summary', async () => {
    await render('roles');
    await waitFor(() => expect(target.textContent).toContain('Inventory Admin'));
    expect(target.textContent).toMatch(/allow|Allow/);
  });

  it('requires confirmation before deleting local AI history', async () => {
    await render('ai_conversations');
    await waitFor(() => expect(button('Clear local history').disabled).toBe(false));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const before = (await rows('ai_conversations')).length;
    button('Clear local history').click();
    expect((await rows('ai_conversations')).length).toBe(before);
    confirm.mockReturnValue(true);
    button('Clear local history').click();
    await waitFor(async () => expect(await rows('ai_conversations')).toHaveLength(0));
    await waitFor(() => expect(target.textContent).toContain('Local history cleared.'));
  });
});
