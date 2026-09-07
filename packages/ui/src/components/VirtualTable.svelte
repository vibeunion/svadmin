<script lang="ts">
  import type { Snippet } from 'svelte';
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
    class: className = '',
    rowSnippet,
  }: Props = $props();

  let scrollTop = $state(0);

  function handleScroll(e: Event) {
    const target = e.currentTarget as HTMLElement;
    scrollTop = target.scrollTop;
  }

  const totalHeight = $derived(items.length * itemHeight);
  const startIndex = $derived(Math.max(0, Math.floor(scrollTop / itemHeight) - overscan));
  const endIndex = $derived(Math.min(items.length, Math.ceil((scrollTop + height) / itemHeight) + overscan));
  const visibleSlice = $derived(
    items.slice(startIndex, endIndex).map((item, idx) => ({
      item,
      index: startIndex + idx,
      top: (startIndex + idx) * itemHeight,
    }))
  );
</script>

<div class={cn('svadmin-u-6da6a3c3f741 svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-cef5b893cf23 svadmin-u-2cd02d11d1af svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-359090c2d529', className)}>
  <!-- Sticky Header -->
  <div class="svadmin-u-65fdbade2025 svadmin-u-c9ed8c5f79ae svadmin-u-b00f43c30c2b svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-426b8b75185b svadmin-u-f0faeb26d656 svadmin-u-7f6912283f11 svadmin-u-012fbd121f37">
    {#each columns as col (col.key)}
      <div
        style={col.width ? `width: ${col.width}; flex-shrink: 0;` : 'flex: 1; min-width: 0;'}
        class={cn('svadmin-u-f283ea9bea0e svadmin-u-d5eab218aa34', col.align === 'right' ? 'svadmin-u-308fc069e46e' : col.align === 'center' ? 'svadmin-u-ca6bf63030aa' : 'svadmin-u-2eba0d65d059')}
      >
        {col.label}
      </div>
    {/each}
  </div>

  <!-- Virtual Scroll Viewport -->
  <div
    class="svadmin-u-92bf82f493b1 svadmin-u-d89972fe17d6 svadmin-u-6da6a3c3f741"
    style="height: {height}px;"
    onscroll={handleScroll}
  >
    <div style="height: {totalHeight}px; width: 100%; position: relative;">
      {#each visibleSlice as { item, index, top } (item[rowKey] ?? index)}
        <div
          class="svadmin-u-da4dbfbc4fdc svadmin-u-c78facc7a0a6 svadmin-u-d8cdcad240d1 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-f0faeb26d656 svadmin-u-65fdbade2025 svadmin-u-6ee2d41e2d2d svadmin-u-12251b8f1749 svadmin-u-ceb69a6b0e5f"
          style="top: {top}px; height: {itemHeight}px;"
        >
          {#if rowSnippet}
            {@render rowSnippet(item, index)}
          {:else}
            {#each columns as col (col.key)}
              <div
                style={col.width ? `width: ${col.width}; flex-shrink: 0;` : 'flex: 1; min-width: 0;'}
                class={cn('svadmin-u-f283ea9bea0e svadmin-u-d5eab218aa34 svadmin-u-2689f3958069 svadmin-u-d4108abe6359', col.align === 'right' ? 'svadmin-u-308fc069e46e' : col.align === 'center' ? 'svadmin-u-ca6bf63030aa' : 'svadmin-u-2eba0d65d059')}
              >
                {item[col.key] ?? '—'}
              </div>
            {/each}
          {/if}
        </div>
      {/each}

      {#if items.length === 0}
        <div class="svadmin-u-b5f3ff77f4f9 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-bfa603190748 svadmin-u-359090c2d529">
          No records to display
        </div>
      {/if}
    </div>
  </div>

  <!-- Footer Info -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-f0faeb26d656 svadmin-u-03b4dd7f172b svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff svadmin-u-967d113a1451 svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-012fbd121f37">
    <span>Total <strong class="svadmin-u-d4108abe6359 svadmin-u-e83a7042bc91">{items.length}</strong> rows</span>
    <span>Rendered {visibleSlice.length} in viewport</span>
  </div>
</div>
