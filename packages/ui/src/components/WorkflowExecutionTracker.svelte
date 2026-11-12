<script lang="ts">
  import { CheckCircle2, Clock, XCircle, User, MessageSquareQuote } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type ExecutionStatus = 'completed' | 'current' | 'waiting' | 'rejected';

  export interface ExecutionStep {
    id: string;
    nodeTitle: string;
    status: ExecutionStatus;
    handlerName?: string | undefined;
    actionTime?: string | undefined;
    durationText?: string | undefined;
    comment?: string | undefined;
  }

  export interface WorkflowExecutionTrackerProps {
    instanceId: string;
    flowName?: string | undefined;
    steps: ExecutionStep[];
    class?: string | undefined;
  }

  let {
    instanceId,
    flowName = '费用报销与采购付款审批流',
    steps = [],
    class: className = '',
  }: WorkflowExecutionTrackerProps = $props();

  function getStatusBadge(status: ExecutionStatus) {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle2,
          color: 'text-success',
          bg: 'bg-success/10 border-success/30',
          label: '已通过',
        };
      case 'current':
        return {
          icon: Clock,
          color: 'text-primary',
          bg: 'bg-primary/10 border-primary/30',
          label: '审批流转中',
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-destructive',
          bg: 'bg-destructive/10 border-destructive/30',
          label: '已驳回',
        };
      case 'waiting':
      default:
        return {
          icon: Clock,
          color: 'text-muted-foreground',
          bg: 'bg-muted border-border',
          label: '待流转',
        };
    }
  }
</script>

<div
  class={cn('rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs space-y-4', className)}
  data-svadmin-component="WorkflowExecutionTracker"
>
  <!-- Header -->
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
    <div>
      <h3 class="font-bold text-sm text-foreground">{flowName}</h3>
      <p class="text-xs text-muted-foreground font-mono mt-0.5">实例流水号: {instanceId}</p>
    </div>
    <span class="text-xs font-mono text-muted-foreground">共 {steps.length} 个流转环节</span>
  </header>

  <!-- Execution Timeline Steps -->
  <div class="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
    {#each steps as step (step.id)}
      {@const badge = getStatusBadge(step.status)}
      <div class="relative flex items-start gap-3 group text-xs font-mono" data-execution-step={step.id}>
        <!-- Status Dot Pin on Timeline -->
        <span
          class={cn(
            'absolute -left-6 top-1 h-5 w-5 rounded-full flex items-center justify-center border bg-background shrink-0 z-10',
            badge.color,
            step.status === 'current' && 'ring-4 ring-primary/20 animate-pulse'
          )}
        >
          <badge.icon class="h-3 w-3" />
        </span>

        <!-- Step Detail Box -->
        <div class="flex-1 rounded-lg border border-border bg-muted/10 p-3 space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-bold text-foreground text-xs">{step.nodeTitle}</span>
            <div class="flex items-center gap-2">
              {#if step.durationText}
                <span class="text-[10px] text-muted-foreground">耗时: {step.durationText}</span>
              {/if}
              <span class={cn('px-2 py-0.5 rounded-full border text-[10px] font-semibold', badge.bg, badge.color)}>
                {badge.label}
              </span>
            </div>
          </div>

          {#if step.handlerName}
            <div class="flex items-center gap-3 text-muted-foreground text-[11px]">
              <span class="flex items-center gap-1 font-sans">
                <User class="h-3 w-3" />
                {step.handlerName}
              </span>
              {#if step.actionTime}
                <span class="text-[10px]">{step.actionTime}</span>
              {/if}
            </div>
          {/if}

          {#if step.comment}
            <div class="rounded bg-background p-2 border border-border/80 text-[11px] text-foreground flex items-start gap-1.5 font-sans leading-relaxed">
              <MessageSquareQuote class="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span>{step.comment}</span>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
