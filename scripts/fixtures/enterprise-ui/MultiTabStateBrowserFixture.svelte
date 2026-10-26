<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import MultiTabKeepAlive, {
    type WorkspaceTab,
    type WorkspaceTabLimitReachedDetail,
    type WorkspaceTabOpenResult,
  } from '../../../packages/ui/src/components/MultiTabKeepAlive.svelte';
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
  const MAIL_PATH = '/mail';
  const REPORTS_PATH = '/reports';
  const searchParams = new URLSearchParams(window.location.search);

  // 草稿载荷是 opt-in 场景：只有显式 draftPayload=1 才启用，默认页面行为不变。
  const draftPayloadEnabled = searchParams.get('draftPayload') === '1';
  const draftUserId = draftPayloadEnabled ? (searchParams.get('user') ?? '') : '';
  const tenantId = draftPayloadEnabled
    ? (searchParams.get('tenant') ?? TENANT_ID)
    : TENANT_ID;

  // 可选 URL 上限：不提供 maxTabs 时保持既有场景行为完全不变。
  const rawMaxTabs = searchParams.get('maxTabs');
  const parsedMaxTabs = rawMaxTabs === null ? undefined : Number(rawMaxTabs);
  const maxTabs =
    parsedMaxTabs !== undefined && Number.isSafeInteger(parsedMaxTabs) && parsedMaxTabs > 0
      ? parsedMaxTabs
      : undefined;
  const adapter = createWorkspaceTabStateAdapter({
    tenantId,
    storage: controlledSessionStorage,
    ...(draftPayloadEnabled && draftUserId.trim().length > 0
      ? { userId: draftUserId, draftFields: ['title'] as const }
      : {}),
  });

  function makeInvoiceTab(): WorkspaceTab {
    return { id: 'invoice', title: 'Invoice draft', path: INVOICE_PATH, dirty: true };
  }

  function makeMailTab(): WorkspaceTab {
    return { id: 'mail', title: 'Mail', path: MAIL_PATH };
  }

  function makeReportsTab(): WorkspaceTab {
    return { id: 'reports', title: 'Reports', path: REPORTS_PATH };
  }

  const initialTabs: WorkspaceTab[] = [
    { id: 'orders', title: 'Orders', path: '/orders' },
    makeMailTab(),
    makeInvoiceTab(),
  ];

  let tabs = $state<WorkspaceTab[]>(initialTabs.map((tab) => ({ ...tab })));
  let activeTabId = $state('orders');
  let currentTabId = $state('orders');
  let invoiceDraft = $state(true);
  let frozen = $state(false);
  let panel = $state<HTMLDivElement>();
  let openResult = $state('idle');
  let openReason = $state('');
  let limitCount = $state(0);
  let draftTitle = $state('');
  let draftCandidate = $state('');
  let draftPending = $state(false);
  // 直接绑定真实组件实例，测试只通过页面按钮触发公开的 openTab 入口。
  let multiTab = $state<{
    openTab: (tab: WorkspaceTab) => Promise<WorkspaceTabOpenResult>;
  }>();

  // 首次挂载也按 active 标签恢复，而不是只依赖切换回调。
  const initialTab = tabs.find((tab) => tab.id === activeTabId);
  const initialSnapshot = initialTab
    ? adapter.restore({ id: initialTab.id, path: initialTab.path })
    : undefined;
  let query = $state(initialSnapshot?.query ?? '');
  let scrollTop = $state(initialSnapshot?.scrollTop ?? 0);

  // 草稿保护由真实 adapter 声明，宿主只决定何时标记/清除。
  adapter.markDraft({ id: 'invoice', path: INVOICE_PATH }, invoiceDraft);

  // 初始 markDraft 只更新草稿标记；持久化里已有的草稿内容必须保留为“待确认
  // 候选”，不能自动填回输入框，也不能被初始标记覆盖。
  if (draftPayloadEnabled) {
    const candidate = adapter.restore({ id: 'invoice', path: INVOICE_PATH })?.draftData?.[
      'title'
    ];
    if (typeof candidate === 'string') {
      draftCandidate = candidate;
      draftPending = true;
    }
  }

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

  function handleDraftTitleInput(event: Event) {
    draftTitle = (event.currentTarget as HTMLInputElement).value;
    if (!draftPayloadEnabled) return;
    const existing = adapter.restore({ id: 'invoice', path: INVOICE_PATH });
    adapter.capture(
      { id: 'invoice', path: INVOICE_PATH },
      {
        query: existing?.query ?? '',
        scrollTop: existing?.scrollTop ?? 0,
        scrollLeft: existing?.scrollLeft ?? 0,
        draft: true,
        draftData: { title: draftTitle },
      },
    );
    draftCandidate = draftTitle;
    draftPending = false;
  }

  function restoreDraft() {
    if (draftCandidate === '') return;
    // 只在明确点击后把候选写进输入框；不触碰任何业务 Provider。
    draftTitle = draftCandidate;
    draftPending = false;
  }

  function discardDraft() {
    // markDraft(false) 清除草稿载荷，旧候选不能再恢复。
    adapter.markDraft({ id: 'invoice', path: INVOICE_PATH }, false);
    invoiceDraft = false;
    draftTitle = '';
    draftCandidate = '';
    draftPending = false;
  }

  function freezeTabs() {
    // 冻结标签数组和标签对象，验证关闭保护不依赖可变调用方数据。
    const frozenTabs = Object.freeze(
      tabs.map((tab) => Object.freeze({ ...tab })),
    ) as WorkspaceTab[];
    tabs = frozenTabs;
    frozen = true;
  }

  async function openThroughTabBar(tab: WorkspaceTab) {
    if (!multiTab) return;
    const result = await multiTab.openTab(tab);
    openResult = result.status;
    openReason = result.status === 'rejected' ? result.reason : '';
  }

  function openReports() {
    void openThroughTabBar(makeReportsTab());
  }

  function reopenMail() {
    void openThroughTabBar(makeMailTab());
  }

  function handleTabLimitReached(_detail: WorkspaceTabLimitReachedDetail) {
    limitCount += 1;
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
    data-max-tabs={maxTabs === undefined ? '' : String(maxTabs)}
    data-open-result={openResult}
    data-open-reason={openReason}
    data-limit-count={String(limitCount)}
    data-draft-payload={draftPayloadEnabled ? 'true' : 'false'}
    data-draft-title={draftTitle}
    data-draft-pending={draftPending ? 'true' : 'false'}
  ></div>

  <!-- 直接挂载真实组件，不 mock 标签栏 -->
  <MultiTabKeepAlive
    bind:this={multiTab}
    bind:tabs
    bind:activeTabId
    {maxTabs}
    onselect={handleSelect}
    onclose={handleClose}
    onbeforeclose={handleBeforeClose}
    onTabLimitReached={handleTabLimitReached}
  />

  <section aria-label="Workspace state">
    <label for="multi-tab-query">Workspace query</label>
    <input id="multi-tab-query" bind:value={query} />

    {#if draftPayloadEnabled}
      <label for="multi-tab-draft-title">Draft title</label>
      <input
        id="multi-tab-draft-title"
        value={draftTitle}
        oninput={handleDraftTitleInput}
      />
      {#if draftPending}
        <button type="button" data-testid="restore-draft" onclick={restoreDraft}>Restore draft</button>
      {/if}
      <button type="button" data-testid="discard-draft" onclick={discardDraft}>Discard draft</button>
    {/if}

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
      <button type="button" data-testid="open-reports" onclick={openReports}>Open Reports</button>
      <button type="button" data-testid="reopen-mail" onclick={reopenMail}>Reopen Mail</button>
    </div>
  </section>
</main>
