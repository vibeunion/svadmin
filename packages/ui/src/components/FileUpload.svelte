<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { X, Upload, RotateCw, Ban } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { useTranslation } from '@svadmin/core/i18n';

  export type UploadItemStatus = 'queued' | 'uploading' | 'success' | 'error' | 'cancelled';

  export interface UploadItem {
    id: string;
    file: File;
    status: UploadItemStatus;
  progress: number;
  url?: string;
  error?: string;
  uploadId?: string;
  cleanupStatus?: 'pending' | 'success' | 'error';
}

export interface UploadSession {
  signal: AbortSignal;
  idempotencyKey: string;
  setUploadId: (uploadId: string) => void;
  onProgress: (progress: number) => void;
}

export interface UploadCancellation {
  uploadId: string;
  idempotencyKey: string;
  reason: 'cancel' | 'remove' | 'replace' | 'scope-change' | 'unmount';
}

  interface Props {
    id?: string;
    name?: string;
    accept?: string;
    multiple?: boolean;
    maxFiles?: number;
    maxSize?: number;
    disabled?: boolean;
    required?: boolean;
    upload?: (file: File, session: UploadSession) => Promise<{ url?: string; uploadId?: string } | void>;
    cancelUpload?: (file: File, cancellation: UploadCancellation) => Promise<void>;
    onChange?: (items: UploadItem[]) => void;
    onReject?: (file: File, reason: string) => void;
    class?: string;
  }

  let {
    id,
    name,
    accept = '',
    multiple = false,
    maxFiles = multiple ? 10 : 1,
    maxSize,
    disabled = false,
    required = false,
    upload,
    cancelUpload,
    onChange,
    onReject,
    class: className = '',
  }: Props = $props();

  const i18n = useTranslation();
  let input: HTMLInputElement | undefined = $state();
  let items = $state<UploadItem[]>([]);
  let rejected = $state<{ name: string; reason: string }[]>([]);
  let sequence = 0;
  const controllers = new Map<string, AbortController>();
  interface UploadAttempt {
    controller: AbortController;
    upload: NonNullable<Props['upload']>;
    cancelUpload?: Props['cancelUpload'];
    epoch: number;
    file: File;
    idempotencyKey: string;
    uploadId?: string;
    reason?: UploadCancellation['reason'];
    cleanupStarted?: boolean;
    settled?: boolean;
  }
  const attempts = new Map<string, UploadAttempt>();
  const latestAttempts = new Map<string, UploadAttempt>();
  let scopeEpoch = 0;
  let observedUpload = untrack(() => upload);
  let destroyed = false;

  $effect.pre(() => {
    if (upload === observedUpload) return;
    observedUpload = upload;
    scopeEpoch += 1;
    untrack(() => {
      const activeIds = [...controllers.keys()];
      for (const id of activeIds) retire(id, 'scope-change');
      const cancelledIds = new Set(activeIds);
      if (cancelledIds.size > 0) {
        items = items.map(item => cancelledIds.has(item.id) && item.status === 'uploading'
          ? { ...item, status: 'cancelled', error: 'Upload cancelled.' }
          : item);
        emitChange();
      }
    });
  });

  function retire(id: string, reason: UploadCancellation['reason'] = 'cancel'): void {
    const attempt = attempts.get(id);
    const controller = controllers.get(id);
    controllers.delete(id);
    attempts.delete(id);
    if (attempt) attempt.reason = reason;
    controller?.abort();
    if (attempt) cleanupAttempt(id, attempt);
  }

  function cleanupAttempt(id: string, attempt: UploadAttempt): void {
    if (!attempt.reason || attempt.cleanupStarted) return;
    if (attempt?.uploadId && attempt.cancelUpload) {
      attempt.cleanupStarted = true;
      const publish = (cleanupStatus: UploadItem['cleanupStatus']) => {
        if (!destroyed && scopeEpoch === attempt.epoch && upload === attempt.upload
          && latestAttempts.get(id) === attempt && items.some(item => item.id === id)) {
          updateItem(id, { cleanupStatus });
        }
      };
      publish('pending');
      const cancellation: UploadCancellation = {
        uploadId: attempt.uploadId,
        idempotencyKey: attempt.idempotencyKey,
        reason: attempt.reason,
      };
      const cancel = attempt.cancelUpload;
      void Promise.resolve().then(() => cancel(attempt.file, cancellation))
        .then(() => publish('success'), () => publish('error'));
    }
  }

  onDestroy(() => {
    destroyed = true;
    for (const id of controllers.keys()) retire(id, 'unmount');
    latestAttempts.clear();
  });

  function emitChange(): void {
    onChange?.(items.map(item => ({ ...item })));
  }

  function nextId(): string {
    sequence += 1;
    return `upload-${sequence}`;
  }

  function accepts(file: File): boolean {
    if (!accept.trim()) return true;
    return accept.split(',').map(token => token.trim().toLowerCase()).some(token =>
      token === file.type.toLowerCase() ||
      (token.endsWith('/*') && file.type.toLowerCase().startsWith(token.slice(0, -1))) ||
      (token.startsWith('.') && file.name.toLowerCase().endsWith(token)),
    );
  }

  function validate(file: File): string | undefined {
    if (!accepts(file)) return 'File type is not accepted.';
    if (maxSize !== undefined && (!Number.isSafeInteger(maxSize) || maxSize < 0 || file.size > maxSize)) {
      return 'File is too large.';
    }
    return undefined;
  }

  const normalizedMaxFiles = $derived(
    multiple ? (Number.isSafeInteger(maxFiles) && maxFiles > 0 ? maxFiles : 10) : 1,
  );

  function updateItem(id: string, update: Partial<UploadItem>): void {
    items = items.map(item => item.id === id ? { ...item, ...update } : item);
    emitChange();
  }

  async function process(item: UploadItem): Promise<void> {
    if (!upload || disabled) return;
    if (controllers.has(item.id) || !items.some(candidate => candidate.id === item.id)) return;
    const controller = new AbortController();
    controllers.set(item.id, controller);
    const attempt: UploadAttempt = {
      controller, upload, epoch: scopeEpoch, file: item.file,
      cancelUpload,
      idempotencyKey: crypto.randomUUID(),
    };
    attempts.set(item.id, attempt);
    latestAttempts.set(item.id, attempt);
    // 每次尝试由独立控制器持有；旧回执和 finally 不得影响新尝试。
    const current = () => attempts.get(item.id) === attempt
      && controllers.get(item.id) === controller
      && scopeEpoch === attempt.epoch && upload === attempt.upload;
    const updateCurrent = (update: Partial<UploadItem>) => {
      if (current() && !controller.signal.aborted) updateItem(item.id, update);
    };
    const register = (uploadId: string) => {
      if (attempt.settled) return;
      if (typeof uploadId !== 'string' || !uploadId.trim() || uploadId.length > 200
        || (attempt.uploadId !== undefined && attempt.uploadId !== uploadId)) throw new Error('Invalid upload session.');
      attempt.uploadId = uploadId;
      updateCurrent({ uploadId });
      cleanupAttempt(item.id, attempt);
    };
    updateItem(item.id, { status: 'uploading', progress: 0, error: undefined, uploadId: undefined, cleanupStatus: undefined });
    try {
      const result = await attempt.upload!(item.file, {
        signal: controller.signal,
        idempotencyKey: attempt.idempotencyKey,
        setUploadId: register,
        onProgress: progress => updateCurrent({
          progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0,
        }),
      });
      if (result?.uploadId !== undefined) register(result.uploadId);
      updateCurrent({ status: 'success', progress: 100, url: result?.url, uploadId: result?.uploadId ?? attempt.uploadId });
    } catch (error) {
      if (!current()) return;
      updateItem(item.id, {
        status: controller.signal.aborted ? 'cancelled' : 'error',
        error: controller.signal.aborted ? 'Upload cancelled.' : error instanceof Error ? error.message : 'Upload failed.',
      });
    } finally {
      attempt.settled = true;
      if (current()) {
        controllers.delete(item.id);
        attempts.delete(item.id);
      }
    }
  }

  function addFiles(selected: File[]): void {
    if (disabled) return;
    const available = multiple
      ? Math.max(0, normalizedMaxFiles - items.length)
      : 1;
    rejected = [];
    if (selected.length > available) {
      for (const file of selected.slice(available)) {
        rejected = [...rejected, { name: file.name, reason: 'Maximum file count exceeded.' }];
        onReject?.(file, 'Maximum file count exceeded.');
      }
    }
    for (const file of selected.slice(0, multiple ? available : Math.min(available, 1))) {
      const reason = validate(file);
      if (reason) {
        rejected = [...rejected, { name: file.name, reason }];
        onReject?.(file, reason);
        continue;
      }
      const item: UploadItem = { id: nextId(), file, status: 'queued', progress: 0 };
      if (!multiple) {
        for (const previous of items) {
          retire(previous.id, 'replace');
          latestAttempts.delete(previous.id);
        }
      }
      items = multiple ? [...items, item] : [item];
      emitChange();
      void process(item);
    }
  }

  function handleInput(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    addFiles(Array.from(target.files ?? []));
    // 异步模式的文件由队列持有，清空输入以允许再次选择同名文件。
    if (upload) target.value = '';
  }

  function remove(id: string): void {
    if (disabled) return;
    retire(id, 'remove');
    latestAttempts.delete(id);
    items = items.filter(item => item.id !== id);
    if (input) input.value = '';
    emitChange();
  }

  function cancel(id: string): void {
    const controller = controllers.get(id);
    if (!controller) return;
    retire(id, 'cancel');
    updateItem(id, { status: 'cancelled', error: 'Upload cancelled.' });
  }

  function retry(item: UploadItem): void {
    void process({ ...item, status: 'queued', error: undefined });
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input?.click();
    }
  }
</script>

<div class={`svadmin-file-upload ${className}`}>
    <input
    bind:this={input}
    type="file"
    {id}
    name={upload ? undefined : name}
    {accept}
    {multiple}
    disabled={disabled}
    required={upload ? false : required}
    class="svadmin-file-upload-input"
    onchange={handleInput}
  />
  <div
    class="svadmin-file-upload-dropzone"
    role="button"
    tabindex={disabled ? -1 : 0}
    aria-disabled={disabled}
    onclick={() => input?.click()}
    onkeydown={handleKeydown}
    ondragover={(event) => event.preventDefault()}
    ondrop={(event) => {
      event.preventDefault();
      addFiles(Array.from(event.dataTransfer?.files ?? []));
    }}
  >
    <Upload aria-hidden="true" />
    <span>{i18n.t('upload.selectOrDrop')}</span>
  </div>

  <div role="status" aria-live="polite">
    {i18n.t('upload.selectedCount', { count: String(items.length), max: String(normalizedMaxFiles) })}
  </div>
  {#if rejected.length}
    <ul aria-label={i18n.t('upload.rejectedFiles')}>
      {#each rejected as rejection}
        <li>{rejection.name}: {rejection.reason}</li>
      {/each}
    </ul>
  {/if}

  {#if items.length}
    <ul class="svadmin-file-upload-list" aria-label="Selected files">
      {#each items as item (item.id)}
        <li>
          <span class="svadmin-file-upload-name">{item.file.name}</span>
          <span class="svadmin-file-upload-status">
            {#if item.status === 'uploading'}{item.progress}%{:else}{item.status}{/if}
          </span>
          {#if item.status === 'uploading'}
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel upload" onclick={() => cancel(item.id)}>
              <Ban aria-hidden="true" />
            </Button>
          {:else if item.status === 'error' || item.status === 'cancelled'}
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Retry upload" {disabled} onclick={() => retry(item)}>
              <RotateCw aria-hidden="true" />
            </Button>
          {/if}
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove file" {disabled} onclick={() => remove(item.id)}>
            <X aria-hidden="true" />
          </Button>
          {#if item.error}<span role="alert">{item.error}</span>{/if}
          {#if item.cleanupStatus === 'pending'}<span role="status">{i18n.t('upload.cleanupPending')}</span>{/if}
          {#if item.cleanupStatus === 'error'}<span role="alert">{i18n.t('upload.cleanupFailed')}</span>{/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .svadmin-file-upload-input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .svadmin-file-upload-dropzone { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 88px; border: 1px dashed var(--border); border-radius: 6px; cursor: pointer; }
  .svadmin-file-upload-dropzone[aria-disabled="true"] { cursor: not-allowed; opacity: 0.6; }
  .svadmin-file-upload-list { display: grid; gap: 6px; margin: 8px 0 0; padding: 0; list-style: none; }
  .svadmin-file-upload-list li { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .svadmin-file-upload-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-file-upload-status { color: var(--muted-foreground); font-size: 0.875rem; }
</style>
