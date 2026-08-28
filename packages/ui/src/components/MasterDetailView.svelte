<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Search } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    items: Record<string, unknown>[];
    selectedId?: string | number;
    idKey?: string;
    titleKey?: string;
    subtitleKey?: string;
    listWidth?: string;
    emptyText?: string;
    itemSnippet?: Snippet<[Record<string, unknown>, boolean]>;
    detailSnippet?: Snippet<[Record<string, unknown>]>;
    class?: string;
  }

  let {
    items = [],
    selectedId = $bindable(items[0]?.id as (string | number | undefined)),
    idKey = 'id',
    titleKey = 'title',
    subtitleKey = 'subtitle',
    listWidth = 'w-72 sm:w-80',
    emptyText = 'No items found',
    itemSnippet,
    detailSnippet,
    class: className = '',
  }: Props = $props();

  let searchQuery = $state('');

  const filteredItems = $derived(
    items.filter((item) => {
      if (!searchQuery.trim()) return true;
      const title = String(item[titleKey] ?? '').toLowerCase();
      const subtitle = String(item[subtitleKey] ?? '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      return title.includes(q) || subtitle.includes(q);
    })
  );

  const activeItem = $derived(
    items.find((item) => String(item[idKey]) === String(selectedId)) ?? filteredItems[0]
  );
</script>

<div class={cn('flex h-full min-h-[420px] rounded-xl border border-border bg-card shadow-xs overflow-hidden text-xs', className)}>
  <!-- Master List Panel -->
  <div class={cn('flex flex-col border-r border-border/60 bg-muted/15 shrink-0', listWidth)}>
    <!-- Search Bar -->
    <div class="p-3 border-b border-border/60">
      <div class="relative">
        <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search items..."
          class="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </div>

    <!-- Scrollable Items List -->
    <div class="flex-1 overflow-y-auto divide-y divide-border/40">
      {#each filteredItems as item (item[idKey])}
        {@const isSelected = String(item[idKey]) === String(activeItem?.[idKey])}
        <button
          type="button"
          class={cn(
            'w-full text-left p-3 transition-colors cursor-pointer border-0 bg-transparent',
            isSelected
              ? 'bg-primary/10 border-l-3 border-primary text-foreground font-medium'
              : 'hover:bg-muted/40 text-muted-foreground'
          )}
          onclick={() => { selectedId = item[idKey] as (string | number); }}
        >
          {#if itemSnippet}
            {@render itemSnippet(item, isSelected)}
          {:else}
            <div class={cn('font-semibold truncate', isSelected ? 'text-primary' : 'text-foreground')}>
              {item[titleKey] ?? item.name ?? `Item #${item[idKey]}`}
            </div>
            {#if item[subtitleKey]}
              <div class="text-[11px] text-muted-foreground truncate mt-0.5">
                {item[subtitleKey]}
              </div>
            {/if}
          {/if}
        </button>
      {/each}

      {#if filteredItems.length === 0}
        <div class="p-6 text-center text-muted-foreground">
          {emptyText}
        </div>
      {/if}
    </div>
  </div>

  <!-- Detail Content Panel -->
  <div class="flex-1 flex flex-col overflow-y-auto p-6 bg-card">
    {#if activeItem}
      {#if detailSnippet}
        {@render detailSnippet(activeItem)}
      {:else}
        <div class="space-y-4">
          <div class="pb-3 border-b border-border/60">
            <h3 class="text-base font-semibold text-foreground">
              {activeItem[titleKey] ?? activeItem.name ?? `Item #${activeItem[idKey]}`}
            </h3>
            {#if activeItem[subtitleKey]}
              <p class="text-xs text-muted-foreground mt-0.5">{activeItem[subtitleKey]}</p>
            {/if}
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs">
            {#each Object.entries(activeItem) as [k, v] (k)}
              <div class="p-2.5 rounded-lg bg-muted/20 border border-border/40">
                <span class="text-muted-foreground font-medium block text-[11px] mb-0.5">{k}</span>
                <span class="font-mono text-foreground break-words">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {:else}
      <div class="flex-1 flex items-center justify-center text-muted-foreground">
        Select an item from the list to view details
      </div>
    {/if}
  </div>
</div>
