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
  import { onDestroy } from 'svelte';
  import { provideConversationContext } from '../context.svelte.js';
  import { observeConversationScroll } from './conversation/scroll.js';
  import { cn } from '../utils.js';

  let {
    messages = [],
    isStreaming = false,
    class: className = '',
    children,
    'aria-label': ariaLabel = 'Conversation',
    ...rest
  }: ConversationProps = $props();
  let scroll: ReturnType<typeof observeConversationScroll> | undefined;
  let isAtBottom = $state(true);

  function scrollToBottom(): void {
    scroll?.scrollToBottom();
  }

  function registerContent(element: HTMLElement | null): void {
    scroll?.destroy();
    scroll = element
      ? observeConversationScroll(element, (atBottom) => { isAtBottom = atBottom; })
      : undefined;
  }

  provideConversationContext({
    get messages() { return messages; },
    get isStreaming() { return isStreaming; },
    get isAtBottom() { return isAtBottom; },
    scrollToBottom,
    registerContent,
  });

  onDestroy(() => scroll?.destroy());
</script>

<section
  {...rest}
  class={cn('svadmin-ai svadmin-ai__surface relative flex min-h-0 min-w-0 flex-col overflow-hidden', className)}
  aria-label={ariaLabel}
  data-slot="conversation"
>
  {@render children?.()}
</section>
