<script lang="ts" generics="T extends object">
  import type { Snippet } from 'svelte';
  import * as Table from '../ui/table/index.js';
  import type { NetworkColumn } from './NetworkTable.types.js';
  interface Props { rows?: T[]; columns: NetworkColumn<T>[]; row?: Snippet<[T]>; class?: string; }
  let { rows = [], columns, row, class: className = '' }: Props = $props();
</script>
<div class={'overflow-x-auto rounded-lg border border-border bg-card ' + className}>
  <Table.Root data-svadmin-datatable>
    <Table.Header data-svadmin-table-head><Table.Row>{#each columns as column (String(column.key))}<Table.Head>{column.label}</Table.Head>{/each}</Table.Row></Table.Header>
    <Table.Body>
      {#each rows as item, index (String('id' in item ? item.id : index))}
        {#if row}{@render row(item)}{:else}<Table.Row data-svadmin-table-row>{#each columns as column (String(column.key))}<Table.Cell>{String(item[column.key] ?? '')}</Table.Cell>{/each}</Table.Row>{/if}
      {/each}
    </Table.Body>
  </Table.Root>
  {#if rows.length === 0}<div class="p-6 text-center text-sm text-muted-foreground">No records</div>{/if}
</div>
