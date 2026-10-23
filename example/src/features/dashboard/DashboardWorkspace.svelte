<script lang="ts">
  import type {
    DashboardDrilldown, DashboardProvider, EnterpriseProviderRequestContext,
  } from '@svadmin/core';
  import { definedOptions } from '@svadmin/core/options';
  import DashboardView from '../../../../packages/ui/src/components/DashboardView.svelte';
  import { Button } from '../../../../packages/ui/src/components/ui/button/index.js';
  import { Input } from '../../../../packages/ui/src/components/ui/input/index.js';
  import { onMount } from 'svelte';
  import type { WorkspaceDrilldownTarget } from './dashboard-workspace-data';

  export interface DashboardWorkspaceRecordView {
    resource: string;
    id: number;
    title: string;
    meta: string;
    href: string;
  }

  interface Props {
    provider: DashboardProvider;
    dashboardId: string;
    requestContext?: EnterpriseProviderRequestContext;
    title?: string;
    syncUrl?: boolean;
    isZh?: boolean;
    loadDrilldownRecords?: (target: WorkspaceDrilldownTarget) => Promise<DashboardWorkspaceRecordView[]>;
    defaultRegion?: string;
    defaultFrom?: string;
    defaultTo?: string;
  }
  let {
    provider, dashboardId, requestContext, title, syncUrl = true, isZh = false, loadDrilldownRecords,
    defaultRegion = 'east', defaultFrom = '2026-10-01', defaultTo = '2026-10-31',
  }: Props = $props();

  const DEFAULT_REGION = defaultRegion;
  const DEFAULT_FROM = defaultFrom;
  const DEFAULT_TO = defaultTo;
  type WorkspaceRoute = 'dashboard' | 'drilldown';
  interface DrillState {
    widgetId: string;
    widgetTitle: string;
    kind: 'metric' | 'text';
    metricId?: string;
    metricLabel?: string;
  }
  interface LocationState {
    route: WorkspaceRoute;
    region: string;
    from: string;
    to: string;
    drill?: DrillState;
  }

  function validDate(value: string | null): value is string {
    return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function readLocation(): LocationState {
    if (typeof window === 'undefined') {
      return { route: 'dashboard', region: DEFAULT_REGION, from: DEFAULT_FROM, to: DEFAULT_TO };
    }
    const raw = window.location.hash.replace(/^#/, '');
    const [rawPath = '', rawQuery = ''] = raw.split('?');
    const segments = rawPath.split('/').filter(Boolean);
    const params = new URLSearchParams(rawQuery);
    const region = params.has('region') ? params.get('region') ?? '' : DEFAULT_REGION;
    const from = params.get('from');
    const to = params.get('to');
    const state: LocationState = {
      route: params.get('drill') === '1' || segments[1] === 'drilldown' ? 'drilldown' : 'dashboard',
      region,
      from: validDate(from) ? from : DEFAULT_FROM,
      to: validDate(to) ? to : DEFAULT_TO,
    };
    if (state.route === 'drilldown') {
      const widgetTitle = params.get('title');
      state.drill = {
        widgetId: params.get('widget') ?? '',
        widgetTitle: widgetTitle && widgetTitle.length ? widgetTitle : (params.get('widget') ?? ''),
        kind: params.get('kind') === 'text' ? 'text' : 'metric',
        ...(params.get('metric') ? { metricId: params.get('metric') ?? '' } : {}),
        ...(params.get('metricLabel') ? { metricLabel: params.get('metricLabel') ?? '' } : {}),
      };
    }
    return state;
  }

  const initial = readLocation();
  let route = $state<WorkspaceRoute>(initial.route);
  let appliedRegion = $state(initial.region);
  let appliedFrom = $state(initial.from);
  let appliedTo = $state(initial.to);
  let draftRegion = $state(initial.region);
  let draftFrom = $state(initial.from);
  let draftTo = $state(initial.to);
  let drill = $state<DrillState | undefined>(initial.drill);
  let formError = $state<string>();
  let drillRecords = $state<DashboardWorkspaceRecordView[]>([]);
  let drillLoading = $state(false);
  let drillError = $state(false);
  let drillSequence = 0;

  const filters = $derived(appliedRegion ? [{ field: 'region', value: appliedRegion }] : []);
  const timeRange = $derived({
    from: `${appliedFrom}T00:00:00Z`,
    to: `${appliedTo}T23:59:59Z`,
  });

  function syncHash(mode: 'push' | 'replace'): void {
    if (!syncUrl || typeof window === 'undefined') return;
    const params = new URLSearchParams();
    params.set('region', appliedRegion);
    params.set('from', appliedFrom);
    params.set('to', appliedTo);
    let path = '#/';
    if (route === 'drilldown' && drill) {
      params.set('drill', '1');
      params.set('widget', drill.widgetId);
      if (drill.metricId) params.set('metric', drill.metricId);
      if (drill.metricLabel) params.set('metricLabel', drill.metricLabel);
      if (drill.widgetTitle) params.set('title', drill.widgetTitle);
      params.set('kind', drill.kind);
    }
    const url = `${path}?${params.toString()}`;
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }

  function restoreFromLocation(): void {
    const state = readLocation();
    route = state.route;
    appliedRegion = state.region;
    appliedFrom = state.from;
    appliedTo = state.to;
    draftRegion = state.region;
    draftFrom = state.from;
    draftTo = state.to;
    drill = state.drill;
    formError = undefined;
    if (state.route === 'drilldown' && state.drill) void refreshDrilldownRecords();
    else clearDrilldownRecords();
  }

  function clearDrilldownRecords(): void {
    drillSequence += 1;
    drillRecords = [];
    drillLoading = false;
    drillError = false;
  }

  function buildDrillTarget(current: DrillState): WorkspaceDrilldownTarget {
    return {
      widgetId: current.widgetId,
      widgetTitle: current.widgetTitle,
      kind: current.kind,
      ...(current.metricId ? { metricId: current.metricId } : {}),
      ...(current.metricLabel ? { metricLabel: current.metricLabel } : {}),
      filters: appliedRegion ? [{ field: 'region', value: appliedRegion }] : [],
      timeRange: { from: `${appliedFrom}T00:00:00Z`, to: `${appliedTo}T23:59:59Z` },
    };
  }

  async function refreshDrilldownRecords(): Promise<void> {
    const current = drill;
    if (!current || !loadDrilldownRecords) {
      clearDrilldownRecords();
      return;
    }
    const sequence = ++drillSequence;
    drillLoading = true;
    drillError = false;
    try {
      const records = await loadDrilldownRecords(buildDrillTarget(current));
      if (sequence !== drillSequence || drill !== current) return;
      drillRecords = records;
    } catch {
      if (sequence !== drillSequence || drill !== current) return;
      drillRecords = [];
      drillError = true;
    } finally {
      if (sequence === drillSequence) drillLoading = false;
    }
  }

  function applyFilters(event: SubmitEvent): void {
    event.preventDefault();
    if (!validDate(draftFrom) || !validDate(draftTo)) {
      formError = 'Enter both a start and end date.';
      return;
    }
    if (draftFrom > draftTo) {
      formError = 'Start date must be on or before end date.';
      return;
    }
    formError = undefined;
    appliedRegion = draftRegion;
    appliedFrom = draftFrom;
    appliedTo = draftTo;
    route = 'dashboard';
    drill = undefined;
    clearDrilldownRecords();
    syncHash('push');
  }

  function resetFilters(): void {
    formError = undefined;
    appliedRegion = DEFAULT_REGION;
    appliedFrom = DEFAULT_FROM;
    appliedTo = DEFAULT_TO;
    draftRegion = DEFAULT_REGION;
    draftFrom = DEFAULT_FROM;
    draftTo = DEFAULT_TO;
    route = 'dashboard';
    drill = undefined;
    clearDrilldownRecords();
    syncHash('push');
  }

  function handleDrillDown(input: DashboardDrilldown): void {
    drill = {
      widgetId: input.widget.id,
      widgetTitle: input.widget.title,
      kind: input.widget.kind,
      ...(input.metric ? { metricId: input.metric.id, metricLabel: input.metric.label } : {}),
    };
    route = 'drilldown';
    syncHash('push');
    void refreshDrilldownRecords();
  }

  function backToDashboard(): void {
    route = 'dashboard';
    drill = undefined;
    clearDrilldownRecords();
    syncHash('push');
  }

  onMount(() => {
    syncHash('replace');
    if (route === 'drilldown' && drill) void refreshDrilldownRecords();
    const restore = (): void => restoreFromLocation();
    window.addEventListener('hashchange', restore);
    window.addEventListener('popstate', restore);
    return () => {
      window.removeEventListener('hashchange', restore);
      window.removeEventListener('popstate', restore);
    };
  });
</script>

<section class="dashboard-workspace" aria-label="Dashboard workspace">
  <section aria-label="Global filters" class="dashboard-workspace__filters">
    <form onsubmit={applyFilters}>
      <label>
        <span>{isZh ? '区域' : 'Region'}</span>
        <select class="svadmin-input" aria-label="Region filter" bind:value={draftRegion}>
          <option value="">{isZh ? '全部区域' : 'All regions'}</option>
          <option value="east">{isZh ? '东区' : 'East'}</option>
          <option value="west">{isZh ? '西区' : 'West'}</option>
        </select>
      </label>
      <label>
        <span>{isZh ? '开始' : 'From'}</span>
        <Input aria-label="From date" type="date" bind:value={draftFrom} />
      </label>
      <label>
        <span>{isZh ? '结束' : 'To'}</span>
        <Input aria-label="To date" type="date" bind:value={draftTo} />
      </label>
      <Button type="submit" size="sm">{isZh ? '应用筛选' : 'Apply filters'}</Button>
      <Button type="button" variant="outline" size="sm" onclick={resetFilters}>{isZh ? '重置' : 'Reset'}</Button>
    </form>
    {#if formError}<p role="alert">{formError}</p>{/if}
  </section>

  {#if route === 'drilldown' && drill}
    <section class="dashboard-workspace__drilldown" aria-label="Drilldown target" data-testid="dashboard-drilldown">
      <h3>{isZh ? '钻取' : 'Drilldown'}: {drill.widgetTitle}{drill.metricLabel ? ` · ${drill.metricLabel}` : ''}</h3>
      <p>
        {isZh ? '区域' : 'Region'} {appliedRegion || 'all'} · {appliedFrom} {isZh ? '至' : 'to'} {appliedTo}
      </p>
      {#if drillLoading}
        <p role="status">{isZh ? '正在加载记录…' : 'Loading records…'}</p>
      {:else if drillError}
        <div role="alert">
          {isZh ? '记录加载失败。' : 'Unable to load drill-down records.'}
          <Button type="button" variant="outline" size="sm" onclick={() => void refreshDrilldownRecords()}>
            {isZh ? '重试' : 'Retry'}
          </Button>
        </div>
      {:else if drillRecords.length > 0}
        <p>{drillRecords.length} {isZh ? '条记录' : 'records'}</p>
        <ul class="dashboard-workspace__records">
          {#each drillRecords as record (record.resource + ':' + record.id)}
            <li>
              <a href={record.href}>{record.title}</a>
              <p>{record.meta}</p>
            </li>
          {/each}
        </ul>
      {:else}
        <p>{isZh ? '没有匹配记录。' : 'No matching records.'}</p>
      {/if}
      <Button type="button" variant="outline" size="sm" onclick={backToDashboard}>
        {isZh ? '返回仪表盘' : 'Back to dashboard'}
      </Button>
    </section>
  {/if}

  <DashboardView
    {provider}
    {dashboardId}
    {...definedOptions({ requestContext, title })}
    {filters}
    {timeRange}
    onDrillDown={handleDrillDown}
  />
</section>

<style>
  .dashboard-workspace { display: grid; gap: 1rem; min-width: 0; }
  .dashboard-workspace__filters { border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
  .dashboard-workspace__filters form { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; }
  .dashboard-workspace__filters label { display: grid; gap: 4px; min-width: 0; font-size: 12px; color: var(--muted-foreground); }
  .dashboard-workspace__filters :global(.svadmin-input),
  .dashboard-workspace__filters select { min-width: 0; max-width: 180px; }
  .dashboard-workspace__drilldown { border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
  .dashboard-workspace__drilldown h3 { margin: 0 0 6px; font-size: 14px; }
  .dashboard-workspace__drilldown p { margin: 0 0 8px; font-size: 13px; }
  .dashboard-workspace__records { display: grid; gap: 8px; margin: 0 0 12px; padding: 0; list-style: none; }
  .dashboard-workspace__records li { min-width: 0; }
  .dashboard-workspace__records a { color: var(--primary); font-size: 13px; font-weight: 500; text-decoration: underline; }
  .dashboard-workspace__records p { margin: 2px 0 0; color: var(--muted-foreground); }
  @media (max-width: 800px) {
    .dashboard-workspace__filters form { display: grid; grid-template-columns: minmax(0, 1fr); }
    .dashboard-workspace__filters :global(.svadmin-input),
    .dashboard-workspace__filters select { max-width: none; width: 100%; }
  }
</style>