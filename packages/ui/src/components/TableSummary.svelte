<script lang="ts">
  import { cn } from '../utils.js';

  export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | ((rows: Record<string, unknown>[]) => string | number);

  export interface TableSummaryColumn {
    key: string;
    label?: string;
    align?: 'left' | 'center' | 'right';
  }

  interface Props {
    columns: TableSummaryColumn[];
    data: Record<string, unknown>[];
    aggregations: Record<string, AggregationType>;
    title?: string;
    titleColumnKey?: string;
    prefix?: Record<string, string>;
    suffix?: Record<string, string>;
    precision?: Record<string, number>;
    class?: string;
  }

  let {
    columns,
    data = [],
    aggregations = {},
    title = 'Total',
    titleColumnKey,
    prefix = {},
    suffix = {},
    precision = {},
    class: className = '',
  }: Props = $props();

  const titleKey = $derived(titleColumnKey || (columns[0]?.key ?? ''));

  function calculateAggregation(key: string, type: AggregationType): string | number {
    if (!data.length) return '—';

    if (typeof type === 'function') {
      return type(data);
    }

    if (type === 'count') {
      return data.length;
    }

    const numbers = data
      .map((row) => Number(row[key]))
      .filter((val) => !isNaN(val) && val !== null && val !== undefined);

    if (numbers.length === 0) return '—';

    const p = precision[key] !== undefined ? precision[key] : 2;

    switch (type) {
      case 'sum': {
        const total = numbers.reduce((acc, curr) => acc + curr, 0);
        return Number.isInteger(total) && p === 0 ? total : total.toFixed(p);
      }
      case 'avg': {
        const avg = numbers.reduce((acc, curr) => acc + curr, 0) / numbers.length;
        return avg.toFixed(p);
      }
      case 'min': {
        const min = Math.min(...numbers);
        return Number.isInteger(min) && p === 0 ? min : min.toFixed(p);
      }
      case 'max': {
        const max = Math.max(...numbers);
        return Number.isInteger(max) && p === 0 ? max : max.toFixed(p);
      }
      default:
        return '—';
    }
  }
</script>

<div class={cn('w-full overflow-x-auto border-t-2 border-border/80 bg-muted/30 font-medium text-xs text-foreground', className)}>
  <table class="w-full text-left border-collapse">
    <tbody>
      <tr class="h-10">
        {#each columns as col (col.key)}
          {@const isTitle = col.key === titleKey}
          {@const aggType = aggregations[col.key]}
          {@const align = col.align || 'left'}
          <td
            class={cn(
              'px-4 py-2 tabular-nums',
              align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
              isTitle ? 'font-semibold text-foreground' : 'text-muted-foreground'
            )}
          >
            {#if isTitle && !aggType}
              <span>{title}</span>
            {:else if aggType}
              {@const result = calculateAggregation(col.key, aggType)}
              <span class="font-semibold text-foreground">
                {#if prefix[col.key]}{prefix[col.key]}{/if}{result}{#if suffix[col.key]}{suffix[col.key]}{/if}
              </span>
            {:else}
              <span class="opacity-40">—</span>
            {/if}
          </td>
        {/each}
      </tr>
    </tbody>
  </table>
</div>
