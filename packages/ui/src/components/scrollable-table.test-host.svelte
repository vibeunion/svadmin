<script lang="ts">
  import ScrollableTable from './ScrollableTable.svelte';

  let {
    scrollMode = 'page',
    scrollbarPlacement = 'bottom',
  }: {
    scrollMode?: 'page' | 'contained';
    scrollbarPlacement?: 'top' | 'bottom';
  } = $props();
</script>

<ScrollableTable {scrollMode} {scrollbarPlacement}>
  <table>
    <thead><tr><th>编号</th><th>客户</th><th>状态</th><th>操作</th></tr></thead>
    <tbody><tr><td>FA-001</td><td>华东材料</td><td>执行中</td><td>查看</td></tr></tbody>
  </table>
</ScrollableTable>
