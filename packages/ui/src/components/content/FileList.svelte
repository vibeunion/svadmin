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
<div class={'svadmin-u-fa6acbf81d74 svadmin-u-e783642739e3 svadmin-u-2cd02d11d1af svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 ' + className}>
  {#each files as file, index (file.id ?? file.name + '-' + index)}
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c svadmin-u-f0faeb26d656 svadmin-u-1b2d54a3fd12"><span class="svadmin-u-60fbb7713999 svadmin-u-665f07fe73cc svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748"><File class="svadmin-u-f7b5fa971871" /></span><div class="svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c"><p class="svadmin-u-f283ea9bea0e svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{file.name}</p><p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{file.size ?? file.type ?? (i18n.locale === 'zh-CN' ? '文件' : 'File')}{file.updatedAt ? ' / ' + file.updatedAt : ''}</p></div>{#if ondownload}<Button variant="ghost" size="icon-sm" aria-label={(i18n.locale === 'zh-CN' ? '下载 ' : 'Download ') + file.name} onclick={() => ondownload?.(file)}><Download class="svadmin-u-f7b5fa971871" /></Button>{/if}{#if onremove}<Button variant="ghost" size="icon-sm" aria-label={(i18n.locale === 'zh-CN' ? '移除 ' : 'Remove ') + file.name} onclick={() => onremove?.(file)}><Trash2 class="svadmin-u-f7b5fa971871" /></Button>{/if}</div>
  {/each}
</div>
{/if}
