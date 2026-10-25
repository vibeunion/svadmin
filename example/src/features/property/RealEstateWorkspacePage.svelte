<script lang="ts">
  import { onMount } from 'svelte';
  import { useList } from '@svadmin/core';
  import { definedOptions } from '@svadmin/core/options';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge, Button, ContentPageHeader, ContentPageShell, MetricBlock } from '@svadmin/ui';
  import { Heart, Plus } from '@lucide/svelte';
  import { demoContracts } from '../../resource-contracts';
  import { demoRenderers } from '../../resource-rendering';
  import { readHashView, replaceHashParam } from '../../utils/hashView';
  import { localDateKey } from '../../workspace/workspace-policy';
  import { readSavedIdsResult, saveIds } from '../../workspace/workspace-session';
  import WorkspaceQueryState from '../../workspace/WorkspaceQueryState.svelte';
  import WorkspaceRecordLinks from '../../workspace/WorkspaceRecordLinks.svelte';

  let { resourceName = 'properties' } = $props<{ resourceName?: string }>();
  const i18n = useTranslation();
  const isZh = $derived(i18n.locale === 'zh-CN');
  let view = $state(readHashView('portfolio'));
  let search = $state('');
  let market = $state('');
  let assetType = $state('');
  let status = $state('');
  let maximumPrice = $state<number | undefined>();
  let saved = $state<number[]>([]);
  let savedStorageError = $state(false);
  let feedback = $state('');
  let todayKey = $state(localDateKey());
  let todayRefreshTimer: number | undefined;
  const savedKey = 'svadmin-example-property-favorites';
  function readSaved(): void {
    const result = readSavedIdsResult(savedKey);
    saved = result.ids;
    savedStorageError = result.status === 'error';
    feedback = '';
  }
  function refreshToday(): void {
    todayKey = localDateKey();
  }
  function scheduleTodayRefresh(): void {
    if (typeof window === 'undefined') return;
    if (todayRefreshTimer !== undefined) window.clearTimeout(todayRefreshTimer);
    const now = new Date();
    const nextDay = new Date(now);
    nextDay.setHours(24, 0, 0, 50);
    todayRefreshTimer = window.setTimeout(() => {
      refreshToday();
      scheduleTodayRefresh();
    }, Math.max(1000, nextDay.getTime() - now.getTime()));
  }
  onMount(() => {
    readSaved();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshToday();
        scheduleTodayRefresh();
      }
    };
    window.addEventListener('focus', refreshToday);
    document.addEventListener('visibilitychange', onVisibilityChange);
    scheduleTodayRefresh();
    return () => {
      window.removeEventListener('focus', refreshToday);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (todayRefreshTimer !== undefined) window.clearTimeout(todayRefreshTimer);
    };
  });
  const activeResource = $derived((['properties', 'property_agents', 'property_leads', 'property_showings'] as const).find(name => name === resourceName) ?? 'properties');
  const isPropertyView = $derived(activeResource === 'properties');
  const propertiesQuery = useList({
    resource: demoContracts.properties, pagination: { mode: 'off' }, errorNotification: false,
    get queryOptions() { return { enabled: activeResource === 'properties' }; },
  });
  const agentsQuery = useList({
    resource: demoContracts.property_agents, pagination: { mode: 'off' }, errorNotification: false,
    get queryOptions() { return { enabled: activeResource === 'property_agents' }; },
  });
  const leadsQuery = useList({
    resource: demoContracts.property_leads, pagination: { mode: 'off' }, errorNotification: false,
    get queryOptions() { return { enabled: activeResource === 'property_leads' }; },
  });
  const showingsQuery = useList({
    resource: demoContracts.property_showings, pagination: { mode: 'off' }, sorters: [{ field: 'scheduledDate', order: 'asc' }], errorNotification: false,
    get queryOptions() { return { enabled: activeResource === 'property_showings' }; },
  });
  const properties = $derived(demoRenderers.properties.records(propertiesQuery.data?.data ?? []));
  const agents = $derived(demoRenderers.property_agents.records(agentsQuery.data?.data ?? []));
  const leads = $derived(demoRenderers.property_leads.records(leadsQuery.data?.data ?? []));
  const showings = $derived(demoRenderers.property_showings.records(showingsQuery.data?.data ?? []));
  const navigation = $derived([
    { resource: 'properties', title: isZh ? '房源' : 'Properties', query: propertiesQuery },
    { resource: 'property_agents', title: isZh ? '顾问' : 'Agents', query: agentsQuery },
    { resource: 'property_leads', title: isZh ? '线索' : 'Leads', query: leadsQuery },
    { resource: 'property_showings', title: isZh ? '看房' : 'Showings', query: showingsQuery },
  ] as const);
  const current = $derived(navigation.find(item => item.resource === activeResource) ?? navigation[0]);
  const matches = (text: string) => text.toLowerCase().includes(search.trim().toLowerCase());
  const visibleProperties = $derived(properties.filter(item => matches(`${item.propertyName} ${item.market} ${item.assetType}`)
    && (!market || item.market === market) && (!assetType || item.assetType === assetType)
    && (!status || item.status === status) && (maximumPrice === undefined || item.askingPrice <= maximumPrice)
    && (view !== 'saved' || saved.includes(item.id))
    && (!['buy', 'sell'].includes(view) || item.status === 'listed')
    && (view !== 'rent' || item.occupancy < 100)
    && (view !== 'commercial' || ['office', 'industrial', 'retail', 'mixed_use'].includes(item.assetType))));
  const visibleAgents = $derived(agents.filter(item => matches(`${item.name} ${item.territory}`)));
  const visibleLeads = $derived(leads.filter(item => matches(`${item.leadName} ${item.notes}`)));
  const visibleShowings = $derived(showings.filter(item => matches(`${item.showingNumber} ${item.notes}`)));
  const visibleCount = $derived(isPropertyView ? visibleProperties.length : activeResource === 'property_agents' ? visibleAgents.length : activeResource === 'property_leads' ? visibleLeads.length : visibleShowings.length);
  const hasPropertyViewFilter = $derived(isPropertyView && ['buy', 'sell', 'rent', 'commercial', 'saved'].includes(view));
  const hasActiveFilters = $derived(Boolean(search.trim() || (isPropertyView && (market || assetType || status || maximumPrice !== undefined || hasPropertyViewFilter))));
  const savedViewError = $derived(isPropertyView && view === 'saved' && savedStorageError);
  const contentCount = $derived(savedViewError ? undefined : visibleCount);
  const money = (value: number) => new Intl.NumberFormat(isZh ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  function toggleSaved(id: number): void {
    if (savedStorageError) return;
    const next = saved.includes(id) ? saved.filter(value => value !== id) : [...saved, id];
    if (!saveIds(savedKey, next)) { feedback = isZh ? '收藏未保存，请检查浏览器存储设置后重试。' : 'Favorites were not saved. Check browser storage and retry.'; return; }
    saved = next; savedStorageError = false; feedback = '';
  }
  function resetFilters(): void {
    search = ''; market = ''; assetType = ''; status = ''; maximumPrice = undefined;
    if (hasPropertyViewFilter) {
      view = 'portfolio';
      replaceHashParam('view', null);
    }
  }
</script>

<svelte:window onhashchange={() => view = readHashView('portfolio')} onpopstate={() => view = readHashView('portfolio')} />
{#snippet actions()}
  <Button onclick={() => window.location.hash = `/${current.resource}/create`}><Plus class="size-4" />{isZh ? '新建' : 'Create'} {current.title}</Button>
{/snippet}
{#snippet filteredEmptyAction()}
  <Button variant="outline" onclick={resetFilters}>{isZh ? '清除筛选' : 'Clear filters'}</Button>
{/snippet}

<div data-app-page="real-estate-workspace" data-property-view={view} data-resource-name={resourceName}>
  <ContentPageShell pageId="real-estate-workspace" width="wide">
    <ContentPageHeader title={current.title} actions={actions} />
    <nav class="flex flex-wrap gap-4 border-b pb-3" aria-label={isZh ? '房产业务' : 'Property workspace'}>
      {#each navigation as item (item.resource)}<a class="text-sm font-medium text-primary" href={`#/${item.resource}`}>{item.title}</a>{/each}
      <a class="text-sm text-primary" href="#/properties?view=saved">{isZh ? '收藏' : 'Saved'}</a>
      <a class="text-sm text-primary" href="#/properties?view=map">{isZh ? '区域分布' : 'Markets'}</a>
    </nav>
    <label class="flex flex-wrap items-center gap-3 text-sm">{isZh ? '搜索' : 'Search'}<input class="min-w-0 flex-1 rounded-md border bg-background px-3 py-2" bind:value={search} /></label>
    {#if isPropertyView}
      <nav class="flex flex-wrap gap-4 text-sm" aria-label={isZh ? '房源视图' : 'Property views'}>
        <a href="#/properties" class="text-primary">{isZh ? '全部' : 'All'}</a>
        <a href="#/properties?view=buy" class="text-primary">{isZh ? '挂牌资产' : 'Listed assets'}</a>
        <a href="#/properties?view=rent" class="text-primary">{isZh ? '有空置资产' : 'Assets with vacancies'}</a>
        <a href="#/properties?view=commercial" class="text-primary">{isZh ? '商业资产' : 'Commercial'}</a>
      </nav>
      {#if ['buy', 'sell', 'rent'].includes(view)}<p class="text-sm text-muted-foreground">{isZh ? '按挂牌状态或出租率筛选；样例未记录买卖/租赁委托类型。' : 'Filtered by listing status or occupancy. Transaction mandates are not recorded in this sample.'}</p>{/if}
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label class="text-sm">{isZh ? '区域' : 'Market'}<select class="mt-1 w-full rounded-md border bg-background p-2" bind:value={market}><option value="">{isZh ? '全部' : 'All'}</option>{#each [...new Set(properties.map(item => item.market))] as value (value)}<option>{value}</option>{/each}</select></label>
        <label class="text-sm">{isZh ? '类型' : 'Type'}<select class="mt-1 w-full rounded-md border bg-background p-2" bind:value={assetType}><option value="">{isZh ? '全部' : 'All'}</option>{#each [...new Set(properties.map(item => item.assetType))] as value (value)}<option>{value}</option>{/each}</select></label>
        <label class="text-sm">{isZh ? '状态' : 'Status'}<select class="mt-1 w-full rounded-md border bg-background p-2" bind:value={status}><option value="">{isZh ? '全部' : 'All'}</option>{#each [...new Set(properties.map(item => item.status))] as value (value)}<option>{value}</option>{/each}</select></label>
        <label class="text-sm">{isZh ? '最高价格 USD' : 'Maximum price USD'}<input type="number" min="0" class="mt-1 w-full rounded-md border bg-background p-2" bind:value={maximumPrice} /></label>
      </div>
      <Button variant="ghost" onclick={resetFilters}>{isZh ? '清除筛选' : 'Clear filters'}</Button>
    {/if}
    {#if feedback}<p role="alert">{feedback}</p>{/if}
    {#if isPropertyView && view !== 'saved' && savedStorageError}
      <p role="alert">
        {isZh ? '收藏记录无法读取，暂不允许覆盖原收藏。' : 'Saved properties could not be read. Existing favorites will not be overwritten.'}
        <Button variant="outline" onclick={readSaved}>{isZh ? '重试收藏' : 'Retry saved properties'}</Button>
      </p>
    {/if}
    {#if activeResource === 'property_showings' && showingsQuery.isSuccess}
      <MetricBlock label={isZh ? '今日看房' : 'Today’s showings'} value={showings.filter(item => item.scheduledDate.slice(0, 10) === todayKey).length} />
    {/if}
    <WorkspaceQueryState query={current.query} {...definedOptions({ count: contentCount })} {hasActiveFilters} {filteredEmptyAction}>
      {#if savedViewError}
        <div role="alert" class="flex flex-wrap items-center gap-3 border-y py-4">
          <span>{isZh ? '收藏记录暂时无法读取，当前收藏视图不可用。' : 'Saved properties are temporarily unavailable.'}</span>
          <Button variant="outline" onclick={readSaved}>{isZh ? '重试收藏' : 'Retry saved properties'}</Button>
        </div>
      {:else if isPropertyView}
        {#if view === 'map'}
          <section class="border-y py-4">
            <h2 class="text-base font-semibold">{isZh ? '区域分布 · 无地理坐标' : 'Market distribution · no coordinates'}</h2>
            <div class="mt-3 grid gap-3 sm:grid-cols-3">{#each [...new Set(visibleProperties.map(item => item.market))] as value (value)}<MetricBlock label={value} value={visibleProperties.filter(item => item.market === value).length} />{/each}</div>
          </section>
        {/if}
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {#each visibleProperties as item (item.id)}
            <article class="min-w-0 rounded-lg border p-4">
              <div class="flex items-start justify-between gap-3"><h2 class="break-words text-base font-semibold">{item.propertyName}</h2><Button size="icon" variant="ghost" disabled={savedStorageError} aria-pressed={savedStorageError ? undefined : saved.includes(item.id)} aria-label={isZh ? '收藏房源' : 'Save property'} onclick={() => toggleSaved(item.id)}><Heart class={saved.includes(item.id) ? 'size-4 fill-primary text-primary' : 'size-4'} /></Button></div>
              <p class="mt-2 text-sm text-muted-foreground">{item.market} · {item.assetType}</p>
              <div class="mt-3 flex flex-wrap justify-between gap-2"><strong>{money(item.askingPrice)}</strong><Badge variant="outline">{item.status}</Badge></div>
              <p class="mt-2 text-sm">{isZh ? '出租率' : 'Occupancy'}: {item.occupancy}%</p>
              <WorkspaceRecordLinks resource="properties" id={item.id} />
            </article>
          {/each}
        </section>
      {:else if activeResource === 'property_agents'}
        <section class="divide-y">{#each visibleAgents as item (item.id)}<article class="py-4"><h2 class="text-base font-semibold">{item.name}</h2><p class="text-sm">{item.territory} · {item.status} · {item.capacityScore}%</p><a class="text-sm text-primary" href={`mailto:${item.email}`}>{item.email}</a><WorkspaceRecordLinks resource={resourceName} id={item.id} /></article>{/each}</section>
      {:else if activeResource === 'property_leads'}
        <section class="divide-y">{#each visibleLeads as item (item.id)}<article class="py-4"><h2 class="text-base font-semibold">{item.leadName}</h2><p class="text-sm">{money(item.budget)} · {item.status} · {item.targetMoveDate}</p><p class="text-sm text-muted-foreground">{item.notes}</p><WorkspaceRecordLinks resource={resourceName} id={item.id} /></article>{/each}</section>
      {:else}
        <section class="divide-y">{#each visibleShowings as item (item.id)}<article class="py-4"><h2 class="text-base font-semibold">{item.showingNumber}</h2><p class="text-sm">{item.scheduledDate} · {item.status}</p><p class="text-sm text-muted-foreground">{item.notes}</p><WorkspaceRecordLinks resource={resourceName} id={item.id} /></article>{/each}</section>
      {/if}
    </WorkspaceQueryState>
  </ContentPageShell>
</div>
