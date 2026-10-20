<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Check, X, ArrowRightLeft, Clock, CheckCircle2, XCircle, Undo2 } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import * as Dialog from './ui/dialog/index.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';

  export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'recalled';

  interface ApplicantInfo {
    name: string;
    avatar?: string;
    department?: string;
    time?: string;
  }

  interface Props {
    title?: string;
    status?: ApprovalStatus;
    applicant?: ApplicantInfo;
    onapprove?: (comment?: string) => void | Promise<void>;
    onreject?: (reason: string) => void | Promise<void>;
    ontransfer?: (targetUser: string, note?: string) => void | Promise<void>;
    disabled?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    title,
    status = 'pending',
    applicant,
    onapprove,
    onreject,
    ontransfer,
    disabled = false,
    class: className = '',
    children,
  }: Props = $props();

  const controlId = $props.id();
  const i18n = useTranslation();
  const isZh = $derived(i18n.locale === 'zh-CN');
  const resolvedTitle = $derived(title ?? (isZh ? '审批申请' : 'Approval Request'));
  let approveDialogOpen = $state(false);
  let rejectDialogOpen = $state(false);
  let transferDialogOpen = $state(false);

  let approveComment = $state('');
  let rejectReason = $state('');
  let transferTarget = $state('');
  let isSubmitting = $state(false);
  let errorMessage = $state('');

  const statusConfig = $derived.by(() => {
    switch (status) {
      case 'approved':
        return { label: isZh ? '已通过' : 'Approved', icon: CheckCircle2 };
      case 'rejected':
        return { label: isZh ? '已驳回' : 'Rejected', icon: XCircle };
      case 'recalled':
        return { label: isZh ? '已撤回' : 'Recalled', icon: Undo2 };
      default:
        return { label: isZh ? '待审批' : 'Pending Approval', icon: Clock };
    }
  });

  function failureMessage(caught: unknown): string {
    if (caught instanceof Error && caught.message.trim()) return caught.message;
    return isZh ? '操作失败，请检查输入后重试。' : 'Action failed. Check the input and retry.';
  }

  async function handleApprove() {
    isSubmitting = true;
    errorMessage = '';
    try {
      await onapprove?.(approveComment || undefined);
      approveDialogOpen = false;
      approveComment = '';
    } catch (caught) {
      errorMessage = failureMessage(caught);
    } finally {
      isSubmitting = false;
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    isSubmitting = true;
    errorMessage = '';
    try {
      await onreject?.(rejectReason);
      rejectDialogOpen = false;
      rejectReason = '';
    } catch (caught) {
      errorMessage = failureMessage(caught);
    } finally {
      isSubmitting = false;
    }
  }

  async function handleTransfer() {
    if (!transferTarget.trim()) return;
    isSubmitting = true;
    errorMessage = '';
    try {
      await ontransfer?.(transferTarget);
      transferDialogOpen = false;
      transferTarget = '';
    } catch (caught) {
      errorMessage = failureMessage(caught);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class={cn('svadmin-approval-card', className)} data-status={status}>
  <div class="svadmin-approval-card__header">
    <div class="svadmin-approval-card__heading">
      <div class="svadmin-approval-card__title-row">
        <h4 class="svadmin-approval-card__title">{resolvedTitle}</h4>
        <Badge variant="outline" data-status={status}>
          <statusConfig.icon class="svadmin-approval-card__status-icon" />
          {statusConfig.label}
        </Badge>
      </div>
      {#if applicant}
        <p class="svadmin-approval-card__applicant">
          {isZh ? '提交人：' : 'Submitted by '}<strong>{applicant.name}</strong>
          {#if applicant.department} ({applicant.department}){/if}
          {#if applicant.time} · {applicant.time}{/if}
        </p>
      {/if}
    </div>

    {#if status === 'pending'}
      <div class="svadmin-approval-card__actions">
        {#if ontransfer}
          <Button
            variant="outline"
            size="sm"
            class="svadmin-approval-card__action"
            {disabled}
            onclick={() => { transferDialogOpen = true; errorMessage = ''; }}
          >
            <ArrowRightLeft class="svadmin-approval-card__action-icon" />
            {isZh ? '转交' : 'Transfer'}
          </Button>
        {/if}

        {#if onreject}
          <Button
            variant="outline"
            size="sm"
            class="svadmin-approval-card__action svadmin-approval-card__action--reject"
            {disabled}
            onclick={() => { rejectDialogOpen = true; errorMessage = ''; }}
          >
            <X class="svadmin-approval-card__action-icon" />
            {isZh ? '驳回' : 'Reject'}
          </Button>
        {/if}

        {#if onapprove}
          <Button
            size="sm"
            class="svadmin-approval-card__action svadmin-approval-card__action--approve"
            {disabled}
            onclick={() => { approveDialogOpen = true; errorMessage = ''; }}
          >
            <Check class="svadmin-approval-card__action-icon" />
            {isZh ? '通过' : 'Approve'}
          </Button>
        {/if}
      </div>
    {/if}
  </div>

  {#if children}
    <div class="svadmin-approval-card__content">
      {@render children()}
    </div>
  {/if}
</div>

<!-- Approve Dialog -->
{#if approveDialogOpen}
  <Dialog.Dialog bind:open={approveDialogOpen}>
    <Dialog.DialogContent class="svadmin-approval-card__dialog">
      <Dialog.DialogHeader>
        <Dialog.DialogTitle>{isZh ? '确认通过' : 'Confirm Approval'}</Dialog.DialogTitle>
      </Dialog.DialogHeader>
      <div class="svadmin-approval-card__dialog-form">
        <label class="svadmin-approval-card__dialog-label" for={`${controlId}-approve-comment`}>{isZh ? '审批意见（可选）' : 'Optional Approval Comment'}</label>
        <textarea
          id={`${controlId}-approve-comment`}
          bind:value={approveComment}
          placeholder={isZh ? '例如：已核验，准予通过' : 'e.g. Verified and approved'}
          class="svadmin-approval-card__textarea"
        ></textarea>
        {#if errorMessage}<p role="alert" class="svadmin-approval-card__error text-destructive">{errorMessage}</p>{/if}
      </div>
      <Dialog.DialogFooter>
        <Button variant="outline" size="sm" onclick={() => { approveDialogOpen = false; errorMessage = ''; }}>{isZh ? '取消' : 'Cancel'}</Button>
        <Button size="sm" class="svadmin-approval-card__confirm svadmin-approval-card__confirm--approve" disabled={isSubmitting} onclick={handleApprove}>
          {isSubmitting ? (isZh ? '处理中…' : 'Processing…') : (isZh ? '确认通过' : 'Confirm Approval')}
        </Button>
      </Dialog.DialogFooter>
    </Dialog.DialogContent>
  </Dialog.Dialog>
{/if}

<!-- Reject Dialog -->
{#if rejectDialogOpen}
  <Dialog.Dialog bind:open={rejectDialogOpen}>
    <Dialog.DialogContent class="svadmin-approval-card__dialog">
      <Dialog.DialogHeader>
        <Dialog.DialogTitle class="svadmin-approval-card__reject-title">{isZh ? '驳回申请' : 'Reject Request'}</Dialog.DialogTitle>
      </Dialog.DialogHeader>
      <div class="svadmin-approval-card__dialog-form">
        <label class="svadmin-approval-card__dialog-label" for={`${controlId}-reject-reason`}>{isZh ? '驳回原因（必填）' : 'Rejection Reason (Required)'}</label>
        <textarea
          id={`${controlId}-reject-reason`}
          bind:value={rejectReason}
          placeholder={isZh ? '请说明驳回原因…' : 'Please explain why this request is being rejected...'}
          class="svadmin-approval-card__textarea svadmin-approval-card__textarea--reject"
          required
        ></textarea>
        {#if errorMessage}<p role="alert" class="svadmin-approval-card__error text-destructive">{errorMessage}</p>{/if}
      </div>
      <Dialog.DialogFooter>
        <Button variant="outline" size="sm" onclick={() => { rejectDialogOpen = false; errorMessage = ''; }}>{isZh ? '取消' : 'Cancel'}</Button>
        <Button variant="destructive" size="sm" disabled={isSubmitting || !rejectReason.trim()} onclick={handleReject}>
          {isSubmitting ? (isZh ? '处理中…' : 'Processing…') : (isZh ? '确认驳回' : 'Confirm Rejection')}
        </Button>
      </Dialog.DialogFooter>
    </Dialog.DialogContent>
  </Dialog.Dialog>
{/if}

<!-- Transfer Dialog -->
{#if transferDialogOpen}
  <Dialog.Dialog bind:open={transferDialogOpen}>
    <Dialog.DialogContent class="svadmin-approval-card__dialog">
      <Dialog.DialogHeader>
        <Dialog.DialogTitle>{isZh ? '转交审批' : 'Transfer Approval'}</Dialog.DialogTitle>
      </Dialog.DialogHeader>
      <div class="svadmin-approval-card__dialog-form">
        <label class="svadmin-approval-card__dialog-label" for={`${controlId}-transfer-target`}>{isZh ? '目标审批人邮箱或用户名' : 'Target Approver Email / Username'}</label>
        <input
          id={`${controlId}-transfer-target`}
          type="text"
          bind:value={transferTarget}
          placeholder={isZh ? '例如：manager@example.com' : 'e.g. manager@example.com'}
          class="svadmin-approval-card__input"
          required
        />
        {#if errorMessage}<p role="alert" class="svadmin-approval-card__error text-destructive">{errorMessage}</p>{/if}
      </div>
      <Dialog.DialogFooter>
        <Button variant="outline" size="sm" onclick={() => { transferDialogOpen = false; errorMessage = ''; }}>{isZh ? '取消' : 'Cancel'}</Button>
        <Button size="sm" disabled={isSubmitting || !transferTarget.trim()} onclick={handleTransfer}>
          {isSubmitting ? (isZh ? '处理中…' : 'Processing…') : (isZh ? '转交' : 'Transfer')}
        </Button>
      </Dialog.DialogFooter>
    </Dialog.DialogContent>
  </Dialog.Dialog>
{/if}
