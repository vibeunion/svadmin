<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import LiteBadge from './LiteBadge.svelte';

  export type LiteMetricTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  export type LiteMetricBadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

  export interface LiteMetricStripItem {
    id?: string;
    label: string;
    value: string | number;
    tone?: LiteMetricTone;
    badge?: { text: string; tone?: LiteMetricBadgeTone };
    icon?: Component<{ class?: string }>;
    href?: string;
    trend?: { value: number; label?: string };
    loading?: boolean;
    class?: string;
  }

  interface Props {
    items?: LiteMetricStripItem[];
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

  const toneClass: Record<LiteMetricTone, string> = {
    default: '',
    primary: 'lite-metric-value-primary',
    success: 'lite-metric-value-success',
    warning: 'lite-metric-value-warning',
    danger: 'lite-metric-value-danger',
    info: 'lite-metric-value-info',
  };

  const badgeVariant: Record<LiteMetricBadgeTone, 'default' | 'subtle-success' | 'subtle-warning' | 'subtle-destructive' | 'info'> = {
    default: 'default',
    success: 'subtle-success',
    warning: 'subtle-warning',
    danger: 'subtle-destructive',
    info: 'info',
  };
</script>

<div
  role="region"
  aria-label={ariaLabel}
  class={'lite-metric-strip lite-metric-strip-' + columns + (className ? ' ' + className : '')}
>
  {#if children}
    {@render children()}
  {:else}
  {#each items as item, index (item.id || index)}
    {@const interactive = Boolean(item.href)}
    <svelte:element
      this={interactive ? 'a' : 'div'}
      href={item.href}
      class={'lite-metric-item' + (interactive ? ' lite-metric-item-link' : '') + (item.class ? ' ' + item.class : '')}
    >
      <div class="lite-metric-label">
        <span>{item.label}</span>
        {#if item.icon}<span class="lite-metric-icon" aria-hidden="true"><item.icon class="lite-metric-icon-svg" /></span>{/if}
      </div>
      {#if item.loading}
        <span class="lite-metric-loading" aria-label="Loading">&nbsp;</span>
      {:else}
        <div class="lite-metric-value-row">
          <strong class={'lite-metric-value ' + (toneClass[item.tone || 'default'] || '')}>{item.value}</strong>
          {#if item.badge}
            <LiteBadge variant={badgeVariant[item.badge.tone || 'default']}>{item.badge.text}</LiteBadge>
          {:else if item.trend}
            <span
              class={'lite-metric-trend ' + (item.trend.value >= 0 ? 'lite-metric-trend-up' : 'lite-metric-trend-down')}
              aria-label={(item.trend.value >= 0 ? 'Up ' : 'Down ') + Math.abs(item.trend.value) + ' percent'}
            >
              <span aria-hidden="true">{item.trend.value >= 0 ? '↑' : '↓'}</span>
              {Math.abs(item.trend.value)}%
              {#if item.trend.label}<span class="lite-metric-trend-label">{item.trend.label}</span>{/if}
            </span>
          {/if}
        </div>
      {/if}
    </svelte:element>
  {/each}
  {/if}
</div>
