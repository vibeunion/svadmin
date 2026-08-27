<script lang="ts">
  import { captureAdminContext, getResource } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import type { Snippet } from 'svelte';
  import type { FieldDefinition } from '@svadmin/core';
  import PageHeader from './PageHeader.svelte';
  import AutoTable from './AutoTable.svelte';
  import { Button } from './ui/button/index.js';
  import { Plus } from '@lucide/svelte';

  const i18n = useTranslation();

  interface Props {
    resourceName: string;
    title?: string;
    canCreate?: boolean;
    density?: 'compact' | 'comfortable';
    /** Passthrough: enable row selection checkboxes */
    selectable?: boolean;
    /** Passthrough: custom header actions */
    headerActions?: Snippet;
    /** Optional status tabs or filter slot above table */
    statusTabs?: Snippet;
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
    cellRenderer,
    rowActions,
    emptyState,
    expandedRowRender,
    class: className = '',
  }: Props = $props();
  const adminContext = captureAdminContext();

  const resource = $derived(getResource(resourceName));
  const pageTitle = $derived(title ?? resource.label);
  const showCreate = $derived(canCreate ?? resource.canCreate !== false);
</script>

<div class="{density === 'compact' ? 'space-y-4' : 'space-y-6'} {className}">
  <PageHeader title={pageTitle} {density}>
    {#snippet actions()}
      {#if showCreate}
        <Button size={density === 'compact' ? 'sm' : 'default'} onclick={() => adminContext.navigate(`/${resourceName}/create`)}>
          <Plus class="h-4 w-4" data-icon="inline-start" /> {i18n.t('common.create')}
        </Button>
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

  <AutoTable
    {resourceName}
    {density}
    {selectable}
    defaultCellRenderer={cellRenderer}
    {rowActions}
    {emptyState}
    {expandedRowRender}
  />
</div>
