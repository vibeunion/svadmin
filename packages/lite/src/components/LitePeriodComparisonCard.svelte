<script lang="ts">
  interface Props {
    title?: string;
    currentValue?: string | number;
    priorValue?: string | number;
    deltaPercentage?: number;
    periodLabel?: string;
    class?: string;
  }

  let {
    title = '月度营收环比对比',
    currentValue = '¥ 1,280,000',
    priorValue = '¥ 1,120,000',
    deltaPercentage = 14.28,
    periodLabel = '较上月 (2026-10)',
    class: className = '',
  }: Props = $props();

  const isUp = $derived(deltaPercentage >= 0);
</script>

<div
  class="lite-period-card {className}"
  data-svadmin-component="LitePeriodComparisonCard"
  role="region"
  aria-label="Period Comparison Card"
>
  <div class="lite-period-header">
    <span class="lite-period-title">{title}</span>
    <span class="lite-period-badge" class:lite-badge-up={isUp} class:lite-badge-down={!isUp}>
      {isUp ? '↑ +' : '↓ '}{deltaPercentage}%
    </span>
  </div>

  <div class="lite-period-body">
    <div class="lite-val-current">{currentValue}</div>
    <div class="lite-val-prior">
      基期数值: <span class="font-mono">{priorValue}</span> ({periodLabel})
    </div>
  </div>
</div>

<style>
  .lite-period-card {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    padding: 12px 14px;
    font-size: 12px;
  }
  .lite-period-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .lite-period-title { font-weight: 500; color: #4e5969; font-size: 11px; }
  .lite-period-badge { font-size: 11px; font-weight: 700; font-family: monospace; padding: 2px 6px; border-radius: 3px; }
  .lite-badge-up { color: #00b42a; background: #e8ffea; }
  .lite-badge-down { color: #f53f3f; background: #ffece8; }
  .lite-val-current { font-size: 20px; font-weight: 700; color: #1d2129; margin-bottom: 4px; }
  .lite-val-prior { font-size: 11px; color: #86909c; }
  .font-mono { font-family: monospace; color: #4e5969; }
</style>
