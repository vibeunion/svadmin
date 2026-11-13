<script lang="ts">
  export interface ChartAnnotationItem {
    id: string;
    label: string;
    type?: string;
    timestamp?: string;
    valueLabel?: string;
    colorTone?: string;
  }

  interface Props {
    title?: string;
    annotations?: ChartAnnotationItem[];
    class?: string;
  }

  let {
    title = '业务大事件与异常指标标记层 (SSR 静态列表)',
    annotations = [
      { id: 'a1', label: 'v2.4.0 核心版本全量发布', type: 'release', timestamp: '2026-11-10 14:00', valueLabel: 'QPS +35%', colorTone: 'primary' },
      { id: 'a2', label: '华东大区机房瞬态抖动', type: 'incident', timestamp: '2026-11-11 03:15', valueLabel: '延迟 120ms', colorTone: 'destructive' },
      { id: 'a3', label: '双十一运营大促高峰开幕', type: 'event', timestamp: '2026-11-11 20:00', valueLabel: '成交 ¥18M', colorTone: 'warning' },
    ],
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-chart-annotation {className}"
  data-svadmin-component="LiteChartAnnotationOverlay"
  role="region"
  aria-label="Chart Annotation Overlay"
>
  <header class="lite-ann-header">
    <div class="lite-ann-title-row">
      <span class="lite-ann-icon">🏷️</span>
      <h4 class="lite-ann-title">{title}</h4>
    </div>
    <span class="lite-ann-count">共 {annotations.length} 个事件标记</span>
  </header>

  <div class="lite-ann-body">
    <div class="lite-ann-timeline">
      {#each annotations as ann (ann.id)}
        <div class="lite-ann-item">
          <div class="lite-ann-dot" class:lite-dot-warn={ann.colorTone === 'warning'} class:lite-dot-danger={ann.colorTone === 'destructive'}></div>
          <div class="lite-ann-content">
            <div class="lite-ann-main-row">
              <span class="lite-ann-label">{ann.label}</span>
              {#if ann.valueLabel}<span class="lite-ann-val font-mono">[{ann.valueLabel}]</span>{/if}
            </div>
            {#if ann.timestamp}<span class="lite-ann-time font-mono">{ann.timestamp}</span>{/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .lite-chart-annotation {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-ann-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-ann-title-row { display: flex; align-items: center; }
  .lite-ann-icon { font-size: 14px; margin-right: 6px; }
  .lite-ann-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-ann-count { font-size: 11px; color: #86909c; }
  .lite-ann-body { padding: 12px 14px; }
  .lite-ann-timeline { display: flex; flex-direction: column; }
  .lite-ann-item { display: flex; align-items: flex-start; margin-bottom: 8px; }
  .lite-ann-item:last-child { margin-bottom: 0; }
  .lite-ann-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #165dff;
    margin-top: 4px;
    margin-right: 8px;
    flex-shrink: 0;
  }
  .lite-dot-warn { background: #ff7d00; }
  .lite-dot-danger { background: #f53f3f; }
  .lite-ann-content { flex: 1; display: flex; flex-direction: column; }
  .lite-ann-main-row { display: flex; align-items: center; }
  .lite-ann-label { font-weight: 500; color: #1d2129; margin-right: 6px; }
  .lite-ann-val { font-size: 10px; color: #165dff; font-weight: 600; }
  .font-mono { font-family: monospace; }
  .lite-ann-time { font-size: 10px; color: #86909c; }
</style>
