<script lang="ts">
  import { requireValue } from '../../test-assertions';
  import { Type } from 'typebox';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { defineResource, provideAdminContext, type DataProvider } from '@svadmin/core';
  import AutoTable from '../../../packages/ui/src/components/AutoTable.svelte';
  import QuickEditDrawer from '../../../packages/ui/src/components/QuickEditDrawer.svelte';
  import { createResourceRendering } from '../../../packages/ui/src/rendering/index.js';

  type Row = { id: number; title: string; team: string };

  type UpdateCall = {
    resource: string;
    id: number;
    variables: Record<string, unknown>;
    meta: Record<string, unknown>;
  };

  type PendingUpdate = {
    recordId: number;
    session: number;
    resolve: () => void;
    reject: () => void;
  };

  function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const contract = defineResource('lifecycle-records', {
    record: Type.Object({
      id: Type.Number(),
      title: Type.String(),
      team: Type.String(),
    }),
    update: Type.Object({ title: Type.String() }),
  });

  const resources = [{
    name: 'lifecycle-records',
    label: 'Lifecycle records',
    contract,
    canCreate: false,
    canShow: false,
    canEdit: true,
    canDelete: false,
    fields: [
      { key: 'id', label: 'ID', type: 'number' as const },
      { key: 'title', label: 'Title', type: 'text' as const, searchable: true, filterable: true },
      { key: 'team', label: 'Team', type: 'text' as const, searchable: true, filterable: true },
    ],
  }];

  const rendering = createResourceRendering(contract);

  const records = $state<Row[]>([
    { id: 1, title: 'Lifecycle item 1', team: 'platform' },
    { id: 2, title: 'Lifecycle item 2', team: 'operations' },
  ]);

  // 宿主只拥有打开哪条记录、是否强制卸载以及 deferred 结局；不读取抽屉私有状态。
  let openId = $state<number | undefined>(undefined);
  let openSession = $state(0);
  let pendingUpdate: PendingUpdate | undefined;

  const updateCalls = $state<UpdateCall[]>([]);
  const updateSettlements = $state<Array<{ recordId: number; session: number; outcome: 'resolved' | 'rejected' }>>([]);
  const receiptDecisions = $state<Array<{ recordId: number; session: number; decision: 'applied' | 'ignored' }>>([]);

  function openQuickEdit(id: number) {
    openId = id;
    openSession += 1;
  }

  function forceCloseDrawer() {
    openId = undefined;
  }

  // 旧回执只允许关闭它自己所属的记录/抽屉实例，不能影响宿主后来替换的新抽屉。
  function closeFromDrawer(recordId: number, session: number) {
    const decision = openId === recordId && openSession === session ? 'applied' : 'ignored';
    receiptDecisions.push({ recordId, session, decision });
    if (decision === 'applied') openId = undefined;
  }

  function settleRecord(recordId: number, title: string): Row | undefined {
    const index = records.findIndex(candidate => candidate.id === recordId);
    if (index < 0) return undefined;
    const next = { ...requireValue(records[index]), title };
    records[index] = next;
    return next;
  }

  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture/quick-edit-lifecycle',
    getList: async () => ({ data: clone(records), total: records.length }),
    getOne: async ({ id }) => {
      const record = records.find(candidate => candidate.id === Number(id));
      if (!record) throw new Error('PRIVATE_QUICK_EDIT_DETAIL_DIAGNOSTIC');
      return { data: clone(record) };
    },
    create: async () => ({ data: { id: 999, title: 'created', team: 'platform' } }),
    update: async ({ resource, id, variables, meta }) => {
      const recordId = Number(id);
      updateCalls.push(clone({ resource, id: recordId, variables, meta }));
      const requestSession = openSession;
      return await new Promise((resolve, reject) => {
        pendingUpdate = {
          recordId,
          session: requestSession,
          resolve: () => {
            pendingUpdate = undefined;
            updateSettlements.push({ recordId, session: requestSession, outcome: 'resolved' });
            const updated = settleRecord(recordId, String((variables as Record<string, unknown>).title ?? ''));
            if (!updated) {
              reject(new Error('PRIVATE_QUICK_EDIT_UPDATE_DIAGNOSTIC'));
              return;
            }
            resolve({ data: clone(updated) });
          },
          reject: () => {
            pendingUpdate = undefined;
            updateSettlements.push({ recordId, session: requestSession, outcome: 'rejected' });
            reject(new Error('PRIVATE_QUICK_EDIT_UPDATE_DIAGNOSTIC'));
          },
        };
      });
    },
    deleteOne: async ({ id }) => ({ data: { id: String(id) } }),
  };

  provideAdminContext({ dataProvider, resources });
</script>

<QueryClientProvider client={queryClient}>
  <main data-testid="quick-edit-lifecycle-fixture">
    <header>
      <p class="eyebrow">SVADMIN · QUICK EDIT LIFECYCLE</p>
      <h1>Pending close protection and host receipt isolation</h1>
      <p>Real AutoTable and QuickEditDrawer; the host only controls deferred update settlement and drawer replacement.</p>
    </header>

    <AutoTable resourceName="lifecycle-records" syncWithLocation={false}>
      {#snippet rowActions({ id })}
        <button
          type="button"
          data-testid={`open-quick-edit-${id}`}
          onclick={() => openQuickEdit(Number(id))}
        >Quick edit {id}</button>
      {/snippet}
    </AutoTable>

    <div class="host-controls" data-testid="host-controls">
      <button type="button" data-testid="force-close-drawer" onclick={forceCloseDrawer}>Force close drawer</button>
      <button type="button" data-testid="resolve-pending-update" onclick={() => pendingUpdate?.resolve()}>Resolve pending update</button>
      <button type="button" data-testid="reject-pending-update" onclick={() => pendingUpdate?.reject()}>Reject pending update</button>
    </div>

    {#if openId != null}
      {#key openSession}
        {@const editingId = openId}
        {@const editingSession = openSession}
        <QuickEditDrawer
          resourceName="lifecycle-records"
          {rendering}
          recordId={editingId}
          onClose={() => closeFromDrawer(editingId, editingSession)}
        />
      {/key}
    {/if}

    <output hidden data-testid="quick-edit-update-calls">{JSON.stringify(updateCalls)}</output>
    <output hidden data-testid="quick-edit-update-settlements">{JSON.stringify(updateSettlements)}</output>
    <output hidden data-testid="quick-edit-records">{JSON.stringify(records)}</output>
    <output hidden data-testid="quick-edit-receipts">{JSON.stringify(receiptDecisions)}</output>
    <output hidden data-testid="quick-edit-host">{JSON.stringify({ openId: openId ?? null, openSession })}</output>
  </main>
</QueryClientProvider>

<style>
  main { min-width: 0; padding: 24px; }
  header { margin-block-end: 16px; }
  h1 { font-size: 20px; line-height: 1.3; margin: 4px 0 6px; font-weight: 650; }
  p { color: var(--muted-foreground); font-size: 13px; max-width: 72ch; }
  .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .09em; }
  .host-controls {
    display: flex;
    max-width: 100%;
    flex-wrap: wrap;
    gap: 6px;
    margin-block-start: 12px;
  }
  .host-controls button { border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; background: var(--card); color: var(--foreground); font-size: 12px; }
  @media (max-width: 800px) { main { padding: 12px; } }
</style>
