<script lang="ts">
  interface Quota {
    label: string;
    current: number;
    limit: number;
    unit?: string;
  }

  interface Props {
    planName?: string;
    quotas?: Quota[];
    resetDateText?: string;
    class?: string;
  }

  let {
    planName = 'Enterprise Scale',
    quotas = [
      { label: 'API Requests', current: 75000, limit: 100000, unit: 'req' },
      { label: 'Storage', current: 18, limit: 20, unit: 'GB' },
    ],
    resetDateText = '2026-12-01',
    class: className = '',
  }: Props = $props();

  function calcPct(current: number, limit: number): number {
    if (limit <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((current / limit) * 100)));
  }
</script>

<div
  class="lite-plan-quota {className}"
  data-svadmin-component="LitePlanUsageQuotaBar"
  role="region"
  aria-label="Plan Usage Quotas"
>
  <header class="lite-quota-header">
    <div>
      <h4 class="lite-quota-title">{planName}</h4>
      {#if resetDateText}
        <span class="lite-quota-reset">重置周期: {resetDateText}</span>
      {/if}
    </div>
  </header>

  <div class="lite-quota-body">
    {#each quotas as q (q.label)}
      {@const pct = calcPct(q.current, q.limit)}
      <div class="lite-quota-item">
        <div class="lite-quota-labels">
          <span class="lite-quota-name">{q.label}</span>
          <span class="lite-quota-values">{q.current} / {q.limit} {q.unit ?? ''} ({pct}%)</span>
        </div>
        <div class="lite-quota-track">
          <div
            class="lite-quota-bar"
            class:lite-bar-warn={pct >= 80 && pct < 95}
            class:lite-bar-danger={pct >= 95}
            style="width: {pct}%;"
          ></div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .lite-plan-quota {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-quota-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-quota-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-quota-reset { font-size: 11px; color: #86909c; font-family: monospace; display: block; margin-top: 2px; }
  .lite-quota-body { padding: 12px 14px; }
  .lite-quota-item { margin-bottom: 10px; }
  .lite-quota-item:last-child { margin-bottom: 0; }
  .lite-quota-labels { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; font-family: monospace; }
  .lite-quota-name { font-weight: 500; color: #4e5969; font-family: sans-serif; }
  .lite-quota-values { color: #1d2129; font-weight: 600; }
  .lite-quota-track { height: 6px; background: #f2f3f5; border-radius: 3px; overflow: hidden; }
  .lite-quota-bar { height: 100%; background: #165dff; border-radius: 3px; }
  .lite-bar-warn { background: #ff7d00; }
  .lite-bar-danger { background: #f53f3f; }
</style>
