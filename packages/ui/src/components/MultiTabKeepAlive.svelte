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

<div class={cn('flex items-center justify-between border-b border-border/80 bg-muted/30 px-2 text-xs select-none', className)}>
  <!-- Tabs list -->
  <div class="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
    {#each tabs as tab (tab.id)}
      {@const isActive = tab.id === activeTabId}
      <div
        role="button"
        tabindex="0"
        class={cn(
          'group relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer border',
          isActive
            ? 'bg-card text-foreground border-border shadow-xs'
            : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/60 hover:text-foreground'
        )}
        onclick={() => handleSelect(tab)}
        onkeydown={(e) => { if (e.key === 'Enter') handleSelect(tab); }}
        oncontextmenu={(e) => handleContextMenu(e, tab.id)}
      >
        {#if tab.pinned}
          <Pin class="h-3 w-3 text-primary shrink-0 rotate-45" />
        {/if}

        <span class="truncate max-w-32">{tab.title}</span>

        {#if tab.closable !== false && !tab.pinned}
          <button
            type="button"
            class="flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors p-0 border-0 cursor-pointer"
            onclick={(e) => handleClose(e, tab.id)}
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
          onclick={() => onrefresh(curTab)}
        >
          <RefreshCw class="h-3 w-3" />
        </Button>
      {/if}
    {/if}

    {#if tabs.some((t) => !t.pinned && t.closable !== false)}
      <Button
        variant="ghost"
        size="sm"
        class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        onclick={handleCloseAll}
      >
        <XCircle class="h-3.5 w-3.5" />
      </Button>
    {/if}
  </div>
</div>
