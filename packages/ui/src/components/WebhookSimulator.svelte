<script lang="ts">
  import { untrack } from 'svelte';
  import { Send, CheckCircle2, AlertCircle, Loader2, Code2, Globe } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface WebhookEventPreset {
    eventType: string;
    description: string;
    defaultPayload: Record<string, unknown>;
  }

  export interface WebhookDeliveryResult {
    statusCode: number;
    durationMs: number;
    responseHeaders?: Record<string, string> | undefined;
    responseBody?: string | undefined;
    error?: string | undefined;
  }

  export interface WebhookSimulatorProps {
    defaultEndpoint?: string | undefined;
    events?: WebhookEventPreset[] | undefined;
    ondeliver?: ((event: {
      eventType: string;
      endpoint: string;
      payload: string;
      headers: Record<string, string>;
    }) => Promise<WebhookDeliveryResult> | WebhookDeliveryResult) | undefined;
    class?: string | undefined;
  }

  const defaultPresets: WebhookEventPreset[] = [
    {
      eventType: 'order.payment_succeeded',
      description: '订单支付成功回调',
      defaultPayload: {
        eventId: 'evt_982138401',
        event: 'order.payment_succeeded',
        timestamp: '2026-11-11T14:30:00Z',
        data: {
          orderNo: 'ORD-2026-9921',
          amount: 8848.5,
          currency: 'CNY',
          payChannel: 'wechat_pay',
          status: 'SUCCESS',
        },
      },
    },
    {
      eventType: 'user.security_alert',
      description: '异地高危登录安全预警',
      defaultPayload: {
        eventId: 'evt_sec_00192',
        event: 'user.security_alert',
        timestamp: '2026-11-11T14:32:15Z',
        data: {
          userId: 'usr_87192',
          riskLevel: 'HIGH',
          clientIp: '198.51.100.42',
          location: 'Frankfurt, DE',
        },
      },
    },
    {
      eventType: 'invoice.issued',
      description: '电子发票开具完成',
      defaultPayload: {
        eventId: 'evt_inv_55412',
        event: 'invoice.issued',
        timestamp: '2026-11-11T14:28:00Z',
        data: {
          invoiceId: 'INV-2026-00412',
          totalTaxIncluded: 12500.0,
          downloadUrl: 'https://cdn.svadmin.local/invoices/inv-00412.pdf',
        },
      },
    },
  ];

  let {
    defaultEndpoint = 'https://api.merchant.com/webhooks/svadmin',
    events = defaultPresets,
    ondeliver,
    class: className = '',
  }: WebhookSimulatorProps = $props();

  let selectedEventType = $state(untrack(() => events[0]?.eventType ?? ''));
  let endpointUrl = $state(untrack(() => defaultEndpoint));
  let payloadText = $state(untrack(() => JSON.stringify(events[0]?.defaultPayload ?? {}, null, 2)));
  let isSending = $state(false);
  let deliveryResult = $state<WebhookDeliveryResult | null>(null);

  function handleEventChange(newType: string) {
    selectedEventType = newType;
    const target = events.find((e) => e.eventType === newType);
    if (target) {
      payloadText = JSON.stringify(target.defaultPayload, null, 2);
    }
  }

  async function sendMockWebhook() {
    if (!endpointUrl.trim() || isSending) return;
    isSending = true;
    deliveryResult = null;
    const startTime = Date.now();

    try {
      if (ondeliver) {
        const res = await ondeliver({
          eventType: selectedEventType,
          endpoint: endpointUrl.trim(),
          payload: payloadText,
          headers: {
            'Content-Type': 'application/json',
            'X-Svadmin-Event': selectedEventType,
            'X-Svadmin-Timestamp': String(Math.floor(Date.now() / 1000)),
          },
        });
        deliveryResult = res;
      } else {
        // Built-in simulated network delivery
        await new Promise((r) => setTimeout(r, 450));
        deliveryResult = {
          statusCode: 200,
          durationMs: Date.now() - startTime,
          responseHeaders: {
            'content-type': 'application/json',
            'x-request-id': 'req_mock_992819',
          },
          responseBody: JSON.stringify({ received: true, acknowledgedAt: new Date().toISOString() }, null, 2),
        };
      }
    } catch (err: unknown) {
      deliveryResult = {
        statusCode: 500,
        durationMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : '网络连接失败或目标端点超时拒绝',
      };
    } finally {
      isSending = false;
    }
  }
</script>

<div
  class={cn('rounded-md border border-border bg-card p-5 text-card-foreground shadow-xs space-y-4', className)}
  data-svadmin-component="WebhookSimulator"
>
  <!-- Header -->
  <header class="flex items-center justify-between border-b border-border pb-3">
    <div class="flex items-center gap-2">
      <Globe class="h-4 w-4 text-primary" />
      <h3 class="font-bold text-sm text-foreground">Webhook 投递模拟与回放沙箱</h3>
    </div>
    <span class="text-xs font-mono text-muted-foreground">开发者调试中心</span>
  </header>

  <!-- Config Panel -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
    <!-- Event Type Selector -->
    <div class="space-y-1">
      <label for="webhook-event-type" class="block font-medium text-foreground">
        选择事件类型 (Event Type)
      </label>
      <select
        id="webhook-event-type"
        class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground font-mono focus:ring-1 focus:ring-primary"
        value={selectedEventType}
        onchange={(e) => handleEventChange((e.currentTarget as HTMLSelectElement).value)}
      >
        {#each events as item (item.eventType)}
          <option value={item.eventType}>{item.eventType} ({item.description})</option>
        {/each}
      </select>
    </div>

    <!-- Endpoint URL -->
    <div class="space-y-1">
      <label for="webhook-endpoint" class="block font-medium text-foreground">
        目标接收端点 (Target Endpoint)
      </label>
      <input
        id="webhook-endpoint"
        type="text"
        class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground font-mono focus:ring-1 focus:ring-primary"
        bind:value={endpointUrl}
        placeholder="https://..."
      />
    </div>
  </div>

  <!-- Payload Editor -->
  <div class="space-y-1.5 text-xs">
    <div class="flex justify-between items-center text-muted-foreground">
      <span class="font-medium text-foreground flex items-center gap-1">
        <Code2 class="h-3.5 w-3.5 text-primary" />
        请求载荷 (JSON Payload)
      </span>
      <span class="font-mono text-xs opacity-70">格式: application/json</span>
    </div>
    <textarea
      class="w-full h-36 rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed text-foreground outline-none focus:ring-1 focus:ring-primary"
      bind:value={payloadText}
      spellcheck="false"
    ></textarea>
  </div>

  <!-- Actions -->
  <div class="flex items-center justify-between pt-1">
    <span class="text-xs text-muted-foreground font-mono">
      将自动生成 X-Svadmin-Timestamp 与 HMAC-SHA256 签名头
    </span>
    <button
      type="button"
      class="inline-flex items-center gap-1.5 h-8 rounded-sm bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
      onclick={sendMockWebhook}
      disabled={isSending || !endpointUrl.trim()}
    >
      {#if isSending}
        <Loader2 class="h-3.5 w-3.5 animate-spin" />
        <span>正在投递...</span>
      {:else}
        <Send class="h-3.5 w-3.5" />
        <span>发起模拟投递测试</span>
      {/if}
    </button>
  </div>

  <!-- Result Panel -->
  {#if deliveryResult}
    <div class="rounded-md border border-border bg-muted/20 p-4 space-y-3 text-xs font-mono">
      <div class="flex items-center justify-between border-b border-border/60 pb-2">
        <div class="flex items-center gap-2">
          {#if deliveryResult.statusCode >= 200 && deliveryResult.statusCode < 300}
            <span class="h-2 w-2 rounded-full bg-success"></span>
            <span class="font-bold text-success flex items-center gap-1">
              <CheckCircle2 class="h-3.5 w-3.5" />
              HTTP {deliveryResult.statusCode} OK
            </span>
          {:else}
            <span class="h-2 w-2 rounded-full bg-destructive"></span>
            <span class="font-bold text-destructive flex items-center gap-1">
              <AlertCircle class="h-3.5 w-3.5" />
              HTTP {deliveryResult.statusCode} FAILED
            </span>
          {/if}
        </div>
        <span class="text-muted-foreground">耗时: <strong>{deliveryResult.durationMs}ms</strong></span>
      </div>

      {#if deliveryResult.error}
        <div class="text-destructive font-semibold">
          异常详情: {deliveryResult.error}
        </div>
      {:else if deliveryResult.responseBody}
        <div>
          <span class="text-muted-foreground block mb-1">目标服务端响应内容 (Response Body):</span>
          <pre class="rounded-sm border border-border bg-card p-2 text-foreground whitespace-pre-wrap"><code>{deliveryResult.responseBody}</code></pre>
        </div>
      {/if}
    </div>
  {/if}
</div>
