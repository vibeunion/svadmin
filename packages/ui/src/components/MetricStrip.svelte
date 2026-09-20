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
    ariaLabel?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    items = [],
    columns = 'auto',
    ariaLabel = 'Metrics overview',
    class: className = '',
    children,
  }: Props = $props();

</script>

<div
  role="region"
  aria-label={ariaLabel}
  data-columns={columns}
  class={cn('svadmin-metric-strip', className)}
>
  {#if children}
    {@render children()}
  {:else}
    {#each items as item, index (item.id || index)}
      {@const isInteractive = Boolean(item.href)}
      <svelte:element
        this={isInteractive ? 'a' : 'div'}
        href={item.href}
        data-interactive={isInteractive ? 'true' : undefined}
        data-tone={item.tone || 'default'}
        class={cn('svadmin-metric-item', item.class)}
      >
        <div class="svadmin-metric-heading">
          <span class="svadmin-metric-label">{item.label}</span>
          {#if item.icon}
            <span class="svadmin-metric-icon">
              <item.icon />
            </span>
          {/if}
        </div>

        {#if item.loading}
          <div class="svadmin-metric-loading">
            <Skeleton class="svadmin-metric-skeleton" />
          </div>
        {:else}
          <div class="svadmin-metric-value-row">
            <strong
              class="svadmin-metric-value"
            >
              {item.value}
            </strong>

            {#if item.badge}
              <span
                data-tone={item.badge.tone || 'default'}
                class="svadmin-metric-badge"
              >
                {item.badge.text}
              </span>
            {:else if item.trend}
              <span
                data-direction={item.trend.value >= 0 ? 'up' : 'down'}
                class="svadmin-metric-trend"
                aria-label="{item.trend.value >= 0 ? '上升' : '下降'} {Math.abs(item.trend.value)}%"
              >
                <span aria-hidden="true">{item.trend.value >= 0 ? '↑' : '↓'}</span>
                <span>{Math.abs(item.trend.value)}%</span>
                {#if item.trend.label}
                  <span class="svadmin-metric-trend-label">{item.trend.label}</span>
                {/if}
              </span>
            {/if}
          </div>
        {/if}
      </svelte:element>
    {/each}
  {/if}
</div>
