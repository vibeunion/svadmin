<script lang="ts">
  import { Value } from '@sinclair/typebox/value';
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
  import { resourceTablePropsSchema } from '../builtin-schemas.js';
  import type { SurfaceWidgetRendererProps } from '../catalog.js';
  import { asRecordArray, displayTableValue } from '../widget-data.js';

  let { props, data }: SurfaceWidgetRendererProps = $props();

  const tableProps = $derived(Value.Decode(resourceTablePropsSchema, props));
  const records = $derived(data.status === 'ready' ? asRecordArray(data.value) : null);
</script>

<Card>
  <CardHeader>
    <CardTitle>{tableProps.title}</CardTitle>
  </CardHeader>
  <CardContent>
    {#if data.status === 'loading'}
      <div class="table-state table-loading" role="status">Loading table</div>
    {:else if data.status === 'empty'}
      <p class="table-state" role="status">{tableProps.emptyLabel ?? 'No records'}</p>
    {:else if data.status === 'error'}
      <p class="table-state" role="alert">{data.error.message}</p>
    {:else if data.status === 'ready' && records?.ok}
      <div class="surface-table">
        <Table aria-label={tableProps.title}>
          <TableHeader>
            <TableRow>
              {#each tableProps.columns as column (column.field)}
                <TableHead scope="col">{column.label}</TableHead>
              {/each}
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each records.value as record, index (index)}
              <TableRow>
                {#each tableProps.columns as column (column.field)}
                  <TableCell>{displayTableValue(record[column.field], column.format)}</TableCell>
                {/each}
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {:else}
      <p class="table-state" role="alert">{records && !records.ok ? records.message : 'Table data is unavailable'}</p>
    {/if}
  </CardContent>
</Card>

<style>
  .table-state {
    display: grid;
    min-height: 8rem;
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
