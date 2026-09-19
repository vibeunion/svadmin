<script lang="ts">
  import { getContext } from 'svelte';
  import { SVAR_CELL_CONTEXT, type SvarCellContext } from './svar-grid-cells.js';
  let { row, column }: { row: unknown; column: unknown } = $props();
  const host = getContext<SvarCellContext | undefined>(SVAR_CELL_CONTEXT);
  const content = $derived(host?.resolve(row, column));
  const render = $derived(host?.render());
</script>

{#if render && content}{@render render(content)}{/if}
