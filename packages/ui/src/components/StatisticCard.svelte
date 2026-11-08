<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  export interface StatisticTrendItem {
    /** Label of the trend (e.g. '周同比', '日环比') */
    label?: string;
    /** Trend value (e.g. '12.5%', 18.2) */
    value: string | number;
    /** Trend direction */
    direction: 'up' | 'down';
  }

  export interface StatisticCardProps {
    /** Card title */
    title?: string;
    /** Tooltip explanation text */
    tip?: string;
    /** Main numerical value */
    value?: string | number;
    /** Prefix symbol (e.g. '¥', '$') */
    prefix?: string;
    /** Suffix symbol (e.g. '%', '人', '单') */
    suffix?: string;
    /** Decimal precision */
    precision?: number;
    /** Array of trend comparisons (e.g. YoY / MoM) */
    trends?: StatisticTrendItem[];
    /** Custom extra action in header */
    extra?: Snippet;
    /** Embedded chart or sparkline slot */
    chart?: Snippet;
    /** Bottom footer summary slot */
    footer?: Snippet;
    /** Card content slot */
    children?: Snippet;
    /** Card size */
    size?: 'default' | 'small';
    /** Additional CSS classes */
    class?: string;
    [key: string]: unknown;
  }

  let {
    title,
    tip,
    value = 0,
    prefix,
    suffix,
    precision,
    trends = [],
    extra,
    chart,
    footer,
    children,
    size = 'default',
    class: className = '',
    ...restProps
  }: StatisticCardProps = $props();

  const formattedValue = $derived.by(() => {
    if (typeof value === 'number' && precision !== undefined) {
      return value.toFixed(precision);
    }
    return String(value);
  });
</script>

<div
  data-svadmin-component="StatisticCard"
  class={cn(
    'svadmin-statistic-card flex flex-col justify-between rounded-[4px] border border-border bg-card text-card-foreground shadow-sm hover:border-primary/40 transition-colors',
    size === 'small' ? 'p-3 text-xs' : 'p-4 text-sm',
    className
  )}
  {...restProps}
>
  <!-- Card Header -->
  {#if title || extra}
    <div class="flex items-center justify-between pb-2 border-b border-border/60">
      <div class="flex items-center gap-1.5 min-w-0">
        {#if title}
          <span class="font-medium text-xs text-muted-foreground truncate">{title}</span>
        {/if}
        {#if tip}
          <span
            title={tip}
            class="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-muted text-[10px] text-muted-foreground/80 cursor-help"
          >
            ?
          </span>
        {/if}
      </div>
      {#if extra}
        <div class="shrink-0 text-xs text-muted-foreground">
          {@render extra()}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Main Metric Number -->
  <div class="my-2.5">
    <div class="flex items-baseline gap-1">
      {#if prefix}
        <span class="text-sm font-medium text-muted-foreground">{prefix}</span>
      {/if}
      <span class={cn('font-bold tracking-tight text-foreground font-mono leading-none', size === 'small' ? 'text-xl' : 'text-2xl sm:text-3xl')}>
        {formattedValue}
      </span>
      {#if suffix}
        <span class="text-xs text-muted-foreground font-normal ml-0.5">{suffix}</span>
      {/if}
    </div>

    <!-- Trend Indicators (YoY / MoM) -->
    {#if trends.length > 0}
      <div class="flex flex-wrap items-center gap-3 mt-2 text-xs">
        {#each trends as trend, idx (trend.label ? trend.label + idx : idx)}
          <div class="flex items-center gap-1">
            {#if trend.label}
              <span class="text-muted-foreground text-[11px]">{trend.label}</span>
            {/if}
            <span
              class={cn(
                'inline-flex items-center text-xs font-medium font-mono',
                trend.direction === 'up' ? 'text-success' : 'text-destructive'
              )}
            >
              {#if trend.direction === 'up'}
                <svg class="w-3 h-3 shrink-0 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              {:else}
                <svg class="w-3 h-3 shrink-0 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              {/if}
              {trend.value}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Chart / Sparkline Slot -->
  {#if chart}
    <div class="my-1.5 w-full">
      {@render chart()}
    </div>
  {/if}

  <!-- Body Content -->
  {#if children}
    <div class="mt-1 text-xs text-muted-foreground">
      {@render children()}
    </div>
  {/if}

  <!-- Footer -->
  {#if footer}
    <div class="mt-3 pt-2.5 border-t border-border/60 text-xs text-muted-foreground">
      {@render footer()}
    </div>
  {/if}
</div>
