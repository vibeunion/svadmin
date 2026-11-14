<script lang="ts">
  import { UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertCircle, X, RefreshCw } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface DataImportDropzoneProps {
    /** 允许的文件扩展名白名单，默认 ['.xlsx', '.xls', '.csv'] */
    acceptExtensions?: string[] | undefined;
    /** 单个文件最大大小 (MB)，默认 30MB */
    maxSizeMb?: number | undefined;
    /** 模板文件下载链接 */
    templateUrl?: string | undefined;
    /** 模板文件名称，如 "员工导入标准模板.xlsx" */
    templateName?: string | undefined;
    /** 导入模块名称，如 "财务流水" 或 "客户清单" */
    resourceName?: string | undefined;
    /** 是否正在解析或上传中 */
    loading?: boolean | undefined;
    /** 上传或解析进度百分比 (0~100) */
    progress?: number | undefined;
    /** 选择或拖拽文件成功后的回调 */
    onfileselect?: ((file: File) => void) | undefined;
    /** 下载模板回调 */
    ondownloadtemplate?: (() => void) | undefined;
    class?: string | undefined;
  }

  let {
    acceptExtensions = ['.xlsx', '.xls', '.csv'],
    maxSizeMb = 30,
    templateUrl,
    templateName = '数据导入标准模板',
    resourceName = '业务数据',
    loading = false,
    progress,
    onfileselect,
    ondownloadtemplate,
    class: className = '',
  }: DataImportDropzoneProps = $props();

  let isDragging = $state(false);
  let selectedFile = $state<File | null>(null);
  let errorMessage = $state('');

  function validateAndSelect(file: File) {
    errorMessage = '';
    const name = file.name.toLowerCase();
    const isAccepted = acceptExtensions.some((ext) => name.endsWith(ext.toLowerCase()));

    if (!isAccepted) {
      errorMessage = `文件格式不正确，仅支持格式: ${acceptExtensions.join(' / ')}`;
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      errorMessage = `文件过大，单个文件不能超过 ${maxSizeMb}MB`;
      return;
    }

    selectedFile = file;
    onfileselect?.(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      validateAndSelect(file);
    }
  }

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      validateAndSelect(file);
    }
    input.value = '';
  }

  function clearSelectedFile() {
    selectedFile = null;
    errorMessage = '';
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<div
  class={cn('rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs space-y-4', className)}
  data-svadmin-component="DataImportDropzone"
>
  <!-- Header Bar -->
  <header class="flex items-center justify-between border-b border-border pb-3">
    <div>
      <h3 class="font-bold text-sm text-foreground">导入 {resourceName}</h3>
      <p class="text-xs text-muted-foreground mt-0.5">支持批量拖拽 Excel 或 CSV 文件快速入库</p>
    </div>

    {#if templateUrl || ondownloadtemplate}
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
        onclick={() => {
          if (ondownloadtemplate) ondownloadtemplate();
          else if (templateUrl && typeof window !== 'undefined') window.open(templateUrl, '_blank');
        }}
      >
        <Download class="h-3.5 w-3.5 text-primary" />
        <span>下载导入模板 ({templateName})</span>
      </button>
    {/if}
  </header>

  <!-- Error Alert -->
  {#if errorMessage}
    <div class="rounded-md bg-destructive/10 border border-destructive/20 p-3 flex items-center gap-2 text-xs text-destructive">
      <AlertCircle class="h-4 w-4 shrink-0" />
      <span>{errorMessage}</span>
    </div>
  {/if}

  <!-- Dropzone Area -->
  {#if !selectedFile}
    <div
      class={cn(
        'relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center select-none',
        isDragging
          ? 'border-primary bg-primary/5 scale-[0.99]'
          : 'border-border/80 hover:border-primary/60 bg-muted/10 hover:bg-muted/20'
      )}
      ondragover={(e) => { e.preventDefault(); isDragging = true; }}
      ondragleave={() => (isDragging = false)}
      ondrop={handleDrop}
      role="button"
      tabindex="0"
    >
      <input
        type="file"
        class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        accept={acceptExtensions.join(',')}
        onchange={handleFileChange}
        title="点击或拖拽上传文件"
        aria-label="Upload data file"
      />

      <div class="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
        <UploadCloud class="h-6 w-6" />
      </div>

      <h4 class="font-bold text-sm text-foreground mb-1">
        点击此处选择文件，或将文件拖拽至此区域
      </h4>
      <p class="text-xs text-muted-foreground font-mono">
        支持格式: {acceptExtensions.join(' / ')} • 单文件上限 {maxSizeMb}MB
      </p>
    </div>
  {:else}
    <!-- File Loaded Card -->
    <div class="rounded-lg border border-border bg-muted/20 p-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="h-10 w-10 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
          <FileSpreadsheet class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h4 class="font-bold text-xs text-foreground truncate">{selectedFile.name}</h4>
            <span class="inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success font-mono">
              <CheckCircle2 class="h-3 w-3" />
              已就绪
            </span>
          </div>
          <span class="text-[11px] text-muted-foreground font-mono block mt-0.5">
            大小: {formatBytes(selectedFile.size)}
          </span>
        </div>
      </div>

      <button
        type="button"
        class="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
        onclick={clearSelectedFile}
        aria-label="Remove selected file"
        title="重新选择其他文件"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  {/if}

  <!-- Progress Bar (if loading) -->
  {#if loading}
    <div class="space-y-1.5 text-xs font-mono">
      <div class="flex justify-between text-muted-foreground">
        <span class="flex items-center gap-1">
          <RefreshCw class="h-3 w-3 animate-spin text-primary" />
          <span>正在解析文件数据结构并校验列头…</span>
        </span>
        {#if progress !== undefined}
          <span class="font-bold text-foreground">{progress}%</span>
        {/if}
      </div>
      <div class="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          class="h-full bg-primary transition-all duration-300"
          style={`width: ${progress ?? 60}%`}
        ></div>
      </div>
    </div>
  {/if}
</div>
