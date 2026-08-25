<script module lang="ts">
  export type WorkspaceStageStatus = 'complete' | 'current' | 'blocked' | 'pending';

  export interface WorkspaceStage {
    id: string;
    label: string;
    description?: string;
    status: WorkspaceStageStatus;
  }
</script>

<script lang="ts">
  import { AlertTriangle, Check, Circle } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  interface Props {
    stages: WorkspaceStage[];
    activeId: string;
    onselect?: (stage: WorkspaceStage) => void;
    ariaLabel?: string;
    class?: string;
  }

  let {
    stages,
    activeId,
    onselect,
    ariaLabel = 'Workflow stages',
    class: className = '',
  }: Props = $props();

  const markerClass: Record<WorkspaceStageStatus, string> = {
    complete: 'border-success/30 bg-success/10 text-success',
    current: 'border-primary bg-primary text-primary-foreground',
    blocked: 'border-warning/40 bg-warning/15 text-warning-foreground',
    pending: 'border-border bg-background text-muted-foreground',
  };
</script>

<nav aria-label={ariaLabel} class={cn('overflow-x-auto', className)} data-svadmin-workspace-stages>
  <ol class="flex min-w-max items-start gap-0 px-0.5 py-1">
    {#each stages as stage, index (stage.id)}
      <li class="flex items-start">
        <button
          type="button"
          class="group grid min-w-28 grid-cols-[auto_minmax(0,1fr)] gap-x-2 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring sm:min-w-36"
          aria-current={stage.id === activeId ? 'step' : undefined}
          aria-label={`${stage.label}: ${stage.status}`}
          onclick={() => onselect?.(stage)}
        >
          <span class={cn('flex size-7 items-center justify-center rounded-full border', markerClass[stage.status])}>
            {#if stage.status === 'complete'}
              <Check class="size-3.5" />
            {:else if stage.status === 'blocked'}
              <AlertTriangle class="size-3.5" />
            {:else}
              <Circle class={cn('size-2.5', stage.status === 'current' && 'fill-current')} />
            {/if}
          </span>
          <span class="min-w-0 pt-0.5">
            <span class={cn('block text-xs font-medium', stage.id === activeId ? 'text-foreground' : 'text-muted-foreground')}>{stage.label}</span>
            {#if stage.description}<span class="mt-0.5 block max-w-32 truncate text-[0.6875rem] text-muted-foreground">{stage.description}</span>{/if}
          </span>
        </button>
        {#if index < stages.length - 1}
          <span class={cn('mt-5 h-px w-4 bg-border sm:w-7', stage.status === 'complete' && 'bg-success/50')} aria-hidden="true"></span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
