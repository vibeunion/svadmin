<script lang="ts">
  import { CheckCircle2, AlertCircle, Trash2, Check, Filter, Loader2, ArrowRight } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface RowValidationError {
    rowIndex: number;
    field: string;
    message: string;
  }

  export interface ImportPreviewValidatorProps {
    /** 预览列定义 */
    columns: Array<{ key: string; label: string }>;
    /** 解析出的各行数据数组 */
    rows: Array<Record<string, unknown>>;
    /** 校验错误列表 */
    errors?: RowValidationError[] | undefined;
    /** 行内修改单元格回调 */
    onrowchange?: ((rowIndex: number, field: string, newValue: string) => void) | undefined;
    /** 删除某行回调 */
    onremoverow?: ((rowIndex: number) => void) | undefined;
    /** 提交导入回调 */
    onsubmit?: ((validRows: Array<Record<string, unknown>>) => Promise<void> | void) | undefined;
    class?: string | undefined;
  }

  let {
    columns = [],
    rows = [],
    errors = [],
    onrowchange,
    onremoverow,
    onsubmit,
    class: className = '',
  }: ImportPreviewValidatorProps = $props();

  let filterOnlyErrors = $state(false);
  let isSubmitting = $state(false);

  const errorMap = $derived.by(() => {
    const map = new Map<string, string>();
    for (const err of errors) {
      map.set(`${err.rowIndex}_${err.field}`, err.message);
    }
    return map;
  });

  const rowErrorIndices = $derived.by(() => {
    return new Set(errors.map((e) => e.rowIndex));
  });

  const displayRows = $derived.by(() => {
    return rows
      .map((row, index) => ({ row, index }))
      .filter(({ index }) => (filterOnlyErrors ? rowErrorIndices.has(index) : true));
  });

  const validCount = $derived(rows.length - rowErrorIndices.size);
  const invalidCount = $derived(rowErrorIndices.size);

  async function handleConfirmSubmit() {
    if (isSubmitting || rows.length === 0) return;
    isSubmitting = true;
    try {
      const validRows = rows.filter((_, idx) => !rowErrorIndices.has(idx));
      if (onsubmit) {
        await onsubmit(validRows);
      }
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div
  class={cn('rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs space-y-4', className)}
  data-svadmin-component="ImportPreviewValidator"
>
  <!-- Header & Stats Summary -->
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
    <div>
      <h3 class="font-bold text-sm text-foreground">导入前数据预检与行内修正</h3>
      <p class="text-xs text-muted-foreground mt-0.5">高亮异常数据，支持就地双击订正后直接入库</p>
    </div>

    <!-- Stats summary badges -->
    <div class="flex items-center gap-3 text-xs font-mono">
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted text-muted-foreground">
        总待导入: <strong class="text-foreground">{rows.length}</strong> 行
      </span>
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-success/10 text-success font-semibold">
        <CheckCircle2 class="h-3.5 w-3.5" />
        {validCount} 行正常
      </span>
      {#if invalidCount > 0}
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-destructive/10 text-destructive font-semibold">
          <AlertCircle class="h-3.5 w-3.5" />
          {invalidCount} 行格式异常
        </span>
      {/if}
    </div>
  </header>

  <!-- Filter Toggle -->
  <div class="flex items-center justify-between text-xs">
    <div class="flex items-center gap-2">
      <button
        type="button"
        class={cn(
          'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-medium transition-colors cursor-pointer',
          !filterOnlyErrors
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background text-muted-foreground hover:text-foreground'
        )}
        onclick={() => (filterOnlyErrors = false)}
      >
        <span>全部数据 ({rows.length})</span>
      </button>

      {#if invalidCount > 0}
        <button
          type="button"
          class={cn(
            'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-medium transition-colors cursor-pointer',
            filterOnlyErrors
              ? 'border-destructive bg-destructive text-destructive-foreground'
              : 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
          )}
          onclick={() => (filterOnlyErrors = true)}
        >
          <Filter class="h-3 w-3" />
          <span>仅看异常行 ({invalidCount})</span>
        </button>
      {/if}
    </div>

    <span class="text-[11px] text-muted-foreground font-mono">
      可直接在输入框内修改内容订正
    </span>
  </div>

  <!-- Data Table with Inline Editing -->
  <div class="rounded-lg border border-border overflow-x-auto max-h-96">
    <table class="w-full border-collapse text-xs">
      <thead class="bg-muted/40 border-b border-border text-muted-foreground font-mono sticky top-0 z-10">
        <tr>
          <th class="p-2.5 text-center w-12 font-medium">#</th>
          {#each columns as col (col.key)}
            <th class="p-2.5 text-left font-medium">{col.label}</th>
          {/each}
          <th class="p-2.5 text-center w-12 font-medium">操作</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/60">
        {#each displayRows as { row, index } (index)}
          {@const hasError = rowErrorIndices.has(index)}
          <tr class={cn('hover:bg-muted/20 transition-colors', hasError && 'bg-destructive/5')}>
            <!-- Row Index & Error indicator -->
            <td class="p-2.5 text-center font-mono text-muted-foreground">
              {#if hasError}
                <span class="text-destructive font-bold" title="该行包含校验错误">!{index + 1}</span>
              {:else}
                <span class="text-success">✓</span>
              {/if}
            </td>

            <!-- Columns Input / Cells -->
            {#each columns as col (col.key)}
              {@const cellErr = errorMap.get(`${index}_${col.key}`)}
              {@const val = String(row[col.key] ?? '')}
              <td class="p-1.5">
                <div class="relative">
                  <input
                    type="text"
                    class={cn(
                      'w-full rounded px-2 py-1 font-mono text-xs outline-none transition-all',
                      cellErr
                        ? 'border border-destructive bg-destructive/10 text-destructive font-semibold'
                        : 'border border-transparent hover:border-border focus:border-primary bg-transparent text-foreground focus:bg-background'
                    )}
                    value={val}
                    onchange={(e) => onrowchange?.(index, col.key, (e.currentTarget as HTMLInputElement).value)}
                    title={cellErr ?? undefined}
                  />
                  {#if cellErr}
                    <span class="block text-[10px] text-destructive mt-0.5 font-sans leading-tight">
                      {cellErr}
                    </span>
                  {/if}
                </div>
              </td>
            {/each}

            <!-- Remove Action -->
            <td class="p-2 text-center">
              <button
                type="button"
                class="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                onclick={() => onremoverow?.(index)}
                aria-label="Remove row"
                title="忽略/移除该行"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Footer Actions -->
  <footer class="flex items-center justify-between border-t border-border pt-3 text-xs">
    <div class="text-muted-foreground">
      {#if invalidCount > 0}
        <span>当前仍有 <strong>{invalidCount}</strong> 行异常，提交时将仅导入合法的 <strong>{validCount}</strong> 行。</span>
      {:else}
        <span class="text-success font-semibold flex items-center gap-1">
          <Check class="h-3.5 w-3.5" /> 全部数据校验通过，可放心入库
        </span>
      {/if}
    </div>

    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-2xs"
      onclick={handleConfirmSubmit}
      disabled={isSubmitting || validCount === 0}
    >
      {#if isSubmitting}
        <Loader2 class="h-3.5 w-3.5 animate-spin" />
        <span>正在入库提交...</span>
      {:else}
        <span>确认导入 ({validCount} 条正常数据)</span>
        <ArrowRight class="h-3.5 w-3.5" />
      {/if}
    </button>
  </footer>
</div>
