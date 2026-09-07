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

<div class={cn('svadmin-filter-toolbar', className)} data-density={density} data-svadmin-filter-toolbar data-advanced-open={advanced && advancedOpen ? 'true' : 'false'}>
  <div class="svadmin-filter-toolbar__row">
    {#if showSearch}
      <div class="svadmin-filter-toolbar__search">
        <Search class="svadmin-filter-toolbar__search-icon" aria-hidden="true" />
        <Input
          bind:value={query}
          {placeholder}
          class="svadmin-filter-toolbar__input"
          aria-label={placeholder}
        />
        {#if query}
          <Button
            variant="ghost"
            size="icon-xs"
            class="svadmin-filter-toolbar__clear"
            aria-label={clearLabel}
            title={clearLabel}
            onclick={() => query = ''}
          >
            <X class="svadmin-filter-toolbar__control-icon" aria-hidden="true" />
          </Button>
        {/if}
      </div>
    {/if}
    {#if filters}
      <div class="svadmin-filter-toolbar__filters">
        {@render filters()}
      </div>
    {/if}
    {#if advanced}
      <Button
        variant={advancedOpen ? 'secondary' : 'outline'}
        size={isCompact ? 'sm' : 'default'}
        class="svadmin-filter-toolbar__toggle"
        onclick={() => advancedOpen = !advancedOpen}
        aria-expanded={advancedOpen}
        aria-controls={advancedPanelId}
      >
        <SlidersHorizontal class="svadmin-filter-toolbar__control-icon" aria-hidden="true" />
        <span>{advancedLabel}</span>
        {#if activeFilterCount > 0}
          <Badge variant="secondary" class="svadmin-filter-toolbar__count">
            {activeFilterCount}
          </Badge>
        {/if}
        {#if advancedOpen}
          <ChevronUp class="svadmin-filter-toolbar__chevron" aria-hidden="true" />
        {:else}
          <ChevronDown class="svadmin-filter-toolbar__chevron" aria-hidden="true" />
        {/if}
      </Button>
    {/if}
    {#if actions}
      <div class="svadmin-filter-toolbar__actions">
        {@render actions()}
      </div>
    {/if}
  </div>
  {#if advanced && advancedOpen}
    <div id={advancedPanelId} role="region" aria-label={advancedLabel} class="svadmin-filter-toolbar-advanced" aria-hidden="false">
      {@render advanced()}
    </div>
  {/if}
</div>
