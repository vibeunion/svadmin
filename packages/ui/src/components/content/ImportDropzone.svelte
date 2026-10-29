<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { RotateCw, UploadCloud } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';

  interface Props {
    accept?: string;
    multiple?: boolean;
    loading?: boolean;
    status?: string;
    onimport?: (files: FileList | null) => void;
    class?: string;
  }
  let { accept = '.csv,.xlsx', multiple = false, loading = false, status = '', onimport, class: className = '' }: Props = $props();
  const i18n = useTranslation();
  let nativeFiles = $state<FileList>();
  let retryFiles = $state<FileList>();
  let pending = $state(false);
  let failure = $state<'type' | 'count' | 'import'>();
  let attempt = 0;
  let destroyed = false;
  let observedImport = untrack(() => onimport);
  const busy = $derived(loading || pending);
  const errorMessage = $derived(failure === 'type'
    ? i18n.t('common.fileTypeNotAccepted')
    : failure === 'count'
      ? i18n.t('common.singleFileOnly')
      : i18n.t('common.error'));

  $effect.pre(() => {
    if (onimport === observedImport) return;
    observedImport = onimport;
    attempt += 1;
    pending = false;
    failure = undefined;
    retryFiles = undefined;
    nativeFiles = new DataTransfer().files;
  });

  onDestroy(() => {
    destroyed = true;
    attempt += 1;
  });

  function accepts(file: File): boolean {
    if (!accept.trim()) return true;
    return accept.split(',').map(token => token.trim().toLowerCase()).filter(Boolean).some(token =>
      token === file.type.toLowerCase()
      || (token.endsWith('/*') && file.type.toLowerCase().startsWith(token.slice(0, -1)))
      || (token.startsWith('.') && file.name.toLowerCase().endsWith(token)),
    );
  }

  async function receive(next: FileList | null | undefined): Promise<void> {
    if (destroyed || busy || !onimport || !next?.length) return;
    failure = undefined;
    retryFiles = undefined;
    nativeFiles = new DataTransfer().files;
    if (!multiple && next.length > 1) {
      failure = 'count';
      return;
    }
    if (Array.from(next).some(file => !accepts(file))) {
      failure = 'type';
      return;
    }
    // 拖放数据只在事件处理期间可读，异步处理与重试持有独立快照。
    const transfer = new DataTransfer();
    for (const file of Array.from(next)) transfer.items.add(file);
    const selected = transfer.files;
    const current = ++attempt;
    const handler = onimport;
    const isCurrent = () => !destroyed && current === attempt && onimport === handler;
    pending = true;
    nativeFiles = selected;
    try {
      await handler(selected);
    } catch {
      if (isCurrent()) {
        failure = 'import';
        retryFiles = selected;
      }
    } finally {
      if (isCurrent()) {
        pending = false;
        nativeFiles = new DataTransfer().files;
      }
    }
  }

  function choose(event: Event): void {
    const target = event.currentTarget;
    if (target instanceof HTMLInputElement) void receive(target.files);
  }
</script>

<div class={'rounded-lg border border-dashed border-border bg-card p-6 text-center ' + className}
  data-svadmin-import-dropzone role="group" aria-label={i18n.t('common.importData')} aria-busy={busy}
  ondragover={event => event.preventDefault()}
  ondrop={event => { event.preventDefault(); void receive(event.dataTransfer?.files); }}>
  <UploadCloud aria-hidden="true" class="mx-auto size-8 text-muted-foreground" />
  <p class="mt-3 text-sm font-medium text-foreground">{i18n.t('common.importData')}</p>
  {#if accept}<p class="mt-1 text-xs text-muted-foreground">{accept}</p>{/if}
  <Input class="mx-auto mt-4 max-w-sm" type="file"
    {accept} {multiple} bind:files={nativeFiles} aria-label={i18n.t('common.chooseFile')}
    onchange={choose} disabled={busy || !onimport} />
  {#if busy}<p class="mt-3 text-xs text-muted-foreground" role="status">{i18n.t('common.importing')}</p>{/if}
  {#if failure}<p class="mt-3 text-xs text-success" role="alert">{errorMessage}</p>{/if}
  {#if failure === 'import' && retryFiles}
    <Button type="button" class="mt-4" size="sm" disabled={busy || !onimport}
      onclick={() => { void receive(retryFiles); }}><RotateCw aria-hidden="true" />{i18n.t('common.retry')}</Button>
  {/if}
  {#if status}<p class="mt-3 text-xs text-success" role="status">{status}</p>{/if}
</div>
