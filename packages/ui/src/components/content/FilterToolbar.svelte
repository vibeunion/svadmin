<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Badge } from '../ui/badge/index.js';
  import { cn } from '../../utils.js';

  const uid = $props.id();

  interface Props {
    query?: string;
    placeholder?: string;
    clearLabel?: string;
    advancedLabel?: string;
    showSearch?: boolean;
    density?: 'compact' | 'comfortable';
    activeFilterCount?: number;
    advancedOpen?: boolean;
    filters?: Snippet;
    actions?: Snippet;
    advanced?: Snippet;
    class?: string;
  }

  let {
    query = $bindable(''),
    placeholder = 'Search',
    clearLabel = 'Clear search',
    advancedLabel = 'Filters',
    showSearch = true,
    density = 'compact',
    activeFilterCount = 0,
    advancedOpen = $bindable(false),
    filters,
    actions,
    advanced,
    class: className = '',
  }: Props = $props();

  const isCompact = $derived(density === 'compact');
  const advancedPanelId = `svadmin-filter-toolbar-advanced-${uid}`;
</script>

<div class={cn('space-y-2', className)} data-svadmin-filter-toolbar data-advanced-open={advanced && advancedOpen ? 'true' : 'false'}>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
    {#if showSearch}
      <div class="relative min-w-0 flex-1">
        <Search class={cn('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground', isCompact ? 'size-3.5' : 'size-4')} />
        <Input
          bind:value={query}
          {placeholder}
          class={cn('pl-9 pr-9', isCompact ? 'h-8 text-xs' : 'h-9 text-sm')}
          aria-label={placeholder}
        />
        {#if query}
          <Button
            variant="ghost"
            size="icon-xs"
            class="absolute right-1 top-1/2 -translate-y-1/2"
            aria-label={clearLabel}
            title={clearLabel}
            onclick={() => query = ''}
          >
            <X class="size-3.5" />
          </Button>
        {/if}
      </div>
    {/if}
    {#if filters}
      <div class="flex flex-wrap items-center gap-2">
        {@render filters()}
      </div>
    {/if}
    {#if advanced}
      <Button
        variant={advancedOpen ? 'secondary' : 'outline'}
        size={isCompact ? 'sm' : 'default'}
        class={cn('gap-1.5 shrink-0', isCompact ? 'h-8 text-xs px-2.5' : '')}
        onclick={() => advancedOpen = !advancedOpen}
        aria-expanded={advancedOpen}
        aria-controls={advancedPanelId}
      >
        <SlidersHorizontal class="size-3.5" />
        <span>{advancedLabel}</span>
        {#if activeFilterCount > 0}
          <Badge variant="secondary" class="ml-0.5 h-4 min-w-4 px-1 text-[10px] leading-none font-semibold">
            {activeFilterCount}
          </Badge>
        {/if}
        {#if advancedOpen}
          <ChevronUp class="size-3 text-muted-foreground ml-0.5" />
        {:else}
          <ChevronDown class="size-3 text-muted-foreground ml-0.5" />
        {/if}
      </Button>
    {/if}
    {#if actions}
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        {@render actions()}
      </div>
    {/if}
  </div>
  {#if advanced && advancedOpen}
    <div id={advancedPanelId} class="svadmin-filter-toolbar-advanced rounded-lg border border-border/60 bg-muted/20 p-3" aria-hidden="false">
      {@render advanced()}
    </div>
  {/if}
</div>
