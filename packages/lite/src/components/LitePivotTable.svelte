<script lang="ts">
  export type AggregationFn = 'sum' | 'count' | 'avg' | 'min' | 'max';

  interface Props {
    data?: Record<string, unknown>[];
    rowField: string;
    rowLabel?: string;
    columnField: string;
    columnLabel?: string;
    valueField: string;
    valueLabel?: string;
    aggregator?: AggregationFn;
    class?: string;
  }

  let {
    data = [],
    rowField,
    rowLabel = rowField,
    columnField,
    columnLabel = columnField,
    valueField,
    valueLabel = valueField,
    aggregator = 'sum',
    class: className = '',
  }: Props = $props();

  const distinctRowValues = $derived(
    Array.from(new Set(data.map((d) => String(d[rowField] ?? '—')))).sort()
  );

  const distinctColValues = $derived(
    Array.from(new Set(data.map((d) => String(d[columnField] ?? '—')))).sort()
  );

  function computeAgg(vals: number[]): number {
    if (vals.length === 0) return 0;
    if (aggregator === 'count') return vals.length;
    if (aggregator === 'sum') return vals.reduce((a, b) => a + b, 0);
    if (aggregator === 'avg') return vals.reduce((a, b) => a + b, 0) / vals.length;
    if (aggregator === 'min') return Math.min(...vals);
    if (aggregator === 'max') return Math.max(...vals);
    return 0;
  }

  function getCellValue(r: string, c: string): number {
    const vals = data
      .filter((d) => String(d[rowField] ?? '—') === r && String(d[columnField] ?? '—') === c)
      .map((d) => Number(d[valueField]) || 0);
    return computeAgg(vals);
  }

  function getRowTotal(r: string): number {
    const vals = data
      .filter((d) => String(d[rowField] ?? '—') === r)
      .map((d) => Number(d[valueField]) || 0);
    return computeAgg(vals);
  }

  function getColTotal(c: string): number {
    const vals = data
      .filter((d) => String(d[columnField] ?? '—') === c)
      .map((d) => Number(d[valueField]) || 0);
    return computeAgg(vals);
  }

  const grandTotal = $derived(
    computeAgg(data.map((d) => Number(d[valueField]) || 0))
  );
</script>

<div class="sv-lite-pivot-container {className}">
  <div class="sv-lite-pivot-header">
    <strong>Pivot Analysis</strong> ({rowLabel} × {columnLabel})
    <span class="sv-lite-pivot-sub">Aggregator: {aggregator.toUpperCase()} ({valueLabel})</span>
  </div>

  <table class="sv-lite-pivot-table">
    <thead>
      <tr>
        <th class="sv-lite-th-dim">{rowLabel} \ {columnLabel}</th>
        {#each distinctColValues as col (col)}
          <th>{col}</th>
        {/each}
        <th class="sv-lite-th-total">Total</th>
      </tr>
    </thead>
    <tbody>
      {#each distinctRowValues as row (row)}
        <tr>
          <td class="sv-lite-td-dim">{row}</td>
          {#each distinctColValues as col (col)}
            {@const val = getCellValue(row, col)}
            <td class="sv-lite-td-val">{val.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
          {/each}
          <td class="sv-lite-td-rowtotal">{getRowTotal(row).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr>
        <td class="sv-lite-td-dim">Grand Total</td>
        {#each distinctColValues as col (col)}
          <td class="sv-lite-td-val">{getColTotal(col).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
        {/each}
        <td class="sv-lite-td-grandtotal">{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
      </tr>
    </tfoot>
  </table>
</div>

<style>
  .sv-lite-pivot-container {
    display: block;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px;
    background-color: #ffffff;
    font-size: 12px;
    overflow-x: auto;
  }
  .sv-lite-pivot-header {
    margin-bottom: 10px;
    font-size: 13px;
    color: #0f172a;
  }
  .sv-lite-pivot-sub {
    color: #64748b;
    font-size: 11px;
    margin-left: 8px;
  }
  .sv-lite-pivot-table {
    width: 100%;
    border-collapse: collapse;
    text-align: right;
  }
  .sv-lite-pivot-table th, .sv-lite-pivot-table td {
    border: 1px solid #e2e8f0;
    padding: 6px 10px;
  }
  .sv-lite-pivot-table thead {
    background-color: #f8fafc;
    color: #475569;
  }
  .sv-lite-th-dim, .sv-lite-td-dim {
    text-align: left;
    background-color: #f8fafc;
    font-weight: 600;
  }
  .sv-lite-th-total, .sv-lite-td-rowtotal {
    background-color: #f1f5f9;
    font-weight: 600;
  }
  .sv-lite-pivot-table tfoot {
    background-color: #f1f5f9;
    font-weight: bold;
    border-top: 2px solid #cbd5e1;
  }
  .sv-lite-td-grandtotal {
    color: #4338ca;
    font-weight: bold;
  }
</style>
