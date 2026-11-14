<script lang="ts">
  import {
    UploadCloud,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
    Trash2,
    Play,
    Check,
    Loader2,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import FieldMappingBuilder, {
    type SourceField,
    type TargetField,
    type FieldMappingRule,
  } from './FieldMappingBuilder.svelte';

  export interface ValidationRule {
    field: string;
    required?: boolean | undefined;
    pattern?: RegExp | undefined;
    customValidator?: ((value: unknown, row: Record<string, unknown>) => string | null | undefined) | undefined;
    errorMessage?: string | undefined;
  }

  export interface PipelineValidationError {
    rowIndex: number;
    field: string;
    message: string;
  }

  export interface DataImportPipelineProps {
    /** 目标系统数据结构 */
    targetFields: TargetField[];
    /** 校验规则列表 */
    validationRules?: ValidationRule[] | undefined;
    /** 外部直接传入的初始原始数据行（可选） */
    initialRows?: Record<string, unknown>[] | undefined;
    /** 业务模块标题，如 "用户档案导入" */
    title?: string | undefined;
    /** 最终提交导入回调 */
    onimport?: ((validRows: Record<string, unknown>[]) => Promise<{ successCount: number; failCount: number }> | { successCount: number; failCount: number }) | undefined;
    class?: string | undefined;
  }

  let {
    targetFields = [],
    validationRules = [],
    initialRows = [],
    title = '批量数据智能导入流水线',
    onimport,
    class: className = '',
  }: DataImportPipelineProps = $props();

  // 当前进行到的步骤：1: 数据录入, 2: 字段映射, 3: 质检纠错, 4: 导入结果
  let currentStep = $state<1 | 2 | 3 | 4>(1);

  // 原始导入数据与解析后的源字段
  let rawRows = $state<Record<string, unknown>[]>([]);
  let pasteContent = $state('');
  let isParsing = $state(false);

  // 映射规则
  let mappingRules = $state<FieldMappingRule[]>([]);

  $effect(() => {
    if (initialRows.length > 0 && rawRows.length === 0) {
      rawRows = [...initialRows];
      currentStep = 2;
    }
  });

  // 纠错阶段筛选状态：'all' | 'errors' | 'valid'
  let errorFilter = $state<'all' | 'errors' | 'valid'>('all');

  // 导入执行态
  let isImporting = $state(false);
  let importProgress = $state(0);
  let importResult = $state<{ successCount: number; failCount: number } | null>(null);

  // 解析源字段
  const parsedSourceFields = $derived.by<SourceField[]>(() => {
    if (rawRows.length === 0) return [];
    const first = rawRows[0];
    if (!first) return [];
    return Object.keys(first).map((k) => ({
      name: k,
      label: k,
      sample: first[k],
    }));
  });

  // 简易 CSV 文本解析
  function parseCsvText(text: string) {
    const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return;
    const headerLine = lines[0];
    if (!headerLine) return;
    const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] ?? '';
      });
      rows.push(obj);
    }

    rawRows = rows;
    currentStep = 2;
  }

  // 根据当前映射规则计算转换后的规范数据行
  const mappedRows = $derived.by<Record<string, unknown>[]>(() => {
    return rawRows.map((rawRow) => {
      const result: Record<string, unknown> = {};
      for (const tf of targetFields) {
        const rule = mappingRules.find((r) => r.targetField === tf.name);
        let val = rule && rule.sourceField ? rawRow[rule.sourceField] : rawRow[tf.name];

        if (val === undefined || val === null || val === '') {
          val = rule?.fallbackValue ?? tf.defaultValue ?? '';
        }

        if (rule?.transform === 'uppercase' && typeof val === 'string') {
          val = val.toUpperCase();
        } else if (rule?.transform === 'lowercase' && typeof val === 'string') {
          val = val.toLowerCase();
        } else if (rule?.transform === 'trim' && typeof val === 'string') {
          val = val.trim();
        } else if (rule?.transform === 'number') {
          const num = Number(val);
          val = isNaN(num) ? val : num;
        }

        result[tf.name] = val;
      }
      return result;
    });
  });

  // 就地纠错：数据修改
  function updateCell(rowIndex: number, field: string, nextValue: unknown) {
    const next = [...rawRows];
    const currentRow = next[rowIndex];
    if (!currentRow) return;

    // 查找映射对应的源字段
    const rule = mappingRules.find((r) => r.targetField === field);
    const sourceKey = rule?.sourceField ?? field;

    next[rowIndex] = {
      ...currentRow,
      [sourceKey]: nextValue,
    };
    rawRows = next;
  }

  // 剔除单行
  function removeRow(rowIndex: number) {
    rawRows = rawRows.filter((_, idx) => idx !== rowIndex);
  }

  // 质检校验计算
  const validationErrors = $derived.by<PipelineValidationError[]>(() => {
    const errors: PipelineValidationError[] = [];
    mappedRows.forEach((row, rowIndex) => {
      // 1. 目标必填项校验
      targetFields.forEach((tf) => {
        if (tf.required) {
          const val = row[tf.name];
          if (val === undefined || val === null || val === '') {
            errors.push({
              rowIndex,
              field: tf.name,
              message: `${tf.label}为必填字段，不能为空`,
            });
          }
        }
      });

      // 2. 外部校验规则
      validationRules.forEach((rule) => {
        const val = row[rule.field];
        if (rule.required && (val === undefined || val === null || val === '')) {
          errors.push({
            rowIndex,
            field: rule.field,
            message: rule.errorMessage || `${rule.field} 不能为空`,
          });
        }
        if (rule.pattern && typeof val === 'string' && !rule.pattern.test(val)) {
          errors.push({
            rowIndex,
            field: rule.field,
            message: rule.errorMessage || `${rule.field} 格式校验未通过`,
          });
        }
        if (rule.customValidator) {
          const err = rule.customValidator(val, row);
          if (err) {
            errors.push({
              rowIndex,
              field: rule.field,
              message: err,
            });
          }
        }
      });
    });
    return errors;
  });

  // 行错误索引快速映射
  const rowErrorMap = $derived.by(() => {
    const map = new Map<number, PipelineValidationError[]>();
    validationErrors.forEach((err) => {
      const list = map.get(err.rowIndex) || [];
      list.push(err);
      map.set(err.rowIndex, list);
    });
    return map;
  });

  // 过滤后的显示行
  const displayRowsWithIndex = $derived.by(() => {
    return mappedRows
      .map((row, index) => ({ row, index, errors: rowErrorMap.get(index) || [] }))
      .filter((item) => {
        if (errorFilter === 'errors') return item.errors.length > 0;
        if (errorFilter === 'valid') return item.errors.length === 0;
        return true;
      });
  });

  // 批量导入处理
  async function handleExecuteImport() {
    isImporting = true;
    importProgress = 10;
    currentStep = 4;

    // 过滤出完全合规的数据行
    const validRows = mappedRows.filter((_, idx) => !rowErrorMap.has(idx));

    // 模拟或真实执行导入回调
    try {
      importProgress = 40;
      if (onimport) {
        const res = await onimport(validRows);
        importResult = res;
      } else {
        importResult = {
          successCount: validRows.length,
          failCount: rawRows.length - validRows.length,
        };
      }
      importProgress = 100;
    } finally {
      isImporting = false;
    }
  }

  function handleResetPipeline() {
    rawRows = [];
    pasteContent = '';
    mappingRules = [];
    importResult = null;
    currentStep = 1;
  }
</script>

<div
  class={cn(
    'flex flex-col rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all',
    className
  )}
  data-svadmin-component="DataImportPipeline"
>
  <!-- 顶部主标题与步骤条 -->
  <div class="border-b border-border/60 p-5">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-base font-semibold tracking-tight">{title}</h2>
        <p class="text-xs text-muted-foreground">企业级多阶段批量数据导入、字段映射与行内纠错清洗</p>
      </div>

      <!-- 步骤指示器 -->
      <nav aria-label="导入进度步骤" class="flex items-center gap-2">
        {#each [
          { step: 1, label: '数据源录入' },
          { step: 2, label: '字段映射' },
          { step: 3, label: '质检纠错' },
          { step: 4, label: '批量入库' },
        ] as s (s.step)}
          <div class="flex items-center gap-2">
            <div
              class={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                currentStep === s.step
                  ? 'bg-primary text-primary-foreground'
                  : currentStep > s.step
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {#if currentStep > s.step}
                <Check class="h-3.5 w-3.5" />
              {:else}
                {s.step}
              {/if}
            </div>
            <span
              class={cn(
                'text-xs font-medium',
                currentStep === s.step ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {s.label}
            </span>
            {#if s.step < 4}
              <div class="h-px w-4 bg-border"></div>
            {/if}
          </div>
        {/each}
      </nav>
    </div>
  </div>

  <!-- 步骤 1: 数据录入与解析 -->
  {#if currentStep === 1}
    <div class="p-6">
      <div class="rounded-lg border-2 border-dashed border-border/80 p-8 text-center transition-colors hover:border-primary/50">
        <UploadCloud class="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 class="mt-3 text-sm font-semibold">粘贴 CSV 文本或选择文件</h3>
        <p class="mt-1 text-xs text-muted-foreground">首行为列名（逗号分隔），支持大批量结构化数据解析</p>

        <div class="mx-auto mt-4 max-w-lg">
          <textarea
            bind:value={pasteContent}
            rows={5}
            placeholder="示例：&#10;name,email,age&#10;张三,zhangsan@example.com,28&#10;李四,invalid-email,32"
            class="w-full rounded-md border border-input bg-background p-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          ></textarea>
        </div>

        <div class="mt-4 flex justify-center gap-3">
          <button
            type="button"
            disabled={!pasteContent.trim() || isParsing}
            class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
            onclick={() => parseCsvText(pasteContent)}
          >
            <span>开始解析</span>
            <ArrowRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- 步骤 2: 字段映射 -->
  {#if currentStep === 2}
    <div class="p-6">
      <FieldMappingBuilder
        sourceFields={parsedSourceFields}
        {targetFields}
        sourceSampleRows={rawRows}
        onchange={(rules) => (mappingRules = rules)}
      />

      <div class="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-muted"
          onclick={() => (currentStep = 1)}
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          <span>返回上一步</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90"
          onclick={() => (currentStep = 3)}
        >
          <span>进入数据质检与纠错 ({rawRows.length} 条)</span>
          <ArrowRight class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  {/if}

  <!-- 步骤 3: 质检与行内就地纠错 -->
  {#if currentStep === 3}
    <div class="p-6">
      <!-- 质检统计看板 -->
      <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div class="rounded-lg border border-border/60 bg-muted/20 p-3">
          <span class="text-xs text-muted-foreground">总导入记录</span>
          <p class="text-xl font-bold text-foreground">{rawRows.length}</p>
        </div>
        <div class="rounded-lg border border-border/60 bg-emerald-500/5 p-3">
          <span class="text-xs text-emerald-600 dark:text-emerald-400">合规有效记录</span>
          <p class="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {rawRows.length - rowErrorMap.size}
          </p>
        </div>
        <div class="rounded-lg border border-border/60 bg-amber-500/5 p-3">
          <span class="text-xs text-amber-600 dark:text-amber-400">存在校验异常</span>
          <p class="text-xl font-bold text-amber-600 dark:text-amber-400">{rowErrorMap.size}</p>
        </div>
        <div class="rounded-lg border border-border/60 bg-muted/20 p-3">
          <span class="text-xs text-muted-foreground">错误总项数</span>
          <p class="text-xl font-bold text-foreground">{validationErrors.length}</p>
        </div>
      </div>

      <!-- 筛选与批量操作栏 -->
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-1 rounded-lg border border-border bg-background p-1 text-xs">
          <button
            type="button"
            class={cn(
              'rounded px-2.5 py-1 transition-colors',
              errorFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
            onclick={() => (errorFilter = 'all')}
          >
            全部 ({mappedRows.length})
          </button>
          <button
            type="button"
            class={cn(
              'rounded px-2.5 py-1 transition-colors',
              errorFilter === 'errors' ? 'bg-amber-500 text-white' : 'text-muted-foreground hover:bg-muted'
            )}
            onclick={() => (errorFilter = 'errors')}
          >
            仅看异常 ({rowErrorMap.size})
          </button>
          <button
            type="button"
            class={cn(
              'rounded px-2.5 py-1 transition-colors',
              errorFilter === 'valid' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:bg-muted'
            )}
            onclick={() => (errorFilter = 'valid')}
          >
            仅看合规 ({rawRows.length - rowErrorMap.size})
          </button>
        </div>

        <span class="text-xs text-muted-foreground">提示：点击单元格即可直接就地纠错编辑</span>
      </div>

      <!-- 行内纠错可编辑表格 -->
      <div class="max-h-96 overflow-auto rounded-lg border border-border/80 bg-background">
        <table class="w-full text-left text-xs">
          <thead class="sticky top-0 z-10 border-b border-border/60 bg-muted/80 font-medium text-muted-foreground backdrop-blur">
            <tr>
              <th class="px-3 py-2 text-center w-12">#</th>
              <th class="px-3 py-2 w-16">状态</th>
              {#each targetFields as target (target.name)}
                <th class="px-3 py-2 whitespace-nowrap">{target.label}</th>
              {/each}
              <th class="px-3 py-2 text-center w-16">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/40 font-mono">
            {#each displayRowsWithIndex as item (item.index)}
              {@const hasErr = item.errors.length > 0}
              <tr class={cn('hover:bg-muted/30 transition-colors', hasErr ? 'bg-amber-500/5' : '')}>
                <td class="px-3 py-2 text-center text-muted-foreground">{item.index + 1}</td>
                <td class="px-3 py-2">
                  {#if hasErr}
                    <span class="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600 dark:text-amber-400" title={item.errors.map((e) => e.message).join('; ')}>
                      <AlertCircle class="h-3 w-3" />
                      <span>{item.errors.length}</span>
                    </span>
                  {:else}
                    <span class="inline-flex items-center rounded bg-emerald-500/10 p-0.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 class="h-3.5 w-3.5" />
                    </span>
                  {/if}
                </td>

                {#each targetFields as target (target.name)}
                  {@const cellErr = item.errors.find((e) => e.field === target.name)}
                  <td class="px-2 py-1">
                    <input
                      type="text"
                      value={String(item.row[target.name] ?? '')}
                      oninput={(e) => updateCell(item.index, target.name, e.currentTarget.value)}
                      class={cn(
                        'h-8 w-full rounded border bg-transparent px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1',
                        cellErr
                          ? 'border-amber-500/80 bg-amber-500/10 text-amber-900 dark:text-amber-100 focus-visible:ring-amber-500'
                          : 'border-transparent hover:border-input focus-visible:border-input focus-visible:ring-ring'
                      )}
                      title={cellErr ? cellErr.message : undefined}
                    />
                  </td>
                {/each}

                <td class="px-3 py-2 text-center">
                  <button
                    type="button"
                    class="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onclick={() => removeRow(item.index)}
                    title="从导入列表剔除此行"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- 底部控制按钮 -->
      <div class="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-muted"
          onclick={() => (currentStep = 2)}
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          <span>返回字段映射</span>
        </button>

        <button
          type="button"
          disabled={rowErrorMap.size > 0}
          class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          onclick={handleExecuteImport}
        >
          <Play class="h-3.5 w-3.5" />
          <span>确认导入全部合规数据 ({rawRows.length - rowErrorMap.size} 条)</span>
        </button>
      </div>
    </div>
  {/if}

  <!-- 步骤 4: 批量入库状态与汇总结果 -->
  {#if currentStep === 4}
    <div class="p-8 text-center">
      {#if isImporting}
        <Loader2 class="mx-auto h-10 w-10 animate-spin text-primary" />
        <h3 class="mt-4 text-sm font-semibold">正在批量同步导入数据...</h3>
        <p class="mt-1 text-xs text-muted-foreground">处理中，请稍候不要关闭页面</p>
        <div class="mx-auto mt-4 max-w-xs">
          <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div class="h-full bg-primary transition-all duration-300" style="width: {importProgress}%"></div>
          </div>
        </div>
      {:else if importResult}
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 class="h-6 w-6" />
        </div>
        <h3 class="mt-4 text-base font-semibold">批量数据导入完成</h3>
        <p class="mt-1 text-xs text-muted-foreground">
          成功入库 <span class="font-bold text-emerald-600 dark:text-emerald-400">{importResult.successCount}</span> 条数据
          {#if importResult.failCount > 0}
            ，未导入/被剔除 <span class="font-bold text-amber-600 dark:text-amber-400">{importResult.failCount}</span> 条
          {/if}
        </p>

        <div class="mt-6 flex justify-center gap-3">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
            onclick={handleResetPipeline}
          >
            <RotateCcw class="h-3.5 w-3.5" />
            <span>发起新的批量导入</span>
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
