<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { buildPivot, buildPivotDrilldown, decodePivotResult, formatPivotValue } from '@svadmin/core/pivot';
  export type AggregationFn = import('@svadmin/core/pivot').PivotAggregation;

  interface Props {
    data?: Record<string, unknown>[];
    aggregateData?: unknown;
    rowField: string;
    rowLabel?: string;
    columnField: string;
    columnLabel?: string;
    valueField: string;
    valueLabel?: string;
    aggregator?: AggregationFn;
    formatValue?: (value: number) => string;
    loading?: boolean;
    error?: string | undefined;
    retryHref?: string;
    exportHref?: string;
    drilldownHref?: (input: import('@svadmin/core/pivot').PivotDrilldown) => string | undefined;
    resource?: string;
    scopeKey?: string;
    filters?: import('@svadmin/core').Filter[];
    meta?: Record<string, unknown>;
    ariaLabel?: string;
    class?: string;
  }

  let {
    data = [],
    aggregateData,
    rowField,
    rowLabel = rowField,
    columnField,
    columnLabel = columnField,
    valueField,
    valueLabel = valueField,
    aggregator = 'sum',
    formatValue,
    loading = false,
    error,
    retryHref,
    exportHref,
    drilldownHref,
    resource,
    scopeKey,
    filters,
    meta,
    ariaLabel,
    class: className = '',
  }: Props = $props();

  const i18n = useTranslation();
  const pivot = $derived(aggregateData !== undefined ? decodePivotResult(aggregateData)
    : buildPivot(loading || error ? [] : data, { rowField, columnField, valueField, aggregator }));
  const displayError = $derived(error || (pivot.error ? i18n.t(`pivot.${pivot.error}`) : ''));
  // 重试仅接受站内绝对路径，避免在服务端页面输出可执行协议。
  const safeRetryHref = $derived(retryHref?.startsWith('/') && !/^\/[\\/]/.test(retryHref)
    && !/[\\\u0000-\u0020\u007f]/.test(retryHref) ? retryHref : undefined);
  const safeExportHref = $derived(exportHref?.startsWith('/') && !/^\/[\\/]/.test(exportHref)
    && !/[\\\u0000-\u0020\u007f]/.test(exportHref) ? exportHref : undefined);
  function safeHref(value: string | undefined): string | undefined {
    return value?.startsWith('/') && !/^\/[\\/]/.test(value)
      && !/[\\\u0000-\u0020\u007f]/.test(value) ? value : undefined;
  }
  function cellHref(rowKey: string, columnKey: string): string | undefined {
    if (!drilldownHref || !pivot.cells.get(rowKey)?.has(columnKey)) return;
    const row = pivot.rows.find(item => item.key === rowKey);
    const column = pivot.columns.find(item => item.key === columnKey);
    const query = { resource, rowField, columnField, valueField, aggregator,
      ...(filters === undefined ? {} : { filters }), ...(meta === undefined ? {} : { meta }) };
    const input = buildPivotDrilldown(query, scopeKey, row, column);
    try {
      return safeHref(input ? drilldownHref(input) : undefined);
    } catch {
      return;
    }
  }
  function display(value: number | null | undefined): string {
    return formatPivotValue(value, formatValue ?? (v => v.toLocaleString(i18n.locale, { maximumFractionDigits: 2 })));
  }
</script>

<div class="sv-lite-pivot-container {className}" aria-busy={loading}>
  <div class="sv-lite-pivot-header">
    <strong>{i18n.t('pivot.title')}</strong> ({rowLabel} × {columnLabel})
    <span class="sv-lite-pivot-sub">{i18n.t(`pivot.${aggregator}`)} ({valueLabel})</span>
    {#if safeExportHref}<a href={safeExportHref}>{i18n.t('common.export')}</a>{/if}
  </div>

  {#if loading}
    <div role="status">{i18n.t('common.loading')}</div>
  {:else if displayError}
    <div role="alert">{displayError}</div>
    {#if error && safeRetryHref}<a href={safeRetryHref}>{i18n.t('common.retry')}</a>{/if}
  {:else if pivot.rows.length === 0}
    <div role="status">{i18n.t('common.noData')}</div>
  {:else}
  <table class="sv-lite-pivot-table" aria-label={ariaLabel ?? `${i18n.t('pivot.title')}: ${rowLabel} / ${columnLabel} / ${valueLabel}`}>
    <thead>
      <tr>
        <th scope="col" class="sv-lite-th-dim">{rowLabel} \ {columnLabel}</th>
        {#each pivot.columns as col (col.key)}
          <th scope="col">{col.label}</th>
        {/each}
        <th scope="col" class="sv-lite-th-total">{i18n.t('pivot.total')}</th>
      </tr>
    </thead>
    <tbody>
      {#each pivot.rows as row (row.key)}
        <tr>
          <th scope="row" class="sv-lite-td-dim">{row.label}</th>
          {#each pivot.columns as col (col.key)}
            {@const href = cellHref(row.key, col.key)}
            <td class="sv-lite-td-val">
              {#if href}
                <a href={href} aria-label={`${i18n.t('pivot.drilldown')}: ${row.label} / ${col.label}`}>
                  {display(pivot.cells.get(row.key)?.get(col.key))}
                </a>
              {:else}
                {display(pivot.cells.get(row.key)?.get(col.key))}
              {/if}
            </td>
          {/each}
          <td class="sv-lite-td-rowtotal">{display(pivot.rowTotals.get(row.key))}</td>
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr>
        <th scope="row" class="sv-lite-td-dim">{i18n.t('pivot.grandTotal')}</th>
        {#each pivot.columns as col (col.key)}
          <td class="sv-lite-td-val">{display(pivot.columnTotals.get(col.key))}</td>
        {/each}
        <td class="sv-lite-td-grandtotal">{display(pivot.grandTotal)}</td>
      </tr>
    </tfoot>
  </table>
  {/if}
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
