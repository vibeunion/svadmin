<script lang="ts">
  import { captureAdminContext, useParsed } from '@svadmin/core';
  import { LoaderCircle, RefreshCcw, Sparkles, X } from '@lucide/svelte';
  import { slide } from 'svelte/transition';
  import { consumeTextResponse } from '../contracts.js';
  import type { ChatContext, ChatMessage, ChatProvider } from '../contracts.js';
  import Response from './Response.svelte';
  import { cn } from '../utils.js';

  type Props = { open?: boolean; class?: string };

  let { open = $bindable(false), class: className = '' }: Props = $props();

  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const generatedId = $props.id();
  const provider = $derived(adminContext.chatProvider);
  const chatContext = $derived<ChatContext>({
    currentResource: parsed.resource,
    selectedRecordId: parsed.id,
    currentView: parsed.action,
    pathname: adminContext.currentPath(),
  });

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

  function close(): void {
    open = false;
    clearScope();
  }

  function isCurrentRequest(epoch: number, controller: AbortController): boolean {
    return epoch === requestEpoch && abortController === controller && !controller.signal.aborted;
  }

  async function requestInsights(scopedProvider: ChatProvider, scopedContext: ChatContext): Promise<void> {
    cancelRequest();
    const epoch = requestEpoch;
    const controller = new AbortController();
    abortController = controller;
    loading = true;
    text = '';

    const prompt = `Analyze the current admin context and provide three concise operational insights or suggestions.
Resource: ${scopedContext.currentResource ?? 'Dashboard'}
View: ${scopedContext.currentView ?? 'List'}
Record ID: ${scopedContext.selectedRecordId ?? 'None'}
Use bullet points and do not include introductory text.`;
    const request: ChatMessage = {
      id: `copilot-${generatedId}-${epoch}`,
      role: 'user',
      parts: [{ type: 'text', text: prompt }],
      createdAt: Date.now(),
      status: 'complete',
    };

    try {
      await consumeTextResponse(
        scopedProvider.sendMessage([request], { signal: controller.signal, context: scopedContext }),
        (nextText) => { text = nextText; },
        { signal: controller.signal, isCurrent: () => isCurrentRequest(epoch, controller) },
      );
    } catch (error) {
      if (isCurrentRequest(epoch, controller) && !(error instanceof Error && error.name === 'AbortError')) {
        text = 'Failed to generate insights for this context.';
      }
    } finally {
      if (isCurrentRequest(epoch, controller)) {
        loading = false;
        abortController = null;
      }
    }
  }

  async function refresh(): Promise<void> {
    const scopedProvider: ChatProvider | null = provider;
    if (!scopedProvider) return;
    await requestInsights(scopedProvider, {
      currentResource: chatContext.currentResource,
      selectedRecordId: chatContext.selectedRecordId,
      currentView: chatContext.currentView,
      pathname: chatContext.pathname,
    });
  }

  $effect(() => {
    const scopedProvider: ChatProvider | null = provider;
    const scopedContext: ChatContext = {
      currentResource: chatContext.currentResource,
      selectedRecordId: chatContext.selectedRecordId,
      currentView: chatContext.currentView,
      pathname: chatContext.pathname,
    };
    const tenant = adminContext.tenantCacheKey?.__svadminTenant;
    const shouldFetch = open;
    void tenant;

    clearScope();
    if (shouldFetch && scopedProvider) void requestInsights(scopedProvider, scopedContext);
    return cancelRequest;
  });
</script>

{#if open}
  <aside
    class={cn('svadmin-ai svadmin-ai__surface fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col rounded-none border-y-0 border-r-0 shadow-xl', className)}
    aria-label="Copilot panel"
    transition:slide={{ axis: 'x', duration: 240 }}
  >
    <header class="flex min-h-14 items-center justify-between border-b border-border bg-muted/20 px-4">
      <h2 class="flex items-center gap-2 font-semibold">
        <Sparkles class="size-4 text-primary" aria-hidden="true" />
        Copilot
      </h2>
      <button type="button" class="svadmin-ai__button svadmin-ai__button--ghost min-h-8 px-2" aria-label="Close copilot" onclick={close}>
        <X class="size-4" aria-hidden="true" />
      </button>
    </header>

    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-border bg-muted/10 px-4 py-3 text-xs">
      <dt class="text-muted-foreground">Resource</dt>
      <dd class="truncate font-mono text-foreground">{chatContext.currentResource ?? 'Dashboard'}</dd>
      <dt class="text-muted-foreground">View</dt>
      <dd class="truncate font-mono capitalize text-foreground">{chatContext.currentView ?? 'List'}</dd>
      {#if chatContext.selectedRecordId !== undefined}
        <dt class="text-muted-foreground">Record ID</dt>
        <dd class="truncate font-mono text-foreground">{chatContext.selectedRecordId}</dd>
      {/if}
    </dl>

    <div class="min-h-0 flex-1 overflow-y-auto p-4" aria-live="polite" aria-busy={loading}>
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-xs font-semibold uppercase text-muted-foreground">Smart insights</h3>
        <button
          type="button"
          class="svadmin-ai__button svadmin-ai__button--ghost min-h-8 px-2"
          aria-label="Refresh insights"
          disabled={loading || !provider}
          onclick={refresh}
        >
          <RefreshCcw class={cn('size-3.5', loading && 'animate-spin')} aria-hidden="true" />
        </button>
      </div>

      {#if !provider}
        <p class="svadmin-ai__muted py-4 text-center text-sm">ChatProvider is not configured.</p>
      {:else if loading && !text}
        <p class="svadmin-ai__muted flex items-center justify-center gap-2 py-4 text-sm">
          <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
          Analyzing…
        </p>
      {:else if text}
        <div class="rounded border border-primary/10 bg-primary/5 p-3 text-sm">
          <Response text={text} streaming={loading} />
        </div>
      {:else}
        <p class="svadmin-ai__muted py-4 text-center text-sm">No insights available.</p>
      {/if}
    </div>
  </aside>
{/if}
