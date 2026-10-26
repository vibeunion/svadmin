import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import MultiTabKeepAlive, { type WorkspaceTab } from './MultiTabKeepAlive.svelte';
import MultiTabCloseProtectionHost from './multitab-close-protection.test-host.svelte';
import { requireValue } from '../../../../scripts/test-assertions';

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
  await new Promise<void>((resolve) => setTimeout(resolve, 20));
}

function tabAt(tabs: readonly WorkspaceTab[], index: number): WorkspaceTab {
  const tab = tabs[index];
  if (!tab) throw new Error(`Missing workspace tab ${index}`);
  return tab;
}

function createTabs(): WorkspaceTab[] {
  return [
    { id: 'home', title: 'Home', path: '/home', pinned: true },
    { id: 'draft', title: 'Invoice draft', path: '/invoices/new', dirty: true },
    { id: 'orders', title: 'Orders', path: '/orders', closable: true },
  ];
}

describe('MultiTabKeepAlive close protection and removal cleanup', () => {
  it('keeps the tab and close action as separate accessible controls', () => {
    const view = render(MultiTabKeepAlive, {
      tabs: createTabs(),
      activeTabId: 'draft',
    });

    const tab = view.getByRole('tab', { name: 'Invoice draft' });
    const close = view.getByRole('button', { name: 'Close Invoice draft' });

    expect(tab.contains(close)).toBe(false);
    expect(close.parentElement).toBe(tab.parentElement);
  });

  it('marks the workspace tab list as horizontally oriented', () => {
    const view = render(MultiTabKeepAlive, {
      tabs: createTabs(),
      activeTabId: 'draft',
    });

    const tabList = view.getByRole('tablist', { name: 'Workspace tabs' });
    expect(tabList.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('names the close-all command and clears the bound active tab when nothing remains', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];
    const onclose = vi.fn();
    const oncloseall = vi.fn();

    const view = render(MultiTabCloseProtectionHost, {
      tabs,
      activeTabId: 'mail',
      onclose,
      oncloseall,
    });

    expect(view.getByTestId('tab-state').getAttribute('data-active-tab')).toBe('mail');
    const closeAll = view.getByRole('button', { name: 'Close all tabs' });
    await fireEvent.click(closeAll);

    await waitFor(() => {
      expect(view.getByTestId('tab-state').getAttribute('data-tab-count')).toBe('0');
    });
    expect(view.getByTestId('tab-state').getAttribute('data-active-tab')).toBe('');
    expect(onclose).toHaveBeenCalledWith('orders');
    expect(onclose).toHaveBeenCalledWith('mail');
    expect(onclose).toHaveBeenCalledTimes(2);
    expect(oncloseall).toHaveBeenCalledTimes(1);
    expect(view.queryByRole('tab')).toBeNull();
    expect(view.queryByRole('button', { name: 'Close all tabs' })).toBeNull();
  });

  it('keeps a dirty tab open when the close guard refuses and never reports onclose', async () => {
    const tabs = createTabs();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => false);

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'draft',
      onclose,
      onbeforeclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close Invoice draft' }));

    expect(onbeforeclose).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft' }));
    expect(onclose).not.toHaveBeenCalled();
    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Invoice draft' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(view.getByRole('tab', { name: 'Invoice draft' }).querySelector('button')).toBeNull();
    expect(view.getByRole('button', { name: 'Close Invoice draft' }).closest('[role="tab"]')).toBeNull();
  });

  it('closes the dirty tab after the guard confirms and activates the neighbour', async () => {
    const tabs = createTabs();
    const onclose = vi.fn();
    const onselect = vi.fn();
    const onbeforeclose = vi.fn(async () => true);

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'draft',
      onclose,
      onselect,
      onbeforeclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close Invoice draft' }));

    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Invoice draft' })).toBeNull();
    });
    expect(onbeforeclose).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft' }));
    expect(onclose).toHaveBeenCalledWith('draft');
    expect(onselect).toHaveBeenCalledWith(expect.objectContaining({ id: 'orders' }));
  });

  it('keeps guarded tabs during close-all and leaves a surviving tab active', async () => {
    const tabs = createTabs();
    const onclose = vi.fn();
    const oncloseall = vi.fn();
    const onbeforeclose = vi.fn((tab: WorkspaceTab) => tab.id !== 'draft');

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      onclose,
      oncloseall,
      onbeforeclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close all tabs' }));

    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Orders' })).toBeNull();
    });
    expect(onbeforeclose).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft' }));
    expect(onclose).toHaveBeenCalledWith('orders');
    expect(onclose).not.toHaveBeenCalledWith('draft');
    expect(onclose).not.toHaveBeenCalledWith('home');
    expect(oncloseall).toHaveBeenCalledTimes(1);
    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Invoice draft' }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('applies the guard when closing other tabs and reports each removed tab', async () => {
    const tabs = createTabs();
    const onclose = vi.fn();
    const oncloseothers = vi.fn();
    const onbeforeclose = vi.fn((tab: WorkspaceTab) => tab.id !== 'draft');

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      onclose,
      oncloseothers,
      onbeforeclose,
    });

    await fireEvent.contextMenu(view.getByRole('tab', { name: 'Home' }));

    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Orders' })).toBeNull();
    });
    expect(oncloseothers).toHaveBeenCalledWith('home');
    expect(onclose).toHaveBeenCalledWith('orders');
    expect(onclose).not.toHaveBeenCalledWith('draft');
    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Home' }).getAttribute('aria-selected')).toBe('true');
  });

  it('does not run the guard for pinned tabs and keeps the active tab when a background tab closes', async () => {
    const tabs = createTabs();
    const onclose = vi.fn();
    const onselect = vi.fn();
    const onbeforeclose = vi.fn(() => false);

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      onclose,
      onselect,
      onbeforeclose,
    });

    expect(view.queryByRole('button', { name: 'Close Home' })).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Close Invoice draft' }));

    expect(onbeforeclose).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft' }));
    expect(view.getByRole('tab', { name: 'Orders' }).getAttribute('aria-selected')).toBe('true');
    expect(onselect).not.toHaveBeenCalled();
    expect(onclose).not.toHaveBeenCalled();
  });

  it('treats a rejected guard as protection instead of dropping the tab', async () => {
    const tabs = createTabs();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(async () => {
      throw new Error('guard unavailable');
    });

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'draft',
      onclose,
      onbeforeclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close Invoice draft' }));

    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledTimes(1);
    });
    expect(onclose).not.toHaveBeenCalled();
    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();
  });

  it('shares one pending confirmation across repeated close clicks', async () => {
    const tabs = createTabs();
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'draft',
      onclose,
      onbeforeclose,
    });

    const close = view.getByRole('button', { name: 'Close Invoice draft' });
    await fireEvent.click(close);
    await fireEvent.click(close);

    expect(onbeforeclose).toHaveBeenCalledTimes(1);
    pending.resolve(true);

    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Invoice draft' })).toBeNull();
    });
    expect(onclose).toHaveBeenCalledTimes(1);
    expect(onclose).toHaveBeenCalledWith('draft');
  });

  it('ignores a crossing close-all while a single close confirmation is pending', async () => {
    const tabs = createTabs();
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const oncloseall = vi.fn();
    const onbeforeclose = vi.fn((_tab: WorkspaceTab) => pending.promise);

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'draft',
      onclose,
      oncloseall,
      onbeforeclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close Invoice draft' }));
    await fireEvent.click(view.getByRole('button', { name: 'Close all tabs' }));

    expect(onbeforeclose.mock.calls.filter(([tab]) => tab?.id === 'draft')).toHaveLength(1);
    // 关闭操作锁生效，交叉的批量请求直接忽略。
    expect(onbeforeclose.mock.calls.filter(([tab]) => tab?.id === 'orders')).toHaveLength(0);
    pending.resolve(true);

    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Invoice draft' })).toBeNull();
    });
    await flushPending();

    expect(view.getByRole('tab', { name: 'Orders' })).toBeTruthy();
    expect(onclose.mock.calls.filter(([id]) => id === 'draft')).toHaveLength(1);
    expect(onclose).toHaveBeenCalledTimes(1);
    expect(oncloseall).not.toHaveBeenCalled();
  });

  it('does not delete a replacement tab that reuses the same id while confirmation is pending', async () => {
    const tabs = createTabs();
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'draft',
      onclose,
      onbeforeclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close Invoice draft' }));
    await view.rerender({
      tabs: [tabAt(tabs, 0), { id: 'draft', title: 'Invoice draft', path: '/invoices/other', dirty: true }, tabAt(tabs, 2)],
    });
    pending.resolve(true);
    await flushPending();

    expect(onclose).not.toHaveBeenCalled();
    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();
  });

  it('rechecks pinned state on the original tab after confirmation', async () => {
    const tabs = createTabs();
    const dirtyTab = requireValue(tabAt(tabs, 1));
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'draft',
      onclose,
      onbeforeclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close Invoice draft' }));
    dirtyTab.pinned = true;
    pending.resolve(true);
    await flushPending();

    expect(onbeforeclose).toHaveBeenCalledTimes(1);
    expect(onclose).not.toHaveBeenCalled();
    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();
  });

  it('rechecks closable state on the original tab during close-all', async () => {
    const tabs = createTabs();
    const dirtyTab = requireValue(tabAt(tabs, 1));
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn((tab: WorkspaceTab) =>
      tab.id === 'orders' ? true : pending.promise,
    );

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      onclose,
      onbeforeclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close all tabs' }));
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft' }));
    });
    dirtyTab.closable = false;
    pending.resolve(true);

    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Orders' })).toBeNull();
    });
    expect(onclose).not.toHaveBeenCalledWith('draft');
    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();
  });

  it('suppresses delivery when the component unmounts before confirmation resolves', async () => {
    const tabs = createTabs();
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'draft',
      onclose,
      onbeforeclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close Invoice draft' }));
    view.unmount();
    pending.resolve(true);
    await flushPending();

    expect(onbeforeclose).toHaveBeenCalledTimes(1);
    expect(onclose).not.toHaveBeenCalled();
  });

  it('never lets an older close-all batch delete a reopened tab with the same id', async () => {
    const tabs = createTabs();
    const pendingOrders = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn((tab: WorkspaceTab) =>
      tab.id === 'orders' ? pendingOrders.promise : true,
    );

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      onclose,
      onbeforeclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close all tabs' }));
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledWith(expect.objectContaining({ id: 'orders' }));
    });
    await view.rerender({
      tabs: [
        tabAt(tabs, 0),
        tabAt(tabs, 1),
        { id: 'orders', title: 'Orders', path: '/orders/reopened', closable: true },
      ],
    });
    pendingOrders.resolve(true);

    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Invoice draft' })).toBeNull();
    });
    expect(view.getByRole('tab', { name: 'Orders' })).toBeTruthy();
    expect(onclose).toHaveBeenCalledWith('draft');
    expect(onclose).not.toHaveBeenCalledWith('orders');
  });

  it('aborts close-others when the target disappears during confirmation', async () => {
    const tabs = createTabs();
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const oncloseothers = vi.fn();
    const onbeforeclose = vi.fn((tab: WorkspaceTab) =>
      tab.id === 'draft' ? pending.promise : true,
    );

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      onclose,
      oncloseothers,
      onbeforeclose,
    });

    await fireEvent.contextMenu(view.getByRole('tab', { name: 'Orders' }));
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft' }));
    });
    await view.rerender({ tabs: [tabAt(tabs, 0), tabAt(tabs, 1)] });
    pending.resolve(true);
    await flushPending();

    expect(onclose).not.toHaveBeenCalled();
    expect(oncloseothers).not.toHaveBeenCalled();
    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();
  });

  it('re-confirms and then closes after the first guard rejects', async () => {
    const tabs = createTabs();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => onbeforeclose.mock.calls.length > 1);

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'draft',
      onclose,
      onbeforeclose,
    });

    const close = view.getByRole('button', { name: 'Close Invoice draft' });
    await fireEvent.click(close);
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledTimes(1);
    });
    expect(onclose).not.toHaveBeenCalled();
    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();

    await fireEvent.click(close);
    expect(onbeforeclose).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Invoice draft' })).toBeNull();
    });
    expect(onclose).toHaveBeenCalledTimes(1);
    expect(onclose).toHaveBeenCalledWith('draft');
  });

  it('does not delete a frozen replacement with identical content and the same id', async () => {
    const frozenDraft = Object.freeze({
      id: 'draft',
      title: 'Invoice draft',
      path: '/invoices/new',
      dirty: true,
    });
    const tabs = createTabs();
    tabs[1] = frozenDraft;
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'draft',
      onclose,
      onbeforeclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close Invoice draft' }));
    await view.rerender({
      tabs: [
        tabAt(tabs, 0),
        Object.freeze({
          id: 'draft',
          title: 'Invoice draft',
          path: '/invoices/new',
          dirty: true,
        }),
        tabAt(tabs, 2),
      ],
    });
    pending.resolve(true);
    await flushPending();

    expect(onclose).not.toHaveBeenCalled();
    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();
  });

  it('confirms a batch one tab at a time and ignores repeated batch requests', async () => {
    const tabs = createTabs();
    const resolvers = new Map<string, (value: boolean) => void>();
    let activeGuards = 0;
    let maxActiveGuards = 0;
    const onclose = vi.fn();
    const oncloseall = vi.fn();
    const onbeforeclose = vi.fn((tab: WorkspaceTab) => {
      activeGuards += 1;
      maxActiveGuards = Math.max(maxActiveGuards, activeGuards);
      return new Promise<boolean>((resolve) => {
        resolvers.set(tab.id, (value) => {
          activeGuards -= 1;
          resolve(value);
        });
      });
    });

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      onclose,
      oncloseall,
      onbeforeclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close all tabs' }));
    await fireEvent.click(view.getByRole('button', { name: 'Close all tabs' }));

    expect(onbeforeclose).toHaveBeenCalledTimes(1);
    expect(onbeforeclose).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft' }));
    expect(maxActiveGuards).toBe(1);

    resolvers.get('draft')?.(false);
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledWith(expect.objectContaining({ id: 'orders' }));
    });
    expect(maxActiveGuards).toBe(1);

    resolvers.get('orders')?.(true);
    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Orders' })).toBeNull();
    });
    expect(onclose).not.toHaveBeenCalledWith('draft');
    expect(onclose).toHaveBeenCalledWith('orders');
    expect(oncloseall).toHaveBeenCalledTimes(1);
    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();
  });

  it('closes tabs from a frozen array without mutating the caller array', async () => {
    const tabs = Object.freeze([
      { id: 'home', title: 'Home', path: '/home', pinned: true },
      { id: 'draft', title: 'Invoice draft', path: '/invoices/new', dirty: true },
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
    ]) as unknown as WorkspaceTab[];
    const onclose = vi.fn();

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'draft',
      onclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close Invoice draft' }));
    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Invoice draft' })).toBeNull();
    });
    expect(tabs).toHaveLength(3);
    expect(tabAt(tabs, 1)?.id).toBe('draft');
    expect(view.getByRole('button', { name: 'Close all tabs' })).toBeTruthy();

    await fireEvent.click(view.getByRole('button', { name: 'Close all tabs' }));
    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Orders' })).toBeNull();
    });
    expect(view.getByRole('tab', { name: 'Home' })).toBeTruthy();
    expect(onclose).toHaveBeenCalledWith('draft');
    expect(onclose).toHaveBeenCalledWith('orders');
    expect(onclose).not.toHaveBeenCalledWith('home');
    expect(tabs).toHaveLength(3);
    expect(tabAt(tabs, 1)?.id).toBe('draft');
    expect(view.queryByRole('button', { name: 'Close all tabs' })).toBeNull();
  });

  it('hides close-all after the last tab closes on a plain array', async () => {
    const tabs: WorkspaceTab[] = [
      { id: 'orders', title: 'Orders', path: '/orders', closable: true },
      { id: 'mail', title: 'Mail', path: '/mail', closable: true },
    ];

    const view = render(MultiTabKeepAlive, { tabs, activeTabId: 'orders' });

    await fireEvent.click(view.getByRole('button', { name: 'Close all tabs' }));
    await waitFor(() => {
      expect(view.queryByRole('tab')).toBeNull();
    });
    expect(view.queryByRole('button', { name: 'Close all tabs' })).toBeNull();
    expect(tabs).toHaveLength(2);
  });

  it('reruns the guard after close-others is cancelled by a vanished target', async () => {
    const tabs = createTabs();
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const oncloseothers = vi.fn();
    const onbeforeclose = vi.fn((tab: WorkspaceTab) => {
      if (tab.id !== 'draft') return true;
      return onbeforeclose.mock.calls.length === 1 ? pending.promise : true;
    });

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      onclose,
      oncloseothers,
      onbeforeclose,
    });

    await fireEvent.contextMenu(view.getByRole('tab', { name: 'Orders' }));
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft' }));
    });
    await view.rerender({ tabs: [tabAt(tabs, 0), tabAt(tabs, 1)] });
    pending.resolve(true);
    await flushPending();

    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();
    expect(onclose).not.toHaveBeenCalled();
    expect(oncloseothers).not.toHaveBeenCalled();

    await fireEvent.contextMenu(view.getByRole('tab', { name: 'Home' }));
    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Invoice draft' })).toBeNull();
    });
    expect(onbeforeclose.mock.calls.filter(([tab]) => tab.id === 'draft')).toHaveLength(2);
    expect(oncloseothers).toHaveBeenCalledWith('home');
  });

  it('stops issuing batch confirmations after unmount', async () => {
    const tabs = createTabs();
    const pending = deferred<boolean>();
    const onclose = vi.fn();
    const oncloseall = vi.fn();
    const onbeforeclose = vi.fn(() => pending.promise);

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: 'orders',
      onclose,
      oncloseall,
      onbeforeclose,
    });

    await fireEvent.click(view.getByRole('button', { name: 'Close all tabs' }));
    await waitFor(() => {
      expect(onbeforeclose).toHaveBeenCalledTimes(1);
    });
    view.unmount();
    pending.resolve(true);
    await flushPending();

    expect(onbeforeclose).toHaveBeenCalledTimes(1);
    expect(onclose).not.toHaveBeenCalled();
    expect(oncloseall).not.toHaveBeenCalled();
  });
});

describe('MultiTabKeepAlive tablist keyboard model', () => {
  it('keeps one roving tab stop and falls back to the first tab without a match', () => {
    const view = render(MultiTabKeepAlive, {
      tabs: createTabs(),
      activeTabId: 'draft',
    });

    expect(view.getByRole('tab', { name: 'Home' }).getAttribute('tabindex')).toBe('-1');
    expect(view.getByRole('tab', { name: 'Invoice draft' }).getAttribute('tabindex')).toBe('0');
    expect(view.getByRole('tab', { name: 'Orders' }).getAttribute('tabindex')).toBe('-1');

    view.unmount();

    const fallback = render(MultiTabKeepAlive, {
      tabs: createTabs(),
      activeTabId: 'missing',
    });

    expect(fallback.getByRole('tab', { name: 'Home' }).getAttribute('tabindex')).toBe('0');
    expect(fallback.getByRole('tab', { name: 'Invoice draft' }).getAttribute('tabindex')).toBe('-1');
    expect(fallback.getByRole('tab', { name: 'Orders' }).getAttribute('tabindex')).toBe('-1');
  });

  it('does not throw for an empty tablist', () => {
    const view = render(MultiTabKeepAlive, { tabs: [], activeTabId: '' });

    expect(view.getByRole('tablist')).toBeTruthy();
    expect(view.queryAllByRole('tab')).toHaveLength(0);
  });

  it('cycles focus and activation with ArrowRight and ArrowLeft', async () => {
    const onselect = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs: createTabs(),
      activeTabId: 'home',
      onselect,
    });

    const home = view.getByRole('tab', { name: 'Home' });
    home.focus();

    await fireEvent.keyDown(home, { key: 'ArrowRight' });
    const draft = view.getByRole('tab', { name: 'Invoice draft' });
    expect(document.activeElement).toBe(draft);
    expect(draft.getAttribute('aria-selected')).toBe('true');
    expect(draft.getAttribute('tabindex')).toBe('0');
    expect(home.getAttribute('tabindex')).toBe('-1');
    expect(onselect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'draft' }));

    await fireEvent.keyDown(draft, { key: 'ArrowRight' });
    const orders = view.getByRole('tab', { name: 'Orders' });
    expect(document.activeElement).toBe(orders);
    expect(orders.getAttribute('aria-selected')).toBe('true');

    await fireEvent.keyDown(orders, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(home);
    expect(home.getAttribute('aria-selected')).toBe('true');

    await fireEvent.keyDown(home, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(orders);
    expect(orders.getAttribute('aria-selected')).toBe('true');
  });

  it('jumps to the first and last tab with Home and End and activates them', async () => {
    const onselect = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs: createTabs(),
      activeTabId: 'draft',
      onselect,
    });

    const draft = view.getByRole('tab', { name: 'Invoice draft' });
    draft.focus();

    await fireEvent.keyDown(draft, { key: 'End' });
    const orders = view.getByRole('tab', { name: 'Orders' });
    expect(document.activeElement).toBe(orders);
    expect(orders.getAttribute('aria-selected')).toBe('true');
    expect(onselect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'orders' }));

    await fireEvent.keyDown(orders, { key: 'Home' });
    const home = view.getByRole('tab', { name: 'Home' });
    expect(document.activeElement).toBe(home);
    expect(home.getAttribute('aria-selected')).toBe('true');
    expect(onselect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'home' }));
  });

  it('preserves Enter and Space activation semantics', async () => {
    const onselect = vi.fn();
    const view = render(MultiTabKeepAlive, {
      tabs: createTabs(),
      activeTabId: 'home',
      onselect,
    });

    const draft = view.getByRole('tab', { name: 'Invoice draft' });
    await fireEvent.keyDown(draft, { key: 'Enter' });
    expect(draft.getAttribute('aria-selected')).toBe('true');
    expect(onselect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'draft' }));

    const orders = view.getByRole('tab', { name: 'Orders' });
    await fireEvent.keyDown(orders, { key: ' ' });
    expect(orders.getAttribute('aria-selected')).toBe('true');
    expect(onselect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'orders' }));
  });
});
