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

  interface Props {
    tabs?: WorkspaceTab[];
    activeTabId?: string;
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
    class?: string;
  }

  let {
    tabs = $bindable([]),
    activeTabId = $bindable(''),
    onselect,
    onclose,
    onbeforeclose,
    oncloseothers,
    oncloseall,
    onrefresh,
    class: className = '',
  }: Props = $props();

  function handleSelect(tab: WorkspaceTab) {
    activeTabId = tab.id;
    onselect?.(tab);
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

  function findCurrent(tab: WorkspaceTab): { index: number; tab: WorkspaceTab } | undefined {
    const index = tabs.findIndex((candidate) => candidate.id === tab.id);
    const current = tabs[index];
    return current === tab ? { index, tab: current } : undefined;
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
</script>

<div class={cn('svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-65fdbade2025 svadmin-u-c9ed8c5f79ae svadmin-u-2859c861d7de svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-7f6912283f11', className)}>
  <!-- Tabs list -->
  <div role="tablist" aria-label="Workspace tabs" class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-1384f66f41d0 svadmin-u-660d2effb880 scrollbar-none">
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
          tabindex="0"
          aria-selected={isActive}
          class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568"
          onclick={() => handleSelect(tab)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(tab); } }}
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
          onclick={() => onrefresh(curTab)}
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
