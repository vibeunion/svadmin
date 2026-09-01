<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { ChevronRight, Folder, FolderOpen } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useFileTreeContext } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { path: string; name: string; class?: string; children?: Snippet; }
  let { path, name, class: className = '', children, ...rest }: Props = $props();
  const tree = useFileTreeContext('FileTreeFolder');
  const expanded = $derived(tree.expandedPaths.has(path));
  const selected = $derived(tree.selectedPath === path);
</script>
<div {...rest} class={cn('svadmin-ai-file-tree-part__folder', className)} role="treeitem" aria-expanded={expanded} aria-selected={selected} data-slot="file-tree-folder">
  <div class={cn('svadmin-ai-file-tree-part__row', selected && 'svadmin-ai-file-tree-part__row--selected')}>
    <button type="button" class="svadmin-ai-file-tree-part__toggle" aria-label={expanded ? `Collapse ${name}` : `Expand ${name}`} aria-expanded={expanded} onclick={() => tree.togglePath(path)}><ChevronRight class={expanded ? 'svadmin-ai-file-tree-part__chevron--open' : ''} size={15} aria-hidden="true" /></button>
    <button type="button" class="svadmin-ai-file-tree-part__select" onclick={() => tree.selectPath(path)}><span class="svadmin-ai-file-tree-part__icon" aria-hidden="true">{#if expanded}<FolderOpen size={15} />{:else}<Folder size={15} />{/if}</span><span class="svadmin-ai-file-tree-part__name">{name}</span></button>
  </div>
  {#if expanded}<div class="svadmin-ai-file-tree-part__children">{@render children?.()}</div>{/if}
</div>
<style>.svadmin-ai-file-tree-part__folder { min-width: 0; }.svadmin-ai-file-tree-part__row { display: flex; align-items: center; gap: .25rem; min-width: 0; border-radius: min(var(--radius, .5rem), .35rem); padding: .2rem .3rem; }.svadmin-ai-file-tree-part__row--selected { background: var(--accent, var(--muted, transparent)); }.svadmin-ai-file-tree-part__toggle, .svadmin-ai-file-tree-part__select { border: 0; background: transparent; color: inherit; cursor: pointer; }.svadmin-ai-file-tree-part__toggle { display: inline-flex; width: 1.2rem; height: 1.8rem; align-items: center; justify-content: center; }.svadmin-ai-file-tree-part__toggle :global(svg) { transition: transform 120ms ease; }.svadmin-ai-file-tree-part__toggle :global(.svadmin-ai-file-tree-part__chevron--open) { transform: rotate(90deg); }.svadmin-ai-file-tree-part__select { display: flex; min-width: 0; flex: 1; align-items: center; gap: .35rem; text-align: left; font: inherit; font-size: .78rem; }.svadmin-ai-file-tree-part__children { margin-left: 1rem; border-left: 1px solid var(--border, currentColor); padding-left: .35rem; }.svadmin-ai-file-tree-part__toggle:focus-visible, .svadmin-ai-file-tree-part__select:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }@media (prefers-reduced-motion: reduce) { .svadmin-ai-file-tree-part__toggle :global(svg) { transition: none; } }</style>
