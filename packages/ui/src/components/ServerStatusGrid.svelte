<script lang="ts">
  import { Server, Activity, HardDrive, Cpu } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type NodeHealthStatus = 'healthy' | 'warning' | 'critical' | 'offline';

  export interface ServerNode {
    id: string;
    name: string;
    region: string;
    status: NodeHealthStatus;
    latencyMs: number;
    cpuPercent: number;
    memoryPercent: number;
    diskPercent?: number | undefined;
    activeConnections?: number | undefined;
  }

  export interface ServerStatusGridProps {
    title?: string | undefined;
    nodes: ServerNode[];
    onselectnode?: ((node: ServerNode) => void) | undefined;
    class?: string | undefined;
  }

  let {
    title = '服务集群健康度全景网格',
    nodes = [],
    onselectnode,
    class: className = '',
  }: ServerStatusGridProps = $props();

  const summary = $derived.by(() => {
    let healthy = 0;
    let warning = 0;
    let critical = 0;
    let offline = 0;
    let totalLatency = 0;

    for (const n of nodes) {
      if (n.status === 'healthy') healthy++;
      else if (n.status === 'warning') warning++;
      else if (n.status === 'critical') critical++;
      else offline++;
      totalLatency += n.latencyMs;
    }

    const avgLatency = nodes.length > 0 ? Math.round(totalLatency / nodes.length) : 0;
    return { healthy, warning, critical, offline, avgLatency, total: nodes.length };
  });

  function getBarTone(percent: number): string {
    if (percent >= 85) return 'bg-destructive';
    if (percent >= 70) return 'bg-warning';
    return 'bg-primary';
  }

  function getStatusTone(status: NodeHealthStatus) {
    switch (status) {
      case 'healthy':
        return { dot: 'bg-success', badge: 'bg-success/10 text-success border-success/30' };
      case 'warning':
        return { dot: 'bg-warning', badge: 'bg-warning/10 text-warning border-warning/30' };
      case 'critical':
        return { dot: 'bg-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/30' };
      case 'offline':
      default:
        return { dot: 'bg-muted-foreground', badge: 'bg-muted text-muted-foreground border-border' };
    }
  }
</script>

<div
  class={cn('rounded-md border border-border bg-card p-4 text-card-foreground shadow-xs flex flex-col space-y-4', className)}
  data-svadmin-component="ServerStatusGrid"
>
  <!-- Header & Cluster Aggregation Stats -->
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
    <div class="flex items-center gap-2">
      <Server class="h-4 w-4 text-primary" />
      <h3 class="font-bold text-sm text-foreground">{title}</h3>
    </div>

    <div class="flex items-center gap-3 text-xs font-mono">
      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-success/10 text-success font-medium">
        <span class="h-1.5 w-1.5 rounded-full bg-success"></span>
        {summary.healthy}/{summary.total} 健康在线
      </span>

      {#if summary.warning > 0}
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-warning/10 text-warning font-medium">
          <span class="h-1.5 w-1.5 rounded-full bg-warning"></span>
          {summary.warning} 节点告警
        </span>
      {/if}

      {#if summary.critical > 0}
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
          <span class="h-1.5 w-1.5 rounded-full bg-destructive"></span>
          {summary.critical} 紧急故障
        </span>
      {/if}

      <span class="text-muted-foreground flex items-center gap-1">
        <Activity class="h-3 w-3" />
        平均延时: <strong>{summary.avgLatency}ms</strong>
      </span>
    </div>
  </header>

  <!-- Node Cards Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
    {#each nodes as node (node.id)}
      {@const tone = getStatusTone(node.status)}
      <button
        type="button"
        class="rounded-lg border border-border bg-background/50 hover:bg-muted/30 p-3.5 text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 group hover:border-primary/40 shadow-2xs"
        onclick={() => onselectnode?.(node)}
      >
        <!-- Card Top Line -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class={cn('h-2.5 w-2.5 rounded-full shrink-0', tone.dot)}></span>
            <span class="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
              {node.name}
            </span>
          </div>

          <div class="flex items-center gap-1.5 font-mono text-xs shrink-0">
            <span class="px-1.5 py-0.5 rounded border border-border bg-muted/30 text-muted-foreground">
              {node.region}
            </span>
            <span class={cn('px-1.5 py-0.5 rounded border font-semibold', tone.badge)}>
              {node.latencyMs}ms
            </span>
          </div>
        </div>

        <!-- Resource Progress Bars -->
        <div class="space-y-1.5 text-[11px] font-mono">
          <!-- CPU -->
          <div class="space-y-0.5">
            <div class="flex justify-between text-muted-foreground">
              <span class="flex items-center gap-1"><Cpu class="h-2.5 w-2.5" /> CPU</span>
              <span class="font-semibold text-foreground">{node.cpuPercent}%</span>
            </div>
            <div class="h-1.5 bg-muted rounded-full overflow-hidden">
              <div class={cn('h-full transition-all duration-300', getBarTone(node.cpuPercent))} style="width: {node.cpuPercent}%"></div>
            </div>
          </div>

          <!-- Memory -->
          <div class="space-y-0.5">
            <div class="flex justify-between text-muted-foreground">
              <span class="flex items-center gap-1"><Activity class="h-2.5 w-2.5" /> 内存</span>
              <span class="font-semibold text-foreground">{node.memoryPercent}%</span>
            </div>
            <div class="h-1.5 bg-muted rounded-full overflow-hidden">
              <div class={cn('h-full transition-all duration-300', getBarTone(node.memoryPercent))} style="width: {node.memoryPercent}%"></div>
            </div>
          </div>

          <!-- Disk -->
          {#if node.diskPercent !== undefined}
            <div class="space-y-0.5">
              <div class="flex justify-between text-muted-foreground">
                <span class="flex items-center gap-1"><HardDrive class="h-2.5 w-2.5" /> 存储</span>
                <span class="font-semibold text-foreground">{node.diskPercent}%</span>
              </div>
              <div class="h-1.5 bg-muted rounded-full overflow-hidden">
                <div class={cn('h-full transition-all duration-300', getBarTone(node.diskPercent))} style="width: {node.diskPercent}%"></div>
              </div>
            </div>
          {/if}
        </div>
      </button>
    {/each}
  </div>
</div>
