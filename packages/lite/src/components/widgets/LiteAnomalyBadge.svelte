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
  }

  let {
    value,
    baseline,
    threshold = 0.2,
    formatter = (v: number) => v.toString(),
    lowerIsBetter = false,
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
  <span style="font-size: 14px; color: #64748b;">{formatter(value)}</span>
{:else}
  <span
    title="Baseline: {formatter(baseline)} ({diff > 0 ? '+' : '-'}{percentLabel})"
    class="lite-badge"
    style="background: {isGood ? '#ecfdf5' : '#fef2f2'}; color: {isGood ? '#065f46' : '#991b1b'}; border: 1px solid {isGood ? '#a7f3d0' : '#fecaca'};"
  >
    {arrow} {formatter(value)}
  </span>
{/if}
