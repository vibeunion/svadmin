<script lang="ts">
  import type { Snippet } from 'svelte';
  import LiteStatsCard from './LiteStatsCard.svelte';

  type MetricColumns = 1 | 2 | 3 | 4 | 5 | 6 | 'auto';
  type MetricGap = 'sm' | 'md' | 'lg';

  interface LiteMetricGridItem {
    id?: string;
    label: string;
    value: string | number;
    description?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    icon?: string;
    href?: string;
  }

  interface Props {
    items?: LiteMetricGridItem[];
    cols?: MetricColumns;
    gap?: MetricGap;
    title?: string;
    description?: string;
    loading?: boolean;
    skeletonCount?: number;
    empty?: boolean;
    emptyMessage?: string;
    class?: string;
    actions?: Snippet;
    children?: Snippet;
    emptyContent?: Snippet;
  }

  let {
    items = [],
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
  }: Props = $props();

  const skeletonItems = $derived(Array.from({ length: Math.max(1, skeletonCount) }, (_, index) => index));
</script>

<section
  class="lite-metric-grid lite-metric-grid-{cols} lite-metric-grid-gap-{gap} {className}"
  aria-label={title ?? 'Dashboard metrics'}
  data-columns={cols}
>
  {#if title || description || actions}
    <header class="lite-metric-grid-header">
      <div>
        {#if title}<h2>{title}</h2>{/if}
        {#if description}<p>{description}</p>{/if}
      </div>
      {#if actions}<div class="lite-metric-grid-actions">{@render actions()}</div>{/if}
    </header>
  {/if}

  {#if loading}
    <div class="lite-metric-grid-items">
      {#each skeletonItems as item (item)}
        <div class="lite-metric-grid-cell">
          <div class="lite-metric-grid-skeleton" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
        </div>
      {/each}
    </div>
  {:else if empty}
    <div class="lite-metric-grid-empty" role="status">
      {#if emptyContent}{@render emptyContent()}{:else}<p>{emptyMessage}</p>{/if}
    </div>
  {:else if children}
    {@render children()}
  {:else if items.length === 0}
    <div class="lite-metric-grid-empty" role="status"><p>{emptyMessage}</p></div>
  {:else}
    <div class="lite-metric-grid-items">
      {#each items as item (item.id ?? item.label)}
        <div class="lite-metric-grid-cell">
          <LiteStatsCard
            label={item.label}
            value={item.value}
            description={item.description}
            trend={item.trend}
            trendValue={item.trendValue}
            icon={item.icon}
            href={item.href}
          />
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .lite-metric-grid { display: block; }
  .lite-metric-grid-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
  .lite-metric-grid-header > div + div { margin-left: 12px; }
  .lite-metric-grid-header h2 { margin: 0; color: #1d2129; font-size: 16px; }
  .lite-metric-grid-header p { margin: 4px 0 0; color: #4e5969; font-size: 12px; }
  .lite-metric-grid-actions { display: flex; }
  .lite-metric-grid-actions > * + * { margin-left: 8px; }
  .lite-metric-grid-items { display: flex; flex-wrap: wrap; margin: 0 -8px; }
  .lite-metric-grid-cell { box-sizing: border-box; width: 100%; padding: 0 8px; margin-bottom: 16px; }
  .lite-metric-grid-gap-sm .lite-metric-grid-items { margin: 0 -6px; }
  .lite-metric-grid-gap-sm .lite-metric-grid-cell { padding: 0 6px; margin-bottom: 12px; }
  .lite-metric-grid-gap-lg .lite-metric-grid-items { margin: 0 -12px; }
  .lite-metric-grid-gap-lg .lite-metric-grid-cell { padding: 0 12px; margin-bottom: 24px; }
  .lite-metric-grid-auto .lite-metric-grid-cell { width: 25%; }
  .lite-metric-grid-1 .lite-metric-grid-cell { width: 100%; }
  .lite-metric-grid-2 .lite-metric-grid-cell { width: 50%; }
  .lite-metric-grid-3 .lite-metric-grid-cell { width: 33.3333%; }
  .lite-metric-grid-4 .lite-metric-grid-cell { width: 25%; }
  .lite-metric-grid-5 .lite-metric-grid-cell { width: 20%; }
  .lite-metric-grid-6 .lite-metric-grid-cell { width: 16.6666%; }
  .lite-metric-grid-skeleton { min-height: 96px; border: 1px solid #e5e6eb; border-radius: 6px; padding: 16px; background: #f7f8fa; }
  .lite-metric-grid-skeleton span { display: block; height: 10px; margin-bottom: 10px; border-radius: 3px; background: #e5e6eb; }
  .lite-metric-grid-skeleton span:first-child { width: 45%; }
  .lite-metric-grid-skeleton span:nth-child(2) { width: 70%; height: 20px; }
  .lite-metric-grid-skeleton span:last-child { width: 35%; margin-bottom: 0; }
  .lite-metric-grid-empty { border: 1px dashed #e5e6eb; border-radius: 6px; padding: 24px; color: #86909c; text-align: center; background: #f7f8fa; }
  @media (max-width: 900px) {
    .lite-metric-grid-auto .lite-metric-grid-cell,
    .lite-metric-grid-3 .lite-metric-grid-cell,
    .lite-metric-grid-4 .lite-metric-grid-cell,
    .lite-metric-grid-5 .lite-metric-grid-cell,
    .lite-metric-grid-6 .lite-metric-grid-cell { width: 50%; }
  }
  @media (max-width: 560px) {
    .lite-metric-grid-cell { width: 100% !important; }
  }
</style>
