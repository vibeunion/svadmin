<script lang="ts">
  import { GroupedTable, Statistic } from '@svadmin/ui';
  import { BoxPlotChart, GraphChart } from '@svadmin/charts';
  import type { TableColumn } from '@svadmin/ui';

  let { kind = 'overview' }: { kind?: string } = $props();

  interface ServiceRow {
    id: string;
    name: string;
    owner: string;
    cpu: number;
    memory: number;
    status: string;
  }

  const rows: ServiceRow[] = [
    { id: 'api', name: 'api', owner: 'Platform', cpu: 42, memory: 68, status: 'Healthy' },
    { id: 'worker', name: 'worker', owner: 'Operations', cpu: 81, memory: 55, status: 'Warning' },
    { id: 'billing', name: 'billing', owner: 'Finance', cpu: 36, memory: 44, status: 'Healthy' },
  ];

  const columns: TableColumn<ServiceRow>[] = [
    { key: 'name', title: 'Service' },
    { key: 'owner', title: 'Owner' },
    { key: 'cpu', title: 'CPU', align: 'right' },
    { key: 'memory', title: 'Memory', align: 'right' },
    { key: 'status', title: 'Status' },
  ];

  const latency = [
    { label: 'API', values: [42, 48, 51, 59, 63, 78] },
    { label: 'Worker', values: [61, 66, 70, 72, 91, 120] },
    { label: 'Billing', values: [30, 34, 36, 39, 42, 47] },
  ];

  const graph = {
    nodes: [
      { id: 'gateway', label: 'Gateway', group: 'edge' },
      { id: 'api', label: 'API', group: 'core' },
      { id: 'worker', label: 'Worker', group: 'core' },
      { id: 'db', label: 'Database', group: 'data' },
    ],
    links: [
      { source: 'gateway', target: 'api', value: 120 },
      { source: 'api', target: 'worker', value: 80 },
      { source: 'worker', target: 'db', value: 64 },
    ],
  };
</script>

{#if kind === 'overview'}
  <div class="dock-panel-grid">
    <Statistic title="Availability" value={99.98} suffix="%" trend="up" trendLabel="0.03%" />
    <Statistic title="Requests" value={248000} trend="up" trendLabel="12%" />
    <Statistic title="P95 latency" value={184} suffix="ms" trend="down" trendLabel="18ms" />
  </div>
{:else if kind === 'resources'}
  <GroupedTable {columns} {rows} rowKey={(row) => row.id} caption="Service resources" />
{:else if kind === 'latency'}
  <BoxPlotChart data={latency} height={300} />
{:else}
  <GraphChart data={graph} height={300} />
{/if}

<style>
  .dock-panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: var(--svadmin-space-4);
    padding: var(--svadmin-space-4);
  }
</style>
