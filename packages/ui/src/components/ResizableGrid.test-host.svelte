<script lang="ts">
  import ResizableGrid, { type GridItem } from './ResizableGrid.svelte';

  let items = $state<GridItem[]>([
    { id: 'a', x: 0, y: 0, w: 4, h: 2 },
    { id: 'b', x: 4, y: 0, w: 4, h: 2 },
  ]);
  let changes = $state(0);
</script>

<output aria-label="changes">{changes}</output>

{#snippet cell(entry: GridItem)}
  <span data-testid={`cell-${entry.id}`}>{`${entry.x},${entry.y},${entry.w},${entry.h}`}</span>
{/snippet}

<ResizableGrid bind:items item={cell} onchange={() => { changes += 1; }} ariaLabel="Dashboard grid" />