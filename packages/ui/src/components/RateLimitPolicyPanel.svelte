<script lang="ts">
  import {
    Activity,
    Zap,
    ShieldOff,
    ShieldCheck,
    Gauge,
    RotateCcw,
    Sliders,
    AlertOctagon,
    ServerCrash,
    Check,
    Save,
    Info,
  } from 'lucide-svelte';

  export type CircuitBreakerState = 'closed' | 'open' | 'half_open';
  export type RateLimitDimension = 'client_ip' | 'user_id' | 'api_key' | 'tenant_id';
  export type FallbackStrategy = 'mock_json' | 'static_status' | 'secondary_upstream';

  export interface RateLimitPolicyConfig {
    id: string;
    name: string;
    enabled: boolean;
    qps: number;
    burst: number;
    dimension: RateLimitDimension;
    limitExceededStatusCode: number;
    circuitBreakerState: CircuitBreakerState;
    failureRateThreshold: number; // e.g. 50 (%)
    slowCallDurationMs: number; // e.g. 1000 (ms)
    minRequestVolume: number; // e.g. 20 (reqs)
    recoveryTimeoutSeconds: number; // e.g. 30 (s)
    fallbackStrategy: FallbackStrategy;
    fallbackMockPayload: string;
  }

  interface Props {
    config?: Partial<RateLimitPolicyConfig>;
    title?: string;
    subtitle?: string;
    onsave?: (config: RateLimitPolicyConfig) => void;
    onresetCircuitBreaker?: () => void;
  }

  const defaultConfig: RateLimitPolicyConfig = {
    id: 'policy-default-ratelimit',
    name: '全局对外开放 API 限流与熔断自愈策略',
    enabled: true,
    qps: 500,
    burst: 1000,
    dimension: 'client_ip',
    limitExceededStatusCode: 429,
    circuitBreakerState: 'closed',
    failureRateThreshold: 50,
    slowCallDurationMs: 1200,
    minRequestVolume: 30,
    recoveryTimeoutSeconds: 45,
    fallbackStrategy: 'mock_json',
    fallbackMockPayload: '{"code": 42901, "message": "Service traffic throttled, please retry later"}',
  };

  let {
    config = {},
    title = 'API 限流熔断与自愈治理看板',
    subtitle = '集成令牌桶 QPS 限流算法、熔断器三态健康流转机及降级兜底响应策略',
    onsave,
    onresetCircuitBreaker,
  }: Props = $props();

  let policy = $state<RateLimitPolicyConfig>({ ...defaultConfig, ...config });
  let saveSuccess = $state(false);

  function handleResetCircuitBreaker() {
    policy.circuitBreakerState = 'closed';
    if (onresetCircuitBreaker) {
      onresetCircuitBreaker();
    }
  }

  function handleSave() {
    if (onsave) {
      onsave(policy);
    }
    saveSuccess = true;
    setTimeout(() => {
      saveSuccess = false;
    }, 2000);
  }
</script>

<div
  class="relative rounded-xl border border-border bg-card p-6 shadow-lg transition-all"
  data-svadmin-component="RateLimitPolicyPanel"
>
  <!-- Header Banner -->
  <div class="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-border">
    <div class="flex items-center gap-3">
      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
        <Activity class="h-6 w-6" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-base font-semibold text-foreground tracking-tight">{title}</h2>
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
            {policy.enabled ? 'bg-success/15 text-success border border-success/30' : 'bg-muted text-muted-foreground'}">
            {policy.enabled ? '策略在线防护' : '已旁路关闭'}
          </span>
        </div>
        <p class="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
        onclick={handleResetCircuitBreaker}
      >
        <RotateCcw class="h-3.5 w-3.5 text-muted-foreground" />
        <span>复位熔断器状态</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        onclick={handleSave}
      >
        {#if saveSuccess}
          <Check class="h-3.5 w-3.5" />
          <span>策略已同步</span>
        {:else}
          <Save class="h-3.5 w-3.5" />
          <span>保存限流策略</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Real-time Circuit Breaker Health Status Capsule -->
  <div class="my-5 rounded-lg border border-border bg-muted/20 p-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        {#if policy.circuitBreakerState === 'closed'}
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success border border-success/30">
            <ShieldCheck class="h-5 w-5" />
          </div>
          <div>
            <div class="text-xs font-semibold text-success flex items-center gap-1.5">
              <span>熔断器状态：CLOSED (闭合通行)</span>
              <span class="inline-block h-2 w-2 rounded-full bg-success"></span>
            </div>
            <div class="text-[11px] text-muted-foreground">服务链路健康，指标未达到触发熔断阈值</div>
          </div>
        {:else if policy.circuitBreakerState === 'open'}
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/15 text-destructive border border-destructive/30 animate-pulse">
            <ShieldOff class="h-5 w-5" />
          </div>
          <div>
            <div class="text-xs font-semibold text-destructive flex items-center gap-1.5">
              <span>熔断器状态：OPEN (阻断降级中)</span>
              <span class="inline-block h-2 w-2 rounded-full bg-destructive animate-ping"></span>
            </div>
            <div class="text-[11px] text-muted-foreground">错误率超限，所有上游请求已由降级兜底逻辑直接接管</div>
          </div>
        {:else}
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-warning border border-warning/30">
            <AlertOctagon class="h-5 w-5" />
          </div>
          <div>
            <div class="text-xs font-semibold text-warning flex items-center gap-1.5">
              <span>熔断器状态：HALF-OPEN (半开试探)</span>
              <span class="inline-block h-2 w-2 rounded-full bg-warning"></span>
            </div>
            <div class="text-[11px] text-muted-foreground">正在注入灰度探针流量，若连续成功将自愈恢复正常</div>
          </div>
        {/if}
      </div>

      <div class="flex items-center gap-6 text-xs font-mono">
        <div>
          <span class="text-muted-foreground">当前 QPS:</span>
          <strong class="text-foreground ml-1">{policy.qps} / s</strong>
        </div>
        <div>
          <span class="text-muted-foreground">突发缓冲池:</span>
          <strong class="text-primary ml-1">{policy.burst} req</strong>
        </div>
        <div>
          <span class="text-muted-foreground">熔断阈值:</span>
          <strong class="text-destructive ml-1">{policy.failureRateThreshold}%</strong>
        </div>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Left Section: Token Bucket Rate Limiting -->
    <div class="space-y-4 rounded-xl border border-border bg-card p-5">
      <div class="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-3">
        <Gauge class="h-4 w-4 text-primary" />
        <span>令牌桶速率限制 (Token Bucket Rate Limiting)</span>
      </div>

      <div class="space-y-3 text-xs">
        <div>
          <label for="policy-qps-input" class="flex justify-between font-medium text-muted-foreground mb-1">
            <span>基准请求速率限制 (QPS)</span>
            <span class="font-mono text-foreground font-semibold">{policy.qps} 次/秒</span>
          </label>
          <input
            id="policy-qps-input"
            type="range"
            min="10"
            max="5000"
            step="10"
            class="w-full accent-primary cursor-pointer"
            bind:value={policy.qps}
          />
        </div>

        <div>
          <label for="policy-burst-input" class="flex justify-between font-medium text-muted-foreground mb-1">
            <span>最大突发峰值并发容纳量 (Burst Capacity)</span>
            <span class="font-mono text-primary font-semibold">{policy.burst} 并发令牌</span>
          </label>
          <input
            id="policy-burst-input"
            type="range"
            min="50"
            max="10000"
            step="50"
            class="w-full accent-primary cursor-pointer"
            bind:value={policy.burst}
          />
        </div>

        <div class="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label for="policy-dimension-select" class="block font-medium text-muted-foreground mb-1">限流粒度维度 (Dimension)</label>
            <select
              id="policy-dimension-select"
              class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              bind:value={policy.dimension}
            >
              <option value="client_ip">客户端 IP 地址 (Client IP)</option>
              <option value="user_id">已登录用户 UID (User ID)</option>
              <option value="api_key">API 鉴权密钥 (API Key)</option>
              <option value="tenant_id">多租户 ID (Tenant ID)</option>
            </select>
          </div>

          <div>
            <label for="policy-status-code" class="block font-medium text-muted-foreground mb-1">超限拦截状态码</label>
            <input
              id="policy-status-code"
              type="number"
              class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              bind:value={policy.limitExceededStatusCode}
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Right Section: Circuit Breaker Parameters & Fallback -->
    <div class="space-y-4 rounded-xl border border-border bg-card p-5">
      <div class="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-3">
        <ServerCrash class="h-4 w-4 text-destructive" />
        <span>熔断器阈值与降级兜底策略</span>
      </div>

      <div class="space-y-3 text-xs">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="policy-failure-threshold" class="block font-medium text-muted-foreground mb-1">
              异常错误率触发阈值 (%)
            </label>
            <input
              id="policy-failure-threshold"
              type="number"
              min="1"
              max="100"
              class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              bind:value={policy.failureRateThreshold}
            />
          </div>

          <div>
            <label for="policy-slow-duration" class="block font-medium text-muted-foreground mb-1">慢调用超时判定 (ms)</label>
            <input
              id="policy-slow-duration"
              type="number"
              min="100"
              max="30000"
              class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              bind:value={policy.slowCallDurationMs}
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="policy-min-requests" class="block font-medium text-muted-foreground mb-1">最小统计请求采样数</label>
            <input
              id="policy-min-requests"
              type="number"
              min="5"
              class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              bind:value={policy.minRequestVolume}
            />
          </div>

          <div>
            <label for="policy-recovery-timeout" class="block font-medium text-muted-foreground mb-1">熔断持续自愈等待 (秒)</label>
            <input
              id="policy-recovery-timeout"
              type="number"
              min="5"
              class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              bind:value={policy.recoveryTimeoutSeconds}
            />
          </div>
        </div>

        <!-- Fallback Strategy -->
        <div class="pt-1">
          <label for="policy-fallback-strategy" class="block font-medium text-muted-foreground mb-1">降级接管策略 (Fallback Action)</label>
          <select
            id="policy-fallback-strategy"
            class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring mb-2"
            bind:value={policy.fallbackStrategy}
          >
            <option value="mock_json">返回 Mock 静态 JSON 结构体</option>
            <option value="static_status">返回标准 503 快速失败</option>
            <option value="secondary_upstream">透明转发至二级备用灾备集群</option>
          </select>

          {#if policy.fallbackStrategy === 'mock_json'}
            <textarea
              class="w-full h-16 rounded-lg border border-input bg-background p-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              bind:value={policy.fallbackMockPayload}
            ></textarea>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
