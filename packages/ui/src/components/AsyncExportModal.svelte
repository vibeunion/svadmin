<script lang="ts">
  import {
    Download,
    FileSpreadsheet,
    FileText,
    FileCode,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
    Check,
    Copy,
    RefreshCw,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type ExportScope = 'all' | 'filtered' | 'selected';
  export type ExportFormat = 'xlsx' | 'csv' | 'json';
  export type ExportTaskStatus = 'idle' | 'exporting' | 'completed' | 'error';

  export interface ExportColumnOption {
    key: string;
    label: string;
    defaultSelected?: boolean;
    disabled?: boolean;
  }

  export interface ExportConfig {
    fileName: string;
    format: ExportFormat;
    scope: ExportScope;
    selectedColumns: string[];
  }

  export interface ExportResult {
    fileUrl?: string;
    fileName: string;
    fileSize?: string;
    rowCount?: number;
    durationMs?: number;
  }

  export interface AsyncExportModalProps {
    /** 弹窗是否打开 */
    open?: boolean;
    /** 默认导出的文件名（自动追加后缀） */
    defaultFileName?: string;
    /** 资源或模块标识名，如 "orders" 或 "用户记录" */
    resourceName?: string;
    /** 当前表格勾选行数 */
    selectedCount?: number;
    /** 筛选结果行数 */
    filteredCount?: number;
    /** 系统总行数 */
    totalCount?: number;
    /** 字段列选项列表 */
    columns: ExportColumnOption[];
    /** 支持的导出格式清单 */
    supportedFormats?: ExportFormat[];
    /** 异步导出执行函数 */
    onexport?: (config: ExportConfig) => Promise<ExportResult> | ExportResult;
    /** 弹窗关闭回调 */
    onclose?: () => void;
    /** 点击下载文件回调 */
    ondownload?: (result: ExportResult) => void;
    class?: string;
  }

  let {
    open = false,
    defaultFileName = '企业数据报表',
    resourceName = '数据记录',
    selectedCount = 0,
    filteredCount,
    totalCount,
    columns = [],
    supportedFormats = ['xlsx', 'csv', 'json'],
    onexport,
    onclose,
    ondownload,
    class: className = '',
  }: AsyncExportModalProps = $props();

  let fileName = $state('');
  let currentFormat = $state<ExportFormat>('xlsx');
  let currentScope = $state<ExportScope>('all');
  let selectedColumnKeys = $state<string[]>([]);
  let taskStatus = $state<ExportTaskStatus>('idle');
  let exportProgress = $state(0);
  let statusMessage = $state('');
  let errorMessage = $state('');
  let exportResult = $state<ExportResult | null>(null);
  let isCopied = $state(false);

  $effect(() => {
    if (open) {
      fileName = defaultFileName;
      currentFormat = supportedFormats[0] ?? 'xlsx';
      currentScope = selectedCount > 0 ? 'selected' : 'all';
      selectedColumnKeys = columns.filter((c) => c.defaultSelected !== false).map((c) => c.key);
      taskStatus = 'idle';
      exportProgress = 0;
      statusMessage = '';
      errorMessage = '';
      exportResult = null;
    }
  });

  const isAllColumnsSelected = $derived.by(() => {
    return columns.length > 0 && selectedColumnKeys.length === columns.length;
  });

  function toggleColumn(key: string, disabled?: boolean) {
    if (disabled || taskStatus === 'exporting') return;
    if (selectedColumnKeys.includes(key)) {
      selectedColumnKeys = selectedColumnKeys.filter((k) => k !== key);
    } else {
      selectedColumnKeys = [...selectedColumnKeys, key];
    }
  }

  function toggleAllColumns() {
    if (taskStatus === 'exporting') return;
    if (isAllColumnsSelected) {
      selectedColumnKeys = columns.filter((c) => c.disabled).map((c) => c.key);
    } else {
      selectedColumnKeys = columns.map((c) => c.key);
    }
  }

  async function startExport() {
    if (selectedColumnKeys.length === 0 || !fileName.trim()) return;
    taskStatus = 'exporting';
    exportProgress = 15;
    statusMessage = '正在分析数据并生成报表任务...';

    const fullFileName = `${fileName.trim()}.${currentFormat}`;
    const startTime = Date.now();

    try {
      if (onexport) {
        exportProgress = 40;
        statusMessage = '正在提取所选字段及筛选记录...';

        const result = await onexport({
          fileName: fullFileName,
          format: currentFormat,
          scope: currentScope,
          selectedColumns: $state.snapshot(selectedColumnKeys),
        });

        exportProgress = 100;
        taskStatus = 'completed';
        exportResult = result;
      } else {
        // Built-in simulated asynchronous export progression
        await new Promise((r) => setTimeout(r, 600));
        exportProgress = 55;
        statusMessage = '正在序列化结构与压缩数据流...';
        await new Promise((r) => setTimeout(r, 700));
        exportProgress = 85;
        statusMessage = '正在生成云端下载凭证...';
        await new Promise((r) => setTimeout(r, 400));
        exportProgress = 100;

        const rowCount =
          currentScope === 'selected'
            ? selectedCount
            : currentScope === 'filtered'
              ? (filteredCount ?? 280)
              : (totalCount ?? 1420);

        taskStatus = 'completed';
        exportResult = {
          fileName: fullFileName,
          fileSize: currentFormat === 'json' ? '1.8 MB' : '720 KB',
          rowCount,
          durationMs: Date.now() - startTime,
          fileUrl: `https://downloads.svadmin.local/exports/${encodeURIComponent(fullFileName)}`,
        };
      }
    } catch (err: unknown) {
      taskStatus = 'error';
      errorMessage = err instanceof Error ? err.message : '导出生成异常中断，请稍后重试。';
    }
  }

  function handleDownload() {
    if (!exportResult) return;
    ondownload?.(exportResult);
    if (exportResult.fileUrl && typeof window !== 'undefined') {
      const a = document.createElement('a');
      a.href = exportResult.fileUrl;
      a.download = exportResult.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  async function copyDownloadUrl() {
    if (!exportResult?.fileUrl || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(exportResult.fileUrl);
      isCopied = true;
      setTimeout(() => {
        isCopied = false;
      }, 1800);
    } catch {
      // Ignore
    }
  }

  function handleClose() {
    if (taskStatus === 'exporting') return;
    onclose?.();
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs select-none"
    data-svadmin-component="AsyncExportModal"
    role="dialog"
    aria-modal="true"
  >
    <div
      class={cn(
        'relative w-full max-w-lg rounded-xl border border-border bg-card text-card-foreground shadow-lg overflow-hidden flex flex-col max-h-[90vh]',
        className
      )}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/30">
        <div class="flex items-center gap-2">
          <Download class="h-4 w-4 text-primary" />
          <h3 class="font-semibold text-sm text-foreground">
            {taskStatus === 'completed'
              ? '报表已生成'
              : taskStatus === 'exporting'
                ? '异步生成中'
                : `导出 ${resourceName}`}
          </h3>
        </div>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          onclick={handleClose}
          disabled={taskStatus === 'exporting'}
          aria-label="Close modal"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 overflow-y-auto space-y-4 text-xs">
        {#if taskStatus === 'idle'}
          <!-- 1. File Name -->
          <div>
            <label for="export-filename" class="block font-medium text-foreground mb-1">
              文件名称
            </label>
            <div class="flex items-center rounded-md border border-input bg-background px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/40">
              <input
                id="export-filename"
                type="text"
                class="w-full bg-transparent outline-none text-foreground text-xs"
                bind:value={fileName}
                placeholder="请输入导出报表名称"
              />
              <span class="text-muted-foreground font-mono shrink-0 ml-1">.{currentFormat}</span>
            </div>
          </div>

          <!-- 2. Format Selection -->
          <div>
            <span class="block font-medium text-foreground mb-1.5">导出文件格式</span>
            <div class="grid grid-cols-3 gap-2">
              {#if supportedFormats.includes('xlsx')}
                <button
                  type="button"
                  class={cn(
                    'flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer',
                    currentFormat === 'xlsx'
                      ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/30'
                      : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                  )}
                  onclick={() => (currentFormat = 'xlsx')}
                >
                  <FileSpreadsheet class="h-5 w-5 mb-1" />
                  <span class="font-semibold text-xs">Excel 格式</span>
                  <span class="text-[10px] opacity-70">.xlsx 规范表格</span>
                </button>
              {/if}

              {#if supportedFormats.includes('csv')}
                <button
                  type="button"
                  class={cn(
                    'flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer',
                    currentFormat === 'csv'
                      ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/30'
                      : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                  )}
                  onclick={() => (currentFormat = 'csv')}
                >
                  <FileText class="h-5 w-5 mb-1" />
                  <span class="font-semibold text-xs">CSV 纯文本</span>
                  <span class="text-[10px] opacity-70">.csv 逗号分隔</span>
                </button>
              {/if}

              {#if supportedFormats.includes('json')}
                <button
                  type="button"
                  class={cn(
                    'flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer',
                    currentFormat === 'json'
                      ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/30'
                      : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                  )}
                  onclick={() => (currentFormat = 'json')}
                >
                  <FileCode class="h-5 w-5 mb-1" />
                  <span class="font-semibold text-xs">JSON 数组</span>
                  <span class="text-[10px] opacity-70">.json 原始载荷</span>
                </button>
              {/if}
            </div>
          </div>

          <!-- 3. Export Scope -->
          <div>
            <span class="block font-medium text-foreground mb-1.5">导出数据范围</span>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="export-scope"
                  value="all"
                  bind:group={currentScope}
                  class="accent-primary"
                />
                <span class="text-foreground">全部数据</span>
                {#if totalCount !== undefined}
                  <span class="text-muted-foreground">({totalCount})</span>
                {/if}
              </label>

              {#if filteredCount !== undefined}
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="export-scope"
                    value="filtered"
                    bind:group={currentScope}
                    class="accent-primary"
                  />
                  <span class="text-foreground">当前筛选</span>
                  <span class="text-muted-foreground">({filteredCount})</span>
                </label>
              {/if}

              {#if selectedCount > 0}
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="export-scope"
                    value="selected"
                    bind:group={currentScope}
                    class="accent-primary"
                  />
                  <span class="text-foreground">已选数据</span>
                  <span class="font-medium text-primary">({selectedCount})</span>
                </label>
              {/if}
            </div>
          </div>

          <!-- 4. Columns Selection -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="font-medium text-foreground">
                导出字段列 ({selectedColumnKeys.length}/{columns.length})
              </span>
              <button
                type="button"
                class="text-primary hover:underline cursor-pointer"
                onclick={toggleAllColumns}
              >
                {isAllColumnsSelected ? '清空全选' : '全部勾选'}
              </button>
            </div>
            <div class="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 border border-border rounded-lg bg-muted/20">
              {#each columns as col (col.key)}
                <button
                  type="button"
                  class={cn(
                    'flex items-center gap-2 p-1.5 rounded text-left transition-colors cursor-pointer',
                    selectedColumnKeys.includes(col.key)
                      ? 'bg-card text-foreground font-medium shadow-2xs'
                      : 'text-muted-foreground hover:bg-muted/40'
                  )}
                  onclick={() => toggleColumn(col.key, col.disabled)}
                  disabled={col.disabled}
                >
                  <span
                    class={cn(
                      'flex h-3.5 w-3.5 items-center justify-center rounded border shrink-0',
                      selectedColumnKeys.includes(col.key)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40'
                    )}
                  >
                    {#if selectedColumnKeys.includes(col.key)}
                      <Check class="h-2.5 w-2.5" />
                    {/if}
                  </span>
                  <span class="truncate">{col.label}</span>
                </button>
              {/each}
            </div>
          </div>
        {:else if taskStatus === 'exporting'}
          <!-- Exporting Progress -->
          <div class="py-6 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 class="h-8 w-8 text-primary animate-spin" />
            <div class="space-y-1">
              <h4 class="font-semibold text-foreground text-sm">正在后台异步生成数据报表...</h4>
              <p class="text-muted-foreground text-xs">{statusMessage}</p>
            </div>

            <div class="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
              <div
                class="bg-primary h-full transition-all duration-300"
                style={`width: ${exportProgress}%`}
              ></div>
            </div>
            <span class="font-mono text-xs text-muted-foreground">{exportProgress}%</span>
          </div>
        {:else if taskStatus === 'completed' && exportResult}
          <!-- Completed State -->
          <div class="py-4 flex flex-col items-center justify-center text-center space-y-3">
            <div class="h-10 w-10 rounded-full bg-success/10 text-success flex items-center justify-center ring-4 ring-success/20">
              <CheckCircle2 class="h-6 w-6" />
            </div>
            <div class="space-y-1">
              <h4 class="font-semibold text-foreground text-sm">报表已成功生成</h4>
              <p class="text-muted-foreground text-xs font-mono">{exportResult.fileName}</p>
            </div>

            <div class="flex items-center gap-4 text-xs font-mono bg-muted/30 px-4 py-2 rounded-lg border border-border">
              {#if exportResult.rowCount !== undefined}
                <div>
                  <span class="text-muted-foreground">数据行数:</span>
                  <span class="font-semibold text-foreground ml-1">{exportResult.rowCount.toLocaleString()}</span>
                </div>
              {/if}
              {#if exportResult.fileSize}
                <div>
                  <span class="text-muted-foreground">文件大小:</span>
                  <span class="font-semibold text-foreground ml-1">{exportResult.fileSize}</span>
                </div>
              {/if}
              {#if exportResult.durationMs !== undefined}
                <div>
                  <span class="text-muted-foreground">生成耗时:</span>
                  <span class="font-semibold text-foreground ml-1">{exportResult.durationMs}ms</span>
                </div>
              {/if}
            </div>
          </div>
        {:else if taskStatus === 'error'}
          <!-- Error State -->
          <div class="py-4 flex flex-col items-center justify-center text-center space-y-2">
            <div class="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center ring-4 ring-destructive/20">
              <AlertCircle class="h-6 w-6" />
            </div>
            <h4 class="font-semibold text-foreground text-sm">报表生成失败</h4>
            <p class="text-destructive text-xs max-w-xs">{errorMessage}</p>
          </div>
        {/if}
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-end gap-2 border-t border-border px-5 py-3 bg-muted/20 text-xs">
        {#if taskStatus === 'idle'}
          <button
            type="button"
            class="rounded-md border border-border bg-card px-3 py-1.5 font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            onclick={handleClose}
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-md bg-primary px-3.5 py-1.5 font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            onclick={startExport}
            disabled={selectedColumnKeys.length === 0 || !fileName.trim()}
          >
            开始生成报表
          </button>
        {:else if taskStatus === 'exporting'}
          <span class="text-muted-foreground text-xs italic">任务执行中，请勿关闭...</span>
        {:else if taskStatus === 'completed'}
          {#if exportResult?.fileUrl}
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
              onclick={copyDownloadUrl}
            >
              {#if isCopied}
                <Check class="h-3.5 w-3.5 text-success" />
                <span class="text-success">链接已复制</span>
              {:else}
                <Copy class="h-3.5 w-3.5" />
                <span>复制链接</span>
              {/if}
            </button>
          {/if}
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
            onclick={handleDownload}
          >
            <Download class="h-3.5 w-3.5" />
            <span>立即下载</span>
          </button>
        {:else if taskStatus === 'error'}
          <button
            type="button"
            class="rounded-md border border-border bg-card px-3 py-1.5 font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            onclick={handleClose}
          >
            关闭
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
            onclick={startExport}
          >
            <RefreshCw class="h-3.5 w-3.5" />
            <span>重新发起</span>
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
