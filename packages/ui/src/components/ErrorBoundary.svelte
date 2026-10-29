<script lang="ts">
  import type { Snippet } from 'svelte';
  import { AlertTriangle } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import * as Alert from './ui/alert/index.js';
  import { useTranslation } from '@svadmin/core/i18n';

  const i18n = useTranslation();

  let {
    children,
    fallback,
  }: {
    children: Snippet;
    /** Optional custom error UI snippet */
    fallback?: Snippet<[{ error: Error; reset: () => void }]>;
  } = $props();

  function handleError(error: unknown) {
    console.error('[svadmin] Uncaught error:', error);
  }
</script>

<svelte:boundary onerror={handleError}>
  {@render children()}

  {#snippet failed(error, reset)}
    {#if fallback}
      {@render fallback({ error: error instanceof Error ? error : new Error(String(error)), reset })}
    {:else}
      <div class="flex h-screen items-center justify-center bg-background">
        <div class="max-w-md w-full px-4">
          <Alert.Root variant="destructive" class="space-y-4">
            <div class="flex items-start gap-3">
              <AlertTriangle class="h-5 w-5 mt-0.5 shrink-0" />
              <div class="space-y-2">
                <Alert.Title>{i18n.t('common.error')}</Alert.Title>
                <Alert.Description class="text-sm">
                  {i18n.t('error.internalServerErrorDescription')}
                </Alert.Description>
              </div>
            </div>
            <Button variant="outline" size="sm" onclick={reset} class="w-full">
              {i18n.t('common.retry')}
            </Button>
          </Alert.Root>
        </div>
      </div>
    {/if}
  {/snippet}
</svelte:boundary>
