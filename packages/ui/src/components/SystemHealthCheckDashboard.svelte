<script lang="ts">
  import { untrack } from 'svelte';

  export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'checking';

  export interface HealthServiceCheck {
    id: string;
    name: string;
    category: 'database' | 'storage' | 'cache' | 'gateway' | 'queue' | 'auth';
    status: ServiceStatus;
    latencyMs: number;
    lastChecked: string;
    endpoint?: string | undefined;
    details?: string | undefined;
  }

  export interface SystemHealthCheckDashboardProps {
    services?: HealthServiceCheck[] | undefined;
    systemVersion?: string | undefined;
    environment?: string | undefined;
    title?: string | undefined;
    class?: string | undefined;
    onRunAllChecks?: (() => Promise<void>) | undefined;
    onCheckSingle?: ((serviceId: string) => Promise<void>) | undefined;
    onExportReport?: ((report: Record<string, unknown>) => void) | undefined;
  }

  const defaultServices: HealthServiceCheck[] = [
    {
      id: 'srv_pg',
      name: 'PostgreSQL 主数据库集群',
      category: 'database',
      status: 'healthy',
      latencyMs: 3,
      lastChecked: '刚刚',
      endpoint: 'db.internal.svc:5432',
      details: '连接池活跃度 18/100，只读副本延迟 0ms'
    },
    {
      id: 'srv_redis',
      name: 'Redis 分布式缓存与 Session 锁',
      category: 'cache',
      status: 'healthy',
      latencyMs: 1,
      lastChecked: '10秒前',
      endpoint: 'redis-master.internal:6379',
      details: '命中率 99.4%，内存占用 1.2GB/8GB'
    },
    {
      id: 'srv_s3',
      name: 'MinIO / S3 企业对象存储桶',
      category: 'storage',
      status: 'healthy',
      latencyMs: 18,
      lastChecked: '1分钟前',
      endpoint: 's3.oss-cn-shanghai.internal',
      details: '读写探测成功，生命周期清理策略就绪'
    },
    {
      id: 'srv_auth',
      name: 'SupaAuth / SSO 统一鉴权中心',
      category: 'auth',
      status: 'healthy',
      latencyMs: 12,
      lastChecked: '刚刚',
      endpoint: 'auth.svadmin.internal/v1',
      details: 'OIDC 令牌换发与 JWT 验签通畅'
    },
    {
      id: 'srv_mq',
      name: 'RabbitMQ 异步事件消息队列',
      category: 'queue',
      status: 'degraded',
      latencyMs: 145,
      lastChecked: '2分钟前',
      endpoint: 'mq-node1.cluster.internal:5672',
      details: '死信队列堆积 42 条，重试消费平稳'
    },
    {
      id: 'srv_sms',
      name: '第三方短信与邮件通知网关',
      category: 'gateway',
      status: 'healthy',
      latencyMs: 65,
      lastChecked: '3分钟前',
      endpoint: 'api.notification-gateway.cloud',
      details: '配额充足，近期下发成功率 99.8%'
    }
  ];

  const {
    services = defaultServices,
    systemVersion = 'v2.8.4-enterprise',
    environment = 'production-east-01',
    title = '企业系统链路健康与运维自检大盘',
    class: className = '',
    onRunAllChecks = undefined,
    onCheckSingle = undefined,
    onExportReport = undefined
  }: SystemHealthCheckDashboardProps = $props();

  let serviceList = $state<HealthServiceCheck[]>(untrack(() => [...services]));
  let isCheckingAll = $state(false);

  const healthyCount = $derived(serviceList.filter(s => s.status === 'healthy').length);
  const degradedCount = $derived(serviceList.filter(s => s.status === 'degraded').length);
  const unhealthyCount = $derived(serviceList.filter(s => s.status === 'unhealthy').length);
  const avgLatency = $derived(
    serviceList.length > 0
      ? Math.round(serviceList.reduce((acc, s) => acc + s.latencyMs, 0) / serviceList.length)
      : 0
  );

  async function handleRunAll() {
    isCheckingAll = true;
    try {
      if (onRunAllChecks) {
        await onRunAllChecks();
      } else {
        await new Promise(r => setTimeout(r, 600));
        serviceList = serviceList.map(s => ({
          ...s,
          lastChecked: '刚刚',
          latencyMs: Math.max(1, Math.round(s.latencyMs + (Math.random() * 6 - 3)))
        }));
      }
    } finally {
      isCheckingAll = false;
    }
  }

  async function handleCheckSingle(id: string) {
    if (onCheckSingle) {
      await onCheckSingle(id);
    } else {
      serviceList = serviceList.map(s => {
        if (s.id === id) {
          return { ...s, lastChecked: '刚刚', latencyMs: Math.max(1, s.latencyMs + 2) };
        }
        return s;
      });
    }
  }

  function handleExport() {
    const report: Record<string, unknown> = {
      systemVersion,
      environment,
      generatedAt: new Date().toISOString(),
      summary: {
        healthyCount,
        degradedCount,
        unhealthyCount,
        avgLatency
      },
      services: serviceList
    };
    onExportReport?.(report);
  }

  function getStatusConfig(status: ServiceStatus): { label: string; badge: string; dot: string } {
    switch (status) {
      case 'healthy':
        return { label: '运行健康', badge: 'bg-success/10 text-success border-success/20', dot: 'bg-success' };
      case 'degraded':
        return { label: '性能亚健康', badge: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' };
      case 'unhealthy':
        return { label: '链路不可用', badge: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' };
      case 'checking':
        return { label: '正在巡检…', badge: 'bg-muted text-muted-foreground border-border', dot: 'bg-primary animate-pulse' };
    }
  }
</script>

<div
  class="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm {className}"
  data-svadmin-component="SystemHealthCheckDashboard"
>
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
    <div class="flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-medium text-foreground">{title}</h3>
        <p class="text-xs text-muted-foreground">环境: <span class="font-mono">{environment}</span> · 版本: <span class="font-mono">{systemVersion}</span></p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        onclick={handleExport}
      >
        <svg class="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        导出诊断报告
      </button>

      <button
        type="button"
        disabled={isCheckingAll}
        class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        onclick={handleRunAll}
      >
        <svg class="h-3.5 w-3.5 {isCheckingAll ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {isCheckingAll ? '正在执行全量链路自检…' : '一键全量链路巡检'}
      </button>
    </div>
  </div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div class="rounded-md border border-border bg-muted/20 p-3 flex flex-col gap-1">
      <span class="text-xs text-muted-foreground">正常健康组件</span>
      <div class="flex items-baseline gap-1.5">
        <span class="text-2xl font-bold text-success">{healthyCount}</span>
        <span class="text-xs text-muted-foreground">/ {serviceList.length}</span>
      </div>
    </div>

    <div class="rounded-md border border-border bg-muted/20 p-3 flex flex-col gap-1">
      <span class="text-xs text-muted-foreground">亚健康/告警组件</span>
      <div class="flex items-baseline gap-1.5">
        <span class="text-2xl font-bold {degradedCount > 0 ? 'text-warning' : 'text-muted-foreground'}">{degradedCount}</span>
        <span class="text-xs text-muted-foreground">项需要关注</span>
      </div>
    </div>

    <div class="rounded-md border border-border bg-muted/20 p-3 flex flex-col gap-1">
      <span class="text-xs text-muted-foreground">故障/离线节点</span>
      <div class="flex items-baseline gap-1.5">
        <span class="text-2xl font-bold {unhealthyCount > 0 ? 'text-destructive' : 'text-muted-foreground'}">{unhealthyCount}</span>
        <span class="text-xs text-muted-foreground">项严重阻塞</span>
      </div>
    </div>

    <div class="rounded-md border border-border bg-muted/20 p-3 flex flex-col gap-1">
      <span class="text-xs text-muted-foreground">集群平均响应往返延时</span>
      <div class="flex items-baseline gap-1.5">
        <span class="text-2xl font-bold text-foreground font-mono">{avgLatency}</span>
        <span class="text-xs text-muted-foreground">ms</span>
      </div>
    </div>
  </div>

  <div class="overflow-x-auto rounded-md border border-border">
    <table class="w-full border-collapse text-left text-xs">
      <thead>
        <tr class="border-b border-border bg-muted/50 font-medium text-muted-foreground">
          <th class="p-2.5">服务组件名称</th>
          <th class="p-2.5">连接端点 (Endpoint)</th>
          <th class="p-2.5">链路状态</th>
          <th class="p-2.5">网络往返延时</th>
          <th class="p-2.5">自检指标详情</th>
          <th class="p-2.5">上次检测</th>
          <th class="p-2.5 text-right">诊断操作</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#each serviceList as service (service.id)}
          {@const st = getStatusConfig(service.status)}
          <tr class="hover:bg-muted/30 transition-colors">
            <td class="p-2.5 font-medium text-foreground">
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full {st.dot}"></span>
                <span>{service.name}</span>
              </div>
            </td>
            <td class="p-2.5 font-mono text-muted-foreground">
              {service.endpoint ?? '—'}
            </td>
            <td class="p-2.5">
              <span class="inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold {st.badge}">
                {st.label}
              </span>
            </td>
            <td class="p-2.5 font-mono font-medium {service.latencyMs > 100 ? 'text-warning' : 'text-foreground'}">
              {service.latencyMs} ms
            </td>
            <td class="p-2.5 text-muted-foreground max-w-[240px] truncate">
              {service.details ?? '—'}
            </td>
            <td class="p-2.5 text-muted-foreground">
              {service.lastChecked}
            </td>
            <td class="p-2.5 text-right">
              <button
                type="button"
                class="rounded bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                onclick={() => handleCheckSingle(service.id)}
              >
                重测
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
