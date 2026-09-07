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
    statusLabels?: Partial<Record<WorkspaceStageStatus, string>>;
    getStageAriaLabel?: (stage: WorkspaceStage) => string;
    class?: string;
  }

  let {
    stages,
    activeId,
    onselect,
    ariaLabel = 'Workflow stages',
    statusLabels = {},
    getStageAriaLabel,
    class: className = '',
  }: Props = $props();

  const markerClass: Record<WorkspaceStageStatus, string> = {
    complete: 'svadmin-u-18a6e7a36f29 svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff',
    current: 'svadmin-u-6cbc84dd9e1a svadmin-u-75b1bec3ea0e svadmin-u-30ca335ae9c2',
    blocked: 'svadmin-u-c688a14d7b97 svadmin-u-d9c3c520f7d5 svadmin-u-3a4ff758c2ab',
    pending: 'svadmin-u-18049387f0af svadmin-u-e6f9e383a762 svadmin-u-bfa603190748',
  };

  const resolvedStatusLabels = $derived<Record<WorkspaceStageStatus, string>>({
    complete: 'Complete',
    current: 'Current stage',
    blocked: 'Blocked',
    pending: 'Pending',
    ...statusLabels,
  });
</script>

<nav aria-label={ariaLabel} class={cn('svadmin-u-1384f66f41d0', className)} data-svadmin-workspace-stages>
  <ol class="svadmin-u-60fbb7713999 svadmin-u-286893e2971d svadmin-u-60541e1e26f8 svadmin-u-63a285be6490 svadmin-u-177c5cdba493 svadmin-u-660d2effb880">
    {#each stages as stage, index (stage.id)}
      <li class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8">
        <button
          type="button"
          class="group svadmin-u-f3c543ad5fe9 svadmin-u-4460ceede36b svadmin-u-4455d4748b63 svadmin-u-0f8a144a7c17 svadmin-u-421ac2be5045 svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-2eba0d65d059 svadmin-u-df37b1fd9495 svadmin-u-ceb69a6b0e5f svadmin-u-39f703dbe296 svadmin-u-793c80e97ffb svadmin-u-9c1295a6914a svadmin-u-e32fca50a966"
          aria-current={stage.id === activeId ? 'step' : undefined}
          aria-label={getStageAriaLabel?.(stage) || `${stage.label}: ${resolvedStatusLabels[stage.status]}`}
          onclick={() => onselect?.(stage)}
        >
          <span class={cn('svadmin-u-60fbb7713999 svadmin-u-cc46d0fa277d svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-ca6bcd4b6f3f', markerClass[stage.status])}>
            {#if stage.status === 'complete'}
              <Check class="svadmin-u-783b0d9d1e2c" />
            {:else if stage.status === 'blocked'}
              <AlertTriangle class="svadmin-u-783b0d9d1e2c" />
            {:else}
              <Circle class={cn('svadmin-u-6b7265b65ab7', stage.status === 'current' && 'svadmin-u-20269b6b378e')} />
            {/if}
          </span>
          <span class="svadmin-u-7e0b7cdf1a94 svadmin-u-087ea857932e">
            <span class={cn('svadmin-u-0214b4b355d1 svadmin-u-359090c2d529 svadmin-u-2689f3958069', stage.id === activeId ? 'svadmin-u-d4108abe6359' : 'svadmin-u-bfa603190748')}>{stage.label}</span>
            {#if stage.description}<span class="svadmin-u-15e1b1f444fe svadmin-u-0214b4b355d1 svadmin-u-1d274d2422d8 svadmin-u-f283ea9bea0e svadmin-u-76067d04e222 svadmin-u-bfa603190748">{stage.description}</span>{/if}
          </span>
        </button>
        {#if index < stages.length - 1}
          <span class={cn('svadmin-u-fb77735ed17c svadmin-u-aea6160836e7 svadmin-u-dc7972ebf3f3 svadmin-u-a59afa8d9b9d svadmin-u-8edb3fc31a03', stage.status === 'complete' && 'svadmin-u-55b6d9158f15')} aria-hidden="true"></span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
