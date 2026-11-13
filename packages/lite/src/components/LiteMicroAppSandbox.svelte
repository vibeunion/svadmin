<script lang="ts">
  interface Props {
    src?: string;
    appName?: string;
    appId?: string;
    class?: string;
  }

  let {
    src = 'https://sub-bi.example.internal/embed',
    appName = '企业商业智能 (BI) 报表子应用',
    appId = 'app-bi-micro-01',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-microapp-sandbox {className}"
  data-svadmin-component="LiteMicroAppSandbox"
  role="region"
  aria-label="MicroApp Isolated Sandbox"
>
  <header class="lite-sandbox-header">
    <div class="lite-sandbox-title-row">
      <span class="lite-sandbox-icon">📦</span>
      <h4 class="lite-sandbox-title">{appName}</h4>
      <span class="lite-sandbox-id font-mono">({appId})</span>
    </div>
    <span class="lite-sandbox-status">[SSR 静态沙箱预览]</span>
  </header>

  <div class="lite-sandbox-body">
    <div class="lite-sandbox-placeholder">
      <p class="lite-placeholder-text">子应用受限环境沙箱已就绪。在无 JavaScript 环境中展示静态预留位，客户端加载后通过 Shadow DOM / iframe 挂载真实子应用。</p>
      <div class="lite-sandbox-meta">
        <span>安全沙箱源: <span class="font-mono">{src}</span></span>
      </div>
    </div>
  </div>
</div>

<style>
  .lite-microapp-sandbox {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-sandbox-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-sandbox-title-row { display: flex; align-items: center; }
  .lite-sandbox-icon { font-size: 14px; margin-right: 6px; }
  .lite-sandbox-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; margin-right: 6px; }
  .lite-sandbox-id { font-size: 10px; color: #86909c; }
  .font-mono { font-family: monospace; font-size: 11px; }
  .lite-sandbox-status { font-size: 11px; color: #165dff; font-weight: 500; }
  .lite-sandbox-body { padding: 16px 14px; }
  .lite-sandbox-placeholder {
    border: 1px dashed #c9cdd4;
    background: #fafafa;
    border-radius: 4px;
    padding: 16px;
    text-align: center;
  }
  .lite-placeholder-text { margin: 0 0 10px 0; color: #4e5969; font-size: 12px; line-height: 1.5; }
  .lite-sandbox-meta { font-size: 11px; color: #86909c; }
</style>
