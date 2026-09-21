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
  class={cn('svadmin-u-6da6a3c3f741 svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-cef5b893cf23 svadmin-u-2cd02d11d1af svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-359090c2d529', className)}>
  <!-- Sticky Header -->
  <div role="row" aria-rowindex="1" class="svadmin-u-65fdbade2025 svadmin-u-c9ed8c5f79ae svadmin-u-b00f43c30c2b svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-426b8b75185b svadmin-u-f0faeb26d656 svadmin-u-7f6912283f11 svadmin-u-012fbd121f37">
    {#each columns as col (col.key)}
      <div
        role="columnheader"
        style={col.width ? `width: ${col.width}; flex-shrink: 0;` : 'flex: 1; min-width: 0;'}
        class={cn('svadmin-u-f283ea9bea0e svadmin-u-d5eab218aa34', col.align === 'right' ? 'svadmin-u-308fc069e46e' : col.align === 'center' ? 'svadmin-u-ca6bf63030aa' : 'svadmin-u-2eba0d65d059')}
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
    class="svadmin-u-92bf82f493b1 svadmin-u-d89972fe17d6 svadmin-u-6da6a3c3f741"
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
          class="svadmin-u-da4dbfbc4fdc svadmin-u-c78facc7a0a6 svadmin-u-d8cdcad240d1 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-f0faeb26d656 svadmin-u-65fdbade2025 svadmin-u-6ee2d41e2d2d svadmin-u-12251b8f1749 svadmin-u-ceb69a6b0e5f"
          style="top: {top}px; height: {normalizedItemHeight}px; overflow: hidden;"
        >
          {#if rowSnippet}
            {@render rowSnippet(item, index)}
          {:else}
            {#each columns as col (col.key)}
              <div
                role="cell"
                style={col.width ? `width: ${col.width}; flex-shrink: 0;` : 'flex: 1; min-width: 0;'}
                class={cn('svadmin-u-f283ea9bea0e svadmin-u-d5eab218aa34 svadmin-u-2689f3958069 svadmin-u-d4108abe6359', col.align === 'right' ? 'svadmin-u-308fc069e46e' : col.align === 'center' ? 'svadmin-u-ca6bf63030aa' : 'svadmin-u-2eba0d65d059')}
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
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-f0faeb26d656 svadmin-u-03b4dd7f172b svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff svadmin-u-967d113a1451 svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-012fbd121f37">
    <span>{i18n.t('virtualTable.totalRows', { count: String(available ? items.length : 0) })}</span>
  </div>
</div>
