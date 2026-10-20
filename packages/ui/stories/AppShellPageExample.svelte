<script lang="ts">
  import { Bell, Inbox, LayoutDashboard, Search, Settings } from '@lucide/svelte';
  import AppShellPage from '../src/components/AppShellPage.svelte';
  import PagePattern from '../src/components/PagePattern.svelte';
  import { Input } from '../src/components/ui/input/index.js';
  import { Button } from '../src/components/ui/button/index.js';

  let {
    width = 'default',
    collapsed = false,
  }: {
    width?: 'narrow' | 'default' | 'wide' | 'full';
    collapsed?: boolean;
  } = $props();

  const groups = [
    { label: '工作台', icon: LayoutDashboard, items: ['项目概览', '待办队列'] },
    { label: '业务', icon: Inbox, items: ['委托单', '报告编制', '任务分派'] },
    { label: '设置', icon: Settings, items: ['组织与成员'] },
  ];

  let mobileOpen = $state(false);
  let query = $state('');
  const rows = $derived(
    [
      { name: '华东检测中心', owner: '李明', status: '处理中' },
      { name: '材料分析实验室', owner: '王静', status: '待审核' },
      { name: '可靠性联合实验室', owner: '陈浩', status: '已完成' },
    ].filter((row) => row.name.includes(query.trim())),
  );
</script>

<AppShellPage
  {width}
  {collapsed}
  bind:mobileOpen
  label="主导航"
>
  {#snippet sidebar()}
    {#each groups as group (group.label)}
      <div class="demo-group">
        <p class="demo-group-label">{collapsed ? '' : group.label}</p>
        {#each group.items as item (item)}
          <button type="button" class="demo-nav-item" class:demo-nav-item--active={item === '委托单'}>
            <group.icon size={16} aria-hidden="true" />
            {#if !collapsed}<span>{item}</span>{/if}
          </button>
        {/each}
      </div>
    {/each}
  {/snippet}

  {#snippet topbar()}
    <div class="demo-search">
      <Search size={16} aria-hidden="true" />
      <Input bind:value={query} placeholder="搜索委托单、报告、客户" aria-label="搜索" />
    </div>
  {/snippet}

  {#snippet topbarEnd()}
    <Button variant="ghost" size="icon" aria-label="通知"><Bell size={16} /></Button>
  {/snippet}

  {#snippet aside()}
    <PagePattern kind="detail" title="审核轨迹" description="最近的审批与变更记录">
      <ul class="demo-timeline">
        <li>10:24 李明 提交报告初稿</li>
        <li>09:58 王静 补充原始记录</li>
        <li>昨天 陈浩 完成方法确认</li>
      </ul>
    </PagePattern>
  {/snippet}

  {#snippet footer()}
    <span>svadmin AppShellPage</span>
    <span>路由与数据由宿主提供</span>
  {/snippet}

  <PagePattern kind="list" title="委托单" description="审核未完成的委托单并分派任务" eyebrow="业务">
    {#snippet toolbar()}
      <div class="demo-toolbar">
        <span>{rows.length} 条记录</span>
        <span>当前视图：全部</span>
      </div>
    {/snippet}
    <div class="demo-table" role="table" aria-label="委托单列表">
      <div class="demo-row demo-row--head" role="row">
        <span role="columnheader">客户</span>
        <span role="columnheader">负责人</span>
        <span role="columnheader">状态</span>
      </div>
      {#each rows as row (row.name)}
        <div class="demo-row" role="row">
          <span role="cell">{row.name}</span>
          <span role="cell">{row.owner}</span>
          <span role="cell">{row.status}</span>
        </div>
      {/each}
    </div>
  </PagePattern>
</AppShellPage>

<style>
  .demo-group {
    display: grid;
    gap: var(--svadmin-space-1);
  }
  .demo-group-label {
    margin: 0;
    padding-inline: var(--svadmin-space-2);
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-caption);
    font-weight: 600;
  }
  .demo-nav-item {
    display: flex;
    align-items: center;
    gap: var(--svadmin-space-2);
    height: var(--svadmin-control-h);
    border: 0;
    border-radius: var(--radius-md);
    background: transparent;
    padding-inline: var(--svadmin-space-2);
    color: var(--sidebar-foreground, var(--foreground));
    font-size: var(--svadmin-text-body);
    text-align: start;
    cursor: pointer;
  }
  .demo-nav-item:hover {
    background: var(--muted);
  }
  .demo-nav-item--active {
    background: var(--accent);
    color: var(--accent-foreground);
    font-weight: 600;
  }
  .demo-search {
    display: flex;
    align-items: center;
    gap: var(--svadmin-space-2);
    width: min(100%, 24rem);
    color: var(--muted-foreground);
  }
  .demo-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--svadmin-space-2);
    width: 100%;
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-caption);
  }
  .demo-table {
    display: grid;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--card);
    overflow: hidden;
  }
  .demo-row {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
    align-items: center;
    gap: var(--svadmin-space-3);
    min-height: var(--svadmin-row-h);
    border-top: 1px solid var(--border);
    padding-inline: var(--svadmin-space-4);
    font-size: var(--svadmin-text-body);
    color: var(--foreground);
  }
  .demo-row--head {
    border-top: 0;
    background: var(--muted);
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-label);
    font-weight: 600;
  }
  .demo-timeline {
    display: grid;
    gap: var(--svadmin-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-body);
  }
</style>