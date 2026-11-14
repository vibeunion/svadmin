<script lang="ts">
  import type { Snippet } from 'svelte';
  import { AlertTriangle, AlertCircle } from '@lucide/svelte';
  import TrendIndicator from './TrendIndicator.svelte';
  import { formatAdminNumber } from '@svadmin/core';
  import { cn } from '../utils.js';

  export interface KpiCardProps {
    /** KPI 标题 / 指标名称，如 "季度总营收"、"API 响应成功率" */
    title: string;
    /** 主指标数值，如 1284500 或 "99.98%" */
    value: number | string;
    /** 数值前缀，如 "¥"、"$" */
    prefix?: string | undefined;
    /** 数值后缀，如 "元"、"次"、"ms" */
    suffix?: string | undefined;
    /** 辅助副标题或时间跨度，如 "近 30 天"、"统计周期: Q3" */
    subtitle?: string | undefined;
    /** 上一期数值，若提供则自动使用 TrendIndicator 计算并展示同环比 */
    prevValue?: number | undefined;
    /** 同环比前缀，如 "YoY" 或 "环比" */
    trendPrefix?: string | undefined;
    /** 是否反转同环比色彩极性（如报错率降低为优） */
    reverseTrendColor?: boolean | undefined;
    /** 目标达成率：当前达成数值与目标数值，如 { current: 85, target: 100 } */
    targetProgress?: { current: number; target: number; label?: string } | undefined;
    /** 走势微图数据点（如近 7 天或 12 个月的数值数组，自动渲染纯 SVG 平滑 Sparkline） */
    sparklineData?: number[] | undefined;
    /** 走势微图色调：'primary' | 'success' | 'warning' | 'destructive' */
    sparklineTone?: 'primary' | 'success' | 'warning' | 'destructive' | undefined;
    /** 加载中状态（骨架屏态） */
    loading?: boolean | undefined;
    /** 预警状态：'normal' | 'warning' | 'danger' */
    alertStatus?: 'normal' | 'warning' | 'danger' | undefined;
    /** 异常预警提示信息 */
    alertMessage?: string | undefined;
    /** 徽标标签文本 */
    badge?: string | undefined;
    /** 自定义卡片右上角操作区或底部插槽 */
    extra?: Snippet | undefined;
    children?: Snippet | undefined;
    class?: string | undefined;
  }

  let {
    title,
    value,
    prefix = '',
    suffix = '',
    subtitle,
    prevValue,
    trendPrefix = '环比',
    reverseTrendColor = false,
    targetProgress,
    sparklineData,
    sparklineTone = 'primary',
    loading = false,
    alertStatus = 'normal',
    alertMessage,
    badge,
    extra,
    children,
    class: className = '',
  }: KpiCardProps = $props();

  const formattedValue = $derived.by(() => {
    if (typeof value === 'number') {
      return formatAdminNumber(value, 'en-US');
    }
    return String(value);
  });

  const progressPercent = $derived.by(() => {
    if (!targetProgress || targetProgress.target <= 0) return 0;
    const pct = (targetProgress.current / targetProgress.target) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  });

  const sparklinePoints = $derived.by(() => {
    if (!sparklineData || sparklineData.length < 2) return '';
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 120;
    const height = 36;
    const padding = 2;

    const points = sparklineData.map((val, idx) => {
      const x = padding + (idx / (sparklineData.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return points.join(' ');
  });

  const sparklineStroke = $derived.by(() => {
    switch (sparklineTone) {
      case 'success':
        return 'var(--success)';
      case 'warning':
        return 'var(--warning)';
      case 'destructive':
        return 'var(--destructive)';
      case 'primary':
      default:
        return 'var(--primary)';
    }
  });

  const alertClasses = $derived.by(() => {
    if (alertStatus === 'danger') {
      return 'border-destructive/40 bg-destructive/5 ring-1 ring-destructive/20';
    }
    if (alertStatus === 'warning') {
      return 'border-warning/40 bg-warning/5 ring-1 ring-warning/20';
    }
    return 'border-border bg-card';
  });
</script>

<div
  data-svadmin-component="KpiCard"
  class={cn(
    'relative flex flex-col justify-between rounded-md border p-5 shadow-xs transition-all hover:shadow-sm',
    alertClasses,
    className
  )}
>
  {#if loading}
    <!-- Loading skeleton state -->
    <div class="space-y-4 animate-pulse">
      <div class="flex items-center justify-between">
        <div class="h-4 w-28 bg-muted rounded-md"></div>
        <div class="h-4 w-12 bg-muted rounded-md"></div>
      </div>
      <div class="h-8 w-44 bg-muted rounded-md"></div>
      <div class="h-3 w-32 bg-muted rounded-md"></div>
    </div>
  {:else}
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-muted-foreground tracking-wide">{title}</span>
          {#if badge}
            <span class="rounded-sm bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
              {badge}
            </span>
          {/if}
        </div>
        {#if subtitle}
          <p class="text-xs text-muted-foreground">{subtitle}</p>
        {/if}
      </div>

      {#if extra}
        <div class="shrink-0 text-xs">
          {@render extra()}
        </div>
      {/if}
    </div>

    <!-- Main Metric Value & Trend / Sparkline -->
    <div class="my-3 flex items-baseline justify-between gap-4">
      <div class="flex items-baseline gap-1 font-mono tracking-tight">
        {#if prefix}
          <span class="text-base font-semibold text-muted-foreground">{prefix}</span>
        {/if}
        <span class="text-3xl font-bold text-foreground">{formattedValue}</span>
        {#if suffix}
          <span class="text-xs font-medium text-muted-foreground">{suffix}</span>
        {/if}
      </div>

      <!-- Sparkline Mini Chart -->
      {#if sparklinePoints}
        <div class="shrink-0 flex items-center" title="历史走势">
          <svg class="h-9 w-28 overflow-visible" viewBox="0 0 120 36">
            <polyline
              fill="none"
              stroke={sparklineStroke}
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              points={sparklinePoints}
            />
          </svg>
        </div>
      {/if}
    </div>

    <!-- Trend, Progress & Alerts -->
    <div class="space-y-2.5 pt-1">
      {#if typeof prevValue === 'number' && typeof value === 'number'}
        <div class="flex items-center gap-2 text-xs">
          <TrendIndicator
            {value}
            {prevValue}
            prefix={trendPrefix}
            reverseColor={reverseTrendColor}
            variant="badge"
            size="sm"
          />
          <span class="text-xs text-muted-foreground">对比上一周期</span>
        </div>
      {/if}

      <!-- Target Completion Progress Bar -->
      {#if targetProgress}
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>{targetProgress.label ?? '目标达成'}</span>
            <span class="font-semibold text-foreground">{progressPercent}%</span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style:width={`${progressPercent}%`}
            ></div>
          </div>
        </div>
      {/if}

      <!-- Alert warning banner -->
      {#if alertMessage}
        <div
          class={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs',
            alertStatus === 'danger'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-warning/10 text-warning'
          )}
        >
          {#if alertStatus === 'danger'}
            <AlertCircle class="h-3.5 w-3.5 shrink-0" />
          {:else}
            <AlertTriangle class="h-3.5 w-3.5 shrink-0" />
          {/if}
          <span class="truncate">{alertMessage}</span>
        </div>
      {/if}

      {#if children}
        <div class="pt-2 border-t border-border/50 text-xs">
          {@render children()}
        </div>
      {/if}
    </div>
  {/if}
</div>
