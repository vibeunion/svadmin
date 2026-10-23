<script lang="ts">
  import { createEnterpriseRequestContext, type DashboardProvider, type DashboardQuery } from '@svadmin/core';
  import { DashboardWorkspace } from '../../../example/src/features/dashboard/index.js';

  const failOnce = new URLSearchParams(window.location.search).get('fail') === 'load-once';
  let remainingFailures = failOnce ? 1 : 0;
  const queries = $state<DashboardQuery[]>([]);
  const requestContext = createEnterpriseRequestContext({
    tenantId: 'fixture-tenant',
    requestId: 'dashboard-workspace-fixture',
    traceId: 'dashboard-workspace-fixture',
  });

  function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  function regionOf(query: DashboardQuery): string {
    const value = query.filters?.find(filter => filter.field === 'region')?.value;
    return typeof value === 'string' ? value : 'all';
  }

  const provider: DashboardProvider = {
    get: async (_context, query) => {
      queries.push(clone(query));
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw new Error('PRIVATE_DASHBOARD_LOAD_DIAGNOSTIC');
      }
      const region = regionOf(query);
      const from = (query.timeRange?.from ?? '').slice(0, 10);
      const to = (query.timeRange?.to ?? '').slice(0, 10);
      return {
        version: 1,
        widgets: [
          {
            id: 'summary',
            title: 'Operations summary',
            kind: 'text',
            metrics: [],
            text: `Region ${region} · ${from} to ${to}`,
          },
          {
            id: 'work',
            title: 'Work queue',
            kind: 'metric',
            metrics: [
              { id: 'open', label: 'Open work', value: region === 'west' ? 7 : 12, tone: 'warning' },
              { id: 'resolved', label: 'Resolved', value: 24, tone: 'success' },
            ],
          },
        ],
      };
    },
  };
</script>

<main data-testid="dashboard-workspace-fixture">
  <DashboardWorkspace
    {provider}
    dashboardId="home"
    {requestContext}
    title="Operations dashboard"
  />
  <output hidden data-testid="dashboard-queries">{JSON.stringify(queries)}</output>
</main>

<style>
  main { min-width: 0; padding: 24px; }
  @media (max-width: 800px) { main { padding: 12px; } }
</style>