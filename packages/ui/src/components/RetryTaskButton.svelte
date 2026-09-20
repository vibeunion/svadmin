<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';

  import { Button } from './ui/button/index.js';
  import { Loader2, RotateCcw } from '@lucide/svelte';
  import { createTaskAction } from './task-action.svelte.js';

  const i18n = useTranslation();

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

<Button {variant} {size} onclick={action.run} disabled={!action.available || action.pending}>
  {#if action.pending}
    <Loader2 class="svadmin-u-82cc6c6581cd svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-afbdd13a380e" />
  {:else}
    <RotateCcw class="svadmin-u-82cc6c6581cd svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
  {/if}
  {#if children}
    {@render children()}
  {:else}
    {i18n.t('common.retry')}
  {/if}
</Button>
