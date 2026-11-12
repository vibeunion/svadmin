<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    columns?: number;
    gap?: 'sm' | 'md' | 'lg';
    /** Caller class merged with the built-in class list. */
    class?: string;
    children: Snippet;
  }

  let { columns = 3, gap = 'md', class: className = '', children }: Props = $props();
  const safeColumns = $derived(columns >= 4 ? 4 : columns === 2 ? 2 : 3);
</script>

<div class="lite-grid {className}" data-columns={safeColumns} data-gap={gap}>
  {@render children()}
</div>

<style>
  .lite-grid { display: flex; flex-wrap: wrap; margin: -6px; }
  :global(.lite-grid > *) { box-sizing: border-box; width: calc(33.333% - 12px); margin: 6px; }
  :global(.lite-grid[data-columns='2'] > *) { width: calc(50% - 12px); }
  :global(.lite-grid[data-columns='4'] > *) { width: calc(25% - 12px); }
  .lite-grid[data-gap='sm'] { margin: -2px; }
  :global(.lite-grid[data-gap='sm'] > *) { width: calc(33.333% - 4px); margin: 2px; }
  :global(.lite-grid[data-gap='sm'][data-columns='2'] > *) { width: calc(50% - 4px); }
  :global(.lite-grid[data-gap='sm'][data-columns='4'] > *) { width: calc(25% - 4px); }
  .lite-grid[data-gap='lg'] { margin: -10px; }
  :global(.lite-grid[data-gap='lg'] > *) { width: calc(33.333% - 20px); margin: 10px; }
  :global(.lite-grid[data-gap='lg'][data-columns='2'] > *) { width: calc(50% - 20px); }
  :global(.lite-grid[data-gap='lg'][data-columns='4'] > *) { width: calc(25% - 20px); }
  @media (max-width: 720px) { :global(.lite-grid > *) { width: calc(100% - 12px) !important; } }
</style>
