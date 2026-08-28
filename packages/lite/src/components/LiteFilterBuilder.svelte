<script lang="ts">
  import type { CrudOperator, FieldDefinition, Filter } from '@svadmin/core';
  import { t } from '@svadmin/core/i18n';

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
    action?: string;
    method?: 'GET' | 'POST';
    disabled?: boolean;
    onApply?: (filters: Filter[]) => void;
  }

  let {
    fields = [],
    filters = [],
    logicalOperator = 'and',
    action = '',
    method: _method = "GET",
    disabled = false,
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
    { value: 'null', label: '为空 (null)' },
    { value: 'nnull', label: '不为空' },
  ];

  // Flatten initial filters or fallback to 1 empty rule
  const initialRules = $derived.by(() => {
    if (filters.length > 0) {
      return filters.map((f, i) => ({
        id: `rule_${i}`,
        field: 'field' in f ? String(f.field) : (fields[0]?.key ?? ''),
        operator: ('operator' in f ? f.operator : 'eq') as CrudOperator,
        value: 'value' in f ? f.value : '',
      }));
    }
    return [
      {
        id: 'rule_0',
        field: fields[0]?.key ?? '',
        operator: 'eq' as CrudOperator,
        value: '',
      },
    ];
  });
</script>

<div class="lite-filter-builder lite-form-group">
  <div class="lite-filter-header">
    <div class="lite-filter-title">
      <strong>{t('common.filters') || '高级多条件筛选'}</strong>
      <select
        name="logical_op"
        class="lite-select lite-select-sm"
        style="width: 120px; display: inline-block; margin-left: 8px;"
        value={logicalOperator}
        {disabled}
      >
        <option value="and">符合全部 (AND)</option>
        <option value="or">符合任一 (OR)</option>
      </select>
    </div>
    <div>
      <button type="submit" name="_action" value="add_filter_rule" class="lite-btn lite-btn-sm" {disabled}>
        + 添加条件
      </button>
    </div>
  </div>

  <div class="lite-filter-rules">
    {#each initialRules as rule, idx (rule.id)}
      <div class="lite-filter-row">
        <!-- Field select -->
        <select
          name="filter_field_{idx}"
          class="lite-select lite-filter-field"
          value={rule.field}
          {disabled}
        >
          {#each fields as fld (fld.key)}
            <option value={fld.key}>{fld.label || fld.key}</option>
          {/each}
        </select>

        <!-- Operator select -->
        <select
          name="filter_op_{idx}"
          class="lite-select lite-filter-op"
          value={rule.operator}
          {disabled}
        >
          {#each operatorOptions as op (op.value)}
            <option value={op.value}>{op.label}</option>
          {/each}
        </select>

        <!-- Value input -->
        {#if rule.operator !== 'null' && rule.operator !== 'nnull'}
          <input
            type="text"
            name="filter_val_{idx}"
            class="lite-input lite-filter-val"
            value={String(rule.value ?? '')}
            placeholder="输入筛选值..."
            {disabled}
          />
        {/if}

        <!-- Remove row button -->
        <button
          type="submit"
          name="_action"
          value="remove_filter_rule_{idx}"
          class="lite-btn lite-btn-sm lite-btn-danger"
          {disabled}
          title="删除此行条件"
        >
          ✕
        </button>
      </div>
    {/each}
  </div>

  <div class="lite-filter-footer">
    <button type="submit" class="lite-btn lite-btn-primary">
      应用筛选
    </button>
    <a href={action || '?'} class="lite-btn" style="margin-left: 8px;">
      重置
    </a>
  </div>
</div>

<style>
  .lite-filter-builder {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 14px;
    background: #f8fafc;
    margin-bottom: 16px;
  }
  .lite-filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .lite-filter-rules {
    display: flex;
    flex-direction: column;
    margin-bottom: 12px;
  }
  .lite-filter-row {
    display: flex;
    align-items: center;
    background: #ffffff;
    padding: 8px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  .lite-filter-row:last-child {
    margin-bottom: 0;
  }
  .lite-filter-row > * {
    margin-right: 8px;
  }
  .lite-filter-row > *:last-child {
    margin-right: 0;
  }
  .lite-filter-field {
    flex: 2;
    min-width: 130px;
  }
  .lite-filter-op {
    flex: 2;
    min-width: 120px;
  }
  .lite-filter-val {
    flex: 3;
    min-width: 140px;
  }
  .lite-filter-footer {
    display: flex;
    align-items: center;
    border-top: 1px solid #e2e8f0;
    padding-top: 10px;
  }
</style>
