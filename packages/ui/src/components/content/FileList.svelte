<script lang="ts">
  import { Download, File, Trash2 } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  export interface FileItem { id?: string; name: string; size?: string; type?: string; updatedAt?: string; }
  interface Props { files?: FileItem[]; ondownload?: (file: FileItem) => void; onremove?: (file: FileItem) => void; class?: string; }
  let { files = [], ondownload, onremove, class: className = '' }: Props = $props();
</script>
<div class={'divide-y divide-border overflow-hidden rounded-lg border border-border bg-card ' + className}>
  {#each files as file, index (file.id ?? file.name + '-' + index)}
    <div class="flex items-center gap-3 px-4 py-3"><span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><File class="size-4" /></span><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-foreground">{file.name}</p><p class="text-xs text-muted-foreground">{file.size ?? file.type ?? 'File'}{file.updatedAt ? ' / ' + file.updatedAt : ''}</p></div>{#if ondownload}<Button variant="ghost" size="icon-sm" aria-label={'Download ' + file.name} onclick={() => ondownload?.(file)}><Download class="size-4" /></Button>{/if}{#if onremove}<Button variant="ghost" size="icon-sm" aria-label={'Remove ' + file.name} onclick={() => onremove?.(file)}><Trash2 class="size-4" /></Button>{/if}</div>
  {/each}
  {#if files.length === 0}<div class="p-6 text-center text-sm text-muted-foreground">No files</div>{/if}
</div>
