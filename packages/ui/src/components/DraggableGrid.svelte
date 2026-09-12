<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { GridModule } from '../types.js';

  let {
    modules = $bindable<GridModule[]>([]),
    onOrderSave,
    renderItem,
    class: className = '',
    columns = 'svadmin-u-d7c8339810d3 svadmin-u-e4d6f343b9ff svadmin-u-19d9b25e8fae',
    gap = 'svadmin-u-0c3bc98565dd',
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

<div class="svadmin-u-f3c543ad5fe9 {columns} {gap} {className}">
  {#each modules as mod, i (mod.id)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      draggable="true"
      ondragstart={(e) => handleDragStart(e, mod.id)}
      ondragover={(e) => handleDragOver(e, mod.id)}
      ondrop={(e) => handleDrop(e, mod.id)}
      ondragend={handleDragEnd}
      ondragleave={() => { if (dragOverId === mod.id) dragOverId = null; }}
      class="svadmin-u-0fe7d7d814d0 svadmin-u-625a4c3fbeb2
        {draggingId === mod.id ? 'svadmin-u-2a2db4667b27 svadmin-u-ad36c0242ee8 svadmin-u-a50d3377f4ac' : 'svadmin-u-8d08385288a6'}
        {dragOverId === mod.id ? 'svadmin-u-16b1efa5875e svadmin-u-2691847b25ed svadmin-u-0c15f6cff5a0 svadmin-u-582e6ef4b245 svadmin-u-5f22e64f2282 svadmin-u-1fdf1b136104' : ''}"
    >
      {@render renderItem({ module: mod, index: i, dragging: draggingId === mod.id })}
    </div>
  {/each}
</div>
