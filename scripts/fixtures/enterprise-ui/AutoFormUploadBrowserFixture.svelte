<script lang="ts">
  import type { DataProvider, ResourceDefinition, RouterProvider } from '@svadmin/core';
  import { defineResource } from '@svadmin/core';
  import { decodeBaseRecord } from '@svadmin/core/schema';
  import { Type } from 'typebox';
  import AdminApp from '../../../packages/ui/src/components/AdminApp.svelte';
  import AutoForm from '../../../packages/ui/src/components/AutoForm.svelte';
  import type {
    UploadCancelHandler, UploadHandler,
  } from '../../../packages/ui/src/components/FileUpload.svelte';

  // 真实 AdminApp + AutoForm + TypeBox contract；provider 只返回本地已有附件。
  // 上传按钮属于测试宿主，只用明确 pending session 完成/失败真实上传回调。
  type PendingUpload = {
    id: number;
    sessionId: string;
    url: string;
    resolve: (value: { url: string; uploadId: string }) => void;
    reject: (reason: Error) => void;
  };

  let autoForm = $state<{ reset: () => void }>();
  let pendingUploads = $state<PendingUpload[]>([]);
  let uploadCalls = $state(0);
  let resetCalls = $state(0);
  let writeCount = $state(0);
  let successCount = $state(0);
  let lastWrite = $state('No write');
  let cancellations = $state<{ reason: string; uploadId: string }[]>([]);

  const existingAttachment = {
    url: '/existing/quarterly-report.pdf',
    uploadId: 'existing-upload-id',
  };

  const dataProvider: DataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async ({ id }) => ({
      data: { id, title: 'Quarterly report', attachment: existingAttachment },
    }),
    create: async ({ variables }) => {
      const payload = decodeBaseRecord(variables);
      writeCount += 1;
      lastWrite = JSON.stringify(payload);
      return { data: { id: 'record-1', ...payload } };
    },
    update: async ({ id, variables }) => {
      const payload = decodeBaseRecord(variables);
      writeCount += 1;
      lastWrite = JSON.stringify(payload);
      return { data: { id, ...payload } };
    },
    deleteOne: async ({ id }) => ({ data: { id } }),
    getApiUrl: () => 'https://fixture.invalid',
  };

  const reference = Type.Object({
    url: Type.Optional(Type.String()),
    uploadId: Type.Optional(Type.String()),
  });
  const attachment = Type.Union([Type.String(), reference]);
  const resources: ResourceDefinition[] = [{
    name: 'reports',
    label: 'Reports',
    contract: defineResource('reports', {
      record: Type.Object({ id: Type.String(), title: Type.String(), attachment }),
      create: Type.Object({
        title: Type.String({ minLength: 1 }),
        attachment,
      }),
      update: Type.Object({
        title: Type.String({ minLength: 1 }),
        attachment,
      }),
    }),
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      {
        key: 'attachment',
        label: 'Attachment',
        type: 'file',
        required: true,
        description: 'Attach the signed quarterly report.',
      },
    ],
  }];

  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ pathname: '/', params: {} }),
  };

  const upload: UploadHandler = (file, session) => {
    uploadCalls += 1;
    const id = uploadCalls;
    const sessionId = `pending-session-${id}`;
    const url = `/uploads/session-${id}.pdf`;
    session.setUploadId(sessionId);
    session.onProgress(35);
    return new Promise<{ url: string; uploadId: string }>((resolve, reject) => {
      void file;
      pendingUploads = [...pendingUploads, { id, sessionId, url, resolve, reject }];
    });
  };

  const cancelUpload: UploadCancelHandler = async (file, cancellation) => {
    void file;
    cancellations = [...cancellations, {
      reason: cancellation.reason,
      uploadId: cancellation.uploadId,
    }];
  };

  function settleUpload(operation: PendingUpload, reject: boolean): void {
    pendingUploads = pendingUploads.filter(item => item !== operation);
    if (reject) operation.reject(new Error('Fixture upload failed.'));
    else operation.resolve({ url: operation.url, uploadId: operation.sessionId });
  }

  function resetForm(): void {
    resetCalls += 1;
    autoForm?.reset();
  }
</script>

{#snippet dashboard()}
  <AutoForm
    bind:this={autoForm}
    resourceName="reports"
    mode="edit"
    id="record-1"
    showHeader={false}
    redirect={false}
    {upload}
    {cancelUpload}
    onSuccess={() => { successCount += 1; }}
  />
{/snippet}

<section data-testid="autoform-upload-fixture">
  <div class="fixture-actions">
    <button type="button" data-testid="reset-form" onclick={resetForm}>Reset form</button>
  </div>
  <div class="fixture-actions" aria-label="Pending upload controls">
    {#each pendingUploads as operation (operation.id)}
      <button
        type="button"
        data-testid={`complete-upload-${operation.id}`}
        onclick={() => settleUpload(operation, false)}
      >Complete upload {operation.id}</button>
      <button
        type="button"
        data-testid={`fail-upload-${operation.id}`}
        onclick={() => settleUpload(operation, true)}
      >Fail upload {operation.id}</button>
    {/each}
  </div>
  <output data-testid="pending-session">
    {JSON.stringify(pendingUploads.map(operation => operation.sessionId))}
  </output>
  <output data-testid="upload-calls">{uploadCalls}</output>
  <output data-testid="reset-calls">{resetCalls}</output>
  <output data-testid="write-count">{writeCount}</output>
  <output data-testid="success-count">{successCount}</output>
  <output data-testid="last-write">{lastWrite}</output>
  <output data-testid="cancellations">{JSON.stringify(cancellations)}</output>

  <div data-testid="product-form-host">
    <AdminApp
      {dataProvider}
      {resources}
      {routerProvider}
      accessControlProvider={{ can: async () => ({ can: true }) }}
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
  output { display: block; overflow-wrap: anywhere; font-family: ui-monospace, monospace; font-size: 12px; }
</style>
