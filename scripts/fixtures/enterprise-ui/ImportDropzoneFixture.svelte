<script lang="ts">
  import ImportDropzone from '../../../packages/ui/src/components/content/ImportDropzone.svelte';

  type ImportHandler = (files: FileList | null) => Promise<void>;
  type Operation = { id: number; source: string; resolve: () => void; reject: (reason: Error) => void };
  let handlerName = $state('old');
  let operations = $state<Operation[]>([]);
  let calls = $state(0);
  let submissions = $state(0);
  let lastFiles = $state<string[]>([]);

  function createHandler(source: string): ImportHandler {
    return (files) => {
      const id = ++calls;
      lastFiles = Array.from(files ?? [], file => file.name);
      return new Promise<void>((resolve, reject) => {
        operations = [...operations, { id, source, resolve, reject }];
      });
    };
  }
  let importHandler = $state<ImportHandler>(createHandler(handlerName));

  function replaceHandler(): void {
    handlerName = 'new';
    importHandler = createHandler('new');
  }
  function settle(operation: Operation, reject: boolean): void {
    operations = operations.filter(item => item !== operation);
    if (reject) operation.reject(new Error('PRIVATE_IMPORT_FIXTURE'));
    else operation.resolve();
  }
</script>

<form onsubmit={(event) => { event.preventDefault(); submissions += 1; }}>
  <div data-testid="import-dropzone">
    <ImportDropzone accept=".csv" onimport={importHandler} />
  </div>
  <button type="submit">Submit host form</button>
</form>
<div>
  <button type="button" onclick={replaceHandler}>Replace importer</button>
  {#each operations as operation (operation.id)}
    <button type="button" onclick={() => settle(operation, false)}>Resolve {operation.id} {operation.source}</button>
    <button type="button" onclick={() => settle(operation, true)}>Reject {operation.id} {operation.source}</button>
  {/each}
</div>
<output data-testid="import-calls">{calls}</output>
<output data-testid="import-submissions">{submissions}</output>
<output data-testid="import-handler">{handlerName}</output>
<output data-testid="import-files">{JSON.stringify(lastFiles)}</output>
