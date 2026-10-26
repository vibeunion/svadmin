<script lang="ts">
  import type { DataProvider, ResourceDefinition, RouterProvider } from '@svadmin/core';
  import { defineResource } from '@svadmin/core';
  import { decodeBaseRecord } from '@svadmin/core/schema';
  import { Type } from 'typebox';
  import AdminApp from '../../src/components/AdminApp.svelte';
  import AutoForm from '../../src/components/AutoForm.svelte';
  import type { UploadCancelHandler, UploadHandler } from '../../src/components/FileUpload.svelte';

  let {
    mode = 'create', upload, cancelUpload, recordId = 'record-1', customActions = false,
    providerVersion = 0, onNavigationGuardReady,
  }: {
    mode?: 'create' | 'edit';
    upload?: UploadHandler;
    cancelUpload?: UploadCancelHandler;
    recordId?: string;
    customActions?: boolean;
    providerVersion?: number;
    onNavigationGuardReady?: (guard: (navigate: () => void) => void) => void;
  } = $props();

  let autoForm = $state<{ reset: () => void }>();
  const writes: Record<string, unknown>[] = [];
  const cancellations: Array<{ name: string; cancellation: unknown }> = [];
  let successes = 0;

  const dataProvider: DataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async ({ id }) => ({
      data: { id, attachment: '/existing.pdf', attachments: ['/existing-a.pdf'] },
    }),
    create: async ({ variables }) => {
      writes.push(decodeBaseRecord(variables));
      return { data: { id: 'record-1', ...decodeBaseRecord(variables) } };
    },
    update: async ({ id, variables }) => {
      writes.push(decodeBaseRecord(variables));
      return { data: { id, ...decodeBaseRecord(variables) } };
    },
    deleteOne: async ({ id }) => ({ data: { id } }),
    getApiUrl: () => 'https://example.test',
  };
  const activeProvider = $derived.by(() => {
    void providerVersion;
    return { ...dataProvider };
  });

  const reference = Type.Object({
    url: Type.Optional(Type.String()),
    uploadId: Type.Optional(Type.String()),
  });
  const attachment = Type.Union([Type.String(), reference]);
  const shape = {
    attachment: Type.Optional(Type.Union([attachment, Type.Null()])),
    attachments: Type.Optional(Type.Array(attachment)),
  };
  const resources: ResourceDefinition[] = [{
    name: 'records',
    label: 'Records',
    contract: defineResource('records', {
      record: Type.Object({ id: Type.String(), ...shape }),
      create: Type.Object(shape),
      update: Type.Object(shape),
    }),
    fields: [
      { key: 'attachment', label: 'Attachment', type: 'file' },
      { key: 'attachments', label: 'Attachments', type: 'file', multiple: true },
    ],
  }];

  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ pathname: '/', params: {} }),
  };

  export function reset(): void {
    autoForm?.reset();
  }
  export function writeCount(): number {
    return writes.length;
  }
  export function writeVariables(index: number): Record<string, unknown> {
    return { ...writes[index] };
  }
  export function successCount(): number {
    return successes;
  }
  export function cancellationCount(): number {
    return cancellations.length;
  }
  export function cancellation(index: number): { name: string; cancellation: unknown } {
    const entry = cancellations[index];
    if (!entry) throw new Error(`No cancellation at ${index}`);
    return entry;
  }
</script>

{#snippet actions({ isLoading, isDisabled, onSubmit }: { isLoading: boolean; isDisabled: boolean; onSubmit: () => void })}
  <span data-testid="form-actions-loading">{isLoading ? 'loading' : 'idle'}</span>
  <button type="button" disabled={isDisabled} onclick={onSubmit}>Custom save</button>
{/snippet}

{#snippet dashboard()}
  <AutoForm
    bind:this={autoForm}
    resourceName="records"
    showHeader={false}
    {mode}
    {...(mode === 'edit' ? { id: recordId } : {})}
    redirect={false}
    onSuccess={() => { successes += 1; }}
    {...(upload ? { upload } : {})}
    {...(cancelUpload ? { cancelUpload } : {})}
    {...(customActions ? { formActions: actions } : {})}
    {...(onNavigationGuardReady ? { onNavigationGuardReady } : {})}
  />
{/snippet}

<AdminApp
  dataProvider={activeProvider}
  {resources}
  {routerProvider}
  accessControlProvider={{ can: async () => ({ can: true }) }}
  locale="en"
  {dashboard}
/>
