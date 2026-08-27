<script lang="ts">
  import { getResource, useCan, useNavigation } from '@svadmin/core';
  import type { Component } from 'svelte';
  import AutoTable from './AutoTable.svelte';
  import { Badge } from './ui/badge/index.js';
  import { Button } from './ui/button/index.js';
  import * as Card from './ui/card/index.js';

  interface SummaryMetric {
    label: string;
    value: string | number;
    hint?: string;
  }

  interface StatusLane {
    label: string;
    value: string | number;
    hint?: string;
  }

  interface HighlightItem {
    title: string;
    description?: string;
    meta?: string;
    badge?: string;
  }

  type WorkspaceStyle =
    | 'inventory'
    | 'operations'
    | 'orders'
    | 'people'
    | 'calendar'
    | 'communications'
    | 'crm'
    | 'property'
    | 'ai'
    | 'store'
    | 'planning'
    | 'generation'
    | 'billing'
    | 'security'
    | 'referral';

  interface Props {
    resourceName: string;
    eyebrow: string;
    title: string;
    description: string;
    actionLabel: string;
    icon?: Component<{ class?: string }>;
    metrics?: SummaryMetric[];
    lanes?: StatusLane[];
    highlights?: HighlightItem[];
    tableLabel?: string;
    tableDescription?: string;
    emptyLanesText?: string;
    highlightsLabel?: string;
    workspaceStyle?: WorkspaceStyle;
  }

  let {
    resourceName,
    eyebrow,
    title,
    description,
    actionLabel,
    icon: Icon,
    metrics = [],
    lanes = [],
    highlights = [],
    tableLabel = 'Records',
    tableDescription,
    emptyLanesText = 'No grouped records yet.',
    highlightsLabel = 'Focus queue',
    workspaceStyle = 'operations',
  }: Props = $props();
  const navigation = useNavigation();
  const resource = $derived(getResource(resourceName));
  const createPermission = useCan(() => ({ resource: resourceName, action: 'create' }));
  const showCreate = $derived(resource.canCreate !== false && createPermission.allowed);
</script>

<div class="space-y-6" data-svadmin-resource-operations={resourceName} data-svadmin-workspace-style={workspaceStyle} data-svadmin-layout-identity={workspaceStyle}>
  <header class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between" data-svadmin-ops-hero>
    <div class="flex min-w-0 items-start gap-3">
      {#if Icon}<span class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-primary"><Icon class="size-4" /></span>{/if}
      <div class="min-w-0"><Badge variant="outline">{eyebrow}</Badge><h1 class="mt-2 text-xl font-semibold text-foreground">{title}</h1><p class="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p></div>
    </div>
    {#if showCreate}
      <Button class="shrink-0" size="sm" onclick={() => navigation.create(resourceName)}>{actionLabel}</Button>
    {/if}
  </header>

  {#if workspaceStyle === 'inventory'}
    <section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]" data-svadmin-inventory-layout>
      <div class="space-y-5"><div class="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">{#each metrics as metric (metric.label)}<div class="bg-card p-4"><p class="text-sm text-muted-foreground">{metric.label}</p><p class="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>{#if metric.hint}<p class="mt-1 text-xs text-muted-foreground">{metric.hint}</p>{/if}</div>{/each}</div><AutoTable {resourceName} /></div>
      <aside class="space-y-5"><section><h2 class="text-sm font-semibold text-foreground">{tableLabel}</h2><p class="mt-1 text-sm text-muted-foreground">{tableDescription}</p><div class="mt-3 divide-y divide-border border-y border-border">{#each lanes as lane (lane.label)}<div class="flex items-center justify-between gap-3 py-3"><div><p class="text-sm font-medium text-foreground">{lane.label}</p>{#if lane.hint}<p class="text-xs text-muted-foreground">{lane.hint}</p>{/if}</div><Badge variant="outline">{lane.value}</Badge></div>{:else}<p class="py-3 text-sm text-muted-foreground">{emptyLanesText}</p>{/each}</div></section><section><h2 class="text-sm font-semibold text-foreground">{highlightsLabel}</h2><div class="mt-3 space-y-2">{#each highlights as item (item.title)}<article class="rounded-lg border border-border bg-card p-3"><div class="flex items-start justify-between gap-3"><p class="text-sm font-medium text-foreground">{item.title}</p>{#if item.badge}<Badge variant="secondary">{item.badge}</Badge>{/if}</div>{#if item.description}<p class="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>{/if}{#if item.meta}<p class="mt-2 text-xs font-medium text-primary">{item.meta}</p>{/if}</article>{/each}</div></section></aside>
    </section>
  {:else if workspaceStyle === 'operations'}
    <section class="space-y-5" data-svadmin-operations-layout>
      <div class="grid gap-4 lg:grid-cols-[1fr_1.4fr]"><div class="rounded-lg border border-border bg-card p-4"><h2 class="text-sm font-semibold text-foreground">{tableLabel}</h2><div class="mt-4 space-y-4">{#each lanes as lane (lane.label)}<div><div class="flex items-center justify-between gap-3 text-sm"><span class="font-medium">{lane.label}</span><span class="text-muted-foreground">{lane.value}</span></div><div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary" style:width={`${Math.min(100, Math.max(12, Number(lane.value) * 8))}%`}></div></div>{#if lane.hint}<p class="mt-1 text-xs text-muted-foreground">{lane.hint}</p>{/if}</div>{/each}</div></div><div class="rounded-lg border border-border bg-card"><div class="border-b border-border px-4 py-3"><h2 class="text-sm font-semibold text-foreground">{highlightsLabel}</h2></div><div class="divide-y divide-border">{#each highlights as item (item.title)}<div class="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto]"><div><p class="text-sm font-medium text-foreground">{item.title}</p>{#if item.description}<p class="mt-1 text-xs text-muted-foreground">{item.description}</p>{/if}</div><div class="flex items-center gap-2">{#if item.badge}<Badge variant="outline">{item.badge}</Badge>{/if}{#if item.meta}<span class="text-xs text-muted-foreground">{item.meta}</span>{/if}</div></div>{/each}</div></div></div>
      <div class="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">{#each metrics as metric (metric.label)}<div class="flex items-center justify-between gap-3 bg-card p-4"><div><p class="text-sm text-muted-foreground">{metric.label}</p>{#if metric.hint}<p class="mt-1 text-xs text-muted-foreground">{metric.hint}</p>{/if}</div><p class="text-xl font-semibold text-foreground">{metric.value}</p></div>{/each}</div>
      <AutoTable {resourceName} />
    </section>
  {:else if workspaceStyle === 'orders'}
    <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]" data-svadmin-orders-layout>
      <div class="space-y-5"><div class="grid gap-3 sm:grid-cols-3">{#each metrics as metric (metric.label)}<div class="border-l-2 border-primary pl-3"><p class="text-sm text-muted-foreground">{metric.label}</p><p class="mt-1 text-2xl font-semibold text-foreground">{metric.value}</p>{#if metric.hint}<p class="text-xs text-muted-foreground">{metric.hint}</p>{/if}</div>{/each}</div><AutoTable {resourceName} /></div>
      <aside class="rounded-lg border border-border bg-card"><div class="border-b border-border p-4"><h2 class="text-sm font-semibold text-foreground">{highlightsLabel}</h2><p class="mt-1 text-xs text-muted-foreground">{tableDescription}</p></div><div class="divide-y divide-border">{#each highlights as item (item.title)}<div class="p-4"><div class="flex items-center justify-between gap-2"><p class="text-sm font-medium text-foreground">{item.title}</p>{#if item.badge}<Badge>{item.badge}</Badge>{/if}</div>{#if item.description}<p class="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>{/if}{#if item.meta}<p class="mt-2 text-xs text-primary">{item.meta}</p>{/if}</div>{/each}{#each lanes as lane (lane.label)}<div class="flex items-center justify-between gap-3 p-4"><div><p class="text-sm font-medium">{lane.label}</p>{#if lane.hint}<p class="text-xs text-muted-foreground">{lane.hint}</p>{/if}</div><Badge variant="outline">{lane.value}</Badge></div>{/each}</div></aside>
    </section>
  {:else if workspaceStyle === 'people'}
    <section class="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]" data-svadmin-people-layout>
      <aside class="space-y-5 rounded-lg border border-border bg-card p-4">
        <div><h2 class="text-sm font-semibold text-foreground">{highlightsLabel}</h2><p class="mt-1 text-xs leading-5 text-muted-foreground">{tableDescription}</p></div>
        <div class="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3 xl:grid-cols-1">{#each metrics as metric (metric.label)}<div class="bg-card py-3"><div class="flex items-center justify-between gap-3"><p class="text-sm text-muted-foreground">{metric.label}</p><p class="text-lg font-semibold text-foreground">{metric.value}</p></div>{#if metric.hint}<p class="text-xs text-muted-foreground">{metric.hint}</p>{/if}</div>{/each}</div>
        <div class="space-y-3">{#each lanes as lane (lane.label)}<div class="flex items-center justify-between gap-3"><div><p class="text-sm font-medium text-foreground">{lane.label}</p>{#if lane.hint}<p class="text-xs text-muted-foreground">{lane.hint}</p>{/if}</div><Badge variant="outline">{lane.value}</Badge></div>{/each}</div>
      </aside>
      <div class="space-y-5"><div class="divide-y divide-border rounded-lg border border-border bg-card">{#each highlights as item (item.title)}<article class="flex items-start justify-between gap-4 p-4"><div><p class="text-sm font-medium text-foreground">{item.title}</p>{#if item.description}<p class="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>{/if}{#if item.meta}<p class="mt-2 text-xs text-primary">{item.meta}</p>{/if}</div>{#if item.badge}<Badge variant="secondary">{item.badge}</Badge>{/if}</article>{/each}</div><AutoTable {resourceName} /></div>
    </section>
  {:else if workspaceStyle === 'calendar'}
    <section class="space-y-5" data-svadmin-calendar-layout>
      <div class="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">{#each metrics as metric (metric.label)}<div class="bg-card p-4"><p class="text-xs text-muted-foreground">{metric.label}</p><p class="mt-1 text-xl font-semibold text-foreground">{metric.value}</p>{#if metric.hint}<p class="mt-1 text-xs text-muted-foreground">{metric.hint}</p>{/if}</div>{/each}</div>
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]"><div class="rounded-lg border border-border bg-card"><div class="border-b border-border px-4 py-3"><h2 class="text-sm font-semibold text-foreground">{highlightsLabel}</h2></div><div class="divide-y divide-border">{#each highlights as item (item.title)}<article class="grid gap-2 p-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto]"><p class="text-xs font-medium text-primary">{item.meta}</p><div><p class="text-sm font-medium text-foreground">{item.title}</p>{#if item.description}<p class="mt-1 text-xs text-muted-foreground">{item.description}</p>{/if}</div>{#if item.badge}<Badge variant="outline">{item.badge}</Badge>{/if}</article>{/each}</div></div><aside class="space-y-3">{#each lanes as lane (lane.label)}<div class="rounded-lg border border-border bg-card p-4"><div class="flex items-center justify-between gap-3"><p class="text-sm font-medium text-foreground">{lane.label}</p><Badge variant="outline">{lane.value}</Badge></div>{#if lane.hint}<p class="mt-1 text-xs text-muted-foreground">{lane.hint}</p>{/if}</div>{/each}</aside></div>
      <AutoTable {resourceName} />
    </section>
  {:else if workspaceStyle === 'crm'}
    <section class="space-y-5" data-svadmin-crm-layout>
      <div class="grid gap-4 sm:grid-cols-3">{#each metrics as metric (metric.label)}<div class="border-l-2 border-primary pl-3"><p class="text-sm text-muted-foreground">{metric.label}</p><p class="mt-1 text-2xl font-semibold text-foreground">{metric.value}</p>{#if metric.hint}<p class="text-xs text-muted-foreground">{metric.hint}</p>{/if}</div>{/each}</div>
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"><div class="grid gap-4 sm:grid-cols-3">{#each lanes as lane (lane.label)}<section class="rounded-lg border border-border bg-muted/15"><div class="flex items-center justify-between border-b border-border px-4 py-3"><h2 class="text-sm font-semibold text-foreground">{lane.label}</h2><Badge variant="outline">{lane.value}</Badge></div>{#if lane.hint}<p class="p-4 text-xs leading-5 text-muted-foreground">{lane.hint}</p>{/if}</section>{/each}</div><aside class="divide-y divide-border rounded-lg border border-border bg-card">{#each highlights as item (item.title)}<article class="p-4"><div class="flex items-start justify-between gap-2"><p class="text-sm font-medium text-foreground">{item.title}</p>{#if item.badge}<Badge variant="secondary">{item.badge}</Badge>{/if}</div>{#if item.description}<p class="mt-1 text-xs text-muted-foreground">{item.description}</p>{/if}{#if item.meta}<p class="mt-2 text-xs text-primary">{item.meta}</p>{/if}</article>{/each}</aside></div>
      <AutoTable {resourceName} />
    </section>
  {:else if workspaceStyle === 'property'}
    <section class="space-y-5" data-svadmin-property-layout>
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]"><div class="grid gap-4 md:grid-cols-2">{#each highlights as item (item.title)}<Card.Root><Card.Content class="p-4"><div class="flex aspect-[16/7] items-center justify-center rounded-md bg-muted text-primary">{#if Icon}<Icon class="size-7" />{/if}</div><div class="mt-4 flex items-start justify-between gap-3"><div><h2 class="text-sm font-semibold text-foreground">{item.title}</h2>{#if item.description}<p class="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>{/if}</div>{#if item.badge}<Badge>{item.badge}</Badge>{/if}</div>{#if item.meta}<p class="mt-3 text-xs font-medium text-primary">{item.meta}</p>{/if}</Card.Content></Card.Root>{/each}</div><aside class="space-y-4">{#each metrics as metric (metric.label)}<div class="border-b border-border pb-4"><div class="flex items-center justify-between gap-3"><p class="text-sm text-muted-foreground">{metric.label}</p><p class="text-lg font-semibold text-foreground">{metric.value}</p></div>{#if metric.hint}<p class="mt-1 text-xs text-muted-foreground">{metric.hint}</p>{/if}</div>{/each}{#each lanes as lane (lane.label)}<div class="flex items-center justify-between gap-3"><span class="text-sm text-muted-foreground">{lane.label}</span><Badge variant="outline">{lane.value}</Badge></div>{/each}</aside></div>
      <AutoTable {resourceName} />
    </section>
  {:else if workspaceStyle === 'ai'}
    <section class="grid min-h-[30rem] overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[16rem_minmax(0,1fr)]" data-svadmin-ai-layout>
      <aside class="border-b border-border bg-muted/20 p-4 lg:border-b-0 lg:border-r"><h2 class="text-sm font-semibold text-foreground">{tableLabel}</h2><p class="mt-1 text-xs leading-5 text-muted-foreground">{tableDescription}</p><div class="mt-4 space-y-2">{#each lanes as lane (lane.label)}<div class="rounded-md border border-border bg-card px-3 py-2"><div class="flex items-center justify-between gap-3"><p class="text-sm font-medium text-foreground">{lane.label}</p><Badge variant="outline">{lane.value}</Badge></div>{#if lane.hint}<p class="mt-1 text-xs text-muted-foreground">{lane.hint}</p>{/if}</div>{/each}</div></aside>
      <div class="min-w-0"><div class="border-b border-border px-4 py-3"><h2 class="text-sm font-semibold text-foreground">{highlightsLabel}</h2></div><div class="space-y-3 p-4">{#each highlights as item (item.title)}<article class="max-w-2xl rounded-lg border border-border bg-muted/15 p-4"><div class="flex items-start justify-between gap-3"><p class="text-sm font-medium text-foreground">{item.title}</p>{#if item.badge}<Badge variant="secondary">{item.badge}</Badge>{/if}</div>{#if item.description}<p class="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>{/if}{#if item.meta}<p class="mt-2 text-xs text-primary">{item.meta}</p>{/if}</article>{/each}</div><div class="border-t border-border p-4"><AutoTable {resourceName} /></div></div>
    </section>
  {:else if workspaceStyle === 'communications'}
    <section class="grid min-h-[32rem] overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[15rem_minmax(0,1fr)]" data-svadmin-communications-layout>
      <nav class="border-b border-border bg-muted/20 p-3 lg:border-b-0 lg:border-r">{#each lanes as lane (lane.label)}<button class="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-card"><span><span class="block font-medium text-foreground">{lane.label}</span>{#if lane.hint}<span class="text-xs text-muted-foreground">{lane.hint}</span>{/if}</span><Badge variant="outline">{lane.value}</Badge></button>{/each}</nav>
      <div class="min-w-0"><div class="border-b border-border p-4"><h2 class="text-sm font-semibold text-foreground">{highlightsLabel}</h2></div><div class="divide-y divide-border">{#each highlights as item (item.title)}<article class="grid gap-3 p-4 sm:grid-cols-[1fr_auto]"><div><p class="text-sm font-medium text-foreground">{item.title}</p>{#if item.description}<p class="mt-1 text-sm text-muted-foreground">{item.description}</p>{/if}</div><div class="flex items-center gap-2">{#if item.badge}<Badge variant="secondary">{item.badge}</Badge>{/if}{#if item.meta}<span class="text-xs text-muted-foreground">{item.meta}</span>{/if}</div></article>{/each}</div><div class="border-t border-border p-4"><AutoTable {resourceName} /></div></div>
    </section>
  {:else if workspaceStyle === 'store'}
    <section class="space-y-5" data-svadmin-store-layout><div class="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 class="text-base font-semibold text-foreground">{highlightsLabel}</h2><p class="mt-1 text-sm text-muted-foreground">{tableDescription}</p></div><div class="flex gap-5">{#each metrics as metric (metric.label)}<div><p class="text-xs text-muted-foreground">{metric.label}</p><p class="text-lg font-semibold text-foreground">{metric.value}</p></div>{/each}</div></div><div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{#each highlights as item (item.title)}<Card.Root><Card.Content class="p-4"><div class="flex aspect-[16/8] items-center justify-center rounded-md bg-muted text-primary">{#if Icon}<Icon class="size-8" />{/if}</div><div class="mt-4 flex items-start justify-between gap-3"><div><h3 class="text-sm font-semibold text-foreground">{item.title}</h3>{#if item.description}<p class="mt-1 text-sm text-muted-foreground">{item.description}</p>{/if}</div>{#if item.badge}<Badge>{item.badge}</Badge>{/if}</div>{#if item.meta}<p class="mt-3 text-xs font-medium text-primary">{item.meta}</p>{/if}</Card.Content></Card.Root>{/each}</div><div class="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]"><aside class="rounded-lg border border-border bg-card p-4"><h2 class="text-sm font-semibold text-foreground">{tableLabel}</h2><div class="mt-3 space-y-3">{#each lanes as lane (lane.label)}<div class="flex items-center justify-between gap-3"><span class="text-sm text-muted-foreground">{lane.label}</span><Badge variant="outline">{lane.value}</Badge></div>{/each}</div></aside><AutoTable {resourceName} /></div></section>
  {:else if workspaceStyle === 'planning'}
    <section class="space-y-5" data-svadmin-planning-layout><div class="grid gap-4 lg:grid-cols-3">{#each lanes as lane, laneIndex (lane.label)}<section class="rounded-lg border border-border bg-muted/15"><div class="flex items-center justify-between border-b border-border px-4 py-3"><h2 class="text-sm font-semibold text-foreground">{lane.label}</h2><Badge variant="outline">{lane.value}</Badge></div><div class="space-y-3 p-3">{#each highlights.filter((_, itemIndex) => itemIndex % lanes.length === laneIndex) as item (item.title)}<article class="rounded-md border border-border bg-card p-3"><div class="flex items-start justify-between gap-2"><p class="text-sm font-medium text-foreground">{item.title}</p>{#if item.badge}<Badge variant="secondary">{item.badge}</Badge>{/if}</div>{#if item.description}<p class="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>{/if}{#if item.meta}<p class="mt-2 text-xs text-primary">{item.meta}</p>{/if}</article>{/each}</div></section>{/each}</div><div class="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">{#each metrics as metric (metric.label)}<div class="bg-card p-4"><p class="text-sm text-muted-foreground">{metric.label}</p><p class="mt-1 text-xl font-semibold text-foreground">{metric.value}</p>{#if metric.hint}<p class="text-xs text-muted-foreground">{metric.hint}</p>{/if}</div>{/each}</div><AutoTable {resourceName} /></section>
  {:else if workspaceStyle === 'generation'}
    <section class="grid gap-5 xl:grid-cols-[19rem_minmax(0,1fr)]" data-svadmin-generation-layout>
      <aside class="rounded-lg border border-border bg-card p-4"><h2 class="text-sm font-semibold text-foreground">{highlightsLabel}</h2><div class="mt-4 space-y-4">{#each lanes as lane, index (lane.label)}<div class="flex items-start gap-3"><span class="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-xs font-semibold text-foreground">{index + 1}</span><div><div class="flex items-center gap-2"><p class="text-sm font-medium text-foreground">{lane.label}</p><Badge variant="outline">{lane.value}</Badge></div>{#if lane.hint}<p class="mt-1 text-xs leading-5 text-muted-foreground">{lane.hint}</p>{/if}</div></div>{/each}</div></aside>
      <div class="space-y-5"><div class="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">{#each metrics as metric (metric.label)}<div class="bg-card p-4"><p class="text-sm text-muted-foreground">{metric.label}</p><p class="mt-1 text-xl font-semibold text-foreground">{metric.value}</p>{#if metric.hint}<p class="text-xs text-muted-foreground">{metric.hint}</p>{/if}</div>{/each}</div><div class="grid gap-3 md:grid-cols-3">{#each highlights as item (item.title)}<article class="rounded-lg border border-border bg-card p-4"><div class="flex items-start justify-between gap-2"><p class="text-sm font-medium text-foreground">{item.title}</p>{#if item.badge}<Badge variant="secondary">{item.badge}</Badge>{/if}</div>{#if item.description}<p class="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>{/if}</article>{/each}</div><AutoTable {resourceName} /></div>
    </section>
  {:else if workspaceStyle === 'billing'}
    <section class="space-y-5" data-svadmin-billing-layout><div class="grid gap-4 md:grid-cols-3">{#each highlights as item (item.title)}<Card.Root><Card.Header><div class="flex items-center justify-between gap-3"><Card.Title class="text-base">{item.title}</Card.Title>{#if item.badge}<Badge>{item.badge}</Badge>{/if}</div>{#if item.description}<Card.Description>{item.description}</Card.Description>{/if}</Card.Header><Card.Content>{#if item.meta}<p class="text-2xl font-semibold text-foreground">{item.meta}</p>{/if}<Button variant="outline" size="sm" class="mt-4 w-full">{actionLabel}</Button></Card.Content></Card.Root>{/each}</div><div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]"><AutoTable {resourceName} /><aside class="space-y-4">{#each metrics as metric (metric.label)}<div class="border-b border-border pb-4"><div class="flex items-center justify-between gap-3"><p class="text-sm text-muted-foreground">{metric.label}</p><p class="text-lg font-semibold text-foreground">{metric.value}</p></div>{#if metric.hint}<p class="mt-1 text-xs text-muted-foreground">{metric.hint}</p>{/if}</div>{/each}{#each lanes as lane (lane.label)}<div class="flex items-center justify-between gap-3"><span class="text-sm text-muted-foreground">{lane.label}</span><Badge variant="outline">{lane.value}</Badge></div>{/each}</aside></div></section>
  {:else if workspaceStyle === 'security'}
    <section class="space-y-5" data-svadmin-security-layout><div class="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]"><div class="rounded-lg border border-border bg-card p-5"><p class="text-sm font-medium text-muted-foreground">{metrics[0]?.label}</p><p class="mt-3 text-3xl font-semibold text-foreground">{metrics[0]?.value}</p><p class="mt-1 text-sm text-muted-foreground">{metrics[0]?.hint}</p><div class="mt-5 space-y-3">{#each lanes as lane (lane.label)}<div class="flex items-center justify-between gap-3"><span class="text-sm text-muted-foreground">{lane.label}</span><Badge variant="outline">{lane.value}</Badge></div>{/each}</div></div><div class="rounded-lg border border-border bg-card"><div class="border-b border-border px-4 py-3"><h2 class="text-sm font-semibold text-foreground">{highlightsLabel}</h2></div><div class="divide-y divide-border">{#each highlights as item (item.title)}<div class="flex items-start justify-between gap-3 p-4"><div><p class="text-sm font-medium text-foreground">{item.title}</p>{#if item.description}<p class="mt-1 text-xs text-muted-foreground">{item.description}</p>{/if}{#if item.meta}<p class="mt-2 text-xs text-primary">{item.meta}</p>{/if}</div>{#if item.badge}<Badge variant="outline">{item.badge}</Badge>{/if}</div>{/each}</div></div></div><AutoTable {resourceName} /></section>
  {:else if workspaceStyle === 'referral'}
    <section class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" data-svadmin-referral-layout><div class="space-y-5"><div class="rounded-lg border border-border bg-card p-5"><h2 class="text-base font-semibold text-foreground">{highlightsLabel}</h2><p class="mt-1 text-sm text-muted-foreground">{tableDescription}</p><div class="mt-5 grid gap-3 sm:grid-cols-3">{#each metrics as metric (metric.label)}<div><p class="text-sm text-muted-foreground">{metric.label}</p><p class="mt-1 text-2xl font-semibold text-foreground">{metric.value}</p><p class="text-xs text-muted-foreground">{metric.hint}</p></div>{/each}</div></div><AutoTable {resourceName} /></div><aside class="space-y-3">{#each highlights as item (item.title)}<article class="rounded-lg border border-border bg-card p-4"><div class="flex items-center justify-between gap-3"><p class="text-sm font-medium text-foreground">{item.title}</p>{#if item.badge}<Badge>{item.badge}</Badge>{/if}</div>{#if item.description}<p class="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>{/if}{#if item.meta}<p class="mt-3 rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">{item.meta}</p>{/if}</article>{/each}</aside></section>
  {:else}
    <section class="space-y-4" data-svadmin-default-layout><div class="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">{#each metrics as metric (metric.label)}<div class="bg-card p-4"><p class="text-sm text-muted-foreground">{metric.label}</p><p class="mt-1 text-xl font-semibold text-foreground">{metric.value}</p></div>{/each}</div><AutoTable {resourceName} /></section>
  {/if}
</div>
