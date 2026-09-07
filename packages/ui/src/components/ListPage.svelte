<script lang="ts">
  import { getResource } from '@svadmin/core';

  import type { Snippet } from 'svelte';
  import type { FieldDefinition } from '@svadmin/core';
  import PageHeader from './PageHeader.svelte';
  import AutoTable from './AutoTable.svelte';
  import CreateButton from './buttons/CreateButton.svelte';

  interface Props {
    resourceName: string;
    title?: string;
    canCreate?: boolean;
    density?: 'compact' | 'comfortable';
    /** Passthrough: enable row selection checkboxes */
    selectable?: boolean;
    /** Passthrough: custom header actions */
    headerActions?: Snippet;
    /** Optional status tabs slot above filter/table */
    statusTabs?: Snippet;
    /** Optional filter toolbar slot between status tabs and table */
    filterToolbar?: Snippet;
    /** Passthrough: custom batch actions to render when rows are selected */
    batchActions?: Snippet<[{ selectedIds: (string | number)[] }]>;
    /** Passthrough: custom cell renderer per field */
    cellRenderer?: Snippet<[{ field: FieldDefinition; value: unknown; record: Record<string, unknown> }]>;
    /** Passthrough: custom row actions */
    rowActions?: Snippet<[{ record: Record<string, unknown>; id: string | number }]>;
    /** Passthrough: custom empty state */
    emptyState?: Snippet;
    /** Passthrough: expandable row content */
    expandedRowRender?: Snippet<[{ record: Record<string, unknown> }]>;
    class?: string;
  }

  let {
    resourceName,
    title,
    canCreate,
    density = 'comfortable',
    selectable,
    headerActions,
    statusTabs,
    filterToolbar,
    batchActions,
    cellRenderer,
    rowActions,
    emptyState,
    expandedRowRender,
    class: className = '',
  }: Props = $props();
  const resource = $derived(getResource(resourceName));
  const pageTitle = $derived(title ?? resource.label);
  const showCreate = $derived(canCreate ?? resource.canCreate !== false);
</script>

<div class="{density === 'compact' ? 'svadmin-u-6ed543e2fbbb' : 'svadmin-u-3e7ce58d64fa'} {className}">
  <PageHeader title={pageTitle} {density}>
    {#snippet actions()}
      {#if showCreate}
        <CreateButton resource={resourceName} />
      {/if}
      {#if headerActions}
        {@render headerActions()}
      {/if}
    {/snippet}
  </PageHeader>

  {#if statusTabs}
    <div>
      {@render statusTabs()}
    </div>
  {/if}

  {#if filterToolbar}
    <div>
      {@render filterToolbar()}
    </div>
  {/if}

  <AutoTable
    {resourceName}
    showHeader={false}
    {density}
    {selectable}
    {batchActions}
    defaultCellRenderer={cellRenderer}
    {rowActions}
    {emptyState}
    {expandedRowRender}
  />
</div>
