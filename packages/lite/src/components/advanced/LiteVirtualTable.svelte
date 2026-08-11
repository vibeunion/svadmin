<script lang="ts">
  /**
   * SSR VirtualTable — Identical to LiteTable.
   * Virtual scrolling (rendering only visible rows) requires JS.
   * In lite mode, all rows are rendered server-side. For large datasets,
   * rely on server-side pagination instead.
   */
  import type { ResourceDefinition } from '@svadmin/core';
  import LiteTable from '../LiteTable.svelte';

  interface Props {
    records: Record<string, unknown>[];
    resource: ResourceDefinition;
    currentSort?: string;
    currentOrder?: 'asc' | 'desc';
    currentSearch?: string;
    basePath?: string;
    canShow?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
  }

  let {
    records,
    resource,
    currentSort,
    currentOrder = 'asc',
    currentSearch,
    basePath = '/lite',
    canShow,
    canEdit,
    canDelete,
  }: Props = $props();
</script>

<!-- Virtual scrolling is not available without JS. All rows are rendered. -->
<LiteTable
  {records}
  {resource}
  {currentSort}
  {currentOrder}
  {currentSearch}
  {basePath}
  {canShow}
  {canEdit}
  {canDelete}
/>
