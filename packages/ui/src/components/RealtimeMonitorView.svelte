<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';
  import IconMonitor from './icons/IconMonitor.svelte';
  import IconCluster from './icons/IconCluster.svelte';
  import IconAudit from './icons/IconAudit.svelte';
  import IconSecurity from './icons/IconSecurity.svelte';

  export interface MetricCardItem {
    label: string;
    value: string | number;
    subtext?: string;
    trend?: 'up' | 'down' | 'neutral';
    status?: 'normal' | 'warning' | 'danger';
  }

  export interface RealtimeMonitorViewProps {
    /** Title of the monitor dashboard */
    title?: string;
    /** Subtitle or description */
    description?: string;
    /** Current streaming or service status */
    liveStatus?: 'live' | 'buffering' | 'paused' | 'offline';
    /** Server metrics list */
    metrics?: MetricCardItem[];
    /** Stream resolution string (e.g. 1080P 60fps) */
    streamResolution?: string;
    /** Bitrate display string (e.g. 6.4 Mbps) */
    bitrate?: string;
    /** Active viewers count */
    viewersCount?: number;
    /** Event logs or audit entries */
    logs?: Array<{ id: string; time: string; level: 'info' | 'warn' | 'error'; message: string }>;
    /** Callback when emergency switch is toggled */
    onswitchtoggle?: (key: string, enabled: boolean) => void;
    /** Custom extra actions in the header */
    extra?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    title = '实时运维监控看板',
    description = '实时监控集群健康、流媒体推流质量与高频网关流量指标。',
    liveStatus = 'live',
    metrics = [
      { label: 'CPU 使用率', value: '38.4%', subtext: '8 核心正常', status: 'normal' },
      { label: '内存占用率', value: '62.1%', subtext: '已用 19.8 / 32 GB', status: 'normal' },
      { label: '网络吞吐 (In/Out)', value: '1.24 GB/s', subtext: '高峰负载平稳', status: 'normal' },
      { label: '实时 QPS', value: '18,420', subtext: '同比 +12.3%', trend: 'up', status: 'normal' },
    ],
    streamResolution = '1080P @ 60 FPS',
    bitrate = '6.8 Mbps',
    viewersCount = 12480,
    logs = [
      { id: '1', time: '05:40:12', level: 'info', message: '网关集群负载均衡健康检查完成 (所有节点在线)' },
      { id: '2', time: '05:41:03', level: 'info', message: '推流边缘节点 edge-sh-02 建立推流连接' },
      { id: '3', time: '05:42:25', level: 'warn', message: '节点 node-ap-04 出现短暂网络抖动 (已自动重连)' },
    ],
    onswitchtoggle,
    extra,
    class: className = '',
  }: RealtimeMonitorViewProps = $props();

  let emergencySwitches = $state([
    { key: 'throttle', label: '网关高频限流保护', enabled: false },
    { key: 'circuit_breaker', label: '下游微服务自动熔断', enabled: true },
    { key: 'debug_dump', label: '全链路采样日志捕获', enabled: false },
  ]);

  function toggleSwitch(key: string) {
    const item = emergencySwitches.find((s) => s.key === key);
    if (!item) return;
    item.enabled = !item.enabled;
    onswitchtoggle?.(key, item.enabled);
  }
</script>

<div
  data-svadmin-component="RealtimeMonitorView"
  class={cn('svadmin-realtime-monitor flex flex-col gap-5 p-4 sm:p-6 bg-background text-foreground', className)}
>
  <!-- Header with live pulse -->
  <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
    <div class="flex items-center gap-3">
      <div class="p-2.5 rounded-[4px] bg-primary/10 text-primary">
        <IconMonitor size={22} />
      </div>
      <div>
        <div class="flex items-center gap-2.5">
          <h1 class="text-base sm:text-lg font-semibold">{title}</h1>
          <span
            class={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border font-mono tracking-wider uppercase',
              liveStatus === 'live' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
              liveStatus === 'buffering' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
              liveStatus === 'paused' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
              liveStatus === 'offline' && 'bg-muted text-muted-foreground border-border'
            )}
          >
            <span class="relative flex h-1.5 w-1.5">
              {#if liveStatus === 'live'}
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              {/if}
              <span
                class={cn(
                  'relative inline-flex rounded-full h-1.5 w-1.5',
                  liveStatus === 'live' && 'bg-emerald-500',
                  liveStatus === 'buffering' && 'bg-amber-500',
                  liveStatus === 'paused' && 'bg-blue-500',
                  liveStatus === 'offline' && 'bg-muted-foreground'
                )}
              ></span>
            </span>
            {liveStatus}
          </span>
        </div>
        {#if description}
          <p class="text-xs text-muted-foreground mt-0.5">{description}</p>
        {/if}
      </div>
    </div>

    <div class="flex items-center gap-2">
      {#if extra}
        {@render extra()}
      {/if}
    </div>
  </header>

  <!-- Metric Cards Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {#each metrics as metric (metric.label)}
      <div class="flex flex-col justify-between p-4 rounded-[4px] border border-border bg-card shadow-sm hover:border-primary/40 transition-colors">
        <div class="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{metric.label}</span>
          {#if metric.trend === 'up'}
            <span class="text-xs text-emerald-600 font-medium flex items-center">↑ 升高</span>
          {:else if metric.trend === 'down'}
            <span class="text-xs text-rose-600 font-medium flex items-center">↓ 降低</span>
          {/if}
        </div>
        <div class="text-xl sm:text-2xl font-bold tracking-tight text-foreground my-1 font-mono">
          {metric.value}
        </div>
        {#if metric.subtext}
          <div class="text-[11px] text-muted-foreground mt-1">
            {metric.subtext}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Operational Panels -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <!-- Left 2 Cols: Stream / Gateway Telemetry Detail -->
    <div class="lg:col-span-2 flex flex-col gap-4 p-4 rounded-[4px] border border-border bg-card shadow-sm">
      <div class="flex items-center justify-between pb-2 border-b border-border">
        <div class="flex items-center gap-2 text-sm font-semibold">
          <IconCluster size={16} class="text-primary" />
          <span>边缘节点推流与链路遥测</span>
        </div>
        <span class="text-xs px-2 py-0.5 rounded-[4px] bg-primary/10 text-primary font-mono">
          {liveStatus === 'live' ? '推流正常传输中' : '等待推流输入'}
        </span>
      </div>

      <!-- Telemetry Spec Grid -->
      <div class="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-[4px] border border-border/50 text-center text-xs">
        <div>
          <div class="text-muted-foreground text-[11px]">当前画质编码</div>
          <div class="font-semibold mt-1 font-mono text-sm">{streamResolution}</div>
        </div>
        <div>
          <div class="text-muted-foreground text-[11px]">实时编码码率</div>
          <div class="font-semibold mt-1 font-mono text-sm">{bitrate}</div>
        </div>
        <div>
          <div class="text-muted-foreground text-[11px]">在线连接客户端</div>
          <div class="font-semibold mt-1 font-mono text-sm text-primary">{viewersCount.toLocaleString()}</div>
        </div>
      </div>

      <!-- Emergency Switches -->
      <div class="mt-2">
        <div class="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2.5">
          <IconSecurity size={14} class="text-primary" />
          <span>应急熔断与主动限流控制</span>
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          {#each emergencySwitches as sw (sw.key)}
            <button
              type="button"
              onclick={() => toggleSwitch(sw.key)}
              class={cn(
                'flex-1 flex items-center justify-between px-3 py-2 rounded-[4px] border text-xs font-medium transition-all cursor-pointer',
                sw.enabled
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
              )}
            >
              <span>{sw.label}</span>
              <span class={cn('w-2 h-2 rounded-full', sw.enabled ? 'bg-primary' : 'bg-muted-foreground/40')}></span>
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Right 1 Col: Log Stream -->
    <div class="flex flex-col gap-3 p-4 rounded-[4px] border border-border bg-card shadow-sm">
      <div class="flex items-center justify-between pb-2 border-b border-border">
        <div class="flex items-center gap-2 text-sm font-semibold">
          <IconAudit size={16} class="text-primary" />
          <span>实时日志与审计事件</span>
        </div>
        <span class="text-[10px] text-muted-foreground font-mono">最新 3 条</span>
      </div>

      <div class="flex flex-col gap-2.5 text-xs overflow-y-auto max-h-64">
        {#each logs as log (log.id)}
          <div class="flex flex-col gap-0.5 p-2 rounded-[4px] bg-muted/40 border border-border/40">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-mono text-muted-foreground">{log.time}</span>
              <span
                class={cn(
                  'text-[10px] uppercase font-mono px-1 rounded-[2px]',
                  log.level === 'warn' && 'bg-amber-500/10 text-amber-600',
                  log.level === 'error' && 'bg-rose-500/10 text-rose-600',
                  log.level === 'info' && 'bg-primary/10 text-primary'
                )}
              >
                {log.level}
              </span>
            </div>
            <p class="text-muted-foreground text-[11px] leading-relaxed mt-0.5">
              {log.message}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
