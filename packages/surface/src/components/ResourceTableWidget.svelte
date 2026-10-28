<script lang="ts">
  import { Value } from 'typebox/value';
  import { surfaceTable } from '../recipes.js';
  import '../styles.css';
  import CardContent from '@svadmin/ui/components/ui/card/card-content.svelte';
  import CardHeader from '@svadmin/ui/components/ui/card/card-header.svelte';
  import CardTitle from '@svadmin/ui/components/ui/card/card-title.svelte';
  import Card from '@svadmin/ui/components/ui/card/card.svelte';
  import TableBody from '@svadmin/ui/components/ui/table/table-body.svelte';
  import TableCell from '@svadmin/ui/components/ui/table/table-cell.svelte';
  import TableHead from '@svadmin/ui/components/ui/table/table-head.svelte';
  import TableHeader from '@svadmin/ui/components/ui/table/table-header.svelte';
  import TableRow from '@svadmin/ui/components/ui/table/table-row.svelte';
  import Table from '@svadmin/ui/components/ui/table/table.svelte';
  import { styledResourceTablePropsSchema as resourceTablePropsSchema } from '../builtin-schemas.js';
  import type { SurfaceWidgetRendererProps } from '../catalog.js';
  import { projectInteractionRecord } from '../interactions.js';
  import { resolveSurfaceMessages, surfaceErrorMessage } from '../localization.js';
  import { asRecordArray, displayTableValue } from '../widget-data.js';
  import type { JsonObject } from '../types.js';

  let { props, data, locale = 'en-US', messages, onSelectRecord }: SurfaceWidgetRendererProps = $props();
  const activeMessages = $derived(resolveSurfaceMessages(locale, messages));

  const tableProps = $derived(Value.Decode(resourceTablePropsSchema, props));
  const tableClasses = $derived(surfaceTable());
  const records = $derived(data.status === 'ready' ? asRecordArray(data.value) : null);
  const fields = $derived(tableProps.columns.map((column) => column.field));
  const selectable = $derived(onSelectRecord !== undefined);
  const selectLabel = $derived(activeMessages.tableSelect ?? 'Select');

  // 只有宿主注册交互时才发出事件；投影后没有任何可交付字段就保持静默。
  function selectRecord(record: JsonObject): void {
    if (!onSelectRecord) return;
    const projected = projectInteractionRecord(record, fields);
    if (projected !== null) onSelectRecord(projected);
  }
</script>

<Card class={tableClasses?.root}>
  <CardHeader class={tableClasses?.header}>
    <CardTitle>{tableProps.title}</CardTitle>
  </CardHeader>
  <CardContent class={tableClasses?.content}>
    {#if data.status === 'loading'}
      <div class={"table-state table-loading " + (tableClasses?.state ?? "")} role="status">{activeMessages.tableLoading}</div>
    {:else if data.status === 'empty'}
      <p class={"table-state " + (tableClasses?.state ?? "")} role="status">{tableProps.emptyLabel ?? activeMessages.tableNoRecords}</p>
    {:else if data.status === 'error'}
      <p class={"table-state " + (tableClasses?.state ?? "")} role="alert">{surfaceErrorMessage(data.error, activeMessages, activeMessages.tableUnavailable, activeMessages.tableInvalidData)}</p>
    {:else if data.status === 'ready' && records?.ok}
      <div class="surface-table">
        <Table aria-label={tableProps.title}>
          <TableHeader>
            <TableRow>
              {#each tableProps.columns as column (column.field)}
                <TableHead class={tableClasses?.head} scope="col">{column.label}</TableHead>
              {/each}
              {#if selectable}
                <TableHead class={tableClasses?.head} scope="col">{selectLabel}</TableHead>
              {/if}
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each records.value as record, index (index)}
              <TableRow>
                {#each tableProps.columns as column (column.field)}
                  <TableCell class={tableClasses?.cell}>{displayTableValue(record[column.field], {
                    format: column.format,
                    locale,
                    messages: activeMessages,
                  })}</TableCell>
                {/each}
                {#if selectable}
                  <TableCell class={tableClasses?.cell}>
                    <button type="button" class="surface-record-select" aria-label="{tableProps.title}: {selectLabel} {index + 1}" onclick={() => selectRecord(record)}>
                      {selectLabel}
                    </button>
                  </TableCell>
                {/if}
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {:else}
      <p class={"table-state " + (tableClasses?.state ?? "")} role="alert">{records && !records.ok ? activeMessages.tableInvalidData : activeMessages.tableUnavailable}</p>
    {/if}
  </CardContent>
</Card>

<style>
  .surface-record-select {
    padding: 0.125rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    background: var(--background);
    color: var(--foreground);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .surface-record-select:hover { background: var(--accent); }
  .surface-record-select:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }

  .table-state {
    display: grid;
    min-height: var(--svadmin-table-state-height, 8rem);
    margin: 0;
    place-items: center;
    color: var(--muted-foreground);
  }

  .table-loading {
    border-radius: 0.5rem;
    background: linear-gradient(90deg, var(--muted), var(--card), var(--muted));
    background-size: 200% 100%;
    animation: surface-pulse 1.5s ease-in-out infinite;
  }

  @keyframes surface-pulse {
    to { background-position: -200% 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .table-loading { animation: none; }
  }

  @media (max-width: 47.999rem) {
    .surface-table :global([data-slot='table-container']) {
      overflow-x: visible;
    }

    .surface-table :global([data-slot='table']) {
      table-layout: fixed;
    }

    .surface-table :global([data-slot='table-head']),
    .surface-table :global([data-slot='table-cell']) {
      padding-inline: 0.375rem;
      overflow-wrap: anywhere;
      white-space: normal;
    }
  }
</style>
