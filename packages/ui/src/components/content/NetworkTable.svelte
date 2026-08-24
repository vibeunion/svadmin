<script lang="ts" generics="T extends Record<string, unknown>">
  import type { Snippet } from 'svelte';
  import { Table } from '../ui/table/index.js';
  export interface NetworkColumn<T extends Record<string, unknown>> { key: keyof T; label: string; }
  interface Props { rows?: T[]; columns: NetworkColumn<T>[]; row?: Snippet<[T]>; class?: string; }
  let { rows = [], columns, row, class: className = '' }: Props = $props();
</script>
<div class={'overflow-x-auto rounded-lg border border-border bg-card ' + className}>
  <Table.Root data-svadmin-datatable>
    <Table.Header data-svadmin-table-head><Table.Row>{#each columns as column (String(column.key))}<Table.Head>{column.label}</Table.Head>{/each}</Table.Row></Table.Header>
    <Table.Body>
      {#each rows as item, index (String(item.id ?? index))}
        {#if row}{@render row(item)}{:else}<Table.Row data-svadmin-table-row>{#each columns as column (String(column.key))}<Table.Cell>{String(item[column.key] ?? '')}</Table.Cell>{/each}</Table.Row>{/if}
      {/each}
    </Table.Body>
  </Table.Root>
  {#if rows.length === 0}<div class="p-6 text-center text-sm text-muted-foreground">No records</div>{/if}
</div>
