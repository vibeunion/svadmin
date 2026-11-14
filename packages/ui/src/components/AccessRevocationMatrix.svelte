<script lang="ts">
  export type SystemType = 'cloud' | 'code' | 'vpn' | 'im' | 'database' | 'finance';
  export type PrivilegeLevel = 'superadmin' | 'admin' | 'write' | 'read';
  export type RevocationStatus = 'active' | 'revoking' | 'revoked' | 'failed';

  export interface TargetSystemAccess {
    id: string;
    systemName: string;
    systemType: SystemType;
    accountIdentifier: string;
    privilegeLevel: PrivilegeLevel;
    status: RevocationStatus;
    lastAccessedAt?: string;
    revokedAt?: string;
    failureReason?: string;
  }

  interface Props {
    employeeId: string;
    employeeName: string;
    systems?: TargetSystemAccess[];
    batchRevoking?: boolean;
    onRevokeSingle?: (systemId: string) => void;
    onRevokeBatch?: (systemIds: string[]) => void;
    onRetryFailed?: (systemId: string) => void;
    onAuditLogExport?: () => void;
  }

  const {
    employeeId,
    employeeName,
    systems = [],
    batchRevoking = false,
    onRevokeSingle,
    onRevokeBatch,
    onRetryFailed,
    onAuditLogExport,
  }: Props = $props();

  let selectedSystemIds = $state<string[]>([]);
  let showBatchConfirm = $state(false);

  const totalCount = $derived(systems.length);
  const revokedCount = $derived(systems.filter((s) => s.status === 'revoked').length);
  const failedCount = $derived(systems.filter((s) => s.status === 'failed').length);
  const superadminCount = $derived(systems.filter((s) => s.privilegeLevel === 'superadmin').length);
  const pendingRevocationCount = $derived(
    systems.filter((s) => s.status === 'active' || s.status === 'failed').length,
  );

  const revokedPercentage = $derived(
    totalCount === 0 ? 100 : Math.round((revokedCount / totalCount) * 100),
  );

  function getSystemTypeLabel(type: SystemType): string {
    switch (type) {
      case 'cloud':
        return '云基础设施';
      case 'code':
        return '代码仓库';
      case 'vpn':
        return '网络网关';
      case 'database':
        return '生产数据库';
      case 'im':
        return '协同办公';
      case 'finance':
        return '财务ERP';
      default:
        return type;
    }
  }

  function getPrivilegeBadgeClass(level: PrivilegeLevel): string {
    switch (level) {
      case 'superadmin':
        return 'bg-destructive/15 text-destructive border-destructive/30 font-semibold';
      case 'admin':
        return 'bg-warning/15 text-warning dark:text-warning border-warning/30';
      case 'write':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'read':
      default:
        return 'bg-muted text-muted-foreground border-border/50';
    }
  }

  function getPrivilegeLabel(level: PrivilegeLevel): string {
    switch (level) {
      case 'superadmin':
        return '超级管理员 (Root)';
      case 'admin':
        return '运维管理员';
      case 'write':
        return '读写权限';
      case 'read':
      default:
        return '只读授权';
    }
  }

  function getStatusBadge(status: RevocationStatus) {
    switch (status) {
      case 'revoked':
        return {
          label: '已回收注销',
          className: 'bg-success/15 text-success dark:text-success border-success/30',
        };
      case 'revoking':
        return {
          label: '回收注销中...',
          className: 'bg-info/15 text-info dark:text-info border-info/30 animate-pulse',
        };
      case 'failed':
        return {
          label: '回收失败',
          className: 'bg-destructive/15 text-destructive border-destructive/30 font-bold',
        };
      case 'active':
      default:
        return {
          label: '特权活跃中',
          className: 'bg-warning/15 text-warning dark:text-warning border-warning/30',
        };
    }
  }

  function toggleSelect(id: string) {
    if (selectedSystemIds.includes(id)) {
      selectedSystemIds = selectedSystemIds.filter((item) => item !== id);
    } else {
      selectedSystemIds = [...selectedSystemIds, id];
    }
  }

  function toggleSelectAll() {
    const unrevokedIds = systems.filter((s) => s.status !== 'revoked').map((s) => s.id);
    if (selectedSystemIds.length === unrevokedIds.length) {
      selectedSystemIds = [];
    } else {
      selectedSystemIds = unrevokedIds;
    }
  }

  function handleBatchRevokeTrigger() {
    if (selectedSystemIds.length === 0) return;
    showBatchConfirm = true;
  }

  function confirmBatchRevoke() {
    onRevokeBatch?.(selectedSystemIds);
    showBatchConfirm = false;
    selectedSystemIds = [];
  }
</script>

<div
  class="flex flex-col gap-5 rounded-xl border border-border/80 bg-card p-6 text-card-foreground shadow-sm transition-all"
  data-svadmin-component="AccessRevocationMatrix"
>
  <!-- 头部特权回收与合规风险总览卡片 -->
  <header class="flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/20 p-5 md:flex-row md:items-center md:justify-between">
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center gap-2">
        <h2 class="text-base font-semibold tracking-tight">企业级特权访问权限回收矩阵</h2>
        <span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          合规降权防泄密
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>被审计离职人: <strong class="font-medium text-foreground">{employeeName}</strong></span>
        <span>员工工号: <code class="rounded bg-muted px-1.5 py-0.5 font-mono">{employeeId}</code></span>
        <span>待回收系统数: <strong class="text-warning dark:text-warning">{pendingRevocationCount}</strong></span>
      </div>
    </div>

    <!-- 核心统计徽章条 -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="flex flex-col rounded border border-border/60 bg-background p-2.5 text-center">
        <span class="text-[11px] text-muted-foreground">总受管系统</span>
        <span class="text-base font-bold tabular-nums text-foreground">{totalCount}</span>
      </div>
      <div class="flex flex-col rounded border border-border/60 bg-background p-2.5 text-center">
        <span class="text-[11px] text-muted-foreground">超管权限</span>
        <span class="text-base font-bold tabular-nums text-destructive">{superadminCount}</span>
      </div>
      <div class="flex flex-col rounded border border-border/60 bg-background p-2.5 text-center">
        <span class="text-[11px] text-muted-foreground">回收完成率</span>
        <span class="text-base font-bold tabular-nums text-success dark:text-success">{revokedPercentage}%</span>
      </div>
      <div class="flex flex-col rounded border border-border/60 bg-background p-2.5 text-center">
        <span class="text-[11px] text-muted-foreground">回收失败</span>
        <span class="text-base font-bold tabular-nums {failedCount > 0 ? 'text-destructive font-extrabold' : 'text-muted-foreground'}">
          {failedCount}
        </span>
      </div>
    </div>
  </header>

  <!-- 操作动作栏 -->
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        onclick={toggleSelectAll}
      >
        <span class="flex h-3.5 w-3.5 items-center justify-center rounded border border-border bg-background">
          {#if selectedSystemIds.length > 0 && selectedSystemIds.length === systems.filter((s) => s.status !== 'revoked').length}
            ✓
          {/if}
        </span>
        全选待回收系统
      </button>

      {#if selectedSystemIds.length > 0}
        <span class="text-xs text-muted-foreground">
          已选择 <strong class="text-foreground">{selectedSystemIds.length}</strong> 项
        </span>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted/80 focus:outline-hidden"
        onclick={onAuditLogExport}
      >
        <svg class="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        导出权限清退留痕审计书
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3.5 py-1.5 text-xs font-semibold text-destructive-foreground shadow-xs transition-colors hover:bg-destructive/90 disabled:opacity-50"
        disabled={selectedSystemIds.length === 0 || batchRevoking}
        onclick={handleBatchRevokeTrigger}
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        {batchRevoking ? '注销批量执行中...' : `一键批量注销 (${selectedSystemIds.length})`}
      </button>
    </div>
  </div>

  <!-- 特权系统矩阵列表表格 -->
  <div class="overflow-x-auto rounded-lg border border-border/60 bg-background">
    <table class="w-full text-left text-xs">
      <thead class="border-b border-border/60 bg-muted/40 text-muted-foreground">
        <tr>
          <th class="w-10 px-4 py-3 text-center">选择</th>
          <th class="px-4 py-3">受管系统与分类</th>
          <th class="px-4 py-3">登录账号 / Token 标识</th>
          <th class="px-4 py-3">特权等级</th>
          <th class="px-4 py-3">当前状态</th>
          <th class="px-4 py-3">最近访问 / 回收时间</th>
          <th class="px-4 py-3 text-right">安全操作</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/40">
        {#if systems.length === 0}
          <tr>
            <td colspan="7" class="py-10 text-center text-xs text-muted-foreground">
              未检索到该员工绑定的任何受管系统权限
            </td>
          </tr>
        {:else}
          {#each systems as system (system.id)}
            {@const statusMeta = getStatusBadge(system.status)}
            <tr class="transition-colors hover:bg-muted/10">
              <td class="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-border"
                  disabled={system.status === 'revoked'}
                  checked={selectedSystemIds.includes(system.id)}
                  onchange={() => toggleSelect(system.id)}
                />
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col">
                  <span class="font-semibold text-foreground">{system.systemName}</span>
                  <span class="text-[11px] text-muted-foreground">{getSystemTypeLabel(system.systemType)}</span>
                </div>
              </td>
              <td class="px-4 py-3 font-mono text-muted-foreground">
                {system.accountIdentifier}
              </td>
              <td class="px-4 py-3">
                <span class="rounded-full border px-2 py-0.5 text-[11px] {getPrivilegeBadgeClass(system.privilegeLevel)}">
                  {getPrivilegeLabel(system.privilegeLevel)}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="rounded-full border px-2 py-0.5 text-[11px] {statusMeta.className}">
                  {statusMeta.label}
                </span>
                {#if system.status === 'failed' && system.failureReason}
                  <div class="mt-1 text-[11px] text-destructive">
                    失败原因: {system.failureReason}
                  </div>
                {/if}
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {#if system.status === 'revoked' && system.revokedAt}
                  <span class="text-success dark:text-success">已于 {system.revokedAt} 回收</span>
                {:else if system.lastAccessedAt}
                  <span>活跃于: {system.lastAccessedAt}</span>
                {:else}
                  <span>-</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-right">
                {#if system.status === 'failed'}
                  <button
                    type="button"
                    class="rounded border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                    onclick={() => onRetryFailed?.(system.id)}
                  >
                    重试回收
                  </button>
                {:else if system.status === 'active'}
                  <button
                    type="button"
                    class="rounded border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onclick={() => onRevokeSingle?.(system.id)}
                  >
                    注销回收
                  </button>
                {:else if system.status === 'revoking'}
                  <span class="text-xs text-muted-foreground">回收执行中</span>
                {:else}
                  <span class="text-xs text-success dark:text-success">✓ 权限已终结</span>
                {/if}
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- 批量回收高危确认弹窗 Modal -->
  {#if showBatchConfirm}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs">
      <div class="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div class="flex items-center gap-2 text-destructive">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3 class="text-base font-semibold">确认批量注销回收特权账号？</h3>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          即将针对选中的 <strong>{selectedSystemIds.length}</strong> 个系统执行注销操作。系统将自动断开 Session、轮转 API Key 并下发特权阻断指令，此操作将记录至不可篡改的安全审计日志中。
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            onclick={() => (showBatchConfirm = false)}
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-md bg-destructive px-3.5 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
            onclick={confirmBatchRevoke}
          >
            确认执行注销
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
