<script lang="ts">
  import { useList } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge, Button, ContentPageHeader, ContentPageShell, FilterToolbar, MetricBlock } from '@svadmin/ui';
  import * as Card from '@svadmin/ui/components/ui/card/index.js';
  import { Building2, CalendarClock, Heart, MapPin, SlidersHorizontal, UserRoundCheck } from '@lucide/svelte';
  import { readHashView } from '../utils/hashView';

  const i18n = useTranslation();

  interface Agent { id: number; name: string; territory: string; status: string; capacityScore: number; notes: string; }
  interface Property { id: number; propertyName: string; market: string; assetType: string; askingPrice: number; status: string; units: number; occupancy: number; notes: string; }
  interface Lead { id: number; leadName: string; budget: number; status: string; }
  interface Showing { id: number; showingNumber: string; scheduledDate: string; status: string; feedbackScore: number | null; notes: string; }

  let { resourceName = 'properties' } = $props<{ resourceName?: string }>();
  let activeView = $state(readHashView('portfolio'));
  let searchQuery = $state('');

  const locale = $derived(i18n.locale);
  const isZh = $derived(locale === 'zh-CN');
  const propertiesQuery = useList({ resource: 'properties', pagination: { mode: 'off' } });
  const agentsQuery = useList({ resource: 'property_agents', pagination: { mode: 'off' } });
  const leadsQuery = useList({ resource: 'property_leads', pagination: { mode: 'off' } });
  const showingsQuery = useList({ resource: 'property_showings', pagination: { mode: 'off' }, sorters: [{ field: 'scheduledDate', order: 'asc' }] });
  const properties = $derived((propertiesQuery.data?.data ?? []) as unknown as Property[]);
  const agents = $derived((agentsQuery.data?.data ?? []) as unknown as Agent[]);
  const leads = $derived((leadsQuery.data?.data ?? []) as unknown as Lead[]);
  const showings = $derived((showingsQuery.data?.data ?? []) as unknown as Showing[]);
  const filteredProperties = $derived(searchQuery.trim() ? properties.filter((property) => `${property.propertyName} ${property.market} ${property.assetType}`.toLowerCase().includes(searchQuery.trim().toLowerCase())) : properties);
  const showingCount = $derived(showings.length);
  const avgOccupancy = $derived(properties.length ? Math.round(properties.reduce((sum, property) => sum + property.occupancy, 0) / properties.length) : 0);
  const normalizedView = $derived(['buy', 'rent', 'sell', 'commercial', 'saved', 'map', 'filters'].includes(activeView) ? activeView : 'portfolio');
  const marketTabs = $derived([
    { key: 'buy', label: isZh ? '购买' : 'Buy', href: '#/properties?view=buy' },
    { key: 'rent', label: isZh ? '租赁' : 'Rent', href: '#/properties?view=rent' },
    { key: 'sell', label: isZh ? '出售' : 'Sell', href: '#/properties?view=sell' },
    { key: 'commercial', label: isZh ? '商业' : 'Commercial', href: '#/properties?view=commercial' },
    { key: 'saved', label: isZh ? '已收藏' : 'Saved', href: '#/property_leads?view=saved' },
  ]);
  const filterChips = $derived([
    { label: isZh ? '类型' : 'Type', value: isZh ? '多户 / 办公 / 工业' : 'multifamily / office / industrial' },
    { label: isZh ? '状态' : 'Condition', value: isZh ? '挂牌 / 运营 / 翻新' : 'listed / active / renovation' },
    { label: isZh ? '位置' : 'Where', value: 'San Diego, Austin, Portland' },
    { label: isZh ? '价格' : 'Price', value: '$19M - $34M' },
    { label: isZh ? '时间' : 'When', value: isZh ? '本周看房' : 'this week tours' },
  ]);

  function money(value: number): string { return `$${Math.round(value / 1000)}K`; }
  function statusLabel(status: string): string {
    if (!isZh) return status.replace('_', ' ');
    if (status === 'listed') return '挂牌';
    if (status === 'active') return '运营';
    if (status === 'renovation') return '翻新';
    if (status === 'under_contract') return '签约中';
    if (status === 'tour_scheduled') return '已约看房';
    if (status === 'qualified') return '已合格';
    if (status === 'new') return '新线索';
    if (status === 'offer') return '报价';
    if (status === 'scheduled') return '已排期';
    if (status === 'completed') return '已完成';
    if (status === 'on_leave') return '休假';
    return status;
  }

  const viewCopy = $derived.by(() => {
    const copies = {
      portfolio: {
        badge: isZh ? '资产运营' : 'Real Estate',
        title: isZh ? '资产搜索与看房工作台' : 'Property Search and Tour Workspace',
        description: isZh ? '把买/租筛选、资产卡片、地图态势和线索跟进放到一个页面。' : 'Combine buy/rent filters, property cards, map context, and lead follow-up.',
        action: isZh ? '新增看房' : 'New tour',
      },
      buy: {
        badge: isZh ? '购买' : 'Buy',
        title: isZh ? '购买资产筛选' : 'Buy-side Property Search',
        description: isZh ? '聚焦可购买资产、预算窗口、出租率和投资回报信号。' : 'Focus on purchasable assets, budget windows, occupancy, and return signals.',
        action: isZh ? '新增购买线索' : 'New buyer lead',
      },
      rent: {
        badge: isZh ? '租赁' : 'Rent',
        title: isZh ? '租赁需求工作台' : 'Rental Demand Workspace',
        description: isZh ? '按区域、预算和看房日程跟进租赁客户。' : 'Track rental clients by region, budget, and tour schedule.',
        action: isZh ? '安排租赁看房' : 'Schedule rental tour',
      },
      sell: {
        badge: isZh ? '出售' : 'Sell',
        title: isZh ? '出售委托视图' : 'Seller Listing View',
        description: isZh ? '关注挂牌状态、报价、买方反馈和成交风险。' : 'Watch listing state, offers, buyer feedback, and closing risk.',
        action: isZh ? '新增出售委托' : 'New seller listing',
      },
      commercial: {
        badge: isZh ? '商业' : 'Commercial',
        title: isZh ? '商业资产雷达' : 'Commercial Asset Radar',
        description: isZh ? '按办公、工业、多户和租约状态筛选商业机会。' : 'Filter commercial opportunities by office, industrial, multifamily, and lease status.',
        action: isZh ? '新增商业机会' : 'New commercial lead',
      },
      saved: {
        badge: isZh ? '已收藏' : 'Saved',
        title: isZh ? '收藏资产与线索' : 'Saved Properties and Leads',
        description: isZh ? '复盘收藏资产、线索预算和下一次联系计划。' : 'Review saved assets, lead budgets, and next-contact plans.',
        action: isZh ? '复盘收藏' : 'Review saved items',
      },
      map: {
        badge: isZh ? '地图视图' : 'Map View',
        title: isZh ? '地图态势视图' : 'Map Context View',
        description: isZh ? '用区域热区、资产点位和看房节奏判断下一步动作。' : 'Use market hot spots, property pins, and tour cadence to decide next actions.',
        action: isZh ? '打开地图筛选' : 'Open map filters',
      },
      filters: {
        badge: isZh ? '筛选器' : 'Filters',
        title: isZh ? '资产筛选器' : 'Property Filters',
        description: isZh ? '按类型、状态、位置、价格和时间窗口组合筛选条件。' : 'Combine type, condition, location, price, and timing filters.',
        action: isZh ? '保存筛选' : 'Save filters',
      },
    } satisfies Record<string, { badge: string; title: string; description: string; action: string }>;
    return copies[normalizedView as keyof typeof copies];
  });

  function syncView(): void {
    activeView = readHashView('portfolio');
  }
</script>

<svelte:window onhashchange={syncView} onpopstate={syncView} />

{#snippet headerActions()}
  <a href="#/properties?view=filters"><Button variant="outline" size="sm"><SlidersHorizontal class="h-4 w-4" />{isZh ? '筛选' : 'Filters'}</Button></a>
  <Button size="sm">{viewCopy.action}</Button>
{/snippet}

<div data-app-page="real-estate-workspace" data-property-view={normalizedView} data-resource-name={resourceName}>
<ContentPageShell pageId="real-estate-workspace" width="wide">
  <ContentPageHeader eyebrow={viewCopy.badge} title={viewCopy.title} description={viewCopy.description} actions={headerActions} />
  <section class="grid gap-3 sm:grid-cols-3">
    <MetricBlock label={isZh ? '资产' : 'Assets'} value={properties.length} detail={isZh ? '当前组合' : 'Current portfolio'} />
    <MetricBlock label={isZh ? '线索' : 'Leads'} value={leads.length} detail={isZh ? '待跟进需求' : 'Open demand'} />
    <MetricBlock label={isZh ? '出租率' : 'Occupancy'} value={`${avgOccupancy}%`} detail={isZh ? '组合平均值' : 'Portfolio average'} />
  </section>
  <section class="space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      {#each marketTabs as tab (tab.key)}
        <a href={tab.href} class={`rounded-md border px-3 py-1.5 text-sm transition ${normalizedView === tab.key ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>{tab.label}</a>
      {/each}
      <a href="#/properties?view=map" class={`ml-auto rounded-md border px-3 py-1.5 text-sm ${normalizedView === 'map' ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'}`}>{isZh ? '地图视图' : 'Map view'}</a>
    </div>
    <FilterToolbar bind:query={searchQuery} placeholder={isZh ? '搜索城市、资产或类型' : 'Search city, asset, or type'} clearLabel={isZh ? '清除搜索' : 'Clear search'} />
    <div class="grid gap-2 md:grid-cols-5">
      {#each filterChips as chip (chip.label)}
        <div class="rounded-lg border bg-card p-3 shadow-sm">
          <p class="text-xs font-medium text-muted-foreground">{chip.label}</p>
          <p class="mt-1 truncate text-sm font-medium">{chip.value}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="grid gap-4 xl:grid-cols-[1fr_0.42fr]">
    <div class="grid gap-4 md:grid-cols-2">
      {#each filteredProperties as property (property.id)}
        <article class="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div class="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-3"><span class="flex items-center gap-2 text-sm font-medium"><Building2 class="h-4 w-4 text-primary" />{property.assetType}</span><span class="text-xs text-muted-foreground">{property.market}</span></div>
          <div class="space-y-3 p-4">
            <div class="flex items-start justify-between gap-3"><div><h2 class="font-semibold">{property.propertyName}</h2><p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin class="h-3.5 w-3.5" />{property.market} · {property.assetType}</p></div><Button variant="outline" size="icon"><Heart class="h-4 w-4" /></Button></div>
            <div class="flex items-center justify-between gap-3"><p class="text-xl font-semibold">{money(property.askingPrice)}</p><Badge variant="outline">{statusLabel(property.status)}</Badge></div>
            <p class="text-xs text-muted-foreground">{property.units} {isZh ? '个单元' : 'units'} · {property.occupancy}% {isZh ? '出租率' : 'occupied'}</p>
          </div>
        </article>
      {/each}
    </div>
    <div class="grid gap-4 content-start">
      <Card.Root class="overflow-hidden">
        <Card.Header>
          <Card.Title class="text-base">{isZh ? '地图态势' : 'Map Context'}</Card.Title>
          <Card.Description>{isZh ? '用可读 pin、区域热度和看房路线模拟地图工作台。' : 'A map-like workspace with readable pins, heat zones, and tour routes.'}</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-3">
          <div class="flex flex-wrap gap-2">
            <Badge variant="outline">{isZh ? '挂牌' : 'Listed'}</Badge>
            <Badge variant="outline">{isZh ? '线索热区' : 'Lead heat'}</Badge>
            <Badge variant="outline">{isZh ? '今日路线' : 'Today route'}</Badge>
          </div>
          <div class="relative mx-auto h-72 w-full max-w-md overflow-hidden rounded-lg border bg-[linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px),linear-gradient(0deg,hsl(var(--border))_1px,transparent_1px),radial-gradient(circle_at_30%_25%,hsl(var(--primary)/0.22),transparent_22%),radial-gradient(circle_at_70%_55%,hsl(var(--success)/0.18),transparent_18%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))] bg-[size:44px_44px,44px_44px,auto,auto,auto]">
            <div class="absolute left-[20%] top-[18%] rounded-lg border bg-card/95 px-3 py-2 text-xs shadow-sm">
              <p class="font-semibold">{isZh ? '南湾资产' : 'South Bay'}</p>
              <p class="text-muted-foreground">$24M</p>
            </div>
            <div class="absolute right-[12%] top-[42%] rounded-lg border bg-card/95 px-3 py-2 text-xs shadow-sm">
              <p class="font-semibold">{isZh ? '租赁热区' : 'Rent heat'}</p>
              <p class="text-muted-foreground">{leads.length} {isZh ? '线索' : 'leads'}</p>
            </div>
            <div class="absolute bottom-[13%] left-[34%] rounded-lg border bg-card/95 px-3 py-2 text-xs shadow-sm">
              <p class="font-semibold">{isZh ? '今日看房' : 'Tours today'}</p>
              <p class="text-muted-foreground">{showingCount} {isZh ? '条路线' : 'routes'}</p>
            </div>
            <span class="absolute left-[32%] top-[28%] h-4 w-4 rounded-full border-2 border-background bg-primary shadow"></span>
            <span class="absolute left-[68%] top-[54%] h-4 w-4 rounded-full border-2 border-background bg-success shadow"></span>
            <span class="absolute left-[48%] top-[72%] h-4 w-4 rounded-full border-2 border-background bg-warning shadow"></span>
            <svg class="pointer-events-none absolute inset-0 h-full w-full text-primary/45" viewBox="0 0 400 288" aria-hidden="true">
              <path d="M128 82 C180 116 204 178 272 156 C304 148 280 214 192 208" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="8 8" />
            </svg>
          </div>
        </Card.Content>
      </Card.Root>
      <Card.Root><Card.Header><Card.Title class="text-base">{isZh ? '活跃线索' : 'Active Leads'}</Card.Title></Card.Header><Card.Content class="space-y-3">{#each leads.slice(0, 3) as lead (lead.id)}<div class="rounded-lg border p-3"><div class="flex items-center justify-between"><p class="font-semibold">{lead.leadName}</p><Badge>{money(lead.budget)}</Badge></div><p class="mt-1 text-xs text-muted-foreground">{statusLabel(lead.status)}</p></div>{/each}</Card.Content></Card.Root>
    </div>
  </section>

  <section class="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
    <Card.Root>
      <Card.Header><Card.Title class="flex items-center gap-2 text-base"><UserRoundCheck class="h-4 w-4 text-primary" />{isZh ? '顾问负载' : 'Advisor Capacity'}</Card.Title><Card.Description>{isZh ? '按区域、状态和容量分配新线索。' : 'Route new leads by territory, status, and capacity.'}</Card.Description></Card.Header>
      <Card.Content class="space-y-3">
        {#each agents as agent (agent.id)}
          <div class="rounded-lg border p-3">
            <div class="flex items-center justify-between gap-3">
              <div><p class="font-semibold">{agent.name}</p><p class="mt-1 text-xs text-muted-foreground">{agent.territory} · {statusLabel(agent.status)}</p></div>
              <Badge variant="outline">{agent.capacityScore}</Badge>
            </div>
            <div class="mt-3 h-2 rounded-full bg-muted"><div class="h-2 rounded-full bg-primary" style:width={`${agent.capacityScore}%`}></div></div>
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header><Card.Title class="flex items-center gap-2 text-base"><CalendarClock class="h-4 w-4 text-primary" />{isZh ? '看房日程' : 'Tour Schedule'}</Card.Title><Card.Description>{isZh ? `未来和历史看房共 ${showingCount} 条。` : `${showingCount} scheduled and historical tours.`}</Card.Description></Card.Header>
      <Card.Content class="space-y-3">
        {#each showings as showing (showing.id)}
          <div class="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p class="font-semibold">{showing.showingNumber}</p>
              <p class="mt-1 text-xs text-muted-foreground">{showing.scheduledDate} · {showing.notes}</p>
            </div>
            <div class="flex items-center gap-2">
              <Badge variant="outline">{statusLabel(showing.status)}</Badge>
              {#if showing.feedbackScore}<Badge>{showing.feedbackScore}/10</Badge>{/if}
            </div>
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  </section>
</ContentPageShell>
</div>
