<script lang="ts">
  import FileUpload, { type UploadSession, type UploadItem, type UploadCancellation } from '../../../packages/ui/src/components/FileUpload.svelte';

  type Operation = {
    id: number;
    resolve: (value: { url: string; uploadId: string }) => void;
    reject: (reason: Error) => void;
  };
  let operations = $state<Operation[]>([]);
  let calls = $state(0);
  let cancelCalls = $state(0);
  let lastItems = $state<UploadItem[]>([]);
  let lastCancellation = $state('');

  const upload = (file: File, session: UploadSession) => {
    const id = ++calls;
    session.setUploadId(`object-${id}`);
    session.onProgress(44);
    return new Promise<{ url: string; uploadId: string }>((resolve, reject) => {
      operations = [...operations, { id, resolve, reject }];
      void file;
    });
  };
  const cancelUpload = async (_file: File, cancellation: UploadCancellation) => {
    cancelCalls += 1;
    lastCancellation = cancellation.reason;
  };
  function settle(operation: Operation, reject: boolean): void {
    operations = operations.filter(item => item !== operation);
    if (reject) operation.reject(new Error('PRIVATE_UPLOAD_FIXTURE'));
    else operation.resolve({ url: `/uploads/${operation.id}.bin`, uploadId: `object-${operation.id}` });
  }
  function changed(items: UploadItem[]): void {
    lastItems = items;
  }
</script>

<form onsubmit={(event) => event.preventDefault()}>
  <div data-testid="file-upload">
    <FileUpload accept=".csv" maxSize={8} upload={upload} cancelUpload={cancelUpload} onChange={changed} />
  </div>
  <button type="submit">Submit host form</button>
</form>
<div>
  {#each operations as operation (operation.id)}
    <button type="button" onclick={() => settle(operation, false)}>Resolve {operation.id}</button>
    <button type="button" onclick={() => settle(operation, true)}>Reject {operation.id}</button>
  {/each}
</div>
<output data-testid="upload-calls">{calls}</output>
<output data-testid="upload-cancels">{cancelCalls}</output>
<output data-testid="upload-cancellation">{lastCancellation}</output>
<output data-testid="upload-items">{JSON.stringify(lastItems.map(item => ({ name: item.file.name, status: item.status, progress: item.progress, url: item.url })))}</output>
