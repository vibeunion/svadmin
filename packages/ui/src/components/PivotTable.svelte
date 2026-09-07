<script lang="ts">
  import { cn } from '../utils.js';

  export type AggregationFn = 'sum' | 'count' | 'avg' | 'min' | 'max';

  interface Props {
    data: Record<string, unknown>[];
    rowField: string;
    rowLabel?: string;
    columnField: string;
    columnLabel?: string;
    valueField: string;
    valueLabel?: string;
    aggregator?: AggregationFn;
    formatValue?: (val: number) => string;
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
    formatValue = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }),
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

  const pivotMatrix = $derived(() => {
    const map = new Map<string, number[]>();
    for (const item of data) {
      const r = String(item[rowField] ?? '—');
      const c = String(item[columnField] ?? '—');
      const key = `${r}:::${c}`;
      const num = Number(item[valueField]) || 0;
      const existing = map.get(key);
      if (existing) {
        existing.push(num);
      } else {
        map.set(key, [num]);
      }
    }
    return map;
  });

  function getCellValue(r: string, c: string): number {
    const key = `${r}:::${c}`;
    const vals = pivotMatrix().get(key) ?? [];
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

<div class={cn('svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-cef5b893cf23 svadmin-u-359090c2d529 svadmin-u-6ed543e2fbbb', className)}>
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
    <div class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">
      Pivot Analysis <span class="svadmin-u-bfa603190748 svadmin-u-8ecebc9f80e6">({rowLabel} × {columnLabel})</span>
    </div>
    <div class="svadmin-u-bfa603190748">
      Aggregator: <strong class="svadmin-u-20aaf08a7ed1 uppercase">{aggregator}</strong> ({valueLabel})
    </div>
  </div>

  <div class="svadmin-u-1384f66f41d0 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff">
    <table class="svadmin-u-6da6a3c3f741 svadmin-u-308fc069e46e svadmin-u-4583f90cd9bd">
      <thead class="svadmin-u-b00f43c30c2b svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
        <tr>
          <th class="svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-2eba0d65d059 svadmin-u-706701550477">{rowLabel} \ {columnLabel}</th>
          {#each distinctColValues as col (col)}
            <th class="svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{col}</th>
          {/each}
          <th class="svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-706701550477 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">Total</th>
        </tr>
      </thead>
      <tbody class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258 svadmin-u-0e65706bcccd">
        {#each distinctRowValues as row (row)}
          <tr class="svadmin-u-c4b5eaba40e3 svadmin-u-ceb69a6b0e5f">
            <td class="svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-2eba0d65d059 svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-967d113a1451 svadmin-u-79bf1259388b">{row}</td>
            {#each distinctColValues as col (col)}
              {@const val = getCellValue(row, col)}
              <td class={cn('svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b', val === 0 ? 'svadmin-u-52183a1cca53' : 'svadmin-u-d4108abe6359')}>
                {formatValue(val)}
              </td>
            {/each}
            <td class="svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-967d113a1451">
              {formatValue(getRowTotal(row))}
            </td>
          </tr>
        {/each}
      </tbody>
      <tfoot class="svadmin-u-706701550477 svadmin-u-e83a7042bc91 svadmin-u-0e65706bcccd svadmin-u-bee68af349c9 svadmin-u-18049387f0af svadmin-u-d4108abe6359">
        <tr>
          <td class="svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-2eba0d65d059 svadmin-u-79bf1259388b">Grand Total</td>
          {#each distinctColValues as col (col)}
            <td class="svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe">{formatValue(getColTotal(col))}</td>
          {/each}
          <td class="svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-20aaf08a7ed1">{formatValue(grandTotal)}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>
