<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    title?: string;
    value: number | string;
    precision?: number;
    prefix?: string | Snippet;
    suffix?: string | Snippet;
    trend?: 'up' | 'down' | 'neutral';
    trendLabel?: string;
    loading?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    title,
    value,
    precision = 0,
    prefix,
    suffix,
    trend,
    trendLabel,
    loading = false,
    class: className = '',
    children,
  }: Props = $props();

  const display = $derived(
    typeof value === 'number'
      ? new Intl.NumberFormat(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(value)
      : value,
  );
</script>

<div class={cn('svadmin-statistic', className)} aria-busy={loading || undefined}>
  {#if title}<p class="svadmin-statistic__title">{title}</p>{/if}
  <p class="svadmin-statistic__value">
    {#if prefix}
      <span class="svadmin-statistic__affix">{#if typeof prefix === 'string'}{prefix}{:else}{@render prefix()}{/if}</span>
    {/if}
    {#if loading}
      <span class="svadmin-statistic__skeleton" aria-hidden="true"></span>
      <span class="svadmin-statistic__sr">{display}</span>
    {:else}
      {display}
    {/if}
    {#if suffix}
      <span class="svadmin-statistic__affix">{#if typeof suffix === 'string'}{suffix}{:else}{@render suffix()}{/if}</span>
    {/if}
  </p>
  {#if trend || trendLabel}
    <p class="svadmin-statistic__trend" data-trend={trend ?? 'neutral'}>
      {#if trend === 'up'}↑{:else if trend === 'down'}↓{:else}→{/if}
      {#if trendLabel}<span>{trendLabel}</span>{/if}
    </p>
  {/if}
  {@render children?.()}
</div>

<style>
  .svadmin-statistic { display: grid; min-width: 0; gap: var(--svadmin-space-1); }
  .svadmin-statistic__title { margin: 0; color: var(--muted-foreground); font-size: var(--svadmin-text-label); }
  .svadmin-statistic__value { display: flex; align-items: baseline; gap: var(--svadmin-space-1); margin: 0; color: var(--foreground); font-size: var(--svadmin-text-heading); font-weight: 650; line-height: var(--svadmin-leading-tight); }
  .svadmin-statistic__affix { color: var(--muted-foreground); font-size: var(--svadmin-text-label); font-weight: 500; }
  .svadmin-statistic__trend { display: flex; align-items: center; gap: var(--svadmin-space-1); margin: 0; color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-statistic__trend[data-trend='up'] { color: var(--success, var(--primary)); }
  .svadmin-statistic__trend[data-trend='down'] { color: var(--destructive); }
  .svadmin-statistic__skeleton { width: 4.5rem; height: 1.5rem; border-radius: var(--radius-sm); background: var(--muted); animation: svadmin-statistic-pulse 1.4s ease-in-out infinite; }
  .svadmin-statistic__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  @keyframes svadmin-statistic-pulse { 50% { opacity: 0.5; } }
  @media (prefers-reduced-motion: reduce) { .svadmin-statistic__skeleton { animation: none; } }
</style>