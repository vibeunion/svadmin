<script lang="ts">
  import { Type } from 'typebox';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import {
    defineResource,
    provideAdminContext,
    type AccessControlProvider,
    type DataProvider,
    type ImportPreviewResult,
    type TaskProvider,
  } from '@svadmin/core';
  import ImportWizard from '../../../packages/ui/src/components/ImportWizard.svelte';
  import ExportButton from '../../../packages/ui/src/components/buttons/ExportButton.svelte';

  type ImportRow = { title: string; quantity: number };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const importContract = defineResource('browser-import', {
    record: Type.Object({ id: Type.Number(), title: Type.String(), quantity: Type.Number() }),
    create: Type.Object({ title: Type.String(), quantity: Type.Number() }),
  });
  const exportContract = defineResource('browser-export', {
    record: Type.Object({ id: Type.Number(), title: Type.String(), quantity: Type.Number() }),
  });
  const resources = [
    {
      name: 'browser-import',
      label: 'Browser import',
      contract: importContract,
      fields: [
        { key: 'title', label: 'Title', type: 'text' as const, required: true },
        { key: 'quantity', label: 'Quantity', type: 'number' as const, required: true },
      ],
    },
    {
      name: 'browser-export',
      label: 'Browser export',
      contract: exportContract,
      fields: [
        { key: 'id', label: 'ID', type: 'number' as const },
        { key: 'title', label: 'Title', type: 'text' as const },
        { key: 'quantity', label: 'Quantity', type: 'number' as const },
      ],
    },
  ];

  let importCreates = $state(0);
  let importWrites = $state<ImportRow[]>([]);
  let importResult = $state('none');
  let previewResult = $state('none');
  let exportTaskGets = $state(0);
  let exportTaskSubmits = $state(0);

  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture/import-export',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async ({ resource, variables }) => {
      if (resource !== 'browser-import') throw new Error('Unexpected fixture write.');
      importCreates += 1;
      const row = variables as ImportRow;
      if (row.title === 'Reject me') throw new Error('PRIVATE_IMPORT_WRITE_FIXTURE');
      importWrites = [...importWrites, row];
      return { data: { id: 100 + importWrites.length, ...row } };
    },
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };

  const accessControlProvider: AccessControlProvider = {
    can: async () => ({ can: true }),
  };

  const taskProvider: TaskProvider = {
    submit: async () => {
      exportTaskSubmits += 1;
      return { id: 'export-task-1', wait: async () => ({ id: 'export-task-1', status: 'completed' }) };
    },
    get: async (taskId) => {
      exportTaskGets += 1;
      return {
        id: taskId,
        status: 'completed',
        result: { downloadUrl: '/export-artifact.csv', format: 'csv', fileName: 'browser-export_export.csv' },
      };
    },
  };

  const panel = new URLSearchParams(window.location.search).get('panel') ?? 'import';

  provideAdminContext({
    dataProvider,
    resources,
    tenant: { tenantId: 'browser' },
    accessControlProvider,
  });
</script>

<main>
  {#if panel === 'import'}
  <section aria-label="Import wizard">
    <QueryClientProvider client={queryClient}>
      <ImportWizard
        resourceName="browser-import"
        open={true}
        onSuccess={(result) => { importResult = JSON.stringify(result); }}
      />
    </QueryClientProvider>
    <output data-testid="import-creates">{importCreates}</output>
    <output data-testid="import-writes">{JSON.stringify(importWrites)}</output>
    <output data-testid="import-result">{importResult}</output>
  </section>
  {:else if panel === 'preview'}

  <section aria-label="Import dry run">
    <QueryClientProvider client={queryClient}>
      <ImportWizard
        resourceName="browser-import"
        open={true}
        dryRun={true}
        onPreview={(result: ImportPreviewResult) => { previewResult = JSON.stringify(result); }}
      />
    </QueryClientProvider>
    <output data-testid="preview-result">{previewResult}</output>
    <output data-testid="import-creates">{importCreates}</output>
    <output data-testid="import-writes">{JSON.stringify(importWrites)}</output>
  </section>
  {:else if panel === 'preview-import'}

  <section aria-label="Import preview then import">
    <QueryClientProvider client={queryClient}>
      <ImportWizard
        resourceName="browser-import"
        open={true}
        onPreview={(result: ImportPreviewResult) => { previewResult = JSON.stringify(result); }}
        onSuccess={(result) => { importResult = JSON.stringify(result); }}
      />
    </QueryClientProvider>
    <output data-testid="preview-result">{previewResult}</output>
    <output data-testid="import-creates">{importCreates}</output>
    <output data-testid="import-writes">{JSON.stringify(importWrites)}</output>
    <output data-testid="import-result">{importResult}</output>
  </section>
  {:else if panel === 'export'}

  <section aria-label="Export button">
    <QueryClientProvider client={queryClient}>
      <ExportButton
        resource="browser-export"
        label="Export browser records"
        taskName="export-browser-records"
        {taskProvider}
        taskIdempotencyKey="export-attempt-1"
        initialTaskId="export-task-1"
        maxItemCount={5}
      />
    </QueryClientProvider>
    <output data-testid="export-task-gets">{exportTaskGets}</output>
    <output data-testid="export-task-submits">{exportTaskSubmits}</output>
  </section>
  {/if}
</main>
