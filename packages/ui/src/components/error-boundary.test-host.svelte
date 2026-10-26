<script lang="ts">
  import { untrack } from 'svelte';
  import { createI18nScope, provideI18nScope } from '@svadmin/core/i18n';
  import ErrorBoundary from './ErrorBoundary.svelte';

  let { mode = 'default', locale = 'zh-CN' }: { mode?: 'default' | 'fallback'; locale?: string } = $props();
  let shouldThrow = true;

  provideI18nScope(createI18nScope({ locale: untrack(() => locale) }));

  function maybeThrow(): void {
    if (!shouldThrow) return;
    shouldThrow = false;
    throw new Error('PRIVATE_DIAGNOSTIC');
  }
</script>

{#snippet content()}
  {maybeThrow()}
  <p>Recovered content</p>
{/snippet}

{#snippet customFallback({ error, reset }: { error: Error; reset: () => void })}
  <p>custom fallback: {error.message}</p>
  <button onclick={reset}>custom reset</button>
{/snippet}

{#if mode === 'fallback'}
  <ErrorBoundary fallback={customFallback}>{@render content()}</ErrorBoundary>
{:else}
  <ErrorBoundary>{@render content()}</ErrorBoundary>
{/if}