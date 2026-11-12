<script lang="ts">
  export interface DashboardGridItem {
    id: string;
    title: string;
    w: number;
    h: number;
    widgetType?: string;
    metricValue?: string | number;
  }

  interface Props {
    title?: string;
    items?: DashboardGridItem[];
    class?: string;
  }

  let {
    title = '智能动态业务大屏 (SSR 静态栅格)',
    items = [
      { id: 'w1', title: '核心营收 (GMV)', w: 4, h: 2, widgetType: 'kpi', metricValue: '¥48.2M' },
      { id: 'w2', title: '活跃企业租户', w: 4, h: 2, widgetType: 'kpi', metricValue: '1,420 家' },
      { id: 'w3', title: '网关 SLA', w: 4, h: 2, widgetType: 'kpi', metricValue: '99.98%' },
    ],
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-dashboard-grid {className}"
  data-svadmin-component="LiteDashboardGridLayout"
  role="region"
  aria-label="Dashboard Grid Layout"
>
  <header class="lite-dash-header">
    <div class="lite-dash-title-row">
      <span class="lite-dash-icon">📊</span>
      <h4 class="lite-dash-title">{title}</h4>
    </div>
    <span class="lite-dash-count">共 {items.length} 个小部件 (静态排版)</span>
  </header>

  <div class="lite-dash-grid-body">
    {#each items as item (item.id)}
      <div class="lite-dash-widget" style="width: calc({item.w} / 12 * 100% - 10px);">
        <div class="lite-widget-header">
          <span class="lite-widget-title">{item.title}</span>
          <span class="lite-widget-span">{item.w}x{item.h} 栅格</span>
        </div>
        {#if item.metricValue}
          <div class="lite-widget-val font-mono">{item.metricValue}</div>
        {:else}
          <div class="lite-widget-placeholder">小部件数据预览 (SSR 静态占位)</div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .lite-dashboard-grid {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-dash-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-dash-title-row { display: flex; align-items: center; }
  .lite-dash-title-row > * + * { margin-left: 6px; }
  .lite-dash-icon { font-size: 14px; }
  .lite-dash-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-dash-count { font-size: 11px; color: #86909c; }
  .lite-dash-grid-body { padding: 12px; overflow: hidden; }
  .lite-dash-widget {
    float: left;
    box-sizing: border-box;
    margin: 0 10px 10px 0;
    border: 1px solid #f2f3f5;
    border-radius: 4px;
    background: #fafafa;
    padding: 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .lite-widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .lite-widget-title { font-weight: 600; color: #1d2129; font-size: 11px; }
  .lite-widget-span { font-size: 9px; color: #86909c; background: #ffffff; padding: 1px 4px; border: 1px solid #e5e6eb; border-radius: 2px; }
  .lite-widget-val { font-size: 18px; font-weight: 700; color: #165dff; }
  .font-mono { font-family: monospace; }
  .lite-widget-placeholder { font-size: 11px; color: #86909c; }
</style>
