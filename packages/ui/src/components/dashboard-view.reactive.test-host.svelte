<script lang="ts">
  import {
    createEnterpriseRequestContext, provideAdminContext,
    type DashboardDrilldown, type DashboardProvider, type DataProvider,
  } from '@svadmin/core';
  import DashboardView from './DashboardView.svelte';

  let {
    provider, dataProvider, onDrillDown,
  }: {
    provider: DashboardProvider;
    dataProvider: DataProvider;
    onDrillDown?: (input: DashboardDrilldown) => void;
  } = $props();

  const requestContext = createEnterpriseRequestContext({
    tenantId: 'tenant-a', requestId: 'dashboard-reactive', traceId: 'dashboard-reactive',
  });
  const filter = $state({ field: 'region', value: 'east' });
  const filters = $state([filter]);
  const timeRange = $state({
    from: '2026-10-01T00:00:00Z',
    to: '2026-10-31T23:59:59Z',
  });

  provideAdminContext({
    get dataProvider() { return dataProvider; },
    resources: [],
    tenant: { tenantId: 'tenant-a' },
  });
</script>

<label>Region <input aria-label="Region" bind:value={filter.value} /></label>
<label>From <input aria-label="From" bind:value={timeRange.from} /></label>
<DashboardView
  {provider}
  dashboardId="home"
  {requestContext}
  {filters}
  {timeRange}
  {onDrillDown}
/>