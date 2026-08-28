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

<div class={cn('rounded-xl border border-border bg-card p-4 shadow-xs text-xs space-y-3', className)}>
  <div class="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
    <div class="font-semibold text-foreground">
      Pivot Analysis <span class="text-muted-foreground font-normal">({rowLabel} × {columnLabel})</span>
    </div>
    <div class="text-muted-foreground">
      Aggregator: <strong class="text-primary uppercase">{aggregator}</strong> ({valueLabel})
    </div>
  </div>

  <div class="overflow-x-auto rounded-lg border border-border/60">
    <table class="w-full text-right border-collapse">
      <thead class="bg-muted/40 font-semibold text-muted-foreground border-b border-border/60">
        <tr>
          <th class="px-3 py-2.5 text-left bg-muted/60">{rowLabel} \ {columnLabel}</th>
          {#each distinctColValues as col (col)}
            <th class="px-3 py-2.5 font-semibold text-foreground">{col}</th>
          {/each}
          <th class="px-3 py-2.5 bg-muted/60 font-semibold text-foreground">Total</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/40 font-mono">
        {#each distinctRowValues as row (row)}
          <tr class="hover:bg-muted/20 transition-colors">
            <td class="px-3 py-2 text-left font-medium text-foreground bg-muted/20 font-sans">{row}</td>
            {#each distinctColValues as col (col)}
              {@const val = getCellValue(row, col)}
              <td class={cn('px-3 py-2', val === 0 ? 'text-muted-foreground/40' : 'text-foreground')}>
                {formatValue(val)}
              </td>
            {/each}
            <td class="px-3 py-2 font-semibold text-foreground bg-muted/20">
              {formatValue(getRowTotal(row))}
            </td>
          </tr>
        {/each}
      </tbody>
      <tfoot class="bg-muted/60 font-semibold font-mono border-t-2 border-border text-foreground">
        <tr>
          <td class="px-3 py-2.5 text-left font-sans">Grand Total</td>
          {#each distinctColValues as col (col)}
            <td class="px-3 py-2.5">{formatValue(getColTotal(col))}</td>
          {/each}
          <td class="px-3 py-2.5 text-primary">{formatValue(grandTotal)}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>
