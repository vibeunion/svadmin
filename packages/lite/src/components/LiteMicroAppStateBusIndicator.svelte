<script lang="ts">
  interface Props {
    channel?: string;
    class?: string;
  }

  let {
    channel = 'svadmin_microapp_global_bus',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-statebus-box {className}"
  data-svadmin-component="LiteMicroAppStateBusIndicator"
  role="region"
  aria-label="MicroApp State Bus"
>
  <header class="lite-bus-header">
    <div class="lite-bus-title-row">
      <span class="lite-bus-icon">📡</span>
      <h4 class="lite-bus-title">跨应用响应式状态总线 (SSR 静态说明)</h4>
    </div>
    <span class="lite-bus-channel font-mono">[{channel}]</span>
  </header>

  <div class="lite-bus-body">
    <div class="lite-bus-row">
      <span class="lite-bus-label">总线状态:</span>
      <span class="lite-bus-val">SSR 就绪 (客户端通过 BroadcastChannel 双向流转)</span>
    </div>
    <div class="lite-bus-row">
      <span class="lite-bus-label">广播策略:</span>
      <span class="lite-bus-val">租户切换、Token 刷新与全局主题联动广播</span>
    </div>
  </div>
</div>

<style>
  .lite-statebus-box {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-bus-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-bus-title-row { display: flex; align-items: center; }
  .lite-bus-icon { font-size: 14px; margin-right: 6px; }
  .lite-bus-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-bus-channel { font-size: 10px; color: #165dff; }
  .font-mono { font-family: monospace; font-size: 11px; }
  .lite-bus-body { padding: 12px 14px; }
  .lite-bus-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px dashed #f2f3f5;
  }
  .lite-bus-row:last-child { border-bottom: none; }
  .lite-bus-label { color: #86909c; }
  .lite-bus-val { font-weight: 500; color: #1d2129; }
</style>
