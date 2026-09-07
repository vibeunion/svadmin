<script lang="ts">
  /**
   * DraggableHeader — Wraps table header cells with HTML5 Drag and Drop
   * to enable column reorder. The parent owns persistence and restoration.
   *
   * Usage:
   *   <DraggableHeader columns={columns} onReorder={handleReorder}>
   *     {#snippet header(column, index)}
   *       <th>...</th>
   *     {/snippet}
   *   </DraggableHeader>
   */
  import type { Snippet } from 'svelte';

  interface Column {
    id: string;
    [key: string]: unknown;
  }

  interface DragHeaderProps {
    draggable: true;
    ondragstart: (event: DragEvent) => void;
    ondragover: (event: DragEvent) => void;
    ondrop: (event: DragEvent) => void;
    ondragend: () => void;
    'data-dragging': boolean;
    'data-drop-target': boolean;
    class: string;
  }

  interface Props {
    columns: Column[];
    onReorder: (newOrder: Column[]) => void;
    header: Snippet<[Column, number, DragHeaderProps]>;
  }

  let { columns, onReorder, header }: Props = $props();

  let dragIndex = $state<number | null>(null);
  let dropIndex = $state<number | null>(null);

  function handleDragStart(e: DragEvent, index: number) {
    dragIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    dropIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDrop(e: DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      dragIndex = null;
      dropIndex = null;
      return;
    }

    const newColumns = [...columns];
    const [moved] = newColumns.splice(dragIndex, 1);
    newColumns.splice(index, 0, moved);

    onReorder(newColumns);
    dragIndex = null;
    dropIndex = null;
  }

  function handleDragEnd() {
    dragIndex = null;
    dropIndex = null;
  }
</script>

<tr class="svadmin-u-39f703dbe296 svadmin-u-024b686f65d9 svadmin-u-ceb69a6b0e5f svadmin-u-358af0b65a31">
  {#each columns as column, index (index)}
    {@render header(column, index, {
      draggable: true,
      ondragstart: (e: DragEvent) => handleDragStart(e, index),
      ondragover: (e: DragEvent) => handleDragOver(e, index),
      ondrop: (e: DragEvent) => handleDrop(e, index),
      ondragend: handleDragEnd,
      'data-dragging': dragIndex === index,
      'data-drop-target': dropIndex === index && dropIndex !== dragIndex,
      class: `cursor-grab active:cursor-grabbing select-none transition-opacity ${dragIndex === index ? 'opacity-50' : ''} ${dropIndex === index && dropIndex !== dragIndex ? 'border-l-2 border-primary' : ''}`
    })}
  {/each}
</tr>
