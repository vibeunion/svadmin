<script lang="ts">
  import DataTableShell from '../../../packages/ui/src/components/DataTableShell.svelte';
  import * as Table from '../../../packages/ui/src/components/ui/table/index.js';
  import { Button } from '../../../packages/ui/src/components/ui/button/index.js';

  const rows = [
    { id: 'FA-2026-001', customer: '华东材料', status: '执行中' },
    { id: 'FA-2026-002', customer: '北辰电子', status: '待审核' },
    { id: 'FA-2026-003', customer: '星河精工', status: '已完成' },
  ];
</script>

<main class="evidence-shell">
  <h1>Data table shell</h1>
  <p class="evidence-copy">A generic titled table surface with count, toolbar, horizontal viewport, and sticky actions.</p>
  <DataTableShell title="委托单" count={128} caption="委托单列表" stickyActions>
    {#snippet toolbar()}
      <Button variant="outline" size="sm">导出</Button>
      <Button size="sm">新建委托</Button>
    {/snippet}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>委托单号</Table.Head>
          <Table.Head>客户</Table.Head>
          <Table.Head>状态</Table.Head>
          <Table.Head class="text-right">操作</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each rows as row (row.id)}
          <Table.Row>
            <Table.Cell><strong>{row.id}</strong></Table.Cell>
            <Table.Cell>{row.customer}</Table.Cell>
            <Table.Cell>{row.status}</Table.Cell>
            <Table.Cell class="text-right"><Button variant="ghost" size="sm">查看</Button></Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </DataTableShell>
</main>

<style>
  :global(body) { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
  .evidence-shell { min-height: 100vh; padding: 48px; display: grid; align-content: start; gap: 16px; }
  h1 { margin: 0; font-size: 24px; }
  .evidence-copy { margin: 0 0 12px; color: #475569; }
</style>
