<script lang="ts">
  interface Props {
    title?: string;
    value: number | string;
    precision?: number;
    prefix?: string;
    suffix?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendLabel?: string;
    loading?: boolean;
    /** Caller class merged with the built-in class list. */
    class?: string;
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
  }: Props = $props();

  const display = $derived(
    typeof value === 'number'
      ? new Intl.NumberFormat(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(value)
      : value,
  );
</script>

<div class="lite-statistic {className}" aria-busy={loading || undefined}>
  {#if title}<p class="lite-statistic__title">{title}</p>{/if}
  <p class="lite-statistic__value">
    {#if prefix}<span>{prefix}</span>{/if}
    {#if loading}<span class="lite-statistic__skeleton" aria-hidden="true"></span><span class="lite-statistic__sr">{display}</span>{:else}{display}{/if}
    {#if suffix}<span>{suffix}</span>{/if}
  </p>
  {#if trend || trendLabel}
    <p class="lite-statistic__trend" data-trend={trend ?? 'neutral'}>
      {#if trend === 'up'}↑{:else if trend === 'down'}↓{:else}→{/if}
      {#if trendLabel}<span>{trendLabel}</span>{/if}
    </p>
  {/if}
</div>

<style>
  .lite-statistic { display: block; min-width: 0; }
  .lite-statistic__title { margin: 0; color: #86909C; font-size: 13px; }
  .lite-statistic__value { display: flex; align-items: baseline; margin: 0; color: #1D2129; font-size: 24px; font-weight: 650; line-height: 1.2; }
  .lite-statistic__value > span:first-child, .lite-statistic__value > span:last-child { color: #86909C; font-size: 13px; font-weight: 500; }
  .lite-statistic__trend { display: flex; margin: 0; color: #86909C; font-size: 12px; }
  .lite-statistic__trend[data-trend='up'] { color: #009A29; }
  .lite-statistic__trend[data-trend='down'] { color: #F53F3F; }
  .lite-statistic__skeleton { display: inline-block; width: 72px; height: 22px; border-radius: 4px; background: #F2F3F5; animation: lite-statistic-pulse 1.4s ease-in-out infinite; }
  .lite-statistic__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  @keyframes lite-statistic-pulse { 50% { opacity: 0.5; } }

  .lite-statistic__value > * + * { margin-left: 4px; }
  .lite-statistic__trend > * + * { margin-left: 4px; }
</style>
