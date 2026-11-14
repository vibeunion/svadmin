<script lang="ts">
  import { ArrowRight, Sparkles, AlertCircle, CheckCircle2, RotateCcw, Link2, Eye, EyeOff } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface SourceField {
    name: string;
    label?: string | undefined;
    sample?: unknown | undefined;
    type?: 'string' | 'number' | 'boolean' | 'date' | undefined;
  }

  export interface TargetField {
    name: string;
    label: string;
    required?: boolean | undefined;
    type?: 'string' | 'number' | 'boolean' | 'date' | undefined;
    description?: string | undefined;
    defaultValue?: unknown | undefined;
  }

  export type TransformType = 'direct' | 'uppercase' | 'lowercase' | 'trim' | 'number' | 'fallback';

  export interface FieldMappingRule {
    targetField: string;
    sourceField?: string | undefined;
    transform?: TransformType | undefined;
    fallbackValue?: string | undefined;
  }

  export interface FieldMappingBuilderProps {
    /** 外部源字段列表（如来自 CSV 表头或三方接口） */
    sourceFields: SourceField[];
    /** 本系统目标字段要求规范 */
    targetFields: TargetField[];
    /** 当前映射规则列表 */
    value?: FieldMappingRule[] | undefined;
    /** 选填源数据样本行，用于实时推演目标值 */
    sourceSampleRows?: Record<string, unknown>[] | undefined;
    /** 映射变更事件 */
    onchange?: ((rules: FieldMappingRule[]) => void) | undefined;
    /** 是否只读禁用 */
    disabled?: boolean | undefined;
    class?: string | undefined;
  }

  let {
    sourceFields = [],
    targetFields = [],
    value,
    sourceSampleRows = [],
    onchange,
    disabled = false,
    class: className = '',
  }: FieldMappingBuilderProps = $props();

  let internalRules = $state<FieldMappingRule[]>([]);
  let showPreview = $state(false);

  // 辅助函数：标准化字段名称以进行模糊智能识别
  function normalizeKey(str: string): string {
    return str.toLowerCase().replace(/[-_\s]/g, '');
  }

  // 初始化或当 targetFields 变动时补充未包含的目标字段
  $effect(() => {
    if (value && value.length > 0) {
      internalRules = [...value];
    } else {
      // 默认尝试一次自动匹配
      internalRules = targetFields.map((tf) => {
        const normTarget = normalizeKey(tf.name);
        const normLabel = normalizeKey(tf.label);
        const match = sourceFields.find((sf) => {
          const normSource = normalizeKey(sf.name);
          const normSourceLabel = sf.label ? normalizeKey(sf.label) : '';
          return (
            normSource === normTarget ||
            normSource === normLabel ||
            (normSourceLabel && normSourceLabel === normLabel) ||
            normSource.includes(normTarget) ||
            normTarget.includes(normSource)
          );
        });

        return {
          targetField: tf.name,
          sourceField: match ? match.name : undefined,
          transform: 'direct',
        };
      });
    }
  });

  function updateRule(targetFieldName: string, patch: Partial<FieldMappingRule>) {
    if (disabled) return;
    const next = internalRules.map((r) => {
      if (r.targetField === targetFieldName) {
        return { ...r, ...patch };
      }
      return r;
    });
    internalRules = next;
    onchange?.(next);
  }

  function handleAutoMatch() {
    if (disabled) return;
    const next = targetFields.map((tf) => {
      const normTarget = normalizeKey(tf.name);
      const normLabel = normalizeKey(tf.label);
      const match = sourceFields.find((sf) => {
        const normSource = normalizeKey(sf.name);
        const normSourceLabel = sf.label ? normalizeKey(sf.label) : '';
        return (
          normSource === normTarget ||
          normSource === normLabel ||
          (normSourceLabel && normSourceLabel === normLabel) ||
          normSource.includes(normTarget) ||
          normTarget.includes(normSource)
        );
      });

      return {
        targetField: tf.name,
        sourceField: match ? match.name : undefined,
        transform: 'direct' as TransformType,
      };
    });
    internalRules = next;
    onchange?.(next);
  }

  function handleResetAll() {
    if (disabled) return;
    const next = targetFields.map((tf) => ({
      targetField: tf.name,
      sourceField: undefined,
      transform: 'direct' as TransformType,
    }));
    internalRules = next;
    onchange?.(next);
  }

  // 统计指标计算
  const stats = $derived.by(() => {
    let totalTargets = targetFields.length;
    let mappedCount = 0;
    let missingRequired = 0;

    for (const tf of targetFields) {
      const rule = internalRules.find((r) => r.targetField === tf.name);
      const isMapped = Boolean(rule && (rule.sourceField || rule.fallbackValue));
      if (isMapped) {
        mappedCount += 1;
      } else if (tf.required) {
        missingRequired += 1;
      }
    }

    const isValid = missingRequired === 0;
    const percent = totalTargets > 0 ? Math.round((mappedCount / totalTargets) * 100) : 100;

    return { totalTargets, mappedCount, missingRequired, isValid, percent };
  });

  // 推演样本数据
  const transformedSamples = $derived.by(() => {
    if (sourceSampleRows.length === 0) return [];
    return sourceSampleRows.slice(0, 3).map((row) => {
      const result: Record<string, unknown> = {};
      for (const tf of targetFields) {
        const rule = internalRules.find((r) => r.targetField === tf.name);
        let rawVal = rule && rule.sourceField ? row[rule.sourceField] : undefined;

        if (rawVal === undefined || rawVal === null || rawVal === '') {
          rawVal = rule?.fallbackValue ?? tf.defaultValue ?? '';
        }

        if (rule?.transform === 'uppercase' && typeof rawVal === 'string') {
          rawVal = rawVal.toUpperCase();
        } else if (rule?.transform === 'lowercase' && typeof rawVal === 'string') {
          rawVal = rawVal.toLowerCase();
        } else if (rule?.transform === 'trim' && typeof rawVal === 'string') {
          rawVal = rawVal.trim();
        } else if (rule?.transform === 'number') {
          const num = Number(rawVal);
          rawVal = isNaN(num) ? rawVal : num;
        }

        result[tf.name] = rawVal;
      }
      return result;
    });
  });
</script>

<div
  class={cn(
    'rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all',
    className
  )}
  data-svadmin-component="FieldMappingBuilder"
>
  <!-- 头部控制栏与状态摘要 -->
  <div class="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 p-4">
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Link2 class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-sm font-semibold tracking-tight">字段映射与转换规则</h3>
        <p class="text-xs text-muted-foreground">
          将导入文件或三方源字段映射至本系统目标数据模型
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <!-- 映射完成度指示徽标 -->
      <div
        class={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
          stats.isValid
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        )}
      >
        {#if stats.isValid}
          <CheckCircle2 class="h-3.5 w-3.5" />
          <span>必填字段均已映射 ({stats.mappedCount}/{stats.totalTargets})</span>
        {:else}
          <AlertCircle class="h-3.5 w-3.5" />
          <span>尚有 {stats.missingRequired} 个必填项未映射</span>
        {/if}
      </div>

      {#if sourceSampleRows.length > 0}
        <button
          type="button"
          class="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-muted"
          onclick={() => (showPreview = !showPreview)}
        >
          {#if showPreview}
            <EyeOff class="h-3.5 w-3.5" />
            <span>隐藏推演</span>
          {:else}
            <Eye class="h-3.5 w-3.5" />
            <span>实时推演</span>
          {/if}
        </button>
      {/if}

      <button
        type="button"
        disabled={disabled}
        class="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
        onclick={handleAutoMatch}
      >
        <Sparkles class="h-3.5 w-3.5" />
        <span>智能自动匹配</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        class="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
        onclick={handleResetAll}
        title="清空全部映射"
      >
        <RotateCcw class="h-3.5 w-3.5" />
        <span>重置</span>
      </button>
    </div>
  </div>

  <!-- 映射主列表 -->
  <div class="divide-y divide-border/40">
    <div class="grid grid-cols-12 gap-3 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
      <div class="col-span-4">目标模型字段 (Target Schema)</div>
      <div class="col-span-1 text-center">关联</div>
      <div class="col-span-4">导入数据源字段 (Source Field)</div>
      <div class="col-span-3">清洗与转换 (Transform)</div>
    </div>

    {#each targetFields as target (target.name)}
      {@const rule = internalRules.find((r) => r.targetField === target.name)}
      {@const isMapped = Boolean(rule && (rule.sourceField || rule.fallbackValue))}
      {@const isMissingRequired = target.required && !isMapped}

      <div
        class={cn(
          'grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/30',
          isMissingRequired ? 'bg-amber-500/5' : ''
        )}
      >
        <!-- 目标字段描述 -->
        <div class="col-span-4 flex flex-col gap-0.5">
          <div class="flex items-center gap-1.5">
            <span class="font-medium text-foreground">{target.label}</span>
            <code class="rounded bg-muted px-1 py-0.5 text-[11px] text-muted-foreground">{target.name}</code>
            {#if target.required}
              <span class="rounded bg-rose-500/10 px-1 py-0.2 text-[10px] font-semibold text-rose-500">必填</span>
            {/if}
          </div>
          {#if target.description}
            <span class="text-xs text-muted-foreground">{target.description}</span>
          {/if}
        </div>

        <!-- 连线指示箭头 -->
        <div class="col-span-1 flex justify-center text-muted-foreground">
          <ArrowRight class={cn('h-4 w-4', isMapped ? 'text-primary' : 'opacity-40')} />
        </div>

        <!-- 选择源字段 -->
        <div class="col-span-4 flex items-center gap-2">
          <select
            disabled={disabled}
            value={rule?.sourceField ?? ''}
            onchange={(e) => updateRule(target.name, { sourceField: e.currentTarget.value || undefined })}
            class={cn(
              'h-9 w-full rounded-md border bg-background px-3 py-1 text-xs text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              isMissingRequired ? 'border-amber-500/60 ring-amber-500/30' : 'border-input'
            )}
          >
            <option value="">-- 未映射 (使用空值或回退值) --</option>
            {#each sourceFields as source (source.name)}
              <option value={source.name}>
                {source.label ? `${source.label} (${source.name})` : source.name}
              </option>
            {/each}
          </select>
        </div>

        <!-- 转换选项与回退默认值 -->
        <div class="col-span-3 flex items-center gap-2">
          <select
            disabled={disabled}
            value={rule?.transform ?? 'direct'}
            onchange={(e) => updateRule(target.name, { transform: e.currentTarget.value as TransformType })}
            class="h-9 w-28 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="direct">直接映射</option>
            <option value="trim">去除前后空格</option>
            <option value="uppercase">全大写</option>
            <option value="lowercase">全小写</option>
            <option value="number">转为数值</option>
            <option value="fallback">固定回退值</option>
          </select>

          {#if rule?.transform === 'fallback' || !rule?.sourceField}
            <input
              type="text"
              disabled={disabled}
              placeholder="默认回退值"
              value={rule?.fallbackValue ?? ''}
              oninput={(e) => updateRule(target.name, { fallbackValue: e.currentTarget.value })}
              class="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- 样本实时推演对比抽屉 -->
  {#if showPreview && transformedSamples.length > 0}
    <div class="border-t border-border/80 bg-muted/20 p-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs font-semibold text-foreground">目标数据样本推演结果 (前 3 条)</span>
        <span class="text-[11px] text-muted-foreground">根据当前映射及清洗规则实时计算</span>
      </div>
      <div class="overflow-x-auto rounded-lg border border-border/60 bg-background">
        <table class="w-full text-left text-xs">
          <thead class="border-b border-border/60 bg-muted/40 font-medium text-muted-foreground">
            <tr>
              {#each targetFields as target}
                <th class="px-3 py-2 whitespace-nowrap">{target.label}</th>
              {/each}
            </tr>
          </thead>
          <tbody class="divide-y divide-border/40">
            {#each transformedSamples as sampleRow, idx}
              <tr class="hover:bg-muted/30">
                {#each targetFields as target}
                  <td class="px-3 py-1.5 text-foreground whitespace-nowrap font-mono text-[11px]">
                    {String(sampleRow[target.name] ?? '-')}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
