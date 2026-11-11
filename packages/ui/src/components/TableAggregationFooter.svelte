<script lang="ts">
  import { Calculator, CheckSquare } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';

  export type AggregationOp = 'sum' | 'avg' | 'min' | 'max' | 'count';

  export interface AggregationColumnConfig {
    key: string;
    label?: string | undefined;
    align?: ('left' | 'center' | 'right') | undefined;
    op?: AggregationOp | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
    precision?: number | undefined;
  }

  export interface TableAggregationFooterProps {
    columns: AggregationColumnConfig[];
    pageRows?: Record<string, unknown>[] | undefined;
    selectedRows?: Record<string, unknown>[] | undefined;
    overallTotal?: Record<string, number | string> | undefined;
    titleColumnKey?: string | undefined;
    title?: string | undefined;
    class?: string | undefined;
  }

  let {
    columns = [],
    pageRows = [],
    selectedRows = [],
    overallTotal = {},
    titleColumnKey,
    title,
    class: className = '',
  }: TableAggregationFooterProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  const firstColKey = $derived(titleColumnKey ?? (columns[0]?.key ?? ''));

  function computeValue(rows: Record<string, unknown>[], key: string, op: AggregationOp = 'sum', precision = 2): string {
    if (!rows.length) return '—';
    if (op === 'count') return String(rows.length);

    const nums = rows
      .map((r) => Number(r[key]))
      .filter((n) => !isNaN(n) && Number.isFinite(n));

    if (nums.length === 0) return '—';

    let result = 0;
    switch (op) {
      case 'sum':
        result = nums.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        result = nums.reduce((a, b) => a + b, 0) / nums.length;
        break;
      case 'min':
        result = Math.min(...nums);
        break;
      case 'max':
        result = Math.max(...nums);
        break;
    }

    return result.toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  }

  const hasSelection = $derived(selectedRows.length > 0);
  const resolvedTitle = $derived(title ?? (chinese ? '合计' : 'Total'));
</script>

<div
  data-svadmin-component="TableAggregationFooter"
  class={cn(
    'sticky bottom-0 z-20 w-full overflow-x-auto border-t-2 border-border/80 bg-card/95 backdrop-blur-md shadow-xs text-xs font-mono',
    className,
  )}
>
  <table class="w-full text-left border-collapse">
    <tbody class="divide-y divide-border/40">
      <!-- Row 1: Selected Rows Dynamic Aggregation (only if user selected rows) -->
      {#if hasSelection}
        <tr class="h-9 bg-primary/5 text-primary">
          {#each columns as col (col.key)}
            {@const isTitle = col.key === firstColKey}
            {@const align = col.align ?? 'left'}
            <td
              class={cn(
                'px-4 py-1.5 whitespace-nowrap',
                align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
              )}
            >
              {#if isTitle}
                <div class="flex items-center gap-1.5 font-sans font-bold">
                  <CheckSquare class="h-3.5 w-3.5" />
                  <span>{chinese ? `已选 ${selectedRows.length} 行合计` : `Selected (${selectedRows.length}) Sum`}</span>
                </div>
              {:else if col.op}
                {@const val = computeValue(selectedRows, col.key, col.op, col.precision ?? 2)}
                <span class="font-bold">
                  {col.prefix ?? ''}{val}{col.suffix ?? ''}
                </span>
              {:else}
                <span class="opacity-30">—</span>
              {/if}
            </td>
          {/each}
        </tr>
      {/if}

      <!-- Row 2: Page Subtotal Aggregation -->
      <tr class="h-9 text-foreground font-semibold">
        {#each columns as col (col.key)}
          {@const isTitle = col.key === firstColKey}
          {@const align = col.align ?? 'left'}
          <td
            class={cn(
              'px-4 py-1.5 whitespace-nowrap',
              align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
            )}
          >
            {#if isTitle}
              <div class="flex items-center gap-1.5 font-sans">
                <Calculator class="h-3.5 w-3.5 text-muted-foreground" />
                <span>{chinese ? '当前页小计' : 'Page Subtotal'}</span>
              </div>
            {:else if col.op}
              {@const val = computeValue(pageRows, col.key, col.op, col.precision ?? 2)}
              <span>
                {col.prefix ?? ''}{val}{col.suffix ?? ''}
              </span>
            {:else}
              <span class="opacity-30">—</span>
            {/if}
          </td>
        {/each}
      </tr>

      <!-- Row 3: Overall Server Total (if provided) -->
      {#if Object.keys(overallTotal).length > 0}
        <tr class="h-9 bg-muted/30 text-muted-foreground">
          {#each columns as col (col.key)}
            {@const isTitle = col.key === firstColKey}
            {@const align = col.align ?? 'left'}
            <td
              class={cn(
                'px-4 py-1.5 whitespace-nowrap',
                align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
              )}
            >
              {#if isTitle}
                <span class="font-sans font-bold text-foreground">{resolvedTitle}</span>
              {:else if overallTotal[col.key] !== undefined}
                <span class="font-bold text-foreground">
                  {col.prefix ?? ''}{overallTotal[col.key]}{col.suffix ?? ''}
                </span>
              {:else}
                <span class="opacity-30">—</span>
              {/if}
            </td>
          {/each}
        </tr>
      {/if}
    </tbody>
  </table>
</div>
