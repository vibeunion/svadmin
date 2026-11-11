<script lang="ts">
  interface RegionItem {
    id: string;
    name: string;
    value: number;
    status?: 'normal' | 'warning' | 'critical' | 'highlight';
    subtext?: string;
  }

  interface Props {
    title?: string;
    metricLabel?: string;
    regions?: RegionItem[];
    class?: string;
  }

  let {
    title = '业务地域空间分布与负载排行',
    metricLabel = '并发连接数',
    regions = [
      { id: 'east', name: '华东大区 (上海/江浙)', value: 4820, status: 'highlight', subtext: '含5个超级算力中心' },
      { id: 'north', name: '华北大区 (京津冀)', value: 4120, status: 'normal', subtext: '主核心控制节点' },
      { id: 'south', name: '华南大区 (广深/港澳)', value: 3650, status: 'normal', subtext: '跨境核心中继集群' },
      { id: 'southwest', name: '西南大区 (成渝/云贵)', value: 3100, status: 'warning', subtext: '水冷水电高能效算力' },
      { id: 'central', name: '华中大区 (两湖/河南)', value: 2450, status: 'normal', subtext: '灾备冷备存储仓' }
    ],
    class: className = '',
  }: Props = $props();

  const maxVal = $derived(Math.max(...regions.map(r => r.value), 1));
</script>

<div
  class="lite-geo-map {className}"
  data-svadmin-component="LiteGeoScatterMap"
  role="region"
  aria-label="Geo Distribution Map"
>
  <header class="lite-geo-header">
    <div>
      <h4 class="lite-geo-title">{title}</h4>
      <span class="lite-geo-metric">指标基准: {metricLabel}</span>
    </div>
  </header>

  <div class="lite-geo-body">
    <div class="lite-geo-list">
      {#each regions as r, idx (r.id)}
        {@const pct = Math.round((r.value / maxVal) * 100)}
        <div class="lite-geo-item">
          <div class="lite-item-top">
            <div class="lite-item-left">
              <span class="lite-rank-num" class:lite-rank-top={idx === 0}>{idx + 1}</span>
              <span class="lite-region-name">{r.name}</span>
            </div>
            <span class="lite-region-val font-mono">{r.value.toLocaleString()}</span>
          </div>
          <div class="lite-track">
            <div
              class="lite-bar"
              class:lite-bar-warn={r.status === 'warning'}
              class:lite-bar-danger={r.status === 'critical'}
              style="width: {pct}%;"
            ></div>
          </div>
          {#if r.subtext}
            <div class="lite-item-sub">{r.subtext}</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .lite-geo-map {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-geo-header {
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-geo-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-geo-metric { font-size: 11px; color: #86909c; display: block; margin-top: 2px; }
  .lite-geo-body { padding: 12px 14px; }
  .lite-geo-item { margin-bottom: 12px; }
  .lite-geo-item:last-child { margin-bottom: 0; }
  .lite-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .lite-item-left { display: flex; align-items: center; }
  .lite-item-left > * + * { margin-left: 8px; }
  .lite-rank-num {
    display: inline-block;
    width: 16px;
    height: 16px;
    line-height: 16px;
    text-align: center;
    border-radius: 3px;
    background: #f2f3f5;
    color: #4e5969;
    font-size: 10px;
    font-weight: 700;
  }
  .lite-rank-top { background: #165dff; color: #ffffff; }
  .lite-region-name { font-weight: 600; color: #1d2129; font-size: 12px; }
  .lite-region-val { font-size: 12px; font-weight: 700; color: #165dff; }
  .font-mono { font-family: monospace; }
  .lite-track { height: 6px; background: #f2f3f5; border-radius: 3px; overflow: hidden; }
  .lite-bar { height: 100%; background: #165dff; border-radius: 3px; }
  .lite-bar-warn { background: #ff7d00; }
  .lite-bar-danger { background: #f53f3f; }
  .lite-item-sub { font-size: 11px; color: #86909c; margin-top: 3px; }
</style>
