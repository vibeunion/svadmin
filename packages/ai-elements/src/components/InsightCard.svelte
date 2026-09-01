<script lang="ts">
  import { captureAdminContext } from '@svadmin/core';
  import { LoaderCircle, RefreshCcw, Sparkles } from '@lucide/svelte';
  import { consumeTextResponse } from '../contracts.js';
  import type { ChatMessage, ChatProvider } from '../contracts.js';
  import Response from './Response.svelte';
  import { cn } from '../utils.js';

  type Props = {
    context: string;
    title?: string;
    autoFetch?: boolean;
    class?: string;
  };

  let {
    context: insightContext,
    title = 'AI insights',
    autoFetch = true,
    class: className = '',
  }: Props = $props();

  const adminContext = captureAdminContext();
  const generatedId = $props.id();
  const provider = $derived(adminContext.chatProvider);
  let text = $state('');
  let loading = $state(false);
  let abortController: AbortController | null = null;
  let requestEpoch = 0;

  function cancelRequest(): void {
    requestEpoch += 1;
    abortController?.abort();
    abortController = null;
  }

  function clearScope(): void {
    cancelRequest();
    loading = false;
    text = '';
  }

  function isCurrentRequest(epoch: number, controller: AbortController): boolean {
    return epoch === requestEpoch && abortController === controller && !controller.signal.aborted;
  }

  async function requestInsights(scopedProvider: ChatProvider, scopedContext: string): Promise<void> {
    cancelRequest();
    const epoch = requestEpoch;
    const controller = new AbortController();
    abortController = controller;
    loading = true;
    text = '';

    const request: ChatMessage = {
      id: `insight-${generatedId}-${epoch}`,
      role: 'user',
      parts: [{
        type: 'text',
        text: `Based on the following data, generate three concise professional insights. Use bullet points and do not include introductory text.\n\nData context:\n${scopedContext}`,
      }],
      createdAt: Date.now(),
      status: 'complete',
    };

    try {
      await consumeTextResponse(
        scopedProvider.sendMessage([request], { signal: controller.signal }),
        (nextText) => { text = nextText; },
        { signal: controller.signal, isCurrent: () => isCurrentRequest(epoch, controller) },
      );
    } catch (error) {
      if (isCurrentRequest(epoch, controller) && !(error instanceof Error && error.name === 'AbortError')) {
        text = 'Failed to generate insights.';
      }
    } finally {
      if (isCurrentRequest(epoch, controller)) {
        loading = false;
        abortController = null;
      }
    }
  }

  export async function getInsights(): Promise<void> {
    const scopedProvider: ChatProvider | null = provider;
    const scopedContext = insightContext;
    if (!scopedProvider || !scopedContext) return;
    await requestInsights(scopedProvider, scopedContext);
  }

  $effect(() => {
    const scopedProvider: ChatProvider | null = provider;
    const scopedContext = insightContext;
    const shouldFetch = autoFetch;
    const tenant = adminContext.tenantCacheKey?.__svadminTenant;
    void tenant;

    clearScope();
    if (shouldFetch && scopedContext && scopedProvider) {
      void requestInsights(scopedProvider, scopedContext);
    }
    return cancelRequest;
  });
</script>

<section class={cn('svadmin-ai svadmin-ai__surface flex flex-col', className)} aria-label={title}>
  <header class="flex items-center justify-between border-b border-border p-3">
    <h2 class="flex items-center gap-2 font-semibold">
      <Sparkles class="size-4 text-warning" aria-hidden="true" />
      {title}
    </h2>
    <button
      type="button"
      class="svadmin-ai__button svadmin-ai__button--ghost min-h-8 px-2"
      aria-label="Refresh AI insights"
      disabled={loading || !provider || !insightContext}
      onclick={getInsights}
    >
      <RefreshCcw class={cn('size-3.5', loading && 'animate-spin')} aria-hidden="true" />
    </button>
  </header>

  <div class="min-h-24 flex-1 p-4" role="status" aria-live="polite" aria-busy={loading}>
    {#if !provider}
      <p class="svadmin-ai__muted flex h-full items-center justify-center text-sm">ChatProvider is not configured.</p>
    {:else if loading && !text}
      <p class="svadmin-ai__muted flex h-full items-center justify-center gap-2 py-4 text-sm">
        <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
        Analyzing data…
      </p>
    {:else if text}
      <div class="text-sm"><Response text={text} streaming={loading} /></div>
    {:else}
      <p class="svadmin-ai__muted flex h-full items-center justify-center text-sm">No insights available. Refresh to analyze.</p>
    {/if}
  </div>
</section>
