<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export type ConversationEmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'title'> & {
    title?: string;
    description?: string;
    icon?: Snippet;
    class?: string;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '../utils.js';

  let {
    title = 'No messages yet',
    description = 'Start a conversation to see messages here',
    icon,
    class: className = '',
    children,
    ...rest
  }: ConversationEmptyStateProps = $props();
</script>

<div {...rest} class={cn('flex size-full min-h-48 flex-col items-center justify-center gap-3 p-8 text-center', className)} data-slot="conversation-empty-state">
  {#if children}
    {@render children()}
  {:else}
    {#if icon}<div class="text-muted-foreground" data-slot="conversation-empty-state-icon">{@render icon()}</div>{/if}
    <div class="space-y-1">
      <h3 class="text-sm font-medium">{title}</h3>
      {#if description}<p class="svadmin-ai__muted text-sm">{description}</p>{/if}
    </div>
  {/if}
</div>
