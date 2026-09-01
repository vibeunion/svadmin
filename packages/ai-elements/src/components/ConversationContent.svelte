<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export type ConversationContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & {
    class?: string;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { useConversationContext } from '../context.svelte.js';
  import { cn } from '../utils.js';

  let {
    class: className = '',
    children,
    role = 'log',
    'aria-live': ariaLive,
    'aria-busy': ariaBusy,
    ...rest
  }: ConversationContentProps = $props();
  let contentElement = $state<HTMLElement | null>(null);
  const conversation = useConversationContext();

  $effect(() => {
    conversation.registerContent(contentElement);
    return () => conversation.registerContent(null);
  });
</script>

<div
  {...rest}
  bind:this={contentElement}
  class={cn('flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-4', className)}
  {role}
  aria-live={ariaLive ?? (conversation.isStreaming ? 'off' : 'polite')}
  aria-busy={ariaBusy ?? conversation.isStreaming}
  data-slot="conversation-content"
>
  {@render children?.()}
</div>
