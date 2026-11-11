<script lang="ts">
  import {
    Minus,
    ArrowUpRight,
    ArrowDownRight,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';

  export interface PeriodComparisonCardProps {
    title: string;
    currentValue: number;
    previousValue: number;
    currentLabel?: string | undefined;
    previousLabel?: string | undefined;
    periodName?: string | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
    reverseColor?: boolean | undefined;
    precision?: number | undefined;
    class?: string | undefined;
  }

  let {
    title,
    currentValue,
    previousValue,
    currentLabel,
    previousLabel,
    periodName,
    prefix = '',
    suffix = '',
    reverseColor = false,
    precision = 1,
    class: className = '',
  }: PeriodComparisonCardProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  const delta = $derived(currentValue - previousValue);
  const deltaPercent = $derived.by(() => {
    if (previousValue === 0) return 0;
    const raw = (delta / Math.abs(previousValue)) * 100;
    const factor = Math.pow(10, precision);
    return Math.round(raw * factor) / factor;
  });

  const isUp = $derived(delta > 0);
  const isDown = $derived(delta < 0);
  const isFlat = $derived(delta === 0);

  // Normal: up = green (positive), down = red (destructive)
  // Reversed: up = red (e.g. error count/latency), down = green
  const isPositive = $derived(reverseColor ? isDown : isUp);
  const isNegative = $derived(reverseColor ? isUp : isDown);

  const maxBarValue = $derived(Math.max(currentValue, previousValue, 1));
  const currentBarWidth = $derived(Math.max(8, Math.round((currentValue / maxBarValue) * 100)));
  const prevBarWidth = $derived(Math.max(8, Math.round((previousValue / maxBarValue) * 100)));

  const resolvedCurrentLabel = $derived(currentLabel ?? (chinese ? '本期实际' : 'Current Period'));
  const resolvedPreviousLabel = $derived(previousLabel ?? (chinese ? '对比基准' : 'Prior Period'));
  const resolvedPeriodName = $derived(periodName ?? (chinese ? '较上期环比' : 'vs Prior Period'));
</script>

<div
  data-svadmin-component="PeriodComparisonCard"
  class={cn(
    'rounded-2xl border border-border bg-card text-card-foreground shadow-xs p-5 space-y-3.5',
    className,
  )}
>
  <!-- Card Header -->
  <div class="flex items-center justify-between text-xs">
    <span class="font-semibold text-muted-foreground">{title}</span>
    <span class="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
      {resolvedPeriodName}
    </span>
  </div>

  <!-- Primary Metric & Delta Pill -->
  <div class="flex items-baseline justify-between gap-3">
    <div class="font-mono text-2xl font-bold text-foreground tracking-tight">
      {prefix}{currentValue.toLocaleString()}{suffix}
    </div>

    <!-- Delta Capsule Pill -->
    <div
      class={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold font-mono border',
        isPositive && 'border-success/30 bg-success/15 text-success',
        isNegative && 'border-destructive/30 bg-destructive/15 text-destructive',
        isFlat && 'border-border bg-muted text-muted-foreground',
      )}
    >
      {#if isUp}
        <ArrowUpRight class="h-3.5 w-3.5" />
        <span>+{deltaPercent}%</span>
      {:else if isDown}
        <ArrowDownRight class="h-3.5 w-3.5" />
        <span>{deltaPercent}%</span>
      {:else}
        <Minus class="h-3.5 w-3.5" />
        <span>0.0%</span>
      {/if}
    </div>
  </div>

  <!-- Micro Comparison Bars -->
  <div class="space-y-1.5 pt-1 text-[11px]">
    <!-- Current Period Bar -->
    <div class="space-y-0.5">
      <div class="flex items-center justify-between text-muted-foreground">
        <span>{resolvedCurrentLabel}</span>
        <span class="font-mono font-medium text-foreground">{prefix}{currentValue.toLocaleString()}{suffix}</span>
      </div>
      <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div class="h-full rounded-full bg-primary transition-all duration-300" style="width: {currentBarWidth}%;"></div>
      </div>
    </div>

    <!-- Prior Period Bar -->
    <div class="space-y-0.5">
      <div class="flex items-center justify-between text-muted-foreground">
        <span>{resolvedPreviousLabel}</span>
        <span class="font-mono text-muted-foreground">{prefix}{previousValue.toLocaleString()}{suffix}</span>
      </div>
      <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div class="h-full rounded-full bg-muted-foreground/40 transition-all duration-300" style="width: {prevBarWidth}%;"></div>
      </div>
    </div>
  </div>

  <!-- Net Difference Footnote -->
  <div class="flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground font-mono">
    <span>{chinese ? '绝对差异值:' : 'Net Delta:'}</span>
    <span class="font-bold {isPositive ? 'text-success' : isNegative ? 'text-destructive' : 'text-foreground'}">
      {delta > 0 ? '+' : ''}{prefix}{delta.toLocaleString()}{suffix}
    </span>
  </div>
</div>
