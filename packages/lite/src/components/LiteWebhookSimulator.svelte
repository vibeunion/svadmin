<script lang="ts">
  interface Props {
    endpoint?: string;
    eventType?: string;
    payload?: string | Record<string, unknown>;
    statusCode?: number;
    durationMs?: number;
    class?: string;
  }

  let {
    endpoint = 'https://api.example.com/webhooks',
    eventType = 'order.payment_succeeded',
    payload = { event: 'order.payment_succeeded', amount: 99.5 },
    statusCode = 200,
    durationMs = 85,
    class: className = '',
  }: Props = $props();

  const formattedPayload = $derived.by(() => {
    if (typeof payload === 'string') return payload;
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  });
</script>

<div
  class="lite-webhook-simulator {className}"
  data-svadmin-component="LiteWebhookSimulator"
  role="region"
  aria-label="Webhook Simulator"
>
  <header class="lite-webhook-header">
    <span class="lite-webhook-title">Webhook 投递模拟器 (SSR)</span>
    <span class="lite-webhook-badge">模拟沙箱</span>
  </header>

  <div class="lite-webhook-body">
    <div class="lite-webhook-field">
      <span class="lite-field-label">事件类型:</span>
      <code class="lite-field-val">{eventType}</code>
    </div>
    <div class="lite-webhook-field">
      <span class="lite-field-label">接收端点:</span>
      <code class="lite-field-val">{endpoint}</code>
    </div>

    <div class="lite-webhook-payload">
      <span class="lite-field-label">请求载荷 (JSON):</span>
      <pre class="lite-payload-code"><code>{formattedPayload}</code></pre>
    </div>

    {#if statusCode}
      <div class="lite-webhook-result" class:lite-res-ok={statusCode >= 200 && statusCode < 300}>
        <span>HTTP {statusCode} {statusCode === 200 ? 'OK' : ''}</span>
        {#if durationMs}
          <span class="lite-res-time">{durationMs}ms</span>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .lite-webhook-simulator {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-webhook-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-webhook-title { font-weight: 600; color: #1d2129; }
  .lite-webhook-badge { font-size: 10px; background: #e8f3ff; color: #165dff; padding: 1px 6px; border-radius: 3px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .lite-webhook-body { padding: 12px; }
  .lite-webhook-field { display: flex; align-items: baseline; margin-bottom: 6px; font-family: monospace; }
  .lite-webhook-field > * + * { margin-left: 8px; }
  .lite-field-label { color: #86909c; min-width: 70px; }
  .lite-field-val { color: #1d2129; word-break: break-all; }
  .lite-webhook-payload { margin-top: 8px; }
  .lite-payload-code {
    margin: 4px 0 0;
    padding: 8px;
    background: #f7f8fa;
    border: 1px solid #e5e6eb;
    border-radius: 4px;
    font-family: monospace;
    font-size: 11px;
    color: #1d2129;
    white-space: pre-wrap;
    max-height: 160px;
    overflow: auto;
  }
  .lite-webhook-result {
    margin-top: 10px;
    padding: 6px 10px;
    border-radius: 4px;
    font-family: monospace;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    background: #ffece8;
    color: #f53f3f;
  }
  .lite-webhook-result.lite-res-ok {
    background: #e8ffea;
    color: #00b42a;
  }
  .lite-res-time { font-weight: normal; opacity: 0.8; }
</style>
