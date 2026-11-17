<script lang="ts">
  import type { Snippet } from 'svelte';
  import { formatAdminNumber } from '@svadmin/core';
  import { cn } from '../utils.js';

  interface Props {
    title?: string | Snippet;
    tip?: string | Snippet;
    tooltip?: string | Snippet;
    value: number | string;
    precision?: number;
    prefix?: string | Snippet;
    suffix?: string | Snippet;
    extra?: string | Snippet;
    groupSeparator?: boolean;
    separator?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendLabel?: string;
    loading?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    title,
    tip,
    tooltip,
    value,
    precision = 0,
    prefix,
    suffix,
    extra,
    groupSeparator = false,
    separator,
    trend,
    trendLabel,
    loading = false,
    class: className = '',
    children,
  }: Props = $props();

  const isGrouped = $derived(groupSeparator || separator !== undefined);
  const resolvedTip = $derived(tooltip ?? tip);

  const display = $derived(
    typeof value === 'number'
      ? formatAdminNumber(value, { locale: isGrouped ? 'en-US' : null, minimumFractionDigits: precision, maximumFractionDigits: precision })
      : value,
  );
</script>

<div class={cn('svadmin-statistic', className)} aria-busy={loading || undefined}>
  {#if title || resolvedTip}
    <div class="svadmin-statistic__title">
      {#if typeof title === 'string'}{title}{:else if title}{@render title()}{/if}
      {#if resolvedTip}
        {#if typeof resolvedTip === 'string'}
          <span title={resolvedTip} class="svadmin-statistic__tip cursor-help" aria-label={resolvedTip}>?</span>
        {:else}
          <span class="svadmin-statistic__tip">{@render resolvedTip()}</span>
        {/if}
      {/if}
    </div>
  {/if}
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
  {#if extra}
    <div class="svadmin-statistic__extra">
      {#if typeof extra === 'string'}{extra}{:else}{@render extra()}{/if}
    </div>
  {/if}
  {@render children?.()}
</div>

<style>
  .svadmin-statistic { display: grid; min-width: 0; gap: 0; line-height: 1.5715; color: var(--muted-foreground); }
  .svadmin-statistic__title { display: flex; align-items: center; gap: var(--svadmin-space-1); margin: 0 0 8px; color: var(--muted-foreground); font-size: var(--svadmin-text-body); }
  .svadmin-statistic__tip { display: inline-flex; align-items: center; justify-content: center; width: 0.875rem; height: 0.875rem; border-radius: 999px; background: var(--muted); color: var(--muted-foreground); font-size: 0.625rem; line-height: 1; }
  .svadmin-statistic__value { display: flex; align-items: baseline; gap: var(--svadmin-space-1); margin: 0; color: var(--foreground); font-size: 1.625rem; font-weight: 500; line-height: 1.5715; }
  .svadmin-statistic__affix { color: var(--muted-foreground); font-size: var(--svadmin-text-body); font-weight: 500; }
  .svadmin-statistic__trend { display: flex; align-items: center; gap: var(--svadmin-space-1); margin: 0; color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-statistic__trend[data-trend='up'] { color: var(--success, var(--primary)); }
  .svadmin-statistic__trend[data-trend='down'] { color: var(--destructive); }
  .svadmin-statistic__extra { margin-top: 8px; color: var(--muted-foreground); font-size: var(--svadmin-text-body); }
  .svadmin-statistic__skeleton { width: 4.5rem; height: 1.5rem; border-radius: var(--radius-sm); background: var(--muted); animation: svadmin-statistic-pulse 1.4s ease-in-out infinite; }
  .svadmin-statistic__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  @keyframes svadmin-statistic-pulse { 50% { opacity: 0.5; } }
  @media (prefers-reduced-motion: reduce) { .svadmin-statistic__skeleton { animation: none; } }
</style>
