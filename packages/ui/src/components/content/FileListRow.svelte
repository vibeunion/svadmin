<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { Download, Eye, File, Trash2 } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import type { FileItem } from './FileList.svelte';

  type Action = 'download' | 'preview' | 'remove';
  type Handler = (file: FileItem) => void;
  interface Props { file: FileItem; ondownload?: Handler; onpreview?: Handler; onremove?: Handler; }
  let { file, ondownload, onpreview, onremove }: Props = $props();
  const i18n = useTranslation();
  const instanceId = $props.id();
  const errorId = `${instanceId}-error`;
  let pending = $state<Action | undefined>();
  let failed = $state<Action | undefined>();
  let generation = 0;
  let destroyed = false;
  let observed = untrack(() => ({ file, ondownload, onpreview, onremove }));

  $effect.pre(() => {
    if (file === observed.file && ondownload === observed.ondownload
      && onpreview === observed.onpreview && onremove === observed.onremove) return;
    observed = { file, ondownload, onpreview, onremove };
    generation += 1;
    pending = undefined;
    failed = undefined;
  });

  onDestroy(() => { destroyed = true; generation += 1; });

  function label(action: Action): string {
    return i18n.t(action === 'download' ? 'common.download'
      : action === 'preview' ? 'common.preview' : 'common.remove');
  }

  async function run(action: Action): Promise<void> {
    if (destroyed || pending) return;
    const handler = action === 'download' ? ondownload : action === 'preview' ? onpreview : onremove;
    if (!handler) return;
    const owner = { file, ondownload, onpreview, onremove };
    const current = ++generation;
    const isCurrent = () => !destroyed && generation === current && file === owner.file
      && ondownload === owner.ondownload && onpreview === owner.onpreview && onremove === owner.onremove;
    pending = action;
    failed = undefined;
    try {
      await handler(file);
    } catch {
      if (isCurrent()) failed = action;
    } finally {
      if (isCurrent()) pending = undefined;
    }
  }
</script>

<div class="file-list-row svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c svadmin-u-f0faeb26d656 svadmin-u-1b2d54a3fd12"
  role="listitem" aria-label={file.name} aria-busy={Boolean(pending)}>
  <span class="svadmin-u-60fbb7713999 svadmin-u-665f07fe73cc svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748" aria-hidden="true"><File class="svadmin-u-f7b5fa971871" /></span>
  <div class="svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c">
    <p class="svadmin-u-f283ea9bea0e svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359" title={file.name}>{file.name}</p>
    {#if pending}
      <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748" role="status">{i18n.t('common.loading')}</p>
    {:else}
      <p class="file-list-row-meta svadmin-u-359090c2d529 svadmin-u-bfa603190748">{file.size ?? file.type ?? i18n.t('common.file')}{file.updatedAt ? ' / ' + file.updatedAt : ''}</p>
    {/if}
    {#if failed}<p class="file-list-row-error" role="alert" id={errorId}>{label(failed)}: {i18n.t('common.error')}</p>{/if}
  </div>
  {#if onpreview}<Button type="button" variant="ghost" size="icon-sm"
    aria-label={`${label('preview')} ${file.name}`} title={`${label('preview')} ${file.name}`}
    aria-describedby={failed ? errorId : undefined} disabled={Boolean(pending)}
    onclick={() => { void run('preview'); }}><Eye aria-hidden="true" class="svadmin-u-f7b5fa971871" /></Button>{/if}
  {#if ondownload}<Button type="button" variant="ghost" size="icon-sm"
    aria-label={`${label('download')} ${file.name}`} title={`${label('download')} ${file.name}`}
    aria-describedby={failed ? errorId : undefined} disabled={Boolean(pending)}
    onclick={() => { void run('download'); }}><Download aria-hidden="true" class="svadmin-u-f7b5fa971871" /></Button>{/if}
  {#if onremove}<Button type="button" variant="ghost" size="icon-sm"
    aria-label={`${label('remove')} ${file.name}`} title={`${label('remove')} ${file.name}`}
    aria-describedby={failed ? errorId : undefined} disabled={Boolean(pending)}
    onclick={() => { void run('remove'); }}><Trash2 aria-hidden="true" class="svadmin-u-f7b5fa971871" /></Button>{/if}
</div>

<style>
  .file-list-row-error { margin: 4px 0 0; font-size: 14px; line-height: 20px; color: var(--destructive); overflow-wrap: anywhere; }
  .file-list-row-meta { overflow-wrap: anywhere; }
  .file-list-row :global(button) { flex-shrink: 0; }
</style>
