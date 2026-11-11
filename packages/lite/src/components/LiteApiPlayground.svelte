<script lang="ts">
  interface Props {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url?: string;
    curl?: string;
    responseStatus?: number;
    class?: string;
  }

  let {
    method = 'GET',
    url = '/api/v1/orders',
    curl = 'curl -X GET "/api/v1/orders"',
    responseStatus = 200,
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-api-playground {className}"
  data-svadmin-component="LiteApiPlayground"
  role="region"
  aria-label="API Playground"
>
  <header class="lite-api-header">
    <span class="lite-api-title">API 调试工作台 (SSR 静态探针)</span>
    <span class="lite-api-method lite-method-{method.toLowerCase()}">{method}</span>
  </header>

  <div class="lite-api-body">
    <div class="lite-api-request-bar">
      <span class="lite-api-method-badge">{method}</span>
      <code class="lite-api-url">{url}</code>
    </div>

    <div class="lite-api-curl-box">
      <span class="lite-curl-label">终端 cURL 命令:</span>
      <pre class="lite-curl-code"><code>{curl}</code></pre>
    </div>

    {#if responseStatus}
      <div class="lite-api-res-badge">
        <span>预估状态: HTTP {responseStatus} OK</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .lite-api-playground {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-api-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-api-title { font-weight: 600; color: #1d2129; }
  .lite-api-method { font-size: 11px; font-family: monospace; font-weight: 700; }
  .lite-method-get { color: #165dff; }
  .lite-method-post { color: #00b42a; }
  .lite-api-body { padding: 12px; }
  .lite-api-request-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: #f7f8fa;
    border: 1px solid #e5e6eb;
    border-radius: 4px;
    font-family: monospace;
  }
  .lite-api-method-badge { font-weight: 700; color: #165dff; }
  .lite-api-url { color: #1d2129; word-break: break-all; }
  .lite-api-curl-box { margin-top: 10px; }
  .lite-curl-label { color: #86909c; font-size: 11px; }
  .lite-curl-code {
    margin: 4px 0 0;
    padding: 8px;
    background: #f7f8fa;
    border: 1px solid #e5e6eb;
    border-radius: 4px;
    font-family: monospace;
    font-size: 11px;
    color: #1d2129;
    white-space: pre-wrap;
  }
  .lite-api-res-badge {
    margin-top: 10px;
    padding: 4px 8px;
    border-radius: 4px;
    background: #e8ffea;
    color: #00b42a;
    font-family: monospace;
    font-weight: 600;
  }
</style>
