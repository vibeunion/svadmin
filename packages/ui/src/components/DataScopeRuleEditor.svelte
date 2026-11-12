<script lang="ts">
  import { untrack } from 'svelte';
  import { Shield, Layers } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type ScopeScopeType = 'all' | 'dept_and_sub' | 'dept_only' | 'self_only' | 'custom_sql';

  export interface DataScopeRule {
    resource: string;
    scopeType: ScopeScopeType;
    customExpression?: string | undefined;
  }

  export interface DataScopeRuleEditorProps {
    roleName: string;
    resources: Array<{ key: string; label: string }>;
    initialRules?: DataScopeRule[] | undefined;
    onchange?: ((rules: DataScopeRule[]) => void) | undefined;
    class?: string | undefined;
  }

  let {
    roleName = '华东大区销售经理',
    resources = [
      { key: 'orders', label: '财务与交易订单' },
      { key: 'customers', label: '客户资产档案' },
      { key: 'contracts', label: '商务合同管理' },
    ],
    initialRules,
    onchange,
    class: className = '',
  }: DataScopeRuleEditorProps = $props();

  function initDefaultRules(): DataScopeRule[] {
    return resources.map((r) => ({
      resource: r.key,
      scopeType: 'dept_and_sub',
      customExpression: '',
    }));
  }

  let rules = $state<DataScopeRule[]>(untrack(() => initialRules ?? initDefaultRules()));

  function handleScopeChange(resourceKey: string, scopeType: ScopeScopeType) {
    rules = rules.map((r) => (r.resource === resourceKey ? { ...r, scopeType } : r));
    onchange?.($state.snapshot(rules));
  }

  function handleCustomExpressionChange(resourceKey: string, customExpression: string) {
    rules = rules.map((r) => (r.resource === resourceKey ? { ...r, customExpression } : r));
    onchange?.($state.snapshot(rules));
  }

  const scopeOptions: Array<{ value: ScopeScopeType; label: string; desc: string }> = [
    { value: 'all', label: '全部数据权限', desc: '可查看系统中该资源的全部数据' },
    { value: 'dept_and_sub', label: '本部门及下级部门', desc: '基于组织架构树自动向下穿透' },
    { value: 'dept_only', label: '仅本部门', desc: '仅限同级部门成员产生的数据' },
    { value: 'self_only', label: '仅本人', desc: '仅本人创建或指派负责的数据' },
    { value: 'custom_sql', label: '自定义过滤规则', desc: '指定 SQL 表达式或条件' },
  ];
</script>

<div
  class={cn('rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs space-y-4', className)}
  data-svadmin-component="DataScopeRuleEditor"
>
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
    <div class="flex items-center gap-2">
      <div class="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Shield class="h-4 w-4" />
      </div>
      <div>
        <h3 class="font-bold text-sm text-foreground">数据行级权限规则中心 (Data Scope)</h3>
        <p class="text-xs text-muted-foreground">当前配置角色: <strong class="text-foreground">{roleName}</strong></p>
      </div>
    </div>
    <span class="text-xs font-mono text-muted-foreground">行级安全访问控制 (Row-Level Security)</span>
  </header>

  <!-- Rules Table -->
  <div class="space-y-4 text-xs font-mono">
    {#each resources as res (res.key)}
      {@const currentRule = rules.find((r) => r.resource === res.key) ?? { resource: res.key, scopeType: 'dept_and_sub' }}
      <div class="rounded-lg border border-border bg-muted/20 p-4 space-y-3" data-resource-rule={res.key}>
        <div class="flex items-center justify-between border-b border-border/60 pb-2">
          <div class="flex items-center gap-2 font-sans font-bold text-foreground">
            <Layers class="h-4 w-4 text-primary" />
            <span>{res.label}</span>
            <code class="text-muted-foreground font-mono font-normal text-[11px] bg-muted px-1.5 py-0.5 rounded">
              {res.key}
            </code>
          </div>
          <span class="text-muted-foreground text-[11px]">当前模式: <strong class="text-primary">{currentRule.scopeType}</strong></span>
        </div>

        <!-- Scope Radio Options -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 font-sans">
          {#each scopeOptions as opt (opt.value)}
            <label
              class={cn(
                'flex items-start gap-2 p-2.5 rounded-lg border transition-all cursor-pointer',
                currentRule.scopeType === opt.value
                  ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/20'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
              )}
            >
              <input
                type="radio"
                name={`scope_${res.key}`}
                value={opt.value}
                checked={currentRule.scopeType === opt.value}
                onchange={() => handleScopeChange(res.key, opt.value)}
                class="mt-0.5 accent-primary shrink-0"
              />
              <div class="min-w-0">
                <span class="font-bold text-xs block text-foreground">{opt.label}</span>
                <span class="text-[10px] text-muted-foreground block leading-tight mt-0.5">{opt.desc}</span>
              </div>
            </label>
          {/each}
        </div>

        <!-- Custom SQL expression input if custom_sql is selected -->
        {#if currentRule.scopeType === 'custom_sql'}
          <div class="pt-2 border-t border-border/40 space-y-1">
            <label for={`sql_${res.key}`} class="block text-muted-foreground text-[11px] font-sans">
              输入自定义过滤 SQL 表达式 (自动附加到 WHERE 子句):
            </label>
            <input
              id={`sql_${res.key}`}
              type="text"
              class="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
              value={currentRule.customExpression ?? ''}
              oninput={(e) => handleCustomExpressionChange(res.key, (e.currentTarget as HTMLInputElement).value)}
              placeholder="例如: tenant_id = current_tenant() AND region IN ('华东', '华南')"
            />
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
