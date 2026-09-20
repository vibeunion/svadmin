<script lang="ts">
  import { untrack } from 'svelte';
  import { Plus, Trash2, RotateCcw, Filter as FilterIcon, Check } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Select } from './ui/select/index.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { CrudOperator, FieldDefinition, Filter } from '@svadmin/core';
  import { filterOperatorsForField as operatorsForField, isNumericFilterField as isNumericField,
    isCollectionFilterOperator, isFilterCollectionValue } from '@svadmin/core';
  import FilterCollectionInput from './FilterCollectionInput.svelte';

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
    logicalOperator?: 'and' | 'or';
    disabled?: boolean;
    class?: string;
    onApply?: (filters: Filter[]) => void;
    onReset?: () => void;
    onInvalid?: (issues: FilterEditorIssue[]) => void;
  }
  let { fields = [], filters = $bindable([]), logicalOperator = $bindable('and'), disabled = false,
    class: className, onApply, onReset, onInvalid }: Props = $props();
  const uid = $props.id();
  const i18n = useTranslation();
  const operatorOptions = $derived<{ value: CrudOperator; label: string }[]>([
    { value: 'eq', label: '等于 (eq)' },
    { value: 'ne', label: '不等于 (ne)' },
    { value: 'contains', label: '包含 (contains)' },
    { value: 'ncontains', label: '不包含 (ncontains)' },
    { value: 'startswith', label: '开头为 (startswith)' },
    { value: 'endswith', label: '结尾为 (endswith)' },
    { value: 'gt', label: '大于 (>)' },
    { value: 'gte', label: '大于等于 (>=)' },
    { value: 'lt', label: '小于 (<)' },
    { value: 'lte', label: '小于等于 (<=)' },
    { value: 'in', label: i18n.t('filter.in') },
    { value: 'nin', label: i18n.t('filter.nin') },
    { value: 'between', label: i18n.t('filter.between') },
    { value: 'nbetween', label: i18n.t('filter.nbetween') },
    { value: 'null', label: '为空 (null)' },
    { value: 'nnull', label: '非空 (not null)' },
  ]);

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
  let root = $state<FilterGroupNode>({ kind: 'group', id: 'root', operator: 'and', children: [], wrapped: false });
  let loadIssues = $state<FilterEditorIssue[]>([]);
  let attempted = $state(false);
  let nextId = 0;
  let lastInputFilters: Filter[] | undefined;
  let preserved = $state.raw<ReadonlyMap<string, Filter>>(new Map());
  const compilation = $derived(compileFilterTree({ ...root, operator: logicalOperator }, fields, preserved));
  const issues = $derived(loadIssues.length ? loadIssues : attempted && !compilation.ok ? compilation.issues : []);
  function countNodes(node: FilterNode): number { return 1 + (node.kind === 'group' ? node.children.reduce((sum, child) => sum + countNodes(child), 0) : 0); }
  const nodeCount = $derived(countNodes(root));
  const full = $derived(nodeCount >= FILTER_EDITOR_LIMITS.nodes);

  function snapshotNode(node: FilterNode): Filter {
    return node.kind === 'group' ? { operator: node.operator, value: node.children.map(snapshotNode) }
      : { field: node.field, operator: node.operator, value: Array.isArray(node.value) ? [...node.value] : node.value };
  }

  function isEditableFilter(filter: Omit<FilterRuleItem, 'id'>): boolean {
    const field = availableFields.find((candidate) => candidate.key === filter.field);
    if (!field || !operatorsForField(field).includes(filter.operator)) return false;
    if (filter.operator === 'null' || filter.operator === 'nnull') return filter.value === null;
    if (isCollectionFilterOperator(filter.operator)) return isFilterCollectionValue(field, filter.operator, filter.value);
    if (isNumericField(field)) return typeof filter.value === 'number' && Number.isFinite(filter.value);
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
        value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
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
  function remember(node: FilterNode, saved: Map<string, Filter>): void {
    saved.set(node.id, snapshotNode(node));
    if (node.kind === 'group') node.children.forEach(child => remember(child, saved));
    else node.readonly = cannotEdit(node);
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
    const metadata = availableFields;
    if (filters !== lastInputFilters) {
      lastInputFilters = filters;
      explicitRootGroup = filters.length === 1 && filters[0] !== undefined && !('field' in filters[0]);
      validationError = false;
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
    return -1;
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
    return !isEditableFilter({
      ...node,
      value: node.operator === 'null' || node.operator === 'nnull' ? null : node.value,
    });
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
    const nextField = availableFields.find((candidate) => candidate.key === field);
    rule.operator = nextField?.type === 'text' ? 'contains' : operatorsForField(nextField)[0] ?? 'eq';
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

  function updateOperator(rule: FilterRule, operator: CrudOperator) {
    const previous = rule.operator;
    rule.operator = operator;
    if (operator === 'between' || operator === 'nbetween') {
      if (previous !== 'between' && previous !== 'nbetween') rule.value = [null, null];
    } else if (isCollectionFilterOperator(operator)) {
      if (previous !== 'in' && previous !== 'nin') rule.value = [null];
    } else if (isCollectionFilterOperator(previous)) rule.value = '';
    validationError = false;
  }
</script>

{#snippet groupEditor(group: FilterGroupNode, depth: number, top: boolean)}
  <fieldset class="filter-group" data-testid={top ? 'filter-builder-root' : 'filter-builder-group'} data-filter-group={group.id} disabled={disabled}>
    <legend>{top ? (chinese ? '筛选条件' : 'Filters') : (chinese ? '条件组' : 'Filter group')}</legend>
    <div class="group-actions">
      <label for={`${uid}-${group.id}-logic`}>{chinese ? '逻辑' : 'Logic'}</label>
      <Select id={`${uid}-${group.id}-logic`} aria-label={chinese ? '组合逻辑' : 'Group logic'}
        value={top ? logicalOperator : group.operator}
        onchange={(event: Event) => {
          const target = event.currentTarget;
          if (disabled || !(target instanceof HTMLSelectElement)) return;
          const next = target.value === 'or' ? 'or' : 'and';
          if (top) logicalOperator = next; else group.operator = next;
        }}>
        <option value="and">AND</option><option value="or">OR</option>
      </Select>
      <Button type="button" size="sm" variant="outline" disabled={full || depth >= FILTER_EDITOR_LIMITS.depth || !availableFields.length}
        data-testid={top ? 'filter-builder-add-rule' : 'filter-group-add-rule'} onclick={() => appendRule(group)}>
        <Plus size={14} aria-hidden="true" />{i18n.t('common.addRule')}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={full || depth >= FILTER_EDITOR_LIMITS.depth - 1}
        data-testid="filter-builder-add-group" onclick={() => appendGroup(group)}>{chinese ? '添加条件组' : 'Add group'}</Button>
    </div>
    {#each group.children as node (node.id)}
      {#if node.kind === 'group'}
        <div class="nested-group">
          {@render groupEditor(node, depth + 1, false)}
          <Button type="button" size="sm" variant="ghost" aria-label={chinese ? '删除条件组' : 'Remove group'} onclick={() => removeNode(group, node.id)}><Trash2 size={14} aria-hidden="true" /></Button>
        </div>
      {:else}
        {@const field = availableFields.find((item) => item.key === node.field)}
        {@const allowed = filterOperators(field)}
        {@const collection = isCollectionOperator(node.operator)}
        {@const invalid = issues.some((issue) => issue.path === node.id)}
        <div class="filter-rule" data-testid="filter-builder-rule" data-filter-rule={node.id}>
          {#if node.readonly}
            <output aria-label={i18n.t('filter.readonly')}>{node.field} {node.operator} {JSON.stringify(node.value)}</output>
          {:else}
          <div>
            <label for={`${uid}-${node.id}-field`}>{chinese ? '字段' : 'Field'}</label>
            <Select id={`${uid}-${node.id}-field`} value={node.field} onchange={(event: Event) => { if (event.currentTarget instanceof HTMLSelectElement) changeField(node, event.currentTarget.value); }}>
              {#if !field}<option value={node.field} disabled>{node.field}</option>{/if}
              {#each availableFields as option (option.key)}<option value={option.key}>{option.label || option.key}</option>{/each}
            </Select>
          </div>
          <div>
            <label for={`${uid}-${node.id}-operator`}>{chinese ? '操作符' : 'Operator'}</label>
            <Select id={`${uid}-${node.id}-operator`} value={node.operator} onchange={(event: Event) => { if (event.currentTarget instanceof HTMLSelectElement) changeOperator(node, event.currentTarget.value as CrudOperator); }}>
              {#if !allowed.includes(node.operator)}<option value={node.operator} disabled>{node.operator}</option>{/if}
              {#each allowed as operator (operator)}<option value={operator}>{operator}</option>{/each}
            </Select>
          </div>
          <div>
            <label for={`${uid}-${node.id}-value`}>{collection ? (chinese ? '值（JSON 数组）' : 'Value (JSON array)') : (chinese ? '值' : 'Value')}</label>
            {#if isNullOperator(node.operator)}
              <Input id={`${uid}-${node.id}-value`} value={chinese ? '无需填值' : 'No value required'} disabled />
            {:else if !collection && field?.options?.length}
              <Select id={`${uid}-${node.id}-value`} aria-invalid={invalid}
                value={field.options.findIndex((option) => option.value === node.value) < 0 ? '' : String(field.options.findIndex((option) => option.value === node.value))}
                onchange={(event: Event) => {
                  if (disabled || node.readonly || !(event.currentTarget instanceof HTMLSelectElement)) return;
                  const raw = event.currentTarget.value;
                  if (raw === '') { node.value = undefined; return; }
                  if (!/^(0|[1-9][0-9]*)$/u.test(raw)) return;
                  const option = field.options?.[Number(raw)];
                  if (option && !option.disabled) node.value = option.value;
                }}>
                <option value="">{chinese ? '请选择' : 'Choose'}</option>
                {#each field.options as option, index (index)}<option value={String(index)} disabled={option.disabled}>{option.label}</option>{/each}
              </Select>
            {:else if !collection && field?.type === 'boolean'}
              <Select id={`${uid}-${node.id}-value`} aria-invalid={invalid} value={valueText(node.value)}
                onchange={(event: Event) => { if (event.currentTarget instanceof HTMLSelectElement) changeValue(node, event.currentTarget.value); }}>
                <option value="">{chinese ? '请选择' : 'Choose'}</option><option value="true">true</option><option value="false">false</option>
              </Select>
            {:else if !collection && field?.type === 'number'}
              <Input id={`${uid}-${node.id}-value`} type="number" step="any" aria-invalid={invalid} value={typeof node.value === 'number' ? node.value : undefined}
                oninput={(event) => { if (event.currentTarget instanceof HTMLInputElement) changeValue(node, event.currentTarget.value); }} />
            {:else}
              <Input id={`${uid}-${node.id}-value`} type="text" aria-invalid={invalid} value={valueText(node.value)} placeholder={collection ? '[1, 2]' : ''}
                oninput={(event) => { if (event.currentTarget instanceof HTMLInputElement) changeValue(node, event.currentTarget.value); }} />
            {/if}
          </div>
          {/if}
          <Button type="button" size="sm" variant="ghost" aria-label={chinese ? '删除条件' : 'Remove rule'} onclick={() => removeNode(group, node.id)}><Trash2 size={14} aria-hidden="true" /></Button>
        </div>
      {/if}
    {:else}
      <p class="empty">{chinese ? '暂无筛选条件，请添加规则。' : 'No filters yet. Add a rule.'}</p>
    {/each}
  </fieldset>
{/snippet}

<div class={cn('svadmin-filter-builder', className)} data-testid="filter-builder">
  <div class="builder-header">
    <span><FilterIcon size={16} aria-hidden="true" /> {i18n.t('common.filterBuilder')}</span>
    <div class="group-actions">
      <Button type="button" variant="ghost" size="sm" disabled={disabled} data-testid="filter-builder-reset" onclick={reset}><RotateCcw size={14} aria-hidden="true" />{i18n.t('common.reset')}</Button>
      <Button type="button" size="sm" disabled={disabled} data-testid="filter-builder-apply" onclick={apply}><Check size={14} aria-hidden="true" />{i18n.t('common.confirm')}</Button>
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
              <Select value={node.operator} onchange={(e: Event) => updateOperator(node, (e.currentTarget as HTMLSelectElement).value as CrudOperator)}>
                {#each operatorOptions.filter((operator) => operatorsForField(fieldDef).includes(operator.value)) as operator (operator.value)}
                  <option value={operator.value}>{operator.label}</option>
                {/each}
              </Select>
              {#if node.operator === 'null' || node.operator === 'nnull'}
                <span class="svadmin-u-bfa603190748">无需填值</span>
              {:else if fieldDef && isCollectionFilterOperator(node.operator)}
                <FilterCollectionInput field={fieldDef} value={node.value}
                  range={node.operator === 'between' || node.operator === 'nbetween'} onchange={(value) => node.value = value} />
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
              {:else if isNumericField(fieldDef)}
                <Input type="number" value={numericInputValue(node.value)} oninput={(e: Event) => {
                  const input = e.currentTarget;
                  if (input instanceof HTMLInputElement) node.value = input.value === '' ? null : numericInputValue(input.valueAsNumber);
                }} />
              {:else}
                <Input type="text" value={String(node.value ?? '')} oninput={(e: Event) => {
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

<style>
  .svadmin-filter-builder { color: var(--foreground); background: var(--card, var(--background)); border: 1px solid var(--border); border-radius: var(--radius, .5rem); padding: .75rem; font-size: .875rem; }
  .builder-header, .group-actions, .nested-group { display: flex; align-items: center; gap: .5rem; }
  .builder-header { justify-content: space-between; flex-wrap: wrap; padding-block-end: .75rem; }
  .builder-header > span { display: inline-flex; align-items: center; gap: .5rem; font-weight: 600; }
  .group-actions { flex-wrap: wrap; }
  .filter-group { min-width: 0; width: 100%; border: 1px solid var(--border); border-radius: var(--radius, .5rem); padding: .75rem; margin: .5rem 0 0; }
  legend { padding-inline: .25rem; color: var(--muted-foreground); }
  .filter-rule { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2fr) auto; align-items: end; gap: .5rem; margin-block-start: .75rem; }
  .filter-rule > div { min-width: 0; }
  .filter-rule > output { grid-column: 1 / -2; overflow-wrap: anywhere; }
  .filter-rule label { display: block; margin-block-end: .25rem; color: var(--muted-foreground); }
  .empty { padding-block: .75rem; color: var(--muted-foreground); }
  .errors { color: var(--destructive); overflow-wrap: anywhere; }
  .nested-group { align-items: flex-start; }
  @media (max-width: 640px) { .filter-rule { grid-template-columns: minmax(0, 1fr); } .nested-group { gap: .25rem; } }
</style>
