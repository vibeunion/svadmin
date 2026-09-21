<script lang="ts">
  import { untrack } from 'svelte';
  import { Plus, Trash2, RotateCcw, Filter as FilterIcon, Check } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Select } from './ui/select/index.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { CrudOperator, FieldDefinition, Filter } from '@svadmin/core';
  import { isNumericFilterField as isNumericField } from '@svadmin/core';
  import FilterCollectionInput from './FilterCollectionInput.svelte';
  import { readFilterTree, compileFilterTree, filterOperators, parseFilterInput, isCollectionOperator, isNullOperator,
    FILTER_EDITOR_LIMITS, type FilterGroupNode, type FilterNode, type FilterRuleNode, type FilterEditorIssue, type FilterIssueCode } from './enterprise/filter-tree.js';

  export interface FilterRuleItem {
    id: string;
    field: string;
    operator: CrudOperator;
    value: unknown;
  }

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
  const chinese = $derived(i18n.locale.startsWith('zh'));
  const availableFields = $derived(fields.filter((field) => field.filterable !== false));
  // 金额、评分等数字字段沿用 core 的输入语义；树编译器统一按 number 验证。
  const editorFields = $derived(fields.map(field => isNumericField(field) ? { ...field, type: 'number' as const } : field));
  let root = $state<FilterGroupNode>({ kind: 'group', id: 'root', operator: 'and', children: [], wrapped: false });
  let loadIssues = $state<FilterEditorIssue[]>([]);
  let attempted = $state(false);
  let nextId = 0;
  let lastInputFilters: Filter[] | undefined;
  let preserved = $state.raw<ReadonlyMap<string, Filter>>(new Map());
  const compilation = $derived(compileFilterTree({ ...root, operator: logicalOperator }, editorFields, preserved));
  const issues = $derived(loadIssues.length ? loadIssues : attempted && !compilation.ok ? compilation.issues : []);
  function countNodes(node: FilterNode): number { return 1 + (node.kind === 'group' ? node.children.reduce((sum, child) => sum + countNodes(child), 0) : 0); }
  const nodeCount = $derived(countNodes(root));
  const full = $derived(nodeCount >= FILTER_EDITOR_LIMITS.nodes);

  function snapshotNode(node: FilterNode): Filter {
    return node.kind === 'group' ? { operator: node.operator, value: node.children.map(snapshotNode) }
      : { field: node.field, operator: node.operator, value: Array.isArray(node.value) ? [...node.value] : node.value };
  }

  function cannotEdit(node: FilterRuleNode): boolean {
    return !compileFilterTree({ kind: 'group', id: 'probe', operator: 'and', children: [node] }, editorFields).ok;
  }
  function remember(node: FilterNode, saved: Map<string, Filter>): void {
    saved.set(node.id, snapshotNode(node));
    if (node.kind === 'group') node.children.forEach(child => remember(child, saved));
    else node.readonly = cannotEdit(node);
  }

  $effect(() => {
    const input = filters;
    const metadata = editorFields;
    untrack(() => {
      if (input !== lastInputFilters) {
        lastInputFilters = input;
        const parsed = readFilterTree(input);
        const saved = new Map<string, Filter>();
        if (parsed.ok) {
          root = parsed.root;
          remember(root, saved);
          loadIssues = [];
          if (input.length) logicalOperator = root.operator;
        } else {
          root = { kind: 'group', id: 'root', operator: 'and', children: [], wrapped: false };
          loadIssues = parsed.issues;
        }
        preserved = saved;
        attempted = false;
      } else {
        // 元数据加载后只解锁已支持的历史条件；不能把失效草稿改成只读而绕过校验。
        function unlock(node: FilterNode): void {
          if (node.kind === 'group') node.children.forEach(unlock);
          else if (node.readonly && compileFilterTree({ kind: 'group', id: 'probe', operator: 'and', children: [node] }, metadata).ok) node.readonly = false;
        }
        unlock(root);
      }
    });
  });

  function message(code: FilterIssueCode): string {
    const labels: Record<FilterIssueCode, [string, string]> = {
      'invalid-filter': ['条件结构不受支持，原条件未被修改', 'Unsupported filter structure; the original query is unchanged'],
      limit: ['条件数量或深度超过限制', 'Filter count or depth exceeds the limit'],
      'unknown-field': ['字段不可用于筛选', 'Field is unavailable for filtering'],
      operator: ['操作符不适用于此字段', 'Operator is not supported for this field'],
      value: ['请输入有效的类型化值', 'Enter a valid typed value'],
      'empty-group': ['条件组不能为空', 'A filter group cannot be empty'],
    };
    return labels[code][chinese ? 0 : 1];
  }
  function appendRule(group: FilterGroupNode): void {
    if (disabled || loadIssues.length || full) return;
    const field = availableFields[0];
    if (!field) return;
    group.children = [...group.children, { kind: 'rule', id: `draft-${++nextId}`, field: field.key,
      operator: filterOperators(editorFields.find(item => item.key === field.key)).includes('contains') ? 'contains' : 'eq', value: undefined }];
  }

  function appendGroup(group: FilterGroupNode): void {
    if (disabled || loadIssues.length || full) return;
    group.children = [...group.children, { kind: 'group', id: `draft-${++nextId}`, operator: 'and', children: [] }];
  }

  function removeNode(group: FilterGroupNode, id: string): void {
    if (disabled || loadIssues.length) return;
    group.children = group.children.filter(child => child.id !== id);
  }

  export function addRule(): void { appendRule(root); }
  export function removeRule(index: number): void { const node = root.children[index]; if (node) removeNode(root, node.id); }
  export function reset(): void {
    if (disabled) return;
    root = { kind: 'group', id: 'root', operator: 'and', children: [], wrapped: false };
    loadIssues = [];
    preserved = new Map();
    filters = [];
    lastInputFilters = filters;
    attempted = false;
    onReset?.();
  }

  export function apply(): void {
    if (disabled) return;
    attempted = true;
    if (loadIssues.length) { onInvalid?.(loadIssues); return; }
    if (!compilation.ok) { onInvalid?.(compilation.issues); return; }
    // 失败时不输出部分条件，避免改变查询含义。
    filters = compilation.filters;
    lastInputFilters = filters;
    onApply?.(compilation.filters);
  }

  function changeField(rule: FilterRuleNode, key: string): void {
    if (disabled || rule.readonly) return;
    rule.field = key;
    rule.operator = filterOperators(editorFields.find(field => field.key === key)).includes('contains') ? 'contains' : 'eq';
    rule.value = undefined;
  }

  function changeValue(rule: FilterRuleNode, raw: string): void {
    if (disabled || rule.readonly) return;
    try { rule.value = parseFilterInput(raw, editorFields.find(field => field.key === rule.field), rule.operator); }
    catch { rule.value = raw; }
  }
  function valueText(value: unknown): string { return Array.isArray(value) ? JSON.stringify(value) : value === undefined || value === null ? '' : String(value); }

  function changeOperator(rule: FilterRuleNode, operator: CrudOperator): void {
    if (disabled || rule.readonly) return;
    const previous = rule.operator;
    rule.operator = operator;
    if (isNullOperator(operator)) rule.value = null;
    else if (operator === 'between' || operator === 'nbetween') {
      if (previous !== 'between' && previous !== 'nbetween') rule.value = [null, null];
    } else if (isCollectionOperator(operator)) {
      if (previous !== 'in' && previous !== 'nin') rule.value = [null];
    } else if (isCollectionOperator(previous) || isNullOperator(previous)) rule.value = undefined;
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
        {@const allowed = filterOperators(editorFields.find(item => item.key === node.field))}
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
            {:else if collection && field}
              <FilterCollectionInput {field} value={node.value}
                range={node.operator === 'between' || node.operator === 'nbetween'}
                onchange={(value) => { if (!disabled && !node.readonly) node.value = value; }} />
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
            {:else if !collection && isNumericField(field)}
              <Input id={`${uid}-${node.id}-value`} type="number" step="any" aria-invalid={invalid} value={typeof node.value === 'number' ? node.value : undefined}
                oninput={(event: Event) => { if (event.currentTarget instanceof HTMLInputElement) changeValue(node, event.currentTarget.value); }} />
            {:else}
              <Input id={`${uid}-${node.id}-value`} type="text" aria-invalid={invalid} value={valueText(node.value)} placeholder={collection ? '[1, 2]' : ''}
                oninput={(event: Event) => { if (event.currentTarget instanceof HTMLInputElement) changeValue(node, event.currentTarget.value); }} />
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
  {#if issues.length}<div role="alert" class="errors" data-testid="filter-builder-errors">{#each issues as issue, index (`${issue.path}-${issue.code}-${index}`)}<p>{issue.path}: {message(issue.code)}</p>{/each}</div>{/if}
  {#if !loadIssues.length}{@render groupEditor(root, root.wrapped || logicalOperator === 'or' ? 1 : 0, true)}{/if}
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
