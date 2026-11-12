<script lang="ts">
  interface Props {
    title?: string;
    subAppRoute?: string;
    hostUrl?: string;
    class?: string;
  }

  let {
    title = '微前端路由双向同步协调器 (SSR 静态映射)',
    subAppRoute = '/reports/quarterly-gmv/details',
    hostUrl = 'https://admin.example.com/portal/bi-workspace?subAppRoute=%2Freports%2Fquarterly-gmv',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-routesync-box {className}"
  data-svadmin-component="LiteMicroAppRouteSync"
  role="region"
  aria-label="MicroApp Route Sync"
>
  <header class="lite-sync-header">
    <div class="lite-sync-title-row">
      <span class="lite-sync-icon">🧭</span>
      <h4 class="lite-sync-title">{title}</h4>
    </div>
  </header>

  <div class="lite-sync-body">
    <div class="lite-sync-row">
      <span class="lite-sync-label">子应用内部路径:</span>
      <span class="lite-sync-val font-mono">{subAppRoute}</span>
    </div>
    <div class="lite-sync-row">
      <span class="lite-sync-label">宿主映射地址:</span>
      <span class="lite-sync-val font-mono text-muted">{hostUrl}</span>
    </div>
  </div>
</div>

<style>
  .lite-routesync-box {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-sync-header {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-sync-title-row { display: flex; align-items: center; }
  .lite-sync-icon { font-size: 14px; margin-right: 6px; }
  .lite-sync-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-sync-body { padding: 12px 14px; }
  .lite-sync-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px dashed #f2f3f5;
  }
  .lite-sync-row:last-child { border-bottom: none; }
  .lite-sync-label { color: #86909c; }
  .lite-sync-val { font-weight: 500; color: #1d2129; }
  .font-mono { font-family: monospace; font-size: 11px; }
  .text-muted { color: #86909c; }
</style>
