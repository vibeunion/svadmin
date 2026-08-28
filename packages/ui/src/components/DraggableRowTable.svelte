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

<div class={cn('w-full rounded-xl border border-border bg-card shadow-xs overflow-hidden text-xs', className)}>
  <table class="w-full text-left border-collapse">
    <thead class="bg-muted/40 font-semibold text-muted-foreground border-b border-border/60 select-none">
      <tr>
        <th class="w-10 px-2 py-2.5 text-center">#</th>
        {#each columns as col (col.key)}
          <th style={col.width ? `width: ${col.width};` : ''} class="px-4 py-2.5">
            {col.label}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody class="divide-y divide-border/40">
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
            'transition-colors cursor-move select-none',
            isDragging ? 'opacity-30 bg-muted/50' : 'hover:bg-muted/20',
            isOver ? 'border-t-2 border-primary bg-primary/5' : ''
          )}
        >
          <td class="px-2 py-2.5 text-center text-muted-foreground/60 hover:text-foreground">
            <GripVertical class="h-4 w-4 mx-auto" />
          </td>
          {#each columns as col (col.key)}
            <td class="px-4 py-2.5 font-medium text-foreground">
              {item[col.key] ?? '—'}
            </td>
          {/each}
        </tr>
      {/each}

      {#if items.length === 0}
        <tr>
          <td colspan={columns.length + 1} class="py-8 text-center text-muted-foreground">
            No items to display
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
