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

<div class={cn('w-full rounded-xl border border-border bg-card shadow-xs overflow-hidden flex flex-col text-xs', className)}>
  <!-- Sticky Header -->
  <div class="border-b border-border/80 bg-muted/40 font-semibold text-muted-foreground flex items-center h-10 px-4 select-none shrink-0">
    {#each columns as col (col.key)}
      <div
        style={col.width ? `width: ${col.width}; flex-shrink: 0;` : 'flex: 1; min-width: 0;'}
        class={cn('truncate px-2', col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left')}
      >
        {col.label}
      </div>
    {/each}
  </div>

  <!-- Virtual Scroll Viewport -->
  <div
    class="overflow-y-auto relative w-full"
    style="height: {height}px;"
    onscroll={handleScroll}
  >
    <div style="height: {totalHeight}px; width: 100%; position: relative;">
      {#each visibleSlice as { item, index, top } (item[rowKey] ?? index)}
        <div
          class="absolute left-0 right-0 flex items-center px-4 border-b border-border/40 hover:bg-muted/30 transition-colors"
          style="top: {top}px; height: {itemHeight}px;"
        >
          {#if rowSnippet}
            {@render rowSnippet(item, index)}
          {:else}
            {#each columns as col (col.key)}
              <div
                style={col.width ? `width: ${col.width}; flex-shrink: 0;` : 'flex: 1; min-width: 0;'}
                class={cn('truncate px-2 font-medium text-foreground', col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left')}
              >
                {item[col.key] ?? '—'}
              </div>
            {/each}
          {/if}
        </div>
      {/each}

      {#if items.length === 0}
        <div class="h-32 flex items-center justify-center text-muted-foreground text-xs">
          No records to display
        </div>
      {/if}
    </div>
  </div>

  <!-- Footer Info -->
  <div class="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-muted/20 text-[11px] text-muted-foreground shrink-0">
    <span>Total <strong class="text-foreground font-semibold">{items.length}</strong> rows</span>
    <span>Rendered {visibleSlice.length} in viewport</span>
  </div>
</div>
