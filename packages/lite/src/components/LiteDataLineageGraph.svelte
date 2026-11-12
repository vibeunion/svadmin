<script lang="ts">
  interface LineageItem {
    id: string;
    name: string;
    type: string;
    owner: string;
    rows?: string;
  }

  interface Props {
    title?: string;
    nodes?: LineageItem[];
    class?: string;
  }

  let {
    title = '数据全链路血缘溯源',
    nodes = [
      { id: '1', name: 'src_erp_orders', type: '源数据表', owner: 'ERP 业务库', rows: '1.2M 行' },
      { id: '2', name: 'dwd_orders_cleaned', type: 'ETL 清洗', owner: 'Flink 流清洗' },
      { id: '3', name: 'dws_finance_monthly', type: '财务数仓宽表', owner: '财务数仓宽表', rows: '120K 行' },
      { id: '4', name: '上市公司经营报表', type: '消费报表', owner: '经营分析大屏' }
    ],
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-lineage-graph {className}"
  data-svadmin-component="LiteDataLineageGraph"
  role="region"
  aria-label="Data Lineage Graph"
>
  <header class="lite-lineage-header">
    <h4 class="lite-lineage-title">{title}</h4>
    <span class="lite-lineage-count">{nodes.length} 个血缘节点</span>
  </header>

  <div class="lite-lineage-body">
    {#each nodes as node, idx (node.id)}
      <div class="lite-lineage-step">
        <div class="lite-step-num">{idx + 1}</div>
        <div class="lite-step-info">
          <div class="lite-step-top">
            <span class="lite-step-name font-mono">{node.name}</span>
            <span class="lite-step-type">{node.type}</span>
          </div>
          <div class="lite-step-owner">归属: {node.owner} {#if node.rows}· {node.rows}{/if}</div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .lite-lineage-graph {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-lineage-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-lineage-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-lineage-count { font-size: 11px; color: #86909c; }
  .lite-lineage-body { padding: 12px 14px; }
  .lite-lineage-step {
    display: flex;
    align-items: flex-start;
    padding-bottom: 10px;
    margin-bottom: 10px;
    border-bottom: 1px dashed #e5e6eb;
  }
  .lite-lineage-step:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .lite-step-num {
    width: 20px;
    height: 20px;
    line-height: 20px;
    text-align: center;
    border-radius: 50%;
    background: #165dff;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    margin-right: 10px;
  }
  .lite-step-info { flex: 1; }
  .lite-step-top { display: flex; justify-content: space-between; align-items: center; }
  .lite-step-name { font-weight: 600; color: #1d2129; }
  .font-mono { font-family: monospace; }
  .lite-step-type { font-size: 10px; background: #e8f3ff; color: #165dff; padding: 1px 6px; border-radius: 3px; }
  .lite-step-owner { font-size: 11px; color: #86909c; margin-top: 2px; }
</style>
