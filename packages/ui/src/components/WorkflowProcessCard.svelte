<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';
  import ApprovalTimeline, { type ApprovalStep, type ApprovalStatus } from './ApprovalTimeline.svelte';
  import IconWorkflow from './icons/IconWorkflow.svelte';

  export interface WorkflowProcessCardProps {
    /** Workflow title, e.g. 'Contract Approval Flow' */
    title: string;
    /** Process instance ID or ticket code */
    ticketNo?: string;
    /** Initiator name */
    initiator?: string;
    /** Current process overall state */
    status?: ApprovalStatus | 'draft';
    /** Steps list */
    steps?: ApprovalStep[];
    /** Actions slot in footer or header */
    extra?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    title,
    ticketNo,
    initiator,
    status = 'running',
    steps = [],
    extra,
    class: className = '',
  }: WorkflowProcessCardProps = $props();

  const statusBadge = $derived.by(() => {
    switch (status) {
      case 'approved':
        return { text: 'Approved', class: 'bg-success/10 text-success border-success/20' };
      case 'rejected':
        return { text: 'Rejected', class: 'bg-destructive/10 text-destructive border-destructive/20' };
      case 'running':
        return { text: 'In Progress', class: 'bg-primary/10 text-primary border-primary/20' };
      case 'draft':
      default:
        return { text: 'Pending', class: 'bg-muted text-muted-foreground border-border' };
    }
  });
</script>

<div
  data-svadmin-component="WorkflowProcessCard"
  class={cn(
    'rounded-md border border-border bg-card p-6 text-card-foreground shadow-sm transition-all space-y-6',
    className,
  )}
>
  <!-- Card Header -->
  <div class="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4">
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <IconWorkflow class="h-5 w-5" />
      </div>
      <div>
        <div class="flex items-center gap-2.5">
          <h3 class="text-base font-bold tracking-tight text-foreground">{title}</h3>
          <span class={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', statusBadge.class)}>
            {statusBadge.text}
          </span>
        </div>
        <div class="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {#if ticketNo}
            <span class="font-mono">Ticket: #{ticketNo}</span>
          {/if}
          {#if initiator}
            <span>Initiator: {initiator}</span>
          {/if}
        </div>
      </div>
    </div>

    {#if extra}
      <div class="flex items-center gap-2">
        {@render extra()}
      </div>
    {/if}
  </div>

  <!-- Steps Timeline Content -->
  {#if steps.length > 0}
    <div class="pt-2 px-1">
      <ApprovalTimeline {steps} />
    </div>
  {/if}
</div>
