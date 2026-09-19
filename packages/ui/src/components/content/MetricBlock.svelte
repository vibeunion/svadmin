<script lang="ts">
  import type { Snippet } from 'svelte';
  import { metricBlock } from '../../styled-system/recipes/index.js';
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
  const styles = $derived(metricBlock({ trendTone }));
</script>

<div data-svadmin-metric-card role="region" aria-label={label} class={styles.root + ' ' + className}>
  <div class={styles.header}>
    <p class={styles.label}>{label}</p>
    {#if icon}<span class={styles.icon} aria-hidden="true">{@render icon()}</span>{/if}
  </div>
  {#if loading}
    <Skeleton class={styles.skeleton} />
  {:else}
    <p class={styles.value}>{value}</p>
    {#if detail || trend}<div class={styles.meta}>{#if trend}<span class={styles.trend}>{trend}</span>{/if}{#if detail}<span class={styles.detail}>{detail}</span>{/if}</div>{/if}
  {/if}
</div>
