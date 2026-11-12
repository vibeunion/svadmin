<script lang="ts">
  import { untrack } from 'svelte';
  import { Plus, Trash2, FolderPlus, RotateCcw, Code2, Database } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type LogicalOperator = 'AND' | 'OR';
  export type ComparisonOperator =
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'starts_with'
    | 'ends_with'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'not_in'
    | 'between'
    | 'is_null'
    | 'is_not_null';

  export interface QueryField {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'date' | 'boolean';
    options?: Array<{ label: string; value: string | number }> | undefined;
  }

  export interface QueryRule {
    id: string;
    field: string;
    operator: ComparisonOperator;
    value: string | number | boolean | null;
  }

  export interface QueryGroup {
    id: string;
    operator: LogicalOperator;
    rules: Array<QueryRule | QueryGroup>;
  }

  export interface QueryBuilderProps {
    fields: QueryField[];
    initialValue?: QueryGroup | undefined;
    maxDepth?: number | undefined;
    readOnly?: boolean | undefined;
    onchange?: ((value: QueryGroup) => void) | undefined;
    class?: string | undefined;
  }

  let {
    fields = [],
    initialValue,
    maxDepth = 3,
    readOnly = false,
    onchange,
    class: className = '',
  }: QueryBuilderProps = $props();

  function makeId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  function defaultRule(): QueryRule {
    const defaultField = fields[0]?.key ?? 'id';
    return {
      id: makeId(),
      field: defaultField,
      operator: 'equals',
      value: '',
    };
  }

  function defaultGroup(op: LogicalOperator = 'AND'): QueryGroup {
    return {
      id: makeId(),
      operator: op,
      rules: [defaultRule()],
    };
  }

  let rootGroup = $state<QueryGroup>(untrack(() => initialValue ?? defaultGroup('AND')));
  let showSqlPreview = $state(false);

  function isGroup(item: QueryRule | QueryGroup): item is QueryGroup {
    return 'operator' in item && Array.isArray((item as QueryGroup).rules);
  }

  function getOperatorsForType(type: QueryField['type']): Array<{ label: string; value: ComparisonOperator }> {
    switch (type) {
      case 'number':
        return [
          { label: '等于 (=)', value: 'equals' },
          { label: '不等于 (!=)', value: 'not_equals' },
          { label: '大于 (>)', value: 'gt' },
          { label: '大于等于 (>=)', value: 'gte' },
          { label: '小于 (<)', value: 'lt' },
          { label: '小于等于 (<=)', value: 'lte' },
          { label: '为空 (IS NULL)', value: 'is_null' },
          { label: '非空 (IS NOT NULL)', value: 'is_not_null' },
        ];
      case 'date':
        return [
          { label: '等于', value: 'equals' },
          { label: '早于 (<)', value: 'lt' },
          { label: '晚于 (>)', value: 'gt' },
          { label: '为空', value: 'is_null' },
          { label: '非空', value: 'is_not_null' },
        ];
      case 'select':
      case 'boolean':
        return [
          { label: '等于', value: 'equals' },
          { label: '不等于', value: 'not_equals' },
          { label: '为空', value: 'is_null' },
          { label: '非空', value: 'is_not_null' },
        ];
      case 'text':
      default:
        return [
          { label: '包含', value: 'contains' },
          { label: '等于', value: 'equals' },
          { label: '不等于', value: 'not_equals' },
          { label: '不包含', value: 'not_contains' },
          { label: '开头为', value: 'starts_with' },
          { label: '结尾为', value: 'ends_with' },
          { label: '为空', value: 'is_null' },
          { label: '非空', value: 'is_not_null' },
        ];
    }
  }

  function addRuleToGroup(group: QueryGroup) {
    if (readOnly) return;
    group.rules = [...group.rules, defaultRule()];
    notifyChange();
  }

  function addSubGroup(group: QueryGroup, depth: number) {
    if (readOnly || depth >= maxDepth) return;
    group.rules = [...group.rules, defaultGroup(group.operator === 'AND' ? 'OR' : 'AND')];
    notifyChange();
  }

  function removeRule(parentGroup: QueryGroup, ruleId: string) {
    if (readOnly) return;
    parentGroup.rules = parentGroup.rules.filter((r) => r.id !== ruleId);
    if (parentGroup.rules.length === 0) {
      parentGroup.rules = [defaultRule()];
    }
    notifyChange();
  }

  function resetAll() {
    if (readOnly) return;
    rootGroup = defaultGroup('AND');
    notifyChange();
  }

  function notifyChange() {
    onchange?.($state.snapshot(rootGroup));
  }

  function serializeToSql(group: QueryGroup): string {
    const parts: string[] = [];
    for (const rule of group.rules) {
      if (isGroup(rule)) {
        const sub = serializeToSql(rule);
        if (sub) parts.push(`(${sub})`);
      } else {
        const val = typeof rule.value === 'string' ? `'${rule.value}'` : String(rule.value ?? '');
        switch (rule.operator) {
          case 'equals':
            parts.push(`${rule.field} = ${val}`);
            break;
          case 'not_equals':
            parts.push(`${rule.field} != ${val}`);
            break;
          case 'contains':
            parts.push(`${rule.field} LIKE '%${rule.value}%'`);
            break;
          case 'starts_with':
            parts.push(`${rule.field} LIKE '${rule.value}%'`);
            break;
          case 'ends_with':
            parts.push(`${rule.field} LIKE '%${rule.value}'`);
            break;
          case 'gt':
            parts.push(`${rule.field} > ${rule.value}`);
            break;
          case 'gte':
            parts.push(`${rule.field} >= ${rule.value}`);
            break;
          case 'lt':
            parts.push(`${rule.field} < ${rule.value}`);
            break;
          case 'lte':
            parts.push(`${rule.field} <= ${rule.value}`);
            break;
          case 'is_null':
            parts.push(`${rule.field} IS NULL`);
            break;
          case 'is_not_null':
            parts.push(`${rule.field} IS NOT NULL`);
            break;
          default:
            parts.push(`${rule.field} = ${val}`);
        }
      }
    }
    return parts.join(` ${group.operator} `);
  }

  const generatedSql = $derived(serializeToSql(rootGroup) || '1 = 1');
</script>

<div
  class={cn('rounded-md border border-border bg-card p-4 text-card-foreground shadow-xs', className)}
  data-svadmin-component="QueryBuilder"
>
  <!-- Top Toolbar -->
  <div class="flex items-center justify-between border-b border-border pb-3 mb-4 text-xs">
    <div class="flex items-center gap-2">
      <Database class="h-4 w-4 text-primary" />
      <span class="font-bold text-foreground">高级多维查询构建器</span>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class={cn(
          'inline-flex items-center gap-1 rounded border px-2.5 py-1 transition-colors cursor-pointer',
          showSqlPreview
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border bg-background text-muted-foreground hover:text-foreground'
        )}
        onclick={() => (showSqlPreview = !showSqlPreview)}
      >
        <Code2 class="h-3.5 w-3.5" />
        <span>{showSqlPreview ? '隐藏 SQL' : '预览 SQL'}</span>
      </button>

      {#if !readOnly}
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onclick={resetAll}
        >
          <RotateCcw class="h-3.5 w-3.5" />
          <span>重置条件</span>
        </button>
      {/if}
    </div>
  </div>

  {#if showSqlPreview}
    <div class="mb-4 rounded-md border border-border bg-muted/40 p-2.5 font-mono text-xs text-foreground">
      <span class="text-muted-foreground select-none">WHERE </span>
      <span class="text-primary font-medium">{generatedSql}</span>
    </div>
  {/if}

  <!-- Recursive Query Tree (Root Group) -->
  {#snippet renderGroup(group: QueryGroup, depth: number, parentGroup: QueryGroup | null)}
    <div
      class={cn(
        'rounded-lg border p-3 space-y-3 transition-colors',
        depth === 0 ? 'border-border bg-muted/20' : 'border-primary/20 bg-primary/5 ml-4'
      )}
      data-query-group={group.id}
    >
      <!-- Group Header with Logical Operator Toggle & Action Buttons -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <div class="inline-flex rounded border border-border bg-background p-0.5 text-xs font-semibold">
            <button
              type="button"
              class={cn(
                'rounded px-2.5 py-0.5 transition-colors cursor-pointer',
                group.operator === 'AND'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onclick={() => {
                if (readOnly) return;
                group.operator = 'AND';
                notifyChange();
              }}
              disabled={readOnly}
            >
              并且 (AND)
            </button>
            <button
              type="button"
              class={cn(
                'rounded px-2.5 py-0.5 transition-colors cursor-pointer',
                group.operator === 'OR'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onclick={() => {
                if (readOnly) return;
                group.operator = 'OR';
                notifyChange();
              }}
              disabled={readOnly}
            >
              或者 (OR)
            </button>
          </div>
          <span class="text-[11px] text-muted-foreground">符合以下所有条件</span>
        </div>

        {#if !readOnly}
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted transition-colors cursor-pointer"
              onclick={() => addRuleToGroup(group)}
            >
              <Plus class="h-3 w-3 text-primary" />
              <span>添加规则</span>
            </button>

            {#if depth < maxDepth}
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted transition-colors cursor-pointer"
                onclick={() => addSubGroup(group, depth + 1)}
              >
                <FolderPlus class="h-3 w-3 text-warning" />
                <span>添加嵌套组</span>
              </button>
            {/if}

            {#if parentGroup}
              <button
                type="button"
                class="rounded p-1 text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                onclick={() => removeRule(parentGroup, group.id)}
                aria-label="Delete group"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Group Rules / Subgroups -->
      <div class="space-y-2 pl-2 border-l-2 border-border/80">
        {#each group.rules as item (item.id)}
          {#if isGroup(item)}
            {@render renderGroup(item, depth + 1, group)}
          {:else}
            {@const fieldDef = fields.find((f) => f.key === item.field)}
            {@const allowedOps = getOperatorsForType(fieldDef?.type ?? 'text')}
            <div
              class="flex flex-wrap items-center gap-2 rounded border border-border/60 bg-card p-2 text-xs"
              data-query-rule={item.id}
            >
              <!-- Field Picker -->
              <select data-size="compact"
                class="svadmin-select svadmin-select--inline"
                bind:value={item.field}
                onchange={() => {
                  const newField = fields.find((f) => f.key === item.field);
                  item.operator = getOperatorsForType(newField?.type ?? 'text')[0]?.value ?? 'equals';
                  item.value = '';
                  notifyChange();
                }}
                disabled={readOnly}
              >
                {#each fields as field (field.key)}
                  <option value={field.key}>{field.label}</option>
                {/each}
              </select>

              <!-- Operator Picker -->
              <select data-size="compact"
                class="svadmin-select svadmin-select--inline font-mono"
                bind:value={item.operator}
                onchange={notifyChange}
                disabled={readOnly}
              >
                {#each allowedOps as op (op.value)}
                  <option value={op.value}>{op.label}</option>
                {/each}
              </select>

              <!-- Value Input (depending on operator / field type) -->
              {#if item.operator !== 'is_null' && item.operator !== 'is_not_null'}
                {#if fieldDef?.type === 'select' && fieldDef.options}
                  <select data-size="compact"
                    class="svadmin-select min-w-[120px]"
                    bind:value={item.value}
                    onchange={notifyChange}
                    disabled={readOnly}
                  >
                    <option value="">请选择选项</option>
                    {#each fieldDef.options as opt (opt.value)}
                      <option value={opt.value}>{opt.label}</option>
                    {/each}
                  </select>
                {:else if fieldDef?.type === 'number'}
                  <input
                    type="number"
                    class="rounded border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary w-28 font-mono"
                    bind:value={item.value}
                    oninput={notifyChange}
                    placeholder="输入数值"
                    disabled={readOnly}
                  />
                {:else if fieldDef?.type === 'date'}
                  <input
                    type="date"
                    class="rounded border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary w-36 font-mono"
                    bind:value={item.value}
                    onchange={notifyChange}
                    disabled={readOnly}
                  />
                {:else}
                  <input
                    type="text"
                    class="rounded border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary min-w-[160px] flex-1"
                    bind:value={item.value}
                    oninput={notifyChange}
                    placeholder="输入匹配内容..."
                    disabled={readOnly}
                  />
                {/if}
              {:else}
                <span class="text-xs font-mono text-muted-foreground italic px-2">无须传值</span>
              {/if}

              {#if !readOnly}
                <button
                  type="button"
                  class="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-auto cursor-pointer"
                  onclick={() => removeRule(group, item.id)}
                  aria-label="Delete rule"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/snippet}

  {@render renderGroup(rootGroup, 0, null)}
</div>
