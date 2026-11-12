<script lang="ts">
  interface Props {
    resourceName?: string;
    currentUsage?: number;
    hardLimit?: number;
    unit?: string;
    estimatedDaysRemaining?: number;
    class?: string;
  }

  let {
    resourceName = 'PostgreSQL 云数据库存储空间',
    currentUsage = 920,
    hardLimit = 1000,
    unit = 'GB',
    estimatedDaysRemaining = 14,
    class: className = '',
  }: Props = $props();

  const pct = $derived(hardLimit > 0 ? Math.min(100, Math.round((currentUsage / hardLimit) * 100)) : 0);
</script>

<div
  class="lite-capacity-card {className}"
  data-svadmin-component="LiteSystemCapacityForecastCard"
  role="region"
  aria-label="System Capacity Forecast"
>
  <header class="lite-cap-header">
    <div>
      <span class="lite-cap-label">容量趋势预测</span>
      <h4 class="lite-cap-name">{resourceName}</h4>
    </div>
    <span class="lite-cap-countdown">预计 {estimatedDaysRemaining} 天后达上限</span>
  </header>

  <div class="lite-cap-body">
    <div class="lite-cap-metrics">
      <span class="lite-cap-val font-mono">{currentUsage}</span>
      <span class="lite-cap-max">/ {hardLimit} {unit} ({pct}%)</span>
    </div>
    <div class="lite-cap-track">
      <div
        class="lite-cap-bar"
        class:lite-bar-warn={pct >= 75 && pct < 90}
        class:lite-bar-danger={pct >= 90}
        style="width: {pct}%;"
      ></div>
    </div>
  </div>
</div>

<style>
  .lite-capacity-card {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-cap-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-cap-label { font-size: 10px; color: #86909c; }
  .lite-cap-name { margin: 2px 0 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-cap-countdown {
    font-size: 10px;
    font-weight: 600;
    color: #f53f3f;
    background: #ffece8;
    padding: 2px 6px;
    border-radius: 3px;
  }
  .lite-cap-body { padding: 12px 14px; }
  .lite-cap-metrics { margin-bottom: 6px; font-size: 12px; }
  .lite-cap-val { font-size: 18px; font-weight: 700; color: #1d2129; }
  .font-mono { font-family: monospace; }
  .lite-cap-max { color: #86909c; margin-left: 4px; }
  .lite-cap-track { height: 6px; background: #f2f3f5; border-radius: 3px; overflow: hidden; }
  .lite-cap-bar { height: 100%; background: #165dff; border-radius: 3px; }
  .lite-bar-warn { background: #ff7d00; }
  .lite-bar-danger { background: #f53f3f; }
</style>
