<script lang="ts">
  import { Download, File, Trash2 } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import DataState from './DataState.svelte';
  import type { DataStateKind } from './DataState.svelte';
  export interface FileItem { id?: string; name: string; size?: string; type?: string; updatedAt?: string; }
  interface Props { files?: FileItem[]; state?: DataStateKind; stateTitle?: string; stateDescription?: string; emptyTitle?: string; emptyDescription?: string; retry?: () => void; retryLabel?: string; loadingLabel?: string; ondownload?: (file: FileItem) => void; onremove?: (file: FileItem) => void; class?: string; }
  const i18n = useTranslation();
  let { files = [], state, stateTitle, stateDescription, emptyTitle, emptyDescription, retry, retryLabel, loadingLabel, ondownload, onremove, class: className = '' }: Props = $props();
  const resolvedState = $derived(state ?? (files.length === 0 ? 'empty' : undefined));
</script>
{#if resolvedState}
  <DataState state={resolvedState} title={stateTitle ?? emptyTitle} description={stateDescription ?? emptyDescription} {retry} {retryLabel} {loadingLabel} class={className} />
{:else}
<div class={'divide-y divide-border overflow-hidden rounded-lg border border-border bg-card ' + className}>
  {#each files as file, index (file.id ?? file.name + '-' + index)}
    <div class="flex items-center gap-3 px-4 py-3"><span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><File class="size-4" /></span><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-foreground">{file.name}</p><p class="text-xs text-muted-foreground">{file.size ?? file.type ?? (i18n.locale === 'zh-CN' ? '文件' : 'File')}{file.updatedAt ? ' / ' + file.updatedAt : ''}</p></div>{#if ondownload}<Button variant="ghost" size="icon-sm" aria-label={(i18n.locale === 'zh-CN' ? '下载 ' : 'Download ') + file.name} onclick={() => ondownload?.(file)}><Download class="size-4" /></Button>{/if}{#if onremove}<Button variant="ghost" size="icon-sm" aria-label={(i18n.locale === 'zh-CN' ? '移除 ' : 'Remove ') + file.name} onclick={() => onremove?.(file)}><Trash2 class="size-4" /></Button>{/if}</div>
  {/each}
</div>
{/if}
