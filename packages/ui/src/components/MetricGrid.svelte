<script lang="ts">
  import { Skeleton } from './ui/skeleton/index.js';
  import { cn } from '../utils.js';
  import type { Snippet } from 'svelte';

  export interface MetricGridProps {
    /**
     * Column count preset or 'auto' for responsive dashboard layout:
     * - 1: 1 col
     * - 2: 1 -> 2 cols
     * - 3: 1 -> 2 -> 3 cols
     * - 4: 1 -> 2 -> 4 cols
     * - 5: 1 -> 2 -> 3 -> 5 cols
     * - 6: 1 -> 2 -> 3 -> 6 cols
     * - 'auto': 1 -> 2 -> 3 -> 4 cols (default)
     */
    cols?: 1 | 2 | 3 | 4 | 5 | 6 | 'auto' | undefined;
    /** Grid gap size: 'sm' (gap-3), 'md' (gap-4), 'lg' (gap-6) (default: 'md') */
    gap?: 'sm' | 'md' | 'lg' | undefined;
    /** Optional section title */
    title?: string | undefined;
    /** Optional section description / subtitle */
    description?: string | undefined;
    /** Whether metrics data is currently loading */
    loading?: boolean | undefined;
    /** Number of skeleton cards to render during loading (default: 4) */
    skeletonCount?: number | undefined;
    /** Whether the metric dataset is empty */
    empty?: boolean | undefined;
    /** Empty message to display (default: 'No metrics available') */
    emptyMessage?: string | undefined;
    /** Additional CSS classes for outer container */
    class?: string | undefined;
    /** Custom slot for top-right actions (filters, refresh, timer) */
    actions?: Snippet | undefined;
    /** Custom slot for grid contents (GaugeCharts, StatisticCards, etc.) */
    children?: Snippet | undefined;
    /** Custom slot for empty state presentation */
    emptyContent?: Snippet | undefined;
  }

  let {
    cols = 'auto',
    gap = 'md',
    title,
    description,
    loading = false,
    skeletonCount = 4,
    empty = false,
    emptyMessage = 'No metrics available',
    class: className = '',
    actions,
    children,
    emptyContent,
  }: MetricGridProps = $props();

  const colsClass = $derived.by(() => {
    switch (cols) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 sm:grid-cols-2';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      case 5:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5';
      case 6:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6';
      case 'auto':
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
  });

  const gapClass = $derived.by(() => {
    switch (gap) {
      case 'sm':
        return 'gap-3';
      case 'lg':
        return 'gap-6';
      case 'md':
      default:
        return 'gap-4';
    }
  });
</script>

<section
  aria-label={title ?? 'Dashboard metrics'}
  data-svadmin-component="MetricGrid"
  data-columns={cols}
  class={cn('w-full flex flex-col space-y-4', className)}
>
  {#if title || description || actions}
    <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {#if title}
          <h3 class="text-base font-semibold tracking-tight text-foreground md:text-lg">
            {title}
          </h3>
        {/if}
        {#if description}
          <p class="text-xs text-muted-foreground md:text-sm">
            {description}
          </p>
        {/if}
      </div>

      {#if actions}
        <div class="flex items-center gap-2 self-start sm:self-auto">
          {@render actions()}
        </div>
      {/if}
    </div>
  {/if}

  {#if loading}
    <div
      role="status"
      aria-label="Loading metrics"
      data-slot="metric-grid-loading"
      class={cn('grid w-full', colsClass, gapClass)}
    >
      {#each Array(skeletonCount) as _, i (i)}
        <div
          class="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm space-y-3"
        >
          <div class="flex items-center justify-between">
            <Skeleton class="h-4 w-28" />
            <Skeleton class="h-4 w-6 rounded-full" />
          </div>
          <div class="space-y-1.5">
            <Skeleton class="h-8 w-24" />
            <Skeleton class="h-3 w-36" />
          </div>
          <div class="pt-2">
            <Skeleton class="h-2 w-full rounded-full" />
          </div>
        </div>
      {/each}
    </div>
  {:else if empty}
    {#if emptyContent}
      {@render emptyContent()}
    {:else}
      <div
        data-slot="metric-grid-empty"
        class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground"
      >
        <p class="text-sm font-medium">{emptyMessage}</p>
      </div>
    {/if}
  {:else if children}
    <div
      data-slot="metric-grid-content"
      class={cn('grid w-full items-stretch', colsClass, gapClass)}
    >
      {@render children()}
    </div>
  {/if}
</section>
