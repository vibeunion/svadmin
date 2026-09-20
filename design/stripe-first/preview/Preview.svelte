<script lang="ts">
  import { onDestroy, tick, untrack } from 'svelte';
  import { createI18nScope, provideI18nScope } from '@svadmin/core/i18n';
  import { Button } from '../../../packages/ui/dist/components/ui/button/index.js';
  import { Input } from '../../../packages/ui/dist/components/ui/input/index.js';
  import { Badge } from '../../../packages/ui/dist/components/ui/badge/index.js';
  import * as Table from '../../../packages/ui/dist/components/ui/table/index.js';
  import ContentPageShell from '../../../packages/ui/dist/components/content/ContentPageShell.svelte';
  import ContentPageHeader from '../../../packages/ui/dist/components/content/ContentPageHeader.svelte';
  import FilterToolbar from '../../../packages/ui/dist/components/content/FilterToolbar.svelte';
  import DataState from '../../../packages/ui/dist/components/content/DataState.svelte';
  import DescriptionList from '../../../packages/ui/dist/components/content/DescriptionList.svelte';
  import StatusBadge from '../../../packages/ui/dist/components/content/StatusBadge.svelte';
  import SettingsGroup from '../../../packages/ui/dist/components/content/SettingsGroup.svelte';
  import SettingsFieldRow from '../../../packages/ui/dist/components/content/SettingsFieldRow.svelte';
  import WorkspaceLayout from '../../../packages/ui/dist/components/content/WorkspaceLayout.svelte';
  import SectionHeader from '../../../packages/ui/dist/components/content/SectionHeader.svelte';
  import PageToolbar from '../../../packages/ui/dist/components/content/PageToolbar.svelte';
  import ApiKeyList from '../../../packages/ui/dist/components/content/ApiKeyList.svelte';
  import { productList } from '../../../packages/ui/dist/recipes.js';
  import { ChevronRight, Users, Settings2, PanelsTopLeft, UserRound } from '@lucide/svelte';
  import { customers, filterCustomers, readPreviewOptions, scenarios, settingsSeed } from './model.mjs';

  const initial = readPreviewOptions(window.location.search);
  let view = $state(initial.view);
  let scenario = $state(initial.state);
  let locale = $state(initial.locale);
  let theme = $state(initial.theme);
  let density = $state<'compact' | 'comfortable'>(initial.density === 'comfortable' ? 'comfortable' : 'compact');
  const scope = createI18nScope({ locale: initial.locale });
  provideI18nScope(scope);
  $effect(() => { scope.setLocale(locale); document.documentElement.lang = locale; });
  const tx = (zh: string, en: string) => locale === 'zh-CN' ? zh : en;
  function viewLabel(key: string) {
    const labels: Record<string, string> = { components: tx('组件状态', 'Component states'), 'resource-list': tx('客户列表', 'Customers'), 'record-detail': tx('客户详情', 'Customer detail'), settings: tx('工作区设置', 'Settings') };
    return Object.hasOwn(labels, key) ? labels[key] : key;
  }
  function stateLabel(key: string) {
    const labels: Record<string, string> = { ready: tx('正常', 'Ready'), loading: tx('加载中', 'Loading'), 'initial-empty': tx('首次无数据', 'First use'), 'filtered-empty': tx('筛选无结果', 'No matches'), error: tx('请求失败', 'Error'), forbidden: tx('无权限', 'Forbidden'), partial: tx('部分数据', 'Partial'), dirty: tx('待保存', 'Unsaved'), invalid: tx('校验失败', 'Invalid'), saving: tx('保存中', 'Saving'), saved: tx('保存成功', 'Saved'), readonly: tx('只读', 'Read only') };
    return Object.hasOwn(labels, key) ? labels[key] : key;
  }
  const listStyles = productList();
  let statusFilter = $state<'all' | 'active' | 'pending'>('all');
  const statuses = ['all', 'active', 'pending'] as const;
  const statusLabel = (status: string) => status === 'active' ? tx('已启用', 'Active') : status === 'pending' ? tx('待审核', 'Pending') : tx('全部客户', 'All customers');
  let query = $state('');
  let selectedId = $state(customers[0]?.id ?? '');
  const selected = $derived(customers.find(record => record.id === selectedId) ?? customers[0]);
  const filtered = $derived(filterCustomers(query, statusFilter));
  let sample = $state('');
  let allowCreate = $state(true);
  let demoNotice = $state('');
  let formName = $state('Aster Studio');
  let formEmail = $state('billing@aster.example');
  let phase = $state('ready');
  let failSave = $state(false);
  let savedName = $state('Aster Studio');
  let savedEmail = $state('billing@aster.example');
  let saveGeneration = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  const readonly = $derived(phase === 'readonly');
  const invalid = $derived(phase === 'invalid');
  const busy = $derived(phase === 'saving');
  const badgeVariants = ['default', 'secondary', 'outline', 'subtle-success', 'subtle-warning', 'subtle-destructive'] as const;
  const buttonSizes = ['sm', 'default', 'lg'] as const;
  const buttonVariants = ['default', 'outline'] as const;

  function clearSave() { saveGeneration += 1; if (timer) clearTimeout(timer); }
  function resetForm(state: string) {
    clearSave();
    const seed = settingsSeed(state);
    formName = seed.name; formEmail = seed.email; phase = seed.phase;
    savedName = 'Aster Studio'; savedEmail = 'billing@aster.example'; failSave = state === 'error';
    if (state === 'saved') timer = setTimeout(() => { phase = 'ready'; }, 3000);
  }
  $effect(() => { const key = view; const state = scenario; untrack(() => { clearSave(); demoNotice = ''; if (key === 'settings') resetForm(state); }); });
  onDestroy(() => { clearSave(); if (noticeTimer) clearTimeout(noticeTimer); });

  async function navigate(next: string) {
    if (!Object.hasOwn(scenarios, next)) return;
    view = next; scenario = 'ready';
    await tick(); document.getElementById('kit-main')?.focus();
  }
  function changed() {
    clearSave();
    phase = formName === savedName && formEmail === savedEmail ? 'ready' : 'dirty';
  }
  function save(event: SubmitEvent) {
    event.preventDefault();
    if (busy || readonly) return;
    clearSave();
    if (!formName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) { phase = 'invalid'; return; }
    phase = 'saving'; const generation = saveGeneration;
    // 仅模拟生命周期；任何预览动作均不调用生产 API。
    timer = setTimeout(() => {
      if (generation !== saveGeneration) return;
      if (failSave) { phase = 'error'; return; }
      savedName = formName; savedEmail = formEmail; phase = 'saved';
      timer = setTimeout(() => { if (generation === saveGeneration) phase = 'ready'; }, 3000);
    }, 500);
  }
  function demoCreate() {
    demoNotice = tx('这是合成数据设计预览，未创建真实客户。', 'Synthetic-data preview: no real customer was created.');
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { demoNotice = ''; }, 3000);
  }
  const money = (amount: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(amount);
</script>

<svelte:head><title>svadmin · {viewLabel(view)}</title></svelte:head>
<div class:dark={theme === 'dark'} class="svadmin-theme kit-root" data-theme={theme} data-preview-density={density}>
  <a class="kit-skip" href="#kit-main">{tx('跳到样例内容', 'Skip to preview')}</a>
  <header class="kit-controls" aria-label={tx('设计预览控制', 'Preview controls')}>
    <div class="kit-brand"><strong>svadmin</strong><span>Stripe-first · v0.1</span></div>
    <div class="kit-options">
      <label>{tx('主题', 'Theme')}<select data-testid="theme" bind:value={theme}><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <label>{tx('语言', 'Language')}<select data-testid="locale" bind:value={locale}><option value="zh-CN">中文</option><option value="en">English</option></select></label>
      <label>{tx('密度', 'Density')}<select data-testid="density" bind:value={density}><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select></label>
    </div>
  </header>
  <div class="kit-layout">
    <nav class="kit-nav" aria-label={tx('设计样例', 'Design examples')}>
      <p class="kit-eyebrow">Workspace</p>
      {#each Object.keys(scenarios) as key (key)}
        <button type="button" data-testid={'nav-' + key} aria-current={view === key ? 'page' : undefined} onclick={() => navigate(key)}><span aria-hidden="true">{#if key === 'resource-list'}<Users size={16} />{:else if key === 'record-detail'}<UserRound size={16} />{:else if key === 'settings'}<Settings2 size={16} />{:else}<PanelsTopLeft size={16} />{/if}</span>{viewLabel(key)}</button>
      {/each}
      <p class="kit-nav-note">{tx('真实组件 · 合成数据\n无后端写入', 'Real components · Synthetic data\nNo backend writes')}</p>
    </nav>
    <div class="kit-workspace">
      <div class="kit-scenario">
        <label>{tx('场景', 'Scenario')}<select data-testid="scenario" bind:value={scenario}>{#each scenarios[view] ?? [] as state (state)}<option value={state}>{stateLabel(state)}</option>{/each}</select></label>
        {#if view === 'resource-list'}<label class="kit-check"><input data-testid="allow-create" type="checkbox" bind:checked={allowCreate} />{tx('允许创建（模拟）', 'Allow create (mock)')}</label>{/if}
        {#if view === 'settings'}<label class="kit-check"><input data-testid="fail-save" type="checkbox" bind:checked={failSave} />{tx('模拟保存失败', 'Simulate save failure')}</label>{/if}
        <span>{tx('浏览器样例；尚未同步到 Figma', 'Browser specimen; not synchronized to Figma')}</span>
      </div>
      <main id="kit-main" tabindex="-1" data-testid="specimen" data-view={view} data-scenario={scenario}>
        <ContentPageShell width="wide" pageId="design-kit">
        {#if view === 'components'}
          <ContentPageHeader title={viewLabel(view)} eyebrow="FOUNDATIONS" description={tx('查看现有组件的尺寸、语义状态及键盘表现。这里没有复制第三方图层。', 'Inspect existing component sizes, semantic states and keyboard behavior. No third-party layers are copied.')} />
          <section class="kit-section" aria-labelledby="buttons-title"><h2 id="buttons-title">Button</h2><p class="kit-muted">{tx('两种外观 × 三种尺寸 × 默认／禁用；使用真实组件。', 'Two variants × three sizes × enabled/disabled; actual components.')}</p>
            {#each buttonVariants as variant (variant)}<div class="kit-demo-row">{#each buttonSizes as size (size)}<Button {variant} {size}>{tx('新增客户', 'Create customer')}</Button><Button {variant} {size} disabled>{tx('新增客户', 'Create customer')}</Button>{/each}</div>{/each}
          </section>
          <section class="kit-section" aria-labelledby="inputs-title"><h2 id="inputs-title">Input</h2><div class="kit-field-grid">
            <label for="demo-default" class="kit-field">{tx('默认 / 可输入', 'Default / editable')}<Input id="demo-default" data-testid="input-default" bind:value={sample} placeholder={tx('输入客户名称', 'Enter customer name')} /><span class="kit-muted">{tx('使用 Tab 检查焦点。', 'Use Tab to inspect focus.')}</span></label>
            <label for="demo-filled" class="kit-field">{tx('已有内容', 'Filled')}<Input id="demo-filled" value="Aster Studio" /></label>
            <label for="demo-disabled" class="kit-field">{tx('禁用', 'Disabled')}<Input id="demo-disabled" data-testid="input-disabled" value="Aster Studio" disabled /></label>
            <label for="demo-readonly" class="kit-field">{tx('只读', 'Read only')}<Input id="demo-readonly" data-testid="input-readonly" value="demo_001" readonly /></label>
            <label for="demo-invalid" class="kit-field">{tx('校验失败', 'Invalid')}<Input id="demo-invalid" data-testid="input-invalid" value="invalid" aria-invalid="true" aria-describedby="invalid-hint" /><span id="invalid-hint" class="kit-error">{tx('请输入有效的邮箱地址。', 'Enter a valid email address.')}</span></label>
            <label for="demo-file" class="kit-field">{tx('文件', 'File')}<Input id="demo-file" data-testid="input-file" type="file" accept=".csv" /></label>
          </div></section>
          <section class="kit-section" aria-labelledby="badges-title"><h2 id="badges-title">Badge</h2><div class="kit-demo-row">{#each badgeVariants as variant (variant)}<Badge {variant}>{variant}</Badge>{/each}</div><div class="kit-demo-row"><StatusBadge status="success" label={tx('已启用', 'Active')} /><StatusBadge status="warning" label={tx('待审核', 'Pending review')} /><StatusBadge status="danger" label={tx('失败', 'Failed')} /><StatusBadge status="info" label={tx('处理中', 'Processing')} /><StatusBadge status="neutral" label={tx('已归档', 'Archived')} /></div></section>
        {:else if view === 'resource-list'}
          <ContentPageHeader title={viewLabel(view)} eyebrow="WORKSPACE" description={tx('管理客户、查看状态并保留当前搜索上下文。', 'Review customers and status without losing your search context.')}>
            {#snippet actions()}{#if scenario !== 'forbidden' && allowCreate}<Button data-testid="create" onclick={demoCreate}>{tx('新增客户', 'Create customer')}</Button>{/if}{/snippet}
          </ContentPageHeader>
          {#if demoNotice}<p role="status" class="kit-inline-status">{demoNotice}</p>{/if}
          {#if scenario === 'forbidden'}<DataState state="forbidden" title={tx('无权查看客户', 'Customer access restricted')} description={tx('请联系工作区管理员。此样例不会读取客户数据。', 'Contact the workspace administrator. This scene does not display customer data.')} />
          {:else}
            <div class={listStyles.filters} role="group" aria-label={tx('客户状态', 'Customer status')}>
              {#each statuses as status (status)}<button type="button" class={listStyles.filter} data-testid={'filter-' + status} aria-pressed={statusFilter === status} onclick={() => { statusFilter = status; if (scenario === 'filtered-empty') scenario = 'ready'; }}>
                {statusLabel(status)}<span class={listStyles.filterCount}>{#if scenario === 'ready'}<span>{customers.filter(record => status === 'all' || record.status === status).length}</span>{:else if scenario === 'initial-empty'}0{:else}—{/if}</span>
              </button>{/each}
            </div>
            <PageToolbar>
              <FilterToolbar bind:query placeholder={tx('搜索客户', 'Search customers')} clearLabel={tx('清除搜索', 'Clear search')} {density} />
              {#snippet trailing()}{#if statusFilter !== 'all'}<Button variant="ghost" size="sm" data-testid="clear-status" onclick={() => statusFilter = 'all'}>{tx('清除状态筛选', 'Clear status filter')}</Button>{/if}{/snippet}
            </PageToolbar>
            {#if scenario === 'loading'}<DataState state="loading" loadingLabel={tx('正在加载客户', 'Loading customers')} />
            {:else if scenario === 'error'}<DataState state="error" title={tx('客户加载失败', 'Could not load customers')} description={tx('重试会保留当前搜索。', 'Retry keeps the current search.')} retry={() => scenario = 'ready'} retryLabel={tx('重试', 'Retry')} />
            {:else if scenario === 'initial-empty'}<DataState state="empty" title={tx('还没有客户', 'No customers yet')} description={allowCreate ? tx('使用右上方的操作开始创建。', 'Use the primary action above to get started.') : tx('客户创建后会显示在这里。', 'Customers will appear here once added.')} />
            {:else if scenario === 'filtered-empty' || filtered.length === 0}<DataState state="empty" title={tx('没有匹配的客户', 'No matching customers')} description={tx('调整搜索，不需要重新创建已有客户。', 'Adjust the search; do not recreate existing customers.')}>
              {#snippet action()}<Button data-testid="clear-filters" variant="outline" onclick={() => { query = ''; statusFilter = 'all'; scenario = 'ready'; }}>{tx('清除筛选', 'Clear filters')}</Button>{/snippet}
            </DataState>
            {:else}
              <!-- svelte-ignore a11y_no_noninteractive_tabindex (命名滚动区域需支持原生键盘滚动；keyboard.mjs 验证 Tab、方向键与焦点退出。) -->
              <div class={listStyles.table + ' kit-table-scroll'} role="region" aria-label={tx('客户数据', 'Customer data')} tabindex="0"><Table.Root {density}>
                <Table.Caption>{tx('合成数据，仅用于设计评审', 'Synthetic data for design review only')}</Table.Caption>
                <Table.Header><Table.Row><Table.Head>{tx('客户', 'Customer')}</Table.Head><Table.Head>{tx('状态', 'Status')}</Table.Head><Table.Head data-align="end" class={listStyles.numeric}>{tx('交易总额', 'Volume')}</Table.Head><Table.Head><span class="kit-visually-hidden">{tx('操作', 'Actions')}</span></Table.Head></Table.Row></Table.Header>
                <Table.Body>{#each filtered as customer (customer.id)}<Table.Row><Table.Cell><div class={listStyles.identity}><span class={listStyles.avatar} aria-hidden="true">{customer.id.slice(-2)}</span><div><span class={listStyles.name}>{customer.name}</span><span class={listStyles.secondary}>{customer.email}</span></div></div></Table.Cell><Table.Cell><StatusBadge status={customer.status === 'active' ? 'success' : 'warning'} label={customer.status === 'active' ? tx('已启用', 'Active') : tx('待审核', 'Pending')} /></Table.Cell><Table.Cell data-align="end" class={listStyles.numeric}>{money(customer.amount)}</Table.Cell><Table.Cell><Button data-testid={'open-' + customer.id} variant="ghost" size="sm" onclick={() => { selectedId = customer.id; void navigate('record-detail'); }}>{tx('查看', 'View')}<ChevronRight size={14} aria-hidden="true" /></Button></Table.Cell></Table.Row>{/each}</Table.Body>
              </Table.Root></div>
              <p class={listStyles.footer} data-testid="count">{filtered.length} {tx('位客户', 'customers')}</p>
            {/if}
          {/if}
        {:else if view === 'record-detail'}
          <div><Button data-testid="back" variant="outline" size="sm" onclick={() => navigate('resource-list')}>{tx('返回客户列表', 'Back to customers')}</Button></div>
          <ContentPageHeader title={scenario === 'forbidden' || scenario === 'loading' || scenario === 'error' ? viewLabel(view) : selected?.name ?? viewLabel(view)} eyebrow="CUSTOMER" description={scenario === 'ready' || scenario === 'partial' ? selected?.id ?? '' : ''} />
          {#if scenario === 'forbidden'}<DataState state="forbidden" title={tx('客户详情受限', 'Customer details restricted')} description={tx('没有读取权限，不展示身份或属性。', 'Identity and attributes are hidden without read access.')} />
          {:else if scenario === 'loading'}<DataState state="loading" loadingLabel={tx('正在加载详情', 'Loading details')} />
          {:else if scenario === 'error'}<DataState state="error" title={tx('详情加载失败', 'Could not load details')} retry={() => scenario = 'ready'} retryLabel={tx('重试', 'Retry')} />
          {:else if selected}
            <StatusBadge status={selected.status === 'active' ? 'success' : 'warning'} label={selected.status === 'active' ? tx('已启用', 'Active') : tx('待审核', 'Pending')} />
            <WorkspaceLayout secondaryWidth="20rem">
              {#snippet primary()}
                <section class="kit-section kit-activity" aria-labelledby="activity-title">
                  <SectionHeader id="activity-title" title={tx('活动记录', 'Activity')} description={tx('按时间查看与此客户有关的变更。', 'Changes associated with this customer, in time order.')} />
                  {#if scenario === 'partial'}<DataState state="error" title={tx('活动记录暂不可用', 'Activity unavailable')} description={tx('已加载的客户信息保持可见。', 'Loaded customer information remains visible.')} retry={() => scenario = 'ready'} retryLabel={tx('重试此部分', 'Retry this section')} />
                  {:else}<ol class="kit-timeline"><li><strong>{tx('客户信息已更新', 'Customer updated')}</strong><span class="kit-muted">2026-09-19 09:30 UTC · {tx('合成事件', 'Synthetic event')}</span></li><li><strong>{tx('客户已创建', 'Customer created')}</strong><span class="kit-muted">{selected?.created} · {tx('合成事件', 'Synthetic event')}</span></li></ol>{/if}
                </section>
              {/snippet}
              {#snippet secondary()}
                <section class="kit-section" aria-labelledby="attributes-title">
                  <SectionHeader id="attributes-title" title={tx('客户信息', 'Details')} />
                  <DescriptionList columns={1} {density} items={[{ label: tx('邮箱', 'Email'), value: selected?.email }, { label: tx('创建日期', 'Created'), value: selected?.created }, { label: tx('交易总额', 'Volume'), value: money(selected?.amount ?? 0) }, { label: tx('数据来源', 'Data source'), value: tx('合成演示数据', 'Synthetic fixture') }]} />
                </section>
              {/snippet}
            </WorkspaceLayout>
          {/if}
        {:else if view === 'settings'}
          <ContentPageHeader title={viewLabel(view)} eyebrow="WORKSPACE" description={tx('保存失败保留输入；成功反馈会自动消失。', 'Failed saves retain input; success feedback dismisses automatically.')} />
          <WorkspaceLayout secondaryWidth="16rem">
            {#snippet primary()}
          <form novalidate onsubmit={save} data-testid="settings-form" aria-busy={busy}>
            <div id="settings-general"><SettingsGroup title={tx('基本信息', 'General information')} description={tx('这些设置只在当前预览内生效。', 'These settings affect this preview only.')}>
              <SettingsFieldRow label={tx('工作区名称', 'Workspace name')} description={tx('用于导航与内部通知。', 'Shown in navigation and internal notifications.')}>
                {#snippet control()}<div class="kit-form-control"><Input data-testid="workspace-name" aria-label={tx('工作区名称', 'Workspace name')} bind:value={formName} oninput={(event) => { formName = event.currentTarget.value; changed(); }} disabled={busy} {readonly} aria-invalid={invalid && !formName.trim()} aria-describedby={invalid && !formName.trim() ? 'name-error' : undefined} />{#if invalid && !formName.trim()}<p id="name-error" role="alert" class="kit-error">{tx('请填写工作区名称。', 'Enter a workspace name.')}</p>{/if}</div>{/snippet}
              </SettingsFieldRow>
              <SettingsFieldRow label={tx('账单邮箱', 'Billing email')} description={tx('不会发送真实邮件。', 'No real email is sent.')} separated>
                {#snippet control()}<div class="kit-form-control"><Input data-testid="billing-email" aria-label={tx('账单邮箱', 'Billing email')} type="email" bind:value={formEmail} oninput={(event) => { formEmail = event.currentTarget.value; changed(); }} disabled={busy} {readonly} aria-invalid={invalid && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)} aria-describedby={invalid && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail) ? 'email-error' : undefined} />{#if invalid && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)}<p id="email-error" role="alert" class="kit-error">{tx('请输入有效邮箱。', 'Enter a valid email.')}</p>{/if}</div>{/snippet}
              </SettingsFieldRow>
            </SettingsGroup></div>
            <div class="kit-save-bar">
              <div aria-live="polite" data-testid="save-state" data-phase={phase}>
                {#if phase === 'error'}<p role="alert" class="kit-error">{tx('保存失败，输入已保留。请重试。', 'Save failed. Input retained; try again.')}</p>
                {:else if phase === 'saved'}<p role="status">{tx('已保存', 'Saved')}</p>
                {:else if readonly}<p class="kit-muted">{tx('只读权限', 'Read-only access')}</p>
                {:else if busy}<p role="status">{tx('正在保存…', 'Saving…')}</p>
                {:else if phase === 'dirty'}<p class="kit-muted">{tx('有未保存的修改', 'Unsaved changes')}</p>{/if}
              </div>
              <Button data-testid="save" type="submit" disabled={busy || readonly || phase === 'ready' || phase === 'saved'}>{busy ? tx('正在保存…', 'Saving…') : tx('保存修改', 'Save changes')}</Button>
            </div>
          </form>
              <div id="settings-developer" class="kit-developer">
                <SettingsGroup title={tx('开发者访问', 'Developer access')} description={tx('只展示密钥元数据，不暴露或复制凭证。', 'Key metadata only. No credentials are exposed or copied.')}>
                  <ApiKeyList keys={[{ id: 'fixture-key-1', name: tx('只读集成（样例）', 'Read-only integration (sample)'), prefix: 'example', maskedToken: '•••• •••• 001', permissions: ['customers:read'], createdAt: '2026-09-01', lastUsedAt: tx('合成记录', 'Synthetic record') }]} />
                </SettingsGroup>
              </div>
            {/snippet}
            {#snippet secondary()}
              <nav class="kit-settings-nav" aria-label={tx('页面内导航', 'On this page')}>
                <p class="kit-muted">{tx('此页面', 'On this page')}</p>
                <a href="#settings-general">{tx('基本信息', 'General information')}</a>
                <a href="#settings-developer">{tx('开发者访问', 'Developer access')}</a>
              </nav>
              <p class={listStyles.help}>{tx('此预览不连接生产数据；保存仅影响当前会话。', 'This preview is disconnected from production. Saves affect this session only.')}</p>
            {/snippet}
          </WorkspaceLayout>

        {/if}
        </ContentPageShell>
      </main>
    </div>
  </div>
</div>
