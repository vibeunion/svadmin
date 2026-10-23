<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import MultiTabKeepAlive, { type WorkspaceTab } from './MultiTabKeepAlive.svelte';
  import type {
    WorkspaceTabStateAdapter,
    WorkspaceTabViewState,
  } from './workspace-tab-state.js';

  interface Props {
    tabs?: WorkspaceTab[];
    activeTabId?: string;
    adapter: WorkspaceTabStateAdapter;
    initialQuery?: string;
    initialScrollTop?: number;
  }

  let {
    tabs: initialTabs = [],
    activeTabId: initialActiveTabId = '',
    adapter,
    initialQuery = '',
    initialScrollTop = 0,
  }: Props = $props();

  // 宿主拥有标签与查询状态；adapter 只负责按租户/标签保存和恢复快照。
  // svelte-ignore state_referenced_locally
  const initialTab = initialTabs.find((tab) => tab.id === initialActiveTabId);
  // svelte-ignore state_referenced_locally
  const initialSnapshot = initialTab
    ? adapter.restore({ id: initialTab.id, path: initialTab.path })
    : undefined;
  // svelte-ignore state_referenced_locally
  let tabs = $state<WorkspaceTab[]>(initialTabs);
  // svelte-ignore state_referenced_locally
  let activeTabId = $state(initialActiveTabId);
  // svelte-ignore state_referenced_locally
  let currentTabId = $state(initialActiveTabId);
  // 初次挂载也恢复 active 标签，而不是只依赖切换回调。
  // svelte-ignore state_referenced_locally
  let query = $state(initialSnapshot?.query ?? initialQuery);
  // svelte-ignore state_referenced_locally
  let scrollTop = $state(initialSnapshot?.scrollTop ?? initialScrollTop);
  let panel = $state<HTMLDivElement>();

  const currentTab = $derived(tabs.find((tab) => tab.id === currentTabId));

  function capture(tab: WorkspaceTab | undefined, draft?: boolean) {
    if (!tab) return;
    adapter.capture(
      { id: tab.id, path: tab.path },
      { query, scrollTop, scrollLeft: 0, draft: draft ?? tab.dirty ?? false },
    );
  }

  function handleSelect(tab: WorkspaceTab) {
    // 离开当前标签前保存，随后用目标标签自己的快照恢复。
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
    // 标签移除后撤销其快照，避免重新打开旧标签时恢复过期查询/滚动。
    adapter.clear({ id: tabId });
    if (currentTabId === tabId) {
      currentTabId = activeTabId;
      query = '';
      scrollTop = 0;
    }
  }

  function handleBeforeClose(tab: WorkspaceTab): boolean {
    // 真实消费者把草稿保护交给 adapter；tab.dirty 只是消费方声明。
    return !adapter.hasDraft({ id: tab.id, path: tab.path });
  }

  function handleScroll(event: Event) {
    scrollTop = (event.currentTarget as HTMLDivElement).scrollTop;
  }

  $effect(() => {
    if (panel) panel.scrollTop = scrollTop;
  });

  onDestroy(() => {
    // 卸载前保存当前标签（包括尚未切换过的查询/滚动），再释放内存快照。
    capture(currentTab);
    adapter.dispose();
  });
</script>

<div
  data-testid="workspace-state"
  data-active-tab={currentTabId}
  data-tab-count={tabs.length}
  data-query={query}
  data-scroll-top={String(scrollTop)}
  data-draft={currentTab ? String(adapter.hasDraft(currentTab)) : 'false'}
></div>

<MultiTabKeepAlive
  bind:tabs
  bind:activeTabId
  onselect={handleSelect}
  onclose={handleClose}
  onbeforeclose={handleBeforeClose}
/>

<div class="workspace-tab-state-panel">
  <label for="workspace-query">Workspace query</label>
  <input id="workspace-query" bind:value={query} />
  <div
    data-testid="workspace-scroll"
    bind:this={panel}
    onscroll={handleScroll}
    style="height: 100px; overflow: auto;"
  >
    <div style="height: 1000px;"></div>
  </div>
</div>