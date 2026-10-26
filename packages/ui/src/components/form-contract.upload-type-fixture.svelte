<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import AutoForm from './AutoForm.svelte';
  import FieldRenderer from './FieldRenderer.svelte';
  import ArrayField from './fields/ArrayField.svelte';
  import FileUploadField from './FileUploadField.svelte';
  import type {
    UploadCancellation, UploadCancelHandler, UploadHandler, UploadSession,
  } from './file-upload-types.js';

  type Assignable<Value extends Expected, Expected> = Value;
  type UploadReceipt = { url?: string; uploadId?: string } | undefined;
  type ReceiptContract = Assignable<Exclude<Awaited<ReturnType<UploadHandler>>, void>, UploadReceipt>;

  const upload: UploadHandler = async (file: File, session: UploadSession) => {
    const signal: AbortSignal = session.signal;
    const idempotencyKey: string = session.idempotencyKey;
    session.setUploadId(`upload-${file.name}`);
    session.onProgress(0.5);
    void signal;
    void idempotencyKey;
    return { url: `/uploads/${file.name}`, uploadId: `upload-${file.name}` };
  };
  const emptyUpload: UploadHandler = async () => {};
  const cancelUpload: UploadCancelHandler = async (file: File, cancellation: UploadCancellation) => {
    const uploadId: string = cancellation.uploadId;
    const idempotencyKey: string = cancellation.idempotencyKey;
    const reason: UploadCancellation['reason'] = cancellation.reason;
    void file;
    void uploadId;
    void idempotencyKey;
    void reason;
  };

  // @ts-expect-error Upload receipts expose only the checked reference identifiers.
  const invalidReceipt: UploadHandler = async () => ({ localPath: '/tmp/private' });
  // @ts-expect-error Cancellation reasons come from the checked lifecycle set.
  const invalidReason: UploadCancellation['reason'] = 'done';

  const field: FieldDefinition = { key: 'attachment', label: 'Attachment', type: 'file' };
  const nestedArray: FieldDefinition = {
    key: 'rows',
    label: 'Rows',
    type: 'array',
    subFields: [
      { key: 'attachment', label: 'Attachment', type: 'file' },
      { key: 'children', label: 'Children', type: 'array',
        subFields: [{ key: 'attachment', label: 'Attachment', type: 'file' }] },
    ],
  };
  const value: unknown = null;
  const onchange = (_next: unknown): void => {};
  const onUploadStateChange = (state: { busy: boolean; unresolved: boolean }): void => {
    const busy: boolean = state.busy;
    const unresolved: boolean = state.unresolved;
    void busy;
    void unresolved;
  };

  const receiptContract: ReceiptContract | undefined = undefined;
  void emptyUpload;
  void invalidReceipt;
  void invalidReason;
  void receiptContract;
</script>

{#snippet uploadActions({ isLoading, isDisabled, onSubmit }: {
  isLoading: boolean; isDisabled: boolean; onSubmit: () => void;
})}
  {@const typedLoading: boolean = isLoading}
  {@const typedDisabled: boolean = isDisabled}
  <button type="button" disabled={typedDisabled} onclick={onSubmit} data-loading={typedLoading}>
    Save
  </button>
{/snippet}

<AutoForm
  resourceName="records"
  upload={upload}
  cancelUpload={cancelUpload}
  formActions={uploadActions}
/>
<FileUploadField
  {field}
  {value}
  {onchange}
  upload={upload}
  cancelUpload={cancelUpload}
  {onUploadStateChange}
/>
<FieldRenderer
  {field}
  {value}
  {onchange}
  upload={upload}
  cancelUpload={cancelUpload}
  fileReferenceMode
  {onUploadStateChange}
/>
<ArrayField
  field={nestedArray}
  {value}
  {onchange}
  upload={upload}
  cancelUpload={cancelUpload}
  fileReferenceMode
  {onUploadStateChange}
/>
