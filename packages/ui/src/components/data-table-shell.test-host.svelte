<script lang="ts">
  import DataTableShell from './DataTableShell.svelte';

  let {
    title = '',
    count = undefined,
    caption = '测试记录',
    stickyActions = false,
    toolbarText = '',
  }: {
    title?: string;
    count?: number;
    caption?: string;
    stickyActions?: boolean;
    toolbarText?: string;
  } = $props();
</script>

{#snippet tableContent()}
  <table>
    <thead><tr><th>编号</th><th>操作</th></tr></thead>
    <tbody><tr><td>FA-001</td><td><button type="button">查看</button></td></tr></tbody>
  </table>
{/snippet}

{#if toolbarText}
  <DataTableShell {title} {count} {caption} {stickyActions}>
    {#snippet toolbar()}
      <button type="button">{toolbarText}</button>
    {/snippet}
    {@render tableContent()}
  </DataTableShell>
{:else}
  <DataTableShell {title} {count} {caption} {stickyActions}>
    {@render tableContent()}
  </DataTableShell>
{/if}
