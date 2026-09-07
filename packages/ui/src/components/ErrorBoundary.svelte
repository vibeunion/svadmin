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
      <div class="svadmin-u-60fbb7713999 svadmin-u-ef114b5f5ad1 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-e6f9e383a762">
        <div class="svadmin-u-9794ab45094d svadmin-u-6da6a3c3f741 svadmin-u-f0faeb26d656">
          <Alert.Root variant="destructive" class="svadmin-u-3e7ce58d64fa">
            <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-1004c0c3954c">
              <AlertTriangle class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-15e1b1f444fe svadmin-u-012fbd121f37" />
              <div class="svadmin-u-6f7e013d6499">
                <Alert.Title>{i18n.t('common.error')}</Alert.Title>
                <Alert.Description class="svadmin-u-fc7473ca09eb">
                  {error instanceof Error ? error.message : String(error)}
                </Alert.Description>
              </div>
            </div>
            <Button variant="outline" size="sm" onclick={reset} class="svadmin-u-6da6a3c3f741">
              {i18n.t('common.retry')}
            </Button>
          </Alert.Root>
        </div>
      </div>
    {/if}
  {/snippet}
</svelte:boundary>
