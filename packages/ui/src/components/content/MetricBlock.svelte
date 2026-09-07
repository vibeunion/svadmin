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

<div data-svadmin-metric-card role="region" aria-label={label} class={'svadmin-u-7e0b7cdf1a94 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-438b2237b8d6 ' + className}>
  <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c">
    <p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{label}</p>
    {#if icon}<span class="svadmin-u-bfa603190748" aria-hidden="true">{@render icon()}</span>{/if}
  </div>
  {#if loading}
    <Skeleton class="svadmin-u-eccd13ef4f2f svadmin-u-ed8a5df7b2fb svadmin-u-69da7e4ff95d" />
  {:else}
    <p class="svadmin-u-50d0d216a2f8 svadmin-u-f283ea9bea0e svadmin-u-3febee094e85 svadmin-u-e83a7042bc91 svadmin-u-d9256981a032 svadmin-u-d4108abe6359 svadmin-u-3032cae0badb">{value}</p>
    {#if detail || trend}<div class="svadmin-u-50d0d216a2f8 svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-77a2a20e90d4 svadmin-u-359090c2d529">{#if trend}<span class={'svadmin-u-2689f3958069 svadmin-u-3032cae0badb ' + trendClass[trendTone]}>{trend}</span>{/if}{#if detail}<span class="svadmin-u-bfa603190748">{detail}</span>{/if}</div>{/if}
  {/if}
</div>
