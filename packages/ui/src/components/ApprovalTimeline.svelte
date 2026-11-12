<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';
  import { Check, X, Clock, Loader2 } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';

  export type ApprovalStatus = 'approved' | 'rejected' | 'pending' | 'running';

  export interface ApprovalStep {
    id: string;
    title: string;
    approverName?: string;
    approverRole?: string;
    approverAvatar?: string;
    status: ApprovalStatus;
    time?: string;
    comment?: string;
    extra?: Snippet;
  }

  export interface ApprovalTimelineProps {
    /** List of approval workflow steps */
    steps: ApprovalStep[];
    /** Whether to render step comments in bordered cards */
    cardMode?: boolean;
    /** Current active step index (0-based) */
    current?: number;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    steps = [],
    cardMode = true,
    current,
    class: className = '',
  }: ApprovalTimelineProps = $props();

  const i18n = useTranslation();

  function getStatusIcon(status: ApprovalStatus) {
    switch (status) {
      case 'approved':
        return Check;
      case 'rejected':
        return X;
      case 'running':
        return Loader2;
      case 'pending':
      default:
        return Clock;
    }
  }

  function getStatusColorClasses(status: ApprovalStatus) {
    switch (status) {
      case 'approved':
        return {
          iconBg: 'bg-success text-success-foreground',
          badge: 'bg-success/10 text-success border-success/20',
          line: 'border-success',
        };
      case 'rejected':
        return {
          iconBg: 'bg-destructive text-destructive-foreground',
          badge: 'bg-destructive/10 text-destructive border-destructive/20',
          line: 'border-destructive',
        };
      case 'running':
        return {
          iconBg: 'bg-primary text-primary-foreground',
          badge: 'bg-primary/10 text-primary border-primary/20',
          line: 'border-primary',
        };
      case 'pending':
      default:
        return {
          iconBg: 'bg-muted text-muted-foreground',
          badge: 'bg-muted text-muted-foreground border-border',
          line: 'border-border',
        };
    }
  }

  function getStatusLabel(status: ApprovalStatus): string {
    return i18n.t(`approvalTimeline.status.${status}`);
  }
</script>

<div
  data-svadmin-component="ApprovalTimeline"
  class={cn('w-full relative', className)}
>
  <div class="relative flex flex-col space-y-6">
    {#each steps as step, index (step.id)}
      {@const colors = getStatusColorClasses(step.status)}
      {@const Icon = getStatusIcon(step.status)}
      {@const isLast = index === steps.length - 1}
      {@const isCurrent = current !== undefined ? index === current : step.status === 'running'}

      <div class="relative flex items-start gap-4">
        <!-- Connecting Line & Status Icon Node -->
        <div class="relative flex flex-col items-center">
          <div
            class={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-xs ring-4 ring-background transition-colors',
              colors.iconBg,
              isCurrent && 'ring-primary/30',
            )}
          >
            <Icon class={cn('h-3.5 w-3.5 stroke-[2.5]', step.status === 'running' && 'animate-spin')} />
          </div>

          {#if !isLast}
            <div
              class={cn(
                'w-0.5 flex-1 min-h-[44px] my-1 border-l-2 transition-colors',
                colors.line,
              )}
            ></div>
          {/if}
        </div>

        <!-- Step Detail Content -->
        <div class="flex-1 pb-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-semibold tracking-tight text-foreground">{step.title}</h4>
              <span
                class={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                  colors.badge,
                )}
              >
                {getStatusLabel(step.status)}
              </span>
            </div>

            {#if step.time}
              <time class="text-xs text-muted-foreground font-mono">{step.time}</time>
            {/if}
          </div>

          {#if step.approverName || step.approverRole}
            <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {#if step.approverName}
                <span class="font-medium text-foreground">{step.approverName}</span>
              {/if}
              {#if step.approverRole}
                <span>({step.approverRole})</span>
              {/if}
            </div>
          {/if}

          {#if step.comment}
            <div
              class={cn(
                'mt-2 text-xs text-foreground',
                cardMode
                  ? 'rounded-lg border border-border bg-card p-3 shadow-2xs'
                  : 'text-muted-foreground italic',
              )}
            >
              <p>{step.comment}</p>
            </div>
          {/if}

          {#if step.extra}
            <div class="mt-2">
              {@render step.extra()}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
