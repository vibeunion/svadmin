<script lang="ts">
  import { Badge } from './ui/badge/index.js';
  import { TrendingUp, TrendingDown } from '@lucide/svelte';
  import TooltipButton from './TooltipButton.svelte';

  interface Props {
    /** The actual current value */
    value: number;
    /** The baseline/expected value to compare against */
    baseline: number;
    /** Threshold percentage to trigger an anomaly (e.g. 0.2 means 20% diff) */
    threshold?: number;
    /** Optional label formatting */
    formatter?: (val: number) => string;
    /** If true, lower is better (e.g. latency). Default false (higher is better e.g. revenue). */
    lowerIsBetter?: boolean;
    class?: string;
  }

  let { 
    value, 
    baseline, 
    threshold = 0.2, 
    formatter = (v) => v.toString(), 
    lowerIsBetter = false,
    class: className = '' 
  }: Props = $props();

  // Calculate percentage difference
  const diff = $derived(
    baseline === 0 
      ? (value === 0 ? 0 : (value > 0 ? Infinity : -Infinity))
      : (value - baseline) / Math.abs(baseline)
  );
  const isAnomaly = $derived(Math.abs(diff) >= threshold);
  
  // Determine sentiment (good, bad, neutral)
  const isGood = $derived(
    !isAnomaly ? null : 
    (lowerIsBetter ? diff < 0 : diff > 0)
  );

  const percentLabel = $derived(`${Math.abs(diff * 100).toFixed(1)}%`);
  const anomalyAriaLabel = $derived(
    `Anomaly: current ${formatter(value)}, baseline ${formatter(baseline)} (${diff > 0 ? '+' : '-'}${percentLabel})`
  );
</script>

{#if !isAnomaly}
  <span class="text-muted-foreground text-sm font-medium tabular-nums {className}">
    {formatter(value)}
  </span>
{:else}
  <TooltipButton 
    tooltip={`Baseline: ${formatter(baseline)} (${diff > 0 ? '+' : '-'}${percentLabel})`}
    variant="ghost" 
    size="sm" 
    class="p-0 h-auto hover:bg-transparent"
    aria-label={anomalyAriaLabel}
  >
    <Badge 
      variant={isGood ? 'default' : 'destructive'} 
      class="flex items-center gap-1 font-mono text-xs tabular-nums px-1.5 py-0 {isGood ? 'bg-success hover:bg-success/90 text-success-foreground' : ''} {className}"
    >
      {#if diff > 0}
        <TrendingUp class="h-3 w-3" aria-hidden="true" />
      {:else}
        <TrendingDown class="h-3 w-3" aria-hidden="true" />
      {/if}
      {formatter(value)}
    </Badge>
  </TooltipButton>
{/if}
