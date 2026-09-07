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
<div class={'svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-a29b7a649c77 svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-0478c89a150f svadmin-u-ca6bf63030aa ' + className} data-svadmin-import-dropzone>
  <UploadCloud class="svadmin-u-0e12dc7de920 svadmin-u-d8f5213f0fe0 svadmin-u-bfa603190748" /><p class="svadmin-u-eccd13ef4f2f svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">Import records</p><p class="svadmin-u-b6b02c0ebef6 svadmin-u-359090c2d529 svadmin-u-bfa603190748">CSV or spreadsheet files are accepted.</p>
  <Input class="svadmin-u-0e12dc7de920 svadmin-u-0ab8667228fd svadmin-u-2472e9b81a97" type="file" {accept} onchange={choose} disabled={loading} />
  {#if loading}<p class="svadmin-u-eccd13ef4f2f svadmin-u-359090c2d529 svadmin-u-bfa603190748" aria-live="polite">Importing...</p>{/if}
  {#if status}<p class="svadmin-u-eccd13ef4f2f svadmin-u-359090c2d529 svadmin-u-76747e5e02ff" role="status">{status}</p>{/if}
  {#if !loading && files?.length}<Button class="svadmin-u-0ab8667228fd" size="sm" onclick={() => onimport?.(files)}>Import {files.length} file{files.length === 1 ? '' : 's'}</Button>{/if}
</div>
