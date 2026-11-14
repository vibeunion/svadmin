<script lang="ts">
  import { formatAdminNumber } from '@svadmin/core/copy-format';
  import type { Snippet } from 'svelte';

  interface TargetProgress {
    current: number;
    target: number;
    label?: string;
  }

  interface Props {
    title: string;
    value: number | string;
    prefix?: string;
    suffix?: string;
    subtitle?: string;
    trendText?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
    targetProgress?: TargetProgress;
    sparklineData?: number[];
    alertStatus?: 'normal' | 'warning' | 'danger';
    alertMessage?: string;
    class?: string;
    actions?: Snippet;
    children?: Snippet;
  }

  let {
    title,
    value,
    prefix = '',
    suffix = '',
    subtitle,
    trendText,
    trendDirection = 'neutral',
    targetProgress,
    sparklineData,
    alertStatus = 'normal',
    alertMessage,
    class: className = '',
    actions,
    children,
  }: Props = $props();

  const formattedValue = $derived(
    typeof value === 'number' ? formatAdminNumber(value, 'en-US') : String(value)
  );

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
    const width = 100;
    const height = 30;
    const padding = 2;

    return sparklineData
      .map((val, idx) => {
        const x = padding + (idx / (sparklineData.length - 1)) * (width - padding * 2);
        const y = height - padding - ((val - min) / range) * (height - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });
</script>

<div
  class="lite-kpi-card lite-kpi-card-{alertStatus} {className}"
  data-svadmin-component="LiteKpiCard"
  role="region"
  aria-label={title}
>
  <header class="lite-kpi-card-header">
    <div class="lite-kpi-card-title-group">
      <h4 class="lite-kpi-card-title">{title}</h4>
      {#if subtitle}
        <span class="lite-kpi-card-subtitle">{subtitle}</span>
      {/if}
    </div>
    {#if actions}
      <div class="lite-kpi-card-actions">{@render actions()}</div>
    {/if}
  </header>

  <div class="lite-kpi-card-body">
    <div class="lite-kpi-card-metric">
      {#if prefix}<span class="lite-kpi-card-prefix">{prefix}</span>{/if}
      <span class="lite-kpi-card-value">{formattedValue}</span>
      {#if suffix}<span class="lite-kpi-card-suffix">{suffix}</span>{/if}
    </div>

    {#if trendText}
      <div class="lite-kpi-card-trend lite-kpi-card-trend-{trendDirection}">
        {#if trendDirection === 'up'}↑{:else if trendDirection === 'down'}↓{/if}
        <span>{trendText}</span>
      </div>
    {/if}

    {#if sparklinePoints}
      <div class="lite-kpi-card-sparkline">
        <svg viewBox="0 0 100 30" class="lite-kpi-sparkline-svg" aria-hidden="true">
          <polyline points={sparklinePoints} fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
      </div>
    {/if}
  </div>

  {#if targetProgress}
    <div class="lite-kpi-card-progress">
      <div class="lite-kpi-progress-label">
        <span>{targetProgress.label ?? 'Target progress'}</span>
        <span class="lite-kpi-progress-pct">{progressPercent}%</span>
      </div>
      <div class="lite-kpi-progress-track">
        <div class="lite-kpi-progress-bar" style="width: {progressPercent}%;"></div>
      </div>
    </div>
  {/if}

  {#if alertMessage && alertStatus !== 'normal'}
    <div class="lite-kpi-card-alert lite-kpi-alert-{alertStatus}" role="alert">
      <span>{alertMessage}</span>
    </div>
  {/if}

  {#if children}
    <div class="lite-kpi-card-extra">{@render children()}</div>
  {/if}
</div>

<style>
  .lite-kpi-card {
    border: 1px solid #e5e6eb;
    border-radius: 8px;
    padding: 16px;
    background: #ffffff;
    box-sizing: border-box;
  }
  .lite-kpi-card-warning { border-color: #ffc766; background: #fffdf5; }
  .lite-kpi-card-danger { border-color: #ffd8d2; background: #fff7f6; }
  .lite-kpi-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .lite-kpi-card-title { margin: 0; font-size: 13px; font-weight: 600; color: #4e5969; }
  .lite-kpi-card-subtitle { font-size: 11px; color: #86909c; display: block; margin-top: 2px; }
  .lite-kpi-card-body { display: flex; align-items: baseline; flex-wrap: wrap; margin-bottom: 8px; }
  .lite-kpi-card-body > * + * { margin-left: 8px; }
  .lite-kpi-card-metric { font-family: monospace; font-size: 24px; font-weight: 700; color: #1d2129; }
  .lite-kpi-card-prefix, .lite-kpi-card-suffix { font-size: 13px; font-weight: 400; color: #86909c; margin: 0 2px; }
  .lite-kpi-card-trend { font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; }
  .lite-kpi-card-trend > * + * { margin-left: 2px; }
  .lite-kpi-card-trend-up { color: #00b42a; background: #e8ffea; }
  .lite-kpi-card-trend-down { color: #f53f3f; background: #ffece8; }
  .lite-kpi-card-trend-neutral { color: #4e5969; background: #f2f3f5; }
  .lite-kpi-card-sparkline { margin-left: auto; width: 80px; height: 24px; color: #165dff; }
  .lite-kpi-sparkline-svg { width: 100%; height: 100%; display: block; }
  .lite-kpi-card-progress { margin-top: 8px; }
  .lite-kpi-progress-label { display: flex; justify-content: space-between; font-size: 11px; color: #86909c; margin-bottom: 4px; }
  .lite-kpi-progress-track { height: 4px; background: #f2f3f5; border-radius: 2px; overflow: hidden; }
  .lite-kpi-progress-bar { height: 100%; background: #165dff; border-radius: 2px; }
  .lite-kpi-card-alert { margin-top: 10px; padding: 6px 10px; border-radius: 4px; font-size: 12px; }
  .lite-kpi-alert-warning { background: #fff7e8; color: #d46b08; border: 1px solid #ffd591; }
  .lite-kpi-alert-danger { background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e; }
  .lite-kpi-card-extra { margin-top: 10px; border-top: 1px solid #f2f3f5; padding-top: 8px; }
</style>
