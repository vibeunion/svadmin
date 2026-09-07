<script lang="ts">
  import { GripVertical } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface DraggableTableColumn {
    key: string;
    label: string;
    width?: string;
  }

  interface Props {
    columns: DraggableTableColumn[];
    items?: Record<string, unknown>[];
    rowKey?: string;
    onreorder?: (reorderedItems: Record<string, unknown>[]) => void;
    class?: string;
  }

  let {
    columns,
    items = $bindable([]),
    rowKey = 'id',
    onreorder,
    class: className = '',
  }: Props = $props();

  let draggedIndex = $state<number | null>(null);
  let overIndex = $state<number | null>(null);

  function handleDragStart(index: number, e: DragEvent) {
    draggedIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
  }

  function handleDragOver(index: number, e: DragEvent) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    overIndex = index;
  }

  function handleDrop(index: number, e: DragEvent) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      draggedIndex = null;
      overIndex = null;
      return;
    }

    const nextItems = [...items];
    const [movedItem] = nextItems.splice(draggedIndex, 1);
    nextItems.splice(index, 0, movedItem);

    items = nextItems;
    onreorder?.(items);

    draggedIndex = null;
    overIndex = null;
  }

  function handleDragEnd() {
    draggedIndex = null;
    overIndex = null;
  }
</script>

<div class={cn('svadmin-u-6da6a3c3f741 svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-cef5b893cf23 svadmin-u-2cd02d11d1af svadmin-u-359090c2d529', className)}>
  <table class="svadmin-u-6da6a3c3f741 svadmin-u-2eba0d65d059 svadmin-u-4583f90cd9bd">
    <thead class="svadmin-u-b00f43c30c2b svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-7f6912283f11">
      <tr>
        <th class="svadmin-u-d854e5698b57 svadmin-u-d5eab218aa34 svadmin-u-e7ee55ac7ffe svadmin-u-ca6bf63030aa">#</th>
        {#each columns as col (col.key)}
          <th style={col.width ? `width: ${col.width};` : ''} class="svadmin-u-f0faeb26d656 svadmin-u-e7ee55ac7ffe">
            {col.label}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258">
      {#each items as item, index (item[rowKey] ?? index)}
        {@const isDragging = draggedIndex === index}
        {@const isOver = overIndex === index}
        <tr
          draggable="true"
          ondragstart={(e) => handleDragStart(index, e)}
          ondragover={(e) => handleDragOver(index, e)}
          ondrop={(e) => handleDrop(index, e)}
          ondragend={handleDragEnd}
          class={cn(
            'svadmin-u-ceb69a6b0e5f svadmin-u-ae724a8c3dec svadmin-u-7f6912283f11',
            isDragging ? 'svadmin-u-78e6d0ebb9a4 svadmin-u-358af0b65a31' : 'svadmin-u-c4b5eaba40e3',
            isOver ? 'svadmin-u-bee68af349c9 svadmin-u-6cbc84dd9e1a svadmin-u-989c466fdbe7' : ''
          )}
        >
          <td class="svadmin-u-d5eab218aa34 svadmin-u-e7ee55ac7ffe svadmin-u-ca6bf63030aa svadmin-u-7be4d67a6256 svadmin-u-ea7b2e9e070e">
            <GripVertical class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-0e12dc7de920" />
          </td>
          {#each columns as col (col.key)}
            <td class="svadmin-u-f0faeb26d656 svadmin-u-e7ee55ac7ffe svadmin-u-2689f3958069 svadmin-u-d4108abe6359">
              {item[col.key] ?? '—'}
            </td>
          {/each}
        </tr>
      {/each}

      {#if items.length === 0}
        <tr>
          <td colspan={columns.length + 1} class="svadmin-u-a1f611f027dd svadmin-u-ca6bf63030aa svadmin-u-bfa603190748">
            No items to display
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
