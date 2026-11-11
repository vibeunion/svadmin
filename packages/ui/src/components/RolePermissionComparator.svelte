<script lang="ts">
  import {
    ShieldAlert,
    AlertOctagon,
    ArrowRight,
    Save,
    Check,
    X,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export type CrudAction = 'read' | 'create' | 'update' | 'delete' | 'export';

  export interface ResourcePermissionDiff {
    resource: string;
    resourceLabel: string;
    action: CrudAction;
    previousAllowed: boolean;
    currentAllowed: boolean;
    isHighRisk?: boolean | undefined;
  }

  export interface PermissionChangeAuditPayload {
    roleId: string;
    roleName: string;
    approvalTicket: string;
    modifiedItems: ResourcePermissionDiff[];
    confirmedAt: string;
  }

  export interface RolePermissionComparatorProps {
    roleId: string;
    roleName: string;
    changes?: ResourcePermissionDiff[] | undefined;
    title?: string | undefined;
    description?: string | undefined;
    class?: string | undefined;
    onConfirmChanges?: ((payload: PermissionChangeAuditPayload) => void | Promise<void>) | undefined;
  }

  let {
    roleId = 'finance_auditor',
    roleName = '财务审核专员',
    changes = [
      { resource: 'financial_ledger', resourceLabel: '财务账目明细', action: 'export', previousAllowed: false, currentAllowed: true, isHighRisk: true },
      { resource: 'financial_ledger', resourceLabel: '财务账目明细', action: 'delete', previousAllowed: false, currentAllowed: true, isHighRisk: true },
      { resource: 'customer_contact', resourceLabel: '客户联系方式', action: 'read', previousAllowed: true, currentAllowed: true },
      { resource: 'customer_contact', resourceLabel: '客户联系方式', action: 'update', previousAllowed: false, currentAllowed: true },
    ],
    title,
    description,
    class: className = '',
    onConfirmChanges,
  }: RolePermissionComparatorProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let approvalTicket = $state('');
  let isSaving = $state(false);
  let isSaved = $state(false);

  const modifiedChanges = $derived(
    changes.filter((c) => c.previousAllowed !== c.currentAllowed),
  );

  const highRiskChanges = $derived(
    modifiedChanges.filter((c) => c.isHighRisk && c.currentAllowed && !c.previousAllowed),
  );

  async function handleConfirm() {
    if (!approvalTicket.trim() || isSaving) return;
    isSaving = true;

    try {
      const payload: PermissionChangeAuditPayload = {
        roleId,
        roleName,
        approvalTicket: approvalTicket.trim(),
        modifiedItems: modifiedChanges,
        confirmedAt: new Date().toISOString(),
      };

      await onConfirmChanges?.(payload);
      isSaved = true;
      setTimeout(() => {
        isSaved = false;
      }, 1500);
    } finally {
      isSaving = false;
    }
  }

  const actionLabels: Record<CrudAction, string> = {
    read: '读取 (Read)',
    create: '创建 (Create)',
    update: '编辑 (Update)',
    delete: '删除 (Delete)',
    export: '导出 (Export)',
  };

  const resolvedTitle = $derived(title ?? (chinese ? '角色权限变更高危审计与差异比对' : 'Role Permission Diff Comparator'));
  const resolvedDesc = $derived(
    description ?? (chinese ? '调整前后权限矩阵并排红绿差异审计，自动标红高危特权提权' : 'Audit permission matrix modifications before commit'),
  );
</script>

<div
  data-svadmin-component="RolePermissionComparator"
  class={cn(
    'w-full rounded-2xl border border-border bg-card text-card-foreground shadow-xs p-6 space-y-4 flex flex-col text-xs',
    className,
  )}
>
  <!-- Header Bar -->
  <div class="flex items-center justify-between border-b border-border/70 pb-4">
    <div class="flex items-center gap-2.5">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
        <ShieldAlert class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-base font-semibold text-foreground">{resolvedTitle}</h3>
        <p class="text-xs text-muted-foreground">{resolvedDesc}</p>
      </div>
    </div>

    <!-- Role Name Badge -->
    <div class="flex items-center gap-2 font-mono text-[11px]">
      <span class="rounded bg-muted px-2 py-0.5 font-bold text-foreground">
        {roleName} ({roleId})
      </span>
      <span class="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-bold">
        {modifiedChanges.length} {chinese ? '项权限变更' : 'modifications'}
      </span>
    </div>
  </div>

  <!-- High Risk Escalation Warning -->
  {#if highRiskChanges.length > 0}
    <div role="alert" class="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-destructive text-xs">
      <AlertOctagon class="h-5 w-5 shrink-0 mt-0.5" />
      <div class="space-y-1">
        <div class="font-bold">{chinese ? '高危越权/特权提权预警 (Privilege Escalation Alert)' : 'High Risk Permission Escalation Detected'}</div>
        <p class="text-[11px] leading-relaxed text-destructive/90">
          {chinese
            ? `本次变更为该角色新增了 ${highRiskChanges.length} 项敏感高危权限 (如财务删除、数据全量导出)。请核实合规授权流程。`
            : `Granting ${highRiskChanges.length} sensitive high-risk permissions. Approval ticket required.`}
        </p>
      </div>
    </div>
  {/if}

  <!-- Differences Table -->
  <div class="rounded-xl border border-border overflow-hidden">
    <table class="w-full text-left text-xs border-collapse">
      <thead class="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
        <tr>
          <th class="p-3 w-52">{chinese ? '业务资源' : 'Resource'}</th>
          <th class="p-3 w-36">{chinese ? '操作动作' : 'Action'}</th>
          <th class="p-3 w-32 text-center">{chinese ? '变更前权限' : 'Prior Allowed'}</th>
          <th class="p-3 w-10 text-center"></th>
          <th class="p-3 w-32 text-center">{chinese ? '拟变更权限' : 'New Allowed'}</th>
          <th class="p-3">{chinese ? '安全评估' : 'Risk Assessment'}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/60">
        {#each changes as item (item.resource + item.action)}
          {@const isAdded = !item.previousAllowed && item.currentAllowed}
          {@const isRevoked = item.previousAllowed && !item.currentAllowed}
          {@const isUnchanged = item.previousAllowed === item.currentAllowed}
          <tr class={cn('hover:bg-muted/20', isAdded && 'bg-success/5', isRevoked && 'bg-destructive/5')}>
            <!-- Resource -->
            <td class="p-3 font-semibold text-foreground">
              {item.resourceLabel}
              <span class="block font-mono text-[10px] text-muted-foreground font-normal">{item.resource}</span>
            </td>

            <!-- Action -->
            <td class="p-3 font-mono text-muted-foreground">
              {actionLabels[item.action] ?? item.action}
            </td>

            <!-- Prior -->
            <td class="p-3 text-center">
              {#if item.previousAllowed}
                <span class="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-mono font-medium text-foreground">
                  <Check class="h-3 w-3 text-success" />
                  <span>允许</span>
                </span>
              {:else}
                <span class="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                  <X class="h-3 w-3" />
                  <span>拒绝</span>
                </span>
              {/if}
            </td>

            <!-- Arrow -->
            <td class="p-3 text-center text-muted-foreground">
              {#if !isUnchanged}
                <ArrowRight class="h-3.5 w-3.5 mx-auto" />
              {/if}
            </td>

            <!-- Current -->
            <td class="p-3 text-center">
              {#if item.currentAllowed}
                <span class={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono font-bold', isAdded ? 'bg-success/15 text-success' : 'bg-muted text-foreground')}>
                  <Check class="h-3 w-3" />
                  <span>允许</span>
                </span>
              {:else}
                <span class={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono', isRevoked ? 'bg-destructive/15 text-destructive font-bold' : 'bg-muted/60 text-muted-foreground')}>
                  <X class="h-3 w-3" />
                  <span>拒绝</span>
                </span>
              {/if}
            </td>

            <!-- Risk note -->
            <td class="p-3">
              {#if item.isHighRisk && isAdded}
                <span class="rounded bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                  ⚠️ 高危特权提权
                </span>
              {:else if isAdded}
                <span class="text-success font-medium text-[11px]">+ 新增授权</span>
              {:else if isRevoked}
                <span class="text-destructive font-medium text-[11px]">- 权限收回</span>
              {:else}
                <span class="text-muted-foreground text-[11px]">无变动</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mandatory Ticket & Commit Footer -->
  <div class="flex flex-wrap items-center justify-between gap-4 border-t border-border/70 pt-4 bg-muted/10 p-3 rounded-xl">
    <div class="flex items-center gap-2 flex-1 min-w-64">
      <label for="approval-ticket-input" class="font-bold text-foreground whitespace-nowrap">
        {chinese ? '审批工单号 (必填) *' : 'Approval Ticket *'}
      </label>
      <input
        id="approval-ticket-input"
        type="text"
        bind:value={approvalTicket}
        placeholder={chinese ? '例如: TICKET-SEC-2026-902' : 'E.g. SEC-001'}
        class="h-8 max-w-xs flex-1 rounded-md border border-input bg-background px-2.5 font-mono text-xs text-foreground focus-visible:outline-none"
      />
    </div>

    <Button
      type="button"
      size="sm"
      disabled={!approvalTicket.trim() || isSaving || modifiedChanges.length === 0}
      onclick={handleConfirm}
      class="gap-1.5 min-w-32 bg-destructive text-destructive-foreground hover:bg-destructive/90"
    >
      {#if isSaved}
        <Check class="h-3.5 w-3.5 text-white" />
        <span>{chinese ? '已确认并签署' : 'Confirmed'}</span>
      {:else}
        <Save class="h-3.5 w-3.5" />
        <span>{chinese ? '确认并签署变更' : 'Audit & Confirm'}</span>
      {/if}
    </Button>
  </div>
</div>
