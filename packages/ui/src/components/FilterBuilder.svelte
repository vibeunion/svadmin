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

<div class={cn('svadmin-u-6da6a3c3f741 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-cef5b893cf23 svadmin-u-6ed543e2fbbb', className)} data-testid="filter-builder">
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-7fcf9124b5df">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      <FilterIcon class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />
      <span class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">
        {i18n.t('common.filterBuilder', undefined) ?? '高级筛选'}
      </span>
      {#if rules.length > 1}
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-b00f43c30c2b svadmin-u-de8350a3bbad svadmin-u-359090c2d529">
          <button
            type="button"
            class={cn(
              'svadmin-u-07389a777c1f svadmin-u-d5eab218aa34 svadmin-u-465609a240a8 svadmin-u-359090c2d529 svadmin-u-ceb69a6b0e5f',
              logicalOperator === 'and' ? 'svadmin-u-e6f9e383a762 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-cef5b893cf23' : 'svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e'
            )}
            onclick={() => (logicalOperator = 'and')}
          >
            AND (且)
          </button>
          <button
            type="button"
            class={cn(
              'svadmin-u-07389a777c1f svadmin-u-d5eab218aa34 svadmin-u-465609a240a8 svadmin-u-359090c2d529 svadmin-u-ceb69a6b0e5f',
              logicalOperator === 'or' ? 'svadmin-u-e6f9e383a762 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-cef5b893cf23' : 'svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e'
            )}
            onclick={() => (logicalOperator = 'or')}
          >
            OR (或)
          </button>
        </div>
      {/if}
    </div>

    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
      <Button
        variant="ghost"
        size="sm"
        class="svadmin-u-ed8a5df7b2fb svadmin-u-44ee8ba0a421 svadmin-u-359090c2d529"
        data-testid="filter-builder-reset"
        onclick={reset}
      >
        <RotateCcw class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        {i18n.t('common.reset', undefined) ?? '重置'}
      </Button>
      <Button
        variant="default"
        size="sm"
        class="svadmin-u-ed8a5df7b2fb svadmin-u-44ee8ba0a421 svadmin-u-359090c2d529"
        data-testid="filter-builder-apply"
        onclick={apply}
      >
        <Check class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        {i18n.t('common.confirm', undefined) ?? '应用'}
      </Button>
    </div>
  </div>

  <div class="svadmin-u-6f7e013d6499">
    {#each rules as rule, index (rule.id)}
      {@const fieldDef = availableFields.find((f) => f.key === rule.field)}
      <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3fd0f778c8d9 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-421ac2be5045 svadmin-u-967d113a1451 svadmin-u-7660b450905a svadmin-u-ca6bcd4b6f3f svadmin-u-6ee2d41e2d2d">
        <!-- Field select -->
        <div class="svadmin-u-df403bbae8fc svadmin-u-012fbd121f37">
          <Select
            class="svadmin-u-ed8a5df7b2fb svadmin-u-359090c2d529"
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
        <div class="svadmin-u-df403bbae8fc svadmin-u-012fbd121f37">
          <Select
            class="svadmin-u-ed8a5df7b2fb svadmin-u-359090c2d529"
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
        <div class="svadmin-u-36e579c0b41c svadmin-u-a9ef791a0777">
          {#if rule.operator === 'null' || rule.operator === 'nnull'}
            <div class="svadmin-u-ed8a5df7b2fb svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-0e17f2bd9074 svadmin-u-359090c2d529 svadmin-u-bfa603190748 italic svadmin-u-2859c861d7de svadmin-u-421ac2be5045">
              无需填值
            </div>
          {:else if fieldDef?.type === 'select' && fieldDef.options}
            <Select
              class="svadmin-u-ed8a5df7b2fb svadmin-u-359090c2d529"
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
              class="svadmin-u-ed8a5df7b2fb svadmin-u-359090c2d529"
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
              class="svadmin-u-ed8a5df7b2fb svadmin-u-359090c2d529"
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
          class="svadmin-u-012fbd121f37 svadmin-u-bfa603190748 svadmin-u-51e95020d6f2"
          onclick={() => removeRule(index)}
        >
          <Trash2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        </Button>
      </div>
    {:else}
      <div class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-a29b7a649c77 svadmin-u-c9ed8c5f79ae svadmin-u-cb11fec3bb46 svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
        暂无筛选条件，点击下方按钮添加规则
      </div>
    {/each}
  </div>

  <Button
    type="button"
    variant="outline"
    size="sm"
    data-testid="filter-builder-add-rule"
    class="svadmin-u-6da6a3c3f741 svadmin-u-58284b4ea568 svadmin-u-a29b7a649c77 svadmin-u-359090c2d529 svadmin-u-ed8a5df7b2fb"
    onclick={addRule}
  >
    <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
    {i18n.t('common.addRule', undefined) ?? '添加筛选条件'}
  </Button>
</div>
