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

<div class={cn('svadmin-u-6da6a3c3f741 svadmin-u-1384f66f41d0 svadmin-u-bee68af349c9 svadmin-u-c9ed8c5f79ae svadmin-u-2859c861d7de svadmin-u-2689f3958069 svadmin-u-359090c2d529 svadmin-u-d4108abe6359', className)}>
  <table class="svadmin-u-6da6a3c3f741 svadmin-u-2eba0d65d059 svadmin-u-4583f90cd9bd">
    <tbody>
      <tr class="svadmin-u-426b8b75185b">
        {#each columns as col (col.key)}
          {@const isTitle = col.key === titleKey}
          {@const aggType = aggregations[col.key]}
          {@const align = col.align || 'left'}
          <td
            class={cn(
              'svadmin-u-f0faeb26d656 svadmin-u-03b4dd7f172b svadmin-u-3032cae0badb',
              align === 'right' ? 'svadmin-u-308fc069e46e' : align === 'center' ? 'svadmin-u-ca6bf63030aa' : 'svadmin-u-2eba0d65d059',
              isTitle ? 'svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359' : 'svadmin-u-bfa603190748'
            )}
          >
            {#if isTitle && !aggType}
              <span>{title}</span>
            {:else if aggType}
              {@const result = calculateAggregation(col.key, aggType)}
              <span class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">
                {#if prefix[col.key]}{prefix[col.key]}{/if}{result}{#if suffix[col.key]}{suffix[col.key]}{/if}
              </span>
            {:else}
              <span class="svadmin-u-2a2db4667b27">—</span>
            {/if}
          </td>
        {/each}
      </tr>
    </tbody>
  </table>
</div>
