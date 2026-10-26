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
    onselect?: (tab: WorkspaceTab) => void;
    onclose?: (tabId: string) => void;
    /**
     * 关闭保护：返回 false（或抛错）时保留标签；异步确认期间不提前移除。
     * 仅对可关闭且未固定的标签调用。
     */
    onbeforeclose?: (tab: WorkspaceTab) => boolean | Promise<boolean>;
    oncloseothers?: (tabId: string) => void;
    oncloseall?: () => void;
    onrefresh?: (tab: WorkspaceTab) => void;
    /** 打开准入失败且未改动 tabs 时报告，由宿主决定提示或拒绝。 */
    onTabLimitReached?: (detail: WorkspaceTabLimitReachedDetail) => void;
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

<div class={cn('svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-65fdbade2025 svadmin-u-c9ed8c5f79ae svadmin-u-2859c861d7de svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-7f6912283f11', className)}>
  <!-- Tabs list -->
  <div role="tablist" aria-label="Workspace tabs" aria-orientation="horizontal" class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-1384f66f41d0 svadmin-u-660d2effb880 scrollbar-none">
    {#each tabs as tab (tab.id)}
      {@const isActive = tab.id === activeTabId}
      <div
        role="presentation"
        class={cn(
          'group svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568 svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-421ac2be5045 svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-0fe7d7d814d0 svadmin-u-34516836730d svadmin-u-ca6bcd4b6f3f',
          isActive
            ? 'svadmin-u-cd0ad9a56558 svadmin-u-d4108abe6359 svadmin-u-18049387f0af svadmin-u-cef5b893cf23'
            : 'svadmin-u-7f19cdf4c5bb svadmin-u-bfa603190748 svadmin-u-521fa0c7c407 svadmin-u-68646cdcc246 svadmin-u-ea7b2e9e070e'
        )}
      >
        <div
          role="tab"
          tabindex={isRovingTab(tab) ? 0 : -1}
          aria-selected={isActive}
          class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568"
          onclick={() => handleSelect(tab)}
          onkeydown={(e) => handleTabKeydown(e, tab)}
          oncontextmenu={(e) => handleContextMenu(e, tab.id)}
        >
          {#if tab.pinned}
            <Pin aria-hidden="true" class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-20aaf08a7ed1 svadmin-u-012fbd121f37 svadmin-u-c74901da6f6c" />
          {/if}

          <span class="svadmin-u-f283ea9bea0e svadmin-u-1d274d2422d8">{tab.title}</span>
        </div>
        {#if tab.closable !== false && !tab.pinned}
          <button
            type="button"
            class="svadmin-u-60fbb7713999 svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-7be4d67a6256 svadmin-u-8db899b4e072 svadmin-u-51e95020d6f2 svadmin-u-ceb69a6b0e5f svadmin-u-8a539c7fe216 svadmin-u-119b2aa0b8f6 svadmin-u-34516836730d"
            onclick={(e) => handleClose(e, tab.id)}
            oncontextmenu={(e) => handleContextMenu(e, tab.id)}
            aria-label={`Close ${tab.title}`}
            title={`Close ${tab.title}`}
          >
            <X class="svadmin-u-9b3d0721b628 svadmin-u-650758f4572a" />
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Actions (Close All / Refresh) -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-989541ad4512 svadmin-u-012fbd121f37">
    {#if onrefresh}
      {@const curTab = tabs.find((t) => t.id === activeTabId)}
      {#if curTab}
        <Button
          variant="ghost"
          size="sm"
          class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e"
          onclick={() => handleRefresh(curTab)}
          aria-label={`Refresh ${curTab.title}`}
          title={`Refresh ${curTab.title}`}
        >
          <RefreshCw aria-hidden="true" class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        </Button>
      {/if}
    {/if}

    {#if tabs.some((t) => !t.pinned && t.closable !== false)}
      <Button
        variant="ghost"
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216 svadmin-u-bfa603190748 svadmin-u-51e95020d6f2"
        onclick={handleCloseAll}
        aria-label="Close all tabs"
        title="Close all tabs"
      >
        <XCircle aria-hidden="true" class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      </Button>
    {/if}
  </div>
</div>
