<script lang="ts">
  interface AggItem {
    label: string;
    subtotal: string | number;
    grandTotal: string | number;
  }

  interface Props {

    aggregations?: AggItem[];
    selectedCount?: number;
    totalCount?: number;
    class?: string;
  }

  let {

    aggregations = [
      { label: '订单总金额 (¥)', subtotal: '¥ 128,450.00', grandTotal: '¥ 1,489,200.00' },
      { label: '已结算税额 (¥)', subtotal: '¥ 11,560.50', grandTotal: '¥ 134,028.00' },
      { label: '商品总件数', subtotal: '450 件', grandTotal: '5,200 件' }
    ],
    selectedCount = 12,
    totalCount = 140,
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-agg-footer {className}"
  data-svadmin-component="LiteTableAggregationFooter"
  role="region"
  aria-label="Table Aggregation Footer"
>
  <div class="lite-agg-left">
    <span class="lite-agg-selection">已选 <strong class="lite-count">{selectedCount}</strong> 项 / 共 {totalCount} 条记录</span>
  </div>

  <div class="lite-agg-right">
    {#each aggregations as agg (agg.label)}
      <div class="lite-agg-cell">
        <span class="lite-agg-label">{agg.label}</span>
        <div class="lite-agg-vals">
          <span class="lite-val-sub">选中小计: <strong>{agg.subtotal}</strong></span>
          <span class="lite-val-total">全表合计: <strong>{agg.grandTotal}</strong></span>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .lite-agg-footer {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #f7f8fa;
    padding: 10px 14px;
    font-size: 11px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
  }
  .lite-agg-footer > * + * { margin-left: 12px; }
  .lite-agg-left { color: #4e5969; }
  .lite-count { color: #165dff; }
  .lite-agg-right { display: flex; align-items: center; flex-wrap: wrap; }
  .lite-agg-right > * + * { margin-left: 16px; }
  .lite-agg-cell { display: flex; flex-direction: column; text-align: right; }
  .lite-agg-cell > * + * { margin-top: 2px; }
  .lite-agg-label { font-size: 10px; color: #86909c; font-weight: 500; }
  .lite-agg-vals { display: flex; font-family: monospace; font-size: 11px; }
  .lite-agg-vals > * + * { margin-left: 10px; }
  .lite-val-sub strong { color: #165dff; }
  .lite-val-total strong { color: #1d2129; }
</style>
