<script lang="ts">
  import { Plus, Trash2, RotateCcw, Filter as FilterIcon, Check } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Select } from './ui/select/index.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { CrudOperator, FieldDefinition, FieldFilter, Filter, LogicalFilter } from '@svadmin/core';

  export interface FilterRuleItem {
    id: string;
    field: string;
    operator: CrudOperator;
    value: unknown;
  }

  const i18n = useTranslation();

  interface Props {
    fields?: FieldDefinition[];
    filters?: Filter[];
    logicalOperator?: 'and' | 'or';
    class?: string;
    onApply?: (filters: Filter[]) => void;
    onReset?: () => void;
  }

  let {
    fields = [],
    filters = $bindable([]),
    logicalOperator = $bindable('and'),
    class: className,
    onApply,
    onReset,
  }: Props = $props();

  const operatorOptions: { value: CrudOperator; label: string }[] = [
    { value: 'eq', label: '等于 (eq)' },
    { value: 'ne', label: '不等于 (ne)' },
    { value: 'contains', label: '包含 (contains)' },
    { value: 'ncontains', label: '不包含 (ncontains)' },
    { value: 'gt', label: '大于 (>)' },
    { value: 'gte', label: '大于等于 (>=)' },
    { value: 'lt', label: '小于 (<)' },
    { value: 'lte', label: '小于等于 (<=)' },
    { value: 'null', label: '为空 (null)' },
    { value: 'nnull', label: '非空 (not null)' },
  ];

  let rules = $state<FilterRuleItem[]>([]);

  // Initialize rules from filters prop
  $effect(() => {
    if (filters && filters.length > 0) {
      const parsedRules: FilterRuleItem[] = [];
      let nextLogical: 'and' | 'or' = 'and';

      for (let i = 0; i < filters.length; i++) {
        const item = filters[i];
        if ('field' in item) {
          parsedRules.push({
            id: `rule-${i}-${Date.now()}`,
            field: item.field,
            operator: item.operator,
            value: item.value,
          });
        } else if (item.operator === 'and' || item.operator === 'or') {
          nextLogical = item.operator;
          for (let j = 0; j < item.value.length; j++) {
            const sub = item.value[j];
            if ('field' in sub) {
              parsedRules.push({
                id: `rule-${i}-${j}-${Date.now()}`,
                field: sub.field,
                operator: sub.operator,
                value: sub.value,
              });
            }
          }
        }
      }
      rules = parsedRules;
      logicalOperator = nextLogical;
    } else {
      rules = [];
    }
  });

  const availableFields = $derived(
    fields.filter((f) => f.filterable !== false)
  );

  export function addRule() {
    const firstField = availableFields[0]?.key ?? 'id';
    const firstFieldDef = availableFields.find((f) => f.key === firstField);
    const defaultOp: CrudOperator = firstFieldDef?.type === 'number' ? 'eq' : 'contains';

    rules = [
      ...rules,
      {
        id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        field: firstField,
        operator: defaultOp,
        value: '',
      },
    ];
  }

  export function removeRule(index: number) {
    rules = rules.filter((_, i) => i !== index);
  }

  export function reset() {
    rules = [];
    filters = [];
    onReset?.();
  }

  export function apply() {
    const validFieldFilters: FieldFilter[] = rules
      .filter((r) => r.field && (r.operator === 'null' || r.operator === 'nnull' || (r.value !== '' && r.value !== undefined)))
      .map((r) => ({
        field: r.field,
        operator: r.operator,
        value: r.operator === 'null' || r.operator === 'nnull' ? null : r.value,
      }));

    let compiledFilters: Filter[] = [];
    if (validFieldFilters.length === 1 || logicalOperator === 'and') {
      compiledFilters = validFieldFilters;
    } else if (validFieldFilters.length > 1 && logicalOperator === 'or') {
      const logical: LogicalFilter = {
        operator: 'or',
        value: validFieldFilters,
      };
      compiledFilters = [logical];
    }

    filters = compiledFilters;
    onApply?.(compiledFilters);
  }
</script>

<div class={cn('w-full rounded-lg border border-border bg-card p-4 shadow-xs space-y-3', className)} data-testid="filter-builder">
  <div class="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
    <div class="flex items-center gap-2">
      <FilterIcon class="h-4 w-4 text-muted-foreground" />
      <span class="text-sm font-medium text-foreground">
        {i18n.t('common.filterBuilder', undefined) ?? '高级筛选'}
      </span>
      {#if rules.length > 1}
        <div class="flex items-center rounded-md border border-border bg-muted/40 p-0.5 text-xs">
          <button
            type="button"
            class={cn(
              'rounded px-2 py-0.5 text-xs transition-colors',
              logicalOperator === 'and' ? 'bg-background font-semibold text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            )}
            onclick={() => (logicalOperator = 'and')}
          >
            AND (且)
          </button>
          <button
            type="button"
            class={cn(
              'rounded px-2 py-0.5 text-xs transition-colors',
              logicalOperator === 'or' ? 'bg-background font-semibold text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            )}
            onclick={() => (logicalOperator = 'or')}
          >
            OR (或)
          </button>
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        class="h-8 gap-1 text-xs"
        data-testid="filter-builder-reset"
        onclick={reset}
      >
        <RotateCcw class="h-3.5 w-3.5" />
        {i18n.t('common.reset', undefined) ?? '重置'}
      </Button>
      <Button
        variant="default"
        size="sm"
        class="h-8 gap-1 text-xs"
        data-testid="filter-builder-apply"
        onclick={apply}
      >
        <Check class="h-3.5 w-3.5" />
        {i18n.t('common.confirm', undefined) ?? '应用'}
      </Button>
    </div>
  </div>

  <div class="space-y-2">
    {#each rules as rule, index (rule.id)}
      {@const fieldDef = availableFields.find((f) => f.key === rule.field)}
      <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-md bg-muted/20 p-2 border border-border/40">
        <!-- Field select -->
        <div class="w-36 shrink-0">
          <Select
            class="h-8 text-xs"
            value={rule.field}
            onchange={(e: Event) => {
              rule.field = (e.currentTarget as HTMLSelectElement).value;
            }}
          >
            {#each availableFields as f (f.key)}
              <option value={f.key}>{f.label || f.key}</option>
            {/each}
          </Select>
        </div>

        <!-- Operator select -->
        <div class="w-36 shrink-0">
          <Select
            class="h-8 text-xs"
            value={rule.operator}
            onchange={(e: Event) => {
              rule.operator = (e.currentTarget as HTMLSelectElement).value as CrudOperator;
            }}
          >
            {#each operatorOptions as op (op.value)}
              <option value={op.value}>{op.label}</option>
            {/each}
          </Select>
        </div>

        <!-- Value input -->
        <div class="flex-1 min-w-[120px]">
          {#if rule.operator === 'null' || rule.operator === 'nnull'}
            <div class="h-8 flex items-center px-3 text-xs text-muted-foreground italic bg-muted/30 rounded-md">
              无需填值
            </div>
          {:else if fieldDef?.type === 'select' && fieldDef.options}
            <Select
              class="h-8 text-xs"
              value={String(rule.value ?? '')}
              onchange={(e: Event) => {
                rule.value = (e.currentTarget as HTMLSelectElement).value;
              }}
            >
              <option value="">{i18n.t('field.selectPlaceholder', undefined) ?? '请选择'}</option>
              {#each fieldDef.options as opt (opt.value)}
                <option value={String(opt.value)}>{opt.label}</option>
              {/each}
            </Select>
          {:else if fieldDef?.type === 'boolean'}
            <Select
              class="h-8 text-xs"
              value={String(rule.value ?? '')}
              onchange={(e: Event) => {
                const val = (e.currentTarget as HTMLSelectElement).value;
                rule.value = val === 'true' ? true : val === 'false' ? false : '';
              }}
            >
              <option value="">{i18n.t('field.selectPlaceholder', undefined) ?? '请选择'}</option>
              <option value="true">{i18n.t('common.yes', undefined) ?? '是 (true)'}</option>
              <option value="false">{i18n.t('common.no', undefined) ?? '否 (false)'}</option>
            </Select>
          {:else}
            <Input
              type={fieldDef?.type === 'number' ? 'number' : 'text'}
              class="h-8 text-xs"
              placeholder="输入筛选值..."
              value={String(rule.value ?? '')}
              oninput={(e: Event) => {
                const val = (e.currentTarget as HTMLInputElement).value;
                rule.value = fieldDef?.type === 'number' && val !== '' ? Number(val) : val;
              }}
            />
          {/if}
        </div>

        <!-- Remove button -->
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="shrink-0 text-muted-foreground hover:text-destructive"
          onclick={() => removeRule(index)}
        >
          <Trash2 class="h-3.5 w-3.5" />
        </Button>
      </div>
    {:else}
      <div class="rounded-md border border-dashed border-border/80 py-4 text-center text-xs text-muted-foreground">
        暂无筛选条件，点击下方按钮添加规则
      </div>
    {/each}
  </div>

  <Button
    type="button"
    variant="outline"
    size="sm"
    data-testid="filter-builder-add-rule"
    class="w-full gap-1.5 border-dashed text-xs h-8"
    onclick={addRule}
  >
    <Plus class="h-3.5 w-3.5" />
    {i18n.t('common.addRule', undefined) ?? '添加筛选条件'}
  </Button>
</div>
