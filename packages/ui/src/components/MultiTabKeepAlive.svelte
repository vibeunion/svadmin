<script lang="ts">
  import { onDestroy } from 'svelte';
  import { X, Pin, RefreshCw, XCircle } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { cn } from '../utils.js';

  export interface WorkspaceTab {
    id: string;
    title: string;
    path: string;
    closable?: boolean;
    pinned?: boolean;
    icon?: string;
    /** 消费方声明该标签存在未保存草稿，关闭保护由 onbeforeclose 决定。 */
    dirty?: boolean;
  }

  export type WorkspaceTabOpenStatus = 'opened' | 'selected' | 'rejected';

  export type WorkspaceTabOpenRejectReason =
    | 'invalid-max-tabs'
    | 'duplicate-id-path-mismatch'
    | 'limit-reached'
    | 'eviction-declined'
    | 'operation-in-flight'
    | 'stale-state'
    | 'unmounted';

  export interface WorkspaceTabOpenAcceptedResult {
    status: 'opened' | 'selected';
    tab: WorkspaceTab;
    /** 本次成功打开时被确认淘汰的标签 id，按淘汰顺序排列。 */
    evictedTabIds: string[];
  }

  export interface WorkspaceTabOpenRejectedResult {
    status: 'rejected';
    reason: WorkspaceTabOpenRejectReason;
    tab: WorkspaceTab;
  }

  export type WorkspaceTabOpenResult =
    | WorkspaceTabOpenAcceptedResult
    | WorkspaceTabOpenRejectedResult;

  export interface WorkspaceTabLimitReachedDetail {
    tab: WorkspaceTab;
    maxTabs: number;
    /** 当前非固定标签数量，固定标签不计入额度。 */
    quota: number;
    reason: 'no-safe-candidate' | 'eviction-declined';
  }

  interface Props {
    tabs?: WorkspaceTab[];
    activeTabId?: string;
    /** 可选上限，仅统计非固定标签；不提供则不设隐式默认值。 */
    maxTabs?: number;
    onselect?: ((tab: WorkspaceTab) => void) | undefined;
    onclose?: ((tabId: string) => void) | undefined;
    /**
     * 关闭保护：返回 false（或抛错）时保留标签；异步确认期间不提前移除。
     * 仅对可关闭且未固定的标签调用。
     */
    onbeforeclose?: ((tab: WorkspaceTab) => boolean | Promise<boolean>) | undefined;
    oncloseothers?: ((tabId: string) => void) | undefined;
    oncloseall?: (() => void) | undefined;
    onrefresh?: ((tab: WorkspaceTab) => void) | undefined;
    /** 打开准入失败且未改动 tabs 时报告，由宿主决定提示或拒绝。 */
    onTabLimitReached?: ((detail: WorkspaceTabLimitReachedDetail) => void) | undefined;
    class?: string;
  }

  let {
    tabs = $bindable([]),
    activeTabId = $bindable(''),
    maxTabs,
    onselect,
    onclose,
    onbeforeclose,
    oncloseothers,
    oncloseall,
    onrefresh,
    onTabLimitReached,
    class: className = '',
  }: Props = $props();

  function handleSelect(tab: WorkspaceTab) {
    touchTab(tab);
    activeTabId = tab.id;
    onselect?.(tab);
  }

  function handleRefresh(tab: WorkspaceTab) {
    touchTab(tab);
    onrefresh?.(tab);
  }

  function isRovingTab(tab: WorkspaceTab): boolean {
    const activeIndex = tabs.findIndex((candidate) => candidate.id === activeTabId);
    const rovingTab = tabs[activeIndex === -1 ? 0 : activeIndex];
    return rovingTab?.id === tab.id;
  }

  type TabKeyboardEvent = KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement };

  function handleTabKeydown(event: TabKeyboardEvent, tab: WorkspaceTab) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(tab);
      return;
    }

    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;

    const tabList = event.currentTarget.closest('[role="tablist"]');
    if (!tabList) return;
    const tabElements = Array.from(tabList.querySelectorAll<HTMLElement>('[role="tab"]'));
    const currentIndex = tabs.findIndex((candidate) => candidate.id === tab.id);
    if (currentIndex === -1 || tabs.length === 0) return;

    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : event.key === 'ArrowRight'
            ? (currentIndex + 1) % tabs.length
            : (currentIndex - 1 + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;

    event.preventDefault();
    tabElements[nextIndex]?.focus();
    handleSelect(nextTab);
  }

  let disposed = false;
  let closeOperationInFlight = false;
  onDestroy(() => {
    disposed = true;
  });

  function isClosable(tab: WorkspaceTab): boolean {
    return !tab.pinned && tab.closable !== false;
  }

  async function confirmClose(tab: WorkspaceTab): Promise<boolean> {
    if (!onbeforeclose) return true;
    try {
      return (await onbeforeclose(tab)) !== false;
    } catch {
      // 守卫不可用时按保护处理，避免丢失草稿。
      return false;
    }
  }

  async function confirmEviction(tab: WorkspaceTab): Promise<boolean> {
    if (!onbeforeclose) return true;
    try {
      // 自动淘汰必须由守卫明确批准；truthy 的非 boolean 一律按拒绝处理。
      return (await onbeforeclose(tab)) === true;
    } catch {
      return false;
    }
  }

  function findCurrent(tab: WorkspaceTab): { index: number; tab: WorkspaceTab } | undefined {
    const index = tabs.findIndex((candidate) => candidate.id === tab.id);
    const current = tabs[index];
    return current === tab ? { index, tab: current } : undefined;
  }

  function tabAccessKey(tab: WorkspaceTab): string {
    // 逻辑身份而非对象身份，宿主重建 tab 对象后仍保留访问顺序；path 隔离避免串路由。
    return `${tab.id}\u0000${tab.path}`;
  }

  const touchOrder = new Map<string, number>();
  let touchCounter = 0;
  let lastObservedActiveTabId: string | undefined;

  function pruneTouchOrder(list: WorkspaceTab[]): void {
    const liveKeys = new Set(list.map(tabAccessKey));
    for (const key of touchOrder.keys()) {
      if (!liveKeys.has(key)) touchOrder.delete(key);
    }
  }

  function touchTab(tab: WorkspaceTab) {
    // 同一逻辑 id+path 只保留最后一次实际访问顺序；首次并列时由数组下标兜底。
    touchCounter = Math.max(touchCounter, tabs.length) + 1;
    touchOrder.set(tabAccessKey(tab), touchCounter);
  }

  $effect(() => {
    pruneTouchOrder(tabs);
    const observed = activeTabId;
    if (observed === lastObservedActiveTabId) return;
    lastObservedActiveTabId = observed;
    const active = tabs.find((tab) => tab.id === observed);
    if (active) touchTab(active);
  });

  function isValidMaxTabs(value: number | undefined): boolean {
    return value === undefined || (Number.isSafeInteger(value) && value > 0);
  }

  function isAutoEvictable(tab: WorkspaceTab): boolean {
    return (
      !tab.pinned &&
      tab.closable !== false &&
      tab.dirty !== true &&
      tab.id !== activeTabId
    );
  }

  function quotaOf(list: WorkspaceTab[]): number {
    return list.filter((tab) => !tab.pinned).length;
  }

  function lruCandidates(list: WorkspaceTab[], targetId: string): WorkspaceTab[] {
    pruneTouchOrder(list);
    const withIndex = list.map((tab, index) => ({ tab, index }));
    return withIndex
      .filter(({ tab }) => tab.id !== targetId && isAutoEvictable(tab))
      .sort((a, b) => {
        const rankA = touchOrder.get(tabAccessKey(a.tab)) ?? a.index;
        const rankB = touchOrder.get(tabAccessKey(b.tab)) ?? b.index;
        return rankA - rankB || a.index - b.index;
      })
      .map(({ tab }) => tab);
  }

  function activateFallback(removedIndex: number) {
    if (disposed) return;
    const nextTab = tabs[Math.min(removedIndex, tabs.length - 1)];
    if (nextTab) {
      activeTabId = nextTab.id;
      onselect?.(nextTab);
      return;
    }
    activeTabId = '';
  }

  function removeAllowed(allowed: WorkspaceTab[], activeIndex: number): boolean {
    // 批次结束前不做赋值，最后一次性 immutable filter，避免自己重建数组导致引用失效。
    const removable = allowed.filter((tab) => {
      const current = findCurrent(tab);
      return Boolean(current && isClosable(current.tab));
    });
    if (removable.length === 0) return false;

    const removeSet = new Set(removable);
    const activeRemoved = removable.some((tab) => tab.id === activeTabId);
    tabs = tabs.filter((candidate) => !removeSet.has(candidate));
    removable.forEach((tab) => onclose?.(tab.id));
    if (activeRemoved) activateFallback(activeIndex);
    return true;
  }

  async function handleClose(e: MouseEvent, tabId: string) {
    e.stopPropagation();
    if (closeOperationInFlight) return;
    closeOperationInFlight = true;
    try {
      const tab = tabs.find((candidate) => candidate.id === tabId);
      if (!tab || !isClosable(tab)) return;
      if (!(await confirmClose(tab))) return;
      if (disposed) return;

      const current = findCurrent(tab);
      if (!current || !isClosable(current.tab)) return;

      tabs = tabs.filter((candidate) => candidate !== tab);
      onclose?.(tab.id);
      if (activeTabId === tab.id) activateFallback(current.index);
    } finally {
      closeOperationInFlight = false;
    }
  }

  async function handleCloseAll() {
    if (closeOperationInFlight) return;
    closeOperationInFlight = true;
    try {
      const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      const allowed: WorkspaceTab[] = [];
      // 顺序确认：上一个守卫结算后才询问下一个，避免同时弹出多个确认框。
      for (const tab of tabs.slice()) {
        if (disposed) return;
        if (!isClosable(tab)) continue;
        if (!(await confirmClose(tab))) continue;
        if (disposed) return;

        const current = findCurrent(tab);
        if (current && isClosable(current.tab)) allowed.push(tab);
      }
      if (disposed) return;

      removeAllowed(allowed, activeIndex);
      oncloseall?.();
    } finally {
      closeOperationInFlight = false;
    }
  }

  async function handleContextMenu(e: MouseEvent, tabId: string) {
    e.preventDefault();
    if (!oncloseothers || closeOperationInFlight) return;
    closeOperationInFlight = true;
    try {
      const target = tabs.find((tab) => tab.id === tabId);
      if (!target) return;

      const allowed: WorkspaceTab[] = [];
      for (const tab of tabs.slice()) {
        if (tab === target) continue;
        if (disposed) return;
        // 目标消失或被替换后立即中止，不再询问后续守卫。
        if (!findCurrent(target)) return;
        if (!isClosable(tab)) continue;
        if (!(await confirmClose(tab))) continue;
        if (disposed) return;
        if (!findCurrent(target)) return;

        const current = findCurrent(tab);
        if (current && isClosable(current.tab)) allowed.push(tab);
      }
      if (disposed) return;
      if (!findCurrent(target)) return;

      const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      // 赋值前确认目标仍是原实例；赋值后只能按 id 判断目标仍在。
      removeAllowed(allowed, activeIndex);

      if (tabs.some((tab) => tab.id === target.id)) {
        activeTabId = target.id;
        oncloseothers(target.id);
      }
    } finally {
      closeOperationInFlight = false;
    }
  }

  interface OpenTabSnapshot {
    sourceTabs: WorkspaceTab[];
    maxTabs: number | undefined;
    guard: Props['onbeforeclose'];
    activeTabId: string;
    entries: Array<{
      tab: WorkspaceTab;
      id: string;
      path: string;
      pinned: boolean | undefined;
      dirty: boolean | undefined;
      closable: boolean | undefined;
    }>;
    incoming: {
      id: string;
      path: string;
      pinned: boolean | undefined;
      dirty: boolean | undefined;
      closable: boolean | undefined;
    };
  }

  function captureOpenTabSnapshot(
    sourceTabs: WorkspaceTab[],
    observedMaxTabs: number | undefined,
    incoming: WorkspaceTab,
  ): OpenTabSnapshot {
    return {
      sourceTabs,
      maxTabs: observedMaxTabs,
      guard: onbeforeclose,
      activeTabId,
      entries: sourceTabs.map((tab) => ({
        tab,
        id: tab.id,
        path: tab.path,
        pinned: tab.pinned,
        dirty: tab.dirty,
        closable: tab.closable,
      })),
      incoming: {
        id: incoming.id,
        path: incoming.path,
        pinned: incoming.pinned,
        dirty: incoming.dirty,
        closable: incoming.closable,
      },
    };
  }

  function isOpenSnapshotStale(snapshot: OpenTabSnapshot, incoming: WorkspaceTab): boolean {
    if (
      disposed ||
      tabs !== snapshot.sourceTabs ||
      maxTabs !== snapshot.maxTabs ||
      onbeforeclose !== snapshot.guard ||
      activeTabId !== snapshot.activeTabId
    ) {
      return true;
    }
    if (tabs.length !== snapshot.entries.length) return true;
    for (let index = 0; index < snapshot.entries.length; index += 1) {
      const entry = snapshot.entries[index];
      if (!entry) return true;
      const current = tabs[index];
      if (
        !current ||
        current !== entry.tab ||
        current.id !== entry.id ||
        current.path !== entry.path ||
        current.pinned !== entry.pinned ||
        current.dirty !== entry.dirty ||
        current.closable !== entry.closable
      ) {
        return true;
      }
    }
    return (
      incoming.id !== snapshot.incoming.id ||
      incoming.path !== snapshot.incoming.path ||
      incoming.pinned !== snapshot.incoming.pinned ||
      incoming.dirty !== snapshot.incoming.dirty ||
      incoming.closable !== snapshot.incoming.closable
    );
  }

  /**
   * 原子打开入口：maxTabs 只在这里准入，宿主直接改 tabs 或下调 maxTabs 不会触发删除。
   * 淘汰需要 onbeforeclose 确认；任一守卫拒绝、抛错、卸载或状态变化都保持 tabs 不变。
   */
  export async function openTab(tab: WorkspaceTab): Promise<WorkspaceTabOpenResult> {
    if (!isValidMaxTabs(maxTabs)) {
      return { status: 'rejected', reason: 'invalid-max-tabs', tab };
    }
    if (disposed) {
      return { status: 'rejected', reason: 'unmounted', tab };
    }
    if (closeOperationInFlight) {
      return { status: 'rejected', reason: 'operation-in-flight', tab };
    }

    const existing = tabs.find((candidate) => candidate.id === tab.id);
    if (existing) {
      if (existing.path !== tab.path) {
        return { status: 'rejected', reason: 'duplicate-id-path-mismatch', tab: existing };
      }
      touchTab(existing);
      activeTabId = existing.id;
      onselect?.(existing);
      return { status: 'selected', tab: existing, evictedTabIds: [] };
    }

    closeOperationInFlight = true;
    try {
      const sourceTabs = tabs;
      const observedMaxTabs = maxTabs;
      const quota = quotaOf(sourceTabs);
      const adjustedCount = quota + (tab.pinned ? 0 : 1);

      // 新标签自身是固定标签时不占额，也不得因宿主已超额而连带淘汰普通标签。
      if (tab.pinned === true || observedMaxTabs === undefined || adjustedCount <= observedMaxTabs) {
        tabs = [...sourceTabs, tab];
        touchTab(tab);
        activeTabId = tab.id;
        onselect?.(tab);
        return { status: 'opened', tab, evictedTabIds: [] };
      }

      const needed = adjustedCount - observedMaxTabs;
      const candidates = lruCandidates(sourceTabs, tab.id).slice(0, needed);
      if (candidates.length < needed) {
        onTabLimitReached?.({
          tab,
          maxTabs: observedMaxTabs,
          quota,
          reason: 'no-safe-candidate',
        });
        return { status: 'rejected', reason: 'limit-reached', tab };
      }

      const snapshot = captureOpenTabSnapshot(sourceTabs, observedMaxTabs, tab);
      for (const candidate of candidates) {
        if (isOpenSnapshotStale(snapshot, tab)) {
          return { status: 'rejected', reason: disposed ? 'unmounted' : 'stale-state', tab };
        }
        if (!(await confirmEviction(candidate))) {
          if (disposed) return { status: 'rejected', reason: 'unmounted', tab };
          if (isOpenSnapshotStale(snapshot, tab)) {
            return { status: 'rejected', reason: 'stale-state', tab };
          }
          onTabLimitReached?.({
            tab,
            maxTabs: observedMaxTabs,
            quota,
            reason: 'eviction-declined',
          });
          return { status: 'rejected', reason: 'eviction-declined', tab };
        }
        if (isOpenSnapshotStale(snapshot, tab)) {
          return { status: 'rejected', reason: disposed ? 'unmounted' : 'stale-state', tab };
        }
      }

      if (isOpenSnapshotStale(snapshot, tab)) {
        return { status: 'rejected', reason: disposed ? 'unmounted' : 'stale-state', tab };
      }

      const removeSet = new Set(candidates);
      tabs = [...sourceTabs.filter((candidate) => !removeSet.has(candidate)), tab];
      touchTab(tab);
      activeTabId = tab.id;
      candidates.forEach((candidate) => onclose?.(candidate.id));
      onselect?.(tab);
      return {
        status: 'opened',
        tab,
        evictedTabIds: candidates.map((candidate) => candidate.id),
      };
    } finally {
      closeOperationInFlight = false;
    }
  }
</script>

<div class={cn('flex items-center justify-between border-b border-border/80 bg-muted/30 px-2 text-xs select-none', className)}>
  <!-- Tabs list -->
  <div role="tablist" aria-label="Workspace tabs" aria-orientation="horizontal" class="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
    {#each tabs as tab (tab.id)}
      {@const isActive = tab.id === activeTabId}
      <div
        role="presentation"
        class={cn(
          'group relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer border',
          isActive
            ? 'bg-card text-foreground border-border shadow-xs'
            : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/60 hover:text-foreground'
        )}
      >
        <div
          role="tab"
          tabindex={isRovingTab(tab) ? 0 : -1}
          aria-selected={isActive}
          class="flex items-center gap-1.5"
          onclick={() => handleSelect(tab)}
          onkeydown={(e) => handleTabKeydown(e, tab)}
          oncontextmenu={(e) => handleContextMenu(e, tab.id)}
        >
          {#if tab.pinned}
            <Pin aria-hidden="true" class="h-3 w-3 text-primary shrink-0 rotate-45" />
          {/if}

          <span class="truncate max-w-32">{tab.title}</span>
        </div>
        {#if tab.closable !== false && !tab.pinned}
          <button
            type="button"
            class="flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors p-0 border-0 cursor-pointer"
            onclick={(e) => handleClose(e, tab.id)}
            oncontextmenu={(e) => handleContextMenu(e, tab.id)}
            aria-label={`Close ${tab.title}`}
            title={`Close ${tab.title}`}
          >
            <X class="h-2.5 w-2.5" />
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Actions (Close All / Refresh) -->
  <div class="flex items-center gap-1 pl-2 shrink-0">
    {#if onrefresh}
      {@const curTab = tabs.find((t) => t.id === activeTabId)}
      {#if curTab}
        <Button
          variant="ghost"
          size="sm"
          class="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onclick={() => handleRefresh(curTab)}
          aria-label={`Refresh ${curTab.title}`}
          title={`Refresh ${curTab.title}`}
        >
          <RefreshCw aria-hidden="true" class="h-3 w-3" />
        </Button>
      {/if}
    {/if}

    {#if tabs.some((t) => !t.pinned && t.closable !== false)}
      <Button
        variant="ghost"
        size="sm"
        class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        onclick={handleCloseAll}
        aria-label="Close all tabs"
        title="Close all tabs"
      >
        <XCircle aria-hidden="true" class="h-3.5 w-3.5" />
      </Button>
    {/if}
  </div>
</div>
