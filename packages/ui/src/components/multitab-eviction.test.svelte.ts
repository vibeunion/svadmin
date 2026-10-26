import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import MultiTabKeepAlive, {
  type WorkspaceTab,
  type WorkspaceTabOpenResult,
} from './MultiTabKeepAlive.svelte';

afterEach(cleanup);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushPending(): Promise<void> {
  await Promise.resolve();
  await tick();
  await Promise.resolve();
}

type TabHandle = {
  openTab: (tab: WorkspaceTab) => Promise<WorkspaceTabOpenResult>;
};

function openTab(view: { component: unknown }, tab: WorkspaceTab): Promise<WorkspaceTabOpenResult> {
  return (view.component as TabHandle).openTab(tab);
}

function createTabs(): WorkspaceTab[] {
  return [
    { id: 'home', title: 'Home', path: '/home', pinned: true },
    { id: 'orders', title: 'Orders', path: '/orders', closable: true },
    { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    { id: 'draft', title: 'Invoice draft', path: '/invoices/new', dirty: true },
  ];
}

function tabNames(view: { container: HTMLElement }): string[] {
  return [...view.container.querySelectorAll<HTMLElement>('[role="tab"]')]
    .map((tab) => tab.textContent?.trim() ?? '');
}

describe('MultiTabKeepAlive optional maxTabs admission', () => {
  it('opens without a limit and never reports a limit reached', async () => {
    const tabs = createTabs();
    const onselect = vi.fn();
    const onclose = vi.fn();
    const onTabLimitReached = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      onselect,
      onclose,
      onTabLimitReached,
    });

    const result = await openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });

    expect(result).toMatchObject({ status: 'opened' });
    if (result.status === 'rejected') throw new Error(result.reason);
    expect(result.evictedTabIds).toEqual([]);
    expect(onclose).not.toHaveBeenCalled();
    expect(onTabLimitReached).not.toHaveBeenCalled();
    expect(onselect).toHaveBeenCalledWith(expect.objectContaining({ id: 'reports' }));
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail', 'Invoice draft', 'Reports']);
    expect(view.getByRole('tab', { name: 'Reports' }).getAttribute('aria-selected')).toBe('true');
  });

  it('keeps host-assigned tabs when maxTabs is lowered and only reports on open attempt', async () => {
    const tabs = createTabs();
    const onclose = vi.fn();
    const onTabLimitReached = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      maxTabs: 3,
      onclose,
      onTabLimitReached,
    });

    await view.rerender({ maxTabs: 1 });
    expect(onclose).not.toHaveBeenCalled();
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail', 'Invoice draft']);

    const result = await openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });

    expect(result).toMatchObject({ status: 'rejected', reason: 'limit-reached' });
    expect(onTabLimitReached).toHaveBeenCalledTimes(1);
    expect(onclose).not.toHaveBeenCalled();
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail', 'Invoice draft']);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects an invalid maxTabs value %s without changing tabs',
    async (maxTabs) => {
      const tabs = createTabs();
      const onclose = vi.fn();
      const onselect = vi.fn();
      const onTabLimitReached = vi.fn();
      const view = render(MultiTabKeepAlive, {
        tabs,
        activeTabId: 'orders',
        maxTabs,
        onclose,
        onselect,
        onTabLimitReached,
      });

      const result = await openTab(view, {
        id: 'reports',
        title: 'Reports',
        path: '/reports',
        closable: true,
      });

      expect(result).toMatchObject({ status: 'rejected', reason: 'invalid-max-tabs' });
      expect(onselect).not.toHaveBeenCalled();
      expect(onclose).not.toHaveBeenCalled();
      expect(onTabLimitReached).not.toHaveBeenCalled();
      expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail', 'Invoice draft']);
    },
  );

  it('selects an existing same-id same-path tab without inserting a duplicate', async () => {
    const tabs = createTabs();
    const onselect = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 3,
      onselect,
    });

    const result = await openTab(view, {
      id: 'orders',
      title: 'Orders again',
      path: '/orders',
    });

    expect(result).toMatchObject({ status: 'selected', tab: expect.objectContaining({ id: 'orders' }) });
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail', 'Invoice draft']);
    expect(view.getByRole('tab', { name: 'Orders' }).getAttribute('aria-selected')).toBe('true');
    expect(onselect).toHaveBeenCalledWith(expect.objectContaining({ id: 'orders' }));
  });

  it('rejects a reused id with a different path instead of mixing draft routes', async () => {
    const tabs = createTabs();
    const onselect = vi.fn();
    const onclose = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      maxTabs: 3,
      onselect,
      onclose,
    });

    const result = await openTab(view, {
      id: 'draft',
      title: 'Invoice draft',
      path: '/invoices/other',
      dirty: true,
    });

    expect(result).toMatchObject({ status: 'rejected', reason: 'duplicate-id-path-mismatch' });
    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();
    expect(onselect).not.toHaveBeenCalled();
    expect(onclose).not.toHaveBeenCalled();
  });
});

describe('MultiTabKeepAlive LRU and quota protection', () => {
  it('evicts the least recently accessed non-fixed tab by actual tab access order', async () => {
    const tabs = createTabs();
    const onclose = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 3,
      onclose,
    });

    await fireEvent.click(view.getByRole('tab', { name: 'Orders' }));
    await fireEvent.click(view.getByRole('tab', { name: 'Mail' }));
    await fireEvent.click(view.getByRole('tab', { name: 'Invoice draft' }));
    await fireEvent.click(view.getByRole('tab', { name: 'Home' }));

    const result = await openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });

    expect(result).toMatchObject({ status: 'opened', evictedTabIds: ['orders'] });
    expect(onclose).toHaveBeenCalledWith('orders');
    expect(tabNames(view)).toEqual(['Home', 'Mail', 'Invoice draft', 'Reports']);
  });

  it('counts refresh and external active changes as access for LRU ordering', async () => {
    const tabs = createTabs();
    const onrefresh = vi.fn();
    const onclose = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 3,
      onrefresh,
      onclose,
    });

    await view.rerender({ activeTabId: 'orders' });
    await view.rerender({ activeTabId: 'mail' });
    await view.rerender({ activeTabId: 'draft' });
    await view.rerender({ activeTabId: 'orders' });
    await fireEvent.click(view.getByRole('button', { name: 'Refresh Orders' }));
    await view.rerender({ activeTabId: 'home' });

    const result = await openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });

    expect(onrefresh).toHaveBeenCalledWith(expect.objectContaining({ id: 'orders' }));
    expect(result).toMatchObject({ status: 'opened', evictedTabIds: ['mail'] });
    expect(onclose).toHaveBeenCalledWith('mail');
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Invoice draft', 'Reports']);
  });

  it('keeps LRU order across host immutable tab copies', async () => {
    const tabs = createTabs();
    const onclose = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 3,
      onclose,
    });

    await fireEvent.click(view.getByRole('tab', { name: 'Mail' }));
    await fireEvent.click(view.getByRole('tab', { name: 'Orders' }));
    await view.rerender({ activeTabId: 'home' });
    await view.rerender({ tabs: tabs.map((tab) => ({ ...tab })), activeTabId: 'home' });

    const result = await openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });

    expect(result).toMatchObject({ status: 'opened', evictedTabIds: ['mail'] });
    expect(onclose).toHaveBeenCalledWith('mail');
    expect(onclose).not.toHaveBeenCalledWith('orders');
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Invoice draft', 'Reports']);
  });

  it('does not inherit access order for the same id on a different path', async () => {
    const tabs = createTabs();
    const onclose = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 3,
      onclose,
    });

    await fireEvent.click(view.getByRole('tab', { name: 'Orders' }));
    await fireEvent.click(view.getByRole('tab', { name: 'Mail' }));
    await view.rerender({
      tabs: [
        tabs[0] as WorkspaceTab,
        { id: 'orders', title: 'Orders', path: '/orders/archived', closable: true },
        tabs[2] as WorkspaceTab,
        tabs[3] as WorkspaceTab,
      ],
      activeTabId: 'home',
    });

    const result = await openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });

    expect(result).toMatchObject({ status: 'opened', evictedTabIds: ['orders'] });
    expect(onclose).toHaveBeenCalledWith('orders');
    expect(onclose).not.toHaveBeenCalledWith('mail');
  });

  it('counts only non-fixed tabs against maxTabs and never evicts a fixed tab', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const onclose = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
    });

    const result = await openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });

    expect(result).toMatchObject({ status: 'opened', evictedTabIds: ['orders'] });
    expect(onclose).toHaveBeenCalledWith('orders');
    expect(onclose).not.toHaveBeenCalledWith('home');
    expect(tabNames(view)).toEqual(['Home', 'Mail', 'Reports']);
  });

  it('reports a limit without changing tabs when every non-fixed tab is protected', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'draft', title: 'Invoice draft', path: '/invoices/new', dirty: true },
      { id: 'readonly', title: 'Readonly', path: '/readonly', closable: false },
    ];
    const onclose = vi.fn();
    const onTabLimitReached = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      maxTabs: 3,
      onclose,
      onTabLimitReached,
    });

    const result = await openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });

    expect(result).toMatchObject({ status: 'rejected', reason: 'limit-reached' });
    expect(onTabLimitReached).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'no-safe-candidate',
        maxTabs: 3,
        tab: expect.objectContaining({ id: 'reports' }),
      }),
    );
    expect(onclose).not.toHaveBeenCalled();
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Invoice draft', 'Readonly']);
  });

  it('admits a fixed tab beyond the non-fixed quota without eviction', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const onclose = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      maxTabs: 2,
      onclose,
    });

    const result = await openTab(view, {
      id: 'pinned-report',
      title: 'Pinned report',
      path: '/reports/pinned',
      pinned: true,
    });

    expect(result).toMatchObject({ status: 'opened', evictedTabIds: [] });
    expect(onclose).not.toHaveBeenCalled();
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail', 'Pinned report']);
  });

  it('admits an explicit pinned tab even when the host already exceeds a lowered quota', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const onclose = vi.fn();
    const onTabLimitReached = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      maxTabs: 1,
      onclose,
      onTabLimitReached,
    });

    const result = await openTab(view, {
      id: 'pinned-report',
      title: 'Pinned report',
      path: '/reports/pinned',
      pinned: true,
    });

    expect(result).toMatchObject({ status: 'opened', evictedTabIds: [] });
    expect(onclose).not.toHaveBeenCalled();
    expect(onTabLimitReached).not.toHaveBeenCalled();
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail', 'Pinned report']);
  });

  it('evicts from a frozen caller array without mutating or replacing its elements', async () => {
    const source: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const tabs = Object.freeze(source) as unknown as WorkspaceTab[];
    const onclose = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
    });

    const result = await openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });

    expect(result).toMatchObject({ status: 'opened', evictedTabIds: ['orders'] });
    expect(tabs).toHaveLength(3);
    expect(tabs.map((tab) => tab.id)).toEqual(['home', 'orders', 'mail']);
    expect(source.map((tab) => tab.id)).toEqual(['home', 'orders', 'mail']);
    expect(tabNames(view)).toEqual(['Home', 'Mail', 'Reports']);
  });
});

describe('MultiTabKeepAlive guarded eviction atomicity', () => {
  it('does not half-remove tabs when an eviction guard refuses', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const onclose = vi.fn();
    const onselect = vi.fn();
    const onbeforeclose = vi.fn(() => false);
    const onTabLimitReached = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onselect,
      onbeforeclose,
      onTabLimitReached,
    });

    const result = await openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });

    expect(result).toMatchObject({ status: 'rejected', reason: 'eviction-declined' });
    expect(onbeforeclose).toHaveBeenCalledWith(expect.objectContaining({ id: 'orders' }));
    expect(onTabLimitReached).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'eviction-declined' }),
    );
    expect(onclose).not.toHaveBeenCalled();
    expect(onselect).not.toHaveBeenCalled();
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail']);
  });

  it('treats a thrown eviction guard as protection and keeps all tabs', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(async () => {
      throw new Error('guard unavailable');
    });
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onbeforeclose,
    });

    const result = await openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });

    expect(result).toMatchObject({ status: 'rejected', reason: 'eviction-declined' });
    expect(onclose).not.toHaveBeenCalled();
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail']);
  });

  it.each([undefined, 'yes', 1])(
    'fails closed unless the automatic eviction guard resolves exactly true (%s)',
    async (guardResult) => {
      const tabs: WorkspaceTab[] = [
        { id: 'home', title: 'Home', path: '/home', pinned: true },
        { id: 'orders', title: 'Orders', path: '/orders', closable: true },
        { id: 'mail', title: 'Mail', path: '/mail', closable: true },
      ];
      const onclose = vi.fn();
      const onselect = vi.fn();
      const onTabLimitReached = vi.fn();
      const onbeforeclose = vi.fn(async () => guardResult as unknown as boolean);
      const view = render(MultiTabKeepAlive, {
        tabs,
        activeTabId: 'home',
        maxTabs: 2,
        onclose,
        onselect,
        onbeforeclose,
        onTabLimitReached,
      });

      const result = await openTab(view, {
        id: 'reports',
        title: 'Reports',
        path: '/reports',
        closable: true,
      });

      expect(result).toMatchObject({ status: 'rejected', reason: 'eviction-declined' });
      expect(onTabLimitReached).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'eviction-declined' }),
      );
      expect(onclose).not.toHaveBeenCalled();
      expect(onselect).not.toHaveBeenCalled();
      expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail']);
    },
  );

  it('keeps every tab when the first of two required evictions is confirmed and the second refused', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
      { id: 'settings', title: 'Settings', path: '/settings', closable: true },
    ];
    const onclose = vi.fn();
    const onselect = vi.fn();
    const onTabLimitReached = vi.fn();
    const onbeforeclose = vi.fn(async () => onbeforeclose.mock.calls.length === 1);
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onselect,
      onbeforeclose,
      onTabLimitReached,
    });

    const result = await openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });

    expect(onbeforeclose).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ status: 'rejected', reason: 'eviction-declined' });
    expect(onTabLimitReached).toHaveBeenCalledTimes(1);
    expect(onclose).not.toHaveBeenCalled();
    expect(onselect).not.toHaveBeenCalled();
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail', 'Settings']);
  });

  it('aborts without half-removal when a candidate becomes dirty while waiting', async () => {
    const tabs: [WorkspaceTab, WorkspaceTab, WorkspaceTab] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const candidate = tabs[1];
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onbeforeclose,
    });

    const opening = openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledTimes(1);
    });
    candidate.dirty = true;
    pending.resolve(true);

    expect(await opening).toMatchObject({ status: 'rejected', reason: 'stale-state' });
    expect(onclose).not.toHaveBeenCalled();
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail']);
  });

  it('aborts when the candidate becomes active or maxTabs changes while waiting', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onbeforeclose,
    });

    const opening = openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledTimes(1);
    });
    await view.rerender({ activeTabId: 'orders' });
    pending.resolve(true);

    expect(await opening).toMatchObject({ status: 'rejected', reason: 'stale-state' });
    expect(onclose).not.toHaveBeenCalled();
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail']);
  });

  it('aborts when a new array replaces the candidate during confirmation', async () => {
    const tabs: [WorkspaceTab, WorkspaceTab, WorkspaceTab] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onbeforeclose,
    });

    const opening = openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledTimes(1);
    });
    await view.rerender({
      tabs: [
        tabs[0],
        { id: 'orders', title: 'Orders', path: '/orders/reopened', closable: true },
        tabs[2],
      ],
    });
    pending.resolve(true);
    await flushPending();

    expect(await opening).toMatchObject({ status: 'rejected', reason: 'stale-state' });
    expect(onclose).not.toHaveBeenCalled();
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail']);
  });

  it('aborts on in-place array growth during confirmation', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onselect = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onselect,
      onbeforeclose,
    });

    const opening = openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledTimes(1);
    });
    tabs.push({ id: 'settings', title: 'Settings', path: '/settings', closable: true });
    pending.resolve(true);

    expect(await opening).toMatchObject({ status: 'rejected', reason: 'stale-state' });
    expect(onclose).not.toHaveBeenCalled();
    expect(onselect).not.toHaveBeenCalled();
  });

  it('aborts on an in-place array reorder during confirmation', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onbeforeclose,
    });

    const opening = openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledTimes(1);
    });
    tabs.reverse();
    pending.resolve(true);

    expect(await opening).toMatchObject({ status: 'rejected', reason: 'stale-state' });
    expect(onclose).not.toHaveBeenCalled();
  });

  it('aborts when a non-candidate tab changes quota or identity fields while waiting', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'settings', title: 'Settings', path: '/settings', pinned: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onTabLimitReached = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      maxTabs: 2,
      onclose,
      onbeforeclose,
      onTabLimitReached,
    });

    const opening = openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledWith(expect.objectContaining({ id: 'mail' }));
    });
    (tabs[2] as WorkspaceTab).pinned = false;
    pending.resolve(true);

    expect(await opening).toMatchObject({ status: 'rejected', reason: 'stale-state' });
    expect(onTabLimitReached).not.toHaveBeenCalled();
    expect(onclose).not.toHaveBeenCalled();
    expect(view.getByRole('tab', { name: 'Mail' })).toBeTruthy();
  });

  it('aborts when an unrelated tab dirty flag changes while waiting', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onbeforeclose,
    });

    const opening = openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledTimes(1);
    });
    (tabs[2] as WorkspaceTab).dirty = true;
    pending.resolve(true);

    expect(await opening).toMatchObject({ status: 'rejected', reason: 'stale-state' });
    expect(onclose).not.toHaveBeenCalled();
  });

  it('aborts when the active tab switches to a non-candidate while waiting', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onbeforeclose,
    });

    const opening = openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledWith(expect.objectContaining({ id: 'orders' }));
    });
    await view.rerender({ activeTabId: 'mail' });
    pending.resolve(true);

    expect(await opening).toMatchObject({ status: 'rejected', reason: 'stale-state' });
    expect(onclose).not.toHaveBeenCalled();
  });

  it('aborts when the incoming tab id changes to an existing id while waiting', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const incoming: WorkspaceTab = {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    };
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onbeforeclose,
    });

    const opening = openTab(view, incoming);
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledTimes(1);
    });
    incoming.id = 'mail';
    pending.resolve(true);

    expect(await opening).toMatchObject({ status: 'rejected', reason: 'stale-state' });
    expect(onclose).not.toHaveBeenCalled();
    expect(tabNames(view)).toEqual(['Home', 'Orders', 'Mail']);
  });

  it('aborts when the close guard is replaced while eviction is waiting', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);
    const replacementGuard = vi.fn(async () => true);
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onbeforeclose,
    });

    const opening = openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledTimes(1);
    });
    await view.rerender({ onbeforeclose: replacementGuard });
    pending.resolve(true);

    expect(await opening).toMatchObject({ status: 'rejected', reason: 'stale-state' });
    expect(replacementGuard).not.toHaveBeenCalled();
    expect(onclose).not.toHaveBeenCalled();
  });

  it('never commits after unmount while an eviction guard is pending', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onselect = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onselect,
      onbeforeclose,
    });

    const opening = openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledTimes(1);
    });
    view.unmount();
    pending.resolve(true);

    expect(await opening).toMatchObject({ status: 'rejected', reason: 'unmounted' });
    expect(onclose).not.toHaveBeenCalled();
    expect(onselect).not.toHaveBeenCalled();
  });

  it('shares the close lock so concurrent open attempts cannot evict twice', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);
    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'home',
      maxTabs: 2,
      onclose,
      onbeforeclose,
    });

    const first = openTab(view, {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      closable: true,
    });
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledTimes(1);
    });
    const second = openTab(view, {
      id: 'settings',
      title: 'Settings',
      path: '/settings',
      closable: true,
    });

    expect(await second).toMatchObject({ status: 'rejected', reason: 'operation-in-flight' });
    expect(onbeforeclose).toHaveBeenCalledTimes(1);
    pending.resolve(true);

    expect(await first).toMatchObject({ status: 'opened', evictedTabIds: ['orders'] });
    expect(onclose).toHaveBeenCalledTimes(1);
    expect(onclose).toHaveBeenCalledWith('orders');
    expect(tabNames(view)).toEqual(['Home', 'Mail', 'Reports']);
  });
});
