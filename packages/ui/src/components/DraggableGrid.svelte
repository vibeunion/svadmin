<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { GridModule } from '../types.js';

  let {
    modules = $bindable<GridModule[]>([]),
    onOrderSave,
    renderItem,
    class: className = '',
    columns = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    gap = 'gap-4',
  }: {
    modules?: GridModule[];
    onOrderSave?: (orderedIds: string[]) => void;
    renderItem: Snippet<[{ module: GridModule; index: number; dragging: boolean }]>;
    class?: string;
    columns?: string;
    gap?: string;
  } = $props();

  let draggingId = $state<string | null>(null);
  let dragOverId = $state<string | null>(null);

  function handleDragStart(e: DragEvent, id: string) {
    draggingId = id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    }
  }

  function handleDragOver(e: DragEvent, id: string) {
    e.preventDefault();
    if (draggingId && draggingId !== id) {
      dragOverId = id;
    }
  }

  function handleDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) {
      dragOverId = null;
      return;
    }

    const sourceIdx = modules.findIndex(m => m.id === draggingId);
    const targetIdx = modules.findIndex(m => m.id === targetId);

    if (sourceIdx === -1 || targetIdx === -1) {
      dragOverId = null;
      return;
    }

    const newModules = [...modules];
    const [dragged] = newModules.splice(sourceIdx, 1);
    if (dragged === undefined) return;
    newModules.splice(targetIdx, 0, dragged);

    modules = newModules;
    dragOverId = null;
    onOrderSave?.(modules.map(m => m.id));
  }

  function handleDragEnd() {
    draggingId = null;
    dragOverId = null;
  }
</script>

<div class="grid {columns} {gap} {className}">
  {#each modules as mod, i (mod.id)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      draggable="true"
      ondragstart={(e) => handleDragStart(e, mod.id)}
      ondragover={(e) => handleDragOver(e, mod.id)}
      ondrop={(e) => handleDrop(e, mod.id)}
      ondragend={handleDragEnd}
      ondragleave={() => { if (dragOverId === mod.id) dragOverId = null; }}
      class="transition-all duration-200
        {draggingId === mod.id ? 'opacity-40 scale-[0.97] cursor-grabbing' : 'cursor-grab'}
        {dragOverId === mod.id ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background rounded-lg scale-[1.02]' : ''}"
    >
      {@render renderItem({ module: mod, index: i, dragging: draggingId === mod.id })}
    </div>
  {/each}
</div>
