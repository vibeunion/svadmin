<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import TreeTable from './TreeTable.svelte';
  let props: ComponentProps<typeof TreeTable> = $props();
</script>

<TreeTable {...props}>
  {#snippet customCell({ column, value })}
    <span data-testid={`custom-${column.key}`}>Custom {String(value)}</span>
  {/snippet}
</TreeTable>
