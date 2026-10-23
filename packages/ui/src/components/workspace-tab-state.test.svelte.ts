import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceTab } from './MultiTabKeepAlive.svelte';
import WorkspaceTabStateHost from './workspace-tab-state.test-host.svelte';
import {
  createWorkspaceTabStateAdapter,
  type WorkspaceTabStateStorage,
} from './workspace-tab-state';

afterEach(cleanup);

type MemoryStorage = WorkspaceTabStateStorage & { data: Map<string, string> };

function createMemoryStorage(): MemoryStorage {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function createTabs(): WorkspaceTab[] {
  return [
    { id: 'orders', title: 'Orders', path: '/orders' },
    { id: 'mail', title: 'Mail', path: '/mail' },
    { id: 'draft', title: 'Invoice draft', path: '/invoices/new', dirty: true },
  ];
}

describe('WorkspaceTabState adapter', () => {
  it('keeps query and scroll position per tab while switching through the real tab bar', async () => {
    const adapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a' });
    const view = render(WorkspaceTabStateHost, {
      tabs: createTabs(),
      activeTabId: 'orders',
      adapter,
    });

    const input = view.getByLabelText('Workspace query') as HTMLInputElement;
    const scroller = view.getByTestId('workspace-scroll');

    await fireEvent.input(input, { target: { value: 'status=open' } });
    scroller.scrollTop = 140;
    await fireEvent.scroll(scroller);

    expect(view.getByTestId('workspace-state').dataset.query).toBe('status=open');
    expect(scroller.scrollTop).toBe(140);

    await fireEvent.click(view.getByRole('tab', { name: 'Mail' }));
    await waitFor(() => {
      expect(view.getByTestId('workspace-state').dataset.activeTab).toBe('mail');
      expect(input.value).toBe('');
    });
    expect(scroller.scrollTop).toBe(0);

    await fireEvent.input(input, { target: { value: 'unread=1' } });
    await fireEvent.click(view.getByRole('tab', { name: 'Orders' }));

    await waitFor(() => {
      expect(view.getByTestId('workspace-state').dataset.activeTab).toBe('orders');
      expect(input.value).toBe('status=open');
    });
    expect(scroller.scrollTop).toBe(140);

    await fireEvent.click(view.getByRole('tab', { name: 'Mail' }));
    await waitFor(() => {
      expect(input.value).toBe('unread=1');
    });
  });

  it('protects a draft tab through onbeforeclose until the adapter marks it clean', async () => {
    const adapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a' });
    const view = render(WorkspaceTabStateHost, {
      tabs: createTabs(),
      activeTabId: 'draft',
      adapter,
    });

    adapter.markDraft({ id: 'draft', path: '/invoices/new' }, true);
    expect(adapter.hasDraft({ id: 'draft', path: '/invoices/new' })).toBe(true);

    await fireEvent.click(view.getByRole('button', { name: 'Close Invoice draft' }));
    expect(view.getByRole('tab', { name: 'Invoice draft' })).toBeTruthy();
    expect(view.getByTestId('workspace-state').dataset.tabCount).toBe('3');

    adapter.markDraft({ id: 'draft', path: '/invoices/new' }, false);
    await fireEvent.click(view.getByRole('button', { name: 'Close Invoice draft' }));

    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Invoice draft' })).toBeNull();
    });
    expect(view.getByTestId('workspace-state').dataset.tabCount).toBe('2');
  });

  it('restores a versioned snapshot after a refresh and keeps the draft marker', () => {
    const storage = createMemoryStorage();
    const first = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    first.capture(
      { id: 'orders', path: '/orders' },
      { query: 'status=open', scrollTop: 88, scrollLeft: 12, draft: true },
    );

    const refreshed = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(refreshed.restore({ id: 'orders', path: '/orders' })).toEqual({
      query: 'status=open',
      scrollTop: 88,
      scrollLeft: 12,
      draft: true,
    });
    expect(refreshed.hasDraft({ id: 'orders', path: '/orders' })).toBe(true);
  });

  it('does not leak old state across tenants, tab ids, or changed paths', () => {
    const storage = createMemoryStorage();
    const tenantA = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    tenantA.capture(
      { id: 'orders', path: '/orders' },
      { query: 'account=acme', scrollTop: 30, draft: true },
    );
    tenantA.capture(
      { id: 'mail', path: '/mail' },
      { query: 'folder=inbox', scrollTop: 10 },
    );

    expect(tenantA.restore({ id: 'orders', path: '/orders-not-really' })).toBeUndefined();

    const tenantB = createWorkspaceTabStateAdapter({ tenantId: 'tenant-b', storage });
    expect(tenantB.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    expect(tenantB.restore({ id: 'mail', path: '/mail' })).toBeUndefined();

    expect(tenantA.restore({ id: 'mail', path: '/mail' })?.query).toBe('folder=inbox');
    expect(tenantA.restore({ id: 'orders', path: '/orders' })?.query).toBe('account=acme');
  });

  it('ignores malformed or version-mismatched persisted state instead of throwing', () => {
    const storage = createMemoryStorage();
    const adapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    adapter.capture({ id: 'orders', path: '/orders' }, { query: 'status=open' });

    const [key] = [...storage.data.keys()];
    expect(key).toBeTruthy();
    storage.data.set(key!, '{not json');
    const malformed = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(malformed.restore({ id: 'orders', path: '/orders' })).toBeUndefined();

    storage.data.set(
      key!,
      JSON.stringify({
        version: 99,
        tenantId: 'tenant-a',
        tabId: 'orders',
        path: '/orders',
        query: 'status=closed',
        scrollTop: 1,
        scrollLeft: 0,
        draft: false,
      }),
    );
    const versionMismatch = createWorkspaceTabStateAdapter({
      tenantId: 'tenant-a',
      storage,
    });
    expect(versionMismatch.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
  });

  it('clears a closed tab without dropping the other tabs and stops after dispose', async () => {
    const storage = createMemoryStorage();
    const adapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    adapter.capture({ id: 'orders', path: '/orders' }, { query: 'status=open', scrollTop: 20 });
    adapter.capture({ id: 'mail', path: '/mail' }, { query: 'unread=1', scrollTop: 5 });

    adapter.clear({ id: 'orders' });
    expect(adapter.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    expect(adapter.restore({ id: 'mail', path: '/mail' })?.query).toBe('unread=1');

    const view = render(WorkspaceTabStateHost, {
      tabs: createTabs(),
      activeTabId: 'orders',
      adapter,
    });
    const input = view.getByLabelText('Workspace query') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'kept-before-unmount' } });
    await fireEvent.click(view.getByRole('tab', { name: 'Mail' }));
    await waitFor(() => {
      expect(adapter.restore({ id: 'orders', path: '/orders' })?.query).toBe(
        'kept-before-unmount',
      );
    });

    view.unmount();
    // 宿主卸载时 dispose 只清理内存快照，不改写已持久化的 storage。
    expect(adapter.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    expect(storage.data.size).toBeGreaterThan(0);
  });

  it('rejects a dirty persisted envelope instead of normalizing it into a safe snapshot', () => {
    const storage = createMemoryStorage();
    const writer = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    writer.capture(
      { id: 'orders', path: '/orders' },
      { query: 'status=open', scrollTop: 11, draft: true },
    );
    const [key] = [...storage.data.keys()];
    expect(key).toBeTruthy();

    const envelope = {
      version: 1,
      tenantId: 'tenant-a',
      tabId: 'orders',
      path: '/orders',
      query: 'status=open',
      scrollTop: 11,
      scrollLeft: 0,
      draft: true,
    };
    const dirtyCases = [
      { ...envelope, draft: 'true' },
      { ...envelope, draft: 1 },
      { ...envelope, query: { term: 'status=open' } },
      { ...envelope, scrollTop: -1 },
      { ...envelope, scrollTop: Number.POSITIVE_INFINITY },
      { ...envelope, scrollLeft: '0' },
    ];

    for (const dirty of dirtyCases) {
      storage.data.set(key!, JSON.stringify(dirty));
      const reopened = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
      expect(reopened.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
      expect(reopened.hasDraft({ id: 'orders', path: '/orders' })).toBe(false);
    }
  });

  it('tombstones a failed persistent clear and reports the cross-instance risk', () => {
    const storage = createMemoryStorage();
    const removeItem = vi.fn(() => {
      throw new Error('storage locked');
    });
    storage.removeItem = removeItem;
    const adapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    adapter.capture(
      { id: 'orders', path: '/orders' },
      { query: 'account=acme', scrollTop: 30, draft: true },
    );

    const result = adapter.clear({ id: 'orders' });
    expect(result).toEqual({ memoryCleared: true, storage: 'failed' });
    expect(removeItem).toHaveBeenCalledTimes(1);
    // 同一实例不能从失败的 storage 回读已关闭标签。
    expect(adapter.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    expect(adapter.hasDraft({ id: 'orders', path: '/orders' })).toBe(false);

    // 跨新实例仍可能回读旧快照；clear 的返回值明确暴露这一边界。
    const reopened = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(reopened.restore({ id: 'orders', path: '/orders' })).toMatchObject({
      query: 'account=acme',
      draft: true,
    });
  });

  it('restores the active tab when the real host mounts for the first time', async () => {
    const storage = createMemoryStorage();
    const writer = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    writer.capture(
      { id: 'orders', path: '/orders' },
      { query: 'status=open', scrollTop: 64, draft: true },
    );
    const adapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });

    const view = render(WorkspaceTabStateHost, {
      tabs: createTabs(),
      activeTabId: 'orders',
      adapter,
    });

    const input = view.getByLabelText('Workspace query') as HTMLInputElement;
    expect(input.value).toBe('status=open');
    expect(view.getByTestId('workspace-state').dataset.scrollTop).toBe('64');
    await waitFor(() => {
      expect((view.getByTestId('workspace-scroll') as HTMLDivElement).scrollTop).toBe(64);
    });
  });

  it('captures unsaved changes before unmount and restores them in a new host', async () => {
    const storage = createMemoryStorage();
    const firstAdapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    const first = render(WorkspaceTabStateHost, {
      tabs: createTabs(),
      activeTabId: 'orders',
      adapter: firstAdapter,
    });

    const firstInput = first.getByLabelText('Workspace query') as HTMLInputElement;
    const firstScroller = first.getByTestId('workspace-scroll') as HTMLDivElement;
    await fireEvent.input(firstInput, { target: { value: 'status=pending' } });
    firstScroller.scrollTop = 72;
    await fireEvent.scroll(firstScroller);
    first.unmount();

    const secondAdapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    const second = render(WorkspaceTabStateHost, {
      tabs: createTabs(),
      activeTabId: 'orders',
      adapter: secondAdapter,
    });

    const secondInput = second.getByLabelText('Workspace query') as HTMLInputElement;
    expect(secondInput.value).toBe('status=pending');
    await waitFor(() => {
      expect((second.getByTestId('workspace-scroll') as HTMLDivElement).scrollTop).toBe(72);
    });
  });

  it('does not recreate a closed tab snapshot on select or unmount', async () => {
    const storage = createMemoryStorage();
    const adapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    const view = render(WorkspaceTabStateHost, {
      tabs: createTabs(),
      activeTabId: 'orders',
      adapter,
    });

    const input = view.getByLabelText('Workspace query') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'status=open' } });
    await fireEvent.click(view.getByRole('button', { name: 'Close Orders' }));
    await waitFor(() => {
      expect(view.queryByRole('tab', { name: 'Orders' })).toBeNull();
    });

    expect(adapter.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    const afterClose = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(afterClose.restore({ id: 'orders', path: '/orders' })).toBeUndefined();

    view.unmount();
    const afterUnmount = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(afterUnmount.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
  });
});