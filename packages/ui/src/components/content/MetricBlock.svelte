<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Skeleton } from '../ui/skeleton/index.js';
  export type MetricTrendTone = 'positive' | 'negative' | 'warning' | 'neutral';
  interface Props {
    label: string;
    value: string | number;
    detail?: string;
    trend?: string;
    trendTone?: MetricTrendTone;
    icon?: Snippet;
    loading?: boolean;
    class?: string;
  }
  let {
    label,
    value,
    detail,
    trend,
    trendTone = 'neutral',
    icon,
    loading = false,
    class: className = '',
  }: Props = $props();
  const trendClass: Record<MetricTrendTone, string> = {
    positive: 'text-success',
    negative: 'text-destructive',
    warning: 'text-warning-foreground',
    neutral: 'text-muted-foreground',
  };
</script>

<div data-svadmin-metric-card class={'min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm ' + className}>
  <div class="flex items-start justify-between gap-3">
    <p class="text-sm text-muted-foreground">{label}</p>
    {#if icon}<span class="text-muted-foreground">{@render icon()}</span>{/if}
  </div>
  {#if loading}
    <Skeleton class="mt-3 h-8 w-24" />
  {:else}
    <p class="mt-2 truncate text-2xl font-semibold tracking-normal text-foreground">{value}</p>
    {#if detail || trend}<div class="mt-2 flex flex-wrap gap-2 text-xs">{#if trend}<span class={'font-medium ' + trendClass[trendTone]}>{trend}</span>{/if}{#if detail}<span class="text-muted-foreground">{detail}</span>{/if}</div>{/if}
  {/if}
</div>
