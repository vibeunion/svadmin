<script lang="ts">
  import { createI18nScope, provideI18nScope } from '@svadmin/core/i18n';
  import ScrollableTable from '../../../packages/ui/src/components/ScrollableTable.svelte';
  import * as Table from '../../../packages/ui/src/components/ui/table/index.js';

  const locale = new URLSearchParams(window.location.search).get('locale') ?? 'zh-CN';
  provideI18nScope(createI18nScope({ locale }));

  const params = new URLSearchParams(window.location.search);
  const native = params.has('native');
  const scrollMode = params.has('contained') ? 'contained' : 'page';
  const scrollbarPlacement = params.has('top') ? 'top' : 'bottom';
  const rows = Array.from({ length: scrollMode === 'contained' ? 40 : 6 }, (_, index) => ({
    id: `FA-2026-${String(index + 1).padStart(3, '0')}`,
    customer: ['华东材料', '北辰电子', '星河精工', '云岭检测', '海川装备', '启明新材'][index % 6],
    status: ['执行中', '待审核', '已完成', '执行中', '待开始', '已归档'][index % 6],
  }));
</script>

<main class="evidence-shell">
  <h1>Scrollable table</h1>
  <p class="evidence-copy">A mirrored horizontal scrollbar keeps wide desktop tables operable without hiding the native table container.</p>
  <section class="evidence-panel">
    <h2>底部镜像滚动条</h2>
    <ScrollableTable {scrollMode} {scrollbarPlacement}>
      {#snippet tableContent()}
        <Table.Header>
          <Table.Row>
            <Table.Head>委托单号</Table.Head>
            <Table.Head>客户</Table.Head>
            <Table.Head>状态</Table.Head>
            <Table.Head>负责人</Table.Head>
            <Table.Head>设备</Table.Head>
            <Table.Head>完成期限</Table.Head>
            <Table.Head>最近更新</Table.Head>
            <Table.Head class="text-right">操作</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each rows as row (row.id)}
            <Table.Row>
              <Table.Cell><strong>{row.id}</strong></Table.Cell>
              <Table.Cell>{row.customer}</Table.Cell>
              <Table.Cell>{row.status}</Table.Cell>
              <Table.Cell>张工</Table.Cell>
              <Table.Cell>高低温试验箱</Table.Cell>
              <Table.Cell>2026-11-08</Table.Cell>
              <Table.Cell>2026-10-29 09:30</Table.Cell>
              <Table.Cell class="text-right">查看</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      {/snippet}
      {#if native}
        <table class="wide-table">{@render tableContent()}</table>
      {:else}
        <Table.Root class="wide-table">{@render tableContent()}</Table.Root>
      {/if}
    </ScrollableTable>
  </section>
</main>

<style>
  :global(body) { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
  .evidence-shell { min-height: 100vh; padding: 48px; display: grid; align-content: start; gap: 16px; }
  h1, h2 { margin: 0; }
  h1 { font-size: 24px; }
  h2 { font-size: 16px; }
  .evidence-copy { margin: 0 0 12px; color: #475569; }
  .evidence-panel { display: grid; gap: 16px; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px; background: white; min-width: 0; }
  :global(.wide-table) { min-width: 1800px; }
</style>
