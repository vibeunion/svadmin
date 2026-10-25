<script lang="ts">
  import { Type } from 'typebox';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import {
    defineResource,
    provideAdminContext,
    type AccessControlProvider,
    type AuditEntry,
    type DataProvider,
    type RouterProvider,
  } from '@svadmin/core';
  import { formatContractRouteId, parseContractRouteId } from '@svadmin/core/schema';
  import AutoTable from '../../../packages/ui/src/components/AutoTable.svelte';
  import type { FileItem } from '../../../packages/ui/src/components/content/FileList.svelte';
  import type { TimelineItem } from '../../../packages/ui/src/components/content/AuditTimeline.svelte';
  import type {
    DetailWorkspaceScope,
    DetailWorkspaceSectionsConfig,
    DetailWorkspaceVersionData,
  } from '../../../packages/ui/src/components/detail-workspace.js';

  type Row = { id: number; name: string; status: string };

  const params = new URLSearchParams(window.location.search);
  const denyShow = params.get('deny') === 'show';
  const controlledDeferred = params.get('controlled') === 'deferred';
  let attachmentFailures = params.get('fail') === 'attachments-once' ? 1 : 0;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const contract = defineResource('detail-workspace-records', {
    record: Type.Object({
      id: Type.Number(),
      name: Type.String(),
      status: Type.String(),
    }),
  });
  const resources = [{
    name: 'detail-workspace-records',
    label: 'Detail workspace records',
    contract,
    canShow: true,
    canEdit: false,
    canDelete: false,
    fields: [
      { key: 'id', label: 'ID', type: 'number' as const },
      { key: 'name', label: 'Name', type: 'text' as const, searchable: true },
      { key: 'status', label: 'Status', type: 'text' as const },
    ],
  }];

  const records: Row[] = [
    { id: 1, name: 'record one', status: 'draft' },
    { id: 2, name: 'record two', status: 'published' },
  ];

  let pathname = $state('/detail-workspace-records');
  let routeParams = $state<Record<string, string>>({});
  // The active provider config identity. A real user button changes this and the
  // detail route inside the same event; provider closures never read this value.
  let activeProvider = $state<ProviderKey>('A');
  const routeHistory: Record<string, string>[] = [];
  const router: RouterProvider = {
    parse: () => ({ resource: 'detail-workspace-records', params: routeParams, pathname }),
    go: (options) => {
      if ((options.type ?? 'push') === 'push') routeHistory.push({ ...routeParams });
      pathname = options.to || pathname;
      routeParams = { ...(options.query ?? {}) };
    },
    back: () => { routeParams = routeHistory.pop() ?? {}; },
    formatLink: path => path,
  };

  function currentDetailId(): number | undefined {
    const raw = routeParams['detail'];
    if (!raw) return undefined;
    try { return Number(parseContractRouteId(contract, raw)); } catch { return undefined; }
  }

  function switchDetail(offset: -1 | 1): void {
    const current = currentDetailId() ?? 1;
    const target = current + offset;
    if (target < 1 || target > records.length) return;
    router.go({
      to: pathname,
      query: { ...routeParams, detail: formatContractRouteId(contract, target) },
      type: 'push',
    });
  }

  // One user event swaps the whole detailWorkspace provider config object and the
  // detail route. The workspace must never observe the new record with the old
  // provider graph (or the new provider graph with the old record).
  function switchProviderAndRecord(offset: -1 | 1): void {
    const current = currentDetailId() ?? 1;
    const target = current + offset;
    if (target < 1 || target > records.length) return;
    activeProvider = activeProvider === 'A' ? 'B' : 'A';
    router.go({
      to: pathname,
      query: { ...routeParams, detail: formatContractRouteId(contract, target) },
      type: 'push',
    });
  }

  // Logs are plain arrays exposed on window so provider reads never write Svelte state
  // from inside an async-section effect (which would re-render and re-enter the effect).
  const calls = {
    detail: [] as unknown[],
    attachments: [] as unknown[],
    activity: [] as unknown[],
    audit: [] as unknown[],
    versions: [] as unknown[],
    permissions: [] as unknown[],
  };
  (window as Window & { __detailWorkspaceCalls?: typeof calls }).__detailWorkspaceCalls = calls;

  type SectionKey = 'attachments' | 'activity' | 'audit' | 'versions';
  type ProviderKey = 'A' | 'B';
  type PendingKey = { provider: ProviderKey; section: SectionKey; recordId: string };
  type PendingLoad = PendingKey & {
    settle: (outcome: 'success' | 'failure') => void;
  };
  const pendingLoads: PendingLoad[] = [];
  function controlledLoad<T>(
    provider: ProviderKey,
    section: SectionKey,
    recordId: string,
    data: T,
  ): Promise<T> {
    if (!controlledDeferred) return Promise.resolve(data);
    return new Promise<T>((resolve, reject) => {
      pendingLoads.push({
        provider,
        section,
        recordId,
        settle: (outcome) => {
          if (outcome === 'failure') reject(new Error('PRIVATE_DETAIL_WORKSPACE_LATE_FAILURE'));
          else resolve(data);
        },
      });
    });
  }
  function settlePending(
    matches: (entry: PendingLoad) => boolean,
    outcome: 'success' | 'failure',
  ): PendingKey[] {
    const matched = pendingLoads.filter(matches);
    for (const entry of matched) {
      const index = pendingLoads.indexOf(entry);
      if (index >= 0) pendingLoads.splice(index, 1);
      entry.settle(outcome);
    }
    return matched.map(({ provider, section, recordId: id }) => ({ provider, section, recordId: id }));
  }
  // Record-only settle keeps the original scenarios working; provider-scoped
  // settle is used when two provider graphs coexist for the same record id.
  function settleRecordLoads(
    recordId: string,
    outcome: 'success' | 'failure',
    sections?: SectionKey[],
  ): PendingKey[] {
    return settlePending(
      entry => entry.recordId === String(recordId)
        && (!sections || sections.includes(entry.section)),
      outcome,
    );
  }
  function settleProviderLoads(
    provider: ProviderKey,
    recordId: string,
    outcome: 'success' | 'failure',
    sections?: SectionKey[],
  ): PendingKey[] {
    return settlePending(
      entry => entry.provider === provider
        && entry.recordId === String(recordId)
        && (!sections || sections.includes(entry.section)),
      outcome,
    );
  }
  (window as Window & {
    __detailWorkspaceControl?: {
      pending: () => PendingKey[];
      settle: typeof settleRecordLoads;
      settleFor: typeof settleProviderLoads;
    };
  }).__detailWorkspaceControl = {
    pending: () => pendingLoads.map(({ provider, section, recordId }) => ({ provider, section, recordId })),
    settle: settleRecordLoads,
    settleFor: settleProviderLoads,
  };

  function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture/detail-workspace',
    getList: async () => ({ data: clone(records), total: records.length }),
    getOne: async ({ resource, id, meta }) => {
      calls.detail.push(clone({ resource, id, meta }));
      const record = records.find(candidate => candidate.id === Number(id));
      if (!record) throw new Error('PRIVATE_DETAIL_WORKSPACE_DETAIL_DIAGNOSTIC');
      return { data: clone(record) };
    },
    create: async () => ({ data: clone(records[0]) }),
    update: async () => ({ data: clone(records[0]) }),
    deleteOne: async ({ id }) => ({ data: { id } }),
  };

  const accessControlProvider: AccessControlProvider = {
    can: async ({ resource, action, params: canParams }) => {
      calls.permissions.push(clone({ resource, action, id: canParams?.id }));
      if (denyShow && action === 'show') return { can: false };
      return { can: true };
    },
  };

  // Each provider config is its own object graph whose closure captures a fixed
  // provider identity. Call logs record that closure identity, never the mutable
  // active label, so a stale A call cannot be reported as provider B.
  function createSections(provider: ProviderKey): DetailWorkspaceSectionsConfig {
    const suffix = provider === 'A' ? '' : `-${provider}`;
    return {
      attachments: {
        provider: {
          load: async (scope, signal) => {
            calls.attachments.push(clone({ ...scope, provider }));
            if (signal.aborted) throw new Error('aborted');
            if (attachmentFailures > 0) {
              attachmentFailures -= 1;
              throw new Error('PRIVATE_DETAIL_WORKSPACE_ATTACHMENT_DIAGNOSTIC');
            }
            return controlledLoad(provider, 'attachments', String(scope.recordId), [{
              id: `attachment-${scope.recordId}${suffix}`,
              name: `attachment-record-${scope.recordId}${suffix}.txt`,
              size: '1 KB',
              type: 'text/plain',
            }] satisfies FileItem[]);
          },
        },
      },
      activity: {
        provider: {
          load: async (scope) => {
            calls.activity.push(clone({ ...scope, provider }));
            return controlledLoad(provider, 'activity', String(scope.recordId), [{
              id: `activity-${scope.recordId}${suffix}`,
              title: `activity for record ${scope.recordId}${suffix}`,
              timestamp: '2026-10-22T09:00:00.000Z',
            }] satisfies TimelineItem[]);
          },
        },
      },
      audit: {
        provider: {
          load: async (scope) => {
            calls.audit.push(clone({ ...scope, provider }));
            return controlledLoad(provider, 'audit', String(scope.recordId), [{
              id: `audit-${scope.recordId}${suffix}`,
              timestamp: '2026-10-22T09:05:00.000Z',
              action: `audit for record ${scope.recordId}${suffix}`,
              userId: 'operator-1',
              resource: scope.resourceName,
              outcome: 'success',
            }] satisfies AuditEntry[]);
          },
        },
      },
      versions: {
        provider: {
          load: async (scope) => {
            calls.versions.push(clone({ ...scope, provider }));
            return controlledLoad(provider, 'versions', String(scope.recordId), {
              oldValue: { status: 'draft', note: `version-old-${scope.recordId}${suffix}` },
              newValue: { status: 'published', note: `version-new-${scope.recordId}${suffix}` },
              fieldLabels: { status: 'Status', note: 'Note' },
            } satisfies DetailWorkspaceVersionData);
          },
        },
      },
    };
  }
  const workspaceConfigs: Record<ProviderKey, DetailWorkspaceSectionsConfig> = {
    A: createSections('A'),
    B: createSections('B'),
  };

  // Relations is a snippet provider: no core provider contract exists for it.
  // The fixture renders a controlled marker instead of pretending it is a read service.
  provideAdminContext({ dataProvider, resources, accessControlProvider, routerProvider: router });
</script>

{#snippet relationsContent(provider: ProviderKey, { recordId }: DetailWorkspaceScope)}
  <p data-testid="detail-workspace-relations-content">Related records for {recordId}</p>
  <output hidden data-testid="detail-workspace-relations-provider">{provider}</output>
  <div class="detail-workspace-switch">
    <button
      type="button"
      data-testid="detail-workspace-switch-previous"
      disabled={Number(recordId) <= 1}
      onclick={() => switchDetail(-1)}
    >Switch to previous record</button>
    <button
      type="button"
      data-testid="detail-workspace-switch-next"
      disabled={Number(recordId) >= records.length}
      onclick={() => switchDetail(1)}
    >Switch to next record</button>
    <button
      type="button"
      data-testid="detail-workspace-switch-provider-next"
      disabled={Number(recordId) >= records.length}
      onclick={() => switchProviderAndRecord(1)}
    >Switch provider and next record</button>
  </div>
{/snippet}

{#snippet relationsSectionA(scope: DetailWorkspaceScope)}
  {@render relationsContent('A', scope)}
{/snippet}

{#snippet relationsSectionB(scope: DetailWorkspaceScope)}
  {@render relationsContent('B', scope)}
{/snippet}

<QueryClientProvider client={queryClient}>
  <main data-testid="detail-workspace-browser-fixture">
    <AutoTable
      resourceName="detail-workspace-records"
      syncWithLocation={true}
      detailWorkspace={{
        ...workspaceConfigs[activeProvider],
        relations: activeProvider === 'A' ? relationsSectionA : relationsSectionB,
      }}
    />
    <output hidden data-testid="detail-workspace-route-detail">{routeParams['detail'] ?? ''}</output>
  </main>
</QueryClientProvider>

<style>
  main { min-width: 0; padding: 24px; }
  .detail-workspace-switch { display: flex; flex-wrap: wrap; gap: 8px; margin-block-start: 8px; }
  @media (max-width: 800px) { main { padding: 12px; } }
</style>