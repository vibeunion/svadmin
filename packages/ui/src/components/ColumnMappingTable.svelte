<script lang="ts">
  import { untrack } from 'svelte';
  import { ArrowRightLeft, AlertTriangle, CheckCircle2, Table } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface TargetFieldConfig {
    key: string;
    label: string;
    type?: string | undefined;
    required?: boolean | undefined;
    description?: string | undefined;
  }

  export interface ColumnMappingTableProps {
    /** 目标系统字段规范 */
    targetFields: TargetFieldConfig[];
    /** 源文件解析出的表头列名 */
    sourceColumns: string[];
    /** 每列前若干行样本数据，辅助操作员核对 */
    sampleData?: Record<string, unknown[]> | undefined;
    /** 初始映射关系 (targetFieldKey -> sourceColumnName) */
    initialMapping?: Record<string, string> | undefined;
    /** 映射关系发生变更时的回调 */
    onmappingchange?: ((mapping: Record<string, string>) => void) | undefined;
    class?: string | undefined;
  }

  let {
    targetFields = [],
    sourceColumns = [],
    sampleData = {},
    initialMapping,
    onmappingchange,
    class: className = '',
  }: ColumnMappingTableProps = $props();

  function autoInferMapping(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const tf of targetFields) {
      const tfLabel = tf.label.toLowerCase().replace(/[\s_-]+/g, '');
      const tfKey = tf.key.toLowerCase().replace(/[\s_-]+/g, '');

      const matched = sourceColumns.find((sc) => {
        const scClean = sc.toLowerCase().replace(/[\s_-]+/g, '');
        return scClean === tfLabel || scClean === tfKey || scClean.includes(tfLabel);
      });

      if (matched) {
        map[tf.key] = matched;
      }
    }
    return map;
  }

  let currentMapping = $state<Record<string, string>>(
    untrack(() => initialMapping ?? autoInferMapping())
  );

  function handleSelectColumn(targetKey: string, sourceCol: string) {
    if (sourceCol === '') {
      currentMapping = Object.fromEntries(Object.entries(currentMapping).filter(([k]) => k !== targetKey));
    } else {
      currentMapping = { ...currentMapping, [targetKey]: sourceCol };
    }
    onmappingchange?.(currentMapping);
  }

  const unmappedRequiredFields = $derived.by(() => {
    return targetFields.filter((tf) => tf.required && !currentMapping[tf.key]);
  });
</script>

<div
  class={cn('rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs space-y-4', className)}
  data-svadmin-component="ColumnMappingTable"
>
  <!-- Header -->
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
    <div class="flex items-center gap-2">
      <Table class="h-4 w-4 text-primary" />
      <h3 class="font-bold text-sm text-foreground">字段映射配置表 (Column Mapping)</h3>
    </div>
    <span class="text-xs font-mono text-muted-foreground">
      已映射: <strong class="text-foreground">{Object.keys(currentMapping).length}</strong> / {targetFields.length} 个字段
    </span>
  </header>

  <!-- Required Warning if missing -->
  {#if unmappedRequiredFields.length > 0}
    <div class="rounded-lg bg-warning/10 border border-warning/30 p-3 flex items-start gap-2 text-xs text-warning">
      <AlertTriangle class="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <span class="font-bold">缺少必填字段映射：</span>
        <span>
          仍有 <strong>{unmappedRequiredFields.length}</strong> 个必填字段尚未映射（{unmappedRequiredFields.map((f) => f.label).join('、')}），请选择源文件对应列。
        </span>
      </div>
    </div>
  {/if}

  <!-- Mapping Table -->
  <div class="rounded-lg border border-border overflow-x-auto">
    <table class="w-full border-collapse text-xs">
      <thead class="bg-muted/40 border-b border-border text-muted-foreground font-mono">
        <tr>
          <th class="p-3 text-left font-medium w-2/5">系统目标字段 (Target Field)</th>
          <th class="p-3 text-center font-medium w-12"><ArrowRightLeft class="h-3.5 w-3.5 mx-auto" /></th>
          <th class="p-3 text-left font-medium w-2/5">源文件表头列 (Source Header)</th>
          <th class="p-3 text-left font-medium w-1/5">样例数据预览 (Sample)</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/60">
        {#each targetFields as tf (tf.key)}
          {@const selectedCol = currentMapping[tf.key] ?? ''}
          {@const samples = selectedCol && sampleData ? sampleData[selectedCol] : undefined}
          <tr class="hover:bg-muted/20 transition-colors">
            <!-- Target Field -->
            <td class="p-3">
              <div class="flex items-center gap-1.5">
                <span class="font-semibold text-foreground">{tf.label}</span>
                {#if tf.required}
                  <span class="text-destructive font-bold" title="必填项">*</span>
                {/if}
                <code class="font-mono text-[11px] text-muted-foreground bg-muted px-1 rounded">{tf.key}</code>
              </div>
              {#if tf.description}
                <span class="text-[11px] text-muted-foreground block mt-0.5">{tf.description}</span>
              {/if}
            </td>

            <!-- Arrow -->
            <td class="p-3 text-center text-muted-foreground select-none">←</td>

            <!-- Source Column Picker -->
            <td class="p-3">
              <select
                class={cn(
                  'svadmin-select w-full text-xs font-mono outline-none focus:ring-1 focus:ring-primary',
                  selectedCol
                    ? 'border-primary/40 font-semibold text-foreground'
                    : tf.required
                      ? 'border-destructive/40 text-muted-foreground bg-destructive/5'
                      : 'border-input text-muted-foreground'
                )}
                value={selectedCol}
                onchange={(e) => handleSelectColumn(tf.key, (e.currentTarget as HTMLSelectElement).value)}
              >
                <option value="">— 不导入此列 (忽略) —</option>
                {#each sourceColumns as sc (sc)}
                  <option value={sc}>{sc}</option>
                {/each}
              </select>
            </td>

            <!-- Sample Data Preview -->
            <td class="p-3 font-mono text-[11px] text-muted-foreground">
              {#if selectedCol && samples && samples.length > 0}
                <span class="truncate block max-w-[180px] text-foreground" title={samples.slice(0, 3).join(', ')}>
                  {samples.slice(0, 3).join(', ')}
                </span>
              {:else if selectedCol}
                <span class="text-success inline-flex items-center gap-1">
                  <CheckCircle2 class="h-3 w-3" /> 已关联
                </span>
              {:else}
                <span class="text-muted-foreground/60">—</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
