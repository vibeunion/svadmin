<script lang="ts">
  interface QuotaItem {
    id: string;
    resourceName: string;
    used: number;
    limit: number;
    unit: string;
    status?: 'normal' | 'warning' | 'exhausted';
  }

  interface Props {
    tenantName?: string;
    tierName?: string;
    quotas?: QuotaItem[];
    class?: string;
  }

  let {
    tenantName = '上海创智多租户研发中心',
    tierName = '旗舰尊享版 (Enterprise Tier)',
    quotas = [
      { id: 'q1', resourceName: 'API 请求吞吐', used: 840000, limit: 1000000, unit: 'req/天', status: 'normal' },
      { id: 'q2', resourceName: '分布式对象存储', used: 480, limit: 500, unit: 'GB', status: 'warning' },
      { id: 'q3', resourceName: '组织席位数', used: 120, limit: 120, unit: '席位', status: 'exhausted' },
      { id: 'q4', resourceName: 'AI 智能算力点', used: 3200, limit: 10000, unit: '点', status: 'normal' }
    ],
    class: className = '',
  }: Props = $props();

  function calcPct(u: number, l: number): number {
    if (l <= 0) return 0;
    return Math.min(100, Math.round((u / l) * 100));
  }
</script>

<div
  class="lite-tenant-quotas {className}"
  data-svadmin-component="LiteTenantQuotasMatrix"
  role="region"
  aria-label="Tenant Quotas Matrix"
>
  <header class="lite-quotas-header">
    <div>
      <h4 class="lite-quotas-tenant">{tenantName}</h4>
      <span class="lite-quotas-tier">{tierName}</span>
    </div>
  </header>

  <div class="lite-quotas-grid">
    {#each quotas as q (q.id)}
      {@const pct = calcPct(q.used, q.limit)}
      <div class="lite-quota-card">
        <div class="lite-card-top">
          <span class="lite-card-name">{q.resourceName}</span>
          <span class="lite-card-usage">{q.used.toLocaleString()} / {q.limit.toLocaleString()} {q.unit}</span>
        </div>
        <div class="lite-card-track">
          <div
            class="lite-card-bar"
            class:lite-bar-warn={pct >= 85 && pct < 100}
            class:lite-bar-danger={pct >= 100}
            style="width: {pct}%;"
          ></div>
        </div>
        <div class="lite-card-bottom">
          <span class="lite-card-pct">{pct}% 已用</span>
          {#if pct >= 100}
            <span class="lite-card-state text-danger">已达硬配额上限</span>
          {:else if pct >= 85}
            <span class="lite-card-state text-warn">接近用量预警线</span>
          {:else}
            <span class="lite-card-state text-ok">配额容量充裕</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .lite-tenant-quotas {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-quotas-header {
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-quotas-tenant { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-quotas-tier { font-size: 11px; color: #165dff; font-weight: 500; display: block; margin-top: 2px; }
  .lite-quotas-grid { padding: 12px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 640px) { .lite-quotas-grid { grid-template-columns: 1fr; } }
  .lite-quota-card {
    border: 1px solid #f2f3f5;
    border-radius: 4px;
    padding: 10px;
    background: #fafbfc;
  }
  .lite-card-top { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
  .lite-card-name { font-weight: 600; color: #1d2129; }
  .lite-card-usage { font-family: monospace; color: #4e5969; }
  .lite-card-track { height: 6px; background: #e5e6eb; border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
  .lite-card-bar { height: 100%; background: #165dff; border-radius: 3px; }
  .lite-bar-warn { background: #ff7d00; }
  .lite-bar-danger { background: #f53f3f; }
  .lite-card-bottom { display: flex; justify-content: space-between; font-size: 10px; }
  .lite-card-pct { font-family: monospace; font-weight: 600; color: #1d2129; }
  .text-danger { color: #f53f3f; font-weight: 600; }
  .text-warn { color: #ff7d00; font-weight: 600; }
  .text-ok { color: #00b42a; }
</style>
