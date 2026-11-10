<script lang="ts">
  import {
    Upload,
    FileSpreadsheet,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Download,
    Check,
    RotateCcw,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core';

  export interface ExcelImportField {
    name: string;
    label: string;
    required?: boolean | undefined;
    type?: 'string' | 'number' | 'date' | undefined;
    validator?: ((val: unknown) => string | null) | undefined;
  }

  export interface ExcelImportWizardProps {
    fields: ExcelImportField[];
    title?: string | undefined;
    description?: string | undefined;
    templateUrl?: string | undefined;
    class?: string | undefined;
    onimport?: ((result: {
      validRows: Record<string, unknown>[];
      errorRows: { row: number; errors: Record<string, string>; data: Record<string, unknown> }[];
    }) => Promise<void> | void) | undefined;
    oncancel?: (() => void) | undefined;
  }

  let {
    fields = [],
    title,
    description,
    templateUrl,
    class: className = '',
    onimport,
    oncancel,
  }: ExcelImportWizardProps = $props();

  const i18n = useTranslation();

  let currentStep = $state<1 | 2 | 3 | 4>(1);
  let fileName = $state('');
  let fileSize = $state('');
  let rawHeaders = $state<string[]>([]);
  let rawData = $state<Record<string, string>[]>([]);
  let fieldMapping = $state<Record<string, string>>({}); // targetField -> sourceHeader
  let onlyShowErrors = $state(false);
  let isSubmitting = $state(false);
  let isDragOver = $state(false);
  let fileError = $state('');
  const maxFileBytes = 5 * 1024 * 1024;

  // 简单的 CSV 解析函数
  function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const firstLine = lines[0];
    if (!firstLine) return { headers: [], rows: [] };
    const headers = parseLine(firstLine);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;
      const values = parseLine(currentLine);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? '';
      });
      rows.push(row);
    }
    return { headers, rows };
  }

  // 处理文件读取
  function handleFile(file: File) {
    fileError = '';
    if (!file.name.toLowerCase().endsWith('.csv')) {
      fileError = '当前仅支持 CSV 文件';
      return;
    }
    if (file.size > maxFileBytes) {
      fileError = '文件不能超过 5 MB';
      return;
    }
    fileName = file.name;
    fileSize = `${(file.size / 1024).toFixed(1)} KB`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const { headers, rows } = parseCSV(content);
      rawHeaders = headers;
      rawData = rows;

      // 自动字段映射启发式算法
      const initialMap: Record<string, string> = {};
      fields.forEach((f) => {
        const matched = headers.find(
          (h) =>
            h.toLowerCase() === f.name.toLowerCase() ||
            h.toLowerCase() === f.label.toLowerCase() ||
            h.includes(f.label) ||
            f.label.includes(h),
        );
        if (matched) {
          initialMap[f.name] = matched;
        }
      });
      fieldMapping = initialMap;
      currentStep = 2;
    };
    reader.onerror = () => {
      fileError = '文件读取失败，请重试';
    };
    reader.readAsText(file);
  }

  function handleFileInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      handleFile(input.files[0]);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  // 模拟加载模板文件或示例数据
  function loadSampleData() {
    fileName = 'sample-import-template.csv';
    fileSize = '2.4 KB';
    const sampleHeaders = fields.map((f) => f.label);
    rawHeaders = sampleHeaders;

    const sampleRowList: Record<string, string>[] = [
      {},
      {},
      {},
    ];
    fields.forEach((f) => {
      sampleRowList.forEach((row, rowIdx) => {
        row[f.label] = f.type === 'number' ? `${(rowIdx + 1) * 100}` : `样本${f.label}_${rowIdx + 1}`;
      });
    });
    rawData = sampleRowList;

    const initialMap: Record<string, string> = {};
    fields.forEach((f) => {
      initialMap[f.name] = f.label;
    });
    fieldMapping = initialMap;
    currentStep = 2;
  }

  // 校验数据推导
  const validationResult = $derived.by(() => {
    const validRows: Record<string, unknown>[] = [];
    const errorRows: { row: number; errors: Record<string, string>; data: Record<string, unknown> }[] = [];

    rawData.forEach((item, index) => {
      const rowData: Record<string, unknown> = {};
      const rowErrors: Record<string, string> = {};

      fields.forEach((field) => {
        const sourceHeader = fieldMapping[field.name];
        const rawVal = sourceHeader ? item[sourceHeader] : undefined;

        if (field.required && (rawVal === undefined || rawVal === '')) {
          rowErrors[field.name] = `${field.label}为必填项`;
        } else if (rawVal !== undefined && rawVal !== '') {
          if (field.type === 'number' && Number.isNaN(Number(rawVal))) {
            rowErrors[field.name] = '须为数值类型';
          }
          if (field.validator) {
            const err = field.validator(rawVal);
            if (err) rowErrors[field.name] = err;
          }
        }
        rowData[field.name] = rawVal;
      });

      if (Object.keys(rowErrors).length > 0) {
        errorRows.push({ row: index + 1, errors: rowErrors, data: rowData });
      } else {
        validRows.push(rowData);
      }
    });

    return { validRows, errorRows };
  });

  const previewList = $derived(
    onlyShowErrors ? validationResult.errorRows.map((e) => e.data) : rawData,
  );

  const steps = $derived([
    { num: 1, label: i18n.t('excel.uploadStep') },
    { num: 2, label: i18n.t('excel.mappingStep') },
    { num: 3, label: i18n.t('excel.previewStep') },
    { num: 4, label: i18n.t('excel.startImport') },
  ]);

  async function handleConfirmImport() {
    isSubmitting = true;
    try {
      if (onimport) {
        await onimport({
          validRows: validationResult.validRows,
          errorRows: validationResult.errorRows,
        });
      }
      currentStep = 4;
    } finally {
      isSubmitting = false;
    }
  }

  function handleReset() {
    currentStep = 1;
    fileName = '';
    fileSize = '';
    rawHeaders = [];
    rawData = [];
    fieldMapping = {};
    onlyShowErrors = false;
  }
</script>

<div
  data-svadmin-component="ExcelImportWizard"
  class={cn(
    'flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden',
    className,
  )}
>
  <!-- 头部与步骤进度 -->
  <div class="border-b border-border p-5 bg-muted/20">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-base font-semibold text-foreground flex items-center gap-2">
          <FileSpreadsheet class="h-5 w-5 text-primary" />
          <span>{title ?? i18n.t('excel.import')}</span>
        </h3>
        {#if description}
          <p class="text-xs text-muted-foreground mt-0.5">{description}</p>
        {/if}
      </div>

      {#if templateUrl && /^https?:\/\//i.test(templateUrl)}
        <a
          href={templateUrl}
          download
          class="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
        >
          <Download size={14} />
          <span>{i18n.t('excel.downloadTemplate')}</span>
        </a>
      {/if}
    </div>

    <!-- 步骤指示器 -->
    <div class="grid grid-cols-4 gap-2 text-xs">
      {#each steps as s (s.num)}
        <div
          class={cn(
            'flex items-center gap-2 rounded-lg p-2 border transition-colors',
            currentStep === s.num
              ? 'border-primary bg-primary/10 text-primary font-semibold'
              : currentStep > s.num
                ? 'border-border bg-muted/40 text-foreground'
                : 'border-border/40 text-muted-foreground opacity-60',
          )}
        >
          <div
            class={cn(
              'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold shrink-0',
              currentStep === s.num
                ? 'bg-primary text-primary-foreground'
                : currentStep > s.num
                  ? 'bg-muted-foreground/20 text-foreground'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            {#if currentStep > s.num}
              <Check size={11} strokeWidth={3} />
            {:else}
              {s.num}
            {/if}
          </div>
          <span class="truncate">{s.label}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- 主体内容区域 -->
  <div class="p-6 flex-1 min-h-0">
    <!-- 步骤 1：文件上传 -->
    {#if currentStep === 1}
      <div class="flex flex-col items-center justify-center py-8">
        <label
          class={cn(
            'flex flex-col items-center justify-center w-full max-w-lg h-60 border-2 border-dashed rounded-xl cursor-pointer transition-all',
            isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-background',
          )}
          ondragover={(e) => { e.preventDefault(); isDragOver = true; }}
          ondragleave={() => { isDragOver = false; }}
          ondrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            class="hidden"
            onchange={handleFileInputChange}
          />
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <Upload size={24} />
          </div>
          <p class="text-sm font-medium text-foreground">{i18n.t('excel.dropFile')}</p>
          <p class="text-xs text-muted-foreground mt-1">{i18n.t('excel.fileHint')}</p>
          {#if fileError}<p class="mt-2 text-xs text-destructive" role="alert">{fileError}</p>{/if}
        </label>

        <div class="mt-4 flex items-center gap-3">
          <span class="text-xs text-muted-foreground">没有现成文件？</span>
          <button
            type="button"
            class="text-xs text-primary hover:underline font-medium cursor-pointer"
            onclick={loadSampleData}
          >
            载入测试样本数据
          </button>
        </div>
      </div>

    <!-- 步骤 2：字段映射 -->
    {:else if currentStep === 2}
      <div class="space-y-4">
        <div class="flex items-center justify-between text-xs bg-muted/30 p-2.5 rounded-lg border border-border">
          <span class="text-muted-foreground">
            已解析文件：<strong class="text-foreground">{fileName}</strong> ({fileSize})，包含 <strong class="text-foreground">{rawData.length}</strong> 行数据
          </span>
          <button
            type="button"
            class="text-primary hover:underline font-medium cursor-pointer"
            onclick={() => {
              const auto: Record<string, string> = {};
              fields.forEach((f) => {
                const match = rawHeaders.find((h) => h.includes(f.label) || f.label.includes(h));
                if (match) auto[f.name] = match;
              });
              fieldMapping = auto;
            }}
          >
            {i18n.t('excel.autoMapped')}
          </button>
        </div>

        <div class="rounded-lg border border-border overflow-hidden">
          <table class="w-full text-xs text-left">
            <thead class="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th class="p-3 w-1/3">{i18n.t('excel.targetField')}</th>
                <th class="p-3 w-12 text-center"></th>
                <th class="p-3 w-1/2">{i18n.t('excel.sourceColumn')}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {#each fields as field (field.name)}
                <tr class="hover:bg-muted/20">
                  <td class="p-3">
                    <div class="flex items-center gap-1.5">
                      <span class="font-medium text-foreground">{field.label}</span>
                      <span class="text-muted-foreground font-mono text-[10px]">({field.name})</span>
                      {#if field.required}
                        <span class="text-destructive">*</span>
                      {/if}
                    </div>
                  </td>
                  <td class="p-3 text-center text-muted-foreground">
                    <ArrowRight size={14} class="inline" />
                  </td>
                  <td class="p-3">
                    <select
                      bind:value={fieldMapping[field.name]}
                      class="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs focus:ring-1 focus:ring-ring"
                    >
                      <option value="">-- {i18n.t('excel.unmapped')} --</option>
                      {#each rawHeaders as header (header)}
                        <option value={header}>{header}</option>
                      {/each}
                    </select>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

    <!-- 步骤 3：数据校验与预览 -->
    {:else if currentStep === 3}
      <div class="space-y-4">
        <!-- 统计栏与筛选 -->
        <div class="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 text-xs">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-1.5 text-primary font-medium">
              <CheckCircle2 size={16} />
              <span>{i18n.t('excel.validRows')}: {validationResult.validRows.length} 条</span>
            </div>
            <div class="flex items-center gap-1.5 text-destructive font-medium">
              <AlertCircle size={16} />
              <span>{i18n.t('excel.errorRows')}: {validationResult.errorRows.length} 条</span>
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              bind:checked={onlyShowErrors}
              class="rounded border-input text-primary focus:ring-ring h-3.5 w-3.5"
            />
            <span class="text-muted-foreground">仅显示异常记录</span>
          </label>
        </div>

        <!-- 预览表格 -->
        <div class="rounded-lg border border-border overflow-x-auto max-h-[300px]">
          <table class="w-full text-xs text-left whitespace-nowrap">
            <thead class="bg-muted/40 border-b border-border text-muted-foreground font-semibold sticky top-0">
              <tr>
                <th class="p-2.5 w-12 text-center">#</th>
                {#each fields as f (f.name)}
                  <th class="p-2.5">{f.label}</th>
                {/each}
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {#each previewList as row, idx (idx)}
                {@const mappedRow = row}
                <tr class="hover:bg-muted/20">
                  <td class="p-2.5 text-center text-muted-foreground">{idx + 1}</td>
                  {#each fields as f (f.name)}
                    {@const colName = fieldMapping[f.name]}
                    {@const val = colName ? mappedRow[colName] ?? mappedRow[f.name] : ''}
                    <td class="p-2.5">{val || '-'}</td>
                  {/each}
                </tr>
              {/each}
              {#if previewList.length === 0}
                <tr>
                  <td colspan={fields.length + 1} class="py-12 text-center text-muted-foreground">
                    没有可显示的数据
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </div>

    <!-- 步骤 4：导入完成 -->
    {:else if currentStep === 4}
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h4 class="text-base font-semibold text-foreground mb-1">导入任务已成功提交！</h4>
        <p class="text-xs text-muted-foreground max-w-sm mb-6">
          已成功录入 {validationResult.validRows.length} 条有效数据。可在主列表或数据报表中查看详情。
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          onclick={handleReset}
        >
          <RotateCcw size={14} />
          <span>继续导入下一批</span>
        </button>
      </div>
    {/if}
  </div>

  <!-- 底部操作按钮 -->
  {#if currentStep < 4}
    <div class="border-t border-border p-4 bg-muted/10 flex items-center justify-between">
      <div>
        {#if currentStep > 1}
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
            onclick={() => { currentStep = (currentStep - 1) as 1 | 2 | 3; }}
          >
            <ArrowLeft size={14} />
            <span>上一步</span>
          </button>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        {#if oncancel}
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
            onclick={oncancel}
          >
            取消
          </button>
        {/if}

        {#if currentStep === 2}
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            onclick={() => { currentStep = 3; }}
          >
            <span>下一步：校验预览</span>
            <ArrowRight size={14} />
          </button>
        {:else if currentStep === 3}
          <button
            type="button"
            disabled={isSubmitting || validationResult.validRows.length === 0}
            class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            onclick={handleConfirmImport}
          >
            <span>{isSubmitting ? '正在提交...' : i18n.t('excel.startImport')}</span>
            <Check size={14} />
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>
