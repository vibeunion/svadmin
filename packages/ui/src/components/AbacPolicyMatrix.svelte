<script lang="ts">
  import {
    ShieldCheck,
    CheckCircle2,
    XCircle,
    EyeOff,
    Plus,
    Search,
    Trash2,
    KeyRound,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface AbacCondition {
    field: string;
    operator: 'eq' | 'in' | 'gte' | 'lte' | 'contains';
    value: string | number;
  }

  export interface AbacPolicyRule {
    id: string;
    name: string;
    description?: string | undefined;
    effect: 'allow' | 'mask' | 'deny' | 'require_mfa';
    resource: string;
    action: 'read' | 'write' | 'export' | 'delete' | 'all';
    subjects: AbacCondition[];
    resources: AbacCondition[];
    environmentNote?: string | undefined;
    priority: number;
    enabled: boolean;
  }

  export interface AbacPolicyMatrixProps {
    rules?: AbacPolicyRule[] | undefined;
    title?: string | undefined;
    description?: string | undefined;
    class?: string | undefined;
    onToggleRule?: ((ruleId: string, enabled: boolean) => void) | undefined;
    onAddRule?: (() => void) | undefined;
    onDeleteRule?: ((ruleId: string) => void) | undefined;
  }

  let {
    rules = $bindable([
      {
        id: 'abac-01',
        name: '财务经理大额资金调拨审批放行',
        description: '财务部职级 >= M2 且交易金额 <= 5,000,000 时直接放行',
        effect: 'allow',
        resource: 'TreasuryPayment',
        action: 'write',
        subjects: [
          { field: 'department', operator: 'eq', value: '财务部' },
          { field: 'level', operator: 'gte', value: 'M2' },
        ],
        resources: [
          { field: 'amount', operator: 'lte', value: '5000000' },
        ],
        environmentNote: '企业内部专用专线 IP 访问',
        priority: 100,
        enabled: true,
      },
      {
        id: 'abac-02',
        name: '普通业务专员薪酬资产动态脱敏',
        description: '非人力核心岗位调阅员工列表时，隐藏银行账号与薪资金额',
        effect: 'mask',
        resource: 'EmployeeCompensation',
        action: 'read',
        subjects: [
          { field: 'role', operator: 'in', value: '业务专员,客户运营' },
        ],
        resources: [
          { field: 'classification', operator: 'eq', value: '核心隐私' },
        ],
        environmentNote: '全时段适用',
        priority: 85,
        enabled: true,
      },
      {
        id: 'abac-03',
        name: '非工作时段核心审计库防篡改阻断',
        description: '夜间 22:00 - 次日 08:00 严禁任何物理删除与结构变更操作',
        effect: 'deny',
        resource: 'AuditArchiveStore',
        action: 'delete',
        subjects: [
          { field: 'role', operator: 'in', value: '全部人员' },
        ],
        resources: [
          { field: 'system_tier', operator: 'eq', value: '等保三级库' },
        ],
        environmentNote: '非工作时段触发强制拦截',
        priority: 95,
        enabled: true,
      },
      {
        id: 'abac-04',
        name: '大批量跨租户数据导出强制 MFA',
        description: '单次导出超 10,000 条数据必须触发二次 OTP 身份挑战验证',
        effect: 'require_mfa',
        resource: 'BatchDataExport',
        action: 'export',
        subjects: [
          { field: 'role', operator: 'eq', value: '数据管理员' },
        ],
        resources: [
          { field: 'record_count', operator: 'gte', value: '10000' },
        ],
        environmentNote: '需绑定双因子 TOTP 令牌',
        priority: 90,
        enabled: true,
      },
    ]),
    title = '企业级 ABAC 动态访问控制策略矩阵 (Policy Matrix)',
    description = '综合主体属性（部门/职级）、客体属性（数据密级/金额）与环境约束动态判定访问权限',
    class: className = '',
    onToggleRule,
    onAddRule,
    onDeleteRule,
  }: AbacPolicyMatrixProps = $props();

  let searchKeyword = $state('');
  let filterEffect = $state<'all' | 'allow' | 'mask' | 'require_mfa' | 'deny'>('all');

  let filteredRules = $derived(
    rules.filter((r) => {
      if (filterEffect !== 'all' && r.effect !== filterEffect) return false;
      if (!searchKeyword.trim()) return true;
      const q = searchKeyword.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.resource.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    })
  );

  let allowCount = $derived(rules.filter((r) => r.effect === 'allow').length);
  let maskCount = $derived(rules.filter((r) => r.effect === 'mask').length);
  let mfaCount = $derived(rules.filter((r) => r.effect === 'require_mfa').length);
  let denyCount = $derived(rules.filter((r) => r.effect === 'deny').length);

  function getEffectMeta(effect: AbacPolicyRule['effect']) {
    switch (effect) {
      case 'allow':
        return { label: '正常放行', class: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 };
      case 'mask':
        return { label: '动态脱敏', class: 'bg-info/10 text-info border-info/20', icon: EyeOff };
      case 'require_mfa':
        return { label: '需阶梯提权', class: 'bg-warning/10 text-warning border-warning/20', icon: KeyRound };
      case 'deny':
        return { label: '绝对阻断', class: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle };
    }
  }

  function toggleEnabled(ruleId: string) {
    rules = rules.map((r) => {
      if (r.id !== ruleId) return r;
      const next = !r.enabled;
      onToggleRule?.(ruleId, next);
      return { ...r, enabled: next };
    });
  }

  function handleDelete(ruleId: string) {
    rules = rules.filter((r) => r.id !== ruleId);
    onDeleteRule?.(ruleId);
  }
</script>

<div
  class={cn('w-full rounded-2xl border border-border bg-card text-foreground shadow-sm flex flex-col overflow-hidden', className)}
  data-svadmin-component="abac-policy-matrix"
>
  <!-- 头部控制栏与指标 -->
  <div class="p-5 border-b border-border bg-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <ShieldCheck class="w-5 h-5 text-primary" />
        <h3 class="text-base font-semibold text-foreground tracking-tight">{title}</h3>
      </div>
      <p class="text-xs text-muted-foreground mt-1">{description}</p>
    </div>

    <!-- 指标胶囊 -->
    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs">
        <span class="text-muted-foreground">总策略:</span>
        <span class="font-semibold text-foreground">{rules.length}</span>
      </div>
      <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-success/20 bg-success/10 text-xs">
        <span class="text-success font-medium">放行:</span>
        <span class="font-bold text-success">{allowCount}</span>
      </div>
      <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-info/20 bg-info/10 text-xs">
        <span class="text-info font-medium">脱敏:</span>
        <span class="font-bold text-info">{maskCount}</span>
      </div>
      <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-warning/20 bg-warning/10 text-xs">
        <span class="text-warning font-medium">MFA:</span>
        <span class="font-bold text-warning">{mfaCount}</span>
      </div>
      <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-destructive/20 bg-destructive/10 text-xs">
        <span class="text-destructive font-medium">阻断:</span>
        <span class="font-bold text-destructive">{denyCount}</span>
      </div>
    </div>
  </div>

  <!-- 搜索与操作栏 -->
  <div class="p-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2.5">
    <div class="flex items-center gap-2">
      <div class="relative flex items-center">
        <Search class="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          bind:value={searchKeyword}
          placeholder="按规则名称、资源类型检索…"
          class="w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div class="flex items-center gap-1 text-xs">
        {#each [
          { id: 'all' as const, label: '全部' },
          { id: 'allow' as const, label: '放行' },
          { id: 'mask' as const, label: '脱敏' },
          { id: 'require_mfa' as const, label: '需MFA' },
          { id: 'deny' as const, label: '阻断' },
        ] as eff (eff.id)}
          <button
            type="button"
            class={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
              filterEffect === eff.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            onclick={() => (filterEffect = eff.id)}
          >
            {eff.label}
          </button>
        {/each}
      </div>
    </div>

    <Button
      variant="default"
      size="sm"
      class="h-8 gap-1.5 text-xs bg-primary text-primary-foreground"
      onclick={() => onAddRule?.()}
    >
      <Plus class="w-3.5 h-3.5" />
      <span>新建 ABAC 规则</span>
    </Button>
  </div>

  <!-- 策略规则列表 -->
  <div class="divide-y divide-border/60 overflow-x-auto">
    {#if filteredRules.length === 0}
      <div class="py-16 text-center text-sm text-muted-foreground">
        未找到匹配的 ABAC 访问控制规则
      </div>
    {:else}
      {#each filteredRules as rule (rule.id)}
        {@const effectMeta = getEffectMeta(rule.effect)}
        {@const EffectIcon = effectMeta.icon}
        <div class={cn('p-4 transition-colors flex flex-col gap-2.5', rule.enabled ? 'hover:bg-muted/30' : 'opacity-60 bg-muted/10')}>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-2.5 min-w-0">
              <div class={cn('flex items-center justify-center w-7 h-7 rounded-lg border shrink-0 mt-0.5', effectMeta.class)}>
                <EffectIcon class="w-4 h-4" />
              </div>

              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-semibold text-foreground">{rule.name}</span>
                  <span class={cn('text-[10px] px-1.5 py-0.2 rounded border font-medium leading-none', effectMeta.class)}>
                    {effectMeta.label}
                  </span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                    资源: {rule.resource}
                  </span>
                  <span class="text-[10px] text-muted-foreground font-mono">
                    优先级 {rule.priority}
                  </span>
                </div>
                {#if rule.description}
                  <p class="text-[11px] text-muted-foreground mt-0.5">{rule.description}</p>
                {/if}
              </div>
            </div>

            <!-- 开关与删除 -->
            <div class="flex items-center gap-2 shrink-0">
              <Button
                variant={rule.enabled ? 'outline' : 'secondary'}
                size="sm"
                class="h-7 text-[11px] px-2"
                onclick={() => toggleEnabled(rule.id)}
              >
                {rule.enabled ? '已启用' : '已停用'}
              </Button>
              <button
                type="button"
                class="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                title="删除规则"
                onclick={() => handleDelete(rule.id)}
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- 主体与客体条件网格 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px]">
            <!-- 主体属性 -->
            <div class="p-2 rounded-lg border border-border bg-card flex flex-col gap-1">
              <span class="text-[10px] font-medium text-muted-foreground">主体属性 (Subject):</span>
              <div class="flex flex-wrap gap-1">
                {#each rule.subjects as subj (subj.field)}
                  <span class="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] text-foreground">
                    {subj.field} {subj.operator} {subj.value}
                  </span>
                {/each}
              </div>
            </div>

            <!-- 客体属性 -->
            <div class="p-2 rounded-lg border border-border bg-card flex flex-col gap-1">
              <span class="text-[10px] font-medium text-muted-foreground">客体/数据属性 (Resource):</span>
              <div class="flex flex-wrap gap-1">
                {#each rule.resources as res (res.field)}
                  <span class="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] text-foreground">
                    {res.field} {res.operator} {res.value}
                  </span>
                {/each}
              </div>
            </div>

            <!-- 环境约束 -->
            <div class="p-2 rounded-lg border border-border bg-card flex flex-col gap-1">
              <span class="text-[10px] font-medium text-muted-foreground">环境条件 (Environment):</span>
              <span class="text-[11px] text-foreground">
                {rule.environmentNote ?? '无限制'}
              </span>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
