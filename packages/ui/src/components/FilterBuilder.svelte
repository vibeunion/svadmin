<script lang="ts">
  import { untrack } from 'svelte';
  import { Plus, Trash2, RotateCcw, Filter as FilterIcon, Check } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { numericInputValue } from '../numeric-input.js';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Select } from './ui/select/index.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { CrudOperator, FieldDefinition, Filter } from '@svadmin/core';

  export interface FilterRuleItem {
    id: string;
    field: string;
    operator: CrudOperator;
    value: unknown;
  }

  interface FilterGroup {
    kind: 'group';
    id: string;
    operator: 'and' | 'or';
    children: FilterNode[];
  }

  interface FilterRule extends FilterRuleItem {
    kind: 'rule';
    readonly?: boolean;
  }

  type FilterNode = FilterGroup | FilterRule;

  interface Props {
    fields?: FieldDefinition[];
    filters?: Filter[];
    class?: string;
    onApply?: (filters: Filter[]) => void;
    onReset?: () => void;
  }

  let {
    fields = [],
    filters = $bindable([]),
    class: className,
    onApply,
    onReset,
  }: Props = $props();

  const i18n = useTranslation();
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

  let root = $state<FilterGroup>({
    kind: 'group',
    id: 'root',
    operator: 'and',
    children: [],
  });
  let lastInputFilters: Filter[] | undefined;
  let validationError = $state(false);
  let explicitRootGroup = $state(false);

  const availableFields = $derived(fields.filter((field) => field.filterable !== false));

  function newId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function isEditableFilter(filter: Omit<FilterRuleItem, 'id'>): boolean {
    const field = availableFields.find((candidate) => candidate.key === filter.field);
    if (!field || !operatorOptions.some((option) => option.value === filter.operator)) return false;
    if (filter.operator === 'null' || filter.operator === 'nnull') return filter.value === null;
    if (field.type === 'number') return typeof filter.value === 'number' && Number.isFinite(filter.value);
    if (field.type === 'boolean') return typeof filter.value === 'boolean';
    if (field.type === 'select') return field.options?.some((option) => option.value === filter.value) === true;
    return typeof filter.value === 'string' && filter.value !== '';
  }

  function filterToNode(filter: Filter, index: number): FilterNode {
    if ('field' in filter) {
      return {
        kind: 'rule',
        id: `rule-${index}-${newId('input')}`,
        field: filter.field,
        operator: filter.operator,
        value: filter.value,
        readonly: !isEditableFilter(filter),
      };
    }
    return {
      kind: 'group',
      id: `group-${index}-${newId('input')}`,
      operator: filter.operator,
      children: filter.value.map((child, childIndex) => filterToNode(child, childIndex)),
    };
  }

  function refreshReadonly(node: FilterNode): void {
    if (node.kind === 'group') {
      node.children.forEach(refreshReadonly);
      return;
    }
    node.readonly = !isEditableFilter(node);
  }

  function filtersToRoot(input: Filter[]): FilterGroup {
    const first = input[0];
    if (first && input.length === 1 && !('field' in first)) {
      const node = filterToNode(first, 0);
      if (node.kind === 'group') return { ...node, id: 'root' };
    }
    return {
      kind: 'group',
      id: 'root',
      operator: 'and',
      children: input.map(filterToNode),
    };
  }

  function nodeToFilter(node: FilterNode): Filter {
    if (node.kind === 'rule') {
      return {
        field: node.field,
        operator: node.operator,
        value: !node.readonly && (node.operator === 'null' || node.operator === 'nnull') ? null : node.value,
      };
    }
    return { operator: node.operator, value: node.children.map(nodeToFilter) };
  }

  $effect(() => {
    const currentFields = availableFields;
    if (filters !== lastInputFilters) {
      lastInputFilters = filters;
      explicitRootGroup = filters.length === 1 && filters[0] !== undefined && !('field' in filters[0]);
      validationError = false;
      root = filtersToRoot(filters ?? []);
    } else {
      // 元数据更新时重新判定，不订阅草稿编辑以免将未完成输入锁成只读。
      untrack(() => {
        void currentFields;
        refreshReadonly(root);
      });
    }
  });

  function addRule(group: FilterGroup): void {
    const field = availableFields[0];
    group.children = [
      ...group.children,
      {
        kind: 'rule',
        id: newId('rule'),
        field: field?.key ?? 'id',
        operator: field?.type === 'text' ? 'contains' : 'eq',
        value: '',
      },
    ];
    root = root;
  }

  function addGroup(group: FilterGroup): void {
    group.children = [
      ...group.children,
      { kind: 'group', id: newId('group'), operator: 'and', children: [] },
    ];
    root = root;
  }

  function removeChild(group: FilterGroup, childId: string): void {
    group.children = group.children.filter((child) => child.id !== childId);
    root = root;
  }

  function removeGroup(groupId: string): void {
    function removeFrom(parent: FilterGroup): boolean {
      if (parent.children.some((child) => child.kind === 'group' && child.id === groupId)) {
        parent.children = parent.children.filter((child) => child.id !== groupId);
        return true;
      }
      return parent.children.some((child) => child.kind === 'group' && removeFrom(child));
    }
    removeFrom(root);
    root = root;
  }

  function reset(): void {
    root = { kind: 'group', id: 'root', operator: 'and', children: [] };
    explicitRootGroup = false;
    filters = [];
    lastInputFilters = filters;
    validationError = false;
    onReset?.();
  }

  function hasIncompleteRule(node: FilterNode): boolean {
    if (node.kind === 'group') return node.children.some(hasIncompleteRule);
    if (node.readonly) return false;
    return !node.field || (
      node.operator !== 'null' && node.operator !== 'nnull'
      && (node.value === '' || node.value === undefined || node.value === null)
    );
  }

  function apply(): void {
    if (hasIncompleteRule(root)) {
      validationError = true;
      return;
    }
    const compiled = root.children.map(nodeToFilter);
    const result: Filter[] = explicitRootGroup || root.operator === 'or'
      ? [{ operator: root.operator, value: compiled }]
      : compiled;
    filters = result;
    lastInputFilters = filters;
    validationError = false;
    onApply?.(result);
  }

  function updateRuleField(rule: FilterRule, field: string): void {
    rule.field = field;
    rule.value = '';
    rule.operator = availableFields.find((candidate) => candidate.key === field)?.type === 'text' ? 'contains' : 'eq';
    validationError = false;
  }

  function updateSelectValue(rule: FilterRule, field: FieldDefinition | undefined, raw: string): void {
    if (field?.type === 'select') {
      const option = raw === '' ? undefined : field.options?.[Number(raw)];
      if (option?.disabled) return;
      rule.value = option?.value ?? '';
    } else if (field?.type === 'boolean') {
      rule.value = raw === 'true' ? true : raw === 'false' ? false : '';
    } else {
      rule.value = raw;
    }
    validationError = false;
  }
</script>

<div class={cn('svadmin-u-6da6a3c3f741 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-cef5b893cf23 svadmin-u-6ed543e2fbbb', className)} data-testid="filter-builder">
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-7fcf9124b5df">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      <FilterIcon class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />
      <span class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{i18n.t('common.filterBuilder', undefined) ?? '高级筛选'}</span>
    </div>
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
      <Button variant="ghost" size="sm" data-testid="filter-builder-reset" onclick={reset}>
        <RotateCcw class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        {i18n.t('common.reset', undefined) ?? '重置'}
      </Button>
      <Button variant="default" size="sm" data-testid="filter-builder-apply" onclick={apply}>
        <Check class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        {i18n.t('common.confirm', undefined) ?? '应用'}
      </Button>
    </div>
  </div>
  {#if validationError}
    <p role="alert" class="svadmin-u-b6b02c0ebef6 svadmin-u-bfa603190748">
      {i18n.t('filter.incomplete')}
    </p>
  {/if}

  {#snippet renderGroup(group: FilterGroup, isRoot = false)}
    <div class={cn('svadmin-u-6f7e013d6499 svadmin-u-5f22e64f2282', !isRoot && 'svadmin-u-ca6bcd4b6f3f svadmin-u-421ac2be5045')} data-testid={isRoot ? 'filter-builder-root' : 'filter-builder-group'}>
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-421ac2be5045 svadmin-u-05faf5c801ff">
        <Select value={group.operator} onchange={(e: Event) => (group.operator = (e.currentTarget as HTMLSelectElement).value as 'and' | 'or')}>
          <option value="and">AND (且)</option>
          <option value="or">OR (或)</option>
        </Select>
        {#if !isRoot}
          <Button type="button" variant="ghost" size="icon-sm" onclick={() => removeGroup(group.id)} aria-label="删除条件组">
            <Trash2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          </Button>
        {/if}
      </div>
      <div class="svadmin-u-6f7e013d6499">
        {#each group.children as node (node.id)}
          {#if node.kind === 'group'}
            {@render renderGroup(node)}
          {:else}
            {@const fieldDef = availableFields.find((field) => field.key === node.field)}
            <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3fd0f778c8d9 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-421ac2be5045 svadmin-u-967d113a1451 svadmin-u-7660b450905a svadmin-u-ca6bcd4b6f3f svadmin-u-6ee2d41e2d2d" data-testid="filter-builder-rule">
              {#if node.readonly}
                <output aria-label={i18n.t('filter.readonly')}>
                  {node.field} {node.operator} {JSON.stringify(node.value)}
                </output>
              {:else}
              <Select value={node.field} onchange={(e: Event) => updateRuleField(node, (e.currentTarget as HTMLSelectElement).value)}>
                {#each availableFields as field (field.key)}
                  <option value={field.key}>{field.label || field.key}</option>
                {/each}
              </Select>
              <Select value={node.operator} onchange={(e: Event) => (node.operator = (e.currentTarget as HTMLSelectElement).value as CrudOperator)}>
                {#each operatorOptions as operator (operator.value)}
                  <option value={operator.value}>{operator.label}</option>
                {/each}
              </Select>
              {#if node.operator === 'null' || node.operator === 'nnull'}
                <span class="svadmin-u-bfa603190748">无需填值</span>
              {:else if fieldDef?.type === 'select' && fieldDef.options}
                <Select value={node.value === '' ? '' : String(fieldDef.options.findIndex((option) => option.value === node.value))} onchange={(e: Event) => updateSelectValue(node, fieldDef, (e.currentTarget as HTMLSelectElement).value)}>
                  <option value="">请选择</option>
                  {#each fieldDef.options as option, optionIndex (optionIndex)}
                    <option value={String(optionIndex)} disabled={option.disabled}>{option.label}</option>
                  {/each}
                </Select>
              {:else if fieldDef?.type === 'boolean'}
                <Select value={String(node.value ?? '')} onchange={(e: Event) => updateSelectValue(node, fieldDef, (e.currentTarget as HTMLSelectElement).value)}>
                  <option value="">请选择</option>
                  <option value="true">是 (true)</option>
                  <option value="false">否 (false)</option>
                </Select>
              {:else if fieldDef?.type === 'number'}
                <Input type="number" value={numericInputValue(node.value)} oninput={(e) => {
                  const input = e.currentTarget;
                  if (input instanceof HTMLInputElement) node.value = input.value === '' ? null : numericInputValue(input.valueAsNumber);
                }} />
              {:else}
                <Input type="text" value={String(node.value ?? '')} oninput={(e) => {
                  const input = e.currentTarget;
                  if (input instanceof HTMLInputElement) node.value = input.value;
                }} />
              {/if}
              {/if}
              <Button type="button" variant="ghost" size="icon-sm" onclick={() => removeChild(group, node.id)} aria-label="删除筛选条件">
                <Trash2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
              </Button>
            </div>
          {/if}
        {:else}
          <div class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-a29b7a649c77 svadmin-u-c9ed8c5f79ae svadmin-u-cb11fec3bb46 svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
            暂无筛选条件，点击下方按钮添加规则
          </div>
        {/each}
      </div>
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
        <Button type="button" variant="outline" size="sm" data-testid={isRoot ? 'filter-builder-add-rule' : undefined} onclick={() => addRule(group)}>
          <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          添加条件
        </Button>
        <Button type="button" variant="ghost" size="sm" onclick={() => addGroup(group)}>
          <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          添加条件组
        </Button>
      </div>
    </div>
  {/snippet}

  {@render renderGroup(root, true)}
</div>
