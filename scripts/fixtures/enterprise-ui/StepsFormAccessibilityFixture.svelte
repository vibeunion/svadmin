<script lang="ts">
  import { Type } from 'typebox';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { defineResource, provideAdminContext, type DataProvider } from '@svadmin/core';
  import { definedOptions, definedReactiveOptions } from '@svadmin/core/options';
  import { decodeBaseRecord } from '@svadmin/core/schema';
  import StepsForm from '../../../packages/ui/src/components/StepsForm.svelte';

  const params = new URLSearchParams(window.location.search);
  let failSave = params.has('fail-save');
  const contract = defineResource('step-items', {
    record: Type.Object({ id: Type.Number(), rows: Type.Array(Type.Object({ name: Type.String() })) }),
    create: Type.Object({ rows: Type.Array(Type.Object({ name: Type.String() })) }),
    update: Type.Partial(Type.Object({ rows: Type.Array(Type.Object({ name: Type.String() })) })),
  });
  const resources = [{
    name: 'step-items', label: 'Step items', contract,
    fields: [{
      key: 'rows', label: 'Rows', type: 'array' as const, defaultValue: [],
      description: 'Add at least one item.',
      ...(params.has('validate') ? {
        validate: (value: unknown) => Array.isArray(value) && value.length > 0 ? null : 'Add a row',
      } : {}),
      subFields: [{ key: 'name', label: 'Item name', type: 'text' as const }],
    }],
  }];
  const edit = params.has('edit');
  let holdRead = params.has('hold');
  let pendingReads = $state(0);
  let settledReads = $state(0);
  let readCount = $state(0);
  let refreshCompletions = $state(0);
  let revision = 0;
  const heldReads: { resolve: () => void; reject: (error: Error) => void }[] = [];
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  let providerVersion = $state(0);
  let tenant = $state('first');
  let lastPayload = $state('No submission');
  let writeCount = $state(0);
  let navigationCount = $state(0);
  let lastProvider = $state('none');

  function makeProvider(name: string): DataProvider {
    return {
      getApiUrl: () => `/fixture/${name}`,
      getList: async () => ({ data: [], total: 0 }),
      getOne: async ({ id }) => {
        readCount += 1;
        const data = { id, rows: [{ name: `${name} ${tenant} record ${revision}` }] };
        if (holdRead) {
          holdRead = false;
          pendingReads += 1;
          try {
            await new Promise<void>((resolve, reject) => heldReads.push({ resolve, reject }));
          } finally {
            pendingReads -= 1;
            settledReads += 1;
          }
        }
        return { data };
      },
      create: async ({ variables }) => {
        const payload = decodeBaseRecord(variables);
        lastProvider = name;
        writeCount += 1;
        lastPayload = JSON.stringify(payload);
        if (failSave) {
          failSave = false;
          throw { errors: { rows: 'PRIVATE_STEPS_SAVE_ERROR' } };
        }
        return { data: { id: 1, ...payload } };
      },
      update: async ({ id, variables }) => {
        const payload = decodeBaseRecord(variables);
        lastProvider = name;
        writeCount += 1;
        lastPayload = JSON.stringify(payload);
        return { data: { id, ...payload } };
      },
      deleteOne: async () => ({ data: {} }),
    };
  }
  const firstProvider = makeProvider('first');
  const secondProvider = makeProvider('second');
  const provider = $derived(providerVersion === 0 ? firstProvider : secondProvider);
  function releaseReads(fail = false) {
    for (const read of heldReads.splice(0)) {
      if (fail) read.reject(new Error('PRIVATE_OLD_STEPS_READ'));
      else read.resolve();
    }
  }
  async function refreshRead() {
    holdRead = true;
    revision += 1;
    await queryClient.refetchQueries({ type: 'active' });
    refreshCompletions += 1;
  }
  const router = {
    go: async () => { navigationCount += 1; },
    back: () => {},
    parse: () => ({ pathname: '/step-items/create', params: {} }),
  };

  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get routerProvider() { return router; },
  }));
</script>

<QueryClientProvider client={queryClient}>
  <section data-testid="steps-form-fixture">
    <div class="fixture-actions">
      <button type="button" data-testid="switch-tenant" onclick={() => tenant = 'second'}>Switch tenant</button>
      <button type="button" data-testid="switch-provider" onclick={() => providerVersion = 1}>Switch provider</button>
      {#if edit}
        <button type="button" data-testid="release-read" onclick={() => releaseReads()}>Release read</button>
        <button type="button" data-testid="reject-read" onclick={() => releaseReads(true)}>Reject read</button>
        <button type="button" data-testid="refresh-read" onclick={refreshRead}>Refresh read</button>
      {/if}
    </div>
    <StepsForm resourceName="step-items" mode={edit ? 'edit' : 'create'} {...definedOptions({ id: edit ? 1 : undefined })}
      steps={[{ title: 'Items', fields: ['rows'] }, { title: 'Review', fields: [] }]} />
    <output data-testid="steps-form-payload">{lastPayload}</output>
    <output data-testid="steps-form-writes">{writeCount}</output>
    <output data-testid="steps-form-navigation">{navigationCount}</output>
    <output data-testid="steps-form-provider">{lastProvider}</output>
    <output data-testid="pending-reads">{pendingReads}</output>
    <output data-testid="settled-reads">{settledReads}</output>
    <output data-testid="read-count">{readCount}</output>
    <output data-testid="refresh-completions">{refreshCompletions}</output>
  </section>
</QueryClientProvider>

<style>
  :global(body) { margin: 0; color: var(--foreground); background: var(--background); font-family: system-ui, sans-serif; }
  section { max-width: 760px; margin: 0 auto; }
  .fixture-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-block-end: 16px; }
  button { border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; background: var(--card); color: var(--foreground); }
  output { display: block; margin-block-start: 8px; font-family: ui-monospace, monospace; font-size: 12px; overflow-wrap: anywhere; }
</style>
