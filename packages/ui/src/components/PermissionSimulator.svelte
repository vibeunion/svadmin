<script lang="ts">
  import {
    UserCheck,
    Shield,
    CheckCircle2,
    XCircle,
    Eye,
    KeyRound,
    Database,
    Lock,
    User,
    Layers,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface SimulationTargetUser {
    id: string;
    name: string;
    department: string;
    level: string;
    securityClearance: 'L1' | 'L2' | 'L3' | 'L4';
    roles: string[];
    simulatedIp?: string | undefined;
    isWorkingHours?: boolean | undefined;
  }

  export interface SimulatedMenuNode {
    id: string;
    title: string;
    path: string;
    visible: boolean;
    reason: string;
  }

  export interface SimulatedAction {
    action: string;
    resource: string;
    effect: 'allow' | 'mask' | 'require_mfa' | 'deny';
    ruleMatched: string;
  }

  export interface PermissionSimulatorProps {
    users?: SimulationTargetUser[] | undefined;
    selectedUserId?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    class?: string | undefined;
    onSimulate?: ((user: SimulationTargetUser) => void) | undefined;
  }

  let {
    users = [
      {
        id: 'usr-fin-01',
        name: '李思远 (财务主管)',
        department: '财务结算中心',
        level: 'M2',
        securityClearance: 'L3',
        roles: ['财务经理', '资金调度员'],
        simulatedIp: '192.168.10.42 (内网专用专线)',
        isWorkingHours: true,
      },
      {
        id: 'usr-dev-02',
        name: '王小磊 (初级开发工程师)',
        department: '技术工程部',
        level: 'P5',
        securityClearance: 'L1',
        roles: ['研发人员'],
        simulatedIp: '10.8.0.55 (本地测试网段)',
        isWorkingHours: true,
      },
      {
        id: 'usr-sec-03',
        name: '赵宏 (合规安全总监)',
        department: '信息安全合规处',
        level: 'D1',
        securityClearance: 'L4',
        roles: ['合规审计员', '安全网关主管'],
        simulatedIp: '192.168.1.1 (机房管理骨干网)',
        isWorkingHours: false,
      },
    ],
    selectedUserId = $bindable('usr-fin-01'),
    title = '角色与多维属性权限模拟沙箱 (Permission Simulator)',
    description = '无需换号登录，直接以指定员工身份模拟其可访问菜单、高危动作裁决与行级数据范围',
    class: className = '',
    onSimulate,
  }: PermissionSimulatorProps = $props();

  let currentUser = $derived(
    users.find((u) => u.id === selectedUserId) ?? users[0]
  );

  let simulatedMenus = $derived<SimulatedMenuNode[]>([
    { id: 'm1', title: '全景运营仪表盘', path: '/dashboard', visible: true, reason: '基础角色通用授权' },
    {
      id: 'm2',
      title: '大额资金调拨中心',
      path: '/finance/payments',
      visible: currentUser?.department === '财务结算中心' || currentUser?.securityClearance === 'L4',
      reason: currentUser?.department === '财务结算中心' ? '符合部门属性与安全密级' : '非财务岗位不可见',
    },
    {
      id: 'm3',
      title: '核心数据资产审计',
      path: '/audit/trail',
      visible: currentUser?.securityClearance === 'L3' || currentUser?.securityClearance === 'L4',
      reason: (currentUser?.securityClearance === 'L3' || currentUser?.securityClearance === 'L4') ? '具备 L3+ 安全密级' : '需 L3 及以上密级',
    },
    {
      id: 'm4',
      title: '全量员工薪酬名册',
      path: '/hr/compensation',
      visible: currentUser?.securityClearance === 'L4',
      reason: currentUser?.securityClearance === 'L4' ? 'L4 核心特权可见' : '普通职级完全隐藏',
    },
  ]);

  let simulatedActions = $derived<SimulatedAction[]>([
    {
      action: '发起大额资金支付 (¥5,000,000)',
      resource: 'TreasuryPayment',
      effect: currentUser?.level === 'M2' ? 'allow' : 'deny',
      ruleMatched: currentUser?.level === 'M2' ? 'ABAC-01 (财务M2直接放行)' : 'ABAC-01 (职级不足被阻断)',
    },
    {
      action: '调阅客户敏感手机号与地址',
      resource: 'CustomerRecord',
      effect: currentUser?.securityClearance === 'L4' ? 'allow' : 'mask',
      ruleMatched: currentUser?.securityClearance === 'L4' ? '合规总监明文调阅' : 'ABAC-02 (动态脱敏掩码展示)',
    },
    {
      action: '单次导出 10,000+ 条流水记录',
      resource: 'BatchDataExport',
      effect: 'require_mfa',
      ruleMatched: 'ABAC-04 (大批量导出需 MFA 二次认证)',
    },
    {
      action: '物理清空 2025 年度审计数据库',
      resource: 'AuditArchiveStore',
      effect: 'deny',
      ruleMatched: 'ABAC-03 (高危不可逆操作绝对拦截)',
    },
  ]);

  let simulatedRlsSql = $derived(
    currentUser?.department === '财务结算中心'
      ? "SELECT * FROM payments WHERE tenant_id = 'HQ-GLOBAL' AND approval_status = 'approved'"
      : currentUser?.securityClearance === 'L4'
      ? "SELECT * FROM payments WHERE 1=1 /* 全局审计穿透视图 */"
      : "SELECT * FROM payments WHERE creator_id = '" + (currentUser?.id ?? '') + "' /* 仅限本人创建 */"
  );

  function handleSelectUser(user: SimulationTargetUser) {
    selectedUserId = user.id;
    onSimulate?.(user);
  }

  function getEffectBadge(effect: SimulatedAction['effect']) {
    switch (effect) {
      case 'allow':
        return { label: '允许放行', class: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 };
      case 'mask':
        return { label: '脱敏展示', class: 'bg-info/10 text-info border-info/20', icon: Eye };
      case 'require_mfa':
        return { label: '需提权MFA', class: 'bg-warning/10 text-warning border-warning/20', icon: KeyRound };
      case 'deny':
        return { label: '安全阻断', class: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle };
    }
  }
</script>

<div
  class={cn('w-full rounded-2xl border border-border bg-card text-foreground shadow-sm flex flex-col overflow-hidden', className)}
  data-svadmin-component="permission-simulator"
>
  <!-- 头部与身份选择条 -->
  <div class="p-5 border-b border-border bg-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <UserCheck class="w-5 h-5 text-primary" />
        <h3 class="text-base font-semibold text-foreground tracking-tight">{title}</h3>
      </div>
      <p class="text-xs text-muted-foreground mt-1">{description}</p>
    </div>

    <!-- 模拟目标员工切换 -->
    <div class="flex items-center gap-1.5 flex-wrap">
      {#each users as u (u.id)}
        {@const isActive = u.id === selectedUserId}
        <button
          type="button"
          class={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150',
            isActive
              ? 'border-primary/50 bg-primary/10 text-primary shadow-xs'
              : 'border-border bg-card hover:bg-muted text-foreground'
          )}
          onclick={() => handleSelectUser(u)}
        >
          <User class="w-3.5 h-3.5" />
          <span>{u.name}</span>
          <span class="text-[10px] px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border">
            {u.securityClearance}
          </span>
        </button>
      {/each}
    </div>
  </div>

  <!-- 当前模拟身份详情卡片 -->
  {#if currentUser}
    <div class="px-5 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="font-semibold text-foreground">{currentUser.name}</span>
        <span class="text-muted-foreground">部门: {currentUser.department}</span>
        <span class="text-muted-foreground">职级: {currentUser.level}</span>
        <span class="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
          安全密级: {currentUser.securityClearance}
        </span>
        <div class="flex items-center gap-1">
          <span class="text-muted-foreground">角色:</span>
          {#each currentUser.roles as r (r)}
            <span class="px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border text-[10px]">
              {r}
            </span>
          {/each}
        </div>
      </div>

      <div class="text-[11px] text-muted-foreground font-mono">
        模拟 IP: {currentUser.simulatedIp}
      </div>
    </div>
  {/if}

  <!-- 三栏推演展示区 -->
  <div class="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border">
    <!-- 栏目 1：菜单可见性推演 -->
    <div class="p-4 flex flex-col gap-2">
      <div class="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
        <Layers class="w-4 h-4 text-primary" />
        <span>系统导航可见性推演</span>
      </div>

      <div class="space-y-2">
        {#each simulatedMenus as menu (menu.id)}
          <div class="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between text-xs">
            <div class="flex flex-col">
              <span class="font-medium text-foreground">{menu.title}</span>
              <span class="text-[10px] text-muted-foreground font-mono">{menu.path}</span>
              <span class="text-[10px] text-muted-foreground mt-0.5">{menu.reason}</span>
            </div>

            {#if menu.visible}
              <span class="flex items-center gap-1 text-[11px] text-success font-medium shrink-0">
                <CheckCircle2 class="w-3.5 h-3.5" />
                正常呈现
              </span>
            {:else}
              <span class="flex items-center gap-1 text-[11px] text-muted-foreground font-medium shrink-0 opacity-70">
                <Lock class="w-3.5 h-3.5" />
                已被隐藏
              </span>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- 栏目 2：高危操作裁决沙箱 -->
    <div class="p-4 flex flex-col gap-2">
      <div class="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
        <Shield class="w-4 h-4 text-primary" />
        <span>高危业务动作裁决结果</span>
      </div>

      <div class="space-y-2">
        {#each simulatedActions as act (act.action)}
          {@const meta = getEffectBadge(act.effect)}
          {@const MetaIcon = meta.icon}
          <div class="p-2.5 rounded-xl border border-border bg-card flex items-start justify-between gap-2 text-xs">
            <div class="flex flex-col min-w-0">
              <span class="font-medium text-foreground truncate">{act.action}</span>
              <span class="text-[10px] text-muted-foreground">资源: {act.resource}</span>
              <span class="text-[10px] text-muted-foreground/80 mt-0.5">{act.ruleMatched}</span>
            </div>

            <span class={cn('flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 leading-none', meta.class)}>
              <MetaIcon class="w-3 h-3" />
              {meta.label}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <!-- 栏目 3：行级数据范围 RLS 推演 -->
    <div class="p-4 flex flex-col gap-2">
      <div class="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
        <Database class="w-4 h-4 text-primary" />
        <span>行级数据范围 (RLS) 注入推演</span>
      </div>

      <div class="p-3 rounded-xl border border-border bg-muted/20 flex flex-col gap-2 text-xs">
        <p class="text-[11px] text-muted-foreground">
          当该员工在界面发起列表或图表查询时，底层 DataProvider 自动注入的条件表达式：
        </p>

        <pre class="p-3 rounded-lg border border-border bg-card font-mono text-[11px] text-primary whitespace-pre-wrap leading-relaxed">{simulatedRlsSql}</pre>

        <div class="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
          状态：数据范围过滤已生效，杜绝跨部门或跨权限越权读取。
        </div>
      </div>
    </div>
  </div>
</div>
