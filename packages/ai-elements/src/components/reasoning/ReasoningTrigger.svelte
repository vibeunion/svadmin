<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export type ReasoningTriggerProps = Omit<HTMLButtonAttributes, 'children' | 'class' | 'onclick'> & {
    class?: string;
    children?: Snippet;
    getThinkingMessage?: (isStreaming: boolean, duration?: number) => string;
    onclick?: (event: MouseEvent) => void;
  };
</script>

<script lang="ts">
  import { Brain, ChevronDown } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useReasoning } from './context.svelte.js';

  let { class: className = '', children, getThinkingMessage, onclick, type = 'button', ...rest }: ReasoningTriggerProps = $props();
  const reasoning = useReasoning();

  const message = $derived(getThinkingMessage?.(reasoning.isStreaming, reasoning.duration)
    ?? (reasoning.isStreaming || reasoning.duration === 0
      ? 'Thinking...'
      : reasoning.duration === undefined
        ? 'Thought for a few seconds'
        : `Thought for ${reasoning.duration} seconds`));

  function toggle(event: MouseEvent): void {
    onclick?.(event);
    if (!event.defaultPrevented) reasoning.setIsOpen(!reasoning.isOpen);
  }
</script>

<button {...rest} {type} class={cn('svadmin-ai-reasoning-trigger', className)} data-slot="reasoning-trigger" aria-expanded={reasoning.isOpen} onclick={toggle}>
  {#if children}
    {@render children()}
  {:else}
    <Brain size={16} aria-hidden="true" />
    <span>{message}</span>
    <ChevronDown class={cn(reasoning.isOpen && 'svadmin-ai-reasoning-trigger__icon--open')} size={16} aria-hidden="true" />
  {/if}
</button>

<style>
  .svadmin-ai-reasoning-trigger { display: flex; width: 100%; align-items: center; gap: 0.5rem; border: 0; padding: 0.625rem 0.75rem; background: transparent; color: var(--muted-foreground, currentColor); text-align: left; font: inherit; font-size: 0.875rem; cursor: pointer; }
  .svadmin-ai-reasoning-trigger:hover { color: var(--foreground, currentColor); }
  .svadmin-ai-reasoning-trigger:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-reasoning-trigger :global(svg:last-child) { margin-left: auto; transition: transform 150ms ease; }
  .svadmin-ai-reasoning-trigger :global(.svadmin-ai-reasoning-trigger__icon--open) { transform: rotate(180deg); }
  @media (prefers-reduced-motion: reduce) { .svadmin-ai-reasoning-trigger :global(svg:last-child) { transition: none; } }
</style>
