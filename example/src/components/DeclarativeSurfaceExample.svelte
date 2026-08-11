<script lang="ts">
  import { onMount } from 'svelte';
  import {
    createMemorySurfaceStore,
    listSurfaceDocumentHistory,
    publishSurfaceDocument,
    rollbackSurfaceDocument,
    saveSurfaceDraft,
    type SurfaceActionResult,
    type SurfaceDocumentDependencies,
    type SurfacePolicy,
    type SurfaceSpec,
  } from '@svadmin/surface';
  import {
    createSurfaceAgentWorkflow,
    type SurfaceProposalReview as ProposalReview,
  } from '@svadmin/surface-agent';
  import { SurfaceProposalReview } from '@svadmin/surface-agent/svelte';
  import {
    DEFAULT_SURFACE_CATALOG_VERSION,
    SurfaceRenderer,
    defaultSurfaceCatalog,
    type SurfaceLiveProvider,
  } from '@svadmin/surface/svelte';

  let { isZh = false }: { isZh?: boolean } = $props();

  const policy = {
    resources: {
      products: {
        readFields: ['id', 'name', 'sku', 'stock'],
        filterFields: ['stock'],
        maxPageSize: 10,
      },
      sales_orders: {
        readFields: ['id', 'orderNumber', 'customerName', 'status', 'totalAmount', 'orderDate'],
        sortFields: ['orderDate'],
        maxPageSize: 10,
      },
    },
  } satisfies SurfacePolicy;

  const initialSpec: SurfaceSpec = {
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
  };

  const store = createMemorySurfaceStore();
  const documentDependencies: SurfaceDocumentDependencies = {
    store,
    catalog: defaultSurfaceCatalog,
    policy,
    authorize: async () => ({ can: true }),
  };
  let proposalSequence = 0;
  const workflow = createSurfaceAgentWorkflow({
    dependencies: documentDependencies,
    scopeId: 'dashboard-example',
    surfaceId: initialSpec.surfaceId,
    proposalId: () => `dashboard-proposal-${++proposalSequence}`,
  });

  const liveCallbacks = new Map<string, Parameters<SurfaceLiveProvider['subscribe']>[0]['callback']>();
  const liveProvider: SurfaceLiveProvider = {
    subscribe({ resource, callback }) {
      liveCallbacks.set(resource, callback);
      return () => liveCallbacks.delete(resource);
    },
  };

  let activeSpec = $state<SurfaceSpec>(initialSpec);
  let revision = $state(0);
  let historyCount = $state(0);
  let proposalReview = $state<ProposalReview | null>(null);
  let renderer = $state<{
    refresh(sourceId?: string): Promise<void>;
    executeAction(action: unknown): Promise<SurfaceActionResult>;
  }>();
  let busy = $state(false);
  let statusMessage = $state('');
  let operationSequence = 0;

  function operationId(prefix: string): string {
    operationSequence += 1;
    return `dashboard-${prefix}-${operationSequence}`;
  }

  async function refreshHistory(): Promise<void> {
    const history = await listSurfaceDocumentHistory({
      dependencies: documentDependencies,
      scopeId: 'dashboard-example',
      surfaceId: initialSpec.surfaceId,
    });
    historyCount = history.ok ? history.documents.length : historyCount;
  }

  function applyDocumentResult(result: Awaited<ReturnType<typeof saveSurfaceDraft>>): void {
    if (!result.ok) {
      statusMessage = result.error.code;
      return;
    }
    revision = result.document.revision;
    activeSpec = result.document.spec;
    statusMessage = `${result.document.stage} r${result.document.revision}`;
  }

  async function withBusy(operation: () => Promise<void>): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      await operation();
    } finally {
      busy = false;
    }
  }

  async function saveDraft(): Promise<void> {
    await withBusy(async () => {
      const result = await saveSurfaceDraft({
        dependencies: documentDependencies,
        scopeId: 'dashboard-example',
        spec: { ...activeSpec, title: `Declarative Surface draft ${revision + 1}` },
        expectedRevision: revision,
        actorId: 'demo-editor',
        operationId: operationId('save'),
      });
      applyDocumentResult(result);
      await refreshHistory();
    });
  }

  async function publish(): Promise<void> {
    await withBusy(async () => {
      const result = await publishSurfaceDocument({
        dependencies: documentDependencies,
        scopeId: 'dashboard-example',
        surfaceId: initialSpec.surfaceId,
        expectedRevision: revision,
        actorId: 'demo-publisher',
        operationId: operationId('publish'),
      });
      applyDocumentResult(result);
      await refreshHistory();
    });
  }

  async function rollback(): Promise<void> {
    if (revision <= 1) return;
    await withBusy(async () => {
      const result = await rollbackSurfaceDocument({
        dependencies: documentDependencies,
        scopeId: 'dashboard-example',
        surfaceId: initialSpec.surfaceId,
        targetRevision: 1,
        expectedRevision: revision,
        actorId: 'demo-reviewer',
        operationId: operationId('rollback'),
      });
      applyDocumentResult(result);
      await refreshHistory();
    });
  }

  async function prepareProposal(): Promise<void> {
    const result = await workflow.request({
      proposalVersion: 'surface-proposal/v1',
      surfaceId: initialSpec.surfaceId,
      baseRevision: revision,
      summary: 'Rename the dashboard after a visible human review',
      operations: [{ op: 'replace', path: '/title', value: 'Agent-reviewed Surface' }],
    });
    proposalReview = result.ok ? result.review : null;
    statusMessage = result.ok ? 'proposal pending' : result.error.code;
  }

  async function approveProposal(review: ProposalReview): Promise<void> {
    const result = await workflow.approve({
      proposalId: review.proposalId,
      actorId: 'demo-reviewer',
      operationId: operationId('approve'),
    });
    if (result.ok) {
      proposalReview = result.review;
      revision = result.review.appliedRevision ?? revision;
      activeSpec = result.review.after;
      statusMessage = `applied r${revision}`;
      await refreshHistory();
    } else {
      statusMessage = result.error.code;
    }
  }

  async function rejectProposal(review: ProposalReview): Promise<void> {
    const result = await workflow.reject({
      proposalId: review.proposalId,
      actorId: 'demo-reviewer',
      reason: 'Rejected in the deterministic example',
    });
    proposalReview = result.ok ? result.review : proposalReview;
    statusMessage = result.ok ? 'proposal rejected' : result.error.code;
  }

  async function executeAction(action: unknown): Promise<void> {
    const result = await renderer?.executeAction(action);
    statusMessage = result?.ok ? result.actionType : (result?.error.code ?? 'renderer unavailable');
  }

  function simulateLiveEvent(): void {
    const callback = liveCallbacks.get('products');
    callback?.({ type: 'UPDATE', resource: 'products', payload: { id: 'demo' } });
    statusMessage = callback ? 'live refresh queued' : 'live subscription pending';
  }

  onMount(() => {
    void withBusy(async () => {
      const result = await saveSurfaceDraft({
        dependencies: documentDependencies,
        scopeId: 'dashboard-example',
        spec: initialSpec,
        expectedRevision: 0,
        actorId: 'demo-editor',
        operationId: operationId('initial'),
      });
      applyDocumentResult(result);
      await refreshHistory();
    });
  });
</script>

<section class="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4 sm:p-6" data-declarative-surface-example>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-primary">@svadmin/surface</p>
      <p class="mt-1 text-sm text-muted-foreground">
        {isZh
          ? '版本化文档、受限 Patch、可信 Action、Live 刷新与人工审批。'
          : 'Versioned documents, bounded Patch, trusted actions, live refresh, and human approval.'}
      </p>
      <p class="mt-2 text-xs text-muted-foreground" data-surface-revision>
        revision {revision} · history {historyCount} · {statusMessage || 'initializing'}
      </p>
    </div>
    <div class="flex flex-wrap gap-2" aria-label="Surface document controls">
      <button type="button" class="surface-demo-button" disabled={busy || revision === 0} onclick={saveDraft}>Save draft</button>
      <button type="button" class="surface-demo-button" disabled={busy || revision === 0} onclick={publish}>Publish</button>
      <button type="button" class="surface-demo-button" disabled={busy || revision <= 1} onclick={rollback}>Rollback to r1</button>
      <button type="button" class="surface-demo-button" disabled={busy || revision === 0} onclick={prepareProposal}>Agent proposal</button>
    </div>
  </div>

  <div class="flex flex-wrap gap-2" aria-label="Surface runtime controls">
    <button
      type="button"
      class="surface-demo-button"
      onclick={() => executeAction({
        type: 'setFilter',
        sourceId: 'surface-products',
        filter: { field: 'stock', operator: 'lte', value: 10 },
      })}
    >Low stock filter</button>
    <button
      type="button"
      class="surface-demo-button"
      onclick={() => executeAction({ type: 'clearFilter', sourceId: 'surface-products' })}
    >Clear filter</button>
    <button type="button" class="surface-demo-button" onclick={simulateLiveEvent}>Simulate live event</button>
    <button type="button" class="surface-demo-button" onclick={() => renderer?.refresh()}>Refresh Surface</button>
  </div>

  {#if proposalReview}
    <SurfaceProposalReview
      review={proposalReview}
      onApprove={approveProposal}
      onReject={rejectProposal}
      class="surface-proposal-panel"
    />
  {/if}

  <SurfaceRenderer
    bind:this={renderer}
    spec={activeSpec}
    {policy}
    {liveProvider}
    liveMode="auto"
    onNavigateResource={({ resource, recordId }) => {
      statusMessage = `navigate ${resource}${recordId === undefined ? '' : `/${recordId}`}`;
    }}
  />
</section>

<style>
  .surface-demo-button {
    min-height: 2.5rem;
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background: var(--card);
    color: var(--foreground);
    font-size: 0.8rem;
    font-weight: 600;
  }

  .surface-demo-button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  :global(.surface-proposal-panel) {
    margin-block: 1rem;
  }
</style>
