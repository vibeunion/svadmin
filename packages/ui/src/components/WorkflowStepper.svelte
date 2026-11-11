<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    AlertTriangle,
    Check,
    Clock,
    Loader2,
    RotateCcw,
    SkipForward,
    XCircle,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import { Progress } from './ui/progress/index.js';

  export type WorkflowStepStatus =
    | 'wait'
    | 'pending'
    | 'process'
    | 'running'
    | 'finish'
    | 'completed'
    | 'error'
    | 'failed'
    | 'blocked'
    | 'skipped';

  export interface WorkflowStepItem {
    id: string;
    label: string;
    description?: string | undefined;
    status: WorkflowStepStatus;
    durationMs?: number | undefined;
    startedAt?: string | undefined;
    errorMessage?: string | undefined;
    retryable?: boolean | undefined;
    meta?: Record<string, string | number> | undefined;
  }

  export interface WorkflowStepperProps {
    steps: WorkflowStepItem[];
    activeId?: string | undefined;
    direction?: 'horizontal' | 'vertical' | undefined;
    title?: string | undefined;
    showProgress?: boolean | undefined;
    onSelect?: ((step: WorkflowStepItem) => void) | undefined;
    onRetry?: ((step: WorkflowStepItem) => void) | undefined;
    stepDetail?: Snippet<[WorkflowStepItem]> | undefined;
    class?: string | undefined;
  }

  let {
    steps,
    activeId = $bindable<string | undefined>(undefined),
    direction = 'vertical',
    title,
    showProgress = true,
    onSelect,
    onRetry,
    stepDetail,
    class: className = '',
  }: WorkflowStepperProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  type NormalizedState = 'wait' | 'process' | 'finish' | 'error' | 'blocked' | 'skipped';

  function normalizeState(status: WorkflowStepStatus): NormalizedState {
    switch (status) {
      case 'finish':
      case 'completed':
        return 'finish';
      case 'process':
      case 'running':
        return 'process';
      case 'error':
      case 'failed':
        return 'error';
      case 'blocked':
        return 'blocked';
      case 'skipped':
        return 'skipped';
      default:
        return 'wait';
    }
  }

  function formatDuration(ms: number | undefined): string | null {
    if (ms === undefined || !Number.isFinite(ms)) return null;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  const completedCount = $derived(
    steps.filter((s) => {
      const n = normalizeState(s.status);
      return n === 'finish' || n === 'skipped';
    }).length,
  );

  const progressPercentage = $derived(
    steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0,
  );

  function selectStep(step: WorkflowStepItem) {
    activeId = step.id;
    onSelect?.(step);
  }
</script>

<div
  data-svadmin-component="WorkflowStepper"
  data-direction={direction}
  class={cn(
    'rounded-xl border border-border bg-card text-card-foreground shadow-xs p-5 space-y-4',
    className,
  )}
>
  {#if title || showProgress}
    <div class="space-y-2 border-b border-border/60 pb-3">
      <div class="flex items-center justify-between gap-2">
        {#if title}
          <h3 class="text-sm font-semibold text-foreground">{title}</h3>
        {:else}
          <span class="text-xs font-medium text-muted-foreground">
            {chinese ? '任务执行进度' : 'Workflow Progress'}
          </span>
        {/if}
        <span class="text-xs font-mono text-muted-foreground">
          {completedCount}/{steps.length} ({progressPercentage}%)
        </span>
      </div>
      {#if showProgress}
        <Progress value={progressPercentage} class="h-1.5" />
      {/if}
    </div>
  {/if}

  <ol
    class={cn(
      'flex m-0 p-0 list-none',
      direction === 'vertical' ? 'flex-col gap-3' : 'flex-row gap-2 overflow-x-auto pb-2',
    )}
  >
    {#each steps as step, index (step.id)}
      {@const state = normalizeState(step.status)}
      {@const duration = formatDuration(step.durationMs)}
      {@const isSelected = activeId === step.id}
      <li
        data-step-id={step.id}
        data-step-status={state}
        class={cn(
          'relative flex',
          direction === 'vertical' ? 'flex-col' : 'flex-1 min-w-44 items-start gap-2',
        )}
      >
        <div
          class={cn(
            'flex items-start justify-between gap-3 rounded-lg border p-3 transition-all',
            isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/60 bg-background hover:bg-muted/30',
            direction === 'horizontal' && 'w-full',
          )}
        >
          <button
            type="button"
            onclick={() => selectStep(step)}
            aria-current={state === 'process' ? 'step' : undefined}
            class="flex items-start gap-3 text-left flex-1 min-w-0 bg-transparent border-0 p-0 cursor-pointer"
          >
            <span
              class={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border mt-0.5',
                state === 'finish' && 'border-success/30 bg-success/15 text-success',
                state === 'process' && 'border-primary/40 bg-primary/15 text-primary',
                state === 'error' && 'border-destructive/30 bg-destructive/15 text-destructive',
                state === 'blocked' && 'border-warning/40 bg-warning/15 text-warning',
                state === 'skipped' && 'border-border bg-muted text-muted-foreground',
                state === 'wait' && 'border-border bg-card text-muted-foreground',
              )}
            >
              {#if state === 'finish'}
                <Check class="h-3.5 w-3.5" />
              {:else if state === 'process'}
                <Loader2 class="h-3.5 w-3.5 animate-spin" />
              {:else if state === 'error'}
                <XCircle class="h-3.5 w-3.5" />
              {:else if state === 'blocked'}
                <AlertTriangle class="h-3.5 w-3.5" />
              {:else if state === 'skipped'}
                <SkipForward class="h-3.5 w-3.5" />
              {:else}
                <Clock class="h-3.5 w-3.5" />
              {/if}
            </span>

            <div class="min-w-0 flex-1 space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-foreground truncate">{step.label}</span>
                {#if duration}
                  <span class="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {duration}
                  </span>
                {/if}
              </div>

              {#if step.description}
                <p class="text-[11px] text-muted-foreground line-clamp-2">{step.description}</p>
              {/if}

              {#if step.errorMessage && state === 'error'}
                <p class="text-[11px] text-destructive mt-1 font-medium">{step.errorMessage}</p>
              {/if}

              {#if stepDetail}
                <div class="pt-1.5">
                  {@render stepDetail(step)}
                </div>
              {/if}
            </div>
          </button>

          {#if state === 'error' && step.retryable !== false && onRetry}
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-7 px-2 text-[11px] gap-1 shrink-0"
              onclick={() => onRetry(step)}
            >
              <RotateCcw class="h-3 w-3" />
              {chinese ? '重试' : 'Retry'}
            </Button>
          {/if}
        </div>

        {#if direction === 'vertical' && index < steps.length - 1}
          <div
            class={cn(
              'ml-6 my-1 w-0.5 h-3 rounded-full',
              state === 'finish' ? 'bg-success/60' : 'bg-border',
            )}
            aria-hidden="true"
          ></div>
        {/if}
      </li>
    {/each}
  </ol>
</div>
