<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  export type ReasoningProps = Omit<HTMLAttributes<HTMLDetailsElement>, 'children' | 'class' | 'open' | 'ontoggle' | 'title'> & {
    text?: string;
    streaming?: boolean;
    isStreaming?: boolean;
    open?: boolean;
    defaultOpen?: boolean;
    duration?: number;
    title?: string;
    class?: string;
    children?: Snippet;
    onOpenChange?: (open: boolean) => void;
    onopenchange?: (open: boolean) => void;
  };
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { cn } from '../utils.js';
  import { provideReasoningContext } from './reasoning/context.svelte.js';

  let {
    text = '',
    streaming = false,
    isStreaming,
    open = $bindable(),
    defaultOpen,
    duration,
    title = 'Reasoning',
    class: className = '',
    children,
    onOpenChange,
    onopenchange,
    ...rest
  }: ReasoningProps = $props();

  const resolvedStreaming = $derived(isStreaming ?? streaming);
  let internalOpen = $state(untrack(() => defaultOpen ?? resolvedStreaming));
  let computedDuration = $state<number | undefined>(undefined);
  let startedAt = $state<number | null>(untrack(() => resolvedStreaming ? Date.now() : null));
  let hasEverStreamed = $state(untrack(() => resolvedStreaming));
  let hasAutoClosed = $state(false);
  const isOpen = $derived(open ?? internalOpen);
  const resolvedDuration = $derived(duration ?? computedDuration);
  const explicitlyClosed = $derived(defaultOpen === false);

  function setIsOpen(nextOpen: boolean): void {
    if (nextOpen === isOpen) return;
    if (open === undefined) internalOpen = nextOpen;
    else open = nextOpen;
    onOpenChange?.(nextOpen);
    onopenchange?.(nextOpen);
  }

  provideReasoningContext({
    get isStreaming() { return resolvedStreaming; },
    get isOpen() { return isOpen; },
    get duration() { return resolvedDuration; },
    setIsOpen,
  });

  // Keep one timing window per streaming run and close once after completion.
  $effect(() => {
    if (resolvedStreaming) {
      hasEverStreamed = true;
      if (startedAt === null) startedAt = Date.now();
      if (!isOpen && !explicitlyClosed) setIsOpen(true);
      return;
    }

    if (startedAt !== null) {
      computedDuration = Math.ceil((Date.now() - startedAt) / 1000);
      startedAt = null;
    }

    if (!hasEverStreamed || !isOpen || hasAutoClosed) return;

    const timer = setTimeout(() => {
      setIsOpen(false);
      hasAutoClosed = true;
    }, 1000);
    return () => clearTimeout(timer);
  });
</script>

<details
  {...rest}
  class={cn('svadmin-ai__surface not-prose mb-4 text-sm', className)}
  open={isOpen}
  data-slot="reasoning"
  ontoggle={(event) => setIsOpen(event.currentTarget.open)}
>
  {#if children}
    {@render children()}
  {:else}
    <summary class="cursor-pointer list-none px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2">{title}<span class="svadmin-ai__muted ml-2 text-xs">{resolvedStreaming ? 'Streaming' : 'Complete'}</span></summary>
    {#if isOpen}<div class="border-t border-border/70 p-3"><div class={resolvedStreaming ? 'svadmin-ai__streaming' : ''}>{text}</div></div>{/if}
  {/if}
</details>
