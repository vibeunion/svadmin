<script lang="ts">
  import { TrendingUp, AlertTriangle, ArrowUpRight } from '@lucide/svelte';

  export interface CapacityMetricPoint {
    date: string;
    value: number;
    predicted?: boolean | undefined;
  }

  export interface SystemCapacityForecastCardProps {
    resourceName?: string | undefined;
    currentUsage?: number | undefined;
    hardLimit?: number | undefined;
    unit?: string | undefined;
    historicalPoints?: CapacityMetricPoint[] | undefined;
    estimatedDaysRemaining?: number | undefined;
    growthRateDaily?: number | undefined;
    class?: string | undefined;
    onrequestupgrade?: (() => void) | undefined;
  }

  const defaultStarterPoints: CapacityMetricPoint[] = [
    { date: '11-05', value: 68 },
    { date: '11-06', value: 72 },
    { date: '11-07', value: 75 },
    { date: '11-08', value: 78 },
    { date: '11-09', value: 83 },
    { date: '11-10', value: 88 },
    { date: '11-11', value: 92 },
    { date: '11-12', value: 96, predicted: true },
    { date: '11-13', value: 100, predicted: true }
  ];

  let {
    resourceName = 'PostgreSQL 云数据库存储空间',
    currentUsage = 920,
    hardLimit = 1000,
    unit = 'GB',
    historicalPoints = defaultStarterPoints,
    estimatedDaysRemaining = 14,
    growthRateDaily = 1.8,
    class: className = '',
    onrequestupgrade = undefined,
  }: SystemCapacityForecastCardProps = $props();

  const usagePercent = $derived(
    hardLimit > 0 ? Math.min(100, Math.round((currentUsage / hardLimit) * 100)) : 0
  );

  const isUrgent = $derived(estimatedDaysRemaining <= 14 || usagePercent >= 90);
</script>

<div
  class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm {className}"
  data-svadmin-component="SystemCapacityForecastCard"
>
  <header class="flex items-start justify-between gap-2">
    <div>
      <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <TrendingUp class="h-3.5 w-3.5 text-primary" />
        <span>容量趋势预测</span>
      </div>
      <h4 class="text-sm font-semibold text-foreground mt-0.5">{resourceName}</h4>
    </div>

    <!-- Countdown Badge -->
    <span
      class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold {isUrgent ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-warning/30 bg-warning/10 text-warning'}"
    >
      <AlertTriangle class="h-3 w-3" />
      <span>预计 {estimatedDaysRemaining} 天后达到上限</span>
    </span>
  </header>

  <!-- Usage Metrics -->
  <div class="flex items-baseline justify-between mt-1 text-xs">
    <div class="flex items-baseline gap-1.5">
      <span class="text-2xl font-bold font-mono text-foreground">{currentUsage}</span>
      <span class="text-xs text-muted-foreground">/ {hardLimit} {unit} ({usagePercent}%)</span>
    </div>
    <span class="text-xs font-mono text-muted-foreground">日均增长 +{growthRateDaily}%</span>
  </div>

  <!-- Progress Bar -->
  <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
    <div
      class="h-full rounded-full transition-all duration-300 {usagePercent >= 90 ? 'bg-destructive' : usagePercent >= 75 ? 'bg-warning' : 'bg-primary'}"
      style="width: {usagePercent}%;"
    ></div>
  </div>

  <!-- Sparkline Trend Chart (SVG) -->
  <div class="h-16 w-full rounded-lg bg-muted/20 border border-border p-2 flex items-end justify-between relative overflow-hidden">
    <svg class="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
      <!-- Reference 100% Limit Line -->
      <line x1="0" y1="4" x2="100" y2="4" stroke="currentColor" stroke-dasharray="2,2" class="text-destructive/40" stroke-width="1" />

      <!-- Trend Polyline -->
      <polyline
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="text-primary"
        points="0,32 15,30 30,27 45,23 60,18 75,12 85,8"
      />
      <!-- Predicted Trajectory Dashed -->
      <polyline
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-dasharray="2,2"
        class="text-destructive"
        points="85,8 95,5 100,4"
      />
    </svg>
  </div>

  <!-- Footer Action -->
  <footer class="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
    <span class="text-muted-foreground text-[11px]">基于近期 {historicalPoints.length} 个观测周期加权移动平均拟合推算</span>
    {#if onrequestupgrade}
      <button
        type="button"
        class="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
        onclick={() => onrequestupgrade?.()}
      >
        <span>申请临时扩容</span>
        <ArrowUpRight class="h-3.5 w-3.5" />
      </button>
    {/if}
  </footer>
</div>
