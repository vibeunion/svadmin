<script lang="ts">
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

  const availableFields = $derived(fields.filter((field) => field.filterable !== false));

  function newId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function filterToNode(filter: Filter, index: number): FilterNode {
    if ('field' in filter) {
      return {
        kind: 'rule',
        id: `rule-${index}-${newId('input')}`,
        field: filter.field,
        operator: filter.operator,
        value: filter.value,
      };
    }
    return {
      kind: 'group',
      id: `group-${index}-${newId('input')}`,
      operator: filter.operator,
      children: filter.value.map((child, childIndex) => filterToNode(child, childIndex)),
    };
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

  function nodeToFilter(node: FilterNode): Filter | null {
    if (node.kind === 'rule') {
      if (!node.field || (node.operator !== 'null' && node.operator !== 'nnull' && (node.value === '' || node.value === undefined))) {
        return null;
      }
      return {
        field: node.field,
        operator: node.operator,
        value: node.operator === 'null' || node.operator === 'nnull' ? null : node.value,
      };
    }
    const children = node.children.map(nodeToFilter).filter((child): child is Filter => child !== null);
    return children.length > 0 ? { operator: node.operator, value: children } : null;
  }

  $effect(() => {
    if (filters !== lastInputFilters) {
      lastInputFilters = filters;
      root = filtersToRoot(filters ?? []);
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
        operator: field?.type === 'number' ? 'eq' : 'contains',
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
    filters = [];
    lastInputFilters = filters;
    onReset?.();
  }

  function apply(): void {
    const compiled = root.children.map(nodeToFilter).filter((child): child is Filter => child !== null);
    const result: Filter[] = compiled.length > 0 && root.operator === 'or'
      ? [{ operator: 'or', value: compiled }]
      : compiled;
    filters = result;
    lastInputFilters = filters;
    onApply?.(result);
  }

  function updateRuleField(rule: FilterRule, field: string): void {
    rule.field = field;
    rule.value = '';
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
                <Select value={String(node.value ?? '')} onchange={(e: Event) => (node.value = (e.currentTarget as HTMLSelectElement).value)}>
                  <option value="">请选择</option>
                  {#each fieldDef.options as option (String(option.value))}
                    <option value={String(option.value)}>{option.label}</option>
                  {/each}
                </Select>
              {:else if fieldDef?.type === 'boolean'}
                <Select value={String(node.value ?? '')} onchange={(e: Event) => {
                  const selected = (e.currentTarget as HTMLSelectElement).value;
                  node.value = selected === 'true' ? true : selected === 'false' ? false : '';
                }}>
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
