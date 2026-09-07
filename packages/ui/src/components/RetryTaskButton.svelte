<script lang="ts">
  import { captureAdminContext, queryKeyMatches } from '@svadmin/core';
  import { useQueryClient } from '@tanstack/svelte-query';
  import { useTranslation } from '@svadmin/core/i18n';

  import { Button } from './ui/button/index.js';
  import { Loader2, RotateCcw } from '@lucide/svelte';

  const i18n = useTranslation();
  const adminContext = captureAdminContext();

  let {
    taskId,
    taskProvider = adminContext.taskProvider ?? undefined,
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

  const queryClient = useQueryClient();
  let pending = $state(false);

  async function handleRetry() {
    if (!taskProvider?.retry || pending) return;
    pending = true;
    try {
      await taskProvider.retry(taskId);
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) => queryKeyMatches(query.queryKey, {
            ...adminContext.queryKeyMatcher(),
            kind: 'task',
            action: 'list',
          }),
        }),
        queryClient.invalidateQueries({
          predicate: (query) => queryKeyMatches(query.queryKey, {
            ...adminContext.queryKeyMatcher(),
            kind: 'task',
            action: 'one',
            id: taskId,
          }),
        }),
      ]);
      onSuccess?.();
    } catch (error) {
      onError?.(error);
    } finally {
      pending = false;
    }
  }
</script>

<Button {variant} {size} onclick={handleRetry} disabled={disabled || pending || !taskProvider?.retry}>
  {#if pending}
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
