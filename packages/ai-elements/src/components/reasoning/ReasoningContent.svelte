<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export type ReasoningContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & {
    text?: string;
    class?: string;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import Response from '../Response.svelte';
  import { useReasoning } from './context.svelte.js';

  let { text = '', class: className = '', children, ...rest }: ReasoningContentProps = $props();
  const reasoning = useReasoning();
</script>

{#if reasoning.isOpen}
  <div {...rest} class={cn('svadmin-ai-reasoning-content', className)} data-slot="reasoning-content">
    {#if children}{@render children()}{:else}<Response content={text} streaming={reasoning.isStreaming} />{/if}
  </div>
{/if}

<style>
  .svadmin-ai-reasoning-content { border-top: 1px solid var(--border, currentColor); padding: 0.75rem; color: var(--muted-foreground, currentColor); font-size: 0.875rem; }
</style>
