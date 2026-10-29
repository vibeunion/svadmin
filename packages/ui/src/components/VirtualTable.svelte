<script lang="ts">
  import type { Snippet } from 'svelte';
  import { untrack } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { RotateCw } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { cn } from '../utils.js';

  export interface VirtualTableColumn {
    key: string;
    label: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
  }

  interface Props {
    items?: Record<string, unknown>[];
    columns: VirtualTableColumn[];
    itemHeight?: number;
    height?: number;
    overscan?: number;
    rowKey?: string;
    scopeKey?: string | number;
    ariaLabel?: string;
    loading?: boolean;
    error?: string | undefined;
    onRetry?: () => void;
    class?: string;
    rowSnippet?: Snippet<[Record<string, unknown>, number]>;
  }

  let {
    items = [],
    columns,
    itemHeight = 44,
    height = 360,
    overscan = 4,
    rowKey = 'id',
    scopeKey,
    ariaLabel,
    loading = false,
    error,
    onRetry,
    class: className = '',
    rowSnippet,
  }: Props = $props();

  let scrollTop = $state(0);
  let viewport: HTMLDivElement | undefined = $state();
  let observedScope = untrack(() => scopeKey);
  const i18n = useTranslation();

  function handleScroll(e: Event) {
    const target = e.currentTarget;
    if (target instanceof HTMLElement) scrollTop = target.scrollTop;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget || event.altKey || event.metaKey || event.ctrlKey) return;
    let next: number;
    switch (event.key) {
      case 'ArrowDown': next = boundedScrollTop + normalizedItemHeight; break;
      case 'ArrowUp': next = boundedScrollTop - normalizedItemHeight; break;
      case 'PageDown': next = boundedScrollTop + normalizedHeight; break;
      case 'PageUp': next = boundedScrollTop - normalizedHeight; break;
      case 'Home': next = 0; break;
      case 'End': next = totalHeight - normalizedHeight; break;
      default: return;
    }
    event.preventDefault();
    scrollTop = Math.min(Math.max(0, next), Math.max(0, totalHeight - normalizedHeight));
  }

  // 固定高度窗口有明确尺寸上限，防止异常配置退化成全量 DOM。
  const normalizedItemHeight = $derived(Number.isFinite(itemHeight) && itemHeight > 0
    ? Math.min(1000, Math.max(16, Math.floor(itemHeight))) : 44);
  const normalizedHeight = $derived(Number.isFinite(height) && height > 0
    ? Math.min(4000, Math.max(16, Math.floor(height))) : 360);
  const normalizedOverscan = $derived(Number.isFinite(overscan) && overscan >= 0
    ? Math.min(100, Math.floor(overscan)) : 4);
  const identities = $derived.by(() => {
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const [index, item] of items.entries()) {
      const id = item[rowKey];
      if (id != null && typeof id !== 'string' && (typeof id !== 'number' || !Number.isFinite(id))) return undefined;
      const key = id == null ? `index:${index}` : `${typeof id}:${id}`;
      if (seen.has(key)) return undefined;
      seen.add(key);
      keys.push(key);
    }
    return keys;
  });
  const displayError = $derived(error || (identities === undefined ? i18n.t('virtualTable.invalidKeys') : ''));
  const available = $derived(!loading && !displayError);
  const totalHeight = $derived(available ? items.length * normalizedItemHeight : 0);
  const boundedScrollTop = $derived(Math.min(
    Math.max(0, Number.isFinite(scrollTop) ? scrollTop : 0),
    Math.max(0, totalHeight - normalizedHeight),
  ));
  const startIndex = $derived(Math.max(0, Math.floor(boundedScrollTop / normalizedItemHeight) - normalizedOverscan));
  const endIndex = $derived(Math.min(items.length, Math.ceil((boundedScrollTop + normalizedHeight) / normalizedItemHeight) + normalizedOverscan));
  const visibleSlice = $derived(
    (available ? items.slice(startIndex, endIndex) : []).map((item, idx) => ({
      item,
      index: startIndex + idx,
      top: (startIndex + idx) * normalizedItemHeight,
      key: identities?.[startIndex + idx] ?? `index:${startIndex + idx}`,
    }))
  );

  $effect.pre(() => {
    if (scopeKey !== observedScope) {
      observedScope = scopeKey;
      scrollTop = 0;
      if (viewport) viewport.scrollTop = 0;
    }
  });
  $effect(() => {
    const top = boundedScrollTop;
    if (viewport && viewport.scrollTop !== top) viewport.scrollTop = top;
    if (scrollTop !== top) scrollTop = top;
  });
</script>

<div role="table" aria-label={ariaLabel ?? i18n.t('virtualTable.label')}
  aria-rowcount={(available ? items.length : 0) + 1} aria-colcount={columns.length} aria-busy={loading}
  class={cn('w-full rounded-xl border border-border bg-card shadow-xs overflow-hidden flex flex-col text-xs', className)}>
  <!-- Sticky Header -->
  <div role="row" aria-rowindex="1" class="border-b border-border/80 bg-muted/40 font-semibold text-muted-foreground flex items-center h-10 px-4 select-none shrink-0">
    {#each columns as col (col.key)}
      <div
        role="columnheader"
        style={col.width ? `width: ${col.width}; flex-shrink: 0;` : 'flex: 1; min-width: 0;'}
        class={cn('truncate px-2', col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left')}
      >
        {col.label}
      </div>
    {/each}
  </div>

  <!-- Virtual Scroll Viewport -->
  <!-- 只读表格的滚动区域需要独立焦点；方向键只滚动，不伪装成可编辑网格。 -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={viewport}
    role="region"
    tabindex="0"
    aria-label={ariaLabel ?? i18n.t('virtualTable.label')}
    data-testid="virtual-table-viewport"
    class="overflow-y-auto relative w-full"
    style="height: {normalizedHeight}px; min-height: 0; flex-shrink: 0; overflow: auto;"
    onscroll={handleScroll}
    onkeydown={handleKeydown}
  >
    <div role="rowgroup" style="height: {totalHeight}px; width: 100%; position: relative;">
      {#key scopeKey}
      {#each visibleSlice as { item, index, top, key } (key)}
        <div
          role="row"
          aria-rowindex={index + 2}
          class="absolute left-0 right-0 flex items-center px-4 border-b border-border/40 hover:bg-muted/30 transition-colors"
          style="top: {top}px; height: {normalizedItemHeight}px; overflow: hidden;"
        >
          {#if rowSnippet}
            {@render rowSnippet(item, index)}
          {:else}
            {#each columns as col (col.key)}
              <div
                role="cell"
                style={col.width ? `width: ${col.width}; flex-shrink: 0;` : 'flex: 1; min-width: 0;'}
                class={cn('truncate px-2 font-medium text-foreground', col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left')}
              >
                {item[col.key] ?? '—'}
              </div>
            {/each}
          {/if}
        </div>
      {/each}
      {/key}

    </div>
    {#if loading}
      <div role="status">{i18n.t('common.loading')}</div>
    {:else if displayError}
      <div role="alert">{displayError}</div>
      {#if error && onRetry}
        <Button type="button" variant="ghost" size="sm" onclick={onRetry}>
          <RotateCw aria-hidden="true" />{i18n.t('common.retry')}
        </Button>
      {/if}
    {:else if items.length === 0}
      <div role="status">{i18n.t('common.noData')}</div>
    {/if}
  </div>

  <!-- Footer Info -->
  <div class="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-muted/20 text-[11px] text-muted-foreground shrink-0">
    <span>{i18n.t('virtualTable.totalRows', { count: String(available ? items.length : 0) })}</span>
  </div>
</div>
