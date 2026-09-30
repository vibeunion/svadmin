<script lang="ts">
  import { Plus, Save, ArrowLeft, ArrowRight } from '@lucide/svelte';
  import PagePattern, { type PagePatternKind } from '../src/components/PagePattern.svelte';
  import DataState from '../src/components/content/DataState.svelte';
  import FilterToolbar from '../src/components/content/FilterToolbar.svelte';
  import { Button } from '../src/components/ui/button/index.js';
  import { Input } from '../src/components/ui/input/index.js';
  import SettingsGroup from '../src/components/content/SettingsGroup.svelte';
  import SettingsFieldRow from '../src/components/content/SettingsFieldRow.svelte';

  let { kind = 'list', viewState = 'ready' }: {
    kind?: PagePatternKind;
    viewState?: 'ready' | 'empty' | 'loading' | 'error' | 'forbidden';
  } = $props();
  const id = $props.id();
  let query = $state('');
  let selected = $state(0);
  let name = $state('华东检测中心');
  let savedName = $state('华东检测中心');
  let savedOnce = $state(false);
  let recovered = $state(false);
  let page = $state(0);
  let mode = $state<'list' | 'create'>('list');
  const initialRow = { name: '华东检测中心', owner: '李明', status: '处理中', count: 12 };
  let rows = $state([
    { name: '华东检测中心', owner: '李明', status: '处理中', count: 12 },
    { name: '新能源汽车高压电气安全与环境可靠性联合实验室', owner: '王静', status: '待审核', count: 8 },
    { name: '材料分析实验室', owner: '陈浩', status: '已完成', count: 6 },
  ]);
  const filtered = $derived(rows.filter(row => row.name.includes(query.trim())));
  const visible = $derived(filtered.slice(page * 2, page * 2 + 2));
  const titles = { list: '客户项目', form: '编辑客户', detail: '客户详情', workspace: '项目处理', dashboard: '项目概览' };
  const activeState = $derived(recovered ? 'ready' : viewState);
  const active = $derived(rows[selected] ?? initialRow);
  function resetSearch(value: string) { query = value; page = 0; }
  function save() {
    const value = name.trim();
    if (!value) return;
    if (mode === 'create') {
      if (rows.some(row => row.name === value)) return;
      rows = [...rows, { name: value, owner: '未分配', status: '待审核', count: 0 }];
      mode = 'list';
      resetSearch(value);
    }
    savedName = value;
    name = value;
    savedOnce = true;
  }
</script>

<div class="example">
  <PagePattern {kind} title={titles[kind]}>
    {#snippet actions()}
      {#if kind === 'list' && activeState === 'ready'}
        <Button onclick={() => { mode = mode === 'list' ? 'create' : 'list'; name = mode === 'create' ? '' : savedName; savedOnce = false; }}>{#if mode === 'list'}<Plus size={16} />新建项目{:else}<ArrowLeft size={16} />返回列表{/if}</Button>
      {/if}
    {/snippet}
    {#snippet toolbar()}
      {#if kind === 'list' && activeState === 'ready' && mode === 'list'}
        <FilterToolbar bind:query={() => query, resetSearch} placeholder="搜索客户项目" clearLabel="清除搜索" />
      {/if}
    {/snippet}
    {#snippet metrics()}
      {#if kind === 'dashboard' && activeState === 'ready'}
        {#each rows as row (row.name)}
          <div class="metric"><span>{row.status}</span><strong>{row.count}</strong></div>
        {/each}
      {/if}
    {/snippet}

    {#if activeState !== 'ready'}
      <DataState state={activeState} {...(activeState === 'empty' ? { title: '还没有项目', description: '当前没有可查看的项目。' } : {})}
        {...(activeState === 'error' ? { retry: () => { recovered = true; } } : {})} />
    {:else if kind === 'form' || mode === 'create'}
      <SettingsGroup title={mode === 'create' ? '项目信息' : '基本信息'}>
        <SettingsFieldRow label="客户名称" controlId={`${id}-name`}>
          {#snippet control()}<Input id={`${id}-name`} value={name} oninput={event => { name = event.currentTarget.value; }} />{/snippet}
        </SettingsFieldRow>
      </SettingsGroup>
      <div class="commands">
        <span role="status">{name !== savedName ? '有未保存的修改' : savedOnce ? '已保存至本次演示' : ''}</span>
        <Button disabled={!name.trim() || (mode === 'create' ? rows.some(row => row.name === name.trim()) : name === savedName)} onclick={save}><Save size={16} />保存</Button>
      </div>
    {:else if kind === 'detail'}
      <dl><dt>客户名称</dt><dd>{active.name}</dd><dt>负责人</dt><dd>{active.owner}</dd><dt>状态</dt><dd>{active.status}</dd></dl>
    {:else if kind === 'workspace'}
      <div class="workarea">
        <nav aria-label="项目选择">{#each rows as row, index (row.name)}<button class:chosen={selected === index} aria-pressed={selected === index} onclick={() => { selected = index; }}>{row.name}<small>{row.status}</small></button>{/each}</nav>
        <section aria-label="项目详情"><h2>{active.name}</h2><dl><dt>负责人</dt><dd>{active.owner}</dd><dt>状态</dt><dd>{active.status}</dd></dl></section>
      </div>
    {:else}
      {#if filtered.length === 0}
        <DataState state="empty" title="没有匹配的项目" description="请调整搜索条件。">
          {#snippet action()}<Button variant="outline" onclick={() => resetSearch('')}>清除筛选</Button>{/snippet}
        </DataState>
      {:else}
        <div class="table-scroll">
          <table><thead><tr><th scope="col">客户项目</th><th scope="col">负责人</th><th scope="col">状态</th></tr></thead>
            <tbody>{#each kind === 'dashboard' ? rows : visible as row (row.name)}<tr><td>{row.name}</td><td>{row.owner}</td><td>{row.status}</td></tr>{/each}</tbody>
          </table>
        </div>
        {#if kind === 'list'}<div class="commands"><span>共 {filtered.length} 项</span>
          <Button variant="outline" size="icon" title="上一页" aria-label="上一页" disabled={page === 0} onclick={() => { page -= 1; }}><ArrowLeft size={16} /></Button>
          <Button variant="outline" size="icon" title="下一页" aria-label="下一页" disabled={(page + 1) * 2 >= filtered.length} onclick={() => { page += 1; }}><ArrowRight size={16} /></Button>
        </div>{/if}
      {/if}
    {/if}
  </PagePattern>
</div>

<style>
  .example { padding: 24px; color: var(--foreground); background: var(--background); min-height: 100vh; box-sizing: border-box; font-size: 14px; }
  .metric { min-width: 0; border-bottom: 1px solid var(--border); padding: 16px 0; display: grid; gap: 8px; }
  .metric strong { font-size: 28px; }
  .metric span, dt, small { color: var(--muted-foreground); }
  .commands { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
  .commands span { margin-right: auto; }
  .table-scroll { min-width: 0; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { text-align: left; padding: 12px; border-bottom: 1px solid var(--border); overflow-wrap: anywhere; }
  th:first-child { width: 55%; }
  th { background: var(--muted); font-weight: 500; }
  dl { display: grid; grid-template-columns: minmax(80px, 1fr) minmax(0, 3fr); gap: 16px; margin: 0; }
  dd { margin: 0; overflow-wrap: anywhere; }
  .workarea { display: grid; grid-template-columns: minmax(200px, 1fr) minmax(0, 3fr); gap: 24px; }
  nav { display: grid; align-content: start; border-right: 1px solid var(--border); padding-right: 16px; }
  nav button { border: 0; padding: 12px; background: transparent; color: var(--foreground); text-align: left; font: inherit; overflow-wrap: anywhere; cursor: pointer; }
  nav button.chosen { background: var(--muted); }
  nav button:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  small { display: block; margin-top: 8px; }
  section { min-width: 0; }
  h2 { font-size: 18px; line-height: 1.5; margin: 0 0 24px; overflow-wrap: anywhere; }
  @media (max-width: 640px) { .example { padding: 16px; } .workarea { grid-template-columns: minmax(0, 1fr); } nav { border-right: 0; padding-right: 0; border-bottom: 1px solid var(--border); } }
</style>
