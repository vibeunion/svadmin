<script lang="ts">
  import {
    Activity,
    Layers,
    Server,
    Database,
    Zap,
    RotateCw,
    X,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export type ClusterNodeHealth = 'healthy' | 'degraded' | 'down' | 'maintenance';
  export type ClusterNodeType = 'gateway' | 'service' | 'database' | 'cache' | 'queue';

  export interface ClusterTopologyNode {
    id: string;
    label: string;
    type: ClusterNodeType;
    health: ClusterNodeHealth;
    qps?: number | undefined;
    latencyMs?: number | undefined;
    errorRate?: number | undefined;
    instances?: number | undefined;
    details?: Record<string, string | number> | undefined;
  }

  export interface ClusterTopologyEdge {
    source: string;
    target: string;
    label?: string | undefined;
    qps?: number | undefined;
  }

  export interface ClusterTopologyGraphProps {
    nodes?: ClusterTopologyNode[] | undefined;
    edges?: ClusterTopologyEdge[] | undefined;
    title?: string | undefined;
    description?: string | undefined;
    class?: string | undefined;
    onNodeSelect?: ((node: ClusterTopologyNode) => void) | undefined;
    onRestartNode?: ((node: ClusterTopologyNode) => void) | undefined;
  }

  let {
    nodes = [
      { id: 'gw', label: 'API Gateway', type: 'gateway', health: 'healthy', qps: 14200, latencyMs: 8, instances: 4 },
      { id: 'auth-svc', label: 'Auth Service', type: 'service', health: 'healthy', qps: 4500, latencyMs: 14, instances: 3 },
      { id: 'order-svc', label: 'Order Service', type: 'service', health: 'degraded', qps: 6200, latencyMs: 84, errorRate: 2.1, instances: 6 },
      { id: 'pay-svc', label: 'Payment Gateway', type: 'service', health: 'healthy', qps: 1800, latencyMs: 32, instances: 2 },
      { id: 'pg-main', label: 'PostgreSQL Primary', type: 'database', health: 'healthy', qps: 8200, latencyMs: 4, instances: 1 },
      { id: 'redis-cache', label: 'Redis Cluster', type: 'cache', health: 'healthy', qps: 22000, latencyMs: 1, instances: 6 },
    ],
    edges = [
      { source: 'gw', target: 'auth-svc', qps: 4500 },
      { source: 'gw', target: 'order-svc', qps: 6200 },
      { source: 'order-svc', target: 'pay-svc', qps: 1800 },
      { source: 'order-svc', target: 'pg-main', qps: 8200 },
      { source: 'auth-svc', target: 'redis-cache', qps: 12000 },
    ],
    title,
    description,
    class: className = '',
    onNodeSelect,
    onRestartNode,
  }: ClusterTopologyGraphProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let activeNodeId = $state<string | null>(null);

  const selectedNode = $derived(nodes.find((n) => n.id === activeNodeId) ?? null);

  const healthColors: Record<ClusterNodeHealth, string> = {
    healthy: 'text-success bg-success/15 border-success/30',
    degraded: 'text-warning bg-warning/15 border-warning/30',
    down: 'text-destructive bg-destructive/15 border-destructive/30',
    maintenance: 'text-info bg-info/15 border-info/30',
  };

  const healthLabels = $derived<Record<ClusterNodeHealth, string>>({
    healthy: chinese ? '运行健康' : 'Healthy',
    degraded: chinese ? '性能降级' : 'Degraded',
    down: chinese ? '服务宕机' : 'Down',
    maintenance: chinese ? '维护中' : 'Maintenance',
  });

  function selectNode(node: ClusterTopologyNode) {
    activeNodeId = node.id;
    onNodeSelect?.(node);
  }

  const gateways = $derived(nodes.filter((n) => n.type === 'gateway'));
  const services = $derived(nodes.filter((n) => n.type === 'service'));
  const storages = $derived(nodes.filter((n) => n.type === 'database' || n.type === 'cache' || n.type === 'queue'));

  const resolvedTitle = $derived(title ?? (chinese ? '分布式服务集群健康与拓扑全景图' : 'Cluster Topology & Health Graph'));
  const resolvedDesc = $derived(
    description ?? (chinese ? '端到端网关微服务调用链路、节点吞吐与健康状态实时监控' : 'Microservice topology, QPS flow, and health matrix'),
  );
</script>

<div
  data-svadmin-component="ClusterTopologyGraph"
  data-edges-count={edges.length}
  class={cn(
    'relative w-full rounded-2xl border border-border bg-card text-card-foreground shadow-xs p-6 space-y-4',
    className,
  )}
>
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-border/70 pb-4">
    <div class="flex items-center gap-2.5">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success border border-success/20">
        <Activity class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-base font-semibold text-foreground">{resolvedTitle}</h3>
        <p class="text-xs text-muted-foreground">{resolvedDesc}</p>
      </div>
    </div>

    <!-- Cluster Overview Stats -->
    <div class="flex items-center gap-3 text-xs">
      <span class="flex items-center gap-1.5">
        <span class="h-2 w-2 rounded-full bg-success"></span>
        <span class="text-muted-foreground">{nodes.filter((n) => n.health === 'healthy').length} 正常</span>
      </span>
      {#if nodes.some((n) => n.health === 'degraded')}
        <span class="flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-warning"></span>
          <span class="text-warning font-semibold">{nodes.filter((n) => n.health === 'degraded').length} 预警</span>
        </span>
      {/if}
      {#if nodes.some((n) => n.health === 'down')}
        <span class="flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-destructive"></span>
          <span class="text-destructive font-bold">{nodes.filter((n) => n.health === 'down').length} 故障</span>
        </span>
      {/if}
    </div>
  </div>

  <!-- Topology 3-Tier Grid Canvas -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
    <!-- Tier 1: Ingress Gateways -->
    <div class="space-y-3">
      <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Zap class="h-3.5 w-3.5 text-primary" />
        <span>{chinese ? '入口网关层 (Ingress Tier)' : 'Ingress Tier'}</span>
      </div>

      <div class="space-y-2.5">
        {#each gateways as node (node.id)}
          <div
            role="button"
            tabindex="0"
            onclick={() => selectNode(node)}
            onkeydown={(e) => e.key === 'Enter' && selectNode(node)}
            class={cn(
              'group flex flex-col p-3 rounded-xl border transition-all cursor-pointer bg-card shadow-2xs',
              activeNodeId === node.id ? 'border-primary ring-2 ring-primary/20 scale-[1.01]' : 'border-border/80 hover:border-border hover:bg-muted/30',
            )}
          >
            <div class="flex items-center justify-between">
              <span class="font-semibold text-xs text-foreground">{node.label}</span>
              <span class={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', healthColors[node.health])}>
                {healthLabels[node.health]}
              </span>
            </div>
            <div class="flex items-center gap-3 mt-2 font-mono text-[11px] text-muted-foreground">
              <span>{node.qps?.toLocaleString() ?? 0} QPS</span>
              <span>{node.latencyMs ?? 0}ms</span>
              <span>{node.instances ?? 1} 实例</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Tier 2: Microservices -->
    <div class="space-y-3">
      <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Server class="h-3.5 w-3.5 text-primary" />
        <span>{chinese ? '应用微服务层 (Services Tier)' : 'Services Tier'}</span>
      </div>

      <div class="space-y-2.5">
        {#each services as node (node.id)}
          <div
            role="button"
            tabindex="0"
            onclick={() => selectNode(node)}
            onkeydown={(e) => e.key === 'Enter' && selectNode(node)}
            class={cn(
              'group flex flex-col p-3 rounded-xl border transition-all cursor-pointer bg-card shadow-2xs',
              activeNodeId === node.id ? 'border-primary ring-2 ring-primary/20 scale-[1.01]' : 'border-border/80 hover:border-border hover:bg-muted/30',
            )}
          >
            <div class="flex items-center justify-between">
              <span class="font-semibold text-xs text-foreground">{node.label}</span>
              <span class={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', healthColors[node.health])}>
                {healthLabels[node.health]}
              </span>
            </div>
            <div class="flex items-center gap-3 mt-2 font-mono text-[11px] text-muted-foreground">
              <span>{node.qps?.toLocaleString() ?? 0} QPS</span>
              <span>{node.latencyMs ?? 0}ms</span>
              {#if node.errorRate}
                <span class="text-destructive font-bold">{node.errorRate}% 错误</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Tier 3: Databases & Caches -->
    <div class="space-y-3">
      <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Database class="h-3.5 w-3.5 text-primary" />
        <span>{chinese ? '存储与缓存层 (Storage Tier)' : 'Storage Tier'}</span>
      </div>

      <div class="space-y-2.5">
        {#each storages as node (node.id)}
          <div
            role="button"
            tabindex="0"
            onclick={() => selectNode(node)}
            onkeydown={(e) => e.key === 'Enter' && selectNode(node)}
            class={cn(
              'group flex flex-col p-3 rounded-xl border transition-all cursor-pointer bg-card shadow-2xs',
              activeNodeId === node.id ? 'border-primary ring-2 ring-primary/20 scale-[1.01]' : 'border-border/80 hover:border-border hover:bg-muted/30',
            )}
          >
            <div class="flex items-center justify-between">
              <span class="font-semibold text-xs text-foreground">{node.label}</span>
              <span class={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', healthColors[node.health])}>
                {healthLabels[node.health]}
              </span>
            </div>
            <div class="flex items-center gap-3 mt-2 font-mono text-[11px] text-muted-foreground">
              <span>{node.qps?.toLocaleString() ?? 0} IOPS</span>
              <span>{node.latencyMs ?? 0}ms</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Slide-out Node Inspector Panel -->
  {#if selectedNode}
    <div class="mt-4 rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Layers class="h-4 w-4 text-primary" />
          <span class="text-xs font-bold text-foreground">
            {chinese ? '服务节点详情与诊断: ' : 'Node Diagnostics: '} {selectedNode.label}
          </span>
          <span class={cn('text-[10px] font-semibold px-2 py-0.2 rounded-full border', healthColors[selectedNode.health])}>
            {healthLabels[selectedNode.health]}
          </span>
        </div>

        <button
          type="button"
          onclick={() => (activeNodeId = null)}
          class="rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close inspector"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-background p-3 rounded-lg border border-border/70">
        <div>
          <span class="block text-muted-foreground text-[10px]">{chinese ? '实时吞吐 QPS' : 'QPS'}</span>
          <span class="font-mono font-bold text-foreground">{selectedNode.qps?.toLocaleString() ?? 0}</span>
        </div>
        <div>
          <span class="block text-muted-foreground text-[10px]">{chinese ? '平均响应延迟' : 'Latency'}</span>
          <span class="font-mono font-bold text-foreground">{selectedNode.latencyMs ?? 0} ms</span>
        </div>
        <div>
          <span class="block text-muted-foreground text-[10px]">{chinese ? '运行容器实例数' : 'Replicas'}</span>
          <span class="font-mono font-bold text-foreground">{selectedNode.instances ?? 1} 副本</span>
        </div>
        <div>
          <span class="block text-muted-foreground text-[10px]">{chinese ? '接口错误率' : 'Error Rate'}</span>
          <span class="font-mono font-bold {selectedNode.errorRate ? 'text-destructive' : 'text-success'}">
            {selectedNode.errorRate ?? 0}%
          </span>
        </div>
      </div>

      {#if onRestartNode}
        <div class="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-7 text-xs gap-1"
            onclick={() => onRestartNode(selectedNode)}
          >
            <RotateCw class="h-3 w-3" />
            <span>{chinese ? '重启实例' : 'Restart Instance'}</span>
          </Button>
        </div>
      {/if}
    </div>
  {/if}
</div>
