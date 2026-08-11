<script lang="ts">
  import { captureAdminContext, type ChatProvider } from '@svadmin/core';
  import { Sparkles, RefreshCcw, Loader2 } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import MarkdownRenderer from './MarkdownRenderer.svelte';

  interface Props {
    title?: string;
    context: string;
    autoFetch?: boolean;
    class?: string;
  }

  let { title = 'AI Insights', context, autoFetch = true, class: className = '' }: Props = $props();

  const adminContext = captureAdminContext();
  const provider = $derived(adminContext.chatProvider);

  let isPredicting = $state(false);
  let insightText = $state('');
  let abortController: AbortController | null = null;
  let requestEpoch = 0;

  $effect(() => {
    const scopedProvider = provider;
    const scopedContext = context;
    const shouldFetch = autoFetch;
    adminContext.tenantCacheKey?.__svadminTenant;

    clearInsightScope();
    if (shouldFetch && scopedContext && scopedProvider) {
      void requestInsights(scopedProvider, scopedContext);
    }

    return cancelInsightRequest;
  });

  export async function getInsights() {
    const scopedProvider = provider;
    if (!scopedProvider || !context) return;
    await requestInsights(scopedProvider, context);
  }

  function cancelInsightRequest() {
    requestEpoch += 1;
    abortController?.abort();
    abortController = null;
  }

  function clearInsightScope() {
    cancelInsightRequest();
    isPredicting = false;
    insightText = '';
  }

  async function requestInsights(scopedProvider: ChatProvider, scopedContext: string) {
    cancelInsightRequest();
    const epoch = requestEpoch;
    const controller = new AbortController();
    abortController = controller;
    isPredicting = true;
    insightText = '';

    const prompt = `Based on the following data/context, generate 3 concise, highly professional insights. 
Use bullet points. Do not include introductory text like "Here are the insights".

Data Context:
${scopedContext}`;

    try {
      const result = scopedProvider.sendMessage(
        [{ id: 'insights', role: 'user', content: prompt, timestamp: Date.now() }],
        { signal: controller.signal }
      );

      if (Symbol.asyncIterator in result) {
        for await (const chunk of result as AsyncIterable<string>) {
          if (epoch !== requestEpoch) return;
          insightText += chunk;
        }
      } else {
        const response = await result;
        if (epoch === requestEpoch) insightText = response;
      }
    } catch (err: unknown) {
      if (epoch === requestEpoch && err instanceof Error && err.name !== 'AbortError') {
        insightText = 'Failed to generate insights.';
      }
    } finally {
      if (epoch === requestEpoch) {
        isPredicting = false;
        if (abortController === controller) abortController = null;
      }
    }
  }
</script>

<div class="rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col {className}">
  <div class="flex items-center justify-between p-4 border-b">
    <div class="flex items-center gap-2 font-medium">
      <Sparkles class="h-4 w-4 text-amber-500" />
      {title}
    </div>
    <Button variant="ghost" size="icon-sm" class="h-6 w-6" onclick={getInsights} disabled={isPredicting || !provider}>
      <RefreshCcw class="h-3 w-3 {isPredicting ? 'animate-spin' : ''}" />
    </Button>
  </div>
  
  <div class="p-4 flex-1">
    {#if !provider}
      <div class="text-sm text-muted-foreground italic flex items-center justify-center h-full">
        ChatProvider not configured.
      </div>
    {:else if isPredicting && !insightText}
      <div class="flex items-center justify-center gap-2 text-sm text-muted-foreground h-full py-4">
        <Loader2 class="h-4 w-4 animate-spin" /> Analyzing data...
      </div>
    {:else if !insightText}
      <div class="text-sm text-muted-foreground italic flex items-center justify-center h-full">
        No insights available. Click refresh to analyze.
      </div>
    {:else}
      <div class="text-sm prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
        <MarkdownRenderer content={insightText} streaming={isPredicting} />
      </div>
    {/if}
  </div>
</div>
