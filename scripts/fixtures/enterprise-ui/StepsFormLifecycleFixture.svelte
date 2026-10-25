<script lang="ts">
  import { Type } from 'typebox';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { defineResource, provideAdminContext, type DataProvider } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import StepsForm from '../../../packages/ui/src/components/StepsForm.svelte';

  type Outcome = 'success' | 'reject-sync' | 'reject-async' | 'defer';
  type Deferred = {
    id: number;
    variables: Record<string, unknown>;
    resolve: (value: { data: Record<string, unknown> }) => void;
    reject: (reason: unknown) => void;
  };

  const contract = defineResource('lifecycle-items', {
    record: Type.Object({ id: Type.Number(), title: Type.String(), notes: Type.String() }),
    create: Type.Object({ title: Type.String(), notes: Type.String() }),
    update: Type.Partial(Type.Object({ title: Type.String(), notes: Type.String() })),
  });
  const resources = [{
    name: 'lifecycle-items', label: 'Lifecycle items', contract,
    fields: [
      { key: 'title', label: 'Title', type: 'text' as const, description: 'Title shown on every step.' },
      { key: 'notes', label: 'Notes', type: 'textarea' as const, description: 'Reviewed on the confirmation step.' },
    ],
  }];

  let outcome = $state<Outcome>('success');
  let writeCount = $state(0);
  let lastVariables = $state('none');
  let navigationCount = $state(0);
  let successLog = $state<string[]>([]);
  let instance = $state(0);
  let nextRecordId = 1;
  let nextDeferredId = 0;
  let pending = $state<Deferred[]>([]);
  const pendingLabel = $derived(pending.length === 0 ? 'none' : pending.map(item => `#${item.id}`).join(' | '));
  const successLabel = $derived(successLog.length === 0 ? 'none' : successLog.join(','));

  function setOutcome(next: Outcome): void {
    outcome = next;
  }
  function successFor(id: number): () => void {
    return () => { successLog = [...successLog, String(id)]; };
  }
  function settle(action: 'resolve' | 'reject'): void {
    const entry = pending[0];
    if (!entry) return;
    pending = pending.filter(item => item.id !== entry.id);
    if (action === 'resolve') entry.resolve({ data: { id: nextRecordId++, ...entry.variables } });
    else entry.reject(new Error(`PRIVATE_STEPS_FORM_DEFERRED_${entry.id}`));
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  const provider: DataProvider = {
    getApiUrl: () => '/fixture/steps-form-lifecycle',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async ({ id }) => ({ data: { id, title: '', notes: '' } }),
    create: (request) => {
      const variables = request.variables as Record<string, unknown>;
      writeCount += 1;
      lastVariables = JSON.stringify(variables);
      if (outcome === 'reject-sync') throw new Error('PRIVATE_STEPS_FORM_SYNC_FAILURE');
      if (outcome === 'reject-async') return Promise.reject(new Error('PRIVATE_STEPS_FORM_ASYNC_FAILURE'));
      if (outcome === 'defer') {
        return new Promise<{ data: Record<string, unknown> }>((resolve, reject) => {
          pending = [...pending, { id: ++nextDeferredId, variables, resolve, reject }];
        });
      }
      return Promise.resolve({ data: { id: nextRecordId++, ...variables } });
    },
    update: async ({ id, variables }) => ({ data: { id, ...(variables as Record<string, unknown>) } }),
    deleteOne: async () => ({ data: {} }),
  };
  const router = {
    go: async () => { navigationCount += 1; },
    back: () => {},
    parse: () => ({ pathname: '/lifecycle-items/create', params: {} }),
  };

  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get routerProvider() { return router; },
  }));
</script>

<QueryClientProvider client={queryClient}>
  <section data-testid="steps-form-lifecycle-fixture">
    <header>
      <p class="eyebrow">STEPSFORM · BROWSER LIFECYCLE FIXTURE</p>
      <h1>Controlled writes, failures and replacement</h1>
      <p>宿主控制面只设置下一次 provider 结局、结算 deferred 或替换实例，不读取组件私有状态。</p>
    </header>

    <div class="control-plane" aria-label="Host control plane">
      <button type="button" data-testid="set-success" onclick={() => setOutcome('success')}>Next outcome: success</button>
      <button type="button" data-testid="set-fail-sync" onclick={() => setOutcome('reject-sync')}>Next outcome: sync failure</button>
      <button type="button" data-testid="set-fail-async" onclick={() => setOutcome('reject-async')}>Next outcome: async failure</button>
      <button type="button" data-testid="set-defer" onclick={() => setOutcome('defer')}>Next outcome: defer</button>
      <button type="button" data-testid="settle-resolve" onclick={() => settle('resolve')}>Settle oldest: resolve</button>
      <button type="button" data-testid="settle-reject" onclick={() => settle('reject')}>Settle oldest: reject</button>
      <button type="button" data-testid="replace-form" onclick={() => { instance += 1; }}>Replace form</button>
    </div>

    <div class="form-host" data-testid="steps-form-host">
      {#key instance}
        <StepsForm
          resourceName="lifecycle-items"
          mode="create"
          steps={[{ title: 'Basics', fields: ['title'] }, { title: 'Review', fields: ['notes'] }]}
          onSuccess={successFor(instance)}
        />
      {/key}
    </div>

    <output data-testid="lifecycle-outcome">{outcome}</output>
    <output data-testid="lifecycle-writes">{writeCount}</output>
    <output data-testid="lifecycle-payload">{lastVariables}</output>
    <output data-testid="lifecycle-navigation">{navigationCount}</output>
    <output data-testid="lifecycle-successes">{successLabel}</output>
    <output data-testid="lifecycle-instance">{instance}</output>
    <output data-testid="lifecycle-pending">{pendingLabel}</output>
  </section>
</QueryClientProvider>

<style>
  :global(body) { margin: 0; color: var(--foreground); background: var(--background); font-family: system-ui, sans-serif; }
  section { box-sizing: border-box; width: 100%; max-width: 860px; margin: 0 auto; }
  header { margin-block-end: 16px; }
  h1 { font-size: 22px; line-height: 1.25; margin: 4px 0 8px; font-weight: 650; }
  p { margin: 0; color: var(--muted-foreground); font-size: 14px; }
  .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .09em; }
  .control-plane { display: flex; flex-wrap: wrap; gap: 8px; margin-block-end: 16px; }
  button { max-width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; background: var(--card); color: var(--foreground); font-size: 12px; }
  output { display: block; margin-block-start: 8px; font-family: ui-monospace, monospace; font-size: 12px; overflow-wrap: anywhere; }
</style>