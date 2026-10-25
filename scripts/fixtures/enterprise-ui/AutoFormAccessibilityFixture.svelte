<script lang="ts">
  import { defineResource, provideAdminContext, type DataProvider, type ResourceDefinition } from '@svadmin/core';
  import { decodeBaseRecord } from '@svadmin/core/schema';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { Type } from 'typebox';
  import AutoForm from '../../../packages/ui/src/components/AutoForm.svelte';
  import { definedOptions } from '@svadmin/core/options';

  let successCount = $state(0);
  let payload = $state('No submission');
  let resourceName = $state('form-products');
  const client = new QueryClient();
  const compound = new URLSearchParams(window.location.search).get('compound') === 'array';
  const edit = new URLSearchParams(window.location.search).get('edit') === '1';
  let holdRead = new URLSearchParams(window.location.search).get('hold') === 'initial';
  const heldReads: { resolve: () => void; reject: (error: Error) => void }[] = [];
  let pendingReads = $state(0);
  let settledReads = $state(0);
  let readCount = $state(0);
  let refreshCompletions = $state(0);
  let providerSequence = 0;
  let recordRevision = 0;
  const rowShape = { rows: Type.Array(Type.Object({ title: Type.String({ minLength: 1 }) }), { minItems: 1 }) };
  function makeResource(name: string): ResourceDefinition {
    return {
      name,
      label: 'Products',
      contract: defineResource(name, {
        record: Type.Object({ id: Type.String(), name: Type.String(), description: Type.String(), ...(compound ? rowShape : {}) }),
        create: Type.Object({
          name: Type.String({ minLength: 1 }),
          description: Type.String({ minLength: 1 }),
          ...(compound ? rowShape : {}),
        }),
        update: Type.Object({
          name: Type.String({ minLength: 1 }),
          description: Type.String({ minLength: 1 }),
          ...(compound ? rowShape : {}),
        }),
      }),
      fields: [
        ...(compound ? [{
          key: 'rows', label: 'Rows', type: 'array' as const, description: 'Add product rows.', defaultValue: [],
          validate: (value: unknown) => Array.isArray(value) && value.length > 0 ? undefined : 'Add a row',
          subFields: [{ key: 'title', label: 'Title', type: 'text' as const }],
        }] : []),
        { key: 'name', label: 'Name', type: 'text', description: 'A name for the product.', required: true },
        { key: 'description', label: 'Description', type: 'textarea', description: 'A short product description.', required: true },
      ],
    };
  }
  const resources: ResourceDefinition[] = [makeResource('form-products'), makeResource('form-products-next')];
  function makeProvider(): DataProvider {
    const providerId = ++providerSequence;
    return {
      getList: async () => ({ data: [], total: 0 }),
      getOne: async ({ resource: requestedResource }) => {
        readCount += 1;
        const current = requestedResource === 'form-products-next' || providerId > 1;
        const data = {
          id: 'product-1',
          name: current ? 'New record' : 'Old record',
          description: current ? 'New response' : 'Old response',
          ...(compound ? { rows: [{ title: `Server row ${recordRevision}` }] } : {}),
        };
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
        const record = decodeBaseRecord(variables);
        payload = JSON.stringify(record);
        return { data: { id: 'product-1', ...record } };
      },
      update: async ({ id, variables }) => {
        const record = decodeBaseRecord(variables);
        payload = JSON.stringify(record);
        return { data: { id, ...record } };
      },
      deleteOne: async ({ id }) => ({ data: { id } }),
    };
  }
  function releaseReads(fail = false) {
    for (const pending of heldReads.splice(0)) {
      if (fail) pending.reject(new Error('PRIVATE_OLD_READ'));
      else pending.resolve();
    }
  }
  async function refreshRead() {
    holdRead = true;
    recordRevision += 1;
    await client.refetchQueries({ type: 'active' });
    refreshCompletions += 1;
  }
  let dataProvider = $state.raw(makeProvider());
  provideAdminContext({
    get dataProvider() { return dataProvider; },
    get resources() { return resources; },
  });
</script>

<div data-testid="autoform-fixture">
  <button type="button" data-testid="switch-autoform-scope" onclick={() => resourceName = resourceName === 'form-products' ? 'form-products-next' : 'form-products'}>Switch form scope</button>
  <button type="button" data-testid="replace-autoform-provider" onclick={() => dataProvider = makeProvider()}>Replace provider</button>
  {#if edit}
    <button type="button" data-testid="release-autoform-read" onclick={() => releaseReads()}>Release reads</button>
    <button type="button" data-testid="reject-autoform-read" onclick={() => releaseReads(true)}>Reject reads</button>
    <button type="button" data-testid="refresh-autoform-read" onclick={refreshRead}>Refresh record</button>
    <output data-testid="autoform-pending-reads">{pendingReads}</output>
    <output data-testid="autoform-settled-reads">{settledReads}</output>
    <output data-testid="autoform-read-count">{readCount}</output>
    <output data-testid="autoform-refresh-completions">{refreshCompletions}</output>
  {/if}
  <QueryClientProvider {client}>
    <section aria-label="First product form">
      <AutoForm {resourceName} mode={edit ? 'edit' : 'create'} {...definedOptions({ id: edit ? 'product-1' : undefined })} showHeader={false} redirect={false} onSuccess={() => successCount += 1} />
    </section>
    <section aria-label="Second product form">
      <AutoForm {resourceName} mode={edit ? 'edit' : 'create'} {...definedOptions({ id: edit ? 'product-1' : undefined })} showHeader={false} redirect={false} onSuccess={() => successCount += 1} />
    </section>
  </QueryClientProvider>
  <output data-testid="autoform-success-count">{successCount}</output>
  <output data-testid="autoform-payload">{payload}</output>
</div>
