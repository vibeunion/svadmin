import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceTab } from './MultiTabKeepAlive.svelte';
import WorkspaceTabStateHost from './workspace-tab-state.test-host.svelte';
import {
  createWorkspaceTabStateAdapter,
  type WorkspaceDraftJsonObject,
  type WorkspaceDraftJsonValue,
  type WorkspaceTabStateAdapter,
  type WorkspaceTabStateStorage,
} from './workspace-tab-state';

afterEach(cleanup);

type MemoryStorage = WorkspaceTabStateStorage & { data: Map<string, string> };

function createMemoryStorage(data = new Map<string, string>()): MemoryStorage {
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

function asDraftData(value: Record<string, unknown>): WorkspaceDraftJsonObject {
  return value as unknown as WorkspaceDraftJsonObject;
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
    if (key === undefined) {
      throw new Error('expected a persisted workspace tab state key');
    }
    storage.data.set(key, '{not json');
    const malformed = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(malformed.restore({ id: 'orders', path: '/orders' })).toBeUndefined();

    storage.data.set(
      key,
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
    if (key === undefined) {
      throw new Error('expected a persisted workspace tab state key');
    }

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
      storage.data.set(key, JSON.stringify(dirty));
      const reopened = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
      expect(reopened.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
      expect(reopened.hasDraft({ id: 'orders', path: '/orders' })).toBe(false);
    }
  });

  it('does not restore a successfully cleared tab from the same storage in a new adapter', () => {
    const storage = createMemoryStorage();
    const adapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    adapter.capture(
      { id: 'orders', path: '/orders' },
      { query: 'account=acme', scrollTop: 30, draft: true },
    );

    expect(adapter.clear({ id: 'orders' })).toEqual({
      memoryCleared: true,
      storage: 'cleared',
    });
    expect(storage.data.size).toBe(0);

    const reopened = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(reopened.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    expect(reopened.hasDraft({ id: 'orders', path: '/orders' })).toBe(false);
  });

  it('does not let an existing adapter restore its cached snapshot after another adapter successfully clears', () => {
    const storage = createMemoryStorage();
    const writer = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    const reader = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    writer.capture(
      { id: 'orders', path: '/orders' },
      { query: 'account=acme', scrollTop: 30, draft: true },
    );

    // reader 先把旧快照缓存进自己的内存，之后才发生成功清理。
    expect(reader.restore({ id: 'orders', path: '/orders' })).toMatchObject({
      query: 'account=acme',
      draft: true,
    });

    expect(writer.clear({ id: 'orders' })).toEqual({
      memoryCleared: true,
      storage: 'cleared',
    });
    expect(storage.data.size).toBe(0);

    // 成功清理后，同一个 storage 对象上已有内存缓存的 adapter 也必须失效。
    expect(reader.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    expect(reader.hasDraft({ id: 'orders', path: '/orders' })).toBe(false);
  });

  it('blocks a new adapter from restoring the old snapshot when removeItem fails', () => {
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

    // removeItem 失败时仍要留下可跨实例识别的关闭标记，不能恢复旧快照。
    const reopened = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(reopened.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    expect(reopened.hasDraft({ id: 'orders', path: '/orders' })).toBe(false);
  });

  it('does not trust a removeItem that leaves the snapshot readable', () => {
    const storage = createMemoryStorage();
    storage.removeItem = () => {
      // 模拟返回成功但没有真正删除的 storage 实现。
    };
    const adapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    adapter.capture(
      { id: 'orders', path: '/orders' },
      { query: 'account=acme', scrollTop: 30, draft: true },
    );

    expect(adapter.clear({ id: 'orders' })).toEqual({
      memoryCleared: true,
      storage: 'failed',
    });

    const reopened = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(reopened.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
  });

  it('lets a recapture take over the same id/path after a failed clear', () => {
    const storage = createMemoryStorage();
    storage.removeItem = () => {
      throw new Error('storage locked');
    };
    const adapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    adapter.capture(
      { id: 'orders', path: '/orders' },
      { query: 'account=acme', scrollTop: 30, draft: true },
    );

    expect(adapter.clear({ id: 'orders' }).storage).toBe('failed');

    const reopened = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(reopened.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    reopened.capture(
      { id: 'orders', path: '/orders' },
      { query: 'account=reopened', scrollTop: 12, draft: false },
    );

    const expected = {
      query: 'account=reopened',
      scrollTop: 12,
      scrollLeft: 0,
      draft: false,
    };
    expect(reopened.restore({ id: 'orders', path: '/orders' })).toEqual(expected);
    const another = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(another.restore({ id: 'orders', path: '/orders' })).toEqual(expected);
  });

  it('keeps the failed-clear barrier until the recaptured snapshot is actually persisted', () => {
    const storage = createMemoryStorage();
    const writer = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    writer.capture(
      { id: 'orders', path: '/orders' },
      { query: 'query=old', scrollTop: 10, draft: true },
    );

    storage.removeItem = () => {
      throw new Error('storage locked');
    };
    storage.setItem = () => {
      throw new Error('storage locked');
    };

    const closer = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(closer.clear({ id: 'orders' })).toEqual({
      memoryCleared: true,
      storage: 'failed',
    });

    const reopened = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(reopened.restore({ id: 'orders', path: '/orders' })).toBeUndefined();

    // 本地显式接管必须立刻可用新内存，即使新快照还写不进 storage。
    const expected = {
      query: 'query=new',
      scrollTop: 42,
      scrollLeft: 0,
      draft: true,
    };
    expect(
      reopened.capture(
        { id: 'orders', path: '/orders' },
        { query: 'query=new', scrollTop: 42, draft: true },
      ),
    ).toEqual(expected);
    expect(reopened.restore({ id: 'orders', path: '/orders' })).toEqual(expected);
    expect(reopened.hasDraft({ id: 'orders', path: '/orders' })).toBe(true);

    // 新快照没有成功持久化前，清理失败留下的跨实例阻断不能退休。
    const another = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(another.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    expect(another.hasDraft({ id: 'orders', path: '/orders' })).toBe(false);
  });

  it('keeps the failed-clear barrier when setItem silently leaves the old snapshot', () => {
    const storage = createMemoryStorage();
    const writer = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    writer.capture(
      { id: 'orders', path: '/orders' },
      { query: 'query=old', scrollTop: 10, draft: true },
    );

    storage.removeItem = () => {
      throw new Error('storage locked');
    };
    storage.setItem = () => {
      // 模拟返回成功但没有真正写入的 storage 实现。
    };

    const closer = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(closer.clear({ id: 'orders' }).storage).toBe('failed');

    const reopened = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(reopened.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    expect(
      reopened.capture(
        { id: 'orders', path: '/orders' },
        { query: 'query=new', scrollTop: 42, draft: false },
      ),
    ).toEqual({ query: 'query=new', scrollTop: 42, scrollLeft: 0, draft: false });
    expect(reopened.restore({ id: 'orders', path: '/orders' })?.query).toBe('query=new');

    // setItem 静默 no-op 时不能把旧快照重新暴露给新实例。
    const another = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(another.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    expect(another.hasDraft({ id: 'orders', path: '/orders' })).toBe(false);
  });

  it('uses the persisted closed envelope to block a different storage wrapper sharing the same data', () => {
    const data = new Map<string, string>();
    const failing = createMemoryStorage(data);
    failing.removeItem = () => {
      throw new Error('storage locked');
    };
    const adapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage: failing });
    adapter.capture(
      { id: 'orders', path: '/orders' },
      { query: 'account=acme', scrollTop: 30, draft: true },
    );

    expect(adapter.clear({ id: 'orders' }).storage).toBe('failed');

    // 新 wrapper 不是同一个 storage 对象，WeakMap 无法兜底；必须依赖持久化关闭信封。
    const readingWrapper = createMemoryStorage(data);
    const reopened = createWorkspaceTabStateAdapter({
      tenantId: 'tenant-a',
      storage: readingWrapper,
    });
    expect(reopened.restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    expect(reopened.hasDraft({ id: 'orders', path: '/orders' })).toBe(false);
  });

  it('scopes failed-clear barriers by tenant and key prefix', () => {
    const storage = createMemoryStorage();
    const scoped = (tenantId: string, keyPrefix: string) =>
      createWorkspaceTabStateAdapter({ tenantId, storage, keyPrefix });
    const tenantAScopeA = scoped('tenant-a', 'prefix-a');
    const tenantAScopeB = scoped('tenant-a', 'prefix-b');
    const tenantBScopeA = scoped('tenant-b', 'prefix-a');
    tenantAScopeA.capture({ id: 'orders', path: '/orders' }, { query: 'scope=a' });
    tenantAScopeB.capture({ id: 'orders', path: '/orders' }, { query: 'scope=b' });
    tenantBScopeA.capture({ id: 'orders', path: '/orders' }, { query: 'scope=tenant-b' });

    storage.removeItem = () => {
      throw new Error('storage locked');
    };
    expect(tenantAScopeA.clear({ id: 'orders' }).storage).toBe('failed');

    expect(scoped('tenant-a', 'prefix-a').restore({ id: 'orders', path: '/orders' })).toBeUndefined();
    expect(scoped('tenant-a', 'prefix-b').restore({ id: 'orders', path: '/orders' })?.query).toBe(
      'scope=b',
    );
    expect(scoped('tenant-b', 'prefix-a').restore({ id: 'orders', path: '/orders' })?.query).toBe(
      'scope=tenant-b',
    );
  });

  it.each([
    {
      mode: 'capture',
      takeover: (adapter: WorkspaceTabStateAdapter) =>
        adapter.capture(
          { id: 'detail', path: '/records/new' },
          { query: 'query=new', scrollTop: 96, scrollLeft: 8, draft: true },
        ),
      expected: { query: 'query=new', scrollTop: 96, scrollLeft: 8, draft: true },
    },
    {
      mode: 'markDraft',
      takeover: (adapter: WorkspaceTabStateAdapter) =>
        adapter.markDraft({ id: 'detail', path: '/records/new' }, true),
      // markDraft 不走 capture，新路径没有旧快照时应拿默认 query/scroll。
      expected: { query: '', scrollTop: 0, scrollLeft: 0, draft: true },
    },
  ])(
    'lets $mode take over a new path in memory when persistence fails instead of reading the stale envelope',
    ({ takeover, expected }) => {
      const storage = createMemoryStorage();
      const adapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
      adapter.capture(
        { id: 'detail', path: '/records/old' },
        { query: 'id=1', scrollTop: 40, draft: true },
      );

      storage.setItem = () => {
        throw new Error('quota exceeded');
      };

      takeover(adapter);

      // 内存里已有该 id 的新路径快照时，旧路径不能从持久化回读并覆盖它。
      expect(adapter.restore({ id: 'detail', path: '/records/old' })).toBeUndefined();
      expect(adapter.hasDraft({ id: 'detail', path: '/records/old' })).toBe(false);
      expect(adapter.restore({ id: 'detail', path: '/records/new' })).toEqual(expected);
      expect(adapter.hasDraft({ id: 'detail', path: '/records/new' })).toBe(true);

      adapter.markDraft({ id: 'detail', path: '/records/new' }, false);
      expect(adapter.hasDraft({ id: 'detail', path: '/records/new' })).toBe(false);
      expect(adapter.restore({ id: 'detail', path: '/records/old' })).toBeUndefined();
      expect(adapter.hasDraft({ id: 'detail', path: '/records/old' })).toBe(false);
      expect(adapter.restore({ id: 'detail', path: '/records/new' })).toEqual({
        ...expected,
        draft: false,
      });

      // 无内存的新适配器仍能读到合法旧持久化：跨实例旧存储风险未被本修复解决。
      const reopened = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
      expect(reopened.restore({ id: 'detail', path: '/records/old' })?.query).toBe('id=1');
    },
  );

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

  it('persists whitelisted draftData across refresh and clears it on markDraft(false)', () => {
    const storage = createMemoryStorage();
    const options = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      draftFields: ['title', 'amount'] as const,
      storage,
    };
    const first = createWorkspaceTabStateAdapter(options);
    const captured = first.capture(
      { id: 'invoice', path: '/invoices/new' },
      {
        query: 'mode=edit',
        scrollTop: 24,
        draft: true,
        draftData: {
          title: 'Invoice 1',
          amount: 42,
          ignored: 'dropped',
          nested: { ok: [1, null, 'x'] },
        },
      },
    );
    expect(captured.draftData).toEqual({ title: 'Invoice 1', amount: 42 });
    expect(first.getLastDraftDataIssue()).toBeUndefined();

    first.markDraft({ id: 'invoice', path: '/invoices/new' }, false);
    const refreshed = createWorkspaceTabStateAdapter(options);
    expect(refreshed.restore({ id: 'invoice', path: '/invoices/new' })).toEqual({
      query: 'mode=edit',
      scrollTop: 24,
      scrollLeft: 0,
      draft: false,
    });
  });

  it('keeps draftData disabled unless userId, draftFields and storage are all configured', () => {
    const storage = createMemoryStorage();
    const adapter = createWorkspaceTabStateAdapter({
      tenantId: 'tenant-a',
      storage,
      draftFields: ['title'],
    });

    const captured = adapter.capture(
      { id: 'orders', path: '/orders' },
      { query: 'status=open', draftData: { title: 'should-not-save' } },
    );
    expect(captured).toEqual({
      query: 'status=open',
      scrollTop: 0,
      scrollLeft: 0,
      draft: false,
    });
    expect(adapter.getLastDraftDataIssue()).toBe('disabled');

    const viewOnly = adapter.capture({ id: 'orders', path: '/orders' }, { query: 'status=closed' });
    expect(viewOnly).toEqual({
      query: 'status=closed',
      scrollTop: 0,
      scrollLeft: 0,
      draft: false,
    });
    expect(adapter.getLastDraftDataIssue()).toBeUndefined();

    const refreshed = createWorkspaceTabStateAdapter({
      tenantId: 'tenant-a',
      storage,
      draftFields: ['title'],
    });
    expect(refreshed.restore({ id: 'orders', path: '/orders' })).toEqual({
      query: 'status=closed',
      scrollTop: 0,
      scrollLeft: 0,
      draft: false,
    });
  });

  it('reports an empty draft allowlist and does not persist draftData', () => {
    const storage = createMemoryStorage();
    const options = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      draftFields: [] as const,
      storage,
    };
    const adapter = createWorkspaceTabStateAdapter(options);
    const captured = adapter.capture(
      { id: 'invoice', path: '/invoices/new' },
      { query: 'mode=edit', draftData: { title: 'ignored' } },
    );

    expect(adapter.getLastDraftDataIssue()).toBe('empty-allowlist');
    expect(captured.draftData).toBeUndefined();
    expect(captured.query).toBe('mode=edit');
    expect(createWorkspaceTabStateAdapter(options).restore({
      id: 'invoice',
      path: '/invoices/new',
    })).toEqual({
      query: 'mode=edit',
      scrollTop: 0,
      scrollLeft: 0,
      draft: false,
    });
  });

  it('isolates draftData by tenant, user, tab id and path', () => {
    const storage = createMemoryStorage();
    const base = { tenantId: 'tenant-a', draftFields: ['title'] as const, storage };
    const userOne = createWorkspaceTabStateAdapter({ ...base, userId: 'user-1' });
    const userTwo = createWorkspaceTabStateAdapter({ ...base, userId: 'user-2' });
    const tenantB = createWorkspaceTabStateAdapter({
      ...base,
      tenantId: 'tenant-b',
      userId: 'user-1',
    });
    const invoice = { id: 'invoice', path: '/invoices/new' };

    userOne.capture(invoice, { draftData: { title: 'user-one' } });
    userTwo.capture(invoice, { draftData: { title: 'user-two' } });
    tenantB.capture(invoice, { draftData: { title: 'tenant-b' } });
    userOne.capture({ id: 'other', path: '/other' }, { draftData: { title: 'other-tab' } });

    expect(userOne.restore(invoice)?.draftData).toEqual({ title: 'user-one' });
    expect(userTwo.restore(invoice)?.draftData).toEqual({ title: 'user-two' });
    expect(tenantB.restore(invoice)?.draftData).toEqual({ title: 'tenant-b' });
    expect(userOne.restore({ id: 'invoice', path: '/changed' })).toBeUndefined();
    expect(userOne.restore({ id: 'other', path: '/other' })?.draftData).toEqual({
      title: 'other-tab',
    });
    expect(
      createWorkspaceTabStateAdapter({ ...base, userId: 'user-1' }).restore(invoice)?.draftData,
    ).toEqual({ title: 'user-one' });
  });

  it('rejects Date, File/Blob, Map/Set, non-finite numbers, accessors, sparse arrays, cycles and prototype keys', () => {
    const storage = createMemoryStorage();
    const adapter = createWorkspaceTabStateAdapter({
      tenantId: 'tenant-a',
      userId: 'user-1',
      draftFields: ['title', 'tags'],
      storage,
    });
    const cyclic: Record<string, unknown> = { title: 'cycle' };
    cyclic['self'] = cyclic;
    const sparse: string[] = ['a'];
    sparse[2] = 'c';
    const accessor: Record<string, unknown> = {};
    Object.defineProperty(accessor, 'title', {
      enumerable: true,
      get: () => 'accessor',
    });
    const fileOrBlob: unknown =
      typeof File === 'undefined' ? new Blob(['x']) : new File(['x'], 'x.txt');

    const invalidCases: Array<Record<string, unknown>> = [
      { title: new Date() },
      { title: fileOrBlob },
      { title: new Map([['a', 1]]) },
      { title: new Set(['a']) },
      { title: Number.NaN },
      { title: Number.POSITIVE_INFINITY },
      { title: undefined },
      { title: () => 'function' },
      { title: Symbol('symbol') },
      { title: cyclic },
      { tags: sparse },
      { title: JSON.parse('{"__proto__":{"polluted":true}}') },
      { title: JSON.parse('{"constructor":{"polluted":true}}') },
      accessor,
    ];

    for (const draftData of invalidCases) {
      const captured = adapter.capture(
        { id: 'invoice', path: '/invoices/new' },
        { query: 'mode=edit', draftData: asDraftData(draftData) },
      );
      expect(adapter.getLastDraftDataIssue()).toBe('invalid');
      expect(captured.draftData).toBeUndefined();
      // 草稿失败不影响同一次 capture 的其它状态。
      expect(captured.query).toBe('mode=edit');
    }
  });

  it('does not persist draftData over the default 64 KiB limit', () => {
    const storage = createMemoryStorage();
    const options = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      draftFields: ['body'],
      storage,
    };
    const adapter = createWorkspaceTabStateAdapter(options);
    const captured = adapter.capture(
      { id: 'invoice', path: '/invoices/new' },
      { query: 'mode=edit', scrollTop: 9, draft: true, draftData: { body: 'x'.repeat(65536) } },
    );

    expect(adapter.getLastDraftDataIssue()).toBe('too-large');
    expect(captured.draftData).toBeUndefined();
    expect(captured.query).toBe('mode=edit');
    expect(createWorkspaceTabStateAdapter(options).restore({
      id: 'invoice',
      path: '/invoices/new',
    })).toEqual({
      query: 'mode=edit',
      scrollTop: 9,
      scrollLeft: 0,
      draft: true,
    });
  });

  it('rejects the whole persisted snapshot when draftData is invalid', () => {
    const storage = createMemoryStorage();
    const options = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      draftFields: ['title'],
      storage,
    };
    const writer = createWorkspaceTabStateAdapter(options);
    writer.capture(
      { id: 'invoice', path: '/invoices/new' },
      { query: 'mode=edit', draft: true, draftData: { title: 'valid' } },
    );
    const [key] = [...storage.data.keys()];
    expect(key).toBeTruthy();
    if (key === undefined) throw new Error('expected a persisted workspace tab state key');

    const envelope = JSON.parse(storage.data.get(key) ?? '{}') as Record<string, unknown>;
    envelope['draftData'] = JSON.parse(
      '{"title":"valid","nested":{"__proto__":{"polluted":true}}}',
    );
    storage.data.set(key, JSON.stringify(envelope));

    const reopened = createWorkspaceTabStateAdapter(options);
    expect(reopened.restore({ id: 'invoice', path: '/invoices/new' })).toBeUndefined();
    expect(reopened.hasDraft({ id: 'invoice', path: '/invoices/new' })).toBe(false);
    expect(reopened.getLastDraftDataIssue()).toBe('invalid');
  });

  it('keeps draftData isolated after a failed clear', () => {
    const storage = createMemoryStorage();
    storage.removeItem = () => {
      throw new Error('storage locked');
    };
    const base = { tenantId: 'tenant-a', draftFields: ['title'] as const, storage };
    const invoice = { id: 'invoice', path: '/invoices/new' };
    const adapter = createWorkspaceTabStateAdapter({ ...base, userId: 'user-1' });
    adapter.capture(invoice, { query: 'mode=edit', draft: true, draftData: { title: 'secret' } });

    expect(adapter.clear({ id: 'invoice' })).toEqual({
      memoryCleared: true,
      storage: 'failed',
    });
    expect(adapter.restore(invoice)).toBeUndefined();
    const reopened = createWorkspaceTabStateAdapter({ ...base, userId: 'user-1' });
    expect(reopened.restore(invoice)).toBeUndefined();
    expect(reopened.hasDraft(invoice)).toBe(false);

    const otherUser = createWorkspaceTabStateAdapter({ ...base, userId: 'user-2' });
    otherUser.capture(invoice, { draftData: { title: 'other-user' } });
    expect(otherUser.restore(invoice)?.draftData).toEqual({ title: 'other-user' });
  });

  it('clones the draft allowlist so caller mutation cannot widen persisted fields', () => {
    const storage = createMemoryStorage();
    const draftFields = ['title'];
    const adapter = createWorkspaceTabStateAdapter({
      tenantId: 'tenant-a',
      userId: 'user-1',
      draftFields,
      storage,
    });
    draftFields[0] = 'secret';
    draftFields.push('extra');

    const invoice = { id: 'invoice', path: '/invoices/new' };
    expect(
      adapter.capture(invoice, {
        draft: true,
        draftData: { title: 'kept', secret: 'hidden', extra: 'hidden-too' },
      }).draftData,
    ).toEqual({ title: 'kept' });
    expect(adapter.getLastDraftDataIssue()).toBeUndefined();
    expect(
      createWorkspaceTabStateAdapter({
        tenantId: 'tenant-a',
        userId: 'user-1',
        draftFields: ['title'],
        storage,
      }).restore(invoice)?.draftData,
    ).toEqual({ title: 'kept' });
  });

  it('rejects dangerous draft allowlists on capture and restore', () => {
    const storage = createMemoryStorage();
    const options = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      draftFields: ['__proto__'],
      storage,
    };
    const invoice = { id: 'invoice', path: '/invoices/new' };
    const adapter = createWorkspaceTabStateAdapter(options);
    const captured = adapter.capture(invoice, {
      draft: true,
      draftData: asDraftData(JSON.parse('{"__proto__":{"polluted":true}}')),
    });
    expect(adapter.getLastDraftDataIssue()).toBe('invalid');
    expect(captured.draftData).toBeUndefined();

    storage.data.set(
      'svadmin:workspace-tab-state:v1:tenant-a:user:user-1:invoice',
      JSON.stringify({
        version: 1,
        tenantId: 'tenant-a',
        userId: 'user-1',
        tabId: 'invoice',
        path: '/invoices/new',
        query: 'mode=edit',
        scrollTop: 0,
        scrollLeft: 0,
        draft: true,
        draftData: { title: 'must-not-restore' },
      }),
    );
    const reopened = createWorkspaceTabStateAdapter(options);
    expect(reopened.restore(invoice)).toBeUndefined();
    expect(reopened.getLastDraftDataIssue()).toBe('invalid');
  });

  it('keeps explicit anonymous identity separate from the unauthenticated fallback', () => {
    const storage = createMemoryStorage();
    const invoice = { id: 'invoice', path: '/invoices/new' };
    const explicitAnonymous = createWorkspaceTabStateAdapter({
      tenantId: 'tenant-a',
      userId: 'anonymous',
      draftFields: ['title'],
      storage,
    });
    explicitAnonymous.capture(invoice, {
      query: 'owner=explicit',
      draft: true,
      draftData: { title: 'explicit-draft' },
    });

    const fallback = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(fallback.restore(invoice)).toBeUndefined();
    fallback.capture(invoice, { query: 'owner=fallback' });
    expect(explicitAnonymous.restore(invoice)?.query).toBe('owner=explicit');
    expect(explicitAnonymous.restore(invoice)?.draftData).toEqual({ title: 'explicit-draft' });

    storage.data.set(
      'svadmin:workspace-tab-state:v1:tenant-a:inline',
      JSON.stringify({
        version: 1,
        tenantId: 'tenant-a',
        tabId: 'inline',
        path: '/inline',
        query: 'legacy=1',
        scrollTop: 0,
        scrollLeft: 0,
        draft: true,
      }),
    );
    const inline = { id: 'inline', path: '/inline' };
    expect(explicitAnonymous.restore(inline)).toBeUndefined();
    expect(fallback.restore(inline)?.query).toBe('legacy=1');
  });

  it('keeps explicit user ids untrimmed and collision-free in their own namespace', () => {
    const storage = createMemoryStorage();
    const invoice = { id: 'invoice', path: '/invoices/new' };
    const base = { tenantId: 'tenant-a', draftFields: ['title'] as const, storage };
    const paddedUser = createWorkspaceTabStateAdapter({ ...base, userId: ' user-1 ' });
    const bareUser = createWorkspaceTabStateAdapter({ ...base, userId: 'user-1' });
    const separatorUser = createWorkspaceTabStateAdapter({
      ...base,
      userId: 'tenant-a:user-1',
    });
    const fallback = createWorkspaceTabStateAdapter({ ...base });

    paddedUser.capture(invoice, { draft: true, draftData: { title: 'padded' } });
    bareUser.capture(invoice, { draft: true, draftData: { title: 'bare' } });
    separatorUser.capture(invoice, { draft: true, draftData: { title: 'separator' } });
    fallback.capture(invoice, {
      query: 'owner=fallback',
      draft: true,
      draftData: { title: 'fallback' },
    });

    const keys = [...storage.data.keys()].sort();
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain(
      'svadmin:workspace-tab-state:v1:tenant-a:user:%20user-1%20:invoice',
    );
    expect(keys).toContain('svadmin:workspace-tab-state:v1:tenant-a:user:user-1:invoice');
    expect(keys).toContain(
      'svadmin:workspace-tab-state:v1:tenant-a:user:tenant-a%3Auser-1:invoice',
    );
    expect(keys).toContain('svadmin:workspace-tab-state:v1:tenant-a:anonymous:invoice');

    expect(paddedUser.restore(invoice)?.draftData).toEqual({ title: 'padded' });
    expect(bareUser.restore(invoice)?.draftData).toEqual({ title: 'bare' });
    expect(separatorUser.restore(invoice)?.draftData).toEqual({ title: 'separator' });
    expect(fallback.getLastDraftDataIssue()).toBe('disabled');
    expect(fallback.restore(invoice)?.query).toBe('owner=fallback');
    expect(fallback.restore(invoice)?.draftData).toBeUndefined();
  });

  it('clears only the targeted explicit user instead of cross-clearing similar identities', () => {
    const storage = createMemoryStorage();
    const invoice = { id: 'invoice', path: '/invoices/new' };
    const base = { tenantId: 'tenant-a', draftFields: ['title'] as const, storage };
    const paddedUser = createWorkspaceTabStateAdapter({ ...base, userId: ' user-1 ' });
    const bareUser = createWorkspaceTabStateAdapter({ ...base, userId: 'user-1' });
    const explicitAnonymous = createWorkspaceTabStateAdapter({
      ...base,
      userId: 'anonymous',
    });
    const fallback = createWorkspaceTabStateAdapter({ ...base });

    paddedUser.capture(invoice, { draft: true, draftData: { title: 'padded' } });
    bareUser.capture(invoice, { draft: true, draftData: { title: 'bare' } });
    explicitAnonymous.capture(invoice, { draft: true, draftData: { title: 'explicit' } });
    fallback.capture(invoice, { query: 'owner=fallback', draft: true });

    expect(paddedUser.clear({ id: 'invoice' })).toEqual({
      memoryCleared: true,
      storage: 'cleared',
    });

    expect(paddedUser.restore(invoice)).toBeUndefined();
    expect(bareUser.restore(invoice)?.draftData).toEqual({ title: 'bare' });
    expect(explicitAnonymous.restore(invoice)?.draftData).toEqual({ title: 'explicit' });
    expect(fallback.restore(invoice)?.query).toBe('owner=fallback');
  });

  it('requires explicit identities to match envelope.userId exactly', () => {
    const storage = createMemoryStorage();
    const options = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      draftFields: ['title'],
      storage,
    };
    const invoice = { id: 'invoice', path: '/invoices/new' };
    createWorkspaceTabStateAdapter(options).capture(invoice, {
      draft: true,
      draftData: { title: 'owned' },
    });
    const [key] = [...storage.data.keys()];
    expect(key).toBeTruthy();
    if (key === undefined) throw new Error('expected a persisted workspace tab state key');

    const envelope = JSON.parse(storage.data.get(key) ?? '{}') as Record<string, unknown>;
    const missingUserId = { ...envelope };
    delete missingUserId['userId'];
    const variants = [
      missingUserId,
      { ...envelope, userId: undefined },
      { ...envelope, userId: 'user-2' },
      { ...envelope, userId: 'anonymous' },
    ];

    for (const variant of variants) {
      storage.data.set(key, JSON.stringify(variant));
      const reopened = createWorkspaceTabStateAdapter(options);
      expect(reopened.restore(invoice)).toBeUndefined();
      expect(reopened.hasDraft(invoice)).toBe(false);
    }
  });

  it('does not enable drafts for blank tenant or user identity', () => {
    const storage = createMemoryStorage();
    const invoice = { id: 'invoice', path: '/invoices/new' };
    const blankTenant = createWorkspaceTabStateAdapter({
      tenantId: '   ',
      userId: 'user-1',
      draftFields: ['title'],
      storage,
    });
    const tenantCapture = blankTenant.capture(invoice, {
      draft: true,
      draftData: { title: 'hidden' },
    });
    expect(blankTenant.getLastDraftDataIssue()).toBe('disabled');
    expect(tenantCapture.draftData).toBeUndefined();

    const blankUser = createWorkspaceTabStateAdapter({
      tenantId: 'tenant-a',
      userId: '   ',
      draftFields: ['title'],
      storage,
    });
    const userCapture = blankUser.capture(invoice, {
      draft: true,
      draftData: { title: 'hidden' },
    });
    expect(blankUser.getLastDraftDataIssue()).toBe('disabled');
    expect(userCapture.draftData).toBeUndefined();
  });

  it('clears draftData on draft:false, explicit undefined and markDraft(false), but keeps it when omitted', () => {
    const storage = createMemoryStorage();
    const options = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      draftFields: ['title'],
      storage,
    };
    const invoice = { id: 'invoice', path: '/invoices/new' };
    const adapter = createWorkspaceTabStateAdapter(options);

    adapter.capture(invoice, { draft: true, draftData: { title: 'first' } });
    expect(adapter.capture(invoice, { query: 'still=1' }).draftData).toEqual({ title: 'first' });
    expect(adapter.capture(invoice, { draftData: undefined }).draftData).toBeUndefined();
    expect(adapter.restore(invoice)?.draftData).toBeUndefined();

    adapter.capture(invoice, { draft: true, draftData: { title: 'second' } });
    expect(adapter.capture(invoice, { draft: false }).draftData).toBeUndefined();
    expect(adapter.restore(invoice)).toEqual({
      query: 'still=1',
      scrollTop: 0,
      scrollLeft: 0,
      draft: false,
    });
    expect(
      createWorkspaceTabStateAdapter(options).restore(invoice)?.draftData,
    ).toBeUndefined();

    adapter.capture(invoice, { draft: true, draftData: { title: 'third' } });
    adapter.markDraft(invoice, false);
    expect(adapter.restore(invoice)?.draftData).toBeUndefined();
    expect(
      createWorkspaceTabStateAdapter(options).restore(invoice)?.draftData,
    ).toBeUndefined();
  });

  it('revalidates maxDraftBytes on restore before filtering the allowlist payload', () => {
    const storage = createMemoryStorage();
    const options = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      draftFields: ['title'],
      maxDraftBytes: 64,
      storage,
    };
    const invoice = { id: 'invoice', path: '/invoices/new' };
    createWorkspaceTabStateAdapter(options).capture(invoice, {
      draft: true,
      draftData: { title: 'ok' },
    });
    const [key] = [...storage.data.keys()];
    expect(key).toBeTruthy();
    if (key === undefined) throw new Error('expected a persisted workspace tab state key');

    const envelope = JSON.parse(storage.data.get(key) ?? '{}') as Record<string, unknown>;
    envelope['draftData'] = { title: 'ok', outsideAllowlist: 'x'.repeat(200) };
    storage.data.set(key, JSON.stringify(envelope));
    const oversized = createWorkspaceTabStateAdapter(options);
    expect(oversized.restore(invoice)).toBeUndefined();
    expect(oversized.getLastDraftDataIssue()).toBe('too-large');

    envelope['draftData'] = { title: 'ok' };
    storage.data.set(key, JSON.stringify(envelope));
    expect(createWorkspaceTabStateAdapter(options).restore(invoice)?.draftData).toEqual({
      title: 'ok',
    });
  });

  it('bounds draft JSON depth and node count for both capture and restore', () => {
    const storage = createMemoryStorage();
    const options = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      draftFields: ['payload'],
      storage,
    };
    const invoice = { id: 'invoice', path: '/invoices/new' };
    const adapter = createWorkspaceTabStateAdapter(options);
    let deep: Record<string, unknown> = { value: 'leaf' };
    for (let index = 0; index < 40; index += 1) deep = { child: deep };
    const wide = Array.from({ length: 10001 }, (_, index) => index);

    const deepCapture = adapter.capture(invoice, {
      draft: true,
      draftData: asDraftData({ payload: deep }),
    });
    expect(adapter.getLastDraftDataIssue()).toBe('invalid');
    expect(deepCapture.draftData).toBeUndefined();

    const wideCapture = adapter.capture(invoice, {
      draft: true,
      draftData: asDraftData({ payload: wide }),
    });
    expect(adapter.getLastDraftDataIssue()).toBe('invalid');
    expect(wideCapture.draftData).toBeUndefined();

    createWorkspaceTabStateAdapter(options).capture(invoice, {
      draft: true,
      draftData: asDraftData({ payload: 'valid' }),
    });
    const [key] = [...storage.data.keys()];
    expect(key).toBeTruthy();
    if (key === undefined) throw new Error('expected a persisted workspace tab state key');
    const envelope = JSON.parse(storage.data.get(key) ?? '{}') as Record<string, unknown>;

    envelope['draftData'] = { payload: deep };
    storage.data.set(key, JSON.stringify(envelope));
    const deepReader = createWorkspaceTabStateAdapter(options);
    expect(() => deepReader.restore(invoice)).not.toThrow();
    expect(deepReader.restore(invoice)).toBeUndefined();
    expect(deepReader.getLastDraftDataIssue()).toBe('invalid');

    envelope['draftData'] = { payload: wide };
    storage.data.set(key, JSON.stringify(envelope));
    const wideReader = createWorkspaceTabStateAdapter(options);
    expect(wideReader.restore(invoice)).toBeUndefined();
    expect(wideReader.getLastDraftDataIssue()).toBe('invalid');
  });

  it('round-trips the maximum draft depth and rejects one level beyond it on capture and restore', () => {
    const storage = createMemoryStorage();
    const options = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      draftFields: ['payload'],
      storage,
    };
    const invoice = { id: 'invoice', path: '/invoices/new' };
    const nest = (levels: number): WorkspaceDraftJsonObject => {
      let value: WorkspaceDraftJsonValue = 'leaf';
      for (let index = 0; index < levels; index += 1) value = { child: value };
      return { payload: value };
    };
    // 根草稿对象 depth 0，字段值 depth 1；31 层 child 后叶节点正好 depth 32。
    const atLimit = nest(31);
    const tooDeep = nest(32);
    const adapter = createWorkspaceTabStateAdapter(options);

    expect(adapter.capture(invoice, { draft: true, draftData: atLimit }).draftData).toEqual(
      atLimit,
    );
    expect(adapter.getLastDraftDataIssue()).toBeUndefined();
    expect(createWorkspaceTabStateAdapter(options).restore(invoice)?.draftData).toEqual(
      atLimit,
    );

    const rejected = adapter.capture(invoice, { draft: true, draftData: tooDeep });
    expect(adapter.getLastDraftDataIssue()).toBe('invalid');
    expect(rejected.draftData).toBeUndefined();

    const [key] = [...storage.data.keys()];
    expect(key).toBeTruthy();
    if (key === undefined) throw new Error('expected a persisted workspace tab state key');
    const envelope = JSON.parse(storage.data.get(key) ?? '{}') as Record<string, unknown>;
    envelope['draftData'] = tooDeep;
    storage.data.set(key, JSON.stringify(envelope));
    const reader = createWorkspaceTabStateAdapter(options);
    expect(reader.restore(invoice)).toBeUndefined();
    expect(reader.getLastDraftDataIssue()).toBe('invalid');
  });

  it('reports storage-failed when markDraft(false) cannot persist the cleared draft', () => {
    const storage = createMemoryStorage();
    const options = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      draftFields: ['title'],
      storage,
    };
    const invoice = { id: 'invoice', path: '/invoices/new' };
    const adapter = createWorkspaceTabStateAdapter(options);
    adapter.capture(invoice, { draft: true, draftData: { title: 'unsaved' } });
    expect(adapter.getLastDraftDataIssue()).toBeUndefined();

    storage.setItem = () => {
      throw new Error('quota exceeded');
    };
    adapter.markDraft(invoice, false);

    expect(adapter.getLastDraftDataIssue()).toBe('storage-failed');
    expect(adapter.hasDraft(invoice)).toBe(false);
    expect(adapter.restore(invoice)?.draftData).toBeUndefined();
  });

  it('scopes failed-clear draft barriers per explicit user', () => {
    const storage = createMemoryStorage();
    const base = { tenantId: 'tenant-a', draftFields: ['title'] as const, storage };
    const invoice = { id: 'invoice', path: '/invoices/new' };
    const userOne = createWorkspaceTabStateAdapter({ ...base, userId: 'user-1' });
    const userTwo = createWorkspaceTabStateAdapter({ ...base, userId: 'user-2' });
    userOne.capture(invoice, { draft: true, draftData: { title: 'user-one' } });
    userTwo.capture(invoice, { draft: true, draftData: { title: 'user-two' } });

    storage.removeItem = () => {
      throw new Error('storage locked');
    };
    expect(userOne.clear({ id: 'invoice' })).toEqual({
      memoryCleared: true,
      storage: 'failed',
    });
    expect(userOne.restore(invoice)).toBeUndefined();
    expect(
      createWorkspaceTabStateAdapter({ ...base, userId: 'user-1' }).restore(invoice),
    ).toBeUndefined();

    expect(userTwo.restore(invoice)?.draftData).toEqual({ title: 'user-two' });
    expect(
      createWorkspaceTabStateAdapter({ ...base, userId: 'user-2' }).restore(invoice)
        ?.draftData,
    ).toEqual({ title: 'user-two' });
  });

  it('reads legacy snapshots written before userId was part of the storage key', () => {
    const storage = createMemoryStorage();
    const legacyKey = 'svadmin:workspace-tab-state:v1:tenant-a:orders';
    storage.data.set(
      legacyKey,
      JSON.stringify({
        version: 1,
        tenantId: 'tenant-a',
        tabId: 'orders',
        path: '/orders',
        query: 'legacy=1',
        scrollTop: 5,
        scrollLeft: 0,
        draft: true,
      }),
    );

    const adapter = createWorkspaceTabStateAdapter({ tenantId: 'tenant-a', storage });
    expect(adapter.restore({ id: 'orders', path: '/orders' })).toEqual({
      query: 'legacy=1',
      scrollTop: 5,
      scrollLeft: 0,
      draft: true,
    });
  });
});
