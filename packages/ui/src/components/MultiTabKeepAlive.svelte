<script lang="ts">
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
  }

  interface Props {
    tabs?: WorkspaceTab[];
    activeTabId?: string;
    onselect?: (tab: WorkspaceTab) => void;
    onclose?: (tabId: string) => void;
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
    oncloseothers,
    oncloseall,
    onrefresh,
    class: className = '',
  }: Props = $props();

  function handleSelect(tab: WorkspaceTab) {
    activeTabId = tab.id;
    onselect?.(tab);
  }

  function handleClose(e: MouseEvent, tabId: string) {
    e.stopPropagation();
    const idx = tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    const isCurrentActive = activeTabId === tabId;
    tabs = tabs.filter((t) => t.id !== tabId);
    onclose?.(tabId);

    if (isCurrentActive && tabs.length > 0) {
      const nextTab = tabs[Math.min(idx, tabs.length - 1)];
      if (nextTab) {
        activeTabId = nextTab.id;
        onselect?.(nextTab);
      }
    }
  }

  function handleCloseAll() {
    const pinned = tabs.filter((t) => t.pinned);
    tabs = pinned;
    if (pinned.length > 0 && pinned[0]) {
      activeTabId = pinned[0].id;
      onselect?.(pinned[0]);
    }
    oncloseall?.();
  }

  function handleContextMenu(e: MouseEvent, tabId: string) {
    e.preventDefault();
    if (oncloseothers) {
      tabs = tabs.filter((t) => t.pinned || t.id === tabId);
      activeTabId = tabId;
      oncloseothers(tabId);
    }
  }
</script>

<div class={cn('svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-65fdbade2025 svadmin-u-c9ed8c5f79ae svadmin-u-2859c861d7de svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-7f6912283f11', className)}>
  <!-- Tabs list -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-1384f66f41d0 svadmin-u-660d2effb880 scrollbar-none">
    {#each tabs as tab (tab.id)}
      {@const isActive = tab.id === activeTabId}
      <div
        role="button"
        tabindex="0"
        class={cn(
          'group svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568 svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-421ac2be5045 svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-0fe7d7d814d0 svadmin-u-34516836730d svadmin-u-ca6bcd4b6f3f',
          isActive
            ? 'svadmin-u-cd0ad9a56558 svadmin-u-d4108abe6359 svadmin-u-18049387f0af svadmin-u-cef5b893cf23'
            : 'svadmin-u-7f19cdf4c5bb svadmin-u-bfa603190748 svadmin-u-521fa0c7c407 svadmin-u-68646cdcc246 svadmin-u-ea7b2e9e070e'
        )}
        onclick={() => handleSelect(tab)}
        onkeydown={(e) => { if (e.key === 'Enter') handleSelect(tab); }}
        oncontextmenu={(e) => handleContextMenu(e, tab.id)}
      >
        {#if tab.pinned}
          <Pin class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-20aaf08a7ed1 svadmin-u-012fbd121f37 svadmin-u-c74901da6f6c" />
        {/if}

        <span class="svadmin-u-f283ea9bea0e svadmin-u-1d274d2422d8">{tab.title}</span>

        {#if tab.closable !== false && !tab.pinned}
          <button
            type="button"
            class="svadmin-u-60fbb7713999 svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-7be4d67a6256 svadmin-u-8db899b4e072 svadmin-u-51e95020d6f2 svadmin-u-ceb69a6b0e5f svadmin-u-8a539c7fe216 svadmin-u-119b2aa0b8f6 svadmin-u-34516836730d"
            onclick={(e) => handleClose(e, tab.id)}
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
        >
          <RefreshCw class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        </Button>
      {/if}
    {/if}

    {#if tabs.some((t) => !t.pinned && t.closable !== false)}
      <Button
        variant="ghost"
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216 svadmin-u-bfa603190748 svadmin-u-51e95020d6f2"
        onclick={handleCloseAll}
      >
        <XCircle class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      </Button>
    {/if}
  </div>
</div>
