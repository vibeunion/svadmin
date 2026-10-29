<script lang="ts">
  export type TreeNode = {
    id: string;
    label: string;
    children?: TreeNode[];
  };

  let { nodes }: { nodes: TreeNode[] } = $props();
  let expanded = $state<Record<string, boolean>>({});

  function toggle(id: string) {
    expanded = { ...expanded, [id]: !expanded[id] };
  }
</script>

{#snippet branch(items: TreeNode[])}
  <ul class="svadmin-tree" role="group">
    {#each items as node (node.id)}
      <li role="treeitem" aria-selected="false" aria-expanded={node.children ? !!expanded[node.id] : undefined}>
        {#if node.children}
          <button type="button" class="svadmin-tree__toggle" aria-label={node.label} onclick={() => toggle(node.id)}>
            {node.label}
          </button>
          {#if expanded[node.id]}
            {@render branch(node.children)}
          {/if}
        {:else}
          <span class="svadmin-tree__leaf">{node.label}</span>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

<div role="tree" class="svadmin-tree-root">
  {@render branch(nodes)}
</div>
