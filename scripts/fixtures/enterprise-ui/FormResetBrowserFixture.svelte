<script lang="ts">
  import type { DataProvider, ResourceDefinition, RouterProvider } from '@svadmin/core';
  import { defineResource } from '@svadmin/core';
  import { decodeBaseRecord } from '@svadmin/core/schema';
  import { Type } from 'typebox';
  import AdminApp from '../../../packages/ui/src/components/AdminApp.svelte';
  import AutoForm from '../../../packages/ui/src/components/AutoForm.svelte';
  import StepsForm from '../../../packages/ui/src/components/StepsForm.svelte';

  // 本 fixture 只消费真实 AutoForm/StepsForm 的 bind:this reset API，
  // 产品表单本身没有 reset 按钮；按钮仅属测试 harness。
  const params = new URLSearchParams(window.location.search);
  const kind = params.get('kind') === 'steps' ? 'steps' : 'auto';
  const denied = params.has('denied');
  const mode = params.get('mode') === 'show' ? 'show' : 'create';

  let autoForm = $state<{ reset: () => void }>();
  let stepsForm = $state<{ reset: () => void }>();
  let resetCalls = $state(0);
  let writeCount = $state(0);
  let navigationCount = $state(0);
  let successCount = $state(0);

  const dataProvider: DataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({
      data: { id: 'record-1', name: 'Baseline', description: 'Baseline description' },
    }),
    create: async ({ variables }) => {
      const payload = decodeBaseRecord(variables);
      writeCount += 1;
      return { data: { id: 'record-1', ...payload } };
    },
    update: async ({ id, variables }) => {
      const payload = decodeBaseRecord(variables);
      writeCount += 1;
      return { data: { id, ...payload } };
    },
    deleteOne: async ({ id }) => ({ data: { id } }),
    getApiUrl: () => 'https://example.test',
  };

  const resources: ResourceDefinition[] = [{
    name: 'records',
    label: 'Records',
    contract: defineResource('records', {
      record: Type.Object({ id: Type.String(), name: Type.String(), description: Type.String() }),
      create: Type.Object({
        name: Type.String({ minLength: 1 }),
        description: Type.String({ minLength: 1 }),
      }),
      update: Type.Partial(Type.Object({
        name: Type.String({ minLength: 1 }),
        description: Type.String({ minLength: 1 }),
      })),
    }),
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, defaultValue: 'Baseline' },
      {
        key: 'description', label: 'Description', type: 'text', required: true,
        defaultValue: 'Baseline description',
      },
    ],
  }];

  const routerProvider: RouterProvider = {
    go: () => { navigationCount += 1; },
    back: () => {},
    parse: () => ({ pathname: '/', params: {} }),
  };

  function callReset(): void {
    resetCalls += 1;
    (kind === 'auto' ? autoForm : stepsForm)?.reset();
  }
</script>

{#snippet dashboard()}
  {#if kind === 'auto'}
    <AutoForm
      bind:this={autoForm}
      resourceName="records"
      showHeader={false}
      {mode}
      redirect={false}
      id={mode === 'show' ? 'record-1' : undefined}
      onSuccess={() => { successCount += 1; }}
    />
  {:else}
    <StepsForm
      bind:this={stepsForm}
      resourceName="records"
      mode="create"
      steps={[
        { title: 'Baseline', fields: ['name'] },
        { title: 'Review', fields: ['description'] },
      ]}
      onSuccess={() => { successCount += 1; }}
    />
  {/if}
{/snippet}

<section data-testid="form-reset-fixture">
  <div class="fixture-actions">
    <button type="button" data-testid="call-reset" onclick={callReset}>Call host reset</button>
  </div>
  <output data-testid="reset-calls">{resetCalls}</output>
  <output data-testid="write-count">{writeCount}</output>
  <output data-testid="navigation-count">{navigationCount}</output>
  <output data-testid="success-count">{successCount}</output>
  <div data-testid="product-form-host">
    <AdminApp
      {dataProvider}
      {resources}
      {routerProvider}
      accessControlProvider={{ can: async () => ({ can: !denied }) }}
      locale="en"
      {dashboard}
    />
  </div>
</section>

<style>
  :global(body) { margin: 0; color: var(--foreground); background: var(--background); font-family: system-ui, sans-serif; }
  section { max-width: 760px; margin: 0 auto; padding: 16px; }
  .fixture-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-block-end: 12px; }
  button { border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; background: var(--card); color: var(--foreground); }
  output { display: block; font-family: ui-monospace, monospace; font-size: 12px; }
</style>