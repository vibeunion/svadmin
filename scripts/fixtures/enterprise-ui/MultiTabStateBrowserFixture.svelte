<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import MultiTabKeepAlive, { type WorkspaceTab } from '../../../packages/ui/src/components/MultiTabKeepAlive.svelte';
  import {
    createWorkspaceTabStateAdapter,
    type WorkspaceTabStateStorage,
  } from '../../../packages/ui/src/components/workspace-tab-state.js';

  // 受控 session storage：只包裹当前测试前缀，不读取/写入产品 storage 键。
  // 适配器仍通过显式注入使用它，页面不会自动持久化其他业务数据。
  const CONTROLLED_STORAGE_PREFIX = 'b3-09-fixture:';
  const controlledSessionStorage: WorkspaceTabStateStorage = {
    getItem(key) {
      return window.sessionStorage.getItem(CONTROLLED_STORAGE_PREFIX + key);
    },
    setItem(key, value) {
      window.sessionStorage.setItem(CONTROLLED_STORAGE_PREFIX + key, value);
    },
    removeItem(key) {
      window.sessionStorage.removeItem(CONTROLLED_STORAGE_PREFIX + key);
    },
  };

  const TENANT_ID = 'tenant-a';
  const INVOICE_PATH = '/invoices/new';
  const adapter = createWorkspaceTabStateAdapter({
    tenantId: TENANT_ID,
    storage: controlledSessionStorage,
  });

  function makeInvoiceTab(): WorkspaceTab {
    return { id: 'invoice', title: 'Invoice draft', path: INVOICE_PATH, dirty: true };
  }

  const initialTabs: WorkspaceTab[] = [
    { id: 'orders', title: 'Orders', path: '/orders' },
    { id: 'mail', title: 'Mail', path: '/mail' },
    makeInvoiceTab(),
  ];

  let tabs = $state<WorkspaceTab[]>(initialTabs.map((tab) => ({ ...tab })));
  let activeTabId = $state('orders');
  let currentTabId = $state('orders');
  let invoiceDraft = $state(true);
  let frozen = $state(false);
  let panel = $state<HTMLDivElement>();

  // 首次挂载也按 active 标签恢复，而不是只依赖切换回调。
  const initialTab = tabs.find((tab) => tab.id === activeTabId);
  const initialSnapshot = initialTab
    ? adapter.restore({ id: initialTab.id, path: initialTab.path })
    : undefined;
  let query = $state(initialSnapshot?.query ?? '');
  let scrollTop = $state(initialSnapshot?.scrollTop ?? 0);

  // 草稿保护由真实 adapter 声明，宿主只决定何时标记/清除。
  adapter.markDraft({ id: 'invoice', path: INVOICE_PATH }, invoiceDraft);

  const currentTab = $derived(tabs.find((tab) => tab.id === currentTabId));

  function capture(tab: WorkspaceTab | undefined, draft?: boolean) {
    if (!tab) return;
    adapter.capture(
      { id: tab.id, path: tab.path },
      { query, scrollTop, scrollLeft: 0, draft: draft ?? tab.dirty ?? false },
    );
  }

  function handleSelect(tab: WorkspaceTab) {
    // 离开当前标签前保存，随后只恢复目标标签自己的快照。
    capture(currentTab);
    const restored = adapter.restore({ id: tab.id, path: tab.path });
    currentTabId = tab.id;
    query = restored?.query ?? '';
    scrollTop = restored?.scrollTop ?? 0;
    void tick().then(() => {
      if (panel) panel.scrollTop = scrollTop;
    });
  }

  function handleClose(tabId: string) {
    // 关闭后清除该标签快照；重开同 id 标签不得恢复旧查询/滚动。
    adapter.clear({ id: tabId });
    if (currentTabId === tabId) {
      currentTabId = activeTabId;
      query = '';
      scrollTop = 0;
    }
  }

  function handleBeforeClose(tab: WorkspaceTab): boolean {
    return !adapter.hasDraft({ id: tab.id, path: tab.path });
  }

  function handleScroll(event: Event) {
    scrollTop = (event.currentTarget as HTMLDivElement).scrollTop;
  }

  function setQuery(value: string) {
    query = value;
  }

  function clearInvoiceDraft() {
    invoiceDraft = false;
    // markDraft 只改草稿标记，沿用该标签已有查询/滚动快照。
    adapter.markDraft({ id: 'invoice', path: INVOICE_PATH }, false);
  }

  function freezeTabs() {
    // 冻结标签数组和标签对象，验证关闭保护不依赖可变调用方数据。
    const frozenTabs = Object.freeze(
      tabs.map((tab) => Object.freeze({ ...tab })),
    ) as WorkspaceTab[];
    tabs = frozenTabs;
    frozen = true;
  }

  function reopenInvoice() {
    if (tabs.some((tab) => tab.id === 'invoice')) return;
    const tab = Object.freeze(makeInvoiceTab()) as WorkspaceTab;
    tabs = Object.freeze([...tabs, tab]) as WorkspaceTab[];
    handleSelect(tab);
  }

  $effect(() => {
    if (panel) panel.scrollTop = scrollTop;
  });

  onDestroy(() => {
    capture(currentTab);
    adapter.dispose();
  });
</script>

<main data-testid="multi-tab-state-fixture">
  <div
    data-testid="mt-state"
    data-active-tab={currentTabId}
    data-tab-count={String(tabs.length)}
    data-query={query}
    data-scroll-top={String(scrollTop)}
    data-invoice-draft={invoiceDraft ? 'true' : 'false'}
    data-frozen={frozen ? 'true' : 'false'}
    data-panel-count={String(tabs.length)}
  ></div>

  <!-- 直接挂载真实组件，不 mock 标签栏 -->
  <MultiTabKeepAlive
    bind:tabs
    bind:activeTabId
    onselect={handleSelect}
    onclose={handleClose}
    onbeforeclose={handleBeforeClose}
  />

  <section aria-label="Workspace state">
    <label for="multi-tab-query">Workspace query</label>
    <input id="multi-tab-query" bind:value={query} />

    <div
      data-testid="multi-tab-scroll"
      bind:this={panel}
      onscroll={handleScroll}
      style="height: 100px; overflow: auto;"
    >
      <div style="height: 1000px;"></div>
    </div>

    <div class="fixture-actions">
      <button type="button" data-testid="set-orders-query" onclick={() => setQuery('status=open')}>Set orders query</button>
      <button type="button" data-testid="clear-invoice-draft" onclick={clearInvoiceDraft}>Clear invoice draft</button>
      <button type="button" data-testid="freeze-tabs" onclick={freezeTabs}>Freeze tab list</button>
      <button type="button" data-testid="reopen-invoice" onclick={reopenInvoice}>Reopen invoice tab</button>
    </div>
  </section>
</main>