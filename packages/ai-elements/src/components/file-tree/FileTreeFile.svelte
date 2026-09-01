<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { File as FileIcon } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useFileTreeContext } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { path: string; name: string; icon?: Snippet; class?: string; children?: Snippet; }
  let { path, name, icon, class: className = '', children, ...rest }: Props = $props();
  const tree = useFileTreeContext('FileTreeFile');
  const selected = $derived(tree.selectedPath === path);
</script>
<div {...rest} class={cn('svadmin-ai-file-tree-part__file', selected && 'svadmin-ai-file-tree-part__row--selected', className)} role="treeitem" aria-selected={selected} tabindex="0" data-slot="file-tree-file" onclick={() => tree.selectPath(path)} onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); tree.selectPath(path); } }}><span class="svadmin-ai-file-tree-part__spacer" aria-hidden="true"></span>{#if children}{@render children()}{:else}<span class="svadmin-ai-file-tree-part__icon" aria-hidden="true">{#if icon}{@render icon()}{:else}<FileIcon size={15} />{/if}</span><span class="svadmin-ai-file-tree-part__name">{name}</span>{/if}</div>
<style>.svadmin-ai-file-tree-part__file { display: flex; min-width: 0; align-items: center; gap: .35rem; border-radius: min(var(--radius, .5rem), .35rem); padding: .3rem .4rem; font-size: .78rem; cursor: pointer; }.svadmin-ai-file-tree-part__file:hover { background: var(--muted, transparent); }.svadmin-ai-file-tree-part__spacer { width: 1.2rem; flex: none; }.svadmin-ai-file-tree-part__file:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: -2px; }</style>
