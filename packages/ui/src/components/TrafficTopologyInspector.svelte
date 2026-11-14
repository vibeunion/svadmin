<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    Activity,
    Network,
    Server,
    ShieldAlert,
    ShieldCheck,
    ArrowRight,
    Zap,
    RefreshCw,
    ToggleLeft,
    ToggleRight,
    Sliders,
    Layers,
    Cpu
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type TopologyNodeStatus = 'healthy' | 'warning' | 'critical' | 'bypassed';
  export type TopologyNodeType = 'gateway' | 'service' | 'database' | 'cache' | 'external';

  export interface TopologyNode {
    id: string;
    label: string;
    type: TopologyNodeType;
    status: TopologyNodeStatus;
    region?: string;
    qps: number;
    latencyMsP99: number;
    errorRatePercent: number;
    activeInstances?: number;
  }

  export interface TopologyEdge {
    id: string;
    from: string;
    to: string;
    protocol?: string; // 如 "gRPC", "HTTP/2", "TCP"
    trafficPercentage?: number; // 流量分流比重 0~100%
  }

  export interface TrafficTopologyInspectorProps {
    /** 拓扑节点列表 */
    nodes: TopologyNode[];
    /** 节点间流量调用关系边 */
    edges?: TopologyEdge[];
    /** 标题 */
    title?: string;
    /** 是否只读（不可切换节点旁路切流） */
    readonly?: boolean;
    /** 节点旁路切流切换回调 */
    onToggleBypass?: (nodeId: string, bypassed: boolean) => void;
    /** 选中节点回调 */
    onSelectNode?: (nodeId: string) => void;
    /** 刷新拓扑数据回调 */
    onRefresh?: () => void;
    /** 自定义操作插槽 */
    actions?: Snippet | undefined;
    class?: string | undefined;
  }

  let {
    nodes = [],
    edges = [],
    title = '多云微服务实时流量拓扑与链路监控',
    readonly = false,
    onToggleBypass,
    onSelectNode,
    onRefresh,
    actions,
    class: className = ''
  }: TrafficTopologyInspectorProps = $props();

  let selectedNodeId = $state<string | null>(nodes.length > 0 ? nodes[0].id : null);
  let isRefreshing = $state(false);

  async function handleRefresh() {
    if (isRefreshing) return;
    isRefreshing = true;
    try {
      onRefresh?.();
    } finally {
      setTimeout(() => {
        isRefreshing = false;
      }, 500);
    }
  }

  function handleNodeClick(id: string) {
    selectedNodeId = id;
    onSelectNode?.(id);
  }

  function handleBypassToggle(node: TopologyNode) {
    if (readonly) return;
    const nextBypassed = node.status !== 'bypassed';
    onToggleBypass?.(node.id, nextBypassed);
  }

  function getNodeStatusBadge(status: TopologyNodeStatus) {
    switch (status) {
      case 'healthy':
        return { label: '运行平稳', class: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400' };
      case 'warning':
        return { label: '延迟偏高', class: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400' };
      case 'critical':
        return { label: '异常告警', class: 'bg-rose-500/15 text-rose-600 border-rose-500/30 dark:text-rose-400' };
      default:
        return { label: '已熔断旁路', class: 'bg-muted text-muted-foreground border-border' };
    }
  }

  const selectedNode = $derived(nodes.find((n) => n.id === selectedNodeId) ?? nodes[0] ?? null);

  const clusterMetrics = $derived.by(() => {
    let totalQps = 0;
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    for (const n of nodes) {
      totalQps += n.qps;
      if (n.status === 'healthy') healthyCount++;
      else if (n.status === 'warning') warningCount++;
      else if (n.status === 'critical') criticalCount++;
    }

    return { totalQps, healthyCount, warningCount, criticalCount, totalNodes: nodes.length };
  });
</script>

<div
  class={cn(
    'flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden',
    className
  )}
  data-svadmin-component="TrafficTopologyInspector"
>
  <!-- 头部总览条 -->
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Network class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-sm font-semibold text-foreground">{title}</h3>
        <p class="text-xs text-muted-foreground">微服务调用链吞吐量、响应延迟（p99）与动态旁路切流控制</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3 text-xs">
      <div class="flex items-center gap-2 border-r border-border pr-3">
        <span class="text-muted-foreground">全集群总 QPS：</span>
        <strong class="font-mono text-sm text-foreground">{clusterMetrics.totalQps.toLocaleString()}</strong>
      </div>

      <div class="flex items-center gap-1.5">
        <span class="flex h-2 w-2 rounded-full bg-emerald-500"></span>
        <span>正常 {clusterMetrics.healthyCount}</span>
        <span class="flex h-2 w-2 rounded-full bg-amber-500 ml-1"></span>
        <span>预警 {clusterMetrics.warningCount}</span>
        <span class="flex h-2 w-2 rounded-full bg-rose-500 ml-1"></span>
        <span>故障 {clusterMetrics.criticalCount}</span>
      </div>

      <button
        type="button"
        class="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        disabled={isRefreshing}
        onclick={handleRefresh}
      >
        <RefreshCw class={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin text-primary')} />
        刷新拓扑
      </button>

      {#if actions}
        {@render actions()}
      {/if}
    </div>
  </header>

  <!-- 拓扑工作区：主拓扑矩阵 + 节点详情抽屉 -->
  <div class="grid grid-cols-1 divide-y divide-border lg:grid-cols-12 lg:divide-x lg:divide-y-0 text-xs">
    <!-- 左侧：拓扑调用链路卡片群 (8 列) -->
    <div class="flex flex-col gap-4 p-5 lg:col-span-8 bg-muted/10">
      <div class="flex items-center justify-between text-muted-foreground">
        <span class="font-semibold text-foreground">微服务拓扑节点矩阵 ({nodes.length})</span>
        <span>点击节点查看链路详情或执行旁路熔断</span>
      </div>

      <!-- 节点网格卡片 -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {#each nodes as node (node.id)}
          {@const statusBadge = getNodeStatusBadge(node.status)}
          <div
            class={cn(
              'flex flex-col gap-2 rounded-xl border p-4 transition-all cursor-pointer shadow-xs',
              selectedNodeId === node.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-card hover:border-primary/50'
            )}
            onclick={() => handleNodeClick(node.id)}
            role="button"
            tabindex="0"
            onkeydown={(e) => {
              if (e.key === 'Enter') handleNodeClick(node.id);
            }}
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Server class="h-4 w-4" />
                </div>
                <div>
                  <h4 class="font-bold text-foreground text-xs">{node.label}</h4>
                  {#if node.region}
                    <span class="text-[10px] text-muted-foreground">{node.region}</span>
                  {/if}
                </div>
              </div>

              <span class={cn('rounded border px-1.5 py-0.2 text-[10px] font-semibold', statusBadge.class)}>
                {statusBadge.label}
              </span>
            </div>

            <!-- 指标列 -->
            <div class="grid grid-cols-3 gap-1 pt-1 border-t border-border/60 text-muted-foreground text-[11px]">
              <div>
                <span>QPS</span>
                <strong class="block font-mono text-foreground">{node.qps}</strong>
              </div>
              <div>
                <span>p99 延迟</span>
                <span class={cn('block font-mono font-medium', node.latencyMsP99 > 200 ? 'text-rose-600' : 'text-foreground')}>
                  {node.latencyMsP99} ms
                </span>
              </div>
              <div>
                <span>错误率</span>
                <span class={cn('block font-mono font-medium', node.errorRatePercent > 1 ? 'text-rose-600' : 'text-foreground')}>
                  {node.errorRatePercent}%
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- 节点间关系边示意流 -->
      {#if edges.length > 0}
        <div class="rounded-lg border border-border bg-card p-3 space-y-2">
          <div class="font-semibold text-foreground text-[11px]">活跃调用链路流向 (Edges)</div>
          <div class="flex flex-wrap gap-2">
            {#each edges as edge (edge.id)}
              <div class="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                <span class="font-medium text-foreground">{edge.from}</span>
                <ArrowRight class="h-3 w-3 text-muted-foreground" />
                <span class="font-medium text-foreground">{edge.to}</span>
                {#if edge.protocol}
                  <span class="rounded bg-muted px-1 font-mono text-[9px]">{edge.protocol}</span>
                {/if}
                {#if edge.trafficPercentage !== undefined}
                  <span class="text-primary font-mono text-[10px] font-semibold">{edge.trafficPercentage}%</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- 右侧：选中节点详情与旁路熔断控制 (4 列) -->
    <div class="flex flex-col gap-4 p-5 lg:col-span-4 bg-card">
      {#if selectedNode}
        {@const statusBadge = getNodeStatusBadge(selectedNode.status)}
        <div class="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h4 class="text-sm font-bold text-foreground">{selectedNode.label}</h4>
            <span class="text-muted-foreground text-[11px]">节点 ID: <code class="font-mono">{selectedNode.id}</code></span>
          </div>
          <span class={cn('rounded border px-2 py-0.5 text-xs font-semibold', statusBadge.class)}>
            {statusBadge.label}
          </span>
        </div>

        <!-- 详细指标 -->
        <div class="flex flex-col gap-2.5 text-muted-foreground">
          <div class="flex justify-between">
            <span>服务类型：</span>
            <span class="font-mono uppercase text-foreground">{selectedNode.type}</span>
          </div>
          {#if selectedNode.region}
            <div class="flex justify-between">
              <span>部署地域 / 可用区：</span>
              <span class="text-foreground">{selectedNode.region}</span>
            </div>
          {/if}
          {#if selectedNode.activeInstances}
            <div class="flex justify-between">
              <span>容器实例数 (Pods)：</span>
              <span class="font-mono text-foreground font-semibold">{selectedNode.activeInstances} 个</span>
            </div>
          {/if}
          <div class="flex justify-between">
            <span>实时流量吞吐：</span>
            <span class="font-mono font-bold text-foreground">{selectedNode.qps} req/s</span>
          </div>
          <div class="flex justify-between">
            <span>p99 端到端耗时：</span>
            <span class="font-mono text-foreground">{selectedNode.latencyMsP99} ms</span>
          </div>
          <div class="flex justify-between">
            <span>HTTP 5xx 异常率：</span>
            <span class="font-mono text-foreground">{selectedNode.errorRatePercent}%</span>
          </div>
        </div>

        <!-- 旁路切流与熔断控制箱 -->
        <div class="mt-2 rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="font-semibold text-foreground block">流量旁路熔断控制</span>
              <span class="text-[11px] text-muted-foreground">
                {selectedNode.status === 'bypassed' ? '该节点已被踢出路由池' : '节点正正常承接线上流量'}
              </span>
            </div>
            {#if !readonly}
              <button
                type="button"
                class={cn(
                  'rounded-lg px-3 py-1.5 font-medium transition-colors',
                  selectedNode.status === 'bypassed'
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-rose-500 text-white hover:bg-rose-600'
                )}
                onclick={() => selectedNode && handleBypassToggle(selectedNode)}
              >
                {selectedNode.status === 'bypassed' ? '恢复上线' : '一键熔断旁路'}
              </button>
            {/if}
          </div>
        </div>
      {:else}
        <div class="py-12 text-center text-muted-foreground">
          请选择一个拓扑节点以查看监控详情
        </div>
      {/if}
    </div>
  </div>
</div>
