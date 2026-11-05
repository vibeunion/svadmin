<script lang="ts">
  import { useStorage, type StorageProvider } from '@svadmin/core';
  import { Upload, X, FileText, AlertCircle, Loader2 } from '@lucide/svelte';

  export interface UploadFieldProps {
    value?: string | string[] | null;
    multiple?: boolean;
    accept?: string;
    maxSizeBytes?: number;
    path?: string;
    disabled?: boolean;
    label?: string;
    description?: string;
    /** Optional storage adapter; defaults to the StorageProvider from AdminContext. */
    storage?: StorageProvider;
    onchange?: (value: string | string[] | null) => void;
  }

  let {
    value = $bindable(null),
    multiple = false,
    accept = '*/*',
    maxSizeBytes,
    path = 'uploads',
    disabled = false,
    label,
    description,
    storage,
    onchange,
  }: UploadFieldProps = $props();

  const inputId = $props.id();
  const contextStorage = useStorage();

  let isDragging = $state(false);
  let errorMessage = $state<string | null>(null);
  let uploadQueue = $state<Array<{ name: string; size: number; progress: number }>>([]);
  let isUploading = $state(false);
  let uploadProgress = $state(0);
  let uploadedPaths = $state<Record<string, string>>({});

  async function uploadFile(file: File, options: Parameters<StorageProvider['upload']>[1]) {
    if (storage) return storage.upload(file, options);
    return contextStorage.upload(file, options);
  }

  async function deleteFile(path: string): Promise<void> {
    if (storage) return storage.delete(path);
    return contextStorage.deleteFile(path);
  }

  // Normalize initial value to array for uniform internal rendering
  let fileList = $derived.by<string[]>(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  });

  function updateValue(newList: string[]) {
    const nextVal = multiple ? newList : (newList[0] ?? null);
    value = nextVal;
    onchange?.(nextVal);
  }

  async function handleFiles(files: FileList | File[]) {
    if (disabled || !files || files.length === 0) return;
    errorMessage = null;

    const fileArray = Array.from(files);

    // Validation
    for (const f of fileArray) {
      if (maxSizeBytes && f.size > maxSizeBytes) {
        errorMessage = `File "${f.name}" exceeds the maximum size limit (${(maxSizeBytes / (1024 * 1024)).toFixed(1)}MB).`;
        return;
      }
    }

    const currentUrls = [...fileList];

    for (const file of fileArray) {
      const queueItem = { name: file.name, size: file.size, progress: 0 };
      uploadQueue = [...uploadQueue, queueItem];

      isUploading = true;
      uploadProgress = 0;
      try {
        const res = await uploadFile(file, {
          path,
          filename: file.name,
          onProgress: (p) => {
            uploadProgress = p.percentage;
            uploadQueue = uploadQueue.map((item) => item === queueItem ? { ...item, progress: p.percentage } : item);
          },
        });

        if (multiple) {
          currentUrls.push(res.url);
        } else {
          currentUrls.splice(0, currentUrls.length, res.url);
        }
        uploadedPaths = { ...uploadedPaths, [res.url]: res.path };
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : 'Upload failed';
      } finally {
        isUploading = false;
        uploadProgress = 0;
        uploadQueue = uploadQueue.filter((q) => q !== queueItem);
      }
    }

    updateValue(currentUrls);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (disabled) return;
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      handleFiles(input.files);
      input.value = '';
    }
  }

  async function removeItem(urlToRemove: string) {
    if (disabled) return;
    const nextUrls = fileList.filter((u) => u !== urlToRemove);
    updateValue(nextUrls);

    // Attempt backend delete if path is extractable
    try {
      const trackedPath = uploadedPaths[urlToRemove];
      const urlObj = new URL(urlToRemove, 'https://dummy.local');
      const cleanPath = trackedPath ?? urlObj.pathname.replace(/^\/+/, '');
      await deleteFile(cleanPath);
    } catch {
      // Best-effort cleanup
    } finally {
      if (uploadedPaths[urlToRemove]) {
        const { [urlToRemove]: _removed, ...remainingPaths } = uploadedPaths;
        uploadedPaths = remainingPaths;
      }
    }
  }
</script>

<div class="svadmin-upload-field space-y-2">
  {#if label}
    <label for={inputId} class="block text-sm font-medium text-foreground">{label}</label>
  {/if}

  <!-- Drop Zone -->
  <div
    class="relative border-2 border-dashed rounded-lg p-4 text-center transition-colors
      {isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
      {disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
    ondragover={(e) => { e.preventDefault(); if (!disabled) isDragging = true; }}
    ondragleave={() => { isDragging = false; }}
    ondrop={handleDrop}
    role="region"
    aria-label="File upload dropzone"
  >
    <input
      id={inputId}
      type="file"
      {accept}
      {multiple}
      {disabled}
      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      onchange={handleInputChange}
      aria-label="Upload files"
    />

    <div class="flex flex-col items-center justify-center gap-1.5 py-2 pointer-events-none">
      {#if isUploading}
        <Loader2 class="h-6 w-6 text-primary animate-spin" />
        <span class="text-xs font-medium text-muted-foreground">Uploading... ({uploadProgress}%)</span>
      {:else}
        <Upload class="h-6 w-6 text-muted-foreground/80" />
        <div class="text-xs text-foreground font-medium">
          <span class="text-primary font-semibold">Click to upload</span> or drag and drop
        </div>
        {#if description}
          <p class="text-[11px] text-muted-foreground">{description}</p>
        {:else}
          <p class="text-[11px] text-muted-foreground">Any file up to {maxSizeBytes ? `${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB` : '50MB'}</p>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Error feedback -->
  {#if errorMessage}
    <div class="flex items-center gap-1.5 text-xs text-destructive">
      <AlertCircle class="h-3.5 w-3.5 shrink-0" />
      <span>{errorMessage}</span>
    </div>
  {/if}

  <!-- Upload Queue Progress -->
  {#if uploadQueue.length > 0}
    <div class="space-y-1 pt-1">
      {#each uploadQueue as item (item.name)}
        <div class="flex items-center justify-between text-xs p-1.5 bg-muted/40 rounded border border-border">
          <span class="truncate max-w-[200px] font-medium">{item.name}</span>
          <span class="text-[11px] text-muted-foreground">{item.progress}%</span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Uploaded Files List -->
  {#if fileList.length > 0}
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
      {#each fileList as fileUrl (fileUrl)}
        {@const fileName = fileUrl.split('/').pop()?.split('?')[0] ?? fileUrl}
        <div class="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-card text-xs">
          <div class="flex items-center gap-2 min-w-0">
            <FileText class="h-4 w-4 text-primary shrink-0" />
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              class="truncate font-medium text-foreground hover:underline"
              title={fileName}
            >
              {fileName}
            </a>
          </div>
          <button
            type="button"
            class="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
            onclick={() => removeItem(fileUrl)}
            {disabled}
            aria-label={`Remove ${fileName}`}
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
