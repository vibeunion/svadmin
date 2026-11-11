<script lang="ts">
  import { untrack } from 'svelte';

  export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  export interface MockRuleItem {
    id: string;
    endpoint: string;
    method: HttpMethod;
    status: number;
    delayMs: number;
    enabled: boolean;
    responseBody: string;
    description?: string | undefined;
  }

  export interface MockDataInterceptorProps {
    rules?: MockRuleItem[] | undefined;
    isInterceptorActive?: boolean | undefined;
    title?: string | undefined;
    class?: string | undefined;
    onToggleActive?: ((active: boolean) => void) | undefined;
    onSaveRules?: ((rules: MockRuleItem[]) => void) | undefined;
    onTestMock?: ((rule: MockRuleItem) => Promise<{ status: number; duration: number; data: unknown }>) | undefined;
  }

  const defaultRules: MockRuleItem[] = [
    {
      id: 'm1',
      endpoint: '/api/v1/users/me',
      method: 'GET',
      status: 200,
      delayMs: 80,
      enabled: true,
      responseBody: '{"id":"usr_01","name":"Demo Admin","role":"super_admin","permissions":["*"]}',
      description: '当前登录用户信息与权限清单'
    },
    {
      id: 'm2',
      endpoint: '/api/v1/billing/invoices',
      method: 'GET',
      status: 200,
      delayMs: 150,
      enabled: true,
      responseBody: '{"invoices":[{"id":"inv_202611","amount":12800.00,"status":"paid"}]}',
      description: '企业计费账单列表 Mock'
    },
    {
      id: 'm3',
      endpoint: '/api/v1/orders/checkout',
      method: 'POST',
      status: 201,
      delayMs: 300,
      enabled: true,
      responseBody: '{"order_id":"ord_88201","status":"created","trade_no":"tx_9981"}',
      description: '模拟创建订单成功'
    },
    {
      id: 'm4',
      endpoint: '/api/v1/payments/refund',
      method: 'POST',
      status: 500,
      delayMs: 800,
      enabled: false,
      responseBody: '{"code":"GATEWAY_TIMEOUT","message":"第三方银行清算通道超时，已触发重试保护"}',
      description: '支付退款故障注入 (500 熔断模拟)'
    }
  ];

  const {
    rules = defaultRules,
    isInterceptorActive = true,
    title = '前端请求拦截与离线 Mock 沙箱控制台',
    class: className = '',
    onToggleActive = undefined,
    onSaveRules = undefined,
    onTestMock = undefined
  }: MockDataInterceptorProps = $props();

  let active = $state(untrack(() => isInterceptorActive));
  let ruleList = $state<MockRuleItem[]>(untrack(() => [...rules]));
  let selectedRuleId = $state<string>(untrack(() => rules[0]?.id ?? ''));
  let isTesting = $state(false);
  let testResponse = $state<unknown>(null);
  let testStatus = $state<number | null>(null);
  let testDuration = $state<number | null>(null);

  const currentRule = $derived(
    ruleList.find(r => r.id === selectedRuleId) ?? ruleList[0]
  );

  function toggleActive() {
    active = !active;
    onToggleActive?.(active);
  }

  function toggleRule(id: string) {
    ruleList = ruleList.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    onSaveRules?.(ruleList);
  }

  async function runTest(rule: MockRuleItem) {
    isTesting = true;
    testStatus = null;
    testDuration = null;
    testResponse = null;

    const start = Date.now();
    try {
      if (onTestMock) {
        const res = await onTestMock(rule);
        testStatus = res.status;
        testDuration = res.duration;
        testResponse = res.data;
      } else {
        await new Promise(resolve => setTimeout(resolve, Math.min(rule.delayMs, 600)));
        testStatus = rule.status;
        testDuration = Date.now() - start;
        try {
          testResponse = JSON.parse(rule.responseBody);
        } catch {
          testResponse = rule.responseBody;
        }
      }
    } finally {
      isTesting = false;
    }
  }

  function getMethodBadge(method: HttpMethod): string {
    switch (method) {
      case 'GET': return 'bg-info/10 text-info border-info/20';
      case 'POST': return 'bg-success/10 text-success border-success/20';
      case 'PUT': return 'bg-warning/10 text-warning border-warning/20';
      case 'DELETE': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'PATCH': return 'bg-primary/10 text-primary border-primary/20';
    }
  }

  function getStatusCodeBadge(status: number): string {
    if (status >= 200 && status < 300) return 'bg-success/10 text-success border-success/20';
    if (status >= 400 && status < 500) return 'bg-warning/10 text-warning border-warning/20';
    if (status >= 500) return 'bg-destructive/10 text-destructive border-destructive/20';
    return 'bg-muted text-muted-foreground border-border';
  }
</script>

<div
  class="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm {className}"
  data-svadmin-component="MockDataInterceptor"
>
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
    <div class="flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-medium text-foreground">{title}</h3>
        <p class="text-xs text-muted-foreground">脱离后端联调等待，支持自定义延迟注入与故障模拟</p>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium {active ? 'text-success' : 'text-muted-foreground'}">
          {active ? '● 拦截器运行中' : '○ 拦截器已停用'}
        </span>
        <button
          type="button"
          class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {active ? 'bg-primary' : 'bg-muted'}"
          onclick={toggleActive}
          aria-label="Toggle Mock Interceptor"
        >
          <span
            class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out {active ? 'translate-x-4' : 'translate-x-0'}"
          ></span>
        </button>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div class="lg:col-span-2 overflow-x-auto rounded-md border border-border">
      <table class="w-full border-collapse text-left text-xs">
        <thead>
          <tr class="border-b border-border bg-muted/50 font-medium text-muted-foreground">
            <th class="p-2.5">方法</th>
            <th class="p-2.5">端点路径 (Endpoint)</th>
            <th class="p-2.5">状态码</th>
            <th class="p-2.5">延时</th>
            <th class="p-2.5 text-center">启用</th>
            <th class="p-2.5 text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#each ruleList as rule (rule.id)}
            <tr
              class="hover:bg-muted/30 transition-colors cursor-pointer {selectedRuleId === rule.id ? 'bg-muted/40' : ''} {rule.enabled ? '' : 'opacity-50'}"
              onclick={() => { selectedRuleId = rule.id; }}
            >
              <td class="p-2.5">
                <span class="inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold {getMethodBadge(rule.method)}">
                  {rule.method}
                </span>
              </td>
              <td class="p-2.5 font-mono text-foreground font-medium">
                {rule.endpoint}
              </td>
              <td class="p-2.5">
                <span class="inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold {getStatusCodeBadge(rule.status)}">
                  {rule.status}
                </span>
              </td>
              <td class="p-2.5 text-muted-foreground font-mono">
                {rule.delayMs}ms
              </td>
              <td class="p-2.5 text-center" onclick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onchange={() => toggleRule(rule.id)}
                  class="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                />
              </td>
              <td class="p-2.5 text-right" onclick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  class="rounded bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                  onclick={() => runTest(rule)}
                >
                  测试
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="rounded-md border border-border bg-muted/20 p-3 flex flex-col gap-3">
      <div class="flex items-center justify-between border-b border-border pb-2">
        <span class="text-xs font-semibold text-foreground">Mock 响应载荷核验</span>
        {#if currentRule}
          <span class="rounded border px-1.5 py-0.5 text-[10px] font-mono {getMethodBadge(currentRule.method)}">
            {currentRule.method}
          </span>
        {/if}
      </div>

      {#if currentRule}
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span class="truncate max-w-[200px]">{currentRule.endpoint}</span>
            <span>{currentRule.status} OK</span>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-[11px] text-muted-foreground">预设 JSON 响应体:</span>
            <pre class="rounded-md border border-border bg-card p-2 text-[11px] font-mono text-foreground overflow-x-auto max-h-[140px] leading-relaxed">
{currentRule.responseBody}
            </pre>
          </div>

          <button
            type="button"
            disabled={isTesting}
            class="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            onclick={() => runTest(currentRule)}
          >
            {isTesting ? '正在模拟请求与网络延迟...' : '立即发起模拟请求验证'}
          </button>

          {#if testStatus !== null}
            <div class="mt-2 rounded-md border border-border bg-card p-2.5 flex flex-col gap-1.5 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-medium text-foreground">模拟测试结果:</span>
                <span class="rounded border px-1.5 py-0.5 text-[10px] font-semibold {getStatusCodeBadge(testStatus)}">
                  HTTP {testStatus} ({testDuration}ms)
                </span>
              </div>
              <pre class="text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-[100px]">
{typeof testResponse === 'object' ? JSON.stringify(testResponse, null, 2) : testResponse}
              </pre>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
