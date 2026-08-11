<script lang="ts">
  import type { SurfacePolicy, SurfaceSpec } from '@svadmin/surface';
  import {
    DEFAULT_SURFACE_CATALOG_VERSION,
    SurfaceRenderer,
  } from '@svadmin/surface/svelte';

  let { isZh = false }: { isZh?: boolean } = $props();

  const policy = {
    resources: {
      products: {
        readFields: ['id', 'name', 'sku', 'stock'],
        maxPageSize: 10,
      },
      sales_orders: {
        readFields: ['id', 'orderNumber', 'customerName', 'status', 'totalAmount', 'orderDate'],
        sortFields: ['orderDate'],
        maxPageSize: 10,
      },
    },
  } satisfies SurfacePolicy;

  const spec = {
    schemaVersion: 'surface/v1',
    catalogVersion: DEFAULT_SURFACE_CATALOG_VERSION,
    surfaceId: 'dashboard-declarative-surface',
    title: 'Declarative Surface',
    layout: { type: 'grid', columns: 12, gap: 'md' },
    dataSources: [
      { id: 'surface-products', type: 'resource-list', resource: 'products', pageSize: 10 },
      {
        id: 'surface-sales-orders',
        type: 'resource-list',
        resource: 'sales_orders',
        pageSize: 10,
        sorters: [{ field: 'orderDate', order: 'asc' }],
      },
    ],
    widgets: [
      {
        id: 'surface-product-count',
        type: 'metric',
        props: { label: 'Products', format: 'number', description: 'Read from the list total' },
        binding: { sourceId: 'surface-products', pointer: '/total' },
        placement: { columnSpan: 3 },
      },
      {
        id: 'surface-inventory-chart',
        type: 'bar-chart',
        props: { title: 'Inventory by product', labelField: 'name', valueField: 'stock' },
        binding: { sourceId: 'surface-products', pointer: '/items' },
        placement: { columnSpan: 9 },
      },
      {
        id: 'surface-orders-chart',
        type: 'line-chart',
        props: { title: 'Order value over time', labelField: 'orderDate', valueField: 'totalAmount' },
        binding: { sourceId: 'surface-sales-orders', pointer: '/items' },
        placement: { columnSpan: 6 },
      },
      {
        id: 'surface-orders-table',
        type: 'resource-table',
        props: {
          title: 'Read-only sales orders',
          columns: [
            { field: 'orderNumber', label: 'Order' },
            { field: 'customerName', label: 'Customer' },
            { field: 'status', label: 'Status' },
            { field: 'totalAmount', label: 'Amount', format: 'number' },
          ],
        },
        binding: { sourceId: 'surface-sales-orders', pointer: '/items' },
        placement: { columnSpan: 6 },
      },
    ],
  } satisfies SurfaceSpec;

  let renderer = $state<{ refresh(sourceId?: string): Promise<void> }>();
  let refreshing = $state(false);

  async function refresh(): Promise<void> {
    if (!renderer || refreshing) return;
    refreshing = true;
    try {
      await renderer.refresh();
    } finally {
      refreshing = false;
    }
  }
</script>

<section class="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4 sm:p-6" data-declarative-surface-example>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-primary">@svadmin/surface</p>
      <p class="mt-1 text-sm text-muted-foreground">
        {isZh ? '固定 JSON 协议、字段策略与可信组件目录。' : 'A fixed JSON contract, field policy, and trusted component catalog.'}
      </p>
    </div>
    <button
      type="button"
      class="inline-flex min-h-10 items-center justify-center rounded-md border bg-card px-4 text-sm font-medium text-foreground transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={refreshing}
      onclick={refresh}
    >
      {refreshing ? (isZh ? '刷新中…' : 'Refreshing…') : (isZh ? '刷新 Surface' : 'Refresh Surface')}
    </button>
  </div>
  <SurfaceRenderer bind:this={renderer} {spec} {policy} />
</section>
