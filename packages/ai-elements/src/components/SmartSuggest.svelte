<script lang="ts">
  import { captureAdminContext } from '@svadmin/core';
  import { consumeTextResponse } from '../contracts.js';
  import type { ChatMessage, ChatProvider } from '../contracts.js';
  import { cn } from '../utils.js';

  type Props = {
    value?: string;
    provider?: ChatProvider;
    context?: string;
    placeholder?: string;
    class?: string;
    id?: string;
    disabled?: boolean;
    name?: string;
    type?: string;
    ariaLabel?: string;
    onvaluechange?: (value: string) => void;
  };

  let {
    value = $bindable(''),
    provider,
    context = '',
    placeholder = '',
    class: className = '',
    id,
    disabled = false,
    name,
    type = 'text',
    ariaLabel = 'Text with AI suggestions',
    onvaluechange,
  }: Props = $props();

  const adminContext = captureAdminContext();
  const generatedId = $props.id();
  const resolvedProvider = $derived(provider ?? adminContext.chatProvider);
  let suggestion = $state('');
  let loading = $state(false);
  let abortController: AbortController | null = null;
  let predictTimer: ReturnType<typeof setTimeout> | null = null;
  let requestEpoch = 0;
  let observedValue = value;

  const ghostText = $derived.by(() => {
    if (!suggestion || !value) return '';
    if (!suggestion.toLocaleLowerCase().startsWith(value.toLocaleLowerCase())) return '';
    return suggestion.length > value.length ? value + suggestion.slice(value.length) : '';
  });
  const suffix = $derived(ghostText ? ghostText.slice(value.length) : '');

  function cancelPrediction(): void {
    requestEpoch += 1;
    abortController?.abort();
    abortController = null;
    if (predictTimer) clearTimeout(predictTimer);
    predictTimer = null;
    loading = false;
  }

  function clearScope(): void {
    cancelPrediction();
    suggestion = '';
  }

  function isCurrentPrediction(epoch: number, controller: AbortController, scopedValue: string): boolean {
    return epoch === requestEpoch
      && abortController === controller
      && !controller.signal.aborted
      && value === scopedValue;
  }

  function schedulePrediction(): void {
    if (predictTimer) clearTimeout(predictTimer);
    predictTimer = setTimeout(() => { void predict(); }, 500);
  }

  async function predict(): Promise<void> {
    predictTimer = null;
    const scopedProvider: ChatProvider | null = resolvedProvider;
    const scopedValue = value;
    const scopedContext = context;
    if (!scopedProvider || disabled || !scopedValue.trim()) {
      suggestion = '';
      return;
    }

    cancelPrediction();
    const epoch = requestEpoch;
    const controller = new AbortController();
    abortController = controller;
    loading = true;
    suggestion = '';

    const request: ChatMessage = {
      id: `suggestion-${generatedId}-${epoch}`,
      role: 'user',
      parts: [{
        type: 'text',
        text: `You are an autocomplete engine. Complete the exact phrase below. Return only the full phrase, including the existing input, without Markdown, quotes, or explanation.\n\nInput: ${scopedValue}\nContext: ${scopedContext}`,
      }],
      createdAt: Date.now(),
      status: 'complete',
    };

    try {
      await consumeTextResponse(
        scopedProvider.sendMessage([request], { signal: controller.signal }),
        (nextText) => { suggestion = nextText; },
        {
          signal: controller.signal,
          isCurrent: () => isCurrentPrediction(epoch, controller, scopedValue),
        },
      );
      if (isCurrentPrediction(epoch, controller, scopedValue)) {
        suggestion = suggestion.trim().replace(/^['"]|['"]$/g, '');
      }
    } catch (error) {
      if (isCurrentPrediction(epoch, controller, scopedValue) && !(error instanceof Error && error.name === 'AbortError')) {
        suggestion = '';
      }
    } finally {
      if (isCurrentPrediction(epoch, controller, scopedValue)) {
        loading = false;
        abortController = null;
      }
    }
  }

  function updateValue(nextValue: string): void {
    observedValue = nextValue;
    value = nextValue;
    onvaluechange?.(nextValue);
  }

  function handleInput(event: Event): void {
    const nextValue = (event.currentTarget as HTMLInputElement).value;
    clearScope();
    updateValue(nextValue);
    if (nextValue.trim()) schedulePrediction();
  }

  function acceptSuggestion(): void {
    if (!ghostText) return;
    const acceptedValue = ghostText;
    clearScope();
    updateValue(acceptedValue);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab' && suffix) {
      event.preventDefault();
      acceptSuggestion();
    }
  }

  $effect(() => {
    const scopedProvider = resolvedProvider;
    const scopedContext = context;
    const tenant = adminContext.tenantCacheKey?.__svadminTenant;
    const isDisabled = disabled;
    void scopedProvider;
    void scopedContext;
    void tenant;
    void isDisabled;
    clearScope();
    return cancelPrediction;
  });

  $effect(() => {
    const currentValue = value;
    if (currentValue !== observedValue) {
      observedValue = currentValue;
      clearScope();
    }
  });
</script>

<div class={cn('svadmin-ai relative w-full', className)}>
  {#if suffix}
    <div class="pointer-events-none absolute inset-0 flex items-center px-3 text-sm" aria-hidden="true">
      <span class="opacity-0">{value}</span><span class="svadmin-ai__muted opacity-60">{suffix}</span>
    </div>
  {/if}
  <input
    class="svadmin-ai__input relative z-10 bg-transparent"
    {id}
    {name}
    {type}
    {disabled}
    {placeholder}
    value={value}
    aria-label={ariaLabel}
    aria-autocomplete="inline"
    oninput={handleInput}
    onkeydown={handleKeydown}
  />
  {#if loading}
    <span class="svadmin-ai__muted pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs" aria-label="Generating suggestion">…</span>
  {/if}
</div>
