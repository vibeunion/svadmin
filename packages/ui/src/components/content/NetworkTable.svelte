<script lang="ts" generics="T extends object">
  import { definedOptions } from '@svadmin/core/options';

  import type { Snippet } from 'svelte';
  import * as Table from '../ui/table/index.js';
  import DataState from './DataState.svelte';
  import type { DataStateKind } from './DataState.svelte';
  import type { NetworkColumn } from './NetworkTable.types.js';
  interface Props { rows?: T[]; columns: NetworkColumn<T>[]; row?: Snippet<[T]>; state?: DataStateKind; stateTitle?: string; stateDescription?: string; emptyTitle?: string; emptyDescription?: string; retry?: () => void; retryLabel?: string; loadingLabel?: string; class?: string; }
  let { rows = [], columns, row, state, stateTitle, stateDescription, emptyTitle, emptyDescription, retry, retryLabel, loadingLabel, class: className = '' }: Props = $props();
  const resolvedState = $derived(state ?? (rows.length === 0 ? 'empty' : undefined));
</script>
{#if resolvedState}
  <DataState state={resolvedState} {...definedOptions({ title: stateTitle ?? emptyTitle, description: stateDescription ?? emptyDescription, retry, retryLabel, loadingLabel })} class={className} />
{:else}
<div class={'svadmin-u-1384f66f41d0 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 ' + className}>
  <Table.Root data-svadmin-datatable>
    <Table.Header data-svadmin-table-head><Table.Row>{#each columns as column (String(column.key))}<Table.Head>{column.label}</Table.Head>{/each}</Table.Row></Table.Header>
    <Table.Body>
      {#each rows as item, index (String('id' in item ? item.id : index))}
        {#if row}{@render row(item)}{:else}<Table.Row data-svadmin-table-row>{#each columns as column (String(column.key))}<Table.Cell>{String(item[column.key] ?? '')}</Table.Cell>{/each}</Table.Row>{/if}
      {/each}
    </Table.Body>
  </Table.Root>
</div>
{/if}
