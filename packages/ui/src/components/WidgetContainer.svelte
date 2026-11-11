<script lang="ts">
  import { onMount, onDestroy, type Snippet } from 'svelte';
  import { Maximize2, Minimize2, RotateCw, AlertCircle, RefreshCw } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface WidgetContainerProps {
    /** 小部件卡片主标题 */
    title: string;
    /** 辅助说明或指标口径描述 */
    description?: string | undefined;
    /** 数据最后同步时间（Date / 字符串 / 时间戳） */
    lastUpdated?: Date | string | number | undefined;
    /** 是否处于加载骨架屏态 */
    loading?: boolean | undefined;
    /** 查询异常错误信息或错误对象 */
    error?: string | Error | null | undefined;
    /** 刷新按钮是否处于正在加载动画态 */
    refreshing?: boolean | undefined;
    /** 是否允许全屏放大查看，默认 true */
    allowFullscreen?: boolean | undefined;
    /** 是否允许手动刷新，默认 true */
    allowRefresh?: boolean | undefined;
    /** 手动点击刷新按钮回调 */
    onrefresh?: (() => Promise<void> | void) | undefined;
    /** 错误重试点击回调 */
    onretry?: (() => Promise<void> | void) | undefined;
    class?: string | undefined;
    /** 右上角操作区扩展插槽 */
    actions?: Snippet | undefined;
    /** 卡片正文主体插槽 */
    children?: Snippet | undefined;
  }

  let {
    title,
    description,
    lastUpdated,
    loading = false,
    error,
    refreshing = false,
    allowFullscreen = true,
    allowRefresh = true,
    onrefresh,
    onretry,
    class: className = '',
    actions,
    children,
  }: WidgetContainerProps = $props();

  let isFullscreen = $state(false);
  let localRefreshing = $state(false);

  const errorMessage = $derived(
    error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  );

  const formattedTime = $derived.by(() => {
    if (!lastUpdated) return '';
    try {
      const d = new Date(lastUpdated);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return String(lastUpdated);
    }
  });

  async function handleRefreshClick() {
    if (localRefreshing || refreshing) return;
    localRefreshing = true;
    try {
      if (onrefresh) {
        await onrefresh();
      }
    } finally {
      setTimeout(() => {
        localRefreshing = false;
      }, 500);
    }
  }

  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isFullscreen) {
      isFullscreen = false;
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeydown);
    }
  });
</script>

<div
  class={cn(
    'rounded-md border border-border bg-card text-card-foreground shadow-xs transition-all flex flex-col',
    isFullscreen
      ? 'fixed inset-0 z-50 rounded-none border-0 p-6 bg-background overflow-auto'
      : 'p-4',
    className
  )}
  data-svadmin-component="WidgetContainer"
  data-fullscreen={isFullscreen ? 'true' : 'false'}
>
  <!-- Widget Header -->
  <header class="flex items-start justify-between gap-3 border-b border-border pb-3 mb-3 shrink-0">
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <h3 class={cn('font-bold text-foreground truncate', isFullscreen ? 'text-lg' : 'text-sm')}>
          {title}
        </h3>
        {#if formattedTime}
          <span class="font-mono text-xs text-muted-foreground select-none">
            ({formattedTime})
          </span>
        {/if}
      </div>
      {#if description}
        <p class="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
      {/if}
    </div>

    <!-- Header Action Toolbar -->
    <div class="flex items-center gap-1 shrink-0 select-none text-xs">
      {#if actions}
        {@render actions()}
      {/if}

      {#if allowRefresh}
        <button
          type="button"
          class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          onclick={handleRefreshClick}
          disabled={localRefreshing || refreshing}
          title="刷新数据"
          aria-label="Refresh widget"
        >
          <RotateCw class={cn('h-3.5 w-3.5', (localRefreshing || refreshing) && 'animate-spin text-primary')} />
        </button>
      {/if}

      {#if allowFullscreen}
        <button
          type="button"
          class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          onclick={toggleFullscreen}
          title={isFullscreen ? '退出全屏 (ESC)' : '全屏放大'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {#if isFullscreen}
            <Minimize2 class="h-3.5 w-3.5" />
          {:else}
            <Maximize2 class="h-3.5 w-3.5" />
          {/if}
        </button>
      {/if}
    </div>
  </header>

  <!-- Widget Body -->
  <div class="flex-1 min-h-0 flex flex-col justify-center">
    {#if loading}
      <!-- Loading Skeleton Layout -->
      <div class="space-y-3 py-4 animate-pulse">
        <div class="h-4 bg-muted rounded w-2/5"></div>
        <div class="h-28 bg-muted/60 rounded w-full"></div>
        <div class="h-3 bg-muted rounded w-3/4"></div>
      </div>
    {:else if errorMessage}
      <!-- Error & Retry State -->
      <div class="py-8 flex flex-col items-center justify-center text-center space-y-2.5">
        <div class="h-9 w-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center ring-4 ring-destructive/20">
          <AlertCircle class="h-5 w-5" />
        </div>
        <div>
          <h4 class="font-semibold text-xs text-foreground">小部件数据拉取失败</h4>
          <p class="text-xs text-destructive max-w-xs mt-0.5">{errorMessage}</p>
        </div>
        {#if onretry || onrefresh}
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            onclick={() => (onretry ? onretry() : onrefresh?.())}
          >
            <RefreshCw class="h-3 w-3" />
            <span>重新加载</span>
          </button>
        {/if}
      </div>
    {:else if children}
      {@render children()}
    {/if}
  </div>
</div>
