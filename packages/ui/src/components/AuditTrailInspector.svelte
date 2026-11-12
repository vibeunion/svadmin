<script lang="ts">
    import {
    ShieldAlert,
    CheckCircle2,
    XCircle,
    User,
    Globe,
    Clock,
    ArrowRight,
    Download,
    RefreshCw,
    Search,
    Filter,
    FileCode,
    Copy,
    Check,
    Building2,
    ChevronDown,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface AuditActor {
    id: string;
    name: string;
    email?: string | undefined;
    avatar?: string | undefined;
    ip?: string | undefined;
    userAgent?: string | undefined;
    role?: string | undefined;
  }

  export interface AuditFieldChange {
    field: string;
    label?: string | undefined;
    before?: unknown;
    after?: unknown;
  }

  export interface AuditEventItem {
    id: string;
    timestamp: string;
    actor: AuditActor;
    action: string;
    actionLabel: string;
    resource: string;
    resourceId?: string | undefined;
    tenantId?: string | undefined;
    tenantName?: string | undefined;
    severity?: 'info' | 'warning' | 'critical' | undefined;
    status: 'success' | 'failure' | 'blocked';
    traceId?: string | undefined;
    details?: Record<string, unknown> | undefined;
    changes?: AuditFieldChange[] | undefined;
  }

  export interface AuditTrailInspectorProps {
    events?: AuditEventItem[] | undefined;
    isLoading?: boolean | undefined;
    title?: string | undefined;
    description?: string | undefined;
    class?: string | undefined;
    onRefresh?: (() => void | Promise<void>) | undefined;
    onExport?: ((events: AuditEventItem[]) => void) | undefined;
    onViewDetail?: ((event: AuditEventItem) => void) | undefined;
  }

  let {
    events = [
      {
        id: 'evt-aud-1091',
        timestamp: '2026-11-12 10:24:18',
        actor: { id: 'usr-981', name: '李思远 (运营主管)', email: 'siyuan.li@example.com', ip: '192.168.10.42', role: 'SecOps Auditor' },
        action: 'tenant_switch',
        actionLabel: '切换工作区租户',
        resource: 'TenantContext',
        resourceId: 'tenant-east-02',
        tenantId: 'tenant-east-02',
        tenantName: '华东大区创新科技中心',
        severity: 'info',
        status: 'success',
        traceId: 'trc-9821-fa44-a1',
        details: { previousTenant: 'tenant-corp-01', switchedAt: '2026-11-12T10:24:18Z' },
      },
      {
        id: 'evt-aud-1090',
        timestamp: '2026-11-12 09:58:30',
        actor: { id: 'usr-412', name: '赵宏 (财务总监)', email: 'hong.zhao@example.com', ip: '10.8.0.12', role: 'Finance Admin' },
        action: 'permission_grant',
        actionLabel: '跨组织提权审批',
        resource: 'RolePermission',
        resourceId: 'role-treasury-lead',
        tenantId: 'tenant-corp-01',
        tenantName: '星谷数智总集团',
        severity: 'critical',
        status: 'success',
        traceId: 'trc-8820-cb91-e4',
        changes: [
          { field: 'payments:execute', label: '资金支付执行权', before: false, after: true },
          { field: 'export:unmasked', label: '银行流水明细导出', before: 'masked', after: 'full_plaintext' },
        ],
      },
      {
        id: 'evt-aud-1089',
        timestamp: '2026-11-12 09:12:05',
        actor: { id: 'usr-unknown', name: '未知外网主机', email: 'guest@external.net', ip: '203.0.113.88', role: 'Anonymous' },
        action: 'bulk_delete',
        actionLabel: '尝试物理清空审计库',
        resource: 'AuditArchiveStore',
        resourceId: 'store-db-archive-2025',
        tenantId: 'tenant-corp-01',
        tenantName: '星谷数智总集团',
        severity: 'critical',
        status: 'blocked',
        traceId: 'trc-blk-3310-xx',
        details: { reason: '触发不可逆双人复核门禁与防篡改规则拦截', blockCode: 'GATE_DUAL_AUTH_REQUIRED' },
      },
      {
        id: 'evt-aud-1088',
        timestamp: '2026-11-12 08:30:00',
        actor: { id: 'usr-104', name: '王敏 (数据专员)', email: 'min.wang@example.com', ip: '192.168.1.105', role: 'Data Operator' },
        action: 'data_export',
        actionLabel: '大批量工单全字段导出',
        resource: 'WorkOrderBatch',
        resourceId: 'batch-202611-q4',
        tenantId: 'tenant-east-02',
        tenantName: '华东大区创新科技中心',
        severity: 'warning',
        status: 'success',
        traceId: 'trc-exp-7712-bb',
        details: { recordCount: 14200, format: 'XLSX_SECURE', watermarkAttached: true },
      },
    ],
    isLoading = false,
    title = '全局操作审计追踪中心 (Audit Trail)',
    description = '实时捕获跨租户切换、高危指令、权限提权与数据流转审计事件',
    class: className = '',
    onRefresh,
    onExport,
    onViewDetail,
  }: AuditTrailInspectorProps = $props();

  let searchKeyword = $state('');
  let selectedSeverity = $state<'all' | 'info' | 'warning' | 'critical'>('all');
  let selectedStatus = $state<'all' | 'success' | 'failure' | 'blocked'>('all');
  let expandedEventId = $state<string | null>(null);
  let copiedTraceId = $state<string | null>(null);

  let filteredEvents = $derived(
    events.filter((evt) => {
      if (selectedSeverity !== 'all' && evt.severity !== selectedSeverity) {
        return false;
      }
      if (selectedStatus !== 'all' && evt.status !== selectedStatus) {
        return false;
      }
      if (!searchKeyword.trim()) return true;
      const q = searchKeyword.toLowerCase();
      const matchActor = evt.actor.name.toLowerCase().includes(q) || (evt.actor.ip && evt.actor.ip.includes(q));
      const matchAction = evt.actionLabel.toLowerCase().includes(q) || evt.action.toLowerCase().includes(q);
      const matchResource = evt.resource.toLowerCase().includes(q) || (evt.tenantName && evt.tenantName.toLowerCase().includes(q));
      return matchActor || matchAction || matchResource;
    })
  );

  let criticalCount = $derived(events.filter((e) => e.severity === 'critical').length);
  let blockedCount = $derived(events.filter((e) => e.status === 'blocked').length);
  let tenantSwitchCount = $derived(events.filter((e) => e.action === 'tenant_switch').length);

  function copyTrace(traceId?: string) {
    if (!traceId) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(traceId);
      copiedTraceId = traceId;
      setTimeout(() => {
        copiedTraceId = null;
      }, 2000);
    }
  }

  function toggleExpand(id: string) {
    expandedEventId = expandedEventId === id ? null : id;
    if (expandedEventId) {
      const found = events.find(e => e.id === id);
      if (found) onViewDetail?.(found);
    }
  }

  function getSeverityBadge(severity?: string) {
    switch (severity) {
      case 'critical':
        return { label: '高危阻断', class: 'bg-destructive/10 text-destructive border-destructive/20' };
      case 'warning':
        return { label: '重要告警', class: 'bg-warning/10 text-warning border-warning/20' };
      default:
        return { label: '常规信息', class: 'bg-info/10 text-info border-info/20' };
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'success':
        return { label: '已放行执行', icon: CheckCircle2, class: 'text-success' };
      case 'blocked':
        return { label: '安全门禁拦截', icon: ShieldAlert, class: 'text-destructive font-medium' };
      default:
        return { label: '执行失败', icon: XCircle, class: 'text-warning' };
    }
  }
</script>

<div
  class={cn('w-full rounded-2xl border border-border bg-card text-foreground shadow-sm flex flex-col overflow-hidden', className)}
  data-svadmin-component="audit-trail-inspector"
>
  <!-- 头部说明与统计指标 -->
  <div class="p-5 border-b border-border bg-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div class="flex flex-col">
      <div class="flex items-center gap-2">
        <ShieldAlert class="w-5 h-5 text-primary" />
        <h3 class="text-base font-semibold text-foreground tracking-tight">{title}</h3>
      </div>
      <p class="text-xs text-muted-foreground mt-1">{description}</p>
    </div>

    <!-- 快捷统计胶囊 -->
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs">
        <span class="text-muted-foreground">总事件:</span>
        <span class="font-semibold text-foreground">{events.length}</span>
      </div>

      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/20 bg-destructive/10 text-xs">
        <span class="text-destructive font-medium">高危提权:</span>
        <span class="font-bold text-destructive">{criticalCount}</span>
      </div>

      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-warning/20 bg-warning/10 text-xs">
        <span class="text-warning font-medium">门禁拦截:</span>
        <span class="font-bold text-warning">{blockedCount}</span>
      </div>

      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs">
        <Building2 class="w-3.5 h-3.5 text-muted-foreground" />
        <span class="text-muted-foreground">租户切换:</span>
        <span class="font-semibold text-foreground">{tenantSwitchCount}</span>
      </div>
    </div>
  </div>

  <!-- 工具与筛选栏 -->
  <div class="p-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2.5">
    <div class="flex flex-wrap items-center gap-2">
      <!-- 搜索输入 -->
      <div class="relative flex items-center">
        <Search class="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          bind:value={searchKeyword}
          placeholder="按操作人/IP/动作/资源模糊检索..."
          class="w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <!-- 级别筛选 -->
      <div class="flex items-center gap-1 text-xs">
        {#each [
          { id: 'all', label: '全部级别' },
          { id: 'critical', label: '高危' },
          { id: 'warning', label: '告警' },
          { id: 'info', label: '信息' },
        ] as sev (sev.id)}
          <button
            type="button"
            class={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
              selectedSeverity === sev.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            onclick={() => (selectedSeverity = sev.id as 'all' | 'critical' | 'warning' | 'info')}
          >
            {sev.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- 刷新与导出动作 -->
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        class="h-8 gap-1.5 text-xs"
        onclick={() => onRefresh?.()}
        disabled={isLoading}
      >
        <RefreshCw class={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
        <span>刷新日志</span>
      </Button>

      <Button
        variant="default"
        size="sm"
        class="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
        onclick={() => onExport?.(filteredEvents)}
      >
        <Download class="w-3.5 h-3.5" />
        <span>导出审计报告</span>
      </Button>
    </div>
  </div>

  <!-- 事件列表 -->
  <div class="divide-y divide-border/60 overflow-x-auto">
    {#if filteredEvents.length === 0}
      <div class="py-16 text-center text-sm text-muted-foreground">
        <Filter class="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>未筛选到符合条件的审计日志事件</p>
      </div>
    {:else}
      {#each filteredEvents as event (event.id)}
        {@const sevBadge = getSeverityBadge(event.severity)}
        {@const statusInfo = getStatusBadge(event.status)}
        {@const StatusIcon = statusInfo.icon}
        {@const isExpanded = expandedEventId === event.id}

        <div class="p-3.5 hover:bg-muted/30 transition-colors flex flex-col gap-2">
          <div class="flex items-start justify-between gap-3">
            <!-- 左侧：时间、用户、操作 -->
            <div class="flex items-start gap-3 min-w-0">
              <div class="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-muted/60 text-muted-foreground shrink-0 mt-0.5">
                <User class="w-4 h-4" />
              </div>

              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-semibold text-foreground">
                    {event.actor.name}
                  </span>
                  {#if event.actor.role}
                    <span class="text-[10px] text-muted-foreground px-1.5 py-0.2 rounded bg-muted border border-border">
                      {event.actor.role}
                    </span>
                  {/if}
                  <span class="text-xs font-medium text-foreground">
                    执行了 <span class="font-semibold text-primary">{event.actionLabel}</span>
                  </span>
                  <span class={cn('text-[10px] px-1.5 py-0.2 rounded border font-medium leading-none', sevBadge.class)}>
                    {sevBadge.label}
                  </span>
                </div>

                <div class="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
                  <span class="flex items-center gap-1 font-mono">
                    <Clock class="w-3 h-3" />
                    {event.timestamp}
                  </span>
                  <span class="flex items-center gap-1">
                    <Globe class="w-3 h-3" />
                    {event.actor.ip ?? '127.0.0.1'}
                  </span>
                  {#if event.tenantName}
                    <span class="flex items-center gap-1">
                      <Building2 class="w-3 h-3" />
                      {event.tenantName}
                    </span>
                  {/if}
                  <span class="text-muted-foreground/60">目标: {event.resource}</span>
                </div>
              </div>
            </div>

            <!-- 右侧：状态指示与链路回溯展开 -->
            <div class="flex items-center gap-2.5 shrink-0">
              <div class="flex items-center gap-1.5 text-xs">
                <StatusIcon class={cn('w-4 h-4', statusInfo.class)} />
                <span class={cn('hidden sm:inline text-xs', statusInfo.class)}>{statusInfo.label}</span>
              </div>

              {#if event.traceId}
                <button
                  type="button"
                  class="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="点击复制 Trace ID"
                  onclick={() => copyTrace(event.traceId)}
                >
                  <span>{event.traceId}</span>
                  {#if copiedTraceId === event.traceId}
                    <Check class="w-3 h-3 text-success" />
                  {:else}
                    <Copy class="w-3 h-3 opacity-60" />
                  {/if}
                </button>
              {/if}

              <button
                type="button"
                class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="展开审计变更明细"
                onclick={() => toggleExpand(event.id)}
              >
                <ChevronDown class={cn('w-4 h-4 transition-transform duration-200', isExpanded && 'rotate-180')} />
              </button>
            </div>
          </div>

          <!-- 展开详情面板：展示变更前/后对比与元数据详情 -->
          {#if isExpanded}
            <div class="mt-2 p-3.5 rounded-xl border border-border bg-muted/20 text-xs flex flex-col gap-3 animate-in fade-in-0 duration-150">
              {#if event.changes && event.changes.length > 0}
                <div>
                  <div class="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <FileCode class="w-3.5 h-3.5 text-primary" />
                    <span>实体属性变更前/后对比 (Field Diffs)</span>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {#each event.changes as change (change.field)}
                      <div class="p-2 rounded-lg border border-border bg-card flex flex-col gap-1">
                        <span class="font-medium text-foreground">{change.label ?? change.field}</span>
                        <div class="flex items-center justify-between text-[11px] gap-2 pt-1 border-t border-border/40">
                          <span class="text-destructive font-mono line-through truncate max-w-[120px]">
                            {String(change.before)}
                          </span>
                          <ArrowRight class="w-3 h-3 text-muted-foreground shrink-0" />
                          <span class="text-success font-mono font-medium truncate max-w-[120px]">
                            {String(change.after)}
                          </span>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if event.details}
                <div>
                  <div class="text-[11px] font-semibold text-foreground mb-1">执行上下文与拦截原因:</div>
                  <pre class="p-2.5 rounded-lg border border-border bg-muted/50 font-mono text-[11px] text-foreground overflow-x-auto">{JSON.stringify(event.details, null, 2)}</pre>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>
