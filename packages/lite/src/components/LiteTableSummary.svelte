<script lang="ts">
  interface LiteTableSummaryColumn {
    key: string;
    label?: string;
    align?: 'left' | 'center' | 'right';
  }

  interface Props {
    columns: LiteTableSummaryColumn[];
    data?: Record<string, unknown>[];
    aggregations?: Record<string, string | ((rows: Record<string, unknown>[]) => string | number)>;
    title?: string;
    titleColumnKey?: string;
    prefix?: Record<string, string>;
    suffix?: Record<string, string>;
  }

  let {
    columns,
    data = [],
    aggregations = {},
    title = 'Total',
    titleColumnKey,
    prefix = {},
    suffix = {},
  }: Props = $props();

  const titleKey = $derived(titleColumnKey || (columns[0]?.key ?? ''));

  function calculate(key: string, type: unknown): string | number {
    if (!data.length) return '—';
    if (typeof type === 'function') return type(data);
    if (type === 'count') return data.length;

    const numbers = data
      .map((row) => Number(row[key]))
      .filter((val) => !isNaN(val) && val !== null && val !== undefined);

    if (numbers.length === 0) return '—';

    if (type === 'sum') {
      const sum = numbers.reduce((acc, curr) => acc + curr, 0);
      return Number.isInteger(sum) ? sum : sum.toFixed(2);
    }
    if (type === 'avg') {
      const avg = numbers.reduce((acc, curr) => acc + curr, 0) / numbers.length;
      return avg.toFixed(2);
    }
    return '—';
  }
</script>

<div class="lite-table-summary-container">
  <table class="lite-table lite-summary-table">
    <tbody>
      <tr>
        {#each columns as col (col.key)}
          {@const isTitle = col.key === titleKey}
          {@const aggType = aggregations[col.key]}
          <td style="text-align: {col.align || 'left'}; font-weight: {isTitle || aggType ? 'bold' : 'normal'};">
            {#if isTitle && !aggType}
              <span>{title}</span>
            {:else if aggType}
              <span>
                {#if prefix[col.key]}{prefix[col.key]}{/if}{calculate(col.key, aggType)}{#if suffix[col.key]}{suffix[col.key]}{/if}
              </span>
            {:else}
              <span style="color: #94a3b8;">—</span>
            {/if}
          </td>
        {/each}
      </tr>
    </tbody>
  </table>
</div>

<style>
  .lite-table-summary-container {
    width: 100%;
    overflow-x: auto;
    background: #f8fafc;
    border-top: 2px solid #cbd5e1;
  }
  .lite-summary-table {
    width: 100%;
    margin-bottom: 0;
  }
  .lite-summary-table td {
    padding: 8px 12px;
    font-size: 12px;
    color: #1e293b;
  }
</style>
