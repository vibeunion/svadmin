<script lang="ts">
  import type { Editor } from '@tiptap/core';
  import { ImageIcon, Upload, Link as LinkIcon, RotateCw } from '@lucide/svelte';
  import { t } from '@svadmin/core';

  let { editor, onUpload, onclose } = $props<{
    editor: Editor;
    onUpload?: (file: File) => Promise<string>;
    onclose?: () => void;
  }>();

  let mode: 'url' | 'upload' = $state('url');
  let url = $state('');
  let alt = $state('');
  let uploading = $state(false);
  let dragover = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();
  let uploadGeneration = 0;
  let disposed = false;
  let uploadError = $state(false);
  let retryFiles = $state<File[]>([]);

  function invalidateUpload() {
    uploadGeneration++;
  }

  function close() {
    invalidateUpload();
    uploading = false;
    uploadError = false;
    retryFiles = [];
    onclose?.();
  }

  function canCommit(generation: number): boolean {
    return !disposed
      && generation === uploadGeneration
      && !editor.isDestroyed
      && editor.isEditable;
  }

  $effect.pre(() => {
    const instance = editor;
    void onUpload;
    disposed = false;
    uploading = false;
    uploadError = false;
    retryFiles = [];
    const handleDestroy = () => {
      disposed = true;
      invalidateUpload();
    };
    instance.on('destroy', handleDestroy);
    return () => {
      disposed = true;
      invalidateUpload();
      instance.off('destroy', handleDestroy);
    };
  });

  function insertByUrl() {
    if (!url.trim()) return;
    if (disposed || editor.isDestroyed || !editor.isEditable) return;
    editor.chain().focus().setImage({ src: url, alt: alt || undefined }).run();
    url = '';
    alt = '';
    close();
  }

  async function handleFiles(files: FileList | File[] | null) {
    if (!files?.length || !onUpload || uploading || disposed || editor.isDestroyed || !editor.isEditable) return;
    const selectedFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (!selectedFiles.length) return;
    const generation = ++uploadGeneration;
    const upload = onUpload;
    const instance = editor;
    uploadError = false;
    retryFiles = [];
    uploading = true;
    let currentIndex = 0;
    try {
      for (const file of selectedFiles) {
        currentIndex++;
        if (!canCommit(generation)) break;
        const uploadedUrl = await upload(file);
        if (canCommit(generation)) {
          instance.chain().focus().setImage({ src: uploadedUrl, alt: file.name }).run();
        } else {
          break;
        }
      }
    } catch {
      if (canCommit(generation)) {
        uploadError = true;
        retryFiles = selectedFiles.slice(currentIndex - 1);
      }
    } finally {
      if (generation === uploadGeneration && !disposed) {
        uploading = false;
        if (canCommit(generation) && !uploadError) close();
      }
    }
  }

  function retryUpload() {
    const files = retryFiles;
    if (files.length) void handleFiles(files);
  }

  function chooseFiles(event: Event) {
    if (!(event.currentTarget instanceof HTMLInputElement)) return;
    void handleFiles(event.currentTarget.files);
    event.currentTarget.value = '';
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragover = false;
    handleFiles(e.dataTransfer?.files ?? null);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (uploading) return;
    dragover = true;
  }

  function handleDragLeave() {
    dragover = false;
  }

  function handleDropZoneKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!uploading) fileInput?.click();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      insertByUrl();
    }
    if (e.key === 'Escape') {
      close();
    }
  }
</script>

<div class="svadmin-color-picker" style="min-width: 300px;">
  <div style="display: flex; gap: 2px; margin-bottom: 8px;">
    <button
      type="button"
      class="svadmin-toolbar-btn"
      style="width: auto; padding: 0 10px; font-size: 12px; gap: 4px; display: flex; align-items: center;"
      data-active={mode === 'url'}
      disabled={uploading}
      onclick={() => { mode = 'url'; }}
    >
      <LinkIcon style="width: 12px; height: 12px;" />
      URL
    </button>
    {#if onUpload}
      <button
        type="button"
        class="svadmin-toolbar-btn"
        style="width: auto; padding: 0 10px; font-size: 12px; gap: 4px; display: flex; align-items: center;"
        data-active={mode === 'upload'}
        disabled={uploading}
        onclick={() => { mode = 'upload'; }}
      >
        <Upload style="width: 12px; height: 12px;" />
        Upload
      </button>
    {/if}
  </div>

  {#if mode === 'url'}
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <input
        class="svadmin-link-input"
        type="url"
        placeholder={t('editor.image.url')}
        bind:value={url}
        onkeydown={handleKeydown}
        style="width: 100%;"
      />
      <input
        class="svadmin-link-input"
        type="text"
        placeholder="Alt (optional)"
        bind:value={alt}
        onkeydown={handleKeydown}
        style="width: 100%;"
      />
      <button
        type="button"
        class="svadmin-toolbar-btn"
        style="width: 100%; font-size: 13px; height: 34px; background: hsl(var(--primary) / 0.1); color: var(--editor-primary); font-weight: 500;"
        onclick={insertByUrl}
        disabled={!url.trim()}
      >
        {t('editor.image.apply') || t('editor.link.apply')}
      </button>
    </div>
  {:else}
    <div
      role="button"
      tabindex={uploading ? -1 : 0}
      aria-disabled={uploading}
      aria-busy={uploading}
      aria-label={t('editor.image.upload')}
      style="
        border: 2px dashed {dragover ? 'var(--editor-primary)' : 'var(--editor-border)'};
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease;
        background: {dragover ? 'hsl(var(--primary) / 0.05)' : 'transparent'};
      "
      ondrop={handleDrop}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      onkeydown={handleDropZoneKeydown}
      onclick={() => { if (!uploading) fileInput?.click(); }}
    >
      {#if uploading}
        <div style="color: var(--editor-muted); font-size: 13px;">{t('editor.image.uploading')}</div>
      {:else}
        <ImageIcon style="width: 24px; height: 24px; margin: 0 auto 8px; color: var(--editor-muted);" />
        <div style="font-size: 13px; color: var(--editor-muted);">
          {t('editor.image.upload')}
        </div>
      {/if}
    </div>
    {#if uploadError}
      <div role="alert" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 8px; color: var(--destructive); font-size: 13px;">
        <span>{t('common.error')}</span>
        <button type="button" class="svadmin-toolbar-btn" style="width: auto; padding: 0 8px; gap: 4px;" onclick={retryUpload} disabled={uploading || !retryFiles.length}>
          <RotateCw aria-hidden="true" style="width: 12px; height: 12px;" />
          {t('common.retry')}
        </button>
      </div>
    {/if}
    <input
      bind:this={fileInput}
      type="file"
      accept="image/*"
      multiple
      disabled={uploading}
      style="display: none;"
      onchange={chooseFiles}
    />
  {/if}
</div>
