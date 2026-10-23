<script lang="ts">
  import FileList, { type FileItem } from '../../../packages/ui/src/components/content/FileList.svelte';

  type Operation = { id: number; resolve: () => void; reject: (reason: Error) => void };
  let files = $state<FileItem[]>([
    { id: 'report', name: 'report.pdf', type: `application/${'long-mime-'.repeat(16)}` },
    { id: 'sheet', name: 'sheet.csv', size: '2 MB' },
  ]);
  let operations = $state<Operation[]>([]);
  let calls = $state(0);
  let submissions = $state(0);
  let lastAction = $state('');

  function run(action: string, file: FileItem): Promise<void> {
    lastAction = `${action}:${file.name}`;
    const id = ++calls;
    return new Promise<void>((resolve, reject) => {
      operations = [...operations, { id, resolve, reject }];
    });
  }
  const preview = (file: FileItem) => run('preview', file);
  const download = (file: FileItem) => run('download', file);
  const remove = (file: FileItem) => run('remove', file);
  function settle(operation: Operation, reject: boolean): void {
    operations = operations.filter(item => item !== operation);
    if (reject) operation.reject(new Error('PRIVATE_FILE_FIXTURE'));
    else operation.resolve();
  }
</script>

<form onsubmit={(event) => { event.preventDefault(); submissions += 1; }}>
  <div data-testid="file-list">
    <FileList {files} onpreview={preview} ondownload={download} onremove={remove} />
  </div>
  <button type="submit">Submit host form</button>
</form>
<div>
  <button type="button" onclick={() => files = files.map(file => ({ ...file }))}>Replace files</button>
  <button type="button" onclick={() => files = [...files].reverse()}>Reverse files</button>
  <button type="button" onclick={() => files = files.map(file => ({ ...file, id: 'duplicate' }))}>Duplicate ids</button>
  {#each operations as operation (operation.id)}
    <button type="button" onclick={() => settle(operation, false)}>Resolve {operation.id}</button>
    <button type="button" onclick={() => settle(operation, true)}>Reject {operation.id}</button>
  {/each}
</div>
<output data-testid="file-calls">{calls}</output>
<output data-testid="file-submissions">{submissions}</output>
<output data-testid="file-action">{lastAction}</output>
