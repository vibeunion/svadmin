<script lang="ts">
  import { defineResource, provideAdminContext, type DataProvider, type ResourceDefinition } from '@svadmin/core';
  import { decodeBaseRecord } from '@svadmin/core/schema';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { Type } from 'typebox';
  import AutoForm from '../../../packages/ui/src/components/AutoForm.svelte';
  import { Editor } from '@svadmin/editor';
  import { setRichTextEditor } from '../../../packages/ui/src/editor-config.svelte';
  import { definedOptions } from '@svadmin/core/options';

  let successCount = $state(0);
  let payload = $state('No submission');
  let resourceName = $state('form-products');
  const client = new QueryClient();
  const compound = new URLSearchParams(window.location.search).get('compound');
  const arrayCompound = compound === 'array';
  const daterangeCompound = compound === 'daterange';
  const treeSelectCompound = compound === 'tree-select';
  const transferCompound = compound === 'transfer';
  const cascaderCompound = compound === 'cascader';
  const richtextCompound = compound === 'richtext';
  const tagsCompound = compound === 'tags';
  const multiselectCompound = compound === 'multiselect';
  const imagesCompound = compound === 'images';
  // 只在 richtext 组合场景注册真实编辑器，避免其它组合夹具走富文本路径。
  if (richtextCompound) setRichTextEditor(Editor);
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
  const periodShape = {
    period: Type.Object({
      start: Type.String({ format: 'date' }),
      end: Type.String({ format: 'date' }),
    }, { additionalProperties: false }),
  };
  const departmentShape = { department: Type.String({ minLength: 1 }) };
  const rolesShape = { roles: Type.Array(Type.String(), { minItems: 1 }) };
  const regionShape = { region: Type.Array(Type.String(), { minItems: 1 }) };
  const bodyShape = { body: Type.String({ minLength: 1 }) };
  const tagsShape = { tags: Type.Array(Type.String(), { minItems: 1 }) };
  const labelsShape = { labels: Type.Array(Type.String(), { minItems: 1 }) };
  const imagesShape = { images: Type.Array(Type.String(), { minItems: 1 }) };
  function makeResource(name: string): ResourceDefinition {
    return {
      name,
      label: 'Products',
      contract: defineResource(name, {
        record: Type.Object({ id: Type.String(), name: Type.String(), description: Type.String(), ...(arrayCompound ? rowShape : {}), ...(daterangeCompound ? periodShape : {}), ...(treeSelectCompound ? departmentShape : {}), ...(transferCompound ? rolesShape : {}), ...(cascaderCompound ? regionShape : {}), ...(richtextCompound ? bodyShape : {}), ...(tagsCompound ? tagsShape : {}), ...(multiselectCompound ? labelsShape : {}), ...(imagesCompound ? imagesShape : {}) }),
        create: Type.Object({
          name: Type.String({ minLength: 1 }),
          description: Type.String({ minLength: 1 }),
          ...(arrayCompound ? rowShape : {}),
          ...(daterangeCompound ? periodShape : {}),
          ...(treeSelectCompound ? departmentShape : {}),
          ...(transferCompound ? rolesShape : {}),
          ...(cascaderCompound ? regionShape : {}),
          ...(richtextCompound ? bodyShape : {}), ...(tagsCompound ? tagsShape : {}), ...(multiselectCompound ? labelsShape : {}), ...(imagesCompound ? imagesShape : {}),
        }),
        update: Type.Object({
          name: Type.String({ minLength: 1 }),
          description: Type.String({ minLength: 1 }),
          ...(arrayCompound ? rowShape : {}),
          ...(daterangeCompound ? periodShape : {}),
          ...(treeSelectCompound ? departmentShape : {}),
          ...(transferCompound ? rolesShape : {}),
          ...(cascaderCompound ? regionShape : {}),
          ...(richtextCompound ? bodyShape : {}), ...(tagsCompound ? tagsShape : {}), ...(multiselectCompound ? labelsShape : {}), ...(imagesCompound ? imagesShape : {}),
        }),
      }),
      fields: [
        ...(daterangeCompound ? [{
          key: 'period', label: 'Period', type: 'daterange' as const, description: 'Choose a product period.', required: true,
          dateInput: {
            presets: [
              { label: 'First week', value: { start: '2026-09-01', end: '2026-09-07' } },
              { label: 'Second week', value: { start: '2026-09-08', end: '2026-09-14' } },
            ],
          },
        }] : []),
        ...(arrayCompound ? [{
          key: 'rows', label: 'Rows', type: 'array' as const, description: 'Add product rows.', defaultValue: [],
          validate: (value: unknown) => Array.isArray(value) && value.length > 0 ? undefined : 'Add a row',
          subFields: [{ key: 'title', label: 'Title', type: 'text' as const }],
        }] : []),
        ...(treeSelectCompound ? [{
          key: 'department', label: 'Department', type: 'tree-select' as const, description: 'Choose a department.', required: true,
          treeOptions: [{ label: 'Leaf', value: 'leaf' }],
        }] : []),
        ...(transferCompound ? [{
          key: 'roles', label: 'Roles', type: 'transfer' as const, description: 'Assign product roles.', required: true,
          transferData: [
            { key: 'admin', title: 'Administrator' },
            { key: 'viewer', title: 'Viewer' },
          ],
        }] : []),
        ...(cascaderCompound ? [{
          key: 'region', label: 'Region', type: 'cascader' as const, description: 'Choose a region.', required: true,
          changeOnSelect: true,
          cascaderOptions: [{
            label: 'East', value: 'east',
            children: [
              { label: 'Shanghai', value: 'shanghai' },
              { label: 'Beijing', value: 'beijing' },
            ],
          }],
        }] : []),
        ...(richtextCompound ? [{
          key: 'body', label: 'Body', type: 'richtext' as const, description: 'Write the product body.', required: true,
        }] : []),
        ...(tagsCompound ? [{
          key: 'tags', label: 'Tags', type: 'tags' as const, description: 'Choose product tags.', required: true,
        }] : []),
        ...(multiselectCompound ? [{
          key: 'labels', label: 'Labels', type: 'multiselect' as const, description: 'Choose product labels.', required: true,
          options: [
            { label: 'Alpha', value: 'alpha' },
            { label: 'Beta', value: 'beta' },
            { label: 'Disabled', value: 'disabled', disabled: true },
          ],
        }] : []),
        ...(imagesCompound ? [{
          key: 'images', label: 'Images', type: 'images' as const, description: 'Choose product images.', required: true,
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
          ...(arrayCompound ? { rows: [{ title: `Server row ${recordRevision}` }] } : {}),
          ...(daterangeCompound ? { period: { start: '2026-08-01', end: '2026-08-10' } } : {}),
          ...(treeSelectCompound ? { department: 'leaf' } : {}),
          ...(transferCompound ? { roles: ['admin'] } : {}),
          ...(richtextCompound ? { body: '<p>Server body</p>' } : {}),
          ...(tagsCompound ? { tags: ['server-tag'] } : {}),
          ...(multiselectCompound ? { labels: ['alpha'] } : {}),
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
