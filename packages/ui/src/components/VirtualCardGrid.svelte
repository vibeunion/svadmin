<script lang="ts" generics="T extends { id: string; title?: string; image?: string; subtitle?: string }">
  import { onMount, type Snippet } from 'svelte';
  import { Check, Image, Layers } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';

  export interface VirtualCardGridProps<T> {
    items: T[];
    columns?: number | undefined;
    cardHeight?: number | undefined;
    selectedIds?: string[] | undefined;
    multiSelect?: boolean | undefined;
    overscan?: number | undefined;
    class?: string | undefined;
    cardSnippet?: Snippet<[{ item: T; isSelected: boolean; toggle: () => void }]> | undefined;
    onSelectionChange?: ((selectedIds: string[], selectedItems: T[]) => void) | undefined;
  }

  let {
    items = [],
    columns = 4,
    cardHeight = 180,
    selectedIds = $bindable([]),
    multiSelect = true,
    overscan = 2,
    class: className = '',
    cardSnippet,
    onSelectionChange,
  }: VirtualCardGridProps<T> = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let viewportRef = $state<HTMLElement | null>(null);
  let scrollTop = $state(0);
  let containerHeight = $state(500);

  const totalRows = $derived(Math.ceil(items.length / columns));
  const totalHeight = $derived(totalRows * cardHeight);

  const startRow = $derived(Math.max(0, Math.floor(scrollTop / cardHeight) - overscan));
  const visibleRowCount = $derived(Math.ceil(containerHeight / cardHeight) + 2 * overscan);
  const endRow = $derived(Math.min(totalRows, startRow + visibleRowCount));

  const visibleItems = $derived.by(() => {
    const startIdx = startRow * columns;
    const endIdx = Math.min(items.length, endRow * columns);
    return items.slice(startIdx, endIdx).map((item, localIdx) => {
      const globalIdx = startIdx + localIdx;
      const rowIdx = Math.floor(globalIdx / columns);
      const colIdx = globalIdx % columns;
      return {
        item,
        globalIdx,
        top: rowIdx * cardHeight,
        leftPct: (colIdx / columns) * 100,
        widthPct: 100 / columns,
      };
    });
  });

  const selectedSet = $derived(new Set(selectedIds));

  function toggleItem(item: T) {
    let next: string[];
    if (multiSelect) {
      const set = new Set(selectedIds);
      if (set.has(item.id)) set.delete(item.id);
      else set.add(item.id);
      next = Array.from(set);
    } else {
      next = selectedSet.has(item.id) ? [] : [item.id];
    }
    selectedIds = next;
    const chosen = items.filter((i) => next.includes(i.id));
    onSelectionChange?.(next, chosen);
  }

  function handleScroll() {
    if (viewportRef) {
      scrollTop = viewportRef.scrollTop;
    }
  }

  onMount(() => {
    if (viewportRef) {
      containerHeight = viewportRef.clientHeight || 500;
    }
  });
</script>

<div
  data-svadmin-component="VirtualCardGrid"
  class={cn(
    'relative w-full rounded-md border border-border bg-card text-card-foreground shadow-xs overflow-hidden flex flex-col',
    className,
  )}
>
  <!-- Toolbar Header -->
  <div class="flex items-center justify-between border-b border-border/70 px-5 py-3 text-xs bg-muted/20">
    <div class="flex items-center gap-2 font-medium text-foreground">
      <Layers class="h-4 w-4 text-primary" />
      <span>{chinese ? `全部 ${items.length} 项 (视口虚拟化 60fps 渲染)` : `${items.length} items (Virtual Windowed)`}</span>
    </div>

    {#if selectedIds.length > 0}
      <span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
        {chinese ? `已选中 ${selectedIds.length} 项` : `${selectedIds.length} selected`}
      </span>
    {/if}
  </div>

  <!-- Virtual Scroll Viewport Container -->
  <div
    bind:this={viewportRef}
    onscroll={handleScroll}
    class="relative w-full overflow-y-auto"
    style="height: 500px;"
  >
    <!-- Inner Sizer matching total computed grid height -->
    <div class="relative w-full" style="height: {totalHeight}px;">
      {#each visibleItems as { item, top, leftPct, widthPct } (item.id)}
        {@const isSelected = selectedSet.has(item.id)}
        <div
          class="absolute p-2 box-border transition-transform"
          style="top: {top}px; left: {leftPct}%; width: {widthPct}%; height: {cardHeight}px;"
        >
          {#if cardSnippet}
            {@render cardSnippet({ item, isSelected, toggle: () => toggleItem(item) })}
          {:else}
            <!-- Default responsive card mockup -->
            <div
              role="button"
              tabindex="0"
              onclick={() => toggleItem(item)}
              onkeydown={(e) => e.key === 'Enter' && toggleItem(item)}
              class={cn(
                'group relative flex flex-col justify-between h-full rounded-sm border p-3 cursor-pointer transition-all select-none bg-card shadow-2xs',
                isSelected
                  ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30',
              )}
            >
              <!-- Card Thumbnail / Cover -->
              <div class="flex items-center justify-center h-24 rounded-lg bg-muted/50 border border-border/40 overflow-hidden relative">
                {#if item.image}
                  <img src={item.image} alt={item.title ?? ''} class="h-full w-full object-cover" />
                {:else}
                  <Image class="h-8 w-8 text-muted-foreground/40" />
                {/if}

                <!-- Checkbox badge -->
                <div
                  class={cn(
                    'absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-md border text-xs transition-all',
                    isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border/80 bg-background/80 text-transparent group-hover:text-muted-foreground',
                  )}
                >
                  <Check class="h-3.5 w-3.5" />
                </div>
              </div>

              <!-- Card Label -->
              <div class="mt-2 space-y-0.5 min-w-0">
                <div class="font-semibold text-xs text-foreground truncate">
                  {item.title ?? item.id}
                </div>
                {#if item.subtitle}
                  <div class="text-[11px] text-muted-foreground truncate">
                    {item.subtitle}
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>
