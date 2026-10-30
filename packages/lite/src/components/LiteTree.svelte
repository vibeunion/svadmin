<script lang="ts">
  import type { Snippet } from 'svelte';

  interface TreeNode {
    id: string;
    label: string;
    href?: string;
    disabled?: boolean;
    children?: TreeNode[];
  }

  interface Props {
    nodes: TreeNode[];
    label?: string;
    selected?: string;
    children?: Snippet<[TreeNode]>;
  }

  let { nodes, label = 'Tree', selected, children }: Props = $props();
</script>

{#snippet branch(items: TreeNode[], depth: number)}
  <ul class="lite-tree__list" role={depth === 0 ? 'tree' : 'group'} aria-label={depth === 0 ? label : undefined}>
    {#each items as node (node.id)}
      <li role="treeitem" aria-selected={selected === node.id} aria-disabled={node.disabled || undefined}>
        {#if node.href && !node.disabled}
          <a href={node.href} class:active={selected === node.id}>{node.label}</a>
        {:else}
          <span class:active={selected === node.id}>{node.label}</span>
        {/if}
        {#if node.children?.length}{@render branch(node.children, depth + 1)}{/if}
        {#if children}{@render children(node)}{/if}
      </li>
    {/each}
  </ul>
{/snippet}

<nav class="lite-tree" aria-label={label}>
  {@render branch(nodes, 0)}
</nav>

<style>
  .lite-tree__list { margin: 0; padding-left: 16px; list-style: none; }
  .lite-tree > .lite-tree__list { padding-left: 0; }
  .lite-tree__list li { padding: 2px 0; color: #1D2129; font-size: 13px; }
  .lite-tree__list a, .lite-tree__list span { display: inline-block; padding: 4px 8px; border-radius: 4px; color: #1D2129; text-decoration: none; }
  .lite-tree__list a:hover, .lite-tree__list .active { background: #E8F3FF; color: #165DFF; }
</style>
