<script lang="ts">
  import { Skeleton } from './ui/skeleton/index.js';
  import { cn } from '../utils.js';
  import type { Snippet } from 'svelte';

  export type MetricTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

  export interface MetricStripItem {
    id?: string;
    label: string;
    value: string | number;
    tone?: MetricTone;
    badge?: {
      text: string;
      tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    };
    icon?: import('svelte').Component<{ class?: string }>;
    href?: string;
    trend?: {
      value: number;
      label?: string;
    };
    loading?: boolean;
    class?: string;
  }

  interface Props {
    items?: MetricStripItem[];
    columns?: 2 | 3 | 4 | 5 | 6 | 'auto';
    class?: string;
    children?: Snippet;
  }

  let {
    items = [],
    columns = 'auto',
    class: className = '',
    children,
  }: Props = $props();

  const columnClassMap = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
    auto: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  const toneValueColorMap: Record<MetricTone, string> = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning-foreground',
    danger: 'text-destructive',
    info: 'text-info',
  };

  const badgeToneMap: Record<
    NonNullable<NonNullable<MetricStripItem['badge']>['tone']>,
    string
  > = {
    default: 'bg-muted text-muted-foreground border-border',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning-foreground border-warning/20',
    danger: 'bg-destructive/10 text-destructive border-destructive/20',
    info: 'bg-info/10 text-info border-info/20',
  };
</script>

<div
  role="region"
  aria-label="业务指标概览"
  class={cn(
    'grid divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-xs sm:divide-y-0',
    columnClassMap[columns] || columnClassMap.auto,
    className
  )}
>
  {#if children}
    {@render children()}
  {:else}
    {#each items as item, index (item.id || index)}
      {@const isInteractive = Boolean(item.href)}
      <svelte:element
        this={isInteractive ? 'a' : 'div'}
        href={item.href}
        class={cn(
          'group relative flex flex-col justify-between gap-1 border-border p-3.5 text-left transition-colors duration-150 first:border-l-0 sm:border-l sm:p-4',
          isInteractive && 'cursor-pointer text-inherit no-underline hover:bg-muted/40',
          item.class
        )}
      >
        <div class="flex items-center justify-between gap-2">
          <span class="truncate text-xs font-semibold text-muted-foreground">{item.label}</span>
          {#if item.icon}
            <span class="shrink-0 text-muted-foreground/70">
              <item.icon class="h-3.5 w-3.5" />
            </span>
          {/if}
        </div>

        {#if item.loading}
          <div class="mt-1 flex items-center justify-between">
            <Skeleton class="h-6 w-16" />
          </div>
        {:else}
          <div class="mt-0.5 flex items-baseline justify-between gap-2">
            <strong
              class={cn(
                'text-xl font-bold tracking-tight tabular-nums sm:text-2xl',
                toneValueColorMap[item.tone || 'default']
              )}
            >
              {item.value}
            </strong>

            {#if item.badge}
              <span
                class={cn(
                  'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[11px] font-semibold',
                  badgeToneMap[item.badge.tone || 'default']
                )}
              >
                {item.badge.text}
              </span>
            {:else if item.trend}
              <span
                class={cn(
                  'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
                  item.trend.value >= 0 ? 'text-success' : 'text-destructive'
                )}
                aria-label="{item.trend.value >= 0 ? '上升' : '下降'} {Math.abs(item.trend.value)}%"
              >
                <span aria-hidden="true">{item.trend.value >= 0 ? '↑' : '↓'}</span>
                <span>{Math.abs(item.trend.value)}%</span>
                {#if item.trend.label}
                  <span class="ml-0.5 text-muted-foreground">{item.trend.label}</span>
                {/if}
              </span>
            {/if}
          </div>
        {/if}
      </svelte:element>
    {/each}
  {/if}
</div>
