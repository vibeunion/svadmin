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
        return { label: 'Approved', badge: 'bg-success/15 text-success border-success/20', icon: CheckCircle2 };
      case 'rejected':
        return { label: 'Rejected', badge: 'bg-destructive/15 text-destructive border-destructive/20', icon: XCircle };
      case 'recalled':
        return { label: 'Recalled', badge: 'bg-muted text-muted-foreground border-border', icon: Undo2 };
      default:
        return { label: 'Pending Approval', badge: 'bg-warning/15 text-warning-foreground border-warning/20', icon: Clock };
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

<div class={cn('rounded-xl border border-border bg-card p-4 shadow-xs space-y-3', className)}>
  <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/50">
    <div class="space-y-0.5">
      <div class="flex items-center gap-2">
        <h4 class="text-sm font-semibold text-foreground">{title}</h4>
        <Badge variant="outline" class={cn('gap-1 text-[11px] font-medium', statusConfig.badge)}>
          <statusConfig.icon class="h-3 w-3" />
          {statusConfig.label}
        </Badge>
      </div>
      {#if applicant}
        <p class="text-xs text-muted-foreground">
          Submitted by <strong class="text-foreground">{applicant.name}</strong>
          {#if applicant.department} ({applicant.department}){/if}
          {#if applicant.time} · {applicant.time}{/if}
        </p>
      {/if}
    </div>

    {#if status === 'pending'}
      <div class="flex items-center gap-1.5">
        {#if ontransfer}
          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs gap-1 text-muted-foreground"
            {disabled}
            onclick={() => { transferDialogOpen = true; }}
          >
            <ArrowRightLeft class="h-3.5 w-3.5" />
            Transfer
          </Button>
        {/if}

        {#if onreject}
          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
            {disabled}
            onclick={() => { rejectDialogOpen = true; }}
          >
            <X class="h-3.5 w-3.5" />
            Reject
          </Button>
        {/if}

        {#if onapprove}
          <Button
            size="sm"
            class="h-8 text-xs gap-1 bg-success hover:bg-success/90 text-success-foreground"
            {disabled}
            onclick={() => { approveDialogOpen = true; }}
          >
            <Check class="h-3.5 w-3.5" />
            Approve
          </Button>
        {/if}
      </div>
    {/if}
  </div>

  {#if children}
    <div class="text-xs text-foreground space-y-2">
      {@render children()}
    </div>
  {/if}
</div>

<!-- Approve Dialog -->
{#if approveDialogOpen}
  <Dialog.Dialog bind:open={approveDialogOpen}>
    <Dialog.DialogContent class="sm:max-w-md">
      <Dialog.DialogHeader>
        <Dialog.DialogTitle>Confirm Approval</Dialog.DialogTitle>
      </Dialog.DialogHeader>
      <div class="space-y-3 py-2 text-xs">
        <label class="block font-medium text-foreground" for="approve_comment_input">Optional Approval Comment</label>
        <textarea
          id="approve_comment_input"
          bind:value={approveComment}
          placeholder="e.g. Verified and approved"
          class="w-full h-20 rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        ></textarea>
      </div>
      <Dialog.DialogFooter>
        <Button variant="outline" size="sm" onclick={() => { approveDialogOpen = false; }}>Cancel</Button>
        <Button size="sm" class="bg-success hover:bg-success/90 text-success-foreground" disabled={isSubmitting} onclick={handleApprove}>
          Confirm Approval
        </Button>
      </Dialog.DialogFooter>
    </Dialog.DialogContent>
  </Dialog.Dialog>
{/if}

<!-- Reject Dialog -->
{#if rejectDialogOpen}
  <Dialog.Dialog bind:open={rejectDialogOpen}>
    <Dialog.DialogContent class="sm:max-w-md">
      <Dialog.DialogHeader>
        <Dialog.DialogTitle class="text-destructive">Reject Request</Dialog.DialogTitle>
      </Dialog.DialogHeader>
      <div class="space-y-3 py-2 text-xs">
        <label class="block font-medium text-foreground" for="reject_reason_input">Rejection Reason (Required)</label>
        <textarea
          id="reject_reason_input"
          bind:value={rejectReason}
          placeholder="Please explain why this request is being rejected..."
          class="w-full h-20 rounded-md border border-destructive/40 bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
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
    <Dialog.DialogContent class="sm:max-w-md">
      <Dialog.DialogHeader>
        <Dialog.DialogTitle>Transfer Approval</Dialog.DialogTitle>
      </Dialog.DialogHeader>
      <div class="space-y-3 py-2 text-xs">
        <label class="block font-medium text-foreground" for="transfer_target_input">Target Approver Email / Username</label>
        <input
          id="transfer_target_input"
          type="text"
          bind:value={transferTarget}
          placeholder="e.g. manager@example.com"
          class="w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
