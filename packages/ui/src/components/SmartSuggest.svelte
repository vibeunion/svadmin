<script lang="ts">
  import { Input } from './ui/input/index.js';
  import { captureAdminContext } from '@svadmin/core';
  import type { ChatProvider } from '@svadmin/core';

  interface Props {
    /** The bound value of the input */
    value: string;
    /** The chat provider to generate suggestions */
    provider?: ChatProvider;
    /** Context given to the AI to help it predict the text */
    context?: string;
    /** Standard input props */
    placeholder?: string;
    class?: string;
    id?: string;
    disabled?: boolean;
    name?: string;
    type?: string;
  }

  let { 
    value = $bindable(), 
    provider, 
    context = '', 
    placeholder = '', 
    class: className = '', 
    id, 
    disabled = false, 
    name, 
    type = 'text' 
  }: Props = $props();
  const adminContext = captureAdminContext();

  let suggestion = $state('');
  let isPredicting = $state(false);
  let abortController: AbortController | null = null;
  let predictTimer: ReturnType<typeof setTimeout> | null = null;
  let requestEpoch = 0;
  let observedValue = value;

  // The ghost text shows the suggestion, but only the part *after* what the user has typed
  // It only displays if the suggestion actually starts with the current value
  const ghostText = $derived.by(() => {
    if (!suggestion || !value) return '';
    const lowerVal = value.toLowerCase();
    const lowerSugg = suggestion.toLowerCase();
    
    if (lowerSugg.startsWith(lowerVal) && suggestion.length > value.length) {
      // Preserve original casing from the suggestion but append only the suffix
      return value + suggestion.slice(value.length);
    }
    return '';
  });

  const suffixText = $derived(ghostText ? ghostText.slice(value.length) : '');
  const resolvedProvider = $derived(provider ?? adminContext.chatProvider);

  $effect(() => {
    resolvedProvider;
    context;
    adminContext.tenantCacheKey?.__svadminTenant;
    clearSuggestionScope();

    return cancelPrediction;
  });

  $effect(() => {
    const currentValue = value;
    if (currentValue !== observedValue) {
      observedValue = currentValue;
      clearSuggestionScope();
    }
  });

  function cancelPrediction() {
    requestEpoch += 1;
    abortController?.abort();
    abortController = null;
    if (predictTimer) clearTimeout(predictTimer);
    predictTimer = null;
    isPredicting = false;
  }

  function clearSuggestionScope() {
    cancelPrediction();
    suggestion = '';
  }

  function isCurrentPrediction(epoch: number, scopedValue: string) {
    return epoch === requestEpoch && value === scopedValue;
  }

  async function predict() {
    predictTimer = null;
    const scopedProvider = resolvedProvider;
    const scopedValue = value;
    const scopedContext = context;
    if (!scopedProvider || !scopedValue.trim()) {
      suggestion = '';
      return;
    }

    cancelPrediction();
    const epoch = requestEpoch;
    const controller = new AbortController();
    abortController = controller;
    isPredicting = true;
    suggestion = '';

    try {
      const prompt = `You are an autocomplete engine. The user is typing: "${scopedValue}".
Context: ${scopedContext}.
Provide ONLY the most likely completion of the exact phrase the user is typing. 
Include the user's input in your returned string. 
Do not include any other text, Markdown formatting, quotes, or explanations.`;

      const result = scopedProvider.sendMessage(
        [{ id: 'prompt', role: 'user', content: prompt, timestamp: Date.now() }],
        { signal: controller.signal }
      );

      if (Symbol.asyncIterator in result) {
        for await (const chunk of result as AsyncIterable<string>) {
          if (!isCurrentPrediction(epoch, scopedValue)) return;
          suggestion += chunk;
        }
      } else {
        const response = await result;
        if (isCurrentPrediction(epoch, scopedValue)) suggestion = response;
      }

      if (isCurrentPrediction(epoch, scopedValue)) {
        suggestion = suggestion.trim().replace(/^["']|["']$/g, '');
      }
    } catch (err: unknown) {
      if (isCurrentPrediction(epoch, scopedValue) && err instanceof Error && err.name !== 'AbortError') {
        suggestion = '';
      }
    } finally {
      if (isCurrentPrediction(epoch, scopedValue)) {
        isPredicting = false;
        if (abortController === controller) abortController = null;
      }
    }
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    cancelPrediction();
    observedValue = target.value;
    value = target.value;

    // Reset suggestion immediately if it no longer matches
    if (suggestion && !suggestion.toLowerCase().startsWith(value.toLowerCase())) {
      suggestion = '';
    }

    predictTimer = setTimeout(() => {
      void predict();
    }, 500);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Tab' && suffixText) {
      e.preventDefault();
      cancelPrediction();
      observedValue = ghostText;
      value = ghostText;
      suggestion = '';
    }
  }

</script>

<div class="relative w-full {className}">
  <!-- Ghost Text Layer (positioned exactly beneath the actual text) -->
  {#if suffixText}
    <div 
      class="absolute inset-0 pointer-events-none flex items-center px-3 text-sm font-medium"
      aria-hidden="true"
    >
      <span class="opacity-0">{value}</span>
      <span class="text-muted-foreground/40">{suffixText}</span>
    </div>
  {/if}

  <!-- Actual Input Layer -->
  <Input
    {id}
    {name}
    {type}
    {disabled}
    {placeholder}
    value={value}
    oninput={handleInput}
    onkeydown={handleKeyDown}
    class="bg-transparent relative z-10 w-full"
  />

  <!-- Loading indicator -->
  {#if isPredicting}
    <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
      <div class="h-1.5 w-1.5 rounded-full bg-primary/50 animate-pulse"></div>
    </div>
  {/if}
</div>
