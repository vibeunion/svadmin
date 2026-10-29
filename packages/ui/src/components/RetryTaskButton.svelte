<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';

  import { Button } from './ui/button/index.js';
  import { Loader2, RotateCcw } from '@lucide/svelte';
  import { createTaskAction } from './task-action.svelte.js';

  const i18n = useTranslation();
  const instanceId = $props.id();
  const errorId = `${instanceId}-error`;

  let {
    taskId,
    taskProvider,
    onSuccess,
    onError,
    disabled = false,
    variant = 'outline',
    size = 'sm',
    children,
  } = $props<{
    taskId: string;
    taskProvider?: import('@svadmin/core').TaskProvider;
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
    disabled?: boolean;
    variant?: import('./ui/button/index.js').ButtonVariant;
    size?: import('./ui/button/index.js').ButtonSize;
    children?: import('svelte').Snippet;
  }>();

  const action = createTaskAction({
    action: 'retry',
    get taskId() { return taskId; },
    get provider() { return taskProvider; },
    get disabled() { return disabled; },
    get onSuccess() { return onSuccess; },
    get onError() { return onError; },
  });
</script>

<span class="task-action-feedback">
<Button {variant} {size} onclick={action.run} disabled={!action.available || action.pending}
  aria-describedby={action.failed && !onError ? errorId : undefined}>
  {#if action.pending}
    <Loader2 class="mr-1.5 h-3.5 w-3.5 animate-spin" />
  {:else}
    <RotateCcw class="mr-1.5 h-3.5 w-3.5" />
  {/if}
  {#if children}
    {@render children()}
  {:else}
    {i18n.t('common.retry')}
  {/if}
</Button>
{#if action.failed && !onError}
  <span id={errorId} role="alert">{i18n.t('task.actionFailed')}</span>
{/if}
</span>

<style>
  .task-action-feedback { display: inline-flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; max-width: 16rem; }
  .task-action-feedback [role="alert"] { color: var(--destructive); font-size: var(--svadmin-text-caption); line-height: var(--svadmin-leading-tight); white-space: normal; overflow-wrap: anywhere; }
</style>
