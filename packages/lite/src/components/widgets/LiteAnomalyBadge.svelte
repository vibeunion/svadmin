<script lang="ts">
  /**
   * SSR AnomalyBadge — Rendered as a static colored badge.
   * The SPA version has tooltips (requires JS). In lite mode,
   * we use a title attribute for the tooltip fallback.
   */
  interface Props {
    value: number;
    baseline: number;
    threshold?: number;
    formatter?: (val: number) => string;
    lowerIsBetter?: boolean;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let {
    value,
    baseline,
    threshold = 0.2,
    formatter = (v: number) => v.toString(),
    lowerIsBetter = false,
    class: className = '',
  }: Props = $props();

  const diff = $derived(
    baseline === 0
      ? value === 0 ? 0 : value > 0 ? Infinity : -Infinity
      : (value - baseline) / Math.abs(baseline),
  );
  const isAnomaly = $derived(Math.abs(diff) >= threshold);
  const isGood = $derived(!isAnomaly ? null : (lowerIsBetter ? diff < 0 : diff > 0));
  const percentLabel = $derived(`${Math.abs(diff * 100).toFixed(1)}%`);
  const arrow = $derived(diff > 0 ? '↑' : '↓');
</script>

{#if !isAnomaly}
  <span class="lite-anomaly-value {className}" style="font-size: 14px; color: #4E5969;">{formatter(value)}</span>
{:else}
  <span
    title="Baseline: {formatter(baseline)} ({diff > 0 ? '+' : '-'}{percentLabel})"
    class="lite-badge {className}"
    style="background: {isGood ? '#E8FFEA' : '#FFECE8'}; color: {isGood ? '#009A29' : '#CB272D'}; border: 1px solid {isGood ? '#E8FFEA' : '#FDCDC5'};"
  >
    {arrow} {formatter(value)}
  </span>
{/if}
