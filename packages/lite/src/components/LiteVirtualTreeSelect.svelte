<script lang="ts">
  export interface LiteVirtualTreeNode {
    value: string | number;
    label: string;
    children?: LiteVirtualTreeNode[];
    disabled?: boolean;
  }

  interface Props {
    nodes?: LiteVirtualTreeNode[];
    value?: string | number | Array<string | number>;
    name?: string;
    label?: string;
    placeholder?: string;
    multiple?: boolean;
    disabled?: boolean;
    required?: boolean;
    class?: string;
  }

  let {
    nodes = [],
    value = '',
    name = 'value',
    label = 'Tree selection',
    placeholder = 'Select an option',
    multiple = false,
    disabled = false,
    required = false,
    class: className = '',
  }: Props = $props();

  interface FlatNode {
    node: LiteVirtualTreeNode;
    depth: number;
  }

  function flatten(items: LiteVirtualTreeNode[], depth = 0, out: FlatNode[] = []): FlatNode[] {
    for (const node of items) {
      out.push({ node, depth });
      if (node.children?.length) flatten(node.children, depth + 1, out);
    }
    return out;
  }

  const options = $derived(flatten(nodes));
  let current = $state(value);
</script>

{#snippet treeOptions()}
  {#each options as option (option.node.value)}
    <option value={option.node.value} disabled={option.node.disabled}>
      {'\u00a0'.repeat(option.depth * 3)}{option.depth > 0 ? '└ ' : ''}{option.node.label}
    </option>
  {/each}
{/snippet}

<div class="lite-virtual-tree-select {className}">
  <label for="lite-tree-select">{label}</label>
  {#if multiple}
    <select
      id="lite-tree-select"
      {name}
      multiple
      {disabled}
      {required}
      bind:value={current}
      aria-label={label}
    >
      {@render treeOptions()}
    </select>
  {:else}
    <select
      id="lite-tree-select"
      {name}
      {disabled}
      {required}
      bind:value={current}
      aria-label={label}
    >
      <option value="" disabled={required}>{placeholder}</option>
      {@render treeOptions()}
    </select>
  {/if}
  <p class="lite-virtual-tree-help">Large-tree search and virtual scrolling are client-side enhancements.</p>
</div>

<style>
  .lite-virtual-tree-select label { display: block; margin-bottom: 4px; color: #4e5969; font-size: 12px; font-weight: 600; }
  .lite-virtual-tree-select select { width: 100%; box-sizing: border-box; min-height: 34px; padding: 6px 8px; border: 1px solid #e5e6eb; border-radius: 4px; background: #fff; color: #1d2129; font: inherit; font-size: 13px; }
  .lite-virtual-tree-help { margin: 4px 0 0; color: #86909c; font-size: 11px; }
</style>
