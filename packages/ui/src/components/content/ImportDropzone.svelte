<script lang="ts">
  import { UploadCloud } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  interface Props { accept?: string; loading?: boolean; status?: string; onimport?: (files: FileList | null) => void; class?: string; }
  let { accept = '.csv,.xlsx', loading = false, status = '', onimport, class: className = '' }: Props = $props();
  let files = $state<FileList | null>(null);
  function choose(event: Event) {
    files = (event.currentTarget as HTMLInputElement).files;
    if (files?.length) onimport?.(files);
  }
</script>
<div class={'rounded-lg border border-dashed border-border bg-card p-6 text-center ' + className} data-svadmin-import-dropzone>
  <UploadCloud class="mx-auto size-8 text-muted-foreground" /><p class="mt-3 text-sm font-medium text-foreground">Import records</p><p class="mt-1 text-xs text-muted-foreground">CSV or spreadsheet files are accepted.</p>
  <Input class="mx-auto mt-4 max-w-sm" type="file" {accept} onchange={choose} disabled={loading} />
  {#if loading}<p class="mt-3 text-xs text-muted-foreground" aria-live="polite">Importing...</p>{/if}
  {#if status}<p class="mt-3 text-xs text-success" role="status">{status}</p>{/if}
  {#if !loading && files?.length}<Button class="mt-4" size="sm" onclick={() => onimport?.(files)}>Import {files.length} file{files.length === 1 ? '' : 's'}</Button>{/if}
</div>
