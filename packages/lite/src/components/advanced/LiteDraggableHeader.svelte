<script lang="ts">
  /**
   * SSR DraggableHeader — Degraded to a static table header.
   * Column dragging/resizing requires JS mouse/touch events.
   * In lite mode, columns are rendered at natural widths.
   * Sort is achieved via URL query parameters as in LiteTable.
   */
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    fields: FieldDefinition[];
    currentSort?: string;
    currentOrder?: 'asc' | 'desc';
  }

  let { fields, currentSort, currentOrder = 'asc' }: Props = $props();
</script>

<tr>
  {#each fields as field, _i (_i)}
    <th style="padding: 10px 12px; text-align: left; font-weight: 600; font-size: 13px; color: #4E5969; white-space: nowrap;">
      {#if currentSort === field.key}
        <a href="?sort={field.key}&order={currentOrder === 'asc' ? 'desc' : 'asc'}" style="color: #1D2129; text-decoration: none;">
          {field.label} {currentOrder === 'asc' ? '↑' : '↓'}
        </a>
      {:else}
        <a href="?sort={field.key}&order=asc" style="color: inherit; text-decoration: none;">
          {field.label}
        </a>
      {/if}
    </th>
  {/each}
</tr>
