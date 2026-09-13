<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export type ConversationScrollButtonProps = Omit<HTMLButtonAttributes, 'children' | 'class' | 'onclick'> & {
    class?: string;
    children?: Snippet;
    onclick?: (event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) => void;
  };
</script>

<script lang="ts">
  import { ArrowDown } from '@lucide/svelte';
  import { useConversationContext } from '../context.svelte.js';
  import { cn } from '../utils.js';

  let {
    class: className = '',
    children,
    onclick,
    type = 'button',
    'aria-label': ariaLabel = 'Scroll to latest message',
    ...rest
  }: ConversationScrollButtonProps = $props();
  const conversation = useConversationContext();

  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
    onclick?.(event);
    if (!event.defaultPrevented) conversation.scrollToBottom();
  }
</script>

{#if !conversation.isAtBottom}
  <button
    {...rest}
    {type}
    class={cn(
      'svadmin-ai__button absolute bottom-4 left-1/2 size-9 min-h-9 -translate-x-1/2 rounded-full border border-border bg-background p-0 shadow-sm',
      className,
    )}
    aria-label={ariaLabel}
    data-slot="conversation-scroll-button"
    onclick={click}
  >
    {#if children}
      {@render children()}
    {:else}
      <ArrowDown size={16} aria-hidden="true" />
    {/if}
  </button>
{/if}
