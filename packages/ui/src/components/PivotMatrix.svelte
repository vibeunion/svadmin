<script lang="ts">
  import { untrack } from 'svelte';

  export interface PivotDimension {
    id: string;
    label: string;
    field: string;
  }

  export interface PivotMeasure {
    id: string;
    label: string;
    field: string;
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
    format?: ((val: number) => string) | undefined;
  }

  export interface PivotMatrixProps {
    data?: Record<string, unknown>[] | undefined;
    rowDimensions?: PivotDimension[] | undefined;
    colDimensions?: PivotDimension[] | undefined;
    measures?: PivotMeasure[] | undefined;
    showRowTotals?: boolean | undefined;
    showColTotals?: boolean | undefined;
    heatmap?: boolean | undefined;
    title?: string | undefined;
    class?: string | undefined;
    onCellClick?: ((params: { rowKey: string; colKey: string; value: number; records: Record<string, unknown>[] }) => void) | undefined;
  }

  const {
    data = [],
    rowDimensions = [
      { id: 'region', label: '区域', field: 'region' },
      { id: 'dept', label: '部门', field: 'dept' }
    ],
    colDimensions = [
      { id: 'quarter', label: '季度', field: 'quarter' }
    ],
    measures = [
      { id: 'revenue', label: '销售额', field: 'revenue', aggregation: 'sum' }
    ],
    showRowTotals = true,
    showColTotals = true,
    heatmap = true,
    title = '多维交叉透视分析矩阵',
    class: className = '',
    onCellClick = undefined
  }: PivotMatrixProps = $props();

  let activeMeasureId = $state(untrack(() => measures[0]?.id ?? ''));

  const currentMeasure = $derived(
    measures.find(m => m.id === activeMeasureId) ?? measures[0] ?? {
      id: 'default',
      label: '数值',
      field: 'value',
      aggregation: 'sum' as const
    }
  );

  const matrixComputation = $derived.by(() => {
    const rowMap = new Map<string, Record<string, unknown>[]>();
    const colSet = new Set<string>();

    for (const item of data) {
      const rowKey = rowDimensions.map(d => String(item[d.field] ?? '—')).join(' / ');
      const colKey = colDimensions.map(d => String(item[d.field] ?? '—')).join(' / ');

      colSet.add(colKey);
      if (!rowMap.has(rowKey)) {
        rowMap.set(rowKey, []);
      }
      const existing = rowMap.get(rowKey);
      if (existing) {
        existing.push(item);
      } else {
        rowMap.set(rowKey, [item]);
      }
    }

    const uniqueCols = Array.from(colSet).sort();
    const uniqueRows = Array.from(rowMap.keys()).sort();

    const aggregate = (records: Record<string, unknown>[], field: string, agg: string): number => {
      if (!records || records.length === 0) return 0;
      const values = records
        .map(r => Number(r[field]))
        .filter(v => !isNaN(v));
      if (values.length === 0) return 0;

      if (agg === 'sum') return values.reduce((a, b) => a + b, 0);
      if (agg === 'avg') return values.reduce((a, b) => a + b, 0) / values.length;
      if (agg === 'count') return values.length;
      if (agg === 'min') return Math.min(...values);
      if (agg === 'max') return Math.max(...values);
      return 0;
    };

    let maxVal = -Infinity;
    let minVal = Infinity;
    const grid: Record<string, Record<string, { val: number; records: Record<string, unknown>[] }>> = {};
    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};

    for (const r of uniqueRows) {
      grid[r] = {};
      const allRowRecords = rowMap.get(r) ?? [];
      rowTotals[r] = aggregate(allRowRecords, currentMeasure.field, currentMeasure.aggregation);

      for (const c of uniqueCols) {
        const matching = allRowRecords.filter(item => {
          const itemColKey = colDimensions.map(d => String(item[d.field] ?? '—')).join(' / ');
          return itemColKey === c;
        });

        const cellVal = aggregate(matching, currentMeasure.field, currentMeasure.aggregation);
        grid[r][c] = { val: cellVal, records: matching };

        if (cellVal > maxVal) maxVal = cellVal;
        if (cellVal < minVal) minVal = cellVal;
      }
    }

    for (const c of uniqueCols) {
      const allColRecords = data.filter(item => {
        const itemColKey = colDimensions.map(d => String(item[d.field] ?? '—')).join(' / ');
        return itemColKey === c;
      });
      colTotals[c] = aggregate(allColRecords, currentMeasure.field, currentMeasure.aggregation);
    }

    const grandTotal = aggregate(data, currentMeasure.field, currentMeasure.aggregation);

    return {
      rows: uniqueRows,
      cols: uniqueCols,
      grid,
      rowTotals,
      colTotals,
      grandTotal,
      maxVal: maxVal === -Infinity ? 0 : maxVal,
      minVal: minVal === Infinity ? 0 : minVal
    };
  });

  function formatValue(num: number): string {
    if (currentMeasure.format) {
      return currentMeasure.format(num);
    }
    return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  }

  function getHeatmapClass(val: number): string {
    if (!heatmap || matrixComputation.maxVal === matrixComputation.minVal) {
      return 'bg-card text-foreground';
    }
    const ratio = (val - matrixComputation.minVal) / (matrixComputation.maxVal - matrixComputation.minVal || 1);
    if (ratio > 0.75) return 'bg-primary/25 font-semibold text-foreground';
    if (ratio > 0.5) return 'bg-primary/15 text-foreground';
    if (ratio > 0.25) return 'bg-primary/10 text-foreground';
    return 'bg-card text-foreground';
  }
</script>

<div
  class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm {className}"
  data-svadmin-component="PivotMatrix"
>
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
    <div class="flex items-center gap-2">
      <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-medium text-foreground">{title}</h3>
        <p class="text-xs text-muted-foreground">
          行: {rowDimensions.map(d => d.label).join(' / ')} ✕ 列: {colDimensions.map(d => d.label).join(' / ')}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-1">
      <span class="px-2 text-xs text-muted-foreground">度量:</span>
      {#each measures as m (m.id)}
        <button
          type="button"
          class="rounded px-2.5 py-1 text-xs font-medium transition-colors {activeMeasureId === m.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
          onclick={() => { activeMeasureId = m.id; }}
        >
          {m.label} ({m.aggregation.toUpperCase()})
        </button>
      {/each}
    </div>
  </div>

  <div class="overflow-x-auto rounded-md border border-border">
    <table class="w-full border-collapse text-left text-xs">
      <thead>
        <tr class="border-b border-border bg-muted/50 font-medium text-muted-foreground">
          <th class="p-2.5 border-r border-border">
            {rowDimensions.map(d => d.label).join(' / ')}
          </th>
          {#each matrixComputation.cols as colHeader (colHeader)}
            <th class="p-2.5 text-right border-r border-border min-w-[90px]">
              {colHeader}
            </th>
          {/each}
          {#if showRowTotals}
            <th class="p-2.5 text-right font-semibold text-foreground bg-muted/80 min-w-[90px]">
              行汇总
            </th>
          {/if}
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#if matrixComputation.rows.length === 0}
          <tr>
            <td
              colspan={matrixComputation.cols.length + (showRowTotals ? 2 : 1)}
              class="p-6 text-center text-muted-foreground"
            >
              暂无透视数据
            </td>
          </tr>
        {:else}
          {#each matrixComputation.rows as rowKey (rowKey)}
            <tr class="hover:bg-muted/40 transition-colors">
              <td class="p-2.5 font-medium text-foreground border-r border-border bg-muted/10">
                {rowKey}
              </td>
              {#each matrixComputation.cols as colKey (colKey)}
                {@const cellData = matrixComputation.grid[rowKey]?.[colKey] ?? { val: 0, records: [] }}
                <td
                  class="p-2.5 text-right border-r border-border transition-colors cursor-pointer {getHeatmapClass(cellData.val)}"
                  onclick={() => onCellClick?.({ rowKey, colKey, value: cellData.val, records: cellData.records })}
                >
                  {formatValue(cellData.val)}
                </td>
              {/each}
              {#if showRowTotals}
                <td class="p-2.5 text-right font-semibold text-foreground bg-muted/30">
                  {formatValue(matrixComputation.rowTotals[rowKey] ?? 0)}
                </td>
              {/if}
            </tr>
          {/each}
        {/if}
      </tbody>
      {#if showColTotals && matrixComputation.rows.length > 0}
        <tfoot>
          <tr class="border-t-2 border-border bg-muted/60 font-semibold text-foreground">
            <td class="p-2.5 border-r border-border">列汇总</td>
            {#each matrixComputation.cols as colKey (colKey)}
              <td class="p-2.5 text-right border-r border-border">
                {formatValue(matrixComputation.colTotals[colKey] ?? 0)}
              </td>
            {/each}
            {#if showRowTotals}
              <td class="p-2.5 text-right text-primary font-bold bg-primary/10">
                {formatValue(matrixComputation.grandTotal)}
              </td>
            {/if}
          </tr>
        </tfoot>
      {/if}
    </table>
  </div>
</div>
