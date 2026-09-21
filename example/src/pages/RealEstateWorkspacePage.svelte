<script lang="ts">
  import { onMount } from 'svelte';
  import { useList } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge, Button, ContentPageHeader, ContentPageShell, MetricBlock } from '@svadmin/ui';
  import { Heart, Plus } from '@lucide/svelte';
  import { demoContracts } from '../resource-contracts';
  import { demoRenderers } from '../resource-rendering';
  import { readHashView } from '../utils/hashView';
  import { localDateKey } from './workspace-policy';
  import { readSavedIds, saveIds } from './workspace-session';
  import WorkspaceQueryState from './WorkspaceQueryState.svelte';
  import WorkspaceRecordLinks from './WorkspaceRecordLinks.svelte';

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
  let feedback = $state('');
  const savedKey = 'svadmin-example-property-favorites';
  onMount(() => { saved = readSavedIds(savedKey); });
  const propertiesQuery = useList({ resource: demoContracts.properties, pagination: { mode: 'off' } });
  const agentsQuery = useList({ resource: demoContracts.property_agents, pagination: { mode: 'off' } });
  const leadsQuery = useList({ resource: demoContracts.property_leads, pagination: { mode: 'off' } });
  const showingsQuery = useList({ resource: demoContracts.property_showings, pagination: { mode: 'off' }, sorters: [{ field: 'scheduledDate', order: 'asc' }] });
  const properties = $derived(demoRenderers.properties.records(propertiesQuery.data?.data ?? []));
  const agents = $derived(demoRenderers.property_agents.records(agentsQuery.data?.data ?? []));
  const leads = $derived(demoRenderers.property_leads.records(leadsQuery.data?.data ?? []));
  const showings = $derived(demoRenderers.property_showings.records(showingsQuery.data?.data ?? []));
  const navigation = $derived([
    { resource: 'properties', title: isZh ? '房源' : 'Properties', query: propertiesQuery },
    { resource: 'property_agents', title: isZh ? '顾问' : 'Agents', query: agentsQuery },
    { resource: 'property_leads', title: isZh ? '线索' : 'Leads', query: leadsQuery },
    { resource: 'property_showings', title: isZh ? '看房' : 'Showings', query: showingsQuery },
  ]);
  const isPropertyView = $derived(resourceName === 'properties' || view === 'saved');
  const current = $derived(isPropertyView ? navigation[0]! : navigation.find(item => item.resource === resourceName) ?? navigation[0]!);
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
  const visibleCount = $derived(isPropertyView ? visibleProperties.length : resourceName === 'property_agents' ? visibleAgents.length : resourceName === 'property_leads' ? visibleLeads.length : visibleShowings.length);
  const money = (value: number) => new Intl.NumberFormat(isZh ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  function toggleSaved(id: number): void {
    const next = saved.includes(id) ? saved.filter(value => value !== id) : [...saved, id];
    if (!saveIds(savedKey, next)) { feedback = isZh ? '收藏未保存，请检查浏览器存储设置后重试。' : 'Favorites were not saved. Check browser storage and retry.'; return; }
    saved = next; feedback = '';
  }
  function resetFilters(): void { search = ''; market = ''; assetType = ''; status = ''; maximumPrice = undefined; }
</script>

<svelte:window onhashchange={() => view = readHashView('portfolio')} onpopstate={() => view = readHashView('portfolio')} />
{#snippet actions()}
  <Button onclick={() => window.location.hash = `/${current.resource}/create`}><Plus class="size-4" />{isZh ? '新建' : 'Create'} {current.title}</Button>
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
    <WorkspaceQueryState query={current.query} count={visibleCount}>
      {#if isPropertyView}
        {#if view === 'map'}
          <section class="border-y py-4">
            <h2 class="text-base font-semibold">{isZh ? '区域分布 · 无地理坐标' : 'Market distribution · no coordinates'}</h2>
            <div class="mt-3 grid gap-3 sm:grid-cols-3">{#each [...new Set(visibleProperties.map(item => item.market))] as value (value)}<MetricBlock label={value} value={visibleProperties.filter(item => item.market === value).length} />{/each}</div>
          </section>
        {/if}
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {#each visibleProperties as item (item.id)}
            <article class="min-w-0 rounded-lg border p-4">
              <div class="flex items-start justify-between gap-3"><h2 class="break-words text-base font-semibold">{item.propertyName}</h2><Button size="icon" variant="ghost" aria-pressed={saved.includes(item.id)} aria-label={isZh ? '收藏房源' : 'Save property'} onclick={() => toggleSaved(item.id)}><Heart class={saved.includes(item.id) ? 'size-4 fill-primary text-primary' : 'size-4'} /></Button></div>
              <p class="mt-2 text-sm text-muted-foreground">{item.market} · {item.assetType}</p>
              <div class="mt-3 flex flex-wrap justify-between gap-2"><strong>{money(item.askingPrice)}</strong><Badge variant="outline">{item.status}</Badge></div>
              <p class="mt-2 text-sm">{isZh ? '出租率' : 'Occupancy'}: {item.occupancy}%</p>
              <WorkspaceRecordLinks resource="properties" id={item.id} />
            </article>
          {/each}
        </section>
      {:else if resourceName === 'property_agents'}
        <section class="divide-y">{#each visibleAgents as item (item.id)}<article class="py-4"><h2 class="text-base font-semibold">{item.name}</h2><p class="text-sm">{item.territory} · {item.status} · {item.capacityScore}%</p><a class="text-sm text-primary" href={`mailto:${item.email}`}>{item.email}</a><WorkspaceRecordLinks resource={resourceName} id={item.id} /></article>{/each}</section>
      {:else if resourceName === 'property_leads'}
        <section class="divide-y">{#each visibleLeads as item (item.id)}<article class="py-4"><h2 class="text-base font-semibold">{item.leadName}</h2><p class="text-sm">{money(item.budget)} · {item.status} · {item.targetMoveDate}</p><p class="text-sm text-muted-foreground">{item.notes}</p><WorkspaceRecordLinks resource={resourceName} id={item.id} /></article>{/each}</section>
      {:else}
        <MetricBlock label={isZh ? '今日看房' : 'Today’s showings'} value={showings.filter(item => item.scheduledDate.slice(0, 10) === localDateKey()).length} />
        <section class="divide-y">{#each visibleShowings as item (item.id)}<article class="py-4"><h2 class="text-base font-semibold">{item.showingNumber}</h2><p class="text-sm">{item.scheduledDate} · {item.status}</p><p class="text-sm text-muted-foreground">{item.notes}</p><WorkspaceRecordLinks resource={resourceName} id={item.id} /></article>{/each}</section>
      {/if}
    </WorkspaceQueryState>
  </ContentPageShell>
</div>
