<script lang="ts">
  import type { CrudOperator, FieldDefinition, Filter } from '@svadmin/core';
  import { t } from '@svadmin/core/i18n';

  export interface FilterRuleItem {
    id: string;
    field: string;
    operator: CrudOperator;
    value: unknown;
  }

  type FilterNode =
    | { kind: 'group'; id: string; operator: 'and' | 'or'; children: FilterNode[] }
    | { kind: 'rule'; id: string; field: string; operator: CrudOperator; value: unknown };

  interface Props {
    fields?: FieldDefinition[];
    filters?: Filter[];
    action?: string;
    method?: 'GET' | 'POST';
    disabled?: boolean;
    onApply?: (filters: Filter[]) => void;
  }

  let {
    fields = [],
    filters = [],
    action = '',
    method = 'GET',
    disabled = false,
    onApply,
  }: Props = $props();

  const operatorOptions: { value: CrudOperator; label: string }[] = [
    { value: 'eq', label: '= 等于' },
    { value: 'ne', label: '!= 不等于' },
    { value: 'contains', label: '包含' },
    { value: 'ncontains', label: '不包含' },
    { value: 'gt', label: '> 大于' },
    { value: 'gte', label: '>= 大于等于' },
    { value: 'lt', label: '< 小于' },
    { value: 'lte', label: '<= 小于等于' },
    { value: 'null', label: '为空' },
    { value: 'nnull', label: '不为空' },
  ];

  const availableFields = $derived(fields.filter(field => field.filterable !== false));

  function nodeFromFilter(filter: Filter, path: string): FilterNode {
    if ('field' in filter) {
      return { kind: 'rule', id: `rule-${path}`, field: filter.field, operator: filter.operator, value: filter.value };
    }
    return {
      kind: 'group',
      id: `group-${path}`,
      operator: filter.operator,
      children: filter.value.map((child, index) => nodeFromFilter(child, `${path}-${index}`)),
    };
  }

  const nodes = $derived(filters.map((filter, index) => nodeFromFilter(filter, String(index))));

  function readValue(node: FilterNode): unknown {
    return node.kind === 'rule' ? node.value : undefined;
  }

</script>

<div class="lite-filter-builder lite-form-group">
  <div class="lite-filter-header">
    <strong>{t('common.filters') || '高级多条件筛选'}</strong>
    <button type="submit" form="lite-filter-form" class="lite-btn lite-btn-primary lite-btn-sm" disabled={disabled}>
      应用筛选
    </button>
  </div>

  <form id="lite-filter-form" {action} {method} class="lite-filter-form">
    {#snippet renderNode(node: FilterNode, path: string, isRoot = false)}
      {#if node.kind === 'group'}
        <fieldset class="lite-filter-group" data-testid={isRoot ? 'lite-filter-root' : 'lite-filter-group'}>
          <legend>
            <label>
              逻辑组
              <select name={`filters[${path}][operator]`} value={node.operator} {disabled}>
                <option value="and">AND (且)</option>
                <option value="or">OR (或)</option>
              </select>
            </label>
          </legend>
          {#each node.children as child, index (child.id)}
            {@render renderNode(child, `${path}.value.${index}`)}
          {:else}
            <p class="lite-hint">暂无筛选条件</p>
          {/each}
          <button type="submit" name="_action" value={`add_filter_rule:${path}`} class="lite-btn lite-btn-sm" {disabled}>添加条件</button>
          <button type="submit" name="_action" value={`add_filter_group:${path}`} class="lite-btn lite-btn-sm" {disabled}>添加条件组</button>
        </fieldset>
      {:else}
        <div class="lite-filter-row" data-testid="lite-filter-rule">
          <select name={`filters[${path}][field]`} value={node.field} {disabled}>
            {#each availableFields as field (field.key)}<option value={field.key}>{field.label || field.key}</option>{/each}
          </select>
          <select name={`filters[${path}][operator]`} value={node.operator} {disabled}>
            {#each operatorOptions as operator (operator.value)}<option value={operator.value}>{operator.label}</option>{/each}
          </select>
          {#if node.operator !== 'null' && node.operator !== 'nnull'}
            {#if availableFields.find(field => field.key === node.field)?.type === 'boolean'}
              <select name={`filters[${path}][value]`} value={String(readValue(node) ?? '')} {disabled}>
                <option value="">请选择</option><option value="true">是</option><option value="false">否</option>
              </select>
            {:else}
              <input name={`filters[${path}][value]`} type={availableFields.find(field => field.key === node.field)?.type === 'number' ? 'number' : 'text'} value={String(readValue(node) ?? '')} {disabled} />
            {/if}
          {/if}
          <button type="submit" name="_action" value={`remove_filter_rule:${path}`} class="lite-btn lite-btn-sm lite-btn-danger" {disabled} title="删除此行条件">删除</button>
        </div>
      {/if}
    {/snippet}

    {#if nodes.length === 0}
      <p class="lite-hint">暂无筛选条件，请先添加规则。</p>
      <button type="submit" name="_action" value="add_filter_rule:root" class="lite-btn lite-btn-sm" {disabled}>添加条件</button>
    {:else}
      {#each nodes as node, index (node.id)}
        {@render renderNode(node, String(index), node.kind === 'group' && nodes.length === 1)}
      {/each}
    {/if}
  </form>
</div>

<style>
  .lite-filter-builder { border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; background: #f8fafc; margin-bottom: 16px; }
  .lite-filter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .lite-filter-group { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; margin-bottom: 8px; background: #fff; }
  .lite-filter-row { display: flex; align-items: center; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 8px; background: #fff; }
  .lite-filter-row > * { min-width: 120px; flex: 1; }
  .lite-filter-row > * + * { margin-left: 8px; }
  .lite-filter-row .lite-btn { flex: 0 0 auto; }
  .lite-hint { color: #64748b; font-size: 12px; }
  .lite-btn { margin-right: 6px; }
</style>
