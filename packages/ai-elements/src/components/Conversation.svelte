<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { ChatMessage } from '../contracts.js';

  export type ConversationProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'class'> & {
    messages?: ChatMessage[];
    isStreaming?: boolean;
    class?: string;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { provideConversationContext } from '../context.svelte.js';
  import { cn } from '../utils.js';

  let {
    messages = [],
    isStreaming = false,
    class: className = '',
    children,
    'aria-label': ariaLabel = 'Conversation',
    ...rest
  }: ConversationProps = $props();
  let contentElement = $state<HTMLElement | null>(null);
  let isAtBottom = $state(true);

  function scrollToBottom(): void {
    const element = contentElement;
    if (!element) return;
    isAtBottom = true;
    if (typeof element.scrollTo === 'function') element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    else element.scrollTop = element.scrollHeight;
  }

  function updateScrollState(): void {
    const element = contentElement;
    if (!element) return;
    isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 48;
  }

  function registerContent(element: HTMLElement | null): void {
    untrack(() => {
      contentElement?.removeEventListener('scroll', updateScrollState);
      contentElement = element;
      contentElement?.addEventListener('scroll', updateScrollState, { passive: true });
      updateScrollState();
    });
  }

  provideConversationContext({
    get messages() { return messages; },
    get isStreaming() { return isStreaming; },
    get isAtBottom() { return isAtBottom; },
    scrollToBottom,
    registerContent,
  });

  $effect(() => {
    void messages;
    void isStreaming;
    queueMicrotask(() => {
      const element = contentElement;
      if (element && isAtBottom) {
        if (typeof element.scrollTo === 'function') element.scrollTo({ top: element.scrollHeight });
        else element.scrollTop = element.scrollHeight;
      }
      updateScrollState();
    });
  });
</script>

<section
  {...rest}
  class={cn('svadmin-ai svadmin-ai__surface relative flex min-h-0 flex-col overflow-hidden', className)}
  aria-label={ariaLabel}
  data-slot="conversation"
>
  {@render children?.()}
</section>

<svelte:window onresize={updateScrollState} />
