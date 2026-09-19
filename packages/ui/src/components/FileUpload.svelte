<script lang="ts">
  import { X, Upload, RotateCw, Ban } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';

  export type UploadItemStatus = 'queued' | 'uploading' | 'success' | 'error' | 'cancelled';

  export interface UploadItem {
    id: string;
    file: File;
    status: UploadItemStatus;
    progress: number;
    // 重试与无 URL 的成功回调会显式清空这些字段。
    url?: string | undefined;
    error?: string | undefined;
  }

  export interface UploadSession {
    signal: AbortSignal;
    onProgress: (progress: number) => void;
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
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- 兼容返回 Promise<void> 或可选上传结果的回调。
    upload?: (file: File, session: UploadSession) => Promise<{ url?: string } | void>;
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
    onChange,
    onReject,
    class: className = '',
  }: Props = $props();

  let input: HTMLInputElement | undefined = $state();
  let items = $state<UploadItem[]>([]);
  let sequence = 0;
  const controllers = new Map<string, AbortController>();

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

  function updateItem(id: string, update: Partial<UploadItem>): void {
    items = items.map(item => item.id === id ? { ...item, ...update } : item);
    emitChange();
  }

  async function process(item: UploadItem): Promise<void> {
    if (!upload || disabled) return;
    const controller = new AbortController();
    controllers.set(item.id, controller);
    updateItem(item.id, { status: 'uploading', progress: 0, error: undefined });
    try {
      const result = await upload(item.file, {
        signal: controller.signal,
        onProgress: progress => updateItem(item.id, {
          progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0,
        }),
      });
      updateItem(item.id, { status: 'success', progress: 100, url: result?.url });
    } catch (error) {
      updateItem(item.id, {
        status: controller.signal.aborted ? 'cancelled' : 'error',
        error: controller.signal.aborted ? 'Upload cancelled.' : error instanceof Error ? error.message : 'Upload failed.',
      });
    } finally {
      controllers.delete(item.id);
    }
  }

  function addFiles(selected: File[]): void {
    if (disabled) return;
    const available = Math.max(0, maxFiles - items.length);
    for (const file of selected.slice(0, multiple ? available : 1)) {
      const reason = validate(file);
      if (reason) {
        onReject?.(file, reason);
        continue;
      }
      const item: UploadItem = { id: nextId(), file, status: 'queued', progress: 0 };
      items = multiple ? [...items, item] : [item];
      emitChange();
      void process(item);
    }
  }

  function handleInput(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    addFiles(Array.from(target.files ?? []));
  }

  function remove(id: string): void {
    controllers.get(id)?.abort();
    items = items.filter(item => item.id !== id);
    emitChange();
  }

  function cancel(id: string): void {
    controllers.get(id)?.abort();
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
    {name}
    {accept}
    {multiple}
    disabled={disabled}
    {required}
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
    <span>Select or drop files</span>
  </div>

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
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Retry upload" onclick={() => retry(item)}>
              <RotateCw aria-hidden="true" />
            </Button>
          {/if}
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove file" onclick={() => remove(item.id)}>
            <X aria-hidden="true" />
          </Button>
          {#if item.error}<span role="alert">{item.error}</span>{/if}
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
