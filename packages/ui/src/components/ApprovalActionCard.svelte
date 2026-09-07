<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Check, X, ArrowRightLeft, Clock, CheckCircle2, XCircle, Undo2 } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import * as Dialog from './ui/dialog/index.js';
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
    title = 'Approval Request',
    status = 'pending',
    applicant,
    onapprove,
    onreject,
    ontransfer,
    disabled = false,
    class: className = '',
    children,
  }: Props = $props();

  let approveDialogOpen = $state(false);
  let rejectDialogOpen = $state(false);
  let transferDialogOpen = $state(false);

  let approveComment = $state('');
  let rejectReason = $state('');
  let transferTarget = $state('');
  let isSubmitting = $state(false);

  const statusConfig = $derived.by(() => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', icon: CheckCircle2 };
      case 'rejected':
        return { label: 'Rejected', icon: XCircle };
      case 'recalled':
        return { label: 'Recalled', icon: Undo2 };
      default:
        return { label: 'Pending Approval', icon: Clock };
    }
  });

  async function handleApprove() {
    isSubmitting = true;
    try {
      await onapprove?.(approveComment || undefined);
      approveDialogOpen = false;
      approveComment = '';
    } finally {
      isSubmitting = false;
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    isSubmitting = true;
    try {
      await onreject?.(rejectReason);
      rejectDialogOpen = false;
      rejectReason = '';
    } finally {
      isSubmitting = false;
    }
  }

  async function handleTransfer() {
    if (!transferTarget.trim()) return;
    isSubmitting = true;
    try {
      await ontransfer?.(transferTarget);
      transferDialogOpen = false;
      transferTarget = '';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class={cn('svadmin-approval-card', className)} data-status={status}>
  <div class="svadmin-approval-card__header">
    <div class="svadmin-approval-card__heading">
      <div class="svadmin-approval-card__title-row">
        <h4 class="svadmin-approval-card__title">{title}</h4>
        <Badge variant="outline" data-status={status}>
          <statusConfig.icon class="svadmin-approval-card__status-icon" />
          {statusConfig.label}
        </Badge>
      </div>
      {#if applicant}
        <p class="svadmin-approval-card__applicant">
          Submitted by <strong>{applicant.name}</strong>
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
            onclick={() => { transferDialogOpen = true; }}
          >
            <ArrowRightLeft class="svadmin-approval-card__action-icon" />
            Transfer
          </Button>
        {/if}

        {#if onreject}
          <Button
            variant="outline"
            size="sm"
            class="svadmin-approval-card__action svadmin-approval-card__action--reject"
            {disabled}
            onclick={() => { rejectDialogOpen = true; }}
          >
            <X class="svadmin-approval-card__action-icon" />
            Reject
          </Button>
        {/if}

        {#if onapprove}
          <Button
            size="sm"
            class="svadmin-approval-card__action svadmin-approval-card__action--approve"
            {disabled}
            onclick={() => { approveDialogOpen = true; }}
          >
            <Check class="svadmin-approval-card__action-icon" />
            Approve
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
        <Dialog.DialogTitle>Confirm Approval</Dialog.DialogTitle>
      </Dialog.DialogHeader>
      <div class="svadmin-approval-card__dialog-form">
        <label class="svadmin-approval-card__dialog-label" for="approve_comment_input">Optional Approval Comment</label>
        <textarea
          id="approve_comment_input"
          bind:value={approveComment}
          placeholder="e.g. Verified and approved"
          class="svadmin-approval-card__textarea"
        ></textarea>
      </div>
      <Dialog.DialogFooter>
        <Button variant="outline" size="sm" onclick={() => { approveDialogOpen = false; }}>Cancel</Button>
        <Button size="sm" class="svadmin-approval-card__confirm svadmin-approval-card__confirm--approve" disabled={isSubmitting} onclick={handleApprove}>
          Confirm Approval
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
        <Dialog.DialogTitle class="svadmin-approval-card__reject-title">Reject Request</Dialog.DialogTitle>
      </Dialog.DialogHeader>
      <div class="svadmin-approval-card__dialog-form">
        <label class="svadmin-approval-card__dialog-label" for="reject_reason_input">Rejection Reason (Required)</label>
        <textarea
          id="reject_reason_input"
          bind:value={rejectReason}
          placeholder="Please explain why this request is being rejected..."
          class="svadmin-approval-card__textarea svadmin-approval-card__textarea--reject"
          required
        ></textarea>
      </div>
      <Dialog.DialogFooter>
        <Button variant="outline" size="sm" onclick={() => { rejectDialogOpen = false; }}>Cancel</Button>
        <Button variant="destructive" size="sm" disabled={isSubmitting || !rejectReason.trim()} onclick={handleReject}>
          Confirm Rejection
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
        <Dialog.DialogTitle>Transfer Approval</Dialog.DialogTitle>
      </Dialog.DialogHeader>
      <div class="svadmin-approval-card__dialog-form">
        <label class="svadmin-approval-card__dialog-label" for="transfer_target_input">Target Approver Email / Username</label>
        <input
          id="transfer_target_input"
          type="text"
          bind:value={transferTarget}
          placeholder="e.g. manager@example.com"
          class="svadmin-approval-card__input"
          required
        />
      </div>
      <Dialog.DialogFooter>
        <Button variant="outline" size="sm" onclick={() => { transferDialogOpen = false; }}>Cancel</Button>
        <Button size="sm" disabled={isSubmitting || !transferTarget.trim()} onclick={handleTransfer}>
          Transfer
        </Button>
      </Dialog.DialogFooter>
    </Dialog.DialogContent>
  </Dialog.Dialog>
{/if}
