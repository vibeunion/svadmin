<script lang="ts">
  import { untrack } from 'svelte';
  import { Database, Cpu, Table, FileSpreadsheet, Globe, ArrowRight } from '@lucide/svelte';

  export type LineageNodeType = 'source' | 'transform' | 'dataset' | 'report' | 'api';

  export interface LineageNode {
    id: string;
    name: string;
    type: LineageNodeType;
    owner?: string | undefined;
    rows?: number | string | undefined;
    updateFrequency?: string | undefined;
    fields?: string[] | undefined;
  }

  export interface LineageEdge {
    source: string;
    target: string;
    transformationType?: 'direct' | 'aggregate' | 'sql' | 'filter' | undefined;
  }

  export interface DataLineageGraphProps {
    title?: string | undefined;
    nodes?: LineageNode[] | undefined;
    edges?: LineageEdge[] | undefined;
    selectedNodeId?: string | undefined;
    class?: string | undefined;
    onselectnode?: ((node: LineageNode) => void) | undefined;
  }

  const defaultStarterNodes: LineageNode[] = [
    { id: 'src_orders', name: 'src_erp_orders', type: 'source', owner: 'ERP 业务库', rows: '1.2M 行', fields: ['order_id', 'amount', 'tax', 'created_at'] },
    { id: 'src_crm', name: 'src_crm_customers', type: 'source', owner: 'CRM 平台', rows: '450K 行', fields: ['cust_id', 'cust_name', 'tier'] },
    { id: 'etl_clean', name: 'dwd_orders_cleaned', type: 'transform', owner: 'Flink 流清洗', updateFrequency: '实时秒级' },
    { id: 'dws_fin', name: 'dws_finance_monthly', type: 'dataset', owner: '财务数仓宽表', rows: '120K 行', updateFrequency: '每日 02:00', fields: ['month', 'gmv', 'net_profit'] },
    { id: 'rep_fin', name: '上市公司经营报表', type: 'report', owner: '经营分析大屏' },
    { id: 'api_export', name: 'tax_audit_export_api', type: 'api', owner: '税务稽核接口' }
  ];

  const defaultStarterEdges: LineageEdge[] = [
    { source: 'src_orders', target: 'etl_clean', transformationType: 'direct' },
    { source: 'src_crm', target: 'dws_fin', transformationType: 'filter' },
    { source: 'etl_clean', target: 'dws_fin', transformationType: 'aggregate' },
    { source: 'dws_fin', target: 'rep_fin', transformationType: 'sql' },
    { source: 'dws_fin', target: 'api_export', transformationType: 'direct' }
  ];

  let {
    title = '数据全链路血缘溯源拓扑图',
    nodes = defaultStarterNodes,
    edges = defaultStarterEdges,
    selectedNodeId = undefined,
    class: className = '',
    onselectnode = undefined,
  }: DataLineageGraphProps = $props();

  let activeNodeId = $state<string | undefined>(untrack(() => selectedNodeId ?? nodes[0]?.id));

  const activeNode = $derived(nodes.find((n) => n.id === activeNodeId) ?? nodes[0]);

  // Compute connected nodes for highlighting
  const connectedNodeIds = $derived.by(() => {
    if (!activeNodeId) return new Set<string>();
    const set = new Set<string>([activeNodeId]);
    for (const e of edges) {
      if (e.source === activeNodeId) set.add(e.target);
      if (e.target === activeNodeId) set.add(e.source);
    }
    return set;
  });

  function getNodeMeta(type: LineageNodeType) {
    switch (type) {
      case 'source':
        return { label: '源数据表', icon: Database, badge: 'bg-info/10 text-info border-info/20' };
      case 'transform':
        return { label: 'ETL 处理', icon: Cpu, badge: 'bg-warning/10 text-warning border-warning/20' };
      case 'dataset':
        return { label: '主题宽表', icon: Table, badge: 'bg-primary/10 text-primary border-primary/20' };
      case 'report':
        return { label: '分析报表', icon: FileSpreadsheet, badge: 'bg-success/10 text-success border-success/20' };
      case 'api':
        return { label: '数据接口', icon: Globe, badge: 'bg-primary/15 text-primary border-primary/30' };
    }
  }

  function handleSelect(node: LineageNode) {
    activeNodeId = node.id;
    onselectnode?.(node);
  }
</script>

<div
  class="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm {className}"
  data-svadmin-component="DataLineageGraph"
>
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
    <div class="flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Database class="h-4 w-4" />
      </div>
      <div>
        <h3 class="text-sm font-semibold text-foreground">{title}</h3>
        <p class="text-xs text-muted-foreground">上下游依赖拓扑、字段级转换规则与变更影响面评估</p>
      </div>
    </div>
    <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span class="inline-flex h-2 w-2 rounded-full bg-primary"></span>
      <span>选中高亮血缘全链路</span>
    </div>
  </header>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <!-- Graph Canvas Left -->
    <div class="lg:col-span-2 rounded-lg border border-border bg-muted/20 p-4 min-h-[300px] flex flex-col justify-between">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#each nodes as node (node.id)}
          {@const meta = getNodeMeta(node.type)}
          {@const isSelected = activeNodeId === node.id}
          {@const isConnected = connectedNodeIds.has(node.id)}
          <div
            role="button"
            tabindex="0"
            class="rounded-lg border p-3 cursor-pointer transition-all {isSelected ? 'border-primary ring-2 ring-primary/20 bg-card shadow-sm' : isConnected ? 'border-border bg-card shadow-2xs' : 'border-border/60 bg-card/60 opacity-60'}"
            onclick={() => handleSelect(node)}
            onkeydown={(e) => { if (e.key === 'Enter') handleSelect(node); }}
          >
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <span class="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold {meta.badge}">
                <meta.icon class="h-3 w-3" />
                <span>{meta.label}</span>
              </span>
              {#if node.rows}
                <span class="text-[10px] font-mono text-muted-foreground">{node.rows}</span>
              {/if}
            </div>
            <div class="font-mono text-xs font-bold text-foreground truncate">{node.name}</div>
            {#if node.owner}
              <div class="text-[11px] text-muted-foreground mt-1 truncate">归属: {node.owner}</div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Edge Relationships Flow -->
      <div class="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted-foreground">
        {#each edges as edge (edge.source + edge.target)}
          <span class="inline-flex items-center gap-1 bg-background px-2 py-0.5 rounded border border-border">
            <span>{edge.source}</span>
            <ArrowRight class="h-3 w-3 text-primary" />
            <span>{edge.target}</span>
          </span>
        {/each}
      </div>
    </div>

    <!-- Right Inspector Panel -->
    <div class="rounded-lg border border-border bg-muted/30 p-3.5 flex flex-col gap-3">
      {#if activeNode}
        {@const activeMeta = getNodeMeta(activeNode.type)}
        <div class="flex items-center justify-between border-b border-border pb-2">
          <span class="text-xs font-semibold text-foreground">节点元数据详情</span>
          <span class="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold {activeMeta.badge}">
            <activeMeta.icon class="h-3 w-3" />
            <span>{activeMeta.label}</span>
          </span>
        </div>

        <div class="space-y-2 text-xs">
          <div>
            <span class="text-muted-foreground">资产名称:</span>
            <div class="font-mono font-bold text-foreground mt-0.5">{activeNode.name}</div>
          </div>
          {#if activeNode.owner}
            <div>
              <span class="text-muted-foreground">负责平台/部门:</span>
              <div class="text-foreground mt-0.5">{activeNode.owner}</div>
            </div>
          {/if}
          {#if activeNode.updateFrequency}
            <div>
              <span class="text-muted-foreground">调度频次:</span>
              <div class="font-mono text-foreground mt-0.5">{activeNode.updateFrequency}</div>
            </div>
          {/if}
          {#if activeNode.fields && activeNode.fields.length > 0}
            <div>
              <span class="text-muted-foreground">包含核心字段清单:</span>
              <div class="flex flex-wrap gap-1 mt-1">
                {#each activeNode.fields as field (field)}
                  <span class="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border border-border text-foreground">
                    {field}
                  </span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
